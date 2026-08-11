/**
 * Hirebotai Dashboard — API Wrapper
 * Provides a clean interface to window.pywebview.api
 */

var ApiClient = class ApiClient {
  constructor() {
    this.api = null;
    this.ready = false;
    this.queue = [];
    
    // Wait for pywebview to expose the API
    if (typeof window.pywebview !== 'undefined' && window.pywebview.api) {
      this.api = window.pywebview.api;
      this.ready = true;
      this.flushQueue();
    } else {
      // Poll for API availability
      const checkApi = setInterval(() => {
        if (window.pywebview && window.pywebview.api) {
          this.api = window.pywebview.api;
          this.ready = true;
          this.flushQueue();
          clearInterval(checkApi);
        }
      }, 50);
      
      // Timeout after 5 seconds
      setTimeout(() => clearInterval(checkApi), 5000);
    }
  }
  
  queueCall(method, args, resolve, reject) {
    this.queue.push({ method, args, resolve, reject });
  }
  
  flushQueue() {
    this.queue.forEach(({ method, args, resolve, reject }) => {
      this.call(method, ...args).then(resolve).catch(reject);
    });
    this.queue = [];
  }
  
  async call(method, ...args) {
    if (!this.ready) {
      return new Promise((resolve, reject) => {
        this.queueCall(method, args, resolve, reject);
      });
    }
    
    try {
      const result = await this.api[method](...args);
      return result;
    } catch (error) {
      console.error(`API call failed: ${method}`, error);
      throw error;
    }
  }
  
  // Settings
  getAllSettings() { return this.call('get_all_settings'); }
  getSetting(key) { return this.call('get_setting', key); }
  setSetting(key, value) { return this.call('set_setting', key, value); }
  
  // License
  activateLicenseKey(key) { return this.call('activate_license_key', key); }
  extendTrial(hours) { return this.call('extend_trial', hours); }
  launchEngine() { return this.call('launch_engine'); }
  stopHiddenProcesses() { return this.call('stop_hidden_processes'); }
  factoryReset() { return this.call('factory_reset'); }
  
  // Account (unified website + app login)
  getAccount() { return this.call('app_get_account'); }
  refreshAccount() { return this.call('app_refresh_account'); }
  sendOtp(email) { return this.call('app_send_otp', email); }
  register(name, email, password, code) { return this.call('app_register', name, email, password, code); }
  login(email, password) { return this.call('app_login', email, password); }
  logout() { return this.call('app_logout'); }
  getTrial() { return this.call('app_get_trial'); }
  forgotPassword(email) { return this.call('app_forgot_password', email); }
  verifyReset(email, code) { return this.call('app_verify_reset', email, code); }
  resetPassword(email, password) { return this.call('app_reset_password', email, password); }
  
  // Resume
  uploadResume(slotIndex) { return this.call('upload_resume', slotIndex); }
  saveResumeFile(slotIndex, name, content, isPdf) { return this.call('save_resume_file', slotIndex, name, content, isPdf); }
  getResumeSlots() { return this.call('get_resume_slots'); }
  getResumeContent(slotIndex) { return this.call('get_resume_content', slotIndex); }
  setActiveResume(slotIndex) { return this.call('set_active_resume', slotIndex); }
  deleteResume(slotIndex) { return this.call('delete_resume', slotIndex); }
  
  // Sessions / History
  getSessions(category) { return this.call('get_sessions', category); }
  getSessionLogs(sessionId, category) { return this.call('get_session_logs', sessionId, category); }
  deleteSession(sessionId) { return this.call('delete_session', sessionId); }
  endSession(sessionId) { return this.call('end_session', sessionId); }
  generateScorecard(sessionId) { return this.call('generate_scorecard_from_history', sessionId); }
  exportSessionTranscript(sessionId) { return this.call('export_session_transcript', sessionId); }
  
  // Practice
  startNewSession() { return this.call('start_new_session_from_js'); }
  logPracticeInteraction(sessionId, role, text) { return this.call('log_practice_interaction', sessionId, role, text); }
  savePracticeScorecard(sessionId, score, analysis, strengths, weaknesses) { 
    return this.call('save_practice_scorecard', sessionId, score, analysis, strengths, weaknesses); 
  }
  getInterviewResponse(category, difficulty, history, useResume) { 
    return this.call('get_interview_response', category, difficulty, history, useResume); 
  }
  getPracticeReport(history) { return this.call('get_practice_report', history); }

  // Practice STT
  startPracticeStt() { return this.call('start_practice_stt'); }
  stopPracticeStt() { return this.call('stop_practice_stt'); }
  getPracticeSttResults() { return this.call('get_practice_stt_results'); }
  
  // Security
  setPracticeSecurity(enable) { return this.call('set_practice_security', enable); }

  // API key connection test
  testApiKey(provider) { return this.call('test_api_key', provider); }
  
  // Desktop shortcut
  createDesktopShortcut() { return this.call('create_desktop_shortcut'); }
  
  // External URLs
  openUrl(url) { return this.call('open_url', url); }
  
  // Feedback
  submitFeedback(text) { return this.call('submit_feedback', text); }

  // App notice / update banner
  getAppNotice() { return this.call('get_app_notice'); }
}

// Export singleton
window.Api = new ApiClient();
