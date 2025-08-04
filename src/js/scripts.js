let flashcards = [];

// DOM elements
const flashcardElement = document.getElementById('flashcard');
const questionElement = document.getElementById('question');
const answerElement = document.getElementById('answer');
const notKnownBtn = document.getElementById('notKnownBtn');
const recalledBtn = document.getElementById('recalledBtn');
const currentCardElement = document.getElementById('current-card');
const totalCardsElement = document.getElementById('total-cards');
const recalledCountElement = document.getElementById('recalled-count');
const themeToggle = document.getElementById('themeToggle');

// State variables
let currentCardIndex = 0;
let isFlipped = false;
let recalledCount = 0;
let isLightTheme = false;

function initFlashcards() {
    totalCardsElement.textContent = String(flashcards.length);
    recalledCountElement.textContent = String(recalledCount);
    showCard(currentCardIndex);
    updateButtonStates();
}

function showCard(index) {
    const card = flashcards[index];

    const tags = `
        <div class="card-header">
            <div class="question-indicator">Question</div>
            <div class="tags-container" id="questionTags">
                ${card.tags.map(tag => `<span class="tag">${tag}</span>`).join('')}
            </div>
        </div>`;

    const tagsBack = `
        <div class="card-header">
            <div class="answer-indicator">Réponse</div>
            <div class="tags-container" id="answerTags">
                ${card.tags.map(tag => `<span class="tag">${tag}</span>`).join('')}
            </div>
        </div>`;

    questionElement.innerHTML = tags + card.question;
    answerElement.innerHTML = tagsBack + card.answer;

    currentCardElement.textContent = index + 1;

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
            recalledCountElement.textContent = recalledCount;
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

// Theme toggle functions
function initTheme() {
    document.documentElement.setAttribute('data-theme', 'dark');
    const toggleSwitch = document.getElementById('toggleSwitch');
    if (toggleSwitch) {
        toggleSwitch.classList.remove('active');
    }
}

function toggleTheme() {
    isLightTheme = !isLightTheme;
    const toggleSwitch = document.getElementById('toggleSwitch');

    if (isLightTheme) {
        document.documentElement.setAttribute('data-theme', 'light');
        if (toggleSwitch) toggleSwitch.classList.add('active');
    } else {
        document.documentElement.setAttribute('data-theme', 'dark');
        if (toggleSwitch) toggleSwitch.classList.remove('active');
    }
}

// Function to load questions from JSON file
async function loadQuestions() {
    try {
        const response = await fetch('/zz_questions/00_questions.json');
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        const allFlashcards = data.flashcards;
        const selectedFlashcards = getRandomFlashcards(allFlashcards, 10);

        flashcards = selectedFlashcards.map(card => ({
            tags: card.tags,
            question: card.question,
            answer: card.answer
        }));

        initFlashcards();
    } catch (error) {
        console.error('Error loading questions:', error);
        flashcards = [];
        initFlashcards();
    }
}

// Function to randomly select n flashcards from an array
function getRandomFlashcards(array, n) {
    const shuffled = [...array];

    // Fisher-Yates shuffle algorithm
    for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }

    return shuffled.slice(0, n);
}

// Event listeners
flashcardElement.addEventListener('click', flipCard);
notKnownBtn.addEventListener('click', () => nextCard(false));
recalledBtn.addEventListener('click', () => nextCard(true));
themeToggle.addEventListener('click', toggleTheme);

// Initialize when the DOM is fully loaded
document.addEventListener('DOMContentLoaded', function() {
    loadQuestions();
    initTheme();
});