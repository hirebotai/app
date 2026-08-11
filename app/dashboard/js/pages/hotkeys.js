/**
 * Hirebotai Dashboard — Hotkeys Page
 * View and customize keyboard shortcuts
 */

const isMac = typeof navigator !== 'undefined' && /Mac|iPhone|iPad|iPod/.test(navigator.platform || '');
const modLabel = isMac ? 'Option' : 'Alt';
const modKey = isMac ? 'option' : 'alt';

const HotkeysPage = {
  hotkeys: [
    { id: 'hotkey_silent', label: `${modLabel} + O`, desc: 'Silent background activation (HUD stays hidden)' },
    { id: 'hotkey_capture', label: `${modLabel} + S`, desc: 'Capture screen & solve' },
    { id: 'hotkey_audio', label: `${modLabel} + A`, desc: isMac ? 'Toggle audio listening (system loopback)' : 'Toggle audio listening (WASAPI loopback)' },
    { id: 'hotkey_peek', label: `${modLabel} + H`, desc: 'Hold to view HUD (hides when released)' },
    { id: 'hotkey_ghost', label: `${modLabel} + T`, desc: 'Ghost mode (click-through)' },
    { id: 'hotkey_search', label: `${modLabel} + Q`, desc: 'Stealth text input for follow-ups' },
    { id: 'hotkey_type', label: `${modLabel} + P`, desc: 'Toggle stealth auto-typer' },
    { id: 'hotkey_interview', label: `${modLabel} + I`, desc: 'Toggle interview mode' },
    { id: 'hotkey_minimal', label: `${modLabel} + M`, desc: 'Toggle minimal mode' },
    { id: 'hotkey_clear', label: `${modLabel} + C`, desc: 'Clear answer & history' },
    { id: 'hotkey_exit', label: `${modLabel} + E`, desc: 'Exit application' },
    { id: 'hotkey_cheat', label: `${modLabel} + N`, desc: 'Show cheat sheet overlay' },
    { id: 'hotkey_scroll_up', label: `${modLabel} + ↑`, desc: 'Scroll HUD up' },
    { id: 'hotkey_scroll_dn', label: `${modLabel} + ↓`, desc: 'Scroll HUD down' },
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
    
    const isModifier = isMac ? ['Option', 'Control', 'Shift', 'Meta'].includes(key) : ['Alt', 'Control', 'Shift', 'Meta'].includes(key);
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
      pending.add(mainKey);
      input.dataset.pendingMods = [...pending].join(',');
      input.value = [...pending].join('+');
      return;
    }
    
    const allowedMain = /^[a-z0-9]$/i.test(mainKey) || ['↑','↓','←','→','Space'].includes(mainKey);
    if (!allowedMain) {
      Toast.error('Key not supported. Use letters, numbers or arrows.');
      input.value = '';
      input.dataset.pendingMods = '';
      input.blur();
      return;
    }
    
    if (e.altKey) pending.add(modLabel);
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
      const display = this.formatCombo(settings[hk.id] || hk.label);
      const parts = this.comboParts(display);
      const keys = parts.map(p => `<span class="keycap">${p}</span>`).join('<span class="keycap-plus">+</span>');
      return `
      <div class="hotkey-row">
        <span class="hotkey-keys">${keys}</span>
        <span class="hotkey-desc">${hk.desc}</span>
        <input 
          type="text" 
          class="input input-mono hotkey-input" 
          data-hotkey-id="${hk.id}"
          value="${display}"
          placeholder="Press keys..."
        >
      </div>
    `}).join('');
  },
  
  formatCombo(value) {
    return String(value || '')
      .replace(/[<>]/g, '')
      .split('+')
      .map(s => s.trim())
      .filter(Boolean)
      .map(s => {
        const lower = s.toLowerCase();
        if (lower === 'alt') return modLabel;
        if (/^(ctrl|shift|meta)$/i.test(s)) return s[0].toUpperCase() + s.slice(1);
        return s;
      })
      .join('+');
  },
  
  comboParts(value) {
    return String(value || '')
      .replace(/[<>]/g, '')
      .split('+')
      .map(s => s.trim())
      .filter(Boolean);
  },
  
  async saveHotkey(id, value) {
    const altMod = isMac ? 'option' : 'alt';
    const normalized = String(value || '')
      .replace(/[<>]/g, '')
      .split('+')
      .map(s => s.trim().toLowerCase())
      .filter(Boolean)
      .map(s => s === 'option' ? 'alt' : s)
      .join('+');
    
    if (!new RegExp(`^(?:(?:${altMod}|ctrl|shift|meta)\\+)*(?:[a-z0-9]|↑|↓|←|→|space)$`).test(normalized)) {
      Toast.error(`Unsupported hotkey. Try e.g. ${modLabel}+S or Ctrl+Shift+Q.`);
      await this.loadHotkeys();
      return;
    }
    
    try {
      await Api.setSetting(id, normalized);
      Toast.success('Hotkey updated');
      await this.loadHotkeys();
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
      hotkey_silent: `<${modKey}>+o`,
      hotkey_capture: `<${modKey}>+s`,
      hotkey_audio: `<${modKey}>+a`,
      hotkey_peek: `<${modKey}>+h`,
      hotkey_ghost: `<${modKey}>+t`,
      hotkey_search: `<${modKey}>+q`,
      hotkey_type: `<${modKey}>+p`,
      hotkey_interview: `<${modKey}>+i`,
      hotkey_minimal: `<${modKey}>+m`,
      hotkey_clear: `<${modKey}>+c`,
      hotkey_exit: `<${modKey}>+e`,
      hotkey_cheat: `<${modKey}>+n`,
      hotkey_scroll_up: `<${modKey}>+up`,
      hotkey_scroll_dn: `<${modKey}>+down`,
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