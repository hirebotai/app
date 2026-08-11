/**
 * Hirebotai Dashboard — Onboarding
 * Shows a one-time tutorial overlay after login.
 * Can be replayed from Settings > How To Use.
 * State is persisted via Api.setSetting/getSetting, not localStorage.
 */
(function () {
  var KEY = 'onboarding_completed';

  function getCompleted() {
    try {
      if (window.Api && typeof window.Api.getSetting === 'function') {
        var val = window.Api.getSetting(KEY);
        if (val !== null && val !== undefined) {
          return val === true || String(val).toLowerCase() === 'true' || String(val) === '1';
        }
      }
    } catch (e) { /* api unavailable — ignore */ }

    try {
      var lv = localStorage.getItem(KEY);
      if (lv === null || lv === undefined) return false;
      return lv === 'true' || lv === '1';
    } catch (e) {
      return false;
    }
  }

  function setCompleted(val) {
    try {
      if (window.Api && typeof window.Api.setSetting === 'function') {
        window.Api.setSetting(KEY, !!val);
      }
    } catch (e) { /* api unavailable — ignore */ }

    try {
      localStorage.setItem(KEY, val ? 'true' : 'false');
    } catch (e) { /* storage unavailable — ignore */ }
  }

  function show() {
    var overlay = document.getElementById('onboarding-overlay');
    if (!overlay) return;
    overlay.style.display = 'flex';
    var checkbox = document.getElementById('onboarding-checkbox');
    var btn = document.getElementById('onboarding-confirm-btn');
    if (checkbox) checkbox.checked = false;
    if (btn) btn.disabled = true;
    if (checkbox && btn) {
      checkbox.onchange = function () {
        btn.disabled = !checkbox.checked;
      };
    }
    if (btn) {
      btn.onclick = function () {
        setCompleted(true);
        overlay.style.display = 'none';
      };
    }
  }

  function hide() {
    var overlay = document.getElementById('onboarding-overlay');
    if (overlay) overlay.style.display = 'none';
  }

  function reset() {
    setCompleted(false);
    show();
  }

  window.Onboarding = {
    show: show,
    hide: hide,
    reset: reset,
    isCompleted: getCompleted
  };
})();
