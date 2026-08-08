/**
 * Hirebotai Dashboard — Resume Page
 * Manage resume uploads and active selection
 */

const ResumePage = {
  async init() {
    this.bindEvents();
    await this.loadResumes();
  },
  
  async activate() {
    await this.loadResumes();
  },
  
  bindEvents() {
    // Upload buttons
    on(document, 'click', '[data-upload-slot]', (e) => {
      const slot = parseInt(e.currentTarget.dataset.uploadSlot, 10);
      this.uploadResume(slot);
    });
    
    // Set active
    on(document, 'click', '[data-activate-slot]', (e) => {
      const slot = parseInt(e.currentTarget.dataset.activateSlot, 10);
      this.setActiveResume(slot);
    });
    
    // Delete
    on(document, 'click', '[data-delete-slot]', (e) => {
      const slot = parseInt(e.currentTarget.dataset.deleteSlot, 10);
      this.deleteResume(slot);
    });
    
    // Preview
    on(document, 'click', '[data-preview-slot]', (e) => {
      const slot = parseInt(e.currentTarget.dataset.previewSlot, 10);
      this.previewResume(slot);
    });
    
    // Drag and drop
    this.initDropZones();
  },
  
  async loadResumes() {
    try {
      const slots = await Api.getResumeSlots();
      Store.set('resumeSlots', slots);
      this.renderResumes(slots);
    } catch (error) {
      console.error('Failed to load resumes:', error);
      Toast.error('Failed to load resumes');
    }
  },
  
  renderResumes(slots) {
    const container = document.getElementById('resume-grid');
    if (!container) return;
    
    const safeSlots = Array.isArray(slots) ? slots : [];
    container.innerHTML = safeSlots.map((slot, index) => {
      if (!slot) return '';
      return this.renderResumeCard(slot, index);
    }).join('');
    this.renderOverview(safeSlots);
    this.initDropZones();
  },

  renderOverview(slots) {
    const el = document.getElementById('resume-overview');
    if (!el) return;
    
    const filled = slots.filter(s => !!s.name).length;
    const active = slots.find(s => s.active);
    const totalChars = slots.reduce((n, s) => n + (s.preview ? s.preview.length : 0), 0);
    const pct = slots.length ? Math.round((filled / slots.length) * 100) : 0;
    
    el.innerHTML = `
      <div class="resume-stat">
        <span class="resume-stat-label">Active resume</span>
        <span class="resume-stat-value ${active && active.name ? 'has' : ''}">${active && active.name ? active.name : 'None selected'}</span>
      </div>
      <div class="resume-stat">
        <span class="resume-stat-label">Slots filled</span>
        <span class="resume-stat-value">${filled} / ${slots.length}</span>
        <div class="resume-stat-bar">
          <span style="width:${pct}%"></span>
        </div>
      </div>
      <div class="resume-stat">
        <span class="resume-stat-label">Indexed content</span>
        <span class="resume-stat-value">${totalChars.toLocaleString()} chars</span>
      </div>
    `;
  },
  
  renderResumeCard(slot, index) {
    const isActive = slot.active;
    const hasContent = !!slot.name;
    const previewText = slot.preview || '';
    
    return `
      <div class="card resume-card ${isActive ? 'active' : 'inactive'}" data-slot="${index}">
        <div class="resume-header">
          <div class="resume-icon ${isActive ? 'active' : ''}">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
              <polyline points="14 2 14 8 20 8"/>
            </svg>
          </div>
          <div class="resume-info">
            <div class="resume-name">${hasContent ? slot.name : `Slot ${index + 1} — Empty`}</div>
            <div class="resume-meta">
              ${isActive ? '<span class="badge badge-brand">Active</span>' : ''}
              ${hasContent ? `<span class="badge badge-neutral">${previewText.length} chars</span>` : ''}
            </div>
          </div>
        </div>
        
        ${hasContent ? `
          <div class="resume-preview">${previewText}</div>
          <div class="resume-actions" style="display:flex; gap:8px; flex-wrap:wrap;">
            <button class="btn btn-secondary btn-sm" data-activate-slot="${index}" ${isActive ? 'disabled' : ''}>
              ${isActive ? 'Active' : 'Set Active'}
            </button>
            <button class="btn btn-secondary btn-sm" data-upload-slot="${index}">Replace</button>
            <button class="btn btn-danger btn-sm" data-delete-slot="${index}">Delete</button>
          </div>
        ` : `
          <div class="drop-zone" data-upload-slot="${index}">
            <div class="drop-zone-icon">
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                <polyline points="17 8 12 3 7 8"/>
                <line x1="12" y1="3" x2="12" y2="15"/>
              </svg>
            </div>
            <div>Click or drag PDF/TXT to upload</div>
            <div style="font-size:11px; color:var(--color-text-faint); margin-top:4px;">Max 10MB</div>
          </div>
        `}
      </div>
    `;
  },
  
  initDropZones() {
    document.querySelectorAll('.drop-zone').forEach(zone => {
      zone.addEventListener('dragover', (e) => {
        e.preventDefault();
        zone.classList.add('drag-over');
      });
      
      zone.addEventListener('dragleave', () => {
        zone.classList.remove('drag-over');
      });
      
      zone.addEventListener('drop', (e) => {
        e.preventDefault();
        zone.classList.remove('drag-over');
        
        const file = e.dataTransfer.files[0];
        if (file) {
          const slot = parseInt(zone.dataset.uploadSlot, 10);
          this.handleFileUpload(slot, file);
        }
      });
    });
  },
  
  async handleFileUpload(slot, file) {
    if (!file.name.match(/\.(pdf|txt)$/i)) {
      Toast.error('Only PDF and TXT files are supported');
      return;
    }
    
    if (file.size > 10 * 1024 * 1024) {
      Toast.error('File size exceeds 10MB limit');
      return;
    }
    
    Toast.info(`Uploading ${file.name}...`);
    
    try {
      const result = await Api.uploadResume(slot);
      if (result.success) {
        Toast.success(`Resume uploaded: ${result.name}`);
        await this.loadResumes();
      } else {
        Toast.error(result.error || 'Upload failed');
      }
    } catch (error) {
      console.error('Upload error:', error);
      Toast.error('Upload failed');
    }
  },
  
  async uploadResume(slot) {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.pdf,.txt';
    input.onchange = async (e) => {
      const file = e.target.files[0];
      if (file) await this.handleFileUpload(slot, file);
    };
    input.click();
  },
  
  async setActiveResume(slot) {
    try {
      await Api.setActiveResume(slot);
      Toast.success(`Slot ${slot + 1} set as active`);
      await this.loadResumes();
    } catch (error) {
      Toast.error('Failed to set active resume');
    }
  },
  
  async deleteResume(slot) {
    const confirmed = await Modal.confirm(
      'Delete this resume? This cannot be undone.',
      'Delete Resume',
      { variant: 'danger' }
    );
    
    if (!confirmed) return;
    
    try {
      await Api.deleteResume(slot);
      Toast.success('Resume deleted');
      await this.loadResumes();
    } catch (error) {
      Toast.error('Failed to delete resume');
    }
  },
  
  async previewResume(slot) {
    try {
      const content = await Api.getResumeContent(slot);
      const slots = Store.get('resumeSlots');
      const slotInfo = slots[slot];
      
      Modal.open(`preview-${slot}`, {
        title: slotInfo?.name || `Slot ${slot + 1}`,
        size: 'lg',
        content: `
          <div style="max-height: 60vh; overflow: auto; font-family: var(--font-mono); font-size: 12px; line-height: 1.7; white-space: pre-wrap; color: var(--color-text-muted);">
            ${content || '(empty)'}
          </div>
        `,
        footer: `
          <button class="btn btn-secondary" data-action="close">Close</button>
          <button class="btn btn-primary" onclick="navigator.clipboard.writeText(\`${content.replace(/`/g, '\\`')}\`); window.Toast.success('Copied!')">Copy All</button>
        `,
      });
    } catch (error) {
      Toast.error('Failed to load preview');
    }
  },
};

window.ResumePage = ResumePage;