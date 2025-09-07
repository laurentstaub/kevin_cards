// QuestionModule - Question management and rendering
const QuestionModule = (function() {
  
  // Private state
  let currentPage = 1;
  let itemsPerPage = 10;
  let orderBy = 'id';
  let orderDirection = 'ASC';
  
  // Private rendering functions
  const renderQuestions = function(questions) {
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
      
      card.querySelector('.question-date').textContent = UIHelpers.formatDate(question.createdAt);
      card.querySelector('.question-preview').innerHTML = UIHelpers.stripHtml(question.questionText);

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
      answerElement.innerHTML = UIHelpers.stripHtml(question.answerText);
      card.querySelector('.question-content').appendChild(answerElement);

      if (question.sources && question.sources.length > 0) {
        const sourcesElement = document.createElement('div');
        sourcesElement.className = 'question-sources';
        sourcesElement.innerHTML = `
          <div class="sources-label"><i class="fas fa-book"></i> Sources:</div>
          <div class="sources-content">${UIHelpers.formatSources(question.sources)}</div>
        `;
        cardElement.appendChild(sourcesElement);
      }
      
      const toggleButton = createToggleButton(question);
      card.querySelector('.question-actions-compact').appendChild(toggleButton);
      card.querySelector('[data-action="edit-question"]').dataset.id = question.id;
      
      // Use data-action for consistent event handling
      toggleButton.setAttribute('data-action', 'toggle-question');
      toggleButton.setAttribute('data-id', question.id);

      grid.appendChild(card);
    });
  };

  const createToggleButton = function(question) {
    const isActive = question.isActive;
    return UIHelpers.createButton(
      `btn btn-xs ${isActive ? 'btn-success' : 'btn-secondary'}`,
      isActive ? 'Désactiver' : 'Activer',
      isActive ? 'fa-toggle-on' : 'fa-toggle-off',
      () => {} // onClick will be added separately in renderQuestions
    );
  };

  const updateQuestionOrderingRange = async function() {
    try {
      const response = await ApiClient.questions.getAll({page: 1, limit: 1, orderBy: 'id', orderDirection: 'ASC'});
      const firstPageResponse = await ApiClient.questions.getAll({page: 1, limit: 1, orderBy: 'id', orderDirection: 'DESC'});
      
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
  };

  // Public functions
  const loadQuestions = async function(page = null, onPageChange = null) {
    if (page === null) {
      page = currentPage || 1;
    }
    
    const grid = document.getElementById('questions-grid');
    grid.innerHTML = '<div class="loading"><i class="fas fa-spinner fa-spin"></i>Chargement des questions...</div>';

    try {
      const params = {
        page: page.toString(),
        limit: itemsPerPage.toString(),
        orderBy: orderBy,
        orderDirection: orderDirection
      };

      const search = document.getElementById('search-questions')?.value;
      const activeFilter = document.getElementById('status-filter')?.value;

      if (search) params.search = search;
      if (activeFilter) params.active = activeFilter;

      const response = await ApiClient.questions.getAll(params);
      renderQuestions(response.questions || []);
      
      // Use PaginationModule if available, otherwise inline rendering
      if (window.PaginationModule) {
        PaginationModule.render(response.pagination, 'questions-pagination');
      } else {
        renderPaginationInline(response.pagination, 'questions-pagination');
      }
      
      currentPage = page;
      
      // Callback for page changes
      if (onPageChange) {
        onPageChange(currentPage, response);
      }
    } catch (error) {
      console.error('Failed to load questions:', error);
      grid.innerHTML = '<div class="loading"><i class="fas fa-exclamation-triangle"></i>Erreur lors du chargement</div>';
    }
  };

  const renderPaginationInline = function(pagination, containerId) {
    const container = document.getElementById(containerId);
    const buttonTemplate = document.getElementById('pagination-button-template');
    const ellipsisTemplate = document.getElementById('pagination-ellipsis-template');
    
    if (!pagination || pagination.totalPages <= 1) {
      container.innerHTML = '';
      return;
    }

    const { currentPage: pageCurrent, totalPages } = pagination;
    container.innerHTML = '';

    const prevBtn = buttonTemplate.content.cloneNode(true);
    const prevButton = prevBtn.querySelector('.pagination-btn');
    prevButton.innerHTML = '<i class="fas fa-chevron-left"></i>';
    prevButton.disabled = pageCurrent <= 1;
    prevButton.dataset.page = pageCurrent - 1;
    container.appendChild(prevBtn);

    const startPage = Math.max(1, pageCurrent - 2);
    const endPage = Math.min(totalPages, pageCurrent + 2);

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
      if (page === pageCurrent) {
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
    nextButton.disabled = pageCurrent >= totalPages;
    nextButton.dataset.page = pageCurrent + 1;
    container.appendChild(nextBtn);
  };

  const searchQuestions = function() {
    loadQuestions(1);
  };

  const filterQuestions = function() {
    loadQuestions(1);
  };

  const toggleQuestion = async function(id) {
    try {
      const response = await ApiClient.questions.toggle(id);
      
      let message = 'Statut modifié avec succès';
      if (response && typeof response.isActive === 'boolean') {
        message = response.isActive ? 'Question activée' : 'Question désactivée';
      }
      
      UIHelpers.toast(message, 'success');
      
      // Simple and reliable: reload the page
      setTimeout(() => {
        window.location.reload();
      }, 1000); // Give time for the toast to show
      
    } catch (error) {
      console.error('Toggle question error:', error);
      UIHelpers.toast('Erreur lors du changement de statut', 'error');
    }
  };

  const setSorting = function(newOrderBy, newOrderDirection) {
    orderBy = newOrderBy;
    orderDirection = newOrderDirection;
    loadQuestions(1);
  };

  const setItemsPerPage = function(newItemsPerPage) {
    itemsPerPage = newItemsPerPage;
    loadQuestions(1);
  };

  // Public API
  return {
    // Core functions
    loadQuestions,
    searchQuestions,
    filterQuestions,
    toggleQuestion,
    updateQuestionOrderingRange,
    
    // Configuration
    setSorting,
    setItemsPerPage,
    
    // State getters
    getCurrentPage: () => currentPage,
    getItemsPerPage: () => itemsPerPage,
    getOrderBy: () => orderBy,
    getOrderDirection: () => orderDirection,
    
    // Rendering (for advanced usage)
    renderQuestions
  };
})();
