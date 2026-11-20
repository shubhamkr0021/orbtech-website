(function (global) {
  "use strict";
  global.toggleMenu = function () {
    const links = document.querySelector(".nav-links");
    if (links) links.classList.toggle("open");
  };
  function prepare() {
    let valid = false;
    try { global.OrbRuntime.getConfig(); valid = true; } catch (_) { /* Names only; no raw values displayed. */ }
    global.OrbRuntime.unavailable(valid ? "Account integration, billing and scanner" : "Missing or invalid runtime configuration; application");
    document.querySelectorAll("form input, form button, form textarea, form select").forEach(node => { node.disabled = true; });
    document.querySelectorAll('[data-dev-disabled], #new-scan, #upgrade-btn, #cancel-subscription-btn').forEach(node => {
      node.setAttribute("aria-disabled", "true");
      if ("disabled" in node) node.disabled = true;
    });
  }
  document.addEventListener("submit", event => { event.preventDefault(); global.OrbRuntime.unavailable("Forms and authentication"); }, true);
  document.addEventListener("click", event => {
    const target = event.target.closest && event.target.closest('[data-dev-disabled], #new-scan, #upgrade-btn, #cancel-subscription-btn');
    if (target) { event.preventDefault(); global.OrbRuntime.unavailable("Billing and scanner actions"); }
  }, true);
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", prepare); else prepare();
})(window);
