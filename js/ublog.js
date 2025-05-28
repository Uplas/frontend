// js/ublog.js
/* ==========================================================================
   Uplas Blog Listing Page JavaScript (ublog.js)
   - Handles search, filtering, and pagination via backend API calls.
   - Relies on global.js for theme, nav, language.
   - Relies on apiUtils.js for API calls.
   ========================================================================== */
'use strict';

document.addEventListener('DOMContentLoaded', () => {
    // --- Element Selectors ---
    const searchInput = document.getElementById('search-input');
    const clearSearchButton = document.getElementById('clear-search-button');
    const postsGrid = document.getElementById('blog-posts-grid');
    const filterButtonsContainer = document.querySelector('.blog-filters');
    const noPostsMessage = document.getElementById('no-posts-message');
    const paginationContainer = document.querySelector('.pagination'); // Ensure this container exists in HTML

    // --- State ---
    let currentFilter = 'all'; // Default category filter
    let currentSearchTerm = '';
    let currentPage = 1; // For pagination

    // --- Utility Functions ---
    const escapeHTML = (str) => { // Basic HTML escaping
        if (typeof str !== 'string') return '';
        return str.replace(/[&<>'"]/g,
            tag => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[tag] || tag)
        );
    };

    // --- API Call and Rendering ---
    async function fetchAndRenderBlogPosts(page = 1, category = 'all', searchTerm = '') {
        if (!postsGrid) {
            console.error("Blog posts grid container not found.");
            return;
        }
        if (typeof window.uplasApi === 'undefined' || typeof window.uplasApi.fetchAuthenticated !== 'function') {
            console.error("uplasApi.fetchAuthenticated is not available. Cannot fetch blog posts.");
            postsGrid.innerHTML = `<p class="error-message" data-translate-key="error_api_unavailable">Error: API utility is not available.</p>`;
            if(window.uplasTranslate) window.uplasTranslate(postsGrid.querySelector('p'));
            return;
        }

        // Update state
        currentPage = page;
        currentFilter = category;
        currentSearchTerm = searchTerm.trim();

        postsGrid.innerHTML = `<p class="loading-message" data-translate-key="ublog_loading_articles">Loading articles...</p>`;
        if (noPostsMessage) noPostsMessage.style.display = 'none'; // Hide no posts message during load
        if (window.uplasTranslate) window.uplasTranslate(postsGrid.querySelector('p'));

        let queryParams = `?page=${currentPage}`;
        if (currentFilter !== 'all' && currentFilter !== '') {
            queryParams += `&category__slug=${encodeURIComponent(currentFilter)}`; // Assuming filtering by category slug
        }
        if (currentSearchTerm !== '') {
            queryParams += `&search=${encodeURIComponent(currentSearchTerm)}`;
        }

        try {
            // L61: fetchAndRenderBlogPosts
            // Action: API call to /api/blog/posts?page=...&category=...&search=....
            // Blog posts are often public. If this endpoint doesn't require auth,
            // an `isPublic: true` option could be added to fetchAuthenticated or use direct fetch.
            const response = await window.uplasApi.fetchAuthenticated(`/blog/posts/${queryParams}`);

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({ detail: `Failed to fetch posts. Status: ${response.status}` }));
                throw new Error(errorData.detail || `HTTP error! Status: ${response.status}`);
            }
            const data = await response.json();
            // Assuming DRF paginated response: { count, next, previous, results: [posts] }
            // Each post in results: { slug, title, title_key?, excerpt, featured_image_url, author: {full_name}, category: {name, name_key?}, published_at, tags: [{name}] }

            postsGrid.innerHTML = ''; // Clear loading message
            if (data.results && data.results.length > 0) {
                data.results.forEach(post => postsGrid.insertAdjacentHTML('beforeend', renderPostPreviewHTML(post)));
                if (noPostsMessage) noPostsMessage.style.display = 'none';
            } else {
                if (noPostsMessage) {
                    noPostsMessage.style.display = 'block';
                    noPostsMessage.textContent = window.uplasTranslate ? window.uplasTranslate('ublog_no_posts_message_filters', {fallback:"No articles found matching your criteria."}) : "No articles found matching your criteria.";
                }
            }

            updatePaginationControls(data.count, data.next, data.previous, data.results.length);
            if (window.uplasApplyTranslations) window.uplasApplyTranslations(postsGrid); // Translate new content

        } catch (error) {
            console.error("Error fetching blog posts:", error);
            postsGrid.innerHTML = `<p class="error-message" data-translate-key="ublog_error_loading">Could not load articles: ${escapeHTML(error.message)}</p>`;
            if (window.uplasTranslate) window.uplasTranslate(postsGrid.querySelector('p'));
            if (paginationContainer) paginationContainer.innerHTML = ''; // Clear pagination on error
        } finally {
            if (clearSearchButton) {
                clearSearchButton.style.display = currentSearchTerm ? 'inline-flex' : 'none';
            }
        }
    }

    function renderPostPreviewHTML(post) {
        // Ensure post and nested properties exist to prevent errors
        const title = escapeHTML(post.title || 'Untitled Post');
        const titleKey = post.title_key || '';
        const authorName = escapeHTML(post.author?.full_name || post.author?.username || 'Uplas Team');
        const categoryName = escapeHTML(post.category?.name || 'General');
        const categoryNameKey = post.category?.name_key || '';
        const categorySlug = post.category?.slug || 'general';
        const excerpt = escapeHTML(post.excerpt || 'Read more...');
        const excerptKey = post.excerpt_key || ''; // If you have translatable excerpts
        const imageUrl = post.featured_image_url || `https://placehold.co/600x400/00b4d8/FFFFFF?text=${encodeURIComponent(title.substring(0,10))}&font=poppins`;
        const postUrl = `blog-post-detail.html?slug=${post.slug}`;
        const date = post.published_at ? new Date(post.published_at).toLocaleDateString(document.documentElement.lang || 'en-US', { day: 'numeric', month: 'short', year: 'numeric' }) : '';

        // Basic tags display
        let tagsHTML = '';
        if (post.tags && post.tags.length > 0) {
            tagsHTML = `<div class="post-preview__tags">` +
                       post.tags.map(tag => `<span class="tag">#${escapeHTML(tag.name)}</span>`).join(' ') +
                       `</div>`;
        }

        return `
            <article class="blog-post-preview" data-category="${escapeHTML(categorySlug.toLowerCase())}" data-tags="${escapeHTML(post.tags?.map(t => t.name).join(' ').toLowerCase() || '')}">
                <a href="${postUrl}" class="post-preview__image-link">
                    <img src="${imageUrl}" alt="${title}" class="post-preview__image" loading="lazy">
                </a>
                <div class="post-preview__content">
                    <div class="post-preview__meta">
                        <a href="ublog.html?category=${categorySlug}" class="post-preview__category" ${categoryNameKey ? `data-translate-key="${categoryNameKey}"` : ''}>${categoryName}</a>
                        ${date ? `<span class="post-preview__date">${date}</span>` : ''}
                    </div>
                    <h3 class="post-preview__title">
                        <a href="${postUrl}" ${titleKey ? `data-translate-key="${titleKey}"` : ''}>${title}</a>
                    </h3>
                    <p class="post-preview__excerpt" ${excerptKey ? `data-translate-key="${excerptKey}"` : ''}>${excerpt}</p>
                    ${tagsHTML}
                    <div class="post-preview__author-cta">
                        <span class="post-preview__author" data-translate-key="ublog_author_prefix" data-translate-args='{"authorName": "${authorName}"}'>By ${authorName}</span>
                        <a href="${postUrl}" class="button button--text-arrow post-preview__readmore" data-translate-key="button_read_more">Read More <i class="fas fa-arrow-right"></i></a>
                    </div>
                </div>
            </article>
        `;
    }

    function updatePaginationControls(totalItems, nextUrl, prevUrl, itemsOnPage) {
        if (!paginationContainer) return;
        paginationContainer.innerHTML = ''; // Clear existing pagination

        if (totalItems <= itemsOnPage && !nextUrl && !prevUrl) { // Only one page or no items
            paginationContainer.style.display = 'none';
            return;
        }
        paginationContainer.style.display = 'flex';

        const itemsPerPage = itemsOnPage > 0 ? itemsOnPage : 10; // Estimate items per page if not exact from API
        const totalPages = Math.ceil(totalItems / itemsPerPage);


        // "Previous" button
        if (prevUrl) {
            const prevButton = document.createElement('button');
            prevButton.classList.add('pagination__link', 'pagination__link--prev');
            prevButton.innerHTML = `<i class="fas fa-chevron-left"></i> <span data-translate-key="pagination_previous">Previous</span>`;
            prevButton.addEventListener('click', () => {
                const url = new URL(prevUrl);
                const prevPage = url.searchParams.get('page') || currentPage - 1;
                fetchAndRenderBlogPosts(parseInt(prevPage), currentFilter, currentSearchTerm);
            });
            paginationContainer.appendChild(prevButton);
        }

        // Page number links (simplified for DRF next/prev style)
        // For a more complex pagination (e.g., showing multiple page numbers),
        // you'd need totalPages and currentPage from the API directly or calculate it.
        // Here, we are just showing current page based on state.
        const currentPageSpan = document.createElement('span');
        currentPageSpan.classList.add('pagination__link', 'pagination__link--active');
        currentPageSpan.textContent = currentPage;
        paginationContainer.appendChild(currentPageSpan);


        // "Next" button
        if (nextUrl) {
            const nextButton = document.createElement('button');
            nextButton.classList.add('pagination__link', 'pagination__link--next');
            nextButton.innerHTML = `<span data-translate-key="pagination_next">Next</span> <i class="fas fa-chevron-right"></i>`;
            nextButton.addEventListener('click', () => {
                const url = new URL(nextUrl);
                const nextPage = url.searchParams.get('page') || currentPage + 1;
                fetchAndRenderBlogPosts(parseInt(nextPage), currentFilter, currentSearchTerm);
            });
            paginationContainer.appendChild(nextButton);
        }
        if (window.uplasApplyTranslations) window.uplasApplyTranslations(paginationContainer);
    }


    // --- Event Handlers ---
    const handleSearchInput = () => {
        currentSearchTerm = searchInput?.value || '';
        fetchAndRenderBlogPosts(1, currentFilter, currentSearchTerm); // Reset to page 1 for new search
    };

    const handleFilterClick = (e) => {
        const clickedButton = e.target.closest('.filter-button');
        if (!clickedButton || !filterButtonsContainer) return;

        filterButtonsContainer.querySelectorAll('.filter-button').forEach(button => button.classList.remove('filter-button--active'));
        clickedButton.classList.add('filter-button--active');
        currentFilter = clickedButton.dataset.category || 'all';
        fetchAndRenderBlogPosts(1, currentFilter, currentSearchTerm); // Reset to page 1 for new filter
    };

    const handleClearSearch = () => {
        if (searchInput) {
            searchInput.value = '';
            currentSearchTerm = '';
            fetchAndRenderBlogPosts(1, currentFilter, ''); // Fetch with cleared search
            searchInput.focus();
        }
    };

    // --- Event Listeners ---
    if (searchInput) {
        // Use 'change' or a debounced 'input' for less frequent API calls
        let searchTimeout;
        searchInput.addEventListener('input', () => {
            clearTimeout(searchTimeout);
            searchTimeout = setTimeout(() => {
                handleSearchInput();
            }, 500); // Debounce for 500ms
        });
    }
    if (clearSearchButton) {
        clearSearchButton.addEventListener('click', handleClearSearch);
    }
    if (filterButtonsContainer) {
        filterButtonsContainer.addEventListener('click', handleFilterClick);
    }

    // --- Initializations ---
    // Global.js handles theme, nav, language.

    // Initial fetch of blog posts
    fetchAndRenderBlogPosts(currentPage, currentFilter, currentSearchTerm);

    // const currentYearFooterSpan = document.getElementById('current-year-footer'); // Handled by global.js
    // if (currentYearFooterSpan && !currentYearFooterSpan.textContent?.match(/\d{4}/)) {
    //     currentYearFooterSpan.textContent = new Date().getFullYear();
    // }

    console.log("Uplas Blog Listing (ublog.js) API integrated and initialized.");
});
```

**Key Changes and Explanations:**

1.  **`fetchAndRenderBlogPosts(page, category, searchTerm)`**:
    * This is now the core function for displaying posts.
    * It constructs `queryParams` based on the function arguments. Note that for category filtering, I've used `category__slug` assuming your backend filters blog posts by the slug of their category (e.g., `/api/blog/posts/?category__slug=ai-in-education`). Adjust this if your backend uses a different query parameter (like `category_id` or just `category`).
    * It calls `window.uplasApi.fetchAuthenticated(\`/blog/posts/\${queryParams}\`)`.
    * It expects a paginated response from Django REST Framework: `{ count, next, previous, results: [postsArray] }`.
    * It clears the `postsGrid` and then iterates through `data.results`, calling `renderPostPreviewHTML` for each post.
    * It calls `updatePaginationControls` with the pagination data from the API.
    * Error handling is included.

2.  **`renderPostPreviewHTML(post)`**:
    * This new function takes a single `post` object (from the API response) and returns an HTML string for the post preview card.
    * It uses fields like `post.title`, `post.slug`, `post.featured_image_url`, `post.excerpt`, `post.author.full_name` (or `username`), `post.category.name` (and `slug`), `post.published_at`, and `post.tags`. **Ensure your backend `BlogPostListSerializer` provides these fields.**
    * Includes basic HTML escaping for safety.
    * Adds placeholders for translation keys (`data-translate-key`) if your API provides them.

3.  **`updatePaginationControls(totalItems, nextUrl, prevUrl, itemsOnPage)`**:
    * This new function dynamically builds "Previous" and "Next" buttons based on the `next` and `previous` URLs provided by the DRF paginated response.
    * It also displays the current page number (derived from the `currentPage` state variable).
    * Event listeners on these buttons will call `fetchAndRenderBlogPosts` with the appropriate new page number (extracted from the `nextUrl` or `prevUrl`).
    * It hides pagination if there's only one page of results.

4.  **Event Handler Updates**:
    * `handleSearchInput`: Now calls `fetchAndRenderBlogPosts(1, currentFilter, currentSearchTerm)` to fetch from the server, resetting to page 1. A simple debounce is added to the search input listener to reduce API calls while typing.
    * `handleFilterClick`: Now calls `fetchAndRenderBlogPosts(1, currentFilter, currentSearchTerm)`, resetting to page 1.
    * `handleClearSearch`: Clears the search term and calls `fetchAndRenderBlogPosts`.

5.  **Client-Side Filtering Removed**: The old `filterAndDisplayPosts` function and the `allPostPreviewElements` array are no longer needed as the backend handles filtering and provides the relevant set of posts per page.

6.  **Initial Load**: `fetchAndRenderBlogPosts()` is called once when the DOM is loaded to fetch the initial set of posts (page 1, 'all' category, no search term).

**Before Running:**

* **Script Loading Order**: Ensure `apiUtils.js` is loaded *before* `ublog.js`.
* **Backend API Endpoint**:
    * Confirm your backend has a blog post list endpoint, typically `/api/blog/posts/`.
    * Ensure this endpoint supports pagination (DRF's `PageNumberPagination` is standard).
    * Ensure it supports query parameters for filtering:
        * `page` (e.g., `?page=2`)
        * `category__slug` (e.g., `?category__slug=ai-in-education`) or your chosen category filter parameter.
        * `search` (e.g., `?search=learning`) for text search across relevant fields (title, excerpt, tags, etc. - configure this in your DRF `FilterSet` or `SearchFilter`).
* **Backend Serializer (`BlogPostListSerializer`)**: Make sure this serializer (used for the list view) provides all the necessary fields that `renderPostPreviewHTML` expects: `slug`, `title`, `title_key` (optional), `excerpt`, `excerpt_key` (optional), `featured_image_url`, `author` (object with `full_name` or `username`), `category` (object with `name`, `slug`, `name_key` (optional)), `published_at`, and `tags` (array of objects with `name`).
* **HTML Structure**: Ensure you have a `<div class="pagination"></div>` element in your HTML where the pagination links will be rendered.

This updated `ublog.js` should now correctly fetch, filter, and paginate blog posts by interacting with your backend A
