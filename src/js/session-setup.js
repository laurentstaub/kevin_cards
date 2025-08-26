// Session Setup Management
class SessionSetup {
    constructor() {
        this.selectedMode = 'quick';
        this.selectedCount = 10;
        this.selectedDifficulty = 'mixed';
        this.selectedTags = [];
        this.availableTags = [];
        this.availableQuestions = 0;
        
        this.initializeEventListeners();
        this.loadInitialData();
    }

    async loadInitialData() {
        try {
            // Load available tags
            const tagsResponse = await fetch('/api/tags');
            const tagsData = await tagsResponse.json();
            this.availableTags = tagsData.tags || [];
            
            // Load question count for preview
            await this.updateQuestionCount();
            
            // Populate tag filters if in focused mode
            if (this.selectedMode === 'focused') {
                this.populateTagFilters();
            }
        } catch (error) {
            console.error('Failed to load initial data:', error);
        }
    }

    initializeEventListeners() {
        // Study mode selection
        document.querySelectorAll('.study-mode').forEach(mode => {
            mode.addEventListener('click', () => {
                this.selectStudyMode(mode.dataset.mode);
            });
        });

        // Question count selection
        document.querySelectorAll('.count-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                this.selectQuestionCount(btn.dataset.count);
            });
        });

        // Difficulty selection
        document.querySelectorAll('.difficulty-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                this.selectDifficulty(btn.dataset.difficulty);
            });
        });

        // Action buttons
        document.getElementById('startSession').addEventListener('click', () => {
            this.startSession();
        });

        document.getElementById('loadLastSession').addEventListener('click', () => {
            this.loadLastSession();
        });

        document.getElementById('backToSetup').addEventListener('click', () => {
            this.showSetupScreen();
        });
    }

    selectStudyMode(mode) {
        this.selectedMode = mode;
        
        // Update UI
        document.querySelectorAll('.study-mode').forEach(elem => {
            elem.classList.remove('active');
        });
        document.querySelector(`.study-mode[data-mode="${mode}"]`).classList.add('active');

        // Show/hide tag filters
        const tagFiltersSection = document.getElementById('tagFiltersSection');
        if (mode === 'focused') {
            tagFiltersSection.style.display = 'block';
            this.populateTagFilters();
        } else {
            tagFiltersSection.style.display = 'none';
            this.selectedTags = [];
        }

        this.updateQuestionCount();
    }

    selectQuestionCount(count) {
        this.selectedCount = count === 'all' ? 'all' : parseInt(count);
        
        // Update UI
        document.querySelectorAll('.count-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        document.querySelector(`.count-btn[data-count="${count}"]`).classList.add('active');

        this.updatePreview();
    }

    selectDifficulty(difficulty) {
        this.selectedDifficulty = difficulty;
        
        // Update UI
        document.querySelectorAll('.difficulty-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        document.querySelector(`.difficulty-btn[data-difficulty="${difficulty}"]`).classList.add('active');

        this.updateQuestionCount();
    }

    async populateTagFilters() {
        const container = document.getElementById('setupTagCategories');
        
        if (this.availableTags.length === 0) {
            container.innerHTML = `
                <div class="loading-tags">
                    <i class="fas fa-spinner fa-spin"></i>
                    Chargement des domaines...
                </div>
            `;
            return;
        }

        // Group tags by category
        const categories = {};
        this.availableTags.forEach(tag => {
            const category = tag.category || 'other';
            if (!categories[category]) {
                categories[category] = [];
            }
            categories[category].push(tag);
        });

        // Generate HTML
        let html = '';
        Object.entries(categories).forEach(([category, tags]) => {
            const categoryName = this.getCategoryDisplayName(category);
            html += `
                <div class="tag-category">
                    <div class="category-header">${categoryName}</div>
                    <div class="category-tags">
                        ${tags.map(tag => `
                            <div class="tag-checkbox">
                                <input type="checkbox" 
                                       id="setup-tag-${tag.id}" 
                                       value="${tag.id}"
                                       ${this.selectedTags.includes(tag.id) ? 'checked' : ''}>
                                <label class="tag-checkbox-label" for="setup-tag-${tag.id}">
                                    ${tag.name}
                                </label>
                            </div>
                        `).join('')}
                    </div>
                </div>
            `;
        });

        container.innerHTML = html;

        // Add event listeners for checkboxes
        container.querySelectorAll('input[type="checkbox"]').forEach(checkbox => {
            checkbox.addEventListener('change', (e) => {
                const tagId = parseInt(e.target.value);
                if (e.target.checked) {
                    if (!this.selectedTags.includes(tagId)) {
                        this.selectedTags.push(tagId);
                    }
                } else {
                    this.selectedTags = this.selectedTags.filter(id => id !== tagId);
                }
                this.updateSelectedFilters();
                this.updateQuestionCount();
            });
        });

        this.updateSelectedFilters();
    }

    updateSelectedFilters() {
        const container = document.getElementById('setupSelectedFilters');
        
        if (this.selectedTags.length === 0) {
            container.innerHTML = '';
            return;
        }

        const selectedTagObjects = this.availableTags.filter(tag => 
            this.selectedTags.includes(tag.id)
        );

        const html = selectedTagObjects.map(tag => `
            <div class="selected-filter">
                ${tag.name}
                <button onclick="sessionSetup.removeTag(${tag.id})" aria-label="Remove ${tag.name}">
                    ×
                </button>
            </div>
        `).join('');

        container.innerHTML = html;
    }

    removeTag(tagId) {
        this.selectedTags = this.selectedTags.filter(id => id !== tagId);
        
        // Update checkbox
        const checkbox = document.getElementById(`setup-tag-${tagId}`);
        if (checkbox) {
            checkbox.checked = false;
        }
        
        this.updateSelectedFilters();
        this.updateQuestionCount();
    }

    async updateQuestionCount() {
        try {
            // Build query parameters
            const params = new URLSearchParams();
            
            if (this.selectedMode === 'focused' && this.selectedTags.length > 0) {
                params.set('tags', this.selectedTags.join(','));
            }
            
            if (this.selectedDifficulty !== 'mixed') {
                params.set('difficulty', this.selectedDifficulty);
            }

            // Get question count without limit
            params.set('limit', '1000'); // High number to get all questions
            
            const response = await fetch(`/api/questions?${params}`);
            const data = await response.json();
            
            this.availableQuestions = data.totalCount || data.questions?.length || 0;
            this.updatePreview();
            
        } catch (error) {
            console.error('Failed to update question count:', error);
            this.availableQuestions = 0;
            this.updatePreview();
        }
    }

    updatePreview() {
        const availableElement = document.getElementById('availableQuestions');
        const selectedElement = document.getElementById('selectedCount');
        
        if (availableElement) {
            availableElement.textContent = this.availableQuestions;
        }
        
        if (selectedElement) {
            const selectedCount = this.selectedCount === 'all' ? 
                this.availableQuestions : 
                Math.min(this.selectedCount, this.availableQuestions);
            selectedElement.textContent = selectedCount;
        }
    }

    async startSession() {
        // Validate selection
        if (this.availableQuestions === 0) {
            alert('Aucune question disponible avec ces critères.');
            return;
        }

        if (this.selectedMode === 'focused' && this.selectedTags.length === 0) {
            alert('Veuillez sélectionner au moins un domaine pour l\'étude ciblée.');
            return;
        }

        try {
            // Save session configuration
            this.saveSessionConfiguration();

            // Hide setup screen, show study interface
            this.showStudyInterface();

            // Load questions for the session
            await this.loadSessionQuestions();

        } catch (error) {
            console.error('Failed to start session:', error);
            alert('Erreur lors du démarrage de la session. Veuillez réessayer.');
        }
    }

    async loadSessionQuestions() {
        try {
            // Build query parameters based on selected criteria
            const params = new URLSearchParams();
            
            if (this.selectedMode === 'focused' && this.selectedTags.length > 0) {
                params.set('tags', this.selectedTags.join(','));
            }
            
            if (this.selectedDifficulty !== 'mixed') {
                params.set('difficulty', this.selectedDifficulty);
            }

            // Set high limit to get all matching questions
            params.set('limit', '1000');
            
            const response = await fetch(`/api/questions?${params}`);
            const data = await response.json();
            
            if (!data.questions || data.questions.length === 0) {
                throw new Error('No questions found');
            }

            // Process questions and start the study session
            const questions = data.questions.map(card => ({
                id: card.id,
                tags: card.tags ? card.tags.map(tag => typeof tag === 'string' ? tag : tag.name) : [],
                question: card.questionHtml || card.questionText || card.question,
                answer: card.answerHtml || card.answerText || card.answer,
                difficulty: card.difficulty || 'medium'
            }));

            // Shuffle and select questions
            const shuffledQuestions = this.shuffleArray(questions);
            const selectedQuestions = this.selectedCount === 'all' ? 
                shuffledQuestions : 
                shuffledQuestions.slice(0, this.selectedCount);

            // Initialize the main flashcard system with selected questions
            if (window.flashcardApp) {
                window.flashcardApp.loadCustomQuestions(selectedQuestions);
            }

        } catch (error) {
            console.error('Failed to load session questions:', error);
            alert('Erreur lors du chargement des questions. Retour à la configuration.');
            this.showSetupScreen();
        }
    }

    shuffleArray(array) {
        const shuffled = [...array];
        for (let i = shuffled.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
        }
        return shuffled;
    }

    showStudyInterface() {
        document.getElementById('sessionSetup').style.display = 'none';
        document.getElementById('studyInterface').style.display = 'block';
        
        // Update session header info
        const modeDisplay = this.getStudyModeDisplay();
        const filtersDisplay = this.getFiltersDisplay();
        
        document.getElementById('sessionMode').textContent = modeDisplay;
        document.getElementById('sessionFilters').textContent = filtersDisplay;
    }

    showSetupScreen() {
        document.getElementById('sessionSetup').style.display = 'block';
        document.getElementById('studyInterface').style.display = 'none';
    }

    getStudyModeDisplay() {
        const modes = {
            'quick': 'Étude rapide',
            'focused': 'Étude ciblée',
            'review': 'Révision'
        };
        return modes[this.selectedMode] || 'Étude rapide';
    }

    getFiltersDisplay() {
        const parts = [];
        
        if (this.selectedMode === 'focused' && this.selectedTags.length > 0) {
            const tagNames = this.availableTags
                .filter(tag => this.selectedTags.includes(tag.id))
                .map(tag => tag.name);
            parts.push(tagNames.slice(0, 2).join(', '));
            if (tagNames.length > 2) {
                parts[0] += ` +${tagNames.length - 2}`;
            }
        } else {
            parts.push('Toutes les questions');
        }
        
        if (this.selectedDifficulty !== 'mixed') {
            const difficulties = {
                'easy': 'Facile',
                'medium': 'Moyen',
                'hard': 'Difficile'
            };
            parts.push(difficulties[this.selectedDifficulty]);
        }
        
        return parts.join(' • ');
    }

    getCategoryDisplayName(category) {
        const categoryNames = {
            'therapeutic_area': 'Domaines thérapeutiques',
            'drug_class': 'Classes médicamenteuses',
            'topic': 'Sujets',
            'situation': 'Contextes cliniques',
            'other': 'Autres'
        };
        return categoryNames[category] || category;
    }

    saveSessionConfiguration() {
        const config = {
            mode: this.selectedMode,
            count: this.selectedCount,
            difficulty: this.selectedDifficulty,
            tags: this.selectedTags,
            timestamp: Date.now()
        };
        localStorage.setItem('lastSessionConfig', JSON.stringify(config));
    }

    loadLastSession() {
        try {
            const configStr = localStorage.getItem('lastSessionConfig');
            if (!configStr) {
                alert('Aucune session précédente trouvée.');
                return;
            }

            const config = JSON.parse(configStr);
            
            // Apply configuration
            this.selectedMode = config.mode || 'quick';
            this.selectedCount = config.count || 10;
            this.selectedDifficulty = config.difficulty || 'mixed';
            this.selectedTags = config.tags || [];

            // Update UI
            this.selectStudyMode(this.selectedMode);
            this.selectQuestionCount(config.count || 10);
            this.selectDifficulty(this.selectedDifficulty);

            // If focused mode, populate and update tags
            if (this.selectedMode === 'focused') {
                setTimeout(() => {
                    this.populateTagFilters();
                }, 100);
            }

        } catch (error) {
            console.error('Failed to load last session:', error);
            alert('Erreur lors du chargement de la dernière session.');
        }
    }
}

// Initialize when DOM is loaded
let sessionSetup;
document.addEventListener('DOMContentLoaded', () => {
    sessionSetup = new SessionSetup();
});

// Export for global access
window.sessionSetup = sessionSetup;