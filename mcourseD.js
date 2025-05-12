/* ==========================================================================
   mcourse_detail_page.js (Definitive Functional Version)
   --------------------------------------------------------------------------
   Handles all interactivity for the Uplas Course Detail Page:
   - Theme Toggle (assumes uhome.js might also handle this, provides hooks)
   - Mobile Navigation Toggle (assumes uhome.js might also handle this)
   - Course Content Tabs
   - Curriculum Accordion
   - Payment Plan Selection & Modal Triggering
   - Dynamic Payment Modal (Gateway Selection, Form Display)
   - Simulated Payment Submission & Confirmation
   - Accessibility enhancements for dynamic content.
   ========================================================================== */

'use strict';

document.addEventListener('DOMContentLoaded', () => {

    // --- Global Element Selectors (from the Definitive HTML V9) ---
    const body = document.body;
    const themeToggleButton = document.getElementById('theme-toggle');
    const mobileNavToggleButton = document.getElementById('mobile-nav-toggle');
    const mainNav = document.querySelector('.header .nav'); // Assuming this is the main nav UL/DIV

    // Course Tabs
    const courseTabsNav = document.querySelector('.course-tabs__nav');
    const courseTabButtons = document.querySelectorAll('.course-tabs__button');
    const courseTabPanels = document.querySelectorAll('.course-tabs__panel');

    // Curriculum Accordion
    const moduleAccordion = document.getElementById('module-accordion');

    // Payment Modal & Related Elements
    const paymentModal = document.getElementById('payment-modal');
    const closeModalButton = document.getElementById('payment-modal-close-btn');
    const enrollNowMainCTA = document.getElementById('enroll-now-main-cta');
    const sidebarEnrollCourseButton = document.getElementById('sidebar-enroll-course-btn');
    const sidebarPlanButtons = document.querySelectorAll('.pricing-options-sidebar .select-plan-btn');
    const buyModuleButtons = document.querySelectorAll('.buy-module-btn');

    // Payment Modal - Summary
    const summaryPlanNameEl = document.getElementById('summary-plan-name-span');
    const summaryPlanPriceEl = document.getElementById('summary-plan-price-span');
    const summaryBillingCycleDiv = document.getElementById('summary-billing-cycle-div');
    const summaryBillingCycleEl = document.getElementById('summary-billing-cycle-span');

    // Payment Modal - Gateway Selection
    const gatewaySelector = document.querySelector('.payment-gateway-selector');
    const gatewayButtons = document.querySelectorAll('.payment-gateway-selector__option');
    const gatewayPanels = document.querySelectorAll('.payment-gateway-panel');
    const paymentInstructionsDiv = document.getElementById('payment-instructions-div');

    // Payment Modal - Forms & Specific Inputs
    const mpesaForm = document.getElementById('mpesa-payment-form');
    const mpesaPhoneInput = document.getElementById('mpesa-phone-input');
    const mpesaPhoneErrorMsg = document.getElementById('mpesa-phone-error-msg');

    const stripeForm = document.getElementById('stripe-payment-form'); // Assuming the panel for Stripe has this form
    const stripeCardholderNameInput = document.getElementById('stripe-cardholder-name'); // From Definitive HTML V9
    const stripeCardElementDiv = document.getElementById('stripe-card-element'); // From Definitive HTML V9
    const stripeCardErrorsDiv = document.getElementById('stripe-card-errors'); // From Definitive HTML V9

    const flutterwaveCheckoutButton = document.getElementById('flutterwave-checkout-button'); // Specific button for Flutterwave
    const flutterwaveInitiateBtn = document.getElementById('flutterwave-initiate-btn');


    const paypalButtonContainer = document.getElementById('paypal-button-container-div'); // For PayPal SDK

    const bankTransferNotifyForm = document.getElementById('bank-transfer-notify-form');
    const bankTransactionRefInput = document.getElementById('bank-transaction-ref');

    const paymentFormGlobalStatus = document.getElementById('payment-form-global-status');
    const paymentSubmitButton = document.getElementById('payment-submit-button');

    // Footer Year
    const currentYearFooterSpan = document.getElementById('current-year-footer');

    // --- State Variables ---
    let isModalOpen = false;
    let currentSelectedPlan = null; // To store { name, price, id, billingCycle }
    let currentPaymentGateway = null; // To store selected gateway e.g., 'mpesa', 'stripe'

    // --- Helper Functions ---

    /**
     * Toggles visibility of an element using the 'hidden' attribute.
     * @param {HTMLElement} element - The element to toggle.
     * @param {boolean} [forceShow] - Optional. True to force show, false to force hide.
     */
    const toggleHidden = (element, forceShow) => {
        if (!element) return;
        const shouldShow = typeof forceShow === 'boolean' ? forceShow : element.hidden;
        element.hidden = !shouldShow;
    };

    /**
     * Sets focus on the first focusable element within a container.
     * @param {HTMLElement} container - The container element.
     */
    const focusFirstElement = (container) => {
        if (!container) return;
        const focusableElements = container.querySelectorAll(
            'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        );
        const firstFocusable = Array.from(focusableElements).find(el => !el.hidden && !el.disabled);
        firstFocusable?.focus();
    };

    // --- Theme Toggle (Replicating basic uhome.js functionality if needed standalone) ---
    // This assumes your main uhome.js might handle this globally.
    // If this page's JS needs to control it independently or has different buttons:
    if (themeToggleButton) {
        const applyTheme = () => {
            const savedDarkMode = localStorage.getItem('uplasDarkMode');
            const isDarkMode = savedDarkMode === 'true' || (savedDarkMode === null && window.matchMedia('(prefers-color-scheme: dark)').matches);
            body.classList.toggle('dark-mode', isDarkMode);
            themeToggleButton.setAttribute('aria-label', isDarkMode ? 'Switch to Light Mode' : 'Switch to Dark Mode');
            // Ensure only one icon is visible based on theme (CSS should primarily handle this with .theme-icon classes)
        };

        themeToggleButton.addEventListener('click', () => {
            const isDarkMode = body.classList.toggle('dark-mode');
            localStorage.setItem('uplasDarkMode', isDarkMode);
            applyTheme(); // To update ARIA label
        });
        applyTheme(); // Initial theme application
    }

    // --- Mobile Navigation Toggle (Replicating basic uhome.js functionality) ---
    if (mobileNavToggleButton && mainNav) {
        mobileNavToggleButton.addEventListener('click', () => {
            const isExpanded = mobileNavToggleButton.getAttribute('aria-expanded') === 'true';
            mobileNavToggleButton.setAttribute('aria-expanded', !isExpanded);
            mainNav.classList.toggle('nav--open'); // Assuming .nav--open controls visibility
            // Toggle icon (fa-bars to fa-times)
            const icon = mobileNavToggleButton.querySelector('i');
            if (icon) {
                icon.classList.toggle('fa-bars', isExpanded);
                icon.classList.toggle('fa-times', !isExpanded);
            }
        });
    }

    // --- Course Content Tabs ---
    if (courseTabsNav) {
        courseTabsNav.addEventListener('click', (event) => {
            const clickedTabButton = event.target.closest('.course-tabs__button');
            if (!clickedTabButton || clickedTabButton.getAttribute('aria-selected') === 'true') {
                return; // Clicked on non-button or already active tab
            }

            // Deactivate all tabs and hide all panels
            courseTabButtons.forEach(button => button.setAttribute('aria-selected', 'false'));
            courseTabPanels.forEach(panel => panel.hidden = true);

            // Activate clicked tab and show corresponding panel
            clickedTabButton.setAttribute('aria-selected', 'true');
            const panelId = clickedTabButton.getAttribute('aria-controls');
            const currentPanel = document.getElementById(panelId);
            if (currentPanel) {
                currentPanel.hidden = false;
                // Optional: focus the panel or its first interactive element for accessibility
                // currentPanel.focus(); or focusFirstElement(currentPanel);
            }
        });
    }

    // --- Curriculum Accordion ---
    if (moduleAccordion) {
        moduleAccordion.addEventListener('click', (event) => {
            const toggleButton = event.target.closest('.module__toggle-button');
            if (!toggleButton) return;

            const moduleContentId = toggleButton.getAttribute('aria-controls');
            const moduleContent = document.getElementById(moduleContentId);
            const isExpanded = toggleButton.getAttribute('aria-expanded') === 'true';

            toggleButton.setAttribute('aria-expanded', !isExpanded);
            if (moduleContent) {
                // CSS transition on max-height will handle the animation
                if (!isExpanded) {
                    moduleContent.hidden = false; // Make it part of layout for transition
                    // Force reflow before adding class that changes max-height
                    // This is a common trick for CSS height transitions.
                    // However, for max-height, just setting it should work.
                    // The V12 CSS uses max-height transition based on aria-expanded directly.
                    // So, simply toggling the attribute is enough if CSS is set up for it.
                    // For direct JS control of hidden:
                    // moduleContent.hidden = isExpanded;
                } else {
                    // If using direct hidden attribute for closing, ensure transition is on opacity/transform
                    // For max-height, ensure the CSS handles it.
                    // moduleContent.hidden = true;
                }
            }
        });
    }


    // --- Payment Modal Logic ---

    /**
     * Updates the payment modal summary section.
     */
    function updatePaymentModalSummary() {
        if (!currentSelectedPlan || !summaryPlanNameEl || !summaryPlanPriceEl || !summaryBillingCycleDiv || !summaryBillingCycleEl) return;

        summaryPlanNameEl.textContent = currentSelectedPlan.name;
        summaryPlanPriceEl.textContent = `$${parseFloat(currentSelectedPlan.price).toFixed(2)}`;

        if (currentSelectedPlan.billingCycle && currentSelectedPlan.billingCycle.toLowerCase() !== 'one-time') {
            summaryBillingCycleEl.textContent = currentSelectedPlan.billingCycle;
            summaryBillingCycleDiv.hidden = false;
        } else {
            summaryBillingCycleDiv.hidden = true;
        }
    }

    /**
     * Opens the payment modal and sets the selected plan.
     * @param {object} planData - { name, price, id, billingCycle }
     */
    function openPaymentModal(planData) {
        currentSelectedPlan = planData;
        updatePaymentModalSummary();

        // Reset gateway selection and panels
        gatewayButtons.forEach(btn => btn.setAttribute('aria-selected', 'false'));
        gatewayPanels.forEach(panel => panel.hidden = true);
        if (paymentInstructionsDiv) paymentInstructionsDiv.textContent = 'Select your preferred payment method to continue.';
        if (paymentSubmitButton) {
            paymentSubmitButton.textContent = 'Select Payment Method to Continue';
            paymentSubmitButton.disabled = true;
        }
        currentPaymentGateway = null;
        if(paymentFormGlobalStatus) paymentFormGlobalStatus.hidden = true;


        paymentModal.hidden = false;
        body.style.overflow = 'hidden'; // Prevent background scroll
        isModalOpen = true;
        focusFirstElement(paymentModal); // Focus modal or close button
    }

    /**
     * Closes the payment modal.
     */
    function closePaymentModal() {
        paymentModal.hidden = true;
        body.style.overflow = ''; // Restore background scroll
        isModalOpen = false;
        currentSelectedPlan = null;
        // Potentially focus the button that opened the modal
    }

    // Event listener for the main "Enroll Now" CTA in hero
    if (enrollNowMainCTA) {
        enrollNowMainCTA.addEventListener('click', () => {
            // By default, hero CTA might select the main course purchase
            const planData = {
                id: sidebarEnrollCourseButton?.dataset.planId || 'course_adv_ai',
                name: sidebarEnrollCourseButton?.dataset.name || 'Advanced AI: Theory to Deployment (Full Course)',
                price: sidebarEnrollCourseButton?.dataset.price || '12.00',
                billingCycle: sidebarEnrollCourseButton?.dataset.billingCycle || 'One-time'
            };
            openPaymentModal(planData);
        });
    }

    // Attach event listeners to all "select plan" buttons (sidebar course & subscriptions)
    const allSelectPlanButtons = document.querySelectorAll('.select-plan-btn');
    allSelectPlanButtons.forEach(button => {
        button.addEventListener('click', (event) => {
            event.preventDefault(); // If they are <a> tags
            const planData = {
                id: button.dataset.planId,
                name: button.dataset.name,
                price: button.dataset.price,
                billingCycle: button.dataset.billingCycle
            };
            openPaymentModal(planData);
        });
    });

    // Attach event listeners to "Unlock Module" buttons
    buyModuleButtons.forEach(button => {
        button.addEventListener('click', () => {
            const planData = {
                id: `module_${button.dataset.moduleId}`,
                name: button.dataset.name || `Module ${button.dataset.moduleId}`, // Fallback name
                price: button.dataset.price,
                billingCycle: 'One-time (Per Module)'
            };
            openPaymentModal(planData);
        });
    });


    // Modal Close Button
    if (closeModalButton) {
        closeModalButton.addEventListener('click', closePaymentModal);
    }

    // Close modal on Escape key press
    document.addEventListener('keydown', (event) => {
        if (event.key === 'Escape' && isModalOpen) {
            closePaymentModal();
        }
    });

    // Close modal on overlay click (optional, if modal__content is the actual dialog)
    if (paymentModal) {
        paymentModal.addEventListener('click', (event) => {
            if (event.target === paymentModal) { // Clicked on the overlay itself
                closePaymentModal();
            }
        });
    }

    // Payment Gateway Selection in Modal
    if (gatewaySelector) {
        gatewaySelector.addEventListener('click', (event) => {
            const selectedButton = event.target.closest('.payment-gateway-selector__option');
            if (!selectedButton) return;

            currentPaymentGateway = selectedButton.dataset.gateway;

            // Update button active states
            gatewayButtons.forEach(btn => btn.setAttribute('aria-selected', btn === selectedButton));

            // Show relevant panel and hide others
            gatewayPanels.forEach(panel => {
                panel.hidden = (panel.dataset.gatewayPanel !== currentPaymentGateway);
            });

            // Update payment instructions and submit button text
            updatePaymentFormForGateway(currentPaymentGateway);
            if(paymentFormGlobalStatus) paymentFormGlobalStatus.hidden = true; // Hide previous status
        });
    }

    /**
     * Updates the payment form area based on the selected gateway.
     * @param {string} gateway - The selected gateway (e.g., 'mpesa', 'stripe').
     */
    function updatePaymentFormForGateway(gateway) {
        if (!paymentInstructionsDiv || !paymentSubmitButton) return;

        let instructions = '';
        let submitText = 'Proceed to Payment'; // Default
        paymentSubmitButton.disabled = false; // Enable by default, specific gateways might disable

        // Clear all specific form errors
        if (mpesaPhoneErrorMsg) mpesaPhoneErrorMsg.textContent = '';
        if (stripeCardErrorsDiv) stripeCardErrorsDiv.textContent = '';


        switch (gateway) {
            case 'mpesa':
                instructions = 'Enter your Safaricom M-Pesa number. You will receive an STK push to complete the payment.';
                submitText = 'Initiate M-Pesa Payment';
                if(mpesaPhoneInput) mpesaPhoneInput.required = true;
                if(stripeCardholderNameInput) stripeCardholderNameInput.required = false; // De-require other forms
                break;
            case 'stripe':
                instructions = 'Please enter your card details below. Your payment will be processed securely by Stripe.';
                submitText = `Pay $${parseFloat(currentSelectedPlan?.price || 0).toFixed(2)}`;
                // Initialize Stripe Elements here if not already done
                // setupStripe(); // Placeholder for Stripe Elements initialization
                if(mpesaPhoneInput) mpesaPhoneInput.required = false;
                if(stripeCardholderNameInput) stripeCardholderNameInput.required = true;
                break;
            case 'flutterwave':
                instructions = 'You will be redirected to Flutterwave to complete your payment using various options (Card, Mobile Money, Bank, USSD).';
                submitText = 'Proceed with Flutterwave';
                // Flutterwave might use a redirect or their own button, so the main submit might be hidden/changed
                // For now, we assume the #payment-submit-button will trigger the Flutterwave process conceptually
                if(mpesaPhoneInput) mpesaPhoneInput.required = false;
                if(stripeCardholderNameInput) stripeCardholderNameInput.required = false;
                break;
            case 'paypal':
                instructions = 'You will be redirected to PayPal\'s secure site to complete your payment.';
                submitText = 'Proceed to PayPal';
                // PayPal SDK usually renders its own button. The main submit might be hidden or act as a fallback.
                // setupPayPalButton(); // Placeholder
                if(mpesaPhoneInput) mpesaPhoneInput.required = false;
                if(stripeCardholderNameInput) stripeCardholderNameInput.required = false;
                break;
            case 'bank':
                instructions = 'Follow the instructions to make a direct bank transfer. Your access will be granted upon payment confirmation.';
                submitText = 'I Have Made the Transfer'; // Or similar confirmation
                if(mpesaPhoneInput) mpesaPhoneInput.required = false;
                if(stripeCardholderNameInput) stripeCardholderNameInput.required = false;
                break;
            default:
                instructions = 'Please select a payment method to continue.';
                paymentSubmitButton.disabled = true;
        }
        paymentInstructionsDiv.textContent = instructions;
        paymentSubmitButton.innerHTML = `<i class="fas fa-shield-alt"></i> ${submitText}`; // Add an icon
    }

    // --- Form Validations Specific to Payment Modal ---
    if (mpesaPhoneInput) {
        mpesaPhoneInput.addEventListener('input', () => {
            if (mpesaPhoneInput.validity.valid) {
                if (mpesaPhoneErrorMsg) mpesaPhoneErrorMsg.textContent = '';
            }
        });
    }
    // Stripe and Flutterwave elements often have their own built-in validation and error display.

    // --- Payment Submission Logic ---
    if (paymentSubmitButton) {
        paymentSubmitButton.addEventListener('click', async () => {
            if (!currentSelectedPlan || !currentPaymentGateway) {
                displayPaymentStatus('Please select a plan and payment method.', 'error');
                return;
            }

            let isValid = true;
            let paymentData = {
                planId: currentSelectedPlan.id,
                planName: currentSelectedPlan.name,
                amount: currentSelectedPlan.price,
                billingCycle: currentSelectedPlan.billingCycle,
                gateway: currentPaymentGateway
            };

            // Perform gateway-specific validation and data collection
            switch (currentPaymentGateway) {
                case 'mpesa':
                    if (!mpesaForm.checkValidity()) {
                        // mpesaPhoneInput.reportValidity(); // Native browser validation
                        if(mpesaPhoneErrorMsg && mpesaPhoneInput.validationMessage) {
                            mpesaPhoneErrorMsg.textContent = mpesaPhoneInput.validationMessage;
                        } else if (mpesaPhoneErrorMsg) {
                            mpesaPhoneErrorMsg.textContent = "Please enter a valid Safaricom phone number (e.g., 0712345678).";
                        }
                        isValid = false;
                    } else {
                        paymentData.mpesaPhone = mpesaPhoneInput.value;
                        if (mpesaPhoneErrorMsg) mpesaPhoneErrorMsg.textContent = '';
                    }
                    break;
                case 'stripe':
                    if(stripeCardholderNameInput && !stripeCardholderNameInput.checkValidity()){
                        // stripeCardholderNameInput.reportValidity();
                        const nameError = stripeCardholderNameInput.nextElementSibling; // Assuming error span is next sibling
                        if(nameError && nameError.classList.contains('form__error-message')) {
                            nameError.textContent = stripeCardholderNameInput.validationMessage || "Cardholder name is required.";
                        }
                        isValid = false;
                    } else if(stripeCardholderNameInput) {
                        paymentData.cardholderName = stripeCardholderNameInput.value;
                         const nameError = stripeCardholderNameInput.nextElementSibling;
                         if(nameError) nameError.textContent = '';
                    }
                    // Actual Stripe tokenization/PaymentIntent creation would happen here via Stripe.js
                    // For simulation, we'll assume it's valid if name is provided.
                    // isValid = isValid && (await handleStripePayment()); // Placeholder async function
                    break;
                case 'flutterwave':
                    // Typically, a redirect or Flutterwave's own modal handles this.
                    // So, this button might just trigger that process.
                    // For simulation, we proceed.
                    console.log('Initiating Flutterwave payment (simulated)...');
                    // window.location.href = "/initiate-flutterwave?plan=" + currentSelectedPlan.id; // Example redirect
                    break;
                case 'paypal':
                    // PayPal SDK handles its own flow.
                    console.log('Proceeding with PayPal (simulated)...');
                    // This button click might be redundant if PayPal button is already present and used.
                    break;
                case 'bank':
                    // User confirms they've made the transfer.
                    paymentData.bankTransactionRef = bankTransactionRefInput ? bankTransactionRefInput.value : '';
                    console.log('Bank transfer notification submitted (simulated).');
                    break;
            }

            if (!isValid) {
                displayPaymentStatus('Please correct the errors in the form.', 'error');
                return;
            }

            // --- Simulate Payment Processing ---
            paymentSubmitButton.disabled = true;
            paymentSubmitButton.innerHTML = `<i class="fas fa-spinner fa-spin"></i> Processing...`;
            displayPaymentStatus('Your payment is being processed securely. Please wait...', 'info', true);


            // ** REPLACE THIS TIMEOUT WITH ACTUAL BACKEND INTEGRATION & PAYMENT GATEWAY SDK CALLS **
            setTimeout(() => {
                // Simulate a random success/failure
                const isPaymentSuccessful = Math.random() > 0.1; // 90% success rate for demo

                if (isPaymentSuccessful) {
                    displayPaymentStatus(`Payment Confirmed for ${currentSelectedPlan.name}! You now have access. Welcome aboard!`, 'success');
                    // TODO: Update UI to reflect access (e.g., change "Enroll" to "View Course")
                    // Optionally, redirect or close modal after a delay
                    setTimeout(() => {
                        closePaymentModal();
                        // Example: Redirect to a thank you or dashboard page
                        // window.location.href = '/dashboard?enrollment_success=' + currentSelectedPlan.id;
                    }, 3000);
                } else {
                    displayPaymentStatus('Payment Declined. Please check your payment details or try a different method. If the issue persists, contact support.', 'error');
                    paymentSubmitButton.disabled = false;
                    updatePaymentFormForGateway(currentPaymentGateway); // Reset button text
                }
            }, 2500); // Simulate network delay
        });
    }


    /**
     * Displays a status message in the payment modal.
     * @param {string} message
     * @param {'success'|'error'|'info'} type
     * @param {boolean} [isLoading=false] - If true, shows a loading state.
     */
    function displayPaymentStatus(message, type, isLoading = false) {
        if (!paymentFormGlobalStatus) return;
        paymentFormGlobalStatus.textContent = message;
        paymentFormGlobalStatus.className = 'payment-status-message form__status'; // Reset
        paymentFormGlobalStatus.classList.add(type);
        paymentFormGlobalStatus.hidden = false;

        if (isLoading) {
            // Optionally add a specific class for loading icon if not handled by text
            // paymentFormGlobalStatus.classList.add('loading');
        }
    }


    // --- Placeholder for Stripe.js Setup (Conceptual) ---
    // let stripe, cardElement; // Globally accessible if needed
    // function setupStripe() {
    //     if (typeof Stripe === 'undefined') {
    //         console.error('Stripe.js not loaded');
    //         if(stripeCardErrorsDiv) stripeCardErrorsDiv.textContent = 'Payment system error. Please try again later.';
    //         return;
    //     }
    //     // IMPORTANT: Replace with your actual Stripe publishable key
    //     stripe = Stripe('pk_test_YOUR_STRIPE_PUBLISHABLE_KEY');
    //     const elements = stripe.elements();
    //     cardElement = elements.create('card', {
    //         // Add style options here to match your site's design
    //         // See: https://stripe.com/docs/js/elements_object/create_element?type=card#elements_create-options-style
    //         style: {
    //             base: {
    //                 color: body.classList.contains('dark-mode') ? '#f8f9fa' : '#333745',
    //                 fontFamily: '"Poppins", sans-serif',
    //                 fontSize: '15px', // Approx 0.95rem
    //                 '::placeholder': {
    //                     color: body.classList.contains('dark-mode') ? '#b0bec5' : '#5a5f73',
    //                 },
    //             },
    //             invalid: {
    //                 color: '#dc3545',
    //                 iconColor: '#dc3545',
    //             },
    //         }
    //     });
    //     if (stripeCardElementDiv) {
    //        stripeCardElementDiv.innerHTML = ''; // Clear previous if any
    //        cardElement.mount(stripeCardElementDiv);
    //        cardElement.on('change', (event) => {
    //            if (stripeCardErrorsDiv) stripeCardErrorsDiv.textContent = event.error ? event.error.message : '';
    //        });
    //     }
    // }
    // // Call setupStripe() when 'stripe' gateway is selected, or on modal open if it's the default.

    // --- Placeholder for PayPal SDK Button Rendering (Conceptual) ---
    // function setupPayPalButton() {
    //     if (typeof paypal === 'undefined' || !paypalButtonContainer) {
    //         console.error('PayPal SDK not loaded or container not found.');
    //         if(paypalButtonContainer) paypalButtonContainer.innerHTML = '<p>PayPal option is currently unavailable. Please select another method.</p>';
    //         return;
    //     }
    //     paypalButtonContainer.innerHTML = ''; // Clear any previous button
    //     paypal.Buttons({
    //         createOrder: function(data, actions) {
    //             // Set up the transaction details - get amount from currentSelectedPlan.price
    //             return actions.order.create({
    //                 purchase_units: [{
    //                     description: currentSelectedPlan.name,
    //                     amount: { value: parseFloat(currentSelectedPlan.price).toFixed(2) }
    //                 }]
    //             });
    //         },
    //         onApprove: function(data, actions) {
    //             return actions.order.capture().then(function(details) {
    //                 console.log('PayPal Transaction completed by ' + details.payer.name.given_name, details);
    //                 // ** IMPORTANT: Send `details` or `data.orderID` to your backend for verification and fulfillment **
    //                 displayPaymentStatus(`PayPal Payment Successful for ${currentSelectedPlan.name}! Order ID: ${data.orderID}. Please wait for confirmation...`, 'info', true);
    //                 // Simulate backend verification
    //                 setTimeout(() => {
    //                     displayPaymentStatus(`Payment Confirmed for ${currentSelectedPlan.name}! You now have access.`, 'success');
    //                     setTimeout(closePaymentModal, 2000);
    //                 }, 2000);
    //             });
    //         },
    //         onError: function(err) {
    //             console.error('PayPal Button Error:', err);
    //             displayPaymentStatus('An error occurred with PayPal. Please try another method or contact support.', 'error');
    //         }
    //     }).render(paypalButtonContainer);
    // }
    // // Call setupPayPalButton() when 'paypal' gateway is selected.


    // --- Footer Current Year ---
    if (currentYearFooterSpan) {
        currentYearFooterSpan.textContent = new Date().getFullYear();
    }

}); // End DOMContentLoaded
