// /api/nutrition-chat.js
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

    // Converte para o formato do Responses API
    const input = messages.map((m) => {
      const role =
        m.role === "system" || m.role === "assistant" || m.role === "user"
          ? m.role
          : "user";

      const text = String(m.content ?? "");
      return {
        role,
        content: [{ type: "input_text", text }],
      };
    });

    const r = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "gpt-5-mini",
        input,
        temperature: 0.6,
        // opcional: deixe uma instrução fixa “de nutricionista”
        // instructions: "Você é uma nutricionista focada em redução de LDL. Responda em pt-BR, de forma prática.",
      }),
    });

    const data = await r.json().catch(() => ({}));

    if (!r.ok) {
      // Isso aqui é o que você precisa ver quando der 500 no front
      console.error("OpenAI error:", r.status, data);
      return res.status(500).json({
        error: "OpenAI request failed",
        status: r.status,
        details: data,
      });
    }

    const text =
      data?.output_text ??
      data?.output?.[0]?.content?.find?.((c) => c?.type === "output_text")?.text ??
      "";

    return res.status(200).json({ text });
  } catch (err) {
    console.error("nutrition-chat server error:", err);
    return res.status(500).json({
      error: "Server error",
      message: err?.message || String(err),
    });
  }
}
