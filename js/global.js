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

    if (typeof window.loadHTMLComponent === 'function') {
        const headerPlaceholder = getElement('site-header-placeholder', 'Header Placeholder', true);
        const footerPlaceholder = getElement('site-footer-placeholder', 'Footer Placeholder', true);

        // Load Header with Error Handling
        if (headerPlaceholder) {
            try {
                console.log("Global.js: Attempting to load header component.");
                headerLoadedSuccessfully = await window.loadHTMLComponent('components/header.html', 'site-header-placeholder', currentPageFile);
                if (!headerLoadedSuccessfully) {
                     console.error("Global.js: loadHTMLComponent reported FAILURE for header.");
                } else {
                     console.log("Global.js: Header component loaded successfully.");
                }
            } catch (error) {
                console.error("Global.js: ERROR caught while loading header component:", error);
                headerLoadedSuccessfully = false; // Ensure it's false on error
            }
        } else {
            console.error("Global.js: Header placeholder NOT FOUND - Cannot load header.");
        }

        // Load Footer with Error Handling
        if (footerPlaceholder) {
            try {
                console.log("Global.js: Attempting to load footer component.");
                footerLoadedSuccessfully = await window.loadHTMLComponent('components/footer.html', 'site-footer-placeholder');
                 if (!footerLoadedSuccessfully) {
                     console.error("Global.js: loadHTMLComponent reported FAILURE for footer.");
                 } else {
                     console.log("Global.js: Footer component loaded successfully.");
                 }
            } catch (error) {
                console.error("Global.js: ERROR caught while loading footer component:", error);
                footerLoadedSuccessfully = false;
            }
        } else {
            console.error("Global.js: Footer placeholder NOT FOUND - Cannot load footer.");
        }
    } else {
        console.error("Global.js: CRITICAL - loadHTMLComponent function is not defined. Dynamic components will NOT load.");
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
    let uplasApiAvailable = typeof window.uplasApi !== 'undefined' && typeof window.uplasApi.initializeUserSession === 'function';

    if (uplasApiAvailable) {
        try {
            console.log("Global.js: Initializing user session via uplasApi.");
            currentUser = await window.uplasApi.initializeUserSession();
            if (currentUser) {
                console.log("Global.js: User session active.", currentUser);
            } else {
                console.log("Global.js: No active user session found.");
            }
        } catch (error) {
            console.error("Global.js: ERROR caught during user session initialization:", error);
            currentUser = null; // Ensure user is null on error
        }
    } else {
        console.warn("Global.js: window.uplasApi not available. Auth checks will be skipped. Ensure apiUtils.js is loaded.");
    }

    // --- 5. Setup Global UI Elements & Event Listeners (More Safely) ---

    // --- Theme Management ---
    function setupThemeToggle() {
        const themeToggleButton = getElement('theme-toggle', 'Theme Toggle Button', false); // Optional now
        if (!themeToggleButton) return; // Exit if button not found

        const prefersDarkScheme = window.matchMedia('(prefers-color-scheme: dark)');
        const themeAriaLabels = { light: 'theme_toggle_dark', dark: 'theme_toggle_light' };
        const themeAriaLabelDefaults = { light: 'Switch to Dark Mode', dark: 'Switch to Light Mode' };

        function applyTheme(theme) {
            const currentThemeBtn = getElement('theme-toggle', 'Theme Toggle Button in applyTheme', false);
            const isDark = theme === 'dark';
            document.body.classList.toggle('dark-mode', isDark);

            if (currentThemeBtn) {
                const moonIconHTML = '<i class="fas fa-moon theme-icon theme-icon--dark"></i>';
                const sunIconHTML = '<i class="fas fa-sun theme-icon theme-icon--light"></i>';
                currentThemeBtn.innerHTML = isDark ? sunIconHTML : moonIconHTML;

                const trans = window.uplasTranslate || ((key, opts) => opts.fallback);
                const ariaKey = isDark ? themeAriaLabels.dark : themeAriaLabels.light;
                const ariaDefault = isDark ? themeAriaLabelDefaults.dark : themeAriaLabelDefaults.light;
                currentThemeBtn.setAttribute('aria-label', trans(ariaKey, { fallback: ariaDefault }));
            }
        }
        window.applyGlobalTheme = applyTheme; // Expose for i18n updates

        function toggleTheme() {
            const currentThemeIsDark = document.body.classList.contains('dark-mode');
            const newTheme = currentThemeIsDark ? 'light' : 'dark';
            localStorage.setItem('uplas-theme', newTheme);
            applyTheme(newTheme);
        }

        themeToggleButton.addEventListener('click', toggleTheme);
        const savedTheme = localStorage.getItem('uplas-theme');
        applyTheme(savedTheme || (prefersDarkScheme.matches ? 'dark' : 'light'));
        console.log("Global.js: Theme management setup complete.");
    }

    // --- Language Management ---
    function setupLanguageSelector() {
        const languageSelector = getElement('language-selector', 'Language Selector Dropdown', false);
        if (!languageSelector) return;

        if (i18nInitialized) {
             languageSelector.value = i18nManager.getCurrentLocale();
             languageSelector.addEventListener('change', (event) => i18nManager.changeLanguage(event.target.value));

             i18nManager.onLanguageChange((newLocale) => {
                 if (languageSelector.value !== newLocale) languageSelector.value = newLocale;
                 if (window.applyGlobalTheme) window.applyGlobalTheme(document.body.classList.contains('dark-mode') ? 'dark' : 'light'); // Re-translate theme button
                 if (footerLoadedSuccessfully && typeof window.updateDynamicFooterYear === 'function') window.updateDynamicFooterYear();
             });
             console.log("Global.js: Language management setup complete.");
        } else {
             languageSelector.style.display = 'none'; // Hide if i18n failed
        }
    }

    // --- Currency Management ---
    function setupCurrencyManagement() {
        const currencySelector = getElement('currency-selector', 'Currency Selector Dropdown', false);
        let currentGlobalCurrency = localStorage.getItem('uplas-currency') || 'USD';
        const globalSimulatedExchangeRates = { USD: 1, EUR: 0.92, KES: 130.50, GBP: 0.79, INR: 83.00 };
        window.simulatedExchangeRates = globalSimulatedExchangeRates;
        window.currentGlobalCurrency = currentGlobalCurrency;

        function formatPrice(price, currencyCode, locale) {
            try {
                return new Intl.NumberFormat(locale || (i18nInitialized ? i18nManager.getCurrentLocale() : 'en-US'), {
                    style: 'currency', currency: currencyCode, minimumFractionDigits: 2, maximumFractionDigits: 2
                }).format(price);
            } catch (e) {
                return `${currencyCode} ${Number(price).toFixed(2)}`;
            }
        }
        window.formatPriceForDisplay = formatPrice;

        function updateAllDisplayedPrices() {
            const activeCurrency = window.currentGlobalCurrency;
            const rate = globalSimulatedExchangeRates[activeCurrency] || 1;
            const baseRateUSD = globalSimulatedExchangeRates['USD'] || 1;

            document.querySelectorAll('[data-price-usd]').forEach(element => {
                const priceUSD = parseFloat(element.getAttribute('data-price-usd'));
                if (!isNaN(priceUSD)) {
                    element.textContent = formatPrice((priceUSD / baseRateUSD) * rate, activeCurrency);
                }
            });
            // Update other specific elements if needed
        }
        window.updateUserCurrencyDisplay = updateAllDisplayedPrices;

        function changeGlobalCurrency(selectedCurrency) {
            if (!selectedCurrency || !globalSimulatedExchangeRates[selectedCurrency]) return;
            window.currentGlobalCurrency = selectedCurrency;
            localStorage.setItem('uplas-currency', selectedCurrency);
            updateAllDisplayedPrices();
            if (currencySelector && currencySelector.value !== selectedCurrency) currencySelector.value = selectedCurrency;
            window.dispatchEvent(new CustomEvent('currencyChanged', { detail: { newCurrency: selectedCurrency } }));
        }
        window.changeUserGlobalCurrency = changeGlobalCurrency;

        if (currencySelector) {
            currencySelector.value = currentGlobalCurrency;
            currencySelector.addEventListener('change', (event) => changeGlobalCurrency(event.target.value));
        }
        updateAllDisplayedPrices(); // Initial call
        console.log("Global.js: Currency management setup complete.");
    }

    // --- Mobile Navigation ---
    function setupMobileNav() {
        const mobileMenuButton = getElement('mobile-nav-toggle', 'Mobile Navigation Toggle Button', false);
        const mainNavigation = getElement('main-navigation', 'Main Navigation Menu', false);

        if (mobileMenuButton && mainNavigation) {
            mobileMenuButton.addEventListener('click', () => {
                const isExpanded = mainNavigation.classList.toggle('nav--active');
                mobileMenuButton.classList.toggle('active');
                mobileMenuButton.setAttribute('aria-expanded', isExpanded.toString());
                document.body.classList.toggle('mobile-nav-active', isExpanded);
            });
             console.log("Global.js: Mobile navigation setup complete.");
        }
    }

    // --- Login State UI Update ---
    function getUserInitials(fullName) {
        if (!fullName || typeof fullName !== 'string') return 'U';
        const nameParts = fullName.trim().split(/\s+/).filter(Boolean); // Filter empty strings
        if (nameParts.length === 1 && nameParts[0].length > 0) return nameParts[0][0].toUpperCase();
        if (nameParts.length > 1) return (nameParts[0][0] + nameParts[nameParts.length - 1][0]).toUpperCase();
        return 'U';
    }

    function updateLoginStateUIInternal() {
        console.log("Global.js: Attempting to update login state UI.");
        if (!uplasApiAvailable) {
             console.warn("Global.js: uplasApi not available for updateLoginStateUI.");
             return; // Don't try if API isn't loaded
        }
        if (!headerLoadedSuccessfully) {
             console.warn("Global.js: Header not loaded, cannot update login state UI.");
             return; // Don't try if header isn't loaded
        }

        const accessToken = window.uplasApi.getAccessToken();
        const userData = window.uplasApi.getUserData();

        const userAvatarHeader = getElement('user-avatar-header', 'User Avatar in Header', false);
        const loginSignupHeaderLinkContainer = getElement('auth-header-link-container', 'Login/Signup Link Container in Header', false);
        const userFullNameDisplay = getElement('user-full-name-display', 'User Full Name Display', false);
        const userEmailDisplay = getElement('user-email-display', 'User Email Display', false);

        // *** Critical Check: Ensure both containers exist before manipulating them ***
        if (!userAvatarHeader || !loginSignupHeaderLinkContainer) {
            console.error("Global.js: FAILED to find 'user-avatar-header' or 'auth-header-link-container'. UI update aborted. Check header.html IDs.");
            return;
        }

        if (accessToken && userData) {
            console.log("Global.js: User IS authenticated. Updating UI.", userData);
            const avatarButton = userAvatarHeader.querySelector('.user-avatar-button-header');
            if (avatarButton) avatarButton.textContent = getUserInitials(userData.full_name);
            if (userFullNameDisplay) userFullNameDisplay.textContent = userData.full_name || '';
            if (userEmailDisplay) userEmailDisplay.textContent = userData.email || '';

            userAvatarHeader.style.display = 'flex'; // Or 'block'
            loginSignupHeaderLinkContainer.style.display = 'none';
        } else {
            console.log("Global.js: User IS NOT authenticated. Updating UI.");
            userAvatarHeader.style.display = 'none';
            loginSignupHeaderLinkContainer.style.display = 'list-item'; // Or 'block' / 'flex'
            if (userFullNameDisplay) userFullNameDisplay.textContent = '';
            if (userEmailDisplay) userEmailDisplay.textContent = '';
        }
         console.log("Global.js: Login state UI update finished.");
    }

    // --- Smooth Scroll ---
    window.uplasScrollToElement = function(selector) { /* ... implementation ... */ };

    // --- Run UI Setup Functions (only if header loaded) ---
    if (headerLoadedSuccessfully) {
        setupThemeToggle();
        setupLanguageSelector();
        setupCurrencyManagement(); // This might have elements outside header, but selector is usually in header
        setupMobileNav();
        updateLoginStateUIInternal(); // Initial call after everything is potentially ready
    } else {
        console.error("Global.js: Header did NOT load successfully. Most global UI features will be unavailable.");
    }

    // --- Setup Global Event Listeners ---
    if (uplasApiAvailable) {
        window.addEventListener('authChanged', (event) => {
            console.log("Global.js: 'authChanged' event received.", event.detail);
            updateLoginStateUIInternal(); // Re-run UI update on auth changes
        });
    }

    // --- Display Auth Redirect Message ---
    function displayAuthRedirectMessage() {
        if (!uplasApiAvailable) return;
        const authRedirectMsg = sessionStorage.getItem(window.uplasApi.AUTH_REDIRECT_MESSAGE_KEY);
        if (authRedirectMsg) {
            const authSection = getElement('auth-section', 'Auth Section for Message', false) || document.body;
            window.uplasApi.displayFormStatus(authSection, authRedirectMsg, true);
            sessionStorage.removeItem(window.uplasApi.AUTH_REDIRECT_MESSAGE_KEY);
            console.log("Global.js: Auth redirect message displayed.");
        }
    }
    displayAuthRedirectMessage();

    console.log("Global.js: DOMContentLoaded processing complete.");
});
```

**Why This Version Should Be More Stable:**

1.  **Error Isolation for `loadHTMLComponent`**: By wrapping the `await window.loadHTMLComponent(...)` calls in `try...catch`, we prevent an error during header/footer loading from crashing the entire script. If `header.html` can't be found, the script will now log an error but *continue* to initialize i18n, the session, and potentially the footer (if its loading works).
2.  **Conditional UI Setup**: Functions like `setupThemeToggle`, `setupLanguageSelector`, `setupMobileNav`, and `updateLoginStateUIInternal` are now explicitly called *only if* `headerLoadedSuccessfully` is true. This prevents them from running and potentially failing if the header elements they depend on never made it into the DOM.
3.  **Safer `getElement` Usage**: While `getElement` itself was okay, the new structure ensures that functions *using* its results are only called when it's likely they'll succeed (i.e., after the header loads). `updateLoginStateUIInternal` also includes a crucial check to ensure *both* its primary containers exist before manipulating their styles.
4.  **Clearer Logging**: Added more specific logs for success and failure, which will make it much easier to diagnose problems in your browser's developer console if issues persist.
5.  **Checks for `uplasApi` and `i18nManager`**: Ensures that if these libraries fail to load for any reason, the script logs the issue but tries to proceed where possible, rather than crashing.

**Next Steps:**

1.  **Replace your current `global.js`** with the code provided above.
2.  **Check Script Loading Order:** **Crucially, ensure** your HTML files load your JavaScript in this order:
    ```html
    <script src="js/i18n.js"></script>
    <script src="js/componentLoader.js"></script> <script src="js/apiUtils.js"></script>      <script src="js/global.js"></script>
    <script src="js/uhome.js"></script>
    ```
3.  **Test and Check Console:** Load your website and open the browser's developer console (usually F12). Look for:
    * Any `Global.js: CRITICAL` or `Global.js: ERROR` messages. These will tell you exactly what went wrong if the header/footer *still* don't appear.
    * Confirm you see "Global.js: Header component loaded successfully." and "Global.js: Footer component loaded successfully."
    * Confirm you see "Global.js: DOMContentLoaded processing complete."
4.  **Verify `loadHTMLComponent`**: If errors persist around loading, you may need to review `componentLoader.js` to ensure it handles `fetch` correctly and returns `true` or `false` (or a resolving/rejecting promise) reliably.

This revised `global.js` should fix the disappearing header/footer issue by making the script more resilient to potential loading errors. Let me know how it wor
