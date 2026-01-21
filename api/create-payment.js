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

    // Segurança: normaliza preço e evita NaN
    const price = Number(plan.price);
    if (!Number.isFinite(price) || price <= 0) {
      return res.status(400).json({ error: "Invalid plan.price" });
    }

    // 🔥 IMPORTANTE:
    // - external_reference será usado no webhook para identificar quem liberar.
    // - payment_methods: forçar Pix e excluir boleto.
    // Observação: no Checkout Pro, não existe "only_pix" garantido via API;
    // mas excluir ticket (boleto) e excluir cartão pode ajudar.
    // Se você quiser aceitar cartão + pix, não exclua credit_card/debit_card.
    const preference = {
      items: [
        {
          title: `Plano ${plan.name} - HeartBalance`,
          quantity: 1,
          unit_price: price,
          currency_id: "BRL",
        },
      ],

      payer: { email: userEmail },

      external_reference: userEmail,

      notification_url: "https://heartbalance.com.br/api/mp-webhook",

      back_urls: {
        // Ajuste para a rota real do seu app
        success: "https://heartbalance.com.br/finalizarcompra",
        failure: "https://heartbalance.com.br/checkout",
        pending: "https://heartbalance.com.br/checkout",
      },

      auto_return: "approved",

      payment_methods: {
        excluded_payment_types: [
          { id: "ticket" }, // remove boleto
        ],
        // Se você quiser PIX + cartão, deixe assim (não exclui cartões).
        // Se você quiser PIX APENAS, descomente abaixo:
        // excluded_payment_methods: [{ id: "credit_card" }, { id: "debit_card" }],
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
