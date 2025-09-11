// RevisionModule - Manages the revision session for weak cards (ES6 Module)
'use strict';

import * as UIHelpers from './ui-helpers.js';
import * as FlashcardModule from './flashcard-module.js';
import * as StatsModule from './stats-module.js';

// Private state
let revisionCards = [];
let selectedRevisionCards = [];

// Private DOM elements
let revisionModal, closeRevisionModal, revisionCardsList, revisionCardsContainer, cancelRevision, startRevision;

// Private methods
const initializeElements = function() {
    revisionModal = document.getElementById('revisionModal');
    closeRevisionModal = document.getElementById('closeRevisionModal');
    revisionCardsList = document.getElementById('revisionCardsList');
    revisionCardsContainer = document.getElementById('revisionCardsContainer');
    cancelRevision = document.getElementById('cancelRevision');
    startRevision = document.getElementById('startRevision');
};

const setupEventListeners = function() {
    if (closeRevisionModal) {
        closeRevisionModal.addEventListener('click', hideModal);
    }
    if (cancelRevision) {
        cancelRevision.addEventListener('click', hideModal);
    }
    if (startRevision) {
        startRevision.addEventListener('click', startRevisionSession);
    }
    if (revisionModal) {
        revisionModal.addEventListener('click', (e) => {
            if (e.target === revisionModal) {
                hideModal();
            }
        });
    }

    // Event delegation for dynamic elements
    document.addEventListener('change', (e) => {
        if (e.target.matches('input[name="revisionMode"]')) {
            handleRevisionModeChange();
        }
    });
    
    document.addEventListener('click', (e) => {
        if (e.target.matches('.revision-card-checkbox')) {
            const cardId = e.target.dataset.cardId;
            const isSelected = e.target.checked;
            handleRevisionCardSelection(cardId, isSelected);
        }
    });
};

const loadRevisionCards = function() {
    if (!window.ProgressTracker) return;

    const allCards = window.flashcardApp.getAllQuestions();
    const weakCards = window.ProgressTracker.getWeakAreas(50);

    revisionCards = weakCards.map(weakCard => {
        const card = allCards.find(c => c.id === parseInt(weakCard.id));
        if (card) {
            return {
                ...card,
                accuracy: weakCard.accuracy || 0,
                attempts: weakCard.attempts || 0,
            };
        }
        return null;
    }).filter(Boolean);

    revisionCards.sort((a, b) => a.accuracy - b.accuracy);
    updateRevisionModeDescriptions();
    handleRevisionModeChange();
};

const updateRevisionModeDescriptions = function() {
    const allModeLabel = document.querySelector('input[value="all"] + .revision-mode-label small');
    const priorityModeLabel = document.querySelector('input[value="priority"] + .revision-mode-label small');

    if (allModeLabel) {
        allModeLabel.textContent = `Toutes les ${revisionCards.length} cartes faibles`;
    }
    if (priorityModeLabel) {
        const priorityCount = Math.min(revisionCards.length, 10);
        priorityModeLabel.textContent = `Les ${priorityCount} cartes avec le plus faible taux`;
    }
};

const handleRevisionModeChange = function() {
    const selectedMode = document.querySelector('input[name="revisionMode"]:checked')?.value || 'all';
    if (selectedMode === 'custom') {
        revisionCardsList.style.display = 'block';
        populateRevisionCardsList();
    } else {
        revisionCardsList.style.display = 'none';
    }
};

const populateRevisionCardsList = function() {
    if (!revisionCardsContainer) return;
    revisionCardsContainer.innerHTML = revisionCards.map(card => {
        const preview = UIHelpers.extractTextFromHtml(card.question);
        const accuracyClass = card.accuracy < 30 ? 'low' : card.accuracy < 70 ? 'medium' : 'high';
        return `
            <div class="revision-card-item">
                <input type="checkbox" class="revision-card-checkbox" data-card-id="${card.id}" checked>
                <div class="revision-card-info">
                    <div class="revision-card-preview">${preview}</div>
                    <div class="revision-card-stats">
                        <span class="revision-card-accuracy ${accuracyClass}">
                            ${card.accuracy.toFixed(1)}% de réussite
                        </span>
                        <span>${card.attempts} essais</span>
                        <span>${card.tags.join(', ')}</span>
                    </div>
                </div>
            </div>
        `;
    }).join('');
    selectedRevisionCards = [...revisionCards];
};

const handleRevisionCardSelection = function(cardId, isSelected) {
    const card = revisionCards.find(c => c.id === parseInt(cardId));
    if (!card) return;

    if (isSelected && !selectedRevisionCards.find(c => c.id === card.id)) {
        selectedRevisionCards.push(card);
    } else if (!isSelected) {
        selectedRevisionCards = selectedRevisionCards.filter(c => c.id !== card.id);
    }
};

const startRevisionSession = function() {
    const selectedMode = document.querySelector('input[name="revisionMode"]:checked')?.value || 'all';
    let cardsToStudy = [];

    switch (selectedMode) {
        case 'all':
            cardsToStudy = [...revisionCards];
            break;
        case 'priority':
            cardsToStudy = revisionCards.sort((a, b) => a.accuracy - b.accuracy).slice(0, 10);
            break;
        case 'custom':
            cardsToStudy = [...selectedRevisionCards];
            break;
    }

    if (cardsToStudy.length === 0) {
        alert('Aucune carte sélectionnée pour la révision.');
        return;
    }

    hideModal();
    StatsModule.hideModal(); // Also hide the stats modal
    FlashcardModule.loadFlashcards(cardsToStudy);
    
    // Switch to the study view
    if (window.flashcardApp && window.flashcardApp.showStudyInterface) {
        window.flashcardApp.showStudyInterface();
    }
};

// Public API
export function init() {
    initializeElements();
    setupEventListeners();
}

export function showModal() {
    if (revisionModal && window.ProgressTracker) {
        loadRevisionCards();
        revisionModal.classList.add('active');
        document.body.style.overflow = 'hidden';
    }
}

export function hideModal() {
    if (revisionModal) {
        revisionModal.classList.remove('active');
        document.body.style.overflow = '';
        selectedRevisionCards = [];
        revisionCards = [];
    }
}
