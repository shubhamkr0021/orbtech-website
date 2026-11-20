/* Explicit development configuration only; no production defaults or token import. */
(function (global) {
  "use strict";
  const fields = Object.freeze(["APP_ENV", "DEV_SERVICE_ORIGINS", "SUPABASE_URL", "SUPABASE_ANON_KEY",
    "WEBSITE_ORIGIN", "API_ORIGIN", "STREAMLIT_ORIGIN", "REPORTS_BUCKET", "BILLING_MODE", "LLM_PROVIDER_MODE"]);
  const production = ["orbtech.in", "orbtech-api.onrender.com", "yvundbsygluaskpdvhup.supabase.co"];
  function fail(name) { throw new Error("Unavailable development configuration: " + name); }
  function origin(value, name) {
    if (typeof value !== "string" || !value || /[^\x21-\x7e]|[\\%?#]/.test(value)) fail(name);
    // Inspect raw authority BEFORE WHATWG URL parsing (which canonicalizes IPv4).
    const raw = /^(https?):\/\/(\[[0-9a-fA-F:]+\]|[a-zA-Z0-9.-]+)(?::([0-9]+))?(\/?)$/.exec(value);
    if (!raw) fail(name);
    const host = raw[2].toLowerCase();
    if (host.endsWith(".") || (raw[3] && (!/^[1-9][0-9]*$/.test(raw[3]) || +raw[3] > 65535))) fail(name);
    if (/^[0-9.]+$/.test(host) && !/^(?:0|[1-9][0-9]{0,2})(?:\.(?:0|[1-9][0-9]{0,2})){3}$/.test(host)) fail(name);
    if (!host.startsWith("[") && !/^[0-9.]+$/.test(host) && host !== "localhost" &&
        (!host.includes(".") || host.split(".").some(x => !/^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/.test(x)))) fail(name);
    let parsed;
    try { parsed = new URL(value); } catch (_) { fail(name); }
    if (/^[0-9.]+$/.test(host) && parsed.hostname !== host) fail(name);
    const normalizedHost = parsed.hostname;
    if (production.some(x => normalizedHost === x || normalizedHost.endsWith("." + x))) fail(name);
    // Initial frontend integration is local only, even with explicit allowlisting.
    if (!["localhost", "127.0.0.1", "[::1]"].includes(normalizedHost)) fail(name);
    return parsed.origin;
  }
  function publicKey(value) {
    if (typeof value !== "string" || value.trim() !== value || !value) fail("SUPABASE_ANON_KEY");
    if (value === "synthetic-anon-placeholder" || /^sb_publishable_[A-Za-z0-9_-]+$/.test(value)) return value;
    // Credential-type filter only, never authentication or identity proof.
    try {
      const parts = value.split(".");
      if (parts.length !== 3) fail("SUPABASE_ANON_KEY");
      const payload = JSON.parse(global.atob(parts[1].replace(/-/g, "+").replace(/_/g, "/")));
      if (payload.role !== "anon" || payload.ref === "yvundbsygluaskpdvhup") fail("SUPABASE_ANON_KEY");
      return value;
    } catch (_) { fail("SUPABASE_ANON_KEY"); }
  }
  function getConfig() {
    const raw = global.ORBTECH_RUNTIME_CONFIG;
    if (!raw || typeof raw !== "object" || Array.isArray(raw)) fail("APP_ENV");
    if (Object.keys(raw).some(k => !fields.includes(k))) fail("unsupported or server-only setting");
    if (!["development", "test"].includes(raw.APP_ENV)) fail("APP_ENV");
    if (global.location.protocol === "file:") fail("browser origin");
    if (/(?:access_token|refresh_token|(?:^|[?&])code)=/i.test(global.location.hash + global.location.search)) fail("URL session import disabled");
    if (!Array.isArray(raw.DEV_SERVICE_ORIGINS) || !raw.DEV_SERVICE_ORIGINS.length) fail("DEV_SERVICE_ORIGINS");
    const approved = raw.DEV_SERVICE_ORIGINS.map(v => origin(v, "DEV_SERVICE_ORIGINS"));
    const result = { APP_ENV: raw.APP_ENV };
    for (const name of ["SUPABASE_URL", "WEBSITE_ORIGIN", "API_ORIGIN", "STREAMLIT_ORIGIN"]) {
      result[name] = origin(raw[name], name);
      if (!approved.includes(result[name])) fail(name);
    }
    if (origin(global.location.origin, "browser origin") !== result.WEBSITE_ORIGIN) fail("browser origin");
    if (typeof raw.REPORTS_BUCKET !== "string" || !/^[a-z0-9][a-z0-9-]{0,62}$/.test(raw.REPORTS_BUCKET)) fail("REPORTS_BUCKET");
    for (const name of ["BILLING_MODE", "LLM_PROVIDER_MODE"]) {
      if (raw[name] !== undefined && raw[name] !== "mock") fail(name);
      result[name] = "mock";
    }
    result.SUPABASE_ANON_KEY = publicKey(raw.SUPABASE_ANON_KEY);
    result.REPORTS_BUCKET = raw.REPORTS_BUCKET;
    result.DEV_SERVICE_ORIGINS = Object.freeze(approved);
    return Object.freeze(result);
  }
  function unavailable(feature) {
    const message = feature + " unavailable in V2 development. No operational request was sent.";
    if (global.document) {
      let node = global.document.getElementById("development-status");
      if (!node && global.document.body) {
        node = global.document.createElement("aside"); node.id = "development-status";
        node.setAttribute("role", "status"); global.document.body.prepend(node);
      }
      if (node) node.textContent = message;
      for (const id of ["upgrade-row", "upgrade-note", "cancel-note"]) {
        const target = global.document.getElementById(id); if (target) target.textContent = message;
      }
    }
    return false;
  }
  function authRedirect(path) {
    const config = getConfig();
    if (!["/login/", "/reset-password/", "/dashboard.html"].includes(path)) fail("auth redirect path");
    return config.WEBSITE_ORIGIN + path;
  }
  function billingUnavailable() { return unavailable("Billing (mock-disabled)"); }
  function scannerUnavailable() { return unavailable("Scanner handoff and LLM execution"); }
  function reportBucket() { return getConfig().REPORTS_BUCKET; }
  global.OrbRuntime = Object.freeze({ getConfig, normalizeOrigin: origin, authRedirect, reportBucket,
    unavailable, billingUnavailable, scannerUnavailable });
})(window);
