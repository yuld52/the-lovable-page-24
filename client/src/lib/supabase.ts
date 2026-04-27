import { createClient } from "@supabase/supabase-js";

// Preferir variáveis do projeto (Vite)
const ENV_URL = import.meta.env.VITE_SB_URL ?? import.meta.env.VITE_SUPABASE_URL;
const ENV_KEY =
  import.meta.env.VITE_SB_ANON_KEY ??
  import.meta.env.VITE_SUPABASE_ANON_KEY ??
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

// Fallback público (anon) do seu projeto SB (não é segredo)
const FALLBACK_URL = "https://dozyujjqsxvxgjsgayia.supabase.co";
const FALLBACK_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRvenl1ampxc3h2eGdqc2dheWlhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzAyMTY4NDAsImV4cCI6MjA4NTc5Mjg0MH0.q85p274YvzFQSBMjfiozVpYCnhohU8eBABRiJeTr69o";

const supabaseUrl = ENV_URL || FALLBACK_URL;
const supabaseAnonKey = ENV_KEY || FALLBACK_KEY;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);