// StatsModule - Statistics and progress management (ES6 Module)
'use strict';

import { extractTextFromHtml } from './ui-helpers.js';
import * as RevisionModule from './revision-module.js';

// Private DOM elements
let statsBtn, statsModal, closeStatsModal, closeStatsBtn, exportProgress, clearProgressBtn, startRevisionBtn;

// Private methods
const initializeElements = function() {
    statsBtn = document.getElementById('statsBtn');
    statsModal = document.getElementById('statsModal');
    closeStatsModal = document.getElementById('closeStatsModal');
    closeStatsBtn = document.getElementById('closeStatsBtn');
    exportProgress = document.getElementById('exportProgress');
    clearProgressBtn = document.getElementById('clearProgress');
    startRevisionBtn = document.getElementById('startRevisionBtn');
};

const updateStatsDisplay = function() {
    if (!window.ProgressTracker) return;
    
    const summary = window.ProgressTracker.getProgressSummary();
    
    // Update global stats
    const totalCardsStudiedEl = document.getElementById('totalCardsStudied');
    const totalAttemptsEl = document.getElementById('totalAttempts');
    const averageAccuracyEl = document.getElementById('averageAccuracy');
    const studyStreakEl = document.getElementById('studyStreak');
    
    if (totalCardsStudiedEl) totalCardsStudiedEl.textContent = summary.stats.totalCards;
    if (totalAttemptsEl) totalAttemptsEl.textContent = summary.stats.totalAttempts;
    if (averageAccuracyEl) averageAccuracyEl.textContent = `${summary.stats.averageAccuracy.toFixed(1)}%`;
    if (studyStreakEl) studyStreakEl.textContent = summary.stats.studyStreak;
    
    // Update recent sessions and weak areas
    updateRecentSessions(summary);
    updateWeakAreas();
};

const updateRecentSessions = function(summary) {
    const recentSessionsEl = document.getElementById('recentSessions');
    if (!recentSessionsEl) return;
    
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
};

const updateWeakAreas = function() {
    const weakAreasEl = document.getElementById('weakAreas');
    if (!weakAreasEl || !window.ProgressTracker) return;
    
    const weakCards = window.ProgressTracker.getWeakAreas(50, 10);
    const totalWeakCount = window.ProgressTracker.getWeakAreas(50).length;

    // Update button visibility and text
    const revisionBtnTextEl = document.getElementById('revisionBtnText');
    if (startRevisionBtn) {
        if (totalWeakCount > 0) {
            startRevisionBtn.style.display = 'flex';
            if (revisionBtnTextEl) {
                revisionBtnTextEl.textContent = `Retravailler ${totalWeakCount} carte${totalWeakCount > 1 ? 's' : ''}`;
            }
        } else {
            startRevisionBtn.style.display = 'none';
        }
    }
    
    if (weakCards.length === 0) {
        weakAreasEl.innerHTML = '<div class="stat-info">Aucune carte faible détectée (toutes > 50% de réussite)</div>';
    } else {
        weakAreasEl.innerHTML = weakCards.map(area => {
            const allCards = window.flashcardApp ? window.flashcardApp.getAllQuestions() : [];
            const card = allCards.find(c => c.id === parseInt(area.id));
            if (!card) return '';
            
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
};

const setupEventListeners = function() {
    if (statsBtn) {
        statsBtn.addEventListener('click', showModal);
    }
    
    if (closeStatsModal) {
        closeStatsModal.addEventListener('click', hideModal);
    }
    
    if (closeStatsBtn) {
        closeStatsBtn.addEventListener('click', hideModal);
    }
    
    if (statsModal) {
        statsModal.addEventListener('click', (e) => {
            if (e.target === statsModal) {
                hideModal();
            }
        });
    }
    
    if (exportProgress) {
        exportProgress.addEventListener('click', handleExportProgress);
    }
    
    if (clearProgressBtn) {
        clearProgressBtn.addEventListener('click', handleClearProgress);
    }
    
    if (startRevisionBtn) {
        startRevisionBtn.addEventListener('click', RevisionModule.showModal);
    }
};

// Public API
export function init() {
    initializeElements();
    setupEventListeners();
}

export function showModal() {
    if (statsModal && window.ProgressTracker) {
        updateStatsDisplay();
        statsModal.classList.add('active');
        document.body.style.overflow = 'hidden';
    }
}

export function hideModal() {
    if (statsModal) {
        statsModal.classList.remove('active');
        document.body.style.overflow = '';
    }
}

export function handleExportProgress() {
    if (!window.ProgressTracker) return;
    
    const data = window.ProgressTracker.exportProgress();
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `flashpharma_progress_${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
}

export function handleClearProgress() {
    if (!window.ProgressTracker) return;
    
    if (confirm('Êtes-vous sûr de vouloir réinitialiser toutes vos statistiques ? Cette action est irréversible.')) {
        window.ProgressTracker.resetAllProgress();
        updateStatsDisplay();
        alert('Vos statistiques ont été complètement réinitialisées.');
    }
}