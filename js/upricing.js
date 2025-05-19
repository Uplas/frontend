```javascript
// js/upricing.js
/* ==========================================================================
   Uplas Pricing Page Specific JavaScript (upricing.js)
   - Handles plan selection, payment modal triggering, contact form.
   - Relies on global.js for theme, nav, language, currency.
   ========================================================================== */
'use strict';

document.addEventListener('DOMContentLoaded', () => {
    // --- Element Selectors ---
    // Theme, Nav, Language, Currency are handled by js/global.js
    const contactForm = document.getElementById('contact-form');
    const contactStatusDiv = document.getElementById('contact-status');
    const selectPlanButtons = document.querySelectorAll('.select-plan-btn'); // For subscriptions
    const contactSalesButton = document.querySelector('.enterprise-plan__text-content .button--primary'); // Enterprise CTA

    // Payment Modal Elements (assuming structure from mcourseD.html is reused/available)
    const paymentModal = document.getElementById('payment-modal');
    const closeModalButton = document.getElementById('payment-modal-close-btn');
    const summaryPlanNameEl = document.getElementById('summary-plan-name-span');
    const summaryPlanPriceEl = document.getElementById('summary-plan-price-span');
    const summaryBillingCycleDiv = document.getElementById('summary-billing-cycle-div');
    const summaryBillingCycleEl = document.getElementById('summary-billing-cycle-span');
    const gatewaySelector = document.querySelector('.payment-gateway-selector');
    const gatewayButtons = document.querySelectorAll('.payment-gateway-selector__option');
    const gatewayPanels = document.querySelectorAll('.payment-gateway-panel');
    const paymentInstructionsDiv = document.getElementById('payment-instructions-div');
    const paymentFormGlobalStatus = document.getElementById('payment-form-global-status');
    const paymentSubmitButton = document.getElementById('payment-submit-button');
    // Specific form inputs within modal (if needed for validation here, though mostly handled by modal's own JS or SDKs)
    const mpesaForm = document.getElementById('mpesa-payment-form'); // Example
    const mpesaPhoneInput = document.getElementById('mpesa-phone-input');
    const stripeCardholderNameInput = document.getElementById('stripe-cardholder-name');


    // --- State ---
    let isModalOpen = false;
    let currentSelectedPlan = null; // { name, priceUsd, id, billingCycle }
    let currentPaymentGateway = null;

    // --- Utility Functions (from global.js or specific here) ---
    const displayFormStatus = (element, message, type, translateKey = null) => { /* ... (Same as uhome.js) ... */
        if (!element) return;
        const text = translateKey && window.uplasTranslate ? window.uplasTranslate(translateKey) : message;
        element.textContent = text;
        element.className = 'form__status';
        if (type) element.classList.add(`form__status--${type}`);
        element.style.display = 'block';
        element.setAttribute('aria-live', type === 'error' ? 'assertive' : 'polite');
    };
    const clearFormStatus = (element) => { /* ... (Same as uhome.js) ... */
        if (!element) return;
        element.textContent = '';
        element.style.display = 'none';
        element.className = 'form__status';
    };
    const validateInput = (inputElement) => { /* ... (Same as uhome.js) ... */
        const group = inputElement.closest('.form__group');
        if (!group) return inputElement.checkValidity();
        const errorSpan = group.querySelector('.form__error-message');
        if (!inputElement.checkValidity()) {
            inputElement.classList.add('invalid');
            if (errorSpan) {
                if (inputElement.validity.valueMissing) errorSpan.textContent = inputElement.dataset.errorRequired || "This field is required.";
                else if (inputElement.validity.patternMismatch) errorSpan.textContent = inputElement.dataset.errorPattern || inputElement.title || "Please match the requested format.";
                else if (inputElement.validity.typeMismatch) errorSpan.textContent = inputElement.dataset.errorType || "Please enter a valid value.";
                else errorSpan.textContent = inputElement.validationMessage;
            }
            return false;
        } else {
            inputElement.classList.remove('invalid');
            if (errorSpan) errorSpan.textContent = '';
            return true;
        }
    };
    const focusFirstElement = (container) => {
        if (!container) return;
        const focusable = container.querySelector('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])');
        focusable?.focus();
    };


    // --- Payment Modal Logic (Adapted from mcourseD.js) ---
    function updatePaymentModalSummary() {
        if (!currentSelectedPlan || !summaryPlanNameEl || !summaryPlanPriceEl || !summaryBillingCycleDiv || !summaryBillingCycleEl) return;
        summaryPlanNameEl.textContent = currentSelectedPlan.name;
        summaryPlanPriceEl.dataset.priceUsd = currentSelectedPlan.priceUsd;
        if (window.updateUserCurrencyDisplay) window.updateUserCurrencyDisplay(); // Trigger global currency update

        if (currentSelectedPlan.billingCycle && currentSelectedPlan.billingCycle.toLowerCase() !== 'one-time') {
            summaryBillingCycleEl.textContent = currentSelectedPlan.billingCycle; // TODO: Translate billing cycle
            summaryBillingCycleDiv.hidden = false;
        } else {
            summaryBillingCycleDiv.hidden = true;
        }
    }

    function openPaymentModal(planData) {
        currentSelectedPlan = planData;
        updatePaymentModalSummary();

        gatewayButtons.forEach(btn => btn.setAttribute('aria-selected', 'false'));
        gatewayPanels.forEach(panel => panel.hidden = true);
        if (paymentInstructionsDiv) { /* ... set default instruction, translate ... */ }
        if (paymentSubmitButton) { /* ... set default text, disable, translate ... */ }
        currentPaymentGateway = null;
        clearPaymentStatus();

        if (paymentModal) {
            paymentModal.hidden = false;
            document.body.style.overflow = 'hidden';
            setTimeout(() => paymentModal.classList.add('active'), 10);
            isModalOpen = true;
            focusFirstElement(paymentModal);
        }
    }

    function closePaymentModal() {
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

    function updatePaymentFormForGateway(gateway) {
        // ... (Logic similar to mcourseD.js, ensure translation keys are used for instructions and button text)
        // ... Remember to handle required states for inputs based on the selected gateway ...
        if (!paymentInstructionsDiv || !paymentSubmitButton) return;
        let instructionsKey = 'payment_modal_instructions_default';
        let submitTextKey = 'payment_modal_submit_default';
        paymentSubmitButton.disabled = false;

        [mpesaPhoneInput, stripeCardholderNameInput].forEach(input => {
            if(input) input.required = false; // Reset required state
        });


        switch (gateway) {
            case 'mpesa':
                instructionsKey = 'payment_modal_instructions_mpesa';
                submitTextKey = 'payment_modal_submit_mpesa';
                if(mpesaPhoneInput) mpesaPhoneInput.required = true;
                break;
            case 'stripe':
                instructionsKey = 'payment_modal_instructions_stripe';
                submitTextKey = 'payment_modal_submit_stripe_dynamic'; // Key for "Pay AMOUNT"
                if(stripeCardholderNameInput) stripeCardholderNameInput.required = true;
                // setupStripe(); // If Stripe elements are initialized on demand
                break;
            // ... other cases ...
            default:
                paymentSubmitButton.disabled = true;
        }

        if (window.uplasTranslate) {
            paymentInstructionsDiv.textContent = window.uplasTranslate(instructionsKey, "Select payment method.");
            let submitText = window.uplasTranslate(submitTextKey, "Proceed");
            if (gateway === 'stripe' && currentSelectedPlan?.priceUsd) {
                // This part is tricky for translation if "Pay" and amount are separate.
                // Better to have a key like "pay_amount_button_text" which includes a placeholder for amount.
                // For now, simple concatenation:
                const priceDisplaySpan = document.createElement('span'); // Create a temporary span to format price
                priceDisplaySpan.dataset.priceUsd = currentSelectedPlan.priceUsd;
                if (window.updateUserCurrencyDisplay) window.updateUserCurrencyDisplay(); // Format it
                // This assumes updateUserCurrencyDisplay updates the textContent of elements with data-price-usd
                // We need to ensure summaryPlanPriceEl (which is in the modal) is updated by global.js
                // For the button, we might need to format it here or pass the raw value to a translated string.
                // Let's assume a translated string like "Pay {amount}"
                const formattedPriceForButton = summaryPlanPriceEl.textContent; // Get already formatted price
                submitText = (window.uplasTranslate('pay_amount_button_text', "Pay {amount}") || "Pay {amount}").replace("{amount}", formattedPriceForButton);
            }
            paymentSubmitButton.innerHTML = `<i class="fas fa-shield-alt"></i> ${submitText}`;
        } else {
            paymentInstructionsDiv.textContent = `Instructions for ${gateway || 'selected method'}.`;
            paymentSubmitButton.innerHTML = `<i class="fas fa-shield-alt"></i> Proceed`;
        }
    }


    // --- Event Listeners ---
    selectPlanButtons.forEach(button => {
        button.addEventListener('click', (e) => {
            e.preventDefault();
            const planData = {
                id: button.dataset.planId,
                name: button.dataset.name,
                priceUsd: button.dataset.priceUsd, // Ensure this attribute exists on buttons
                billingCycle: button.dataset.billingCycle
            };
             if (!planData.priceUsd) {
                console.error("Button is missing data-price-usd attribute:", button);
                alert("Error: Price information is missing for this item."); // TODO: Translate
                return;
            }
            openPaymentModal(planData);
        });
    });

    if (contactSalesButton && window.uplasScrollToElement) {
        contactSalesButton.addEventListener('click', (e) => {
            e.preventDefault();
            window.uplasScrollToElement('#contact-section');
            document.getElementById('contact-name')?.focus();
        });
    }

    // Modal specific listeners
    if (closeModalButton) closeModalButton.addEventListener('click', closePaymentModal);
    document.addEventListener('keydown', (event) => { if (event.key === 'Escape' && isModalOpen) closePaymentModal(); });
    paymentModal?.addEventListener('click', (event) => { if (event.target === paymentModal) closePaymentModal(); });

    if (gatewaySelector) {
        gatewaySelector.addEventListener('click', (event) => {
            const selectedButton = event.target.closest('.payment-gateway-selector__option');
            if (!selectedButton) return;
            currentPaymentGateway = selectedButton.dataset.gateway;
            gatewayButtons.forEach(btn => btn.setAttribute('aria-selected', (btn === selectedButton).toString()));
            gatewayPanels.forEach(panel => { panel.hidden = (panel.dataset.gatewayPanel !== currentPaymentGateway); });
            updatePaymentFormForGateway(currentPaymentGateway);
            clearPaymentStatus();
        });
    }

    if (paymentSubmitButton) {
        paymentSubmitButton.addEventListener('click', async () => {
            // ... (Payment submission logic similar to mcourseD.js, using currentSelectedPlan and currentPaymentGateway)
            // ... Ensure to use priceUsd for paymentData.amount and set currency to 'USD' for backend.
            if (!currentSelectedPlan || !currentPaymentGateway) { /* ... error ... */ return; }
            displayFormStatus(paymentFormGlobalStatus, 'Processing payment...', 'info', true, 'payment_status_processing');
            // ... rest of validation and simulated API call ...
            console.log("Payment for plan:", currentSelectedPlan.id, "via", currentPaymentGateway);
            // Simulate
            setTimeout(() => {
                displayFormStatus(paymentFormGlobalStatus, 'Subscription successful!', 'success', false, 'payment_status_success_subscription');
                setTimeout(closePaymentModal, 2000);
            }, 2000);
        });
    }


    // Contact Form Submission
    if (contactForm) {
        contactForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            clearFormStatus(contactStatusDiv);
            let isFormValid = true;
            contactForm.querySelectorAll('input[required], select[required], textarea[required]').forEach(input => {
                if (!validateInput(input)) isFormValid = false;
            });

            if (!isFormValid) {
                displayFormStatus(contactStatusDiv, 'Please correct the errors above.', 'error', null, 'err_correct_form_errors');
                return;
            }

            const submitButton = contactForm.querySelector('button[type="submit"]');
            if (submitButton) submitButton.disabled = true;
            displayFormStatus(contactStatusDiv, 'Sending message...', 'loading', null, 'contact_status_sending');

            const formData = new FormData(contactForm);
            const data = Object.fromEntries(formData.entries());

            try {
                console.log("Submitting Contact Form Data:", data);
                // TODO: Replace with actual API call using fetchAuthenticated or basic fetch
                // const response = await fetch('/api/contact/general', { method: 'POST', ... });
                // const result = await response.json();

                await new Promise(resolve => setTimeout(resolve, 1500)); // Simulate delay
                const result = { success: true, message: "Thank you! Your message has been sent." };

                if (result.success) {
                    displayFormStatus(contactStatusDiv, result.message, 'success', null, 'contact_status_success');
                    contactForm.reset();
                } else {
                    displayFormStatus(contactStatusDiv, result.message || 'An error occurred.', 'error', null, 'contact_status_error_generic');
                }
            } catch (error) {
                console.error('Contact Form Error:', error);
                displayFormStatus(contactStatusDiv, 'A network error occurred. Please try again.', 'error', null, 'contact_status_error_network');
            } finally {
                if (submitButton) submitButton.disabled = false;
            }
        });
        // Add input event listeners to clear validation errors on the contact form
        contactForm.querySelectorAll('input[required], select[required], textarea[required]').forEach(input => {
            input.addEventListener('input', () => validateInput(input));
        });
    }

    // --- Initializations ---
    // Global.js handles theme, nav, language, currency initial updates.
    // Ensure current year is updated in footer (global.js might handle this if ID is consistent)
    const currentYearSpan = document.getElementById('current-year-footer');
    if (currentYearSpan) {
        const yearText = currentYearSpan.textContent;
        if (yearText && yearText.includes("{currentYear}")) {
            currentYearSpan.textContent = yearText.replace("{currentYear}", new Date().getFullYear());
        } else if (!yearText.includes(new Date().getFullYear().toString())) {
             currentYearSpan.textContent = new Date().getFullYear();
        }
    }

    console.log("Uplas Pricing Page (upricing.js) loaded.");
});
