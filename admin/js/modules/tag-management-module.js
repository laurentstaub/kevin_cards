// TagManagementModule - Tag list view and inline editing
const TagManagementModule = (function() {
  
  // Private state
  let allTags = [];
  
  // Private rendering functions
  const renderTags = function(tags) {
    const list = document.getElementById('tags-list');
    const itemTemplate = document.getElementById('tag-list-item-template');
    
    list.innerHTML = '';
    
    if (tags.length === 0) {
      list.innerHTML = '<div class="loading"><i class="fas fa-info-circle"></i>Aucun tag trouvé</div>';
      return;
    }

    const sortedTags = sortTagsByCurrentCriteria(tags);

    sortedTags.forEach(tag => {
      const item = itemTemplate.content.cloneNode(true);
      const itemElement = item.querySelector('.tag-list-item');
      
      item.querySelector('.tag-name').textContent = tag.name;
      item.querySelector('.usage-count').textContent = tag.usageCount;
      
      // Set up inline editing
      setupInlineEditing(itemElement, tag);
      
      list.appendChild(item);
    });
  };

  const sortTagsByCurrentCriteria = function(tags) {
    const sortBy = document.getElementById('tags-sort')?.value || 'usage';
    
    switch (sortBy) {
      case 'name':
        return [...tags].sort((a, b) => a.name.localeCompare(b.name));
      case 'date':
        return [...tags].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
      case 'usage':
      default:
        return [...tags].sort((a, b) => b.usageCount - a.usageCount);
    }
  };

  const setupInlineEditing = function(itemElement, tag) {
    const nameSpan = itemElement.querySelector('.tag-name');
    const nameInput = itemElement.querySelector('.tag-name-input');
    const editBtn = itemElement.querySelector('.btn-edit-tag');
    const saveBtn = itemElement.querySelector('.btn-save-tag');
    const cancelBtn = itemElement.querySelector('.btn-cancel-tag');
    
    let originalName = tag.name;
    
    // Edit button click
    editBtn.addEventListener('click', () => {
      nameSpan.style.display = 'none';
      nameInput.style.display = 'block';
      nameInput.value = tag.name;
      nameInput.focus();
      nameInput.select();
      
      editBtn.style.display = 'none';
      saveBtn.style.display = 'inline-block';
      cancelBtn.style.display = 'inline-block';
    });
    
    // Cancel button click
    cancelBtn.addEventListener('click', () => {
      cancelEdit(nameSpan, nameInput, editBtn, saveBtn, cancelBtn);
    });
    
    // Save button click
    saveBtn.addEventListener('click', () => {
      saveTagName(tag.id, nameInput.value.trim(), nameSpan, nameInput, editBtn, saveBtn, cancelBtn, originalName);
    });
    
    // Enter key to save
    nameInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        saveTagName(tag.id, nameInput.value.trim(), nameSpan, nameInput, editBtn, saveBtn, cancelBtn, originalName);
      } else if (e.key === 'Escape') {
        cancelEdit(nameSpan, nameInput, editBtn, saveBtn, cancelBtn);
      }
    });
    
    // Click outside to save
    nameInput.addEventListener('blur', () => {
      if (nameInput.style.display === 'block') {
        saveTagName(tag.id, nameInput.value.trim(), nameSpan, nameInput, editBtn, saveBtn, cancelBtn, originalName);
      }
    });
  };

  const cancelEdit = function(nameSpan, nameInput, editBtn, saveBtn, cancelBtn) {
    nameSpan.style.display = 'block';
    nameInput.style.display = 'none';
    editBtn.style.display = 'inline-block';
    saveBtn.style.display = 'none';
    cancelBtn.style.display = 'none';
  };

  const saveTagName = async function(tagId, newName, nameSpan, nameInput, editBtn, saveBtn, cancelBtn, originalName) {
    if (!newName) {
      UIHelpers.toast('Le nom du tag ne peut pas être vide', 'error');
      nameInput.focus();
      return;
    }
    
    if (newName === originalName) {
      cancelEdit(nameSpan, nameInput, editBtn, saveBtn, cancelBtn);
      return;
    }
    
    try {
      await ApiClient.tags.update(tagId, { name: newName });
      
      // Update UI
      nameSpan.textContent = newName;
      cancelEdit(nameSpan, nameInput, editBtn, saveBtn, cancelBtn);
      
      // Update in local tags list
      const index = allTags.findIndex(t => t.id === tagId);
      if (index !== -1) {
        allTags[index].name = newName;
      }
      
      // Update in TagModule
      TagModule.updateTagInLists(tagId, { name: newName });
      
      UIHelpers.toast('Tag modifié avec succès', 'success');
      
    } catch (error) {
      console.error('Save error:', error);
      UIHelpers.toast(error.message || 'Erreur lors de la sauvegarde', 'error');
      nameInput.focus();
    }
  };

  // Public functions
  const loadTags = async function() {
    const list = document.getElementById('tags-list');
    list.innerHTML = '<div class="loading"><i class="fas fa-spinner fa-spin"></i>Chargement des tags...</div>';

    try {
      const response = await ApiClient.tags.getAll();
      allTags = response.tags || [];
      renderTags(allTags);
    } catch (error) {
      console.error('Failed to load tags:', error);
      list.innerHTML = '<div class="loading"><i class="fas fa-exclamation-triangle"></i>Erreur lors du chargement</div>';
    }
  };
  
  const filterTags = function() {
    if (!allTags || allTags.length === 0) {
      loadTags();
      return;
    }
    
    const searchTerm = document.getElementById('search-tags')?.value.toLowerCase() || '';
    
    let filteredTags = allTags;
    
    if (searchTerm) {
      filteredTags = filteredTags.filter(tag => 
        tag.name.toLowerCase().includes(searchTerm) ||
        (tag.description && tag.description.toLowerCase().includes(searchTerm))
      );
    }
    
    renderTags(filteredTags);
  };

  const sortTags = function() {
    if (allTags && allTags.length > 0) {
      filterTags();
    }
  };

  const refreshTags = function() {
    loadTags();
  };

  const addTag = function(tag) {
    if (tag && !allTags.find(t => t.id === tag.id)) {
      allTags.push(tag);
      // Re-render if currently showing tags
      if (ViewManager && ViewManager.getCurrentView() === 'tags') {
        filterTags();
      }
    }
  };

  const updateTag = function(tagId, updatedData) {
    const index = allTags.findIndex(t => t.id === tagId);
    if (index !== -1) {
      Object.assign(allTags[index], updatedData);
      // Re-render if currently showing tags
      if (ViewManager && ViewManager.getCurrentView() === 'tags') {
        filterTags();
      }
    }
  };

  const removeTag = function(tagId) {
    const index = allTags.findIndex(t => t.id === tagId);
    if (index !== -1) {
      allTags.splice(index, 1);
      // Re-render if currently showing tags
      if (ViewManager && ViewManager.getCurrentView() === 'tags') {
        filterTags();
      }
      return true;
    }
    return false;
  };

  // Public API
  return {
    // Core functions
    loadTags,
    filterTags,
    sortTags,
    refreshTags,
    
    // Tag management
    addTag,
    updateTag,
    removeTag,
    
    // Data access
    getAllTags: () => [...allTags],
    getTagById: (id) => allTags.find(t => t.id === id),
    
    // Rendering (for advanced usage)
    renderTags
  };
})();

