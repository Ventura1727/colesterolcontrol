export default async function handler(req, res) {
  try {
    if (req.method !== "POST") {
      return res.status(405).json({ error: "Method not allowed" });
    }

    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return res.status(500).json({ error: "Missing OPENAI_API_KEY on server" });
    }

    const body = typeof req.body === "string" ? JSON.parse(req.body) : (req.body || {});
    const messages = Array.isArray(body.messages) ? body.messages : [];

    if (!messages.length) {
      return res.status(400).json({ error: "Missing messages[]" });
    }

    const safeMessages = messages.map((m) => ({
      role: m.role || "user",
      content:
        typeof m.content === "string"
          ? m.content
          : (m?.content?.[0]?.text ?? String(m.content ?? "")),
    }));

    const r = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: safeMessages,
        temperature: 0.7,
      }),
    });

    const data = await r.json();

    if (!r.ok) {
      console.error("OpenAI error:", data);
      return res.status(500).json({ error: "OpenAI error", details: data });
    }

    const reply = data?.choices?.[0]?.message?.content ?? "";
    return res.status(200).json({ reply });
  } catch (e) {
    console.error("nutrition-chat fatal:", e);
    return res.status(500).json({ error: "Server error", message: e?.message || String(e) });
  }
}
