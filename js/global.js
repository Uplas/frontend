// js/global.js
// Initializes i18n, loads dynamic components (header/footer),
// handles global UI (theme, language, currency, mobile nav), and user auth state.
'use strict';

document.addEventListener('DOMContentLoaded', async () => {
    console.log("Global.js: DOMContentLoaded event started.");

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
        const headerPlaceholder = document.getElementById('site-header-placeholder');
        const footerPlaceholder = document.getElementById('site-footer-placeholder');

        if (headerPlaceholder) {
            console.log("Global.js: Attempting to load header component.");
            headerLoadedSuccessfully = await window.loadHTMLComponent('components/header.html', 'site-header-placeholder', currentPageFile);
        } else {
            console.warn("Global.js: Header placeholder '#site-header-placeholder' NOT FOUND. Header-dependent UI might not initialize.");
        }

        if (footerPlaceholder) {
            console.log("Global.js: Attempting to load footer component.");
            footerLoadedSuccessfully = await window.loadHTMLComponent('components/footer.html', 'site-footer-placeholder');
        } else {
            console.warn("Global.js: Footer placeholder '#site-footer-placeholder' NOT FOUND.");
        }
    } else {
        console.error("Global.js: CRITICAL - loadHTMLComponent function is not defined. Dynamic components will not load.");
    }

    // --- 3. Initialize Internationalization (i18n) ---
    if (typeof i18nManager !== 'undefined' && typeof i18nManager.init === 'function') {
        console.log("Global.js: Initializing i18nManager.");
        await i18nManager.init(localStorage.getItem('uplas-lang') || 'en');
    } else {
        console.error("Global.js: CRITICAL - i18nManager is not available. Translations will not function.");
    }

    // --- 4. Initialize User Session (using uplasApi from apiUtils.js) ---
    // This must happen AFTER apiUtils.js is loaded and BEFORE UI updates that depend on auth state.
    let currentUser = null;
    if (typeof window.uplasApi !== 'undefined' && typeof window.uplasApi.initializeUserSession === 'function') {
        console.log("Global.js: Initializing user session via uplasApi.");
        try {
            currentUser = await window.uplasApi.initializeUserSession();
            if (currentUser) {
                console.log("Global.js: User session initialized successfully.", currentUser);
            } else {
                console.log("Global.js: No active user session found or initialization failed.");
            }
        } catch (error) {
            console.error("Global.js: Error during user session initialization:", error);
        }
    } else {
        console.error("Global.js: CRITICAL - window.uplasApi or initializeUserSession is not available. Authentication checks will not function. Ensure 'apiUtils.js' is loaded BEFORE 'global.js'.");
    }

    // --- 5. Setup Global UI Elements & Event Listeners ---
    // Helper to safely get an element by ID.
    const getElement = (id, description, isRequired = true) => {
        const element = document.getElementById(id);
        if (!element && isRequired) {
            console.warn(`Global.js: Required element for ${description} ('#${id}') was not found. Check if components loaded correctly and IDs match.`);
        }
        return element;
    };

    // --- Theme Management ---
    const themeToggleButton = getElement('theme-toggle', 'Theme Toggle Button', headerLoadedSuccessfully);
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
    const savedTheme = localStorage.getItem('uplas-theme');
    applyTheme(savedTheme || (prefersDarkScheme.matches ? 'dark' : 'light'));

    // --- Language Management ---
    const languageSelector = getElement('language-selector', 'Language Selector Dropdown', headerLoadedSuccessfully);
    if (languageSelector) {
        languageSelector.value = typeof i18nManager !== 'undefined' ? i18nManager.getCurrentLocale() : (localStorage.getItem('uplas-lang') || 'en');
        languageSelector.addEventListener('change', (event) => {
            if (typeof i18nManager !== 'undefined' && typeof i18nManager.changeLanguage === 'function') {
                i18nManager.changeLanguage(event.target.value);
            } else {
                console.error("Global.js: i18nManager.changeLanguage function is not available.");
            }
        });

        // Listen to language changes from i18nManager to update UI elements if needed
        if (typeof i18nManager !== 'undefined' && typeof i18nManager.onLanguageChange === 'function') {
            i18nManager.onLanguageChange((newLocale) => {
                if (languageSelector.value !== newLocale) languageSelector.value = newLocale;
                if (themeToggleButton) applyTheme(document.body.classList.contains('dark-mode') ? 'dark' : 'light'); // Re-translate theme button
                if (footerLoadedSuccessfully && typeof window.updateDynamicFooterYear === 'function') window.updateDynamicFooterYear();
                // Potentially re-update other translatable global elements here
            });
        }
    }

    // --- Currency Management ---
    const currencySelector = getElement('currency-selector', 'Currency Selector Dropdown', false);
    let currentGlobalCurrency = localStorage.getItem('uplas-currency') || 'USD';
    const globalSimulatedExchangeRates = { USD: 1, EUR: 0.92, KES: 130.50, GBP: 0.79, INR: 83.00 };
    window.simulatedExchangeRates = globalSimulatedExchangeRates; // Make available globally
    window.currentGlobalCurrency = currentGlobalCurrency; // Make available globally

    function formatPrice(price, currencyCode, locale) {
        try {
            return new Intl.NumberFormat(locale || i18nManager.getCurrentLocale() || 'en-US', {
                style: 'currency', currency: currencyCode, minimumFractionDigits: 2, maximumFractionDigits: 2
            }).format(price);
        } catch (e) {
            console.warn(`Global.js: Formatting price error for ${currencyCode}`, e);
            return `${currencyCode} ${Number(price).toFixed(2)}`;
        }
    }
    window.formatPriceForDisplay = formatPrice; // Make available globally

    function updateAllDisplayedPrices() {
        const activeCurrency = window.currentGlobalCurrency;
        const rate = globalSimulatedExchangeRates[activeCurrency] || 1;
        const baseRateUSD = globalSimulatedExchangeRates['USD'] || 1; // Assuming USD is the base

        document.querySelectorAll('[data-price-usd]').forEach(element => {
            const priceUSD = parseFloat(element.getAttribute('data-price-usd'));
            if (!isNaN(priceUSD)) {
                const convertedPrice = (priceUSD / baseRateUSD) * rate;
                element.textContent = formatPrice(convertedPrice, activeCurrency);
            }
        });
        // Example for a specific element if needed, like a payment modal summary
        const paymentModalPriceEl = getElement('summary-plan-price-span', 'Payment Modal Price Span', false);
        if (paymentModalPriceEl && paymentModalPriceEl.dataset.priceUsd) {
             const priceUSD = parseFloat(paymentModalPriceEl.dataset.priceUsd);
            if (!isNaN(priceUSD)) {
                const convertedPrice = (priceUSD / baseRateUSD) * rate;
                paymentModalPriceEl.textContent = formatPrice(convertedPrice, activeCurrency);
            }
        }
    }
    window.updateUserCurrencyDisplay = updateAllDisplayedPrices; // Make available globally

    function changeGlobalCurrency(selectedCurrency) {
        if (!selectedCurrency || !globalSimulatedExchangeRates[selectedCurrency]) {
            console.warn(`Global.js: Invalid or unsupported currency selected: ${selectedCurrency}`);
            return;
        }
        window.currentGlobalCurrency = selectedCurrency;
        localStorage.setItem('uplas-currency', selectedCurrency);
        updateAllDisplayedPrices();
        if (currencySelector && currencySelector.value !== selectedCurrency) {
            currencySelector.value = selectedCurrency;
        }
        // Dispatch a custom event if other components need to react to currency changes
        window.dispatchEvent(new CustomEvent('currencyChanged', { detail: { newCurrency: selectedCurrency } }));
    }
    window.changeUserGlobalCurrency = changeGlobalCurrency; // Make available globally


    if (currencySelector) {
        currencySelector.value = currentGlobalCurrency;
        currencySelector.addEventListener('change', (event) => {
            changeGlobalCurrency(event.target.value);
        });
    }
    updateAllDisplayedPrices(); // Initial price display based on saved or default currency

    // --- Mobile Navigation Toggle ---
    const mobileMenuButton = getElement('mobile-nav-toggle', 'Mobile Navigation Toggle Button', headerLoadedSuccessfully);
    const mainNavigation = getElement('main-navigation', 'Main Navigation Menu', headerLoadedSuccessfully);

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

    // --- Login State UI Update (e.g., show user avatar vs. login link) ---
    function getUserInitials(fullName) {
        if (!fullName || typeof fullName !== 'string') return 'U'; // Default 'U' for User
        const nameParts = fullName.trim().split(/\s+/);
        if (nameParts.length === 1 && nameParts[0].length > 0) {
            return nameParts[0][0].toUpperCase();
        }
        if (nameParts.length > 1) {
            return (nameParts[0][0] + nameParts[nameParts.length - 1][0]).toUpperCase();
        }
        return 'U';
    }

    function updateLoginStateUI() {
        console.log("Global.js: updateLoginStateUI called.");
        if (typeof window.uplasApi === 'undefined') {
            console.warn("Global.js: uplasApi not available for updateLoginStateUI. UI will not reflect auth state.");
            return;
        }

        const accessToken = window.uplasApi.getAccessToken();
        const userData = window.uplasApi.getUserData(); // Get data stored by apiUtils.js

        const userAvatarHeader = getElement('user-avatar-header', 'User Avatar in Header', false);
        const loginSignupHeaderLinkContainer = getElement('auth-header-link-container', 'Login/Signup Link Container in Header', false);
        const userFullNameDisplay = getElement('user-full-name-display', 'User Full Name Display in Dropdown', false); // Optional
        const userEmailDisplay = getElement('user-email-display', 'User Email Display in Dropdown', false); // Optional

        if (userAvatarHeader && loginSignupHeaderLinkContainer) {
            if (accessToken && userData) { // Check for both token and some user data
                console.log("Global.js: User is authenticated. Updating UI.", userData);
                const avatarButton = userAvatarHeader.querySelector('.user-avatar-button-header');
                if (avatarButton) {
                    avatarButton.textContent = getUserInitials(userData.full_name);
                    avatarButton.setAttribute('aria-label', `User menu for ${userData.full_name || 'current user'}`);
                }
                if(userFullNameDisplay && userData.full_name) userFullNameDisplay.textContent = userData.full_name;
                if(userEmailDisplay && userData.email) userEmailDisplay.textContent = userData.email;

                userAvatarHeader.style.display = 'flex'; // Or 'block' based on your CSS
                loginSignupHeaderLinkContainer.style.display = 'none';
            } else {
                console.log("Global.js: User is not authenticated. Showing login/signup links.");
                userAvatarHeader.style.display = 'none';
                loginSignupHeaderLinkContainer.style.display = 'list-item'; // Or 'block' / 'flex' as appropriate
                if(userFullNameDisplay) userFullNameDisplay.textContent = '';
                if(userEmailDisplay) userEmailDisplay.textContent = '';
            }
        } else {
            if (headerLoadedSuccessfully) { // Only warn if header was expected to be loaded
                console.warn("Global.js: Avatar or Login/Signup link container not found in header for UI update.");
            }
        }
    }

    // Initial UI update after session initialization and header load
    if (headerLoadedSuccessfully) {
        updateLoginStateUI();
    }

    // Listen for custom event 'authChanged' dispatched by login/logout functions in apiUtils.js
    window.addEventListener('authChanged', (event) => {
        console.log("Global.js: 'authChanged' event received.", event.detail);
        // event.detail might contain { isAuthenticated: true/false, user: userData }
        // For now, just re-run the UI update which fetches from localStorage.
        updateLoginStateUI();
    });

    // Display auth redirect message if present
    const authRedirectMsg = sessionStorage.getItem(window.uplasApi ? window.uplasApi.AUTH_REDIRECT_MESSAGE_KEY : 'uplasAuthRedirectMessage');
    if (authRedirectMsg) {
        const authSection = getElement('auth-section', 'Authentication Section for Redirect Message', false) || document.body;
        if (window.uplasApi && typeof window.uplasApi.displayFormStatus === 'function') {
            window.uplasApi.displayFormStatus(authSection, authRedirectMsg, true);
        } else {
            console.warn("Global.js: uplasApi.displayFormStatus not available for auth redirect message.");
            // Basic fallback if displayFormStatus isn't ready or uplasApi isn't loaded
            const msgEl = document.createElement('p');
            msgEl.textContent = authRedirectMsg;
            msgEl.style.color = 'red';
            msgEl.style.textAlign = 'center';
            msgEl.style.padding = '10px';
            if (authSection.firstChild) authSection.insertBefore(msgEl, authSection.firstChild);
            else authSection.appendChild(msgEl);
        }
        sessionStorage.removeItem(window.uplasApi ? window.uplasApi.AUTH_REDIRECT_MESSAGE_KEY : 'uplasAuthRedirectMessage');
    }


    console.log("Global.js: All initializations and event listeners setup complete.");
});
```

**Suggestions & Important Notes for `global.js`:**

1.  **Order of Operations in `DOMContentLoaded`**:
    * Load HTML components (header/footer) first.
    * Initialize i18n.
    * **Crucially, call `window.uplasApi.initializeUserSession()` *after* `apiUtils.js` is loaded but *before* you try to update UI elements that depend on the authentication state (like `updateLoginStateUI`).** The code above now reflects this.
    * Then, proceed with other UI setups (theme, language, etc.).
    * Call `updateLoginStateUI()` explicitly after `initializeUserSession()` has resolved and after the header is confirmed to be loaded.

2.  **`getUserInitials(fullName)`**: Added this helper to generate initials. You can customize it further if needed (e.g., if `userData` might sometimes lack `full_name`).

3.  **Robust Element Checking**: The `getElement` helper is good. Continue to use it, especially for elements within dynamically loaded components like the header. The `headerLoadedSuccessfully` flag is used to make some warnings conditional.

4.  **Displaying Auth Redirect Message**: The code now attempts to display the message from `sessionStorage` using `uplasApi.displayFormStatus` if available, or a basic fallback.

**Crucial Recommendation for `apiUtils.js` (from `apiUtils_refined_v2`):**

For the `window.addEventListener('authChanged', updateLoginStateUI);` in `global.js` to be effective after a login or logout action, you **must** dispatch this custom event from your `loginUser` and `logoutUser` functions in `apiUtils.js`.

Here's how you would modify `loginUser` and `logoutUser` in your `apiUtils.js` (referring to the structure of `apiUtils_refined_v2`):

**In `apiUtils.js` (e.g., `window.uplasApi.loginUser`):**

```javascript
// Inside loginUser function, after successful login and token storage:
// ...
storeTokensInternal(data.access, data.refresh);
if (data.user) {
    storeUserDataInternal({ /* user data */ });
}
// Dispatch event
window.dispatchEvent(new CustomEvent('authChanged', { detail: { isAuthenticated: true, user: getUserDataInternal() } })); // Use getUserDataInternal to get the just-stored data
return data;
```

**In `apiUtils.js` (e.g., `window.uplasApi.logoutUser`):**

```javascript
// Inside logoutUser function, after clearing tokens:
// ...
clearTokensAndUserDataInternal();
// Dispatch event BEFORE redirecting
window.dispatchEvent(new CustomEvent('authChanged', { detail: { isAuthenticated: false, user: null } }));
redirectToLoginInternal('You have been successfully logged out.');
// ...
```

By dispatching this event, `global.js` will pick it up and refresh the UI components (like the header avatar/login links) immediately after login or logout actions performed elsewhere in your application.

This refined `global.js` coupled with the `authChanged` event dispatch in `apiUtils.js` will create a much more responsive and correctly integrated authentication display. Remember to ensure `apiUtils.js` is loaded *before* `global.js` in your HTML fil
