// api/create-payment.js

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

export default async function handler(req, res) {
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

    const appUrl = process.env.APP_URL || "https://heartbalance.com.br";

    const preference = {
      items: [
        {
          id: chosenPlan.id,
          title: `Heartbalance Premium - ${chosenPlan.name}`,
          quantity: 1,
          unit_price: Number(chosenPlan.price), // 🔒 nunca vem do front
          currency_id: "BRL",
        },
      ],

      const cpfDigits = customer?.cpf ? String(customer.cpf).replace(/\D/g, "") : null;
const fullName = (customer?.nome || "").trim();
const firstName = fullName ? fullName.split(" ")[0] : undefined;
const lastName = fullName && fullName.split(" ").length > 1 ? fullName.split(" ").slice(1).join(" ") : undefined;

payer: {
  email: userEmail,
  first_name: firstName,
  last_name: lastName,
  identification: cpfDigits ? { type: "CPF", number: cpfDigits } : undefined,
},

      external_reference: String(userId),

      // ✅ importante pro webhook ativar o plano certo
      metadata: {
        user_id: String(userId),
        plan_id: chosenPlan.id,
        duration_days: chosenPlan.durationDays,
        customer_email: userEmail || customer?.email || null,
        customer_name: customer?.nome || null,
        customer_cpf: customer?.cpf ? String(customer.cpf) : null,
        payment_method: paymentMethod || null,
      },

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

    return res.status(200).json({
      init_point: data?.init_point,
      id: data?.id,
    });
  } catch (err) {
    console.error("Create payment error:", err);
    return res.status(500).json({ error: "Internal error", message: err?.message ?? String(err) });
  }
}
