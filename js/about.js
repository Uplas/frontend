// js/about.js
/* ==========================================================================
   Uplas About Us Page Specific JavaScript (about.js)
   - Currently handles basic initialization confirmation.
   - Can be expanded for animations or future interactive elements.
   - Relies on global.js, apiUtils.js, and i18n.js.
   ========================================================================== */
'use strict';

document.addEventListener('DOMContentLoaded', () => {
    console.log("about.js: Uplas About Us Page initialized successfully.");

    // Future enhancement: Add an animation when team cards scroll into view.
    const teamCards = document.querySelectorAll('.team-card');

    if ('IntersectionObserver' in window) {
        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    entry.target.classList.add('in-view');
                }
            });
        }, {
            threshold: 0.1 // Trigger when 10% of the card is visible
        });

        teamCards.forEach(card => {
            observer.observe(card);
        });
    }
});
