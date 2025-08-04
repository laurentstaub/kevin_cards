
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
const themeToggleInput = document.getElementById('theme-toggle-input');
const themeToggle = document.getElementById('themeToggle');

// State variables
let currentCardIndex = 0;
let isFlipped = false;
let recalledCount = 0;

function initFlashcards() {
    totalCardsElement.textContent = String(flashcards.length);
    // Initialize recalled count
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
    // Disable both buttons if we're at the last card
    const isLastCard = currentCardIndex === flashcards.length - 1;
    notKnownBtn.disabled = isLastCard;
    recalledBtn.disabled = isLastCard;
}

// Event listeners
flashcardElement.addEventListener('click', flipCard);
notKnownBtn.addEventListener('click', () => nextCard(false));
recalledBtn.addEventListener('click', () => nextCard(true));

// Theme toggle
function initTheme() {
    const savedTheme = localStorage.getItem('theme');
    const toggleSwitch = document.getElementById('toggleSwitch');

    if (savedTheme === 'light') {
        document.documentElement.setAttribute('data-theme', 'light');
        themeToggleInput.checked = true;
        toggleSwitch.classList.add('active');
    } else {
        document.documentElement.removeAttribute('data-theme');
        themeToggleInput.checked = false;
        toggleSwitch.classList.remove('active');
    }
}

function toggleTheme() {
    const toggleSwitch = document.getElementById('toggleSwitch');

    if (themeToggleInput.checked) {
        document.documentElement.setAttribute('data-theme', 'light');
        localStorage.setItem('theme', 'light');
        toggleSwitch.classList.add('active');
    } else {
        document.documentElement.removeAttribute('data-theme');
        localStorage.setItem('theme', 'dark');
        toggleSwitch.classList.remove('active');
    }
}

// Event listeners for theme toggle
themeToggleInput.addEventListener('change', toggleTheme);

// Add click event to the theme toggle container
themeToggle.addEventListener('click', function(e) {
    // Don't handle clicks on the input itself, let the browser handle those
    if (e.target === themeToggleInput) {
        return;
    }

    // Prevent default behavior
    e.preventDefault();
    // Toggle the checked state
    themeToggleInput.checked = !themeToggleInput.checked;
    // Call the toggle theme function
    toggleTheme();
});

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

        // Format the flashcards to match the expected structure
        flashcards = selectedFlashcards.map(card => ({
            tags: card.tags,
            question: card.question,
            answer: card.answer
        }));

        initFlashcards();
    } catch (error) {
        console.error('Error loading questions:', error);
        // Fallback to empty array if there's an error
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

// Initialize when the DOM is fully loaded
document.addEventListener('DOMContentLoaded', function() {
    loadQuestions();
    initTheme();
});
