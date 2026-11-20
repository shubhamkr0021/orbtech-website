/* V2 tracking is disabled regardless of production consent storage. */
(function (global) {
  "use strict";
  const denied = () => Object.freeze({ necessary: true, analytics: false, marketing: false });
  global.OrbConsent = Object.freeze({ getConsent: denied, hasConsent: category => category === "necessary",
    setConsent: denied, openPreferences() {}, showBanner() {} });
})(window);
