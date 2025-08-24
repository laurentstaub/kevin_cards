let flashcards = [];
let allFlashcards = [];
let questionData = null;

// State variables
let currentCardIndex = 0;
let isFlipped = false;
let recalledCount = 0;

// Progress tracking
let progressTracker = null;

// Filter state
let selectedTags = [];
let isFilterActive = false;

// DOM elements
let flashcardElement, questionElement, answerElement;
let notKnownBtn, recalledBtn, resetBtn, currentCardElement, totalCardsElement, recalledCountElement;
let themeToggle, toggleSwitch;
let filterBtn, filterText, tagModal, closeModal, tagSearch, selectedTagsElement, tagCategories, resetFilters, applyFilters;
let statsBtn, statsModal, closeStatsModal, closeStatsBtn, exportProgress, clearProgressBtn;
let menuToggle, sidebar, sidebarClose, sidebarOverlay;

function initFlashcards() {
    totalCardsElement.textContent = String(flashcards.length);
    recalledCountElement.textContent = String(recalledCount);
    
    // Start a new study session
    if (progressTracker) {
        progressTracker.startSession();
    }
    
    showCard(currentCardIndex);
    updateButtonStates();
}

function showCard(index) {
    const card = flashcards[index];

    // Reset flip state for new card
    isFlipped = false;
    flashcardElement.classList.remove('flipped');

    // Handle multiple sources with clickable links
    let sourceHtml;
    if (Array.isArray(card.source)) {
        sourceHtml = card.source.map(source => 
            source.url ? 
                `<a href="${source.url}" target="_blank" rel="noopener noreferrer" class="source-link">${source.text}</a>` : 
                source.text
        ).join(', ');
    } else if (typeof card.source === 'object' && card.source !== null) {
        sourceHtml = card.source.url ? 
            `<a href="${card.source.url}" target="_blank" rel="noopener noreferrer" class="source-link">${card.source.text}</a>` : 
            card.source.text;
    } else if (card.source) {
        sourceHtml = card.source;
    } else {
        sourceHtml = 'Pharmacologie générale';
    }

    const questionContent = `
        <div class="card-header">
            <div class="question-indicator">Question</div>
            <div class="tags-container">
                ${card.tags.map(tag => `<span class="tag">${tag}</span>`).join('')}
            </div>
        </div>
        ${card.question}
        <div class="card-source">
            <span class="source-label">Source:</span> <span class="source-text">${sourceHtml}</span>
        </div>`;

    const answerContent = `
        <div class="card-header">
            <div class="answer-indicator">Réponse</div>
            <div class="tags-container">
                ${card.tags.map(tag => `<span class="tag">${tag}</span>`).join('')}
            </div>
        </div>
        ${card.answer}
        <div class="card-source">
            <span class="source-label">Source:</span> <span class="source-text">${sourceHtml}</span>
        </div>`;

    questionElement.innerHTML = questionContent;
    answerElement.innerHTML = answerContent;
    currentCardElement.textContent = index + 1;
}

function flipCard() {
    isFlipped = !isFlipped;
    flashcardElement.classList.toggle('flipped', isFlipped);
}

function nextCard(isRecalled) {
    if (currentCardIndex < flashcards.length - 1) {
        // Record the card attempt in progress tracker
        const currentCard = flashcards[currentCardIndex];
        if (progressTracker && currentCard.id) {
            progressTracker.recordCardAttempt(
                currentCard.id,
                isRecalled,
                null, // confidence will be added later
                currentCard.tags || []
            );
        }
        
        if (isRecalled) {
            recalledCount++;
            recalledCountElement.textContent = String(recalledCount);
        }

        currentCardIndex++;
        showCard(currentCardIndex);
        updateButtonStates();
    } else {
        // Last card - record it and end session
        const currentCard = flashcards[currentCardIndex];
        if (progressTracker && currentCard.id) {
            progressTracker.recordCardAttempt(
                currentCard.id,
                isRecalled,
                null,
                currentCard.tags || []
            );
        }
        
        if (isRecalled) {
            recalledCount++;
            recalledCountElement.textContent = String(recalledCount);
        }
        
        // End the study session
        if (progressTracker) {
            const sessionData = progressTracker.endSession();
            if (sessionData) {
                showSessionSummary(sessionData);
            }
        }
        
        updateButtonStates();
    }
}

function updateButtonStates() {
    const isLastCard = currentCardIndex === flashcards.length - 1;
    notKnownBtn.disabled = isLastCard;
    recalledBtn.disabled = isLastCard;
    
    // Show reset button when we reach the last card
    if (resetBtn) {
        resetBtn.style.display = isLastCard ? 'flex' : 'none';
    }
}

function initTheme() {
    document.body.setAttribute('data-theme', 'dark');
    if (toggleSwitch) {
        toggleSwitch.classList.remove('active');
    }
}

function toggleTheme() {
    const currentTheme = document.body.getAttribute('data-theme') || 'dark';
    const newTheme = currentTheme === 'dark' ? 'light' : 'dark';

    document.body.setAttribute('data-theme', newTheme);

    if (toggleSwitch) {
        toggleSwitch.classList.toggle('active', newTheme === 'light');
    }
}

async function loadQuestions() {
    try {
        const response = await fetch('http://localhost:3001/api/questions');
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        questionData = {
            metadata: {
                title: 'Questions from Database',
                total_cards: data.questions.length,
                tag_categories: extractTagCategories(data.questions)
            },
            flashcards: data.questions
        };
        
        allFlashcards = data.questions.map(card => ({
            id: card.id,
            tags: card.tags.map(tag => tag.name), // Extract tag names from tag objects
            question: card.questionHtml || card.questionText, // Use HTML if available, fallback to text
            answer: card.answerHtml || card.answerText, // Use HTML if available, fallback to text
            difficulty: card.difficulty || 'medium',
            source: extractSource(card.sources) // Extract source from sources array
        }));

        // Apply current filters or use all cards
        applyCurrentFilters();
    } catch (error) {
        console.error('Error loading questions:', error);
        // Fallback to empty array if loading fails
        flashcards = [];
        allFlashcards = [];
        initFlashcards();
    }
}

// Helper functions for processing database data
function extractSource(sources) {
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
}

function extractTagCategories(questions) {
    const tagsByCategory = {};
    
    questions.forEach(question => {
        if (question.tags && Array.isArray(question.tags)) {
            question.tags.forEach(tag => {
                const category = tag.category || 'autres';
                if (!tagsByCategory[category]) {
                    tagsByCategory[category] = [];
                }
                if (!tagsByCategory[category].includes(tag.name)) {
                    tagsByCategory[category].push(tag.name);
                }
            });
        }
    });
    
    return tagsByCategory;
}

function getRandomFlashcards(array, count) {
    const shuffled = [...array];

    // Fisher-Yates shuffle algorithm
    for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }

    return shuffled.slice(0, count);
}

function resetGame() {
    // Reset state variables
    currentCardIndex = 0;
    isFlipped = false;
    recalledCount = 0;
    
    // End current session if active
    if (progressTracker && progressTracker.currentSession) {
        progressTracker.endSession();
    }
    
    // Load new set of questions and restart
    applyCurrentFilters();
}

// Tag filtering functions
function applyCurrentFilters() {
    if (selectedTags.length === 0) {
        // No filters, use random selection from all cards
        flashcards = getRandomFlashcards(allFlashcards, 10);
        isFilterActive = false;
    } else {
        // Filter cards by selected tags
        const filteredCards = allFlashcards.filter(card => 
            selectedTags.some(tag => card.tags.includes(tag))
        );
        
        // Use filtered cards, up to 10 random ones
        const count = Math.min(filteredCards.length, 10);
        flashcards = getRandomFlashcards(filteredCards, count);
        isFilterActive = true;
    }
    
    updateFilterButton();
    initFlashcards();
}

function updateFilterButton() {
    if (filterBtn && filterText) {
        if (selectedTags.length > 0) {
            filterBtn.classList.add('active');
            filterText.textContent = `Filtrer (${selectedTags.length})`;
        } else {
            filterBtn.classList.remove('active');
            filterText.textContent = 'Filtrer';
        }
    }
}

function showTagModal() {
    if (tagModal && questionData) {
        populateTagCategories();
        tagModal.classList.add('active');
        document.body.style.overflow = 'hidden';
    }
}

function hideTagModal() {
    if (tagModal) {
        tagModal.classList.remove('active');
        document.body.style.overflow = '';
    }
}

function populateTagCategories() {
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
}

function updateSelectedTagsDisplay() {
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
}

function handleTagSearch(query) {
    const checkboxes = tagCategories.querySelectorAll('.tag-checkbox');
    checkboxes.forEach(checkbox => {
        const label = checkbox.querySelector('.tag-checkbox-label');
        const text = label.textContent.toLowerCase();
        const matches = text.includes(query.toLowerCase());
        checkbox.style.display = matches ? 'block' : 'none';
    });
}

function toggleTag(tag, isSelected) {
    if (isSelected && !selectedTags.includes(tag)) {
        selectedTags.push(tag);
    } else if (!isSelected) {
        selectedTags = selectedTags.filter(t => t !== tag);
    }
    updateSelectedTagsDisplay();
}

function removeTag(tag) {
    selectedTags = selectedTags.filter(t => t !== tag);
    
    // Update checkbox state
    const checkbox = tagCategories.querySelector(`input[value="${tag}"]`);
    if (checkbox) {
        checkbox.checked = false;
    }
    
    updateSelectedTagsDisplay();
}

function resetTagFilters() {
    selectedTags = [];
    
    // Uncheck all checkboxes
    const checkboxes = tagCategories.querySelectorAll('input[type="checkbox"]');
    checkboxes.forEach(checkbox => {
        checkbox.checked = false;
    });
    
    updateSelectedTagsDisplay();
}

function applyTagFilters() {
    hideTagModal();
    applyCurrentFilters();
}

function showSessionSummary(sessionData) {
    // This will be expanded with a modal in the UI update
    console.log('Session Summary:', {
        duration: `${Math.floor(sessionData.duration / 60)}m ${sessionData.duration % 60}s`,
        cardsStudied: sessionData.cardsStudied,
        accuracy: `${sessionData.accuracy.toFixed(1)}%`,
        correct: sessionData.correctAnswers,
        incorrect: sessionData.incorrectAnswers
    });
}

// Statistics modal functions
function showStatsModal() {
    if (statsModal && progressTracker) {
        updateStatsDisplay();
        statsModal.classList.add('active');
        document.body.style.overflow = 'hidden';
    }
}

function hideStatsModal() {
    if (statsModal) {
        statsModal.classList.remove('active');
        document.body.style.overflow = '';
    }
}

function updateStatsDisplay() {
    if (!progressTracker) return;
    
    const summary = progressTracker.getProgressSummary();
    
    // Update global stats
    const totalCardsStudiedEl = document.getElementById('totalCardsStudied');
    const totalAttemptsEl = document.getElementById('totalAttempts');
    const averageAccuracyEl = document.getElementById('averageAccuracy');
    const studyStreakEl = document.getElementById('studyStreak');
    
    if (totalCardsStudiedEl) totalCardsStudiedEl.textContent = summary.stats.totalCards;
    if (totalAttemptsEl) totalAttemptsEl.textContent = summary.stats.totalAttempts;
    if (averageAccuracyEl) averageAccuracyEl.textContent = `${summary.stats.averageAccuracy.toFixed(1)}%`;
    if (studyStreakEl) studyStreakEl.textContent = summary.stats.studyStreak;
    
    // Update recent sessions
    const recentSessionsEl = document.getElementById('recentSessions');
    if (recentSessionsEl) {
        if (summary.recentSessions.length === 0) {
            recentSessionsEl.innerHTML = '<div class="stat-info">Aucune session récente</div>';
        } else {
            recentSessionsEl.innerHTML = summary.recentSessions.map(session => {
                const date = new Date(session.startTime);
                const dateStr = date.toLocaleDateString('fr-FR');
                const timeStr = date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
                
                return `
                    <div class="session-item">
                        <div>
                            <div class="session-date">${dateStr} à ${timeStr}</div>
                            <div class="session-stats">
                                <span>${session.cardsStudied} cartes</span>
                                <span>${Math.floor(session.duration / 60)}m ${session.duration % 60}s</span>
                            </div>
                        </div>
                        <div class="session-accuracy">${session.accuracy ? session.accuracy.toFixed(1) : 0}%</div>
                    </div>
                `;
            }).join('');
        }
    }
    
    // Update due cards count
    const dueCardsCountEl = document.getElementById('dueCardsCount');
    if (dueCardsCountEl) {
        dueCardsCountEl.textContent = summary.dueCardsCount;
    }
    
    // Update weak areas
    const weakAreasEl = document.getElementById('weakAreas');
    if (weakAreasEl) {
        const weakAreas = progressTracker.getWeakAreas(50, 5);
        if (weakAreas.length === 0) {
            weakAreasEl.innerHTML = '<div class="stat-info">Aucun point faible détecté</div>';
        } else {
            weakAreasEl.innerHTML = weakAreas.map(area => `
                <div class="weak-area-item">
                    <span>Carte #${area.id}</span>
                    <span class="weak-area-accuracy">${area.accuracy.toFixed(1)}% (${area.attempts} essais)</span>
                </div>
            `).join('');
        }
    }
}

function handleExportProgress() {
    if (!progressTracker) return;
    
    const data = progressTracker.exportProgress();
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `flashpharma_progress_${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
}

function handleClearProgress() {
    if (!progressTracker) return;
    
    if (confirm('Êtes-vous sûr de vouloir réinitialiser toutes vos statistiques ? Cette action est irréversible.')) {
        progressTracker.clearProgress();
        updateStatsDisplay();
        alert('Vos statistiques ont été réinitialisées.');
    }
}

// Sidebar functions
function showSidebar() {
    if (sidebar && sidebarOverlay) {
        sidebar.classList.add('active');
        sidebarOverlay.classList.add('active');
        document.body.style.overflow = 'hidden';
    }
}

function hideSidebar() {
    if (sidebar && sidebarOverlay) {
        sidebar.classList.remove('active');
        sidebarOverlay.classList.remove('active');
        document.body.style.overflow = '';
    }
}

function initializeApp() {
    // Initialize progress tracker
    if (window.ProgressTracker) {
        progressTracker = new window.ProgressTracker();
        
        // Log initial progress summary
        const summary = progressTracker.getProgressSummary();
        console.log('Progress loaded:', summary);
    }
    
    // Get DOM elements
    flashcardElement = document.getElementById('flashcard');
    questionElement = document.getElementById('question');
    answerElement = document.getElementById('answer');
    notKnownBtn = document.getElementById('notKnownBtn');
    recalledBtn = document.getElementById('recalledBtn');
    resetBtn = document.getElementById('resetBtn');
    currentCardElement = document.getElementById('currentCard');
    totalCardsElement = document.getElementById('totalCards');
    recalledCountElement = document.getElementById('recalledCount');
    themeToggle = document.getElementById('themeToggle');
    toggleSwitch = document.getElementById('toggleSwitch');
    
    // Get filter-related DOM elements
    filterBtn = document.getElementById('filterBtn');
    filterText = document.getElementById('filterText');
    tagModal = document.getElementById('tagModal');
    closeModal = document.getElementById('closeModal');
    tagSearch = document.getElementById('tagSearch');
    selectedTagsElement = document.getElementById('selectedTags');
    tagCategories = document.getElementById('tagCategories');
    resetFilters = document.getElementById('resetFilters');
    applyFilters = document.getElementById('applyFilters');
    
    // Get stats-related DOM elements
    statsBtn = document.getElementById('statsBtn');
    statsModal = document.getElementById('statsModal');
    closeStatsModal = document.getElementById('closeStatsModal');
    closeStatsBtn = document.getElementById('closeStatsBtn');
    exportProgress = document.getElementById('exportProgress');
    clearProgressBtn = document.getElementById('clearProgress');
    
    // Get sidebar-related DOM elements
    menuToggle = document.getElementById('menuToggle');
    sidebar = document.getElementById('sidebar');
    sidebarClose = document.getElementById('sidebarClose');
    sidebarOverlay = document.getElementById('sidebarOverlay');

    // Add flip event listener for flashcard
    if (flashcardElement) {
        flashcardElement.addEventListener('click', flipCard);
    }

    if (notKnownBtn) {
        notKnownBtn.addEventListener('click', () => nextCard(false));
    }

    if (recalledBtn) {
        recalledBtn.addEventListener('click', () => nextCard(true));
    }

    if (resetBtn) {
        resetBtn.addEventListener('click', resetGame);
    }

    if (themeToggle) {
        themeToggle.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            toggleTheme();
        });
    }
    
    // Filter event listeners
    if (filterBtn) {
        filterBtn.addEventListener('click', showTagModal);
    }
    
    if (closeModal) {
        closeModal.addEventListener('click', hideTagModal);
    }
    
    if (tagModal) {
        tagModal.addEventListener('click', (e) => {
            if (e.target === tagModal) {
                hideTagModal();
            }
        });
    }
    
    if (tagSearch) {
        tagSearch.addEventListener('input', (e) => {
            handleTagSearch(e.target.value);
        });
    }
    
    if (resetFilters) {
        resetFilters.addEventListener('click', resetTagFilters);
    }
    
    if (applyFilters) {
        applyFilters.addEventListener('click', applyTagFilters);
    }
    
    // Stats modal event listeners
    if (statsBtn) {
        statsBtn.addEventListener('click', showStatsModal);
    }
    
    if (closeStatsModal) {
        closeStatsModal.addEventListener('click', hideStatsModal);
    }
    
    if (closeStatsBtn) {
        closeStatsBtn.addEventListener('click', hideStatsModal);
    }
    
    if (statsModal) {
        statsModal.addEventListener('click', (e) => {
            if (e.target === statsModal) {
                hideStatsModal();
            }
        });
    }
    
    if (exportProgress) {
        exportProgress.addEventListener('click', handleExportProgress);
    }
    
    if (clearProgressBtn) {
        clearProgressBtn.addEventListener('click', handleClearProgress);
    }
    
    // Sidebar event listeners
    if (menuToggle) {
        menuToggle.addEventListener('click', showSidebar);
    }
    
    if (sidebarClose) {
        sidebarClose.addEventListener('click', hideSidebar);
    }
    
    if (sidebarOverlay) {
        sidebarOverlay.addEventListener('click', hideSidebar);
    }
    
    // Event delegation for dynamic tag elements
    document.addEventListener('click', (e) => {
        // Handle tag checkbox changes
        if (e.target.matches('.tag-checkbox input')) {
            const tag = e.target.value;
            const isSelected = e.target.checked;
            toggleTag(tag, isSelected);
        }
        
        // Handle remove tag buttons
        if (e.target.matches('.remove-tag')) {
            const tag = e.target.dataset.tag;
            removeTag(tag);
        }
    });

    // Initialize theme and load questions
    initTheme();
    loadQuestions();
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', initializeApp);