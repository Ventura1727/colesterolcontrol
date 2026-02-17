import fetch from "node-fetch";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(200).json({ ok: true });
  }

  try {
    const topic = req.query.topic || req.body?.type;
    const resourceId = req.query.id || req.body?.data?.id;

    if (!topic || !resourceId) {
      return res.status(200).json({ ok: true });
    }

    const token = process.env.MERCADOPAGO_ACCESS_TOKEN;

    let payment = null;

    // 🔥 Caso 1: pagamento direto
    if (topic === "payment") {
      const mpRes = await fetch(
        `https://api.mercadopago.com/v1/payments/${resourceId}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      if (!mpRes.ok) {
        const err = await mpRes.text();
        console.error("MP payment fetch error:", err);
        return res.status(200).json({ ok: true });
      }

      payment = await mpRes.json();
    }

    // 🔥 Caso 2: merchant_order
    if (topic === "merchant_order") {
      const orderRes = await fetch(
        `https://api.mercadopago.com/merchant_orders/${resourceId}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      if (!orderRes.ok) {
        const err = await orderRes.text();
        console.error("MP order fetch error:", err);
        return res.status(200).json({ ok: true });
      }

      const order = await orderRes.json();

      if (!order.payments || !order.payments.length) {
        return res.status(200).json({ ok: true });
      }

      const paymentId = order.payments[0].id;

      const paymentRes = await fetch(
        `https://api.mercadopago.com/v1/payments/${paymentId}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      if (!paymentRes.ok) {
        const err = await paymentRes.text();
        console.error("MP payment fetch error:", err);
        return res.status(200).json({ ok: true });
      }

      payment = await paymentRes.json();
    }

    if (!payment) {
      return res.status(200).json({ ok: true });
    }

    if (payment.status !== "approved") {
      return res.status(200).json({ ok: true });
    }

    const userId =
      payment.metadata?.user_id ||
      payment.external_reference;

    if (!userId) {
      console.error("No userId in payment");
      return res.status(200).json({ ok: true });
    }

    const durationDays = payment.metadata?.duration_days || 30;

    const today = new Date();
    const endDate = new Date(
      today.getTime() + durationDays * 24 * 60 * 60 * 1000
    );

    const premiumUntil = endDate.toISOString();

    await supabase
      .from("profiles")
      .update({
        plano_ativo: true,
        plano_tipo: payment.metadata?.plan_id || "mensal",
        premium_until: premiumUntil,
        is_premium: true,
      })
      .eq("id", userId);

    console.log("Premium activated for user:", userId);

    return res.status(200).json({ ok: true });
  } catch (err) {
    console.error("Webhook crash:", err);
    return res.status(200).json({ ok: true });
  }
}
