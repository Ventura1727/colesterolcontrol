import { supabase } from "@/lib/supabaseClient";

async function getAccessToken() {
  const { data, error } = await supabase.auth.getSession();
  if (error) throw error;
  const token = data?.session?.access_token;
  if (!token) throw new Error("Sem sessão. Faça login novamente.");
  return token;
}

export async function waterLogList() {
  const token = await getAccessToken();

  const r = await fetch("/api/water-log", {
    method: "GET",
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  const j = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(j?.error || j?.message || `Erro HTTP ${r.status}`);

  return j.data || [];
}

export async function waterLogCreate({ quantidade_ml, data, hora }) {
  const token = await getAccessToken();

  const r = await fetch("/api/water-log", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ quantidade_ml, data, hora }),
  });

  const j = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(j?.error || j?.message || `Erro HTTP ${r.status}`);

  return j;
}
