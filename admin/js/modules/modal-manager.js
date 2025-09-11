// ModalManager Module - Centralized modal management
const ModalManager = (function() {
  
  // Private state
  let activeModals = new Set();
  
  // Private functions
  const lockBodyScroll = function() {
    document.body.style.overflow = 'hidden';
  };
  
  const unlockBodyScroll = function() {
    if (activeModals.size === 0) {
      document.body.style.overflow = '';
    }
  };
  
  const handleOverlayClick = function(e) {
    const modal = e.target.closest('.modal-overlay');
    if (modal && e.target === modal) {
      hide(modal.id);
    }
  };
  
  const handleEscapeKey = function(e) {
    if (e.key === 'Escape' && activeModals.size > 0) {
      // Close the most recently opened modal
      const lastModal = Array.from(activeModals).pop();
      if (lastModal) {
        hide(lastModal);
      }
    }
  };
  
  // Initialize event listeners
  const init = function() {
    document.addEventListener('click', handleOverlayClick);
    document.addEventListener('keydown', handleEscapeKey);
  };
  
  // Public functions
  const show = function(modalId) {
    const modal = document.getElementById(modalId);
    if (!modal) {
      console.error(`Modal with id '${modalId}' not found`);
      return false;
    }
    
    modal.classList.add('active');
    activeModals.add(modalId);
    lockBodyScroll();
    
    // Focus first input in modal if available
    const firstInput = modal.querySelector('input, textarea, select');
    if (firstInput) {
      setTimeout(() => firstInput.focus(), 100);
    }
    
    return true;
  };
  
  const hide = function(modalId) {
    const modal = document.getElementById(modalId);
    if (!modal) {
      console.error(`Modal with id '${modalId}' not found`);
      return false;
    }
    
    modal.classList.remove('active');
    activeModals.delete(modalId);
    unlockBodyScroll();
    
    return true;
  };
  
  const hideAll = function() {
    activeModals.forEach(modalId => {
      const modal = document.getElementById(modalId);
      if (modal) {
        modal.classList.remove('active');
      }
    });
    activeModals.clear();
    unlockBodyScroll();
  };
  
  const isOpen = function(modalId) {
    return activeModals.has(modalId);
  };
  
  const getActiveModals = function() {
    return Array.from(activeModals);
  };
  
  // Public API
  return {
    init,
    show,
    hide,
    hideAll,
    isOpen,
    getActiveModals
  };
})();

// Auto-initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', ModalManager.init);
} else {
  ModalManager.init();
}


