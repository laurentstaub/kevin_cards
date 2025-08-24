// FlashPharma Admin JavaScript
class AdminApp {
  constructor() {
    this.currentView = 'questions';
    this.apiBase = 'http://localhost:3001/api';
    this.currentPage = 1;
    this.itemsPerPage = 10;
    this.selectedTags = [];
    this.availableTags = [];
    this.showAnswers = false;
    this.orderBy = 'id';
    this.orderDirection = 'ASC';
    
    this.init();
  }

  async init() {
    this.setupEventListeners();
    await this.loadInitialData();
    this.showView('questions');
  }

  setupEventListeners() {
    // Navigation
    document.querySelectorAll('.nav-item').forEach(item => {
      item.addEventListener('click', (e) => {
        const view = e.currentTarget.dataset.view;
        this.showView(view);
      });
    });

    // Question modal
    document.getElementById('new-question-btn').addEventListener('click', () => {
      this.openQuestionModal();
    });
    
    document.getElementById('close-question-modal').addEventListener('click', () => {
      this.closeModal('question-modal');
    });
    
    document.getElementById('cancel-question').addEventListener('click', () => {
      this.closeModal('question-modal');
    });
    
    document.getElementById('save-question').addEventListener('click', () => {
      this.saveQuestion();
    });

    // Tag modal
    document.getElementById('new-tag-btn').addEventListener('click', () => {
      this.openTagModal();
    });
    
    document.getElementById('close-tag-modal').addEventListener('click', () => {
      this.closeModal('tag-modal');
    });
    
    document.getElementById('cancel-tag').addEventListener('click', () => {
      this.closeModal('tag-modal');
    });
    
    document.getElementById('save-tag').addEventListener('click', () => {
      this.saveTag();
    });

    // Search and filters
    document.getElementById('search-questions').addEventListener('input', 
      this.debounce(() => this.searchQuestions(), 300)
    );
    
    document.getElementById('status-filter').addEventListener('change', () => {
      this.filterQuestions();
    });

    // Sort order control
    document.getElementById('sort-order').addEventListener('change', (e) => {
      const [orderBy, orderDirection] = e.target.value.split(',');
      this.orderBy = orderBy;
      this.orderDirection = orderDirection;
      this.loadQuestions(1);
    });

    // Toggle answers button
    document.getElementById('toggle-answers-btn').addEventListener('click', () => {
      this.toggleAnswers();
    });

    // Tag input and suggestions
    document.getElementById('tag-input').addEventListener('input', (e) => {
      this.handleTagInput(e.target.value);
    });
    
    document.getElementById('tag-input').addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        this.addTag(e.target.value);
      }
    });

    // Source management
    document.getElementById('add-source').addEventListener('click', () => {
      this.addSource();
    });

    // Preview tabs
    document.querySelectorAll('.preview-tab').forEach(tab => {
      tab.addEventListener('click', (e) => {
        this.switchPreviewTab(e.target.dataset.preview);
      });
    });

    // Live preview
    document.getElementById('question-text').addEventListener('input', 
      this.debounce(() => this.updatePreview('question'), 500)
    );
    
    document.getElementById('answer-text').addEventListener('input', 
      this.debounce(() => this.updatePreview('answer'), 500)
    );

    // Color presets
    document.querySelectorAll('.color-preset').forEach(preset => {
      preset.addEventListener('click', (e) => {
        const color = e.target.dataset.color;
        document.getElementById('tag-color').value = color;
        this.updateColorPresets(color);
      });
    });

    // Modal overlay clicks
    document.querySelectorAll('.modal-overlay').forEach(overlay => {
      overlay.addEventListener('click', (e) => {
        if (e.target === overlay) {
          this.closeModal(overlay.id);
        }
      });
    });
  }

  async loadInitialData() {
    try {
      // Load tags for autocomplete
      const tagsResponse = await this.apiRequest('/tags');
      this.availableTags = tagsResponse.tags || [];
      
      // Load initial questions
      await this.loadQuestions();
    } catch (error) {
      console.error('Failed to load initial data:', error);
      this.showToast('Erreur lors du chargement des données', 'error');
    }
  }

  showView(viewName) {
    // Update navigation
    document.querySelectorAll('.nav-item').forEach(item => {
      item.classList.remove('active');
    });
    document.querySelector(`[data-view="${viewName}"]`).classList.add('active');

    // Update views
    document.querySelectorAll('.view').forEach(view => {
      view.classList.remove('active');
    });
    document.getElementById(`${viewName}-view`).classList.add('active');

    this.currentView = viewName;

    // Load view-specific data
    switch (viewName) {
      case 'questions':
        this.loadQuestions();
        break;
      case 'tags':
        this.loadTags();
        break;
      case 'review':
        this.loadPendingQuestions();
        break;
      case 'stats':
        this.loadStats();
        break;
    }
  }

  async loadQuestions(page = 1) {
    const grid = document.getElementById('questions-grid');
    grid.innerHTML = '<div class="loading"><i class="fas fa-spinner fa-spin"></i>Chargement des questions...</div>';

    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: this.itemsPerPage.toString(),
        orderBy: this.orderBy,
        orderDirection: this.orderDirection
      });

      const search = document.getElementById('search-questions')?.value;
      const status = document.getElementById('status-filter')?.value;

      if (search) params.append('search', search);
      if (status) params.append('status', status);

      const response = await this.apiRequest(`/questions?${params}`);
      this.renderQuestions(response.questions || []);
      this.renderPagination(response.pagination, 'questions-pagination');
      
      this.currentPage = page;
    } catch (error) {
      console.error('Failed to load questions:', error);
      grid.innerHTML = '<div class="loading"><i class="fas fa-exclamation-triangle"></i>Erreur lors du chargement</div>';
    }
  }

  renderQuestions(questions) {
    const grid = document.getElementById('questions-grid');
    
    if (questions.length === 0) {
      grid.innerHTML = '<div class="loading"><i class="fas fa-info-circle"></i>Aucune question trouvée</div>';
      return;
    }

    grid.innerHTML = questions.map(question => `
      <div class="question-card">
        <div class="question-header">
          <div class="question-header-left">
            <span class="question-id">Question #${question.id}</span>
            <span class="question-status status-${question.status}">
              ${this.getStatusLabel(question.status)}
            </span>
          </div>
          <div class="question-header-right">
            <span class="question-date">${this.formatDate(question.createdAt)}</span>
            <div class="question-actions-compact">
              <button class="btn btn-xs btn-outline" onclick="adminApp.editQuestion(${question.id})" title="Modifier">
                <i class="fas fa-edit"></i>
              </button>
              <button class="btn btn-xs btn-primary" onclick="adminApp.previewQuestion(${question.id})" title="Aperçu">
                <i class="fas fa-eye"></i>
              </button>
              ${this.getCompactStatusActions(question)}
            </div>
          </div>
        </div>
        
        <div class="question-tags">
          ${(question.tags || []).map(tag => `
            <span class="tag">
              ${tag.name}
            </span>
          `).join('')}
        </div>
        
        <div class="question-content">
          <div class="question-preview">${this.stripHtml(question.questionText)}</div>
          ${this.showAnswers ? `
            <div class="question-preview answer-preview">${this.stripHtml(question.answerText)}</div>
          ` : ''}
        </div>
        
        ${question.sources && question.sources.length > 0 ? `
          <div class="question-sources">
            <div class="sources-label">
              <i class="fas fa-book"></i>
              Sources:
            </div>
            <div class="sources-content">
              ${this.formatSources(question.sources)}
            </div>
          </div>
        ` : ''}
      </div>
    `).join('');
  }

  async loadTags() {
    const grid = document.getElementById('tags-grid');
    grid.innerHTML = '<div class="loading"><i class="fas fa-spinner fa-spin"></i>Chargement des tags...</div>';

    try {
      const response = await this.apiRequest('/tags');
      this.renderTags(response.tags || []);
    } catch (error) {
      console.error('Failed to load tags:', error);
      grid.innerHTML = '<div class="loading"><i class="fas fa-exclamation-triangle"></i>Erreur lors du chargement</div>';
    }
  }

  renderTags(tags) {
    const grid = document.getElementById('tags-grid');
    
    if (tags.length === 0) {
      grid.innerHTML = '<div class="loading"><i class="fas fa-info-circle"></i>Aucun tag trouvé</div>';
      return;
    }

    grid.innerHTML = tags.map(tag => `
      <div class="tag-card">
        <div class="tag-header">
          <div class="tag-color" style="background-color: ${tag.color}"></div>
          <span class="tag-name">${tag.name}</span>
          ${tag.category ? `<span class="tag-category">${tag.category}</span>` : ''}
        </div>
        
        <div class="tag-stats">
          <span>${tag.usageCount} question${tag.usageCount !== 1 ? 's' : ''}</span>
          <span>${this.formatDate(tag.createdAt)}</span>
        </div>
        
        ${tag.description ? `<p style="color: var(--text-secondary); margin-bottom: 1rem;">${tag.description}</p>` : ''}
        
        <div class="tag-actions">
          <button class="btn btn-sm btn-outline" onclick="adminApp.editTag(${tag.id})">
            <i class="fas fa-edit"></i>
            Modifier
          </button>
          <button class="btn btn-sm btn-warning" onclick="adminApp.deactivateTag(${tag.id})">
            <i class="fas fa-eye-slash"></i>
            Désactiver
          </button>
        </div>
      </div>
    `).join('');
  }

  async loadPendingQuestions() {
    const queue = document.getElementById('review-queue');
    queue.innerHTML = '<div class="loading"><i class="fas fa-spinner fa-spin"></i>Chargement de la file de révision...</div>';

    try {
      const response = await this.apiRequest('/questions/pending');
      document.getElementById('pending-count').textContent = response.count || 0;
      
      if (response.questions?.length === 0) {
        queue.innerHTML = '<div class="loading"><i class="fas fa-check-circle"></i>Aucune question en attente de révision</div>';
        return;
      }

      queue.innerHTML = (response.questions || []).map(question => `
        <div class="question-card">
          <div class="question-header">
            <span class="question-id">Question #${question.id}</span>
            <span class="question-status status-pending_review">En attente</span>
          </div>
          
          <div class="question-content">
            <h3>Question:</h3>
            <div class="question-preview">${this.stripHtml(question.questionText)}</div>
            
            <h3 style="margin-top: 1rem;">Réponse:</h3>
            <div class="question-preview">${this.stripHtml(question.answerText)}</div>
          </div>
          
          <div class="question-meta">
            <div class="question-tags">
              ${(question.tags || []).map(tag => `
                <span class="tag">
                  ${tag.name}
                </span>
              `).join('')}
            </div>
            
            <div class="question-info">
              <span>Par ${question.authorName || 'Inconnu'}</span>
              <span>• ${this.formatDate(question.createdAt)}</span>
            </div>
          </div>
          
          <div class="question-actions">
            <button class="btn btn-sm btn-success" onclick="adminApp.approveQuestion(${question.id})">
              <i class="fas fa-check"></i>
              Approuver
            </button>
            <button class="btn btn-sm btn-warning" onclick="adminApp.requestChanges(${question.id})">
              <i class="fas fa-edit"></i>
              Demander modifications
            </button>
            <button class="btn btn-sm btn-danger" onclick="adminApp.rejectQuestion(${question.id})">
              <i class="fas fa-times"></i>
              Rejeter
            </button>
          </div>
        </div>
      `).join('');
    } catch (error) {
      console.error('Failed to load pending questions:', error);
      queue.innerHTML = '<div class="loading"><i class="fas fa-exclamation-triangle"></i>Erreur lors du chargement</div>';
    }
  }

  async loadStats() {
    const dashboard = document.getElementById('stats-dashboard');
    dashboard.innerHTML = '<div class="loading"><i class="fas fa-spinner fa-spin"></i>Chargement des statistiques...</div>';

    try {
      // This would be implemented with actual stats endpoints
      dashboard.innerHTML = `
        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 2rem;">
          <div class="stat-card" style="background: var(--bg-primary); padding: 2rem; border-radius: var(--border-radius); text-align: center;">
            <h3 style="color: var(--primary-color); font-size: 2rem; margin-bottom: 0.5rem;">125</h3>
            <p>Questions totales</p>
          </div>
          <div class="stat-card" style="background: var(--bg-primary); padding: 2rem; border-radius: var(--border-radius); text-align: center;">
            <h3 style="color: var(--success-color); font-size: 2rem; margin-bottom: 0.5rem;">89</h3>
            <p>Questions publiées</p>
          </div>
          <div class="stat-card" style="background: var(--bg-primary); padding: 2rem; border-radius: var(--border-radius); text-align: center;">
            <h3 style="color: var(--warning-color); font-size: 2rem; margin-bottom: 0.5rem;">12</h3>
            <p>En attente de révision</p>
          </div>
          <div class="stat-card" style="background: var(--bg-primary); padding: 2rem; border-radius: var(--border-radius); text-align: center;">
            <h3 style="color: var(--info-color); font-size: 2rem; margin-bottom: 0.5rem;">24</h3>
            <p>Tags actifs</p>
          </div>
        </div>
      `;
    } catch (error) {
      console.error('Failed to load stats:', error);
      dashboard.innerHTML = '<div class="loading"><i class="fas fa-exclamation-triangle"></i>Erreur lors du chargement</div>';
    }
  }

  // Modal management
  openQuestionModal(questionId = null) {
    document.getElementById('question-modal-title').textContent = 
      questionId ? 'Modifier la Question' : 'Nouvelle Question';
    
    if (questionId) {
      this.loadQuestionForEdit(questionId);
    } else {
      this.resetQuestionForm();
    }
    
    this.showModal('question-modal');
  }

  openTagModal(tagId = null) {
    document.getElementById('tag-modal-title').textContent = 
      tagId ? 'Modifier le Tag' : 'Nouveau Tag';
    
    if (tagId) {
      this.loadTagForEdit(tagId);
    } else {
      this.resetTagForm();
    }
    
    this.showModal('tag-modal');
  }

  showModal(modalId) {
    document.getElementById(modalId).classList.add('active');
    document.body.style.overflow = 'hidden';
  }

  closeModal(modalId) {
    document.getElementById(modalId).classList.remove('active');
    document.body.style.overflow = '';
  }

  resetQuestionForm() {
    document.getElementById('question-form').reset();
    delete document.getElementById('question-form').dataset.questionId;
    this.selectedTags = [];
    this.updateSelectedTags();
    document.getElementById('sources-container').innerHTML = 
      document.getElementById('source-template').outerHTML;
    this.updatePreview('question');
  }

  resetTagForm() {
    document.getElementById('tag-form').reset();
    document.getElementById('tag-color').value = '#6c757d';
    this.updateColorPresets('#6c757d');
  }

  // Tag management
  handleTagInput(value) {
    if (!value.trim()) {
      document.getElementById('tag-suggestions').classList.remove('active');
      return;
    }

    const matches = this.availableTags.filter(tag => 
      tag.name.toLowerCase().includes(value.toLowerCase()) &&
      !this.selectedTags.some(selected => selected.id === tag.id)
    ).slice(0, 5);

    const suggestions = document.getElementById('tag-suggestions');
    
    if (matches.length > 0) {
      suggestions.innerHTML = matches.map(tag => `
        <div class="tag-suggestion" onclick="adminApp.selectTagSuggestion(${tag.id}, '${tag.name}', '${tag.color}')">
          <div style="display: flex; align-items: center; gap: 0.5rem;">
            <div style="width: 12px; height: 12px; background: ${tag.color}; border-radius: 50%;"></div>
            ${tag.name}
            ${tag.category ? `<span style="font-size: 0.8em; color: var(--text-light);">(${tag.category})</span>` : ''}
          </div>
        </div>
      `).join('');
      suggestions.classList.add('active');
    } else {
      suggestions.classList.remove('active');
    }
  }

  selectTagSuggestion(id, name, color) {
    this.selectedTags.push({ id, name, color });
    this.updateSelectedTags();
    document.getElementById('tag-input').value = '';
    document.getElementById('tag-suggestions').classList.remove('active');
  }

  addTag(name) {
    if (!name.trim()) return;
    
    // Check if tag already exists
    const existing = this.availableTags.find(tag => 
      tag.name.toLowerCase() === name.toLowerCase()
    );
    
    if (existing && !this.selectedTags.some(selected => selected.id === existing.id)) {
      this.selectedTags.push(existing);
    } else if (!existing) {
      // Create new tag suggestion
      this.selectedTags.push({ 
        id: null, 
        name: name.trim(), 
        color: '#6c757d',
        isNew: true 
      });
    }
    
    this.updateSelectedTags();
    document.getElementById('tag-input').value = '';
    document.getElementById('tag-suggestions').classList.remove('active');
  }

  removeTag(index) {
    this.selectedTags.splice(index, 1);
    this.updateSelectedTags();
  }

  updateSelectedTags() {
    const container = document.getElementById('selected-tags');
    container.innerHTML = this.selectedTags.map((tag, index) => `
      <span class="selected-tag" style="background-color: ${tag.color};">
        ${tag.name}
        ${tag.isNew ? ' (nouveau)' : ''}
        <button type="button" class="remove-tag" onclick="adminApp.removeTag(${index})">×</button>
      </span>
    `).join('');
  }

  // Source management
  addSource() {
    const container = document.getElementById('sources-container');
    const template = document.getElementById('source-template');
    const newSource = template.cloneNode(true);
    
    newSource.classList.remove('template');
    newSource.id = '';
    
    // Add remove functionality
    const removeBtn = newSource.querySelector('.btn-remove-source');
    removeBtn.addEventListener('click', () => {
      newSource.remove();
    });
    
    container.appendChild(newSource);
  }

  // Preview functionality
  switchPreviewTab(type) {
    document.querySelectorAll('.preview-tab').forEach(tab => {
      tab.classList.remove('active');
    });
    document.querySelector(`[data-preview="${type}"]`).classList.add('active');
    this.updatePreview(type);
  }

  async updatePreview(type) {
    const content = document.getElementById(`${type}-text`).value;
    const previewContent = document.getElementById('preview-content');
    
    if (!content.trim()) {
      previewContent.innerHTML = `
        <div class="preview-placeholder">
          <i class="fas fa-eye"></i>
          Tapez du contenu pour voir l'aperçu
        </div>
      `;
      return;
    }

    try {
      const response = await this.apiRequest('/questions/preview', 'POST', {
        [`${type}Text`]: content
      });
      
      previewContent.innerHTML = response[`${type}Html`] || 'Erreur de rendu';
    } catch (error) {
      console.error('Preview error:', error);
      previewContent.innerHTML = '<p style="color: var(--danger-color);">Erreur lors de la génération de l\'aperçu</p>';
    }
  }

  // Color picker
  updateColorPresets(selectedColor) {
    document.querySelectorAll('.color-preset').forEach(preset => {
      preset.classList.remove('active');
      if (preset.dataset.color === selectedColor) {
        preset.classList.add('active');
      }
    });
  }

  // Save operations
  async saveQuestion() {
    const form = document.getElementById('question-form');
    const formData = new FormData(form);
    const questionId = form.dataset.questionId;
    
    const questionData = {
      questionText: formData.get('questionText'),
      answerText: formData.get('answerText'),
      status: formData.get('status'),
      tagIds: this.selectedTags.filter(tag => tag.id).map(tag => tag.id),
      sources: this.collectSources()
    };

    // Validation
    if (!questionData.questionText.trim() || !questionData.answerText.trim()) {
      this.showToast('Veuillez remplir la question et la réponse', 'error');
      return;
    }

    this.showLoading(true);

    try {
      // Create new tags if needed
      for (const tag of this.selectedTags.filter(t => t.isNew)) {
        const newTag = await this.apiRequest('/tags', 'POST', {
          name: tag.name,
          color: tag.color
        });
        tag.id = newTag.id;
        tag.isNew = false;
      }

      // Update tagIds with new tags
      questionData.tagIds = this.selectedTags.map(tag => tag.id);

      let response;
      if (questionId) {
        // Update existing question
        response = await this.apiRequest(`/questions/${questionId}`, 'PUT', questionData);
        this.showToast('Question modifiée avec succès', 'success');
      } else {
        // Create new question
        response = await this.apiRequest('/questions', 'POST', questionData);
        this.showToast('Question créée avec succès', 'success');
      }
      
      this.closeModal('question-modal');
      this.loadQuestions();
    } catch (error) {
      console.error('Save error:', error);
      this.showToast('Erreur lors de la sauvegarde', 'error');
    }

    this.showLoading(false);
  }

  async saveTag() {
    const form = document.getElementById('tag-form');
    const formData = new FormData(form);
    
    const tagData = {
      name: formData.get('name'),
      category: formData.get('category') || null,
      color: formData.get('color'),
      description: formData.get('description') || null
    };

    if (!tagData.name.trim()) {
      this.showToast('Veuillez saisir un nom pour le tag', 'error');
      return;
    }

    this.showLoading(true);

    try {
      const response = await this.apiRequest('/tags', 'POST', tagData);
      
      this.showToast('Tag créé avec succès', 'success');
      this.closeModal('tag-modal');
      this.loadTags();
      
      // Update available tags
      this.availableTags.push(response);
    } catch (error) {
      console.error('Save error:', error);
      this.showToast(error.message || 'Erreur lors de la sauvegarde', 'error');
    }

    this.showLoading(false);
  }

  collectSources() {
    const sources = [];
    const sourceItems = document.querySelectorAll('.source-item:not(.template)');
    
    sourceItems.forEach(item => {
      const type = item.querySelector('.source-type').value;
      const title = item.querySelector('.source-title').value.trim();
      
      if (!title) return;
      
      const source = { type, title };
      
      const authors = item.querySelector('.source-authors').value.trim();
      if (authors) {
        source.authors = authors.split(',').map(a => a.trim()).filter(Boolean);
      }
      
      const year = item.querySelector('.source-year').value;
      if (year) source.year = parseInt(year);
      
      const pages = item.querySelector('.source-pages').value.trim();
      if (pages) source.pages = pages;
      
      const edition = item.querySelector('.source-edition').value.trim();
      if (edition) source.edition = edition;
      
      const url = item.querySelector('.source-url').value.trim();
      if (url) source.url = url;
      
      sources.push(source);
    });
    
    return sources;
  }

  // Question actions
  async editQuestion(id) {
    this.openQuestionModal(id);
  }

  async previewQuestion(id) {
    try {
      const response = await this.apiRequest(`/questions/${id}/preview`);
      
      // Create a preview modal or window
      const previewWindow = window.open('', '_blank', 'width=800,height=600');
      previewWindow.document.write(`
        <html>
          <head>
            <title>Aperçu - Question #${id}</title>
            <style>
              body { font-family: Inter, sans-serif; margin: 2rem; line-height: 1.6; }
              .question { margin-bottom: 2rem; padding: 1rem; border-left: 4px solid #3498db; }
              .answer { margin-bottom: 2rem; padding: 1rem; border-left: 4px solid #27ae60; }
              .drug-name { color: #e74c3c; font-weight: bold; }
              .drug-class { color: #9b59b6; font-style: italic; }
              .alert { padding: 1rem; margin: 1rem 0; border-radius: 4px; }
              .alert-warning { background: #fff3cd; color: #856404; }
              .alert-danger { background: #f8d7da; color: #721c24; }
              .alert-info { background: #d1ecf1; color: #0c5460; }
            </style>
          </head>
          <body>
            <h1>Aperçu - Question #${id}</h1>
            <div class="question">
              <h2>Question:</h2>
              ${response.questionHtml}
            </div>
            <div class="answer">
              <h2>Réponse:</h2>
              ${response.answerHtml}
            </div>
          </body>
        </html>
      `);
    } catch (error) {
      this.showToast('Erreur lors de la génération de l\'aperçu', 'error');
    }
  }

  async approveQuestion(id) {
    try {
      await this.apiRequest(`/questions/${id}/status`, 'PATCH', {
        status: 'validated',
        comment: 'Question approuvée'
      });
      
      this.showToast('Question approuvée', 'success');
      this.loadPendingQuestions();
    } catch (error) {
      this.showToast('Erreur lors de l\'approbation', 'error');
    }
  }

  async requestChanges(id) {
    const comment = prompt('Commentaire pour les modifications demandées:');
    if (!comment) return;
    
    try {
      await this.apiRequest(`/questions/${id}/status`, 'PATCH', {
        status: 'draft',
        comment
      });
      
      this.showToast('Modifications demandées', 'success');
      this.loadPendingQuestions();
    } catch (error) {
      this.showToast('Erreur lors de la demande de modifications', 'error');
    }
  }

  async rejectQuestion(id) {
    const comment = prompt('Raison du rejet:');
    if (!comment) return;
    
    try {
      await this.apiRequest(`/questions/${id}/status`, 'PATCH', {
        status: 'archived',
        comment
      });
      
      this.showToast('Question rejetée', 'success');
      this.loadPendingQuestions();
    } catch (error) {
      this.showToast('Erreur lors du rejet', 'error');
    }
  }

  // Tag actions
  async editTag(id) {
    this.openTagModal(id);
  }

  async deactivateTag(id) {
    if (!confirm('Êtes-vous sûr de vouloir désactiver ce tag?')) return;
    
    try {
      await this.apiRequest(`/tags/${id}/deactivate`, 'PATCH');
      this.showToast('Tag désactivé', 'success');
      this.loadTags();
    } catch (error) {
      this.showToast('Erreur lors de la désactivation', 'error');
    }
  }

  // Utility functions
  async apiRequest(endpoint, method = 'GET', data = null) {
    const url = `${this.apiBase}${endpoint}`;
    const options = {
      method,
      headers: {
        'Content-Type': 'application/json'
      }
    };

    if (data && (method === 'POST' || method === 'PUT' || method === 'PATCH')) {
      options.body = JSON.stringify(data);
    }

    const response = await fetch(url, options);
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || `HTTP ${response.status}`);
    }

    return await response.json();
  }

  showLoading(show) {
    const overlay = document.getElementById('loading-overlay');
    if (show) {
      overlay.classList.add('active');
    } else {
      overlay.classList.remove('active');
    }
  }

  showToast(message, type = 'info') {
    const container = document.getElementById('toast-container');
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.innerHTML = `
      ${message}
      <button class="toast-close" onclick="this.parentElement.remove()">×</button>
    `;
    
    container.appendChild(toast);
    
    setTimeout(() => toast.classList.add('show'), 100);
    setTimeout(() => toast.remove(), 5000);
  }

  renderPagination(pagination, containerId) {
    const container = document.getElementById(containerId);
    if (!pagination || pagination.totalPages <= 1) {
      container.innerHTML = '';
      return;
    }

    const { currentPage, totalPages } = pagination;
    const buttons = [];

    // Previous button
    buttons.push(`
      <button ${currentPage <= 1 ? 'disabled' : ''} onclick="adminApp.loadQuestions(${currentPage - 1})">
        <i class="fas fa-chevron-left"></i>
      </button>
    `);

    // Page numbers
    const startPage = Math.max(1, currentPage - 2);
    const endPage = Math.min(totalPages, currentPage + 2);

    if (startPage > 1) {
      buttons.push(`<button onclick="adminApp.loadQuestions(1)">1</button>`);
      if (startPage > 2) {
        buttons.push(`<span>...</span>`);
      }
    }

    for (let page = startPage; page <= endPage; page++) {
      buttons.push(`
        <button ${page === currentPage ? 'class="active"' : ''} onclick="adminApp.loadQuestions(${page})">
          ${page}
        </button>
      `);
    }

    if (endPage < totalPages) {
      if (endPage < totalPages - 1) {
        buttons.push(`<span>...</span>`);
      }
      buttons.push(`<button onclick="adminApp.loadQuestions(${totalPages})">${totalPages}</button>`);
    }

    // Next button
    buttons.push(`
      <button ${currentPage >= totalPages ? 'disabled' : ''} onclick="adminApp.loadQuestions(${currentPage + 1})">
        <i class="fas fa-chevron-right"></i>
      </button>
    `);

    container.innerHTML = buttons.join('');
  }

  getStatusLabel(status) {
    const labels = {
      draft: 'Brouillon',
      pending_review: 'En attente',
      validated: 'Validé',
      published: 'Publié',
      disabled: 'Désactivé',
      archived: 'Archivé'
    };
    return labels[status] || status;
  }

  getStatusActions(question) {
    const actions = [];
    
    switch (question.status) {
      case 'draft':
        actions.push(`
          <button class="btn btn-sm btn-warning" onclick="adminApp.submitForReview(${question.id})">
            <i class="fas fa-paper-plane"></i>
            Soumettre
          </button>
        `);
        break;
      case 'validated':
        actions.push(`
          <button class="btn btn-sm btn-success" onclick="adminApp.publishQuestion(${question.id})">
            <i class="fas fa-check"></i>
            Publier
          </button>
        `);
        break;
      case 'published':
        actions.push(`
          <button class="btn btn-sm btn-secondary" onclick="adminApp.disableQuestion(${question.id})">
            <i class="fas fa-eye-slash"></i>
            Désactiver
          </button>
        `);
        break;
    }
    
    return actions.join('');
  }

  getCompactStatusActions(question) {
    const actions = [];
    
    switch (question.status) {
      case 'draft':
        actions.push(`
          <button class="btn btn-xs btn-warning" onclick="adminApp.submitForReview(${question.id})" title="Soumettre pour révision">
            <i class="fas fa-paper-plane"></i>
          </button>
        `);
        break;
      case 'validated':
        actions.push(`
          <button class="btn btn-xs btn-success" onclick="adminApp.publishQuestion(${question.id})" title="Publier">
            <i class="fas fa-check"></i>
          </button>
        `);
        break;
      case 'published':
        actions.push(`
          <button class="btn btn-xs btn-secondary" onclick="adminApp.disableQuestion(${question.id})" title="Désactiver">
            <i class="fas fa-eye-slash"></i>
          </button>
        `);
        break;
      case 'disabled':
        actions.push(`
          <button class="btn btn-xs btn-success" onclick="adminApp.reactivateQuestion(${question.id})" title="Réactiver">
            <i class="fas fa-eye"></i>
          </button>
        `);
        break;
    }
    
    return actions.join('');
  }

  async submitForReview(id) {
    try {
      await this.apiRequest(`/questions/${id}/status`, 'PATCH', {
        status: 'pending_review'
      });
      this.showToast('Question soumise pour révision', 'success');
      this.loadQuestions();
    } catch (error) {
      this.showToast('Erreur lors de la soumission', 'error');
    }
  }

  async publishQuestion(id) {
    try {
      await this.apiRequest(`/questions/${id}/status`, 'PATCH', {
        status: 'published'
      });
      this.showToast('Question publiée', 'success');
      this.loadQuestions();
    } catch (error) {
      this.showToast('Erreur lors de la publication', 'error');
    }
  }

  async disableQuestion(id) {
    try {
      await this.apiRequest(`/questions/${id}/status`, 'PATCH', {
        status: 'disabled'
      });
      this.showToast('Question désactivée', 'success');
      this.loadQuestions();
    } catch (error) {
      this.showToast('Erreur lors de la désactivation', 'error');
    }
  }

  async reactivateQuestion(id) {
    try {
      await this.apiRequest(`/questions/${id}/status`, 'PATCH', {
        status: 'published'
      });
      this.showToast('Question réactivée', 'success');
      this.loadQuestions();
    } catch (error) {
      this.showToast('Erreur lors de la réactivation', 'error');
    }
  }

  searchQuestions() {
    this.loadQuestions(1);
  }

  filterQuestions() {
    this.loadQuestions(1);
  }

  toggleAnswers() {
    this.showAnswers = !this.showAnswers;
    const btn = document.getElementById('toggle-answers-btn');
    
    if (this.showAnswers) {
      btn.innerHTML = '<i class="fas fa-eye-slash"></i> Masquer réponses';
      btn.classList.remove('btn-secondary');
      btn.classList.add('btn-primary');
    } else {
      btn.innerHTML = '<i class="fas fa-eye"></i> Afficher réponses';
      btn.classList.remove('btn-primary');
      btn.classList.add('btn-secondary');
    }
    
    // Re-render the current questions with the new toggle state
    this.loadQuestions(this.currentPage);
  }

  stripHtml(text) {
    const div = document.createElement('div');
    div.innerHTML = text;
    return div.textContent || div.innerText || '';
  }

  formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString('fr-FR', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  }

  formatSources(sources) {
    if (!sources || sources.length === 0) {
      return '<span class="no-sources">Aucune source</span>';
    }

    return sources.map((source, index) => {
      let formatted = `<sup>${index + 1}</sup> `;
      
      if (source.authors && source.authors.length > 0) {
        formatted += `${source.authors.join(', ')}. `;
      }
      
      // Make title clickable if there's a URL
      if (source.url) {
        formatted += `<em><a href="${source.url}" target="_blank" rel="noopener noreferrer" class="source-link">${source.title}</a></em>`;
      } else {
        formatted += `<em>${source.title}</em>`;
      }
      
      if (source.year) {
        formatted += ` (${source.year})`;
      }
      
      if (source.pages) {
        formatted += `, p. ${source.pages}`;
      }
      
      if (source.edition) {
        formatted += `, ${source.edition}`;
      }

      // Add URL if present and not already linked to title
      if (source.url) {
        formatted += ` <i class="fas fa-external-link-alt source-link-icon" title="Lien externe"></i>`;
      }

      return formatted;
    }).join('<br>');
  }

  debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
      const later = () => {
        clearTimeout(timeout);
        func(...args);
      };
      clearTimeout(timeout);
      timeout = setTimeout(later, wait);
    };
  }

  // Load question for editing
  async loadQuestionForEdit(questionId) {
    try {
      const question = await this.apiRequest(`/questions/${questionId}`);

      // Populate the form fields
      document.getElementById('question-text').value = question.questionText || '';
      document.getElementById('answer-text').value = question.answerText || '';
      document.getElementById('question-status').value = question.status || 'draft';

      // Set the question ID for editing
      document.getElementById('question-form').dataset.questionId = questionId;

      // Load tags
      this.selectedTags = question.tags || [];
      this.renderSelectedTags();

      // Load sources
      this.loadSources(question.sources || []);

    } catch (error) {
      console.error('Error loading question for edit:', error);
      this.showToast('Erreur lors du chargement de la question', 'error');
    }
  }

  // Load tag for editing
  async loadTagForEdit(tagId) {
    try {
      const tag = await this.apiRequest(`/tags/${tagId}`);

      // Populate the form fields
      document.getElementById('tag-name').value = tag.name || '';
      document.getElementById('tag-category').value = tag.category || '';
      document.getElementById('tag-color').value = tag.color || '#6c757d';
      document.getElementById('tag-description').value = tag.description || '';

      // Set the tag ID for editing
      document.getElementById('tag-form').dataset.tagId = tagId;

    } catch (error) {
      console.error('Error loading tag for edit:', error);
      this.showToast('Erreur lors du chargement du tag', 'error');
    }
  }

  // Load sources into the form
  loadSources(sources) {
    const container = document.getElementById('sources-container');
    // Clear existing sources except template
    const existingSources = container.querySelectorAll('.source-item:not(.template)');
    existingSources.forEach(item => item.remove());

    // Add each source
    sources.forEach(source => {
      const sourceItem = this.createSourceItem();
      
      sourceItem.querySelector('.source-type').value = source.type || 'textbook';
      sourceItem.querySelector('.source-title').value = source.title || '';
      sourceItem.querySelector('.source-authors').value = source.authors ? source.authors.join(', ') : '';
      sourceItem.querySelector('.source-year').value = source.year || '';
      sourceItem.querySelector('.source-pages').value = source.pages || '';
      sourceItem.querySelector('.source-edition').value = source.edition || '';
      sourceItem.querySelector('.source-url').value = source.url || '';

      container.appendChild(sourceItem);
    });
  }

  // Create a new source item from template
  createSourceItem() {
    const template = document.getElementById('source-template');
    const newSource = template.cloneNode(true);
    
    newSource.classList.remove('template');
    newSource.id = '';
    
    // Add remove functionality
    const removeBtn = newSource.querySelector('.btn-remove-source');
    removeBtn.addEventListener('click', () => {
      newSource.remove();
    });
    
    return newSource;
  }

  // Render selected tags in the form
  renderSelectedTags() {
    const container = document.getElementById('selected-tags');
    container.innerHTML = '';

    this.selectedTags.forEach(tag => {
      const tagElement = document.createElement('span');
      tagElement.className = 'selected-tag';
      tagElement.innerHTML = `
        ${tag.name}
        <button type="button" onclick="adminApp.removeSelectedTag(${tag.id})">
          <i class="fas fa-times"></i>
        </button>
      `;
      container.appendChild(tagElement);
    });
  }

  // Remove selected tag
  removeSelectedTag(tagId) {
    this.selectedTags = this.selectedTags.filter(tag => tag.id !== tagId);
    this.renderSelectedTags();
  }
}

// Initialize the admin app
const adminApp = new AdminApp();