// Flashcard data - Questions and answers for pharmacists in French
const flashcards = [
    {
        question: "Quel est le mécanisme d'action des inhibiteurs de l'enzyme de conversion de l'angiotensine (IEC)?",
        answer: "Les IEC bloquent la conversion de l'angiotensine I en angiotensine II, réduisant ainsi la vasoconstriction et la rétention d'eau et de sodium, ce qui diminue la pression artérielle."
    },
    {
        question: "Quels sont les effets indésirables courants des statines?",
        answer: "Myalgies, élévation des enzymes hépatiques, risque de rhabdomyolyse, troubles gastro-intestinaux, et rarement, neuropathie périphérique."
    },
    {
        question: "Quelle est la différence entre un anticoagulant et un antiagrégant plaquettaire?",
        answer: "Les anticoagulants (comme la warfarine) inhibent la cascade de coagulation, tandis que les antiagrégants plaquettaires (comme l'aspirine) empêchent l'agrégation des plaquettes."
    },
    {
        question: "Quelles sont les contre-indications principales des bêta-bloquants?",
        answer: "Asthme sévère, BPCO sévère, bloc auriculo-ventriculaire de 2ème ou 3ème degré, bradycardie sévère, insuffisance cardiaque décompensée."
    },
    {
        question: "Comment fonctionne la metformine dans le traitement du diabète de type 2?",
        answer: "La metformine réduit la production hépatique de glucose, améliore la sensibilité à l'insuline dans les tissus périphériques et diminue l'absorption intestinale du glucose."
    },
    {
        question: "Quels sont les principaux antibiotiques de la classe des macrolides?",
        answer: "Érythromycine, azithromycine, clarithromycine, roxithromycine, et spiramycine."
    },
    {
        question: "Quelles sont les interactions médicamenteuses importantes avec la warfarine?",
        answer: "AINS, antibiotiques (notamment les quinolones), antifongiques azolés, amiodarone, et de nombreux médicaments à base de plantes comme le millepertuis."
    },
    {
        question: "Quels sont les symptômes d'une réaction anaphylactique?",
        answer: "Urticaire, œdème (notamment des lèvres, de la langue et de la gorge), difficultés respiratoires, hypotension, tachycardie, et potentiellement choc et perte de conscience."
    },
    {
        question: "Comment les corticostéroïdes inhalés agissent-ils dans l'asthme?",
        answer: "Ils réduisent l'inflammation des voies respiratoires, diminuent la production de mucus, et réduisent l'hyperréactivité bronchique."
    },
    {
        question: "Quelles sont les principales classes d'antidépresseurs?",
        answer: "Inhibiteurs sélectifs de la recapture de la sérotonine (ISRS), inhibiteurs de la recapture de la sérotonine et de la noradrénaline (IRSN), antidépresseurs tricycliques, inhibiteurs de la monoamine oxydase (IMAO)."
    }
];

// DOM elements
const flashcardElement = document.getElementById('flashcard');
const questionElement = document.getElementById('question');
const answerElement = document.getElementById('answer');
const prevButton = document.getElementById('prev-btn');
const flipButton = document.getElementById('flip-btn');
const nextButton = document.getElementById('next-btn');
const currentCardElement = document.getElementById('current-card');
const totalCardsElement = document.getElementById('total-cards');
const themeToggleInput = document.getElementById('theme-toggle-input');

// State variables
let currentCardIndex = 0;
let isFlipped = false;

function initFlashcards() {
    // Set total cards count
    totalCardsElement.textContent = flashcards.length;
    showCard(currentCardIndex);
    updateButtonStates();
}

function showCard(index) {
    const card = flashcards[index];
    questionElement.innerHTML = `<p>${card.question}</p>`;
    answerElement.innerHTML = `<p>${card.answer}</p>`;
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

function prevCard() {
    if (currentCardIndex > 0) {
        currentCardIndex--;
        showCard(currentCardIndex);
        updateButtonStates();
    }
}

function nextCard() {
    if (currentCardIndex < flashcards.length - 1) {
        currentCardIndex++;
        showCard(currentCardIndex);
        updateButtonStates();
    }
}

function updateButtonStates() {
    prevButton.disabled = currentCardIndex === 0;
    nextButton.disabled = currentCardIndex === flashcards.length - 1;
}

// Event listeners
flashcardElement.addEventListener('click', flipCard);
flipButton.addEventListener('click', flipCard);
prevButton.addEventListener('click', prevCard);
nextButton.addEventListener('click', nextCard);

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
        // Switch to light theme
        document.documentElement.classList.add('light-theme');
        localStorage.setItem('theme', 'light');
    } else {
        // Switch to dark theme
        document.documentElement.classList.remove('light-theme');
        localStorage.setItem('theme', 'dark');
    }
}

// Event listener for theme toggle
themeToggleInput.addEventListener('change', toggleTheme);

// Initialize when the DOM is fully loaded
document.addEventListener('DOMContentLoaded', function() {
    initFlashcards();
    initTheme();
});
