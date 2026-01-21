import fetch from "node-fetch";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(200).end();

  try {
    const paymentId = req.body?.data?.id;
    if (!paymentId) return res.status(200).json({ ok: true });

    // Buscar pagamento no Mercado Pago
    const mpRes = await fetch(`https://api.mercadopago.com/v1/payments/${paymentId}`, {
      headers: {
        Authorization: `Bearer ${process.env.MERCADOPAGO_ACCESS_TOKEN}`,
      },
    });

    const payment = await mpRes.json();
    if (!mpRes.ok) {
      console.error("MP fetch error", payment);
      return res.status(200).json({ ok: true });
    }

    if (payment.status !== "approved") {
      return res.status(200).json({ ok: true, status: payment.status });
    }

    const userEmail =
      payment.external_reference || payment.payer?.email;

    if (!userEmail) {
      console.error("No email found in payment");
      return res.status(200).json({ ok: true });
    }

    // Atualizar Supabase
    const { error } = await supabase
      .from("user_profiles")
      .update({
        plano_ativo: true,
        plano_tipo: "mensal",
        data_inicio_pl: new Date().toISOString().slice(0, 10),
      })
      .eq("created_by", userEmail);

    if (error) {
      console.error("Supabase update error", error);
    }

    return res.status(200).json({ ok: true, activated: true });
  } catch (err) {
    console.error("Webhook crash", err);
    return res.status(200).json({ ok: true });
  }
}
