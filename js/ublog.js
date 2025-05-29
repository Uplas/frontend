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
    const paginationContainer = document.querySelector('.pagination');

    // --- State ---
    let currentFilter = 'all'; // Default category filter (slug)
    let currentSearchTerm = '';
    let currentPage = 1; // For pagination
    let isLoadingPosts = false;

    // --- Utility Functions ---
    const escapeHTML = (str) => {
        if (typeof str !== 'string') return '';
        return str.replace(/[&<>'"]/g,
            tag => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[tag] || tag)
        );
    };

    // --- API Call and Rendering ---
    async function fetchAndRenderBlogPosts(page = 1, categorySlug = 'all', searchTerm = '') {
        if (isLoadingPosts) return;
        isLoadingPosts = true;

        if (!postsGrid) {
            console.error("ublog.js: Blog posts grid container not found.");
            isLoadingPosts = false;
            return;
        }
        if (typeof window.uplasApi === 'undefined' || typeof window.uplasApi.fetchAuthenticated !== 'function') {
            console.error("ublog.js: uplasApi.fetchAuthenticated is not available.");
            postsGrid.innerHTML = `<p class="error-message" data-translate-key="error_api_unavailable">Error: API utility is not available.</p>`;
            if(window.uplasApplyTranslations) window.uplasApplyTranslations(postsGrid);
            isLoadingPosts = false;
            return;
        }

        currentPage = page;
        currentFilter = categorySlug; // Expecting category slug
        currentSearchTerm = searchTerm.trim();

        // Display loading message
        postsGrid.innerHTML = `<p class="loading-message" data-translate-key="ublog_loading_articles">Loading articles...</p>`;
        if (noPostsMessage) noPostsMessage.style.display = 'none';
        if (paginationContainer) paginationContainer.innerHTML = ''; // Clear old pagination
        if (window.uplasApplyTranslations) window.uplasApplyTranslations(postsGrid);

        let queryParams = `?page=${currentPage}`;
        if (currentFilter !== 'all' && currentFilter !== '') {
            queryParams += `&category__slug=${encodeURIComponent(currentFilter)}`;
        }
        if (currentSearchTerm !== '') {
            queryParams += `&search=${encodeURIComponent(currentSearchTerm)}`;
        }

        try {
            const response = await window.uplasApi.fetchAuthenticated(`/blog/posts/${queryParams}`, { isPublic: true });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({ detail: `Failed to fetch posts. Status: ${response.status}` }));
                throw new Error(errorData.detail || `HTTP error! Status: ${response.status}`);
            }
            const data = await response.json(); // Expects DRF paginated response

            postsGrid.innerHTML = ''; // Clear loading message
            if (data.results && data.results.length > 0) {
                data.results.forEach(post => postsGrid.insertAdjacentHTML('beforeend', renderPostPreviewHTML(post)));
                if (noPostsMessage) noPostsMessage.style.display = 'none';
            } else {
                if (noPostsMessage) {
                    noPostsMessage.style.display = 'block';
                    // The textContent will be set by translation if key exists
                    noPostsMessage.setAttribute('data-translate-key', 'ublog_no_posts_message_filters');
                    noPostsMessage.textContent = "No articles found matching your criteria."; // Fallback
                }
            }

            updatePaginationControls(data.count, data.next, data.previous, data.results?.length || 0);
            if (window.uplasApplyTranslations) window.uplasApplyTranslations(document.body); // Apply to whole page to catch pagination etc.

        } catch (error) {
            console.error("ublog.js: Error fetching blog posts:", error);
            postsGrid.innerHTML = `<p class="error-message" data-translate-key="ublog_error_loading_param" data-translate-args='{"errorMessage": "${escapeHTML(error.message)}"}'>Could not load articles: ${escapeHTML(error.message)}</p>`;
            if (window.uplasApplyTranslations) window.uplasApplyTranslations(postsGrid);
        } finally {
            if (clearSearchButton) {
                clearSearchButton.style.display = currentSearchTerm ? 'inline-flex' : 'none';
            }
            isLoadingPosts = false;
        }
    }

    function renderPostPreviewHTML(post) {
        const title = escapeHTML(post.title || 'Untitled Post');
        const titleKey = post.title_key || '';
        const authorName = escapeHTML(post.author?.full_name || post.author?.username || 'Uplas Team');
        const categoryName = escapeHTML(post.category?.name || 'General');
        const categoryNameKey = post.category?.name_key || '';
        const categorySlug = post.category?.slug || 'general';
        const excerpt = escapeHTML(post.excerpt || 'Read more...');
        const excerptKey = post.excerpt_key || '';
        const imageUrl = post.featured_image_url || `https://placehold.co/600x400/00b4d8/FFFFFF?text=${encodeURIComponent(title.substring(0,10))}&font=poppins`;
        const postUrl = `blog-post-detail.html?slug=${post.slug}`;
        const currentLang = (typeof window.uplasGetCurrentLocale === 'function' ? window.uplasGetCurrentLocale() : document.documentElement.lang) || 'en-US';
        const date = post.published_at ? new Date(post.published_at).toLocaleDateString(currentLang, { day: 'numeric', month: 'short', year: 'numeric' }) : '';

        let tagsHTML = '';
        if (post.tags && post.tags.length > 0) {
            tagsHTML = `<div class="post-preview__tags">` +
                       post.tags.map(tag => `<a href="ublog.html?tag=${encodeURIComponent(tag.slug || tag.name)}" class="tag">#${escapeHTML(tag.name)}</a>`).join(' ') +
                       `</div>`;
        }

        return `
            <article class="blog-post-preview" data-category="${escapeHTML(categorySlug.toLowerCase())}">
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
                        <span class="post-preview__author" data-translate-key="by_author">By</span> <span class="post-preview__author-name">${authorName}</span>
                        <a href="${postUrl}" class="button button--text-arrow post-preview__readmore" data-translate-key="read_more_cta">Read More <i class="fas fa-arrow-right"></i></a>
                    </div>
                </div>
            </article>
        `;
    }

    function updatePaginationControls(totalItems, nextUrl, prevUrl, itemsOnThisPage) {
        if (!paginationContainer) return;
        paginationContainer.innerHTML = '';

        // Determine if pagination is needed
        const itemsPerPage = 10; // Assuming 10 items per page as per DRF default, or adjust if your API specifies
        const totalPages = Math.ceil(totalItems / itemsPerPage);

        if (totalPages <= 1) {
            paginationContainer.style.display = 'none';
            return;
        }
        paginationContainer.style.display = 'flex';

        // "Previous" button
        const prevButton = document.createElement('button');
        prevButton.classList.add('pagination__link', 'pagination__link--prev');
        prevButton.innerHTML = `<i class="fas fa-chevron-left"></i> <span data-translate-key="pagination_prev">Prev</span>`;
        if (prevUrl) {
            prevButton.addEventListener('click', () => {
                const url = new URL(prevUrl); // prevUrl should be absolute or relative to current host
                const prevPage = url.searchParams.get('page') || (currentPage > 1 ? currentPage - 1 : 1);
                fetchAndRenderBlogPosts(parseInt(prevPage), currentFilter, currentSearchTerm);
            });
        } else {
            prevButton.classList.add('pagination__link--disabled');
            prevButton.disabled = true;
        }
        paginationContainer.appendChild(prevButton);

        // Page number display (simplified: current page out of total)
        const pageInfo = document.createElement('span');
        pageInfo.classList.add('pagination__info'); // Add class for styling if needed
        pageInfo.textContent = `Page ${currentPage} of ${totalPages}`; // This needs translation if desired
        // Or, for more complex pagination, loop to create page number buttons
        paginationContainer.appendChild(pageInfo);


        // "Next" button
        const nextButton = document.createElement('button');
        nextButton.classList.add('pagination__link', 'pagination__link--next');
        nextButton.innerHTML = `<span data-translate-key="pagination_next">Next</span> <i class="fas fa-chevron-right"></i>`;
        if (nextUrl) {
            nextButton.addEventListener('click', () => {
                const url = new URL(nextUrl);
                const nextPage = url.searchParams.get('page') || (currentPage < totalPages ? currentPage + 1 : totalPages);
                fetchAndRenderBlogPosts(parseInt(nextPage), currentFilter, currentSearchTerm);
            });
        } else {
            nextButton.classList.add('pagination__link--disabled');
            nextButton.disabled = true;
        }
        paginationContainer.appendChild(nextButton);

        if (window.uplasApplyTranslations) window.uplasApplyTranslations(paginationContainer);
    }


    // --- Event Handlers ---
    const handleSearchInput = () => {
        currentSearchTerm = searchInput?.value || '';
        fetchAndRenderBlogPosts(1, currentFilter, currentSearchTerm);
    };

    const handleFilterClick = (e) => {
        const clickedButton = e.target.closest('.filter-button');
        if (!clickedButton || !filterButtonsContainer) return;

        filterButtonsContainer.querySelectorAll('.filter-button').forEach(button => button.classList.remove('filter-button--active'));
        clickedButton.classList.add('filter-button--active');
        currentFilter = clickedButton.dataset.category || 'all'; // Assuming data-category holds the slug
        fetchAndRenderBlogPosts(1, currentFilter, currentSearchTerm);
    };

    const handleClearSearch = () => {
        if (searchInput) {
            searchInput.value = '';
            currentSearchTerm = '';
            if (clearSearchButton) clearSearchButton.style.display = 'none';
            fetchAndRenderBlogPosts(1, currentFilter, '');
            searchInput.focus();
        }
    };

    // --- Event Listeners ---
    if (searchInput) {
        let searchTimeout;
        searchInput.addEventListener('input', () => {
            clearTimeout(searchTimeout);
            searchTimeout = setTimeout(() => {
                handleSearchInput();
            }, 500); // Debounce
            if (clearSearchButton) clearSearchButton.style.display = searchInput.value ? 'inline-flex' : 'none';
        });
        // Show clear button on initial load if searchInput has value (e.g. from browser cache)
        if (clearSearchButton && searchInput.value) clearSearchButton.style.display = 'inline-flex';

    }
    if (clearSearchButton) {
        clearSearchButton.addEventListener('click', handleClearSearch);
    }
    if (filterButtonsContainer) {
        filterButtonsContainer.addEventListener('click', handleFilterClick);
    }

    // --- Initializations ---
    // Read initial filter/search from URL parameters if present
    const urlParams = new URLSearchParams(window.location.search);
    const initialCategory = urlParams.get('category') || 'all';
    const initialSearch = urlParams.get('search') || '';
    const initialTag = urlParams.get('tag') || ''; // Support for tag filtering

    if (initialCategory !== 'all' && filterButtonsContainer) {
        const activeButton = filterButtonsContainer.querySelector(`.filter-button[data-category="${initialCategory}"]`);
        if (activeButton) {
            filterButtonsContainer.querySelectorAll('.filter-button').forEach(b => b.classList.remove('filter-button--active'));
            activeButton.classList.add('filter-button--active');
            currentFilter = initialCategory;
        }
    }
    if (initialSearch && searchInput) {
        searchInput.value = initialSearch;
        currentSearchTerm = initialSearch;
    }
    if(initialTag) {
        // If tag is present, it implies a search for that tag.
        // You might want to set currentSearchTerm or have a specific tag filter parameter for the API.
        // For simplicity, let's treat it as a search term.
        if (searchInput) searchInput.value = `#${initialTag}`; // Display in search bar
        currentSearchTerm = initialTag; // API should handle # or not based on its search logic for tags
        // No specific filter button for tags here, relies on search.
    }


    fetchAndRenderBlogPosts(currentPage, currentFilter, currentSearchTerm);

    console.log("ublog.js: Uplas Blog Listing initialized and API integrated.");
});
