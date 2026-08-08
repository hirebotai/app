/**
 * Hirebotai Dashboard — UI Components
 * Reusable component constructors
 */

// ═══════════════════════════════════════════════════════════
// UTILITIES
// ═══════════════════════════════════════════════════════════

function $(html, context = document) {
  const template = document.createElement('template');
  template.innerHTML = html.trim();
  return template.content.firstElementChild;
}

function $$(selector, context = document) {
  return Array.from(context.querySelectorAll(selector));
}

function on(element, event, selector, handler) {
  if (typeof selector === 'function') {
    handler = selector;
    selector = null;
  }
  
  element.addEventListener(event, (e) => {
    if (selector) {
      const target = e.target.closest(selector);
      if (target && element.contains(target)) {
        // Patch currentTarget so delegated handlers can rely on it
        const patched = new Proxy(e, {
          get(t, prop) {
            if (prop === 'currentTarget') return target;
            const v = t[prop];
            return typeof v === 'function' ? v.bind(t) : v;
          }
        });
        handler.call(target, patched);
      }
    } else {
      handler.call(element, e);
    }
  });
}

function emit(element, eventName, detail) {
  element.dispatchEvent(new CustomEvent(eventName, { detail, bubbles: true, composed: true }));
}

// ═══════════════════════════════════════════════════════════
// TOAST
// ═══════════════════════════════════════════════════════════

var ToastManager = class ToastManager {
  constructor() {
    this.container = null;
    this.toasts = new Map();
    this.id = 0;
  }
  
  init() {
    if (!this.container) {
      this.container = document.createElement('div');
      this.container.className = 'toast-container';
      this.container.id = 'toast-container';
      document.body.appendChild(this.container);
    }
  }
  
  show(message, type = 'info', title = '', duration = 4000) {
    this.init();
    
    const id = ++this.id;
    const icons = {
      success: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"></polyline></svg>',
      error: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><line x1="15" y1="9" x2="9" y2="15"></line><line x1="9" y1="9" x2="15" y2="15"></line></svg>',
      warning: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>',
      info: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg>',
    };
    
    const toast = $(`
      <div class="toast ${type}" data-toast-id="${id}" role="alert">
        <div class="toast-icon">${icons[type] || icons.info}</div>
        <div class="toast-content">
          ${title ? `<div class="toast-title">${title}</div>` : ''}
          <div class="toast-message">${message}</div>
        </div>
        <button class="toast-close" aria-label="Close">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
        </button>
      </div>
    `);
    
    this.container.appendChild(toast);
    this.toasts.set(id, toast);
    
    // Animate in
    requestAnimationFrame(() => toast.classList.add('show'));
    
    // Close handler
    const close = () => this.hide(id);
    toast.querySelector('.toast-close').addEventListener('click', close);
    
    // Auto hide
    if (duration > 0) {
      setTimeout(close, duration);
    }
    
    return id;
  }
  
  hide(id) {
    const toast = this.toasts.get(id);
    if (!toast) return;
    
    toast.classList.add('hiding');
    toast.addEventListener('transitionend', () => {
      toast.remove();
      this.toasts.delete(id);
    }, { once: true });
  }
  
  success(message, title, duration) { return this.show(message, 'success', title, duration); }
  error(message, title, duration) { return this.show(message, 'error', title, duration); }
  warning(message, title, duration) { return this.show(message, 'warning', title, duration); }
  info(message, title, duration) { return this.show(message, 'info', title, duration); }
}

window.Toast = new ToastManager();

// ═══════════════════════════════════════════════════════════
// MODAL
// ═══════════════════════════════════════════════════════════

var ModalManager = class ModalManager {
  constructor() {
    this.modals = new Map();
    this.stack = [];
  }
  
  create(id, options = {}) {
    const { title, content, footer, size = 'md', closable = true, onClose } = options;
    
    const sizes = {
      sm: 'max-w-320',
      md: 'max-w-520',
      lg: 'max-w-720',
      xl: 'max-w-920',
      full: 'max-w-full mx-4',
    };
    
    const overlay = $(`
      <div class="modal-overlay" data-modal-id="${id}" role="dialog" aria-modal="true" aria-labelledby="${id}-title">
        <div class="modal ${sizes[size]}">
          <div class="modal-header">
            <h3 class="modal-title" id="${id}-title">${title}</h3>
            ${closable ? `
              <button class="modal-close" aria-label="Close">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <line x1="18" y1="6" x2="6" y2="18"></line>
                  <line x1="6" y1="6" x2="18" y2="18"></line>
                </svg>
              </button>
            ` : ''}
          </div>
          <div class="modal-body">${content}</div>
          ${footer ? `<div class="modal-footer">${footer}</div>` : ''}
        </div>
      </div>
    `);
    
    const modalEl = overlay.querySelector('.modal');
    const closeBtn = overlay.querySelector('.modal-close');
    
    const close = () => this.close(id);
    
    if (closeBtn) closeBtn.addEventListener('click', close);
    
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) close();
    });
    
    const handleKeydown = (e) => {
      if (e.key === 'Escape' && this.stack[this.stack.length - 1] === id) {
        close();
      }
    };
    
    document.addEventListener('keydown', handleKeydown);
    
    this.modals.set(id, { overlay, close, onClose, handleKeydown });
    return overlay;
  }
  
  open(id, options = {}) {
    let modal = this.modals.get(id);
    
    if (!modal) {
      const overlay = this.create(id, options);
      document.body.appendChild(overlay);
      modal = this.modals.get(id);
    }
    
    this.stack.push(id);
    document.body.style.overflow = 'hidden';
    
    requestAnimationFrame(() => modal.overlay.classList.add('open'));
    
    return new Promise(resolve => {
      modal.resolve = resolve;
    });
  }
  
  close(id, result) {
    const modal = this.modals.get(id);
    if (!modal) return;
    
    const index = this.stack.indexOf(id);
    if (index > -1) this.stack.splice(index, 1);
    
    modal.overlay.classList.remove('open');
    
    let cleaned = false;
    const cleanup = () => {
      if (cleaned) return;
      cleaned = true;
      
      modal.overlay.remove();
      document.removeEventListener('keydown', modal.handleKeydown);
      
      if (this.stack.length === 0) {
        document.body.style.overflow = '';
      }
      
      if (modal.onClose) modal.onClose(result);
      if (modal.resolve) modal.resolve(result);
      
      this.modals.delete(id);
    };
    
    modal.overlay.addEventListener('transitionend', cleanup, { once: true });
    setTimeout(cleanup, 500);
  }
  
  closeAll() {
    [...this.stack].reverse().forEach(id => this.close(id));
  }
  
  // Confirm dialog
  confirm(message, title = 'Confirm', options = {}) {
    const id = `confirm-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const { confirmText = 'Confirm', cancelText = 'Cancel', variant = 'primary' } = options;
    
    // Open the modal (append happens synchronously inside open())
    const openPromise = this.open(id, {
      title,
      content: `<p style="color: var(--color-text-muted); line-height: 1.6;">${message}</p>`,
      footer: `
        <button class="btn btn-secondary" data-action="cancel">${cancelText}</button>
        <button class="btn btn-${variant}" data-action="confirm">${confirmText}</button>
      `,
    });
    
    return new Promise(resolve => {
      let settled = false;
      const done = (val) => {
        if (settled) return;
        settled = true;
        resolve(Boolean(val));
      };
      
      const overlay = this.modals.get(id)?.overlay;
      if (overlay) {
        overlay.querySelector('[data-action="confirm"]').addEventListener('click', () => {
          this.close(id, true);
          done(true);
        });
        overlay.querySelector('[data-action="cancel"]').addEventListener('click', () => {
          this.close(id, false);
          done(false);
        });
      }
      
      // Closed via X / backdrop / Escape → treat as false
      openPromise.then(() => done(false));
    });
  }
  
  // Alert dialog
  alert(message, title = 'Alert') {
    return this.confirm(message, title, { confirmText: 'OK', cancelText: '' }).then(() => {});
  }
  
  // Prompt dialog
  prompt(message, title = 'Prompt', defaultValue = '') {
    const id = `prompt-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    
    const openPromise = this.open(id, {
      title,
      content: `
        <p style="color: var(--color-text-muted); line-height: 1.6; margin-bottom: 16px;">${message}</p>
        <input type="text" class="input" id="${id}-input" value="${defaultValue}" autofocus>
      `,
      footer: `
        <button class="btn btn-secondary" data-action="cancel">Cancel</button>
        <button class="btn btn-primary" data-action="confirm">OK</button>
      `,
    });
    
    return new Promise(resolve => {
      let settled = false;
      const done = (val) => {
        if (settled) return;
        settled = true;
        resolve(val);
      };
      
      const overlay = this.modals.get(id)?.overlay;
      if (overlay) {
        const input = overlay.querySelector(`#${id}-input`);
        input.focus();
        input.select();
        
        const submit = () => {
          this.close(id, input.value);
          done(input.value);
        };
        
        overlay.querySelector('[data-action="confirm"]').addEventListener('click', submit);
        overlay.querySelector('[data-action="cancel"]').addEventListener('click', () => {
          this.close(id, null);
          done(null);
        });
        
        input.addEventListener('keydown', (e) => {
          if (e.key === 'Enter') submit();
        });
      }
      
      openPromise.then(() => done(null));
    });
  }
}

window.Modal = new ModalManager();

// ═══════════════════════════════════════════════════════════
// DROPDOWN
// ═══════════════════════════════════════════════════════════

function createDropdown(trigger, items, options = {}) {
  const { align = 'right', onSelect } = options;
  
  const dropdown = $(`
    <div class="dropdown">
      <div class="dropdown-menu" role="menu">
        ${items.map((item, i) => `
          <button class="dropdown-item ${item.danger ? 'danger' : ''}" data-value="${item.value}" role="menuitem" ${item.disabled ? 'disabled' : ''}>
            ${item.icon ? `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">${item.icon}</svg>` : ''}
            <span>${item.label}</span>
            ${item.shortcut ? `<span style="margin-left: auto; color: var(--color-text-faint); font-size: 11px;">${item.shortcut}</span>` : ''}
          </button>
          ${item.divider && i < items.length - 1 ? '<div class="dropdown-divider"></div>' : ''}
        `).join('')}
      </div>
    </div>
  `);
  
  const menu = dropdown.querySelector('.dropdown-menu');
  
  if (align === 'left') {
    menu.style.left = '0';
    menu.style.right = 'auto';
  }
  
  let isOpen = false;
  
  const open = () => {
    if (isOpen) return;
    isOpen = true;
    document.body.appendChild(dropdown);
    
    const rect = trigger.getBoundingClientRect();
    dropdown.style.position = 'fixed';
    dropdown.style.top = `${rect.bottom + 4}px`;
    dropdown.style[align] = `${window.innerWidth - rect[align === 'right' ? 'right' : 'left']}px`;
    dropdown.style.zIndex = '100';
    
    requestAnimationFrame(() => dropdown.classList.add('open'));
    
    document.addEventListener('click', closeOnOutsideClick);
    document.addEventListener('keydown', closeOnEscape);
  };
  
  const close = () => {
    if (!isOpen) return;
    isOpen = false;
    dropdown.classList.remove('open');
    dropdown.addEventListener('transitionend', () => dropdown.remove(), { once: true });
    document.removeEventListener('click', closeOnOutsideClick);
    document.removeEventListener('keydown', closeOnEscape);
  };
  
  const closeOnOutsideClick = (e) => {
    if (!dropdown.contains(e.target) && e.target !== trigger) close();
  };
  
  const closeOnEscape = (e) => {
    if (e.key === 'Escape') close();
  };
  
  // Item clicks
  menu.addEventListener('click', (e) => {
    const item = e.target.closest('.dropdown-item');
    if (item && !item.disabled) {
      const value = item.dataset.value;
      if (onSelect) onSelect(value, item);
      close();
    }
  });
  
  trigger.addEventListener('click', (e) => {
    e.stopPropagation();
    isOpen ? close() : open();
  });
  
  return { open, close, destroy: close };
}

// ═══════════════════════════════════════════════════════════
// TOOLTIP
// ═══════════════════════════════════════════════════════════

function initTooltips(root = document) {
  root.querySelectorAll('[data-tooltip]').forEach(el => {
    if (el._tooltipInitialized) return;
    el._tooltipInitialized = true;
    el.classList.add('tooltip');
  });
}

// ═══════════════════════════════════════════════════════════
// LOADING STATE
// ═══════════════════════════════════════════════════════════

function setLoading(element, loading) {
  if (loading) {
    element.classList.add('loading');
    element.disabled = true;
    element.dataset.originalText = element.innerHTML;
    const spinner = '<span class="spinner spinner-sm" style="margin-right: 8px;"></span>';
    element.innerHTML = spinner + (element.dataset.loadingText || 'Loading...');
  } else {
    element.classList.remove('loading');
    element.disabled = false;
    if (element.dataset.originalText) {
      element.innerHTML = element.dataset.originalText;
      delete element.dataset.originalText;
    }
  }
}

// ═══════════════════════════════════════════════════════════
// FORM HELPERS
// ═══════════════════════════════════════════════════════════

function serializeForm(form) {
  const data = {};
  new FormData(form).forEach((value, key) => {
    if (data[key]) {
      if (!Array.isArray(data[key])) data[key] = [data[key]];
      data[key].push(value);
    } else {
      data[key] = value;
    }
  });
  return data;
}

function populateForm(form, data) {
  Object.entries(data).forEach(([key, value]) => {
    const input = form.querySelector(`[name="${key}"]`);
    if (!input) return;
    
    if (input.type === 'checkbox') {
      input.checked = Boolean(value);
    } else if (input.type === 'radio') {
      const radio = form.querySelector(`[name="${key}"][value="${value}"]`);
      if (radio) radio.checked = true;
    } else {
      input.value = value;
    }
  });
}

function validateForm(form) {
  let valid = true;
  form.querySelectorAll('[required]').forEach(input => {
    if (!input.value.trim()) {
      input.classList.add('input-error');
      valid = false;
    } else {
      input.classList.remove('input-error');
    }
  });
  return valid;
}

// ═══════════════════════════════════════════════════════════
// DEBOUNCE / THROTTLE
// ═══════════════════════════════════════════════════════════

function debounce(fn, delay) {
  let timeoutId;
  return (...args) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => fn(...args), delay);
  };
}

function throttle(fn, limit) {
  let inThrottle;
  return (...args) => {
    if (!inThrottle) {
      fn(...args);
      inThrottle = true;
      setTimeout(() => inThrottle = false, limit);
    }
  };
}

// ═══════════════════════════════════════════════════════════
// COPY TO CLIPBOARD
// ═══════════════════════════════════════════════════════════

async function copyToClipboard(text, successMessage = 'Copied!') {
  try {
    await navigator.clipboard.writeText(text);
    window.Toast.success(successMessage);
    return true;
  } catch (error) {
    window.Toast.error('Failed to copy');
    return false;
  }
}

// ═══════════════════════════════════════════════════════════
// FORMAT HELPERS
// ═══════════════════════════════════════════════════════════

function formatDuration(ms) {
  if (ms < 1000) return `${ms}ms`;
  const seconds = Math.floor(ms / 1000);
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ${seconds % 60}s`;
  const hours = Math.floor(minutes / 60);
  return `${hours}h ${minutes % 60}m`;
}

function formatDate(timestamp) {
  const date = new Date(timestamp);
  return date.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function formatRelativeTime(timestamp) {
  const diff = Date.now() - timestamp;
  if (diff < 60000) return 'Just now';
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
  return `${Math.floor(diff / 86400000)}d ago`;
}

function truncate(text, length = 100) {
  if (text.length <= length) return text;
  return text.slice(0, length - 1) + '…';
}

// ── DOM HELPERS ──

function setText(id, text) {
  const el = document.getElementById(id);
  if (el) el.textContent = text;
}

function setStyle(id, prop, value) {
  const el = document.getElementById(id);
  if (el) el.style[prop] = value;
}

// ═══════════════════════════════════════════════════════════
// EXPORTS
// ═══════════════════════════════════════════════════════════

window.Components = {
  Toast: window.Toast,
  Modal: window.Modal,
  createDropdown,
  initTooltips,
  setLoading,
  serializeForm,
  populateForm,
  validateForm,
  debounce,
  throttle,
  copyToClipboard,
  formatDuration,
  formatDate,
  formatRelativeTime,
  truncate,
  setText,
  setStyle,
  $,
  $$,
  on,
  emit,
};