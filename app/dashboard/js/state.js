/**
 * Hirebotai Dashboard — State Management
 * Simple reactive store with subscriptions
 */

var Store = class Store {
  constructor(initialState = {}) {
    this.state = { ...initialState };
    this.listeners = new Map();
    this.computed = new Map();
  }
  
  // Subscribe to state changes
  subscribe(key, callback) {
    if (!this.listeners.has(key)) {
      this.listeners.set(key, new Set());
    }
    this.listeners.get(key).add(callback);
    
    // Return unsubscribe function
    return () => {
      const listeners = this.listeners.get(key);
      if (listeners) {
        listeners.delete(callback);
      }
    };
  }
  
  // Subscribe to multiple keys
  subscribeAll(keys, callback) {
    const unsubs = keys.map(key => this.subscribe(key, callback));
    return () => unsubs.forEach(unsub => unsub());
  }
  
  // Get state value
  get(key) {
    return this.state[key];
  }
  
  // Get multiple values
  getAll(...keys) {
    return keys.reduce((obj, key) => {
      obj[key] = this.state[key];
      return obj;
    }, {});
  }
  
  // Set state value
  set(key, value) {
    const oldValue = this.state[key];
    if (oldValue === value) return;
    
    this.state[key] = value;
    this.notify(key, value, oldValue);
  }
  
  // Set multiple values
  setAll(updates) {
    Object.entries(updates).forEach(([key, value]) => {
      this.set(key, value);
    });
  }
  
  // Update nested object
  update(key, updater) {
    const current = this.state[key];
    const next = typeof updater === 'function' ? updater(current) : updater;
    this.set(key, next);
  }
  
  // Notify listeners
  notify(key, value, oldValue) {
    const listeners = this.listeners.get(key);
    if (listeners) {
      listeners.forEach(callback => {
        try {
          callback(value, oldValue, key);
        } catch (error) {
          console.error(`Store listener error for ${key}:`, error);
        }
      });
    }
  }
  
  // Computed values
  compute(key, deps, fn) {
    const computeValue = () => fn(...deps.map(d => this.get(d)));
    
    // Initial value
    this.state[key] = computeValue();
    
    // Recompute when dependencies change
    deps.forEach(dep => {
      this.subscribe(dep, () => {
        this.state[key] = computeValue();
        this.notify(key, this.state[key], undefined);
      });
    });
    
    this.computed.set(key, { deps, fn });
  }
  
  // Reset to initial
  reset(initialState = {}) {
    this.state = { ...initialState };
    this.listeners.forEach((listeners, key) => {
      listeners.forEach(callback => callback(this.state[key], undefined, key));
    });
  }
  
  // Debug
  snapshot() {
    return { ...this.state };
  }
}

// Create global store instance
window.Store = new Store({
  // Settings
  settings: {},
  masterPower: true,
  trialStart: null,
  licenseKey: '',
  
  // API Keys
  groqApiKey: '',
  openrouterApiKey: '',
  groqApiKeySet: false,
  openrouterApiKeySet: false,
  
  // Resume
  resumeSlots: [],
  activeResumeSlot: 0,
  activeResumeContent: '',
  
  // UI State
  currentPage: 'dashboard',
  sidebarCollapsed: false,
  isLoading: false,
  
  // Practice
  practiceState: 'setup', // setup, console, results
  practiceSessionId: null,
  practiceConfig: {},
  practiceHistory: [],
  practiceCurrentQuestion: 0,
  practiceQuestion: '',
  practiceAnswer: '',
  practiceCode: '',
  practiceTab: 'text',
  practiceScore: null,
  practiceReport: null,
  
  // History
  historyCategory: 'interview',
  historySessions: [],
  historySelectedSession: null,
  historyLogs: '',
  
  // Toasts
  toasts: [],
  
  // Modals
  modals: {},
  
  // Trial
  trialExpired: false,
  trialRemainingMs: 3 * 24 * 60 * 60 * 1000,
});

// Computed values
window.Store.compute('isLicensed', ['licenseKey'], (key) => key && key.startsWith('SA-'));
window.Store.compute('trialExpiredComputed', ['trialStart', 'isLicensed'], (start, licensed) => {
  if (licensed) return false;
  if (!start) return false;
  const elapsed = Date.now() - start;
  return elapsed >= 3 * 24 * 60 * 60 * 1000;
});
window.Store.compute('apiKeysConfigured', ['groqApiKeySet', 'openrouterApiKeySet'], (groq, or) => groq || or);