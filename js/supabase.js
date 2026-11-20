/* No CDN dependency and no automatic initialization. Local SDK review required. */
var supabaseClient = null;
(function (global) {
  "use strict";
  function initialize(sdk) {
    const config = global.OrbRuntime.getConfig(); // Before constructing any client.
    if (!sdk || typeof sdk.createClient !== "function") throw new Error("Approved local Supabase SDK unavailable");
    const storageKey = "orbtech-v2-" + config.APP_ENV + "-" + encodeURIComponent(config.WEBSITE_ORIGIN + "|" + config.SUPABASE_URL);
    const signature = JSON.stringify(config);
    const storage = {
      getItem(key) { if (!key.startsWith(storageKey)) throw new Error("Development session namespace required"); return global.localStorage.getItem(key); },
      setItem(key, value) { if (!key.startsWith(storageKey)) throw new Error("Development session namespace required"); global.localStorage.setItem(key, value); },
      removeItem(key) { if (!key.startsWith(storageKey)) throw new Error("Development session namespace required"); global.localStorage.removeItem(key); }
    };
    const guardedFetch = (input, init) => {
      if (JSON.stringify(global.OrbRuntime.getConfig()) !== signature) throw new Error("Development configuration changed");
      const value = typeof input === "string" ? input : input.url;
      let url; try { url = new URL(value); } catch (_) { throw new Error("Unapproved Supabase destination"); }
      // Inspect the original authority, not a normalized URL that hides credentials.
      const authority = /^[a-z]+:\/\/[^/?#]+/i.exec(value);
      if (!authority || global.OrbRuntime.normalizeOrigin(authority[0], "Supabase destination") !== config.SUPABASE_URL || url.hash) {
        throw new Error("Unapproved Supabase destination");
      }
      return global.fetch(input, { ...init, redirect: "error", credentials: "omit" });
    };
    supabaseClient = sdk.createClient(config.SUPABASE_URL, config.SUPABASE_ANON_KEY, {
      auth: { storageKey, storage, persistSession: true, autoRefreshToken: false, detectSessionInUrl: false },
      global: { fetch: guardedFetch }
    });
    return supabaseClient;
  }
  global.OrbSupabase = Object.freeze({ initialize, ready: () => false });
})(window);
