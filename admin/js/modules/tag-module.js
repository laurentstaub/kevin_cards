// TagModule - Centralized tag management and selection
const TagModule = (function() {
  
  // Private state
  let availableTags = [];
  let selectedTags = [];
  
  // Private DOM element references
  let tagInput = null;
  let tagSuggestions = null;
  let selectedTagsContainer = null;
  let selectedTagTemplate = null;
  
  // Private initialization
  const init = function() {
    // Cache DOM elements
    tagInput = document.getElementById('tag-input');
    tagSuggestions = document.getElementById('tag-suggestions');
    selectedTagsContainer = document.getElementById('selected-tags');
    selectedTagTemplate = document.getElementById('selected-tag-template');
    
    // Setup event listeners if elements exist
    if (tagInput) {
      tagInput.addEventListener('keydown', handleTagInputKeydown);
    }
  };
  
  // Private event handlers
  const handleTagInputKeydown = function(e) {
    if (e.key === 'Enter') {
      e.preventDefault();
      addTag(e.target.value);
    }
  };
  
  // Private tag suggestion functions
  const renderSuggestions = function(matches) {
    if (!tagSuggestions) return;
    
    if (matches.length > 0) {
      tagSuggestions.innerHTML = matches.map(tag => `
        <div class="tag-suggestion" data-id="${tag.id}" data-name="${tag.name}" data-color="${tag.color}">
          <div style="display: flex; align-items: center; gap: 0.5rem;">
            <div style="width: 12px; height: 12px; background: ${tag.color}; border-radius: 50%;"></div>
            ${tag.name}
            ${tag.category ? `<span style="font-size: 0.8em; color: var(--text-light);">(${tag.category})</span>` : ''}
          </div>
        </div>
      `).join('');
      tagSuggestions.classList.add('active');
    } else {
      tagSuggestions.classList.remove('active');
    }
  };
  
  const hideSuggestions = function() {
    if (tagSuggestions) {
      tagSuggestions.classList.remove('active');
    }
  };
  
  // Private tag management functions
  const findTagById = function(id) {
    return availableTags.find(tag => tag.id === parseInt(id));
  };
  
  const findTagByName = function(name) {
    return availableTags.find(tag => 
      tag.name.toLowerCase() === name.toLowerCase()
    );
  };
  
  const isTagSelected = function(tagId) {
    return selectedTags.some(tag => tag.id === parseInt(tagId));
  };
  
  const generateTagId = function() {
    // Generate a temporary negative ID for new tags
    return -(Date.now() + Math.random());
  };
  
  // Private rendering functions
  const renderSelectedTags = function() {
    if (!selectedTagsContainer || !selectedTagTemplate) return;
    
    selectedTagsContainer.innerHTML = '';
    
    selectedTags.forEach((tag, index) => {
      const tagElement = selectedTagTemplate.content.cloneNode(true);
      const tagSpan = tagElement.querySelector('.selected-tag');
      
      if (tagSpan) {
        tagSpan.style.backgroundColor = tag.color || '#6c757d';
      }
      
      const tagNameElement = tagElement.querySelector('.tag-name');
      if (tagNameElement) {
        tagNameElement.textContent = tag.name;
      }
      
      const newIndicator = tagElement.querySelector('.tag-new-indicator');
      if (newIndicator) {
        if (tag.isNew) {
          newIndicator.textContent = ' (nouveau)';
        } else {
          newIndicator.remove();
        }
      }
      
      const removeButton = tagElement.querySelector('[data-action="remove-tag"]');
      if (removeButton) {
        removeButton.dataset.index = index;
      }
      
      selectedTagsContainer.appendChild(tagElement);
    });
  };
  
  // Public functions
  const loadAvailableTags = async function() {
    try {
      const response = await ApiClient.tags.getAll();
      availableTags = response.tags || [];
      return availableTags;
    } catch (error) {
      console.error('Failed to load available tags:', error);
      UIHelpers.toast('Erreur lors du chargement des tags', 'error');
      return [];
    }
  };
  
  const handleTagInput = function(value) {
    if (!value.trim()) {
      hideSuggestions();
      return;
    }

    const matches = availableTags.filter(tag => 
      tag.name.toLowerCase().includes(value.toLowerCase()) &&
      !isTagSelected(tag.id)
    ).slice(0, 5);

    renderSuggestions(matches);
  };
  
  const selectTagSuggestion = function(id, name, color) {
    const tag = { 
      id: parseInt(id), 
      name, 
      color: color || '#6c757d'
    };
    
    if (!isTagSelected(tag.id)) {
      selectedTags.push(tag);
      renderSelectedTags();
    }
    
    // Clear input and hide suggestions
    if (tagInput) {
      tagInput.value = '';
    }
    hideSuggestions();
  };
  
  const addTag = function(name) {
    if (!name.trim()) return false;
    
    const trimmedName = name.trim();
    
    // Check if tag already exists
    const existingTag = findTagByName(trimmedName);
    
    if (existingTag && !isTagSelected(existingTag.id)) {
      selectedTags.push(existingTag);
    } else if (!existingTag) {
      // Create new tag
      const newTag = { 
        id: generateTagId(), 
        name: trimmedName, 
        color: '#6c757d',
        isNew: true 
      };
      selectedTags.push(newTag);
    }
    
    renderSelectedTags();
    
    // Clear input and hide suggestions
    if (tagInput) {
      tagInput.value = '';
    }
    hideSuggestions();
    
    return true;
  };
  
  const removeTag = function(index) {
    const tagIndex = parseInt(index);
    if (tagIndex >= 0 && tagIndex < selectedTags.length) {
      selectedTags.splice(tagIndex, 1);
      renderSelectedTags();
      return true;
    }
    return false;
  };
  
  const removeTagById = function(tagId) {
    const index = selectedTags.findIndex(tag => tag.id === parseInt(tagId));
    if (index !== -1) {
      selectedTags.splice(index, 1);
      renderSelectedTags();
      return true;
    }
    return false;
  };
  
  const clearSelectedTags = function() {
    selectedTags = [];
    renderSelectedTags();
  };
  
  const setSelectedTags = function(tags) {
    selectedTags = Array.isArray(tags) ? [...tags] : [];
    renderSelectedTags();
  };
  
  const getSelectedTags = function() {
    return [...selectedTags];
  };
  
  const getSelectedTagIds = function() {
    return selectedTags.filter(tag => tag.id && !tag.isNew).map(tag => tag.id);
  };
  
  const getNewTags = function() {
    return selectedTags.filter(tag => tag.isNew);
  };
  
  const updateTagInLists = function(tagId, updatedData) {
    // Update in available tags
    const availableIndex = availableTags.findIndex(t => t.id === tagId);
    if (availableIndex !== -1) {
      Object.assign(availableTags[availableIndex], updatedData);
    }
    
    // Update in selected tags
    const selectedIndex = selectedTags.findIndex(t => t.id === tagId);
    if (selectedIndex !== -1) {
      Object.assign(selectedTags[selectedIndex], updatedData);
      renderSelectedTags();
    }
  };
  
  const addToAvailableTags = function(tag) {
    if (tag && !findTagById(tag.id)) {
      availableTags.push(tag);
    }
  };
  
  // Tag creation helper
  const createNewTags = async function() {
    const newTags = getNewTags();
    const createdTags = [];
    
    for (const tag of newTags) {
      try {
        const createdTag = await ApiClient.tags.create({
          name: tag.name,
          color: tag.color
        });
        
        // Update the tag in selectedTags
        const index = selectedTags.findIndex(t => t.id === tag.id);
        if (index !== -1) {
          selectedTags[index] = {
            ...createdTag,
            isNew: false
          };
        }
        
        // Add to available tags
        addToAvailableTags(createdTag);
        createdTags.push(createdTag);
        
      } catch (error) {
        console.error('Failed to create tag:', tag.name, error);
        UIHelpers.toast(`Erreur lors de la création du tag "${tag.name}"`, 'error');
      }
    }
    
    if (createdTags.length > 0) {
      renderSelectedTags();
    }
    
    return createdTags;
  };
  
  // Auto-initialize when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
  
  // Public API
  return {
    // Initialization
    init,
    loadAvailableTags,
    
    // Tag input handling
    handleTagInput,
    selectTagSuggestion,
    addTag,
    
    // Tag management
    removeTag,
    removeTagById,
    clearSelectedTags,
    setSelectedTags,
    getSelectedTags,
    getSelectedTagIds,
    getNewTags,
    createNewTags,
    
    // Available tags management
    getAvailableTags: () => [...availableTags],
    updateTagInLists,
    addToAvailableTags,
    
    // Utilities
    findTagById,
    findTagByName,
    isTagSelected,
    
    // UI updates
    renderSelectedTags,
    hideSuggestions
  };
})();


