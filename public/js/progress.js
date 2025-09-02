/**
 * Progress Tracking Module for FlashPharma
 * Handles local storage of user progress, statistics, and study sessions
 */

class ProgressTracker {
    constructor() {
        this.storageKey = 'flashpharma_progress';
        this.sessionKey = 'flashpharma_current_session';
        this.deviceId = this.getOrCreateDeviceId();
        this.currentSession = null;
        this.progress = this.loadProgress();
    }

    getOrCreateDeviceId() {
        let deviceId = localStorage.getItem('flashpharma_device_id');
        if (!deviceId) {
            deviceId = this.generateUUID();
            localStorage.setItem('flashpharma_device_id', deviceId);
        }
        return deviceId;
    }

    generateUUID() {
        return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
            const r = Math.random() * 16 | 0;
            const v = c === 'x' ? r : (r & 0x3 | 0x8);
            return v.toString(16);
        });
    }

    loadProgress() {
        const stored = localStorage.getItem(this.storageKey);
        if (stored) {
            try {
                return JSON.parse(stored);
            } catch (e) {
                console.error('Error loading progress:', e);
                return this.getDefaultProgress();
            }
        }
        return this.getDefaultProgress();
    }

    getDefaultProgress() {
        return {
            deviceId: this.deviceId,
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
    }

    // Save progress to localStorage
    saveProgress() {
        this.progress.lastModified = new Date().toISOString();
        localStorage.setItem(this.storageKey, JSON.stringify(this.progress));
    }

    startSession() {
        this.currentSession = {
            id: this.generateUUID(),
            startTime: new Date().toISOString(),
            endTime: null,
            cardsStudied: 0,
            correctAnswers: 0,
            incorrectAnswers: 0,
            cardResults: [],
            tags: [],
            duration: 0
        };

        localStorage.setItem(this.sessionKey, JSON.stringify(this.currentSession));
        this.updateStudyStreak();
    }

    // End current session
    endSession() {
        if (!this.currentSession) return null;

        const endTime = new Date();
        this.currentSession.endTime = endTime.toISOString();
        this.currentSession.duration = Math.floor(
            (endTime - new Date(this.currentSession.startTime)) / 1000
        );

        // Calculate session accuracy
        const totalAnswers = this.currentSession.correctAnswers + this.currentSession.incorrectAnswers;
        this.currentSession.accuracy = totalAnswers > 0 
            ? (this.currentSession.correctAnswers / totalAnswers) * 100 
            : 0;

        this.progress.sessions.push(this.currentSession);
        
        // Keep only last 100 sessions
        if (this.progress.sessions.length > 100) {
            this.progress.sessions = this.progress.sessions.slice(-100);
        }

        this.updateGlobalStats();
        this.saveProgress();
        
        // Clear current session
        const sessionData = this.currentSession;
        this.currentSession = null;
        localStorage.removeItem(this.sessionKey);
        
        return sessionData;
    }

    recordCardAttempt(cardId, isCorrect, tags = []) {
        const timestamp = new Date().toISOString();
        
        // Initialize card progress if not exists
        if (!this.progress.cards[cardId]) {
            this.progress.cards[cardId] = {
                firstSeen: timestamp,
                lastSeen: timestamp,
                attempts: 0,
                correct: 0,
                incorrect: 0,
                streak: 0,
                maxStreak: 0
            };
        }

        const cardProgress = this.progress.cards[cardId];
        
        // Update card stats
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

        const accuracy = cardProgress.attempts > 0 
            ? (cardProgress.correct / cardProgress.attempts) * 100 
            : 0;

        // Update current session if active
        if (this.currentSession) {
            this.currentSession.cardsStudied++;
            if (isCorrect) {
                this.currentSession.correctAnswers++;
            } else {
                this.currentSession.incorrectAnswers++;
            }
            
            // Add card result to session
            this.currentSession.cardResults.push({
                cardId: cardId,
                correct: isCorrect,
                timestamp: timestamp,
                tags: tags
            });
            
            // Update session tags
            tags.forEach(tag => {
                if (!this.currentSession.tags.includes(tag)) {
                    this.currentSession.tags.push(tag);
                }
            });
        }

        // Update global stats
        this.progress.stats.totalAttempts++;
        if (isCorrect) {
            this.progress.stats.totalCorrect++;
        }

        this.saveProgress();
        
        return cardProgress;
    }

    updateStudyStreak() {
        const today = new Date().toDateString();
        const lastStudy = this.progress.stats.lastStudyDate;
        
        if (!lastStudy) {
            this.progress.stats.studyStreak = 1;
        } else {
            const lastStudyDate = new Date(lastStudy).toDateString();
            const yesterday = new Date();
            yesterday.setDate(yesterday.getDate() - 1);
            
            if (lastStudyDate === today) {
            } else if (lastStudyDate === yesterday.toDateString()) {
                this.progress.stats.studyStreak++;
            } else {
                this.progress.stats.studyStreak = 1;
            }
        }
        
        this.progress.stats.lastStudyDate = new Date().toISOString();
    }

    updateGlobalStats() {
        const stats = this.progress.stats;
        stats.totalCards = Object.keys(this.progress.cards).length;
        stats.averageAccuracy = stats.totalAttempts > 0 
            ? (stats.totalCorrect / stats.totalAttempts) * 100 
            : 0;
        
        // Calculate total study time
        stats.totalStudyTime = this.progress.sessions.reduce(
            (total, session) => total + (session.duration || 0), 0
        );
    }

    // Get performance by tag
    getTagPerformance() {
        const tagStats = {};
        
        // Process all sessions
        this.progress.sessions.forEach(session => {
            session.cardResults.forEach(result => {
                result.tags.forEach(tag => {
                    if (!tagStats[tag]) {
                        tagStats[tag] = {
                            attempts: 0,
                            correct: 0,
                            accuracy: 0
                        };
                    }
                    
                    tagStats[tag].attempts++;
                    if (result.correct) {
                        tagStats[tag].correct++;
                    }
                });
            });
        });
        
        // Calculate accuracy for each tag
        for (const tag in tagStats) {
            tagStats[tag].accuracy = tagStats[tag].attempts > 0
                ? (tagStats[tag].correct / tagStats[tag].attempts) * 100
                : 0;
        }
        
        return tagStats;
    }

    // Get weak areas (cards with low performance)
    getWeakAreas(threshold = 50, limit = 10) {
        const weakCards = [];
        
        for (const [cardId, progress] of Object.entries(this.progress.cards)) {
            const accuracy = progress.attempts > 0 
                ? (progress.correct / progress.attempts) * 100 
                : 0;
            
            // Include cards with low accuracy that have been attempted at least once
            // This makes the display consistent with session results
            if (accuracy < threshold && progress.attempts >= 1) {
                weakCards.push({
                    id: cardId,
                    accuracy: accuracy,
                    attempts: progress.attempts
                });
            }
        }
        
        // Sort by accuracy (lowest first), then by attempts (most attempts first for same accuracy)
        weakCards.sort((a, b) => {
            if (a.accuracy !== b.accuracy) return a.accuracy - b.accuracy;
            return b.attempts - a.attempts;
        });
        
        return limit ? weakCards.slice(0, limit) : weakCards;
    }
    
    // Clean orphaned progress entries (cards that no longer exist)
    cleanOrphanedProgress(validCardIds) {
        if (!Array.isArray(validCardIds)) return;
        
        let cleaned = false;
        const validIdSet = new Set(validCardIds.map(id => id.toString()));
        
        // Remove progress entries for cards that no longer exist
        for (const cardId in this.progress.cards) {
            if (!validIdSet.has(cardId)) {
                delete this.progress.cards[cardId];
                cleaned = true;
            }
        }
        
        if (cleaned) {
            this.saveProgress();
            console.log('Cleaned orphaned progress entries');
        }
    }

    getProgressSummary() {
        return {
            stats: this.progress.stats,
            recentSessions: this.progress.sessions.slice(-5),
            weakCardsCount: this.getWeakAreas().length,
            tagPerformance: this.getTagPerformance(),
            currentStreak: this.progress.stats.studyStreak
        };
    }

    // Export progress data
    exportProgress() {
        const data = {
            ...this.progress,
            exportDate: new Date().toISOString(),
            version: '1.0.0'
        };
        
        return JSON.stringify(data, null, 2);
    }

    // Import progress data
    importProgress(jsonData) {
        try {
            const data = JSON.parse(jsonData);
            
            // Validate data structure
            if (!data.deviceId || !data.cards || !data.sessions) {
                throw new Error('Invalid progress data format');
            }
            
            // Merge with existing data or replace
            this.progress = data;
            this.saveProgress();
            
            return true;
        } catch (error) {
            console.error('Error importing progress:', error);
            return false;
        }
    }

    // Clear all progress data
    clearProgress() {
        this.progress = this.getDefaultProgress();
        this.currentSession = null;
        localStorage.removeItem(this.sessionKey);
        this.saveProgress();
    }
    
    // Reset all progress data (for migration/cleanup)
    resetAllProgress() {
        // Clear all localStorage entries related to flashpharma
        const keysToRemove = [];
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key && key.startsWith('flashpharma_')) {
                keysToRemove.push(key);
            }
        }
        
        keysToRemove.forEach(key => localStorage.removeItem(key));
        
        // Reinitialize with fresh data
        this.deviceId = this.getOrCreateDeviceId();
        this.progress = this.getDefaultProgress();
        this.currentSession = null;
        this.saveProgress();
        
        console.log('All progress data has been reset');
    }
}

// Export for use in main application
window.ProgressTracker = ProgressTracker;