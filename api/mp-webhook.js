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

// Best-effort: valida assinatura se headers/secret existirem.
// Se falhar, apenas loga (não bloqueia) para evitar travar por variação do MP.
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

export default async function handler(req, res) {
  // ✅ Teste no navegador (GET): não crasha e retorna status
  if (req.method === "GET") {
    return res.status(200).json({ ok: true, route: "mp-webhook", status: "alive" });
  }

  // MP manda POST
  if (req.method !== "POST") return res.status(200).json({ ok: true });

  try {
    // assinatura (best-effort)
    const sig = verifyMercadoPagoSignature(req);
    if (!sig.ok) {
      console.warn("MP webhook signature invalid:", sig.reason);
      // Se quiser bloquear: return res.status(401).json({ ok:false })
    }

    const paymentId = req.body?.data?.id || req.query?.id || req.body?.id;
    if (!paymentId) return res.status(200).json({ ok: true, reason: "no_payment_id" });

    const mpToken = process.env.MERCADOPAGO_ACCESS_TOKEN;
    if (!mpToken) {
      console.error("Missing MERCADOPAGO_ACCESS_TOKEN");
      return res.status(200).json({ ok: true, reason: "missing_mp_token" });
    }

    // ✅ Node 18+ tem fetch nativo na Vercel
    const mpRes = await fetch(`https://api.mercadopago.com/v1/payments/${paymentId}`, {
      headers: { Authorization: `Bearer ${mpToken}` },
    });

    const payment = await mpRes.json().catch(() => null);

    if (!mpRes.ok || !payment) {
      console.error("MP fetch error", payment);
      return res.status(200).json({ ok: true, reason: "mp_fetch_failed" });
    }

    const status = payment?.status;
    const statusDetail = payment?.status_detail;

    const userId = payment?.external_reference || payment?.metadata?.user_id || null;
    const planIdRaw = payment?.metadata?.plan_id || null;

    // log de auditoria (não quebra se falhar)
    try {
      await supabase.from("payment_events").insert({
        user_id: userId,
        payment_id: String(paymentId),
        preference_id: payment?.preference_id || payment?.order?.id || null,
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
      console.error("No userId in payment.external_reference/metadata");
      return res.status(200).json({ ok: true, reason: "no_user_id" });
    }

    const planKey = planIdRaw ? String(planIdRaw).toLowerCase() : "mensal";
    const plan = PLANS[planKey] || PLANS.mensal;

    const premiumUntil = addDaysIso(plan.durationDays);

    // ✅ FONTE DA VERDADE
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

    // ✅ Compatibilidade (não obrigatório, mas mantém seu legado funcionando)
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

    return res.status(200).json({ ok: true, activated: true, plan: plan.id });
  } catch (err) {
    console.error("Webhook crash", err);
    return res.status(200).json({ ok: true, reason: "exception" });
  }
}
