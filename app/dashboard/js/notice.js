/**
 * Hirebotai Dashboard — App Notice / Update Poster + Banner
 * Fetches the server-driven announcement + update payload once at launch.
 * Shows a centered poster on app open; pressing X collapses it to a compact
 * banner; pressing X on the banner dismisses it (remembered per id/version).
 */

(function () {
  var DISMISS_KEY = 'hb_app_notice_dismissed';
  var _currentNotice = null;

  function getDismissed() {
    try {
      return JSON.parse(window.localStorage.getItem(DISMISS_KEY)) || {};
    } catch (e) {
      return {};
    }
  }

  function setDismissed(map) {
    try {
      window.localStorage.setItem(DISMISS_KEY, JSON.stringify(map));
    } catch (e) { /* storage unavailable — ignore */ }
  }

  function defaultIcon(prefix) {
    var size = prefix === 'app-poster' ? 40 : 20;
    return '<svg width="' + size + '" height="' + size + '" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 11l18-5v12L3 14v-3z"/><path d="M11.6 16.8a3 3 0 1 1-5.8-1.6"/></svg>';
  }

  function downloadIcon(prefix) {
    var size = prefix === 'app-poster' ? 40 : 20;
    return '<svg width="' + size + '" height="' + size + '" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>';
  }

  function fill(prefix, notice) {
    document.getElementById(prefix + '-title').textContent = notice.title || '';
    document.getElementById(prefix + '-desc').textContent = notice.body || '';
    var icon = document.getElementById(prefix + '-icon');
    if (icon) {
      if (notice.icon && /^\s*</.test(notice.icon)) {
        icon.innerHTML = notice.icon;
      } else if (notice.update) {
        icon.innerHTML = downloadIcon(prefix);
      } else {
        icon.innerHTML = defaultIcon(prefix);
      }
    }

    var cta = document.getElementById(prefix + '-cta');
    if (notice.url && cta) {
      cta.style.display = '';
      cta.textContent = notice.cta_label || 'Learn More';
      cta.onclick = function () { window.Api.openUrl(notice.url); };
    } else if (cta) {
      cta.style.display = 'none';
      cta.onclick = null;
    }
  }

  function showPoster(notice) {
    var overlay = document.getElementById('app-poster');
    var card = document.getElementById('app-poster-card');
    if (!overlay || !card) return showBanner(notice);
    _currentNotice = notice;
    fill('app-poster', notice);
    card.classList.toggle('update', !!notice.update);
    overlay.style.display = '';
  }

  function showBanner(notice) {
    var el = document.getElementById('app-notice');
    if (!el) return;
    _currentNotice = notice;
    fill('app-notice', notice);
    el.classList.toggle('update', !!notice.update);
    el.style.display = '';
  }

  function hideAll() {
    var poster = document.getElementById('app-poster');
    if (poster) poster.style.display = 'none';
    var banner = document.getElementById('app-notice');
    if (banner) banner.style.display = 'none';
  }

  // Never show the poster/banner during a live practice session (fullscreen focus mode).
  function refreshVisibility() {
    if (window.Store && window.Store.get('practiceState') === 'console') {
      hideAll();
    }
  }

  // Collapse the poster into the compact banner (no dismissal recorded).
  function collapsePoster() {
    var overlay = document.getElementById('app-poster');
    if (overlay) overlay.style.display = 'none';
    if (_currentNotice) showBanner(_currentNotice);
  }

  // Dismiss the banner and remember so it doesn't re-appear next launch.
  function dismissBanner() {
    hideAll();
    var notice = _currentNotice;
    if (!notice) return;
    var map = getDismissed();
    if (notice.update && notice.version) map['update:' + notice.version] = true;
    if (notice.id) map['ann:' + notice.id] = true;
    setDismissed(map);
    _currentNotice = null;
  }

  function buildPayload(res) {
    var announcement = res.announcement;
    var update = res.update;

    // Announcement: skip if this announcement id was already dismissed.
    if (announcement && announcement.id && dismissed['ann:' + announcement.id]) {
      announcement = null;
    }

    // Update: always show until the user installs it. Do NOT persist dismissal.
    if (update) {
      return {
        update: true,
        version: update.version,
        icon: null,
        title: 'Update available — v' + update.version,
        body: update.notes || 'A new version of Hirebot AI is ready. Download the latest installer to update.',
        url: update.url,
        cta_label: 'Download',
      };
    }

    if (announcement) {
      return {
        update: false,
        id: announcement.id,
        icon: announcement.icon,
        title: announcement.title,
        body: announcement.body,
        url: announcement.url,
        cta_label: announcement.cta_label,
      };
    }

    return null;
  }

  function init() {
    var existing = document.getElementById('app-notice');
    var overlay = document.getElementById('app-poster');
    if (!existing && !overlay) return;

    try {
      window.Api.getAppNotice().then(function (res) {
        if (!res || !res.success) return;

        var notice = buildPayload(res);
        if (notice) {
          showPoster(notice);
        } else {
          hideAll();
        }
      });
    } catch (e) {
      console.warn('App notice fetch failed:', e);
      hideAll();
    }

    var posterClose = document.getElementById('app-poster-close');
    if (posterClose) posterClose.addEventListener('click', collapsePoster);

    var bannerClose = document.getElementById('app-notice-close');
    if (bannerClose) bannerClose.addEventListener('click', dismissBanner);

    // Hide the poster/banner while a practice session is running.
    if (window.Store) {
      window.Store.subscribe('practiceState', refreshVisibility);
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
