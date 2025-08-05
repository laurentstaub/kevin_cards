let flashcards = [];

// State variables
let currentCardIndex = 0;
let isFlipped = false;
let recalledCount = 0;

// DOM elements
let flashcardElement, questionElement, answerElement;
let notKnownBtn, recalledBtn, currentCardElement, totalCardsElement, recalledCountElement;
let themeToggle, toggleSwitch;

function initFlashcards() {
    totalCardsElement.textContent = String(flashcards.length);
    recalledCountElement.textContent = String(recalledCount);
    showCard(currentCardIndex);
    updateButtonStates();
}

function showCard(index) {
    const card = flashcards[index];

    const questionContent = `
        <div class="card-header">
            <div class="question-indicator">Question</div>
            <div class="tags-container">
                ${card.tags.map(tag => `<span class="tag">${tag}</span>`).join('')}
            </div>
        </div>
        ${card.question}`;

    const answerContent = `
        <div class="card-header">
            <div class="answer-indicator">Réponse</div>
            <div class="tags-container">
                ${card.tags.map(tag => `<span class="tag">${tag}</span>`).join('')}
            </div>
        </div>
        ${card.answer}`;

    questionElement.innerHTML = questionContent;
    answerElement.innerHTML = answerContent;
    currentCardElement.textContent = index + 1;

    // Reset card flip state
    isFlipped = false;
    flashcardElement.classList.remove('flipped');
}

function flipCard() {
    isFlipped = !isFlipped;
    flashcardElement.classList.toggle('flipped', isFlipped);
}

function nextCard(isRecalled) {
    if (currentCardIndex < flashcards.length - 1) {
        if (isRecalled) {
            recalledCount++;
            recalledCountElement.textContent = String(recalledCount);
        }

        currentCardIndex++;
        showCard(currentCardIndex);
        updateButtonStates();
    }
}

function updateButtonStates() {
    const isLastCard = currentCardIndex === flashcards.length - 1;
    notKnownBtn.disabled = isLastCard;
    recalledBtn.disabled = isLastCard;
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
        const response = await fetch('/zz_questions/00_questions.json');
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        const selectedFlashcards = getRandomFlashcards(data.flashcards, 10);

        flashcards = selectedFlashcards.map(card => ({
            tags: card.tags,
            question: card.question,
            answer: card.answer
        }));

        initFlashcards();
    } catch (error) {
        console.error('Error loading questions:', error);
        // Fallback to empty array if loading fails
        flashcards = [];
        initFlashcards();
    }
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

function initializeApp() {
    // Get DOM elements
    flashcardElement = document.getElementById('flashcard');
    questionElement = document.getElementById('question');
    answerElement = document.getElementById('answer');
    notKnownBtn = document.getElementById('notKnownBtn');
    recalledBtn = document.getElementById('recalledBtn');
    currentCardElement = document.getElementById('currentCard');
    totalCardsElement = document.getElementById('totalCards');
    recalledCountElement = document.getElementById('recalledCount');
    themeToggle = document.getElementById('themeToggle');
    toggleSwitch = document.getElementById('toggleSwitch');

    // Add event listeners
    if (flashcardElement) {
        flashcardElement.addEventListener('click', flipCard);
    }

    if (notKnownBtn) {
        notKnownBtn.addEventListener('click', () => nextCard(false));
    }

    if (recalledBtn) {
        recalledBtn.addEventListener('click', () => nextCard(true));
    }

    if (themeToggle) {
        themeToggle.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            toggleTheme();
        });
    }

    // Initialize theme and load questions
    initTheme();
    loadQuestions();
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', initializeApp);