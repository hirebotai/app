/**
 * Hirebotai Dashboard — Hotkeys Page
 * View and customize keyboard shortcuts
 */

const HotkeysPage = {
  hotkeys: [
    { id: 'hotkey_silent', label: 'Alt + O', desc: 'Silent background activation (HUD stays hidden)' },
    { id: 'hotkey_capture', label: 'Alt + S', desc: 'Capture screen & solve' },
    { id: 'hotkey_audio', label: 'Alt + A', desc: 'Toggle audio listening (WASAPI loopback)' },
    { id: 'hotkey_peek', label: 'Alt + H', desc: 'Hold to view HUD / Toggle visibility' },
    { id: 'hotkey_sticky', label: 'Alt + K', desc: 'Sticky HUD toggle (keep visible)' },
    { id: 'hotkey_ghost', label: 'Alt + T', desc: 'Ghost mode (click-through)' },
    { id: 'hotkey_search', label: 'Alt + Q', desc: 'Stealth text input for follow-ups' },
    { id: 'hotkey_type', label: 'Alt + P', desc: 'Toggle stealth auto-typer' },
    { id: 'hotkey_interview', label: 'Alt + I', desc: 'Toggle interview mode' },
    { id: 'hotkey_minimal', label: 'Alt + M', desc: 'Toggle minimal mode' },
    { id: 'hotkey_clear', label: 'Alt + C', desc: 'Clear answer & history' },
    { id: 'hotkey_exit', label: 'Alt + E', desc: 'Exit application' },
    { id: 'hotkey_cheat', label: 'Alt + N', desc: 'Show cheat sheet overlay' },
    { id: 'hotkey_scroll_up', label: 'Alt + ↑', desc: 'Scroll HUD up' },
    { id: 'hotkey_scroll_dn', label: 'Alt + ↓', desc: 'Scroll HUD down' },
  ],
  
  async init() {
    this.bindEvents();
    await this.loadHotkeys();
  },
  
  async activate() {
    await this.loadHotkeys();
  },
  
  bindEvents() {
    on(document, 'change', '.hotkey-input', (e) => {
      const id = e.currentTarget.dataset.hotkeyId;
      const value = e.currentTarget.value.trim();
      this.saveHotkey(id, value);
    });
    
    on(document, 'keydown', '.hotkey-input', (e) => this.captureCombo(e));
    
    on(document, 'click', '#hotkeys-reset', () => this.resetHotkeys());
    on(document, 'click', '#hotkeys-copy', () => this.copyHotkeys());
  },

  captureCombo(e) {
    e.preventDefault();
    e.stopPropagation();
    
    const input = e.currentTarget;
    const key = e.key;
    
    if (key === 'Escape' || key === 'Enter') {
      input.blur();
      return;
    }
    if (key === 'Backspace' || key === 'Delete') {
      input.value = '';
      input.dataset.pendingMods = '';
      return;
    }
    
    const isModifier = ['Alt', 'Control', 'Shift', 'Meta'].includes(key);
    let mainKey = key;
    if (key === 'Control') mainKey = 'Ctrl';
    else if (key === 'Meta') mainKey = 'Meta';
    else if (key === 'ArrowUp') mainKey = '↑';
    else if (key === 'ArrowDown') mainKey = '↓';
    else if (key === 'ArrowLeft') mainKey = '←';
    else if (key === 'ArrowRight') mainKey = '→';
    else if (key === ' ') mainKey = 'Space';
    else if (mainKey.length === 1) mainKey = mainKey.toUpperCase();
    
    const pending = new Set((input.dataset.pendingMods || '').split(',').filter(Boolean));
    
    if (isModifier) {
      // Holding a modifier alone — wait for the main key
      pending.add(mainKey);
      input.dataset.pendingMods = [...pending].join(',');
      input.value = [...pending].join('+');
      return;
    }
    
    // Final combo: held modifiers + main key
    if (e.altKey) pending.add('Alt');
    if (e.ctrlKey) pending.add('Ctrl');
    if (e.shiftKey) pending.add('Shift');
    if (e.metaKey) pending.add('Meta');
    
    const combo = [...pending, mainKey].join('+');
    input.value = combo;
    input.dataset.pendingMods = '';
    
    const id = input.dataset.hotkeyId;
    this.saveHotkey(id, combo);
    input.blur();
  },
  
  async loadHotkeys() {
    try {
      const settings = await Api.getAllSettings();
      this.renderHotkeys(settings);
    } catch (error) {
      console.error('Failed to load hotkeys:', error);
      Toast.error('Failed to load hotkeys');
    }
  },
  
  renderHotkeys(settings) {
    const container = document.getElementById('hotkeys-table');
    if (!container) return;
    
    container.innerHTML = this.hotkeys.map(hk => {
      const parts = this.comboParts(settings[hk.id] || hk.label);
      const keys = parts.map(p => `<span class="keycap">${p}</span>`).join('<span class="keycap-plus">+</span>');
      return `
      <div class="hotkey-row">
        <span class="hotkey-keys">${keys}</span>
        <span class="hotkey-desc">${hk.desc}</span>
        <input 
          type="text" 
          class="input input-mono hotkey-input" 
          data-hotkey-id="${hk.id}"
          value="${settings[hk.id] || hk.label}"
          placeholder="Press keys..."
        >
      </div>
    `}).join('');
  },
  
  comboParts(value) {
    return String(value || '')
      .replace(/[<>]/g, '')
      .split('+')
      .map(s => s.trim())
      .filter(Boolean);
  },
  
  async saveHotkey(id, value) {
    // Validate format
    if (!value.match(/^(alt|ctrl|shift|meta)?\+?[a-z0-9]$/i) && !value.match(/^alt\s*\+\s*(up|down|left|right)$/i)) {
      // Allow but warn
    }
    
    try {
      await Api.setSetting(id, value);
      Toast.success('Hotkey updated');
      await this.loadHotkeys(); // Re-render to show in badge
    } catch (error) {
      Toast.error('Failed to save hotkey');
    }
  },
  
  async resetHotkeys() {
    const confirmed = await window.Modal.confirm(
      'Reset all hotkeys to defaults? This cannot be undone.',
      'Reset Hotkeys',
      { variant: 'danger' }
    );
    
    if (!confirmed) return;
    
    try {
      const defaults = {
        hotkey_silent: '<alt>+o',
        hotkey_capture: '<alt>+s',
        hotkey_audio: '<alt>+a',
        hotkey_peek: '<alt>+h',
        hotkey_sticky: '<alt>+k',
        hotkey_ghost: '<alt>+t',
        hotkey_search: '<alt>+q',
        hotkey_type: '<alt>+p',
        hotkey_interview: '<alt>+i',
        hotkey_minimal: '<alt>+m',
        hotkey_clear: '<alt>+c',
        hotkey_exit: '<alt>+e',
        hotkey_cheat: '<alt>+n',
        hotkey_scroll_up: '<alt>+up',
        hotkey_scroll_dn: '<alt>+down',
      };
      
      for (const [key, value] of Object.entries(defaults)) {
        await Api.setSetting(key, value);
      }
      
      Toast.success('Hotkeys reset to defaults');
      await this.loadHotkeys();
    } catch (error) {
      Toast.error('Failed to reset hotkeys');
    }
  },
  
  async copyHotkeys() {
    const settings = await Api.getAllSettings();
    const lines = this.hotkeys.map(hk => `${hk.label.padEnd(12)} → ${settings[hk.id] || hk.label}`).join('\n');
    await copyToClipboard(lines, 'Hotkeys copied to clipboard!');
  },
};

window.HotkeysPage = HotkeysPage;