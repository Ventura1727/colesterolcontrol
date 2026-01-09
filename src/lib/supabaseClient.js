import { createClient } from '@supabase/supabase-js';

// Essas variáveis você pega no painel do Supabase (Project Settings > API)
const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;

// Cria o cliente Supabase
export const supabase = createClient(supabaseUrl, supabaseAnonKey);
