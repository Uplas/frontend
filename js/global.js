// js/global.js
// Initializes i18n, loads dynamic components (header/footer),
// handles global UI (theme, language, currency, mobile nav), and user auth state including logout.
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

    // --- 1. Load Header and Footer Components ---
    let headerLoadedSuccessfully = false;
    if (typeof window.loadHTMLComponent === 'function') {
        const headerPlaceholder = getElement('site-header-placeholder', 'Header Placeholder', true);
        if (headerPlaceholder) {
            try {
                headerLoadedSuccessfully = await window.loadHTMLComponent('components/header.html', 'site-header-placeholder');
                if (headerLoadedSuccessfully) console.log("Global.js: Header component loaded successfully.");
            } catch (error) {
                console.error("Global.js: ERROR caught while loading header component:", error);
            }
        }
        const footerPlaceholder = getElement('site-footer-placeholder', 'Footer Placeholder', true);
        if (footerPlaceholder) {
            try {
                await window.loadHTMLComponent('components/footer.html', 'site-footer-placeholder');
            } catch (error) {
                console.error("Global.js: ERROR caught while loading footer component:", error);
            }
        }
    } else {
        console.error("Global.js: CRITICAL - loadHTMLComponent function is not defined.");
    }

    // --- 2. Initialize Internationalization (i18n) ---
    if (typeof i18nManager !== 'undefined' && typeof i18nManager.init === 'function') {
        await i18nManager.init(localStorage.getItem('uplas-lang') || 'en');
    } else {
        console.error("Global.js: CRITICAL - i18nManager is not available.");
    }

    // --- 3. Initialize User Session (using uplasApi) ---
    const uplasApiAvailable = typeof window.uplasApi !== 'undefined' && typeof window.uplasApi.initializeUserSession === 'function';
    if (uplasApiAvailable) {
        await window.uplasApi.initializeUserSession();
    } else {
        console.warn("Global.js: uplasApi not available. Auth checks will be limited.");
    }

    // --- 4. Setup Global UI Elements & Event Listeners ---
    // These functions will only execute fully if the header was loaded.

    function setupThemeToggle() {
        const themeToggleButton = getElement('theme-toggle', 'Theme Toggle Button', false);
        if (!themeToggleButton) return;
        
        const applyTheme = (theme) => {
            document.body.classList.toggle('dark-mode', theme === 'dark');
            const moonIcon = themeToggleButton.querySelector('.theme-icon--dark');
            const sunIcon = themeToggleButton.querySelector('.theme-icon--light');
            if (moonIcon) moonIcon.style.display = theme === 'dark' ? 'none' : 'inline-block';
            if (sunIcon) sunIcon.style.display = theme === 'dark' ? 'inline-block' : 'none';
        };
        
        themeToggleButton.addEventListener('click', () => {
            const newTheme = document.body.classList.contains('dark-mode') ? 'light' : 'dark';
            localStorage.setItem('uplas-theme', newTheme);
            applyTheme(newTheme);
        });

        const savedTheme = localStorage.getItem('uplas-theme') || (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
        applyTheme(savedTheme);
    }

    function setupLanguageSelector() {
        const languageSelector = getElement('language-selector', 'Language Selector', false);
        if (!languageSelector || typeof i18nManager === 'undefined') return;
        
        languageSelector.value = i18nManager.getCurrentLocale();
        languageSelector.addEventListener('change', (event) => {
            i18nManager.setLocale(event.target.value);
        });
    }

    function setupMobileNav() {
        const mobileMenuButton = getElement('mobile-nav-toggle', 'Mobile Nav Toggle', false);
        const mainNavigation = getElement('main-navigation', 'Main Navigation', false);
        if (!mobileMenuButton || !mainNavigation) return;

        mobileMenuButton.addEventListener('click', () => {
            const isExpanded = mainNavigation.classList.toggle('nav--active');
            mobileMenuButton.setAttribute('aria-expanded', isExpanded);
            const icon = mobileMenuButton.querySelector('i');
            if (icon) {
                icon.classList.toggle('fa-bars', !isExpanded);
                icon.classList.toggle('fa-times', isExpanded);
            }
        });
    }
    
    function setupUserActions() {
        const container = getElement('user-profile-container', 'User Profile Container', false);
        const avatarButton = getElement('user-avatar-button', 'User Avatar Button', false);
        const dropdown = getElement('user-profile-dropdown', 'User Profile Dropdown', false);
        const logoutButton = getElement('logout-button', 'Logout Button', false);

        if (!container || !avatarButton || !dropdown || !logoutButton) {
            console.log("Global.js: User profile action elements not found, skipping setup.");
            return;
        }

        // Dropdown Toggle Logic
        avatarButton.addEventListener('click', (event) => {
            event.stopPropagation();
            const isExpanded = dropdown.style.display === 'block';
            dropdown.style.display = isExpanded ? 'none' : 'block';
            avatarButton.setAttribute('aria-expanded', !isExpanded);
        });

        // Close dropdown if clicking outside
        document.addEventListener('click', (event) => {
            if (!container.contains(event.target)) {
                dropdown.style.display = 'none';
                avatarButton.setAttribute('aria-expanded', 'false');
            }
        });

        // Logout Button Logic
        logoutButton.addEventListener('click', () => {
            if (uplasApiAvailable && typeof window.uplasApi.logout === 'function') {
                console.log("Global.js: Executing logout.");
                window.uplasApi.logout(); // This should clear tokens from localStorage
                updateLoginStateUI(); // Update UI immediately
                window.location.href = '/index.html'; // Redirect to home
            } else {
                console.error("Global.js: uplasApi.logout function is not available!");
                alert("Could not log out. API utility is missing.");
            }
        });
        
        console.log("Global.js: User actions (profile dropdown, logout) setup complete.");
    }

    function getUserInitials(fullName) {
        if (!fullName || typeof fullName !== 'string') return 'U';
        const nameParts = fullName.trim().split(/\s+/).filter(Boolean);
        if (nameParts.length === 1) return nameParts[0][0].toUpperCase();
        if (nameParts.length > 1) return (nameParts[0][0] + nameParts[nameParts.length - 1][0]).toUpperCase();
        return 'U';
    }

    function updateLoginStateUI() {
        console.log("Global.js: Updating login state UI.");
        if (!headerLoadedSuccessfully) {
            console.warn("Global.js: Header not loaded, aborting UI update.");
            return;
        }

        const navLoggedIn = getElement('nav-logged-in', 'Logged In Navigation', false);
        const navLoggedOut = getElement('nav-logged-out', 'Logged Out Navigation', false);
        const profileContainer = getElement('user-profile-container', 'User Profile Container', false);
        const authLinkContainer = getElement('auth-header-link-container', 'Login/Signup Link', false);

        if (!navLoggedIn || !navLoggedOut || !profileContainer || !authLinkContainer) {
            console.error("Global.js: One or more critical navigation elements not found. UI update aborted.");
            return;
        }

        const userData = uplasApiAvailable ? window.uplasApi.getUserData() : null;

        if (userData) {
            // --- Logged-In State ---
            navLoggedIn.style.display = 'flex';
            profileContainer.style.display = 'block';
            navLoggedOut.style.display = 'none';
            authLinkContainer.style.display = 'none';

            getElement('user-avatar-initials', 'Avatar Initials', false).textContent = getUserInitials(userData.full_name);
            getElement('user-full-name-display', 'User Full Name', false).textContent = userData.full_name || 'Valued User';
            getElement('user-email-display', 'User Email', false).textContent = userData.email || '';
            
        } else {
            // --- Logged-Out State ---
            navLoggedIn.style.display = 'none';
            profileContainer.style.display = 'none';
            navLoggedOut.style.display = 'flex';
            authLinkContainer.style.display = 'block';
        }
        console.log("Global.js: Login state UI update finished.");
    }
    window.updateLoginStateUI = updateLoginStateUI; // Expose globally

    // --- 5. Run All Setup Functions ---
    if (headerLoadedSuccessfully) {
        setupThemeToggle();
        setupLanguageSelector();
        setupMobileNav();
        setupUserActions(); // New function for dropdown and logout
        updateLoginStateUI(); // Initial UI state check
    } else {
        console.warn("Global.js: Header did not load. Most UI setup functions were skipped.");
    }

    // --- 6. Setup Global Event Listeners ---
    if (uplasApiAvailable) {
        window.addEventListener('authChanged', (event) => {
            console.log("Global.js: 'authChanged' event received.", event.detail);
            updateLoginStateUI();
        });
    }
    
    console.log("Global.js: DOMContentLoaded processing complete.");
});
