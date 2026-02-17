// api/mp-webhook.js
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

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

async function fetchJson(url, token) {
  const resp = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` },
  });

  const raw = await resp.text();
  let json = null;
  try {
    json = raw ? JSON.parse(raw) : null;
  } catch {
    json = null;
  }

  return { ok: resp.ok, status: resp.status, json, raw };
}

export default async function handler(req, res) {
  // Healthcheck no browser
  if (req.method === "GET") {
    return res.status(200).json({ ok: true, route: "mp-webhook", status: "alive" });
  }

  // Mercado Pago manda POST
  if (req.method !== "POST") {
    return res.status(200).json({ ok: true });
  }

  try {
    const mpToken = process.env.MERCADOPAGO_ACCESS_TOKEN;
    if (!mpToken) {
      console.error("mp-webhook: Missing MERCADOPAGO_ACCESS_TOKEN");
      return res.status(200).json({ ok: true, reason: "missing_mp_token" });
    }

    // MP pode mandar em query (?topic=...&id=...) ou no body
    const topic =
      req.query?.topic ||
      req.body?.type ||
      req.body?.topic ||
      null;

    const idFromQuery = req.query?.id;
    const idFromBody = req.body?.data?.id || req.body?.id;
    const resourceId = idFromQuery || idFromBody;

    console.log("mp-webhook: incoming", {
      topic,
      resourceId,
      query: req.query,
      bodyType: req.body?.type,
    });

    if (!topic || !resourceId) {
      return res.status(200).json({ ok: true, reason: "missing_topic_or_id" });
    }

    let payment = null;

    // 1) Se vier payment direto
    if (topic === "payment") {
      const p = await fetchJson(
        `https://api.mercadopago.com/v1/payments/${resourceId}`,
        mpToken
      );

      if (!p.ok) {
        console.error("mp-webhook: payment fetch error", {
          status: p.status,
          body: p.json ?? p.raw,
        });
        return res.status(200).json({ ok: true, reason: "payment_fetch_failed" });
      }

      payment = p.json;
    }

    // 2) Se vier merchant_order, buscamos a order e depois o payment
    if (topic === "merchant_order") {
      const o = await fetchJson(
        `https://api.mercadopago.com/merchant_orders/${resourceId}`,
        mpToken
      );

      if (!o.ok) {
        console.error("mp-webhook: merchant_order fetch error", {
          status: o.status,
          body: o.json ?? o.raw,
        });
        return res.status(200).json({ ok: true, reason: "order_fetch_failed" });
      }

      const order = o.json;
      const firstPaymentId = order?.payments?.[0]?.id;

      if (!firstPaymentId) {
        // Pode chegar antes de existir payment
        console.log("mp-webhook: merchant_order with no payment yet", {
          merchant_order_id: resourceId,
        });
        return res.status(200).json({ ok: true, reason: "no_payment_yet" });
      }

      const p = await fetchJson(
        `https://api.mercadopago.com/v1/payments/${firstPaymentId}`,
        mpToken
      );

      if (!p.ok) {
        console.error("mp-webhook: payment fetch (from order) error", {
          status: p.status,
          body: p.json ?? p.raw,
        });
        return res.status(200).json({ ok: true, reason: "payment_fetch_failed" });
      }

      payment = p.json;
    }

    if (!payment) {
      return res.status(200).json({ ok: true, reason: "no_payment_object" });
    }

    const status = payment?.status;
    const statusDetail = payment?.status_detail;

    const userId =
      payment?.metadata?.user_id ||
      payment?.external_reference ||
      null;

    const planIdRaw = payment?.metadata?.plan_id || null;
    const durationDaysMeta = payment?.metadata?.duration_days || null;

    console.log("mp-webhook: payment loaded", {
      payment_id: payment?.id,
      status,
      statusDetail,
      userId,
      planIdRaw,
      durationDaysMeta,
    });

    // Auditoria (não quebra se falhar)
    try {
      await supabase.from("payment_events").insert({
        user_id: userId,
        payment_id: String(payment?.id || resourceId),
        status: status || null,
        status_detail: statusDetail || null,
        plan_id: planIdRaw,
        raw: payment,
      });
    } catch (e) {
      console.warn("mp-webhook: payment_events insert failed (non-blocking)");
    }

    // Só ativa no approved
    if (status !== "approved") {
      return res.status(200).json({ ok: true, status });
    }

    if (!userId) {
      console.error("mp-webhook: approved payment but missing userId");
      return res.status(200).json({ ok: true, reason: "missing_userId" });
    }

    const planKey = planIdRaw ? String(planIdRaw).toLowerCase() : "mensal";
    const plan = PLANS[planKey] || PLANS.mensal;

    const durationDays = Number(durationDaysMeta || plan.durationDays);
    const premiumUntil = addDaysIso(durationDays);

    // 1) subscriptions (fonte limpa)
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

    // 2) profiles (seu Dashboard usa)
    try {
      await supabase
        .from("profiles")
        .update({ is_premium: true, premium_until: premiumUntil, plano_ativo: true, plano_tipo: plan.id })
        .eq("id", userId);
    } catch {
      // ignore
    }

    // 3) user_profiles (compatibilidade)
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

    console.log("mp-webhook: ✅ Premium activated", { userId, plan: plan.id, premiumUntil });

    return res.status(200).json({ ok: true, activated: true, plan: plan.id });
  } catch (err) {
    console.error("mp-webhook: crash", err);
    return res.status(200).json({ ok: true, reason: "exception" });
  }
}
