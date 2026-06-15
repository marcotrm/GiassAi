import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || "https://kqguyjsuctjjocljwwfy.supabase.co";
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtxZ3V5anN1Y3Rqam9jbGp3d2Z5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODEzNDUxMzksImV4cCI6MjA5NjkyMTEzOX0.UBho67HHDhMZV72RirJ3PO3nVXhLkc1J-IhX6uormME";

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
