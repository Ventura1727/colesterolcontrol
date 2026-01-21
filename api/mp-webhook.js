import fetch from "node-fetch";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export default async function handler(req, res) {
  // Mercado Pago chama com POST
  if (req.method !== "POST") return res.status(405).send("Method not allowed");

  try {
    const paymentId = req.body?.data?.id;

    // Sempre responder 200 rápido para o MP não ficar reenviando
    if (!paymentId) {
      return res.status(200).json({ ok: true, ignored: true });
    }

    // Busca o pagamento real no MP
    const mpRes = await fetch(`https://api.mercadopago.com/v1/payments/${paymentId}`, {
      headers: {
        Authorization: `Bearer ${process.env.MERCADOPAGO_ACCESS_TOKEN}`,
      },
    });

    const payment = await mpRes.json();

    if (!mpRes.ok) {
      console.error("MP payment fetch failed:", payment);
      return res.status(200).json({ ok: true, mp_fetch_failed: true });
    }

    const status = payment.status; // approved | pending | rejected ...
    const externalRef = payment.external_reference; // userEmail (do create-payment)
    const payerEmail = payment.payer?.email;

    console.log("MP payment:", {
      id: payment.id,
      status,
      external_reference: externalRef,
      payer_email: payerEmail,
    });

    // Só libera quando aprovado
    if (status !== "approved") {
      return res.status(200).json({ ok: true, status });
    }

    // Identificador do usuário
    const userEmail = externalRef || payerEmail;
    if (!userEmail) {
      console.error("No user identifier found on payment");
      return res.status(200).json({ ok: true, no_user: true });
    }

    // Atualiza perfil no Supabase
    const { data, error } = await supabase
      .from("user_profiles")
      .update({
        plano_ativo: true,
        data_inicio_plano: new Date().toISOString().slice(0, 10),
        mp_payment_id: String(payment.id),
      })
      .eq("created_by", userEmail)
      .select()
      .single();

    if (error) {
      console.error("Supabase update error:", error);
      // Retorna 200 para o MP não ficar insistindo, mas registra erro
      return res.status(200).json({ ok: true, supabase_error: true });
    }

    return res.status(200).json({ ok: true, activated: true, profile: data });
  } catch (err) {
    console.error("Webhook error:", err);
    // Mesmo em erro, retorne 200 para evitar retry infinito
    return res.status(200).json({ ok: true, error: "internal" });
  }
}
