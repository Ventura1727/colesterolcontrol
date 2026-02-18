// api/check-payment.js
export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  try {
    const { preferenceId, userId } = req.body || {};
    if (!preferenceId || !userId) {
      return res.status(400).json({ error: "Missing preferenceId or userId" });
    }

    const token = process.env.MERCADOPAGO_ACCESS_TOKEN;
    if (!token) return res.status(500).json({ error: "Missing MERCADOPAGO_ACCESS_TOKEN" });

    const url = `https://api.mercadopago.com/v1/payments/search?preference_id=${encodeURIComponent(preferenceId)}`;

    const resp = await fetch(url, {
      headers: { Authorization: `Bearer ${token}` },
    });

    const data = await resp.json().catch(() => null);

    if (!resp.ok) {
      return res.status(502).json({ error: "MP search failed", details: data });
    }

    const results = data?.results || [];
    const approved = results.find((p) => p?.status === "approved");

    return res.status(200).json({
      ok: true,
      approved: Boolean(approved),
      payment_id: approved?.id ? String(approved.id) : null,
    });
  } catch (e) {
    return res.status(500).json({ error: "Internal error", message: e?.message ?? String(e) });
  }
}
