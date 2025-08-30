let flashcards = [];
let allFlashcards = [];
let questionData = null;

// State variables
let currentCardIndex = 0;
let isFlipped = false;
let recalledCount = 0;

// Session state
let currentSession = {
    questions: [],
    config: null
};

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
let startRevisionBtn, revisionModal, closeRevisionModal, revisionModes, revisionCardsList, revisionCardsContainer, cancelRevision, startRevision;

// Revision state
let isRevisionMode = false;
let revisionCards = [];
let selectedRevisionCards = [];

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
    
    // Safety check
    if (!card) {
        console.error('No card found at index', index);
        return;
    }

    // Reset flip state for new card
    isFlipped = false;
    flashcardElement.classList.remove('flipped');

    // Handle multiple sources with clickable links - with null safety
    let sourceHtml;
    if (card.source && Array.isArray(card.source)) {
        sourceHtml = card.source.map(source => 
            source && source.url ? 
                `<a href="${source.url}" target="_blank" rel="noopener noreferrer" class="source-link">${source.text || 'Source externe'}</a>` : 
                (source && source.text) || 'Source externe'
        ).join(', ');
    } else if (card.source && typeof card.source === 'object') {
        sourceHtml = card.source.url ? 
            `<a href="${card.source.url}" target="_blank" rel="noopener noreferrer" class="source-link">${card.source.text || 'Source externe'}</a>` : 
            card.source.text || 'Source externe';
    } else if (card.source) {
        sourceHtml = card.source;
    } else {
        sourceHtml = 'Pharmacologie générale';
    }

    // Safe tags handling
    const tags = card.tags || [];
    const tagsHtml = tags.map(tag => `<span class="tag">${tag || 'Tag'}</span>`).join('');

    const questionContent = `
        <div class="card-header">
            <div class="question-indicator">Question</div>
            <div class="tags-container">
                ${tagsHtml}
            </div>
        </div>
        ${card.question || 'Question non disponible'}
        <div class="card-source">
            <span class="source-label">Source:</span> <span class="source-text">${sourceHtml}</span>
        </div>`;

    const answerContent = `
        <div class="card-header">
            <div class="answer-indicator">Réponse</div>
            <div class="tags-container">
                ${tagsHtml}
            </div>
        </div>
        ${card.answer || 'Réponse non disponible'}
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
                currentCard.tags || []
            );
        }
        
        if (isRecalled) {
            recalledCount++;
            recalledCountElement.textContent = String(recalledCount);
        }
        
        // Increment index to indicate we're past the last card
        currentCardIndex++;
        
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
    const isAfterLastCard = currentCardIndex >= flashcards.length;
    notKnownBtn.disabled = isAfterLastCard;
    recalledBtn.disabled = isAfterLastCard;
    
    // Show session completion actions when we finish all cards
    const sessionCompleteActions = document.getElementById('sessionCompleteActions');
    if (sessionCompleteActions) {
        sessionCompleteActions.style.display = isAfterLastCard ? 'flex' : 'none';
    }
    
    // Hide the main action buttons when session is complete
    if (isAfterLastCard) {
        notKnownBtn.style.display = 'none';
        recalledBtn.style.display = 'none';
    } else {
        notKnownBtn.style.display = 'flex';
        recalledBtn.style.display = 'flex';
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
        const response = await fetch('/api/questions/published?limit=1000');
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        questionData = {
            metadata: data.metadata,
            flashcards: data.flashcards
        };
        
        allFlashcards = data.flashcards.map(card => ({
            id: card.id,
            tags: card.tags ? card.tags.map(tag => typeof tag === 'string' ? tag : tag.name) : [],
            question: card.question, // Already rendered HTML from API
            answer: card.answer,     // Already rendered HTML from API
            difficulty: card.difficulty || 'medium',
            source: extractSource(card.sources)
        }));


        // One-time reset of all progress data due to ID migration
        // Remove this block after users have refreshed their browsers
        if (progressTracker && allFlashcards.length > 0) {
            const storedProgress = localStorage.getItem('flashpharma_progress');
            if (storedProgress) {
                try {
                    const progress = JSON.parse(storedProgress);
                    // Check if we have old data (cards with low IDs that don't exist anymore)
                    const cardIds = Object.keys(progress.cards || {}).map(id => parseInt(id));
                    const hasOldData = cardIds.some(id => id < 50); // Arbitrary threshold
                    
                    if (hasOldData) {
                        console.log('Detected old progress data, performing one-time reset...');
                        progressTracker.resetAllProgress();
                    } else {
                        // Normal cleanup for newer data
                        const currentCardIds = allFlashcards.map(card => card.id);
                        progressTracker.cleanOrphanedProgress(currentCardIds);
                    }
                } catch (e) {
                    // If parsing fails, just reset everything
                    console.log('Invalid progress data, resetting...');
                    progressTracker.resetAllProgress();
                }
            }
        }

        // Don't auto-start questions, let session setup handle it
        console.log(`Loaded ${allFlashcards.length} questions from database`);
        
    } catch (error) {
        console.error('Error loading questions:', error);
        flashcards = [];
        allFlashcards = [];
    }
}

// New function to load custom questions from session setup
function loadCustomQuestions(questions) {
    flashcards = questions; // Use the exact questions provided by session setup
    isFilterActive = false; // Reset filter state since session setup handles filtering
    initFlashcards();
}

// Create a global flashcard app object for session setup to use
window.flashcardApp = {
    loadCustomQuestions: loadCustomQuestions,
    getAllQuestions: () => allFlashcards,
    resetQuestions: () => {
        flashcards = [...allFlashcards];
        currentCardIndex = 0;
        recalledCount = 0;
        isFlipped = false;
    },
    initFlashcards: initFlashcards
};

window.currentSession = currentSession;

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
    const shuffled = shuffleArray(array);
    return shuffled.slice(0, count);
}

function shuffleArray(array) {
    const shuffled = [...array];
    // Fisher-Yates shuffle algorithm
    for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
}

function resetGame() {
    currentCardIndex = 0;
    isFlipped = false;
    recalledCount = 0;

    if (progressTracker && progressTracker.currentSession) {
        progressTracker.endSession();
    }

    applyCurrentFilters();
}

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
    
    // Update question count display
    updateQuestionCountDisplay();
}

function updateQuestionCountDisplay() {
    const stickyCountElement = document.getElementById('stickyQuestionCount');
    if (!stickyCountElement || !allFlashcards) return;
    
    let availableCount, selectedCount = 10; // Default selected count
    
    // Get the selected count from the active count button
    const activeCountBtn = document.querySelector('.count-btn.active');
    if (activeCountBtn) {
        const count = activeCountBtn.dataset.count;
        selectedCount = count === 'all' ? 'toutes les' : parseInt(count);
    }
    
    if (selectedTags.length === 0) {
        // No tags selected - show total questions vs selected
        availableCount = allFlashcards.length;
        if (typeof selectedCount === 'number') {
            stickyCountElement.textContent = `${Math.min(selectedCount, availableCount)} questions sélectionnées sur ${availableCount} disponibles`;
        } else {
            stickyCountElement.textContent = `${selectedCount} questions sélectionnées sur ${availableCount} disponibles`;
        }
    } else {
        // Calculate questions matching selected tags (OR operation)
        const filteredCards = allFlashcards.filter(card => 
            selectedTags.some(tag => card.tags && card.tags.includes(tag))
        );
        availableCount = filteredCards.length;
        
        if (availableCount === 0) {
            stickyCountElement.textContent = 'Aucune question trouvée avec ces tags';
        } else {
            if (typeof selectedCount === 'number') {
                stickyCountElement.textContent = `${Math.min(selectedCount, availableCount)} questions sélectionnées sur ${availableCount} disponibles`;
            } else {
                stickyCountElement.textContent = `${selectedCount} questions sélectionnées sur ${availableCount} disponibles`;
            }
        }
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
    
    // Update weak cards count and revision button
    const weakCardsCountEl = document.getElementById('weakCardsCount');
    const startRevisionBtnEl = document.getElementById('startRevisionBtn');
    const revisionBtnTextEl = document.getElementById('revisionBtnText');
    
    // Get weak cards (accuracy < 50%)
    const weakCards = progressTracker.getWeakAreas(50);
    
    if (weakCardsCountEl) {
        weakCardsCountEl.textContent = weakCards.length;
    }
    
    // Show/hide revision button based on weak cards
    if (startRevisionBtnEl) {
        if (weakCards.length > 0) {
            startRevisionBtnEl.style.display = 'flex';
            if (revisionBtnTextEl) {
                revisionBtnTextEl.textContent = `Retravailler ${weakCards.length} carte${weakCards.length > 1 ? 's' : ''}`;
            }
        } else {
            startRevisionBtnEl.style.display = 'none';
        }
    }
    
    // Update weak areas with question previews
    const weakAreasEl = document.getElementById('weakAreas');
    if (weakAreasEl) {
        const weakAreas = progressTracker.getWeakAreas(50, 10); // Show top 10 weak cards
        if (weakAreas.length === 0) {
            weakAreasEl.innerHTML = '<div class="stat-info">Aucune carte faible détectée (toutes > 50% de réussite)</div>';
        } else {
            weakAreasEl.innerHTML = weakAreas.map(area => {
                const card = allFlashcards.find(c => c.id === parseInt(area.id));
                if (!card) return ''; // Skip cards not found (shouldn't happen after reset)
                
                const questionPreview = extractTextFromHtml(card.question).substring(0, 80) + '...';
                
                return `
                    <div class="weak-area-item">
                        <div class="weak-area-question">${questionPreview}</div>
                        <div class="weak-area-stats">
                            <span class="weak-area-accuracy ${area.accuracy < 30 ? 'low' : area.accuracy < 50 ? 'medium' : 'high'}">
                                ${area.accuracy.toFixed(0)}% de réussite
                            </span>
                            <span class="weak-area-attempts">${area.attempts} essai${area.attempts > 1 ? 's' : ''}</span>
                        </div>
                    </div>
                `;
            }).filter(Boolean).join('');
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
        progressTracker.resetAllProgress();
        updateStatsDisplay();
        alert('Vos statistiques ont été complètement réinitialisées.');
    }
}

// Revision functions
function showRevisionModal() {
    if (revisionModal && progressTracker) {
        // Load difficult cards
        loadRevisionCards();
        revisionModal.classList.add('active');
        document.body.style.overflow = 'hidden';
    }
}

function hideRevisionModal() {
    if (revisionModal) {
        revisionModal.classList.remove('active');
        document.body.style.overflow = '';
        
        // Reset revision state
        selectedRevisionCards = [];
        revisionCards = [];
    }
}

function loadRevisionCards() {
    if (!progressTracker) return;
    
    // Get weak cards (accuracy < 50%)
    const weakCards = progressTracker.getWeakAreas(50);
    
    // Match weak cards with actual flashcards
    revisionCards = weakCards.map(weakCard => {
        const card = allFlashcards.find(c => c.id === parseInt(weakCard.id));
        if (card) {
            return {
                ...card,
                accuracy: weakCard.accuracy || 0,
                attempts: weakCard.attempts || 0,
                mastery: weakCard.mastery || 0
            };
        }
        return null;
    }).filter(Boolean);
    
    // Sort by accuracy (worst first)
    revisionCards.sort((a, b) => a.accuracy - b.accuracy);
    
    // Update radio button descriptions with actual counts
    updateRevisionModeDescriptions();
    
    // Check if custom mode was selected and populate card list
    handleRevisionModeChange();
}

function updateRevisionModeDescriptions() {
    const allModeLabel = document.querySelector('input[value="all"] + .revision-mode-label small');
    const priorityModeLabel = document.querySelector('input[value="priority"] + .revision-mode-label small');
    
    if (allModeLabel) {
        allModeLabel.textContent = `Toutes les ${revisionCards.length} cartes faibles`;
    }
    
    if (priorityModeLabel) {
        const priorityCount = Math.min(revisionCards.length, 10);
        priorityModeLabel.textContent = `Les ${priorityCount} cartes avec le plus faible taux`;
    }
}

function handleRevisionModeChange() {
    const selectedMode = document.querySelector('input[name="revisionMode"]:checked')?.value || 'all';
    
    if (selectedMode === 'custom') {
        revisionCardsList.style.display = 'block';
        populateRevisionCardsList();
    } else {
        revisionCardsList.style.display = 'none';
    }
}

function populateRevisionCardsList() {
    if (!revisionCardsContainer) return;
    
    revisionCardsContainer.innerHTML = revisionCards.map((card, index) => {
        const preview = extractTextFromHtml(card.question);
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
    
    // Initialize all cards as selected
    selectedRevisionCards = [...revisionCards];
}

function extractTextFromHtml(html) {
    const div = document.createElement('div');
    div.innerHTML = html;
    return div.textContent || div.innerText || '';
}

function handleRevisionCardSelection(cardId, isSelected) {
    const card = revisionCards.find(c => c.id === parseInt(cardId));
    if (!card) return;
    
    if (isSelected && !selectedRevisionCards.find(c => c.id === card.id)) {
        selectedRevisionCards.push(card);
    } else if (!isSelected) {
        selectedRevisionCards = selectedRevisionCards.filter(c => c.id !== card.id);
    }
}

function startRevisionSession() {
    const selectedMode = document.querySelector('input[name="revisionMode"]:checked')?.value || 'all';
    let cardsToStudy = [];
    
    switch (selectedMode) {
        case 'all':
            cardsToStudy = [...revisionCards];
            break;
        case 'priority':
            // Sort by accuracy (lowest first) and take top 10
            cardsToStudy = revisionCards
                .sort((a, b) => a.accuracy - b.accuracy)
                .slice(0, 10);
            break;
        case 'custom':
            cardsToStudy = [...selectedRevisionCards];
            break;
    }
    
    if (cardsToStudy.length === 0) {
        alert('Aucune carte sélectionnée pour la révision.');
        return;
    }
    
    // Set up revision session
    isRevisionMode = true;
    flashcards = cardsToStudy;
    currentCardIndex = 0;
    recalledCount = 0;
    isFlipped = false;
    
    // Hide revision modal and start session
    hideRevisionModal();
    hideStatsModal();
    
    // Start new progress session
    if (progressTracker) {
        progressTracker.startSession();
    }
    
    // Initialize flashcards for revision
    totalCardsElement.textContent = String(flashcards.length);
    recalledCountElement.textContent = String(recalledCount);
    showCard(currentCardIndex);
    updateButtonStates();
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

// Session completion functions
function repeatSameQuestions() {
    // Use exact same questions in same order
    currentCardIndex = 0;
    recalledCount = 0;
    isFlipped = false;
    
    // End current session if active
    if (progressTracker && progressTracker.currentSession) {
        progressTracker.endSession();
    }
    
    // Start new progress session
    if (progressTracker) {
        progressTracker.startSession();
    }
    
    // Reset display and start again
    totalCardsElement.textContent = String(flashcards.length);
    recalledCountElement.textContent = String(recalledCount);
    showCard(currentCardIndex);
    updateButtonStates();
}

async function startSimilarSession() {
    // Create new session with same criteria but fetch fresh questions from database
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

        // Set high limit to get all matching questions
        params.set('limit', '1000');
        
        const response = await fetch(`/api/questions?${params}`);
        const data = await response.json();
        
        if (!data.questions || data.questions.length === 0) {
            throw new Error('No questions found with similar criteria');
        }

        // Process questions
        const questions = data.questions.map(card => ({
            id: card.id,
            tags: card.tags ? card.tags.map(tag => typeof tag === 'string' ? tag : tag.name) : [],
            question: card.questionHtml || card.questionText || card.question,
            answer: card.answerHtml || card.answerText || card.answer,
            difficulty: card.difficulty || 'medium',
            source: extractSource(card.sources)
        }));

        // Shuffle and select questions (same count as original session)
        const shuffledQuestions = shuffleArray(questions);
        const selectedCount = currentSession.config.count === 'all' ? 
            shuffledQuestions.length : 
            Math.min(currentSession.config.count, shuffledQuestions.length);
        const selectedQuestions = shuffledQuestions.slice(0, selectedCount);

        // Update current session with new questions but keep same config
        currentSession.questions = selectedQuestions;
        flashcards = selectedQuestions;
        
        // Reset session state
        currentCardIndex = 0;
        recalledCount = 0;
        isFlipped = false;
        
        // End current session if active
        if (progressTracker && progressTracker.currentSession) {
            progressTracker.endSession();
        }
        
        // Start new progress session
        if (progressTracker) {
            progressTracker.startSession();
        }
        
        // Initialize new session
        totalCardsElement.textContent = String(flashcards.length);
        recalledCountElement.textContent = String(recalledCount);
        showCard(currentCardIndex);
        updateButtonStates();
        
        console.log(`Started similar session with ${selectedQuestions.length} new questions`);

    } catch (error) {
        console.error('Failed to start similar session:', error);
        alert('Erreur lors du chargement de la session similaire. Veuillez réessayer.');
    }
}

function startNewSession() {
    // End current session if active
    if (progressTracker && progressTracker.currentSession) {
        progressTracker.endSession();
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
    if (window.sessionSetup) {
        // Optionally reset to default values or keep last configuration
        window.sessionSetup.updateQuestionCount();
        window.sessionSetup.updatePreview();
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
    
    // Get revision-related DOM elements
    startRevisionBtn = document.getElementById('startRevisionBtn');
    revisionModal = document.getElementById('revisionModal');
    closeRevisionModal = document.getElementById('closeRevisionModal');
    revisionCardsList = document.getElementById('revisionCardsList');
    revisionCardsContainer = document.getElementById('revisionCardsContainer');
    cancelRevision = document.getElementById('cancelRevision');
    startRevision = document.getElementById('startRevision');

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
    
    // Session completion event listeners
    const repeatSameBtn = document.getElementById('repeatSameBtn');
    const similarSessionBtn = document.getElementById('similarSessionBtn');
    const newSessionBtn = document.getElementById('newSessionBtn');
    
    if (repeatSameBtn) {
        repeatSameBtn.addEventListener('click', repeatSameQuestions);
    }
    
    if (similarSessionBtn) {
        similarSessionBtn.addEventListener('click', startSimilarSession);
    }
    
    if (newSessionBtn) {
        newSessionBtn.addEventListener('click', startNewSession);
    }
    
    // Revision modal event listeners
    if (startRevisionBtn) {
        startRevisionBtn.addEventListener('click', showRevisionModal);
    }
    
    if (closeRevisionModal) {
        closeRevisionModal.addEventListener('click', hideRevisionModal);
    }
    
    if (cancelRevision) {
        cancelRevision.addEventListener('click', hideRevisionModal);
    }
    
    if (startRevision) {
        startRevision.addEventListener('click', startRevisionSession);
    }
    
    if (revisionModal) {
        revisionModal.addEventListener('click', (e) => {
            if (e.target === revisionModal) {
                hideRevisionModal();
            }
        });
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
    
    // Event delegation for dynamic elements
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
        
        // Handle revision card checkbox changes
        if (e.target.matches('.revision-card-checkbox')) {
            const cardId = e.target.dataset.cardId;
            const isSelected = e.target.checked;
            handleRevisionCardSelection(cardId, isSelected);
        }
    });
    
    // Event delegation for revision mode changes
    document.addEventListener('change', (e) => {
        if (e.target.matches('input[name="revisionMode"]')) {
            handleRevisionModeChange();
        }
    });

    // Initialize theme and load questions
    initTheme();
    loadQuestions();
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', initializeApp);