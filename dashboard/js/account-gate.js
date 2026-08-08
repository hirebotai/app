/**
 * Hirebotai Dashboard — Account Gate
 * Requires a unified login (same email/password as hirebotai.in) before the
 * dashboard unlocks. Covers login, registration (name + email + password +
 * email OTP) and the post-auth trial sync so the trial is bound to the account.
 */
(function () {
  var screen = document.getElementById('account-lock-screen');
  if (!screen) return;

  var panes = {
    login: document.getElementById('acct-pane-login'),
    register: document.getElementById('acct-pane-register'),
    otp: document.getElementById('acct-pane-otp'),
  };

  var busy = false;
  var pendingRegister = null; // { name, email, password }

  function showPane(name) {
    Object.keys(panes).forEach(function (k) {
      if (panes[k]) panes[k].style.display = k === name ? '' : 'none';
    });
  }

  function setStatus(el, text, type) {
    if (!el) return;
    el.textContent = text || '';
    el.className = 'lock-status' + (type ? ' ' + type : '');
  }

  function setBusy(btn, on, idleLabel) {
    if (!btn) return;
    btn.disabled = !!on;
    if (idleLabel) btn.textContent = on ? idleLabel.replace('…', '') + '…' : idleLabel;
  }

  function populateSidebar(user) {
    var nameEl = document.getElementById('sidebar-user-name');
    var emailEl = document.getElementById('sidebar-user-email');
    if (!nameEl && !emailEl) return;
    var name = (user && user.name) ? String(user.name).trim() : '';
    var email = (user && user.email) ? String(user.email).trim() : '';
    if (nameEl) nameEl.textContent = name || 'HIREBOT AI V1';
    if (emailEl) emailEl.textContent = email || '';
  }

  // Pull the freshest profile from the server so the sidebar shows the name
  // the user actually gave at registration, never one derived from the email.
  async function refreshSidebarProfile() {
    try {
      var fresh = await window.Api.refreshAccount();
      if (fresh && fresh.success) populateSidebar(fresh.user);
    } catch (e) {
      console.warn('[AccountGate] Profile refresh failed:', e);
    }
  }

  async function afterLogin() {
    // Bind/refresh the account trial on the server (best effort offline).
    try {
      await window.Api.getTrial();
    } catch (e) {
      console.warn('[AccountGate] Trial sync failed:', e);
    }
    // Ensure the stealth engine is running now that the user is in.
    try {
      await window.Api.launchEngine();
    } catch (e) {
      console.warn('[AccountGate] Engine launch failed:', e);
    }
    screen.style.display = 'none';
    // Refresh the dashboard page: it was rendered before login, when the trial
    // hadn't started yet, so the banner/countdown/engine status were empty.
    // Re-loading now makes the freshly-synced trial appear immediately.
    try {
      if (window.DashboardPage && typeof window.DashboardPage.loadData === 'function') {
        await window.DashboardPage.loadData();
      }
    } catch (e) {
      console.warn('[AccountGate] Dashboard refresh failed:', e);
    }
    // Populate the sidebar footer with the signed-in account details.
    try {
      var acct = await window.Api.getAccount();
      if (acct && acct.logged_in) {
        populateSidebar(acct.user);
        if (!(acct.user && acct.user.name)) await refreshSidebarProfile();
      }
    } catch (e) {
      console.warn('[AccountGate] Sidebar user refresh failed:', e);
    }
  }

  // ── Login ──────────────────────────────────────────────
  var loginBtn = document.getElementById('acct-login-btn');
  var loginStatus = document.getElementById('acct-login-status');
  var loginEmail = document.getElementById('acct-login-email');
  var loginPassword = document.getElementById('acct-login-password');

  async function doLogin() {
    if (busy) return;
    var email = (loginEmail.value || '').trim();
    var password = loginPassword.value || '';
    if (!email || !password) {
      setStatus(loginStatus, 'Please enter your email and password.', 'error');
      return;
    }
    busy = true;
    setBusy(loginBtn, true, 'Log In');
    setStatus(loginStatus, 'Contacting server…', 'info');
    try {
      var res = await window.Api.login(email, password);
      if (res && res.success) {
        setStatus(loginStatus, 'Logged in! Starting your trial…', 'success');
        await afterLogin();
      } else {
        setStatus(loginStatus, (res && res.error) || 'Login failed.', 'error');
      }
    } catch (e) {
      console.error('[AccountGate] Login failed:', e);
      setStatus(loginStatus, 'Could not reach the server. Check your internet connection.', 'error');
    } finally {
      busy = false;
      setBusy(loginBtn, false, 'Log In');
    }
  }

  if (loginBtn) loginBtn.addEventListener('click', doLogin);

  // ── Register → send OTP ────────────────────────────────
  var regSend = document.getElementById('acct-reg-send');
  var regStatus = document.getElementById('acct-reg-status');
  var regName = document.getElementById('acct-reg-name');
  var regEmail = document.getElementById('acct-reg-email');
  var regPassword = document.getElementById('acct-reg-password');

  async function doSendOtp() {
    if (busy) return;
    var name = (regName.value || '').trim();
    var email = (regEmail.value || '').trim();
    var password = regPassword.value || '';
    if (!name) {
      setStatus(regStatus, 'Please enter your name.', 'error');
      return;
    }
    if (!email || email.indexOf('@') === -1) {
      setStatus(regStatus, 'Please enter a valid email address.', 'error');
      return;
    }
    if (password.length < 6) {
      setStatus(regStatus, 'Password must be at least 6 characters.', 'error');
      return;
    }
    busy = true;
    setBusy(regSend, true, 'Send Verification Code');
    setStatus(regStatus, 'Sending verification code…', 'info');
    try {
      var res = await window.Api.sendOtp(email);
      if (res && res.success) {
        pendingRegister = { name: name, email: email, password: password };
        var hint = document.getElementById('acct-otp-hint');
        if (hint) hint.textContent = 'We emailed a 6-digit code to ' + email + '.';
        showPane('otp');
        setStatus(document.getElementById('acct-otp-status'), '', '');
      } else {
        setStatus(regStatus, (res && res.error) || 'Failed to send the code.', 'error');
      }
    } catch (e) {
      console.error('[AccountGate] Send OTP failed:', e);
      setStatus(regStatus, 'Could not reach the server. Check your internet connection.', 'error');
    } finally {
      busy = false;
      setBusy(regSend, false, 'Send Verification Code');
    }
  }

  if (regSend) regSend.addEventListener('click', doSendOtp);

  // ── OTP verify → create account ────────────────────────
  var otpBtn = document.getElementById('acct-otp-btn');
  var otpStatus = document.getElementById('acct-otp-status');
  var otpCode = document.getElementById('acct-otp-code');

  async function doVerify() {
    if (busy) return;
    if (!pendingRegister) {
      setStatus(otpStatus, 'Please start the registration again.', 'error');
      return;
    }
    var code = (otpCode.value || '').trim();
    if (code.length < 6) {
      setStatus(otpStatus, 'Please enter the 6-digit code from your email.', 'error');
      return;
    }
    busy = true;
    setBusy(otpBtn, true, 'Verify & Create Account');
    setStatus(otpStatus, 'Verifying code and creating your account…', 'info');
    try {
      var res = await window.Api.register(
        pendingRegister.name,
        pendingRegister.email,
        pendingRegister.password,
        code
      );
      if (res && res.success) {
        pendingRegister = null;
        setStatus(otpStatus, 'Account created! Starting your trial…', 'success');
        await afterLogin();
      } else {
        setStatus(otpStatus, (res && res.error) || 'Registration failed.', 'error');
      }
    } catch (e) {
      console.error('[AccountGate] Register failed:', e);
      setStatus(otpStatus, 'Could not reach the server. Check your internet connection.', 'error');
    } finally {
      busy = false;
      setBusy(otpBtn, false, 'Verify & Create Account');
    }
  }

  if (otpBtn) otpBtn.addEventListener('click', doVerify);

  var resend = document.getElementById('acct-otp-resend');
  var resendTimer = null;
  if (resend) {
    resend.addEventListener('click', async function (e) {
      e.preventDefault();
      if (!pendingRegister) return;
      if (resend.classList.contains('disabled')) return;
      
      setStatus(otpStatus, 'Resending code…', 'info');
      try {
        var res = await window.Api.sendOtp(pendingRegister.email);
        setStatus(otpStatus, res && res.success ? 'Code resent. Check your inbox.' : ((res && res.error) || 'Failed to resend.'), res && res.success ? 'success' : 'error');
        if (res && res.success) {
           resend.classList.add('disabled');
           let seconds = 60;
           resend.textContent = `Resend Code (${seconds}s)`;
           resendTimer = setInterval(() => {
              seconds--;
              if (seconds <= 0) {
                 clearInterval(resendTimer);
                 resend.classList.remove('disabled');
                 resend.textContent = 'Resend Code';
              } else {
                 resend.textContent = `Resend Code (${seconds}s)`;
              }
           }, 1000);
        }
      } catch (err) {
        setStatus(otpStatus, 'Could not reach the server.', 'error');
      }
    });
  }

  // ── Pane switching ─────────────────────────────────────
  var showRegister = document.getElementById('acct-show-register');
  var showLogin = document.getElementById('acct-show-login');
  if (showRegister) {
    showRegister.addEventListener('click', function (e) {
      e.preventDefault();
      showPane('register');
    });
  }
  if (showLogin) {
    showLogin.addEventListener('click', function (e) {
      e.preventDefault();
      showPane('login');
    });
  }

  // Enter-to-submit on the visible pane
  var enterMap = [
    { inputs: [loginEmail, loginPassword], fn: doLogin },
    { inputs: [regName, regEmail, regPassword], fn: doSendOtp },
    { inputs: [otpCode], fn: doVerify },
  ];
  enterMap.forEach(function (item) {
    (item.inputs || []).forEach(function (input) {
      if (input) {
        input.addEventListener('keydown', function (e) {
          if (e.key === 'Enter') item.fn();
        });
      }
    });
  });

  // ── Init ───────────────────────────────────────────────
  async function init() {
    var account;
    try {
      account = await window.Api.getAccount();
    } catch (e) {
      console.error('[AccountGate] Account check failed:', e);
      account = { logged_in: false };
    }
    if (account && account.logged_in) {
      // Already signed in from a previous launch — unlock instantly, no
      // network call. The engine was already started at app startup and the
      // trial is synced lazily by get_all_settings when needed.
      screen.style.display = 'none';
      populateSidebar(account.user);
      if (!(account.user && account.user.name)) {
        // Non-blocking: fill in the given name from the server if it's missing.
        refreshSidebarProfile();
      }
    } else {
      showPane('login');
      screen.style.display = 'flex';
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
