import fetch from "node-fetch";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { plan, userEmail, userId } = req.body;

    if (!plan || !userEmail || !userId) {
      return res.status(400).json({ error: "Missing plan, userEmail or userId" });
    }

    // Segurança: valida preço
    const price = Number(plan.price);
    if (!Number.isFinite(price) || price <= 0) {
      return res.status(400).json({ error: "Invalid plan.price" });
    }

    const preference = {
      items: [
        {
          title: `Plano ${plan.name} - HeartBalance`,
          quantity: 1,
          unit_price: price,
          currency_id: "BRL",
        },
      ],

      // Email só para o Mercado Pago
      payer: { email: userEmail },

      // 🔥 ESTE É O VÍNCULO DO PAGAMENTO COM O USUÁRIO
      external_reference: userId,

      notification_url: "https://heartbalance.com.br/api/mp-webhook",

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
        Authorization: `Bearer ${process.env.MERCADOPAGO_ACCESS_TOKEN}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(preference),
    });

    const data = await mpResp.json();

    if (!mpResp.ok) {
      console.error("MercadoPago error:", data);
      return res.status(500).json({
        error: "MercadoPago preference failed",
        details: data,
      });
    }

    return res.status(200).json({
      init_point: data.init_point,
      id: data.id,
    });
  } catch (err) {
    console.error("Create payment error:", err);
    return res.status(500).json({ error: "Internal error" });
  }
}
