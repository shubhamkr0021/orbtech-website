// js/auth.js — shared auth logic used by login/, signup/, and reset-password/.
//
// HANDOFF METHOD (unchanged from the proof slice): a short-lived, same-
// registrable-domain cookie, not a URL token. See the proof-slice notes
// below for the full trade-off writeup — repeated briefly here since this
// file is what actually implements it.
//   - Avoids browser history / access-log / Referer exposure that a URL
//     token would have.
//   - Requires login/signup and the Streamlit app to share a registrable
//     domain (orbtech.in / app.orbtech.in in production).
//   - Cannot be HttpOnly (set via client-side JS) — an XSS bug on these
//     pages could still steal it. That's why these pages are kept
//     script-minimal: no third-party scripts beyond the Supabase client.
//   - 60s Max-Age, single-purpose — not the long-lived Streamlit session.

const STREAMLIT_URL = "https://app.orbtech.in/?auth_mode=handoff";
const HANDOFF_COOKIE_DOMAIN = ".orbtech.in";

function setHandoffCookie(token) {
    const secureFlag = location.protocol === "https:" ? "; Secure" : "";
    const domainFlag = HANDOFF_COOKIE_DOMAIN ? `; Domain=${HANDOFF_COOKIE_DOMAIN}` : "";
    document.cookie = `orb_handoff_token=${encodeURIComponent(token)}; Path=/; Max-Age=60; SameSite=Lax${secureFlag}${domainFlag}`;
}

function handoffToStreamlit(accessToken) {
    setHandoffCookie(accessToken);
    window.location.href = STREAMLIT_URL;
}

// ---- Human-readable error mapping — never show a raw Supabase error. ----
// Returns the sentinel "UNCONFIRMED" for the one case login.js needs to
// handle specially (offering a resend-verification action).
function friendlyAuthError(error) {
    const msg = ((error && error.message) || "").toLowerCase();
    if (msg.includes("already registered") || msg.includes("user already registered")) {
        return "An account with this email already exists. Try logging in instead.";
    }
    if (msg.includes("invalid login credentials")) {
        return "Incorrect email or password.";
    }
    if (msg.includes("email not confirmed")) {
        return "UNCONFIRMED";
    }
    if (msg.includes("password") && (msg.includes("least") || msg.includes("short") || msg.includes("weak") || msg.includes("6 characters"))) {
        return "Password must be at least 6 characters.";
    }
    if (msg.includes("rate limit") || msg.includes("too many")) {
        return "Too many attempts. Please wait a moment and try again.";
    }
    if (msg.includes("failed to fetch") || msg.includes("network")) {
        return "Network error — please check your connection and try again.";
    }
    return "Something went wrong. Please try again.";
}

// ---- If already logged in, don't show the form — go straight to the
// dashboard (the hub between login and Streamlit as of Phase C). Shared by
// both login and signup: a logged-in visitor to either has no reason to see
// an auth form, and the dashboard is now the correct "you're already in"
// destination for both, not Streamlit directly. ----
async function redirectIfAlreadyLoggedIn() {
    const { data } = await supabaseClient.auth.getSession();
    if (data.session) {
        window.location.href = "../dashboard.html";
        return true;
    }
    return false;
}

async function resendVerification(email) {
    const { error } = await supabaseClient.auth.resend({ type: "signup", email });
    return !error;
}

// ==================================================================
// LOGIN
// ==================================================================
function initLoginPage() {
    redirectIfAlreadyLoggedIn();

    const form = document.getElementById("login-form");
    const statusEl = document.getElementById("status");
    const submitBtn = document.getElementById("submit-btn");
    const resendBtn = document.getElementById("resend-btn");

    form.addEventListener("submit", async function (e) {
        e.preventDefault();
        const email = document.getElementById("email").value.trim();
        const password = document.getElementById("password").value;

        statusEl.textContent = "";
        statusEl.className = "";
        resendBtn.style.display = "none";
        submitBtn.disabled = true;
        submitBtn.textContent = "Logging in...";

        try {
            const { data, error } = await supabaseClient.auth.signInWithPassword({ email, password });
            if (error) {
                const friendly = friendlyAuthError(error);
                if (friendly === "UNCONFIRMED") {
                    statusEl.textContent = "Please verify your email before logging in.";
                    statusEl.className = "error";
                    resendBtn.style.display = "inline-block";
                    resendBtn.dataset.email = email;
                } else {
                    statusEl.textContent = friendly;
                    statusEl.className = "error";
                }
                return;
            }
            // Phase C: login lands on the dashboard, not Streamlit directly.
            // The handoff (setHandoffCookie/handoffToStreamlit) now happens
            // from the dashboard's "Start new scan" action instead — see
            // dashboard.html.
            window.location.href = "../dashboard.html";
        } catch (err) {
            statusEl.textContent = "Unexpected error. Please try again.";
            statusEl.className = "error";
        } finally {
            submitBtn.disabled = false;
            submitBtn.textContent = "Log in";
        }
    });

    resendBtn.addEventListener("click", async function () {
        const email = this.dataset.email;
        this.disabled = true;
        this.textContent = "Sending...";
        const ok = await resendVerification(email);
        statusEl.textContent = ok
            ? "Verification email resent — check your inbox."
            : "Could not resend right now — please try again shortly.";
        statusEl.className = ok ? "success" : "error";
        this.style.display = "none";
        this.disabled = false;
        this.textContent = "Resend verification email";
    });
}

// ==================================================================
// SIGNUP
// ==================================================================
function initSignupPage() {
    redirectIfAlreadyLoggedIn();

    const form = document.getElementById("signup-form");
    const statusEl = document.getElementById("status");
    const submitBtn = document.getElementById("submit-btn");

    form.addEventListener("submit", async function (e) {
        e.preventDefault();
        const name = document.getElementById("name").value.trim();
        const email = document.getElementById("email").value.trim();
        const password = document.getElementById("password").value;
        const honeypot = document.getElementById("company").value;

        statusEl.textContent = "";
        statusEl.className = "";

        if (honeypot.trim()) {
            // Bot tripped the honeypot — pretend success, create nothing.
            statusEl.textContent = "Check your email to verify your account.";
            statusEl.className = "success";
            form.reset();
            return;
        }

        if (!name) {
            statusEl.textContent = "Please enter your name.";
            statusEl.className = "error";
            return;
        }
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
            statusEl.textContent = "Please enter a valid work email.";
            statusEl.className = "error";
            return;
        }
        if (password.length < 6) {
            statusEl.textContent = "Password must be at least 6 characters.";
            statusEl.className = "error";
            return;
        }

        submitBtn.disabled = true;
        submitBtn.textContent = "Signing up...";

        try {
            // Name is stored in auth.users.raw_user_meta_data via `data`
            // below (built-in Supabase behavior — no trigger involved). It
            // is NOT copied into profiles: that table has no name column
            // today, and the existing on_auth_user_created trigger already
            // inserts the profiles row itself, so this signup flow must
            // not also insert one (primary key collision). See the report
            // for the follow-up needed if profiles should carry the name.
            const { error } = await supabaseClient.auth.signUp({
                email,
                password,
                options: {
                    data: { full_name: name },
                    emailRedirectTo: window.location.origin + "/login/",
                },
            });
            if (error) {
                statusEl.textContent = friendlyAuthError(error);
                statusEl.className = "error";
                return;
            }
            statusEl.textContent = "Check your email to verify your account, then log in.";
            statusEl.className = "success";
            form.reset();
        } catch (err) {
            statusEl.textContent = "Unexpected error. Please try again.";
            statusEl.className = "error";
        } finally {
            submitBtn.disabled = false;
            submitBtn.textContent = "Sign up";
        }
    });
}

// ==================================================================
// RESET PASSWORD (two modes on one page)
// ==================================================================
function initResetPasswordPage() {
    const requestSection = document.getElementById("request-section");
    const updateSection = document.getElementById("update-section");
    const requestForm = document.getElementById("request-form");
    const requestStatus = document.getElementById("request-status");
    const requestSubmitBtn = document.getElementById("request-submit-btn");
    const updateForm = document.getElementById("update-form");
    const updateStatus = document.getElementById("update-status");
    const updateSubmitBtn = document.getElementById("update-submit-btn");

    // The recovery token arrives in the URL FRAGMENT (#access_token=...&
    // type=recovery), which a server never sees — only client-side JS can
    // read it. The Supabase JS client parses it automatically on page load
    // (detectSessionInUrl defaults to true) and fires PASSWORD_RECOVERY
    // once that session is established. This is the exact mechanism a
    // server-rendered Streamlit app cannot replicate, which is why this
    // flow lives here instead.
    supabaseClient.auth.onAuthStateChange((event, _session) => {
        if (event === "PASSWORD_RECOVERY") {
            requestSection.style.display = "none";
            updateSection.style.display = "block";
        }
    });

    requestForm.addEventListener("submit", async function (e) {
        e.preventDefault();
        const email = document.getElementById("reset-email").value.trim();

        requestStatus.textContent = "";
        requestStatus.className = "";
        requestSubmitBtn.disabled = true;
        requestSubmitBtn.textContent = "Sending...";

        try {
            const { error } = await supabaseClient.auth.resetPasswordForEmail(email, {
                redirectTo: window.location.origin + "/reset-password/",
            });
            if (error) {
                requestStatus.textContent = friendlyAuthError(error);
                requestStatus.className = "error";
            } else {
                // Deliberately the same message whether or not the email is
                // registered — avoids leaking account existence.
                requestStatus.textContent = "If that email is registered, a reset link has been sent.";
                requestStatus.className = "success";
            }
        } catch (err) {
            requestStatus.textContent = "Network error — please check your connection and try again.";
            requestStatus.className = "error";
        } finally {
            requestSubmitBtn.disabled = false;
            requestSubmitBtn.textContent = "Send reset link";
        }
    });

    updateForm.addEventListener("submit", async function (e) {
        e.preventDefault();
        const newPassword = document.getElementById("new-password").value;

        updateStatus.textContent = "";
        updateStatus.className = "";

        if (newPassword.length < 6) {
            updateStatus.textContent = "Password must be at least 6 characters.";
            updateStatus.className = "error";
            return;
        }

        updateSubmitBtn.disabled = true;
        updateSubmitBtn.textContent = "Updating...";

        try {
            const { error } = await supabaseClient.auth.updateUser({ password: newPassword });
            if (error) {
                updateStatus.textContent = friendlyAuthError(error);
                updateStatus.className = "error";
                return;
            }
            updateStatus.textContent = "Password updated. Redirecting to login...";
            updateStatus.className = "success";
            await supabaseClient.auth.signOut();
            setTimeout(() => { window.location.href = "../login/"; }, 1500);
        } catch (err) {
            updateStatus.textContent = "Network error — please check your connection and try again.";
            updateStatus.className = "error";
        } finally {
            updateSubmitBtn.disabled = false;
            updateSubmitBtn.textContent = "Set new password";
        }
    });
}
