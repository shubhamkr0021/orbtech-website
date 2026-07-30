// js/supabase.js — initializes the Supabase JS client for orbtech-test.
//
// Uses the ANON (public) key only. This file is browser-shipped and that is
// expected — the anon key identifies the project, it does not grant any
// elevated privilege on its own (Row Level Security, once enabled, is what
// actually restricts what an anon-authenticated request can do). The
// service/secret key must NEVER appear in any file under this repo — it
// stays server-side only, in the Streamlit app's environment.
//
// TEST CONFIG: points at orbtech-test. Swap for the production project's
// URL + anon key before this ever ships to orbtech.in for real.
const SUPABASE_URL = "https://rcittyqxdebysuyvwvgh.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJjaXR0eXF4ZGVieXN1eXZ3dmdoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODQ3OTc4MjMsImV4cCI6MjEwMDM3MzgyM30.XNfFhWHdP0-2XZEp29SnEwbiPJ0HOVHIvLHzwUeHTKs";

const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
