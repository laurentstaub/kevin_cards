// Flashcard data - Will be loaded from JSON file
let flashcards = [];

// DOM elements
const flashcardElement = document.getElementById('flashcard');
const questionElement = document.getElementById('question');
const answerElement = document.getElementById('answer');
const flipButton = document.getElementById('flip-btn');
const notKnownButton = document.getElementById('not-known-btn');
const recalledButton = document.getElementById('recalled-btn');
const currentCardElement = document.getElementById('current-card');
const totalCardsElement = document.getElementById('total-cards');
const recalledCountElement = document.getElementById('recalled-count');
const themeToggleInput = document.getElementById('theme-toggle-input');

// State variables
let currentCardIndex = 0;
let isFlipped = false;
let recalledCount = 0;

// Marked configuration for markdown rendering
marked.setOptions({
    breaks: true,        // Convertit les sauts de ligne simples en <br>
    gfm: true,          // Active GitHub Flavored Markdown
    sanitize: false,    // Permet le HTML dans le Markdown
    smartLists: true,   // Améliore le rendu des listes
    smartypants: true   // Améliore la typographie
});


function initFlashcards() {
    // Set total cards count
    totalCardsElement.textContent = flashcards.length;
    // Initialize recalled count
    recalledCountElement.textContent = recalledCount;
    showCard(currentCardIndex);
    updateButtonStates();
}

function showCard(index) {
    const card = flashcards[index];
    questionElement.innerHTML = marked.parse(card.question);
    answerElement.innerHTML = marked.parse(card.answer);

    currentCardElement.textContent = index + 1;

    // Reset flip state
    isFlipped = false;
    flashcardElement.classList.remove('flipped');
}

// Flip the card
function flipCard() {
    isFlipped = !isFlipped;
    if (isFlipped) {
        flashcardElement.classList.add('flipped');
    } else {
        flashcardElement.classList.remove('flipped');
    }
}

function nextCard(isRecalled) {
    if (currentCardIndex < flashcards.length - 1) {
        // If the card was recalled, increment the counter
        if (isRecalled) {
            recalledCount++;
            recalledCountElement.textContent = recalledCount;
        }

        // Move to the next card
        currentCardIndex++;
        showCard(currentCardIndex);
        updateButtonStates();
    }
}

function handleNotKnown() {
    nextCard(false);
}

function handleRecalled() {
    nextCard(true);
}

function updateButtonStates() {
    // Disable both buttons if we're at the last card
    const isLastCard = currentCardIndex === flashcards.length - 1;
    notKnownButton.disabled = isLastCard;
    recalledButton.disabled = isLastCard;
}

// Event listeners
flashcardElement.addEventListener('click', flipCard);
notKnownButton.addEventListener('click', handleNotKnown);
recalledButton.addEventListener('click', handleRecalled);

// Theme toggle functionality
function initTheme() {
    // Check if user has a saved theme preference
    const savedTheme = localStorage.getItem('theme');

    if (savedTheme === 'light') {
        // If light theme was saved, switch to light theme
        document.documentElement.classList.add('light-theme');
        themeToggleInput.checked = true;
    } else {
        // Default is dark theme (already set in CSS)
        themeToggleInput.checked = false;
    }
}

function toggleTheme() {
    if (themeToggleInput.checked) {
        document.documentElement.classList.add('light-theme');
        localStorage.setItem('theme', 'light');
    } else {
        document.documentElement.classList.remove('light-theme');
        localStorage.setItem('theme', 'dark');
    }
}

// Event listener for theme toggle
themeToggleInput.addEventListener('change', toggleTheme);

// Function to load questions from JSON file
async function loadQuestions() {
    try {
        const response = await fetch('zz_questions/00_questions.json');
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        const allFlashcards = data.flashcards;
        const selectedFlashcards = getRandomFlashcards(allFlashcards, 10);

        // Format the flashcards to match the expected structure
        flashcards = selectedFlashcards.map(card => ({
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
    // Make a copy of the array to avoid modifying the original
    const shuffled = [...array];

    // Fisher-Yates shuffle algorithm
    for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }

    // Return the first n elements
    return shuffled.slice(0, n);
}

// Initialize when the DOM is fully loaded
document.addEventListener('DOMContentLoaded', function() {
    loadQuestions();
    initTheme();
});
