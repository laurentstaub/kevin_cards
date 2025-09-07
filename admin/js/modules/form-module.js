// FormModule - Centralized form handling and validation
const FormModule = (function() {
  
  // Private form validation functions
  const validateQuestion = function(formData) {
    const errors = [];
    
    if (!formData.questionText || !formData.questionText.trim()) {
      errors.push('La question est obligatoire');
    }
    
    if (!formData.answerText || !formData.answerText.trim()) {
      errors.push('La réponse est obligatoire');
    }
    
    if (formData.questionText && formData.questionText.trim().length < 10) {
      errors.push('La question doit contenir au moins 10 caractères');
    }
    
    if (formData.answerText && formData.answerText.trim().length < 10) {
      errors.push('La réponse doit contenir au moins 10 caractères');
    }
    
    return {
      isValid: errors.length === 0,
      errors
    };
  };
  
  const validateTag = function(formData) {
    const errors = [];
    
    if (!formData.name || !formData.name.trim()) {
      errors.push('Le nom du tag est obligatoire');
    }
    
    if (formData.name && formData.name.trim().length < 2) {
      errors.push('Le nom du tag doit contenir au moins 2 caractères');
    }
    
    return {
      isValid: errors.length === 0,
      errors
    };
  };
  
  const validateSource = function(source) {
    const errors = [];
    
    if (!source.title || !source.title.trim()) {
      errors.push('Le titre de la source est obligatoire');
    }
    
    if (source.url && !isValidUrl(source.url)) {
      errors.push('L\'URL de la source n\'est pas valide');
    }
    
    if (source.year && (isNaN(source.year) || source.year < 1900 || source.year > new Date().getFullYear())) {
      errors.push('L\'année doit être comprise entre 1900 et l\'année actuelle');
    }
    
    return {
      isValid: errors.length === 0,
      errors
    };
  };
  
  const isValidUrl = function(string) {
    try {
      new URL(string);
      return true;
    } catch (_) {
      return false;
    }
  };
  
  // Private source management functions
  const createSourceItem = function() {
    const template = document.getElementById('source-template');
    if (!template) {
      console.error('Source template not found');
      return null;
    }
    
    const newSource = template.cloneNode(true);
    newSource.classList.remove('template');
    newSource.id = '';
    
    const removeBtn = newSource.querySelector('.btn-remove-source');
    if (removeBtn) {
      removeBtn.addEventListener('click', () => {
        newSource.remove();
      });
    }
    
    return newSource;
  };
  
  const collectSources = function() {
    const sources = [];
    const sourceItems = document.querySelectorAll('.source-item:not(.template)');
    
    sourceItems.forEach(item => {
      const type = item.querySelector('.source-type')?.value || 'textbook';
      const title = item.querySelector('.source-title')?.value.trim() || '';
      
      if (!title) return; // Skip empty sources
      
      const source = { type, title };
      
      // Optional fields
      const authors = item.querySelector('.source-authors')?.value.trim();
      if (authors) {
        source.authors = authors.split(',').map(a => a.trim()).filter(Boolean);
      }
      
      const year = item.querySelector('.source-year')?.value;
      if (year) {
        const yearNum = parseInt(year);
        if (!isNaN(yearNum)) {
          source.year = yearNum;
        }
      }
      
      const pages = item.querySelector('.source-pages')?.value.trim();
      if (pages) source.pages = pages;
      
      const edition = item.querySelector('.source-edition')?.value.trim();
      if (edition) source.edition = edition;
      
      const url = item.querySelector('.source-url')?.value.trim();
      if (url) source.url = url;
      
      // Validate source before adding
      const validation = validateSource(source);
      if (validation.isValid) {
        sources.push(source);
      } else {
        console.warn('Invalid source skipped:', validation.errors);
      }
    });
    
    return sources;
  };
  
  const loadSources = function(sources, containerId = 'sources-container') {
    const container = document.getElementById(containerId);
    if (!container) {
      console.error(`Sources container '${containerId}' not found`);
      return;
    }
    
    // Remove existing sources (except template)
    const existingSources = container.querySelectorAll('.source-item:not(.template)');
    existingSources.forEach(item => item.remove());
    
    // Add sources
    sources.forEach(source => {
      const sourceItem = createSourceItem();
      if (!sourceItem) return;
      
      // Populate fields
      const typeSelect = sourceItem.querySelector('.source-type');
      if (typeSelect) typeSelect.value = source.type || 'textbook';
      
      const titleInput = sourceItem.querySelector('.source-title');
      if (titleInput) titleInput.value = source.title || '';
      
      const authorsInput = sourceItem.querySelector('.source-authors');
      if (authorsInput) authorsInput.value = source.authors ? source.authors.join(', ') : '';
      
      const yearInput = sourceItem.querySelector('.source-year');
      if (yearInput) yearInput.value = source.year || '';
      
      const pagesInput = sourceItem.querySelector('.source-pages');
      if (pagesInput) pagesInput.value = source.pages || '';
      
      const editionInput = sourceItem.querySelector('.source-edition');
      if (editionInput) editionInput.value = source.edition || '';
      
      const urlInput = sourceItem.querySelector('.source-url');
      if (urlInput) urlInput.value = source.url || '';
      
      container.appendChild(sourceItem);
    });
  };
  
  const addSource = function(containerId = 'sources-container') {
    const container = document.getElementById(containerId);
    if (!container) {
      console.error(`Sources container '${containerId}' not found`);
      return false;
    }
    
    const newSource = createSourceItem();
    if (!newSource) return false;
    
    container.appendChild(newSource);
    
    // Focus on the title field of the new source
    const titleInput = newSource.querySelector('.source-title');
    if (titleInput) {
      setTimeout(() => titleInput.focus(), 100);
    }
    
    return true;
  };
  
  // Public form data collection functions
  const collectQuestionData = function(formId = 'question-form') {
    const form = document.getElementById(formId);
    if (!form) {
      console.error(`Form '${formId}' not found`);
      return null;
    }
    
    const formData = new FormData(form);
    
    return {
      questionText: formData.get('questionText') || '',
      answerText: formData.get('answerText') || '',
      sources: collectSources()
    };
  };
  
  const collectTagData = function(formId = 'tag-form') {
    const form = document.getElementById(formId);
    if (!form) {
      console.error(`Form '${formId}' not found`);
      return null;
    }
    
    const formData = new FormData(form);
    
    return {
      name: formData.get('name') || '',
      category: formData.get('category') || '',
      color: formData.get('color') || '#6c757d',
      description: formData.get('description') || ''
    };
  };
  
  // Public form reset functions
  const resetForm = function(formId) {
    const form = document.getElementById(formId);
    if (!form) {
      console.error(`Form '${formId}' not found`);
      return false;
    }
    
    form.reset();
    
    // Clear any dataset attributes
    Object.keys(form.dataset).forEach(key => {
      delete form.dataset[key];
    });
    
    return true;
  };
  
  const resetQuestionForm = function(formId = 'question-form') {
    const success = resetForm(formId);
    
    if (success) {
      // Clear sources container (keep template)
      const container = document.getElementById('sources-container');
      if (container) {
        const existingSources = container.querySelectorAll('.source-item:not(.template)');
        existingSources.forEach(item => item.remove());
      }
    }
    
    return success;
  };
  
  const resetTagForm = function(formId = 'tag-form') {
    return resetForm(formId);
  };
  
  // Public validation functions
  const validate = function(type, data) {
    switch (type) {
      case 'question':
        return validateQuestion(data);
      case 'tag':
        return validateTag(data);
      case 'source':
        return validateSource(data);
      default:
        return { isValid: false, errors: [`Unknown validation type: ${type}`] };
    }
  };
  
  const showValidationErrors = function(errors) {
    if (errors && errors.length > 0) {
      const errorMessage = errors.join('\n• ');
      UIHelpers.toast(`Erreurs de validation:\n• ${errorMessage}`, 'error');
    }
  };
  
  // Public API
  return {
    // Data collection
    collect: {
      question: collectQuestionData,
      tag: collectTagData,
      sources: collectSources
    },
    
    // Form management
    reset: {
      form: resetForm,
      question: resetQuestionForm,
      tag: resetTagForm
    },
    
    // Source management
    sources: {
      add: addSource,
      load: loadSources,
      collect: collectSources,
      create: createSourceItem
    },
    
    // Validation
    validate,
    showValidationErrors
  };
})();

