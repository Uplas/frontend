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
    const contactForm = document.getElementById('contact-form'); //
    const contactStatusDiv = document.getElementById('contact-status'); //
    const selectPlanButtons = document.querySelectorAll('.select-plan-btn'); //
    const contactSalesButton = document.querySelector('.enterprise-contact-sales-btn'); // Updated class for specificity

    // Payment Modal Elements
    const paymentModal = document.getElementById('payment-modal'); //
    const closeModalButton = document.getElementById('payment-modal-close-btn'); //
    const summaryPlanNameEl = document.getElementById('summary-plan-name-span'); //
    const summaryPlanPriceEl = document.getElementById('summary-plan-price-span'); //
    const summaryBillingCycleDiv = document.getElementById('summary-billing-cycle-div'); //
    const summaryBillingCycleEl = document.getElementById('summary-billing-cycle-span'); //
    const gatewaySelector = document.querySelector('.payment-gateway-selector'); //
    const gatewayButtons = document.querySelectorAll('.payment-gateway-selector__option'); //
    const gatewayPanels = document.querySelectorAll('.payment-gateway-panel'); //
    const paymentInstructionsDiv = document.getElementById('payment-instructions-div'); //
    const paymentFormGlobalStatus = document.getElementById('payment-form-global-status'); //
    const paymentSubmitButton = document.getElementById('payment-submit-button'); //
    
    const mpesaForm = document.getElementById('mpesa-payment-form'); // Example
    const mpesaPhoneInput = document.getElementById('mpesa-phone-input'); //
    const mpesaPhoneErrorMsg = document.getElementById('mpesa-phone-error-msg'); // From mcourseD.html structure
    const stripeCardholderNameInput = document.getElementById('stripe-cardholder-name'); // From mcourseD.html structure

    // --- State ---
    let isModalOpen = false; //
    let currentSelectedPlan = null; //
    let currentPaymentGateway = null; //

    // --- Utility Functions ---
    // These are very similar to what's in uhome.js and could be globalized further in apiUtils.js or a formUtils.js
    const displayFormStatus = (element, message, type, translateKey = null, variables = {}) => { //
        if (!element) return;
        const text = (translateKey && typeof window.uplasTranslate === 'function') ? 
                     window.uplasTranslate(translateKey, { fallback: message, variables }) : message;
        element.textContent = text;
        element.className = 'form__status'; // Reset
        if (type) element.classList.add(`form__status--${type}`); // e.g., success, error, loading
        element.style.display = 'block';
        element.setAttribute('aria-live', type === 'error' ? 'assertive' : 'polite');
    };

    const clearFormStatus = (element) => { //
        if (!element) return;
        element.textContent = '';
        element.style.display = 'none';
        element.className = 'form__status';
    };

    const validateInput = (inputElement) => { //
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
                
                const errorKey = inputElement.dataset.errorKeyRequired || inputElement.dataset.errorKeyPattern || inputElement.dataset.errorKeyType;
                errorSpan.textContent = (typeof window.uplasTranslate === 'function' && errorKey) ? 
                                        window.uplasTranslate(errorKey, {fallback: defaultMessage}) : defaultMessage;
            }
            return false;
        }
        return true;
    };

    const focusFirstElement = (container) => { //
        if (!container) return;
        const focusable = container.querySelector('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])');
        focusable?.focus();
    };

    // --- Payment Modal Logic ---
    function updatePaymentModalSummary() { //
        if (!currentSelectedPlan || !summaryPlanNameEl || !summaryPlanPriceEl || !summaryBillingCycleDiv || !summaryBillingCycleEl) {
            console.error("Payment modal summary elements not found or plan not selected.");
            return;
        }
        summaryPlanNameEl.textContent = currentSelectedPlan.name;
        summaryPlanPriceEl.dataset.priceUsd = currentSelectedPlan.priceUsd;
        if (typeof window.updateUserCurrencyDisplay === 'function') { // From global.js
            window.updateUserCurrencyDisplay();
        } else { // Fallback formatting if global updater isn't ready
            const price = parseFloat(currentSelectedPlan.priceUsd);
            const currency = localStorage.getItem('uplas-currency') || 'USD';
            summaryPlanPriceEl.textContent = `${currency} ${price.toFixed(2)}`;
        }

        if (currentSelectedPlan.billingCycle && currentSelectedPlan.billingCycle.toLowerCase() !== 'one-time') {
            const billingCycleText = (typeof window.uplasTranslate === 'function') ? 
                                     window.uplasTranslate(`billing_cycle_${currentSelectedPlan.billingCycle.toLowerCase()}`, {fallback: currentSelectedPlan.billingCycle}) :
                                     currentSelectedPlan.billingCycle;
            summaryBillingCycleEl.textContent = billingCycleText;
            summaryBillingCycleDiv.hidden = false;
        } else {
            summaryBillingCycleDiv.hidden = true;
        }
    }

    function openPaymentModal(planData) { //
        if (!paymentModal) {
            console.error("Payment modal element not found in the DOM.");
            alert("Error: Payment functionality is currently unavailable."); // TODO: Translate
            return;
        }
        currentSelectedPlan = planData;
        updatePaymentModalSummary();

        gatewayButtons.forEach(btn => btn.setAttribute('aria-selected', 'false'));
        gatewayPanels.forEach(panel => panel.hidden = true);
        
        const defaultInstructionKey = 'payment_modal_instructions_default';
        const defaultButtonKey = 'payment_modal_submit_default_select'; // More descriptive key

        if (paymentInstructionsDiv) {
             paymentInstructionsDiv.textContent = (typeof window.uplasTranslate === 'function') ? 
                window.uplasTranslate(defaultInstructionKey, {fallback: 'Select your preferred payment method to continue.'}) : 
                'Select your preferred payment method to continue.';
        }
        if (paymentSubmitButton) {
            const buttonText = (typeof window.uplasTranslate === 'function') ?
                               window.uplasTranslate(defaultButtonKey, {fallback: 'Select Payment Method'}) :
                               'Select Payment Method';
            paymentSubmitButton.innerHTML = `<i class="fas fa-lock"></i> ${buttonText}`;
            paymentSubmitButton.disabled = true;
        }
        currentPaymentGateway = null;
        if(paymentFormGlobalStatus) clearFormStatus(paymentFormGlobalStatus); // Use the utility

        paymentModal.hidden = false;
        document.body.style.overflow = 'hidden';
        setTimeout(() => paymentModal.classList.add('active'), 10);
        isModalOpen = true;
        focusFirstElement(paymentModal);
    }

    function closePaymentModal() { //
        if (!paymentModal) return;
        paymentModal.classList.remove('active');
        setTimeout(() => {
            paymentModal.hidden = true;
            document.body.style.overflow = '';
            isModalOpen = false;
            currentSelectedPlan = null;
        }, 300); // Match CSS transition duration
    }

    function updatePaymentFormForGateway(gateway) { //
        if (!paymentInstructionsDiv || !paymentSubmitButton) return;
        let instructionsText = "Follow instructions for the selected payment method."; // Default
        let instructionsKey = 'payment_modal_instructions_default';
        let submitTextContent = "Proceed";
        let submitTextKey = 'payment_modal_submit_default_proceed'; // More descriptive key
        paymentSubmitButton.disabled = false;

        // Reset required state for all potentially gateway-specific inputs
        [mpesaPhoneInput, stripeCardholderNameInput].forEach(input => {
            if(input) input.required = false;
        });
        if (mpesaPhoneErrorMsg) mpesaPhoneErrorMsg.textContent = '';


        switch (gateway) {
            case 'mpesa':
                instructionsKey = 'payment_modal_instructions_mpesa';
                submitTextKey = 'payment_modal_submit_mpesa';
                if(mpesaPhoneInput) mpesaPhoneInput.required = true;
                break;
            case 'stripe':
                instructionsKey = 'payment_modal_instructions_stripe';
                // For Stripe, the button text often includes the amount
                submitTextKey = 'pay_amount_button_text'; // e.g., "Pay {amount}"
                if(stripeCardholderNameInput) stripeCardholderNameInput.required = true;
                // Stripe elements would be initialized/shown here by Stripe's JS SDK
                break;
            case 'flutterwave':
                instructionsKey = 'payment_modal_instructions_flutterwave';
                submitTextKey = 'payment_modal_submit_flutterwave';
                break;
            case 'paypal':
                instructionsKey = 'payment_modal_instructions_paypal';
                submitTextKey = 'payment_modal_submit_paypal';
                // PayPal button would be rendered by its SDK here
                break;
            default:
                paymentSubmitButton.disabled = true;
                submitTextKey = 'payment_modal_submit_default_select';
        }

        if (typeof window.uplasTranslate === 'function') {
            paymentInstructionsDiv.textContent = window.uplasTranslate(instructionsKey, {fallback: `Instructions for ${gateway || 'selected method'}.`});
            
            if (gateway === 'stripe' && currentSelectedPlan?.priceUsd) {
                const formattedPriceForButton = summaryPlanPriceEl.textContent; // Already formatted by global currency updater
                submitTextContent = window.uplasTranslate(submitTextKey, { fallback: "Pay {amount}", variables: { amount: formattedPriceForButton } });
            } else {
                submitTextContent = window.uplasTranslate(submitTextKey, { fallback: "Proceed" });
            }
        } else { // Fallback if translation function isn't ready
            paymentInstructionsDiv.textContent = `Instructions for ${gateway || 'selected method'}.`;
            submitTextContent = (gateway === 'stripe' && currentSelectedPlan?.priceUsd) ? `Pay ${summaryPlanPriceEl.textContent}` : "Proceed";
        }
        paymentSubmitButton.innerHTML = `<i class="fas fa-shield-alt"></i> ${submitTextContent}`;
    }

    // --- Event Listeners ---
    selectPlanButtons.forEach(button => { //
        button.addEventListener('click', (e) => {
            e.preventDefault();
            const planData = {
                id: button.dataset.planId,
                name: button.dataset.name,
                priceUsd: button.dataset.priceUsd,
                billingCycle: button.dataset.billingCycle
            };
             if (!planData.priceUsd || isNaN(parseFloat(planData.priceUsd))) { // Check if price is valid
                console.error("Button is missing a valid data-price-usd attribute:", button);
                alert("Error: Price information is missing or invalid for this item."); // TODO: Translate
                return;
            }
            openPaymentModal(planData);
        });
    });

    if (contactSalesButton && typeof window.uplasScrollToElement === 'function') { //
        contactSalesButton.addEventListener('click', (e) => {
            e.preventDefault();
            window.uplasScrollToElement('#contact-section');
            document.getElementById('contact-name')?.focus();
        });
    }

    if (closeModalButton) closeModalButton.addEventListener('click', closePaymentModal); //
    document.addEventListener('keydown', (event) => { if (event.key === 'Escape' && isModalOpen) closePaymentModal(); }); //
    paymentModal?.addEventListener('click', (event) => { if (event.target === paymentModal) closePaymentModal(); }); //

    if (gatewaySelector) { //
        gatewaySelector.addEventListener('click', (event) => {
            const selectedButton = event.target.closest('.payment-gateway-selector__option');
            if (!selectedButton) return;
            currentPaymentGateway = selectedButton.dataset.gateway;
            gatewayButtons.forEach(btn => btn.setAttribute('aria-selected', (btn === selectedButton).toString()));
            gatewayPanels.forEach(panel => { panel.hidden = (panel.dataset.gatewayPanel !== currentPaymentGateway); });
            updatePaymentFormForGateway(currentPaymentGateway);
            if(paymentFormGlobalStatus) clearFormStatus(paymentFormGlobalStatus);
        });
    }

    if (paymentSubmitButton) { //
        paymentSubmitButton.addEventListener('click', async () => {
            if (!currentSelectedPlan || !currentPaymentGateway) {
                displayFormStatus(paymentFormGlobalStatus, 'Please select a plan and payment method.', 'error', 'err_select_plan_method');
                return;
            }
            
            // Basic validation example for M-Pesa before proceeding
            if (currentPaymentGateway === 'mpesa') {
                if (mpesaPhoneInput && !validateInput(mpesaPhoneInput)) {
                     displayFormStatus(paymentFormGlobalStatus, 'Please enter a valid M-Pesa phone number.', 'error', 'err_mpesa_phone_invalid');
                    return;
                }
            }
            // Add similar client-side checks for other gateways if applicable before hitting backend

            displayFormStatus(paymentFormGlobalStatus, 'Processing your payment...', 'loading', true, 'payment_status_processing');
            const submitBtn = paymentSubmitButton; // Cache ref
            submitBtn.disabled = true;

            const paymentData = {
                planId: currentSelectedPlan.id,
                planName: currentSelectedPlan.name,
                amountUSD: parseFloat(currentSelectedPlan.priceUsd).toFixed(2), // Send consistent USD amount
                currency: 'USD', // Always send USD to backend
                billingCycle: currentSelectedPlan.billingCycle,
                gateway: currentPaymentGateway,
                mpesaPhone: currentPaymentGateway === 'mpesa' ? mpesaPhoneInput?.value : undefined,
                // Add other gateway specific data here
            };

            try {
                // Backend Integration: Use fetchAuthenticated from apiUtils.js
                // const response = await fetchAuthenticated('/api/payments/subscribe', { 
                //     method: 'POST', 
                //     body: JSON.stringify(paymentData) 
                // });
                // const result = response; // fetchAuthenticated should parse JSON

                console.log("Submitting Payment Data:", paymentData); //
                await new Promise(resolve => setTimeout(resolve, 2000)); // Simulate API call
                const result = { success: true, message_key: "payment_status_success_subscription" }; // Simulate success

                if (result.success) {
                    displayFormStatus(paymentFormGlobalStatus, 'Subscription successful!', 'success', false, result.message_key);
                    setTimeout(closePaymentModal, 3000);
                    // Backend Integration: Redirect to a thank you page or user dashboard
                    // window.location.href = '/dashboard?plan_activated=' + currentSelectedPlan.id;
                } else {
                    displayFormStatus(paymentFormGlobalStatus, result.message || 'Payment failed. Please try again.', 'error', false, result.message_key || 'payment_status_error_generic');
                    submitBtn.disabled = false; // Re-enable on failure
                }
            } catch (error) {
                console.error('Payment Submission Error:', error);
                displayFormStatus(paymentFormGlobalStatus, error.message || 'A network error occurred during payment.', 'error', false, 'payment_status_error_network');
                submitBtn.disabled = false; // Re-enable on error
            }
        });
    }

    // Contact Form Submission
    if (contactForm) { //
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
                // Backend Integration: Send 'data' to your contact form endpoint
                // Example: const response = await fetchAuthenticated('/api/contact-us', { method: 'POST', body: JSON.stringify(data) });
                // const result = response;
                console.log("Submitting Contact Form Data:", data); //
                await new Promise(resolve => setTimeout(resolve, 1500));
                const result = { success: true, message_key: "contact_status_success" }; // Simulated success

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
        contactForm.querySelectorAll('input[required], select[required], textarea[required]').forEach(input => { //
            input.addEventListener('input', () => validateInput(input));
        });
    }

    // --- Initializations ---
    // The global.js script should handle initial theme, language, and currency updates.
    // The footer year update is now primarily handled by componentLoader.js after footer loads.

    console.log("Uplas Pricing Page (upricing.js) refined and initialized."); //
});
