export default async function handler(req, res) {
  try {
    const event = req.body;

    console.log("MP WEBHOOK EVENT:", JSON.stringify(event));

    if (event.type !== "payment") {
      return res.status(200).json({ ignored: true });
    }

    const paymentId = event.data?.id;
    if (!paymentId) {
      return res.status(200).json({ noPayment: true });
    }

    // Buscar pagamento real no Mercado Pago
    const mpResp = await fetch(`https://api.mercadopago.com/v1/payments/${paymentId}`, {
      headers: {
        Authorization: `Bearer ${process.env.MERCADOPAGO_ACCESS_TOKEN}`,
      },
    });

    const payment = await mpResp.json();

    console.log("PAYMENT STATUS:", payment.status, payment.external_reference);

    if (payment.status !== "approved") {
      return res.status(200).json({ status: payment.status });
    }

    // external_reference = email do comprador
    const userEmail = payment.external_reference;
    if (!userEmail) {
      throw new Error("No external_reference");
    }

    // Ativar premium no Supabase
    const today = new Date().toISOString().split("T")[0];

    const supabaseResp = await fetch(
      `${process.env.VITE_SUPABASE_URL}/rest/v1/user_profiles?created_by=eq.${encodeURIComponent(
        userEmail
      )}`,
      {
        method: "PATCH",
        headers: {
          apikey: process.env.VITE_SUPABASE_ANON_KEY,
          Authorization: `Bearer ${process.env.VITE_SUPABASE_ANON_KEY}`,
          "Content-Type": "application/json",
          Prefer: "return=minimal",
        },
        body: JSON.stringify({
          plano_ativo: true,
          plano_tipo: "Premium",
          data_inicio_plano: today,
        }),
      }
    );

    if (!supabaseResp.ok) {
      const txt = await supabaseResp.text();
      throw new Error("Supabase error: " + txt);
    }

    console.log("Premium ativado para:", userEmail);

    return res.status(200).json({ activated: true });
  } catch (err) {
    console.error("Webhook error:", err);
    return res.status(500).json({ error: "Webhook failed" });
  }
}
