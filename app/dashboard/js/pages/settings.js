/**
 * Hirebotai Dashboard — Settings Page
 * General application settings
 */

const SettingsPage = {
  settings: [
    // App Behavior
    { key: 'master_power', label: 'Master Power', desc: 'When OFF — all hotkeys stop and the engine won\'t restart on boot.', type: 'toggle', section: 'behavior' },
    { key: 'auto_start', label: 'Start with Windows', desc: 'Launch dashboard automatically at login.', type: 'toggle', section: 'behavior' },
    { key: 'no_tray', label: 'Hide System Tray', desc: 'Run completely in background without tray icon.', type: 'toggle', section: 'behavior' },
    { key: 'log_history', label: 'Log Session History', desc: 'Save screen captures, audio transcripts, and practice sessions to local database.', type: 'toggle', section: 'behavior' },
    
    // HUD Appearance
    { key: 'hud_opacity', label: 'HUD Opacity', desc: 'Opacity of the HUD panel — 100 is solid, 1 is almost fully see-through (text stays readable).', type: 'range', min: 1, max: 100, step: 1, section: 'hud' },
    { key: 'hud_text_opacity', label: 'HUD Text Opacity', desc: 'Opacity of the answer text inside the HUD.', type: 'range', min: 5, max: 100, step: 5, section: 'hud' },
    { key: 'hud_font_size', label: 'HUD Font Size', desc: 'Text size in the HUD answer display.', type: 'select', options: ['Small', 'Medium', 'Large'], section: 'hud' },
    { key: 'hud_answer_color', label: 'HUD Answer Accent Color', desc: 'Accent color for AI answer cards and headers in the HUD.', type: 'select', options: [
      { value: '#34D399', label: 'Emerald Green (#34D399)' },
      { value: '#38BDF8', label: 'Sky Blue (#38BDF8)' },
      { value: '#C084FC', label: 'Neon Purple (#C084FC)' },
      { value: '#FBBF24', label: 'Amber Gold (#FBBF24)' },
      { value: '#F43F5E', label: 'Rose Red (#F43F5E)' },
      { value: '#FFFFFF', label: 'Crisp White (#FFFFFF)' },
    ], section: 'hud' },
    { key: 'hud_auto_hide', label: 'Auto-hide HUD', desc: 'Automatically hide HUD after inactivity.', type: 'select', options: ['Never', '5s', '10s', '30s', '60s'], section: 'hud' },
    { key: 'hud_show_controls', label: 'Show HUD Controls', desc: 'Show opacity, screenshot, and text size controls directly on the HUD header.', type: 'toggle', section: 'hud' },
    { key: 'view_onboarding', label: 'How To Use', desc: 'Replay the first-run tutorial and privacy guide anytime.', type: 'button', variant: 'secondary', action: 'viewOnboarding', section: 'hud' },
    
    // Typing
    { key: 'typing_speed', label: 'Auto-typer Speed (CPM)', desc: 'Characters per minute for stealth typing.', type: 'number', min: 60, max: 600, step: 10, section: 'typing' },
    { key: 'typer_auto_indent', label: 'Skip Auto-Indent', desc: 'Skip the leading spaces/tabs after Enter (most editors auto-indent). Turn OFF if indentation is being lost.', type: 'toggle', section: 'typing' },
    
    // Practice
    { key: 'practice_speech_rate', label: 'Speech Rate', desc: 'Playback speed for practice TTS.', type: 'select', options: ['0.5', '0.75', '1.0', '1.25', '1.5'], section: 'practice' },
    { key: 'practice_voice_name', label: 'Voice', desc: 'Text-to-speech voice for practice sessions.', type: 'select', options: ['Default', 'Microsoft David', 'Microsoft Zira', 'Microsoft Mark'], section: 'practice' },
    
    // Danger Zone
    { key: 'stop_hidden_processes', label: 'Kill Hidden Processes', desc: 'Immediately stop this app\'s hidden HUD engine and relaunch listener. The dashboard stays open.', type: 'button', variant: 'danger', action: 'stopHiddenProcesses', section: 'danger' },
    { key: 'factory_reset', label: 'Factory Reset', desc: 'Delete all settings, resumes, history, and API keys. Cannot be undone.', type: 'button', variant: 'danger', action: 'factoryReset', section: 'danger' },
  ],
  
  async init() {
    this.bindEvents();
    await this.loadSettings();
  },
  
  async activate() {
    await this.loadSettings();
  },
  
  bindEvents() {
    // Toggle switches
    on(document, 'change', '.setting-toggle', (e) => {
      const key = e.currentTarget.dataset.settingKey;
      this.saveSetting(key, e.currentTarget.checked);
    });
    
    // Select inputs
    on(document, 'change', '.setting-select', (e) => {
      const key = e.currentTarget.dataset.settingKey;
      this.saveSetting(key, e.currentTarget.value);
    });
    
    // Number inputs
    on(document, 'change', '.setting-number', (e) => {
      const key = e.currentTarget.dataset.settingKey;
      this.saveSetting(key, parseInt(e.currentTarget.value, 10));
    });
    
    // Range inputs
    on(document, 'input', '.setting-range', (e) => {
      const key = e.currentTarget.dataset.settingKey;
      const value = parseInt(e.currentTarget.value, 10);
      setText(`range-value-${key}`, value);
    });
    on(document, 'change', '.setting-range', (e) => {
      const key = e.currentTarget.dataset.settingKey;
      this.saveSetting(key, parseInt(e.currentTarget.value, 10));
    });
    
    // Action buttons
    on(document, 'click', '[data-action]', (e) => {
      const action = e.currentTarget.dataset.action;
      if (action === 'factoryReset') this.factoryReset();
      if (action === 'stopHiddenProcesses') this.stopHiddenProcesses();
      if (action === 'viewOnboarding') this.viewOnboarding();
    });
  },
  
  async loadSettings() {
    try {
      const settings = await Api.getAllSettings();
      this.renderSettings(settings);
    } catch (error) {
      console.error('Failed to load settings:', error);
      Toast.error('Failed to load settings');
    }
  },
  
  renderSettings(settings) {
    const container = document.getElementById('settings-grid');
    if (!container) return;
    
    const sections = {
      behavior: { title: 'Application Behavior', icon: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"></circle><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path></svg>' },
      hud: { title: 'HUD Appearance', icon: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="3" width="20" height="14" rx="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/></svg>' },
      typing: { title: 'Auto-typer', icon: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="4" width="20" height="16" rx="2"/><path d="M6 8h.01M10 8h.01M14 8h.01M18 8h.01M8 12h.01M12 12h.01M16 12h.01M7 16h10"/></svg>' },
      practice: { title: 'Practice Room', icon: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" y1="19" x2="12" y2="22"/></svg>' },
      danger: { title: 'Danger Zone', icon: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>' },
    };
    
    let html = '';
    
    for (const [sectionKey, section] of Object.entries(sections)) {
      const sectionSettings = this.settings.filter(s => s.section === sectionKey);
      if (!sectionSettings.length) continue;
      
      html += `
        <div class="settings-card">
          <div class="settings-card-header">
            <span class="settings-card-icon">${section.icon}</span>
            <h2 class="section-title">${section.title}</h2>
          </div>
          <div class="settings-card-body">
            ${sectionSettings.map(s => this.renderSettingRow(s, settings)).join('')}
          </div>
        </div>
      `;
    }
    
    container.innerHTML = html;
  },
  
  renderSettingRow(setting, settings) {
    const value = settings[setting.key];
    
    switch (setting.type) {
      case 'toggle':
        return `
          <div class="setting-row">
            <div class="setting-info">
              <div class="setting-name">${setting.label}</div>
              <div class="setting-desc">${setting.desc}</div>
            </div>
            <label class="toggle">
              <input type="checkbox" class="setting-toggle" data-setting-key="${setting.key}" ${value ? 'checked' : ''}>
              <div class="toggle-track"></div>
              <div class="toggle-knob"></div>
            </label>
          </div>
        `;
      
      case 'select':
        return `
          <div class="setting-row">
            <div class="setting-info">
              <div class="setting-name">${setting.label}</div>
              <div class="setting-desc">${setting.desc}</div>
            </div>
            <select class="input setting-select" data-setting-key="${setting.key}" style="width:200px;">
              ${setting.options.map(opt => {
                const optValue = typeof opt === 'object' ? opt.value : opt;
                const optLabel = typeof opt === 'object' ? opt.label : opt;
                return `<option value="${optValue}" ${value === optValue ? 'selected' : ''}>${optLabel}</option>`;
              }).join('')}
            </select>
          </div>
        `;
      
      case 'number':
        return `
          <div class="setting-row">
            <div class="setting-info">
              <div class="setting-name">${setting.label}</div>
              <div class="setting-desc">${setting.desc}</div>
            </div>
            <input type="number" class="input setting-number" data-setting-key="${setting.key}" value="${value}" min="${setting.min}" max="${setting.max}" step="${setting.step}" style="width:100px;">
          </div>
        `;
      
      case 'range':
        return `
          <div class="setting-row">
            <div class="setting-info">
              <div class="setting-name">${setting.label}</div>
              <div class="setting-desc">${setting.desc}</div>
            </div>
            <div style="display:flex;align-items:center;gap:12px;min-width:200px;">
              <input type="range" class="setting-range" data-setting-key="${setting.key}" value="${value}" min="${setting.min}" max="${setting.max}" step="${setting.step}" style="flex:1;">
              <span id="range-value-${setting.key}" style="font-family:var(--font-mono);font-weight:600;color:var(--color-brand);min-width:40px;text-align:right;">${value}</span>
            </div>
          </div>
        `;
      
      case 'button':
        return `
          <div class="setting-row">
            <div class="setting-info">
              <div class="setting-name">${setting.label}</div>
              <div class="setting-desc">${setting.desc}</div>
            </div>
            <button class="btn btn-${setting.variant || 'secondary'} btn-sm" data-action="${setting.action}">${setting.label}</button>
          </div>
        `;
    }
  },
  
  async saveSetting(key, value) {
    try {
      await Api.setSetting(key, value);
      Store.set(key, value);
    } catch (error) {
      Toast.error('Failed to save setting');
      // Reload to revert UI
      await this.loadSettings();
    }
  },
  
  async factoryReset() {
    const confirmed = await Modal.confirm(
      'This will DELETE ALL DATA: settings, resumes, API keys, and history. Your trial and license are kept. Type "RESET" to confirm.',
      'Factory Reset',
      { variant: 'danger', confirmText: 'RESET' }
    );
    
    if (!confirmed) return;
    
    const doubleConfirm = await Modal.prompt(
      'Type RESET to confirm factory reset:',
      'Confirm Factory Reset',
      ''
    );
    
    if (doubleConfirm !== 'RESET') {
      Toast.info('Reset cancelled');
      return;
    }
    
    try {
      await Api.factoryReset();
      Toast.success('Factory reset complete. Reloading...');
      setTimeout(() => window.location.reload(), 1500);
    } catch (error) {
      Toast.error('Factory reset failed');
    }
  },

  async stopHiddenProcesses() {
    const confirmed = await Modal.confirm(
      'This immediately stops the hidden HUD engine and its relaunch listener. The dashboard will remain open.',
      'Kill Hidden Processes',
      { variant: 'danger', confirmText: 'Kill Processes' }
    );
    if (!confirmed) return;

    const btn = document.querySelector('[data-action="stopHiddenProcesses"]');
    setLoading(btn, true);
    try {
      const result = await Api.stopHiddenProcesses();
      if (!result || !result.success) {
        Toast.error((result && result.error) || 'Could not stop hidden processes');
      } else if (result.stopped && result.stopped.length) {
        Toast.success(`Stopped: ${result.stopped.join(', ')}`);
      } else {
        Toast.info('No hidden Hirebotai processes were running');
      }
    } catch (error) {
      Toast.error('Could not stop hidden processes');
    } finally {
      setLoading(btn, false);
    }
  },

  async viewOnboarding() {
    const btn = document.querySelector('[data-action="viewOnboarding"]');
    setLoading(btn, true);
    try {
      if (window.Onboarding) {
        window.Onboarding.reset();
      }
      Toast.success('Onboarding reset. It will appear on next dashboard load.');
    } catch (error) {
      Toast.error('Failed to reset onboarding');
    } finally {
      setLoading(btn, false);
    }
  },
};

window.SettingsPage = SettingsPage;
