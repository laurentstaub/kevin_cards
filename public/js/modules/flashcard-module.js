// FlashcardModule - Core flashcard functionality (ES6 Module)
'use strict';

import { renderTagsHtml, renderSourceHtml } from './ui-helpers.js';

// Private state
let flashcards = [];
let currentCardIndex = 0;
let isFlipped = false;
let recalledCount = 0;

// Private DOM elements
let flashcardElement, questionElement, answerElement;
let notKnownBtn, recalledBtn, currentCardElement, totalCardsElement, recalledCountElement;

// Private methods
const initializeElements = function() {
  flashcardElement = document.getElementById('flashcard');
  questionElement = document.getElementById('question');
  answerElement = document.getElementById('answer');
  notKnownBtn = document.getElementById('notKnownBtn');
  recalledBtn = document.getElementById('recalledBtn');
  currentCardElement = document.getElementById('currentCard');
  totalCardsElement = document.getElementById('totalCards');
  recalledCountElement = document.getElementById('recalledCount');
};

const updateDisplay = function() {
  if (totalCardsElement) totalCardsElement.textContent = String(flashcards.length);
  if (recalledCountElement) recalledCountElement.textContent = String(recalledCount);
  if (currentCardElement) currentCardElement.textContent = currentCardIndex + 1;
};

const updateButtonStates = function() {
  const isAfterLastCard = currentCardIndex >= flashcards.length;

  if (notKnownBtn) notKnownBtn.disabled = isAfterLastCard;
  if (recalledBtn) recalledBtn.disabled = isAfterLastCard;

  const sessionCompleteActions = document.getElementById('sessionCompleteActions');
  if (sessionCompleteActions) {
    sessionCompleteActions.style.display = isAfterLastCard ? 'flex' : 'none';
  }

  if (isAfterLastCard) {
    if (notKnownBtn) notKnownBtn.style.display = 'none';
    if (recalledBtn) recalledBtn.style.display = 'none';
  } else {
    if (notKnownBtn) notKnownBtn.style.display = 'flex';
    if (recalledBtn) recalledBtn.style.display = 'flex';
  }
};

const renderCardContent = function(card, isQuestion = true) {
  const tags = card.tags || [];
  const tagsHtml = renderTagsHtml(tags);
  const sourceHtml = renderSourceHtml(card.source);

  const indicator = isQuestion ? 'Question' : 'Réponse';
  const content = isQuestion ? (card.question || 'Question non disponible') : (card.answer || 'Réponse non disponible');

  return `
          <div class="card-header">
              <div class="${isQuestion ? 'question' : 'answer'}-indicator">${indicator}</div>
              <div class="tags-container">
                  ${tagsHtml}
              </div>
          </div>
          ${content}
          <div class="card-source">
              <span class="source-label">Source:</span> <span class="source-text">${sourceHtml}</span>
          </div>`;
};

const setupEventListeners = function() {
  if (flashcardElement) {
    flashcardElement.addEventListener('click', flipCard);
  }

  if (notKnownBtn) {
    notKnownBtn.addEventListener('click', () => nextCard(false));
  }

  if (recalledBtn) {
    recalledBtn.addEventListener('click', () => nextCard(true));
  }
};

// Public API
export function init() {
  initializeElements();
  setupEventListeners();
}

export function loadFlashcards(cards) {
  flashcards = [...cards];
  currentCardIndex = 0;
  isFlipped = false;
  recalledCount = 0;
  initFlashcards();
}

export function initFlashcards() {
  updateDisplay();
  if (window.ProgressTracker) {
    window.ProgressTracker.startSession();
  }
  showCard(currentCardIndex);
  updateButtonStates();
}

export function showCard(index) {
  const card = flashcards[index];
  if (!card) {
    console.error('No card found at index', index);
    return;
  }

  isFlipped = false;
  if (flashcardElement) {
    flashcardElement.classList.remove('flipped');
  }

  if (questionElement) {
    questionElement.innerHTML = renderCardContent(card, true);
  }

  if (answerElement) {
    answerElement.innerHTML = renderCardContent(card, false);
  }

  updateDisplay();
}

export function flipCard() {
  isFlipped = !isFlipped;
  if (flashcardElement) {
    flashcardElement.classList.toggle('flipped', isFlipped);
  }
}

export function nextCard(isRecalled) {
  const currentCard = flashcards[currentCardIndex];
  if (window.ProgressTracker && currentCard && currentCard.id) {
    window.ProgressTracker.recordCardAttempt(
      currentCard.id,
      isRecalled,
      currentCard.tags || []
    );
  }

  if (isRecalled) {
    recalledCount++;
  }

  if (currentCardIndex < flashcards.length - 1) {
    currentCardIndex++;
    showCard(currentCardIndex);
  } else {
    currentCardIndex++;
    if (window.ProgressTracker) {
      const sessionData = window.ProgressTracker.endSession();
      if (sessionData) {
        showSessionSummary(sessionData);
      }
    }
  }
  updateButtonStates();
  updateDisplay();
}

export function showSessionSummary(sessionData) {
  console.log('Session Summary:', {
    duration: `${Math.floor(sessionData.duration / 60)}m ${sessionData.duration % 60}s`,
    cardsStudied: sessionData.cardsStudied,
    accuracy: `${sessionData.accuracy.toFixed(1)}%`,
    correct: sessionData.correctAnswers,
    incorrect: sessionData.incorrectAnswers
  });
}

export function reset() {
  currentCardIndex = 0;
  isFlipped = false;
  recalledCount = 0;
  if (window.ProgressTracker && window.ProgressTracker.currentSession) {
    window.ProgressTracker.endSession();
  }
  initFlashcards();
}

export function repeatSameQuestions() {
  currentCardIndex = 0;
  recalledCount = 0;
  isFlipped = false;
  if (window.ProgressTracker && window.ProgressTracker.currentSession) {
    window.ProgressTracker.endSession();
  }
  initFlashcards();
}

// Getters for external modules
export function getCurrentCard() {
  return flashcards[currentCardIndex] || null;
}

export function getFlashcards() {
  return [...flashcards];
}

export function getProgress() {
  return {
    currentIndex: currentCardIndex,
    total: flashcards.length,
    recalled: recalledCount,
    isFlipped: isFlipped
  };
}
