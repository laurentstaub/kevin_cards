// FlashPharma Admin - Minimal Orchestrator (Fixed Toggle)
const AdminApp = (function() {
  
  // Private state (minimal - most moved to modules)
  let isInitialized = false;
  
  // Private initialization
  const init = async function() {
    if (isInitialized) {
      console.warn('AdminApp already initialized');
      return;
    }
    
    try {
      await initializeModules();
      setupEventHandling();
      await loadInitialData();
      ViewManager.showView('questions');
      
      isInitialized = true;
      console.log('AdminApp initialized successfully');
      
    } catch (error) {
      console.error('Failed to initialize AdminApp:', error);
      UIHelpers.toast('Erreur lors de l\'initialisation de l\'application', 'error');
    }
  };
  
  const initializeModules = async function() {
    // Initialize TagModule with available tags
    await TagModule.loadAvailableTags();
    
    // Initialize ViewManager with handlers
    ViewManager.init('questions');
    
    // Register view handlers
    ViewManager.registerViewHandler('questions', () => {
      QuestionModule.loadQuestions();
    });
    
    ViewManager.registerViewHandler('tags', () => {
      TagManagementModule.loadTags();
    });
    
    // Update question ordering range
    await QuestionModule.updateQuestionOrderingRange();
  };
  
  const setupEventHandling = function() {
    // Setup centralized event handling
    EventManager.init({
      // View management
      showView: ViewManager.showView,
      
      // Question management
      loadQuestions: QuestionModule.loadQuestions,
      searchQuestions: QuestionModule.searchQuestions,
      filterQuestions: QuestionModule.filterQuestions,
      toggleQuestion: QuestionModule.toggleQuestion,
      openQuestionModal: openQuestionModal,
      saveQuestion: saveQuestion,
      editQuestion: editQuestion,
      setSorting: (orderBy, orderDirection) => {
        QuestionModule.setSorting(orderBy, orderDirection);
      },
      
      // Tag management
      filterTags: TagManagementModule.filterTags,
      sortTags: TagManagementModule.sortTags,
      createNewTag: createNewTag,
      handleTagInput: TagModule.handleTagInput,
      selectTagSuggestion: TagModule.selectTagSuggestion,
      addTag: TagModule.addTag,
      removeTag: TagModule.removeTag
    });
  };
  
  const loadInitialData = async function() {
    // Most data loading is now handled by individual modules
    // Just trigger the initial question load
    await QuestionModule.loadQuestions();
  };
  
  // Question management (orchestration only)
  const openQuestionModal = async function(questionId = null) {
    document.getElementById('question-modal-title').textContent = 
      questionId ? 'Modifier la Question' : 'Nouvelle Question';
    
    if (questionId) {
      await loadQuestionForEdit(questionId);
    } else {
      resetQuestionForm();
    }

    ModalManager.show('question-modal');
  };
  
  const resetQuestionForm = function() {
    FormModule.reset.question();
    TagModule.clearSelectedTags();
  };
  
  const saveQuestion = async function() {
    // Collect form data using FormModule
    const questionData = FormModule.collect.question();
    if (!questionData) {
      UIHelpers.toast('Erreur lors de la collecte des données du formulaire', 'error');
      return;
    }

    // Get selected tags from TagModule
    questionData.tagIds = TagModule.getSelectedTagIds();

    // Validate using FormModule
    const validation = FormModule.validate('question', questionData);
    if (!validation.isValid) {
      FormModule.showValidationErrors(validation.errors);
      return;
    }

    // Check if this is an edit operation
    const form = document.getElementById('question-form');
    const questionId = form.dataset.questionId;

    try {
      // Create new tags first using TagModule
      await TagModule.createNewTags();
      
      // Update tagIds after creating new tags
      questionData.tagIds = TagModule.getSelectedTagIds();
      
      // *** Make the API call to save the question ***
      if (questionId) {
        // Update existing question
        await ApiClient.questions.update(questionId, questionData);
      } else {
        // Create new question
        await ApiClient.questions.create(questionData);
      }
      
      ModalManager.hide('question-modal');
      QuestionModule.loadQuestions();
      UIHelpers.toast(`Question ${questionId ? 'modifiée' : 'ajoutée'} avec succès`, 'success');
    } catch (error) {
      console.error('Save error:', error);
      UIHelpers.toast(error.message || 'Erreur lors de la sauvegarde', 'error');
    }
  };
  
  const editQuestion = function(id) {
    openQuestionModal(id);
  };
  
  const loadQuestionForEdit = async function(questionId) {
    try {
      const question = await ApiClient.questions.getById(questionId);

      document.getElementById('question-text').value = question.questionText || '';
      document.getElementById('answer-text').value = question.answerText || '';
      document.getElementById('question-form').dataset.questionId = questionId;

      // Set selected tags using TagModule
      TagModule.setSelectedTags(question.tags || []);
      
      // Use FormModule to load sources
      FormModule.sources.load(question.sources || []);

    } catch (error) {
      console.error('Error loading question for edit:', error);
      UIHelpers.toast('Erreur lors du chargement de la question', 'error');
    }
  };
  
  // Tag management (orchestration only)
  const createNewTag = async function() {
    const name = prompt('Nom du nouveau tag:');
    if (!name || !name.trim()) return;
    
    try {
      const response = await ApiClient.tags.create({ name: name.trim() });
      UIHelpers.toast('Tag créé avec succès', 'success');
      
      // Update TagModule
      TagModule.addToAvailableTags(response);
      
      // Refresh tag display if on tags view
      if (ViewManager.getCurrentView() === 'tags') {
        TagManagementModule.loadTags();
      }
      
    } catch (error) {
      console.error('Create error:', error);
      UIHelpers.toast(error.message || 'Erreur lors de la création', 'error');
    }
  };
  
  // Public API (minimal - most functionality moved to modules)
  return {
    // Core
    init,
    
    // View management (delegated)
    showView: ViewManager.showView,
    getCurrentView: ViewManager.getCurrentView,
    
    // Question management (delegated)
    loadQuestions: QuestionModule.loadQuestions,
    toggleQuestion: QuestionModule.toggleQuestion,
    openQuestionModal,
    saveQuestion,
    editQuestion,
    
    // Tag management (delegated)
    createNewTag,
    
    // Utilities
    isInitialized: () => isInitialized,
    
    // Backward compatibility
    removeSelectedTag: TagModule.removeTagById
  };
})();

// Auto-initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', AdminApp.init);
} else {
  AdminApp.init();
}

// Export to global scope for backward compatibility
window.adminApp = AdminApp;
