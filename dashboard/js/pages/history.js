/**
 * Hirebotai Dashboard — History Page
 * View session history and logs
 */

const HistoryPage = {
  categories: [
    { id: 'interview', label: 'Interview', icon: '🎓' },
    { id: 'screen', label: 'Screen Capture', icon: '📸' },
    { id: 'practice', label: 'Practice', icon: '🎯' },
    { id: 'audio', label: 'Audio', icon: '🎙️' },
  ],
  
  async init() {
    this.bindEvents();
    await this.loadCategory('interview');
  },
  
  bindEvents() {
    // Category tabs
    on(document, 'click', '.history-tab', (e) => {
      const category = e.currentTarget.dataset.category;
      this.switchCategory(category);
    });
    
    // Session list
    on(document, 'click', '.session-item', (e) => {
      const item = e.currentTarget.closest('.session-item');
      if (item) {
        const sessionId = parseInt(item.dataset.sessionId, 10);
        this.selectSession(sessionId);
      }
    });
    
    // Actions
    on(document, 'click', '#history-generate-scorecard', () => this.generateScorecard());
    on(document, 'click', '#history-export', () => this.exportTranscript());
    on(document, 'click', '#history-delete', () => this.deleteSession());
  },
  
  async switchCategory(category) {
    Store.set('historyCategory', category);
    
    // Update tabs
    document.querySelectorAll('.history-tab').forEach(tab => {
      tab.classList.toggle('active', tab.dataset.category === category);
    });
    
    await this.loadCategory(category);
  },
  
  async loadCategory(category) {
    const listEl = document.getElementById('history-list');
    if (!listEl) return;
    
    listEl.innerHTML = '<div class="empty-state" style="padding:40px;"><div class="spinner"></div><div style="margin-top:12px;color:var(--color-text-muted);">Loading...</div></div>';
    
    try {
      const sessions = await Api.getSessions(category);
      Store.set('historySessions', sessions);
      this.renderSessionList(sessions);
      
      // Clear detail
      this.clearDetail();
    } catch (error) {
      console.error('Failed to load history:', error);
      listEl.innerHTML = '<div class="empty-state" style="padding:40px;"><div style="color:var(--color-error);">Failed to load sessions</div></div>';
    }
  },
  
  renderSessionList(sessions) {
    const listEl = document.getElementById('history-list');
    if (!listEl) return;
    
    const head = `
      <div class="history-list-head">
        <div>
          <div class="history-list-title">${this.getCategoryLabel()}</div>
          <div class="history-list-sub">${sessions.length} session${sessions.length === 1 ? '' : 's'} recorded</div>
        </div>
        <span class="history-list-count">${sessions.length}</span>
      </div>
    `;
    
    if (!sessions.length) {
      listEl.innerHTML = head + `
        <div class="empty-state" style="flex:1;">
          <div class="empty-state-icon">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
              <path d="M12 8v4l3 3m6-3a9 9 0 1 1-18 0 9 9 0 0 1 18 0z"/>
            </svg>
          </div>
          <div class="empty-state-title">No Sessions</div>
          <div class="empty-state-message">No ${Store.get('historyCategory')} sessions recorded yet.</div>
        </div>
      `;
      return;
    }
    
    listEl.innerHTML = head + sessions.map(s => this.renderSessionItem(s)).join('');
  },
  
  getCategoryLabel() {
    const cat = this.categories.find(c => c.id === Store.get('historyCategory'));
    return cat?.label?.toUpperCase() || 'SESSIONS';
  },
  
  normalizeSession(session) {
    if (Array.isArray(session)) {
      const [id, startTime, endTime, rating] = session;
      const duration = endTime
        ? Math.round((new Date(endTime) - new Date(startTime)) / 60000) + ' min'
        : 'Active';
      return {
        id,
        date: formatDate(startTime),
        time: new Date(startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        dur: `${duration} · Rating: ${rating || 'No Rating'}`,
        rating,
      };
    }
    const s = session || {};
    const rating = s.rating || (s.dur && (s.dur.match(/Rating:\s*([^|·]+)/i) || [])[1]) || 'No Rating';
    return { ...s, rating: rating === 'No Rating' ? '' : rating };
  },

  renderSessionItem(session) {
    const s = this.normalizeSession(session);
    const id = s.id !== undefined && s.id !== null ? s.id : '?';
    const rating = s.rating || '';
    const durText = String(s.dur || 'Active');
    
    return `
      <div class="session-item" data-session-id="${id}">
        <div class="session-item-top">
          <div class="session-date">${s.date || 'Session'}</div>
          <span class="session-rating ${rating ? 'rated' : ''}">${rating || 'NR'}</span>
        </div>
        <div class="session-meta">
          <span>${s.time || '00:00'}</span>
          <span class="session-dot">·</span>
          <span class="session-duration">${durText}</span>
        </div>
      </div>
    `;
  },
  
  async selectSession(sessionId) {
    // Update active state
    document.querySelectorAll('.session-item').forEach(item => {
      item.classList.toggle('active', parseInt(item.dataset.sessionId, 10) === sessionId);
    });
    
    Store.set('historySelectedSession', sessionId);
    
    // Load logs
    try {
      const logs = await Api.getSessionLogs(sessionId);
      Store.set('historyLogs', logs);
      this.renderDetail(sessionId, logs);
    } catch (error) {
      console.error('Failed to load session logs:', error);
      Toast.error('Failed to load session details');
    }
  },
  
  renderDetail(sessionId, logs) {
    const detailEl = document.getElementById('history-detail');
    if (!detailEl) return;
    
    const sessions = Store.get('historySessions');
    const found = (sessions || []).find(s => Number(s.id) === Number(sessionId));
    const session = found ? this.normalizeSession(found) : null;
    
    detailEl.innerHTML = `
      <div class="detail-header">
        <div>
          <h3 style="font-size:16px;font-weight:700;">Session #${sessionId}</h3>
          <div style="font-size:12px;color:var(--color-text-muted);margin-top:2px;">
            ${session ? `${session.date || ''} ${session.time || ''} · ${session.dur || 'Active'}` : 'No details available'}
          </div>
        </div>
        <div style="display:flex;gap:8px;">
          <button class="btn btn-secondary btn-sm" id="history-generate-scorecard">Generate Scorecard</button>
          <button class="btn btn-secondary btn-sm" id="history-export">Export PDF</button>
          <button class="btn btn-danger btn-sm" id="history-delete">Delete</button>
        </div>
      </div>
      <div class="sess-log">${logs || 'No logs available'}</div>
    `;
  },
  
  clearDetail() {
    const detailEl = document.getElementById('history-detail');
    if (!detailEl) return;
    
    detailEl.innerHTML = `
      <div class="empty-state" style="flex:1;">
        <div class="empty-state-icon">
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
            <path d="M12 8v4l3 3m6-3a9 9 0 1 1-18 0 9 9 0 0 1 18 0z"/>
          </svg>
        </div>
        <div class="empty-state-title">Select a Session</div>
        <div class="empty-state-message">Click a session from the list to view details.</div>
      </div>
    `;
  },
  
  async generateScorecard() {
    const sessionId = Store.get('historySelectedSession');
    if (!sessionId) return;
    
    const btn = document.getElementById('history-generate-scorecard');
    btn.disabled = true;
    btn.innerHTML = '<span class="spinner spinner-sm"></span> Generating...';
    
    try {
      const result = await Api.generateScorecard(sessionId);
      if (result.success) {
        Toast.success(`Scorecard generated: ${result.rating}`);
        await this.loadCategory(Store.get('historyCategory'));
        this.selectSession(sessionId);
      } else {
        Toast.error(result.error || 'Failed to generate scorecard');
      }
    } catch (error) {
      Toast.error('Failed to generate scorecard');
    } finally {
      btn.disabled = false;
      btn.textContent = 'Generate Scorecard';
    }
  },
  
  async exportTranscript() {
    const sessionId = Store.get('historySelectedSession');
    if (!sessionId) return;
    
    const btn = document.getElementById('history-export');
    setLoading(btn, true);
    
    try {
      const result = await Api.exportSessionTranscript(sessionId);
      if (result) Toast.success('Transcript exported as PDF');
      else Toast.error('Export failed or cancelled');
    } catch (error) {
      Toast.error('Export failed');
    } finally {
      setLoading(btn, false);
    }
  },
  
  async deleteSession() {
    const sessionId = Store.get('historySelectedSession');
    if (!sessionId) return;
    
    const confirmed = await Modal.confirm(
      'Delete this session and all its logs? This cannot be undone.',
      'Delete Session',
      { variant: 'danger' }
    );
    
    if (!confirmed) return;
    
    try {
      await Api.deleteSession(sessionId);
      Toast.success('Session deleted');
      await this.loadCategory(Store.get('historyCategory'));
      this.clearDetail();
    } catch (error) {
      Toast.error('Failed to delete session');
    }
  },
};

window.HistoryPage = HistoryPage;