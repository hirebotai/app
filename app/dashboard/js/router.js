/**
 * Hirebotai Dashboard — Router
 * Handles page navigation and URL hash routing
 */

var Router = class Router {
  constructor() {
    this.routes = new Map();
    this.currentPage = 'dashboard';
    this.beforeHooks = [];
    this.afterHooks = [];
    
    // Listen for hash changes
    window.addEventListener('hashchange', () => this.handleHashChange());
    
    // Initial load
    this.handleHashChange();
  }
  
  // Register a page
  register(pageName, pageModule) {
    this.routes.set(pageName, pageModule);
    
    // Initialize if it's the current page (mark as initialized so the
    // subsequent switchPage()/go() call doesn't re-run init and re-bind
    // delegated event listeners — that caused every action to fire twice).
    if (pageName === this.currentPage && pageModule.init) {
      pageModule.init();
      pageModule._initialized = true;
    }
  }
  
  // Add navigation guard
  beforeEach(hook) {
    this.beforeHooks.push(hook);
  }
  
  afterEach(hook) {
    this.afterHooks.push(hook);
  }
  
  // Navigate to page
  async go(pageName, params = {}) {
    // Run before hooks
    for (const hook of this.beforeHooks) {
      const result = await hook(pageName, params);
      if (result === false) return false;
      if (typeof result === 'string') {
        pageName = result;
      }
    }
    
    // Update hash
    const hash = params ? `#${pageName}${Object.keys(params).length ? '?' + new URLSearchParams(params).toString() : ''}` : `#${pageName}`;
    window.location.hash = hash;
    
    return true;
  }
  
  // Handle hash change
  async handleHashChange() {
    const hash = window.location.hash.slice(1);
    const [pageName, queryString] = hash.split('?');
    const page = pageName || 'dashboard';
    
    const params = {};
    if (queryString) {
      new URLSearchParams(queryString).forEach((value, key) => {
        params[key] = value;
      });
    }
    
    await this.switchPage(page, params);
  }
  
  // Switch page
  async switchPage(pageName, params = {}) {
    const pageModule = this.routes.get(pageName);
    
    if (!pageModule) {
      console.warn(`Page not found: ${pageName}`);
      return;
    }
    
    // Hide all pages
    document.querySelectorAll('.page').forEach(el => {
      el.classList.remove('active');
    });
    
    // Show target page
    const pageEl = document.getElementById(`page-${pageName}`);
    if (pageEl) {
      pageEl.classList.add('active');
    }
    
    // Update nav
    document.querySelectorAll('.nav-item').forEach(el => {
      el.classList.toggle('active', el.dataset.page === pageName);
    });
    
    // Update store
    window.Store.set('currentPage', pageName);
    this.currentPage = pageName;
    
    // Initialize page if needed
    if (pageModule.init && !pageModule._initialized) {
      try {
        await pageModule.init(params);
        pageModule._initialized = true;
      } catch (error) {
        console.error(`Page init failed: ${pageName}`, error);
      }
    }
    
    // Call activate hook
    if (pageModule.activate) {
      try {
        await pageModule.activate(params);
      } catch (error) {
        console.error(`Page activate failed: ${pageName}`, error);
      }
    }
    
    // Run after hooks
    for (const hook of this.afterHooks) {
      try {
        await hook(pageName, params);
      } catch (error) {
        console.error('Router after hook error:', error);
      }
    }
    
    // Scroll to top of the page (not the window)
    window.scrollTo(0, 0);
    const mainEl = document.getElementById('main');
    if (mainEl) mainEl.scrollTop = 0;
    const activePageEl = document.querySelector('.page.active');
    if (activePageEl) activePageEl.scrollTop = 0;
  }
  
  // Get current page
  getCurrentPage() {
    return this.currentPage;
  }
  
  // Get page module
  getPage(pageName) {
    return this.routes.get(pageName);
  }
}

// Create global router
window.Router = new Router();

// Global navigation helper
window.goTo = (pageName, params) => window.Router.go(pageName, params);