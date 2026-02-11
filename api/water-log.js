import { createClient } from "@supabase/supabase-js";

function getBearerToken(req) {
  const auth = req.headers.authorization || "";
  const m = auth.match(/^Bearer\s+(.+)$/i);
  return m ? m[1] : null;
}

export default async function handler(req, res) {
  try {
    if (req.method !== "GET" && req.method !== "POST") {
      return res.status(405).json({ error: "Método não permitido" });
    }

    const token = getBearerToken(req);
    if (!token) {
      return res.status(401).json({ error: "Token de autenticação ausente" });
    }

    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseAnonKey) {
      return res
        .status(500)
        .json({ error: "Missing SUPABASE_URL or SUPABASE_ANON_KEY" });
    }

    // ✅ Client autenticado com o JWT do usuário
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      },
    });

    // ✅ validar usuário
    const { data: userData, error: authError } = await supabase.auth.getUser();
    const user = userData?.user;

    if (authError || !user) {
      return res.status(401).json({ error: "Usuário não autenticado" });
    }

    if (req.method === "GET") {
      const { data, error } = await supabase
        .from("water_logs")
        .select("id, quantidade_ml, data, hora, created_at")
        .order("created_at", { ascending: false })
        .limit(200);

      if (error) {
        return res.status(400).json({ error: error.message, details: error });
      }

      return res.status(200).json({ data });
    }

    // POST
    const body =
      typeof req.body === "string" ? JSON.parse(req.body) : req.body || {};
    const { quantidade_ml, data, hora } = body;

    if (quantidade_ml == null || !data) {
      return res.status(400).json({ error: "Campos obrigatórios ausentes" });
    }

    const payload = {
      // ✅ ESSENCIAL: sua tabela exige os dois como NOT NULL
      created_by: user.id,
      user_id: user.id,

      quantidade_ml: Number(quantidade_ml),
      data,
      // hora é nullable no banco (YES), então só manda se vier
      ...(hora ? { hora } : {}),
    };

    const { error: insertError } = await supabase
      .from("water_logs")
      .insert([payload]);

    if (insertError) {
      return res
        .status(400)
        .json({ error: insertError.message, details: insertError });
    }

    return res.status(201).json({ message: "Registro inserido com sucesso" });
  } catch (e) {
    console.error("water-log fatal:", e);
    return res
      .status(500)
      .json({ error: "Server error", message: e?.message || String(e) });
  }
}
