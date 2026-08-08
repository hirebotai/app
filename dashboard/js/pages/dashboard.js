/**
 * Hirebotai Dashboard — Dashboard Page
 * Main landing page with status, stats, and quick actions
 */

const DashboardPage = {
  async init() {
    this.bindEvents();
    await this.loadData();
    this.startTimer();
  },
  
  async activate() {
    // Reload settings too, not just stats: the trial banner/timer reads
    // Store.settings, which otherwise stays stale from the first page load
    // and can disagree with the value the API Keys page re-fetches.
    await this.loadData();
  },
  
  bindEvents() {
    // Master power toggle
    on(document, 'change', '#master-power', (e) => this.toggleMasterPower(e.target.checked));
    
    // Create shortcut
    on(document, 'click', '#create-shortcut', () => this.createShortcut());
    
    // Quick action buttons
    on(document, 'click', '[data-action]', (e) => {
      const action = e.currentTarget.dataset.action;
      if (action) this.handleAction(action);
    });
  },
  
  async loadData() {
    try {
      const settings = await Api.getAllSettings();
      Store.setAll({
        settings,
        masterPower: settings.master_power,
        trialStart: settings.trial_start,
        licenseKey: settings.license_key,
        groqApiKeySet: settings.groq_api_key_set,
        openrouterApiKeySet: settings.openrouter_api_key_set,
      });
      
      this.updateGreeting();
      this.updateMotivation();
      this.updateTrialBanner(settings);
      this.updateApiStatus(settings);
      this.updateEngineStatus(settings);
      await this.loadActivity();
    } catch (error) {
      console.error('Failed to load dashboard data:', error);
    }
  },

  async loadActivity() {
    try {
      const [interviews, screen, practice, audio] = await Promise.all([
        Api.getSessions('interview'),
        Api.getSessions('screen'),
        Api.getSessions('practice'),
        Api.getSessions('audio'),
      ]);

      this.updateStats({
        total: interviews.length + screen.length + practice.length + audio.length,
        screen: screen.length,
        practice: practice.length,
        interviews: interviews.length + audio.length,
      });

      this.renderActivity([...interviews, ...screen, ...practice, ...audio]);
    } catch (error) {
      console.error('Failed to load activity:', error);
    }
  },

  updateStats({ total, screen, practice, interviews }) {
    const totalEl = document.getElementById('dash-stat-total');
    const screenEl = document.getElementById('dash-stat-screen');
    const practiceEl = document.getElementById('dash-stat-practice');
    const interviewsEl = document.getElementById('dash-stat-interviews');

    const totalSub = document.getElementById('dash-stat-total-sub');
    const screenSub = document.getElementById('dash-stat-screen-sub');
    const practiceSub = document.getElementById('dash-stat-practice-sub');
    const interviewsSub = document.getElementById('dash-stat-interviews-sub');

    const animate = (el, value) => {
      if (!el) return;
      const start = performance.now();
      const dur = 700;
      const step = (now) => {
        const p = Math.min((now - start) / dur, 1);
        const eased = 1 - Math.pow(1 - p, 3);
        el.textContent = Math.round(value * eased);
        if (p < 1) requestAnimationFrame(step);
      };
      requestAnimationFrame(step);
    };

    animate(totalEl, total);
    animate(screenEl, screen);
    animate(practiceEl, practice);
    animate(interviewsEl, interviews);

    if (totalSub) totalSub.textContent = total === 0 ? 'No activity yet' : 'Across all activities';
    if (screenSub) screenSub.textContent = screen === 0 ? 'No captures yet' : 'Captures solved';
    if (practiceSub) practiceSub.textContent = practice === 0 ? 'No runs yet' : 'Mock interviews';
    if (interviewsSub) interviewsSub.textContent = interviews === 0 ? 'No interviews yet' : 'Audio + interviews';
  },

  renderActivity(sessions) {
    const container = document.getElementById('dash-recent-activity');
    if (!container) return;

    if (!sessions || sessions.length === 0) {
      container.innerHTML = `
        <div style="padding:24px; text-align:center;">
          <div style="font-size:34px; margin-bottom:10px;">🚀</div>
          <div style="font-weight:800; color:#fff; font-size:14px;">Your journey starts here</div>
          <div style="font-size:12px; color:var(--color-text-faint); margin-top:6px;">Solve your first screen, run a practice, or start an interview to see activity appear here.</div>
        </div>
      `;
      return;
    }

    const icons = {
      INTERVIEW: '🎯',
      SCREEN: '🖥️',
      PRACTICE: '🎙️',
      AUDIO: '🎧',
    };

    const rows = sessions.slice(0, 6).map((s) => `
      <div style="display:flex; align-items:center; gap:14px; padding:11px 4px; border-bottom:1px solid rgba(255,255,255,0.04);">
        <div style="width:38px; height:38px; border-radius:10px; background:rgba(139,92,246,0.12); border:1px solid rgba(139,92,246,0.2); display:flex; align-items:center; justify-content:center; font-size:17px; flex-shrink:0;">${icons[s.type] || '✨'}</div>
        <div style="flex:1; min-width:0;">
          <div style="font-weight:700; font-size:13px; color:#fff; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${s.type.replace('_',' ').toLowerCase().replace(/^\w/, c => c.toUpperCase())} · ${s.dur}</div>
          <div style="font-size:11px; color:var(--color-text-faint); margin-top:2px;">${s.date} · ${s.time}</div>
        </div>
        <span style="background:rgba(139,92,246,0.14); color:var(--color-accent-purple); padding:3px 9px; border-radius:6px; font-size:10px; font-weight:800; flex-shrink:0;">${s.badge}</span>
      </div>
    `).join('');

    container.innerHTML = rows;
  },

  updateGreeting() {
    const el = document.getElementById('dash-greeting');
    if (!el) return;
    const h = new Date().getHours();
    
    const night = [
      'Late night session?', 'Burning the midnight oil?', 'The quiet hours are for focusing.', 
      'Unstoppable even at night.', 'Coding past bedtime?', 'Night owls write the best code.',
      'Embrace the midnight hustle.', 'In the zone tonight.', 'Stars are out, code is flowing.',
      'Late night logic parsing.', 'A productive night ahead.', 'The world sleeps, you build.'
    ];
    const morning = [
      'Good morning!', 'Rise and shine, time to build.', 'A fresh day to write some great code.', 
      'Let\'s conquer today\'s challenges.', 'Coffee in hand, ready to code.', 'Morning hustle activated.',
      'Start the day with a clean slate.', 'Time to crush some bugs.', 'Early bird gets the successful compile.',
      'A beautiful morning for development.', 'Let\'s make today productive.', 'Good morning! Ready for greatness?'
    ];
    const afternoon = [
      'Good afternoon!', 'Mid-day hustle.', 'Keep the momentum going.', 
      'Stay sharp, you got this.', 'Afternoon coding sprint.', 'Don\'t let the post-lunch slump hit you.',
      'Power through the afternoon.', 'Keep pushing, almost there.', 'The day is still young.',
      'Focus up, great work takes time.', 'Afternoon grind in session.', 'Stay locked in.'
    ];
    const evening = [
      'Good evening!', 'Evening coding session.', 'Winding down or gearing up?', 
      'Time for some focused practice.', 'Sunset coding vibes.', 'Wrap up the day with some solid work.',
      'Evening tranquility for complex problems.', 'Finish strong tonight.', 'A great evening to build something new.',
      'The day\'s not over yet.', 'Relax and write some code.', 'Good evening! Keep the streak alive.'
    ];
    
    let arr = h < 5 ? night : h < 12 ? morning : h < 17 ? afternoon : evening;
    const greeting = arr[Math.floor(Math.random() * arr.length)];
    
    const readiness = [
      'Welcome back to your workspace.', 'Your Copilot is standing by.', 'Let\'s write some elegant solutions.', 
      'Ready to ace your next interview.', 'Precision mode activated.', 'All systems online.', 
      'Awaiting your command.', 'Let\'s build the future.', 'Time to elevate your skills.', 
      'Your AI assistant is ready.', 'Let\'s tackle the hard problems.', 'Ready when you are.',
      'Let\'s turn ideas into code.', 'Standing by for instructions.', 'Let\'s achieve your goals today.'
    ];
    const readyStr = readiness[Math.floor(Math.random() * readiness.length)];
    
    el.textContent = `${greeting} ${readyStr}`;
  },

  MOTIVATIONS: [
    { text: 'One day you will achieve what you want — but cheating is never the solution. Hard work always wins.', author: 'Hirebot AI' },
    { text: 'The expert was once a beginner who refused to give up. Keep practicing, it compounds.', author: 'Hirebot AI' },
    { text: 'Success is the sum of small efforts, repeated day in and day out. Show up today.', author: 'Hirebot AI' },
    { text: 'You don\'t have to be great to start, but you have to start to be great.', author: 'Hirebot AI' },
    { text: 'Discipline is choosing what you want most over what you want now. Stay focused.', author: 'Hirebot AI' },
    { text: 'Shortcuts may feel fast, but mastery is built only through honest practice.', author: 'Hirebot AI' },
    { text: 'Every interview you prepare for makes the next one easier. Progress over perfection.', author: 'Hirebot AI' },
    { text: 'Hard work beats talent when talent doesn\'t work hard. Keep grinding.', author: 'Hirebot AI' },
    { text: 'The harder you work for something, the greater you\'ll feel when you achieve it.', author: 'Hirebot AI' },
    { text: 'Dreams don\'t work unless you do. One solve, one practice, one day at a time.', author: 'Hirebot AI' },
    { text: 'Your future self is watching you right now. Make them proud.', author: 'Hirebot AI' },
    { text: 'Skill is the only cheat code that nobody can take from you. Earn it.', author: 'Hirebot AI' },
    { text: 'Don\'t watch the clock; do what it does. Keep going.', author: 'Hirebot AI' },
    { text: 'The pain of discipline is nothing compared to the pain of regret.', author: 'Hirebot AI' },
    { text: 'Be so good they can\'t ignore you. Practice until it\'s second nature.', author: 'Hirebot AI' },
    { text: 'Consistency is what transforms average into exceptional. Stay consistent.', author: 'Hirebot AI' },
    { text: 'You are one interview away from the job of your dreams. Prepare for it.', author: 'Hirebot AI' },
    { text: 'Champions are made when nobody is watching. Put in the unseen hours.', author: 'Hirebot AI' },
    { text: 'Failure is not the opposite of success; it\'s part of success. Learn and move on.', author: 'Hirebot AI' },
    { text: 'The only way to achieve the impossible is to believe it is possible, then grind.', author: 'Hirebot AI' },
    { text: 'Every expert was once a disaster. Keep going, you\'re closer than yesterday.', author: 'Hirebot AI' },
    { text: 'Push yourself, because no one else is going to do it for you.', author: 'Hirebot AI' },
    { text: 'Great things never come from comfort zones. Step out and practice.', author: 'Hirebot AI' },
    { text: 'Your competition is practicing right now. So should you.', author: 'Hirebot AI' },
    { text: 'Stay hungry, stay humble, stay practicing. Success will follow.', author: 'Hirebot AI' },
    { text: 'The secret of getting ahead is getting started. Start today.', author: 'Hirebot AI' },
    { text: 'Energy and persistence conquer all things. Keep your foot on the gas.', author: 'Hirebot AI' },
    { text: 'It always seems impossible until it\'s done. You can do this.', author: 'Hirebot AI' },
    { text: 'Hard work spotlights the character of people. Let yours shine.', author: 'Hirebot AI' },
    { text: 'Don\'t be afraid to give up the good to go for the great. Aim higher.', author: 'Hirebot AI' },
    { text: 'The best way to predict the future is to create it. Practice creates yours.', author: 'Hirebot AI' },
    { text: 'Small daily improvements are the key to staggering long-term results.', author: 'Hirebot AI' },
    { text: 'If you want to be the best, you have to do what others won\'t. Do the work.', author: 'Hirebot AI' },
    { text: 'Success doesn\'t come to you — you go to it. Go get it today.', author: 'Hirebot AI' },
    { text: 'Learn from yesterday, live for today, prepare for the interview tomorrow.', author: 'Hirebot AI' },
    { text: 'There are no shortcuts to any place worth going. Only practice.', author: 'Hirebot AI' },
    { text: 'Motivation gets you going, but discipline keeps you growing. Stay consistent.', author: 'Hirebot AI' },
    { text: 'The grind is the glory. Trust the process and keep practicing.', author: 'Hirebot AI' },
    { text: 'You miss 100% of the shots you don\'t take. Take the practice run.', author: 'Hirebot AI' },
    { text: 'Courage is not the absence of fear, but the triumph over it. Face that interview.', author: 'Hirebot AI' },
    { text: 'What you do today can improve all your tomorrows. Practice now.', author: 'Hirebot AI' },
    { text: 'A river cuts through rock not because of its power, but its persistence.', author: 'Hirebot AI' },
    { text: 'Opportunities don\'t happen. You create them with preparation.', author: 'Hirebot AI' },
    { text: 'Don\'t practice until you get it right. Practice until you can\'t get it wrong.', author: 'Hirebot AI' },
    { text: 'Your only limit is your mind. Unlock it with daily practice.', author: 'Hirebot AI' },
    { text: 'Stars can\'t shine without darkness. Your struggles are building your shine.', author: 'Hirebot AI' },
    { text: 'The dream is free, but the hustle is sold separately. Pay the price.', author: 'Hirebot AI' },
    { text: 'Be patient. The best things take time and relentless effort.', author: 'Hirebot AI' },
    { text: 'Winners are not people who never fail, but people who never quit.', author: 'Hirebot AI' },
    { text: 'Make your weakness your strength. Practice the parts you dread.', author: 'Hirebot AI' },
    { text: 'In the middle of difficulty lies opportunity. Keep moving.', author: 'Hirebot AI' },
    { text: 'The man who moves a mountain begins by carrying away small stones. Start small.', author: 'Hirebot AI' },
    { text: 'Success is walking from failure to failure without losing enthusiasm.', author: 'Hirebot AI' },
    { text: 'Do something today that your future self will thank you for.', author: 'Hirebot AI' },
    { text: 'It\'s not about being the best. It\'s about being better than yesterday.', author: 'Hirebot AI' },
    { text: 'Quality is never an accident. It is the result of honest effort.', author: 'Hirebot AI' },
    { text: 'Don\'t wish for it. Work for it. Practice makes the promise real.', author: 'Hirebot AI' },
    { text: 'Amateurs practice until they get it right. Professionals practice until they can\'t get it wrong.', author: 'Hirebot AI' },
    { text: 'You cannot discover new oceans unless you have the courage to lose sight of the shore.', author: 'Hirebot AI' },
    { text: 'Great works are performed not by strength but by perseverance. Keep going.', author: 'Hirebot AI' },
    { text: 'The expert in anything was once a beginner. Be the beginner who keeps going.', author: 'Hirebot AI' },
    { text: 'One day, all your hard work will pay off. Keep that day coming.', author: 'Hirebot AI' },
  ],

  updateMotivation() {
    const textEl = document.getElementById('dash-motivation-text');
    const authorEl = document.getElementById('dash-motivation-author');
    if (!textEl) return;

    const quote = this.MOTIVATIONS[Math.floor(Math.random() * this.MOTIVATIONS.length)];

    textEl.textContent = `"${quote.text}"`;
    if (authorEl) authorEl.textContent = `— ${quote.author}`;
  },
  
  async refreshStats() {
    try {
      const settings = await Api.getAllSettings();
      this.updateApiStatus(settings);
      this.updateEngineStatus(settings);
      await this.loadActivity();
    } catch (error) {
      console.error('Failed to refresh stats:', error);
    }
  },
  
  startTimer() {
    this.timerInterval = setInterval(() => this.updateSessionTimer(), 1000);
    this.updateSessionTimer();
  },
  
  updateSessionTimer() {
    const start = Store.get('trialStart');
    if (!start) return;
    
    const elapsed = Date.now() - start;
    const hours = Math.floor(elapsed / 3600000);
    const minutes = Math.floor((elapsed % 3600000) / 60000);
    const seconds = Math.floor((elapsed % 60000) / 1000);
    
    const timerEl = document.getElementById('dash-timer');
    if (timerEl) {
      timerEl.textContent = `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
    }
    
    const timer = document.getElementById('dash-trial-timer');
    const heroTrialLeft = document.getElementById('hero-trial-left');
    const settings = Store.get('settings') || {};
    const licensed = settings.license_key && settings.license_key.startsWith('SA-');
    
    if (timer && settings.trial_start && !licensed) {
      const remaining = 3 * 24 * 60 * 60 * 1000 - (Date.now() - settings.trial_start);
      if (remaining > 0) {
        const h = Math.floor(remaining / 3600000);
        const m = Math.floor((remaining % 3600000) / 60000);
        const s = Math.floor((remaining % 60000) / 1000);
        timer.textContent = `${h}h ${m}m ${s}s`;
        if (heroTrialLeft) heroTrialLeft.textContent = `${h}h left`;
      } else {
        timer.textContent = 'Expired';
        if (heroTrialLeft) heroTrialLeft.textContent = 'Expired';
      }
    }
  },
  
  updateTrialBanner(settings) {
    const banner = document.getElementById('dash-trial-banner');
    const timer = document.getElementById('dash-trial-timer');
    const heroTrial = document.getElementById('hero-pill-trial');
    const heroTrialLeft = document.getElementById('hero-trial-left');
    const licensed = settings.license_key && settings.license_key.startsWith('SA-');
    
    if (heroTrial) heroTrial.style.display = licensed ? 'none' : 'inline-flex';
    
    // Update logo version tag if it exists
    const logoVerEl = document.querySelector('.logo-ver');
    if (logoVerEl) logoVerEl.textContent = 'V1';

    // Update bottom sidebar footer status badge safely
    const sidebarLicenseText = document.getElementById('sidebar-license-text');
    if (sidebarLicenseText) {
      if (licensed) {
        sidebarLicenseText.textContent = 'v1.0 Pro · Licensed';
        sidebarLicenseText.style.color = 'var(--color-success)';
      } else {
        sidebarLicenseText.textContent = 'v1.0 Pro · Trial';
        sidebarLicenseText.style.color = 'var(--color-warning)';
      }
    }

    if (!licensed) {
      if (banner) banner.style.display = 'flex';
      
      if (timer && settings.trial_start) {
        const remaining = 3 * 24 * 60 * 60 * 1000 - (Date.now() - settings.trial_start);
        if (remaining > 0) {
          const h = Math.floor(remaining / 3600000);
          const m = Math.floor((remaining % 3600000) / 60000);
          const s = Math.floor((remaining % 60000) / 1000);
          timer.textContent = `${h}h ${m}m ${s}s`;
          if (heroTrialLeft) heroTrialLeft.textContent = `${h}h left`;
        } else {
          timer.textContent = 'Expired';
          if (heroTrialLeft) heroTrialLeft.textContent = 'Expired';
        }
      }
    } else {
      if (banner) banner.style.display = 'none';
    }
  },
  
  updateApiBanner(settings) {
    const banner = document.getElementById('dash-api-banner');
    const hasKeys = settings.groq_api_key_set || settings.openrouter_api_key_set;
    if (banner) banner.style.display = hasKeys ? 'none' : 'flex';
  },
  
  updateEngineStatus(settings) {
    const isLicensed = settings.license_key && settings.license_key.startsWith('SA-');
    const trialExpired = settings.trial_start && (Date.now() - settings.trial_start) >= 3 * 24 * 60 * 60 * 1000;
    const allowed = isLicensed || !trialExpired;
    const on = Store.get('masterPower') !== false;
    
    const statusEl = document.getElementById('engine-status');
    const dotEl = document.getElementById('engine-dot');
    
    if (statusEl) {
      if (!allowed) {
        statusEl.textContent = 'Trial expired — license required';
        statusEl.style.color = 'var(--color-error)';
        if (dotEl) dotEl.style.background = '#EF4444';
      } else if (on) {
        statusEl.textContent = 'Active and Listening';
        statusEl.style.color = 'var(--color-success)';
        if (dotEl) dotEl.style.background = '#10B981';
      } else {
        statusEl.textContent = 'Engine Stopped';
        statusEl.style.color = 'var(--color-warning)';
        if (dotEl) dotEl.style.background = '#F59E0B';
      }
    }
  },
  
  updateApiStatus(settings) {
    const groqConnected = !!settings.groq_api_key_set;
    const orConnected = !!settings.openrouter_api_key_set;
    const geminiConnected = !!settings.gemini_api_key_set;
    const providerCount = (groqConnected ? 1 : 0) + (orConnected ? 1 : 0) + (geminiConnected ? 1 : 0);
    
    const apiStatusLabel = document.getElementById('api-status-label');
    if (apiStatusLabel) {
      if (providerCount > 0) {
        apiStatusLabel.textContent = 'Connected to AI';
        apiStatusLabel.style.color = 'var(--color-success)';
      } else {
        apiStatusLabel.textContent = 'AI not connected';
        apiStatusLabel.style.color = 'var(--color-warning)';
      }
    }
  },
  
  updateResumeInfo(settings) {
    const activeSlot = settings.active_resume_slot ?? 0;
    const resumeName = settings[`resume_slot_${activeSlot}_name`];
    const resumeContent = settings[`resume_slot_${activeSlot}_content`];
    
    const resumeEl = document.getElementById('qs-resume');
    const resumeSubEl = document.getElementById('qs-resume-sub');
    const resumeBtnEl = document.getElementById('qs-resume-btn');
    
    if (resumeEl) {
      if (resumeName) {
        resumeEl.textContent = resumeName.length > 20 ? resumeName.slice(0, 18) + '…' : resumeName;
        resumeSubEl.textContent = resumeContent ? `${resumeContent.length} chars loaded` : 'Empty file';
        resumeSubEl.style.color = 'var(--color-success)';
        if (resumeBtnEl) resumeBtnEl.style.display = 'none';
      } else {
        resumeEl.textContent = 'None';
        resumeSubEl.textContent = 'No file uploaded';
        resumeSubEl.style.color = 'var(--color-text-muted)';
        if (resumeBtnEl) resumeBtnEl.style.display = 'inline-flex';
      }
    }
  },
  
  async toggleMasterPower(enabled) {
    try {
      await Api.setSetting('master_power', enabled);
      Store.set('masterPower', enabled);
      Toast[enabled ? 'success' : 'info'](enabled ? 'Engine started' : 'Engine stopped');
      
      // Keep the toggle text label in sync
      const label = document.getElementById('master-power-label');
      if (label) {
        label.textContent = enabled ? 'Engine On' : 'Engine Off';
        label.className = 'toggle-text ' + (enabled ? 'on' : 'off');
      }
      
      const statusEl = document.getElementById('engine-status');
      const dotEl = document.getElementById('engine-dot');
      if (statusEl) {
        if (enabled) {
          statusEl.textContent = 'Active and Listening';
          statusEl.style.color = 'var(--color-success)';
          if (dotEl) dotEl.style.background = '#10B981';
        } else {
          statusEl.textContent = 'Engine Stopped';
          statusEl.style.color = 'var(--color-warning)';
          if (dotEl) dotEl.style.background = '#F59E0B';
        }
      }
    } catch (error) {
      Toast.error('Failed to toggle engine');
      // Revert toggle
      const toggle = document.getElementById('master-power');
      if (toggle) toggle.checked = !enabled;
    }
  },
  
  async createShortcut() {
    const btn = document.getElementById('create-shortcut');
    if (!btn) return;
    
    btn.disabled = true;
    btn.innerHTML = '<span class="spinner spinner-sm"></span> Creating...';
    
    try {
      const result = await Api.createDesktopShortcut();
      if (result.success) {
        Toast.success('Desktop shortcut created');
      } else {
        Toast.error(result.error || 'Failed to create shortcut');
      }
    } catch (error) {
      Toast.error('Failed to create shortcut');
    } finally {
      btn.disabled = false;
      btn.textContent = 'Create Shortcut';
    }
  },
  
  handleAction(action) {
    switch (action) {
      case 'apikeys':
        window.goTo('apikeys');
        break;
      case 'resume':
        window.goTo('resume');
        break;
      case 'practice':
        window.goTo('practice');
        break;
      case 'settings':
        window.goTo('settings');
        break;
      case 'history':
        window.goTo('history');
        break;
    }
  },
};

window.DashboardPage = DashboardPage;