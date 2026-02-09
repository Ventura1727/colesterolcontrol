// api/nutrition-chat.js

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  try {
    const { messages } = req.body || {};

    if (!Array.isArray(messages) || messages.length === 0) {
      return res.status(400).json({ error: "messages[] é obrigatório" });
    }

    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) return res.status(500).json({ error: "OPENAI_API_KEY não configurada" });

    // System prompt do seu app (colesterol/rotina/educativo)
    const system = `
Você é o Nutricionista IA do app HeartBalance (foco: controle de colesterol).
Regras:
- Responda em PT-BR, objetivo e didático.
- Sugira opções práticas (café/almoço/jantar/lanche), porções aproximadas e substituições.
- Se o usuário mencionar exames/LDL/HDL/Triglicerídeos, explique o que significa e hábitos que ajudam.
- Não prescreva medicamentos. Se for algo médico/urgente, recomende procurar um profissional.
- Sempre que fizer sentido, finalize com um mini "próximo passo" (1 ação simples hoje).
`.trim();

    // Converte messages do front para o formato simples do Responses API:
    // [{role:"system|user|assistant", content:"..."}]
    const input = [
      { role: "system", content: system },
      ...messages
        .filter((m) => m && typeof m === "object")
        .map((m) => ({
          role: m.role === "assistant" ? "assistant" : "user",
          content: String(m.content || "").slice(0, 8000),
        })),
    ];

    const r = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4.1-mini",
        input,
        max_output_tokens: 500,
      }),
    });

    const data = await r.json();

    if (!r.ok) {
      return res.status(500).json({
        error: "Erro ao chamar OpenAI",
        details: data,
      });
    }

    // No Responses API, o jeito mais simples é usar output_text :contentReference[oaicite:1]{index=1}
    const assistant = data.output_text || "";
    return res.status(200).json({ assistant });
  } catch (e) {
    return res.status(500).json({ error: "Erro inesperado", details: String(e?.message || e) });
  }
}
