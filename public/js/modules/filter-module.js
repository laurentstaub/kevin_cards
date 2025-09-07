// FilterModule - Tag filtering functionality
const FilterModule = (function() {

    // Private state
    let selectedTags = [];
    let isFilterActive = false;
    let questionData = null;

    // Private DOM elements
    let filterBtn, filterText, tagModal, closeModal, tagSearch, selectedTagsElement, tagCategories, resetFilters, applyFilters;

    // Private methods
    const initializeElements = function() {
        filterBtn = document.getElementById('filterBtn');
        filterText = document.getElementById('filterText');
        tagModal = document.getElementById('tagModal');
        closeModal = document.getElementById('closeModal');
        tagSearch = document.getElementById('tagSearch');
        selectedTagsElement = document.getElementById('selectedTags');
        tagCategories = document.getElementById('tagCategories');
        resetFilters = document.getElementById('resetFilters');
        applyFilters = document.getElementById('applyFilters');
    };

    const updateFilterButton = function() {
        if (filterBtn && filterText) {
            if (selectedTags.length > 0) {
                filterBtn.classList.add('active');
                filterText.textContent = `Filtrer (${selectedTags.length})`;
            } else {
                filterBtn.classList.remove('active');
                filterText.textContent = 'Filtrer';
            }
        }
    };

    const updateSelectedTagsDisplay = function() {
        if (!selectedTagsElement) return;
        
        if (selectedTags.length === 0) {
            selectedTagsElement.innerHTML = '<span class="selected-count">Aucun tag sélectionné</span>';
        } else {
            const tagList = selectedTags.map(tag => `
                <span class="selected-tag">
                    ${tag}
                    <button class="remove-tag" data-tag="${tag}">×</button>
                </span>
            `).join('');
            
            selectedTagsElement.innerHTML = `
                <span class="selected-count">${selectedTags.length} tag${selectedTags.length > 1 ? 's' : ''} sélectionné${selectedTags.length > 1 ? 's' : ''}</span>
                <div class="selected-tag-list">${tagList}</div>
            `;
        }
        
        updateQuestionCountDisplay();
    };

    const updateQuestionCountDisplay = function() {
        const stickyCountElement = document.getElementById('stickyQuestionCount');
        if (!stickyCountElement || !window.flashcardApp || !window.flashcardApp.getAllQuestions) return;
        
        const allFlashcards = window.flashcardApp.getAllQuestions();
        let availableCount, selectedCount = 10; // Default selected count
        
        // Get the selected count from the active count button
        const activeCountBtn = document.querySelector('.count-btn.active');
        if (activeCountBtn) {
            const count = activeCountBtn.dataset.count;
            selectedCount = count === 'all' ? 'toutes les' : parseInt(count);
        }
        
        if (selectedTags.length === 0) {
            // No tags selected - show total questions vs selected
            availableCount = allFlashcards.length;
            if (typeof selectedCount === 'number') {
                stickyCountElement.textContent = `${Math.min(selectedCount, availableCount)} questions sélectionnées sur ${availableCount} disponibles`;
            } else {
                stickyCountElement.textContent = `${selectedCount} questions sélectionnées sur ${availableCount} disponibles`;
            }
        } else {
            // Calculate questions matching selected tags (OR operation)
            const filteredCards = allFlashcards.filter(card => 
                selectedTags.some(tag => card.tags && card.tags.includes(tag))
            );
            availableCount = filteredCards.length;
            
            if (availableCount === 0) {
                stickyCountElement.textContent = 'Aucune question trouvée avec ces tags';
            } else {
                if (typeof selectedCount === 'number') {
                    stickyCountElement.textContent = `${Math.min(selectedCount, availableCount)} questions sélectionnées sur ${availableCount} disponibles`;
                } else {
                    stickyCountElement.textContent = `${selectedCount} questions sélectionnées sur ${availableCount} disponibles`;
                }
            }
        }
    };

    const populateTagCategories = function() {
        if (!tagCategories || !questionData) return;
        
        const categories = questionData.metadata.tag_categories;
        const categoryLabels = {
            'families': 'Familles principales',
            'sub_families': 'Sous-familles',
            'concepts': 'Concepts',
            'clinical_priority': 'Priorité clinique',
            'special_populations': 'Populations spéciales',
            'toxicity': 'Toxicité',
            'monitoring': 'Surveillance',
            'level': 'Niveau',
            'specialized': 'Spécialisé'
        };
        
        tagCategories.innerHTML = '';
        
        for (const [categoryKey, tags] of Object.entries(categories)) {
            const categoryDiv = document.createElement('div');
            categoryDiv.className = 'tag-category';
            
            const categoryLabel = categoryLabels[categoryKey] || categoryKey;
            
            categoryDiv.innerHTML = `
                <div class="category-header">${categoryLabel}</div>
                <div class="category-tags">
                    ${tags.map(tag => `
                        <label class="tag-checkbox">
                            <input type="checkbox" value="${tag}" ${selectedTags.includes(tag) ? 'checked' : ''}>
                            <span class="tag-checkbox-label">${tag}</span>
                        </label>
                    `).join('')}
                </div>
            `;
            
            tagCategories.appendChild(categoryDiv);
        }
        
        updateSelectedTagsDisplay();
    };

    const handleTagSearch = function(query) {
        if (!tagCategories) return;
        
        const checkboxes = tagCategories.querySelectorAll('.tag-checkbox');
        checkboxes.forEach(checkbox => {
            const label = checkbox.querySelector('.tag-checkbox-label');
            const text = label.textContent.toLowerCase();
            const matches = text.includes(query.toLowerCase());
            checkbox.style.display = matches ? 'block' : 'none';
        });
    };

    // Public API
    return {
        // Initialize the module
        init: function() {
            initializeElements();
            this.setupEventListeners();
        },

        // Setup event listeners
        setupEventListeners: function() {
            if (filterBtn) {
                filterBtn.addEventListener('click', this.showModal);
            }
            
            if (closeModal) {
                closeModal.addEventListener('click', this.hideModal);
            }
            
            if (tagModal) {
                tagModal.addEventListener('click', (e) => {
                    if (e.target === tagModal) {
                        this.hideModal();
                    }
                });
            }
            
            if (tagSearch) {
                tagSearch.addEventListener('input', (e) => {
                    handleTagSearch(e.target.value);
                });
            }
            
            if (resetFilters) {
                resetFilters.addEventListener('click', this.resetFilters);
            }
            
            if (applyFilters) {
                applyFilters.addEventListener('click', this.applyFilters);
            }

            // Event delegation for dynamic elements
            document.addEventListener('click', (e) => {
                // Handle tag checkbox changes
                if (e.target.matches('.tag-checkbox input')) {
                    const tag = e.target.value;
                    const isSelected = e.target.checked;
                    this.toggleTag(tag, isSelected);
                }
                
                // Handle remove tag buttons
                if (e.target.matches('.remove-tag')) {
                    const tag = e.target.dataset.tag;
                    this.removeTag(tag);
                }
            });
        },

        // Set question data
        setQuestionData: function(data) {
            questionData = data;
        },

        // Show filter modal
        showModal: function() {
            if (tagModal && questionData) {
                populateTagCategories();
                tagModal.classList.add('active');
                document.body.style.overflow = 'hidden';
            }
        },

        // Hide filter modal
        hideModal: function() {
            if (tagModal) {
                tagModal.classList.remove('active');
                document.body.style.overflow = '';
            }
        },

        // Toggle tag selection
        toggleTag: function(tag, isSelected) {
            if (isSelected && !selectedTags.includes(tag)) {
                selectedTags.push(tag);
            } else if (!isSelected) {
                selectedTags = selectedTags.filter(t => t !== tag);
            }
            updateSelectedTagsDisplay();
        },

        // Remove a specific tag
        removeTag: function(tag) {
            selectedTags = selectedTags.filter(t => t !== tag);
            
            // Update checkbox state
            if (tagCategories) {
                const checkbox = tagCategories.querySelector(`input[value="${tag}"]`);
                if (checkbox) {
                    checkbox.checked = false;
                }
            }
            
            updateSelectedTagsDisplay();
        },

        // Reset all filters
        resetFilters: function() {
            selectedTags = [];
            
            // Uncheck all checkboxes
            if (tagCategories) {
                const checkboxes = tagCategories.querySelectorAll('input[type="checkbox"]');
                checkboxes.forEach(checkbox => {
                    checkbox.checked = false;
                });
            }
            
            updateSelectedTagsDisplay();
        },

        // Apply current filters
        applyFilters: function() {
            this.hideModal();
            
            if (!window.flashcardApp || !window.flashcardApp.getAllQuestions) return;
            
            const allFlashcards = window.flashcardApp.getAllQuestions();
            let filteredCards;

            if (selectedTags.length === 0) {
                // No filters, use random selection from all cards
                filteredCards = UIHelpers.getRandomItems(allFlashcards, 10);
                isFilterActive = false;
            } else {
                // Filter cards by selected tags
                const matchingCards = allFlashcards.filter(card => 
                    selectedTags.some(tag => card.tags.includes(tag))
                );
                
                // Use filtered cards, up to 10 random ones
                const count = Math.min(matchingCards.length, 10);
                filteredCards = UIHelpers.getRandomItems(matchingCards, count);
                isFilterActive = true;
            }
            
            updateFilterButton();
            
            // Load filtered cards into flashcard module
            if (window.FlashcardModule) {
                window.FlashcardModule.loadFlashcards(filteredCards);
            }
        },

        // Get current filter state
        getSelectedTags: function() {
            return [...selectedTags];
        },

        isActive: function() {
            return isFilterActive;
        },

        // Update question count display (called externally)
        updateQuestionCount: function() {
            updateQuestionCountDisplay();
        }
    };

})();