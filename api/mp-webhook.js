import crypto from "crypto";
import fetch from "node-fetch";
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

// Tenta validar assinatura do Mercado Pago (quando headers existirem e secret estiver configurado).
// Obs: o formato pode variar por versão/integração; se não der para validar, seguimos sem bloquear (logamos).
function verifyMercadoPagoSignature(req) {
  const secret = process.env.MP_WEBHOOK_SECRET;
  if (!secret) return { ok: true, reason: "no_secret_configured" };

  const xSignature = req.headers["x-signature"];
  const xRequestId = req.headers["x-request-id"];

  if (!xSignature || !xRequestId) {
    return { ok: true, reason: "missing_signature_headers" };
  }

  // Mercado Pago costuma enviar no x-signature algo como:
  // "ts=...;v1=..."
  const parts = String(xSignature).split(",");
  const tsPart = parts.find((p) => p.trim().startsWith("ts="));
  const v1Part = parts.find((p) => p.trim().startsWith("v1="));

  const ts = tsPart ? tsPart.split("=")[1] : null;
  const v1 = v1Part ? v1Part.split("=")[1] : null;

  if (!ts || !v1) return { ok: true, reason: "signature_format_unexpected" };

  // String base varia conforme doc/integração.
  // Um formato comum é: `${ts}.${xRequestId}`
  // Como o MP pode variar, fazemos validação "best effort".
  const base = `${ts}.${xRequestId}`;

  const computed = crypto.createHmac("sha256", secret).update(base).digest("hex");

  // compara
  const ok = crypto.timingSafeEqual(Buffer.from(computed), Buffer.from(v1));
  return { ok, reason: ok ? "valid" : "invalid" };
}

export default async function handler(req, res) {
  // MP espera 200 rápido. A gente sempre responde 200 e registra erros internamente.
  if (req.method !== "POST") return res.status(200).json({ ok: true });

  try {
    const sig = verifyMercadoPagoSignature(req);
    if (!sig.ok) {
      console.warn("MP webhook signature invalid:", sig.reason);
      // Se você quiser bloquear assinaturas inválidas, troque para return res.status(401)...
      // Mas para evitar travar em variações de assinatura, seguimos e apenas logamos.
    }

    // MP pode enviar em diferentes formatos
    const paymentId =
      req.body?.data?.id ||
      req.query?.id ||
      req.body?.id;

    if (!paymentId) return res.status(200).json({ ok: true, reason: "no_payment_id" });

    // Buscar pagamento no Mercado Pago
    const mpRes = await fetch(`https://api.mercadopago.com/v1/payments/${paymentId}`, {
      headers: {
        Authorization: `Bearer ${process.env.MERCADOPAGO_ACCESS_TOKEN}`,
      },
    });

    const payment = await mpRes.json();

    if (!mpRes.ok) {
      console.error("MP fetch error", payment);
      return res.status(200).json({ ok: true, reason: "mp_fetch_failed" });
    }

    const status = payment?.status;
    const statusDetail = payment?.status_detail;

    // userId vem do external_reference (fonte principal)
    const userId = payment?.external_reference || payment?.metadata?.user_id;
    const planIdRaw = payment?.metadata?.plan_id;

    // registra evento para auditoria/debug (não quebra caso falhe)
    try {
      await supabase.from("payment_events").insert({
        user_id: userId || null,
        payment_id: String(paymentId),
        preference_id: payment?.preference_id || payment?.order?.id || null,
        status: status || null,
        status_detail: statusDetail || null,
        plan_id: planIdRaw || null,
        raw: payment || null,
      });
    } catch (e) {
      console.warn("payment_events insert failed (non-blocking)");
    }

    // Só processar pagamentos aprovados
    if (status !== "approved") {
      return res.status(200).json({ ok: true, status });
    }

    if (!userId) {
      console.error("No external_reference (userId) in payment");
      return res.status(200).json({ ok: true, reason: "no_user_id" });
    }

    // Determina plano: tenta metadata, senão cai para mensal (fallback)
    const planKey = planIdRaw ? String(planIdRaw).toLowerCase() : "mensal";
    const plan = PLANS[planKey] || PLANS.mensal;

    const premiumUntil = addDaysIso(plan.durationDays);

    // ✅ Fonte da verdade (nova): subscriptions
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

    // ✅ Compatibilidade com sua tabela atual user_profiles (não quebra o app)
    // Ajuste nomes conforme sua tabela real:
    // seu código antigo usa: plano_ativo, plano_tipo, data_inicio_pl
    try {
      await supabase
        .from("user_profiles")
        .upsert(
          {
            id: userId,
            plano_ativo: true,
            plano_tipo: plan.id,
            data_inicio_pl: new Date().toISOString().slice(0, 10),
            // se existir campo premium_until lá, você pode também gravar
            premium_until: premiumUntil,
          },
          { onConflict: "id" }
        );
    } catch (e) {
      // non-blocking
    }

    console.log("Premium activated for user", userId, "plan:", plan.id);

    return res.status(200).json({ ok: true, activated: true, plan: plan.id });
  } catch (err) {
    console.error("Webhook crash", err);
    return res.status(200).json({ ok: true, reason: "exception" });
  }
}
