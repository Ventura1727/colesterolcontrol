import fetch from "node-fetch";

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
      back_urls: {
        success: "https://heartbalance.com.br/finalizarcompra",
        failure: "https://heartbalance.com.br/checkout",
        pending: "https://heartbalance.com.br/checkout",
      },
      auto_return: "approved",
      external_reference: userEmail,
    };

    const response = await fetch("https://api.mercadopago.com/checkout/preferences", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.MERCADOPAGO_ACCESS_TOKEN}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(preference),
    });

    const data = await response.json();

    return res.status(200).json({
      init_point: data.init_point,
      id: data.id,
    });
  } catch (err) {
    console.error("MP error:", err);
    return res.status(500).json({ error: "Failed to create payment" });
  }
}
