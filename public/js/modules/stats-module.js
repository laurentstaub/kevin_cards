// StatsModule - Statistics and progress management
const StatsModule = (function() {

    // Private DOM elements
    let statsBtn, statsModal, closeStatsModal, closeStatsBtn, exportProgress, clearProgressBtn;

    // Private methods
    const initializeElements = function() {
        statsBtn = document.getElementById('statsBtn');
        statsModal = document.getElementById('statsModal');
        closeStatsModal = document.getElementById('closeStatsModal');
        closeStatsBtn = document.getElementById('closeStatsBtn');
        exportProgress = document.getElementById('exportProgress');
        clearProgressBtn = document.getElementById('clearProgress');
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
        
        const weakAreas = window.ProgressTracker.getWeakAreas(50, 10);
        if (weakAreas.length === 0) {
            weakAreasEl.innerHTML = '<div class="stat-info">Aucune carte faible détectée (toutes > 50% de réussite)</div>';
        } else {
            weakAreasEl.innerHTML = weakAreas.map(area => {
                const allCards = window.flashcardApp ? window.flashcardApp.getAllQuestions() : [];
                const card = allCards.find(c => c.id === parseInt(area.id));
                if (!card) return '';
                
                const questionPreview = UIHelpers.extractTextFromHtml(card.question).substring(0, 80) + '...';
                
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

    // Public API
    return {
        init: function() {
            initializeElements();
            this.setupEventListeners();
        },

        setupEventListeners: function() {
            if (statsBtn) {
                statsBtn.addEventListener('click', this.showModal);
            }
            
            if (closeStatsModal) {
                closeStatsModal.addEventListener('click', this.hideModal);
            }
            
            if (closeStatsBtn) {
                closeStatsBtn.addEventListener('click', this.hideModal);
            }
            
            if (statsModal) {
                statsModal.addEventListener('click', (e) => {
                    if (e.target === statsModal) {
                        this.hideModal();
                    }
                });
            }
            
            if (exportProgress) {
                exportProgress.addEventListener('click', this.handleExportProgress);
            }
            
            if (clearProgressBtn) {
                clearProgressBtn.addEventListener('click', this.handleClearProgress);
            }
        },

        showModal: function() {
            if (statsModal && window.ProgressTracker) {
                updateStatsDisplay();
                statsModal.classList.add('active');
                document.body.style.overflow = 'hidden';
            }
        },

        hideModal: function() {
            if (statsModal) {
                statsModal.classList.remove('active');
                document.body.style.overflow = '';
            }
        },

        handleExportProgress: function() {
            if (!window.ProgressTracker) return;
            
            const data = window.ProgressTracker.exportProgress();
            const blob = new Blob([data], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `flashpharma_progress_${new Date().toISOString().split('T')[0]}.json`;
            a.click();
            URL.revokeObjectURL(url);
        },

        handleClearProgress: function() {
            if (!window.ProgressTracker) return;
            
            if (confirm('Êtes-vous sûr de vouloir réinitialiser toutes vos statistiques ? Cette action est irréversible.')) {
                window.ProgressTracker.resetAllProgress();
                updateStatsDisplay();
                alert('Vos statistiques ont été complètement réinitialisées.');
            }
        }
    };

})();