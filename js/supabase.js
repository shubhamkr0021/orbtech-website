// js/supabase.js — initializes the Supabase JS client for production.
//
// Uses the ANON (public) key only. This file is browser-shipped and that is
// expected — the anon key identifies the project, it does not grant any
// elevated privilege on its own (Row Level Security, once enabled, is what
// actually restricts what an anon-authenticated request can do). The
// service/secret key must NEVER appear in any file under this repo — it
// stays server-side only, in the Streamlit app's environment.
const SUPABASE_URL = "https://yvundbsygluaskpdvhup.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inl2dW5kYnN5Z2x1YXNrcGR2aHVwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzk2ODE4NzIsImV4cCI6MjA5NTI1Nzg3Mn0.eWgL_vOmb1vH4P-LFsH7xk9KLEBvaOn-VipAnOFmBj8";

const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
