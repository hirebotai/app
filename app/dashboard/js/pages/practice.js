/**
 * Hirebotai Dashboard — Practice Page
 * Mock interview simulator
 */

const PracticePage = {
  async init() {
    this.bindEvents();
    this.loadResumeStatus();
  },
  
  async activate() {
    await this.loadResumeStatus();
  },
  
  bindEvents() {
    // Setup form
    on(document, 'click', '#start-practice', () => this.startSession());
    on(document, 'change', '#prac-type, #prac-diff, #prac-q-count, #prac-resume-toggle', () => this.updateStartButton());
    
    // Global Escape key
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && Store.get('practiceState') === 'console') {
        this.quitSession();
      }
    });
    
    // Console actions
    on(document, 'click', '#prac-mic-btn', () => this.toggleSTT());
    on(document, 'click', '#prac-submit-btn', () => this.submitAnswer());
    on(document, 'click', '#quit-practice', () => this.quitSession());
    on(document, 'click', '#tab-btn-text', () => this.switchTab('text'));
    on(document, 'click', '#tab-btn-code', () => this.switchTab('code'));
    
    // Code editor tab handling
    on(document, 'keydown', '#prac-code-inp', (e) => this.handleTabKey(e));
    
    // Answer input
    on(document, 'input', '#prac-answer-inp', debounce(() => this.updateAnswer(), 300));
    
    // Results actions
    on(document, 'click', '#prac-restart', () => this.restart());
    on(document, 'click', '#prac-dashboard', async () => {
      await this.exitToDashboard();
    });
  },
  
  async loadResumeStatus() {
    try {
      const slots = await Api.getResumeSlots();
      const activeSlot = slots.find(s => s.active);
      const toggle = document.getElementById('prac-resume-toggle');
      const label = document.querySelector('[for="prac-resume-toggle"]') || toggle?.parentElement?.querySelector('.form-label');
      
      if (toggle) {
        toggle.disabled = !activeSlot;
        toggle.checked = !!activeSlot;
      }
      
      if (activeSlot) {
        Store.set('activeResumeContent', activeSlot.preview);
      }
    } catch (error) {
      console.error('Failed to load resume status:', error);
    }
  },
  
  updateStartButton() {
    const btn = document.getElementById('start-practice');
    if (btn) btn.disabled = false;
  },
  
async startSession() {
    // Lock screen and transition to fullscreen mode
    await Api.setPracticeSecurity(true);
    await new Promise(r => setTimeout(r, 350));

    // Hide sidebar for full focus
    const sidebar = document.getElementById('sidebar');
    if (sidebar) sidebar.style.display = 'none';

    const type = document.getElementById('prac-type')?.value || 'Technical Coding';
    const difficulty = document.getElementById('prac-diff')?.value || 'Medium';
    const count = parseInt(document.getElementById('prac-q-count')?.value || '5', 10);
    const useResume = document.getElementById('prac-resume-toggle')?.checked || false;

    const config = { type, difficulty, count, useResume };
    Store.set('practiceConfig', config);
    Store.set('practiceState', 'console');
    Store.set('practiceCurrentQuestion', 0);
    Store.set('practiceHistory', []);

    // Create a new history session for this practice
    try {
      const sessionId = await Api.startNewSession();
      if (sessionId) {
        Store.set('practiceSessionId', sessionId);
      }
    } catch (error) {
      console.error('Failed to create practice session:', error);
    }

    this.showConsole();
    await this.nextQuestion();
  },
  
  showConsole() {
    document.getElementById('prac-setup')?.classList.add('hidden');
    document.getElementById('prac-console')?.classList.remove('hidden');
    document.getElementById('prac-results')?.classList.add('hidden');
  },
  
  showResults() {
    document.getElementById('prac-setup')?.classList.add('hidden');
    document.getElementById('prac-console')?.classList.add('hidden');
    document.getElementById('prac-results')?.classList.remove('hidden');
  },
  
  async showSetup() {
    this.cleanup();
    await Api.setPracticeSecurity(false);
    const sidebar = document.getElementById('sidebar');
    if (sidebar) sidebar.style.display = 'flex';
    document.exitFullscreen?.().catch(() => {});
    
    document.getElementById('prac-setup')?.classList.remove('hidden');
    document.getElementById('prac-console')?.classList.add('hidden');
    document.getElementById('prac-results')?.classList.add('hidden');
    Store.set('practiceState', 'setup');
  },

  async exitToDashboard() {
    this.cleanup();
    await Api.setPracticeSecurity(false);
    const sidebar = document.getElementById('sidebar');
    if (sidebar) sidebar.style.display = 'flex';
    document.exitFullscreen?.().catch(() => {});
    Store.set('practiceState', 'setup');
    window.goTo('dashboard');
  },

  cleanup() {
    // Stop the interviewer AI from speaking and shut down voice input so
    // neither keeps running after the user quits or navigates away.
    if (window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }
    this.stopMic(false);
    const panel = document.querySelector('.interviewer-panel');
    if (panel) panel.classList.remove('speaking');
    const ring = document.getElementById('prac-interviewer-ring');
    if (ring) {
      ring.style.opacity = '0';
      ring.style.animation = 'none';
    }
    const wave = document.getElementById('prac-audio-wave');
    if (wave) wave.classList.remove('visible');
    const status = document.getElementById('prac-interviewer-status');
    if (status) {
      status.classList.remove('speaking');
      status.style.color = '';
    }
  },

  async stopMic(applyFinal) {
    // Stops voice input. With applyFinal=true the whole buffered answer is
    // transcribed once more and written into the answer box (clean final text).
    const btn = document.getElementById('prac-mic-btn');
    if (!btn || btn.dataset.recording !== 'true') return;
    btn.dataset.recording = 'false';
    btn.innerHTML = 'Start Speaking';
    btn.classList.remove('btn-danger');
    btn.classList.add('btn-secondary');
    if (this._sttPollInterval) {
      clearInterval(this._sttPollInterval);
      this._sttPollInterval = null;
    }
    try {
      const res = await Api.stopPracticeStt(applyFinal !== false);
      if (applyFinal !== false && res && res.final) {
        const answerInp = document.getElementById('prac-answer-inp');
        if (answerInp) {
          answerInp.value = res.final;
          this.updateAnswer();
        }
      }
    } catch (e) {
      console.error('STT stop error:', e);
    }
  },
  
  async nextQuestion() {
    const config = Store.get('practiceConfig');
    const current = Store.get('practiceCurrentQuestion');
    const history = Store.get('practiceHistory');
    
    if (current >= config.count) {
      this.finishSession();
      return;
    }
    
    // Update UI
    setText('prac-question-num', `Question ${current + 1} of ${config.count}`);
    setText('prac-prompt-txt', 'Preparing question...');
    setText('prac-interviewer-status', 'THINKING...');
    document.getElementById('prac-audio-wave')?.classList.remove('visible');
    setStyle('prac-interviewer-ring', 'opacity', '0');
    
    // Clear answer areas
    const answerInp = document.getElementById('prac-answer-inp');
    const codeInp = document.getElementById('prac-code-inp');
    if (answerInp) answerInp.value = '';
    if (codeInp) codeInp.value = '';
    Store.set('practiceAnswer', '');
    Store.set('practiceCode', '');
    Store.set('practiceTab', 'text');
    this.switchTab('text');
    
    try {
      const response = await Api.getInterviewResponse(config.type, config.difficulty, history, config.useResume);
      
      Store.set('practiceQuestion', response);
      setText('prac-prompt-txt', response);
      setText('prac-interviewer-status', 'WAITING FOR ANSWER');
      setStyle('prac-interviewer-ring', 'opacity', '0');
      
      // Simulate interviewer speaking
      this.simulateSpeaking();
      
    } catch (error) {
      console.error('Failed to get question:', error);
      setText('prac-prompt-txt', 'Failed to load question. Please try again.');
      Toast.error('Failed to get interview question');
    }
  },
  
  simulateSpeaking() {
    const text = Store.get('practiceQuestion') || '';
    if (!text) return;

    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    
    // Read speech configurations from settings
    const settings = Store.get('settings') || {};
    const speechRate = parseFloat(settings.practice_speech_rate || '1.0');
    const voiceName = settings.practice_voice_name || 'Default';
    
    utterance.rate = speechRate;
    utterance.pitch = 1.0;
    
    const voices = window.speechSynthesis.getVoices();
    let voice = null;
    if (voiceName && voiceName !== 'Default') {
      voice = voices.find(v => v.name === voiceName) || voices.find(v => v.name.includes(voiceName));
    }
    if (!voice) {
      voice = voices.find(v => v.lang.startsWith('en') && (v.name.includes('Google') || v.name.includes('Natural') || v.name.includes('Microsoft'))) || voices[0];
    }
    if (voice) utterance.voice = voice;
    
    const panel = document.querySelector('.interviewer-panel');
    const ring = document.getElementById('prac-interviewer-ring');
    const wave = document.getElementById('prac-audio-wave');
    const status = document.getElementById('prac-interviewer-status');
    
    utterance.onstart = () => {
      if (panel) panel.classList.add('speaking');
      if (ring) {
        ring.style.opacity = '1';
        ring.style.animation = 'statusCirclePulse 1.8s infinite';
      }
      if (wave) wave.classList.add('visible');
      if (status) {
        status.textContent = 'SPEAKING OUT LOUD';
        status.classList.add('speaking');
        status.style.color = 'var(--color-accent-purple)';
      }
    };
    
    utterance.onend = () => {
      if (panel) panel.classList.remove('speaking');
      if (ring) {
        ring.style.opacity = '0';
        ring.style.animation = 'none';
      }
      if (wave) wave.classList.remove('visible');
      if (status) {
        status.textContent = 'WAITING FOR ANSWER';
        status.classList.remove('speaking');
        status.style.color = 'var(--color-accent-green)';
      }
    };
    
    window.speechSynthesis.speak(utterance);
  },
  
  async toggleSTT() {
    const btn = document.getElementById('prac-mic-btn');
    if (!btn) return;
    
    const isRecording = btn.dataset.recording === 'true';
    
    if (isRecording) {
      // Stop recording — fetch the clean final transcript of the whole answer.
      Toast.info('Voice input stopped');
      await this.stopMic(true);
      
    } else {
      // Start recording — clear the input and stream live as the user speaks.
      btn.dataset.recording = 'true';
      btn.innerHTML = 'Stop Speaking';
      btn.classList.remove('btn-secondary');
      btn.classList.add('btn-danger');
      Toast.info('Listening... Speak now. It will keep listening until you press Stop Speaking.');
      
      const answerInp = document.getElementById('prac-answer-inp');
      if (answerInp) answerInp.value = '';
      Store.set('practiceAnswer', '');
      
      const result = await Api.startPracticeStt();
      if (!result.success) {
        Toast.error('Failed to start voice input: ' + (result.error || 'Unknown error'));
        btn.dataset.recording = 'false';
        btn.innerHTML = 'Start Speaking';
        btn.classList.remove('btn-danger');
        btn.classList.add('btn-secondary');
        return;
      }
      
      // Poll for streaming results. Each result REPLACES the input so the text
      // grows live as it is spoken (never duplicated, never split into parts).
      this._sttPollInterval = setInterval(async () => {
        if (btn.dataset.recording !== 'true') return;
        try {
          const result = await Api.getPracticeSttResults();
          if (result.success && result.results && result.results.length > 0) {
            const answerInp = document.getElementById('prac-answer-inp');
            if (answerInp) {
              for (const text of result.results) {
                answerInp.value = text;
                this.updateAnswer();
              }
            }
          }
        } catch (e) {
          console.error('STT poll error:', e);
        }
      }, 500);
    }
  },
  
  updateAnswer() {
    const answerInp = document.getElementById('prac-answer-inp');
    if (answerInp) {
      Store.set('practiceAnswer', answerInp.value);
    }
  },
  
  switchTab(tab) {
    Store.set('practiceTab', tab);
    
    document.getElementById('prac-workspace-text')?.classList.toggle('active', tab === 'text');
    document.getElementById('prac-workspace-code')?.classList.toggle('active', tab === 'code');
    document.getElementById('tab-btn-text')?.classList.toggle('active', tab === 'text');
    document.getElementById('tab-btn-code')?.classList.toggle('active', tab === 'code');
  },
  
  handleTabKey(e) {
    if (e.key === 'Tab') {
      e.preventDefault();
      const { target, shiftKey } = e;
      const start = target.selectionStart;
      const end = target.selectionEnd;
      
      if (shiftKey) {
        // Handle shift+tab for unindent
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
    }
  },
  
  async submitAnswer() {
    // If the user is still recording, stop the mic and grab the clean final
    // transcript before submitting so the answer is never cut short.
    await this.stopMic(true);
    
    const config = Store.get('practiceConfig');
    const current = Store.get('practiceCurrentQuestion');
    const history = Store.get('practiceHistory');
    const tab = Store.get('practiceTab');
    const answer = tab === 'text' 
      ? Store.get('practiceAnswer') 
      : document.getElementById('prac-code-inp')?.value || '';
    const question = Store.get('practiceQuestion');
    
    if (!answer.trim()) {
      Toast.warning('Please provide an answer before submitting');
      return;
    }
    
    // Add to history (use assistant and user to match standard LLM APIs)
    history.push(
      { role: 'assistant', content: question },
      { role: 'user', content: answer }
    );
    Store.set('practiceHistory', history);
    
    // Log to backend
    const sessionId = Store.get('practiceSessionId');
    if (sessionId) {
      try {
        await Api.logPracticeInteraction(sessionId, 'interview_ai', question);
        await Api.logPracticeInteraction(sessionId, 'user', answer);
      } catch (error) {
        console.error('Failed to log practice interaction:', error);
      }
    }
    
    // Next question
    Store.set('practiceCurrentQuestion', current + 1);
    await this.nextQuestion();
  },
  
  async finishSession() {
    this.cleanup();
    const config = Store.get('practiceConfig');
    const history = Store.get('practiceHistory');
    
    setText('prac-prompt-txt', 'Session complete! Generating scorecard...');
    setText('prac-interviewer-status', 'EVALUATING...');
    
    try {
      // Get AI evaluation
      const report = await Api.getPracticeReport(history);
      Store.set('practiceReport', report);
      
      // Save scorecard
      const sessionId = Store.get('practiceSessionId');
      if (sessionId) {
        await Api.savePracticeScorecard(
          sessionId,
          report.score,
          report.analysis,
          JSON.stringify(report.strengths),
          JSON.stringify(report.weaknesses)
        );
        await Api.endSession(sessionId);
      }
      
      this.renderResults(report);
      this.showResults();
      
    } catch (error) {
      console.error('Failed to finish session:', error);
      Toast.error('Failed to generate scorecard');
      this.showSetup();
    }
  },
  
  renderResults(report) {
    // Score
    setText('prac-score-val', report.score);
    
    // Analysis
    setText('prac-report-analysis', report.analysis);
    
    // Strengths
    const strengthsEl = document.getElementById('prac-strengths');
    if (strengthsEl && report.strengths) {
      strengthsEl.innerHTML = report.strengths.map(s => `
        <div class="breakdown-item">${s}</div>
      `).join('');
    }
    
    // Weaknesses
    const weaknessesEl = document.getElementById('prac-weaknesses');
    if (weaknessesEl && report.weaknesses) {
      weaknessesEl.innerHTML = report.weaknesses.map(w => `
        <div class="breakdown-item">${w}</div>
      `).join('');
    }
  },
  
  quitSession() {
    Modal.confirm('Are you sure you want to quit this practice session? Progress will be lost.', 'Quit Session')
      .then(confirmed => {
        if (confirmed) {
          this.cleanup();
          this.showSetup();
        }
      });
  },
  
  restart() {
    this.showSetup();
  },
};

window.PracticePage = PracticePage;