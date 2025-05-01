// ublog.js - Standalone Blog Page Functionality

'use strict';

document.addEventListener('DOMContentLoaded', () => {

    // --- Element Selectors ---
    const body = document.body;
    const themeToggle = document.getElementById('theme-toggle');
    const searchInput = document.getElementById('search-input');
    const searchButton = document.getElementById('search-button');
    const clearSearchButton = document.getElementById('clear-search-button');
    const postsContainer = document.getElementById('blog-posts');
    const blogPosts = postsContainer?.querySelectorAll('.blog-post-preview'); // Get initial posts
    const filterButtonsContainer = document.querySelector('.blog-filters');
    const filterButtons = filterButtonsContainer?.querySelectorAll('.filter-button');
    const navToggle = document.querySelector('.nav__toggle');
    const navMenu = document.querySelector('.nav');
    const currentYearSpan = document.getElementById('current-year');


    // --- State ---
    let currentFilter = 'all'; // Default filter
    let currentSearchTerm = '';

    // --- Utility Functions ---

    /**
     * Updates the theme toggle button appearance and ARIA attributes.
     * @param {boolean} isDarkMode - Indicates if dark mode is active.
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
        const savedDarkMode = localStorage.getItem('darkMode'); // Use consistent key
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
     * Filters and displays blog posts based on search term and category.
     */
    const filterAndDisplayPosts = () => {
        if (!blogPosts || blogPosts.length === 0) return;

        const searchTerm = currentSearchTerm.toLowerCase().trim();
        const categoryFilter = currentFilter;

        blogPosts.forEach(post => {
            const title = post.querySelector('.post-preview__title')?.textContent.toLowerCase() || '';
            const excerpt = post.querySelector('.post-preview__excerpt')?.textContent.toLowerCase() || '';
            const author = post.querySelector('.post-preview__author')?.textContent.toLowerCase() || '';
            const postCategory = post.dataset.category || ''; // Get category from data attribute

            const matchesSearch = searchTerm === '' || title.includes(searchTerm) || excerpt.includes(searchTerm) || author.includes(searchTerm);
            const matchesCategory = categoryFilter === 'all' || postCategory.toLowerCase() === categoryFilter.toLowerCase();

            // Show post only if it matches both search and category filter
            if (matchesSearch && matchesCategory) {
                post.classList.remove('blog-post-preview--hidden');
                // Use CSS for display changes if possible, fallback to style
                // post.style.display = 'flex'; // Or 'block' or '' depending on CSS default
            } else {
                 post.classList.add('blog-post-preview--hidden');
                // post.style.display = 'none';
            }
        });

        // Toggle clear search button visibility
        if(clearSearchButton) {
            clearSearchButton.style.display = searchTerm ? 'inline-flex' : 'none';
        }

        // Update pagination if implemented dynamically
        // updatePagination();
    };


    // --- Event Handlers ---

    /**
     * Handles search input changes.
     */
    const handleSearchInput = () => {
        currentSearchTerm = searchInput?.value || '';
        filterAndDisplayPosts();
    };

    /**
     * Handles category filter button clicks.
     * @param {Event} e - The click event.
     */
    const handleFilterClick = (e) => {
        const clickedButton = e.target.closest('.filter-button');
        if (!clickedButton || !filterButtonsContainer) return;

        // Update active state
        filterButtons.forEach(button => button.classList.remove('filter-button--active'));
        clickedButton.classList.add('filter-button--active');

        // Update filter state and re-filter posts
        currentFilter = clickedButton.dataset.category || 'all';
        filterAndDisplayPosts();
    };

     /**
     * Clears the search input and re-filters posts.
     */
     const handleClearSearch = () => {
         if(searchInput) {
             searchInput.value = '';
             currentSearchTerm = '';
             filterAndDisplayPosts();
             searchInput.focus(); // Focus back on input
         }
     };


    // --- Event Listeners ---

    // Theme Toggle
    if (themeToggle) {
        themeToggle.addEventListener('click', () => {
            const isDarkMode = body.classList.toggle('dark-mode');
            localStorage.setItem('darkMode', isDarkMode); // Consistent key
            updateThemeButton(isDarkMode);
        });
    }

    // Mobile Navigation Toggle
    if (navToggle) {
        navToggle.addEventListener('click', toggleMobileNav);
    }

    // Search Input (Real-time filtering)
    if (searchInput) {
        searchInput.addEventListener('input', handleSearchInput);
    }

    // Clear Search Button
     if (clearSearchButton) {
         clearSearchButton.addEventListener('click', handleClearSearch);
     }

    // Optional: Search Button (if real-time filtering is not desired)
    // if (searchButton) {
    //     searchButton.addEventListener('click', handleSearchInput);
    // }
    // Optional: Allow search on Enter key press
    // if (searchInput) {
    //     searchInput.addEventListener('keypress', (e) => {
    //         if (e.key === 'Enter') {
    //             handleSearchInput();
    //         }
    //     });
    // }


    // Category Filter Buttons
    if (filterButtonsContainer) {
        filterButtonsContainer.addEventListener('click', handleFilterClick);
    }

    // --- Initializations ---
    applyTheme(); // Apply theme on load
    filterAndDisplayPosts(); // Initial display based on default filters
     if (currentYearSpan) {
         currentYearSpan.textContent = new Date().getFullYear(); // Update copyright year
    }


}); // End DOMContentLoaded
