// js/mcourseD.js
/* ==========================================================================
   Uplas Course Detail Page Specific JavaScript (mcourseD.js)
   - Handles tabs, curriculum accordion, payment modal (Card via Stripe.js), masterclass display.
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
        ...document.querySelectorAll('.buy-module-btn.select-plan-btn')
    ].filter(btn => btn);


    const masterclassGridContainer = document.getElementById('masterclass-grid-container');
    const masterclassItemsContainer = masterclassGridContainer?.querySelector('.masterclass-items'); // Assuming a sub-container for items
    const masterclassNoAccessMessage = masterclassGridContainer?.querySelector('.masterclass-no-access-message');
    const masterclassUpgradeCTAContainer = document.getElementById('masterclass-upgrade-cta-container');


    // --- State Variables ---
    let isModalOpen = false;
    let currentSelectedPlan = null;
    let stripe = null;
    let cardElement = null;
    let currentCourseIdFromURL = null; // To store courseId from URL

    // --- Initialize Stripe ---
    function initializeStripe() {
        if (typeof Stripe === 'undefined') {
            console.error('Stripe.js has not been loaded on mcourseD.html.');
            if (paymentSubmitButton) paymentSubmitButton.disabled = true;
            allPlanButtons.forEach(btn => btn.disabled = true);
            if (paymentFormGlobalStatus) displayFormStatus(paymentFormGlobalStatus, 'Payment system unavailable.', 'error', 'err_payment_system_unavailable_stripe');
            return false;
        }
        // IMPORTANT: Replace with your actual Stripe Publishable Key
        stripe = Stripe('pk_test_YOUR_STRIPE_PUBLISHABLE_KEY');
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
            if (paymentFormGlobalStatus) displayFormStatus(paymentFormGlobalStatus, 'Payment UI error.', 'error', 'err_payment_ui_missing_stripe');
            return false;
        }
        return true;
    }
    const stripeInitialized = initializeStripe();

    // --- Utility Functions (local to mcourseD.js for payment modal) ---
    const displayFormStatus = (element, message, type, translateKey = null, variables = {}) => {
        if (!element) return;
        let text = message;
        if (translateKey && typeof window.uplasTranslate === 'function') {
            text = window.uplasTranslate(translateKey, { fallback: message, variables });
        }

        element.innerHTML = text; // Use innerHTML for spinner
        element.className = 'form__status payment-status-message'; // Reset classes
        if (type === 'loading' && !element.querySelector('.fa-spinner')) {
             element.innerHTML = `<i class="fas fa-spinner fa-spin"></i> ${text}`;
        }
        if (type) element.classList.add(`form__status--${type}`); // e.g., form__status--error
        element.style.display = 'block';
        element.hidden = false;
        element.setAttribute('aria-live', type === 'error' ? 'assertive' : 'polite');
    };
    const clearFormStatus = (element) => {
        if (!element) return;
        element.textContent = '';
        element.style.display = 'none';
        element.hidden = true;
        element.className = 'form__status payment-status-message';
    };
    const validateInput = (inputElement) => {
        const group = inputElement.closest('.form__group');
        if (!group) return inputElement.checkValidity(); // Basic validation if no group
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

                const errorKey = inputElement.dataset.errorKeyRequired || inputElement.dataset.errorKeyPattern || inputElement.dataset.errorKeyType || (inputElement.name ? `${inputElement.name}_error` : 'input_error');
                errorSpan.textContent = (typeof window.uplasTranslate === 'function' && errorKey) ?
                                        window.uplasTranslate(errorKey, {fallback: defaultMessage}) : defaultMessage;
            }
            return false;
        }
        return true;
    };
    const focusFirstElement = (container) => {
        if (!container) return;
        const focusable = container.querySelector('input:not([disabled]), select:not([disabled]), textarea:not([disabled]), button:not([disabled])');
        focusable?.focus();
    };


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
    function updatePaymentModalSummary() {
        if (!currentSelectedPlan || !summaryPlanNameEl || !summaryPlanPriceEl || !summaryBillingCycleDiv || !summaryBillingCycleEl) return;

        summaryPlanNameEl.textContent = currentSelectedPlan.name || 'Selected Plan';
        const price = parseFloat(currentSelectedPlan.priceUsd);
        // Use global.js formatPriceForDisplay if available, otherwise basic formatting
        const formattedPrice = (typeof window.formatPriceForDisplay === 'function')
            ? window.formatPriceForDisplay(price, window.currentGlobalCurrency || 'USD')
            : `$${price.toFixed(2)}`;
        summaryPlanPriceEl.textContent = formattedPrice;
        summaryPlanPriceEl.dataset.priceUsd = price.toString(); // Keep base USD price

        if (currentSelectedPlan.billingCycle && currentSelectedPlan.billingCycle.toLowerCase() !== 'one-time') {
            summaryBillingCycleEl.textContent = currentSelectedPlan.billingCycle;
            summaryBillingCycleDiv.hidden = false;
        } else {
            summaryBillingCycleDiv.hidden = true;
        }
    }

    function openPaymentModal(planData) {
        if (!paymentModal) {
            alert("Payment modal element not found.");
            return;
        }
        if (!stripeInitialized && paymentFormGlobalStatus) {
             displayFormStatus(paymentFormGlobalStatus, 'Payment system is currently unavailable. Please try again later.', 'error', 'err_payment_system_unavailable_stripe');
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
        cardElement?.clear(); // Clear Stripe card element
        unifiedCardPaymentForm?.querySelectorAll('.invalid').forEach(el => el.classList.remove('invalid'));

        // Pre-fill email if user is logged in
        if (typeof window.uplasApi !== 'undefined' && window.uplasApi.getUserData && paymentEmailInput) {
            const userData = window.uplasApi.getUserData();
            if (userData && userData.email) {
                paymentEmailInput.value = userData.email;
            }
        }


        paymentModal.hidden = false;
        document.body.style.overflow = 'hidden';
        setTimeout(() => {
            paymentModal.classList.add('active');
            if(paymentCardholderNameInput) paymentCardholderNameInput.focus();
            else focusFirstElement(paymentModal); // Fallback focus
        }, 10); // Slight delay for transition
        isModalOpen = true;
    }

    function closePaymentModal() {
        if (!paymentModal) return;
        paymentModal.classList.remove('active');
        document.body.style.overflow = '';
        setTimeout(() => {
            paymentModal.hidden = true;
        }, 300); // Match CSS transition duration
        isModalOpen = false;
        currentSelectedPlan = null;
    }

    // --- Event Listeners for Payment ---
    allPlanButtons.forEach(button => {
        if (button) {
            button.addEventListener('click', (event) => {
                event.preventDefault();
                const planData = {
                    id: button.dataset.planId || button.dataset.moduleId || button.dataset.courseId || currentCourseIdFromURL,
                    name: button.dataset.name || button.closest('.lesson,.module,.course-hero,.pricing-widget')?.querySelector('.lesson__title,.module__toggle-button span:first-child, .course-hero__title, .pricing-widget__title-overlay')?.textContent.trim() || 'Selected Item',
                    priceUsd: button.dataset.priceUsd,
                    billingCycle: button.dataset.billingCycle || 'One-time',
                    type: button.dataset.planId ? 'plan' : (button.dataset.moduleId ? 'module' : 'course') // Determine item type
                };
                if (!planData.priceUsd || isNaN(parseFloat(planData.priceUsd))) {
                    alert(window.uplasTranslate ? window.uplasTranslate('err_price_info_missing', {fallback: "Error: Price information is missing for this item."}) : "Error: Price information is missing for this item.");
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
        unifiedCardPaymentForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            if (!currentSelectedPlan || !cardElement || !window.uplasApi || !window.uplasApi.fetchAuthenticated) {
                displayFormStatus(paymentFormGlobalStatus, 'Payment system error. Please try again or contact support.', 'error', 'err_payment_system_or_plan');
                return;
            }
            let isFormValid = true;
            if (paymentCardholderNameInput && !validateInput(paymentCardholderNameInput)) isFormValid = false;
            if (paymentEmailInput && !validateInput(paymentEmailInput)) isFormValid = false;

            if (!isFormValid) {
                displayFormStatus(paymentFormGlobalStatus, 'Please correct your name and email.', 'error', 'err_correct_form_errors_basic');
                return;
            }

            if(paymentSubmitButton) paymentSubmitButton.disabled = true;
            displayFormStatus(paymentFormGlobalStatus, 'Processing payment...', 'loading', 'payment_status_processing');

            const cardholderName = paymentCardholderNameInput.value;
            const email = paymentEmailInput.value;

            const { paymentMethod, error: pmError } = await stripe.createPaymentMethod({
                type: 'card',
                card: cardElement,
                billing_details: { name: cardholderName, email: email },
            });

            if (pmError) {
                displayFormStatus(paymentFormGlobalStatus, pmError.message, 'error');
                if (stripeCardErrors) stripeCardErrors.textContent = pmError.message;
                if(paymentSubmitButton) paymentSubmitButton.disabled = false;
                return;
            }
            if (stripeCardErrors) stripeCardErrors.textContent = ''; // Clear previous Stripe card errors

            // L184 & L220-L225: Critical point for payment processing.
            // Send paymentMethod.id and plan details to backend.
            const paymentDataForBackend = {
                payment_method_id: paymentMethod.id,
                plan_id: currentSelectedPlan.id, // This could be a course_id, module_id, or a specific subscription plan_id
                item_type: currentSelectedPlan.type, // e.g., 'course', 'module', 'plan'
                amount_usd: parseFloat(currentSelectedPlan.priceUsd), // Send amount for verification
                currency: 'usd', // Assuming prices are in USD, backend charges in USD
                billing_cycle: currentSelectedPlan.billingCycle,
                cardholder_name: cardholderName, // Optional, but good for records
                email: email // For receipt and user matching
            };

            try {
                console.log("Sending Payment Data to Backend (mcourseD):", paymentDataForBackend);
                // Endpoint: /api/payments/create-enrollment-stripe/ or /api/payments/subscribe/
                // Your backend will use the payment_method_id to create a PaymentIntent and confirm it, or create a subscription.
                const response = await window.uplasApi.fetchAuthenticated(
                    '/payments/create-enrollment-stripe/', // Adjust endpoint as per your backend
                    {
                        method: 'POST',
                        body: JSON.stringify(paymentDataForBackend),
                    }
                );

                const backendResult = await response.json();

                if (response.ok && backendResult.success) { // Assuming backend returns { success: true, ... }
                    displayFormStatus(paymentFormGlobalStatus, backendResult.message || 'Enrollment successful!', 'success', backendResult.message_key || "payment_status_success_enrollment");
                    cardElement.clear();
                    setTimeout(() => {
                        closePaymentModal();
                        // Potentially reload the page or parts of it to reflect new access
                        window.location.reload(); // Simple way to refresh access state
                    }, 3000);
                    // Optionally, dispatch an event or call a function to update UI for new enrollment
                    window.dispatchEvent(new CustomEvent('userEnrollmentChanged', { detail: { planId: currentSelectedPlan.id } }));
                } else {
                     displayFormStatus(paymentFormGlobalStatus, backendResult.detail || backendResult.message || 'Payment failed. Please try again or contact support.', 'error', backendResult.message_key || 'payment_status_error_generic');
                    if(paymentSubmitButton) paymentSubmitButton.disabled = false;
                }
            } catch (error) {
                console.error('Backend Payment Processing Error:', error);
                displayFormStatus(paymentFormGlobalStatus, error.message || 'A network error occurred during payment. Please try again.', 'error', 'payment_status_error_network');
                if(paymentSubmitButton) paymentSubmitButton.disabled = false;
            }
        });
    }

    // --- Masterclass Section Logic ---
    const renderMasterclasses = (masterclasses) => {
        if (!masterclassItemsContainer) return;
        masterclassItemsContainer.innerHTML = ''; // Clear existing
        if (!masterclasses || masterclasses.length === 0) {
            masterclassItemsContainer.innerHTML = '<p data-translate-key="mcourseD_no_masterclasses_available">No masterclasses available at the moment.</p>';
            if(window.uplasApplyTranslations) window.uplasApplyTranslations(masterclassItemsContainer);
            return;
        }

        masterclasses.forEach(mc => {
            const mcElement = document.createElement('div');
            mcElement.className = 'masterclass-item';
            // Adapt this HTML structure to match your design for a masterclass card
            mcElement.innerHTML = `
                <img src="${mc.thumbnail_url || 'assets/images/placeholder-masterclass.jpg'}" alt="${mc.title}" class="masterclass-item__thumbnail">
                <div class="masterclass-item__info">
                    <h4 class="masterclass-item__title">${mc.title}</h4>
                    <p class="masterclass-item__instructor">By: ${mc.instructor_name || 'Uplas Team'}</p>
                    <a href="umasterclass_detail.html?id=${mc.id}" class="button button--secondary button--small" data-translate-key="button_view_masterclass">View Masterclass</a>
                </div>
            `;
            masterclassItemsContainer.appendChild(mcElement);
        });
        if(window.uplasApplyTranslations) window.uplasApplyTranslations(masterclassItemsContainer);
    };

    const loadMasterclasses = async () => {
        if (!masterclassItemsContainer || !window.uplasApi || !window.uplasApi.fetchAuthenticated) {
             if(masterclassItemsContainer) masterclassItemsContainer.innerHTML = '<p data-translate-key="mcourseD_err_loading_masterclasses">Could not load masterclasses.</p>';
             if(window.uplasApplyTranslations && masterclassItemsContainer) window.uplasApplyTranslations(masterclassItemsContainer);
            return;
        }
        displayFormStatus(masterclassItemsContainer, 'Loading masterclasses...', 'loading', 'mcourseD_loading_masterclasses');

        try {
            // L258: loadMasterclasses
            // Action: API call to /api/masterclasses/
            const response = await window.uplasApi.fetchAuthenticated('/masterclasses/'); // Assuming this is the endpoint
            if (!response.ok) {
                const errorData = await response.json().catch(() => ({ detail: 'Failed to fetch masterclasses.' }));
                throw new Error(errorData.detail);
            }
            const masterclassesData = await response.json(); // Expects an array of masterclass objects
            renderMasterclasses(masterclassesData.results || masterclassesData); // Handle paginated or direct array response
            clearFormStatus(masterclassItemsContainer.querySelector('.payment-status-message')); // Clear loading message
        } catch (error) {
            console.error("Error loading masterclasses:", error);
            displayFormStatus(masterclassItemsContainer, `Error: ${error.message}`, 'error', 'mcourseD_err_loading_masterclasses_api');
        }
    };

    const checkUserAccessAndLoadMasterclasses = async () => {
        if (!masterclassGridContainer || !window.uplasApi || !window.uplasApi.fetchAuthenticated) {
            if (masterclassUpgradeCTAContainer) masterclassUpgradeCTAContainer.hidden = false; // Show upgrade if API fails
            return;
        }

        // Hide everything initially until access is determined
        if (masterclassItemsContainer) masterclassItemsContainer.hidden = true;
        if (masterclassNoAccessMessage) masterclassNoAccessMessage.hidden = true;
        if (masterclassUpgradeCTAContainer) masterclassUpgradeCTAContainer.hidden = true;


        try {
            // L258: checkUserAccessAndLoadMasterclasses
            // Action: API call to /api/users/me/access_details/ (or similar)
            // This endpoint should return user's entitlements, e.g., { "has_masterclass_access": true/false }
            const response = await window.uplasApi.fetchAuthenticated('/users/me/access_details/');
            if (!response.ok) {
                // Assume no access if status check fails, show upgrade CTA
                if (masterclassUpgradeCTAContainer) masterclassUpgradeCTAContainer.hidden = false;
                console.warn("Failed to check user masterclass access, assuming no access.");
                return;
            }
            const accessData = await response.json();

            if (accessData.has_masterclass_access) { // Adjust field name based on your backend response
                if (masterclassItemsContainer) masterclassItemsContainer.hidden = false;
                await loadMasterclasses();
            } else {
                if (masterclassNoAccessMessage) masterclassNoAccessMessage.hidden = false;
                if (masterclassUpgradeCTAContainer) masterclassUpgradeCTAContainer.hidden = false;
            }
        } catch (error) {
            console.error("Error checking user access for masterclasses:", error);
            if (masterclassUpgradeCTAContainer) masterclassUpgradeCTAContainer.hidden = false; // Fallback to showing upgrade CTA
        }
    };


    // --- Initializations ---
    const urlParams = new URLSearchParams(window.location.search);
    currentCourseIdFromURL = urlParams.get('courseId'); // Store for later use if needed
    if (currentCourseIdFromURL) {
        console.log("Loading details for course:", currentCourseIdFromURL);
        // You might want to fetch and display course-specific details here if not already static in HTML
        // e.g., await fetchCourseDetails(currentCourseIdFromURL);
    } else {
        console.warn("No courseId found in URL for mcourseD.js. Some features might be limited.");
    }

    // Load masterclasses based on user access
    if (masterclassGridContainer) { // Only run if the masterclass section exists on the page
        checkUserAccessAndLoadMasterclasses();
    }


    // const currentYearFooterSpan = document.getElementById('current-year-footer'); // Handled by global.js
    // if (currentYearFooterSpan) currentYearFooterSpan.textContent = new Date().getFullYear();

    console.log("Uplas Course Detail Page (mcourseD.js) with Stripe.js conceptual integration initialized.");
} // End of initializeCourseDetailPage


// --- DOMContentLoaded Main Execution ---
document.addEventListener('DOMContentLoaded', () => {
    // Ensure uplasApi is available from apiUtils.js
    if (typeof window.uplasApi === 'undefined' ||
        typeof window.uplasApi.getAccessToken !== 'function' ||
        typeof window.uplasApi.redirectToLogin !== 'function') {
        console.error('uplasApi or its required functions are not defined. Ensure apiUtils.js is loaded correctly before mcourseD.js.');
        const mainContentArea = document.getElementById('main-content-area') || document.body; // Fallback to body
        mainContentArea.innerHTML = '<p style="text-align:center; padding: 20px; color: red;" data-translate-key="error_auth_utility_missing">Core authentication utility is missing. Page cannot load correctly.</p>';
        if (typeof window.uplasApplyTranslations === 'function') window.uplasApplyTranslations(mainContentArea);
        return;
    }

    const authToken = window.uplasApi.getAccessToken();

    // Some parts of course detail might be public, but payment & masterclass access require auth.
    // For simplicity here, let's assume the whole page requires auth for its interactive elements.
    // Adjust this if parts of the page should be visible to non-logged-in users.
    if (!authToken) {
        console.log('User not authenticated for course detail page features. Redirecting to login.');
        const currentPath = window.location.pathname + window.location.search + window.location.hash;
        window.uplasApi.redirectToLogin(`Please log in to view course details and enroll. Original page: ${encodeURIComponent(currentPath)}`);
    } else {
        console.log('User authenticated. Initializing course detail page.');
        initializeCourseDetailPage();
    }
});
```

**Explanation of Changes and Key Points:**

1.  **`initializeStripe()`**:
    * Added a check for `Stripe` object availability.
    * If Stripe.js isn't loaded, it disables payment buttons and shows an error using the local `displayFormStatus`.
    * The placeholder `pk_test_YOUR_STRIPE_PUBLISHABLE_KEY` is still there. **You must replace this with your actual Stripe publishable key.**

2.  **`openPaymentModal(planData)`**:
    * Added a check for `stripeInitialized` before proceeding.
    * Added pre-filling of the email field in the payment modal if the user is logged in and `uplasApi.getUserData()` can provide it.

3.  **`unifiedCardPaymentForm` Submit Listener (Payment Processing)**:
    * **API Call**: Replaced the simulated backend call with:
        ```javascript
        const response = await window.uplasApi.fetchAuthenticated(
            '/payments/create-enrollment-stripe/', // Adjust if your endpoint is different
            {
                method: 'POST',
                body: JSON.stringify(paymentDataForBackend),
            }
        );
        const backendResult = await response.json();
        if (response.ok && backendResult.success) { /* ... success logic ... */ }
        ```
    * **`paymentDataForBackend`**: This object now includes:
        * `payment_method_id`: From `stripe.createPaymentMethod`.
        * `plan_id`: This is `currentSelectedPlan.id`. It could be a course ID, module ID, or a specific subscription plan ID from your database.
        * `item_type`: Added a `type` (e.g., 'course', 'module', 'plan') to `planData` when `openPaymentModal` is called. This helps the backend identify what the user is paying for.
        * `amount_usd`, `currency`, `billing_cycle`, `cardholder_name`, `email`.
    * **Success/Error Handling**: Uses `response.ok` and `backendResult.success` (assuming your backend returns a `success: true/false` field and a `message` or `detail` for errors). On success, it reloads the page as a simple way to reflect new access.
    * **`currentCourseIdFromURL`**: Stored the `courseId` from URL parameters to be potentially included in `paymentDataForBackend` if `currentSelectedPlan.id` isn't sufficient (e.g., if `plan_id` refers to a generic plan type and you also need the specific course context).

4.  **`checkUserAccessAndLoadMasterclasses()`**:
    * **API Call for Access Check**:
        ```javascript
        const response = await window.uplasApi.fetchAuthenticated('/users/me/access_details/');
        // ...
        if (accessData.has_masterclass_access) { /* ... load masterclasses ... */ }
        ```
        This assumes your backend has an endpoint (e.g., `/api/users/me/access_details/`) that returns the user's entitlements, including a boolean like `has_masterclass_access`. You'll need to create this endpoint in your Django `users` app if it doesn't exist. It might check the user's active subscriptions or purchased courses.
    * UI elements (`masterclassItemsContainer`, `masterclassNoAccessMessage`, `masterclassUpgradeCTAContainer`) are hidden/shown based on the access status.

5.  **`loadMasterclasses()`**:
    * **API Call for Masterclass List**:
        ```javascript
        const response = await window.uplasApi.fetchAuthenticated('/masterclasses/');
        // ...
        const masterclassesData = await response.json();
        renderMasterclasses(masterclassesData.results || masterclassesData); // Handles DRF pagination or direct array
        ```
        This fetches data from `/api/masterclasses/`. Your `MasterclassSerializer` in Django should provide fields like `id`, `title`, `thumbnail_url`, `instructor_name`.
    * **`renderMasterclasses()`**: A new helper function to populate the masterclass grid.

6.  **Initial Authentication Check**:
    * The `DOMContentLoaded` listener at the bottom now uses `window.uplasApi.getAccessToken()` and `window.uplasApi.redirectToLogin()` for consistency and to leverage the improved redirect messaging.
    * It includes a more robust check for the availability of `uplasApi` and its required functions.

**Important Next Steps & Considerations:**

* **Replace Stripe Key**: Update `'pk_test_YOUR_STRIPE_PUBLISHABLE_KEY'` with your actual key.
* **Backend Endpoints**:
    * Verify/create the backend endpoint for payment processing (e.g., `/api/payments/create-enrollment-stripe/`). This endpoint will receive the `payment_method_id` and plan details, then use your Stripe *secret key* to create and confirm a PaymentIntent or set up a subscription.
    * Verify/create the backend endpoint for user access details (e.g., `/api/users/me/access_details/`) to return `has_masterclass_access`.
    * Ensure the `/api/masterclasses/` endpoint returns the necessary data.
* **Data Structures**: Match the `paymentDataForBackend` structure and the expected masterclass data structure with what your backend expects and provides.
* **Error Handling**: Enhance user-facing error messages from the backend. The current code uses `backendResult.detail || backendResult.message`.
* **UI Updates Post-Payment**: After a successful payment, `window.location.reload()` is a simple approach. For a more SPA-like experience, you'd dynamically update the UI to reflect the new enrollment/access without a full page reload (e.g., by re-calling `checkUserAccessAndLoadMasterclasses` or fetching updated course enrollment status).
* **Course Details**: The `currentCourseIdFromURL` is captured. If the main content of the course detail page (curriculum, description, etc.) is also dynamic, you'd add another `fetchAuthenticated` call in `initializeCourseDetailPage` to get this data based on `currentCourseIdFromURL`.

This version of `mcourseD.js` should correctly integrate the specified payment and masterclass functionalities with your backend via the `uplasApi`. Remember to test thorough
