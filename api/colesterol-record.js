// api/colesterol-record.js
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const supabaseAnon = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;

function getBearer(req) {
  const h = req.headers?.authorization || req.headers?.Authorization || "";
  const parts = String(h).split(" ");
  if (parts.length === 2 && parts[0].toLowerCase() === "bearer") return parts[1];
  return null;
}

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Método não permitido" });

  try {
    if (!supabaseUrl || !supabaseAnon) {
      return res.status(500).json({ error: "Missing SUPABASE_URL / SUPABASE_ANON_KEY on server" });
    }

    const token = getBearer(req);
    if (!token) return res.status(401).json({ error: "Missing Authorization Bearer token" });

    // Cliente “por usuário” (RLS aplica corretamente)
    const supabase = createClient(supabaseUrl, supabaseAnon, {
      global: { headers: { Authorization: `Bearer ${token}` } },
    });

    // Valida token e pega user
    const { data: authData, error: authErr } = await supabase.auth.getUser();
    if (authErr || !authData?.user) return res.status(401).json({ error: "Invalid session" });

    const userId = authData.user.id;

    const body = typeof req.body === "string" ? JSON.parse(req.body) : (req.body || {});
    const payload = {
      user_id: userId, // ✅ amarra ao usuário
      data_exame: body.data_exame,
      ldl: body.ldl ?? null,
      hdl: body.hdl ?? null,
      total: body.total ?? null,
      triglicerides: body.triglicerides ?? null,
      created_at: new Date().toISOString(),
    };

    if (!payload.data_exame) return res.status(400).json({ error: "Missing data_exame" });

    const { data, error } = await supabase.from("colesterol_records").insert([payload]).select("*").single();
    if (error) return res.status(400).json({ error: error.message, details: error });

    return res.status(200).json({ success: true, data });
  } catch (error) {
    console.error("Erro ao salvar exame:", error);
    return res.status(500).json({ error: error.message || "Internal error" });
  }
}
