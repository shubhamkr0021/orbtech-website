// js/auth.js — login logic and the session handoff to Streamlit.
//
// HANDOFF METHOD: short-lived cookie, not a URL query parameter.
//
// A bearer token in the URL (?access_token=...) is the simpler option and
// would also work — Streamlit can read query params natively — but it has
// real costs: it lands in browser history, in any access/proxy logs in
// front of the Streamlit app, and could leak via a Referer header if the
// post-login page ever links out. A cookie avoids all three: it never
// appears in a URL at all, so there's nothing for history or logs to
// capture.
//
// This isn't free of trade-offs either, and they're worth being explicit
// about rather than pretending the cookie is a strictly safer choice with
// no cost:
//   - It only works because the login page and the Streamlit app share a
//     registrable domain (orbtech.in / app.orbtech.in in production), so
//     the cookie can be scoped with Domain=.orbtech.in and the browser
//     will attach it on the cross-subdomain redirect. If the login page
//     ever moved to a genuinely different domain, this approach breaks and
//     a query param (or a server-side redirect that proxies the token)
//     would be the fallback.
//   - It cannot be marked HttpOnly, because it's being set from client-side
//     JS, not a server response header — the token is still readable by
//     any script running on this page. That means an XSS bug on the LOGIN
//     page specifically could steal it, exactly as an XSS bug could steal
//     a URL-embedded token. Neither transport defends against that; only
//     keeping this page free of injectable content does.
//   - The cookie is genuinely short-lived (60s) and single-purpose — it is
//     NOT the long-lived session cookie the Streamlit app uses afterward.
//     It exists only to survive the one redirect, and Streamlit is
//     expected to consume and effectively discard it immediately.

// TEST CONFIG: local Streamlit instance. In production this becomes
// https://app.orbtech.in.
//
// The ?auth_mode=handoff param exists only for this proof slice, so the
// new verification path stays opt-in and the live invite-code gate is
// completely untouched. It would go away in a real cutover, where this
// would just be the default path.
const STREAMLIT_URL = "http://localhost:8501/?auth_mode=handoff";

// "" = current host only. That's correct for local testing, where both
// this page and Streamlit are served from "localhost" on different ports —
// cookies are scoped by host, not port, so no Domain attribute is needed
// for them to be shared locally. In production, set this to ".orbtech.in"
// so the cookie is sent on requests to app.orbtech.in too.
const HANDOFF_COOKIE_DOMAIN = "";

function setHandoffCookie(token) {
    const secureFlag = location.protocol === "https:" ? "; Secure" : "";
    const domainFlag = HANDOFF_COOKIE_DOMAIN ? `; Domain=${HANDOFF_COOKIE_DOMAIN}` : "";
    document.cookie = `orb_handoff_token=${encodeURIComponent(token)}; Path=/; Max-Age=60; SameSite=Lax${secureFlag}${domainFlag}`;
}

document.getElementById("login-form").addEventListener("submit", async function (e) {
    e.preventDefault();

    const email = document.getElementById("email").value.trim();
    const password = document.getElementById("password").value;
    const statusEl = document.getElementById("status");
    const submitBtn = document.getElementById("submit-btn");

    statusEl.textContent = "";
    submitBtn.disabled = true;
    submitBtn.textContent = "Logging in...";

    try {
        const { data, error } = await supabaseClient.auth.signInWithPassword({ email, password });

        if (error) {
            statusEl.textContent = "Login failed: " + error.message;
            return;
        }

        // Only the token is handed off — never identity or role. Streamlit
        // independently verifies the token against Supabase and looks up
        // role from its own database; nothing from this page is trusted.
        const accessToken = data.session.access_token;
        setHandoffCookie(accessToken);

        window.location.href = STREAMLIT_URL;
    } catch (err) {
        statusEl.textContent = "Unexpected error: " + err.message;
    } finally {
        submitBtn.disabled = false;
        submitBtn.textContent = "Log in";
    }
});
