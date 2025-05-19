// js/ublog.js
/* ==========================================================================
   Uplas Blog Listing Page JavaScript (ublog.js)
   - Handles search, filtering, and pagination (client-side simulation).
   - Relies on global.js for theme, nav, language, currency.
   ========================================================================== */
'use strict';

document.addEventListener('DOMContentLoaded', () => {
    // --- Element Selectors ---
    // Theme, Nav, Language, Currency are handled by js/global.js
    const searchInput = document.getElementById('search-input');
    const clearSearchButton = document.getElementById('clear-search-button');
    const postsGrid = document.getElementById('blog-posts-grid'); // Changed ID to be more specific
    const filterButtonsContainer = document.querySelector('.blog-filters');
    const noPostsMessage = document.getElementById('no-posts-message');
    const paginationContainer = document.querySelector('.pagination'); // For potential JS-driven pagination

    // --- State ---
    let currentFilter = 'all'; // Default filter
    let currentSearchTerm = '';
    let allPostPreviewElements = []; // Store all post elements for filtering

    // --- Utility Functions ---
    const filterAndDisplayPosts = () => {
        if (!postsGrid) return;
        if (allPostPreviewElements.length === 0) { // Populate on first run
            allPostPreviewElements = Array.from(postsGrid.querySelectorAll('.blog-post-preview'));
        }
        if (allPostPreviewElements.length === 0 && !postsGrid.querySelector('.blog-post-preview')) {
            if(noPostsMessage) noPostsMessage.style.display = 'block';
            if(paginationContainer) paginationContainer.style.display = 'none';
            return;
        }


        let postsFound = false;
        const searchTerm = currentSearchTerm.toLowerCase().trim();
        const categoryFilter = currentFilter.toLowerCase();

        allPostPreviewElements.forEach(post => {
            const title = (post.querySelector('.post-preview__title')?.textContent || '').toLowerCase();
            const excerpt = (post.querySelector('.post-preview__excerpt')?.textContent || '').toLowerCase();
            const author = (post.querySelector('.post-preview__author')?.textContent || '').toLowerCase();
            const postCategory = (post.dataset.category || '').toLowerCase();
            const postTags = (post.dataset.tags || '').toLowerCase(); // Get tags

            const matchesSearch = searchTerm === '' || title.includes(searchTerm) || excerpt.includes(searchTerm) || author.includes(searchTerm) || postTags.includes(searchTerm);
            const matchesCategory = categoryFilter === 'all' || postCategory === categoryFilter;

            if (matchesSearch && matchesCategory) {
                post.classList.remove('blog-post-preview--hidden');
                post.style.display = ''; // Or 'flex' if that's the default display for the card
                postsFound = true;
            } else {
                post.classList.add('blog-post-preview--hidden');
                post.style.display = 'none';
            }
        });

        if (noPostsMessage) {
            noPostsMessage.style.display = postsFound ? 'none' : 'block';
        }
        if (clearSearchButton) {
            clearSearchButton.style.display = searchTerm ? 'inline-flex' : 'none';
        }
        if (paginationContainer) { // Show/hide pagination based on results
            paginationContainer.style.display = postsFound ? 'flex' : 'none';
        }
        // TODO: Implement actual pagination update logic if posts are dynamically loaded or client-side pagination is complex.
    };


    // --- Event Handlers ---
    const handleSearchInput = () => {
        currentSearchTerm = searchInput?.value || '';
        filterAndDisplayPosts();
    };

    const handleFilterClick = (e) => {
        const clickedButton = e.target.closest('.filter-button');
        if (!clickedButton || !filterButtonsContainer) return;

        filterButtonsContainer.querySelectorAll('.filter-button').forEach(button => button.classList.remove('filter-button--active'));
        clickedButton.classList.add('filter-button--active');
        currentFilter = clickedButton.dataset.category || 'all';
        filterAndDisplayPosts();
    };

    const handleClearSearch = () => {
        if (searchInput) {
            searchInput.value = '';
            currentSearchTerm = '';
            filterAndDisplayPosts();
            searchInput.focus();
        }
    };

    // --- Event Listeners ---
    if (searchInput) {
        searchInput.addEventListener('input', handleSearchInput);
    }
    if (clearSearchButton) {
        clearSearchButton.addEventListener('click', handleClearSearch);
    }
    if (filterButtonsContainer) {
        filterButtonsContainer.addEventListener('click', handleFilterClick);
    }

    // --- Initializations ---
    // Global.js handles theme, nav, language, currency.
    if (postsGrid) { // Ensure grid exists before trying to query its children
        allPostPreviewElements = Array.from(postsGrid.querySelectorAll('.blog-post-preview'));
    }
    filterAndDisplayPosts(); // Initial display based on default filters

    // Update copyright year (global.js might also do this if footer is identical)
    const currentYearFooterSpan = document.getElementById('current-year-footer');
    if (currentYearFooterSpan) {
        const yearText = currentYearFooterSpan.textContent;
        if (yearText && yearText.includes("{currentYear}")) {
            currentYearFooterSpan.textContent = yearText.replace("{currentYear}", new Date().getFullYear());
        } else if (!yearText.includes(new Date().getFullYear().toString())) {
             currentYearFooterSpan.textContent = new Date().getFullYear();
        }
    }

    // --- Placeholder for Dynamic Post Loading & Pagination ---
    // async function fetchAndRenderBlogPosts(page = 1, category = 'all', searchTerm = '') {
    //     if (!postsGrid) return;
    //     postsGrid.innerHTML = '<p class="loading-message">Loading articles...</p>';
    //     // const response = await fetchAuthenticated(`/api/blog/posts?page=${page}&category=${category}&search=${searchTerm}`);
    //     // const data = await response.json(); // { posts: [], totalPages: X, currentPage: Y }
    //     // postsGrid.innerHTML = '';
    //     // data.posts.forEach(post => postsGrid.insertAdjacentHTML('beforeend', renderPostPreviewHTML(post)));
    //     // allPostPreviewElements = Array.from(postsGrid.querySelectorAll('.blog-post-preview'));
    //     // updatePaginationControls(data.currentPage, data.totalPages);
    //     // filterAndDisplayPosts(); // This might not be needed if backend does filtering
    //     // if (window.translatePage) window.translatePage(); // Re-translate new content
    // }
    // function renderPostPreviewHTML(post) { /* ... returns HTML string for a post ... */ }
    // function updatePaginationControls(currentPage, totalPages) { /* ... updates pagination links ... */ }
    // fetchAndRenderBlogPosts(); // Initial load

    console.log("Uplas Blog Listing (ublog.js) loaded.");
});

