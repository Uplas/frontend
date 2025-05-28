// js/mcourseD.js
/* ==========================================================================
   Uplas Course Detail Page Specific JavaScript (mcourseD.js)
   - Handles tabs, curriculum accordion, payment modal, masterclass display.
   - Relies on global.js for theme, nav, language, currency.
   - Implements authentication check before loading content.
   ========================================================================== */
'use strict';

function initializeCourseDetailPage() {
    // --- Global Element Selectors ---
    const courseTabsNav = document.querySelector('.course-tabs__nav');
    const courseTabButtons = document.querySelectorAll('.course-tabs__button');
    const courseTabPanels = document.querySelectorAll('.course-tabs__panel');
    const moduleAccordion = document.getElementById('module-accordion');

    // Unified Payment Modal Elements (ensure these IDs match your mcourseD.html)
    const paymentModal = document.getElementById('payment-modal');
    const closeModalButton = document.getElementById('payment-modal-close-btn');
    const summaryPlanNameEl = document.getElementById('summary-plan-name-span');
    const summaryPlanPriceEl = document.getElementById('summary-plan-price-span');
    const summaryBillingCycleDiv = document.getElementById('summary-billing-cycle-div');
    const summaryBillingCycleEl = document.getElementById('summary-billing-cycle-span');
    const paymentFormGlobalStatus = document.getElementById('payment-form-global-status');
    const paymentSubmitButton = document.getElementById('payment-submit-button'); // This is the "Pay Now" button

    const unifiedCardPaymentForm = document.getElementById('unified-card-payment-form');
    const paymentCardholderNameInput = document.getElementById('payment-cardholder-name');
    const paymentEmailInput = document.getElementById('payment-email');
    const paymentCardNumberInput = document.getElementById('payment-card-number');
    const paymentCardTypeIcon = document.getElementById('payment-card-type-icon');
    const paymentExpiryDateInput = document.getElementById('payment-expiry-date');
    const paymentCvvInput = document.getElementById('payment-cvv');
    const stripe = Stripe('YOUR_STRIPE_PUBLISHABLE_KEY'); // Replace with your actual key

    // CTA Buttons that open payment modal
    const enrollNowMainCTA = document.getElementById('enroll-now-main-cta');
    const sidebarEnrollCourseButton = document.getElementById('sidebar-enroll-course-btn');
    const sidebarPlanButtons = document.querySelectorAll('.pricing-options-sidebar .select-plan-btn');
    const buyModuleButtons = document.querySelectorAll('.buy-module-btn'); // Assuming these are also .select-plan-btn or similar

    const masterclassGridContainer = document.getElementById('masterclass-grid-container');
    const masterclassNoAccessMessage = masterclassGridContainer?.querySelector('.masterclass-no-access-message');
    const masterclassUpgradeCTAContainer = document.getElementById('masterclass-upgrade-cta-container');


    // --- State Variables ---
    let isModalOpen = false;
    let currentSelectedPlan = null;

    // --- Helper Functions ---
    const focusFirstElement = (container) => { /* ... (same as in upricing.js or global utils) ... */ };
    const displayPaymentStatus = (message, type, isLoading = false, translateKey = null) => {
        if (!paymentFormGlobalStatus) return;
        const text = translateKey && typeof window.uplasTranslate === 'function' ? window.uplasTranslate(translateKey, {fallback: message}) : message;
        paymentFormGlobalStatus.textContent = text;
        paymentFormGlobalStatus.className = 'form__status payment-status-message'; // Reset
        if(type) paymentFormGlobalStatus.classList.add(`payment-status-message--${type}`);
        paymentFormGlobalStatus.hidden = false;
        if (isLoading) {
            paymentFormGlobalStatus.innerHTML = `<i class="fas fa-spinner fa-spin"></i> ${text}`;
        }
    };
    const clearPaymentStatus = () => { /* ... (same as in upricing.js or global utils) ... */ };
    const validateInput = (inputElement) => { /* ... (same as in upricing.js or global utils, ensure it's available) ... */
        const group = inputElement.closest('.form__group');
        if (!group) return inputElement.checkValidity();
        const errorSpan = group.querySelector('.form__error-message');
        inputElement.classList.remove('invalid');
        if(errorSpan) errorSpan.textContent = '';

        if (!inputElement.checkValidity()) {
            inputElement.classList.add('invalid');
            if (errorSpan) {
                let defaultMessage = inputElement.validationMessage;
                if (inputElement.validity.valueMissing) defaultMessage = "This field is required.";
                else if (inputElement.validity.patternMismatch) defaultMessage = inputElement.title || "Please match the requested format.";
                else if (inputElement.validity.typeMismatch) defaultMessage = `Please enter a valid ${inputElement.type}.`;

                const errorKey = inputElement.dataset.errorKeyRequired || inputElement.dataset.errorKeyPattern || inputElement.dataset.errorKeyType || (inputElement.name + '_error');
                errorSpan.textContent = (typeof window.uplasTranslate === 'function' && errorKey) ?
                                        window.uplasTranslate(errorKey, {fallback: defaultMessage}) : defaultMessage;
            }
            return false;
        }
        return true;
    };


    // --- Course Content Tabs ---
    if (courseTabsNav) { /* ... (same as original mcourseD.js) ... */ }

    // --- Curriculum Accordion ---
    if (moduleAccordion) { /* ... (same as original mcourseD.js) ... */ }

    // --- Card Type Detection and Formatting ---
    function getCardType(cardNumber) { /* ... (same as in upricing.js) ... */
        const num = cardNumber.replace(/\s+/g, '');
        if (/^4/.test(num)) return 'visa';
        if (/^5[1-5]/.test(num)) return 'mastercard';
        if (/^3[47]/.test(num)) return 'amex';
        if (/^6(?:011|5)/.test(num)) return 'discover';
        if (/^3(?:0[0-5]|[68])/.test(num)) return 'diners';
        if (/^(?:2131|1800|35)/.test(num)) return 'jcb';
        return 'unknown';
    }

    if (paymentCardNumberInput && paymentCardTypeIcon) { /* ... (same as in upricing.js) ... */
        paymentCardNumberInput.addEventListener('input', () => {
            let value = paymentCardNumberInput.value.replace(/\s+/g, '').replace(/[^0-9]/gi, '');
            const cardType = getCardType(value);
            paymentCardTypeIcon.className = 'card-type-icon'; // Reset
            if (cardType !== 'unknown') {
                paymentCardTypeIcon.classList.add(cardType, 'active');
            }

            let parts = [];
            for (let i=0, len=value.length; i<len; i+=4) {
                parts.push(value.substring(i, i+4));
            }
            if (parts.length) {
                paymentCardNumberInput.value = parts.join(' ').substring(0, 23);
            } else {
                paymentCardNumberInput.value = '';
            }
        });
    }

    if (paymentExpiryDateInput) { /* ... (same as in upricing.js) ... */
        paymentExpiryDateInput.addEventListener('input', (e) => {
            let value = e.target.value.replace(/\D/g, '');
            if (value.length > 2) {
                value = value.substring(0, 2) + ' / ' + value.substring(2, 4);
            } else if (value.length === 2 && e.inputType !== 'deleteContentBackward' && !e.target.value.includes(' / ')) {
                value = value + ' / ';
            }
            e.target.value = value.substring(0, 7);
        });
    }

    // --- Payment Modal Logic (Unified for Card) ---
    function updatePaymentModalSummary() { /* ... (same as in upricing.js) ... */
        if (!currentSelectedPlan || !summaryPlanNameEl || !summaryPlanPriceEl || !summaryBillingCycleDiv || !summaryBillingCycleEl) {
            return;
        }
        summaryPlanNameEl.textContent = currentSelectedPlan.name;
        summaryPlanPriceEl.dataset.priceUsd = currentSelectedPlan.priceUsd;
        if (typeof window.updateUserCurrencyDisplay === 'function') {
            window.updateUserCurrencyDisplay();
        } else {
            const price = parseFloat(currentSelectedPlan.priceUsd);
            const currency = localStorage.getItem('uplas-currency') || 'USD';
            summaryPlanPriceEl.textContent = `${currency} ${price.toFixed(2)}`;
        }

        if (currentSelectedPlan.billingCycle && currentSelectedPlan.billingCycle.toLowerCase() !== 'one-time') {
            const billingCycleKey = `billing_cycle_${currentSelectedPlan.billingCycle.toLowerCase()}`;
            const billingCycleText = (typeof window.uplasTranslate === 'function') ?
                                     window.uplasTranslate(billingCycleKey, {fallback: currentSelectedPlan.billingCycle}) :
                                     currentSelectedPlan.billingCycle;
            summaryBillingCycleEl.textContent = billingCycleText;
            summaryBillingCycleDiv.hidden = false;
        } else {
            summaryBillingCycleDiv.hidden = true;
        }
    }

    function openPaymentModal(planData) { /* ... (adapted from upricing.js for unified form) ... */
        if (!paymentModal) {
            console.error("Payment modal element not found in the DOM.");
            alert("Error: Payment functionality is currently unavailable.");
            return;
        }
        currentSelectedPlan = planData;
        updatePaymentModalSummary();

        if (paymentSubmitButton) {
            const buttonTextKey = 'payment_modal_submit_pay_now';
            const buttonText = (typeof window.uplasTranslate === 'function') ?
                               window.uplasTranslate(buttonTextKey, {fallback: 'Pay Now'}) :
                               'Pay Now';
            paymentSubmitButton.innerHTML = `<i class="fas fa-shield-alt"></i> ${buttonText}`;
            paymentSubmitButton.disabled = false;
        }
        if(paymentFormGlobalStatus) clearPaymentStatus();


        unifiedCardPaymentForm?.reset();
        unifiedCardPaymentForm?.querySelectorAll('.form__error-message').forEach(el => el.textContent = '');
        unifiedCardPaymentForm?.querySelectorAll('.invalid').forEach(el => el.classList.remove('invalid'));
        if(paymentCardTypeIcon) paymentCardTypeIcon.className = 'card-type-icon';

        paymentModal.hidden = false;
        document.body.style.overflow = 'hidden';
        setTimeout(() => paymentModal.classList.add('active'), 10);
        isModalOpen = true;
        focusFirstElement(paymentModal);
    }

    function closePaymentModal() { /* ... (same as in upricing.js) ... */
        if (paymentModal) {
            paymentModal.classList.remove('active');
            setTimeout(() => {
                paymentModal.hidden = true;
                document.body.style.overflow = '';
                isModalOpen = false;
                currentSelectedPlan = null;
            }, 300);
        }
    }

    const allPlanButtons = [enrollNowMainCTA, sidebarEnrollCourseButton, ...Array.from(sidebarPlanButtons), ...Array.from(buyModuleButtons)];
    allPlanButtons.forEach(button => {
        if (button) {
            button.addEventListener('click', (event) => {
                event.preventDefault();
                const planData = {
                    id: button.dataset.planId || button.dataset.moduleId, // Use planId or moduleId
                    name: button.dataset.name || `Module ${button.dataset.moduleId}`,
                    priceUsd: button.dataset.priceUsd,
                    billingCycle: button.dataset.billingCycle || 'One-time'
                };
                if (!planData.priceUsd || isNaN(parseFloat(planData.priceUsd))) {
                    console.error("Button is missing a valid data-price-usd attribute:", button);
                    alert("Error: Price information is missing for this item.");
                    return;
                }
                openPaymentModal(planData);
            });
        }
    });

    if (closeModalButton) closeModalButton.addEventListener('click', closePaymentModal);
    document.addEventListener('keydown', (event) => { if (event.key === 'Escape' && isModalOpen) closePaymentModal(); });
    paymentModal?.addEventListener('click', (event) => { if (event.target === paymentModal) closePaymentModal(); });

    if (unifiedCardPaymentForm) {
        unifiedCardPaymentForm.addEventListener('submit', async (e) => { /* ... (adapted from upricing.js) ... */
            e.preventDefault();
            if (!currentSelectedPlan) {
                displayPaymentStatus('No plan selected.', 'error', false, 'err_no_plan_selected');
                return;
            }

            let isFormValid = true;
            [paymentCardholderNameInput, paymentEmailInput, paymentCardNumberInput, paymentExpiryDateInput, paymentCvvInput].forEach(input => {
                 if (input && !validateInput(input)) isFormValid = false;
            });

            if (!isFormValid) {
                displayPaymentStatus('Please correct the errors in the form.', 'error', false, 'err_correct_form_errors');
                return;
            }

            displayPaymentStatus('Processing your payment...', 'loading', true, 'payment_status_processing');
            if(paymentSubmitButton) paymentSubmitButton.disabled = true;

            const paymentData = {
                planId: currentSelectedPlan.id,
                planName: currentSelectedPlan.name,
                amountUSD: parseFloat(currentSelectedPlan.priceUsd).toFixed(2),
                currency: 'USD',
                billingCycle: currentSelectedPlan.billingCycle,
                gateway: 'card_processor',
                cardholderName: paymentCardholderNameInput.value,
                email: paymentEmailInput.value,
                // paymentToken: "simulated_token_for_card" // In production, this would be from Stripe.js, etc.
            };

            try {
                console.log("Submitting Card Payment Data (mcourseD):", paymentData);
                // TODO: Replace with actual fetchAuthenticated call
                await new Promise(resolve => setTimeout(resolve, 2500));
                const result = { success: Math.random() > 0.1, message_key: "payment_status_success_enrollment" };

                if (result.success) {
                    displayPaymentStatus('Enrollment successful! You now have access.', 'success', false, result.message_key);
                    setTimeout(() => {
                        closePaymentModal();
                        // UI update to reflect access to course/module
                        // Example: Change "Buy Module" button to "Start Lesson"
                        const purchasedItemButton = document.querySelector(`.select-plan-btn[data-plan-id="${currentSelectedPlan.id}"], .buy-module-btn[data-module-id="${currentSelectedPlan.id}"]`);
                        if (purchasedItemButton) {
                            purchasedItemButton.textContent = "Access Content"; // Or redirect
                            purchasedItemButton.disabled = true; // Or change its action
                        }
                    }, 3000);
                } else {
                    displayPaymentStatus(result.message || 'Payment failed. Please try again.', 'error', false, result.message_key || 'payment_status_error_generic');
                    if(paymentSubmitButton) paymentSubmitButton.disabled = false;
                }
            } catch (error) {
                console.error('Card Payment Submission Error (mcourseD):', error);
                displayPaymentStatus(error.message || 'A network error occurred.', 'error', false, 'payment_status_error_network');
                if(paymentSubmitButton) paymentSubmitButton.disabled = false;
            }
        });
    }

    // --- Masterclass Section Logic ---
    const checkUserAccessAndLoadMasterclasses = async () => {
        // Simulate checking user subscription status
        // In a real app: const userStatus = await fetchAuthenticated('/api/user/subscription-status');
        const hasPremiumAccess = true; // SIMULATE: replace with actual check

        if (!masterclassGridContainer || !masterclassNoAccessMessage || !masterclassUpgradeCTAContainer) return;

        if (hasPremiumAccess) {
            masterclassNoAccessMessage.style.display = 'none';
            masterclassUpgradeCTAContainer.style.display = 'none';
            loadMasterclasses();
        } else {
            masterclassGridContainer.innerHTML = ''; // Clear any existing cards
            masterclassGridContainer.appendChild(masterclassNoAccessMessage); // Show no access message first
            masterclassNoAccessMessage.style.display = 'block';
            masterclassUpgradeCTAContainer.style.display = 'block';
        }
    };

    const loadMasterclasses = async () => {
        if (!masterclassGridContainer) return;
        // Simulate fetching masterclass data
        // In a real app: const masterclasses = await fetchAuthenticated('/api/masterclasses');
        await new Promise(resolve => setTimeout(resolve, 500));
        const masterclasses = [
            { id: 'mc001', title: 'Advanced Prompt Engineering', mentor: 'Dr. Lexi Vector', duration: '45min', thumbnail: 'images/masterclass_thumb1.jpg', videoUrl: '#', titleKey: 'mc_title_prompt_eng' },
            { id: 'mc002', title: 'AI Ethics in Product Design', mentor: 'Prof. Anya Sharma', duration: '1hr 10min', thumbnail: 'images/masterclass_thumb2.jpg', videoUrl: '#', titleKey: 'mc_title_ai_ethics' },
            { id: 'mc003', title: 'Scaling MLOps for Enterprise', mentor: 'Kenji Tanaka', duration: '1hr 30min', thumbnail: 'images/masterclass_thumb3.jpg', videoUrl: '#', titleKey: 'mc_title_mlops_scale' }
        ];

        masterclassGridContainer.innerHTML = ''; // Clear before adding
        masterclasses.forEach(mc => {
            const titleText = typeof window.uplasTranslate === 'function' && mc.titleKey ? window.uplasTranslate(mc.titleKey, mc.title) : mc.title;
            const card = `
                <article class="masterclass-card">
                    <a href="${mc.videoUrl}" class="masterclass-card__link" aria-label="Watch masterclass: ${titleText}">
                        <div class="masterclass-card__thumbnail-container">
                            <img src="${mc.thumbnail}" alt="${titleText}" class="masterclass-card__thumbnail">
                            <i class="fas fa-play-circle masterclass-card__play-icon"></i>
                            <span class="masterclass-card__duration">${mc.duration}</span>
                        </div>
                        <div class="masterclass-card__content">
                            <h4 class="masterclass-card__title" ${mc.titleKey ? `data-translate-key="${mc.titleKey}"` : ''}>${titleText}</h4>
                            <p class="masterclass-card__mentor">With ${mc.mentor}</p>
                            </div>
                    </a>
                </article>
            `;
            masterclassGridContainer.insertAdjacentHTML('beforeend', card);
        });
        if(window.uplasApplyTranslations) window.uplasApplyTranslations(); // Re-translate new content
    };

    // --- Initializations ---
    const urlParams = new URLSearchParams(window.location.search);
    const courseId = urlParams.get('courseId');
    if (courseId) {
        console.log("Loading details for course:", courseId);
        // fetchCourseDetails(courseId); // Placeholder for actual data fetch
    } else {
        console.warn("No courseId found in URL. Displaying generic content.");
    }

    checkUserAccessAndLoadMasterclasses(); // Load masterclasses based on access

    // Update footer year (can be handled by global.js too)
    const currentYearFooterSpan = document.getElementById('current-year-footer');
    if (currentYearFooterSpan) {
        currentYearFooterSpan.textContent = new Date().getFullYear();
    }
    console.log("Uplas Course Detail Page (mcourseD.js) refined and initialized for single card payment.");
}


document.addEventListener('DOMContentLoaded', () => {
    if (typeof getAuthToken !== 'function') {
        console.error('getAuthToken function is not defined. Ensure apiUtils.js is loaded correctly.');
        const mainContent = document.getElementById('main-content');
        if (mainContent) {
            mainContent.innerHTML = '<p style="text-align:center; padding: 20px; color: red;">Authentication utility is missing. Page cannot load correctly.</p>';
        }
        return;
    }
    const authToken = getAuthToken();

    if (!authToken) {
        console.log('User not authenticated for course detail. Redirecting to login.');
        const currentPath = window.location.pathname + window.location.search + window.location.hash;
        window.location.href = `index.html#auth-section&returnUrl=${encodeURIComponent(currentPath)}`;
    } else {
        console.log('User authenticated. Initializing course detail page.');
        initializeCourseDetailPage();
    }
});
