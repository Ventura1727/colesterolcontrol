// api/debug-mp-order.js
export default async function handler(req, res) {
  const id = req.query?.id;
  if (!id) return res.status(400).json({ error: "missing id" });

  const token = process.env.MERCADOPAGO_ACCESS_TOKEN;
  if (!token) return res.status(500).json({ error: "missing MERCADOPAGO_ACCESS_TOKEN" });

  const r = await fetch(`https://api.mercadopago.com/merchant_orders/${id}`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  const raw = await r.text();
  let json = null;
  try { json = raw ? JSON.parse(raw) : null; } catch { json = null; }

  return res.status(200).json({
    ok: r.ok,
    status: r.status,
    data: json ?? raw,
  });
}
