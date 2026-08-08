/**
 * Hirebotai Dashboard — API Keys Page
 * Configure AI provider API keys
 */

const ApiKeysPage = {
  providers: [
    {
      id: 'groq',
      name: 'Groq',
      key: 'groq_api_key',
      icon: 'groq',
      description: 'Ultra-fast inference for Llama, Mixtral, Gemma models. Best for text-only tasks.',
      url: 'https://console.groq.com/keys',
      format: 'gsk_...',
    },
    {
      id: 'openrouter',
      name: 'OpenRouter',
      key: 'openrouter_api_key',
      icon: 'openrouter',
      description: 'Access 100+ models including free vision models (Llama 3.2 Vision, Gemma). Required for screen capture.',
      url: 'https://openrouter.ai/keys',
      format: 'sk-or-... or v1-...',
    },
    {
      id: 'gemini',
      name: 'Google Gemini',
      key: 'gemini_api_key',
      icon: 'gemini',
      description: 'Google\'s multimodal models with generous free tier. Supports vision and long context.',
      url: 'https://aistudio.google.com/app/apikey',
      format: 'AIzaSy...',
    },
  ],
  
  async init() {
    this.bindEvents();
    await this.loadKeys();
  },
  
  async activate() {
    await this.loadKeys();
  },
  
  bindEvents() {
    on(document, 'click', '[data-save-key]', (e) => {
      const providerId = e.currentTarget.dataset.saveKey;
      this.saveKey(providerId);
    });
    
    on(document, 'click', '[data-test-key]', (e) => {
      const providerId = e.currentTarget.dataset.testKey;
      this.testKey(providerId);
    });
    
    on(document, 'click', '[data-delete-key]', (e) => {
      const providerId = e.currentTarget.dataset.deleteKey;
      this.deleteKey(providerId);
    });
    
    on(document, 'click', '[data-open-url]', (e) => {
      const url = e.currentTarget.dataset.openUrl;
      window.open(url, '_blank');
    });
    
    on(document, 'click', '#license-activate', () => this.activateLicense());
    on(document, 'keydown', '#license-key-input', (e) => {
      if (e.key === 'Enter') this.activateLicense();
    });
    
    // Toggle visibility
    on(document, 'click', '[data-toggle-visibility]', (e) => {
      const input = e.currentTarget.previousElementSibling;
      if (input && input.type === 'password') {
        input.type = 'text';
        e.currentTarget.innerHTML = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>';
      } else if (input) {
        input.type = 'password';
        e.currentTarget.innerHTML = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>';
      }
    });
  },
  
  async loadKeys() {
    try {
      const settings = await Api.getAllSettings();
      this.renderProviders(settings);
      this.renderLicense(settings);
    } catch (error) {
      console.error('Failed to load API keys:', error);
      Toast.error('Failed to load API keys');
    }
  },

  renderLicense(settings) {
    const badge = document.getElementById('license-badge');
    const status = document.getElementById('license-status');
    if (!badge) return;
    
    const key = settings.license_key || '';
    const isLicensed = key.startsWith('SA-');
    const trialStart = settings.trial_start;
    const expired = trialStart && (Date.now() - trialStart) >= 3 * 24 * 60 * 60 * 1000;
    
    if (isLicensed) {
      badge.textContent = 'Licensed';
      badge.className = 'license-badge licensed';
      if (status) {
        status.textContent = `Activated with ${key.slice(0, 4)}•••${key.slice(-4)}. All features unlocked.`;
        status.style.color = 'var(--color-accent-green)';
      }
    } else if (!expired && trialStart) {
      const remaining = 3 * 24 * 60 * 60 * 1000 - (Date.now() - trialStart);
      const h = Math.floor(remaining / 3600000);
      const m = Math.floor((remaining % 3600000) / 60000);
      badge.textContent = 'Trial';
      badge.className = 'license-badge trial';
      if (status) {
        status.textContent = `Trial active — ${h}h ${m}m remaining. Activate a license key to unlock full features.`;
        status.style.color = 'var(--color-accent-amber)';
      }
    } else {
      badge.textContent = 'No License';
      badge.className = 'license-badge';
      if (status) {
        status.textContent = 'No active license or trial. Activate a key or extend your trial to keep using HIREBOT AI.';
        status.style.color = 'var(--color-accent-red)';
      }
    }
  },

  async activateLicense() {
    const input = document.getElementById('license-key-input');
    const key = input?.value?.trim();
    
    if (!key) {
      Toast.warning('Please enter a license key');
      return;
    }
    
    const btn = document.getElementById('license-activate');
    setLoading(btn, true);
    
    try {
      const result = await Api.activateLicenseKey(key);
      if (result && result.success) {
        Toast.success('License activated!');
        await this.loadKeys();
      } else {
        const msg = document.getElementById('license-status');
        if (msg) {
          msg.textContent = (result && result.error) || 'Invalid license key';
          msg.style.color = 'var(--color-accent-red)';
        }
        Toast.error('Failed to activate license');
      }
    } catch (error) {
      Toast.error('Failed to activate license');
    } finally {
      setLoading(btn, false);
    }
  },

  renderProviders(settings) {
    const container = document.getElementById('provider-grid');
    if (!container) return;
    
    container.innerHTML = this.providers.map(p => this.renderProviderCard(p, settings)).join('');
  },
  
  renderProviderCard(provider, settings) {
    const isSet = settings[`${provider.key}_set`];
    const keyValue = settings[provider.key] || '';
    const maskedValue = keyValue ? '•'.repeat(24) : '';
    
    const iconSvg = this.getProviderIcon(provider.icon);
    
    return `
      <div class="card provider-card" data-provider="${provider.id}">
        <div class="provider-header">
          <div class="provider-icon ${provider.icon}">${iconSvg}</div>
          <div class="provider-info">
            <div class="provider-name">${provider.name}</div>
            <a href="${provider.url}" target="_blank" class="provider-link">Get API Key →</a>
          </div>
          <span class="key-status ${isSet ? 'configured' : 'missing'}">${isSet ? 'Configured' : 'Not Set'}</span>
        </div>
        
        <div class="key-input-group">
          <input 
            type="password" 
            class="input input-mono" 
            id="key-${provider.id}" 
            placeholder="${provider.format}"
            value="${maskedValue || ''}"
            ${isSet ? 'readonly' : ''}
          >
          <button class="btn btn-secondary btn-sm" data-toggle-visibility>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
          </button>
          ${isSet ? `
            <button class="btn btn-danger btn-sm" data-delete-key="${provider.id}">Remove</button>
          ` : `
            <button class="btn btn-primary btn-sm" data-save-key="${provider.id}">Save</button>
          `}
          <button class="btn btn-secondary btn-sm" data-test-key="${provider.id}" ${!isSet ? 'disabled' : ''}>Test</button>
        </div>
        
        <p class="provider-description">${provider.description}</p>
      </div>
    `;
  },
  
  getProviderIcon(id) {
    const icons = {
      groq: '<svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/></svg>',
      openrouter: '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>',
      gemini: '<svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor"><path d="M12.545,10.239v3.821h5.445c-0.712,2.315-2.647,4.092-5.445,4.092c-3.331,0-6.033-2.702-6.033-6.032s2.702-6.032,6.033-6.032c1.498,0,2.866,0.539,3.921,1.453l2.814-2.814C17.799,1.999,15.366,1,12.545,1C7.047,1,2.573,5.475,2.573,10.973s4.474,9.973,9.972,9.973c8.283,0,10.474-6.744,8.963-11.658H12.545z"/></svg>',
    };
    return icons[id] || icons.openrouter;
  },
  
  async saveKey(providerId) {
    const provider = this.providers.find(p => p.id === providerId);
    if (!provider) return;
    
    const input = document.getElementById(`key-${providerId}`);
    const value = input?.value?.trim();
    
    if (!value) {
      Toast.warning('Please enter an API key');
      return;
    }
    
    const btn = document.querySelector(`[data-save-key="${providerId}"]`);
    setLoading(btn, true);
    
    try {
      await Api.setSetting(provider.key, value);
      Toast.success(`${provider.name} API key saved`);
      await this.loadKeys();
    } catch (error) {
      Toast.error('Failed to save API key');
    } finally {
      setLoading(btn, false);
    }
  },
  
  async testKey(providerId) {
    const provider = this.providers.find(p => p.id === providerId);
    if (!provider) return;
    
    const btn = document.querySelector(`[data-test-key="${providerId}"]`);
    setLoading(btn, true);
    
    try {
      const result = await Api.testApiKey(providerId);
      if (result && result.success) {
        Toast.success(`${provider.name} connection test passed`);
      } else {
        Toast.error((result && result.error) || `${provider.name} connection test failed`);
      }
    } catch (error) {
      Toast.error('Connection test failed');
    } finally {
      setLoading(btn, false);
    }
  },
  
  async deleteKey(providerId) {
    const provider = this.providers.find(p => p.id === providerId);
    if (!provider) return;
    
    const confirmed = await Modal.confirm(
      `Remove ${provider.name} API key? This cannot be undone.`,
      'Remove API Key',
      { variant: 'danger' }
    );
    
    if (!confirmed) return;
    
    try {
      await Api.setSetting(provider.key, '');
      Toast.success(`${provider.name} API key removed`);
      await this.loadKeys();
    } catch (error) {
      Toast.error('Failed to remove API key');
    }
  },
};

window.ApiKeysPage = ApiKeysPage;