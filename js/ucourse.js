// js/ucourse.js (for course listing page: ucourse.html)
'use strict';

// This function will be called if the user is authenticated
function initializeCourseListPage() {
    // --- Element Selectors ---
    const searchInput = document.getElementById('search-input');
    const clearSearchButton = document.getElementById('clear-search-button');
    const categoryFilter = document.getElementById('category-filter');
    const difficultyFilter = document.getElementById('difficulty-filter');
    const coursesGrid = document.getElementById('courses-grid');
    const noCoursesMessage = document.getElementById('no-courses-message');
    const currentYearSpan = document.getElementById('current-year-footer');

    // --- State ---
    let currentSearchTerm = '';
    let currentCategory = 'all';
    let currentDifficulty = 'all';
    let allCourseCards = [];

    // --- Utility Functions ---
    const filterAndDisplayCourses = () => {
        if (!coursesGrid) return;
        if (allCourseCards.length === 0) {
            allCourseCards = Array.from(coursesGrid.querySelectorAll('.course-card'));
        }
        if (allCourseCards.length === 0 && !coursesGrid.querySelector('.course-card')) {
            if(noCoursesMessage) noCoursesMessage.style.display = 'block';
            return;
        }

        let coursesFound = false;
        const searchTerm = currentSearchTerm.toLowerCase().trim();

        allCourseCards.forEach(card => {
            const title = (card.querySelector('.course-card__title')?.textContent || '').toLowerCase();
            const description = (card.querySelector('.course-card__description')?.textContent || '').toLowerCase();
            const category = (card.dataset.category || 'all').toLowerCase();
            const difficulty = (card.dataset.difficulty || 'all').toLowerCase();

            const matchesSearch = searchTerm === '' || title.includes(searchTerm) || description.includes(searchTerm);
            const matchesCategory = currentCategory === 'all' || category === currentCategory;
            const matchesDifficulty = currentDifficulty === 'all' || difficulty === currentDifficulty;

            if (matchesSearch && matchesCategory && matchesDifficulty) {
                card.classList.remove('course-card--hidden');
                card.style.display = '';
                coursesFound = true;
            } else {
                card.classList.add('course-card--hidden');
                card.style.display = 'none';
            }
        });

        if (noCoursesMessage) {
            noCoursesMessage.style.display = coursesFound ? 'none' : 'block';
        }
        if (clearSearchButton) {
            clearSearchButton.style.display = searchTerm ? 'inline-flex' : 'none';
        }
    };

    // --- Event Handlers ---
    const handleSearchInput = () => {
        currentSearchTerm = searchInput?.value || '';
        filterAndDisplayCourses();
    };

    const handleFilterChange = () => {
        currentCategory = (categoryFilter?.value || 'all').toLowerCase();
        currentDifficulty = (difficultyFilter?.value || 'all').toLowerCase();
        filterAndDisplayCourses();
    };

    const handleClearSearch = () => {
        if (searchInput) {
            searchInput.value = '';
            currentSearchTerm = '';
            filterAndDisplayCourses();
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

    if (categoryFilter) {
        categoryFilter.addEventListener('change', handleFilterChange);
    }
    if (difficultyFilter) {
        difficultyFilter.addEventListener('change', handleFilterChange);
    }

    coursesGrid?.addEventListener('click', (e) => {
        const cardLink = e.target.closest('.course-card__link');
        if (cardLink) {
            const card = cardLink.closest('.course-card');
            if (card && card.classList.contains('course-card--locked')) {
                e.preventDefault();
                // TODO: Use a global notification/modal system from global.js if available
                const courseTitle = card.querySelector('.course-card__title')?.textContent || 'this course';
                // Assuming window.uplasTranslate is available from global.js
                const message = (typeof window.uplasTranslate === 'function' ?
                                 window.uplasTranslate('alert_premium_access_required_details_page', `Access to "{courseTitle}" requires a Premium subscription or individual purchase. Please visit our Pricing page or the course details page to unlock.`) :
                                 `Access to "${courseTitle}" requires a Premium subscription or individual purchase. Please visit our Pricing page or the course details page to unlock.`
                                ).replace("{courseTitle}", courseTitle);
                alert(message);
            }
        }
    });

    // --- Initializations ---
    if (coursesGrid) {
        allCourseCards = Array.from(coursesGrid.querySelectorAll('.course-card'));
    }
    filterAndDisplayCourses();

    if (currentYearSpan) {
        const yearText = currentYearSpan.textContent;
        if (yearText && yearText.includes("{currentYear}")) {
            currentYearSpan.textContent = yearText.replace("{currentYear}", new Date().getFullYear());
        } else if (yearText && !yearText.includes(new Date().getFullYear().toString())) {
             currentYearSpan.textContent = new Date().getFullYear();
        }
    }
    // Placeholder for fetching courses dynamically (if needed in the future)
    // async function fetchAndRenderCourses() { ... }
    // if (isUserAuthenticated) fetchAndRenderCourses(); // Example

    console.log("Uplas Course Listing (ucourse.js) initialized.");
}


document.addEventListener('DOMContentLoaded', () => {
    // --- Authentication Check ---
    // Ensure getAuthToken is available globally (from apiUtils.js, loaded before this script)
    if (typeof getAuthToken !== 'function') {
        console.error('getAuthToken function is not defined. Ensure apiUtils.js is loaded correctly.');
        // Fallback: You could hide content and show an error message on the page itself.
        const mainContent = document.querySelector('.main-content');
        if (mainContent) {
            mainContent.innerHTML = '<p style="text-align:center; padding: 20px; color: red;">Authentication utility is missing. Page cannot load correctly.</p>';
        }
        return;
    }

    const authToken = getAuthToken(); // Assumes this gets 'accessToken'

    if (!authToken) {
        console.log('User not authenticated. Redirecting to login.');
        // Redirect to login/signup page. Pass the current page as a return URL if desired.
        const currentPath = window.location.pathname + window.location.search + window.location.hash;
        window.location.href = `index.html#auth-section&returnUrl=${encodeURIComponent(currentPath)}`;
    } else {
        // User is authenticated, proceed to initialize the page
        console.log('User authenticated. Initializing course listing page.');
        initializeCourseListPage();
    }
});
