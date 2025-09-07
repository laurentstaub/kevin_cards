// EventManager - Centralized event handling and delegation
const EventManager = (function() {
  
  // Private event handlers registry
  const eventHandlers = new Map();
  const debounceTimers = new Map();
  
  // Private utility functions
  const debounce = function(func, wait, key) {
    return function executedFunction(...args) {
      const later = () => {
        debounceTimers.delete(key);
        func(...args);
      };
      
      if (debounceTimers.has(key)) {
        clearTimeout(debounceTimers.get(key));
      }
      
      debounceTimers.set(key, setTimeout(later, wait));
    };
  };
  
  // Private event delegation
  const setupClickDelegation = function(handlers) {
    document.addEventListener('click', (e) => {
      const target = e.target.closest('[data-action], [data-view], .nav-item, .modal-overlay, .tag-suggestion');
      if (!target) return;

      // Navigation handling
      if (target.classList.contains('nav-item')) {
        const view = target.dataset.view;
        if (handlers.showView) {
          handlers.showView(view);
        }
        return;
      }

      // Modal overlay handling
      if (target.classList.contains('modal-overlay') && e.target === target) {
        ModalManager.hide(target.id);
        return;
      }

      // Tag suggestion handling
      if (target.classList.contains('tag-suggestion')) {
        const id = target.dataset.id;
        const name = target.dataset.name;
        const color = target.dataset.color;
        if (handlers.selectTagSuggestion) {
          handlers.selectTagSuggestion(parseInt(id), name, color);
        }
        return;
      }

      // Action handling
      const action = target.dataset.action;
      const id = target.dataset.id;

      const actionHandlers = {
        'new-question': () => handlers.openQuestionModal && handlers.openQuestionModal(),
        'close-question-modal': () => ModalManager.hide('question-modal'),
        'cancel-question': () => ModalManager.hide('question-modal'),
        'save-question': () => handlers.saveQuestion && handlers.saveQuestion(),
        'new-tag': () => handlers.createNewTag && handlers.createNewTag(),
        'edit-question': () => handlers.editQuestion && handlers.editQuestion(id),
        'toggle-question': () => handlers.toggleQuestion && handlers.toggleQuestion(id),
        'add-source': () => FormModule.sources.add(),
        'load-page': () => handlers.loadQuestions && handlers.loadQuestions(parseInt(target.dataset.page)),
        'remove-tag': () => handlers.removeTag && handlers.removeTag(parseInt(target.dataset.index))
      };

      if (actionHandlers[action]) {
        actionHandlers[action]();
      }
    });
  };
  
  const setupInputHandlers = function(handlers) {
    const inputConfigs = {
      'search-questions': {
        handler: () => handlers.searchQuestions && handlers.searchQuestions(),
        debounce: 300
      },
      'search-tags': {
        handler: () => handlers.filterTags && handlers.filterTags(),
        debounce: 300
      },
      'tag-input': {
        handler: (e) => handlers.handleTagInput && handlers.handleTagInput(e.target.value),
        debounce: 0 // No debounce for tag input
      }
    };

    Object.entries(inputConfigs).forEach(([id, config]) => {
      const element = document.getElementById(id);
      if (element) {
        const finalHandler = config.debounce > 0 
          ? debounce(config.handler, config.debounce, id)
          : config.handler;
        element.addEventListener('input', finalHandler);
        eventHandlers.set(id, { element, handler: finalHandler, event: 'input' });
      }
    });
  };
  
  const setupChangeHandlers = function(handlers) {
    const changeConfigs = {
      'status-filter': () => handlers.filterQuestions && handlers.filterQuestions(),
      'sort-order': (e) => {
        if (handlers.setSorting) {
          const [orderBy, orderDirection] = e.target.value.split(',');
          handlers.setSorting(orderBy, orderDirection);
        }
      },
      'tags-sort': () => handlers.sortTags && handlers.sortTags()
    };

    Object.entries(changeConfigs).forEach(([id, handler]) => {
      const element = document.getElementById(id);
      if (element) {
        element.addEventListener('change', handler);
        eventHandlers.set(id, { element, handler, event: 'change' });
      }
    });
  };
  
  const setupKeyboardHandlers = function(handlers) {
    // Tag input special handling
    const tagInput = document.getElementById('tag-input');
    if (tagInput) {
      const keyHandler = (e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          if (handlers.addTag) {
            handlers.addTag(e.target.value);
          }
        }
      };
      tagInput.addEventListener('keydown', keyHandler);
      eventHandlers.set('tag-input-keydown', { element: tagInput, handler: keyHandler, event: 'keydown' });
    }
    
    // Global keyboard shortcuts
    const globalKeyHandler = (e) => {
      // ESC to close modals (handled by ModalManager)
      // Ctrl/Cmd + N for new question
      if ((e.ctrlKey || e.metaKey) && e.key === 'n') {
        e.preventDefault();
        if (handlers.openQuestionModal) {
          handlers.openQuestionModal();
        }
      }
      
      // Ctrl/Cmd + S to save (when in modal)
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        if (ModalManager.getActiveModals().length > 0) {
          e.preventDefault();
          if (handlers.saveQuestion) {
            handlers.saveQuestion();
          }
        }
      }
    };
    
    document.addEventListener('keydown', globalKeyHandler);
    eventHandlers.set('global-keys', { element: document, handler: globalKeyHandler, event: 'keydown' });
  };
  
  // Public functions
  const init = function(handlers = {}) {
    // Clear existing handlers
    cleanup();
    
    // Setup all event types
    setupClickDelegation(handlers);
    setupInputHandlers(handlers);
    setupChangeHandlers(handlers);
    setupKeyboardHandlers(handlers);
    
    console.log('EventManager initialized with', eventHandlers.size, 'handlers');
  };
  
  const cleanup = function() {
    // Remove all registered event listeners
    eventHandlers.forEach(({ element, handler, event }) => {
      element.removeEventListener(event, handler);
    });
    eventHandlers.clear();
    
    // Clear all debounce timers
    debounceTimers.forEach(timer => clearTimeout(timer));
    debounceTimers.clear();
  };
  
  const addCustomHandler = function(elementId, event, handler, options = {}) {
    const element = document.getElementById(elementId);
    if (!element) {
      console.warn(`Element '${elementId}' not found for custom handler`);
      return false;
    }
    
    const finalHandler = options.debounce 
      ? debounce(handler, options.debounce, `${elementId}-${event}`)
      : handler;
    
    element.addEventListener(event, finalHandler);
    eventHandlers.set(`${elementId}-${event}`, { element, handler: finalHandler, event });
    
    return true;
  };
  
  const removeCustomHandler = function(elementId, event) {
    const key = `${elementId}-${event}`;
    const handlerInfo = eventHandlers.get(key);
    
    if (handlerInfo) {
      handlerInfo.element.removeEventListener(handlerInfo.event, handlerInfo.handler);
      eventHandlers.delete(key);
      return true;
    }
    
    return false;
  };
  
  const triggerEvent = function(elementId, event, data = {}) {
    const element = document.getElementById(elementId);
    if (!element) {
      console.warn(`Element '${elementId}' not found for event trigger`);
      return false;
    }
    
    const customEvent = new CustomEvent(event, { detail: data });
    element.dispatchEvent(customEvent);
    return true;
  };
  
  // Public API
  return {
    init,
    cleanup,
    addCustomHandler,
    removeCustomHandler,
    triggerEvent,
    
    // Utilities
    debounce: (func, wait) => debounce(func, wait, `custom-${Date.now()}`),
    getHandlerCount: () => eventHandlers.size
  };
})();
