// FilterModule - Tag filtering functionality (ES6 Module)
'use strict';

import { getRandomItems } from './ui-helpers.js';
import * as FlashcardModule from './flashcard-module.js';

// Private state
let selectedTags = [];
let isFilterActive = false;
let questionData = null;

// Private DOM elements
let filterBtn, filterText, tagModal, closeModal, tagSearch, selectedTagsElement, tagCategories, resetFiltersBtn, applyFiltersBtn;

// Private methods
const initializeElements = function() {
    filterBtn = document.getElementById('filterBtn');
    filterText = document.getElementById('filterText');
    tagModal = document.getElementById('tagModal');
    closeModal = document.getElementById('closeModal');
    tagSearch = document.getElementById('tagSearch');
    selectedTagsElement = document.getElementById('selectedTags');
    tagCategories = document.getElementById('tagCategories');
    resetFiltersBtn = document.getElementById('resetFilters');
    applyFiltersBtn = document.getElementById('applyFilters');
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
    let availableCount, selectedCount = 10;
    
    const activeCountBtn = document.querySelector('.count-btn.active');
    if (activeCountBtn) {
        const count = activeCountBtn.dataset.count;
        selectedCount = count === 'all' ? 'toutes les' : parseInt(count);
    }
    
    if (selectedTags.length === 0) {
        availableCount = allFlashcards.length;
        if (typeof selectedCount === 'number') {
            stickyCountElement.textContent = `${Math.min(selectedCount, availableCount)} questions sélectionnées sur ${availableCount} disponibles`;
        } else {
            stickyCountElement.textContent = `${selectedCount} questions sélectionnées sur ${availableCount} disponibles`;
        }
    } else {
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

const setupEventListeners = function() {
    if (filterBtn) {
        filterBtn.addEventListener('click', showModal);
    }
    
    if (closeModal) {
        closeModal.addEventListener('click', hideModal);
    }
    
    if (tagModal) {
        tagModal.addEventListener('click', (e) => {
            if (e.target === tagModal) {
                hideModal();
            }
        });
    }
    
    if (tagSearch) {
        tagSearch.addEventListener('input', (e) => {
            handleTagSearch(e.target.value);
        });
    }
    
    if (resetFiltersBtn) {
        resetFiltersBtn.addEventListener('click', resetFilters);
    }
    
    if (applyFiltersBtn) {
        applyFiltersBtn.addEventListener('click', applyFilters);
    }

    document.addEventListener('click', (e) => {
        if (e.target.matches('.tag-checkbox input')) {
            toggleTag(e.target.value, e.target.checked);
        }
        
        if (e.target.matches('.remove-tag')) {
            removeTag(e.target.dataset.tag);
        }
    });
};

// Public API
export function init() {
    initializeElements();
    setupEventListeners();
}

export function setQuestionData(data) {
    questionData = data;
}

export function showModal() {
    if (tagModal && questionData) {
        populateTagCategories();
        tagModal.classList.add('active');
        document.body.style.overflow = 'hidden';
    }
}

export function hideModal() {
    if (tagModal) {
        tagModal.classList.remove('active');
        document.body.style.overflow = '';
    }
}

export function toggleTag(tag, isSelected) {
    if (isSelected && !selectedTags.includes(tag)) {
        selectedTags.push(tag);
    } else if (!isSelected) {
        selectedTags = selectedTags.filter(t => t !== tag);
    }
    updateSelectedTagsDisplay();
}

export function removeTag(tag) {
    selectedTags = selectedTags.filter(t => t !== tag);
    
    if (tagCategories) {
        const checkbox = tagCategories.querySelector(`input[value="${tag}"]`);
        if (checkbox) checkbox.checked = false;
    }
    
    updateSelectedTagsDisplay();
}

export function resetFilters() {
    selectedTags = [];
    
    if (tagCategories) {
        const checkboxes = tagCategories.querySelectorAll('input[type="checkbox"]');
        checkboxes.forEach(checkbox => checkbox.checked = false);
    }
    
    updateSelectedTagsDisplay();
}

export function applyFilters() {
    hideModal();
    
    if (!window.flashcardApp || !window.flashcardApp.getAllQuestions) return;
    
    const allFlashcards = window.flashcardApp.getAllQuestions();
    let filteredCards;

    if (selectedTags.length === 0) {
        filteredCards = getRandomItems(allFlashcards, 10);
        isFilterActive = false;
    } else {
        const matchingCards = allFlashcards.filter(card => 
            selectedTags.some(tag => card.tags.includes(tag))
        );
        const count = Math.min(matchingCards.length, 10);
        filteredCards = getRandomItems(matchingCards, count);
        isFilterActive = true;
    }
    
    updateFilterButton();
    
    FlashcardModule.loadFlashcards(filteredCards);
}

export function getSelectedTags() {
    return [...selectedTags];
}

export function isActive() {
    return isFilterActive;
}

export function updateQuestionCount() {
    updateQuestionCountDisplay();
}