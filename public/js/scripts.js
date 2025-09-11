// FlashPharma Main Orchestrator - ES6 Modular Architecture
'use strict';

import * as UIHelpers from './modules/ui-helpers.js';
import { ApiClient } from './modules/api-client.js';
import * as FlashcardModule from './modules/flashcard-module.js';
import * as FilterModule from './modules/filter-module.js';
import * as StatsModule from './modules/stats-module.js';
import * as RevisionModule from './modules/revision-module.js';

// Private state - shared between modules via global objects or passed directly
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
    repeatSameBtn.addEventListener('click', () => FlashcardModule.repeatSameQuestions());
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

      if (window.ProgressTracker && allFlashcards.length > 0) {
        const currentCardIds = allFlashcards.map(card => card.id);
        window.ProgressTracker.cleanOrphanedProgress(currentCardIds);
      }

      FilterModule.setQuestionData(questionData);
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
  FlashcardModule.loadFlashcards(questions);
};

const resetGame = function() {
  FlashcardModule.reset();
};

const startSimilarSession = async function() {
    if (!currentSession.config) {
        console.error('No session configuration found');
        alert('Impossible de créer une session similaire. Configuration manquante.');
        return;
    }

    try {
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

    const questions = ApiClient.processSessionQuestions(result);
    const shuffledQuestions = UIHelpers.shuffleArray(questions);
        const selectedCount = currentSession.config.count === 'all' ? 
            shuffledQuestions.length : 
            Math.min(currentSession.config.count, shuffledQuestions.length);
        const selectedQuestions = shuffledQuestions.slice(0, selectedCount);

        currentSession.questions = selectedQuestions;
    FlashcardModule.loadFlashcards(selectedQuestions);
        console.log(`Started similar session with ${selectedQuestions.length} new questions`);

    } catch (error) {
        console.error('Failed to start similar session:', error);
        alert('Erreur lors du chargement de la session similaire. Veuillez réessayer.');
    }
};

const startNewSession = function() {
  if (window.ProgressTracker && window.ProgressTracker.currentSession) {
    window.ProgressTracker.endSession();
  }
  
  currentSession = {
    questions: [],
    config: null
  };
  
  // Use the new view manager function
  showSetupInterface();
};

// --- View Management ---
const showStudyInterface = function() {
  const setupEl = document.getElementById('sessionSetup');
  const studyEl = document.getElementById('studyInterface');
  if (setupEl) setupEl.style.display = 'none';
  if (studyEl) studyEl.style.display = 'flex';
};

const showSetupInterface = function() {
  const setupEl = document.getElementById('sessionSetup');
  const studyEl = document.getElementById('studyInterface');
  if (setupEl) setupEl.style.display = 'flex';
  if (studyEl) studyEl.style.display = 'none';
  
  // Also update session setup UI
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
const initializeApp = async function() {
  console.log('Initializing FlashPharma ES6 modular application...');

  initializeElements();
  
  UIHelpers.init();
  UIHelpers.initTheme();
  FlashcardModule.init();
  FilterModule.init();
  StatsModule.init();
  RevisionModule.init();
  
  setupMainEventListeners();

  await loadQuestions();

  if (window.flashcardApp) {
    window.flashcardApp.resetQuestions();
  } else {
    console.error('flashcardApp is undefined when calling resetQuestions.');
  }

  console.log('FlashPharma modular application initialized successfully');
};

// Create global flashcard app object for session setup to use
window.flashcardApp = {
  loadCustomQuestions: loadCustomQuestions,
  getAllQuestions: () => allFlashcards,
  resetQuestions: () => {
    const randomCards = UIHelpers.getRandomItems(allFlashcards, 10);
    FlashcardModule.loadFlashcards(randomCards);
  },
  initFlashcards: () => {
    FlashcardModule.initFlashcards();
  },
  showStudyInterface: showStudyInterface,
  showSetupInterface: showSetupInterface
};

// Export current session for external access
window.currentSession = currentSession;

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', initializeApp);
