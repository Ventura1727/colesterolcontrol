// /api/nutrition-chat.js
module.exports = async (req, res) => {
  try {
    if (req.method !== "POST") {
      return res.status(405).json({ error: "Method not allowed" });
    }

    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return res.status(500).json({ error: "Missing OPENAI_API_KEY on server" });
    }

    // Vercel geralmente já entrega req.body como objeto, mas em alguns casos vem string
    const body = typeof req.body === "string" ? JSON.parse(req.body) : (req.body || {});
    const messages = Array.isArray(body.messages) ? body.messages : [];

    // mantém o payload leve
    const trimmed = messages.slice(-20).map((m) => ({
      role: m.role === "assistant" ? "assistant" : "user",
      content: String(m.content || "").slice(0, 4000),
    }));

    const system = {
      role: "system",
      content: [
        {
          type: "text",
          text:
            "Você é o Nutricionista IA do app HeartBalance. Ajude com alimentação para reduzir colesterol (LDL), melhorar HDL e hábitos. " +
            "Seja prático e motivador. Quando der recomendações, inclua substituições simples e porções. " +
            "Não faça diagnóstico; recomende procurar um médico/nutricionista para decisões clínicas.",
        },
      ],
    };

    const input = [
      system,
      ...trimmed.map((m) => ({
        role: m.role,
        content: [{ type: "text", text: m.content }],
      })),
    ];

    const openaiResp = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "gpt-5-mini",
        input,
        store: false,
        max_output_tokens: 450,
      }),
    });

    const data = await openaiResp.json().catch(() => ({}));

    if (!openaiResp.ok) {
      return res.status(openaiResp.status).json({
        error: "OpenAI error",
        detail: data?.error || data,
      });
    }

    const reply =
      data?.output_text ||
      (Array.isArray(data?.output)
        ? data.output
            .flatMap((o) => o?.content || [])
            .filter((c) => c?.type === "output_text")
            .map((c) => c?.text)
            .join("\n")
        : "") ||
      "";

    return res.status(200).json({ reply });
  } catch (err) {
    return res.status(500).json({
      error: "Server error",
      detail: String(err?.message || err),
    });
  }
};
