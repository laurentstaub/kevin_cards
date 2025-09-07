// UIHelpers Module - Theme management and utility functions
const UIHelpers = (function() {

    // Private state
    let toggleSwitch = null;

    // Private utility functions
    const initializeElements = function() {
        toggleSwitch = document.getElementById('toggleSwitch');
    };

    // Public API
    return {
        // Initialize UI helpers
        init: function() {
            initializeElements();
        },

        // Theme management
        initTheme: function() {
            document.body.setAttribute('data-theme', 'dark');
            if (toggleSwitch) {
                toggleSwitch.classList.remove('active');
            }
        },

        toggleTheme: function() {
            const currentTheme = document.body.getAttribute('data-theme') || 'dark';
            const newTheme = currentTheme === 'dark' ? 'light' : 'dark';

            document.body.setAttribute('data-theme', newTheme);

            if (toggleSwitch) {
                toggleSwitch.classList.toggle('active', newTheme === 'light');
            }
        },

        // Utility functions
        extractTextFromHtml: function(html) {
            const div = document.createElement('div');
            div.innerHTML = html;
            return div.textContent || div.innerText || '';
        },

        extractSource: function(sources) {
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
        },

        // HTML rendering utilities
        renderSourceHtml: function(source) {
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
        },

        renderTagsHtml: function(tags) {
            if (!tags || !Array.isArray(tags)) {
                return '';
            }
            return tags.map(tag => `<span class="tag">${tag || 'Tag'}</span>`).join('');
        },

        // Template rendering (for future HTML template usage)
        renderFromTemplate: function(templateId, data) {
            const template = document.getElementById(templateId);
            if (!template) {
                console.error(`Template with id "${templateId}" not found`);
                return null;
            }

            const clone = template.content.cloneNode(true);
            
            // Basic data binding - can be extended
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
        },

        // Array utilities
        shuffleArray: function(array) {
            const shuffled = [...array];
            // Fisher-Yates shuffle algorithm
            for (let i = shuffled.length - 1; i > 0; i--) {
                const j = Math.floor(Math.random() * (i + 1));
                [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
            }
            return shuffled;
        },

        getRandomItems: function(array, count) {
            const shuffled = this.shuffleArray(array);
            return shuffled.slice(0, count);
        },

        // Date/time utilities
        formatDate: function(dateString) {
            if (!dateString) return '';
            const date = new Date(dateString);
            return date.toLocaleDateString('fr-FR');
        },

        formatDateTime: function(dateString) {
            if (!dateString) return '';
            const date = new Date(dateString);
            const dateStr = date.toLocaleDateString('fr-FR');
            const timeStr = date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
            return `${dateStr} à ${timeStr}`;
        },

        // DOM utilities
        show: function(element) {
            if (element) element.style.display = 'block';
        },

        hide: function(element) {
            if (element) element.style.display = 'none';
        },

        toggle: function(element, show) {
            if (element) {
                element.style.display = show ? 'block' : 'none';
            }
        },

        addClass: function(element, className) {
            if (element) element.classList.add(className);
        },

        removeClass: function(element, className) {
            if (element) element.classList.remove(className);
        },

        toggleClass: function(element, className, force) {
            if (element) element.classList.toggle(className, force);
        }
    };

})();