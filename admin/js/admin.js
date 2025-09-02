// FlashPharma Admin JavaScript
class AdminApp {
  constructor() {
    this.apiBase = '/api';
    this.currentPage = 1;
    this.itemsPerPage = 10;
    this.selectedTags = [];
    this.availableTags = [];
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
    document.addEventListener('click', (e) => {
      const target = e.target.closest('[data-action], [data-view], .nav-item, .modal-overlay, .tag-suggestion');
      if (!target) return;

      if (target.classList.contains('nav-item')) {
        const view = target.dataset.view;
        this.showView(view);
        return;
      }

      if (target.classList.contains('modal-overlay') && e.target === target) {
        this.closeModal(target.id);
        return;
      }

      if (target.classList.contains('tag-suggestion')) {
        const id = target.dataset.id;
        const name = target.dataset.name;
        const color = target.dataset.color;
        this.selectTagSuggestion(parseInt(id), name, color);
        return;
      }

      const action = target.dataset.action;
      const id = target.dataset.id;

      switch (action) {
        case 'new-question': this.openQuestionModal(); break;
        case 'close-question-modal': this.closeModal('question-modal'); break;
        case 'cancel-question': this.closeModal('question-modal'); break;
        case 'save-question': this.saveQuestion(); break;
        case 'new-tag': this.openTagModal(); break;
        case 'close-tag-modal': this.closeModal('tag-modal'); break;
        case 'cancel-tag': this.closeModal('tag-modal'); break;
        case 'save-tag': this.saveTag(); break;
        case 'edit-question': this.editQuestion(id); break;
        case 'edit-tag': this.editTag(id); break;
        case 'add-source': this.addSource(); break;
        case 'load-page': this.loadQuestions(parseInt(target.dataset.page)); break;
        case 'remove-tag': this.removeTag(parseInt(target.dataset.index)); break;
      }
    });

    // Input events (debounced)
    const inputHandlers = {
      'search-questions': () => this.searchQuestions(),
      'search-tags': () => this.filterTags(),
      'tag-input': (e) => this.handleTagInput(e.target.value)
    };

    Object.entries(inputHandlers).forEach(([id, handler]) => {
      const element = document.getElementById(id);
      if (element) {
        const isTagInput = id === 'tag-input';
        const debounceTime = id.includes('preview') ? 500 : 300;
        const finalHandler = isTagInput ? handler : this.debounce(handler, debounceTime);
        element.addEventListener('input', finalHandler);
      }
    });

    // Change events
    const changeHandlers = {
      'category-filter': () => this.filterTags(),
      'status-filter': () => this.filterQuestions(),
      'sort-order': (e) => {
        const [orderBy, orderDirection] = e.target.value.split(',');
        this.orderBy = orderBy;
        this.orderDirection = orderDirection;
        this.loadQuestions(1);
      }
    };

    Object.entries(changeHandlers).forEach(([id, handler]) => {
      const element = document.getElementById(id);
      if (element) {
        element.addEventListener('change', handler);
      }
    });

    // Special keydown handler for tag input
    const tagInput = document.getElementById('tag-input');
    if (tagInput) {
      tagInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          this.addTag(e.target.value);
        }
      });
    }
  }

  async loadInitialData() {
    try {
      const tagsResponse = await this.apiRequest('/tags');
      this.availableTags = tagsResponse.tags || [];

      await this.updateQuestionOrderingRange();
      await this.loadQuestions();
    } catch (error) {
      console.error('Failed to load initial data:', error);
      this.showToast('Erreur lors du chargement des données', 'error');
    }
  }

  async updateQuestionOrderingRange() {
    try {
      const response = await this.apiRequest('/questions?page=1&limit=1&orderBy=id&orderDirection=ASC');
      const firstPageResponse = await this.apiRequest('/questions?page=1&limit=1&orderBy=id&orderDirection=DESC');
      
      if (response.questions && response.questions.length > 0 && 
          firstPageResponse.questions && firstPageResponse.questions.length > 0) {
        const minId = response.questions[0].id;
        const maxId = firstPageResponse.questions[0].id;
        
        const sortOrder = document.getElementById('sort-order');
        if (sortOrder) {
          const ascOption = sortOrder.querySelector('option[value="id,ASC"]');
          const descOption = sortOrder.querySelector('option[value="id,DESC"]');
          
          if (ascOption) {
            ascOption.textContent = `Ordre numérique (${minId}-${maxId})`;
          }
          if (descOption) {
            descOption.textContent = `Ordre numérique (${maxId}-${minId})`;
          }
        }
      }
    } catch (error) {
      console.warn('Could not update question ordering range:', error);
    }
  }

  showView(viewName) {
    document.querySelectorAll('.nav-item').forEach(item => {
      item.classList.remove('active');
    });
    document.querySelector(`[data-view="${viewName}"]`).classList.add('active');

    document.querySelectorAll('.view').forEach(view => {
      view.classList.remove('active');
    });
    document.getElementById(`${viewName}-view`).classList.add('active');

    switch (viewName) {
      case 'questions':
        this.loadQuestions();
        break;
      case 'tags':
        this.loadTags();
        break;
    }
  }

  async loadQuestions(page = null) {
    if (page === null) {
      page = this.currentPage || 1;
    }
    
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
      const activeFilter = document.getElementById('status-filter')?.value;

      if (search) params.append('search', search);
      if (activeFilter) params.append('active', activeFilter);

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
    const template = document.getElementById('card-template');
    
    grid.innerHTML = '';

    if (questions.length === 0) {
      grid.innerHTML = '<div class="loading"><i class="fas fa-info-circle"></i>Aucune question trouvée</div>';
      return;
    }

    questions.forEach(question => {
      const card = template.content.cloneNode(true);
      const cardElement = card.querySelector('.question-card');

      cardElement.dataset.questionId = question.id;
      card.querySelector('.question-id').textContent = `Question #${question.id}`;
      
      const status = card.querySelector('.question-status');
      status.textContent = question.isActive ? 'Actif' : 'Inactif';
      status.className = `question-status status-${question.isActive ? 'active' : 'inactive'}`;
      
      card.querySelector('.question-date').textContent = this.formatDate(question.createdAt);
      card.querySelector('.question-preview').innerHTML = this.stripHtml(question.questionText);

      // Tags
      const tagsContainer = card.querySelector('.question-tags');
      (question.tags || []).forEach(tag => {
        const tagElement = document.createElement('span');
        tagElement.className = 'tag';
        tagElement.textContent = tag.name;
        tagsContainer.appendChild(tagElement);
      });

      const answerElement = document.createElement('div');
      answerElement.className = 'question-preview answer-preview';
      answerElement.innerHTML = this.stripHtml(question.answerText);
      card.querySelector('.question-content').appendChild(answerElement);

      if (question.sources && question.sources.length > 0) {
        const sourcesElement = document.createElement('div');
        sourcesElement.className = 'question-sources';
        sourcesElement.innerHTML = `
          <div class="sources-label"><i class="fas fa-book"></i> Sources:</div>
          <div class="sources-content">${this.formatSources(question.sources)}</div>
        `;
        cardElement.appendChild(sourcesElement);
      }
      
      const toggleButton = this.createToggleButton(question);
      card.querySelector('.question-actions-compact').appendChild(toggleButton);
      card.querySelector('[data-action="edit-question"]').dataset.id = question.id;
      toggleButton.addEventListener('click', () => this.toggleQuestion(question.id));

      grid.appendChild(card);
    });
  }

  async loadTags() {
    const grid = document.getElementById('tags-grid');
    grid.innerHTML = '<div class="loading"><i class="fas fa-spinner fa-spin"></i>Chargement des tags...</div>';

    try {
      const response = await this.apiRequest('/tags');
      this.allTags = response.tags || [];
      this.renderTags(this.allTags);
    } catch (error) {
      console.error('Failed to load tags:', error);
      grid.innerHTML = '<div class="loading"><i class="fas fa-exclamation-triangle"></i>Erreur lors du chargement</div>';
    }
  }
  
  filterTags() {
    if (!this.allTags) {
      this.loadTags();
      return;
    }
    
    const searchTerm = document.getElementById('search-tags')?.value.toLowerCase() || '';
    const categoryFilter = document.getElementById('category-filter')?.value || '';
    
    let filteredTags = this.allTags;
    
    if (searchTerm) {
      filteredTags = filteredTags.filter(tag => 
        tag.name.toLowerCase().includes(searchTerm) ||
        (tag.description && tag.description.toLowerCase().includes(searchTerm))
      );
    }
    
    if (categoryFilter) {
      filteredTags = filteredTags.filter(tag => tag.category === categoryFilter);
    }
    
    this.renderTags(filteredTags);
  }

  renderTags(tags) {
    const grid = document.getElementById('tags-grid');
    const cardTemplate = document.getElementById('tag-card-template');
    
    grid.innerHTML = '';
    
    if (tags.length === 0) {
      grid.innerHTML = '<div class="loading"><i class="fas fa-info-circle"></i>Aucun tag trouvé</div>';
      return;
    }

    const sortedTags = [...tags].sort((a, b) => b.usageCount - a.usageCount);

    sortedTags.forEach(tag => {
      const card = cardTemplate.content.cloneNode(true);
      const cardElement = card.querySelector('.tag-card');
      
      const colorDiv = card.querySelector('.tag-color');
      colorDiv.style.backgroundColor = tag.color;
      
      card.querySelector('.tag-name').textContent = tag.name;
      
      const categorySpan = card.querySelector('.tag-category');
      if (tag.category) {
        categorySpan.textContent = tag.category;
      } else {
        categorySpan.remove();
      }
      
      const usageBadge = card.querySelector('.tag-usage-badge');
      card.querySelector('.usage-count').textContent = tag.usageCount;
      card.querySelector('.usage-text').textContent = `${tag.usageCount} question${tag.usageCount !== 1 ? 's' : ''}`;      
      card.querySelector('.tag-date').textContent = this.formatDate(tag.createdAt);
      
      const descriptionP = card.querySelector('.tag-description');
      if (tag.description) {
        descriptionP.textContent = tag.description;
      } else {
        descriptionP.remove();
      }
      
      // Set up action buttons
      const actionsDiv = card.querySelector('.tag-actions');
      card.querySelector('[data-action="edit-tag"]').dataset.id = tag.id;
      
      if (tag.usageCount === 0) {
        actionsDiv.appendChild(this.createButton('btn btn-sm btn-danger', 'Supprimer', 'fa-trash', () => this.deleteTag(tag.id)));
      } else {
        actionsDiv.appendChild(this.createButton('btn btn-sm btn-warning', 'Désactiver', 'fa-eye-slash', () => this.deactivateTag(tag.id)));
      }
      
      if (tag.usageCount > 0) {
        actionsDiv.appendChild(this.createButton('btn btn-sm btn-info', 'Voir les questions', 'fa-list', () => this.viewTagQuestions(tag.id)));
      }
      
      grid.appendChild(card);
    });
  }

  // Modal management
  async openQuestionModal(questionId = null) {
    document.getElementById('question-modal-title').textContent = 
      questionId ? 'Modifier la Question' : 'Nouvelle Question';
    
    if (questionId) {
      await this.loadQuestionForEdit(questionId);
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
  }

  resetTagForm() {
    document.getElementById('tag-form').reset();
  }

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
        <div class="tag-suggestion" data-id="${tag.id}" data-name="${tag.name}" data-color="${tag.color}">
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
    
    const existing = this.availableTags.find(tag => 
      tag.name.toLowerCase() === name.toLowerCase()
    );
    
    if (existing && !this.selectedTags.some(selected => selected.id === existing.id)) {
      this.selectedTags.push(existing);
    } else if (!existing) {
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
    const template = document.getElementById('selected-tag-template');
    
    container.innerHTML = '';
    
    this.selectedTags.forEach((tag, index) => {
      const tagElement = template.content.cloneNode(true);
      const tagSpan = tagElement.querySelector('.selected-tag');
      
      tagSpan.style.backgroundColor = tag.color;
      tagElement.querySelector('.tag-name').textContent = tag.name;
      
      const newIndicator = tagElement.querySelector('.tag-new-indicator');
      if (tag.isNew) {
        newIndicator.textContent = ' (nouveau)';
      } else {
        newIndicator.remove();
      }
      
      const removeButton = tagElement.querySelector('[data-action="remove-tag"]');
      removeButton.dataset.index = index;
      
      container.appendChild(tagElement);
    });
  }

  addSource() {
    const container = document.getElementById('sources-container');
    const template = document.getElementById('source-template');
    const newSource = template.cloneNode(true);
    
    newSource.classList.remove('template');
    newSource.id = '';
    
    const removeBtn = newSource.querySelector('.btn-remove-source');
    removeBtn.addEventListener('click', () => {
      newSource.remove();
    });
    
    container.appendChild(newSource);
  }

  async saveQuestion() {
    const form = document.getElementById('question-form');
    const formData = new FormData(form);
    
    const questionData = {
      questionText: formData.get('questionText'),
      answerText: formData.get('answerText'),
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
      for (const tag of this.selectedTags.filter(t => t.isNew)) {
        const newTag = await this.apiRequest('/tags', 'POST', {
          name: tag.name,
          color: tag.color
        });
        tag.id = newTag.id;
        tag.isNew = false;
      }

      questionData.tagIds = this.selectedTags.map(tag => tag.id);
      
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
      color: formData.get('color') || '#3498db',
      description: formData.get('description') || null
    };
    
    // Remove empty values for update to avoid overwriting with null
    if (this.editingTagId) {
      Object.keys(tagData).forEach(key => {
        if (tagData[key] === null || tagData[key] === '') {
          delete tagData[key];
        }
      });
    }

    if (!tagData.name || !tagData.name.trim()) {
      this.showToast('Veuillez saisir un nom pour le tag', 'error');
      return;
    }

    this.showLoading(true);

    try {
      let response;
      if (this.editingTagId) {
        // Update existing tag - only send changed fields
        response = await this.apiRequest(`/tags/${this.editingTagId}`, 'PUT', tagData);
        this.showToast('Tag modifié avec succès', 'success');
        // Update in available tags list
        const index = this.availableTags.findIndex(t => t.id === this.editingTagId);
        if (index !== -1) {
          this.availableTags[index] = response;
        }
      } else {
        response = await this.apiRequest('/tags', 'POST', tagData);
        this.showToast('Tag créé avec succès', 'success');
        this.availableTags.push(response);
      }
      
      this.closeModal('tag-modal');
      this.loadTags(); // Reload available tags for autocomplete
      await this.loadInitialData();
      this.editingTagId = null;
      
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

  async editQuestion(id) {
    this.openQuestionModal(id);
  }

  async editTag(id) {
    try {
      const response = await this.apiRequest(`/tags/${id}`);
      const tag = response.tag || response;
      
      // Open modal with existing data
      const modal = document.getElementById('tag-modal');
      document.getElementById('tag-modal-title').textContent = 'Modifier le Tag';
      
      document.getElementById('tag-name').value = tag.name || '';
      document.getElementById('tag-category').value = tag.category || '';
      const colorInput = document.querySelector('#tag-form input[name="color"]');
      if (colorInput) colorInput.value = tag.color || '#3498db';
      const descriptionInput = document.querySelector('#tag-form textarea[name="description"]');
      if (descriptionInput) descriptionInput.value = tag.description || '';
      
      this.editingTagId = id;
      
      modal.classList.add('active');
    } catch (error) {
      console.error('Failed to load tag:', error);
      this.showToast('Erreur lors du chargement du tag', 'error');
    }
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
    const buttonTemplate = document.getElementById('pagination-button-template');
    const ellipsisTemplate = document.getElementById('pagination-ellipsis-template');
    
    if (!pagination || pagination.totalPages <= 1) {
      container.innerHTML = '';
      return;
    }

    const { currentPage, totalPages } = pagination;
    container.innerHTML = '';

    const prevBtn = buttonTemplate.content.cloneNode(true);
    const prevButton = prevBtn.querySelector('.pagination-btn');
    prevButton.innerHTML = '<i class="fas fa-chevron-left"></i>';
    prevButton.disabled = currentPage <= 1;
    prevButton.dataset.page = currentPage - 1;
    container.appendChild(prevBtn);

    const startPage = Math.max(1, currentPage - 2);
    const endPage = Math.min(totalPages, currentPage + 2);

    if (startPage > 1) {
      const firstBtn = buttonTemplate.content.cloneNode(true);
      const firstButton = firstBtn.querySelector('.pagination-btn');
      firstButton.querySelector('.page-content').textContent = '1';
      firstButton.dataset.page = '1';
      container.appendChild(firstBtn);

      if (startPage > 2) {
        container.appendChild(ellipsisTemplate.content.cloneNode(true));
      }
    }

    for (let page = startPage; page <= endPage; page++) {
      const pageBtn = buttonTemplate.content.cloneNode(true);
      const pageButton = pageBtn.querySelector('.pagination-btn');
      pageButton.querySelector('.page-content').textContent = page.toString();
      pageButton.dataset.page = page.toString();
      if (page === currentPage) {
        pageButton.classList.add('active');
      }
      container.appendChild(pageBtn);
    }

    if (endPage < totalPages) {
      if (endPage < totalPages - 1) {
        container.appendChild(ellipsisTemplate.content.cloneNode(true));
      }
      
      const lastBtn = buttonTemplate.content.cloneNode(true);
      const lastButton = lastBtn.querySelector('.pagination-btn');
      lastButton.querySelector('.page-content').textContent = totalPages.toString();
      lastButton.dataset.page = totalPages.toString();
      container.appendChild(lastBtn);
    }

    // Next button
    const nextBtn = buttonTemplate.content.cloneNode(true);
    const nextButton = nextBtn.querySelector('.pagination-btn');
    nextButton.innerHTML = '<i class="fas fa-chevron-right"></i>';
    nextButton.disabled = currentPage >= totalPages;
    nextButton.dataset.page = currentPage + 1;
    container.appendChild(nextBtn);
  }

  createToggleButton(question) {
    const isActive = question.isActive;
    return this.createButton(
      `btn btn-xs ${isActive ? 'btn-success' : 'btn-secondary'}`,
      isActive ? 'Désactiver' : 'Activer',
      isActive ? 'fa-toggle-on' : 'fa-toggle-off',
      () => {} // onClick will be added separately in renderQuestions
    );
  }

  async toggleQuestion(id) {
    try {
      const response = await this.apiRequest(`/questions/${id}/toggle`, 'PATCH');
      const message = response.isActive ? 'Question activée' : 'Question désactivée';
      this.showToast(message, 'success');
      this.loadQuestions();
    } catch (error) {
      this.showToast('Erreur lors du changement de statut', 'error');
    }
  }

  searchQuestions() {
    this.loadQuestions(1);
  }

  filterQuestions() {
    this.loadQuestions(1);
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

      if (source.url) {
        formatted += ` <i class="fas fa-external-link-alt source-link-icon" title="Lien externe"></i>`;
      }

      return formatted;
    }).join('<br>');
  }

  createButton(className, title, icon, onClick) {
    const btn = document.createElement('button');
    btn.className = className;
    btn.title = title;
    btn.innerHTML = `<i class="fas ${icon}"></i>`;
    btn.addEventListener('click', onClick);
    return btn;
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

  async loadQuestionForEdit(questionId) {
    try {
      const question = await this.apiRequest(`/questions/${questionId}`);

      document.getElementById('question-text').value = question.questionText || '';
      document.getElementById('answer-text').value = question.answerText || '';
      document.getElementById('question-form').dataset.questionId = questionId;

      this.selectedTags = question.tags || [];
      this.renderSelectedTags();
      this.loadSources(question.sources || []);

    } catch (error) {
      console.error('Error loading question for edit:', error);
      this.showToast('Erreur lors du chargement de la question', 'error');
    }
  }

  async loadTagForEdit(tagId) {
    try {
      const tag = await this.apiRequest(`/tags/${tagId}`);

      document.getElementById('tag-name').value = tag.name || '';
      document.getElementById('tag-category').value = tag.category || '';
      document.getElementById('tag-color').value = tag.color || '#6c757d';
      document.getElementById('tag-description').value = tag.description || '';
      document.getElementById('tag-form').dataset.tagId = tagId;

    } catch (error) {
      console.error('Error loading tag for edit:', error);
      this.showToast('Erreur lors du chargement du tag', 'error');
    }
  }

  loadSources(sources) {
    const container = document.getElementById('sources-container');
    const existingSources = container.querySelectorAll('.source-item:not(.template)');
    existingSources.forEach(item => item.remove());

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

  createSourceItem() {
    const template = document.getElementById('source-template');
    const newSource = template.cloneNode(true);
    
    newSource.classList.remove('template');
    newSource.id = '';
    
    const removeBtn = newSource.querySelector('.btn-remove-source');
    removeBtn.addEventListener('click', () => {
      newSource.remove();
    });
    
    return newSource;
  }

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

  removeSelectedTag(tagId) {
    this.selectedTags = this.selectedTags.filter(tag => tag.id !== tagId);
    this.renderSelectedTags();
  }
}

const adminApp = new AdminApp();

window.adminApp = adminApp;