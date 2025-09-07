/**
 * Progress Tracking Module for FlashPharma
 * Handles local storage of user progress, statistics, and study sessions
 */
const ProgressTracker = (function() {

    // --- Private State ---
    const storageKey = 'flashpharma_progress';
    const sessionKey = 'flashpharma_current_session';
    let deviceId;
    let currentSession = null;
    let progress;

    // --- Private Methods ---

    const generateUUID = function() {
        return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
            const r = Math.random() * 16 | 0;
            const v = c === 'x' ? r : (r & 0x3 | 0x8);
            return v.toString(16);
        });
    };

    const getOrCreateDeviceId = function() {
        let id = localStorage.getItem('flashpharma_device_id');
        if (!id) {
            id = generateUUID();
            localStorage.setItem('flashpharma_device_id', id);
        }
        return id;
    };

    const getDefaultProgress = function() {
        return {
            deviceId: deviceId, // relies on deviceId being set
            lastSync: null,
            createdAt: new Date().toISOString(),
            lastModified: new Date().toISOString(),
            cards: {},
            sessions: [],
            stats: {
                totalCards: 0,
                totalAttempts: 0,
                totalCorrect: 0,
                averageAccuracy: 0,
                studyStreak: 0,
                lastStudyDate: null,
                totalStudyTime: 0
            }
        };
    };

    const loadProgress = function() {
        const stored = localStorage.getItem(storageKey);
        if (stored) {
            try {
                return JSON.parse(stored);
            } catch (e) {
                console.error('Error loading progress:', e);
                return getDefaultProgress();
            }
        }
        return getDefaultProgress();
    };
    
    const saveProgress = function() {
        if (!progress) return;
        progress.lastModified = new Date().toISOString();
        localStorage.setItem(storageKey, JSON.stringify(progress));
    };

    const updateStudyStreak = function() {
        const today = new Date().toDateString();
        const lastStudy = progress.stats.lastStudyDate;
        
        if (!lastStudy) {
            progress.stats.studyStreak = 1;
        } else {
            const lastStudyDate = new Date(lastStudy).toDateString();
            const yesterday = new Date();
            yesterday.setDate(yesterday.getDate() - 1);
            
            if (lastStudyDate === today) {
                // Studied today, no change
            } else if (lastStudyDate === yesterday.toDateString()) {
                progress.stats.studyStreak++;
            } else {
                progress.stats.studyStreak = 1; // Streak broken
            }
        }
        
        progress.stats.lastStudyDate = new Date().toISOString();
    };

    const updateGlobalStats = function() {
        const stats = progress.stats;
        stats.totalCards = Object.keys(progress.cards).length;
        stats.averageAccuracy = stats.totalAttempts > 0 
            ? (stats.totalCorrect / stats.totalAttempts) * 100 
            : 0;
        
        stats.totalStudyTime = progress.sessions.reduce(
            (total, session) => total + (session.duration || 0), 0
        );
    };

    // --- Public API Methods ---

    const startSession = function() {
        currentSession = {
            id: generateUUID(),
            startTime: new Date().toISOString(),
            endTime: null,
            cardsStudied: 0,
            correctAnswers: 0,
            incorrectAnswers: 0,
            cardResults: [],
            tags: [],
            duration: 0
        };

        localStorage.setItem(sessionKey, JSON.stringify(currentSession));
        updateStudyStreak();
        saveProgress(); // Save streak update
    };

    const endSession = function() {
        if (!currentSession) return null;

        const endTime = new Date();
        currentSession.endTime = endTime.toISOString();
        currentSession.duration = Math.floor(
            (endTime - new Date(currentSession.startTime)) / 1000
        );

        const totalAnswers = currentSession.correctAnswers + currentSession.incorrectAnswers;
        currentSession.accuracy = totalAnswers > 0 
            ? (currentSession.correctAnswers / totalAnswers) * 100 
            : 0;

        progress.sessions.push(currentSession);
        
        if (progress.sessions.length > 100) {
            progress.sessions = progress.sessions.slice(-100);
        }

        updateGlobalStats();
        
        const sessionData = { ...currentSession };
        currentSession = null;
        localStorage.removeItem(sessionKey);
        
        saveProgress();
        return sessionData;
    };

    const recordCardAttempt = function(cardId, isCorrect, tags = []) {
        const timestamp = new Date().toISOString();
        
        if (!progress.cards[cardId]) {
            progress.cards[cardId] = {
                firstSeen: timestamp,
                lastSeen: timestamp,
                attempts: 0,
                correct: 0,
                incorrect: 0,
                streak: 0,
                maxStreak: 0
            };
        }

        const cardProgress = progress.cards[cardId];
        
        cardProgress.attempts++;
        cardProgress.lastSeen = timestamp;
        
        if (isCorrect) {
            cardProgress.correct++;
            cardProgress.streak++;
            cardProgress.maxStreak = Math.max(cardProgress.maxStreak, cardProgress.streak);
        } else {
            cardProgress.incorrect++;
            cardProgress.streak = 0;
        }

        if (currentSession) {
            currentSession.cardsStudied++;
            if (isCorrect) {
                currentSession.correctAnswers++;
            } else {
                currentSession.incorrectAnswers++;
            }
            
            currentSession.cardResults.push({ cardId, correct: isCorrect, timestamp, tags });
            
            tags.forEach(tag => {
                if (!currentSession.tags.includes(tag)) {
                    currentSession.tags.push(tag);
                }
            });
            // Persist session state on each attempt
            localStorage.setItem(sessionKey, JSON.stringify(currentSession));
        }

        progress.stats.totalAttempts++;
        if (isCorrect) {
            progress.stats.totalCorrect++;
        }

        saveProgress();
        
        return cardProgress;
    };

    const getTagPerformance = function() {
        const tagStats = {};
        
        progress.sessions.forEach(session => {
            session.cardResults.forEach(result => {
                (result.tags || []).forEach(tag => {
                    if (!tagStats[tag]) {
                        tagStats[tag] = { attempts: 0, correct: 0, accuracy: 0 };
                    }
                    tagStats[tag].attempts++;
                    if (result.correct) {
                        tagStats[tag].correct++;
                    }
                });
            });
        });
        
        for (const tag in tagStats) {
            tagStats[tag].accuracy = tagStats[tag].attempts > 0
                ? (tagStats[tag].correct / tagStats[tag].attempts) * 100
                : 0;
        }
        
        return tagStats;
    };

    const getWeakAreas = function(threshold = 50, limit = 10) {
        const weakCards = Object.entries(progress.cards).map(([cardId, cardData]) => {
            const accuracy = cardData.attempts > 0 
                ? (cardData.correct / cardData.attempts) * 100 
                : 0;
            return { id: cardId, accuracy, attempts: cardData.attempts, ...cardData };
        })
        .filter(card => card.accuracy < threshold && card.attempts >= 1);
        
        weakCards.sort((a, b) => {
            if (a.accuracy !== b.accuracy) return a.accuracy - b.accuracy;
            return b.attempts - a.attempts;
        });
        
        return limit ? weakCards.slice(0, limit) : weakCards;
    };
    
    const cleanOrphanedProgress = function(validCardIds) {
        if (!Array.isArray(validCardIds)) return;
        
        let cleaned = false;
        const validIdSet = new Set(validCardIds.map(String));
        
        for (const cardId in progress.cards) {
            if (!validIdSet.has(cardId)) {
                delete progress.cards[cardId];
                cleaned = true;
            }
        }
        
        if (cleaned) {
            saveProgress();
            console.log('Cleaned orphaned progress entries');
        }
    };

    const getProgressSummary = function() {
        updateGlobalStats(); // Ensure stats are up-to-date
        return {
            stats: progress.stats,
            recentSessions: progress.sessions.slice(-5).reverse(),
            weakCardsCount: getWeakAreas(50, Infinity).length,
            tagPerformance: getTagPerformance(),
            currentStreak: progress.stats.studyStreak
        };
    };

    const exportProgress = function() {
        return JSON.stringify({
            ...progress,
            exportDate: new Date().toISOString(),
            version: '1.0.1' // Bump version for IIFE refactor
        }, null, 2);
    };

    const importProgress = function(jsonData) {
        try {
            const data = JSON.parse(jsonData);
            if (!data.deviceId || !data.cards || !data.sessions) {
                throw new Error('Invalid progress data format');
            }
            progress = data;
            saveProgress();
            return true;
        } catch (error) {
            console.error('Error importing progress:', error);
            return false;
        }
    };

    const clearProgress = function() {
        progress = getDefaultProgress();
        currentSession = null;
        localStorage.removeItem(sessionKey);
        saveProgress();
    };
    
    const resetAllProgress = function() {
        Object.keys(localStorage)
            .filter(key => key.startsWith('flashpharma_'))
            .forEach(key => localStorage.removeItem(key));
        
        // Re-initialize state
        init();
        
        console.log('All progress data has been reset');
    };

    // --- Initialization ---
    function init() {
        deviceId = getOrCreateDeviceId();
        progress = loadProgress();
        
        const storedSession = localStorage.getItem(sessionKey);
        if (storedSession) {
            try {
                currentSession = JSON.parse(storedSession);
            } catch (e) {
                console.error('Error restoring session:', e);
                localStorage.removeItem(sessionKey);
                currentSession = null;
            }
        }
    }

    init();

    // Return the public interface
    return {
        startSession,
        endSession,
        recordCardAttempt,
        getTagPerformance,
        getWeakAreas,
        cleanOrphanedProgress,
        getProgressSummary,
        exportProgress,
        importProgress,
        clearProgress,
        resetAllProgress
    };
})();

// Make it globally available for other scripts
if (typeof window !== 'undefined') {
    window.ProgressTracker = ProgressTracker;
}