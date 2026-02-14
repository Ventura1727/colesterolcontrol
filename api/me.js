// /api/me.js
import { createClient } from "@supabase/supabase-js";

export default async function handler(req, res) {
  try {
    const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
    const anonKey = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !anonKey) {
      return res.status(500).json({ error: "Missing SUPABASE_URL / SUPABASE_ANON_KEY env vars" });
    }

    const authHeader = req.headers.authorization || "";
    const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : null;

    if (!token) {
      return res.status(401).json({ error: "Missing Authorization Bearer token" });
    }

    // Usa o token do usuário (RLS continua valendo)
    const supabase = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: `Bearer ${token}` } },
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const { data: userData, error: userErr } = await supabase.auth.getUser();
    if (userErr || !userData?.user) {
      return res.status(401).json({ error: "Invalid session", details: userErr?.message });
    }

    const user = userData.user;

    // Busca perfil
    let { data: profile, error: profileErr } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", user.id)
      .single();

    // Se não existir linha ainda, cria (para não quebrar a UI)
    if (profileErr && (profileErr.code === "PGRST116" || profileErr.message?.includes("0 rows"))) {
      const { data: upserted, error: upsertErr } = await supabase
        .from("profiles")
        .upsert({ id: user.id, updated_at: new Date().toISOString() }, { onConflict: "id" })
        .select("*")
        .single();

      if (upsertErr) {
        return res.status(500).json({ error: "Failed to create profile row", details: upsertErr.message });
      }
      profile = upserted;
      profileErr = null;
    }

    if (profileErr) {
      return res.status(500).json({ error: "Failed to load profile", details: profileErr.message });
    }

    // Retorna os dois
    return res.status(200).json({
      user: {
        id: user.id,
        email: user.email,
      },
      profile,
    });
  } catch (e) {
    return res.status(500).json({ error: "Unexpected error", details: String(e?.message || e) });
  }
}
