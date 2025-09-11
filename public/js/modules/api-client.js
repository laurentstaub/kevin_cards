// ApiClient Module - API communication for public app (ES6 Module)
'use strict';

import { extractSource } from './ui-helpers.js';

// Private configuration
const BASE_URL = '/api';

// Private request function
const request = async function(endpoint, method = 'GET', data = null, options = {}) {
    const url = `${BASE_URL}${endpoint}`;
    const fetchOptions = {
        method,
        headers: {
            'Content-Type': 'application/json',
            ...options.headers
        },
        ...options
    };

    if (data && (method === 'POST' || method === 'PUT' || method === 'PATCH')) {
        fetchOptions.body = JSON.stringify(data);
    }

    try {
        const response = await fetch(url, fetchOptions);
        
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const contentType = response.headers.get('content-type');
        if (contentType && contentType.includes('application/json')) {
            return await response.json();
        } else {
            return await response.text();
        }
        
    } catch (error) {
        console.error(`API request failed: ${method} ${url}`, error);
        throw error;
    }
};

// Public API object
export const ApiClient = {
    // Basic HTTP methods
    get: function(endpoint, options = {}) {
        return request(endpoint, 'GET', null, options);
    },
    
    post: function(endpoint, data, options = {}) {
        return request(endpoint, 'POST', data, options);
    },
    
    put: function(endpoint, data, options = {}) {
        return request(endpoint, 'PUT', data, options);
    },
    
    patch: function(endpoint, data, options = {}) {
        return request(endpoint, 'PATCH', data, options);
    },
    
    delete: function(endpoint, options = {}) {
        return request(endpoint, 'DELETE', null, options);
    },

    // Specific API endpoints for the public app
    questions: {
        // Load all published questions
        loadPublished: async function(limit = 1000) {
            try {
                const data = await request(`/questions/published?limit=${limit}`);
                return {
                    success: true,
                    flashcards: data.flashcards || [],
                    metadata: data.metadata || {}
                };
            } catch (error) {
                console.error('Error loading published questions:', error);
                return {
                    success: false,
                    flashcards: [],
                    metadata: {},
                    error: error.message
                };
            }
        },

        // Load questions with specific parameters
        loadWithParams: async function(params = {}) {
            try {
                const searchParams = new URLSearchParams(params);
                const data = await request(`/questions?${searchParams}`);
                return {
                    success: true,
                    questions: data.questions || [],
                    metadata: data.metadata || {}
                };
            } catch (error) {
                console.error('Error loading questions with params:', error);
                return {
                    success: false,
                    questions: [],
                    metadata: {},
                    error: error.message
                };
            }
        }
    },

    tags: {
        // Load all tags with priority ordering
        loadWithPriority: async function() {
            try {
                const data = await request('/tags?priorityOrder=true');
                return {
                    success: true,
                    tags: data.tags || []
                };
            } catch (error) {
                console.error('Error loading tags:', error);
                return {
                    success: false,
                    tags: [],
                    error: error.message
                };
            }
        },

        // Load all tags
        loadAll: async function() {
            try {
                const data = await request('/tags');
                return {
                    success: true,
                    tags: data.tags || []
                };
            } catch (error) {
                console.error('Error loading tags:', error);
                return {
                    success: false,
                    tags: [],
                    error: error.message
                };
            }
        }
    },

    // Data processing helpers
    processQuestionData: function(data) {
        if (!data.flashcards || !Array.isArray(data.flashcards)) {
            return [];
        }

        return data.flashcards.map(card => ({
            id: card.id,
            tags: card.tags ? card.tags.map(tag => typeof tag === 'string' ? tag : tag.name) : [],
            question: card.question, // Already rendered HTML from API
            answer: card.answer,     // Already rendered HTML from API
            difficulty: card.difficulty || 'medium',
            source: extractSource(card.sources)
        }));
    },

    processSessionQuestions: function(data) {
        if (!data.questions || !Array.isArray(data.questions)) {
            return [];
        }

        return data.questions.map(card => ({
            id: card.id,
            tags: card.tags ? card.tags.map(tag => typeof tag === 'string' ? tag : tag.name) : [],
            question: card.questionHtml || card.questionText || card.question,
            answer: card.answerHtml || card.answerText || card.answer,
            difficulty: card.difficulty || 'medium',
            source: extractSource(card.sources)
        }));
    }
};