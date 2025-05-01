// ublog.js - Standalone Blog Page Functionality

'use strict';

document.addEventListener('DOMContentLoaded', () => {

    // --- Element Selectors ---
    const body = document.body;
    const themeToggle = document.getElementById('theme-toggle');
    const searchInput = document.getElementById('search-input');
    const searchButton = document.getElementById('search-button'); // Keep reference if needed later
    const clearSearchButton = document.getElementById('clear-search-button');
    const postsContainer = document.getElementById('blog-posts');
    const blogPosts = postsContainer?.querySelectorAll('.blog-post-preview'); // Get initial posts
    const filterButtonsContainer = document.querySelector('.blog-filters');
    const filterButtons = filterButtonsContainer?.querySelectorAll('.filter-button');
    const navToggle = document.querySelector('.nav__toggle');
    const navMenu = document.querySelector('.nav');
    const currentYearSpan = document.getElementById('current-year');
    const noPostsMessageDiv = document.getElementById('no-posts-message');
    const resetFiltersButton = document.getElementById('reset-filters-button');


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
        // Icon visibility handled by CSS
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
     * Shows a 'no results' message if applicable.
     */
    const filterAndDisplayPosts = () => {
        if (!blogPosts || blogPosts.length === 0) return;

        const searchTerm = currentSearchTerm.toLowerCase().trim();
        const categoryFilter = currentFilter.toLowerCase();
        let postsFound = false; // Flag to track if any posts are visible

        blogPosts.forEach(post => {
            const title = post.querySelector('.post-preview__title')?.textContent.toLowerCase() || '';
