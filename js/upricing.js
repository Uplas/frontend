// js/upricing.js
/* ==========================================================================
   Uplas Pricing Page Specific JavaScript (upricing.js)
   - Handles plan selection and Paystack payment initiation.
   - Manages the enterprise contact form submission.
   - Relies on global.js for user state, currency, and API utilities.
   - Assumes apiUtils.js, i18n.js, and the Paystack Inline JS script are loaded.
   ========================================================================== */
'use strict';

document.addEventListener('DOMContentLoaded', () => {
    console.log("upricing.js: DOMContentLoaded event started.");

    // --- Global Utilities (from window scope) ---
    const { uplasApi, uplasTranslate, uplasScrollToElement, changeUserGlobalCurrency, updateUserCurrencyDisplay } = window;
    const PAYSTACK_PUBLIC_KEY = 'pk_test_a75debe223b378631e5b583ddf431631562b781e'; // Replace with your actual LIVE public key in production

    // --- Element Selectors ---
    const getElement = (id, description) => {
        const element = document.getElementById(id);
        if (!element) {
            console.warn(`upricing.js: Element for ${description} ('#${id}') was not found.`);
        }
        return element;
    };

    const contactForm = getElement('contact-form', 'Contact Form');
    const contactStatusDiv = getElement('contact-status', 'Contact Form Status Display');
    const contactSalesButton = document.querySelector('.enterprise-contact-sales-btn');
    const paymentButtons = document.querySelectorAll('.paystack-button');

    // --- Verify Dependencies ---
    if (!uplasApi || !uplasApi.fetchAuthenticated) {
        console.error("upricing.js: CRITICAL - uplasApi or fetchAuthenticated is not available. Payment and contact features will fail.");
        return; // Stop execution if core dependencies are missing
    }
    if (typeof PaystackPop === 'undefined') {
        console.error("upricing.js: CRITICAL - PaystackPop is not defined. Ensure the Paystack Inline JS script is loaded before this script.");
        return;
    }

    /**
     * @function initiatePaystackPayment
     * @description A reusable function to handle Paystack payment popups.
     * @param {object} paymentDetails - The details required for the payment.
     * @param {string} paymentDetails.key - Your Paystack public key.
     * @param {string} paymentDetails.email - The user's email address.
     * @param {number} paymentDetails.amount - The amount in the lowest currency denomination (e.g., kobo, cents).
     * @param {string} paymentDetails.ref - A unique transaction reference.
     * @param {function} paymentDetails.callback - A function to execute upon successful payment.
     */
    function initiatePaystackPayment(paymentDetails) {
        const handler = PaystackPop.setup({
            key: paymentDetails.key,
            email: paymentDetails.email,
            amount: paymentDetails.amount,
            ref: paymentDetails.ref,
            // metadata can be used to pass additional info to your backend
            metadata: {
                plan_name: paymentDetails.planName,
                billing_cycle: paymentDetails.billingCycle,
                user_id: paymentDetails.userId // Assuming you can get this from uplasApi
            },
            callback: function(response) {
                console.log('Paystack payment successful. Reference:', response.reference);
                // The callback function provided will handle backend verification
                paymentDetails.callback(response.reference);
            },
            onClose: function() {
                console.log('Paystack payment popup closed by user.');
                // Optionally re-enable the button or show a message
            }
        });
        handler.openIframe();
    }

    /**
     * @function handlePaymentVerification
     * @description Sends the transaction reference to the backend for verification.
     * @param {string} reference - The transaction reference from Paystack.
     */
    async function handlePaymentVerification(reference) {
        // Here you would show a spinner or loading state to the user
        console.log(`Verifying payment with reference: ${reference}`);
        try {
            const response = await uplasApi.fetchAuthenticated('/api/v1/payments/verify-payment/', {
                method: 'POST',
                body: JSON.stringify({
                    payment_ref: reference
                }),
            });

            if (!response.ok) {
                // Handle non-2xx responses (e.g., 400, 404, 500)
                const errorData = await response.json().catch(() => ({ detail: 'Verification request failed with a non-JSON response.' }));
                throw new Error(errorData.detail || `Server responded with status: ${response.status}`);
            }

            const result = await response.json();

            if (result.status === 'success') {
                console.log('Payment verification successful:', result.message);
                alert('Payment Successful! Your plan has been activated.');
                // Redirect to the user's dashboard or a "thank you" page
                window.location.href = '/uprojects.html';
            } else {
                // Handle cases where the backend verification failed (e.g., ref not found, already used)
                console.error('Backend payment verification failed:', result.message);
                alert(`Payment Verification Failed: ${result.message}`);
            }

        } catch (error) {
            console.error('An error occurred during payment verification:', error);
            alert('An error occurred while trying to verify your payment. Please contact support with your transaction reference.');
        } finally {
            // Hide the spinner/loading state
        }
    }


    /**
     * @function handlePlanSelection
     * @description Handles the click event for all payment buttons.
     */
    function handlePlanSelection(event) {
        event.preventDefault();
        const button = event.currentTarget;

        // 1. Check for user login
        if (!uplasApi.isUserLoggedIn()) {
            alert(uplasTranslate('auth_required_for_purchase', { fallback: 'You must be logged in to make a purchase. Redirecting to login.' }));
            // Save intended action and redirect
            sessionStorage.setItem('uplas_post_auth_action', JSON.stringify({ type: 'purchase', planId: button.dataset.planId }));
            window.location.href = '/index.html#auth-section';
            return;
        }

        const userData = uplasApi.getUserData();

        // 2. Gather plan data from the button's data attributes
        const price = parseFloat(button.dataset.price);
        const planName = button.dataset.planName;
        const billingCycle = button.dataset.billingCycle;

        if (isNaN(price) || !planName) {
            console.error('Payment button is missing required data attributes (data-price, data-plan-name).', button);
            alert('Could not process payment. Plan information is missing. Please refresh the page.');
            return;
        }

        // 3. Generate a unique transaction reference
        const uniqueRef = `uplas_${planName.replace(/\s+/g, '_')}_${Date.now()}`;

        // 4. Prepare payment details and initiate Paystack
        const paymentDetails = {
            key: PAYSTACK_PUBLIC_KEY,
            email: userData.email,
            amount: Math.round(price * 100), // Convert to kobo/cents and ensure it's an integer
            ref: uniqueRef,
            planName: planName,
            billingCycle: billingCycle,
            userId: userData.id,
            callback: handlePaymentVerification // Pass the verification function as the callback
        };

        console.log('Initiating Paystack payment with details:', { ...paymentDetails, key: '***' });
        initiatePaystackPayment(paymentDetails);
    }

    // --- Attach Event Listeners ---
    paymentButtons.forEach(button => {
        button.addEventListener('click', handlePlanSelection);
    });

    if (contactSalesButton && uplasScrollToElement) {
        contactSalesButton.addEventListener('click', (e) => {
            e.preventDefault();
            uplasScrollToElement('#contact-section');
        });
    }

    if (contactForm && contactStatusDiv && uplasApi) {
        contactForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const formData = new FormData(contactForm);
            const data = Object.fromEntries(formData.entries());
            const statusMessageEl = contactStatusDiv.querySelector('p');

            // Basic validation
            if (!data.name || !data.email || !data.message) {
                 statusMessageEl.textContent = uplasTranslate('form_error_fill_all', { fallback: "Please fill out all required fields." });
                 statusMessageEl.className = 'status-message error';
                 contactStatusDiv.style.display = 'block';
                 return;
            }

            statusMessageEl.textContent = uplasTranslate('form_status_sending', { fallback: 'Sending...' });
            statusMessageEl.className = 'status-message info';
            contactStatusDiv.style.display = 'block';

            try {
                // Using the generic uplasApi.fetch, assuming it's configured for unauthenticated POSTs too
                const response = await uplasApi.fetch('/api/v1/contact/', { // Example endpoint
                    method: 'POST',
                    body: JSON.stringify(data),
                });

                if (!response.ok) {
                    const errorData = await response.json().catch(() => ({ detail: 'An unknown error occurred.' }));
                    throw new Error(errorData.detail);
                }

                const result = await response.json();
                statusMessageEl.textContent = uplasTranslate('form_success_contact', { fallback: 'Thank you for your message! We will get back to you shortly.' });
                statusMessageEl.className = 'status-message success';
                contactForm.reset();

            } catch (error) {
                console.error("Contact form submission error:", error);
                statusMessageEl.textContent = uplasTranslate('form_error_generic_submit', { fallback: `An error occurred: ${error.message}` });
                statusMessageEl.className = 'status-message error';
            }
        });
    }

    // --- Currency Change Handling ---
    // Listen for the global currency change event dispatched from global.js
    window.addEventListener('currencyChanged', (event) => {
        console.log(`upricing.js: Currency changed to ${event.detail.newCurrency}. Updating prices.`);
        if (typeof updateUserCurrencyDisplay === 'function') {
            updateUserCurrencyDisplay();
        }
    });

    console.log("upricing.js: Uplas Pricing Page initialized successfully.");
});
