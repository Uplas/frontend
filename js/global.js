// Uplas Frontend: js/global.js
// Handles theme, language, currency, mobile navigation, and other global utilities.

document.addEventListener('DOMContentLoaded', () => {
    // --- Theme Management ---
    const themeToggleButton = document.getElementById('theme-toggle');
    const prefersDarkScheme = window.matchMedia('(prefers-color-scheme: dark)');
    let currentTranslations = {}; // To store loaded translation files

    function applyTheme(theme) {
        if (theme === 'dark') {
            document.body.classList.add('dark-mode');
            if (themeToggleButton) {
                themeToggleButton.innerHTML = '<i class="fas fa-sun"></i>'; // Sun icon for dark mode
                themeToggleButton.setAttribute('aria-label', currentTranslations.theme_toggle_dark || 'Switch to Light Mode');
            }
        } else {
            document.body.classList.remove('dark-mode');
            if (themeToggleButton) {
                themeToggleButton.innerHTML = '<i class="fas fa-moon"></i>'; // Moon icon for light mode
                themeToggleButton.setAttribute('aria-label', currentTranslations.theme_toggle_light || 'Switch to Dark Mode');
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

    // --- Language Management (i18n) ---
    const languageSelector = document.getElementById('language-selector');
    let currentLanguage = localStorage.getItem('uplas-lang') || 'en'; // Default to English

    async function loadTranslations(lang) {
        try {
            // AI Integration Point: Translations could be enhanced by an AI model
            // for more nuanced or context-aware translations, though typically static JSON is used.
            const response = await fetch(`locales/${lang}.json`);
            if (!response.ok) {
                console.error(`Could not load translations for ${lang}. Falling back to English.`);
                if (lang !== 'en') return loadTranslations('en'); // Fallback
                return {};
            }
            currentTranslations = await response.json();
            return currentTranslations;
        } catch (error) {
            console.error('Error loading translation file:', error);
            if (lang !== 'en') return loadTranslations('en'); // Fallback
            return {};
        }
    }

    function translatePage() {
        document.querySelectorAll('[data-translate-key]').forEach(element => {
            const key = element.getAttribute('data-translate-key');
            const translation = currentTranslations[key];
            if (translation) {
                // Preserve existing child elements like <i> for icons if they exist
                const icon = element.querySelector('i');
                if (icon && (element.tagName === 'BUTTON' || element.tagName === 'A')) {
                     // For buttons/links, set text content carefully to not overwrite icons
                    let textNode = null;
                    for(let node of element.childNodes) {
                        if(node.nodeType === Node.TEXT_NODE && node.textContent.trim() !== '') {
                            textNode = node;
                            break;
                        }
                    }
                    if (textNode) textNode.textContent = ` ${translation} `;
                    else element.appendChild(document.createTextNode(` ${translation} `));
                } else {
                    element.textContent = translation;
                }

            } else {
                // console.warn(`No translation found for key: ${key} in ${currentLanguage}`);
            }
        });

        // Update dynamic aria-labels after translations are loaded
        if (themeToggleButton) {
             applyTheme(localStorage.getItem('uplas-theme') || (prefersDarkScheme.matches ? 'dark' : 'light'));
        }
        // Update search placeholder if it exists
        const searchInput = document.querySelector('.search-bar input[type="search"]');
        if (searchInput && currentTranslations.search_placeholder) {
            searchInput.placeholder = currentTranslations.search_placeholder;
        }
    }

    async function changeLanguage(lang) {
        if (!lang) return;
        currentLanguage = lang;
        localStorage.setItem('uplas-lang', lang);
        await loadTranslations(lang);
        translatePage();
        document.documentElement.lang = lang; // Update lang attribute on <html>

        // Update selector display
        if (languageSelector) {
            languageSelector.value = lang;
        }
    }

    if (languageSelector) {
        languageSelector.addEventListener('change', (event) => {
            changeLanguage(event.target.value);
        });
    }

    // --- Currency Management ---
    const currencySelector = document.getElementById('currency-selector');
    let currentCurrency = localStorage.getItem('uplas-currency') || 'USD'; // Default to USD
    const simulatedExchangeRates = { // Relative to USD
        USD: 1,
        EUR: 0.92,
        KES: 130.50,
        GBP: 0.79,
        // Backend Integration: Fetch these rates from a reliable currency API.
    };

    function formatPrice(price, currency) {
        try {
            return new Intl.NumberFormat(undefined, { style: 'currency', currency: currency }).format(price);
        } catch (e) {
            // Fallback for unsupported currencies by Intl or if currency symbol is unknown
            return `${currency} ${price.toFixed(2)}`;
        }
    }

    function updatePrices() {
        const rate = simulatedExchangeRates[currentCurrency] || 1;
        const baseRate = simulatedExchangeRates['USD'] || 1; // Assuming USD is the base for data-price-usd

        document.querySelectorAll('[data-price-usd]').forEach(element => {
            const priceUSD = parseFloat(element.getAttribute('data-price-usd'));
            if (!isNaN(priceUSD)) {
                const convertedPrice = (priceUSD / baseRate) * rate;
                element.textContent = formatPrice(convertedPrice, currentCurrency);
            }
        });
         // Update payment modal if it's open and showing a price
        const paymentModalPriceElement = document.getElementById('payment-modal-price');
        if (paymentModalPriceElement && paymentModalPriceElement.dataset.priceUsd) {
            const priceUSD = parseFloat(paymentModalPriceElement.dataset.priceUsd);
            if (!isNaN(priceUSD)) {
                const convertedPrice = (priceUSD / baseRate) * rate;
                paymentModalPriceElement.textContent = formatPrice(convertedPrice, currentCurrency);
            }
        }
    }

    function changeCurrency(currency) {
        if (!currency) return;
        currentCurrency = currency;
        localStorage.setItem('uplas-currency', currency);
        updatePrices();

        // Update selector display
        if (currencySelector) {
            currencySelector.value = currency;
        }
    }

    if (currencySelector) {
        currencySelector.addEventListener('change', (event) => {
            changeCurrency(event.target.value);
        });
    }

    // --- Mobile Navigation Toggle ---
    const mobileMenuButton = document.getElementById('mobile-menu-toggle');
    const mainNav = document.getElementById('main-nav');

    if (mobileMenuButton && mainNav) {
        mobileMenuButton.addEventListener('click', () => {
            mainNav.classList.toggle('active');
            mobileMenuButton.classList.toggle('active'); // For animating the burger icon
            // ARIA attribute for accessibility
            const isExpanded = mainNav.classList.contains('active');
            mobileMenuButton.setAttribute('aria-expanded', isExpanded.toString());
        });
    }

    // --- Utility: Smooth Scroll ---
    window.uplasScrollToElement = function(selector) {
        const element = document.querySelector(selector);
        if (element) {
            element.scrollIntoView({ behavior: 'smooth' });
        }
    };

    // --- Initialization ---
    async function initializeGlobalFeatures() {
        // 1. Apply saved theme or system preference
        const savedTheme = localStorage.getItem('uplas-theme');
        applyTheme(savedTheme || (prefersDarkScheme.matches ? 'dark' : 'light'));

        // 2. Load translations and apply
        if (languageSelector) languageSelector.value = currentLanguage; // Set selector to saved/default
        await loadTranslations(currentLanguage);
        translatePage();
        document.documentElement.lang = currentLanguage;

        // 3. Apply currency and update prices
        if (currencySelector) currencySelector.value = currentCurrency; // Set selector
        updatePrices();

        console.log('Uplas global.js initialized.');
    }

    initializeGlobalFeatures();
});
