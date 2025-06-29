// js/global.js
// Initializes i18n, loads dynamic components (header/footer),
// handles global UI (theme, language, currency, mobile nav), and user auth state.
'use strict';

document.addEventListener('DOMContentLoaded', async () => {
    console.log("Global.js: DOMContentLoaded event started.");

    // --- Helper to safely get an element by ID ---
    const getElement = (id, description, isRequired = true) => {
        const element = document.getElementById(id);
        if (!element && isRequired) {
            console.error(`Global.js: CRITICAL - Required element for ${description} ('#${id}') was NOT FOUND.`);
        } else if (!element && !isRequired) {
             console.log(`Global.js: Optional element for ${description} ('#${id}') not found.`);
        }
        return element;
    };

    // --- 1. Determine Current Page Filename ---
    const pathSegments = window.location.pathname.split('/');
    let currentPageFile = pathSegments.pop() || 'index.html';
    if (currentPageFile.trim() === "" || currentPageFile === "/") {
        currentPageFile = "index.html";
    }
    console.log(`Global.js: Current page identified as: '${currentPageFile}'`);

    // --- 2. Load Header and Footer Components ---
    let headerLoadedSuccessfully = false;
    let footerLoadedSuccessfully = false;

    // Ensure componentLoader.js is available
    if (typeof window.loadHTMLComponent !== 'function') {
        console.error("Global.js: CRITICAL - loadHTMLComponent function is not defined. Dynamic components will NOT load.");
    } else {
        const headerPlaceholder = getElement('site-header-placeholder', 'Header Placeholder', true);
        const footerPlaceholder = getElement('site-footer-placeholder', 'Footer Placeholder', true);

        if (headerPlaceholder) {
            try {
                console.log("Global.js: Attempting to load header component.");
                headerLoadedSuccessfully = await window.loadHTMLComponent('components/header.html', 'site-header-placeholder', currentPageFile);
                if (headerLoadedSuccessfully) {
                    console.log("Global.js: Header component loaded and injected successfully.");
                } else {
                    console.error("Global.js: loadHTMLComponent reported FAILURE for header.");
                }
            } catch (error) {
                console.error("Global.js: ERROR caught while loading header component:", error);
                // headerLoadedSuccessfully remains false
            }
        } else {
            console.error("Global.js: Header placeholder NOT FOUND - Cannot load header.");
        }

        if (footerPlaceholder) {
            try {
                console.log("Global.js: Attempting to load footer component.");
                footerLoadedSuccessfully = await window.loadHTMLComponent('components/footer.html', 'site-footer-placeholder');
                if (footerLoadedSuccessfully) {
                    console.log("Global.js: Footer component loaded and injected successfully.");
                } else {
                    console.error("Global.js: loadHTMLComponent reported FAILURE for footer.");
                }
            } catch (error) {
                console.error("Global.js: ERROR caught while loading footer component:", error);
                // footerLoadedSuccessfully remains false
            }
        } else {
            console.error("Global.js: Footer placeholder NOT FOUND - Cannot load footer.");
        }
    }

    // --- 3. Initialize Internationalization (i18n) ---
    let i18nInitialized = false;
    if (typeof i18nManager !== 'undefined' && typeof i18nManager.init === 'function') {
        try {
            console.log("Global.js: Initializing i18nManager.");
            await i18nManager.init(localStorage.getItem('uplas-lang') || 'en');
            i18nInitialized = true;
            console.log("Global.js: i18nManager initialized.");
        } catch (error) {
            console.error("Global.js: ERROR caught during i18nManager initialization:", error);
        }
    } else {
        console.error("Global.js: CRITICAL - i18nManager is not available. Translations will not function.");
    }

    // --- 4. Initialize User Session (using uplasApi) ---
    let currentUser = null;
    const uplasApiAvailable = typeof window.uplasApi !== 'undefined' && typeof window.uplasApi.initializeUserSession === 'function';

    // MODIFICATION START: Integrate simulated user session
    if (uplasApiAvailable) {
        // In a real application, initializeUserSession would check for a token and fetch from the backend.
        // Here, we simulate it by setting a user in localStorage if one doesn't exist.
        if (!window.uplasApi.getAccessToken()) {
            console.log("Global.js: No real token found. Simulating user login for demonstration.");
            const mockUser = {
                id: 'user_sim_67890',
                email: 'demo.user@uplas.me',
                full_name: 'Demo User'
            };
            const mockToken = 'simulated_access_token_for_demo';

            // Simulate the login process that auth.js would handle
            localStorage.setItem(window.uplasApi.USER_DATA_KEY, JSON.stringify(mockUser));
            localStorage.setItem(window.uplasApi.ACCESS_TOKEN_KEY, mockToken);
        }

        try {
            console.log("Global.js: Initializing user session via uplasApi.");
            currentUser = await window.uplasApi.initializeUserSession();
            if (currentUser) {
                console.log("Global.js: User session active for:", currentUser.email);
            } else {
                console.log("Global.js: No active user session found by uplasApi.");
            }
        } catch (error) {
            console.error("Global.js: ERROR caught during user session initialization with uplasApi:", error);
            currentUser = null;
        }
    } else {
        console.warn("Global.js: window.uplasApi or initializeUserSession not available. Auth checks will be limited. Ensure apiUtils.js is loaded correctly and provides these.");
    }
    // MODIFICATION END

    // --- 5. Setup Global UI Elements & Event Listeners ---
    // This section remains unchanged as it correctly handles UI updates based on the session.
    function setupThemeToggle() {
        const themeToggleButton = getElement('theme-toggle', 'Theme Toggle Button', false);
        if (!themeToggleButton) {
            console.log("Global.js: Theme toggle button not found, skipping setup.");
            return;
        }

        const prefersDarkScheme = window.matchMedia('(prefers-color-scheme: dark)');

        function applyTheme(theme) {
            const currentThemeBtn = getElement('theme-toggle', 'Theme Toggle Button in applyTheme', false);
            const isDark = theme === 'dark';
            document.body.classList.toggle('dark-mode', isDark);

            if (currentThemeBtn) {
                const moonIcon = currentThemeBtn.querySelector('.theme-icon--dark');
                const sunIcon = currentThemeBtn.querySelector('.theme-icon--light');
                if (moonIcon) moonIcon.style.display = isDark ? 'none' : 'inline-block';
                if (sunIcon) sunIcon.style.display = isDark ? 'inline-block' : 'none';

                const trans = window.uplasTranslate || ((key, opts) => opts.fallback);
                const ariaKey = isDark ? 'toggle_theme_light' : 'toggle_theme_dark';
                const ariaDefault = isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode';
                currentThemeBtn.setAttribute('aria-label', trans(ariaKey, { fallback: ariaDefault }));
                currentThemeBtn.setAttribute('title', trans(ariaKey, { fallback: ariaDefault }));
            }
        }
        window.applyGlobalTheme = applyTheme;

        themeToggleButton.addEventListener('click', () => {
            const currentThemeIsDark = document.body.classList.contains('dark-mode');
            const newTheme = currentThemeIsDark ? 'light' : 'dark';
            localStorage.setItem('uplas-theme', newTheme);
            applyTheme(newTheme);
        });

        const savedTheme = localStorage.getItem('uplas-theme');
        applyTheme(savedTheme || (prefersDarkScheme.matches ? 'dark' : 'light'));
        console.log("Global.js: Theme management setup complete.");
    }

    function setupLanguageSelector() {
        const languageSelector = getElement('language-selector', 'Language Selector Dropdown', false);
        if (!languageSelector) {
            console.log("Global.js: Language selector not found, skipping setup.");
            return;
        }

        if (i18nInitialized && typeof i18nManager.getCurrentLocale === 'function' && typeof i18nManager.setLocale === 'function') {
            languageSelector.value = i18nManager.getCurrentLocale();
            languageSelector.addEventListener('change', (event) => {
                i18nManager.setLocale(event.target.value);
            });

            i18nManager.onLanguageChange((newLocale) => {
                if (languageSelector.value !== newLocale) {
                    languageSelector.value = newLocale;
                }
                if (window.applyGlobalTheme) window.applyGlobalTheme(document.body.classList.contains('dark-mode') ? 'dark' : 'light');
                if (footerLoadedSuccessfully && typeof window.updateDynamicFooterYear === 'function') window.updateDynamicFooterYear();
                if (headerLoadedSuccessfully && typeof window.uplasApplyTranslations === 'function') {
                    const headerElement = getElement('page-header', 'Page Header for re-translation', false);
                    if(headerElement) window.uplasApplyTranslations(headerElement);
                }
            });
            console.log("Global.js: Language management setup complete.");
        } else {
            languageSelector.style.display = 'none';
            console.warn("Global.js: i18nManager not fully available for language selector setup.");
        }
    }

    function setupCurrencyManagement() {
        const currencySelector = getElement('currency-selector', 'Currency Selector Dropdown', false);
        if (!currencySelector) {
            console.log("Global.js: Currency selector not found, skipping setup.");
            return;
        }

        let currentGlobalCurrency = localStorage.getItem('uplas-currency') || 'USD';
        const globalSimulatedExchangeRates = { USD: 1, EUR: 0.92, KES: 130.50, GBP: 0.79, INR: 83.00, JPY: 157.00, AUD: 1.50, CAD: 1.37, CHF: 0.90, CNY: 7.25, BTC: 0.000015 };
        window.simulatedExchangeRates = globalSimulatedExchangeRates;
        window.currentGlobalCurrency = currentGlobalCurrency;

        function formatPriceForDisplayInternal(price, currencyCode, locale) {
            try {
                return new Intl.NumberFormat(locale || (i18nInitialized ? i18nManager.getCurrentLocale() : 'en-US'), {
                    style: 'currency', currency: currencyCode, minimumFractionDigits: 2, maximumFractionDigits: 2
                }).format(price);
            } catch (e) {
                console.warn(`Currency formatting error for ${currencyCode} with locale ${locale}: ${e.message}. Falling back.`);
                const symbolMap = { USD: '$', EUR: '€', KES: 'KSh', GBP: '£', INR: '₹', JPY: '¥', AUD: 'A$', CAD: 'C$', CHF: 'Fr', CNY: '¥', BTC: '₿' };
                return `${symbolMap[currencyCode] || currencyCode} ${Number(price).toFixed(2)}`;
            }
        }
        window.formatPriceForDisplay = formatPriceForDisplayInternal;

        function updateAllDisplayedPrices() {
            const activeCurrency = window.currentGlobalCurrency;
            const rate = globalSimulatedExchangeRates[activeCurrency] || 1;
            const baseRateUSD = globalSimulatedExchangeRates['USD'] || 1;

            document.querySelectorAll('[data-price-usd]').forEach(element => {
                const priceUSD = parseFloat(element.getAttribute('data-price-usd'));
                if (!isNaN(priceUSD)) {
                    element.textContent = formatPriceForDisplayInternal((priceUSD / baseRateUSD) * rate, activeCurrency);
                }
            });
        }
        window.updateUserCurrencyDisplay = updateAllDisplayedPrices;

        function changeGlobalCurrency(selectedCurrency) {
            if (!selectedCurrency || !globalSimulatedExchangeRates[selectedCurrency]) {
                console.warn(`Currency ${selectedCurrency} not supported.`);
                return;
            }
            window.currentGlobalCurrency = selectedCurrency;
            localStorage.setItem('uplas-currency', selectedCurrency);
            updateAllDisplayedPrices();
            if (currencySelector.value !== selectedCurrency) {
                currencySelector.value = selectedCurrency;
            }
            window.dispatchEvent(new CustomEvent('currencyChanged', { detail: { newCurrency: selectedCurrency } }));
        }
        window.changeUserGlobalCurrency = changeGlobalCurrency;

        currencySelector.value = currentGlobalCurrency;
        currencySelector.addEventListener('change', (event) => changeGlobalCurrency(event.target.value));

        updateAllDisplayedPrices();
        console.log("Global.js: Currency management setup complete.");
    }

    function setupMobileNav() {
        const mobileMenuButton = getElement('mobile-nav-toggle', 'Mobile Navigation Toggle Button', false);
        const mainNavigation = getElement('main-navigation', 'Main Navigation Menu', false);

        if (mobileMenuButton && mainNavigation) {
            mobileMenuButton.addEventListener('click', () => {
                const isExpanded = mainNavigation.classList.toggle('nav--active');
                mobileMenuButton.classList.toggle('active');
                mobileMenuButton.setAttribute('aria-expanded', isExpanded.toString());
                document.body.classList.toggle('mobile-nav-active', isExpanded);

                const icon = mobileMenuButton.querySelector('i');
                if (icon) {
                    icon.classList.toggle('fa-bars', !isExpanded);
                    icon.classList.toggle('fa-times', isExpanded);
                }
            });
            console.log("Global.js: Mobile navigation setup complete.");
        } else {
            console.log("Global.js: Mobile navigation elements not found, skipping setup.");
        }
    }

    function getUserInitials(fullName) {
        if (!fullName || typeof fullName !== 'string') return 'U';
        const nameParts = fullName.trim().split(/\s+/).filter(Boolean);
        if (nameParts.length === 1 && nameParts[0].length > 0) return nameParts[0][0].toUpperCase();
        if (nameParts.length > 1) return (nameParts[0][0] + nameParts[nameParts.length - 1][0]).toUpperCase();
        return 'U';
    }

    function updateLoginStateUIInternal() {
        console.log("Global.js: Attempting to update login state UI.");
        if (!uplasApiAvailable) {
            console.warn("Global.js: uplasApi not available for updateLoginStateUI.");
            const userAvatarHeader = getElement('user-avatar-header', 'User Avatar in Header', false);
            const navLoggedIn = getElement('nav-logged-in', 'Logged In Navigation', false);
            const navLoggedOut = getElement('nav-logged-out', 'Logged Out Navigation', false);
            if (userAvatarHeader) userAvatarHeader.style.display = 'none';
            if (navLoggedIn) navLoggedIn.style.display = 'none';
            if (navLoggedOut) navLoggedOut.style.display = 'flex';
            return;
        }
        if (!headerLoadedSuccessfully) {
            console.warn("Global.js: Header not loaded, cannot reliably update login state UI yet.");
            return;
        }

        const accessToken = window.uplasApi.getAccessToken();
        const userData = window.uplasApi.getUserData();

        const userAvatarHeader = getElement('user-avatar-header', 'User Avatar in Header', false);
        const navLoggedIn = getElement('nav-logged-in', 'Logged In Navigation', false);
        const navLoggedOut = getElement('nav-logged-out', 'Logged Out Navigation', false);
        const userFullNameDisplay = getElement('user-full-name-display', 'User Full Name Display in Dropdown', false);
        const userEmailDisplay = getElement('user-email-display', 'User Email Display in Dropdown', false);

        if (!userAvatarHeader || !navLoggedIn || !navLoggedOut) {
            console.error("Global.js: FAILED to find 'user-avatar-header', 'nav-logged-in', or 'nav-logged-out'. UI update aborted. Check header.html IDs.");
            return;
        }

        if (accessToken && userData) {
            console.log("Global.js: User IS authenticated. Updating UI with data:", userData);
            const avatarButton = userAvatarHeader.querySelector('.user-avatar-button-header');
            if (avatarButton) avatarButton.textContent = getUserInitials(userData.full_name);
            if (userFullNameDisplay) userFullNameDisplay.textContent = userData.full_name || 'User';
            if (userEmailDisplay) userEmailDisplay.textContent = userData.email || '';

            userAvatarHeader.style.display = 'flex';
            navLoggedIn.style.display = 'flex';
            navLoggedOut.style.display = 'none';
        } else {
            console.log("Global.js: User IS NOT authenticated. Updating UI.");
            userAvatarHeader.style.display = 'none';
            navLoggedIn.style.display = 'none';
            navLoggedOut.style.display = 'flex';
            if (userFullNameDisplay) userFullNameDisplay.textContent = '';
            if (userEmailDisplay) userEmailDisplay.textContent = '';
        }
        console.log("Global.js: Login state UI update finished.");
    }
    window.updateLoginStateUI = updateLoginStateUIInternal;


    // --- Smooth Scroll ---
    window.uplasScrollToElement = function(selector) {
        const element = document.querySelector(selector);
        if (element) {
            element.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
    };

    // --- Run UI Setup Functions ---
    if (headerLoadedSuccessfully) {
        setupThemeToggle();
        setupLanguageSelector();
        setupCurrencyManagement();
        setupMobileNav();
    } else {
        console.warn("Global.js: Header did NOT load successfully. Dependent global UI features setup skipped.");
    }
    
    if (headerLoadedSuccessfully && uplasApiAvailable) {
        updateLoginStateUIInternal();
    }


    // --- Setup Global Event Listeners ---
    if (uplasApiAvailable) {
        window.addEventListener('authChanged', (event) => {
            console.log("Global.js: 'authChanged' event received.", event.detail);
            if (headerLoadedSuccessfully) {
                updateLoginStateUIInternal();
            }
            currentUser = event.detail.user;
        });
    }

    // --- Display Auth Redirect Message ---
    function displayAuthRedirectMessage() {
        if (!uplasApiAvailable || typeof window.uplasApi.AUTH_REDIRECT_MESSAGE_KEY === 'undefined' || typeof window.uplasApi.displayFormStatus !== 'function') return;

        const authRedirectMsg = sessionStorage.getItem(window.uplasApi.AUTH_REDIRECT_MESSAGE_KEY);
        if (authRedirectMsg) {
            const authSection = getElement('auth-section', 'Auth Section for Message', false);
            if (authSection) {
                window.uplasApi.displayFormStatus(authSection, authRedirectMsg, true);
            } else {
                console.warn("Auth Redirect Message:", authRedirectMsg, "(auth-section not found to display it prominently)");
            }
            sessionStorage.removeItem(window.uplasApi.AUTH_REDIRECT_MESSAGE_KEY);
            console.log("Global.js: Auth redirect message processed.");
        }
    }

    if(i18nInitialized && uplasApiAvailable) {
         displayAuthRedirectMessage();
    }

    console.log("Global.js: DOMContentLoaded processing complete.");
});
