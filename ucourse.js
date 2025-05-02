/ ucourse.js - Courses Listing Page Functionality

'use strict';

document.addEventListener('DOMContentLoaded', () => {

    // --- Element Selectors ---
    const body = document.body;
    const themeToggle = document.getElementById('theme-toggle');
    const searchInput = document.getElementById('search-input');
    const clearSearchButton = document.getElementById('clear-search-button');
    const categoryFilter = document.getElementById('category-filter');
    const difficultyFilter = document.getElementById('difficulty-filter');
    const coursesGrid = document.getElementById('courses-grid');
    const courseCards = coursesGrid?.querySelectorAll('.course-card'); // Get initial cards
    const noCoursesMessage = document.getElementById('no-courses-message');
    const navToggle = document.querySelector('.nav__toggle');
    const navMenu = document.querySelector('.nav');
    const currentYearSpan = document.getElementById('current-year');
    const whatsappFab = document.getElementById('whatsapp-chat'); // FAB container

    // --- State ---
    let currentSearchTerm = '';
    let currentCategory = 'all';
    let currentDifficulty = 'all';

    // --- Utility Functions ---

    /**
     * Updates the theme toggle button appearance and ARIA attributes.
     */
    const updateThemeButton = (isDarkMode) => {
        if (!themeToggle) return;
        const themeText = themeToggle.querySelector('.theme-text');
        themeToggle.setAttribute('aria-label', isDarkMode ? 'Switch to Light Mode' : 'Switch to Dark Mode');
        if (themeText) {
            themeText.textContent = isDarkMode ? 'Light Mode' : 'Dark Mode';
        }
    };

    /**
     * Applies the theme based on saved preference or system setting.
     */
    const applyTheme = () => {
        const savedDarkMode = localStorage.getItem('darkMode'); // Consistent key
        const systemPrefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
        const isDarkMode = savedDarkMode === 'true' || (savedDarkMode === null && systemPrefersDark);
        body.classList.toggle('dark-mode', isDarkMode);
        updateThemeButton(isDarkMode);
    };

     /**
      * Toggles the mobile navigation menu visibility.
      */
      const toggleMobileNav = () => {
         if (!navMenu || !navToggle) return;
         const isOpen = navMenu.classList.toggle('nav--open');
         navToggle.setAttribute('aria-expanded', isOpen);
         navToggle.querySelector('i').classList.toggle('fa-bars', !isOpen);
         navToggle.querySelector('i').classList.toggle('fa-times', isOpen);
     };

    /**
     * Filters and displays course cards based on current filters and search term.
     */
    const filterAndDisplayCourses = () => {
        if (!courseCards || courseCards.length === 0) return;
        let coursesFound = false;

        const searchTerm = currentSearchTerm.toLowerCase().trim();

        courseCards.forEach(card => {
            const title = card.querySelector('.course-card__title')?.textContent.toLowerCase() || '';
            const description = card.querySelector('.course-card__description')?.textContent.toLowerCase() || '';
            const category = card.dataset.category || 'all';
            const difficulty = card.dataset.difficulty || 'all';

            const matchesSearch = searchTerm === '' || title.includes(searchTerm) || description.includes(searchTerm);
            const matchesCategory = currentCategory === 'all' || category.toLowerCase() === currentCategory.toLowerCase();
            const matchesDifficulty = currentDifficulty === 'all' || difficulty.toLowerCase() === currentDifficulty.toLowerCase();

            if (matchesSearch && matchesCategory && matchesDifficulty) {
                card.classList.remove('course-card--hidden');
                coursesFound = true;
            } else {
                card.classList.add('course-card--hidden');
            }
        });

        // Show or hide the 'no results' message
        if (noCoursesMessage) {
            noCoursesMessage.style.display = coursesFound ? 'none' : 'block';
        }

        // Toggle clear search button visibility
        if(clearSearchButton) {
            clearSearchButton.style.display = searchTerm ? 'inline-flex' : 'none';
        }
    };


    // --- Event Handlers ---

    /**
     * Handles search input changes.
     */
    const handleSearchInput = () => {
        currentSearchTerm = searchInput?.value || '';
        filterAndDisplayCourses();
    };

    /**
     * Handles filter select changes.
     */
    const handleFilterChange = () => {
        currentCategory = categoryFilter?.value || 'all';
        currentDifficulty = difficultyFilter?.value || 'all';
        filterAndDisplayCourses();
    };

     /**
     * Clears the search input and re-filters.
     */
     const handleClearSearch = () => {
         if(searchInput) {
             searchInput.value = '';
             currentSearchTerm = '';
             filterAndDisplayCourses();
             searchInput.focus();
         }
     };

    // --- Event Listeners ---

    // Theme Toggle
    if (themeToggle) {
        themeToggle.addEventListener('click', () => {
            const isDarkMode = body.classList.toggle('dark-mode');
            localStorage.setItem('darkMode', isDarkMode);
            updateThemeButton(isDarkMode);
        });
    }

    // Mobile Navigation Toggle
    if (navToggle) {
        navToggle.addEventListener('click', toggleMobileNav);
    }

    // Search Input
    if (searchInput) {
        searchInput.addEventListener('input', handleSearchInput);
    }

     // Clear Search Button
     if (clearSearchButton) {
         clearSearchButton.addEventListener('click', handleClearSearch);
     }

    // Filter Selects
    if (categoryFilter) {
        categoryFilter.addEventListener('change', handleFilterChange);
    }
    if (difficultyFilter) {
        difficultyFilter.addEventListener('change', handleFilterChange);
    }

    // Optional: Add interaction for locked cards (Example: alert)
    coursesGrid?.addEventListener('click', (e) => {
        const lockedCardLink = e.target.closest('.course-card--locked .course-card__link');
        if (lockedCardLink) {
            e.preventDefault(); // Prevent navigation
            alert('This course requires Premium Access. Please visit our Pricing page to upgrade!');
            // Or redirect: window.location.href = 'upricing.html';
        }
    });


    // --- Initializations ---
    applyTheme();
    filterAndDisplayCourses(); // Initial display
    if (currentYearSpan) {
        currentYearSpan.textContent = new Date().getFullYear();
    }
    // Ensure WhatsApp FAB is visible (handled by CSS, no JS needed unless toggling)


}); // End DOMContentLoaded
