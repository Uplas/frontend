```javascript
// js/ucourse.js (for course listing page: ucourses_list.html)
'use strict';

document.addEventListener('DOMContentLoaded', () => {
    // --- Element Selectors ---
    // Note: Theme toggle, mobile nav, language/currency are handled by js/global.js
    const searchInput = document.getElementById('search-input');
    const clearSearchButton = document.getElementById('clear-search-button');
    const categoryFilter = document.getElementById('category-filter');
    const difficultyFilter = document.getElementById('difficulty-filter');
    const coursesGrid = document.getElementById('courses-grid');
    const noCoursesMessage = document.getElementById('no-courses-message');
    const currentYearSpan = document.getElementById('current-year-footer'); // Ensure this ID is in your footer

    // --- State ---
    let currentSearchTerm = '';
    let currentCategory = 'all';
    let currentDifficulty = 'all';
    let allCourseCards = []; // To store a reference to all card elements

    // --- Utility Functions ---
    const filterAndDisplayCourses = () => {
        if (!coursesGrid) return;
        if (allCourseCards.length === 0) { // Populate on first run or if grid was cleared
            allCourseCards = Array.from(coursesGrid.querySelectorAll('.course-card'));
        }
        if (allCourseCards.length === 0 && !coursesGrid.querySelector('.course-card')) {
             // If no cards were initially in HTML and none loaded yet.
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
                card.style.display = ''; // Or 'flex' if your card uses flex display
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
        // Optional: Trigger search on Enter key if a dedicated search button is used
        // searchInput.addEventListener('keypress', (e) => {
        //     if (e.key === 'Enter') {
        //         handleSearchInput(); // Or click a search button if present
        //     }
        // });
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

    // Handle clicks on locked course cards
    coursesGrid?.addEventListener('click', (e) => {
        const cardLink = e.target.closest('.course-card__link');
        if (cardLink) {
            const card = cardLink.closest('.course-card');
            if (card && card.classList.contains('course-card--locked')) {
                e.preventDefault(); // Prevent navigation for locked cards
                // TODO: Use a more integrated notification system instead of alert
                // For now, alert is a placeholder. Could open a small modal or redirect to pricing.
                const courseTitle = card.querySelector('.course-card__title')?.textContent || 'this course';
                alert(
                    `Access to "${courseTitle}" requires a Premium subscription or individual purchase. Please visit our Pricing page or the course details page to unlock.`
                );
                // Example: window.location.href = `upricing.html?highlightCourse=${card.dataset.courseId}`;
            }
        }
    });

    // --- Initializations ---
    // Store initial cards if they are hardcoded or pre-rendered
    if (coursesGrid) {
        allCourseCards = Array.from(coursesGrid.querySelectorAll('.course-card'));
    }
    filterAndDisplayCourses(); // Initial display based on default filters

    if (currentYearSpan) {
        // This might be handled by global.js if the ID is consistent
        // For dynamic copyright year:
        const yearText = currentYearSpan.textContent; // e.g., "© {currentYear} Uplas..."
        if (yearText && yearText.includes("{currentYear}")) {
            currentYearSpan.textContent = yearText.replace("{currentYear}", new Date().getFullYear());
        } else if (!yearText.includes(new Date().getFullYear())) { // Fallback if no placeholder
             currentYearSpan.textContent = new Date().getFullYear();
        }
    }

    // --- Placeholder for fetching courses dynamically ---
    // async function fetchAndRenderCourses() {
    //     if (!coursesGrid) return;
    //     coursesGrid.innerHTML = '<p class="loading-message">Loading courses...</p>'; // Show loading state
    //     try {
    //         // const response = await fetch('/api/courses'); // Your backend endpoint
    //         // if (!response.ok) throw new Error('Failed to fetch courses');
    //         // const courses = await response.json();
    //
    //         // Simulate API response
    //         await new Promise(resolve => setTimeout(resolve, 1000));
    //         const courses = [
    //             // ... (array of course objects similar to the HTML structure) ...
    //             // Example:
    //             // {
    //             //     id: 'workplace-ai-essentials', title: 'AI in Workplace: Essentials',
    //             //     description: 'Boost productivity...', category: 'Workplace', difficulty: 'Beginner',
    //             //     imageUrl: 'https://placehold.co/600x400/00b4d8/FFFFFF?text=Workplace+AI&font=poppins',
    //             //     duration: 'Approx. 4 Hours', isLocked: false,
    //             //     translateKeys: { title: 'course_title_workplace_ai', description: 'course_desc_workplace_ai', ... }
    //             // }
    //         ];
    //
    //         coursesGrid.innerHTML = ''; // Clear loading message
    //         if (courses.length === 0) {
    //             if(noCoursesMessage) noCoursesMessage.style.display = 'block';
    //             return;
    //         }
    //
    //         courses.forEach(course => {
    //             const cardHTML = `
    //                 <article class="course-card ${course.isLocked ? 'course-card--locked' : 'course-card--available'}" data-category="${course.category}" data-difficulty="${course.difficulty}" data-course-id="${course.id}">
    //                     <a href="mcourseD.html?courseId=${course.id}" class="course-card__link" aria-label="View course details for ${course.title}">
    //                         <div class="course-card__image-container">
    //                             <img src="${course.imageUrl}" alt="${course.title}" class="course-card__image">
    //                             <span class="course-card__difficulty-badge" data-translate-key="difficulty_${course.difficulty.toLowerCase()}_badge">${course.difficulty}</span>
    //                             ${course.isLocked ? `<div class="course-card__locked-overlay"><i class="fas fa-lock"></i><span data-translate-key="premium_access_badge">Premium Access</span></div>` : ''}
    //                         </div>
    //                         <div class="course-card__content">
    //                             <h3 class="course-card__title" data-translate-key="${course.translateKeys?.title || ''}">${course.title}</h3>
    //                             <p class="course-card__description" data-translate-key="${course.translateKeys?.description || ''}">${course.description}</p>
    //                             <div class="course-card__meta">
    //                                 <span><i class="fas fa-clock"></i> ${course.duration}</span>
    //                                 <span><i class="fas fa-layer-group"></i> ${course.category}</span>
    //                             </div>
    //                             <span class="course-card__cta ${course.isLocked ? 'course-card__cta--locked' : ''}" data-translate-key="view_details_cta">View Details <i class="fas fa-arrow-right"></i></span>
    //                         </div>
    //                     </a>
    //                 </article>
    //             `;
    //             coursesGrid.insertAdjacentHTML('beforeend', cardHTML);
    //         });
    //         allCourseCards = Array.from(coursesGrid.querySelectorAll('.course-card')); // Update reference
    //         filterAndDisplayCourses(); // Apply initial filters
    //         // global.js would handle translation of new data-translate-key elements if called
    //         if (window.applyLanguagePreference && window.currentTranslations) { // Check if global i18n is ready
    //             window.translatePage(); // Re-translate page to catch new elements
    //         }
    //     } catch (error) {
    //         console.error("Error fetching courses:", error);
    //         coursesGrid.innerHTML = '<p class="error-message">Could not load courses. Please try again later.</p>';
    //     }
    // }
    // fetchAndRenderCourses(); // Call this if courses are to be loaded dynamically

    console.log("Uplas Course Listing (ucourse.js) loaded.");
});


