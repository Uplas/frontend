// js/mcourseD.js
/* ==========================================================================
   Uplas Course Detail Page Specific JavaScript (mcourseD.js)
   - Handles tabs, curriculum accordion, payment modal (Card via Stripe.js), masterclass display,
     and dynamic loading of course-specific details.
   ========================================================================== */
'use strict';

function initializeCourseDetailPage() {
    // --- Element Selectors ---
    const courseHeroTitle = document.getElementById('course-hero-main-title');
    const courseHeroSubtitle = document.querySelector('.course-hero__subtitle');
    const courseHeroMetaInstructors = document.querySelector('[data-translate-key="mcourseD_hero_meta_instructors_adv_ai"]'); // More specific selector needed if dynamic
    const courseHeroMetaDuration = document.querySelector('[data-translate-key="mcourseD_hero_meta_duration_adv_ai"]');
    const courseHeroMetaLevel = document.querySelector('[data-translate-key="mcourseD_hero_meta_level_adv_ai"]');
    const courseHeroMetaOutcome = document.querySelector('[data-translate-key="mcourseD_hero_meta_outcome_adv_ai"]');
    const courseHeroImage = document.querySelector('.course-hero__image');
    const breadcrumbCurrentCourse = document.querySelector('.course-hero__breadcrumb span[aria-current="page"]');

    const overviewWhatYouMasterList = document.querySelector('#tab-panel-overview .learn-list');
    const overviewDeepDiveP1 = document.querySelector('[data-translate-key="mcourseD_overview_deep_dive_p1_adv_ai"]');
    const overviewDeepDiveP2 = document.querySelector('[data-translate-key="mcourseD_overview_deep_dive_p2_adv_ai"]');
    // Add selectors for prerequisites and "who is this for" if they become dynamic

    const courseTabsNav = document.querySelector('.course-tabs__nav');
    const courseTabButtons = document.querySelectorAll('.course-tabs__button');
    const courseTabPanels = document.querySelectorAll('.course-tabs__panel');
    const moduleAccordion = document.getElementById('module-accordion');

    const paymentModal = document.getElementById('payment-modal');
    const closeModalButton = document.getElementById('payment-modal-close-btn');
    const summaryPlanNameEl = document.getElementById('summary-plan-name-span');
    const summaryPlanPriceEl = document.getElementById('summary-plan-price-span');
    const summaryBillingCycleDiv = document.getElementById('summary-billing-cycle-div');
    const summaryBillingCycleEl = document.getElementById('summary-billing-cycle-span');
    const paymentFormGlobalStatus = document.getElementById('payment-form-global-status');
    const paymentSubmitButton = document.getElementById('payment-submit-button');

    const unifiedCardPaymentForm = document.getElementById('unified-card-payment-form');
    const paymentCardholderNameInput = document.getElementById('payment-cardholder-name');
    const paymentEmailInput = document.getElementById('payment-email');

    const stripeCardElementContainer = document.getElementById('stripe-card-element');
    const stripeCardErrors = document.getElementById('stripe-card-errors');

    const allPlanButtons = [
        document.getElementById('enroll-now-main-cta'),
        document.getElementById('sidebar-enroll-course-btn'),
        ...document.querySelectorAll('.pricing-options-sidebar .select-plan-btn'),
        ...document.querySelectorAll('.buy-module-btn.select-plan-btn') // Will be populated dynamically
    ].filter(btn => btn);


    const masterclassGridContainer = document.getElementById('masterclass-grid-container');
    const masterclassItemsContainer = document.createElement('div'); // Create dynamically
    if (masterclassGridContainer) {
        masterclassItemsContainer.className = 'masterclass-items'; // For styling potential grid layout
        masterclassGridContainer.appendChild(masterclassItemsContainer);
    }
    const masterclassNoAccessMessage = masterclassGridContainer?.querySelector('.masterclass-no-access-message');
    const masterclassUpgradeCTAContainer = document.getElementById('masterclass-upgrade-cta-container');


    // --- State Variables ---
    let isModalOpen = false;
    let currentSelectedPlan = null;
    let stripe = null;
    let cardElement = null;
    let currentCourseData = null; // To store fetched course details
    const urlParams = new URLSearchParams(window.location.search);
    const currentCourseIdFromURL = urlParams.get('courseId'); // Use this as the primary identifier

    // --- Initialize Stripe ---
    function initializeStripe() {
        if (typeof Stripe === 'undefined') {
            console.error('mcourseD.js: Stripe.js has not been loaded.');
            if (paymentSubmitButton) paymentSubmitButton.disabled = true;
            allPlanButtons.forEach(btn => btn.disabled = true);
            if (paymentFormGlobalStatus && window.uplasApi && window.uplasApi.displayFormStatus) {
                window.uplasApi.displayFormStatus(paymentFormGlobalStatus, 'Payment system unavailable.', true, 'err_payment_system_unavailable_stripe');
            }
            return false;
        }
        // **CRITICAL**: Replace with your actual Stripe publishable key.
        // Consider using window.UPLAS_CONFIG.STRIPE_PUBLIC_KEY from global config.
        const stripePublicKey = (typeof window.UPLAS_CONFIG !== 'undefined' && window.UPLAS_CONFIG.STRIPE_PUBLIC_KEY)
            ? window.UPLAS_CONFIG.STRIPE_PUBLIC_KEY
            : 'pk_test_YOUR_STRIPE_PUBLISHABLE_KEY'; // FALLBACK - REPLACE THIS!

        if (stripePublicKey === 'pk_test_YOUR_STRIPE_PUBLISHABLE_KEY') {
            console.warn("mcourseD.js: Using placeholder Stripe public key. Payment will not work. Please replace with your actual key.");
            if (paymentFormGlobalStatus && window.uplasApi && window.uplasApi.displayFormStatus) {
                window.uplasApi.displayFormStatus(paymentFormGlobalStatus, 'Payment system configuration error.', true, 'err_payment_config_missing');
            }
            // Disable payment buttons if using placeholder key
            if (paymentSubmitButton) paymentSubmitButton.disabled = true;
            allPlanButtons.forEach(btn => btn.disabled = true);
            return false; // Prevent further Stripe setup if key is placeholder
        }

        stripe = Stripe(stripePublicKey);
        const elements = stripe.elements();
        const cardStyle = { /* ... (style object from your file) ... */ };
        if (stripeCardElementContainer) {
            cardElement = elements.create('card', { style: cardStyle, hidePostalCode: true });
            cardElement.mount(stripeCardElementContainer);
            cardElement.on('change', function(event) {
                if (stripeCardErrors) {
                    stripeCardErrors.textContent = event.error ? event.error.message : '';
                }
            });
        } else {
            console.error("mcourseD.js: Stripe card element container '#stripe-card-element' not found.");
            if (paymentFormGlobalStatus && window.uplasApi && window.uplasApi.displayFormStatus) {
                window.uplasApi.displayFormStatus(paymentFormGlobalStatus, 'Payment UI is missing.', true, 'err_payment_ui_stripe_missing');
            }
            return false;
        }
        return true;
    }
    const stripeInitialized = initializeStripe();

    // --- Utility Functions ---
    const { displayFormStatus, validateInput, focusFirstElement } = window.uplasApi || {}; // Use from uplasApi
    const escapeHTML = (str) => { /* ... (implementation from blog-post-detail.js or global) ... */
        if (typeof str !== 'string') return '';
        return str.replace(/[&<>'"]/g, tag => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[tag] || tag));
    };


    // --- Dynamic Course Content Population ---
    async function fetchAndPopulateCourseDetails(courseId) {
        if (!window.uplasApi || !courseId) {
            console.error("mcourseD.js: uplasApi not available or no courseId provided.");
            // Display a general error on the page
            const mainContent = document.getElementById('main-content');
            if(mainContent) mainContent.innerHTML = "<p class='error-message' data-translate-key='mcourseD_err_course_load_failed'>Failed to load course details.</p>";
            if(window.uplasApplyTranslations && mainContent) window.uplasApplyTranslations(mainContent);
            return;
        }

        console.log(`mcourseD.js: Fetching details for course: ${courseId}`);
        // Show loading state - TBD, maybe a general overlay or skeleton UI

        try {
            // Assumes your backend endpoint for a single course is /api/courses/courses/{course_slug_or_id}/
            const response = await window.uplasApi.fetchAuthenticated(`/courses/courses/${courseId}/`, { isPublic: true });
            if (!response.ok) {
                const errData = await response.json().catch(() => ({detail: "Unknown error fetching course"}));
                throw new Error(errData.detail);
            }
            currentCourseData = await response.json();
            console.log("mcourseD.js: Course data received:", currentCourseData);

            // Populate Hero Section
            if (courseHeroTitle) courseHeroTitle.textContent = currentCourseData.title || "Course Title";
            if (breadcrumbCurrentCourse) breadcrumbCurrentCourse.textContent = currentCourseData.title || "Course";
            document.title = `${currentCourseData.title || "Course"} | Uplas`;
            if (courseHeroSubtitle) courseHeroSubtitle.textContent = currentCourseData.short_description || "Elevate your expertise.";
            if (courseHeroImage && currentCourseData.hero_image_url) courseHeroImage.src = currentCourseData.hero_image_url;

            if (courseHeroMetaInstructors && currentCourseData.instructors_display) courseHeroMetaInstructors.innerHTML = `<i class="fas fa-chalkboard-teacher course-hero__meta-icon" aria-hidden="true"></i> Instructors: ${currentCourseData.instructors_display}`;
            if (courseHeroMetaDuration && currentCourseData.duration_display) courseHeroMetaDuration.innerHTML = `<i class="fas fa-hourglass-half course-hero__meta-icon" aria-hidden="true"></i> Duration: ${currentCourseData.duration_display}`;
            if (courseHeroMetaLevel && currentCourseData.difficulty_level_display) courseHeroMetaLevel.innerHTML = `<i class="fas fa-layer-group course-hero__meta-icon" aria-hidden="true"></i> Level: ${currentCourseData.difficulty_level_display}`;
            if (courseHeroMetaOutcome && currentCourseData.outcome_display) courseHeroMetaOutcome.innerHTML = `<i class="fas fa-award course-hero__meta-icon" aria-hidden="true"></i> Outcome: ${currentCourseData.outcome_display}`;

            // Populate Overview Tab
            if (overviewWhatYouMasterList && currentCourseData.learning_outcomes && currentCourseData.learning_outcomes.length > 0) {
                overviewWhatYouMasterList.innerHTML = currentCourseData.learning_outcomes.map(item => `<li><i class="fas fa-brain learn-list__icon" aria-hidden="true"></i> ${escapeHTML(item)}</li>`).join('');
            }
            if (overviewDeepDiveP1 && currentCourseData.description_html) overviewDeepDiveP1.innerHTML = currentCourseData.description_html; // Assumes description is HTML
            if (overviewDeepDiveP2 && currentCourseData.extended_description_html) overviewDeepDiveP2.innerHTML = currentCourseData.extended_description_html;
            // TODO: Populate "Is this for you?" and "Prerequisites" if these fields exist in currentCourseData

            // Populate Curriculum Tab
            if (moduleAccordion && currentCourseData.modules && currentCourseData.modules.length > 0) {
                moduleAccordion.innerHTML = ''; // Clear placeholder
                currentCourseData.modules.forEach(module => {
                    const moduleEl = document.createElement('div');
                    moduleEl.className = `module ${module.is_free_preview ? 'module--accessible' : ''}`;
                    moduleEl.id = `module-${module.id}`;
                    let lessonsHTML = '';
                    if (module.lessons && module.lessons.length > 0) {
                        lessonsHTML = module.lessons.map(lesson => `
                            <li class="lesson ${lesson.is_unlocked ? 'lesson--unlocked' : 'lesson--locked'}" data-lesson-id="${lesson.id}">
                                <i class="fas ${lesson.type === 'video' ? 'fa-play-circle' : 'fa-book-reader'} lesson__icon" aria-hidden="true"></i>
                                <span class="lesson__title">${escapeHTML(lesson.title)} (${escapeHTML(lesson.duration_display || 'N/A')})</span>
                                <span class="lesson__type-badge">${escapeHTML(lesson.type_display || 'Lesson')}</span>
                                <span class="lesson__status">
                                    <i class="fas ${lesson.is_unlocked ? 'fa-unlock' : 'fa-lock'}" aria-hidden="true"></i>
                                    <span data-translate-key="status_${lesson.is_unlocked ? 'unlocked' : 'locked'}">${lesson.is_unlocked ? 'Unlocked' : 'Locked'}</span>
                                </span>
                                ${lesson.is_unlocked
                                    ? `<a href="mcourse.html?courseId=${currentCourseIdFromURL}&lessonId=${lesson.id}" class="button button--primary button--extra-small lesson__action-button" data-translate-key="button_start_lesson">Start Lesson</a>`
                                    : (module.is_purchasable && module.price_usd // Check if module is purchasable
                                        ? `<button class="button button--secondary button--extra-small lesson__action-button buy-module-btn select-plan-btn"
                                             data-module-id="${module.id}"
                                             data-price-usd="${module.price_usd}"
                                             data-name="Module: ${escapeHTML(module.title)}"
                                             data-billing-cycle="One-time"
                                             data-translate-key="mcourseD_unlock_module_btn_dynamic"
                                             data-translate-args='{"price": "${window.formatPriceForDisplay ? window.formatPriceForDisplay(parseFloat(module.price_usd), window.currentGlobalCurrency || 'USD') : '$'+parseFloat(module.price_usd).toFixed(2)}"}'>
                                             Unlock This Module (${window.formatPriceForDisplay ? window.formatPriceForDisplay(parseFloat(module.price_usd), window.currentGlobalCurrency || 'USD') : '$'+parseFloat(module.price_usd).toFixed(2)})
                                           </button>`
                                        : '')
                                }
                            </li>
                        `).join('');
                    }

                    moduleEl.innerHTML = `
                        <h3 class="module__header">
                            <button class="module__toggle-button" aria-expanded="${module.is_free_preview ? 'true' : 'false'}" aria-controls="module-${module.id}-content">
                                <span>${escapeHTML(module.title)}</span>
                                <span class="module__meta">
                                    <span class="module__duration">${module.duration_display || 'N/A'}</span> &bull;
                                    <span class="module__lesson-count">${module.lessons_count || 0} Lessons</span>
                                    ${module.is_free_preview ? '<span class="badge badge--free" data-translate-key="badge_free_preview">Free Preview</span>' : ''}
                                </span>
                                <span class="module__toggle-icon"><i class="fas ${module.is_free_preview ? 'fa-chevron-up' : 'fa-chevron-down'}" aria-hidden="true"></i></span>
                            </button>
                        </h3>
                        <div class="module__content" id="module-${module.id}-content" role="region" ${module.is_free_preview ? '' : 'hidden'}>
                            <ul>${lessonsHTML}</ul>
                        </div>
                    `;
                    moduleAccordion.appendChild(moduleEl);
                });
                 // Re-attach listeners for newly added buy-module buttons
                moduleAccordion.querySelectorAll('.buy-module-btn.select-plan-btn').forEach(button => {
                    button.addEventListener('click', (event) => {
                        event.preventDefault();
                        const planData = { /* ... construct planData as in allPlanButtons listener ... */
                            id: button.dataset.moduleId,
                            name: button.dataset.name || `Module: ${button.closest('.module')?.querySelector('.module__toggle-button span:first-child')?.textContent.trim() || 'Selected Module'}`,
                            priceUsd: button.dataset.priceUsd,
                            billingCycle: button.dataset.billingCycle || 'One-time',
                            type: 'module'
                        };
                        if (!planData.priceUsd || isNaN(parseFloat(planData.priceUsd))) { /* ... alert ... */ return; }
                        openPaymentModal(planData);
                    });
                });
            }

            // TODO: Populate Instructors, Reviews, FAQ tabs if data is available in currentCourseData
            // or fetch them separately if needed.

            // Update main "Enroll" CTA if course has a specific price
            const mainEnrollBtn = document.getElementById('enroll-now-main-cta');
            const sidebarEnrollBtn = document.getElementById('sidebar-enroll-course-btn');
            const sidebarPriceDisplay = document.getElementById('sidebar-current-price-display');

            if (currentCourseData.price_usd && (mainEnrollBtn || sidebarEnrollBtn)) {
                const coursePrice = parseFloat(currentCourseData.price_usd);
                const formattedCoursePrice = window.formatPriceForDisplay ? window.formatPriceForDisplay(coursePrice, window.currentGlobalCurrency || 'USD') : `$${coursePrice.toFixed(2)}`;

                if (mainEnrollBtn) {
                    mainEnrollBtn.dataset.priceUsd = coursePrice.toString();
                    mainEnrollBtn.dataset.planId = `course_${currentCourseData.slug || currentCourseData.id}`; // Use slug or ID
                    mainEnrollBtn.dataset.name = currentCourseData.title;
                    mainEnrollBtn.dataset.billingCycle = "One-time"; // Assuming courses are one-time purchase
                }
                if (sidebarEnrollBtn) {
                    sidebarEnrollBtn.dataset.priceUsd = coursePrice.toString();
                    sidebarEnrollBtn.dataset.planId = `course_${currentCourseData.slug || currentCourseData.id}`;
                    sidebarEnrollBtn.dataset.name = currentCourseData.title;
                    sidebarEnrollBtn.dataset.billingCycle = "One-time";
                }
                if (sidebarPriceDisplay) {
                    sidebarPriceDisplay.textContent = formattedCoursePrice;
                    sidebarPriceDisplay.dataset.priceUsd = coursePrice.toString();
                }
            }


            if (window.uplasApplyTranslations) window.uplasApplyTranslations(document.body); // Re-translate whole page after dynamic content

        } catch (error) {
            console.error("mcourseD.js: Error populating course details:", error);
             if (courseHeroTitle) courseHeroTitle.textContent = "Error Loading Course";
             if (courseHeroSubtitle) courseHeroSubtitle.textContent = `Could not load course details: ${error.message}`;
        }
    }


    // --- Course Content Tabs & Accordion ---
    if (courseTabsNav && courseTabButtons.length > 0 && courseTabPanels.length > 0) { /* ... (same as previous) ... */ }
    if (moduleAccordion) { /* ... (same as previous, ensure event listeners are re-attached if curriculum is dynamic) ... */ }


    // --- Payment Modal Logic ---
    function updatePaymentModalSummary() { /* ... (same as previous) ... */ }
    function openPaymentModal(planData) { /* ... (same as previous, with uplasApi checks) ... */
        if (!paymentModal) {
            alert("Payment modal element not found."); return;
        }
        if (!stripeInitialized) {
            if (window.uplasApi && window.uplasApi.displayFormStatus) {
                window.uplasApi.displayFormStatus(paymentFormGlobalStatus || document.body, 'Payment system is currently unavailable. Please try again later.', true, 'err_payment_system_unavailable_stripe');
            } else {
                alert('Payment system is currently unavailable. Please try again later.');
            }
            return;
        }
        currentSelectedPlan = planData;
        updatePaymentModalSummary();

        if (paymentSubmitButton) { /* ... */ }
        if (paymentFormGlobalStatus && window.uplasApi && window.uplasApi.clearFormStatus) window.uplasApi.clearFormStatus(paymentFormGlobalStatus);
        else if (paymentFormGlobalStatus) paymentFormGlobalStatus.textContent = '';


        unifiedCardPaymentForm?.reset();
        cardElement?.clear();
        unifiedCardPaymentForm?.querySelectorAll('.invalid').forEach(el => el.classList.remove('invalid'));

        if (typeof window.uplasApi !== 'undefined' && window.uplasApi.getUserData && paymentEmailInput) {
            const userData = window.uplasApi.getUserData();
            if (userData && userData.email) paymentEmailInput.value = userData.email;
        }

        paymentModal.hidden = false;
        document.body.style.overflow = 'hidden';
        setTimeout(() => {
            paymentModal.classList.add('active');
            if(paymentCardholderNameInput) paymentCardholderNameInput.focus();
            else if (focusFirstElement) focusFirstElement(paymentModal);
        }, 10);
        isModalOpen = true;
    }
    function closePaymentModal() { /* ... (same as previous) ... */ }

    // --- Event Listeners for Payment ---
    allPlanButtons.forEach(button => { /* ... (same as previous) ... */ });
    if (closeModalButton) closeModalButton.addEventListener('click', closePaymentModal);
    document.addEventListener('keydown', (event) => { if (event.key === 'Escape' && isModalOpen) closePaymentModal(); });
    paymentModal?.addEventListener('click', (event) => { if (event.target === paymentModal) closePaymentModal(); });

    if (unifiedCardPaymentForm && stripeInitialized) {
        unifiedCardPaymentForm.addEventListener('submit', async (e) => { /* ... (same as previous, using uplasApi) ... */
            e.preventDefault();
            if (!currentSelectedPlan || !cardElement || !window.uplasApi || !window.uplasApi.fetchAuthenticated) {
                if(window.uplasApi && window.uplasApi.displayFormStatus) window.uplasApi.displayFormStatus(paymentFormGlobalStatus, 'Payment system error. Please try again or contact support.', true, 'err_payment_system_or_plan');
                return;
            }
            let isFormValid = true;
            if (paymentCardholderNameInput && validateInput && !validateInput(paymentCardholderNameInput)) isFormValid = false;
            if (paymentEmailInput && validateInput && !validateInput(paymentEmailInput)) isFormValid = false;

            if (!isFormValid) {
                if(window.uplasApi && window.uplasApi.displayFormStatus) window.uplasApi.displayFormStatus(paymentFormGlobalStatus, 'Please correct your name and email.', true, 'err_correct_form_errors_basic');
                return;
            }

            if(paymentSubmitButton) paymentSubmitButton.disabled = true;
            if(window.uplasApi && window.uplasApi.displayFormStatus) window.uplasApi.displayFormStatus(paymentFormGlobalStatus, 'Processing payment...', false, 'payment_status_processing'); // false for isError (info)

            const cardholderName = paymentCardholderNameInput.value;
            const email = paymentEmailInput.value;

            const { paymentMethod, error: pmError } = await stripe.createPaymentMethod({
                type: 'card', card: cardElement, billing_details: { name: cardholderName, email: email },
            });

            if (pmError) {
                if(window.uplasApi && window.uplasApi.displayFormStatus) window.uplasApi.displayFormStatus(paymentFormGlobalStatus, pmError.message, true);
                if (stripeCardErrors) stripeCardErrors.textContent = pmError.message;
                if(paymentSubmitButton) paymentSubmitButton.disabled = false;
                return;
            }
            if (stripeCardErrors) stripeCardErrors.textContent = '';

            const paymentDataForBackend = { /* ... (same as previous, ensure currentCourseData.slug/id is used for plan_id if type is 'course') ... */
                 payment_method_id: paymentMethod.id,
                 plan_id: currentSelectedPlan.type === 'course' && currentCourseData ? (currentCourseData.slug || currentCourseData.id) : currentSelectedPlan.id,
                 item_type: currentSelectedPlan.type,
                 amount_usd: parseFloat(currentSelectedPlan.priceUsd),
                 currency: 'usd',
                 billing_cycle: currentSelectedPlan.billingCycle,
                 cardholder_name: cardholderName,
                 email: email
            };
            // If it's a course purchase, explicitly send the course ID/slug
            if (currentSelectedPlan.type === 'course' && currentCourseData) {
                paymentDataForBackend.course_identifier = currentCourseData.slug || currentCourseData.id;
            }


            try {
                console.log("mcourseD.js: Sending Payment Data to Backend:", paymentDataForBackend);
                const response = await window.uplasApi.fetchAuthenticated(
                    // Endpoint depends on item_type: /payments/subscribe/ for 'plan',
                    // /payments/create-enrollment-stripe/ for 'course' or 'module'
                    paymentDataForBackend.item_type === 'plan' ? '/payments/subscribe/' : '/payments/create-enrollment-stripe/',
                    { method: 'POST', body: JSON.stringify(paymentDataForBackend) }
                );
                const backendResult = await response.json();

                if (response.ok && backendResult.success) {
                    if(window.uplasApi && window.uplasApi.displayFormStatus) window.uplasApi.displayFormStatus(paymentFormGlobalStatus, backendResult.message || 'Enrollment successful!', false, backendResult.message_key || "payment_status_success_enrollment");
                    cardElement.clear();
                    setTimeout(() => {
                        closePaymentModal();
                        window.location.reload();
                    }, 3000);
                    window.dispatchEvent(new CustomEvent('userEnrollmentChanged', { detail: { planId: currentSelectedPlan.id, type: currentSelectedPlan.type } }));
                } else if (backendResult.requires_action && backendResult.client_secret) { // Stripe SCA
                    console.log("mcourseD.js: Stripe requires further action. Client Secret:", backendResult.client_secret);
                    const { error: confirmError } = await stripe.confirmCardPayment(backendResult.client_secret);
                    if (confirmError) {
                        if(window.uplasApi && window.uplasApi.displayFormStatus) window.uplasApi.displayFormStatus(paymentFormGlobalStatus, confirmError.message, true);
                        if (paymentSubmitButton) paymentSubmitButton.disabled = false;
                    } else {
                        if(window.uplasApi && window.uplasApi.displayFormStatus) window.uplasApi.displayFormStatus(paymentFormGlobalStatus, 'Payment successful after authentication!', false, "payment_status_success_authenticated");
                        cardElement.clear();
                        setTimeout(() => {
                            closePaymentModal();
                            window.location.reload();
                        }, 3000);
                        window.dispatchEvent(new CustomEvent('userEnrollmentChanged', { detail: { planId: currentSelectedPlan.id, type: currentSelectedPlan.type } }));
                    }
                }
                else {
                    if(window.uplasApi && window.uplasApi.displayFormStatus) window.uplasApi.displayFormStatus(paymentFormGlobalStatus, backendResult.detail || backendResult.message || 'Payment failed. Please try again or contact support.', true, backendResult.message_key || 'payment_status_error_generic');
                    if(paymentSubmitButton) paymentSubmitButton.disabled = false;
                }
            } catch (error) {
                console.error('mcourseD.js: Backend Payment Processing Error:', error);
                if(window.uplasApi && window.uplasApi.displayFormStatus) window.uplasApi.displayFormStatus(paymentFormGlobalStatus, error.message || 'A network error occurred during payment. Please try again.', true, 'payment_status_error_network');
                if(paymentSubmitButton) paymentSubmitButton.disabled = false;
            }
        });
    }

    // --- Masterclass Section Logic ---
    const renderMasterclasses = (masterclasses) => { /* ... (same as previous, ensure elements exist) ... */
         if (!masterclassItemsContainer) return;
        masterclassItemsContainer.innerHTML = '';
        if (!masterclasses || masterclasses.length === 0) {
            masterclassItemsContainer.innerHTML = '<p data-translate-key="mcourseD_no_masterclasses_available">No masterclasses available at the moment.</p>';
            if(window.uplasApplyTranslations) window.uplasApplyTranslations(masterclassItemsContainer);
            return;
        }
        masterclasses.forEach(mc => { /* ... */ });
        if(window.uplasApplyTranslations) window.uplasApplyTranslations(masterclassItemsContainer);
    };
    const loadMasterclasses = async () => { /* ... (same as previous, using uplasApi and local displayFormStatus) ... */
        if (!masterclassItemsContainer || !window.uplasApi) {
             if(masterclassItemsContainer) masterclassItemsContainer.innerHTML = '<p data-translate-key="mcourseD_err_loading_masterclasses">Could not load masterclasses.</p>';
             if(window.uplasApplyTranslations && masterclassItemsContainer) window.uplasApplyTranslations(masterclassItemsContainer);
            return;
        }
        // Use a local status display for this section if paymentFormGlobalStatus is not appropriate
        const masterclassStatusArea = masterclassGridContainer.querySelector('.status-area-masterclass') || masterclassItemsContainer; // Add a specific status area or use container
        if(window.uplasApi && window.uplasApi.displayFormStatus) window.uplasApi.displayFormStatus(masterclassStatusArea, 'Loading masterclasses...', false, 'mcourseD_loading_masterclasses');

        try {
            const response = await window.uplasApi.fetchAuthenticated('/masterclasses/', { isPublic: true }); // Masterclasses might be public to view titles
            if (!response.ok) throw new Error('Failed to fetch masterclasses.');
            const masterclassesData = await response.json();
            renderMasterclasses(masterclassesData.results || masterclassesData);
            if(window.uplasApi && window.uplasApi.clearFormStatus) window.uplasApi.clearFormStatus(masterclassStatusArea.querySelector('.form__status'));
        } catch (error) {
            console.error("mcourseD.js: Error loading masterclasses:", error);
            if(window.uplasApi && window.uplasApi.displayFormStatus) window.uplasApi.displayFormStatus(masterclassStatusArea, `Error: ${error.message}`, true, 'mcourseD_err_loading_masterclasses_api');
        }
    };
    const checkUserAccessAndLoadMasterclasses = async () => { /* ... (same as previous, ensure uplasApi usage) ... */
        if (!masterclassGridContainer || !window.uplasApi) {
            if (masterclassUpgradeCTAContainer) masterclassUpgradeCTAContainer.style.display = 'block';
            return;
        }
        if (masterclassItemsContainer) masterclassItemsContainer.style.display = 'none';
        if (masterclassNoAccessMessage) masterclassNoAccessMessage.style.display = 'none';
        if (masterclassUpgradeCTAContainer) masterclassUpgradeCTAContainer.style.display = 'none';

        try {
            const response = await window.uplasApi.fetchAuthenticated('/users/me/access_details/'); // This needs auth
            if (!response.ok) {
                if (masterclassUpgradeCTAContainer) masterclassUpgradeCTAContainer.style.display = 'block';
                console.warn("mcourseD.js: Failed to check user masterclass access."); return;
            }
            const accessData = await response.json();
            if (accessData.has_masterclass_access) {
                if (masterclassItemsContainer) masterclassItemsContainer.style.display = 'grid'; // Assuming grid display
                await loadMasterclasses();
            } else {
                if (masterclassNoAccessMessage) masterclassNoAccessMessage.style.display = 'block';
                if (masterclassUpgradeCTAContainer) masterclassUpgradeCTAContainer.style.display = 'block';
            }
        } catch (error) {
            console.error("mcourseD.js: Error checking user access for masterclasses:", error);
            if (masterclassUpgradeCTAContainer) masterclassUpgradeCTAContainer.style.display = 'block';
        }
    };


    // --- Initializations ---
    if (currentCourseIdFromURL) {
        fetchAndPopulateCourseDetails(currentCourseIdFromURL);
    } else {
        console.warn("mcourseD.js: No courseId found in URL. Displaying default or error content.");
        // Display error or default content if no course ID
        const mainContent = document.getElementById('main-content');
        if (mainContent && courseHeroTitle) { // Check if essential elements exist
             courseHeroTitle.textContent = "Course Not Found";
             if(courseHeroSubtitle) courseHeroSubtitle.textContent = "Please select a course from the course list.";
             // Hide other sections or show an appropriate message
             ['#tab-panel-overview', '#tab-panel-curriculum', '.course-layout__sidebar', '.video-masterclass-section']
                .forEach(sel => { const el = document.querySelector(sel); if(el) el.style.display = 'none';});
        }
    }

    if (masterclassGridContainer) {
        checkUserAccessAndLoadMasterclasses();
    }

    console.log("mcourseD.js: Uplas Course Detail Page initialized.");
} // End of initializeCourseDetailPage


// --- DOMContentLoaded Main Execution ---
document.addEventListener('DOMContentLoaded', () => {
    if (typeof window.uplasApi === 'undefined' ||
        typeof window.uplasApi.getAccessToken !== 'function' ||
        typeof window.uplasApi.redirectToLogin !== 'function') {
        console.error('mcourseD.js: uplasApi or its required functions are not defined. Ensure apiUtils.js is loaded correctly.');
        const mainContentArea = document.getElementById('main-content') || document.body;
        mainContentArea.innerHTML = '<p style="text-align:center; padding: 20px; color: red;" data-translate-key="error_auth_utility_missing">Core utility is missing. Page cannot load correctly.</p>';
        if (typeof window.uplasApplyTranslations === 'function') window.uplasApplyTranslations(mainContentArea);
        return;
    }

    // Course detail pages might be partially public (view info) but enrolling/masterclass access needs auth.
    // The initializeCourseDetailPage function will handle auth checks for specific actions.
    initializeCourseDetailPage();
});
