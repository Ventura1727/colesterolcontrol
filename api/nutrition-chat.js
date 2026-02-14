// api/nutrition-chat.js
export default async function handler(req, res) {
  try {
    if (req.method !== "POST") {
      return res.status(405).json({ error: "Method not allowed" });
    }

    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      // não quebra o app com 500 “misterioso”
      return res.status(200).json({
        assistant:
          "O servidor do chat está sem configuração de IA (OPENAI_API_KEY). Fale com o administrador e tente novamente.",
      });
    }

    const body =
      typeof req.body === "string" ? JSON.parse(req.body) : req.body || {};
    const messages = Array.isArray(body.messages) ? body.messages : [];

    if (!messages.length) {
      return res.status(400).json({ error: "Missing messages[]" });
    }

    // normaliza mensagens para o formato da OpenAI
    const safeMessages = messages.map((m) => ({
      role: m?.role === "assistant" ? "assistant" : "user",
      content:
        typeof m?.content === "string"
          ? m.content
          : m?.content?.[0]?.text
          ? String(m.content[0].text)
          : String(m?.content ?? ""),
    }));

    const r = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: safeMessages.slice(-20),
        temperature: 0.7,
      }),
    });

    const data = await r.json().catch(() => ({}));

    // Se OpenAI falhou, trate de forma amigável
    if (!r.ok) {
      const openaiMsg =
        data?.error?.message || data?.message || JSON.stringify(data);
      const openaiCode = data?.error?.code || data?.error?.type || "";

      console.error("OpenAI error:", data);

      // quota/billing -> não retornar 500 pro app
      const quotaLike =
        String(openaiMsg).toLowerCase().includes("exceeded your current quota") ||
        String(openaiCode).toLowerCase().includes("insufficient_quota") ||
        String(openaiCode).toLowerCase().includes("billing");

      if (quotaLike) {
        return res.status(200).json({
          assistant:
            "No momento o chat está indisponível por limite de uso da IA (quota/billing). " +
            "Tente novamente mais tarde ou avise o administrador para ajustar o plano da OpenAI.",
        });
      }

      // outros erros -> resposta amigável
      return res.status(200).json({
        assistant:
          "Tive um problema ao consultar a IA agora. Tente novamente em instantes. " +
          "(Se persistir, o administrador deve verificar os logs do servidor.)",
      });
    }

    const reply = data?.choices?.[0]?.message?.content ?? "";

    // ✅ IMPORTANTE: frontend espera "assistant"
    return res.status(200).json({ assistant: reply });
  } catch (e) {
    console.error("nutrition-chat fatal:", e);
    return res.status(200).json({
      assistant:
        "Falha no servidor do chat. Tente novamente em instantes. " +
        "(Se persistir, verifique os logs do Vercel.)",
    });
  }
}
