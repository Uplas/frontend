// js/ucourse.js (for course listing page: ucourse.html)
'use strict';

function initializeCourseListPage() {
    // --- Element Selectors ---
    const searchInput = document.getElementById('search-input');
    const clearSearchButton = document.getElementById('clear-search-button');
    const categoryFilter = document.getElementById('category-filter');
    const difficultyFilter = document.getElementById('difficulty-filter');
    const coursesGrid = document.getElementById('courses-grid');
    const noCoursesMessage = document.getElementById('no-courses-message');
    const paginationContainer = document.querySelector('.pagination-courses'); // Ensure this specific container exists

    // --- State ---
    let currentSearchTerm = '';
    let currentCategory = 'all'; // Stores category slug
    let currentDifficulty = 'all'; // Stores difficulty value (e.g., 'Beginner', 'Intermediate')
    let currentPage = 1;
    let isLoadingCourses = false;

    // --- Utility Functions ---
    const { uplasApi, uplasTranslate, uplasApplyTranslations, uplasGetCurrentLocale } = window;
    const escapeHTML = (str) => {
        if (typeof str !== 'string') return '';
        return str.replace(/[&<>'"]/g, tag => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[tag] || tag));
    };

    // --- API Call and Rendering ---
    async function fetchAndRenderCourses(page = 1, category = 'all', difficulty = 'all', searchTerm = '') {
        if (isLoadingCourses) return;
        isLoadingCourses = true;

        if (!coursesGrid || !uplasApi) {
            console.error("ucourse.js: Courses grid or uplasApi not available.");
            if (coursesGrid) coursesGrid.innerHTML = `<p class="error-message" data-translate-key="error_generic_loading">Error loading courses.</p>`;
            if (uplasApplyTranslations && coursesGrid) uplasApplyTranslations(coursesGrid);
            isLoadingCourses = false;
            return;
        }

        currentPage = page;
        currentCategory = category;
        currentDifficulty = difficulty;
        currentSearchTerm = searchTerm.trim();

        coursesGrid.innerHTML = `<p class="loading-message" data-translate-key="ucourses_loading">Loading courses...</p>`;
        if (noCoursesMessage) noCoursesMessage.style.display = 'none';
        if (paginationContainer) paginationContainer.innerHTML = '';
        if (uplasApplyTranslations) uplasApplyTranslations(coursesGrid);

        let queryParams = `?page=${currentPage}`;
        if (currentCategory !== 'all') queryParams += `&category__slug=${encodeURIComponent(currentCategory)}`;
        if (currentDifficulty !== 'all') queryParams += `&difficulty_level=${encodeURIComponent(currentDifficulty)}`; // Backend should expect 'difficulty_level'
        if (currentSearchTerm) queryParams += `&search=${encodeURIComponent(currentSearchTerm)}`;

        try {
            const response = await uplasApi.fetchAuthenticated(`/courses/courses/${queryParams}`, { isPublic: true });
            if (!response.ok) {
                const errorData = await response.json().catch(() => ({ detail: `Failed to fetch courses. Status: ${response.status}` }));
                throw new Error(errorData.detail);
            }
            const data = await response.json(); // Expects DRF paginated response

            coursesGrid.innerHTML = '';
            if (data.results && data.results.length > 0) {
                data.results.forEach(course => coursesGrid.insertAdjacentHTML('beforeend', renderCourseCardHTML(course)));
                if (noCoursesMessage) noCoursesMessage.style.display = 'none';
            } else {
                if (noCoursesMessage) {
                    noCoursesMessage.style.display = 'block';
                    noCoursesMessage.setAttribute('data-translate-key', 'ucourses_list_no_results');
                    noCoursesMessage.textContent = uplasTranslate ? uplasTranslate('ucourses_list_no_results') : "No courses found matching your criteria.";
                }
            }
            updatePaginationControlsCourses(data.count, data.next, data.previous, data.results?.length || 0);
            if (uplasApplyTranslations) uplasApplyTranslations(coursesGrid);

        } catch (error) {
            console.error("ucourse.js: Error fetching courses:", error);
            coursesGrid.innerHTML = `<p class="error-message" data-translate-key="ucourses_error_loading_param" data-translate-args='{"errorMessage": "${escapeHTML(error.message)}"}'>Could not load courses: ${escapeHTML(error.message)}</p>`;
            if (uplasApplyTranslations) uplasApplyTranslations(coursesGrid);
        } finally {
            if (clearSearchButton) clearSearchButton.style.display = currentSearchTerm ? 'inline-flex' : 'none';
            isLoadingCourses = false;
        }
    }

    function renderCourseCardHTML(course) {
        // Ensure course and nested properties exist to prevent errors
        // Expected course fields: slug, title, title_key (opt), short_description, description_key (opt),
        // featured_image_url, difficulty_level_display, category_details: {name, slug, name_key},
        // duration_display, is_locked_for_user (boolean), enrollment_status_for_user ('enrolled', 'not_enrolled', 'completed')
        const title = escapeHTML(course.title || 'Untitled Course');
        const titleKey = course.title_key || '';
        const description = escapeHTML(course.short_description || 'Learn more...');
        const descriptionKey = course.description_key || '';
        const imageUrl = course.featured_image_url || `https://placehold.co/600x400/00b4d8/FFFFFF?text=${encodeURIComponent(title.substring(0,12))}&font=poppins`;
        const courseUrl = `mcourseD.html?courseId=${course.slug || course.id}`; // Use slug or ID
        const difficulty = escapeHTML(course.difficulty_level_display || 'N/A');
        const categoryName = escapeHTML(course.category_details?.name || 'General');
        const categorySlug = course.category_details?.slug || 'general';
        const categoryNameKey = course.category_details?.name_key || '';
        const duration = escapeHTML(course.duration_display || 'N/A');
        const isLocked = course.is_locked_for_user === true; // Explicitly check for true

        let cardClass = 'course-card';
        if (isLocked) cardClass += ' course-card--locked';
        else cardClass += ' course-card--available';

        return `
            <article class="${cardClass}" data-category="${categorySlug.toLowerCase()}" data-difficulty="${difficulty.toLowerCase()}" data-course-id="${course.slug || course.id}">
                <a href="${courseUrl}" class="course-card__link" aria-label="${uplasTranslate ? uplasTranslate('sr_view_course_details', { fallback: 'View course details for {courseTitle}', variables: { courseTitle: title } }) : `View course details for ${title}`}">
                    <div class="course-card__image-container">
                        <img src="${imageUrl}" alt="${title}" class="course-card__image" loading="lazy">
                        <span class="course-card__difficulty-badge" data-translate-key="difficulty_${difficulty.toLowerCase()}_badge" data-translate-fallback="${difficulty}">${difficulty}</span>
                        ${isLocked ? `
                            <div class="course-card__locked-overlay">
                                <i class="fas fa-lock"></i>
                                <span data-translate-key="premium_access_badge">Premium Access</span>
                            </div>` : ''}
                    </div>
                    <div class="course-card__content">
                        <h3 class="course-card__title" ${titleKey ? `data-translate-key="${titleKey}"` : ''}>${title}</h3>
                        <p class="course-card__description" ${descriptionKey ? `data-translate-key="${descriptionKey}"` : ''}>${description}</p>
                        <div class="course-card__meta">
                            <span><i class="fas fa-clock" aria-hidden="true"></i> <span data-translate-key="duration_approx">Approx.</span> ${duration}</span>
                            <span><i class="fas fa-layer-group" aria-hidden="true"></i> <span ${categoryNameKey ? `data-translate-key="${categoryNameKey}"` : `data-translate-key="category_${categorySlug.toLowerCase()}"`}>${categoryName}</span></span>
                        </div>
                        <span class="course-card__cta ${isLocked ? 'course-card__cta--locked' : ''}" data-translate-key="view_details_cta">View Details <i class="fas fa-arrow-right"></i></span>
                    </div>
                </a>
            </article>
        `;
    }

    function updatePaginationControlsCourses(totalItems, nextUrl, prevUrl, itemsOnThisPage) {
        if (!paginationContainer) return;
        paginationContainer.innerHTML = ''; // Clear existing

        const itemsPerPage = 10; // Or get from API if variable
        const totalPages = Math.ceil(totalItems / itemsPerPage);

        if (totalPages <= 1) {
            paginationContainer.style.display = 'none';
            return;
        }
        paginationContainer.style.display = 'flex';

        const prevButton = document.createElement('button');
        prevButton.classList.add('pagination__link', 'pagination__link--prev');
        prevButton.innerHTML = `<i class="fas fa-chevron-left"></i> <span data-translate-key="pagination_prev">Prev</span>`;
        if (prevUrl) {
            prevButton.addEventListener('click', () => {
                const url = new URL(prevUrl);
                const prevPage = url.searchParams.get('page') || (currentPage > 1 ? currentPage - 1 : 1);
                fetchAndRenderCourses(parseInt(prevPage), currentCategory, currentDifficulty, currentSearchTerm);
            });
        } else {
            prevButton.classList.add('pagination__link--disabled');
            prevButton.disabled = true;
        }
        paginationContainer.appendChild(prevButton);

        const pageInfo = document.createElement('span');
        pageInfo.classList.add('pagination__info');
        pageInfo.textContent = `Page ${currentPage} of ${totalPages}`;
        paginationContainer.appendChild(pageInfo);

        const nextButton = document.createElement('button');
        nextButton.classList.add('pagination__link', 'pagination__link--next');
        nextButton.innerHTML = `<span data-translate-key="pagination_next">Next</span> <i class="fas fa-chevron-right"></i>`;
        if (nextUrl) {
            nextButton.addEventListener('click', () => {
                const url = new URL(nextUrl);
                const nextPage = url.searchParams.get('page') || (currentPage < totalPages ? currentPage + 1 : totalPages);
                fetchAndRenderCourses(parseInt(nextPage), currentCategory, currentDifficulty, currentSearchTerm);
            });
        } else {
            nextButton.classList.add('pagination__link--disabled');
            nextButton.disabled = true;
        }
        paginationContainer.appendChild(nextButton);

        if (uplasApplyTranslations) uplasApplyTranslations(paginationContainer);
    }

    // --- Event Handlers ---
    const handleSearchInput = () => {
        currentSearchTerm = searchInput?.value || '';
        fetchAndRenderCourses(1, currentCategory, currentDifficulty, currentSearchTerm);
    };

    const handleFilterChange = () => {
        currentCategory = (categoryFilter?.value || 'all').toLowerCase(); // Assuming filter value is slug
        currentDifficulty = (difficultyFilter?.value || 'all').toLowerCase();
        fetchAndRenderCourses(1, currentCategory, currentDifficulty, currentSearchTerm);
    };

    const handleClearSearch = () => {
        if (searchInput) {
            searchInput.value = '';
            currentSearchTerm = '';
            if (clearSearchButton) clearSearchButton.style.display = 'none';
            fetchAndRenderCourses(1, currentCategory, currentDifficulty, '');
            searchInput.focus();
        }
    };

    // --- Event Listeners ---
    if (searchInput) {
        let searchTimeout;
        searchInput.addEventListener('input', () => {
            clearTimeout(searchTimeout);
            searchTimeout = setTimeout(handleSearchInput, 500); // Debounce
            if (clearSearchButton) clearSearchButton.style.display = searchInput.value ? 'inline-flex' : 'none';
        });
        if (clearSearchButton && searchInput.value) clearSearchButton.style.display = 'inline-flex';
    }
    if (clearSearchButton) clearSearchButton.addEventListener('click', handleClearSearch);
    if (categoryFilter) categoryFilter.addEventListener('change', handleFilterChange);
    if (difficultyFilter) difficultyFilter.addEventListener('change', handleFilterChange);

    coursesGrid?.addEventListener('click', (e) => {
        const cardLink = e.target.closest('.course-card__link');
        if (cardLink) {
            const card = cardLink.closest('.course-card');
            if (card && card.classList.contains('course-card--locked')) {
                e.preventDefault();
                const courseTitle = card.querySelector('.course-card__title')?.textContent || 'this course';
                const messageKey = 'alert_premium_access_required_details_page';
                const fallbackMessage = `Access to "${courseTitle}" requires a Premium subscription or individual purchase. Please visit our Pricing page or the course details page to unlock.`;
                const message = uplasTranslate ? uplasTranslate(messageKey, { fallback: fallbackMessage, variables: { courseTitle } }) : fallbackMessage;

                // Use a more prominent way to display this, e.g., a small modal or a styled alert within the page if uplasApi.displayFormStatus isn't ideal here
                // For now, using alert as a placeholder for critical user info.
                alert(message);
                // If you have a global notification system via uplasApi:
                // if (uplasApi && uplasApi.displayGlobalNotification) {
                //    uplasApi.displayGlobalNotification(message, 'warning');
                // } else { alert(message); }
            }
        }
    });

    // --- Initializations ---
    const urlParams = new URLSearchParams(window.location.search);
    currentCategory = urlParams.get('category') || 'all';
    currentDifficulty = urlParams.get('difficulty') || 'all';
    currentSearchTerm = urlParams.get('search') || '';

    if (categoryFilter && currentCategory !== 'all') categoryFilter.value = currentCategory;
    if (difficultyFilter && currentDifficulty !== 'all') difficultyFilter.value = currentDifficulty;
    if (searchInput && currentSearchTerm) searchInput.value = currentSearchTerm;


    fetchAndRenderCourses(currentPage, currentCategory, currentDifficulty, currentSearchTerm);

    console.log("ucourse.js: Uplas Course Listing initialized and API-driven.");
}


document.addEventListener('DOMContentLoaded', () => {
    if (typeof window.uplasApi === 'undefined' || typeof window.uplasApi.getAccessToken !== 'function') {
        console.error('ucourse.js: uplasApi or its functions are not defined. Ensure apiUtils.js is loaded correctly.');
        const mainContent = document.querySelector('.main-content');
        if (mainContent) {
            mainContent.innerHTML = '<p style="text-align:center; padding: 20px; color: red;" data-translate-key="error_auth_utility_missing">Core utility missing. Page cannot load correctly.</p>';
            if (window.uplasApplyTranslations) window.uplasApplyTranslations(mainContent);
        }
        return;
    }

    const authToken = window.uplasApi.getAccessToken();
    if (!authToken) {
        console.log('ucourse.js: User not authenticated. Redirecting to login.');
        const currentPath = window.location.pathname + window.location.search + window.location.hash;
        window.uplasApi.redirectToLogin(`Please log in to view courses. Return to: ${encodeURIComponent(currentPath)}`);
    } else {
        console.log('ucourse.js: User authenticated. Initializing course listing page.');
        initializeCourseListPage();
    }
});
