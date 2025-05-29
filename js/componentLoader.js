// js/componentLoader.js
// Handles loading HTML components like header and footer into placeholder elements.
'use strict';

/**
 * Fetches HTML content from a given path and injects it into a target element.
 * @param {string} componentPath - The path to the HTML component file (e.g., 'components/header.html').
 * @param {string} targetElementId - The ID of the HTML element where the component will be loaded.
 * @param {string} [currentPageFile] - Optional: The filename of the current page (e.g., 'index.html') for nav highlighting.
 * @returns {Promise<boolean>} True if successful, false otherwise.
 */
async function loadHTMLComponent(componentPath, targetElementId, currentPageFile) {
    const targetElement = document.getElementById(targetElementId);
    if (!targetElement) {
        console.error(`ComponentLoader: Target element '${targetElementId}' NOT FOUND for component '${componentPath}'.`);
        return false;
    }

    try {
        const response = await fetch(componentPath);
        if (!response.ok) {
            throw new Error(`Failed to fetch component ${componentPath}: ${response.status} ${response.statusText}`);
        }
        const htmlContent = await response.text();
        
        if (htmlContent.trim() === "") {
            console.warn(`ComponentLoader: Fetched component '${componentPath}' is EMPTY.`);
            // Decide if this should be treated as an error or just an empty component
            targetElement.innerHTML = ''; // Clear placeholder
            // return false; // Or true if an empty component is acceptable
        } else {
            targetElement.innerHTML = htmlContent;
        }
        
        console.log(`ComponentLoader: Successfully loaded and injected '${componentPath}' into '#${targetElementId}'.`);

        // After injecting HTML, re-run translation for the new content.
        // uplasApplyTranslations will use the i18nManager's current effective locale.
        if (typeof window.uplasApplyTranslations === 'function') {
            console.log(`ComponentLoader: Calling uplasApplyTranslations for '${targetElementId}'.`);
            window.uplasApplyTranslations(targetElement); // Apply to the newly loaded content
        } else {
            console.warn("ComponentLoader: window.uplasApplyTranslations is not available. Translations for dynamic components might not apply immediately.");
        }

        // Component-specific post-load actions
        if (targetElementId === 'site-header-placeholder') {
            if (typeof setActiveNavLink === 'function' && currentPageFile) {
                setActiveNavLink(currentPageFile);
            }
            // Other header-specific initializations that depend on its DOM being ready can go here
            // For example, re-attaching event listeners if any were part of header.html initially
            // but are better managed by global.js *after* this resolves.
        }
        
        if (targetElementId === 'site-footer-placeholder') {
            if (typeof updateDynamicFooterYear === 'function') {
                updateDynamicFooterYear();
            }
        }

        return true;
    } catch (error) {
        console.error(`ComponentLoader: ERROR loading component '${componentPath}' into '#${targetElementId}':`, error);
        targetElement.innerHTML = `<p style="color:var(--color-error, red); padding: 1rem; text-align:center;">Error: The ${targetElementId.replace('-placeholder', '').replace('site-', '')} could not be loaded.</p>`;
        return false;
    }
}

/**
 * Sets the active class on the correct navigation link based on the current page.
 * This should be called *after* the header component is loaded and its DOM is ready.
 * @param {string} currentPageFilename - The filename of the current page (e.g., 'index.html').
 */
function setActiveNavLink(currentPageFilename) {
    const mainNavigation = document.getElementById('main-navigation');
    if (!mainNavigation) {
        // console.warn("ComponentLoader (setActiveNavLink): Main navigation element ('#main-navigation') not found. Header might not be fully loaded or has unexpected structure.");
        return;
    }
    const navLinks = mainNavigation.querySelectorAll('.nav__list .nav__item .nav__link');
    if (navLinks.length === 0) {
        // console.warn("ComponentLoader (setActiveNavLink): No navigation links found. Check selector or header structure.");
        return;
    }

    let foundActive = false;
    const normalizedCurrentPage = (currentPageFilename === "" || currentPageFilename === "/") ? "index.html" : currentPageFilename.split('?')[0].split('#')[0];

    navLinks.forEach(link => {
        link.classList.remove('nav__link--active');
        link.removeAttribute('aria-current');

        const linkHref = link.getAttribute('href');
        if (linkHref) {
            let linkPath = linkHref.split('/').pop().split('#')[0].split('?')[0];
            linkPath = (linkPath === "" && (linkHref.endsWith('/') || linkHref === "/")) ? "index.html" : linkPath;
            linkPath = (linkPath === "") ? "index.html" : linkPath; // Handles cases like href="#"

            if (linkPath === normalizedCurrentPage) {
                link.classList.add('nav__link--active');
                link.setAttribute('aria-current', 'page');
                foundActive = true;
            }
        }
    });
    // console.log(`ComponentLoader (setActiveNavLink): Active nav link processing for '${normalizedCurrentPage}'. Found active: ${foundActive}`);
}

/**
 * Updates the copyright year in the footer.
 * This should be called *after* the footer component is loaded and its DOM is ready.
 */
function updateDynamicFooterYear() {
    const currentYearFooterSpan = document.getElementById('current-year-footer');
    if (!currentYearFooterSpan) {
        // console.warn("ComponentLoader (updateDynamicFooterYear): Footer year span ('#current-year-footer') not found.");
        return;
    }

    const yearTextKey = currentYearFooterSpan.dataset.translateKey || 'footer_copyright_dynamic';
    // Use textContent for the template to avoid issues if innerHTML had other elements by mistake initially
    let yearTextTemplate = currentYearFooterSpan.textContent || "{currentYear}"; 

    // If the span is empty or just has the placeholder, and a translate key exists, fetch the template from translations
    if ((currentYearFooterSpan.textContent.trim() === '' || currentYearFooterSpan.textContent.trim() === '{currentYear}') &&
        yearTextKey && typeof window.uplasTranslate === 'function') {
        yearTextTemplate = window.uplasTranslate(yearTextKey, { fallback: "© {currentYear} Uplas EdTech Solutions Ltd." });
    } else if (!yearTextTemplate.includes("{currentYear}")) {
        // Fallback if the initial content doesn't have the placeholder but should
        yearTextTemplate = (typeof window.uplasTranslate === 'function' && yearTextKey)
            ? window.uplasTranslate(yearTextKey, { fallback: `© {currentYear} Uplas.` })
            : `© {currentYear} Uplas.`;
    }

    currentYearFooterSpan.innerHTML = yearTextTemplate.replace("{currentYear}", new Date().getFullYear());
    // console.log("ComponentLoader (updateDynamicFooterYear): Footer year updated.");
}

// Make functions globally available
window.loadHTMLComponent = loadHTMLComponent;
window.setActiveNavLink = setActiveNavLink; // Though primarily called internally by loadHTMLComponent
window.updateDynamicFooterYear = updateDynamicFooterYear; // Same as above

console.log("ComponentLoader (componentLoader.js) script loaded and initialized.");
