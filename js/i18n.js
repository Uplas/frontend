// js/i18n.js
// Manages internationalization for the Uplas platform.

const i18nManager = (() => {
    let currentLocale = 'en'; // Default locale
    let translations = {}; // To store loaded translation files { en: {...}, es: {...}, de: {...}, etc. }
    const onLanguageChangeCallbacks = []; // Callbacks to run after language changes

    /**
     * Loads translation data for a given locale from its JSON file.
     * @param {string} locale - The locale to load (e.g., 'en', 'es', 'de').
     * @returns {Promise<boolean>} True if loading was successful, false otherwise.
     */
    async function loadTranslations(locale = currentLocale) {
        try {
            if (translations[locale] && Object.keys(translations[locale]).length > 0) {
                // console.log(`i18n: Translations for ${locale} already loaded.`);
                return true;
            }

            const response = await fetch(`locales/${locale}.json`); // Fetches the locale file.
            if (!response.ok) {
                console.error(`i18n: Could not load translations for ${locale}. Status: ${response.status}`);
                if (locale !== 'en') {
                    console.warn(`i18n: Falling back to English translations for ${locale}.`);
                    return loadTranslations('en'); // Attempt to load English as a fallback.
                }
                translations[locale] = {}; // Mark as failed to prevent re-fetch
                return false;
            }
            translations[locale] = await response.json();
            // console.log(`i18n: Translations successfully loaded for ${locale}.`);
            return true;
        } catch (error) {
            console.error(`i18n: Error loading translation file for ${locale}:`, error);
            if (locale !== 'en') {
                console.warn(`i18n: Falling back to English translations due to error for ${locale}.`);
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
        return String(translationString);
    }

    /**
     * Applies translations to elements within a given root element (or the whole document)
     * that have `data-translate-key` and other translation-related data attributes.
     * @param {HTMLElement} [rootElement=document.body] - The root element to apply translations within.
     * @param {string} [localeToApply=currentLocale] - The locale to apply.
     */
    function applyTranslationsToPage(rootElement = document.body, localeToApply = currentLocale) {
        if (!rootElement) {
            console.warn("i18n: applyTranslationsToPage called with no rootElement.");
            return;
        }
        let effectiveLocale = localeToApply;

        if (!translations[effectiveLocale] || Object.keys(translations[effectiveLocale]).length === 0) {
            if (effectiveLocale !== 'en' && translations['en'] && Object.keys(translations['en']).length > 0) {
                // console.warn(`i18n: Translations for ${effectiveLocale} not available/empty. Using English for element:`, rootElement);
                effectiveLocale = 'en';
            } else {
                console.error(`i18n: Critical - No usable translations (neither for ${effectiveLocale} nor English) for applyTranslations.`);
                return;
            }
        }
        // Set lang attribute on html element only if translating the whole document
        if (rootElement === document.body || rootElement === document.documentElement) {
            document.documentElement.lang = effectiveLocale;
        }

        rootElement.querySelectorAll('[data-translate-key]').forEach(element => {
            const key = element.getAttribute('data-translate-key');
            const fallbackText = element.getAttribute('data-translate-fallback') || element.textContent.trim() || key;
            const translatedValue = translate(key, { fallback: fallbackText }, effectiveLocale);

            // More careful handling of elements with children (e.g., icons inside buttons)
            let textNodeToUpdate = null;
            if (element.childNodes.length > 0) {
                for (let i = 0; i < element.childNodes.length; i++) {
                    const node = element.childNodes[i];
                    if (node.nodeType === Node.TEXT_NODE && node.textContent.trim().length > 0) {
                        // Prefer a text node that isn't just whitespace around other elements
                        const prevSibling = node.previousSibling;
                        const nextSibling = node.nextSibling;
                        const isStandaloneText = 
                            (!prevSibling || prevSibling.nodeType !== Node.ELEMENT_NODE || !prevSibling.textContent.trim()) &&
                            (!nextSibling || nextSibling.nodeType !== Node.ELEMENT_NODE || !nextSibling.textContent.trim());

                        if (isStandaloneText || !textNodeToUpdate) { // Prioritize standalone or take first found
                           textNodeToUpdate = node;
                           if(isStandaloneText) break; // Found a good candidate
                        }
                    }
                }
            }

            if (textNodeToUpdate) {
                textNodeToUpdate.textContent = translatedValue;
            } else if (['TITLE', 'OPTION', 'TEXTAREA', 'BUTTON'].includes(element.tagName) && element.children.length === 0) {
                 // For simple elements or buttons without child icons, setting textContent is fine
                 element.textContent = translatedValue;
            } else if (element.children.length === 0) { // If no children at all, set textContent
                 element.textContent = translatedValue;
            } else {
                // Fallback: If it's a complex element and no clear text node was found,
                // search for a child span specifically marked for text content if any, or log a warning.
                const textSpan = element.querySelector('.translatable-text-content');
                if (textSpan) {
                    textSpan.textContent = translatedValue;
                } else if (element.tagName !== 'SELECT' && element.tagName !== 'NAV' && element.tagName !== 'UL' && element.tagName !== 'DIV' && element.tagName !== 'MAIN' && element.tagName !== 'HEADER' && element.tagName !== 'FOOTER' && element.tagName !== 'ASIDE' && element.tagName !== 'SECTION' && element.tagName !== 'ARTICLE' && element.tagName !== 'FORM') {
                    // Avoid setting textContent on major structural or container elements
                    // unless they are explicitly meant to only contain this text.
                    // console.warn(`i18n: Element <${element.tagName.toLowerCase()}> with key '${key}' has children but no clear text node or '.translatable-text-content' span. Text not directly set to avoid overwriting children. Original content: "${element.innerHTML.substring(0,50)}..."`);
                }
            }
        });

        rootElement.querySelectorAll('[data-translate-placeholder-key]').forEach(element => {
            const key = element.getAttribute('data-translate-placeholder-key');
            element.placeholder = translate(key, { fallback: element.placeholder }, effectiveLocale);
        });
        rootElement.querySelectorAll('[data-translate-title-key]').forEach(element => {
            const key = element.getAttribute('data-translate-title-key');
            element.title = translate(key, { fallback: element.title }, effectiveLocale);
        });
        rootElement.querySelectorAll('[data-translate-aria-label-key]').forEach(element => {
            const key = element.getAttribute('data-translate-aria-label-key');
            element.setAttribute('aria-label', translate(key, { fallback: element.getAttribute('aria-label') }, effectiveLocale));
        });
        rootElement.querySelectorAll('[data-translate-alt-key]').forEach(element => {
            const key = element.getAttribute('data-translate-alt-key');
            element.alt = translate(key, { fallback: element.alt }, effectiveLocale);
        });

        // If we translated the whole document body, then run global callbacks.
        // If only a part of the page was translated (e.g., a loaded component),
        // global callbacks might not need to run, or specific callbacks for that component.
        // For simplicity, we'll run all callbacks, they should be idempotent.
        if (rootElement === document.body || rootElement === document.documentElement) {
            onLanguageChangeCallbacks.forEach(cb => cb(effectiveLocale));
        }
    }

    /**
     * Sets the current locale, loads its translations, and applies them to the whole page.
     * @param {string} newLocale - The new locale to set.
     */
    async function setLocale(newLocale) {
        if (!newLocale || typeof newLocale !== 'string') {
            console.warn(`i18n: Invalid locale provided to setLocale: ${newLocale}. Using current: ${currentLocale}`);
            return;
        }
        if (currentLocale === newLocale && translations[newLocale] && Object.keys(translations[newLocale]).length > 0) {
            // console.log(`i18n: Locale ${newLocale} is already set and loaded.`);
            // Optionally, re-apply translations if DOM might have changed dynamically without i18n knowing
            // applyTranslationsToPage(document.body, currentLocale);
            return;
        }

        const loadedSuccessfully = await loadTranslations(newLocale);
        
        const effectiveLocale = (translations[newLocale] && Object.keys(translations[newLocale]).length > 0) 
                               ? newLocale 
                               : 'en';

        if (currentLocale !== effectiveLocale || !loadedSuccessfully || Object.keys(translations[effectiveLocale] || {}).length === 0) {
            currentLocale = effectiveLocale; // Update to the locale that actually has translations (or 'en' fallback)
            localStorage.setItem('uplas-lang', currentLocale);
            
            // Ensure the language selector reflects the true current locale
            const languageSelector = document.getElementById('language-selector');
            if (languageSelector && languageSelector.value !== currentLocale) {
                languageSelector.value = currentLocale;
            }
        }
        // Always apply translations, even if locale didn't change but was reloaded (e.g. from cache check)
        // or if it fell back to English.
        applyTranslationsToPage(document.body, currentLocale); // Apply to whole page
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
        currentLocale = savedLocale;

        await loadTranslations(currentLocale);
        
        const effectiveLocaleAfterLoad = (translations[currentLocale] && Object.keys(translations[currentLocale]).length > 0) 
                                          ? currentLocale 
                                          : 'en';
        
        if (currentLocale !== effectiveLocaleAfterLoad) {
            console.warn(`i18n: Initial locale '${currentLocale}' failed or was empty, falling back to '${effectiveLocaleAfterLoad}'.`);
            currentLocale = effectiveLocaleAfterLoad;
            localStorage.setItem('uplas-lang', currentLocale);
        }
        
        if (currentLocale === 'en' && (!translations['en'] || Object.keys(translations['en']).length === 0)) {
            await loadTranslations('en'); // Ensure English is loaded if it's the final effective locale
        }

        if (!translations[currentLocale] || Object.keys(translations[currentLocale]).length === 0) {
            console.error(`i18n: CRITICAL - No translations could be loaded for effective locale '${currentLocale}'. UI will not be translated.`);
        } else {
            applyTranslationsToPage(document.body, currentLocale); // Apply to whole page
        }

        window.uplasTranslate = translate;
        window.uplasSetLanguage = setLocale; // Renamed for clarity from changeLanguage
        window.uplasApplyTranslations = applyTranslationsToPage; 
        window.uplasOnLanguageChange = onLanguageChange;
        window.uplasGetCurrentLocale = getCurrentLocale;

        console.log(`i18nManager initialized. Effective locale: ${currentLocale}`);
    }

    return {
        init,
        setLocale, // Keep internal name consistent
        translate,
        applyTranslationsToPage, // Keep internal name consistent
        getCurrentLocale,
        onLanguageChange,
        loadTranslations
    };
})();

// Example Initialization (typically called from global.js or main app script)
// document.addEventListener('DOMContentLoaded', () => {
//     if (typeof i18nManager !== 'undefined' && typeof i18nManager.init === 'function') {
//         i18nManager.init('en'); 
//     }
// });
