// js/global.js
// Initializes i18n, loads dynamic components (header/footer), and handles global UI (theme, language, currency, mobile nav).
'use strict';

document.addEventListener('DOMContentLoaded', async () => {
    console.log("Global.js: DOMContentLoaded event started.");

    // --- 1. Determine Current Page Filename ---
    // This helps in setting the 'active' class for navigation links.
    const pathSegments = window.location.pathname.split('/');
    let currentPageFile = pathSegments.pop() || 'index.html'; // Default to index.html if path ends with / or is empty
    if (currentPageFile.trim() === "" || currentPageFile === "/") {
        currentPageFile = "index.html";
    }
    console.log(`Global.js: Current page identified as: '${currentPageFile}'`);

    // --- 2. Load Header and Footer Components ---
    let headerLoadedSuccessfully = false;
    // let footerLoadedSuccessfully = false; // Declared but not explicitly used to gate other logic, but good for debugging

    if (typeof window.loadHTMLComponent === 'function') {
        const headerPlaceholder = document.getElementById('site-header-placeholder');
        const footerPlaceholder = document.getElementById('site-footer-placeholder');

        if (headerPlaceholder) {
            console.log("Global.js: Attempting to load header component into #site-header-placeholder.");
            headerLoadedSuccessfully = await window.loadHTMLComponent('components/header.html', 'site-header-placeholder', currentPageFile);
        } else {
            console.warn("Global.js: Header placeholder '#site-header-placeholder' NOT FOUND in this HTML page. Header-dependent UI might not initialize.");
        }

        if (footerPlaceholder) {
            console.log("Global.js: Attempting to load footer component into #site-footer-placeholder.");
            // footerLoadedSuccessfully = await window.loadHTMLComponent('components/footer.html', 'site-footer-placeholder'); // Assign if needed
            await window.loadHTMLComponent('components/footer.html', 'site-footer-placeholder');
        } else {
            console.warn("Global.js: Footer placeholder '#site-footer-placeholder' NOT FOUND in this HTML page.");
        }
    } else {
        console.error("Global.js: CRITICAL - loadHTMLComponent function is not defined. Ensure 'componentLoader.js' is loaded BEFORE 'global.js'. Dynamic components will not load.");
    }

    // --- 3. Initialize Internationalization (i18n) ---
    // i18nManager should be defined in i18n.js, which should be loaded before global.js
    if (typeof i18nManager !== 'undefined' && typeof i18nManager.init === 'function') {
        console.log("Global.js: Initializing i18nManager.");
        await i18nManager.init('en'); // Initialize with English default. i18nManager.init calls applyTranslationsToPage.
    } else {
        console.error("Global.js: CRITICAL - i18nManager is not available. Translations will not function. Ensure 'i18n.js' is loaded BEFORE 'global.js'.");
    }
    
    // --- 4. Setup Global UI Elements & Event Listeners (Post-Component Load & i18n Init) ---
    // Helper to safely get an element by ID.
    const getElement = (id, description, isRequired = true) => {
        const element = document.getElementById(id);
        if (!element && isRequired) {
            console.warn(`Global.js: Required element for ${description} ('#${id}') was not found. Check if components loaded correctly and IDs match.`);
        } else if (!element && !isRequired) {
            // console.log(`Global.js: Optional element for ${description} ('#${id}') not found.`);
        }
        return element;
    };
    
    // --- Theme Management ---
    const themeToggleButton = getElement('theme-toggle', 'Theme Toggle Button', headerLoadedSuccessfully); // Dependent on header
    const prefersDarkScheme = window.matchMedia('(prefers-color-scheme: dark)');
    const themeAriaLabels = { light: 'theme_toggle_dark', dark: 'theme_toggle_light' }; // Keys for translation
    const themeAriaLabelDefaults = { light: 'Switch to Dark Mode', dark: 'Switch to Light Mode' }; // Fallback text

    function applyTheme(theme) {
        const currentThemeBtn = getElement('theme-toggle', 'Theme Toggle Button in applyTheme', false); // Re-fetch for safety if needed
        const isDark = theme === 'dark';
        document.body.classList.toggle('dark-mode', isDark);

        if (currentThemeBtn) {
            // Assumes components/header.html has:
            // <i class="fas fa-moon theme-icon theme-icon--dark"></i> (visible in light mode)
            // <i class="fas fa-sun theme-icon theme-icon--light"></i> (visible in dark mode)
            // CSS in global.css handles visibility:
            // .dark-mode .theme-icon--dark { display: none; }
            // .dark-mode .theme-icon--light { display: inline-block !important; } /* or 'flex' */
            // :not(.dark-mode) .theme-icon--dark { display: inline-block !important; }
            // :not(.dark-mode) .theme-icon--light { display: none; }
            
            // The innerHTML method can be simpler if icons are structured correctly or use CSS for swapping
            const moonIconHTML = '<i class="fas fa-moon theme-icon theme-icon--dark"></i>';
            const sunIconHTML = '<i class="fas fa-sun theme-icon theme-icon--light"></i>';
            currentThemeBtn.innerHTML = isDark ? sunIconHTML : moonIconHTML;


            if (typeof window.uplasTranslate === 'function') {
                const ariaKey = isDark ? themeAriaLabels.dark : themeAriaLabels.light;
                const ariaDefault = isDark ? themeAriaLabelDefaults.dark : themeAriaLabelDefaults.light;
                currentThemeBtn.setAttribute('aria-label', window.uplasTranslate(ariaKey, { fallback: ariaDefault }));
            } else {
                currentThemeBtn.setAttribute('aria-label', isDark ? themeAriaLabelDefaults.dark : themeAriaLabelDefaults.light);
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
    // Initial theme application after all elements are potentially ready
    const savedTheme = localStorage.getItem('uplas-theme');
    applyTheme(savedTheme || (prefersDarkScheme.matches ? 'dark' : 'light'));


    // --- Language Management ---
    const languageSelector = getElement('language-selector', 'Language Selector Dropdown', headerLoadedSuccessfully); // Dependent on header
    if (languageSelector) {
        if (typeof window.uplasGetCurrentLocale === 'function') {
            languageSelector.value = window.uplasGetCurrentLocale();
        } else { 
            languageSelector.value = localStorage.getItem('uplas-lang') || 'en';
        }
        languageSelector.addEventListener('change', (event) => {
            if (typeof window.uplasChangeLanguage === 'function') {
                window.uplasChangeLanguage(event.target.value);
            } else {
                console.error("Global.js: uplasChangeLanguage function is not available for language selector.");
            }
        });

        if (typeof window.uplasOnLanguageChange === 'function') {
            window.uplasOnLanguageChange((newLocale) => {
                if (languageSelector.value !== newLocale) {
                    languageSelector.value = newLocale;
                }
                if (themeToggleButton) { // Re-translate theme button aria-label
                    const currentTheme = document.body.classList.contains('dark-mode') ? 'dark' : 'light';
                    applyTheme(currentTheme);
                }
                // Also update footer year if it has translatable parts and footer loaded
                if (footerLoadedSuccessfully && typeof window.updateDynamicFooterYear === 'function') {
                    window.updateDynamicFooterYear();
                }
            });
        }
    }


    // --- Currency Management ---
    const currencySelector = getElement('currency-selector', 'Currency Selector Dropdown', false); // Optional, may not be on all headers
    let currentGlobalCurrency = localStorage.getItem('uplas-currency') || 'USD';
    const globalSimulatedExchangeRates = {
        USD: 1, EUR: 0.92, KES: 130.50, GBP: 0.79, INR: 83.00
    };
    window.simulatedExchangeRates = globalSimulatedExchangeRates;
    window.currentGlobalCurrency = currentGlobalCurrency;

    function formatPrice(price, currencyCode, locale) {
        try {
            return new Intl.NumberFormat(locale || document.documentElement.lang || 'en-US', {
                style: 'currency', currency: currencyCode, minimumFractionDigits: 2, maximumFractionDigits: 2
            }).format(price);
        } catch (e) {
            return `${currencyCode} ${Number(price).toFixed(2)}`;
        }
    }

    function updateAllDisplayedPrices() {
        const activeCurrency = window.currentGlobalCurrency;
        const rate = globalSimulatedExchangeRates[activeCurrency] || 1;
        const baseRateUSD = globalSimulatedExchangeRates['USD'] || 1;

        document.querySelectorAll('[data-price-usd]').forEach(element => {
            const priceUSD = parseFloat(element.getAttribute('data-price-usd'));
            if (!isNaN(priceUSD)) {
                const convertedPrice = (priceUSD / baseRateUSD) * rate;
                element.textContent = formatPrice(convertedPrice, activeCurrency);
            }
        });
        const paymentModalPriceEl = getElement('summary-plan-price-span', 'Payment Modal Price Span', false);
        if (paymentModalPriceEl && paymentModalPriceEl.dataset.priceUsd) {
             const priceUSD = parseFloat(paymentModalPriceEl.dataset.priceUsd);
            if (!isNaN(priceUSD)) {
                const convertedPrice = (priceUSD / baseRateUSD) * rate;
                paymentModalPriceEl.textContent = formatPrice(convertedPrice, activeCurrency);
            }
        }
    }
    window.updateUserCurrencyDisplay = updateAllDisplayedPrices;

    function changeGlobalCurrency(selectedCurrency) {
        if (!selectedCurrency || !globalSimulatedExchangeRates[selectedCurrency]) return;
        window.currentGlobalCurrency = selectedCurrency;
        localStorage.setItem('uplas-currency', selectedCurrency);
        updateAllDisplayedPrices();
        if (currencySelector && currencySelector.value !== selectedCurrency) {
            currencySelector.value = selectedCurrency;
        }
    }

    if (currencySelector) { // Only attach if currency selector exists
        currencySelector.value = currentGlobalCurrency;
        currencySelector.addEventListener('change', (event) => {
            changeGlobalCurrency(event.target.value);
        });
    }
    updateAllDisplayedPrices(); // Initial price display


    // --- Mobile Navigation Toggle ---
    const mobileMenuButton = getElement('mobile-nav-toggle', 'Mobile Navigation Toggle Button', headerLoadedSuccessfully); // From components/header.html
    const mainNavigation = getElement('main-navigation', 'Main Navigation Menu', headerLoadedSuccessfully); // From components/header.html

    if (mobileMenuButton && mainNavigation) {
        mobileMenuButton.addEventListener('click', () => {
            const isExpanded = mainNavigation.classList.toggle('nav--active');
            mobileMenuButton.classList.toggle('active');
            mobileMenuButton.setAttribute('aria-expanded', isExpanded.toString());
            document.body.classList.toggle('mobile-nav-active', isExpanded);
        });
    }

    // --- Global Utility: Smooth Scroll ---
    window.uplasScrollToElement = function(selector) {
        const element = document.querySelector(selector);
        if (element) {
            element.scrollIntoView({ behavior: 'smooth' });
        } else {
            console.warn(`Global.js: uplasScrollToElement - element with selector "${selector}" not found.`);
        }
    };
    
    // --- Login State UI Update (e.g., show user avatar) ---
    function updateLoginStateUI() {
        const authToken = (typeof getAuthToken === 'function') ? getAuthToken() : null; // getAuthToken from apiUtils.js
        const userAvatarHeader = getElement('user-avatar-header', 'User Avatar in Header', false); // ID from components/header.html
        const loginSignupHeaderLinkContainer = getElement('auth-header-link-container', 'Login/Signup Link Container in Header', false); // ID from components/header.html

        if (userAvatarHeader && loginSignupHeaderLinkContainer) {
            if (authToken) {
                const userDataString = localStorage.getItem('userData');
                if (userDataString) {
                    try {
                        const userData = JSON.parse(userDataString);
                        const avatarButton = userAvatarHeader.querySelector('.user-avatar-button-header');
                        if (avatarButton) avatarButton.textContent = userData.initials || 'U';
                    } catch (e) { console.error("Global.js: Error parsing userData from localStorage", e); }
                }
                userAvatarHeader.style.display = 'flex';
                loginSignupHeaderLinkContainer.style.display = 'none';
            } else {
                userAvatarHeader.style.display = 'none';
                loginSignupHeaderLinkContainer.style.display = 'list-item'; // Or 'block' / 'flex' as appropriate for its layout
            }
        }
    }
    if(headerLoadedSuccessfully) updateLoginStateUI(); // Call after header is loaded
    // Listen for custom event 'authChanged' dispatched by login/logout functions in uhome.js or apiUtils.js
    window.addEventListener('authChanged', updateLoginStateUI); 


    console.log("Global.js: All initializations and event listeners setup complete.");
});
