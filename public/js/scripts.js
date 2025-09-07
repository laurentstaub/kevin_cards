// FlashPharma Main Orchestrator - Modular Architecture
(function() {
  'use strict';

  // Private state - shared between modules via global objects
  let allFlashcards = [];
  let questionData = null;
  let currentSession = {
    questions: [],
    config: null
  };

  // DOM elements for orchestrator functions
  let resetBtn, menuToggle, sidebar, sidebarClose, sidebarOverlay, themeToggle;

  // Private initialization methods
  const initializeElements = function() {
    resetBtn = document.getElementById('resetBtn');
    menuToggle = document.getElementById('menuToggle');
    sidebar = document.getElementById('sidebar');
    sidebarClose = document.getElementById('sidebarClose');
    sidebarOverlay = document.getElementById('sidebarOverlay');
    themeToggle = document.getElementById('themeToggle');
  };

  const setupMainEventListeners = function() {
    // Reset button
    if (resetBtn) {
      resetBtn.addEventListener('click', resetGame);
    }

    // Theme toggle
    if (themeToggle) {
      themeToggle.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        UIHelpers.toggleTheme();
      });
    }

    // Sidebar functionality
    if (menuToggle) {
      menuToggle.addEventListener('click', showSidebar);
    }

    if (sidebarClose) {
      sidebarClose.addEventListener('click', hideSidebar);
    }

    if (sidebarOverlay) {
      sidebarOverlay.addEventListener('click', hideSidebar);
    }

    // Session completion event listeners
    const repeatSameBtn = document.getElementById('repeatSameBtn');
    const similarSessionBtn = document.getElementById('similarSessionBtn');
    const newSessionBtn = document.getElementById('newSessionBtn');

    if (repeatSameBtn) {
      repeatSameBtn.addEventListener('click', () => window.FlashcardModule.repeatSameQuestions());
    }

    if (similarSessionBtn) {
      similarSessionBtn.addEventListener('click', startSimilarSession);
    }

    if (newSessionBtn) {
      newSessionBtn.addEventListener('click', startNewSession);
    }
  };

  // Main orchestrator functions
  const loadQuestions = async function() {
    try {
      const result = await ApiClient.questions.loadPublished(1000);

      if (result.success) {
        questionData = {
          metadata: result.metadata,
          flashcards: result.flashcards
        };

        allFlashcards = ApiClient.processQuestionData(result);

        // Clean up progress data if needed
        if (window.ProgressTracker && allFlashcards.length > 0) {
          const currentCardIds = allFlashcards.map(card => card.id);
          window.ProgressTracker.cleanOrphanedProgress(currentCardIds);
        }

        // Pass question data to filter module
        if (window.FilterModule) {
          FilterModule.setQuestionData(questionData);
        }

        console.log(`Loaded ${allFlashcards.length} questions from database`);
      } else {
        console.error('Failed to load questions:', result.error);
        allFlashcards = [];
      }
    } catch (error) {
      console.error('Error loading questions:', error);
      allFlashcards = [];
    }
  };

  const loadCustomQuestions = function(questions) {
    if (window.FlashcardModule) {
      window.FlashcardModule.loadFlashcards(questions);
    }
  };

  const resetGame = function() {
    if (window.FlashcardModule) {
      window.FlashcardModule.reset();
    }
  };

  const startSimilarSession = async function() {
    if (!currentSession.config) {
      console.error('No session configuration found');
      alert('Impossible de créer une session similaire. Configuration manquante.');
      return;
    }

    try {
      // Build query parameters using stored session configuration
      const params = new URLSearchParams();

      if (currentSession.config.mode === 'focused' && currentSession.config.tags && currentSession.config.tags.length > 0) {
        params.set('tags', currentSession.config.tags.join(','));
      }

      if (currentSession.config.difficulty !== 'mixed') {
        params.set('difficulty', currentSession.config.difficulty);
      }

      params.set('limit', '1000');

      const result = await ApiClient.questions.loadWithParams(params);

      if (!result.success || result.questions.length === 0) {
        throw new Error('No questions found with similar criteria');
      }

      // Process questions
      const questions = ApiClient.processSessionQuestions(result);

      // Shuffle and select questions (same count as original session)
      const shuffledQuestions = UIHelpers.shuffleArray(questions);
      const selectedCount = currentSession.config.count === 'all' ?
        shuffledQuestions.length :
        Math.min(currentSession.config.count, shuffledQuestions.length);
      const selectedQuestions = shuffledQuestions.slice(0, selectedCount);

      // Update current session with new questions but keep same config
      currentSession.questions = selectedQuestions;

      if (window.FlashcardModule) {
        window.FlashcardModule.loadFlashcards(selectedQuestions);
      }

      console.log(`Started similar session with ${selectedQuestions.length} new questions`);

    } catch (error) {
      console.error('Failed to start similar session:', error);
      alert('Erreur lors du chargement de la session similaire. Veuillez réessayer.');
    }
  };

  const startNewSession = function() {
    // End current session if active
    if (window.ProgressTracker && window.ProgressTracker.currentSession) {
      window.ProgressTracker.endSession();
    }

    // Reset session state
    currentSession = {
      questions: [],
      config: null
    };

    // Hide study interface and show setup screen
    document.getElementById('studyInterface').style.display = 'none';
    document.getElementById('sessionSetup').style.display = 'flex';

    // Reset setup screen to initial state if sessionSetup is available
    if (window.SessionSetup) {
      window.SessionSetup.updateQuestionCount();
      window.SessionSetup.updatePreview();
    }
  };

  // Sidebar functions
  const showSidebar = function() {
    if (sidebar && sidebarOverlay) {
      sidebar.classList.add('active');
      sidebarOverlay.classList.add('active');
      document.body.style.overflow = 'hidden';
    }
  };

  const hideSidebar = function() {
    if (sidebar && sidebarOverlay) {
      sidebar.classList.remove('active');
      sidebarOverlay.classList.remove('active');
      document.body.style.overflow = '';
    }
  };

  // Module initialization and coordination
  const initializeApp = async function() { // Rendre la fonction asynchrone
    console.log('Initializing FlashPharma modular application...');

    // Initialize DOM elements
    initializeElements();

    // Initialize all modules in correct order
    if (window.UIHelpers) {
      UIHelpers.init();
      UIHelpers.initTheme();
    }

    if (window.FlashcardModule) {
      window.FlashcardModule.init();
    }

    if (window.FilterModule) {
      FilterModule.init();
    }

    if (window.StatsModule) {
      StatsModule.init();
    }

    setupMainEventListeners();

    // Charger les données initiales et attendre leur complétion
    await loadQuestions();

    // Maintenant que les questions sont chargées, initialiser l'affichage des flashcards.
    // Cela utilise la fonction resetQuestions qui sélectionne 10 cartes aléatoires.
    if (window.flashcardApp) {
      console.log('Calling flashcardApp.resetQuestions. flashcardApp:', window.flashcardApp); // NOUVEAU LOG
      window.flashcardApp.resetQuestions();
    } else {
      console.error('flashcardApp est indéfini lors de l\'appel à resetQuestions.'); // NOUVEAU LOG D'ERREUR
    }


    console.log('FlashPharma modular application initialized successfully');
  };

  // Create global flashcard app object for session setup to use
  window.flashcardApp = {
    loadCustomQuestions: loadCustomQuestions,
    getAllQuestions: () => allFlashcards,
    resetQuestions: () => {
      console.log('Entering resetQuestions...'); // LOG EXISTANT
      if (window.FlashcardModule) {
        const randomCards = UIHelpers.getRandomItems(allFlashcards, 10);
        console.log('Questions sélectionnées pour le FlashcardModule:', randomCards);
        window.FlashcardModule.loadFlashcards(randomCards);
      } else {
        console.error('FlashcardModule est indéfini lorsque resetQuestions est appelé.');
      }
    },
    initFlashcards: () => {
      if (window.FlashcardModule) {
        window.FlashcardModule.initFlashcards();
      }
    }
  };

  // Export current session for external access
  window.currentSession = currentSession;

  // Initialize when DOM is ready
  document.addEventListener('DOMContentLoaded', initializeApp);

})();
