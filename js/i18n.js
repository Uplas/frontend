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
            // Check if translations for this locale are already loaded and not empty
            if (translations[locale] && Object.keys(translations[locale]).length > 0) {
                // console.log(`Translations for ${locale} already loaded and cached.`);
                return true;
            }

            const response = await fetch(`locales/${locale}.json`);
            if (!response.ok) {
                console.error(`Could not load translations for ${locale}. Status: ${response.status}`);
                // Attempt to fall back to English if the requested locale failed and isn't English
                if (locale !== 'en') {
                    console.warn(`Falling back to English translations for ${locale}.`);
                    return loadTranslations('en'); // This will set translations['en']
                }
                translations[locale] = {}; // Store empty to prevent re-fetching a known bad file
                return false;
            }
            translations[locale] = await response.json();
            // console.log(`Translations successfully loaded for ${locale}.`);
            return true;
        } catch (error) {
            console.error(`Error loading translation file for ${locale}:`, error);
            if (locale !== 'en') {
                console.warn(`Falling back to English translations due to error for ${locale}.`);
                return loadTranslations('en');
            }
            translations[locale] = {}; // Store empty on error to prevent re-fetching
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
        return String(translationString); // Ensure it's always a string
    }

    /**
     * Applies translations to all elements on the page with `data-translate-key`
     * and other translation-related data attributes.
     * @param {string} [localeToApply=currentLocale] - The locale to apply.
     */
    function applyTranslationsToPage(localeToApply = currentLocale) {
        let effectiveLocale = localeToApply;

        if (!translations[effectiveLocale] || Object.keys(translations[effectiveLocale]).length === 0) {
            if (effectiveLocale !== 'en' && translations['en'] && Object.keys(translations['en']).length > 0) {
                console.warn(`Translations for ${effectiveLocale} not available or empty. Using English as fallback for page application.`);
                effectiveLocale = 'en';
            } else {
                console.error(`Critical: No usable translations (neither for ${effectiveLocale} nor English) available for applyTranslationsToPage.`);
                return; 
            }
        }

        document.documentElement.lang = effectiveLocale; 

        document.querySelectorAll('[data-translate-key]').forEach(element => {
            const key = element.getAttribute('data-translate-key');
            const fallbackText = element.getAttribute('data-translate-fallback') || element.textContent.trim() || key;
            const translatedValue = translate(key, { fallback: fallbackText }, effectiveLocale);

            if (element.children.length > 0 && element.childNodes.length > 1) {
                let mainTextNode = null;
                for (let i = 0; i < element.childNodes.length; i++) {
                    const node = element.childNodes[i];
                    if (node.nodeType === Node.TEXT_NODE && node.textContent.trim().length > 0) {
                        // Prioritize a text node that isn't just whitespace around a child element
                        if ((i === 0 || element.childNodes[i-1].nodeType !== Node.ELEMENT_NODE) && 
                            (i === element.childNodes.length - 1 || element.childNodes[i+1].nodeType !== Node.ELEMENT_NODE)) {
                            mainTextNode = node;
                            break;
                        }
                        if (!mainTextNode) mainTextNode = node; // Fallback to any text node
                    }
                }
                if (mainTextNode) {
                    mainTextNode.textContent = translatedValue;
                } else if (['TITLE', 'OPTION'].includes(element.tagName)) {
                     element.textContent = translatedValue;
                } else {
                    // If no distinct text node, it might be a wrapper. Cautiously set textContent.
                    // This might overwrite icons if not careful with HTML structure.
                    // Best practice: data-translate-key on the specific text-bearing span.
                    // For simple cases like <button><i class="icon"></i> Text</button>, this might need specific handling
                    // if `Text` is the only textNode, but it might be safer to wrap "Text" in a <span> with the key.
                    // console.warn(`Complex element <${element.tagName.toLowerCase()}> with key '${key}'. Consider specific text span for translation.`);
                    element.textContent = translatedValue; // Fallback with potential to overwrite - review HTML structure for these.
                }
            } else {
                element.textContent = translatedValue;
            }
        });

        document.querySelectorAll('[data-translate-placeholder-key]').forEach(element => {
            const key = element.getAttribute('data-translate-placeholder-key');
            element.placeholder = translate(key, { fallback: element.placeholder }, effectiveLocale);
        });
        document.querySelectorAll('[data-translate-title-key]').forEach(element => {
            const key = element.getAttribute('data-translate-title-key');
            element.title = translate(key, { fallback: element.title }, effectiveLocale);
        });
        document.querySelectorAll('[data-translate-aria-label-key]').forEach(element => {
            const key = element.getAttribute('data-translate-aria-label-key');
            element.setAttribute('aria-label', translate(key, { fallback: element.getAttribute('aria-label') }, effectiveLocale));
        });
         document.querySelectorAll('[data-translate-alt-key]').forEach(element => {
            const key = element.getAttribute('data-translate-alt-key');
            element.alt = translate(key, { fallback: element.alt }, effectiveLocale);
        });

        onLanguageChangeCallbacks.forEach(cb => cb(effectiveLocale));
    }

    /**
     * Sets the current locale, loads its translations, and applies them.
     * @param {string} newLocale - The new locale to set.
     */
    async function setLocale(newLocale) {
        if (!newLocale || (currentLocale === newLocale && translations[newLocale] && Object.keys(translations[newLocale]).length > 0)) {
            // console.log(`Locale ${newLocale} is already set and loaded, or invalid.`);
            return;
        }

        const loadedSuccessfully = await loadTranslations(newLocale);
        
        const effectiveLocale = (translations[newLocale] && Object.keys(translations[newLocale]).length > 0) 
                               ? newLocale 
                               : 'en'; // Fallback to 'en' if newLocale failed or is empty

        if (currentLocale !== effectiveLocale || !loadedSuccessfully) { // Apply if locale actually changed or if a reload was attempted
            currentLocale = effectiveLocale;
            localStorage.setItem('uplas-lang', currentLocale);
            applyTranslationsToPage(currentLocale);
            
            const languageSelector = document.getElementById('language-selector');
            if (languageSelector && languageSelector.value !== currentLocale) {
                languageSelector.value = currentLocale;
            }
        } else if (loadedSuccessfully && currentLocale === newLocale) {
            // Locale was already current and successfully re-confirmed/loaded (e.g. from cache)
            // Still apply translations in case DOM changed
            applyTranslationsToPage(currentLocale);
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
        currentLocale = savedLocale; // Set initial currentLocale

        await loadTranslations(savedLocale); // Attempt to load
        
        // Determine effective locale after load attempt (might have fallen back to 'en')
        const effectiveLocaleAfterLoad = (translations[currentLocale] && Object.keys(translations[currentLocale]).length > 0) 
                                          ? currentLocale 
                                          : 'en';
        
        if (currentLocale !== effectiveLocaleAfterLoad) {
            console.warn(`Initial locale '${currentLocale}' failed or was empty, falling back to '${effectiveLocaleAfterLoad}'.`);
            currentLocale = effectiveLocaleAfterLoad;
            localStorage.setItem('uplas-lang', currentLocale); // Update storage if fallback occurred
        }
        
        // Ensure English is loaded if it's the effective (or fallback) locale and wasn't already loaded
        if (currentLocale === 'en' && (!translations['en'] || Object.keys(translations['en']).length === 0)) {
            await loadTranslations('en');
        }

        if (!translations[currentLocale] || Object.keys(translations[currentLocale]).length === 0) {
            console.error(`CRITICAL: No translations could be loaded for effective locale '${currentLocale}'. UI will not be translated.`);
        } else {
            applyTranslationsToPage(currentLocale);
        }

        // Expose functions to global window object
        window.uplasTranslate = translate;
        window.uplasChangeLanguage = setLocale;
        window.uplasApplyTranslations = applyTranslationsToPage; 
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
        loadTranslations // Exposed for potential preloading or advanced use
    };
})();

// Initialization is typically called from a global script like global.js
// after DOMContentLoaded. For example:
// if (typeof i18nManager !== 'undefined' && typeof i18nManager.init === 'function') {
//     i18nManager.init('en'); 
// }
