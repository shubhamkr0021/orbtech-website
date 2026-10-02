(function () {
  "use strict";

  const STORAGE_KEY = "orb_cookie_consent";
  const CONSENT_VERSION = 1;
  const GA_MEASUREMENT_ID = "G-1TTEXCPGMH";
  const META_PIXEL_ID = "27978353121859964";
  const defaults = { version: CONSENT_VERSION, necessary: true, analytics: false, marketing: false };
  let storageAvailable = true;
  let hasStoredChoice = false;
  let recoveryReady = !(
    /\/reset-password\/?$/.test(window.location.pathname) &&
    /(?:access_token|type=recovery)/i.test(window.location.hash)
  );
  let consent = { ...defaults };
  let gaInitialized = false;
  let pixelInitialized = false;

  try {
    const saved = window.localStorage.getItem(STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      if (parsed && parsed.version === CONSENT_VERSION) {
        consent = {
          version: CONSENT_VERSION,
          necessary: true,
          analytics: parsed.analytics === true,
          marketing: parsed.marketing === true,
        };
        hasStoredChoice = true;
      }
    }
  } catch (error) {
    storageAvailable = false;
  }

  function getConsent() {
    return { ...consent, necessary: true };
  }

  function hasConsent(category) {
    if (category === "necessary") return true;
    return (category === "analytics" || category === "marketing") &&
      storageAvailable && consent[category] === true;
  }

  function dispatchConsentChange() {
    window.dispatchEvent(new CustomEvent("orb:consentchange", { detail: getConsent() }));
  }

  function setConsent(preferences) {
    const next = {
      version: CONSENT_VERSION,
      necessary: true,
      analytics: preferences && preferences.analytics === true,
      marketing: preferences && preferences.marketing === true,
    };

    if (storageAvailable) {
      try {
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
        hasStoredChoice = true;
      } catch (error) {
        storageAvailable = false;
        hasStoredChoice = false;
        next.analytics = false;
        next.marketing = false;
      }
    } else {
      next.analytics = false;
      next.marketing = false;
    }

    consent = next;
    dispatchConsentChange();
    return getConsent();
  }

  function safePageLocation() {
    const url = new URL(window.location.href);
    url.hash = "";
    return url.href;
  }

  function initializeAnalytics() {
    if (!hasConsent("analytics") || gaInitialized || !recoveryReady) return;
    gaInitialized = true;

    window.dataLayer = window.dataLayer || [];
    window.gtag = window.gtag || function () { window.dataLayer.push(arguments); };
    window.gtag("js", new Date());
    window.gtag("consent", "update", {
      analytics_storage: "granted",
      ad_storage: "denied",
      ad_user_data: "denied",
      ad_personalization: "denied",
    });
    const pageLocation = safePageLocation();
    window.gtag("config", GA_MEASUREMENT_ID, {
      send_page_view: false,
      page_location: pageLocation,
    });

    const script = document.createElement("script");
    script.async = true;
    script.src = "https://www.googletagmanager.com/gtag/js?id=" + encodeURIComponent(GA_MEASUREMENT_ID);
    document.head.appendChild(script);

    window.gtag("event", "page_view", {
      page_location: pageLocation,
      page_title: document.title,
      page_referrer: document.referrer,
    });
  }

  function initializeMarketing() {
    if (!hasConsent("marketing") || pixelInitialized || !recoveryReady) return;
    pixelInitialized = true;

    (function (f, b, e, v, n, t, s) {
      if (f.fbq) return;
      n = f.fbq = function () {
        n.callMethod ? n.callMethod.apply(n, arguments) : n.queue.push(arguments);
      };
      if (!f._fbq) f._fbq = n;
      n.push = n;
      n.loaded = true;
      n.version = "2.0";
      n.queue = [];
      t = b.createElement(e);
      t.async = true;
      t.src = v;
      s = b.getElementsByTagName(e)[0];
      s.parentNode.insertBefore(t, s);
    })(window, document, "script", "https://connect.facebook.net/en_US/fbevents.js");

    window.fbq("consent", "grant");
    window.fbq("init", META_PIXEL_ID);
    window.fbq("track", "PageView");
  }

  function updateTracking() {
    if (gaInitialized) {
      window.gtag("consent", "update", {
        analytics_storage: hasConsent("analytics") ? "granted" : "denied",
        ad_storage: "denied",
        ad_user_data: "denied",
        ad_personalization: "denied",
      });
    }
    if (pixelInitialized) {
      window.fbq("consent", hasConsent("marketing") ? "grant" : "revoke");
    }
    initializeAnalytics();
    initializeMarketing();
  }

  function buildInterface() {
    const style = document.createElement("style");
    style.textContent = `
      .orb-cookie-banner, .orb-cookie-panel {
        position: fixed; right: 16px; bottom: 16px; z-index: 10000; pointer-events: none;
        width: min(560px, calc(100vw - 32px)); box-sizing: border-box;
        color: #F0F2F5; background: #11151D; border: 1px solid rgba(255,255,255,.16);
        border-radius: 10px; box-shadow: 0 12px 40px rgba(0,0,0,.35);
        padding: 18px; font: 14px/1.5 "Sora", system-ui, sans-serif;
      }
      .orb-cookie-banner[hidden], .orb-cookie-panel[hidden] { display: none !important; }
      .orb-cookie-title { margin: 0 0 5px; color: #FFF; font-size: 15px; font-weight: 700; }
      .orb-cookie-copy { margin: 0; color: #CBD0D8; }
      .orb-cookie-actions { display: flex; flex-wrap: wrap; justify-content: flex-end; gap: 8px; margin-top: 14px; }
      .orb-cookie-button {
        min-height: 38px; border: 1px solid #77808D; border-radius: 6px; padding: 8px 12px;
        color: #F0F2F5; background: transparent; font: inherit; font-weight: 600; cursor: pointer; pointer-events: auto;
      }
      .orb-cookie-button:hover { border-color: #F25F1F; }
      .orb-cookie-button-primary { color: #FFF; background: #F25F1F; border-color: #F25F1F; }
      .orb-cookie-row { display: flex; align-items: flex-start; justify-content: space-between; gap: 16px; padding: 12px 0; border-top: 1px solid rgba(255,255,255,.12); }
      .orb-cookie-row p { margin: 3px 0 0; color: #B5BDC8; font-size: 13px; }
      .orb-cookie-row label { display: flex; align-items: center; gap: 9px; min-width: 105px; font-weight: 600; pointer-events: auto; }
      .orb-cookie-row input { accent-color: #F25F1F; width: 17px; height: 17px; }
      .orb-cookie-active { color: #F7A178; white-space: nowrap; font-size: 13px; }
      .orb-cookie-settings-footer { position: fixed; left: 0; right: 0; bottom: 0; z-index: 9998; display: flex; justify-content: center; padding: 12px 16px; color: #8892A0; font: 12px/1.5 "Sora", system-ui, sans-serif; }
      .orb-cookie-settings-link { color: inherit; text-decoration: underline; text-underline-offset: 3px; cursor: pointer; }
      .orb-cookie-settings-link:hover { color: #F25F1F; }
      @media (max-width: 520px) {
        .orb-cookie-banner, .orb-cookie-panel { right: 8px; bottom: 8px; width: calc(100vw - 16px); padding: 15px; }
        .orb-cookie-actions { justify-content: stretch; }
        .orb-cookie-button { flex: 1 1 auto; }
        .orb-cookie-row { gap: 8px; }
      }
    `;
    document.head.appendChild(style);

    const banner = document.createElement("section");
    banner.className = "orb-cookie-banner";
    banner.setAttribute("role", "dialog");
    banner.setAttribute("aria-label", "Cookie preferences");
    banner.hidden = true;
    banner.innerHTML = `
      <h2 class="orb-cookie-title">Cookie preferences</h2>
      <p class="orb-cookie-copy">OrbTech uses necessary technologies for authentication, security, and core functionality. Optional analytics and marketing technologies help us understand site usage and measure conversions.</p>
      <div class="orb-cookie-actions">
        <button class="orb-cookie-button" type="button" data-consent="manage">Manage Preferences</button>
        <button class="orb-cookie-button" type="button" data-consent="reject">Reject Optional</button>
        <button class="orb-cookie-button orb-cookie-button-primary" type="button" data-consent="accept">Accept All</button>
      </div>`;

    const panel = document.createElement("section");
    panel.className = "orb-cookie-panel";
    panel.setAttribute("role", "dialog");
    panel.setAttribute("aria-label", "Cookie settings");
    panel.hidden = true;
    panel.innerHTML = `
      <h2 class="orb-cookie-title">Cookie settings</h2>
      <div class="orb-cookie-row">
        <div><strong>Necessary</strong><p>Required for authentication, security, and core functionality.</p></div>
        <span class="orb-cookie-active">Always active</span>
      </div>
      <div class="orb-cookie-row">
        <div><strong>Analytics</strong><p>Used for website usage analytics.</p></div>
        <label><input type="checkbox" data-preference="analytics"> Optional</label>
      </div>
      <div class="orb-cookie-row">
        <div><strong>Marketing</strong><p>Used for marketing and conversion measurement.</p></div>
        <label><input type="checkbox" data-preference="marketing"> Optional</label>
      </div>
      <div class="orb-cookie-actions">
        <button class="orb-cookie-button" type="button" data-consent="cancel">Cancel</button>
        <button class="orb-cookie-button orb-cookie-button-primary" type="button" data-consent="save">Save Preferences</button>
      </div>`;

    document.body.append(banner, panel);

    banner.addEventListener("click", function (event) {
      const action = event.target.closest("[data-consent]");
      if (!action) return;
      if (action.dataset.consent === "accept") {
        setConsent({ analytics: true, marketing: true });
        banner.hidden = true;
      } else if (action.dataset.consent === "reject") {
        setConsent({ analytics: false, marketing: false });
        banner.hidden = true;
      } else {
        openPreferences();
      }
    });

    panel.addEventListener("click", function (event) {
      const action = event.target.closest("[data-consent]");
      if (!action) return;
      if (action.dataset.consent === "save") {
        setConsent({
          analytics: panel.querySelector('[data-preference="analytics"]').checked,
          marketing: panel.querySelector('[data-preference="marketing"]').checked,
        });
        panel.hidden = true;
        banner.hidden = true;
      } else if (action.dataset.consent === "cancel") {
        panel.hidden = true;
        if (!hasStoredChoice) banner.hidden = false;
      }
    });

    function openPreferences() {
      panel.querySelector('[data-preference="analytics"]').checked = hasConsent("analytics");
      panel.querySelector('[data-preference="marketing"]').checked = hasConsent("marketing");
      banner.hidden = true;
      panel.hidden = false;
    }

    function showBanner() {
      banner.hidden = false;
    }

    let footer = document.querySelector("footer");
    if (!footer) {
      footer = document.createElement("footer");
      footer.className = "orb-cookie-settings-footer";
      document.body.appendChild(footer);
    }
    if (!footer.querySelector(".orb-cookie-settings-link")) {
      const settings = document.createElement("a");
      settings.className = "orb-cookie-settings-link";
      settings.href = "#cookie-settings";
      settings.textContent = "Cookie Settings";
      settings.addEventListener("click", function (event) {
        event.preventDefault();
        openPreferences();
      });
      footer.appendChild(settings);
    }

    window.OrbConsent = { getConsent, hasConsent, getPageLocation: safePageLocation, setConsent, openPreferences, showBanner };
    if (!hasStoredChoice) showBanner();
  }

  window.addEventListener("orb:consentchange", updateTracking);
  window.addEventListener("storage", function (event) {
    if (event.key !== STORAGE_KEY) return;
    hasStoredChoice = false;
    consent = { ...defaults };
    if (event.newValue) {
      try {
        const parsed = JSON.parse(event.newValue);
        if (parsed && parsed.version === CONSENT_VERSION) {
          consent.analytics = parsed.analytics === true;
          consent.marketing = parsed.marketing === true;
          hasStoredChoice = true;
        }
      } catch (error) {
        hasStoredChoice = false;
      }
    }
    dispatchConsentChange();
  });

  if (!recoveryReady) {
    window.addEventListener("orb:recovery-ready", function () {
      recoveryReady = true;
      updateTracking();
    }, { once: true });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", buildInterface, { once: true });
  } else {
    buildInterface();
  }

  updateTracking();
})();
