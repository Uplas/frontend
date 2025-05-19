// js/ublog.js
/* ==========================================================================
   Uplas Blog Listing Page JavaScript (ublog.js)
   - Handles search, filtering, and pagination (client-side simulation).
   - Relies on global.js for theme, nav, language.
   ========================================================================== */
'use strict';

document.addEventListener('DOMContentLoaded', () => {
    // --- Element Selectors ---
    // Theme, Nav, Language, Currency are handled by js/global.js
    const searchInput = document.getElementById('search-input');
    const clearSearchButton = document.getElementById('clear-search-button');
    const postsGrid = document.getElementById('blog-posts-grid');
    const filterButtonsContainer = document.querySelector('.blog-filters');
    const noPostsMessage = document.getElementById('no-posts-message');
    const paginationContainer = document.querySelector('.pagination');

    // --- State ---
    let currentFilter = 'all';
    let currentSearchTerm = '';
    let allPostPreviewElements = []; // Store all post elements for client-side filtering

    // --- Utility Functions ---
    const filterAndDisplayPosts = () => {
        if (!postsGrid) return;
        // Ensure allPostPreviewElements is populated correctly, especially if posts are loaded dynamically later
        if (allPostPreviewElements.length === 0 || postsGrid.querySelectorAll('.blog-post-preview').length !== allPostPreviewElements.length) {
            allPostPreviewElements = Array.from(postsGrid.querySelectorAll('.blog-post-preview'));
        }

        if (allPostPreviewElements.length === 0) {
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
            const postTags = (post.dataset.tags || '').toLowerCase();

            const matchesSearch = searchTerm === '' || title.includes(searchTerm) || excerpt.includes(searchTerm) || author.includes(searchTerm) || postTags.includes(searchTerm);
            const matchesCategory = categoryFilter === 'all' || postCategory === categoryFilter;

            if (matchesSearch && matchesCategory) {
                post.classList.remove('blog-post-preview--hidden');
                post.style.display = ''; // Or 'flex' if that's the default
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
        if (paginationContainer) {
            paginationContainer.style.display = postsFound ? 'flex' : 'none';
        }
        // TODO: Implement actual pagination update logic if posts are dynamically loaded
        // or client-side pagination is more complex than just showing/hiding all.
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
    // Global.js handles theme, nav, language.
    if (postsGrid) {
        allPostPreviewElements = Array.from(postsGrid.querySelectorAll('.blog-post-preview'));
    }
    filterAndDisplayPosts(); // Initial display

    // Update copyright year (global.js might also do this)
    const currentYearFooterSpan = document.getElementById('current-year-footer');
    if (currentYearFooterSpan) {
        const yearText = currentYearFooterSpan.textContent; // e.g., "© {currentYear} Uplas..."
        if (yearText && yearText.includes("{currentYear}")) {
            currentYearFooterSpan.textContent = yearText.replace("{currentYear}", new Date().getFullYear());
        } else if (yearText && !yearText.match(/\d{4}/)) { // If no placeholder and no year found
             currentYearFooterSpan.textContent = new Date().getFullYear() + " " + yearText;
        }
    }

    // --- Placeholder for Dynamic Post Loading & Pagination ---
    // async function fetchAndRenderBlogPosts(page = 1, category = 'all', searchTerm = '') {
    //     if (!postsGrid) return;
    //     postsGrid.innerHTML = `<p class="loading-message" data-translate-key="ublog_loading_articles">Loading articles...</p>`;
    //     if(window.translatePage) window.translatePage(); // Translate loading message
    //     try {
    //         // const response = await fetchAuthenticated(`/api/blog/posts?page=${page}&category=${category}&search=${searchTerm}`);
    //         // const data = await response.json(); // { posts: [], totalPages: X, currentPage: Y }
    //
    //         // Simulate API response
    //         await new Promise(resolve => setTimeout(resolve, 1000));
    //         const examplePosts = [ /* ... array of post objects from HTML example ... */ ];
    //         const data = { posts: examplePosts, totalPages: 3, currentPage: page };
    //
    //         postsGrid.innerHTML = ''; // Clear loading
    //         if (data.posts.length === 0) {
    //             postsGrid.innerHTML = `<p id="no-posts-message" class="no-results-message" data-translate-key="ublog_no_posts_message">No articles found...</p>`;
    //         } else {
    //             data.posts.forEach(post => postsGrid.insertAdjacentHTML('beforeend', renderPostPreviewHTML(post))); // You'd need renderPostPreviewHTML
    //         }
    //         allPostPreviewElements = Array.from(postsGrid.querySelectorAll('.blog-post-preview')); // Update internal list
    //         updatePaginationControls(data.currentPage, data.totalPages);
    //         filterAndDisplayPosts(); // Re-apply client-side filters if any are active (though backend should handle this)
    //
    //         if (window.translatePage) window.translatePage(); // Re-translate new content
    //
    //     } catch (error) {
    //         console.error("Error fetching blog posts:", error);
    //         postsGrid.innerHTML = `<p class="error-message" data-translate-key="ublog_error_loading">Could not load articles. Please try again later.</p>`;
    //         if(window.translatePage) window.translatePage();
    //     }
    // }
    // function renderPostPreviewHTML(post) { /* ... returns HTML string for a post preview card ... */ }
    // function updatePaginationControls(currentPage, totalPages) { /* ... updates pagination links based on API response ... */ }
    // fetchAndRenderBlogPosts(); // Initial load if posts are dynamic

    console.log("Uplas Blog Listing (ublog.js) v2 loaded.");
});
