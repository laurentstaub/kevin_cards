// Session Setup Management
const SessionSetup = (function() {

    // --- Private State ---
    let selectedMode = 'quick';
    let selectedCount = 10;
    let selectedDifficulty = 'mixed';
    let selectedTags = [];
    let availableTags = [];
    let availableQuestions = 0;
    let tagsByPriority = {};

    // --- Private Methods ---

    const loadInitialData = async function() {
        try {
            // Load available tags with priority ordering
            const tagsResponse = await fetch('/api/tags?priorityOrder=true');
            const tagsData = await tagsResponse.json();
            availableTags = tagsData.tags || [];
            
            // Classify tags by priority for better organization
            tagsByPriority = classifyTagsByPriority(availableTags);
            
            // Load question count for preview
            await updateQuestionCount();
            
            // Populate tag filters if in focused mode
            if (selectedMode === 'focused') {
                populateTagFilters();
            }
        } catch (error) {
            console.error('Failed to load initial data:', error);
        }
    };

    const classifyTagsByPriority = function(tags) {
        return {
            primary: tags.filter(t => t.usageCount >= 20),
            secondary: tags.filter(t => t.usageCount >= 10 && t.usageCount < 20),
            minor: tags.filter(t => t.usageCount >= 5 && t.usageCount < 10),
            rare: tags.filter(t => t.usageCount >= 1 && t.usageCount < 5)
        };
    };

    const initializeEventListeners = function() {
        // Study mode selection
        document.querySelectorAll('.study-mode').forEach(mode => {
            mode.addEventListener('click', () => {
                selectStudyMode(mode.dataset.mode);
            });
        });

        // Question count selection
        document.querySelectorAll('.count-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                selectQuestionCount(btn.dataset.count);
            });
        });

        // Difficulty selection
        document.querySelectorAll('.difficulty-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                selectDifficulty(btn.dataset.difficulty);
            });
        });

        // Action buttons
        document.getElementById('startSessionTop').addEventListener('click', () => {
            startSession();
        });

        document.getElementById('backToSetup').addEventListener('click', () => {
            showSetupScreen();
        });
    };

    const selectStudyMode = function(mode) {
        selectedMode = mode;
        
        // Update UI
        document.querySelectorAll('.study-mode').forEach(elem => {
            elem.classList.remove('active');
        });
        document.querySelector(`.study-mode[data-mode="${mode}"]`).classList.add('active');

        // Show/hide tag filters
        const tagFiltersSection = document.getElementById('tagFiltersSection');
        if (mode === 'focused') {
            tagFiltersSection.style.display = 'block';
            populateTagFilters();
        } else {
            tagFiltersSection.style.display = 'none';
            selectedTags = [];
        }

        updateQuestionCount();
    };

    const selectQuestionCount = function(count) {
        selectedCount = count === 'all' ? 'all' : parseInt(count);
        
        // Update UI
        document.querySelectorAll('.count-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        document.querySelector(`.count-btn[data-count="${count}"]`).classList.add('active');

        updatePreview();
    };

    const selectDifficulty = function(difficulty) {
        selectedDifficulty = difficulty;
        
        // Update UI
        document.querySelectorAll('.difficulty-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        document.querySelector(`.difficulty-btn[data-difficulty="${difficulty}"]`).classList.add('active');

        updateQuestionCount();
    };

    const populateTagFilters = async function() {
        const container = document.getElementById('setupTagCategories');
        
        if (availableTags.length === 0) {
            container.innerHTML = `
                <div class="loading-tags">
                    <i class="fas fa-spinner fa-spin"></i>
                    Chargement des domaines...
                </div>
            `;
            return;
        }

        let html = '';
        
        // First show primary tags prominently
        if (tagsByPriority.primary.length > 0) {
            html += `
                <div class="tag-priority-section tag-section-primary">
                    <div class="priority-header">
                        <i class="fas fa-crown"></i>
                        <span>Domaines principaux</span>
                        <small>(${tagsByPriority.primary.length} tags)</small>
                    </div>
                    <div class="priority-tags">
                        ${tagsByPriority.primary.map(tag => `
                            <div class="tag-checkbox tag-priority-primary">
                                <input type="checkbox" 
                                       id="setup-tag-${tag.id}" 
                                       value="${tag.id}"
                                       ${selectedTags.includes(tag.id) ? 'checked' : ''}>
                                <label class="tag-checkbox-label" for="setup-tag-${tag.id}">
                                    <span class="tag-name">${tag.name}</span>
                                    <span class="tag-count">${tag.usageCount}</span>
                                </label>
                            </div>
                        `).join('')}
                    </div>
                </div>
            `;
        }
        
        // Then secondary tags
        if (tagsByPriority.secondary.length > 0) {
            html += `
                <div class="tag-priority-section tag-section-secondary">
                    <div class="priority-header">
                        <span>Domaines secondaires</span>
                        <small>(${tagsByPriority.secondary.length} tags)</small>
                    </div>
                    <div class="priority-tags">
                        ${tagsByPriority.secondary.map(tag => `
                            <div class="tag-checkbox tag-priority-secondary">
                                <input type="checkbox" 
                                       id="setup-tag-${tag.id}" 
                                       value="${tag.id}"
                                       ${selectedTags.includes(tag.id) ? 'checked' : ''}>
                                <label class="tag-checkbox-label" for="setup-tag-${tag.id}">
                                    <span class="tag-name">${tag.name}</span>
                                    <span class="tag-count">${tag.usageCount}</span>
                                </label>
                            </div>
                        `).join('')}
                    </div>
                </div>
            `;
        }
        
        // Minor tags in a collapsible section
        if (tagsByPriority.minor.length > 0) {
            html += `
                <div class="tag-priority-section tag-section-minor">
                    <div class="priority-header collapsible" onclick="this.parentElement.classList.toggle('collapsed')">
                        <span>Domaines spécialisés</span>
                        <small>(${tagsByPriority.minor.length} tags)</small>
                        <i class="fas fa-chevron-down toggle-icon"></i>
                    </div>
                    <div class="priority-tags">
                        ${tagsByPriority.minor.map(tag => `
                            <div class="tag-checkbox tag-priority-minor">
                                <input type="checkbox" 
                                       id="setup-tag-${tag.id}" 
                                       value="${tag.id}"
                                       ${selectedTags.includes(tag.id) ? 'checked' : ''}>
                                <label class="tag-checkbox-label" for="setup-tag-${tag.id}">
                                    <span class="tag-name">${tag.name}</span>
                                    <span class="tag-count">${tag.usageCount}</span>
                                </label>
                            </div>
                        `).join('')}
                    </div>
                </div>
            `;
        }

        // Rare tags in a collapsed section by default
        if (tagsByPriority.rare.length > 0) {
            html += `
                <div class="tag-priority-section tag-section-rare collapsed">
                    <div class="priority-header collapsible" onclick="this.parentElement.classList.toggle('collapsed')">
                        <span>Domaines rares</span>
                        <small>(${tagsByPriority.rare.length} tags)</small>
                        <i class="fas fa-chevron-down toggle-icon"></i>
                    </div>
                    <div class="priority-tags">
                        ${tagsByPriority.rare.map(tag => `
                            <div class="tag-checkbox tag-priority-rare">
                                <input type="checkbox" 
                                       id="setup-tag-${tag.id}" 
                                       value="${tag.id}"
                                       ${selectedTags.includes(tag.id) ? 'checked' : ''}>
                                <label class="tag-checkbox-label" for="setup-tag-${tag.id}">
                                    <span class="tag-name">${tag.name}</span>
                                    <span class="tag-count">${tag.usageCount}</span>
                                </label>
                            </div>
                        `).join('')}
                    </div>
                </div>
            `;
        }

        container.innerHTML = html;

        // Add event listeners for checkboxes
        container.querySelectorAll('input[type="checkbox"]').forEach(checkbox => {
            checkbox.addEventListener('change', (e) => {
                const tagId = parseInt(e.target.value);
                if (e.target.checked) {
                    if (!selectedTags.includes(tagId)) {
                        selectedTags.push(tagId);
                    }
                } else {
                    selectedTags = selectedTags.filter(id => id !== tagId);
                }
                updateSelectedFilters();
                updateQuestionCount();
            });
        });

        updateSelectedFilters();
    };

    const updateSelectedFilters = function() {
        const container = document.getElementById('setupSelectedFilters');
        
        if (selectedTags.length === 0) {
            container.innerHTML = '';
            return;
        }

        const selectedTagObjects = availableTags.filter(tag => 
            selectedTags.includes(tag.id)
        );

        const html = selectedTagObjects.map(tag => `
            <div class="selected-filter">
                ${tag.name}
                <button onclick="SessionSetup.removeTag(${tag.id})" aria-label="Remove ${tag.name}">
                    ×
                </button>
            </div>
        `).join('');

        container.innerHTML = html;
    };

    const removeTag = function(tagId) {
        selectedTags = selectedTags.filter(id => id !== tagId);
        
        // Update checkbox
        const checkbox = document.getElementById(`setup-tag-${tagId}`);
        if (checkbox) {
            checkbox.checked = false;
        }
        
        updateSelectedFilters();
        updateQuestionCount();
    };

    const updateQuestionCount = async function() {
        try {
            // Build query parameters
            const params = new URLSearchParams();
            
            if (selectedMode === 'focused' && selectedTags.length > 0) {
                params.set('tags', selectedTags.join(','));
            }
            
            if (selectedDifficulty !== 'mixed') {
                params.set('difficulty', selectedDifficulty);
            }

            // Get question count without limit
            params.set('limit', '1000'); // High number to get all questions
            
            const response = await fetch(`/api/questions/published?${params}`);
            const data = await response.json();
            
            availableQuestions = data.metadata?.total_cards || data.flashcards?.length || 0;
            updatePreview();
            
        } catch (error) {
            console.error('Failed to update question count:', error);
            availableQuestions = 0;
            updatePreview();
        }
    };

    const updatePreview = function() {
        const availableElement = document.getElementById('availableQuestions');
        const selectedElement = document.getElementById('selectedCount');
        
        if (availableElement) {
            availableElement.textContent = availableQuestions;
        }
        
        if (selectedElement) {
            const selectedCountValue = selectedCount === 'all' ? 
                availableQuestions : 
                Math.min(selectedCount, availableQuestions);
            selectedElement.textContent = selectedCountValue;
        }
        
        // Update sticky header count
        updateStickyQuestionCount();
    };
    
    const updateStickyQuestionCount = function() {
        const stickyCountElement = document.getElementById('stickyQuestionCount');
        if (!stickyCountElement) return;
        
        const selectedCountValue = selectedCount === 'all' ? 'toutes les' : selectedCount;
        const availableCount = availableQuestions;
        
        if (selectedTags.length === 0) {
            // No tags selected - show selected vs total available
            if (typeof selectedCountValue === 'number') {
                stickyCountElement.textContent = `${Math.min(selectedCountValue, availableCount)} questions sélectionnées sur ${availableCount} disponibles`;
            } else {
                stickyCountElement.textContent = `${selectedCountValue} questions sélectionnées sur ${availableCount} disponibles`;
            }
        } else {
            // Tags selected - show selected vs filtered available
            if (availableCount === 0) {
                stickyCountElement.textContent = 'Aucune question trouvée avec ces tags';
            } else {
                if (typeof selectedCountValue === 'number') {
                    stickyCountElement.textContent = `${Math.min(selectedCountValue, availableCount)} questions sélectionnées sur ${availableCount} disponibles`;
                } else {
                    stickyCountElement.textContent = `${selectedCountValue} questions sélectionnées sur ${availableCount} disponibles`;
                }
            }
        }
    };

    const startSession = async function() {
        // Validate selection
        if (availableQuestions === 0) {
            alert('Aucune question disponible avec ces critères.');
            return;
        }

        if (selectedMode === 'focused' && selectedTags.length === 0) {
            alert('Veuillez sélectionner au moins un domaine pour l\'étude ciblée.');
            return;
        }

        try {
            // Save session configuration
            saveSessionConfiguration();

            // Hide setup screen, show study interface
            showStudyInterface();

            // Load questions for the session
            await loadSessionQuestions();

        } catch (error) {
            console.error('Failed to start session:', error);
            alert('Erreur lors du démarrage de la session. Veuillez réessayer.');
        }
    };

    const loadSessionQuestions = async function() {
        try {
            // Build query parameters based on selected criteria
            const params = new URLSearchParams();
            
            if (selectedMode === 'focused' && selectedTags.length > 0) {
                params.set('tags', selectedTags.join(','));
            }
            
            if (selectedDifficulty !== 'mixed') {
                params.set('difficulty', selectedDifficulty);
            }

            // Set high limit to get all matching questions
            params.set('limit', '1000');
            
            const response = await fetch(`/api/questions/published?${params}`);
            const data = await response.json();
            
            if (!data.flashcards || data.flashcards.length === 0) {
                throw new Error('No questions found');
            }

            // Process questions and start the study session
            const questions = data.flashcards.map(card => ({
                id: card.id,
                tags: card.tags ? card.tags.map(tag => typeof tag === 'string' ? tag : tag.name) : [],
                question: card.question, // Already rendered HTML from published endpoint
                answer: card.answer,     // Already rendered HTML from published endpoint
                difficulty: card.difficulty || 'medium',
                source: extractSource(card.sources)
            }));

            // Shuffle and select questions
            const shuffledQuestions = shuffleArray(questions);
            const selectedQuestions = selectedCount === 'all' ? 
                shuffledQuestions : 
                shuffledQuestions.slice(0, selectedCount);

            // Store session configuration and questions for repeat/similar functionality
            if (window.currentSession) {
                window.currentSession.config = {
                    mode: selectedMode,
                    count: selectedCount,
                    difficulty: selectedDifficulty,
                    tags: selectedTags
                };
                window.currentSession.questions = selectedQuestions;
            }

            // Initialize the main flashcard system with selected questions
            if (window.flashcardApp) {
                window.flashcardApp.loadCustomQuestions(selectedQuestions);
            }

        } catch (error) {
            console.error('Failed to load session questions:', error);
            alert('Erreur lors du chargement des questions. Retour à la configuration.');
            showSetupScreen();
        }
    };

    const shuffleArray = function(array) {
        const shuffled = [...array];
        for (let i = shuffled.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
        }
        return shuffled;
    };

    const showStudyInterface = function() {
        document.getElementById('sessionSetup').style.display = 'none';
        document.getElementById('studyInterface').style.display = 'block';
        
        // Update session header info
        const modeDisplay = getStudyModeDisplay();
        const filtersDisplay = getFiltersDisplay();
        
        document.getElementById('sessionMode').textContent = modeDisplay;
        document.getElementById('sessionFilters').textContent = filtersDisplay;
        
        // Show loading state in flashcard
        const questionElement = document.getElementById('question');
        if (questionElement) {
            questionElement.innerHTML = `
                <div class="loading-state">
                    <div class="loading-spinner">
                        <i class="fas fa-spinner fa-spin"></i>
                    </div>
                    <p>Chargement des questions...</p>
                </div>
            `;
        }
    };

    const showSetupScreen = function() {
        document.getElementById('sessionSetup').style.display = 'flex';
        document.getElementById('studyInterface').style.display = 'none';
        
        // Reset session state when going back to setup
        resetSessionState();
        
        // Force a re-layout to ensure proper centering
        setTimeout(() => {
            const setupPanel = document.getElementById('sessionSetup');
            if (setupPanel) {
                setupPanel.scrollTop = 0;
                // Trigger a reflow to ensure centering is recalculated
                setupPanel.offsetHeight;
            }
        }, 50);
    };
    
    const resetSessionState = function() {
        // Reset flashcard app state variables
        if (window.flashcardApp && window.flashcardApp.resetQuestions) {
            window.flashcardApp.resetQuestions();
        }
        
        // Reset global session variables (if accessible)
        if (window.currentSession) {
            window.currentSession.questions = [];
            window.currentSession.config = null;
        }
        
        // Reset any DOM elements that might show previous session state
        const currentCardEl = document.getElementById('currentCard');
        const totalCardsEl = document.getElementById('totalCards');
        const recalledCountEl = document.getElementById('recalledCount');
        
        if (currentCardEl) currentCardEl.textContent = '0';
        if (totalCardsEl) totalCardsEl.textContent = '0';
        if (recalledCountEl) recalledCountEl.textContent = '0';
        
        // Hide session completion actions if visible
        const sessionCompleteActions = document.getElementById('sessionCompleteActions');
        if (sessionCompleteActions) {
            sessionCompleteActions.style.display = 'none';
        }
        
        // Show main action buttons
        const notKnownBtn = document.getElementById('notKnownBtn');
        const recalledBtn = document.getElementById('recalledBtn');
        if (notKnownBtn) notKnownBtn.style.display = 'flex';
        if (recalledBtn) recalledBtn.style.display = 'flex';
        if (notKnownBtn) notKnownBtn.disabled = false;
        if (recalledBtn) recalledBtn.disabled = false;
    };

    const getStudyModeDisplay = function() {
        const modes = {
            'quick': 'Étude rapide',
            'focused': 'Étude ciblée',
            'review': 'Révision'
        };
        return modes[selectedMode] || 'Étude rapide';
    };

    const getFiltersDisplay = function() {
        const parts = [];
        
        if (selectedMode === 'focused' && selectedTags.length > 0) {
            const tagNames = availableTags
                .filter(tag => selectedTags.includes(tag.id))
                .map(tag => tag.name);
            parts.push(tagNames.slice(0, 2).join(', '));
            if (tagNames.length > 2) {
                parts[0] += ` +${tagNames.length - 2}`;
            }
        } else {
            parts.push('Toutes les questions');
        }
        
        if (selectedDifficulty !== 'mixed') {
            const difficulties = {
                'easy': 'Facile',
                'medium': 'Moyen',
                'hard': 'Difficile'
            };
            parts.push(difficulties[selectedDifficulty]);
        }
        
        return parts.join(' • ');
    };

    const getCategoryDisplayName = function(category) {
        const categoryNames = {
            'therapeutic_area': 'Domaines thérapeutiques',
            'drug_class': 'Classes médicamenteuses',
            'topic': 'Sujets',
            'situation': 'Contextes cliniques',
            'other': 'Autres'
        };
        return categoryNames[category] || category;
    };

    const saveSessionConfiguration = function() {
        const config = {
            mode: selectedMode,
            count: selectedCount,
            difficulty: selectedDifficulty,
            tags: selectedTags,
            timestamp: Date.now()
        };
        localStorage.setItem('lastSessionConfig', JSON.stringify(config));
    };

    const extractSource = function(sources) {
        if (!sources || sources.length === 0) {
            return 'Pharmacologie générale';
        }
        
        // Return all sources as objects with text and optional URL
        const sourceObjects = sources.map(source => ({
            text: source.title || source.url || 'Source externe',
            url: source.url || null
        }));
        
        // If there's only one source, return as single object, otherwise return as array
        return sourceObjects.length === 1 ? sourceObjects[0] : sourceObjects;
    };

    // --- Initialization ---
    const init = function() {
        initializeEventListeners();
        loadInitialData();
    };

    // --- Public API ---
    return {
        removeTag,
        showSetupScreen,
        startSession,
        init
    };

})();

// Initialize when DOM is loaded
let sessionSetup;
document.addEventListener('DOMContentLoaded', () => {
    sessionSetup = SessionSetup;
    sessionSetup.init();
});

// Export for global access
if (typeof window !== 'undefined') {
    window.sessionSetup = SessionSetup;
}