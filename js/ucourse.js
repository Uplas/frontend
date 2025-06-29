// js/ucourse.js (for course listing page: ucourse.html)
'use strict';

document.addEventListener('DOMContentLoaded', () => {
    // --- Element Selectors ---
    const searchInput = document.getElementById('search-input');
    const clearSearchButton = document.getElementById('clear-search-button');
    const categoryFilter = document.getElementById('category-filter');
    const difficultyFilter = document.getElementById('difficulty-filter');
    const coursesGrid = document.getElementById('courses-grid');
    const noCoursesMessage = document.getElementById('no-courses-message');
    const paginationContainer = document.querySelector('.pagination-courses');

    // --- State Management ---
    let currentSearchTerm = '';
    let currentCategory = 'all';
    let currentDifficulty = 'all';
    let currentPage = 1;
    let isLoadingCourses = false;

    // --- Global Utilities ---
    const { uplasApi, uplasTranslate, uplasApplyTranslations, uplasGetCurrentLocale } = window;

    // --- Helper Function ---
    const escapeHTML = (str) => {
        if (typeof str !== 'string') return '';
        return str.replace(/[&<>'"]/g, tag => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[tag] || tag));
    };

    /**
     * Renders the HTML for a single course card based on data from the backend.
     * @param {object} course - The course data object from the API.
     * @returns {string} The HTML string for the course card.
     */
    const renderCourseCardHTML = (course) => {
        const title = escapeHTML(course.title || 'Untitled Course');
        const description = escapeHTML(course.short_description || 'Learn more...');
        const imageUrl = course.thumbnail_url || `https://placehold.co/600x400/00b4d8/FFFFFF?text=${encodeURIComponent(title.substring(0, 12))}`;
        const courseUrl = `mcourseD.html?courseId=${course.slug || course.id}`;
        const difficulty = escapeHTML(course.difficulty || 'N/A');
        const categoryName = escapeHTML(course.category?.name || 'General');
        const duration = escapeHTML(course.duration_hours ? `${course.duration_hours} Hours` : 'N/A');
        const isLocked = !course.is_enrolled && course.is_premium;

        const cardClass = isLocked ? 'course-card--locked' : 'course-card--available';

        return `
            <article class="course-card ${cardClass}" data-course-id="${course.slug || course.id}">
                <a href="${courseUrl}" class="course-card__link">
                    <div class="course-card__image-container">
                        <img src="${imageUrl}" alt="${title}" class="course-card__image" loading="lazy">
                        <span class="course-card__difficulty-badge">${difficulty}</span>
                        ${isLocked ? `
                            <div class="course-card__locked-overlay">
                                <i class="fas fa-lock"></i>
                                <span>Premium Access</span>
                            </div>` : ''}
                    </div>
                    <div class="course-card__content">
                        <h3 class="course-card__title">${title}</h3>
                        <p class="course-card__description">${description}</p>
                        <div class="course-card__meta">
                            <span><i class="fas fa-clock"></i> Approx. ${duration}</span>
                            <span><i class="fas fa-layer-group"></i> ${categoryName}</span>
                        </div>
                        <span class="course-card__cta ${isLocked ? 'course-card__cta--locked' : ''}">View Details <i class="fas fa-arrow-right"></i></span>
                    </div>
                </a>
            </article>
        `;
    };

    /**
     * Renders pagination controls based on the API response.
     * @param {object} paginationData - The pagination object from the API (count, next, previous).
     */
    const updatePaginationControls = (paginationData) => {
        if (!paginationContainer) return;
        paginationContainer.innerHTML = '';
        const { count, next, previous, page_size, current_page } = paginationData;
        const totalPages = Math.ceil(count / page_size);

        if (totalPages <= 1) {
            paginationContainer.style.display = 'none';
            return;
        }
        paginationContainer.style.display = 'flex';

        // Previous Button
        const prevButton = document.createElement('button');
        prevButton.innerHTML = `<i class="fas fa-chevron-left"></i> Prev`;
        prevButton.disabled = !previous;
        prevButton.addEventListener('click', () => fetchAndRenderCourses(current_page - 1));
        paginationContainer.appendChild(prevButton);

        // Page Info
        const pageInfo = document.createElement('span');
        pageInfo.textContent = `Page ${current_page} of ${totalPages}`;
        paginationContainer.appendChild(pageInfo);

        // Next Button
        const nextButton = document.createElement('button');
        nextButton.innerHTML = `Next <i class="fas fa-chevron-right"></i>`;
        nextButton.disabled = !next;
        nextButton.addEventListener('click', () => fetchAndRenderCourses(current_page + 1));
        paginationContainer.appendChild(nextButton);
    };

    /**
     * Fetches course data from the backend and renders the results.
     * @param {number} page - The page number to fetch.
     */
    const fetchAndRenderCourses = async (page = 1) => {
        if (isLoadingCourses || !coursesGrid || !uplasApi) return;
        isLoadingCourses = true;
        currentPage = page;

        coursesGrid.innerHTML = `<p class="loading-message">Loading courses...</p>`;
        if (noCoursesMessage) noCoursesMessage.style.display = 'none';

        let queryParams = `?page=${currentPage}`;
        if (currentCategory !== 'all') queryParams += `&category__slug=${encodeURIComponent(currentCategory)}`;
        if (currentDifficulty !== 'all') queryParams += `&difficulty=${encodeURIComponent(currentDifficulty)}`;
        if (currentSearchTerm) queryParams += `&search=${encodeURIComponent(currentSearchTerm)}`;

        try {
            const response = await uplasApi.fetchAuthenticated(`/courses/${queryParams}`, { isPublic: true });
            const data = await response.json();

            if (!response.ok) throw new Error(data.detail || 'Failed to fetch courses.');
            
            coursesGrid.innerHTML = '';
            if (data.results && data.results.length > 0) {
                data.results.forEach(course => coursesGrid.insertAdjacentHTML('beforeend', renderCourseCardHTML(course)));
            } else {
                if (noCoursesMessage) noCoursesMessage.style.display = 'block';
            }

            updatePaginationControls({
                count: data.count,
                next: data.next,
                previous: data.previous,
                page_size: 10, // Assuming a page size of 10, or get from API
                current_page: currentPage
            });

        } catch (error) {
            console.error("ucourse.js: Error fetching courses:", error);
            coursesGrid.innerHTML = `<p class="error-message">Could not load courses: ${escapeHTML(error.message)}</p>`;
        } finally {
            isLoadingCourses = false;
        }
    };

    // --- Event Handlers ---
    const handleFilterChange = () => {
        currentCategory = categoryFilter?.value || 'all';
        currentDifficulty = difficultyFilter?.value || 'all';
        fetchAndRenderCourses(1); // Reset to page 1 on filter change
    };

    const handleSearch = () => {
        currentSearchTerm = searchInput?.value.trim() || '';
        fetchAndRenderCourses(1); // Reset to page 1 on search
    };
    
    // --- Event Listeners ---
    if (searchInput) {
        let searchDebounce;
        searchInput.addEventListener('input', () => {
            clearTimeout(searchDebounce);
            searchDebounce = setTimeout(handleSearch, 500); // Debounce search
        });
    }
    if (clearSearchButton) {
        clearSearchButton.addEventListener('click', () => {
            if (searchInput) searchInput.value = '';
            handleSearch();
        });
    }
    if (categoryFilter) categoryFilter.addEventListener('change', handleFilterChange);
    if (difficultyFilter) difficultyFilter.addEventListener('change', handleFilterChange);

    // Initial Load
    fetchAndRenderCourses();
    console.log("ucourse.js: Initialized for dynamic course loading.");
});
