// api/mp-webhook.js

import crypto from "crypto";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

const PLANS = {
  mensal: { id: "mensal", durationDays: 30 },
  trimestral: { id: "trimestral", durationDays: 90 },
  anual: { id: "anual", durationDays: 365 },
};

function addDaysIso(days) {
  const now = new Date();
  const end = new Date(now.getTime() + Number(days) * 24 * 60 * 60 * 1000);
  return end.toISOString();
}

// Best-effort: valida assinatura se headers/secret existirem (não bloqueia se faltar)
function verifyMercadoPagoSignature(req) {
  const secret = process.env.MP_WEBHOOK_SECRET;
  if (!secret) return { ok: true, reason: "no_secret" };

  const xSignature = req.headers["x-signature"];
  const xRequestId = req.headers["x-request-id"];
  if (!xSignature || !xRequestId) return { ok: true, reason: "missing_headers" };

  const parts = String(xSignature).split(",");
  const tsPart = parts.find((p) => p.trim().startsWith("ts="));
  const v1Part = parts.find((p) => p.trim().startsWith("v1="));
  const ts = tsPart ? tsPart.split("=")[1] : null;
  const v1 = v1Part ? v1Part.split("=")[1] : null;

  if (!ts || !v1) return { ok: true, reason: "unexpected_format" };

  const base = `${ts}.${xRequestId}`;
  const computed = crypto.createHmac("sha256", secret).update(base).digest("hex");

  try {
    const ok = crypto.timingSafeEqual(Buffer.from(computed), Buffer.from(v1));
    return { ok, reason: ok ? "valid" : "invalid" };
  } catch {
    return { ok: true, reason: "compare_failed" };
  }
}

async function fetchJson(url, token) {
  const resp = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const text = await resp.text();
  let json = null;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    json = null;
  }
  return { ok: resp.ok, status: resp.status, json, raw: text };
}

export default async function handler(req, res) {
  // GET para testar no browser
  if (req.method === "GET") return res.status(200).json({ ok: true, route: "mp-webhook", status: "alive" });
  if (req.method !== "POST") return res.status(200).json({ ok: true });

  try {
    const mpToken = process.env.MERCADOPAGO_ACCESS_TOKEN;
    if (!mpToken) {
      console.error("Missing MERCADOPAGO_ACCESS_TOKEN");
      return res.status(200).json({ ok: true, reason: "missing_mp_token" });
    }

    // assinatura (best-effort)
    const sig = verifyMercadoPagoSignature(req);
    if (!sig.ok) console.warn("MP webhook signature invalid:", sig.reason);

    // MP pode mandar: topic=payment OU topic=merchant_order
    const topic = req.query?.topic || req.body?.type || req.body?.topic || null;
    const idFromQuery = req.query?.id;
    const idFromBody = req.body?.data?.id || req.body?.id;
    const resourceId = idFromQuery || idFromBody;

    if (!topic || !resourceId) {
      return res.status(200).json({ ok: true, reason: "missing_topic_or_id" });
    }

    let payment = null;

    if (topic === "payment") {
      const p = await fetchJson(`https://api.mercadopago.com/v1/payments/${resourceId}`, mpToken);
      if (!p.ok) {
        console.error("MP payment fetch error:", { status: p.status, body: p.json ?? p.raw });
        return res.status(200).json({ ok: true });
      }
      payment = p.json;
    } else if (topic === "merchant_order") {
      // 1) busca merchant_order
      const o = await fetchJson(`https://api.mercadopago.com/merchant_orders/${resourceId}`, mpToken);
      if (!o.ok) {
        console.error("MP merchant_order fetch error:", { status: o.status, body: o.json ?? o.raw });
        return res.status(200).json({ ok: true });
      }

      const order = o.json;
      const firstPaymentId = order?.payments?.[0]?.id;

      if (!firstPaymentId) {
        // Pode chegar antes de existir payment
        return res.status(200).json({ ok: true, reason: "no_payment_yet" });
      }

      // 2) busca payment real
      const p = await fetchJson(`https://api.mercadopago.com/v1/payments/${firstPaymentId}`, mpToken);
      if (!p.ok) {
        console.error("MP payment fetch error:", { status: p.status, body: p.json ?? p.raw });
        return res.status(200).json({ ok: true });
      }
      payment = p.json;
    } else {
      // outros tópicos não nos interessam
      return res.status(200).json({ ok: true, reason: `ignored_topic_${topic}` });
    }

    if (!payment) return res.status(200).json({ ok: true, reason: "no_payment" });

    const status = payment?.status;
    const statusDetail = payment?.status_detail;

    const userId = payment?.metadata?.user_id || payment?.external_reference || null;
    const planIdRaw = payment?.metadata?.plan_id || null;

    // auditoria (best-effort)
    try {
      await supabase.from("payment_events").insert({
        user_id: userId,
        payment_id: String(payment?.id || resourceId),
        preference_id: payment?.order?.id || payment?.preference_id || null,
        status: status || null,
        status_detail: statusDetail || null,
        plan_id: planIdRaw,
        raw: payment,
      });
    } catch (e) {
      console.warn("payment_events insert failed (non-blocking)");
    }

    // só aprova
    if (status !== "approved") {
      return res.status(200).json({ ok: true, status });
    }

    if (!userId) {
      console.error("No userId (external_reference/metadata) in payment");
      return res.status(200).json({ ok: true });
    }

    const planKey = planIdRaw ? String(planIdRaw).toLowerCase() : "mensal";
    const plan = PLANS[planKey] || PLANS.mensal;

    const premiumUntil = addDaysIso(payment?.metadata?.duration_days || plan.durationDays);

    // ✅ Fonte da verdade
    await supabase.from("subscriptions").upsert(
      {
        user_id: userId,
        is_premium: true,
        plan_id: plan.id,
        premium_until: premiumUntil,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id" }
    );

    // compatibilidade
    try {
      await supabase.from("profiles").update({ is_premium: true, premium_until: premiumUntil }).eq("id", userId);
    } catch {
      // ignore
    }

    try {
      await supabase.from("user_profiles").upsert(
        {
          id: userId,
          plano_ativo: true,
          plano_tipo: plan.id,
          data_inicio_pl: new Date().toISOString().slice(0, 10),
          premium_until: premiumUntil,
        },
        { onConflict: "id" }
      );
    } catch {
      // ignore
    }

    console.log("Premium activated for user:", userId, "plan:", plan.id);
    return res.status(200).json({ ok: true, activated: true, plan: plan.id });
  } catch (err) {
    console.error("Webhook crash", err);
    return res.status(200).json({ ok: true, reason: "exception" });
  }
}
