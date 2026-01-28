// api/create-payment.js

const PLANS = {
  mensal: { id: "mensal", name: "Mensal", price: 24.9 },
  // opcional:
  // anual: { id: "anual", name: "Anual", price: 199.9 },
};

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const body = req.body ?? {};
    const { userEmail, userId } = body;

    // aceita planId OU plan
    const planId = body.planId || body.plan?.id || body.plan?.slug || body.plan?.name;
    const planKey = planId ? String(planId).toLowerCase() : null;
    const planFromMap = planKey ? PLANS[planKey] : null;

    const planName = planFromMap?.name || body.plan?.name || (planId ? String(planId) : "");
    const planPrice = Number(planFromMap?.price ?? body.plan?.price);

    if (!userEmail || !userId) {
      return res.status(400).json({ error: "Missing userEmail or userId" });
    }

    if (!planName) {
      return res.status(400).json({ error: "Missing plan (use planId or plan.name)" });
    }

    if (!Number.isFinite(planPrice) || planPrice <= 0) {
      return res.status(400).json({ error: "Invalid plan price (use valid planId or plan.price)" });
    }

    const token = process.env.MERCADOPAGO_ACCESS_TOKEN;
    if (!token) {
      return res.status(500).json({ error: "Missing MERCADOPAGO_ACCESS_TOKEN env var" });
    }

    const preference = {
      items: [
        {
          title: `Plano ${planName} - HeartBalance`,
          quantity: 1,
          unit_price: planPrice,
          currency_id: "BRL",
        },
      ],
      payer: { email: userEmail },
      external_reference: String(userId),
      notification_url: "https://heartbalance.com.br/api/mp-webhook",
      back_urls: {
        success: "https://heartbalance.com.br/finalizarcompra",
        failure: "https://heartbalance.com.br/checkout",
        pending: "https://heartbalance.com.br/checkout",
      },
      auto_return: "approved",
      payment_methods: {
        excluded_payment_types: [{ id: "ticket" }],
      },
    };

    const mpResp = await fetch("https://api.mercadopago.com/checkout/preferences", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(preference),
    });

    const raw = await mpResp.text();
    let data = null;
    try {
      data = raw ? JSON.parse(raw) : null;
    } catch {
      data = null;
    }

    if (!mpResp.ok) {
      console.error("MercadoPago error:", { status: mpResp.status, body: data ?? raw });
      return res.status(502).json({
        error: "MercadoPago preference failed",
        status: mpResp.status,
        details: data ?? raw,
      });
    }

    return res.status(200).json({
      init_point: data?.init_point,
      id: data?.id,
    });
  } catch (err) {
    console.error("Create payment error:", err);
    return res.status(500).json({
      error: "Internal error",
      message: err?.message ?? String(err),
    });
  }
}
