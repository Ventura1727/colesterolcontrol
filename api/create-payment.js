// api/create-payment.js
// ✅ Node 18+ (Vercel) já tem fetch global — NÃO usar node-fetch

export default async function handler(req, res) {
  // Permite só POST
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { plan, userEmail, userId } = req.body ?? {};

    // Valida payload mínimo
    if (!plan || !userEmail || !userId) {
      return res.status(400).json({ error: "Missing plan, userEmail or userId" });
    }

    // Valida campos do plano
    const name = String(plan.name ?? "").trim();
    const price = Number(plan.price);

    if (!name) {
      return res.status(400).json({ error: "Missing plan.name" });
    }

    // Segurança: valida preço
    if (!Number.isFinite(price) || price <= 0) {
      return res.status(400).json({ error: "Invalid plan.price" });
    }

    // Valida access token
    const token = process.env.MERCADOPAGO_ACCESS_TOKEN;
    if (!token) {
      return res.status(500).json({ error: "Missing MERCADOPAGO_ACCESS_TOKEN env var" });
    }

    const preference = {
      items: [
        {
          title: `Plano ${name} - HeartBalance`,
          quantity: 1,
          unit_price: price,
          currency_id: "BRL",
        },
      ],

      payer: { email: userEmail },

      // vínculo do pagamento com o usuário
      external_reference: String(userId),

      // Webhook (notificação assíncrona)
      notification_url: "https://heartbalance.com.br/api/mp-webhook",

      // Retornos do checkout
      back_urls: {
        success: "https://heartbalance.com.br/finalizarcompra",
        failure: "https://heartbalance.com.br/checkout",
        pending: "https://heartbalance.com.br/checkout",
      },

      auto_return: "approved",

      // PIX + Cartão (boleto removido)
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

    // MercadoPago pode retornar erro em JSON; mas por segurança, lemos como texto primeiro
    const raw = await mpResp.text();
    let data = null;
    try {
      data = raw ? JSON.parse(raw) : null;
    } catch {
      data = null;
    }

    if (!mpResp.ok) {
      console.error("MercadoPago preference failed:", {
        status: mpResp.status,
        body: data ?? raw,
      });

      return res.status(502).json({
        error: "MercadoPago preference failed",
        status: mpResp.status,
        details: data ?? raw,
      });
    }

    // Sucesso
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
