// UIHelpers Module - Pure utility functions for UI operations
const UIHelpers = (function() {
  
  // Private utility functions
  const stripHtml = function(text) {
    const div = document.createElement('div');
    div.innerHTML = text;
    return div.textContent || div.innerText || '';
  };

  const formatDate = function(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString('fr-FR', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const formatSources = function(sources) {
    if (!sources || sources.length === 0) {
      return '<span class="no-sources">Aucune source</span>';
    }

    return sources.map((source, index) => {
      let formatted = `<sup>${index + 1}</sup> `;
      
      if (source.authors && source.authors.length > 0) {
        formatted += `${source.authors.join(', ')}. `;
      }
      
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
  };

  const createButton = function(className, title, icon, onClick) {
    const btn = document.createElement('button');
    btn.className = className;
    btn.title = title;
    btn.innerHTML = `<i class="fas ${icon}"></i>`;
    btn.addEventListener('click', onClick);
    return btn;
  };

  const debounce = function(func, wait) {
    let timeout;
    return function executedFunction(...args) {
      const later = () => {
        clearTimeout(timeout);
        func(...args);
      };
      clearTimeout(timeout);
      timeout = setTimeout(later, wait);
    };
  };

  const showToast = function(message, type = 'info') {
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
  };

  const showLoading = function(show) {
    const overlay = document.getElementById('loading-overlay');
    if (show) {
      overlay.classList.add('active');
    } else {
      overlay.classList.remove('active');
    }
  };

  // Public API
  return {
    stripHtml,
    formatDate,
    formatSources,
    createButton,
    debounce,
    toast: showToast,
    loading: showLoading
  };
})();

