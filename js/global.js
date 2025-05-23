// Uplas Frontend: js/global.js
// Handles theme, currency, mobile navigation, and initializes i18n.

document.addEventListener('DOMContentLoaded', () => {
    // --- Theme Management ---
    const themeToggleButton = document.getElementById('theme-toggle');
    const prefersDarkScheme = window.matchMedia('(prefers-color-scheme: dark)');

    const pathSegments = window.location.pathname.split('/');
    let currentPageFile = pathSegments.pop() || 'index.html'; // Default to index.html if path ends with /
    if (currentPageFile.trim() === "") currentPageFile = "index.html";

     // Load Header and Footer Components FIRST
    const headerPlaceholder = document.getElementById('site-header-placeholder');
    const footerPlaceholder = document.getElementById('site-footer-placeholder');
    let headerLoaded = false;
    let footerLoaded = false;

    if (typeof loadHTMLComponent === 'function') { // Check if componentLoader.js is loaded
        if (headerPlaceholder) {
            headerLoaded = await loadHTMLComponent('components/header.html', 'site-header-placeholder', currentPageFile);
        }
        if (footerPlaceholder) {
            footerLoaded = await loadHTMLComponent('components/footer.html', 'site-footer-placeholder');
        }
    } else {
        console.error("componentLoader.js and loadHTMLComponent function not found. Header/Footer will not be loaded dynamically.");
    }


    // Store current theme toggle aria-label keys for dynamic updates
    const themeAriaLabels = {
        light: 'theme_toggle_dark', // Aria label key when in light mode (button shows moon, action is "Switch to Dark")
        dark: 'theme_toggle_light'  // Aria label key when in dark mode (button shows sun, action is "Switch to Light")
    };
    const themeAriaLabelDefaults = {
        light: 'Switch to Dark Mode',
        dark: 'Switch to Light Mode'
    };


    function applyTheme(theme) {
        const isDark = theme === 'dark';
        document.body.classList.toggle('dark-mode', isDark);
        if (themeToggleButton) {
            themeToggleButton.innerHTML = isDark ? '<i class="fas fa-sun"></i>' : '<i class="fas fa-moon"></i>';
            // Ensure i18nManager and translate function are available before using
            if (typeof window.uplasTranslate === 'function') {
                const ariaKey = isDark ? themeAriaLabels.dark : themeAriaLabels.light;
                const ariaDefault = isDark ? themeAriaLabelDefaults.dark : themeAriaLabelDefaults.light;
                themeToggleButton.setAttribute('aria-label', window.uplasTranslate(ariaKey, { fallback: ariaDefault }));
            } else { // Fallback if i18n not ready
                 themeToggleButton.setAttribute('aria-label', isDark ? themeAriaLabelDefaults.dark : themeAriaLabelDefaults.light);
            }
        }
    }

    function toggleTheme() {
        const currentThemeIsDark = document.body.classList.contains('dark-mode');
        const newTheme = currentThemeIsDark ? 'light' : 'dark';
        localStorage.setItem('uplas-theme', newTheme);
        applyTheme(newTheme);
    }

    if (themeToggleButton) {
        themeToggleButton.addEventListener('click', toggleTheme);
    }

    // --- Language Management (Delegated to i18nManager) ---
    const languageSelector = document.getElementById('language-selector');

    if (languageSelector) {
        // Set initial value after i18nManager has initialized and determined the current locale
        if (typeof window.uplasOnLanguageChange === 'function') {
            window.uplasOnLanguageChange((newLocale) => { // This will be called by i18nManager.init
                if (languageSelector.value !== newLocale) {
                    languageSelector.value = newLocale;
                }
            });
        } else { // Fallback if i18nManager is not exposing onLanguageChange (e.g. script order issue)
             const savedLang = localStorage.getItem('uplas-lang') || 'en';
             languageSelector.value = savedLang;
        }

        languageSelector.addEventListener('change', (event) => {
            if (typeof window.uplasChangeLanguage === 'function') {
                window.uplasChangeLanguage(event.target.value);
            } else {
                console.error("i18nManager.setLocale (uplasChangeLanguage) is not available.");
            }
        });
    }
    
    // Update theme toggle button's aria-label when language changes
    if (typeof window.uplasOnLanguageChange === 'function' && themeToggleButton) {
        window.uplasOnLanguageChange(() => {
            const currentTheme = document.body.classList.contains('dark-mode') ? 'dark' : 'light';
            applyTheme(currentTheme); // Re-apply theme to update aria-label with new translations
        });
    }

    // --- Initialize i18nManager (MUST run after components might be loaded if they contain translate keys, or re-translate)
    if (typeof i18nManager !== 'undefined' && typeof i18nManager.init === 'function') {
        await i18nManager.init('en');
        if (languageSelector) { // Re-check selector after potential header load
             const langSel = document.getElementById('language-selector');
             if(langSel && typeof window.uplasGetCurrentLocale === 'function') langSel.value = window.uplasGetCurrentLocale();
        }
    } else {
        console.error("i18nManager is not available. Translations might not work.");
    }
    
    // --- Theme Management --- (Now that header might be loaded)
    const themeToggleButton = document.getElementById('theme-toggle'); // Re-select after load
    const prefersDarkScheme = window.matchMedia('(prefers-color-scheme: dark)');
    const themeAriaLabels = { light: 'theme_toggle_dark', dark: 'theme_toggle_light' };
    const themeAriaLabelDefaults = { light: 'Switch to Dark Mode', dark: 'Switch to Light Mode' };

    function applyTheme(theme) {
        // ... (applyTheme function remains the same as in previous js/global.js)
        // Ensure it correctly selects themeToggleButton if it's now dynamically loaded
        const currentThemeToggleButton = document.getElementById('theme-toggle'); // Re-fetch in case of dynamic load
        const isDark = theme === 'dark';
        document.body.classList.toggle('dark-mode', isDark);
        if (currentThemeToggleButton) {
            currentThemeToggleButton.innerHTML = isDark ? '<i class="fas fa-sun"></i>' : '<i class="fas fa-moon"></i>';
            if (typeof window.uplasTranslate === 'function') {
                const ariaKey = isDark ? themeAriaLabels.dark : themeAriaLabels.light;
                const ariaDefault = isDark ? themeAriaLabelDefaults.dark : themeAriaLabelDefaults.light;
                currentThemeToggleButton.setAttribute('aria-label', window.uplasTranslate(ariaKey, { fallback: ariaDefault }));
            } else {
                 currentThemeToggleButton.setAttribute('aria-label', isDark ? themeAriaLabelDefaults.dark : themeAriaLabelDefaults.light);
            }
        }
    }

    function toggleTheme() {
        // ... (toggleTheme function remains the same)
        const currentThemeIsDark = document.body.classList.contains('dark-mode');
        const newTheme = currentThemeIsDark ? 'light' : 'dark';
        localStorage.setItem('uplas-theme', newTheme);
        applyTheme(newTheme);
    }

    if (headerLoaded && themeToggleButton) { // Check if header loaded and button exists
         document.getElementById('theme-toggle')?.addEventListener('click', toggleTheme);
    } else if (!headerLoaded && themeToggleButton) { // If header wasn't dynamic but button exists
        themeToggleButton.addEventListener('click', toggleTheme);
    }

    // --- Language Management --- (Now that header might be loaded)
    // Event listener for language selector
    const languageSelector = document.getElementById('language-selector'); // Re-select
    if (headerLoaded && languageSelector) {
        if (typeof window.uplasOnLanguageChange === 'function') {
            window.uplasOnLanguageChange((newLocale) => {
                if (languageSelector.value !== newLocale) languageSelector.value = newLocale;
            });
        }
         languageSelector.addEventListener('change', (event) => {
            if (typeof window.uplasChangeLanguage === 'function') window.uplasChangeLanguage(event.target.value);
        });
    } else if (!headerLoaded && languageSelector){ // Fallback if header not dynamic
         if (typeof window.uplasOnLanguageChange === 'function') { /* ... same as above ... */ }
         languageSelector.addEventListener('change', (event) => { /* ... same as above ... */});
    }
    
    // Update theme toggle aria-label on language change
     if (headerLoaded && typeof window.uplasOnLanguageChange === 'function' && document.getElementById('theme-toggle')) {
        window.uplasOnLanguageChange(() => {
            const currentTheme = document.body.classList.contains('dark-mode') ? 'dark' : 'light';
            applyTheme(currentTheme); 
        });
    }


    // --- Currency Management --- (Selectors might be in header)
    const currencySelector = document.getElementById('currency-selector'); // Re-select
    let currentCurrency = localStorage.getItem('uplas-currency') || 'USD';
    // ... (rest of currency functions: simulatedExchangeRates, formatPrice, updateDisplayedPrices, changeCurrency remain the same)
    window.simulatedExchangeRates = simulatedExchangeRates; 
    window.currentCurrency = currentCurrency;
    window.updateUserCurrencyDisplay = updateDisplayedPrices;


    if (headerLoaded && currencySelector) {
        currencySelector.value = currentCurrency;
        currencySelector.addEventListener('change', (event) => changeCurrency(event.target.value));
    } else if (!headerLoaded && currencySelector) { // Fallback if header not dynamic
        currencySelector.value = currentCurrency;
        currencySelector.addEventListener('change', (event) => changeCurrency(event.target.value));
    }


    // --- Mobile Navigation Toggle --- (Button is in header)
    const mobileMenuButton = document.getElementById('mobile-nav-toggle'); // Re-select
    const mainNav = document.getElementById('main-navigation'); // Re-select

    if (headerLoaded && mobileMenuButton && mainNav) {
        mobileMenuButton.addEventListener('click', () => {
            // ... (mobile nav toggle logic remains the same) ...
            const isExpanded = mainNav.classList.toggle('nav--active'); 
            mobileMenuButton.classList.toggle('active');
            mobileMenuButton.setAttribute('aria-expanded', isExpanded.toString());
            document.body.classList.toggle('mobile-nav-active', isExpanded);
        });
    } else if (!headerLoaded && mobileMenuButton && mainNav) { // Fallback
         mobileMenuButton.addEventListener('click', () => { /* ... same logic ... */ });
    }

    // --- Utility: Smooth Scroll ---
    // ... (uplasScrollToElement remains the same) ...

    // --- Footer Year Update (now handled by componentLoader.js after footer loads) ---
    // The updateDynamicFooterYear function in componentLoader will be called if footer loads.

    // --- Final Initializations after components and i18n ---
    // Apply theme (important for initial aria-label of theme toggle if translations loaded)
    const savedTheme = localStorage.getItem('uplas-theme');
    applyTheme(savedTheme || (prefersDarkScheme.matches ? 'dark' : 'light'));

    // Apply currency (prices might be in main content or footer)
    updateDisplayedPrices();

    console.log('Uplas global.js initialized, dynamic components attempted.');
});


    // --- Currency Management --- (Stays in global.js as it's not strictly i18n)
    const currencySelector = document.getElementById('currency-selector');
    let currentCurrency = localStorage.getItem('uplas-currency') || 'USD';
    const simulatedExchangeRates = {
        USD: 1, EUR: 0.92, KES: 130.50, GBP: 0.79, INR: 83.00
        // Backend Integration: Fetch these rates from a reliable currency API.
    };
    window.simulatedExchangeRates = simulatedExchangeRates; // Make it global for mcourseD.js fallback
    window.currentCurrency = currentCurrency; // Make it global

    function formatPrice(price, currency) {
        try {
            return new Intl.NumberFormat(document.documentElement.lang || 'en-US', { style: 'currency', currency: currency, minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(price);
        } catch (e) {
            return `${currency} ${price.toFixed(2)}`;
        }
    }

    function updateDisplayedPrices() {
        const rate = simulatedExchangeRates[currentCurrency] || 1;
        const baseRateUSD = simulatedExchangeRates['USD'] || 1;

        document.querySelectorAll('[data-price-usd]').forEach(element => {
            const priceUSD = parseFloat(element.getAttribute('data-price-usd'));
            if (!isNaN(priceUSD)) {
                const convertedPrice = (priceUSD / baseRateUSD) * rate;
                element.textContent = formatPrice(convertedPrice, currentCurrency);
            }
        });
        // Specifically update payment modal price if it's visible and has the necessary data attribute
        const paymentModalPriceElement = document.getElementById('summary-plan-price-span'); // As per mcourseD.html
        if (paymentModalPriceElement && paymentModalPriceElement.dataset.priceUsd) {
             const priceUSD = parseFloat(paymentModalPriceElement.dataset.priceUsd);
            if (!isNaN(priceUSD)) {
                const convertedPrice = (priceUSD / baseRateUSD) * rate;
                paymentModalPriceElement.textContent = formatPrice(convertedPrice, currentCurrency);
            }
        }
    }
    window.updateUserCurrencyDisplay = updateDisplayedPrices; // Make available for mcourseD.js

    function changeCurrency(currency) {
        if (!currency || !simulatedExchangeRates[currency]) {
            console.warn(`Invalid or unsupported currency selected: ${currency}`);
            return;
        }
        currentCurrency = currency;
        window.currentCurrency = currentCurrency; // Update global
        localStorage.setItem('uplas-currency', currency);
        updateDisplayedPrices();
        if (currencySelector) currencySelector.value = currency;
    }

    if (currencySelector) {
        currencySelector.value = currentCurrency;
        currencySelector.addEventListener('change', (event) => {
            changeCurrency(event.target.value);
        });
    }

    // --- Mobile Navigation Toggle ---
    const mobileMenuButton = document.getElementById('mobile-nav-toggle'); // Corrected ID from index (3).html
    const mainNav = document.getElementById('main-navigation'); // Corrected ID

    if (mobileMenuButton && mainNav) {
        mobileMenuButton.addEventListener('click', () => {
            const isExpanded = mainNav.classList.toggle('nav--active'); // Use a more specific class for mobile active state
            mobileMenuButton.classList.toggle('active');
            mobileMenuButton.setAttribute('aria-expanded', isExpanded.toString());
            // Toggle body class to prevent scrolling when mobile menu is open
            document.body.classList.toggle('mobile-nav-active', isExpanded);
        });
    }

    // --- Utility: Smooth Scroll --- (If still needed globally)
    window.uplasScrollToElement = function(selector) {
        const element = document.querySelector(selector);
        if (element) {
            element.scrollIntoView({ behavior: 'smooth' });
        }
    };
    
    // --- Footer Year Update ---
    // (This might also be in page-specific JS like uhome.js, ensure no conflicts or make it truly global here)
    const currentYearFooterSpan = document.getElementById('current-year-footer');
    if (currentYearFooterSpan) {
        const yearTextKey = currentYearFooterSpan.dataset.translateKey; // e.g., footer_copyright_dynamic
        let yearTextContent = currentYearFooterSpan.textContent; // Fallback to existing text

        if (yearTextKey && typeof window.uplasTranslate === 'function') {
            // Get the translated string which should contain "{currentYear}"
             yearTextContent = window.uplasTranslate(yearTextKey, { fallback: "© {currentYear} Uplas. All rights reserved." });
        }
        
        if (yearTextContent && yearTextContent.includes("{currentYear}")) {
            currentYearFooterSpan.textContent = yearTextContent.replace("{currentYear}", new Date().getFullYear());
        } else if (yearTextContent && !yearTextContent.match(/\d{4}/)) { // If no placeholder and no year found
             currentYearFooterSpan.innerHTML = `© ${new Date().getFullYear()} ${yearTextContent}`; // Use innerHTML if original had other elements
        } else if (!yearTextContent.trim()) { // If element is empty
            currentYearFooterSpan.textContent = `© ${new Date().getFullYear()}`;
        }
        // If language changes, re-evaluate this
        if(typeof window.uplasOnLanguageChange === 'function') {
            window.uplasOnLanguageChange(() => {
                let updatedText = currentYearFooterSpan.textContent; // Default
                if (yearTextKey && typeof window.uplasTranslate === 'function') {
                    updatedText = window.uplasTranslate(yearTextKey, { fallback: "© {currentYear} Uplas. All rights reserved." });
                }
                 if (updatedText && updatedText.includes("{currentYear}")) {
                    currentYearFooterSpan.textContent = updatedText.replace("{currentYear}", new Date().getFullYear());
                }
            });
        }
    }


    // --- Initialization ---
    async function initializeGlobalFeatures() {
        // 1. Initialize i18nManager (MUST be done before applying theme if theme texts are translated)
        if (typeof i18nManager !== 'undefined' && typeof i18nManager.init === 'function') {
            await i18nManager.init('en'); // Initialize with English default
            // Now set the language selector value based on the effective locale from i18nManager
            if (languageSelector && typeof window.uplasGetCurrentLocale === 'function') {
                 languageSelector.value = window.uplasGetCurrentLocale();
            }
        } else {
            console.error("i18nManager is not available. Translations might not work.");
        }

        // 2. Apply saved theme or system preference (Aria-label update relies on i18n)
        const savedTheme = localStorage.getItem('uplas-theme');
        applyTheme(savedTheme || (prefersDarkScheme.matches ? 'dark' : 'light'));

        // 3. Apply currency and update prices
        updateDisplayedPrices();
        
        // 4. Other global inits
        // (Handled by specific sections like footer year update directly or via onLanguageChange)

        console.log('Uplas global.js initialized with i18nManager.');
    }

    initializeGlobalFeatures();
});
