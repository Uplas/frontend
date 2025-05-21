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
            // Check if translations for this locale are already loaded
            if (translations[locale] && Object.keys(translations[locale]).length > 0) {
                // console.log(`Translations for ${locale} already loaded.`);
                return true;
            }

            const response = await fetch(`locales/${locale}.json`);
            if (!response.ok) {
                console.error(`Could not load translations for ${locale}. Status: ${response.status}`);
                // Attempt to fall back to English if the requested locale failed and isn't English
                if (locale !== 'en') {
                    console.warn(`Falling back to English translations.`);
                    return loadTranslations('en');
                }
                translations[locale] = {}; // Store empty to prevent re-fetching a known bad file
                return false;
            }
            translations[locale] = await response.json();
            // console.log(`Translations successfully loaded for ${locale}.`);
            return true;
        } catch (error) {
            console.error(`Error loading translation file for ${locale}:`, error);
            // Attempt to fall back to English on any catch error
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
        const langTranslations = translations[locale] || translations['en'] || {}; // Fallback to English if current locale's translations aren't loaded
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
        if (!translations[locale] && locale !== 'en') { // If target locale not loaded, try loading English first
            console.warn(`Translations for ${locale} not available for applyTranslationsToPage. Using English.`);
            locale = 'en'; // Default to English for applying if current locale is missing
        }
         if (!translations[locale]) {
            console.error(`Critical: English translations also not available for applyTranslationsToPage.`);
            return; // Cannot proceed without any translations
        }

        document.documentElement.lang = locale; // Set lang attribute on HTML tag

        document.querySelectorAll('[data-translate-key]').forEach(element => {
            const key = element.getAttribute('data-translate-key');
            const fallbackText = element.getAttribute('data-translate-fallback') || element.textContent || key;
            
            // Preserve children like <i> icons if possible
            if (element.querySelector('i') || element.children.length > 0 && element.childNodes.length > 1) {
                let textNodesToUpdate = [];
                element.childNodes.forEach(node => {
                    if (node.nodeType === Node.TEXT_NODE && node.textContent.trim() !== '') {
                        textNodesToUpdate.push(node);
                    }
                });
                // If only one significant text node, assume it's the one to translate
                if(textNodesToUpdate.length === 1) {
                     textNodesToUpdate[0].textContent = translate(key, { fallback: fallbackText.trim() }, locale);
                } else if (element.hasAttribute('data-translate-target') && element.dataset.translateTarget === 'self') {
                    // If explicit target is self, but still want to preserve children, set innerHTML carefully (more complex)
                    // For now, this case might need manual handling or improved logic
                    element.firstChild.textContent = translate(key, { fallback: fallbackText.trim() }, locale) + (element.innerHTML.includes(element.firstChild.textContent) ? "" : element.innerHTML.substring(element.innerHTML.indexOf("</i>")+4) ) ;
                } else { // Fallback to replacing all text content if structure is too complex
                     element.textContent = translate(key, { fallback: fallbackText }, locale);
                }
            } else {
                element.textContent = translate(key, { fallback: fallbackText }, locale);
            }
        });

        // Translate attributes
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


        // Execute all registered callbacks after language change
        onLanguageChangeCallbacks.forEach(cb => cb(locale));
    }

    /**
     * Sets the current locale, loads its translations, and applies them.
     * @param {string} locale - The new locale to set.
     */
    async function setLocale(locale) {
        if (!locale || currentLocale === locale) {
            // console.log(`Locale ${locale} is already set or invalid.`);
            return;
        }
        const loaded = await loadTranslations(locale);
        if (loaded) {
            currentLocale = locale;
            localStorage.setItem('uplas-lang', locale);
            applyTranslationsToPage(locale);
        } else {
            console.warn(`Failed to fully set locale to ${locale} because translations could not be loaded.`);
            // If primary load failed but fallback to 'en' happened, apply 'en'
            if (translations['en'] && Object.keys(translations['en']).length > 0) {
                currentLocale = 'en'; // Force currentLocale to 'en' if that's what we ended up loading
                localStorage.setItem('uplas-lang', 'en');
                applyTranslationsToPage('en');
                 // Update UI selector to reflect actual language
                const languageSelector = document.getElementById('language-selector');
                if(languageSelector) languageSelector.value = 'en';
            }
        }
    }

    function getCurrentLocale() {
        return currentLocale;
    }
    
    /**
     * Registers a callback function to be executed when the language changes.
     * @param {function} callback - The callback function. It receives the new locale as an argument.
     */
    function onLanguageChange(callback) {
        if (typeof callback === 'function') {
            onLanguageChangeCallbacks.push(callback);
        }
    }


    /**
     * Initializes the i18n manager.
     * Loads the preferred language (from localStorage or default) and applies translations.
     * @param {string} [defaultLocale='en'] - The default locale if none is set.
     */
    async function init(defaultLocale = 'en') {
        const savedLocale = localStorage.getItem('uplas-lang') || defaultLocale;
        currentLocale = savedLocale; // Set before initial load attempt
        await loadTranslations(savedLocale); // Attempt to load saved/default locale
        
        // Check what was actually loaded (could be 'en' if savedLocale failed)
        const effectiveLocale = translations[currentLocale] && Object.keys(translations[currentLocale]).length > 0 ? currentLocale : 'en';
        
        if (!translations[effectiveLocale] || Object.keys(translations[effectiveLocale]).length === 0) {
            // If even English didn't load, this is a critical issue
            console.error("CRITICAL: No translations could be loaded, not even for the default English locale.");
        } else {
            currentLocale = effectiveLocale; // Ensure currentLocale reflects what's actually usable
            localStorage.setItem('uplas-lang', currentLocale);
            applyTranslationsToPage(currentLocale);
        }

        // Expose the translate function globally for convenience in other scripts
        window.uplasTranslate = translate;
        // Expose other functions if needed globally, or prefer module exports if using a build system
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
        loadTranslations // Expose for potential preloading strategies
    };
})();

// The initialization will be called from global.js
