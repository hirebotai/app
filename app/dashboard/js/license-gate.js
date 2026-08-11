/**
 * Hirebotai Dashboard — License Gate
 * Locks the entire dashboard behind an activation-only screen the moment the
 * 3-day free trial ends and no license key is active. It unlocks immediately on
 * a successful license activation and relaunches the stealth engine.
 */
(function () {
  var TRIAL_LIMIT_MS = 3 * 24 * 60 * 60 * 1000;

  var lockScreen = document.getElementById('trial-lock-screen');
  var appEl = document.getElementById('app');
  var input = document.getElementById('license-lock-inp');
  var button = document.getElementById('license-lock-btn');
  var statusEl = document.getElementById('license-lock-status');
  var buyLink = document.getElementById('license-lock-buy');
  var titleEl = document.getElementById('license-lock-title');
  var descEl = document.getElementById('license-lock-desc');

  // Why the license is gone (set by the app when the server rejects a key):
  // '' = never had one (trial messaging), 'active' = currently good, and the
  // rejected states below describe what happened.
  var LICENSE_STATE_COPY = {
    expired: {
      title: 'License Expired',
      desc: 'Your license key has expired or been revoked. Reactivate it below, or enter a new key, to unlock the dashboard again. Your notes, history and settings are safe.'
    },
    notfound: {
      title: 'License No Longer Valid',
      desc: 'This license key is no longer valid on our server. Enter a valid key below to unlock the dashboard again. Your notes, history and settings are safe.'
    },
    bound: {
      title: 'License Bound Elsewhere',
      desc: 'This license key is already bound to another computer. Contact support to transfer it, or enter a new key below.'
    },
    invalid: {
      title: 'License Rejected',
      desc: 'The server rejected this license key. Double-check it below, or enter a new key. Your notes, history and settings are safe.'
    }
  };

  var settings = null;
  var busy = false;

  function isLicensed() {
    return !!(settings && settings.license_key && settings.license_key.trim().indexOf('SA-') === 0);
  }

  function trialExpired() {
    if (!settings || !settings.trial_start) return false;
    return (Date.now() - Number(settings.trial_start)) >= TRIAL_LIMIT_MS;
  }

  function isLocked() {
    return !isLicensed() && trialExpired();
  }

  function applyLock() {
    var locked = isLocked();
    if (lockScreen) lockScreen.style.display = locked ? 'flex' : 'none';
    if (appEl) appEl.classList.toggle('app-locked', locked);
    if (locked) {
      // Drop any stale status from a previous activation so the screen always
      // starts clean (e.g. no lingering "bound to this PC" success message).
      setStatus('', '');
      var copy = LICENSE_STATE_COPY[settings && settings.license_state] || null;
      if (copy && titleEl) titleEl.textContent = copy.title;
      if (copy && descEl) descEl.textContent = copy.desc;
    }
  }

  function setStatus(text, type) {
    if (!statusEl) return;
    statusEl.textContent = text || '';
    statusEl.className = 'lock-status' + (type ? ' ' + type : '');
  }

  function setBusy(val) {
    busy = val;
    if (button) {
      button.disabled = val;
      button.textContent = val ? 'Activating…' : 'Activate License';
    }
  }

  async function activate() {
    if (busy) return;
    var code = (input.value || '').trim();
    if (!code) {
      setStatus('Please enter your license key.', 'error');
      return;
    }
    setBusy(true);
    setStatus('Contacting license server…', 'info');
    try {
      var result = await Api.activateLicenseKey(code);
      if (result && result.success) {
        settings = await Api.getAllSettings();
        applyLock();
        setStatus((result.message || 'License activated!') + ' Unlocking…', 'success');
        if (input) input.value = '';
        if (window.Store) {
          window.Store.setAll({ settings: settings, licenseKey: settings.license_key });
        }
        // Start the stealth engine so everything works immediately.
        try {
          await Api.launchEngine();
        } catch (e) {
          console.warn('[LicenseGate] Engine launch failed:', e);
        }
      } else {
        setStatus((result && result.error) || 'Invalid license key.', 'error');
      }
    } catch (e) {
      console.error('[LicenseGate] Activation failed:', e);
      setStatus('Could not activate the license. Check your internet connection and try again.', 'error');
    } finally {
      setBusy(false);
    }
  }

  function init() {
    if (buyLink) {
      buyLink.addEventListener('click', function (e) {
        e.preventDefault();
        Api.openUrl('https://hirebotai.in');
      });
    }
    if (button) button.addEventListener('click', activate);
    if (input) {
      input.addEventListener('keydown', function (e) {
        if (e.key === 'Enter') activate();
      });
    }

    // Load current settings and enforce the lock. Re-checks every second so the
    // lock snaps in the instant the trial expires even with the app open.
    var load = async function () {
      try {
        settings = await Api.getAllSettings();
      } catch (e) {
        console.error('[LicenseGate] Failed to load settings:', e);
      }
      applyLock();
    };
    load();
    setInterval(load, 1000);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
