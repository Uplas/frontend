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
        console.error(`Dynamic Component Loader: Target element '${targetElementId}' not found for component '${componentPath}'.`);
        return false;
    }

    try {
        const response = await fetch(componentPath); // Fetches the component HTML file
        if (!response.ok) { // Checks if the fetch was successful (status 200-299)
            throw new Error(`Failed to fetch component ${componentPath}: ${response.status} ${response.statusText}`);
        }
        const htmlContent = await response.text(); // Gets the HTML content as text
        targetElement.innerHTML = htmlContent; // Injects the HTML into the placeholder
        console.log(`Dynamic Component Loader: Successfully loaded '${componentPath}' into '#${targetElementId}'.`);

        // After injecting HTML, re-run translation for the new content if i18nManager is ready
        // Assumes uplasApplyTranslations and uplasGetCurrentLocale are globally available from i18n.js
        if (typeof window.uplasApplyTranslations === 'function' && typeof window.uplasGetCurrentLocale === 'function') {
            window.uplasApplyTranslations(window.uplasGetCurrentLocale());
        }

        // After loading header, set active navigation link
        if (targetElementId === 'site-header-placeholder' && typeof setActiveNavLink === 'function' && currentPageFile) {
            setActiveNavLink(currentPageFile);
        }
        
        // If footer is loaded and has a year placeholder, ensure it's updated
        if (targetElementId === 'site-footer-placeholder' && typeof updateDynamicFooterYear === 'function') {
            updateDynamicFooterYear();
        }

        return true;
    } catch (error) {
        console.error(`Dynamic Component Loader: Error loading component '${componentPath}' into '#${targetElementId}':`, error);
        // Display an error message in the placeholder if loading fails
        targetElement.innerHTML = `<p style="color:var(--color-error, red); padding: 1rem; text-align:center;">Error: The ${targetElementId.replace('-placeholder', '').replace('site-', '')} could not be loaded.</p>`;
        return false;
    }
}

/**
 * Sets the active class on the correct navigation link based on the current page.
 * This should be called *after* the header component is loaded.
 * @param {string} currentPageFilename - The filename of the current page (e.g., 'index.html').
 */
function setActiveNavLink(currentPageFilename) {
    // Selector for navigation links, assumes 'main-navigation' is the ID of the <nav> tag in header.html
    const navLinks = document.querySelectorAll('#main-navigation .nav__list .nav__item .nav__link');
    if (navLinks.length === 0) {
        // console.warn("Dynamic Component Loader: No navigation links found for setActiveNavLink. Check selector and if header is loaded.");
        return;
    }

    let foundActive = false;
    navLinks.forEach(link => {
        link.classList.remove('nav__link--active'); // Reset active class
        link.removeAttribute('aria-current');       // Reset ARIA current attribute

        let linkHref = link.getAttribute('href');
        if (linkHref) {
            // Normalize the href to get just the filename or base path
            let linkPath = linkHref.split('/').pop().split('#')[0].split('?')[0];
            if (linkPath === "" && linkHref.endsWith('/')) linkPath = "index.html"; // Handle root path
            else if (linkPath === "") linkPath = "index.html"; // Default if href is just "#something" or "?"

            // Normalize currentPageFilename as well (e.g. if it's empty, it means index.html)
            let normalizedCurrentPage = currentPageFilename;
            if (normalizedCurrentPage === "" || normalizedCurrentPage === "/") normalizedCurrentPage = "index.html";
            
            if (linkPath === normalizedCurrentPage) {
                link.classList.add('nav__link--active');
                link.setAttribute('aria-current', 'page');
                foundActive = true;
            }
        }
    });
    // If no exact match (e.g. on a sub-page not directly in nav), could highlight a parent, but simple match is fine.
    // console.log(`Dynamic Component Loader: Active nav link processing complete for ${currentPageFilename}. Found active: ${foundActive}`);
}

/**
 * Updates the copyright year in the footer.
 * This should be called *after* the footer component is loaded.
 */
function updateDynamicFooterYear() {
    const currentYearFooterSpan = document.getElementById('current-year-footer'); // ID from components/footer.html
    if (!currentYearFooterSpan) {
        // console.warn("Dynamic Component Loader: Footer year span ('current-year-footer') not found.");
        return;
    }

    const yearTextKey = currentYearFooterSpan.dataset.translateKey || 'footer_copyright_dynamic';
    let yearTextTemplate = currentYearFooterSpan.innerHTML || "{currentYear}"; // Use innerHTML to preserve surrounding text
                                                                            // Default fallback for template structure
    
    // If the span is initially empty but has a translate key, fetch the template from translations
    if (currentYearFooterSpan.textContent.trim() === '{currentYear}' && yearTextKey && typeof window.uplasTranslate === 'function') {
        yearTextTemplate = window.uplasTranslate(yearTextKey, { fallback: "© {currentYear} Uplas EdTech Solutions Ltd." });
    } else if (!yearTextTemplate.includes("{currentYear}")) { // If placeholder is missing in current content but should be there
         yearTextTemplate = (window.uplasTranslate && yearTextKey) ? window.uplasTranslate(yearTextKey, { fallback: `© {currentYear} Uplas.` }) : `© {currentYear} Uplas.`;
    }


    if (yearTextTemplate.includes("{currentYear}")) {
        currentYearFooterSpan.innerHTML = yearTextTemplate.replace("{currentYear}", new Date().getFullYear());
    } else if (!yearTextTemplate.match(/\d{4}/)) { // If no placeholder and no year found in default text
         currentYearFooterSpan.innerHTML = `© ${new Date().getFullYear()} ${yearTextTemplate}`;
    }
    // If already contains a year, assume it's fine or will be handled by translation refresh
    // console.log("Dynamic Component Loader: Footer year updated.");
}

// Make functions globally available if not using ES modules.
// If using modules, you would export them and import in global.js.
window.loadHTMLComponent = loadHTMLComponent;
window.setActiveNavLink = setActiveNavLink;
window.updateDynamicFooterYear = updateDynamicFooterYear;

console.log("Dynamic Component Loader (componentLoader.js) script loaded.");
