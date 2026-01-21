export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { plan, userEmail } = req.body;

    if (!plan || !userEmail) {
      return res.status(400).json({ error: "Missing plan or userEmail" });
    }

    const preference = {
      items: [
        {
          title: `Plano ${plan.name} - HeartBalance`,
          quantity: 1,
          unit_price: Number(plan.price),
        },
      ],

      payer: {
        email: userEmail,
      },

      // Força PIX e remove boleto
      payment_methods: {
        excluded_payment_types: [
          { id: "ticket" }, // remove boleto
        ],
      },

      // Webhook
      notification_url: "https://heartbalance.com.br/api/mp-webhook",

      back_urls: {
        success: "https://heartbalance.com.br/finalizarcompra",
        failure: "https://heartbalance.com.br/checkout",
        pending: "https://heartbalance.com.br/checkout",
      },

      auto_return: "approved",

      // Usamos o email para identificar o usuário no webhook
      external_reference: userEmail,
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
      return res.status(500).json({ error: "MercadoPago preference failed" });
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
