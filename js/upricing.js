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

    // Stripe.js specific elements (ensure these IDs are in your upricing.html modal)
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
            // It's better to show this error inside the modal if the user tries to open it.
            return false;
        }
        // Replace 'YOUR_STRIPE_PUBLISHABLE_KEY' with your actual Stripe publishable key from your Stripe dashboard
        stripe = Stripe('pk_test_YOUR_STRIPE_PUBLISHABLE_KEY'); // IMPORTANT: Use your TEST key for development
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
        // Create and mount the Card Element
        // Ensure you have a div with id="stripe-card-element" in your payment modal for Stripe to mount to.
        // Add this div to your upricing.html and mcourseD.html payment modals
        // Example for the HTML part:
        // <div class="form__group">
        //     <label for="stripe-card-element" class="form__label" data-translate-key="form_label_card_details">Card Details</label>
        //     <div id="stripe-card-element" class="form__input"> </div>
        //     <div id="stripe-card-errors" role="alert" class="form__error-message"></div>
        // </div>
        if (stripeCardElementContainer) {
            cardElement = elements.create('card', { style: cardStyle, hidePostalCode: true });
            cardElement.mount(stripeCardElementContainer);

            cardElement.on('change', function(event) {
                if (stripeCardErrors) {
                    stripeCardErrors.textContent = event.error ? event.error.message : '';
                }
            });
        } else {
             console.error("Stripe card element container '#stripe-card-element' not found. Stripe Element cannot be mounted.");
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
        element.innerHTML = text; // Use innerHTML to allow for spinner icon
        element.className = 'form__status payment-status-message';
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

    const validateInput = (inputElement) => {
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
    const focusFirstElement = (container) => {
        if (!container) return;
        const focusable = container.querySelector('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])');
        focusable?.focus();
    };


    // --- Payment Modal Logic ---
    function updatePaymentModalSummary() {
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

    function openPaymentModal(planData) {
        if (!paymentModal || !stripeInitialized) {
            const errorMsgKey = !stripeInitialized ? "err_payment_system_unavailable" : "err_payment_modal_missing";
            const fallbackMsg = !stripeInitialized ? "Payment system is not available. Please try again later." : "Payment modal element not found.";
            alert(typeof window.uplasTranslate === 'function' ? window.uplasTranslate(errorMsgKey, {fallback: fallbackMsg}) : fallbackMsg);
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


        paymentModal.hidden = false;
        document.body.style.overflow = 'hidden';
        setTimeout(() => {
            paymentModal.classList.add('active');
             if (paymentCardholderNameInput) paymentCardholderNameInput.focus();
             else focusFirstElement(paymentModal);
        }, 10);
        isModalOpen = true;
    }

    function closePaymentModal() {
        if (!paymentModal) return;
        paymentModal.classList.remove('active');
        setTimeout(() => {
            paymentModal.hidden = true;
            document.body.style.overflow = '';
            isModalOpen = false;
            currentSelectedPlan = null;
            cardElement?.clear();
        }, 300);
    }

    // --- Event Listeners ---
    selectPlanButtons.forEach(button => {
        button.addEventListener('click', (e) => {
            e.preventDefault();
            const planData = {
                id: button.dataset.planId,
                name: button.dataset.name,
                priceUsd: button.dataset.priceUsd,
                billingCycle: button.dataset.billingCycle
            };
             if (!planData.priceUsd || isNaN(parseFloat(planData.priceUsd))) {
                alert("Error: Price information is missing or invalid for this item.");
                return;
            }
            openPaymentModal(planData);
        });
    });

    if (contactSalesButton && typeof window.uplasScrollToElement === 'function') {
      contactSalesButton.addEventListener('click', (e) => {
            e.preventDefault();
            window.uplasScrollToElement('#contact-section');
            document.getElementById('contact-name')?.focus();
        });
    }

    if (closeModalButton) closeModalButton.addEventListener('click', closePaymentModal);
    document.addEventListener('keydown', (event) => { if (event.key === 'Escape' && isModalOpen) closePaymentModal(); });
    paymentModal?.addEventListener('click', (event) => { if (event.target === paymentModal) closePaymentModal(); });

    if (unifiedCardPaymentForm && stripeInitialized) {
        unifiedCardPaymentForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            if (!currentSelectedPlan || !cardElement) { // Ensure cardElement is also initialized
                displayFormStatus(paymentFormGlobalStatus, 'Payment system error or no plan selected.', 'error', 'err_payment_system_or_plan');
                return;
            }

            let isFormValid = true;
            if (paymentCardholderNameInput && !validateInput(paymentCardholderNameInput)) isFormValid = false;
            if (paymentEmailInput && !validateInput(paymentEmailInput)) isFormValid = false;
            // Stripe Element handles its own visual validation, error shown in stripeCardErrors

            if (!isFormValid) {
                displayFormStatus(paymentFormGlobalStatus, 'Please correct the name and email fields.', 'error', 'err_correct_form_errors_basic');
                return;
            }

            if (paymentSubmitButton) paymentSubmitButton.disabled = true;
            displayFormStatus(paymentFormGlobalStatus, 'Processing payment...', 'loading', true, 'payment_status_processing');

            const cardholderName = paymentCardholderNameInput.value;
            const email = paymentEmailInput.value;

            const { paymentMethod, error: pmError } = await stripe.createPaymentMethod({
                type: 'card',
                card: cardElement,
                billing_details: {
                    name: cardholderName,
                    email: email,
                },
            });

            if (pmError) {
                displayFormStatus(paymentFormGlobalStatus, pmError.message, 'error'); // Show Stripe's error message
                if (stripeCardErrors) stripeCardErrors.textContent = pmError.message; // Also show in Stripe's error div
                if (paymentSubmitButton) paymentSubmitButton.disabled = false;
                return;
            }
             if (stripeCardErrors) stripeCardErrors.textContent = ''; // Clear Stripe errors if PaymentMethod created

            const paymentDataForBackend = {
                planId: currentSelectedPlan.id,
                planName: currentSelectedPlan.name,
                amountUSD: parseFloat(currentSelectedPlan.priceUsd).toFixed(2),
                currency: 'USD',
                billingCycle: currentSelectedPlan.billingCycle,
                paymentMethodId: paymentMethod.id,
                email: email,
                cardholderName: cardholderName
            };

            try {
                console.log("Sending Payment Data (Stripe Method ID) to Backend:", paymentDataForBackend);
                // **ACTUAL BACKEND INTEGRATION POINT**
                // const backendResponse = await fetchAuthenticated('/api/payments/create-subscription-stripe', {
                //     method: 'POST',
                //     body: JSON.stringify(paymentDataForBackend)
                // });
                // const backendResult = backendResponse; // Assuming fetchAuthenticated parses JSON

                // SIMULATE BACKEND CALL
                await new Promise(resolve => setTimeout(resolve, 2500));
                const backendResult = { success: Math.random() > 0.1, message_key: "payment_status_success_subscription" };

                if (backendResult.success) {
                    displayFormStatus(paymentFormGlobalStatus, 'Payment successful! Thank you.', 'success', false, backendResult.message_key);
                    cardElement.clear();
                    setTimeout(() => {
                        closePaymentModal();
                        // window.location.href = '/dashboard?plan_activated=' + currentSelectedPlan.id;
                    }, 3000);
                } else if (backendResult.requires_action && backendResult.client_secret) {
                    // Example for Payment Intents that require further client action (e.g., 3D Secure)
                    const { error: confirmError } = await stripe.confirmCardPayment(backendResult.client_secret);
                    if (confirmError) {
                        displayFormStatus(paymentFormGlobalStatus, confirmError.message, 'error');
                        if (paymentSubmitButton) paymentSubmitButton.disabled = false;
                    } else {
                        displayFormStatus(paymentFormGlobalStatus, 'Payment successful after authentication!', 'success', false, "payment_status_success_authenticated");
                        cardElement.clear();
                        setTimeout(closePaymentModal, 3000);
                    }
                } else {
                    displayFormStatus(paymentFormGlobalStatus, backendResult.message || 'Payment failed. Please try again.', 'error', false, backendResult.message_key || 'payment_status_error_generic');
                    if (paymentSubmitButton) paymentSubmitButton.disabled = false;
                }
            } catch (error) {
                console.error('Payment Submission to Backend Error:', error);
                displayFormStatus(paymentFormGlobalStatus, error.message || 'A network error occurred.', 'error', false, 'payment_status_error_network');
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
            displayFormStatus(contactStatusDiv, 'Sending your message...', 'loading', true, 'contact_status_sending');

            const formData = new FormData(contactForm);
            const data = Object.fromEntries(formData.entries());

            try {
                console.log("Submitting Contact Form Data:", data);
                await new Promise(resolve => setTimeout(resolve, 1500));
                const result = { success: true, message_key: "contact_status_success" };

                if (result.success) {
                    displayFormStatus(contactStatusDiv, "Message sent successfully!", 'success', false, result.message_key);
                    contactForm.reset();
                } else {
                    displayFormStatus(contactStatusDiv, result.message || 'Failed to send message.', 'error', false, result.message_key || 'contact_status_error_generic');
                }
            } catch (error) {
                console.error('Contact Form Submission Error:', error);
                displayFormStatus(contactStatusDiv, 'A network error occurred. Please try again.', 'error', false, 'contact_status_error_network');
            } finally {
                if (submitButton) submitButton.disabled = false;
            }
        });
        contactForm.querySelectorAll('input[required], select[required], textarea[required]').forEach(input => {
            input.addEventListener('input', () => validateInput(input));
        });
    }

    console.log("Uplas Pricing Page (upricing.js) with Stripe.js conceptual integration initialized.");
});
