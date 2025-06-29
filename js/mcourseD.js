// js/mcourseD.js
'use strict';

document.addEventListener('DOMContentLoaded', () => {
    const uplasApi = window.uplasApi;
    const PAYSTACK_PUBLIC_KEY = 'pk_test_a75debe223b378631e5b583ddf431631562b781e';

    // --- Element Selectors ---
    const courseTitleEl = document.getElementById('course-title');
    const courseSubtitleEl = document.getElementById('course-subtitle');
    const courseMetaEl = document.getElementById('course-meta');
    const courseDescriptionEl = document.getElementById('course-description');
    const curriculumListEl = document.getElementById('curriculum-list');
    const enrollmentBoxEl = document.getElementById('enrollment-box');
    const loadingContainer = document.getElementById('course-content-loading');
    const contentContainer = document.getElementById('course-content-container');

    if (!uplasApi || !courseTitleEl) {
        console.error("mcourseD.js: Critical elements or uplasApi not found.");
        return;
    }

    const getCourseIdFromUrl = () => {
        const params = new URLSearchParams(window.location.search);
        return params.get('courseId');
    };

    const renderCurriculum = (modules) => {
        if (!curriculumListEl) return;
        curriculumListEl.innerHTML = '';
        if (!modules || modules.length === 0) {
            curriculumListEl.innerHTML = '<p>No curriculum available for this course.</p>';
            return;
        }

        modules.forEach(module => {
            const isLocked = !module.is_unlocked;
            let lessonsHtml = '<ul>';
            module.lessons.forEach(lesson => {
                lessonsHtml += `<li><i class="fas fa-play-circle"></i> <span>${lesson.title}</span></li>`;
            });
            lessonsHtml += '</ul>';

            const moduleHtml = `
                <div class="curriculum-item ${isLocked ? 'locked' : ''}">
                    <div class="curriculum-item-header">
                        <span>${module.title}</span>
                        <span class="curriculum-toggle-icon"><i class="fas ${isLocked ? 'fa-lock' : 'fa-plus'}"></i></span>
                    </div>
                    <div class="curriculum-item-content">
                        ${isLocked ? '<p>This module is locked. Enroll to get access.</p>' : lessonsHtml}
                    </div>
                </div>
            `;
            curriculumListEl.insertAdjacentHTML('beforeend', moduleHtml);
        });

        // Add event listeners for the new curriculum items
        document.querySelectorAll('.curriculum-item-header').forEach(header => {
            header.addEventListener('click', () => {
                const item = header.parentElement;
                if (item.classList.contains('locked')) return;
                item.classList.toggle('active');
            });
        });
    };

    const renderEnrollmentBox = (course) => {
        if (!enrollmentBoxEl) return;
        const isEnrolled = course.is_enrolled;
        let enrollButtonHtml = '';

        if (isEnrolled) {
            enrollButtonHtml = `<a href="mcourse_interactive.html?courseId=${course.slug}" class="button button--primary button--full-width">Go to Course</a>`;
        } else {
            enrollButtonHtml = `
                <button class="button button--primary button--full-width paystack-button"
                        data-price="${course.price}"
                        data-plan-name="${course.title}"
                        data-course-id="${course.slug}">
                    <span>Enroll Now for $${course.price}</span>
                </button>
            `;
        }

        enrollmentBoxEl.innerHTML = `
            <img src="${course.thumbnail_url || 'images/course_placeholder.png'}" alt="${course.title}" class="course-thumbnail">
            <h3>${isEnrolled ? 'You are Enrolled' : 'Enroll in this Course'}</h3>
            ${!isEnrolled ? `<div class="course-price">$${course.price}</div>` : ''}
            <p class="enroll-pitch">Get full lifetime access to all modules, future updates, and our exclusive community channel.</p>
            ${enrollButtonHtml}
        `;

        if (!isEnrolled) {
            attachPaystackListener(enrollmentBoxEl.querySelector('.paystack-button'));
        }
    };

    const fetchCourseDetails = async (courseId) => {
        try {
            const response = await uplasApi.fetchAuthenticated(`/courses/${courseId}/`, { isPublic: true });
            if (!response.ok) throw new Error('Course not found.');
            const course = await response.json();

            // --- Populate the page ---
            document.title = `${course.title} | Uplas`;
            courseTitleEl.textContent = course.title;
            courseSubtitleEl.textContent = course.short_description;
            courseMetaEl.innerHTML = `
                <span><i class="fas fa-user-shield"></i> Instructor: ${course.instructor_name}</span>
                <span><i class="fas fa-clock"></i> Duration: ${course.duration_hours} Hours</span>
                <span><i class="fas fa-layer-group"></i> Level: ${course.difficulty}</span>
            `;
            courseDescriptionEl.innerHTML = course.long_description; // Assuming this is safe HTML from backend
            renderCurriculum(course.modules);
            renderEnrollmentBox(course);

            // Hide loading and show content
            if(loadingContainer) loadingContainer.style.display = 'none';
            if(contentContainer) contentContainer.style.display = 'block';

        } catch (error) {
            console.error("Error fetching course details:", error);
            if(loadingContainer) loadingContainer.innerHTML = `<p class="error-message">Could not load course details. Please check the URL or try again.</p>`;
        }
    };

    const attachPaystackListener = (button) => {
        if (!button) return;
        button.addEventListener('click', (event) => {
            const price = event.target.dataset.price * 100;
            const courseId = event.target.dataset.courseId;
            const planName = event.target.dataset.planName;
            const currentUser = uplasApi.getUserData();

            if (!currentUser) {
                alert("Please log in to enroll.");
                // Optionally redirect to login
                // window.location.href = `index.html#auth-section&returnUrl=${window.location.href}`;
                return;
            }

            const handler = PaystackPop.setup({
                key: PAYSTACK_PUBLIC_KEY,
                email: currentUser.email,
                amount: price,
                ref: `uplas_${courseId}_${new Date().getTime()}`,
                callback: function(response) {
                    alert('Payment successful! Reference: ' + response.reference);
                    // TODO: Add backend verification call here
                    window.location.reload(); // Reload to show enrolled state
                },
                onClose: function() {
                    alert('Transaction was not completed.');
                },
            });
            handler.openIframe();
        });
    };

    // --- Initial Load ---
    const courseId = getCourseIdFromUrl();
    if (courseId) {
        fetchCourseDetails(courseId);
    } else {
        if(loadingContainer) loadingContainer.innerHTML = `<p class="error-message">No course specified. Please select a course from the course list.</p>`;
    }
});
