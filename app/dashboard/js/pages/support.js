/**
 * Hirebotai Dashboard — Support Page
 * Help, documentation, and contact links
 */

const SupportPage = {
  async init() {
    this.bindEvents();
  },

  bindEvents() {
    on(document, 'click', '[data-support-action]', (e) => {
      const action = e.currentTarget.dataset.supportAction;
      this.handleAction(action);
    });

    on(document, 'click', '#support-copy-diagnostics', () => this.copyDiagnostics());

    // Search box: Enter opens docs (lightweight without a docs index)
    on(document, 'keydown', '#support-search-input', (e) => {
      if (e.key === 'Enter') this.handleAction('docs');
    });

    // Bug report submit
    on(document, 'click', '#submit-feedback-btn', () => this.submitFeedback());
  },

  handleAction(action) {
    const urls = {
      docs: 'https://hirebotai.in/docs',
      discord: 'https://discord.gg/XgEWTr22G',
      email: 'mailto:hello@hirebotai.in',
      twitter: 'https://twitter.com/hirebotai',
      github: 'https://github.com/hirebotai',
      changelog: 'https://hirebotai.in/changelog',
      privacy: 'https://hirebotai.in/privacy',
      terms: 'https://hirebotai.in/terms',
    };

    if (action === 'bug') {
      const modal = document.getElementById('feedback-modal');
      if (modal) {
        document.getElementById('feedback-text').value = '';
        modal.classList.add('open');
      }
      return;
    }

    if (urls[action]) {
      Api.openUrl(urls[action]);
    }
  },

  async submitFeedback() {
    const textEl = document.getElementById('feedback-text');
    const text = textEl ? textEl.value.trim() : '';

    if (!text) {
      Toast.error('Please enter some text before submitting.');
      return;
    }

    const btn = document.getElementById('submit-feedback-btn');
    const oldText = btn.textContent;
    btn.textContent = 'Sending...';
    btn.disabled = true;

    try {
      const res = await Api.submitFeedback(text);
      if (res && res.success) {
        Toast.success('Feedback sent successfully. Thank you!');
        document.getElementById('feedback-modal').classList.remove('open');
      } else {
        Toast.error(res?.error || 'Failed to send feedback.');
      }
    } catch (e) {
      console.error(e);
      Toast.error('An error occurred while sending feedback.');
    } finally {
      btn.textContent = oldText;
      btn.disabled = false;
    }
  },

  async copyDiagnostics() {
    try {
      const settings = await Api.getAllSettings();
      const sessions = await Api.getSessions('interview');

      const diagnostics = {
        timestamp: new Date().toISOString(),
        version: '1.17.8.26',
        platform: navigator.platform,
        userAgent: navigator.userAgent,
        settings: {
          master_power: settings.master_power,
          auto_start: settings.auto_start,
          no_tray: settings.no_tray,
          log_history: settings.log_history,
          hud_opacity: settings.hud_opacity,
          hud_font_size: settings.hud_font_size,
          hud_auto_hide: settings.hud_auto_hide,
          typing_speed: settings.typing_speed,
          trial_start: settings.trial_start,
          license_key: settings.license_key ? 'SET' : 'NOT SET',
          groq_api_key: settings.groq_api_key_set ? 'SET' : 'NOT SET',
          openrouter_api_key: settings.openrouter_api_key_set ? 'SET' : 'NOT SET',
        },
        session_count: sessions.length,
      };

      await copyToClipboard(JSON.stringify(diagnostics, null, 2), 'Diagnostics copied to clipboard!');
    } catch (error) {
      Toast.error('Failed to copy diagnostics');
    }
  },
};

window.SupportPage = SupportPage;