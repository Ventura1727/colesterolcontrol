// api/check-payment.js
import { createClient } from "@supabase/supabase-js";

function getSupabaseAdmin() {
  const url = process.env.SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url) throw new Error("Missing SUPABASE_URL");
  if (!serviceKey) throw new Error("Missing SUPABASE_SERVICE_ROLE_KEY");

  return createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  try {
    let { preferenceId, userId } = req.body || {};
    preferenceId = preferenceId ? String(preferenceId) : null;
    userId = userId ? String(userId) : null;

    if (!userId && !preferenceId) {
      return res.status(400).json({ error: "Missing userId or preferenceId" });
    }

    // ✅ Se não veio preferenceId, busca o último do usuário no Supabase
    if (!preferenceId && userId) {
      try {
        const supabaseAdmin = getSupabaseAdmin();
        const { data, error } = await supabaseAdmin
          .from("checkout_sessions")
          .select("preference_id, created_at")
          .eq("user_id", userId)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();

        if (!error && data?.preference_id) {
          preferenceId = String(data.preference_id);
        }
      } catch (e) {
        console.error("checkout_sessions lookup error:", e);
      }
    }

    if (!preferenceId) {
      return res.status(404).json({
        ok: true,
        approved: false,
        payment_id: null,
        message: "No preferenceId found for this user yet.",
      });
    }

    const token = process.env.MERCADOPAGO_ACCESS_TOKEN;
    if (!token) return res.status(500).json({ error: "Missing MERCADOPAGO_ACCESS_TOKEN" });

    const url = `https://api.mercadopago.com/v1/payments/search?preference_id=${encodeURIComponent(preferenceId)}`;

    const resp = await fetch(url, {
      headers: { Authorization: `Bearer ${token}` },
    });

    const data = await resp.json().catch(() => null);

    if (!resp.ok) {
      return res.status(502).json({ error: "MP search failed", details: data });
    }

    const results = data?.results || [];
    const approved = results.find((p) => p?.status === "approved");

    return res.status(200).json({
      ok: true,
      approved: Boolean(approved),
      payment_id: approved?.id ? String(approved.id) : null,
      preference_id: preferenceId,
    });
  } catch (e) {
    return res.status(500).json({ error: "Internal error", message: e?.message ?? String(e) });
  }
}
