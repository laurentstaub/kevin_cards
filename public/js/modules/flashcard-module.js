// FlashcardModule - Core flashcard functionality
const FlashcardModule = (function() {

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

    // Show session completion actions when we finish all cards
    const sessionCompleteActions = document.getElementById('sessionCompleteActions');
    if (sessionCompleteActions) {
      sessionCompleteActions.style.display = isAfterLastCard ? 'flex' : 'none';
    }

    // Hide the main action buttons when session is complete
    if (isAfterLastCard) {
      if (notKnownBtn) notKnownBtn.style.display = 'none';
      if (recalledBtn) recalledBtn.style.display = 'flex'; // Should be 'none' if both are hidden
    } else {
      if (notKnownBtn) notKnownBtn.style.display = 'flex';
      if (recalledBtn) recalledBtn.style.display = 'flex';
    }
  };

  const renderCardContent = function(card, isQuestion = true) {
    const tags = card.tags || [];
    const tagsHtml = UIHelpers.renderTagsHtml(tags);
    const sourceHtml = UIHelpers.renderSourceHtml(card.source);

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

  // Public API
  const publicAPI = {
    // Initialize the module
    init: function() {
      initializeElements();
      this.setupEventListeners();
    },

    // Setup event listeners
    setupEventListeners: function() {
      // Flashcard click to flip
      if (flashcardElement) {
        flashcardElement.addEventListener('click', this.flipCard);
      }

      // Action buttons
      if (notKnownBtn) {
        notKnownBtn.addEventListener('click', () => this.nextCard(false));
      }

      if (recalledBtn) {
        recalledBtn.addEventListener('click', () => this.nextCard(true));
      }
    },

    // Load flashcards
    loadFlashcards: function(cards) {
      flashcards = [...cards];
      currentCardIndex = 0;
      isFlipped = false;
      recalledCount = 0;

      this.initFlashcards();
    },

    // Initialize flashcard session
    initFlashcards: function() {
      updateDisplay();

      // Start a new study session
      if (window.ProgressTracker) {
        window.ProgressTracker.startSession();
      }

      this.showCard(currentCardIndex);
      updateButtonStates();
    },

    // Show a specific card
    showCard: function(index) {
      const card = flashcards[index];

      // Safety check
      if (!card) {
        console.error('No card found at index', index);
        return;
      }

      // Reset flip state for new card
      isFlipped = false;
      if (flashcardElement) {
        flashcardElement.classList.remove('flipped');
      }

      // Render question and answer content
      if (questionElement) {
        // IMPORTANT: Ensure card.questionHtml and card.answerHtml are used here
        // as per previous discussion, the data processed by ApiClient should provide these.
        questionElement.innerHTML = renderCardContent(card, true);
      }

      if (answerElement) {
        answerElement.innerHTML = renderCardContent(card, false);
      }

      updateDisplay();
    },

    // Flip the current card
    flipCard: function() {
      isFlipped = !isFlipped;
      if (flashcardElement) {
        flashcardElement.classList.toggle('flipped', isFlipped);
      }
    },

    // Move to next card
    nextCard: function(isRecalled) {
      if (currentCardIndex < flashcards.length - 1) {
        // Record the card attempt in progress tracker
        const currentCard = flashcards[currentCardIndex];
        if (window.ProgressTracker && currentCard.id) {
          window.ProgressTracker.recordCardAttempt(
            currentCard.id,
            isRecalled,
            currentCard.tags || []
          );
        }

        if (isRecalled) {
          recalledCount++;
        }

        currentCardIndex++;
        this.showCard(currentCardIndex);
        updateButtonStates();
      } else {
        // Last card - record it and end session
        const currentCard = flashcards[currentCardIndex];
        if (window.ProgressTracker && currentCard.id) {
          window.ProgressTracker.recordCardAttempt(
            currentCard.id,
            isRecalled,
            currentCard.tags || []
          );
        }

        if (isRecalled) {
          recalledCount++;
        }

        // Increment index to indicate we're past the last card
        currentCardIndex++;

        // End the study session
        if (window.ProgressTracker) {
          const sessionData = window.ProgressTracker.endSession();
          if (sessionData) {
            this.showSessionSummary(sessionData);
          }
        }

        updateButtonStates();
        updateDisplay();
      }
    },

    // Show session summary
    showSessionSummary: function(sessionData) {
      // This will be expanded with a modal in the UI update
      console.log('Session Summary:', {
        duration: `${Math.floor(sessionData.duration / 60)}m ${sessionData.duration % 60}s`,
        cardsStudied: sessionData.cardsStudied,
        accuracy: `${sessionData.accuracy.toFixed(1)}%`,
        correct: sessionData.correctAnswers,
        incorrect: sessionData.incorrectAnswers
      });
    },

    // Reset the current session
    reset: function() {
      currentCardIndex = 0;
      isFlipped = false;
      recalledCount = 0;

      if (window.ProgressTracker && window.ProgressTracker.currentSession) {
        window.ProgressTracker.endSession();
      }

      this.initFlashcards();
    },

    // Getters for external modules
    getCurrentCard: function() {
      return flashcards[currentCardIndex] || null;
    },

    getFlashcards: function() {
      return [...flashcards];
    },

    getProgress: function() {
      return {
        currentIndex: currentCardIndex,
        total: flashcards.length,
        recalled: recalledCount,
        isFlipped: isFlipped
      };
    },

    // Repeat same questions
    repeatSameQuestions: function() {
      currentCardIndex = 0;
      recalledCount = 0;
      isFlipped = false;

      // End current session if active
      if (window.ProgressTracker && window.ProgressTracker.currentSession) {
        window.ProgressTracker.endSession();
      }

      // Start new progress session
      if (window.ProgressTracker) {
        window.ProgressTracker.startSession();
      }

      this.initFlashcards();
    }
  };

  return publicAPI;

})();

// Expose FlashcardModule globally
if (typeof window !== 'undefined') {
  window.FlashcardModule = FlashcardModule;
}
