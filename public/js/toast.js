// Toast Module - Non-blocking notifications
// Classic script (not an ES module) so both the legacy scripts and the ES
// modules can reach it through window.Toast.
(function() {
    'use strict';

    const DEFAULT_DURATION = 4000;
    const CONTAINER_ID = 'toastContainer';

    const getContainer = function() {
        let container = document.getElementById(CONTAINER_ID);
        if (!container) {
            container = document.createElement('div');
            container.id = CONTAINER_ID;
            container.className = 'toast-container';
            container.setAttribute('role', 'status');
            container.setAttribute('aria-live', 'polite');
            document.body.appendChild(container);
        }
        return container;
    };

    const dismiss = function(toast) {
        if (!toast || toast.dataset.dismissing === 'true') return;
        toast.dataset.dismissing = 'true';
        toast.classList.remove('toast-visible');
        const remove = () => toast.remove();
        toast.addEventListener('transitionend', remove, { once: true });
        setTimeout(remove, 400);
    };

    // type: 'info' | 'success' | 'warning' | 'error'
    const show = function(message, type = 'info', duration = DEFAULT_DURATION) {
        if (!message) return null;

        const container = getContainer();
        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;
        toast.textContent = message;
        toast.addEventListener('click', () => dismiss(toast));

        container.appendChild(toast);
        requestAnimationFrame(() => toast.classList.add('toast-visible'));

        if (duration > 0) {
            setTimeout(() => dismiss(toast), duration);
        }
        return toast;
    };

    window.Toast = {
        show,
        info: (message, duration) => show(message, 'info', duration),
        success: (message, duration) => show(message, 'success', duration),
        warning: (message, duration) => show(message, 'warning', duration),
        error: (message, duration) => show(message, 'error', duration)
    };
})();
