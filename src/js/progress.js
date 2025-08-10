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

    // Initialize or get device ID
    getOrCreateDeviceId() {
        let deviceId = localStorage.getItem('flashpharma_device_id');
        if (!deviceId) {
            deviceId = this.generateUUID();
            localStorage.setItem('flashpharma_device_id', deviceId);
        }
        return deviceId;
    }

    // Generate UUID v4
    generateUUID() {
        return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
            const r = Math.random() * 16 | 0;
            const v = c === 'x' ? r : (r & 0x3 | 0x8);
            return v.toString(16);
        });
    }

    // Load progress from localStorage
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

    // Get default progress structure
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

    // Start a new study session
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
        
        // Save session to localStorage for recovery
        localStorage.setItem(this.sessionKey, JSON.stringify(this.currentSession));
        
        // Update study streak
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

        // Add session to history
        this.progress.sessions.push(this.currentSession);
        
        // Keep only last 100 sessions
        if (this.progress.sessions.length > 100) {
            this.progress.sessions = this.progress.sessions.slice(-100);
        }

        // Update global stats
        this.updateGlobalStats();
        
        // Save progress
        this.saveProgress();
        
        // Clear current session
        const sessionData = this.currentSession;
        this.currentSession = null;
        localStorage.removeItem(this.sessionKey);
        
        return sessionData;
    }

    // Record a card attempt
    recordCardAttempt(cardId, isCorrect, confidence = null, tags = []) {
        const timestamp = new Date().toISOString();
        
        // Initialize card progress if not exists
        if (!this.progress.cards[cardId]) {
            this.progress.cards[cardId] = {
                firstSeen: timestamp,
                lastSeen: timestamp,
                attempts: 0,
                correct: 0,
                incorrect: 0,
                confidence: null,
                averageConfidence: null,
                confidenceHistory: [],
                nextReview: null,
                mastery: 0, // 0-100 scale
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

        // Update confidence if provided
        if (confidence !== null) {
            cardProgress.confidence = confidence;
            cardProgress.confidenceHistory.push({
                value: confidence,
                timestamp: timestamp
            });
            
            // Keep only last 10 confidence ratings
            if (cardProgress.confidenceHistory.length > 10) {
                cardProgress.confidenceHistory = cardProgress.confidenceHistory.slice(-10);
            }
            
            // Calculate average confidence
            const avgConfidence = cardProgress.confidenceHistory.reduce(
                (sum, item) => sum + item.value, 0
            ) / cardProgress.confidenceHistory.length;
            cardProgress.averageConfidence = avgConfidence;
        }

        // Calculate mastery level (0-100)
        this.updateCardMastery(cardProgress);
        
        // Calculate next review date using spaced repetition
        cardProgress.nextReview = this.calculateNextReview(cardProgress, isCorrect, confidence);

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
                confidence: confidence,
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
        
        // Save progress
        this.saveProgress();
        
        return cardProgress;
    }

    // Update card mastery level
    updateCardMastery(cardProgress) {
        const accuracy = cardProgress.attempts > 0 
            ? (cardProgress.correct / cardProgress.attempts) * 100 
            : 0;
        
        const confidenceWeight = cardProgress.averageConfidence 
            ? cardProgress.averageConfidence * 20 
            : 50;
        
        const streakBonus = Math.min(cardProgress.streak * 5, 20);
        
        // Weighted mastery calculation
        cardProgress.mastery = Math.min(100, Math.round(
            (accuracy * 0.5) + (confidenceWeight * 0.3) + (streakBonus * 0.2)
        ));
    }

    // Calculate next review date using spaced repetition
    calculateNextReview(cardProgress, isCorrect, confidence) {
        const now = new Date();
        let interval = 1; // Default: 1 day
        
        if (!isCorrect) {
            // Failed card: review soon
            interval = 0.25; // 6 hours
        } else {
            // Calculate interval based on performance
            const factor = confidence ? (confidence / 5) : 0.6;
            
            if (cardProgress.streak === 1) {
                interval = 1 * factor;
            } else if (cardProgress.streak === 2) {
                interval = 3 * factor;
            } else if (cardProgress.streak === 3) {
                interval = 7 * factor;
            } else if (cardProgress.streak === 4) {
                interval = 14 * factor;
            } else {
                interval = 30 * factor;
            }
        }
        
        now.setDate(now.getDate() + interval);
        return now.toISOString();
    }

    // Update study streak
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
                // Already studied today, no change
            } else if (lastStudyDate === yesterday.toDateString()) {
                // Studied yesterday, increment streak
                this.progress.stats.studyStreak++;
            } else {
                // Streak broken, reset to 1
                this.progress.stats.studyStreak = 1;
            }
        }
        
        this.progress.stats.lastStudyDate = new Date().toISOString();
    }

    // Update global statistics
    updateGlobalStats() {
        const stats = this.progress.stats;
        
        // Calculate total unique cards studied
        stats.totalCards = Object.keys(this.progress.cards).length;
        
        // Calculate average accuracy
        stats.averageAccuracy = stats.totalAttempts > 0 
            ? (stats.totalCorrect / stats.totalAttempts) * 100 
            : 0;
        
        // Calculate total study time
        stats.totalStudyTime = this.progress.sessions.reduce(
            (total, session) => total + (session.duration || 0), 0
        );
    }

    // Get cards due for review
    getDueCards(limit = null) {
        const now = new Date().toISOString();
        const dueCards = [];
        
        for (const [cardId, progress] of Object.entries(this.progress.cards)) {
            if (progress.nextReview && progress.nextReview <= now) {
                dueCards.push({
                    id: cardId,
                    ...progress,
                    daysOverdue: Math.floor(
                        (new Date() - new Date(progress.nextReview)) / (1000 * 60 * 60 * 24)
                    )
                });
            }
        }
        
        // Sort by most overdue first
        dueCards.sort((a, b) => b.daysOverdue - a.daysOverdue);
        
        return limit ? dueCards.slice(0, limit) : dueCards;
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
            
            if (accuracy < threshold && progress.attempts >= 2) {
                weakCards.push({
                    id: cardId,
                    accuracy: accuracy,
                    attempts: progress.attempts,
                    mastery: progress.mastery
                });
            }
        }
        
        // Sort by accuracy (lowest first)
        weakCards.sort((a, b) => a.accuracy - b.accuracy);
        
        return limit ? weakCards.slice(0, limit) : weakCards;
    }

    // Get progress summary
    getProgressSummary() {
        return {
            stats: this.progress.stats,
            recentSessions: this.progress.sessions.slice(-5),
            dueCardsCount: this.getDueCards().length,
            weakAreasCount: this.getWeakAreas().length,
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
}

// Export for use in main application
window.ProgressTracker = ProgressTracker;