/**
 * Hirebotai Dashboard — Cheatsheet Page
 * Monospace editor for cheat sheets
 */

const CheatsheetPage = {
  async init() {
    this.bindEvents();
    await this.loadContent();
  },
  
  async activate() {
    await this.loadContent();
  },
  
  bindEvents() {
    const editor = document.getElementById('cheat-ed');
    const lineNumbers = document.getElementById('line-nums');
    
    if (editor) {
      // Sync line numbers
      editor.addEventListener('input', () => this.updateLineNumbers());
      editor.addEventListener('scroll', () => {
        if (lineNumbers) lineNumbers.scrollTop = editor.scrollTop;
      });
      editor.addEventListener('keydown', (e) => this.handleTabKey(e));
      
      // Auto-save debounced
      this.saveDebounced = debounce(() => this.saveContent(), 1000);
      editor.addEventListener('input', () => this.saveDebounced());
    }
    
    // Toolbar buttons
    on(document, 'click', '#cheat-save', () => this.saveContent());
    on(document, 'click', '#cheat-copy', () => this.copyContent());
    on(document, 'click', '#cheat-clear', () => this.clearContent());
  },
  
  async loadContent() {
    try {
      const content = await Api.getSetting('cheat_sheet_text');
      const editor = document.getElementById('cheat-ed');
      if (editor && content) {
        editor.value = content;
        this.updateLineNumbers();
      }
      this.updateEditorState();
    } catch (error) {
      console.error('Failed to load cheatsheet:', error);
    }
  },

  updateEditorState() {
    const editor = document.getElementById('cheat-ed');
    const emptyEl = document.getElementById('cheat-empty');
    const statsEl = document.getElementById('cheat-stats');
    
    if (!editor) return;
    
    const hasText = editor.value.trim().length > 0;
    if (emptyEl) emptyEl.style.display = hasText ? 'none' : 'flex';
    
    if (statsEl) {
      const lines = editor.value.split('\n').length;
      const chars = editor.value.length;
      statsEl.textContent = `${lines} line${lines === 1 ? '' : 's'} · ${chars} char${chars === 1 ? '' : 's'}`;
    }
  },
  
  updateLineNumbers() {
    const editor = document.getElementById('cheat-ed');
    const lineNumbers = document.getElementById('line-nums');
    if (!editor || !lineNumbers) return;
    
    const lines = editor.value.split('\n');
    lineNumbers.textContent = lines.map((_, i) => i + 1).join('\n');
    lineNumbers.scrollTop = editor.scrollTop;
    this.updateEditorState();
  },
  
  handleTabKey(e) {
    if (e.key === 'Tab') {
      e.preventDefault();
      const { target, shiftKey } = e;
      const start = target.selectionStart;
      const end = target.selectionEnd;
      
      if (shiftKey) {
        const lineStart = target.value.lastIndexOf('\n', start - 1) + 1;
        const lineEnd = target.value.indexOf('\n', end);
        const line = target.value.slice(lineStart, lineEnd === -1 ? undefined : lineEnd);
        
        if (line.startsWith('  ')) {
          target.value = target.value.slice(0, lineStart) + line.slice(2) + target.value.slice(lineEnd === -1 ? target.value.length : lineEnd);
          target.selectionStart = target.selectionEnd = start - 2;
        }
      } else {
        target.value = target.value.slice(0, start) + '  ' + target.value.slice(end);
        target.selectionStart = target.selectionEnd = start + 2;
      }
      
      this.updateLineNumbers();
      this.saveDebounced();
    }
  },
  
  async saveContent() {
    const editor = document.getElementById('cheat-ed');
    if (!editor) return;
    
    try {
      await Api.setSetting('cheat_sheet_text', editor.value);
      Toast.success('Cheat sheet saved');
    } catch (error) {
      Toast.error('Failed to save');
    }
  },
  
  async copyContent() {
    const editor = document.getElementById('cheat-ed');
    if (!editor) return;
    
    await copyToClipboard(editor.value, 'Cheat sheet copied!');
  },
  
  async clearContent() {
    const confirmed = await window.Modal.confirm(
      'Clear all cheat sheet content? This cannot be undone.',
      'Clear Cheat Sheet',
      { variant: 'danger' }
    );
    
    if (!confirmed) return;
    
    const editor = document.getElementById('cheat-ed');
    if (editor) {
      editor.value = '';
      this.updateLineNumbers();
      this.updateEditorState();
      await this.saveContent();
    }
  },
};

window.CheatsheetPage = CheatsheetPage;