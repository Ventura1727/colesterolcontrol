import { createClient } from "@supabase/supabase-js";

function getAuthToken(req) {
  const h = req.headers?.authorization || req.headers?.Authorization || "";
  if (!h) return null;
  const [type, token] = h.split(" ");
  if (type?.toLowerCase() !== "bearer") return null;
  return token || null;
}

function safeJsonParse(body) {
  if (!body) return {};
  if (typeof body === "object") return body;
  try {
    return JSON.parse(body);
  } catch {
    return {};
  }
}

function clampMessages(messages) {
  const arr = Array.isArray(messages) ? messages : [];
  // mantém somente user/assistant, e corta tamanho
  return arr
    .filter((m) => m && (m.role === "user" || m.role === "assistant") && typeof m.content === "string")
    .slice(-20)
    .map((m) => ({ role: m.role, content: m.content.slice(0, 4000) }));
}

export default async function handler(req, res) {
  try {
    if (req.method !== "POST") {
      return res.status(405).json({ error: "Method not allowed" });
    }

    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return res.status(500).json({ error: "Missing OPENAI_API_KEY on server" });
    }

    const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
    const supabaseAnon = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;
    if (!supabaseUrl || !supabaseAnon) {
      return res.status(500).json({ error: "Missing SUPABASE_URL / SUPABASE_ANON_KEY on server" });
    }

    const token = getAuthToken(req);
    if (!token) {
      return res.status(401).json({ error: "Missing Bearer token" });
    }

    // ✅ Supabase client “no contexto do usuário”
    const supabase = createClient(supabaseUrl, supabaseAnon, {
      global: { headers: { Authorization: `Bearer ${token}` } },
      auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    });

    const { data: userData, error: userErr } = await supabase.auth.getUser();
    if (userErr || !userData?.user) {
      return res.status(401).json({ error: "Invalid session. Please login again." });
    }

    const body = safeJsonParse(req.body);
    const messages = clampMessages(body.messages);

    if (!messages.length) {
      return res.status(400).json({ error: "Missing messages[]" });
    }

    // ✅ system prompt “médico-safe” + sem prometer internet
    const system = `
Você é o Nutricionista IA do app HeartBalance.
Objetivo: ajudar o usuário a melhorar alimentação e hábitos para reduzir colesterol e risco cardiovascular.

REGRAS:
- Seja prático, direto e didático.
- Não invente exames/diagnósticos. Se faltarem dados, faça 2-4 perguntas objetivas.
- Sempre inclua um plano de ação simples (ex.: 3 mudanças + exemplos).
- Se valores indicarem risco alto (ex.: LDL >= 190, Total >= 240, TG >= 500), recomende procurar um médico.
- Não substitui orientação médica. Evite linguagem alarmista.

FORMATO:
- Responda em português (Brasil).
- Use listas curtas quando fizer sentido.
`.trim();

    // ✅ Chamada OpenAI (compatível e estável)
    const payload = {
      model: "gpt-4o-mini",
      temperature: 0.6,
      messages: [{ role: "system", content: system }, ...messages],
    };

    const r = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    const j = await r.json().catch(() => ({}));

    if (!r.ok) {
      const detail = j?.error?.message || JSON.stringify(j || {});
      return res.status(500).json({ error: `OpenAI error: ${detail}` });
    }

    const assistant =
      j?.choices?.[0]?.message?.content?.trim?.() ||
      "";

    if (!assistant) {
      return res.status(500).json({ error: "Empty assistant response from OpenAI" });
    }

    return res.status(200).json({ assistant });
  } catch (err) {
    console.error("nutrition-chat error:", err);
    return res.status(500).json({ error: err?.message || "Server error" });
  }
}
