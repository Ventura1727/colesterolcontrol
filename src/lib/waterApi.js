import { supabase } from "./supabaseClient";

async function getAccessToken() {
  const { data, error } = await supabase.auth.getSession();
  if (error) throw error;
  const token = data?.session?.access_token;
  if (!token) throw new Error("No session token");
  return token;
}

export async function waterLogList() {
  const token = await getAccessToken();
  const r = await fetch("/api/water-log", {
    method: "GET",
    headers: { Authorization: `Bearer ${token}` },
  });
  const data = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(data?.error || "Failed to list water logs");
  return data?.data || [];
}

export async function waterLogCreate({ quantidade_ml, data, hora }) {
  const token = await getAccessToken();
  const r = await fetch("/api/water-log", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ quantidade_ml, data, hora }),
  });
  const dataResp = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(dataResp?.error || "Failed to create water log");
  return dataResp;
}
