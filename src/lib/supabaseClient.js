import { createClient } from "@supabase/supabase-js";

/**
 * Variáveis de ambiente Vite
 * Devem estar configuradas no Vercel como:
 * - VITE_SUPABASE_URL
 * - VITE_SUPABASE_ANON_KEY
 */
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Proteção para evitar tela branca silenciosa
if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    "Supabase ENV missing: check VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in Vercel"
  );
}

// Cliente Supabase (frontend-safe: usa anon public key)
export const supabase = createClient(supabaseUrl, supabaseAnonKey);
