// js/upricing.js
/* ==========================================================================
   Uplas Pricing Page Specific JavaScript (upricing.js)
   - Handles plan selection via Paystack and the contact form.
   - Relies on global.js, apiUtils.js, and i18n.js.
   ========================================================================== */
'use strict';

document.addEventListener('DOMContentLoaded', () => {
    // --- Paystack Payment Logic ---
    const paystackButtons = document.querySelectorAll('.paystack-button');
    // IMPORTANT: Replace with your actual Paystack Public Key
    const PAYSTACK_PUBLIC_KEY = 'pk_test_a75debe223b378631e5b583ddf431631562b781e';
    const uplasTranslate = window.uplasTranslate || ((key, opts) => opts.fallback);
    const uplasApi = window.uplasApi;

    const handlePaystackVerification = async (reference, planId) => {
        // This is a placeholder for what should happen after a successful Paystack charge.
        // Your backend needs to verify this transaction reference.
        console.log(`Paystack transaction successful with reference: ${reference}. Plan ID: ${planId}`);
        alert(uplasTranslate('payment_status_success_subscription', {fallback: 'Payment successful! Your plan is now active.'}));

        // In a real implementation, you would make a call to your backend here:
        /*
        try {
            const response = await uplasApi.fetchAuthenticated('/payments/verify-paystack/', {
                method: 'POST',
                body: JSON.stringify({ reference: reference })
            });
            const result = await response.json();
            if (result.success) {
                alert('Verification successful! Your plan is active.');
                window.location.href = '/dashboard'; // Redirect to dashboard
            } else {
                throw new Error(result.message || 'Verification failed.');
            }
        } catch (error) {
            console.error('Paystack verification error:', error);
            alert('Your payment was successful, but we had trouble verifying it automatically. Please contact support.');
        }
        */

        // For this demo, we'll just dispatch an event and redirect.
        window.dispatchEvent(new CustomEvent('userSubscriptionChanged', { detail: { planId: planId } }));
        window.location.href = 'dashboard.html'; // Simulate redirect to a dashboard
    };

    const initiatePaystackPayment = (paymentDetails) => {
        const handler = PaystackPop.setup({
            key: paymentDetails.key,
            email: paymentDetails.email,
            amount: paymentDetails.amount, // Amount in Kobo/cents
            currency: 'NGN', // Or your preferred currency like 'USD'
            ref: paymentDetails.ref,
            metadata: {
                user_id: paymentDetails.userId,
                plan_id: paymentDetails.planId
            },
            callback: function(response) {
                // This callback happens when Paystack confirms the charge is successful on the client.
                handlePaystackVerification(response.reference, paymentDetails.planId);
            },
            onClose: function() {
                alert(uplasTranslate('payment_cancelled', {fallback: 'Transaction was not completed, window closed.'}));
            },
        });
        handler.openIframe();
    };

    paystackButtons.forEach(button => {
        button.addEventListener('click', (event) => {
            if (!uplasApi || !uplasApi.isUserLoggedIn()) {
                alert(uplasTranslate('auth_required_for_purchase', {fallback: 'You need to be logged in to subscribe.'}));
                // Redirect to login, preserving the intended action
                sessionStorage.setItem('uplas_post_auth_action', JSON.stringify({ type: 'subscribe', planId: button.dataset.planId }));
                window.location.href = '/index.html#auth-section';
                return;
            }

            const currentUser = uplasApi.getUserData();
            if (!currentUser || !currentUser.email) {
                alert(uplasTranslate('error_user_data_missing', {fallback: 'Your user information is incomplete. Please log in again.'}));
                return;
            }

            const planId = button.dataset.planId;
            const price = parseFloat(button.dataset.price); // Assumes price is in major currency unit (e.g., NGN, USD)
            const planName = button.dataset.name;

            if (isNaN(price)) {
                 alert(uplasTranslate('err_price_info_missing', {fallback:"Error: Plan price information is invalid."}));
                 return;
            }

            initiatePaystackPayment({
                key: PAYSTACK_PUBLIC_KEY,
                email: currentUser.email,
                amount: Math.round(price * 100), // Convert to kobo/cents
                ref: `uplas_${planId}_${new Date().getTime()}`,
                userId: currentUser.id,
                planId: planId,
                planName: planName
            });
        });
    });


    // --- Preserved Contact Form Logic ---
    const contactForm = document.getElementById('contact-form');
    const contactStatusDiv = document.getElementById('contact-form-status');
    const contactSalesButton = document.querySelector('a[href="#contact-section"]');

    const localDisplayFormStatus = (element, message, typeOrIsError, translateKey = null, variables = {}) => {
        if (!element) return;
        const isError = typeof typeOrIsError === 'boolean' ? typeOrIsError : typeOrIsError === 'error';
        const statusType = typeof typeOrIsError === 'string' ? typeOrIsError : (isError ? 'error' : 'success');

        let text = message;
        if (translateKey && uplasTranslate) {
            text = uplasTranslate(translateKey, { fallback: message, variables });
        }

        element.innerHTML = text;
        element.className = 'form__status';
        if (statusType === 'loading' && !element.querySelector('.fa-spinner')) {
             element.innerHTML = `<i class="fas fa-spinner fa-spin"></i> ${text}`;
        }
        element.classList.add(`form__status--${statusType}`);
        element.style.display = 'block';
        element.hidden = false;
        element.setAttribute('aria-live', isError ? 'assertive' : 'polite');

        if (statusType === 'success') {
            setTimeout(() => {
                if (element) {
                    element.style.display = 'none';
                    element.textContent = '';
                }
            }, 7000);
        }
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
                errorSpan.textContent = defaultMessage;
            }
            return false;
        }
        return true;
    };
    
    if (contactSalesButton && window.uplasScrollToElement) {
        contactSalesButton.addEventListener('click', (e) => {
            e.preventDefault();
            window.uplasScrollToElement('#contact-section');
        });
    }

    if (contactForm && contactStatusDiv) {
        contactForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            let isFormValid = true;
            contactForm.querySelectorAll('input[required], select[required], textarea[required]').forEach(input => {
                if (!localValidateInput(input)) isFormValid = false;
            });

            if (!isFormValid) {
                localDisplayFormStatus(contactStatusDiv, 'Please correct the errors in the form.', 'error', 'error_correct_form_errors');
                return;
            }

            const submitButton = contactForm.querySelector('button[type="submit"]');
            if (submitButton) submitButton.disabled = true;
            localDisplayFormStatus(contactStatusDiv, 'Sending...', 'loading', 'contact_status_sending');

            const formData = new FormData(contactForm);
            const data = Object.fromEntries(formData.entries());

            if (!uplasApi || !uplasApi.fetchAuthenticated) {
                localDisplayFormStatus(contactStatusDiv, 'Service is temporarily unavailable.', 'error', 'error_service_unavailable');
                if (submitButton) submitButton.disabled = false;
                return;
            }

            try {
                const response = await uplasApi.fetchAuthenticated('/core/contact/', {
                    method: 'POST', body: JSON.stringify(data), isPublic: true
                });
                const result = await response.json();

                if (response.ok && result.success) {
                    localDisplayFormStatus(contactStatusDiv, result.message || "Message sent!", 'success', 'contact_status_success');
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
            input.addEventListener('blur', () => localValidateInput(input));
        });
    }

    // Initial currency update for prices on the page
    if (typeof window.updateUserCurrencyDisplay === 'function') {
        window.updateUserCurrencyDisplay();
    }
    window.addEventListener('currencyChanged', () => {
        // This is where you would update any open modals, but we removed the modal.
        // This listener can be removed if no other currency-dependent UI is on this page besides the static prices.
    });

    console.log("upricing.js: Uplas Pricing Page initialized.");
});
