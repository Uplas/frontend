// js/componentLoader.js
// Handles loading HTML components like header and footer into placeholder elements.
'use strict';

/**
 * Fetches HTML content from a given path and injects it into a target element.
 * @param {string} componentPath - The path to the HTML component file (e.g., 'components/header.html').
 * @param {string} targetElementId - The ID of the HTML element where the component will be loaded.
 * @param {string} [currentPageFile] - Optional: The filename of the current page (e.g., 'index.html') for highlighting active nav links.
 * @returns {Promise<boolean>} True if successful, false otherwise.
 */
async function loadHTMLComponent(componentPath, targetElementId, currentPageFile) {
    const targetElement = document.getElementById(targetElementId);
    if (!targetElement) {
        console.error(`Target element '${targetElementId}' not found for component '${componentPath}'.`);
        return false;
    }

    try {
        const response = await fetch(componentPath);
        if (!response.ok) {
            throw new Error(`Failed to fetch component ${componentPath}: ${response.status} ${response.statusText}`);
        }
        const htmlContent = await response.text();
        targetElement.innerHTML = htmlContent;

        // After injecting HTML, re-run translation for the new content if i18nManager is ready and defined
        if (typeof window.uplasApplyTranslations === 'function' && typeof window.uplasGetCurrentLocale === 'function') {
            // It's better if uplasApplyTranslations can take a scope (the targetElement)
            // For now, re-translating the whole page, which is fine for header/footer.
            window.uplasApplyTranslations(window.uplasGetCurrentLocale());
        }

        // After loading header, set active navigation link
        if (targetElementId === 'site-header-placeholder' && typeof setActiveNavLink === 'function' && currentPageFile) {
            setActiveNavLink(currentPageFile);
        }
        
        // If footer is loaded and has a year placeholder, ensure it's updated
        if (targetElementId === 'site-footer-placeholder' && typeof updateDynamicFooterYear === 'function') {
            updateDynamicFooterYear(); // Call a specific function to handle footer year
        }


        return true;
    } catch (error) {
        console.error(`Error loading component '${componentPath}' into '${targetElementId}':`, error);
        targetElement.innerHTML = `<p style="color:var(--color-error); padding: 1rem;">Error loading ${targetElementId.replace('-placeholder', '')}.</p>`;
        return false;
    }
}

/**
 * Sets the active class on the correct navigation link based on the current page.
 * This should be called *after* the header component is loaded.
 * @param {string} currentPageFilename - The filename of the current page (e.g., 'index.html').
 */
function setActiveNavLink(currentPageFilename) {
    const navLinks = document.querySelectorAll('#main-navigation .nav__link'); // Selector from components/header.html
    if (navLinks.length === 0) return;

    navLinks.forEach(link => {
        link.classList.remove('nav__link--active');
        link.removeAttribute('aria-current');
        
        let linkFilename = link.getAttribute('href');
        if (linkFilename) {
            // Handle absolute URLs or relative URLs correctly
            if (linkFilename.includes('/')) {
                linkFilename = linkFilename.substring(linkFilename.lastIndexOf('/') + 1);
            }
            linkFilename = linkFilename.split('#')[0].split('?')[0]; // Remove hash and query params

            if (linkFilename === currentPageFilename || (linkFilename === 'index.html' && currentPageFilename === '')) {
                link.classList.add('nav__link--active');
                link.setAttribute('aria-current', 'page');
            }
        }
    });
}

/**
 * Updates the copyright year in the footer.
 * This should be called *after* the footer component is loaded.
 */
function updateDynamicFooterYear() {
    const currentYearFooterSpan = document.getElementById('current-year-footer'); // ID from components/footer.html
    if (currentYearFooterSpan) {
        const yearTextKey = currentYearFooterSpan.dataset.translateKey || 'footer_copyright_dynamic'; // Default key if not set
        let yearTextContent = currentYearFooterSpan.textContent || "{currentYear}"; // Fallback content with placeholder

        if (yearTextKey && typeof window.uplasTranslate === 'function') {
            yearTextContent = window.uplasTranslate(yearTextKey, { fallback: "© {currentYear} Uplas EdTech Solutions Ltd." });
        }
        
        if (yearTextContent && yearTextContent.includes("{currentYear}")) {
            currentYearFooterSpan.textContent = yearTextContent.replace("{currentYear}", new Date().getFullYear());
        } else if (yearTextContent && !yearTextContent.match(/\d{4}/)) { 
             currentYearFooterSpan.innerHTML = `© ${new Date().getFullYear()} ${yearTextContent}`;
        } else if (!yearTextContent.trim()) {
            currentYearFooterSpan.textContent = `© ${new Date().getFullYear()}`;
        }
    }
}

// Expose functions to be used by global.js or other scripts if loaded as a module
// For simple script include, they are already global.
// window.loadHTMLComponent = loadHTMLComponent;
// window.setActiveNavLink = setActiveNavLink;
// window.updateDynamicFooterYear = updateDynamicFooterYear;
