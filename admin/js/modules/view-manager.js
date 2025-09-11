// ViewManager - Navigation and view management
const ViewManager = (function() {
  
  // Private state
  let currentView = 'questions';
  let viewHandlers = {};
  
  // Private functions
  const updateNavigation = function(viewName) {
    document.querySelectorAll('.nav-item').forEach(item => {
      item.classList.remove('active');
    });
    
    const activeNavItem = document.querySelector(`[data-view="${viewName}"]`);
    if (activeNavItem) {
      activeNavItem.classList.add('active');
    }
  };
  
  const updateViewDisplay = function(viewName) {
    document.querySelectorAll('.view').forEach(view => {
      view.classList.remove('active');
    });
    
    const activeView = document.getElementById(`${viewName}-view`);
    if (activeView) {
      activeView.classList.add('active');
    }
  };
  
  const executeViewHandler = function(viewName) {
    if (viewHandlers[viewName]) {
      try {
        viewHandlers[viewName]();
      } catch (error) {
        console.error(`Error executing handler for view '${viewName}':`, error);
        UIHelpers.toast(`Erreur lors du chargement de la vue ${viewName}`, 'error');
      }
    }
  };
  
  // Public functions
  const showView = function(viewName) {
    if (!viewName) {
      console.warn('ViewManager.showView: viewName is required');
      return false;
    }
    
    // Check if view exists
    const viewElement = document.getElementById(`${viewName}-view`);
    if (!viewElement) {
      console.warn(`ViewManager.showView: View '${viewName}' does not exist`);
      return false;
    }
    
    const previousView = currentView;
    currentView = viewName;
    
    // Update UI
    updateNavigation(viewName);
    updateViewDisplay(viewName);
    
    // Execute view-specific logic
    executeViewHandler(viewName);
    
    // Trigger view change event
    const event = new CustomEvent('viewChanged', {
      detail: { 
        previousView, 
        currentView: viewName,
        timestamp: Date.now()
      }
    });
    document.dispatchEvent(event);
    
    return true;
  };
  
  const registerViewHandler = function(viewName, handler) {
    if (typeof handler !== 'function') {
      console.warn(`ViewManager.registerViewHandler: Handler for '${viewName}' must be a function`);
      return false;
    }
    
    viewHandlers[viewName] = handler;
    return true;
  };
  
  const unregisterViewHandler = function(viewName) {
    if (viewHandlers[viewName]) {
      delete viewHandlers[viewName];
      return true;
    }
    return false;
  };
  
  const getCurrentView = function() {
    return currentView;
  };
  
  const getAvailableViews = function() {
    const viewElements = document.querySelectorAll('.view[id$="-view"]');
    return Array.from(viewElements).map(el => el.id.replace('-view', ''));
  };
  
  const isViewActive = function(viewName) {
    return currentView === viewName;
  };
  
  const refreshCurrentView = function() {
    executeViewHandler(currentView);
  };
  
  const init = function(defaultView = 'questions') {
    // Set up default view handlers
    const defaultHandlers = {
      'questions': () => {
        if (window.QuestionModule) {
          QuestionModule.loadQuestions();
        }
      },
      'tags': () => {
        if (window.TagManagementModule) {
          TagManagementModule.loadTags();
        }
      }
    };
    
    // Register default handlers
    Object.entries(defaultHandlers).forEach(([view, handler]) => {
      registerViewHandler(view, handler);
    });
    
    // Show default view
    showView(defaultView);
    
    // Listen for navigation clicks (if not handled by EventManager)
    if (!window.EventManager) {
      document.addEventListener('click', (e) => {
        const navItem = e.target.closest('.nav-item[data-view]');
        if (navItem) {
          const viewName = navItem.dataset.view;
          showView(viewName);
        }
      });
    }
  };
  
  // Breadcrumb support
  const setBreadcrumb = function(items) {
    const breadcrumbContainer = document.getElementById('breadcrumb');
    if (!breadcrumbContainer) return false;
    
    const breadcrumbHtml = items.map((item, index) => {
      const isLast = index === items.length - 1;
      const classes = isLast ? 'breadcrumb-item active' : 'breadcrumb-item';
      
      if (isLast || !item.view) {
        return `<span class="${classes}">${item.label}</span>`;
      } else {
        return `<a href="#" class="${classes}" data-view="${item.view}">${item.label}</a>`;
      }
    }).join('<span class="breadcrumb-separator">/</span>');
    
    breadcrumbContainer.innerHTML = breadcrumbHtml;
    return true;
  };
  
  const clearBreadcrumb = function() {
    const breadcrumbContainer = document.getElementById('breadcrumb');
    if (breadcrumbContainer) {
      breadcrumbContainer.innerHTML = '';
      return true;
    }
    return false;
  };
  
  // Public API
  return {
    // Core functions
    init,
    showView,
    getCurrentView,
    refreshCurrentView,
    
    // View handler management
    registerViewHandler,
    unregisterViewHandler,
    
    // Utility functions
    getAvailableViews,
    isViewActive,
    
    // Breadcrumb support
    setBreadcrumb,
    clearBreadcrumb,
    
    // Events (for external listeners)
    on: (event, handler) => document.addEventListener(event, handler),
    off: (event, handler) => document.removeEventListener(event, handler)
  };
})();


