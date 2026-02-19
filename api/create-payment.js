// api/create-payment.js
const { createClient } = require("@supabase/supabase-js");

const PLANS = {
  mensal: { id: "mensal", name: "Mensal", price: 24.9, durationDays: 30 },
  trimestral: { id: "trimestral", name: "Trimestral", price: 59.9, durationDays: 90 },
  anual: { id: "anual", name: "Anual", price: 199.9, durationDays: 365 },
};

function pickPlanFromBody(body) {
  const planId = body?.planId || body?.plan?.id || body?.plan?.slug || body?.plan?.name;
  const key = planId ? String(planId).toLowerCase() : null;
  return key ? PLANS[key] : null;
}

function getSupabaseAdmin() {
  const url = process.env.SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url) throw new Error("Missing SUPABASE_URL");
  if (!serviceKey) throw new Error("Missing SUPABASE_SERVICE_ROLE_KEY");

  return createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

module.exports = async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  try {
    const body = req.body ?? {};
    const { userEmail, userId, paymentMethod, customer } = body;

    if (!userEmail || !userId) {
      return res.status(400).json({ error: "Missing userEmail or userId" });
    }

    const chosenPlan = pickPlanFromBody(body);
    if (!chosenPlan) {
      return res.status(400).json({
        error: "Invalid plan. Use planId/plan.id: mensal | trimestral | anual",
      });
    }

    const token = process.env.MERCADOPAGO_ACCESS_TOKEN;
    if (!token) return res.status(500).json({ error: "Missing MERCADOPAGO_ACCESS_TOKEN env var" });

    const appUrlRaw = process.env.APP_URL || "https://heartbalance.com.br";
    const appUrl = String(appUrlRaw).replace(/\/$/, "");

    const cpfDigits = customer?.cpf ? String(customer.cpf).replace(/\D/g, "").slice(0, 11) : null;

    const fullName = String(customer?.nome || "").trim();
    const firstName = fullName ? fullName.split(" ")[0] : undefined;
    const lastName =
      fullName && fullName.split(" ").length > 1 ? fullName.split(" ").slice(1).join(" ") : undefined;

    const payer = {
      email: userEmail,
      first_name: firstName,
      last_name: lastName,
      identification: cpfDigits ? { type: "CPF", number: cpfDigits } : undefined,
    };

    const preference = {
      items: [
        {
          id: chosenPlan.id,
          title: `Heartbalance Premium - ${chosenPlan.name}`,
          quantity: 1,
          unit_price: Number(chosenPlan.price),
          currency_id: "BRL",
        },
      ],
      payer,
      external_reference: String(userId),
      metadata: {
        user_id: String(userId),
        plan_id: chosenPlan.id,
        duration_days: chosenPlan.durationDays,
        customer_email: userEmail || customer?.email || null,
        customer_name: customer?.nome || null,
        customer_cpf: cpfDigits || null,
        payment_method: paymentMethod || null,
      },
      binary_mode: true,
      statement_descriptor: "HEARTBALANCE",
      notification_url: `${appUrl}/api/mp-webhook`,
      back_urls: {
        success: `${appUrl}/checkout?status=approved`,
        pending: `${appUrl}/checkout?status=pending`,
        failure: `${appUrl}/checkout?status=failure`,
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

    const redirectUrl = data?.init_point || data?.sandbox_init_point;
    const preferenceId = data?.id ? String(data.id) : null;

    if (!redirectUrl || !preferenceId) {
      return res.status(502).json({
        error: "MercadoPago did not return init_point/id",
        details: data,
      });
    }

    // ✅ salva preference_id no Supabase (Melhoria B)
    try {
      const supabaseAdmin = getSupabaseAdmin();
      const { error: insErr } = await supabaseAdmin.from("checkout_sessions").insert({
        user_id: userId,
        preference_id: preferenceId,
        plan_id: chosenPlan.id,
        payment_method: paymentMethod || null,
        status: "created",
      });
      if (insErr) console.error("checkout_sessions insert error:", insErr);
    } catch (e) {
      console.error("checkout_sessions insert unexpected error:", e);
    }

    return res.status(200).json({
      init_point: redirectUrl,
      id: preferenceId,
    });
  } catch (err) {
    console.error("Create payment error:", err);
    return res.status(500).json({ error: "Internal error", message: err?.message ?? String(err) });
  }
};
