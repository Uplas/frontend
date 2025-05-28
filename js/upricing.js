// js/upricing.js
/* ==========================================================================
   Uplas Pricing Page Specific JavaScript (upricing.js)
   - Handles plan selection, payment modal triggering, contact form.
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

    // Unified Payment Modal Elements
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


    // --- State ---
    let isModalOpen = false;
    let currentSelectedPlan = null;

    // --- Utility Functions ---
    const displayFormStatus = (element, message, type, translateKey = null, variables = {}) => {
        if (!element) return;
        const text = (translateKey && typeof window.uplasTranslate === 'function') ?
                     window.uplasTranslate(translateKey, { fallback: message, variables }) : message;
        element.textContent = text;
        element.className = 'form__status'; // Reset
        if (type) element.classList.add(`form__status--${type}`);
        element.style.display = 'block';
        element.setAttribute('aria-live', type === 'error' ? 'assertive' : 'polite');
    };

    const clearFormStatus = (element) => {
        if (!element) return;
        element.textContent = '';
        element.style.display = 'none';
        element.className = 'form__status';
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

    // --- Card Type Detection and Formatting ---
    function getCardType(cardNumber) {
        const num = cardNumber.replace(/\s+/g, '');
        if (/^4/.test(num)) return 'visa';
        if (/^5[1-5]/.test(num)) return 'mastercard';
        if (/^3[47]/.test(num)) return 'amex';
        if (/^6(?:011|5)/.test(num)) return 'discover';
        if (/^3(?:0[0-5]|[68])/.test(num)) return 'diners';
        if (/^(?:2131|1800|35)/.test(num)) return 'jcb';
        return 'unknown';
    }

    if (paymentCardNumberInput && paymentCardTypeIcon) {
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
                paymentCardNumberInput.value = parts.join(' ').substring(0, 23); // Limit length (e.g., 19 digits + 4 spaces)
            } else {
                // Allow user to clear input
                paymentCardNumberInput.value = '';
            }
        });
    }

    if (paymentExpiryDateInput) {
        paymentExpiryDateInput.addEventListener('input', (e) => {
            let value = e.target.value.replace(/\D/g, '');
            if (value.length > 2) {
                value = value.substring(0, 2) + ' / ' + value.substring(2, 4);
            } else if (value.length === 2 && e.inputType !== 'deleteContentBackward' && !e.target.value.includes(' / ')) {
                value = value + ' / ';
            }
            e.target.value = value.substring(0, 7); // MM / YY
        });
    }


    // --- Payment Modal Logic ---
    function updatePaymentModalSummary() {
        if (!currentSelectedPlan || !summaryPlanNameEl || !summaryPlanPriceEl || !summaryBillingCycleDiv || !summaryBillingCycleEl) {
            console.error("Payment modal summary elements not found or plan not selected.");
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
        if(paymentFormGlobalStatus) clearFormStatus(paymentFormGlobalStatus);

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

    function closePaymentModal() {
        if (!paymentModal) return;
        paymentModal.classList.remove('active');
        setTimeout(() => {
            paymentModal.hidden = true;
            document.body.style.overflow = '';
            isModalOpen = false;
            currentSelectedPlan = null;
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
                console.error("Button is missing a valid data-price-usd attribute:", button);
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


    if (unifiedCardPaymentForm) {
        unifiedCardPaymentForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            if (!currentSelectedPlan) {
                displayFormStatus(paymentFormGlobalStatus, 'No plan selected.', 'error', 'err_no_plan_selected');
                return;
            }

            let isFormValid = true;
            [paymentCardholderNameInput, paymentEmailInput, paymentCardNumberInput, paymentExpiryDateInput, paymentCvvInput].forEach(input => {
                if (input && !validateInput(input)) isFormValid = false;
            });

            if (!isFormValid) {
                displayFormStatus(paymentFormGlobalStatus, 'Please correct the errors in the form.', 'error', 'err_correct_form_errors');
                return;
            }

            displayFormStatus(paymentFormGlobalStatus, 'Processing your payment...', 'loading', true, 'payment_status_processing');
            if(paymentSubmitButton) paymentSubmitButton.disabled = true;

            const paymentData = {
                planId: currentSelectedPlan.id,
                planName: currentSelectedPlan.name,
                amountUSD: parseFloat(currentSelectedPlan.priceUsd).toFixed(2),
                currency: 'USD',
                billingCycle: currentSelectedPlan.billingCycle,
                gateway: 'card_processor', // Your backend's identifier for this
                cardholderName: paymentCardholderNameInput.value,
                email: paymentEmailInput.value,
                // IMPORTANT: In a real app, you would send a payment token from Stripe.js/Braintree etc. NOT raw card details.
                // For simulation:
                // paymentToken: "simulated_token_for_" + getCardType(paymentCardNumberInput.value)
            };

            try {
                console.log("Submitting Card Payment Data:", paymentData);
                // TODO: Replace with actual fetchAuthenticated call to your backend, sending the payment token.
                // const result = await fetchAuthenticated('/api/payments/charge-card', {
                // method: 'POST',
                // body: JSON.stringify(paymentData)
                // });

                await new Promise(resolve => setTimeout(resolve, 2500)); // Simulate API call
                const result = { success: Math.random() > 0.1, message_key: "payment_status_success_subscription" };

                if (result.success) {
                    displayFormStatus(paymentFormGlobalStatus, 'Payment successful! Thank you for your purchase.', 'success', false, result.message_key);
                    setTimeout(() => {
                        closePaymentModal();
                        // Potentially redirect or update UI to reflect purchase
                        // window.location.href = '/dashboard?plan_activated=' + currentSelectedPlan.id;
                    }, 3000);
                } else {
                    displayFormStatus(paymentFormGlobalStatus, result.message || 'Payment failed. Please check your details or try another card.', 'error', false, result.message_key || 'payment_status_error_generic');
                    if(paymentSubmitButton) paymentSubmitButton.disabled = false;
                }
            } catch (error) {
                console.error('Card Payment Submission Error:', error);
                displayFormStatus(paymentFormGlobalStatus, error.message || 'A network error occurred. Please try again.', 'error', false, 'payment_status_error_network');
                if(paymentSubmitButton) paymentSubmitButton.disabled = false;
            }
        });
    }


    // Contact Form Submission (remains the same)
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

    console.log("Uplas Pricing Page (upricing.js) refined and initialized for single card payment.");
});
