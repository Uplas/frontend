// js/mcourseD.js
/* ==========================================================================
   Uplas Course Detail Page Specific JavaScript (mcourseD.js)
   - Handles tabs, curriculum accordion, payment modal (Card via Stripe.js concept), masterclass display.
   ========================================================================== */
'use strict';

function initializeCourseDetailPage() {
    // --- Element Selectors ---
    const courseTabsNav = document.querySelector('.course-tabs__nav');
    const courseTabButtons = document.querySelectorAll('.course-tabs__button');
    const courseTabPanels = document.querySelectorAll('.course-tabs__panel');
    const moduleAccordion = document.getElementById('module-accordion');

    // Unified Card Payment Modal Elements
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

    // Stripe.js specific elements
    const stripeCardElementContainer = document.getElementById('stripe-card-element');
    const stripeCardErrors = document.getElementById('stripe-card-errors');

    const allPlanButtons = [
        document.getElementById('enroll-now-main-cta'),
        document.getElementById('sidebar-enroll-course-btn'),
        ...document.querySelectorAll('.pricing-options-sidebar .select-plan-btn'),
        ...document.querySelectorAll('.buy-module-btn.select-plan-btn') // Ensure buy-module-btn also has select-plan-btn
    ].filter(btn => btn);


    const masterclassGridContainer = document.getElementById('masterclass-grid-container');
    const masterclassNoAccessMessage = masterclassGridContainer?.querySelector('.masterclass-no-access-message');
    const masterclassUpgradeCTAContainer = document.getElementById('masterclass-upgrade-cta-container');


    // --- State Variables ---
    let isModalOpen = false;
    let currentSelectedPlan = null;
    let stripe = null;
    let cardElement = null;

    // --- Initialize Stripe ---
    function initializeStripe() {
        if (typeof Stripe === 'undefined') {
            console.error('Stripe.js has not been loaded on mcourseD.html.');
             if (paymentSubmitButton) paymentSubmitButton.disabled = true;
            allPlanButtons.forEach(btn => btn.disabled = true);
            return false;
        }
        stripe = Stripe('pk_test_YOUR_STRIPE_PUBLISHABLE_KEY'); // Replace with your key
        const elements = stripe.elements();
        const cardStyle = {
            base: {
                color: (document.body.classList.contains('dark-mode') ? '#CFD8DC' : '#32325d'),
                fontFamily: '"Poppins", sans-serif',
                fontSmoothing: 'antialiased',
                fontSize: '16px',
                '::placeholder': {
                    color: (document.body.classList.contains('dark-mode') ? '#607D8B' : '#aab7c4')
                }
            },
            invalid: {
                color: '#fa755a',
                iconColor: '#fa755a'
            }
        };
        if (stripeCardElementContainer) {
            cardElement = elements.create('card', { style: cardStyle, hidePostalCode: true });
            cardElement.mount(stripeCardElementContainer);
            cardElement.on('change', function(event) {
                if (stripeCardErrors) {
                    stripeCardErrors.textContent = event.error ? event.error.message : '';
                }
            });
        } else {
            console.error("Stripe card element container '#stripe-card-element' not found in mcourseD.html modal.");
            return false;
        }
        return true;
    }
    const stripeInitialized = initializeStripe();

    // --- Utility Functions ---
    const displayFormStatus = (element, message, type, translateKey = null, variables = {}) => {
        if (!element) return;
        const text = (translateKey && typeof window.uplasTranslate === 'function') ?
                     window.uplasTranslate(translateKey, { fallback: message, variables }) : message;
        element.innerHTML = text; // Use innerHTML for spinner
        element.className = 'form__status payment-status-message';
        if (type === 'loading' && !element.querySelector('.fa-spinner')) {
             element.innerHTML = `<i class="fas fa-spinner fa-spin"></i> ${text}`;
        }
        if (type) element.classList.add(`form__status--${type}`);
        element.style.display = 'block';
        element.hidden = false;
        element.setAttribute('aria-live', type === 'error' ? 'assertive' : 'polite');
    };
    const clearFormStatus = (element) => { /* ... */
        if (!element) return;
        element.textContent = '';
        element.style.display = 'none';
        element.hidden = true;
        element.className = 'form__status payment-status-message';
    };
    const validateInput = (inputElement) => { /* ... (same as upricing.js) ... */
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
    const focusFirstElement = (container) => { /* ... */ };


    // --- Course Content Tabs & Accordion ---
    if (courseTabsNav && courseTabButtons.length > 0 && courseTabPanels.length > 0) {
        courseTabsNav.addEventListener('click', (e) => {
            const clickedButton = e.target.closest('.course-tabs__button');
            if (!clickedButton) return;
            courseTabButtons.forEach(button => {
                button.classList.remove('active');
                button.setAttribute('aria-selected', 'false');
            });
            clickedButton.classList.add('active');
            clickedButton.setAttribute('aria-selected', 'true');
            const targetPanelId = clickedButton.getAttribute('aria-controls');
            courseTabPanels.forEach(panel => {
                panel.hidden = panel.id !== targetPanelId;
            });
        });
    }
    if (moduleAccordion) {
        moduleAccordion.addEventListener('click', (e) => {
            const button = e.target.closest('.module__toggle-button');
            if (!button) return;
            const contentId = button.getAttribute('aria-controls');
            const content = document.getElementById(contentId);
            const isExpanded = button.getAttribute('aria-expanded') === 'true';
            button.setAttribute('aria-expanded', (!isExpanded).toString());
            if (content) content.hidden = isExpanded;
            const icon = button.querySelector('.module__toggle-icon i');
            if (icon) {
                icon.classList.toggle('fa-chevron-down', isExpanded);
                icon.classList.toggle('fa-chevron-up', !isExpanded);
            }
        });
    }


    // --- Payment Modal Logic ---
    function updatePaymentModalSummary() { /* ... (same as upricing.js) ... */ }
    function openPaymentModal(planData) { /* ... (same as upricing.js, ensuring stripe elements are handled) ... */
        if (!paymentModal || !stripeInitialized) {
            const errorMsgKey = !stripeInitialized ? "err_payment_system_unavailable" : "err_payment_modal_missing";
            const fallbackMsg = !stripeInitialized ? "Payment system is not available." : "Payment modal element not found.";
            alert(typeof window.uplasTranslate === 'function' ? window.uplasTranslate(errorMsgKey, {fallback: fallbackMsg}) : fallbackMsg);
            return;
        }
        currentSelectedPlan = planData;
        updatePaymentModalSummary();

        if (paymentSubmitButton) {
            const buttonTextKey = 'payment_modal_submit_pay_now';
            paymentSubmitButton.innerHTML = `<i class="fas fa-shield-alt"></i> ${window.uplasTranslate ? window.uplasTranslate(buttonTextKey, {fallback: 'Pay Now'}) : 'Pay Now'}`;
            paymentSubmitButton.disabled = false;
        }
        if(paymentFormGlobalStatus) clearFormStatus(paymentFormGlobalStatus);
        if(stripeCardErrors) stripeCardErrors.textContent = '';

        unifiedCardPaymentForm?.reset();
        cardElement?.clear();
        unifiedCardPaymentForm?.querySelectorAll('.invalid').forEach(el => el.classList.remove('invalid'));

        paymentModal.hidden = false;
        document.body.style.overflow = 'hidden';
        setTimeout(() => {
            paymentModal.classList.add('active');
            if(paymentCardholderNameInput) paymentCardholderNameInput.focus();
            else focusFirstElement(paymentModal);
        }, 10);
        isModalOpen = true;
    }
    function closePaymentModal() { /* ... (same as upricing.js) ... */ }


    // --- Event Listeners for Payment ---
    allPlanButtons.forEach(button => {
        if (button) {
            button.addEventListener('click', (event) => {
                event.preventDefault();
                const planData = {
                    id: button.dataset.planId || button.dataset.moduleId || button.dataset.courseId, // Consider courseId for main CTAs
                    name: button.dataset.name || button.closest('.lesson,.module,.course-hero,.pricing-widget')?.querySelector('.lesson__title,.module__toggle-button span:first-child, .course-hero__title, .pricing-widget__title-overlay')?.textContent.trim() || 'Selected Item',
                    priceUsd: button.dataset.priceUsd,
                    billingCycle: button.dataset.billingCycle || 'One-time'
                };
                if (!planData.priceUsd || isNaN(parseFloat(planData.priceUsd))) {
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

    if (unifiedCardPaymentForm && stripeInitialized) {
        unifiedCardPaymentForm.addEventListener('submit', async (e) => { /* ... (same Stripe.js submission logic as in upricing.js) ... */
            e.preventDefault();
            if (!currentSelectedPlan || !cardElement) {
                displayFormStatus(paymentFormGlobalStatus, 'Payment error. Try again.', 'error', 'err_payment_system_or_plan');
                return;
            }
            let isFormValid = true;
            if (paymentCardholderNameInput && !validateInput(paymentCardholderNameInput)) isFormValid = false;
            if (paymentEmailInput && !validateInput(paymentEmailInput)) isFormValid = false;

            if (!isFormValid) {
                displayFormStatus(paymentFormGlobalStatus, 'Correct name/email.', 'error', 'err_correct_form_errors_basic');
                return;
            }

            if(paymentSubmitButton) paymentSubmitButton.disabled = true;
            displayFormStatus(paymentFormGlobalStatus, 'Processing...', 'loading', true, 'payment_status_processing');

            const cardholderName = paymentCardholderNameInput.value;
            const email = paymentEmailInput.value;

            const { paymentMethod, error: pmError } = await stripe.createPaymentMethod({
                type: 'card', card: cardElement, billing_details: { name: cardholderName, email: email },
            });

            if (pmError) {
                displayFormStatus(paymentFormGlobalStatus, pmError.message, 'error');
                if (stripeCardErrors) stripeCardErrors.textContent = pmError.message;
                if(paymentSubmitButton) paymentSubmitButton.disabled = false;
                return;
            }
            if (stripeCardErrors) stripeCardErrors.textContent = '';

            const paymentDataForBackend = { /* ... same data structure ... */ };

            try {
                console.log("Sending Payment Data (Stripe Method ID) to Backend (mcourseD):", paymentDataForBackend);
                // const backendResponse = await fetchAuthenticated('/api/payments/create-enrollment-stripe', { method: 'POST', body: JSON.stringify(paymentDataForBackend) });
                // const backendResult = backendResponse;
                await new Promise(resolve => setTimeout(resolve, 2500));
                const backendResult = { success: Math.random() > 0.1, message_key: "payment_status_success_enrollment" };

                if (backendResult.success) {
                    displayFormStatus(paymentFormGlobalStatus, 'Enrolled!', 'success', false, backendResult.message_key);
                    cardElement.clear();
                    setTimeout(closePaymentModal, 3000);
                    // UI update, e.g., unlock content or redirect
                } else {
                     displayFormStatus(paymentFormGlobalStatus, backendResult.message || 'Failed. Try again.', 'error', false, backendResult.message_key || 'payment_status_error_generic');
                    if(paymentSubmitButton) paymentSubmitButton.disabled = false;
                }
            } catch (error) {
                displayFormStatus(paymentFormGlobalStatus, error.message || 'Network error.', 'error', false, 'payment_status_error_network');
                if(paymentSubmitButton) paymentSubmitButton.disabled = false;
            }
        });
    }

    // --- Masterclass Section Logic ---
    const checkUserAccessAndLoadMasterclasses = async () => { /* ... (Keep original logic) ... */ };
    const loadMasterclasses = async () => { /* ... (Keep original logic) ... */ };

    // --- Initializations ---
    const urlParams = new URLSearchParams(window.location.search);
    const courseId = urlParams.get('courseId');
    if (courseId) {
        console.log("Loading details for course:", courseId);
    } else {
        console.warn("No courseId found in URL.");
    }
    checkUserAccessAndLoadMasterclasses();

    const currentYearFooterSpan = document.getElementById('current-year-footer');
    if (currentYearFooterSpan) currentYearFooterSpan.textContent = new Date().getFullYear();

    console.log("Uplas Course Detail Page (mcourseD.js) with Stripe.js conceptual integration initialized.");
}

document.addEventListener('DOMContentLoaded', () => {
    if (typeof getAuthToken !== 'function') {
        // ... (auth error handling) ...
        return;
    }
    const authToken = getAuthToken();
    if (!authToken) {
        // ... (redirect logic) ...
    } else {
        initializeCourseDetailPage();
    }
});
