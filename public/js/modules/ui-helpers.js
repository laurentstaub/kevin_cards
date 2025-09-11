// UIHelpers Module - Theme management and utility functions (ES6 Module)
'use strict';

// Private state
let toggleSwitch = null;

// Private utility functions
const initializeElements = function() {
    toggleSwitch = document.getElementById('toggleSwitch');
};

// Public API
export function init() {
    initializeElements();
}

export function initTheme() {
    document.body.setAttribute('data-theme', 'dark');
    if (toggleSwitch) {
        toggleSwitch.classList.remove('active');
    }
}

export function toggleTheme() {
    const currentTheme = document.body.getAttribute('data-theme') || 'dark';
    const newTheme = currentTheme === 'dark' ? 'light' : 'dark';

    document.body.setAttribute('data-theme', newTheme);

    if (toggleSwitch) {
        toggleSwitch.classList.toggle('active', newTheme === 'light');
    }
}

export function extractTextFromHtml(html) {
    const div = document.createElement('div');
    div.innerHTML = html;
    return div.textContent || div.innerText || '';
}

export function extractSource(sources) {
    if (!sources || sources.length === 0) {
        return 'Pharmacologie générale';
    }
    
    // Return all sources as objects with text and optional URL
    const sourceObjects = sources.map(source => ({
        text: source.title || source.url || 'Source externe',
        url: source.url || null
    }));
    
    // If there's only one source, return as single object, otherwise return as array
    return sourceObjects.length === 1 ? sourceObjects[0] : sourceObjects;
}

export function renderSourceHtml(source) {
    if (!source) {
        return 'Pharmacologie générale';
    }

    if (Array.isArray(source)) {
        return source.map(s => 
            s && s.url ? 
                `<a href="${s.url}" target="_blank" rel="noopener noreferrer" class="source-link">${s.text || 'Source externe'}</a>` : 
                (s && s.text) || 'Source externe'
        ).join(', ');
    } else if (typeof source === 'object') {
        return source.url ? 
            `<a href="${source.url}" target="_blank" rel="noopener noreferrer" class="source-link">${source.text || 'Source externe'}</a>` : 
            source.text || 'Source externe';
    } else {
        return source;
    }
}

export function renderTagsHtml(tags) {
    if (!tags || !Array.isArray(tags)) {
        return '';
    }
    return tags.map(tag => `<span class="tag">${tag || 'Tag'}</span>`).join('');
}

export function renderFromTemplate(templateId, data) {
    const template = document.getElementById(templateId);
    if (!template) {
        console.error(`Template with id "${templateId}" not found`);
        return null;
    }

    const clone = template.content.cloneNode(true);
    
    Object.keys(data).forEach(key => {
        const element = clone.querySelector(`[data-bind="${key}"]`);
        if (element) {
            if (element.tagName === 'INPUT') {
                element.value = data[key];
            } else {
                element.textContent = data[key];
            }
        }
    });

    return clone;
}

export function shuffleArray(array) {
    const shuffled = [...array];
    // Fisher-Yates shuffle algorithm
    for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
}

export function getRandomItems(array, count) {
    const shuffled = shuffleArray(array);
    return shuffled.slice(0, count);
}

export function formatDate(dateString) {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString('fr-FR');
}

export function formatDateTime(dateString) {
    if (!dateString) return '';
    const date = new Date(dateString);
    const dateStr = date.toLocaleDateString('fr-FR');
    const timeStr = date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
    return `${dateStr} à ${timeStr}`;
}

export function show(element) {
    if (element) element.style.display = 'block';
}

export function hide(element) {
    if (element) element.style.display = 'none';
}

export function toggle(element, show) {
    if (element) {
        element.style.display = show ? 'block' : 'none';
    }
}

export function addClass(element, className) {
    if (element) element.classList.add(className);
}

export function removeClass(element, className) {
    if (element) element.classList.remove(className);
}

export function toggleClass(element, className, force) {
    if (element) element.classList.toggle(className, force);
}