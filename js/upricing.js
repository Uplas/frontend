// js/upricing.js
/* ==========================================================================
   Uplas Pricing Page Specific JavaScript (upricing.js)
   - Handles plan selection, payment modal triggering (Card via Stripe.js), contact form.
   - Relies on global.js for theme, nav, language, currency.
   - Assumes apiUtils.js (for fetchAuthenticated) and i18n.js (for uplasTranslate) are loaded.
   ========================================================================== */
'use strict';

document.addEventListener('DOMContentLoaded', () => {
    // --- Element Selectors ---
    const contactForm = document.getElementById('contact-form');
    const contactStatusDiv = document.getElementById('contact-status');
    const selectPlanButtons = document.querySelectorAll('.select-plan-btn'); // Includes course detail page buttons if on that page
    const contactSalesButton = document.querySelector('.enterprise-contact-sales-btn');

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

    // --- Global Utilities from window scope ---
    const { uplasApi, uplasTranslate, uplasScrollToElement, formatPriceForDisplay, uplasGetCurrentLocale } = window;

    // --- State ---
    let isModalOpen = false;
    let currentSelectedPlan = null;
    let stripe = null;
    let cardElement = null;

    // --- Initialize Stripe ---
    function initializeStripe() {
        if (typeof Stripe === 'undefined') {
            console.error('upricing.js: Stripe.js has not been loaded. Payment functionality will be limited.');
            if (paymentSubmitButton) paymentSubmitButton.disabled = true;
            selectPlanButtons.forEach(btn => btn.disabled = true);
            if (paymentFormGlobalStatus) localDisplayFormStatus(paymentFormGlobalStatus, 'Payment system unavailable.', 'error', 'err_payment_system_unavailable_stripe');
            return false;
        }

        const stripePublicKey = (typeof window.UPLAS_CONFIG !== 'undefined' && window.UPLAS_CONFIG.STRIPE_PUBLIC_KEY)
            ? window.UPLAS_CONFIG.STRIPE_PUBLIC_KEY
            : 'pk_test_YOUR_STRIPE_PUBLISHABLE_KEY'; // FALLBACK - **REPLACE THIS IN PRODUCTION/TESTING**

        if (stripePublicKey === 'pk_test_YOUR_STRIPE_PUBLISHABLE_KEY') {
            console.warn("upricing.js: Stripe.js: Using placeholder public key. Payments will FAIL. Please replace with your actual Stripe key in UPLAS_CONFIG or directly.");
            if (paymentFormGlobalStatus) localDisplayFormStatus(paymentFormGlobalStatus, 'Payment system configuration error. Please contact support.', 'error', 'err_payment_config_missing');
            // Disable payment buttons if using placeholder key
            if (paymentSubmitButton) paymentSubmitButton.disabled = true;
            selectPlanButtons.forEach(btn => btn.disabled = true); // Disable all plan selection buttons too
            return false; // Crucial: stop further Stripe setup if key is placeholder
        }

        try {
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
                console.error("upricing.js: Stripe card element container '#stripe-card-element' not found.");
                if (paymentFormGlobalStatus) localDisplayFormStatus(paymentFormGlobalStatus, 'Payment UI is missing elements. Please contact support.', 'error', 'err_payment_ui_stripe_missing');
                return false;
            }
        } catch (error) {
            console.error("upricing.js: Error initializing Stripe elements:", error);
            if (paymentFormGlobalStatus) localDisplayFormStatus(paymentFormGlobalStatus, 'Payment system failed to initialize. Please try again later.', 'error', 'err_stripe_init_failed');
            return false;
        }
        return true;
    }
    const stripeInitialized = initializeStripe();

    // --- Local Utility Functions (using uplasTranslate if available) ---
    const localDisplayFormStatus = (element, message, typeOrIsError, translateKey = null, variables = {}) => {
        // This local version is kept for upricing.js specific needs if uplasApi.displayFormStatus is not sufficient
        // or if this page has unique status display requirements.
        if (!element) return;
        const isError = typeof typeOrIsError === 'boolean' ? typeOrIsError : typeOrIsError === 'error';
        const statusType = typeof typeOrIsError === 'string' ? typeOrIsError : (isError ? 'error' : 'success');

        let text = message;
        if (translateKey && uplasTranslate) {
            text = uplasTranslate(translateKey, { fallback: message, variables });
        }

        element.innerHTML = text; // Use innerHTML for spinner if type is 'loading'
        element.className = 'form__status payment-status-message'; // Reset classes
        if (statusType === 'loading' && !element.querySelector('.fa-spinner')) {
             element.innerHTML = `<i class="fas fa-spinner fa-spin"></i> ${text}`;
        }
        element.classList.add(`form__status--${statusType}`); // e.g., form__status--error
        element.style.display = 'block';
        element.hidden = false;
        element.setAttribute('aria-live', isError ? 'assertive' : 'polite');

        // Auto-hide for success messages, not for errors or loading
        if (statusType === 'success') {
            setTimeout(() => {
                if (element) {
                    element.style.display = 'none';
                    element.textContent = '';
                }
            }, 7000);
        }
    };

    const localClearFormStatus = (element) => {
        if (!element) return;
        element.textContent = '';
        element.style.display = 'none';
        element.hidden = true;
        element.className = 'form__status payment-status-message';
    };

    const localValidateInput = (inputElement) => {
        const group = inputElement.closest('.form__group');
        if (!group) return inputElement.checkValidity();
        const errorSpan = group.querySelector('.form__error-message');
        inputElement.classList.remove('invalid');
        if (errorSpan) errorSpan.textContent = '';

        if (!inputElement.checkValidity()) {
            inputElement.classList.add('invalid');
            if (errorSpan) {
                let defaultMessage = inputElement.validationMessage;
                if (inputElement.validity.valueMissing) defaultMessage = "This field is required.";
                else if (inputElement.validity.patternMismatch) defaultMessage = inputElement.title || "Please match the requested format.";
                else if (inputElement.validity.typeMismatch) defaultMessage = `Please enter a valid ${inputElement.type}.`;

                const errorKey = inputElement.dataset.errorKeyRequired || inputElement.dataset.errorKeyPattern || inputElement.dataset.errorKeyType || (inputElement.name ? `error_${inputElement.name.toLowerCase()}_invalid` : 'input_error_generic');
                errorSpan.textContent = (uplasTranslate && errorKey) ?
                                        uplasTranslate(errorKey, { fallback: defaultMessage }) : defaultMessage;
            }
            return false;
        }
        return true;
    };
    const localFocusFirstElement = (container) => {
         if (!container) return;
        const focusable = container.querySelector('input:not([disabled]), select:not([disabled]), textarea:not([disabled]), button:not([disabled])');
        focusable?.focus();
    };


    // --- Payment Modal Logic ---
    function updatePaymentModalSummary() {
        if (!currentSelectedPlan || !summaryPlanNameEl || !summaryPlanPriceEl || !summaryBillingCycleDiv || !summaryBillingCycleEl) return;

        summaryPlanNameEl.textContent = currentSelectedPlan.name || 'Selected Plan';
        const price = parseFloat(currentSelectedPlan.priceUsd);
        const activeCurrency = window.currentGlobalCurrency || 'USD';
        const formattedPrice = (formatPriceForDisplay)
            ? formatPriceForDisplay(price, activeCurrency)
            : `${activeCurrency} ${price.toFixed(2)}`;
        summaryPlanPriceEl.textContent = formattedPrice;
        summaryPlanPriceEl.dataset.priceUsd = price.toString();

        if (currentSelectedPlan.billingCycle && currentSelectedPlan.billingCycle.toLowerCase() !== 'one-time') {
            const billingCycleKey = `billing_cycle_${currentSelectedPlan.billingCycle.toLowerCase()}`;
            summaryBillingCycleEl.textContent = (uplasTranslate) ? uplasTranslate(billingCycleKey, {fallback: currentSelectedPlan.billingCycle}) : currentSelectedPlan.billingCycle;
            summaryBillingCycleDiv.hidden = false;
        } else {
            summaryBillingCycleDiv.hidden = true;
        }
    }

    function openPaymentModal(planData) {
        if (!paymentModal) {
            alert(uplasTranslate ? uplasTranslate('error_payment_modal_missing', {fallback:"Payment modal not found."}) : "Payment modal not found."); return;
        }
        if (!stripeInitialized) { // Stripe key might be missing or Stripe.js failed to load
            localDisplayFormStatus(paymentFormGlobalStatus || document.body, '', 'error', 'err_payment_system_unavailable_stripe');
            return;
        }
        currentSelectedPlan = planData;
        updatePaymentModalSummary();

        if (paymentSubmitButton) {
            const buttonText = (uplasTranslate) ? uplasTranslate('payment_modal_submit_pay_now', {fallback: 'Pay Now'}) : 'Pay Now';
            paymentSubmitButton.innerHTML = `<i class="fas fa-shield-alt"></i> ${buttonText}`;
            paymentSubmitButton.disabled = false;
        }
        if(paymentFormGlobalStatus) localClearFormStatus(paymentFormGlobalStatus);
        if(stripeCardErrors) stripeCardErrors.textContent = '';

        unifiedCardPaymentForm?.reset();
        cardElement?.clear();
        unifiedCardPaymentForm?.querySelectorAll('.invalid').forEach(el => el.classList.remove('invalid'));

        if (uplasApi && uplasApi.getUserData && paymentEmailInput) {
            const userData = uplasApi.getUserData();
            if (userData && userData.email) {
                paymentEmailInput.value = userData.email;
            }
        }

        paymentModal.hidden = false;
        document.body.classList.add('modal-open'); // Prevent background scroll
        setTimeout(() => {
            paymentModal.classList.add('active');
            if (paymentCardholderNameInput) paymentCardholderNameInput.focus();
            else localFocusFirstElement(paymentModal);
        }, 10);
        isModalOpen = true;
    }

    function closePaymentModal() {
        if (!paymentModal) return;
        paymentModal.classList.remove('active');
        document.body.classList.remove('modal-open');
        setTimeout(() => { paymentModal.hidden = true; }, 300);
        isModalOpen = false;
        currentSelectedPlan = null;
    }

    // --- Event Listeners ---
    selectPlanButtons.forEach(button => {
        button.addEventListener('click', (event) => {
            event.preventDefault();
            if (!stripeInitialized) { // Double check if Stripe failed earlier
                localDisplayFormStatus(paymentFormGlobalStatus || document.body, '', 'error', 'err_payment_system_unavailable_stripe');
                return;
            }
            const planData = {
                id: button.dataset.planId,
                name: button.dataset.name,
                priceUsd: button.dataset.priceUsd,
                billingCycle: button.dataset.billingCycle,
                // Add item_type if distinguishing between subscriptions and one-time course/module purchases
                // item_type: button.dataset.itemType || (button.dataset.planId.startsWith('course_') ? 'course' : 'plan')
            };
            if (!planData.id || !planData.name || !planData.priceUsd || isNaN(parseFloat(planData.priceUsd))) {
                alert(uplasTranslate ? uplasTranslate('err_price_info_missing', {fallback:"Error: Plan information is incomplete."}) : "Error: Plan information is incomplete.");
                return;
            }
            openPaymentModal(planData);
        });
    });

    if (contactSalesButton && uplasScrollToElement) {
        contactSalesButton.addEventListener('click', (e) => {
            e.preventDefault();
            uplasScrollToElement('#contact-section');
        });
    }
    if (closeModalButton) closeModalButton.addEventListener('click', closePaymentModal);
    document.addEventListener('keydown', (event) => { if (event.key === 'Escape' && isModalOpen) closePaymentModal(); });
    paymentModal?.addEventListener('click', (event) => { if (event.target === paymentModal) closePaymentModal(); });

    if (unifiedCardPaymentForm && stripeInitialized) {
        unifiedCardPaymentForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            if (!currentSelectedPlan || !cardElement) {
                localDisplayFormStatus(paymentFormGlobalStatus, '', 'error', 'err_payment_system_or_plan');
                return;
            }
            if (!uplasApi || !uplasApi.fetchAuthenticated) {
                localDisplayFormStatus(paymentFormGlobalStatus, '', 'error', 'error_service_unavailable');
                return;
            }

            let isFormValid = true;
            if (paymentCardholderNameInput && !localValidateInput(paymentCardholderNameInput)) isFormValid = false;
            if (paymentEmailInput && !localValidateInput(paymentEmailInput)) isFormValid = false;

            if (!isFormValid) {
                localDisplayFormStatus(paymentFormGlobalStatus, '', 'error', 'err_correct_form_errors_basic');
                return;
            }

            if (paymentSubmitButton) paymentSubmitButton.disabled = true;
            localDisplayFormStatus(paymentFormGlobalStatus, '', 'loading', 'payment_status_processing');

            const cardholderName = paymentCardholderNameInput.value;
            const email = paymentEmailInput.value;

            try {
                const { paymentMethod, error: pmError } = await stripe.createPaymentMethod({
                    type: 'card', card: cardElement, billing_details: { name: cardholderName, email: email },
                });

                if (pmError) {
                    localDisplayFormStatus(paymentFormGlobalStatus, pmError.message, 'error'); // Stripe provides good messages
                    if (stripeCardErrors) stripeCardErrors.textContent = pmError.message;
                    if (paymentSubmitButton) paymentSubmitButton.disabled = false;
                    return;
                }
                if (stripeCardErrors) stripeCardErrors.textContent = '';

                const paymentDataForBackend = {
                    plan_id: currentSelectedPlan.id,
                    payment_method_id: paymentMethod.id,
                    email: email,
                    // Optionally include for verification by backend or specific logic:
                    // item_name: currentSelectedPlan.name,
                    // amount_usd: parseFloat(currentSelectedPlan.priceUsd),
                    // currency: 'USD',
                    // billing_cycle: currentSelectedPlan.billingCycle,
                };

                console.log("upricing.js: Sending Payment Data to Backend:", paymentDataForBackend);
                // Backend endpoint for creating subscriptions
                // This might vary if you have different types of purchases (one-time vs. subscription)
                const paymentEndpoint = currentSelectedPlan.billingCycle && currentSelectedPlan.billingCycle.toLowerCase() !== 'one-time'
                                      ? '/payments/create-subscription-stripe/'
                                      : '/payments/charge-stripe/'; // Example for one-time

                const response = await uplasApi.fetchAuthenticated(paymentEndpoint, {
                    method: 'POST', body: JSON.stringify(paymentDataForBackend)
                });
                const backendResult = await response.json();

                if (response.ok && backendResult.success) {
                    localDisplayFormStatus(paymentFormGlobalStatus, backendResult.message || (uplasTranslate ? uplasTranslate('payment_status_success_subscription') : 'Payment successful!'), 'success');
                    cardElement.clear();
                    setTimeout(() => {
                        closePaymentModal();
                        window.dispatchEvent(new CustomEvent('userSubscriptionChanged', { detail: { planId: currentSelectedPlan.id } }));
                        // Consider redirecting to a thank you page or dashboard
                        // window.location.href = '/dashboard/billing?status=success';
                    }, 3000);
                } else if (backendResult.requires_action && backendResult.client_secret) { // Stripe SCA
                    const { error: confirmError } = await stripe.confirmCardPayment(backendResult.client_secret);
                    if (confirmError) {
                        localDisplayFormStatus(paymentFormGlobalStatus, confirmError.message, 'error');
                        if (paymentSubmitButton) paymentSubmitButton.disabled = false;
                    } else {
                        localDisplayFormStatus(paymentFormGlobalStatus, '', 'success', 'payment_status_success_authenticated');
                        cardElement.clear();
                        setTimeout(() => {
                            closePaymentModal();
                            window.dispatchEvent(new CustomEvent('userSubscriptionChanged', { detail: { planId: currentSelectedPlan.id } }));
                        }, 3000);
                    }
                } else {
                    throw new Error(backendResult.detail || backendResult.message || 'Payment processing failed.');
                }
            } catch (error) {
                console.error('upricing.js: Payment Submission Error:', error);
                localDisplayFormStatus(paymentFormGlobalStatus, error.message, 'error', 'payment_status_error_network');
                if (paymentSubmitButton) paymentSubmitButton.disabled = false;
            }
        });
    }

    // Contact Form Submission
    if (contactForm && contactStatusDiv) {
        contactForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            localClearFormStatus(contactStatusDiv);
            let isFormValid = true;
            contactForm.querySelectorAll('input[required], select[required], textarea[required]').forEach(input => {
                if (!localValidateInput(input)) isFormValid = false;
            });

            if (!isFormValid) {
                localDisplayFormStatus(contactStatusDiv, '', 'error', 'error_correct_form_errors');
                return;
            }

            const submitButton = contactForm.querySelector('button[type="submit"]');
            if (submitButton) submitButton.disabled = true;
            localDisplayFormStatus(contactStatusDiv, '', 'loading', 'contact_status_sending');

            const formData = new FormData(contactForm);
            const data = Object.fromEntries(formData.entries());

            if (!uplasApi || !uplasApi.fetchAuthenticated) {
                localDisplayFormStatus(contactStatusDiv, '', 'error', 'error_service_unavailable');
                if (submitButton) submitButton.disabled = false;
                return;
            }

            try {
                // Contact form might be public, adjust `isPublic` as needed.
                const response = await uplasApi.fetchAuthenticated('/core/contact/', {
                    method: 'POST', body: JSON.stringify(data), isPublic: true
                });
                const result = await response.json();

                if (response.ok && result.success) {
                    localDisplayFormStatus(contactStatusDiv, result.message || (uplasTranslate ? uplasTranslate('contact_status_success') : "Message sent!"), 'success');
                    contactForm.reset();
                } else {
                    throw new Error(result.detail || result.message || 'Failed to send message.');
                }
            } catch (error) {
                console.error('upricing.js: Contact Form Submission Error:', error);
                localDisplayFormStatus(contactStatusDiv, error.message, 'error', 'contact_status_error_network');
            } finally {
                if (submitButton) submitButton.disabled = false;
            }
        });
        contactForm.querySelectorAll('input[required], select[required], textarea[required]').forEach(input => {
            input.addEventListener('input', () => localValidateInput(input));
            input.addEventListener('blur', () => localValidateInput(input)); // Validate on blur too
        });
    }

    // Initial currency update for prices on the page
    if (typeof window.updateUserCurrencyDisplay === 'function') {
        window.updateUserCurrencyDisplay();
    }
    // Listen for currency changes from global selector to update modal price display if open
    window.addEventListener('currencyChanged', () => {
        if (isModalOpen && currentSelectedPlan) {
            updatePaymentModalSummary();
        }
    });


    console.log("upricing.js: Uplas Pricing Page initialized.");
});
