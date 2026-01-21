export default async function handler(req, res) {
  try {
    const body = req.body;

    console.log("MP WEBHOOK:", JSON.stringify(body));

    return res.status(200).json({ received: true });
  } catch (err) {
    console.error("Webhook error:", err);
    return res.status(500).json({ error: "Webhook failed" });
  }
}
