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
// const, not let: this object is exported on window and must always be
// mutated in place so external readers never hold a stale reference.
const currentSession = {
    questions: [],
    config: null
};

// DOM elements for orchestrator functions
let resetBtn, themeToggle;

// Private initialization methods
const initializeElements = function() {
  resetBtn = document.getElementById('resetBtn');
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

const loadTags = async function() {
  const result = await ApiClient.tags.loadWithPriority();
  if (result.success) {
    return result.tags;
  }
  return [];

};

const loadCustomQuestions = function(questions) {
  FlashcardModule.loadFlashcards(questions);
};

const resetGame = function() {
  FlashcardModule.reset();
};

// Resolve the configuration of the session in progress. SessionSetup owns it,
// so ask that module first and cache the answer on currentSession.
const resolveSessionConfig = function() {
    if (currentSession.config) {
        return currentSession.config;
    }
    const config = window.SessionSetup && window.SessionSetup.getSessionConfig
        ? window.SessionSetup.getSessionConfig()
        : null;
    if (config) {
        currentSession.config = config;
    }
    return config;
};

const startSimilarSession = async function() {
    const config = resolveSessionConfig();

    if (!config) {
        console.error('No session configuration found');
        window.Toast.error('Impossible de relancer une session similaire.');
        return;
    }

    try {
        const params = new URLSearchParams();
        if (config.mode === 'focused' && config.tags && config.tags.length > 0) {
            params.set('tags', config.tags.join(','));
        }
        if (config.difficulty !== 'mixed') {
            params.set('difficulty', config.difficulty);
        }
        params.set('limit', '1000');

        const result = await ApiClient.questions.loadWithParams(params);
        if (!result.success || result.questions.length === 0) {
            throw new Error('No questions found with similar criteria');
        }

        const questions = ApiClient.processSessionQuestions(result);
        const shuffledQuestions = UIHelpers.shuffleArray(questions);
        const selectedCount = config.count === 'all'
            ? shuffledQuestions.length
            : Math.min(config.count, shuffledQuestions.length);
        const selectedQuestions = shuffledQuestions.slice(0, selectedCount);

        currentSession.questions = selectedQuestions;
        FlashcardModule.loadFlashcards(selectedQuestions);
        console.log(`Started similar session with ${selectedQuestions.length} new questions`);

    } catch (error) {
        console.error('Failed to start similar session:', error);
        window.Toast.error('Le chargement de la session similaire a échoué. Réessayez.');
    }
};

const startNewSession = function() {
  if (window.ProgressTracker && window.ProgressTracker.currentSession) {
    window.ProgressTracker.endSession();
  }
  
  // Mutate rather than reassign: window.currentSession holds this reference
  // and would otherwise keep pointing at the discarded object.
  currentSession.questions = [];
  currentSession.config = null;

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
  
  // Also update session setup UI if data is already loaded
  if (window.SessionSetup && allFlashcards.length > 0) {
    window.SessionSetup.updateQuestionCount();
    window.SessionSetup.updatePreview();
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

  // Load both questions and tags in parallel for better performance
  const [, tagsResult] = await Promise.all([
    loadQuestions(),
    loadTags()
  ]);

  // Pass both questions and tags to the session setup module
  if (window.SessionSetup) {
    window.SessionSetup.setInitialData(allFlashcards, tagsResult);
  }

  // Set default cards for the initial view (don't auto-start session)
  const randomCards = UIHelpers.getRandomItems(allFlashcards, 10);
  FlashcardModule.loadFlashcards(randomCards);

  console.log('FlashPharma modular application initialized successfully');
};

// Create global flashcard app object for other modules to use
window.flashcardApp = {
  loadCustomQuestions: loadCustomQuestions,
  getAllQuestions: () => allFlashcards,
  resetQuestions: () => {
    const randomCards = UIHelpers.getRandomItems(allFlashcards, 10);
    FlashcardModule.loadFlashcards(randomCards);
  },
  showStudyInterface: showStudyInterface,
  showSetupInterface: showSetupInterface
};

// Export current session for external access
window.currentSession = currentSession;

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', initializeApp);
