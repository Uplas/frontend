// js/i18n.js
// Manages internationalization for the Uplas platform.

const i18nManager = (() => {
    let currentLocale = 'en'; // Default locale
    let translations = {}; // To store loaded translation files { en: {...}, es: {...} }
    const onLanguageChangeCallbacks = []; // Callbacks to run after language changes

    /**
     * Loads translation data for a given locale from its JSON file.
     * @param {string} locale - The locale to load (e.g., 'en', 'es').
     * @returns {Promise<boolean>} True if loading was successful, false otherwise.
     */
    async function loadTranslations(locale = currentLocale) {
        try {
            if (translations[locale] && Object.keys(translations[locale]).length > 0) {
                return true;
            }

            const response = await fetch(`locales/${locale}.json`);
            if (!response.ok) {
                console.error(`Could not load translations for ${locale}. Status: ${response.status}`);
                if (locale !== 'en') {
                    console.warn(`Falling back to English translations.`);
                    return loadTranslations('en');
                }
                translations[locale] = {}; 
                return false;
            }
            translations[locale] = await response.json();
            return true;
        } catch (error) {
            console.error(`Error loading translation file for ${locale}:`, error);
            if (locale !== 'en') {
                console.warn(`Falling back to English translations due to error.`);
                return loadTranslations('en');
            }
            translations[locale] = {};
            return false;
        }
    }

    /**
     * Gets a translated string for a given key, with basic placeholder support.
     * Placeholders in the string should be like {placeholder_name}.
     * @param {string} key - The translation key.
     * @param {object} [options] - Optional: { variables: {placeholder_name: value}, fallback: "Fallback text" }.
     * @param {string} [locale=currentLocale] - The locale to translate for.
     * @returns {string} The translated (and interpolated) string, or fallback, or the key itself.
     */
    function translate(key, options = {}, locale = currentLocale) {
        const langTranslations = translations[locale] || translations['en'] || {}; 
        let translationString = langTranslations[key] || options.fallback || key;

        if (options.variables && typeof translationString === 'string') {
            for (const placeholder in options.variables) {
                if (Object.prototype.hasOwnProperty.call(options.variables, placeholder)) {
                    const regex = new RegExp(`{\\s*${placeholder}\\s*}`, 'g');
                    translationString = translationString.replace(regex, options.variables[placeholder]);
                }
            }
        }
        return translationString;
    }

    /**
     * Applies translations to all elements on the page with `data-translate-key`
     * and other translation-related data attributes.
     * @param {string} [locale=currentLocale] - The locale to apply.
     */
    function applyTranslationsToPage(locale = currentLocale) {
        if (!translations[locale] && locale !== 'en') { 
            console.warn(`Translations for ${locale} not available for applyTranslationsToPage. Using English.`);
            locale = 'en'; 
        }
         if (!translations[locale]) {
            console.error(`Critical: English translations also not available for applyTranslationsToPage.`);
            return; 
        }

        document.documentElement.lang = locale; 

        document.querySelectorAll('[data-translate-key]').forEach(element => {
            const key = element.getAttribute('data-translate-key');
            const fallbackText = element.getAttribute('data-translate-fallback') || element.textContent.trim() || key;
            const translatedValue = translate(key, { fallback: fallbackText }, locale);

            // Attempt to preserve child elements like <i> icons
            if (element.children.length > 0 && element.childNodes.length > 1) {
                let textNodeFound = false;
                element.childNodes.forEach(node => {
                    if (node.nodeType === Node.TEXT_NODE && node.textContent.trim().length > 0) {
                        node.textContent = translatedValue;
                        textNodeFound = true;
                    }
                });
                // If no main text node was found among siblings, but the key is on a wrapper,
                // this might indicate the key should be on a more specific child (e.g., a span).
                // As a last resort, or if it's a simple element, set textContent.
                if (!textNodeFound) {
                     // If element is simple (like <title> or <option>) or has no complex children, set textContent
                    if (!element.querySelector('*') || ['TITLE', 'OPTION'].includes(element.tagName)) {
                        element.textContent = translatedValue;
                    } else {
                        // For more complex cases where a wrapper has the key, this is difficult to handle generically
                        // without potentially breaking structure. Best practice is to put keys on specific text spans.
                        // console.warn(`Key '${key}' on element <${element.tagName.toLowerCase()}> with children. Consider moving key to a text-specific span.`);
                        // Fallback: If there's a text node that seems primary, update it. Often the first or last.
                        // This part of your original logic was a bit complex; simplifying to a common case.
                        // If a single text node is the primary content of a button or link with an icon, this might work.
                        const firstTextNode = Array.from(element.childNodes).find(n => n.nodeType === Node.TEXT_NODE && n.textContent.trim());
                        if (firstTextNode) {
                            firstTextNode.textContent = translatedValue;
                        } else {
                             element.textContent = translatedValue; // Final fallback, might overwrite children.
                        }
                    }
                }
            } else {
                element.textContent = translatedValue;
            }
        });

        document.querySelectorAll('[data-translate-placeholder-key]').forEach(element => {
            const key = element.getAttribute('data-translate-placeholder-key');
            element.placeholder = translate(key, { fallback: element.placeholder }, locale);
        });
        document.querySelectorAll('[data-translate-title-key]').forEach(element => {
            const key = element.getAttribute('data-translate-title-key');
            element.title = translate(key, { fallback: element.title }, locale);
        });
        document.querySelectorAll('[data-translate-aria-label-key]').forEach(element => {
            const key = element.getAttribute('data-translate-aria-label-key');
            element.setAttribute('aria-label', translate(key, { fallback: element.getAttribute('aria-label') }, locale));
        });
         document.querySelectorAll('[data-translate-alt-key]').forEach(element => {
            const key = element.getAttribute('data-translate-alt-key');
            element.alt = translate(key, { fallback: element.alt }, locale);
        });

        onLanguageChangeCallbacks.forEach(cb => cb(locale));
    }

    /**
     * Sets the current locale, loads its translations, and applies them.
     * @param {string} locale - The new locale to set.
     */
    async function setLocale(locale) {
        if (!locale || currentLocale === locale && Object.keys(translations[locale] || {}).length > 0) {
            return;
        }
        const loaded = await loadTranslations(locale);
        if (loaded) {
            const previousLocale = currentLocale;
            currentLocale = (translations[locale] && Object.keys(translations[locale]).length > 0) ? locale : 'en';
            
            if (previousLocale !== currentLocale || !translations[previousLocale]) { // Apply if locale changed or previous was not loaded
                localStorage.setItem('uplas-lang', currentLocale);
                applyTranslationsToPage(currentLocale);
                 // Update UI selector to reflect actual language
                const languageSelector = document.getElementById('language-selector');
                if(languageSelector && languageSelector.value !== currentLocale) {
                    languageSelector.value = currentLocale;
                }
            }
        } else {
            console.warn(`Failed to fully set locale to ${locale}.`);
            if (currentLocale !== 'en' && translations['en'] && Object.keys(translations['en']).length > 0) {
                currentLocale = 'en'; 
                localStorage.setItem('uplas-lang', 'en');
                applyTranslationsToPage('en');
                const languageSelector = document.getElementById('language-selector');
                if(languageSelector) languageSelector.value = 'en';
            }
        }
    }

    function getCurrentLocale() {
        return currentLocale;
    }
    
    function onLanguageChange(callback) {
        if (typeof callback === 'function') {
            onLanguageChangeCallbacks.push(callback);
        }
    }

    async function init(defaultLocale = 'en') {
        const savedLocale = localStorage.getItem('uplas-lang') || defaultLocale;
        // Ensure currentLocale is set before any async operations that might depend on it.
        currentLocale = savedLocale; 
        
        await loadTranslations(savedLocale); 
        
        // After attempting to load, determine the effective locale (could be 'en' if savedLocale failed)
        const effectiveLocale = (translations[currentLocale] && Object.keys(translations[currentLocale]).length > 0) ? currentLocale : 'en';
        
        if (!translations[effectiveLocale] || Object.keys(translations[effectiveLocale]).length === 0) {
            // This means even English failed to load, which is critical.
            console.error("CRITICAL: No translations could be loaded, not even for the default English locale.");
        } else {
            // If the effective locale is different from what we thought was current (e.g., fallback occurred)
            if (currentLocale !== effectiveLocale) {
                currentLocale = effectiveLocale;
                localStorage.setItem('uplas-lang', currentLocale);
            }
            applyTranslationsToPage(currentLocale);
        }

        window.uplasTranslate = translate;
        window.uplasChangeLanguage = setLocale;
        window.uplasApplyTranslations = applyTranslationsToPage; // Make available for dynamic content
        window.uplasOnLanguageChange = onLanguageChange;
        window.uplasGetCurrentLocale = getCurrentLocale;

        console.log(`i18nManager initialized. Effective locale: ${currentLocale}`);
    }

    return {
        init,
        setLocale,
        translate,
        applyTranslationsToPage,
        getCurrentLocale,
        onLanguageChange,
        loadTranslations 
    };
})();

// Initialization is expected to be called by global.js or similar central script
// after DOMContentLoaded, e.g., i18nManager.init('en');
