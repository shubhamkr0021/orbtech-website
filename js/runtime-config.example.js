/* Synthetic example only. Copy to ignored runtime-config.local.js only later,
   after supplying an isolated LOCAL project public key. Never use service keys. */
window.ORBTECH_RUNTIME_CONFIG = {
  APP_ENV: "development",
  DEV_SERVICE_ORIGINS: ["http://127.0.0.1:54321", "http://localhost:5173", "http://localhost:8000", "http://localhost:8501"],
  SUPABASE_URL: "http://127.0.0.1:54321",
  SUPABASE_ANON_KEY: "synthetic-anon-placeholder",
  WEBSITE_ORIGIN: "http://localhost:5173",
  API_ORIGIN: "http://localhost:8000",
  STREAMLIT_ORIGIN: "http://localhost:8501",
  REPORTS_BUCKET: "dev-scan-reports",
  BILLING_MODE: "mock",
  LLM_PROVIDER_MODE: "mock"
};
