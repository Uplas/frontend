// js/upricing.js
/* ==========================================================================
   Uplas Pricing Page Specific JavaScript (upricing.js)
   - Handles plan selection, payment modal triggering (Card via Stripe.js concept), contact form.
   - Relies on global.js for theme, nav, language, currency.
   - Assumes apiUtils.js (for fetchAuthenticated) and i18n.js (for uplasTranslate) are loaded.
   ========================================================================== */
'use strict';

document.addEventListener('DOMContentLoaded', () => {
    // --- Element Selectors ---
    const contactForm = document.getElementById('contact-form');
    const contactStatusDiv = document.getElementById('contact-status');
    const selectPlanButtons = document.querySelectorAll('.select-plan-btn');
    const contactSalesButton = document.querySelector('.enterprise-contact-sales-btn');

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

    const stripeCardElementContainer = document.getElementById('stripe-card-element');
    const stripeCardErrors = document.getElementById('stripe-card-errors');

    // --- State ---
    let isModalOpen = false;
    let currentSelectedPlan = null;
    let stripe = null;
    let cardElement = null;

    // --- Initialize Stripe ---
    function initializeStripe() {
        if (typeof Stripe === 'undefined') {
            console.error('Stripe.js has not been loaded. Payment functionality will be limited.');
            if (paymentSubmitButton) paymentSubmitButton.disabled = true;
            selectPlanButtons.forEach(btn => btn.disabled = true);
            // Error can be shown if user tries to open modal
            return false;
        }
        // L56: Action: The Stripe public key pk_test_YOUR_STRIPE_PUBLISHABLE_KEY needs to be correctly set.
        // IMPORTANT: Replace with your actual Stripe publishable key from your Stripe dashboard
        // Consider using a configuration variable for this key, e.g., window.UPLAS_CONFIG.STRIPE_PUBLIC_KEY
        const stripePublicKey = (typeof window.UPLAS_CONFIG !== 'undefined' && window.UPLAS_CONFIG.STRIPE_PUBLIC_KEY)
            ? window.UPLAS_CONFIG.STRIPE_PUBLIC_KEY
            : 'pk_test_YOUR_STRIPE_PUBLISHABLE_KEY'; // Fallback, ensure this is replaced

        if (stripePublicKey === 'pk_test_YOUR_STRIPE_PUBLISHABLE_KEY') {
            console.warn("Stripe.js: Using placeholder public key. Please replace with your actual Stripe key.");
            if(paymentFormGlobalStatus) displayFormStatus(paymentFormGlobalStatus, 'Payment system configuration error.', 'error', 'err_payment_config_missing');
        }

        stripe = Stripe(stripePublicKey);
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
             console.error("Stripe card element container '#stripe-card-element' not found.");
             if(paymentFormGlobalStatus) displayFormStatus(paymentFormGlobalStatus, 'Payment UI is missing. Please contact support.', 'error', 'err_payment_ui_stripe_missing');
             return false;
        }
        return true;
    }
    const stripeInitialized = initializeStripe();

    // --- Utility Functions (using local versions for this file) ---
    const displayFormStatus = (element, message, type, translateKey = null, variables = {}) => {
        if (!element) return;
        let text = message;
        if (translateKey && typeof window.uplasTranslate === 'function') {
            text = window.uplasTranslate(translateKey, { fallback: message, variables });
        } else if (translateKey) { // Fallback if uplasTranslate not ready but key provided
            text = message || translateKey.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
        }


        element.innerHTML = text;
        element.className = 'form__status payment-status-message'; // Reset classes
        if (type === 'loading' && !element.querySelector('.fa-spinner')) {
             element.innerHTML = `<i class="fas fa-spinner fa-spin"></i> ${text}`;
        }
        if (type) element.classList.add(`form__status--${type}`);
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

    const validateInput = (inputElement) => { /* ... (same as upricing (9).js) ... */
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

                const errorKey = inputElement.dataset.errorKeyRequired || inputElement.dataset.errorKeyPattern || inputElement.dataset.errorKeyType || (inputElement.name ? `${inputElement.name}_error` : 'input_error_generic');
                errorSpan.textContent = (typeof window.uplasTranslate === 'function' && errorKey) ?
                                        window.uplasTranslate(errorKey, {fallback: defaultMessage}) : defaultMessage;
            }
            return false;
        }
        return true;
    };
    const focusFirstElement = (container) => { /* ... (same as upricing (9).js) ... */ };


    // --- Payment Modal Logic ---
    function updatePaymentModalSummary() { /* ... (same as upricing (9).js) ... */ }
    function openPaymentModal(planData) { /* ... (same as upricing (9).js, but added prefill for email) ... */
        if (!paymentModal) {
            alert("Payment modal element not found."); return;
        }
        if (!stripeInitialized) {
            displayFormStatus(paymentFormGlobalStatus || document.body, 'Payment system is currently unavailable. Please try again later.', 'error', 'err_payment_system_unavailable_stripe');
            return;
        }
        currentSelectedPlan = planData;
        updatePaymentModalSummary();

        if (paymentSubmitButton) {
            const buttonTextKey = 'payment_modal_submit_pay_now';
            const buttonText = (typeof window.uplasTranslate === 'function') ?
                               window.uplasTranslate(buttonTextKey, {fallback: 'Pay Now'}) : 'Pay Now';
            paymentSubmitButton.innerHTML = `<i class="fas fa-shield-alt"></i> ${buttonText}`;
            paymentSubmitButton.disabled = false;
        }
        if(paymentFormGlobalStatus) clearFormStatus(paymentFormGlobalStatus);
        if(stripeCardErrors) stripeCardErrors.textContent = '';

        unifiedCardPaymentForm?.reset();
        cardElement?.clear();
        unifiedCardPaymentForm?.querySelectorAll('.invalid').forEach(el => el.classList.remove('invalid'));

        // Pre-fill email if user is logged in and uplasApi is available
        if (typeof window.uplasApi !== 'undefined' && window.uplasApi.getUserData && paymentEmailInput) {
            const userData = window.uplasApi.getUserData(); // From apiUtils.js
            if (userData && userData.email) {
                paymentEmailInput.value = userData.email;
            }
        }

        paymentModal.hidden = false;
        document.body.style.overflow = 'hidden';
        setTimeout(() => {
            paymentModal.classList.add('active');
             if (paymentCardholderNameInput) paymentCardholderNameInput.focus();
             else focusFirstElement(paymentModal);
        }, 10);
        isModalOpen = true;
    }
    function closePaymentModal() { /* ... (same as upricing (9).js) ... */ }


    // --- Event Listeners ---
    selectPlanButtons.forEach(button => { /* ... (same as upricing (9).js) ... */ });
    if (contactSalesButton && typeof window.uplasScrollToElement === 'function') { /* ... (same as upricing (9).js) ... */ }
    if (closeModalButton) closeModalButton.addEventListener('click', closePaymentModal);
    document.addEventListener('keydown', (event) => { if (event.key === 'Escape' && isModalOpen) closePaymentModal(); });
    paymentModal?.addEventListener('click', (event) => { if (event.target === paymentModal) closePaymentModal(); });

    if (unifiedCardPaymentForm && stripeInitialized) {
        unifiedCardPaymentForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            if (!currentSelectedPlan || !cardElement) {
                displayFormStatus(paymentFormGlobalStatus, 'Payment system error or no plan selected.', 'error', 'err_payment_system_or_plan');
                return;
            }
            if (typeof window.uplasApi === 'undefined' || typeof window.uplasApi.fetchAuthenticated !== 'function') {
                displayFormStatus(paymentFormGlobalStatus, 'Payment service unavailable. Please try again later.', 'error', 'error_service_unavailable');
                return;
            }

            let isFormValid = true;
            if (paymentCardholderNameInput && !validateInput(paymentCardholderNameInput)) isFormValid = false;
            if (paymentEmailInput && !validateInput(paymentEmailInput)) isFormValid = false;

            if (!isFormValid) {
                displayFormStatus(paymentFormGlobalStatus, 'Please correct your name and email fields.', 'error', 'err_correct_form_errors_basic');
                return;
            }

            if (paymentSubmitButton) paymentSubmitButton.disabled = true;
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
                if (paymentSubmitButton) paymentSubmitButton.disabled = false;
                return;
            }
            if (stripeCardErrors) stripeCardErrors.textContent = '';

            const paymentDataForBackend = {
                plan_id: currentSelectedPlan.id, // Plan ID from your backend (e.g., 'starter_monthly', 'pro_annual')
                payment_method_id: paymentMethod.id, // Stripe PaymentMethod ID
                email: email, // For receipt and user matching on backend
                // Optionally include other details if your backend needs them:
                // plan_name: currentSelectedPlan.name,
                // amount_usd: parseFloat(currentSelectedPlan.priceUsd),
                // currency: 'usd',
                // billing_cycle: currentSelectedPlan.billingCycle,
                // cardholder_name: cardholderName,
            };

            try {
                console.log("Sending Payment Data (Stripe Method ID) to Backend:", paymentDataForBackend);
                // L190: unifiedCardPaymentForm submit
                // L232-L236: Action: Send paymentMethod.id and order details to Django backend.
                // Endpoint: /api/payments/create-subscription-stripe/ or /api/payments/charge/
                // Your backend's StripeSubscriptionCreateView or a similar view for one-time payments
                const response = await window.uplasApi.fetchAuthenticated(
                    '/payments/create-subscription-stripe/', // Adjust if it's a one-time charge
                    {
                        method: 'POST',
                        body: JSON.stringify(paymentDataForBackend)
                    }
                );
                const backendResult = await response.json();

                if (response.ok && backendResult.success) { // Assuming backend returns { success: true, ... }
                    displayFormStatus(paymentFormGlobalStatus, backendResult.message || 'Subscription successful! Thank you.', 'success', 'payment_status_success_subscription');
                    cardElement.clear();
                    setTimeout(() => {
                        closePaymentModal();
                        // Optionally, redirect or update UI to reflect active subscription
                        // window.location.href = '/dashboard?subscription_activated=' + currentSelectedPlan.id;
                        // Or dispatch an event for global.js to update user status
                        window.dispatchEvent(new CustomEvent('userSubscriptionChanged', { detail: { planId: currentSelectedPlan.id } }));
                    }, 3000);
                } else if (backendResult.requires_action && backendResult.client_secret) {
                    // Handle cases where Stripe requires further client-side action (e.g., 3D Secure)
                    console.log("Stripe requires further action. Client Secret:", backendResult.client_secret);
                    const { error: confirmError } = await stripe.confirmCardPayment(backendResult.client_secret);
                    if (confirmError) {
                        displayFormStatus(paymentFormGlobalStatus, confirmError.message, 'error');
                        if (paymentSubmitButton) paymentSubmitButton.disabled = false;
                    } else {
                        // Payment successful after authentication
                        displayFormStatus(paymentFormGlobalStatus, 'Payment successful after authentication!', 'success', "payment_status_success_authenticated");
                        cardElement.clear();
                        setTimeout(() => {
                            closePaymentModal();
                            window.dispatchEvent(new CustomEvent('userSubscriptionChanged', { detail: { planId: currentSelectedPlan.id } }));
                        }, 3000);
                    }
                } else { // General failure from backend
                    throw new Error(backendResult.detail || backendResult.message || 'Payment processing failed. Please try again.');
                }
            } catch (error) {
                console.error('Payment Submission to Backend Error:', error);
                displayFormStatus(paymentFormGlobalStatus, error.message, 'error', 'payment_status_error_network');
                if (paymentSubmitButton) paymentSubmitButton.disabled = false;
            }
        });
    }

    // Contact Form Submission
    if (contactForm) {
        contactForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            if(contactStatusDiv) clearFormStatus(contactStatusDiv);
            let isFormValid = true;
            contactForm.querySelectorAll('input[required], select[required], textarea[required]').forEach(input => {
                if (!validateInput(input)) isFormValid = false;
            });

            if (!isFormValid) {
                displayFormStatus(contactStatusDiv, 'Please correct the errors above.', 'error', 'err_correct_form_errors');
                return;
            }

            const submitButton = contactForm.querySelector('button[type="submit"]');
            if (submitButton) submitButton.disabled = true;
            displayFormStatus(contactStatusDiv, 'Sending your message...', 'loading', 'contact_status_sending');

            const formData = new FormData(contactForm);
            const data = Object.fromEntries(formData.entries());

            // Ensure uplasApi is available for contact form too, though it might be a public endpoint
            if (typeof window.uplasApi === 'undefined' || typeof window.uplasApi.fetchAuthenticated !== 'function') {
                displayFormStatus(contactStatusDiv, 'Service unavailable. Please try again later.', 'error', 'error_service_unavailable');
                if (submitButton) submitButton.disabled = false;
                return;
            }

            try {
                // L261: contactForm.addEventListener
                // L279: Action: Replace simulation with an API call to /api/contact/submit/.
                // Assuming /api/core/contact/ as per backend urls.py
                const response = await window.uplasApi.fetchAuthenticated(
                    '/core/contact/', // Endpoint from your backend's core app
                    {
                        method: 'POST',
                        body: JSON.stringify(data),
                        // isPublic: true // Add this if fetchAuthenticated supports it and endpoint is public
                    }
                );
                const result = await response.json();

                if (response.ok && result.success) { // Assuming backend returns { success: true, message: "..." }
                    displayFormStatus(contactStatusDiv, result.message || "Message sent successfully! We'll be in touch.", 'success', result.message_key || "contact_status_success");
                    contactForm.reset();
                } else {
                    throw new Error(result.detail || result.message || 'Failed to send message. Please try again.');
                }
            } catch (error) {
                console.error('Contact Form Submission Error:', error);
                displayFormStatus(contactStatusDiv, error.message, 'error', 'contact_status_error_network');
            } finally {
                if (submitButton) submitButton.disabled = false;
            }
        });
        contactForm.querySelectorAll('input[required], select[required], textarea[required]').forEach(input => {
            input.addEventListener('input', () => validateInput(input));
        });
    }

    console.log("Uplas Pricing Page (upricing.js) API integrated and initialized.");
});
```

**Key Changes and Explanations:**

1.  **`initializeStripe()` (L56)**:
    * **Stripe Public Key**: It now tries to get the Stripe public key from `window.UPLAS_CONFIG.STRIPE_PUBLIC_KEY`. If not found, it falls back to the placeholder. **You must set this configuration variable globally or replace the placeholder directly.** A warning is logged if the placeholder is still in use.
    * Error handling for Stripe.js not loading or the card element container missing has been slightly improved to use `displayFormStatus`.

2.  **`openPaymentModal(planData)`**:
    * Added pre-filling of the email input (`paymentEmailInput`) if `window.uplasApi.getUserData()` is available and returns user data with an email.

3.  **`unifiedCardPaymentForm` Submit Listener (L190, L232-L236)**:
    * **API Call**: The simulated backend call is replaced with:
        ```javascript
        const response = await window.uplasApi.fetchAuthenticated(
            '/payments/create-subscription-stripe/', // Or your specific payment endpoint
            {
                method: 'POST',
                body: JSON.stringify(paymentDataForBackend)
            }
        );
        const backendResult = await response.json();
        ```
    * **Endpoint**: Uses `/api/payments/create-subscription-stripe/`. Your backend `StripeSubscriptionCreateView` (in `apps/payments/views.py`) is designed to handle subscription creation. If you also need to handle one-time charges for courses/modules (not just subscriptions), you might need a different endpoint (e.g., `/api/payments/charge/`) or modify the existing one to handle different product types.
    * **`paymentDataForBackend`**: This object now sends `plan_id` (which should correspond to a `SubscriptionPlan.plan_id` or a similar identifier your backend expects for Stripe), `payment_method_id`, and `email`. Other details like `planName`, `amountUSD` are commented out but can be included if your backend needs them for verification or record-keeping.
    * **Response Handling**:
        * Checks for `response.ok && backendResult.success`.
        * Handles `backendResult.requires_action && backendResult.client_secret` for cases where Stripe requires further client-side steps (like 3D Secure authentication using `stripe.confirmCardPayment`).
        * Displays success or error messages using `displayFormStatus`.
        * On success, it dispatches a `userSubscriptionChanged` event, which `global.js` or other parts of your application could listen to for UI updates.

4.  **`contactForm` Submit Listener (L261, L279)**:
    * **API Call**: Replaced `console.log` with:
        ```javascript
        const response = await window.uplasApi.fetchAuthenticated(
            '/core/contact/', // Endpoint from your backend's core app (ContactMessageCreateView)
            {
                method: 'POST',
                body: JSON.stringify(data),
                // isPublic: true // Consider if this endpoint is public
            }
        );
        const result = await response.json();
        ```
    * **Endpoint**: Uses `/api/core/contact/` which matches your `ContactMessageCreateView` in `apps/core/views.py`.
    * **Authentication**: It uses `fetchAuthenticated`. If your contact form is public and doesn't require users to be logged in, you might:
        * Make the `/api/core/contact/` endpoint public on the backend (e.g., `permission_classes = [AllowAny]`).
        * Modify `fetchAuthenticated` in `apiUtils.js` to accept an `isPublic: true` option to skip sending the `Authorization` header.
        * Or use a direct `fetch()` call here if `uplasApi` is not strictly needed for this public endpoint.
    * **Response Handling**: Assumes the backend returns `{ success: true, message: "..." }` on successful submission.

**Important Reminders & Next Steps:**

* **Stripe Public Key**: **Crucially, replace `'pk_test_YOUR_STRIPE_PUBLISHABLE_KEY'`** with your actual Stripe publishable key. Consider setting it via `window.UPLAS_CONFIG.STRIPE_PUBLIC_KEY` as shown in the code.
* **Backend Payment Endpoint (`/api/payments/create-subscription-stripe/`)**:
    * Ensure this endpoint in your Django `apps/payments/views.py` (`StripeSubscriptionCreateView`) correctly:
        * Retrieves or creates a Stripe Customer ID for the authenticated Uplas user.
        * Uses the `payment_method_id` from the frontend to attach it to the customer or use it for the subscription/charge.
        * Creates a Stripe Subscription (or Charge for one-time payments) using your Stripe **secret key**.
        * Handles potential errors from Stripe (e.g., card declines, insufficient funds) and returns appropriate error messages to the frontend.
        * If dealing with Payment Intents that require SCA (Strong Customer Authentication), it should return `requires_action: true` and the `client_secret` for the PaymentIntent, as partially handled in the frontend code.
        * Returns a clear success or failure response, ideally with a `success: true/false` field and a user-friendly `message` or `detail`.
* **Backend Contact Endpoint (`/api/core/contact/`)**:
    * Ensure your `ContactMessageCreateView` in `apps/core/views.py` correctly saves the contact message and returns a success response (e.g., `{ "success": true, "message": "Your message has been sent!" }`).
* **Error Handling**: Review the error messages returned by your backend and ensure the frontend displays them clearly.
* **UI Updates Post-Payment**: After a successful payment, the current code dispatches a `userSubscriptionChanged` event and then reloads the page (for `mcourseD.js`). You might want a more sophisticated UI update without a full reload, especially if it's a Single Page Application (SPA).
* **Security**: Always handle sensitive operations like payment processing on the backend. The frontend should only collect payment information and send a tokenized representation (like Stripe's `paymentMethod.id`) to your server. **Never expose your Stripe secret key in frontend code.**

This updated `upricing.js` should now correctly integrate with your backend for handling payments and contact form submissions. Remember to test all flows thoroughly, including successful payments, card declines, and other error scenari
