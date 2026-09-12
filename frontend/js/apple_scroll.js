// /frontend/js/apple_scroll.js
// Fluid Apple-Style Micro-Interactions & Viewport Scroll Reveal

(function () {
    'use strict';

    // ─── 1. Viewport Staggered Reveal Observer ──────────────────────────────────
    const observerOptions = {
        root: null,
        rootMargin: '0px 0px -40px 0px',
        threshold: 0.08
    };

    let revealObserver = null;

    if ('IntersectionObserver' in window) {
        revealObserver = new IntersectionObserver((entries, observer) => {
            entries.forEach((entry, idx) => {
                if (entry.isIntersecting) {
                    const el = entry.target;
                    // Stagger slight delay if elements are in the same batch
                    const delay = Math.min((idx * 40), 200);
                    setTimeout(() => {
                        el.classList.add('in-viewport');
                    }, delay);
                    observer.unobserve(el);
                }
            });
        }, observerOptions);
    }

    window.observeNewElements = function (rootEl = document) {
        if (!revealObserver) return;
        const targets = rootEl.querySelectorAll('.card-karmayogi, .card, .custom-radio-wrapper, .mcq-option, .stat-card');
        targets.forEach(target => {
            if (!target.classList.contains('in-viewport')) {
                target.style.transition = 'opacity 0.45s cubic-bezier(0.16, 1, 0.3, 1), transform 0.45s cubic-bezier(0.16, 1, 0.3, 1)';
                revealObserver.observe(target);
            }
        });
    };

    // ─── 2. Voice Tutor Soundwave Visualizer Helper ─────────────────────────────
    window.startSoundWaveAnimation = function () {
        const visualizers = document.querySelectorAll('.soundwave-visualizer');
        visualizers.forEach(v => v.classList.add('playing'));
    };

    window.stopSoundWaveAnimation = function () {
        const visualizers = document.querySelectorAll('.soundwave-visualizer');
        visualizers.forEach(v => v.classList.remove('playing'));
    };

    // ─── 3. Dynamic DOM Mutation Observer for Injected Content ───────────────────
    document.addEventListener('DOMContentLoaded', () => {
        window.observeNewElements();

        // Observe dynamic container updates (Quiz questions, MCQs, Pathway cards)
        const liveContainers = [
            document.getElementById('quizContainer'),
            document.getElementById('pathwayCards'),
            document.getElementById('studyNotesContainer'),
            document.getElementById('mcqContainer'),
            document.getElementById('skillBarsContainer')
        ].filter(Boolean);

        if (window.MutationObserver) {
            const mutObserver = new MutationObserver((mutations) => {
                mutations.forEach(mutation => {
                    if (mutation.addedNodes.length > 0) {
                        window.observeNewElements(mutation.target);
                    }
                });
            });

            liveContainers.forEach(container => {
                mutObserver.observe(container, { childList: true, subtree: true });
            });
        }
    });

})();
