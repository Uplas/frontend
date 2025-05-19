```javascript
// js/mcourseD.js
/* ==========================================================================
   Uplas Course Detail Page Specific JavaScript (mcourseD.js)
   - Handles tabs, curriculum accordion, payment modal, masterclass display.
   - Relies on global.js for theme, nav, language, currency.
   ========================================================================== */
'use strict';

document.addEventListener('DOMContentLoaded', () => {
    // --- Global Element Selectors (from HTML) ---
    // Theme, Nav, Language, Currency are handled by js/global.js

    // Course Tabs
    const courseTabsNav = document.querySelector('.course-tabs__nav');
    const courseTabButtons = document.querySelectorAll('.course-tabs__button');
    const courseTabPanels = document.querySelectorAll('.course-tabs__panel');

    // Curriculum Accordion
    const moduleAccordion = document.getElementById('module-accordion');

    // Payment Modal & Related Elements
    const paymentModal = document.getElementById('payment-modal');
    const closeModalButton = document.getElementById('payment-modal-close-btn');
    const enrollNowMainCTA = document.getElementById('enroll-now-main-cta'); // Hero CTA
    const sidebarEnrollCourseButton = document.getElementById('sidebar-enroll-course-btn'); // Sidebar "Buy This Course"
    const sidebarPlanButtons = document.querySelectorAll('.pricing-options-sidebar .select-plan-btn'); // Subscription buttons
    const buyModuleButtons = document.querySelectorAll('.buy-module-btn'); // Unlock module buttons

    // Payment Modal - Summary
    const summaryPlanNameEl = document.getElementById('summary-plan-name-span');
    const summaryPlanPriceEl = document.getElementById('summary-plan-price-span'); // This element will display the formatted price
    const summaryBillingCycleDiv = document.getElementById('summary-billing-cycle-div');
    const summaryBillingCycleEl = document.getElementById('summary-billing-cycle-span');

    // Payment Modal - Gateway Selection & Panels (IDs assumed from HTML)
    const gatewaySelector = document.querySelector('.payment-gateway-selector');
    const gatewayButtons = document.querySelectorAll('.payment-gateway-selector__option');
    const gatewayPanels = document.querySelectorAll('.payment-gateway-panel');
    const paymentInstructionsDiv = document.getElementById('payment-instructions-div');

    // Payment Modal - Forms & Specific Inputs
    const mpesaForm = document.getElementById('mpesa-payment-form');
    const mpesaPhoneInput = document.getElementById('mpesa-phone-input');
    const mpesaPhoneErrorMsg = document.getElementById('mpesa-phone-error-msg');
    // Stripe related elements (if Stripe.js is used directly)
    const stripeForm = document.getElementById('stripe-payment-form');
    const stripeCardholderNameInput = document.getElementById('stripe-cardholder-name');
    const stripeCardElementDiv = document.getElementById('stripe-card-element');
    const stripeCardErrorsDiv = document.getElementById('stripe-card-errors');
    // Flutterwave button
    const flutterwaveInitiateBtn = document.getElementById('flutterwave-initiate-btn');
    // PayPal container
    const paypalButtonContainer = document.getElementById('paypal-button-container-div');
    // Bank transfer
    const bankTransactionRefInput = document.getElementById('bank-transaction-ref');

    const paymentFormGlobalStatus = document.getElementById('payment-form-global-status');
    const paymentSubmitButton = document.getElementById('payment-submit-button');

    // Masterclass Section
    const masterclassSection = document.getElementById('video-masterclass-section');
    const masterclassGridContainer = document.getElementById('masterclass-grid-container');
    const masterclassNoAccessMessage = masterclassGridContainer?.querySelector('.masterclass-no-access-message');
    const masterclassUpgradeCTAContainer = document.getElementById('masterclass-upgrade-cta-container');


    // --- State Variables ---
    let isModalOpen = false;
    let currentSelectedPlan = null; // Stores { name, priceUsd, id, billingCycle }
    let currentPaymentGateway = null;

    // --- Helper Functions ---
    const focusFirstElement = (container) => { /* ... (same as in previous js/global.js or mcourseD.js, ensure it's available) ... */ };
    const displayPaymentStatus = (message, type, isLoading = false, translateKey = null) => { /* ... (similar to uhome.js, adapt for this page's status element) ... */
        if (!paymentFormGlobalStatus) return;
        const text = translateKey && window.uplasTranslate ? window.uplasTranslate(translateKey) : message;
        paymentFormGlobalStatus.textContent = text;
        paymentFormGlobalStatus.className = 'form__status payment-status-message'; // Reset
        if(type) paymentFormGlobalStatus.classList.add(type); // e.g., 'success', 'error', 'info'
        paymentFormGlobalStatus.hidden = false;
        // Add loading spinner if isLoading
    };
    const clearPaymentStatus = () => {
        if (paymentFormGlobalStatus) {
            paymentFormGlobalStatus.hidden = true;
            paymentFormGlobalStatus.textContent = '';
            paymentFormGlobalStatus.className = 'form__status payment-status-message';
        }
    };


    // --- Course Content Tabs ---
    if (courseTabsNav) { /* ... (Same tab logic as original mcourseD.js) ... */ }

    // --- Curriculum Accordion ---
    if (moduleAccordion) { /* ... (Same accordion logic as original mcourseD.js) ... */ }


    // --- Payment Modal Logic ---
    function updatePaymentModalSummary() {
        if (!currentSelectedPlan || !summaryPlanNameEl || !summaryPlanPriceEl || !summaryBillingCycleDiv || !summaryBillingCycleEl) return;

        summaryPlanNameEl.textContent = currentSelectedPlan.name;
        // Set the base USD price on the data attribute. global.js will handle display conversion.
        summaryPlanPriceEl.dataset.priceUsd = currentSelectedPlan.priceUsd;
        // Trigger global currency update for this specific element
        if (window.updateUserCurrencyDisplay) window.updateUserCurrencyDisplay();


        if (currentSelectedPlan.billingCycle && currentSelectedPlan.billingCycle.toLowerCase() !== 'one-time') {
            summaryBillingCycleEl.textContent = currentSelectedPlan.billingCycle; // This might also need translation
            summaryBillingCycleDiv.hidden = false;
        } else {
            summaryBillingCycleDiv.hidden = true;
        }
    }

    function openPaymentModal(planData) { // planData expects { name, priceUsd, id, billingCycle }
        currentSelectedPlan = planData;
        updatePaymentModalSummary();

        gatewayButtons.forEach(btn => btn.setAttribute('aria-selected', 'false'));
        gatewayPanels.forEach(panel => panel.hidden = true);
        if (paymentInstructionsDiv) {
            paymentInstructionsDiv.textContent = 'Select your preferred payment method to continue.';
            // TODO: Add data-translate-key="payment_modal_instructions_default" and call translate for this element
        }
        if (paymentSubmitButton) {
            paymentSubmitButton.textContent = 'Select Payment Method to Continue'; // TODO: Translate
            paymentSubmitButton.disabled = true;
        }
        currentPaymentGateway = null;
        clearPaymentStatus();

        if (paymentModal) {
            paymentModal.hidden = false;
            document.body.style.overflow = 'hidden';
            setTimeout(() => paymentModal.classList.add('active'), 10); // For CSS transition
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
            }, 300); // Match CSS transition
        }
    }

    // Attach event listeners to all plan selection buttons
    const allPlanButtons = [enrollNowMainCTA, sidebarEnrollCourseButton, ...sidebarPlanButtons, ...buyModuleButtons];
    allPlanButtons.forEach(button => {
        if (button) {
            button.addEventListener('click', (event) => {
                event.preventDefault();
                const planData = {
                    id: button.dataset.planId || button.dataset.moduleId, // Use moduleId if it's a module button
                    name: button.dataset.name || `Module ${button.dataset.moduleId}`, // Fallback name
                    priceUsd: button.dataset.priceUsd, // IMPORTANT: Expecting data-price-usd now
                    billingCycle: button.dataset.billingCycle || 'One-time'
                };
                if (!planData.priceUsd) {
                    console.error("Button is missing data-price-usd attribute:", button);
                    alert("Error: Price information is missing for this item.");
                    return;
                }
                openPaymentModal(planData);
            });
        }
    });

    if (closeModalButton) closeModalButton.addEventListener('click', closePaymentModal);
    document.addEventListener('keydown', (event) => { if (event.key === 'Escape' && isModalOpen) closePaymentModal(); });
    paymentModal?.addEventListener('click', (event) => { if (event.target === paymentModal) closePaymentModal(); });


    function updatePaymentFormForGateway(gateway) {
        if (!paymentInstructionsDiv || !paymentSubmitButton) return;
        let instructionsKey = 'payment_modal_instructions_default'; // Default translation key
        let submitTextKey = 'payment_modal_submit_default';
        paymentSubmitButton.disabled = false;

        // Clear previous form states/errors
        if (mpesaPhoneErrorMsg) mpesaPhoneErrorMsg.textContent = '';
        if (stripeCardErrorsDiv) stripeCardErrorsDiv.textContent = '';
        [mpesaPhoneInput, stripeCardholderNameInput, bankTransactionRefInput].forEach(input => {
            if(input) input.required = false;
        });


        switch (gateway) {
            case 'mpesa':
                instructionsKey = 'payment_modal_instructions_mpesa';
                submitTextKey = 'payment_modal_submit_mpesa';
                if(mpesaPhoneInput) mpesaPhoneInput.required = true;
                break;
            case 'stripe':
                instructionsKey = 'payment_modal_instructions_stripe';
                submitTextKey = 'payment_modal_submit_stripe'; // Will be dynamic with price
                if(stripeCardholderNameInput) stripeCardholderNameInput.required = true;
                // TODO: Initialize Stripe.js Elements if not already done
                // setupStripe();
                break;
            case 'flutterwave':
                instructionsKey = 'payment_modal_instructions_flutterwave';
                submitTextKey = 'payment_modal_submit_flutterwave';
                // Flutterwave might use its own button/modal, main submit might be hidden/changed
                break;
            case 'paypal':
                instructionsKey = 'payment_modal_instructions_paypal';
                submitTextKey = 'payment_modal_submit_paypal';
                // TODO: Render PayPal button if SDK is used
                // setupPayPalButton();
                break;
            case 'bank':
                instructionsKey = 'payment_modal_instructions_bank';
                submitTextKey = 'payment_modal_submit_bank';
                if(bankTransactionRefInput) bankTransactionRefInput.required = false; // Optional
                break;
            default:
                paymentSubmitButton.disabled = true;
        }

        // Translate and update
        if (window.uplasTranslate) {
            paymentInstructionsDiv.textContent = window.uplasTranslate(instructionsKey, "Select your preferred payment method to continue.");
            let submitText = window.uplasTranslate(submitTextKey, "Proceed");
            if (gateway === 'stripe' && currentSelectedPlan?.priceUsd) {
                // For Stripe, include the price dynamically. This needs careful translation handling for currency symbols.
                // The global currency display should handle the price element itself.
                // Here we just construct the button text.
                const priceDisplay = document.createElement('span');
                priceDisplay.dataset.priceUsd = currentSelectedPlan.priceUsd;
                if(window.updateUserCurrencyDisplay) window.updateUserCurrencyDisplay(); // Ensure this element is updated
                submitText = `${window.uplasTranslate('pay_button_prefix', "Pay")} ${priceDisplay.textContent}`; // Example, needs better i18n for "Pay AMOUNT"
            }
             paymentSubmitButton.innerHTML = `<i class="fas fa-shield-alt"></i> ${submitText}`;
        } else { // Fallback if translation function not ready
            paymentInstructionsDiv.textContent = "Instructions for " + gateway;
            paymentSubmitButton.innerHTML = `<i class="fas fa-shield-alt"></i> Proceed with ${gateway}`;
        }
    }

    if (gatewaySelector) {
        gatewaySelector.addEventListener('click', (event) => { /* ... (Same logic as original mcourseD.js, but calls new updatePaymentFormForGateway) ... */
            const selectedButton = event.target.closest('.payment-gateway-selector__option');
            if (!selectedButton) return;
            currentPaymentGateway = selectedButton.dataset.gateway;
            gatewayButtons.forEach(btn => btn.setAttribute('aria-selected', (btn === selectedButton).toString()));
            gatewayPanels.forEach(panel => {
                panel.hidden = (panel.dataset.gatewayPanel !== currentPaymentGateway);
            });
            updatePaymentFormForGateway(currentPaymentGateway);
            clearPaymentStatus();
        });
    }

    // --- Payment Submission Logic ---
    if (paymentSubmitButton) {
        paymentSubmitButton.addEventListener('click', async () => { /* ... (Largely same as original, ensure priceUsd is used for paymentData.amount) ... */
            if (!currentSelectedPlan || !currentPaymentGateway) {
                displayPaymentStatus('Please select a plan and payment method.', 'error', null, 'err_select_plan_method');
                return;
            }
            let isValid = true;
            let paymentData = {
                planId: currentSelectedPlan.id,
                planName: currentSelectedPlan.name,
                amount: currentSelectedPlan.priceUsd, // Use base USD price for backend
                currency: 'USD', // Backend will handle conversion if necessary based on gateway
                billingCycle: currentSelectedPlan.billingCycle,
                gateway: currentPaymentGateway,
                language: document.documentElement.lang || 'en' // Send current language
            };

            // Gateway-specific validation
            switch (currentPaymentGateway) {
                case 'mpesa':
                    if (!mpesaForm?.checkValidity()) {
                        const phoneInput = mpesaForm.querySelector('#mpesa-phone-input');
                        const errorMsgEl = mpesaForm.querySelector('#mpesa-phone-error-msg');
                        if (phoneInput && errorMsgEl) { /* ... detailed error messages ... */ }
                        isValid = false;
                    } else {
                        paymentData.mpesaPhone = mpesaPhoneInput.value;
                    }
                    break;
                case 'stripe':
                    if(stripeCardholderNameInput && !stripeCardholderNameInput.checkValidity()){
                        isValid = false; /* ... error display ... */
                    } else if(stripeCardholderNameInput) {
                        paymentData.cardholderName = stripeCardholderNameInput.value;
                    }
                    // TODO: Stripe.js tokenization/PaymentIntent creation
                    // const stripeTokenOrError = await createStripeToken();
                    // if (stripeTokenOrError.error) { isValid = false; displayPaymentStatus(stripeTokenOrError.error.message, 'error'); }
                    // else { paymentData.stripeToken = stripeTokenOrError.token.id; }
                    break;
                // ... other gateways ...
            }

            if (!isValid) {
                displayPaymentStatus('Please correct the errors in the form.', 'error', null, 'err_correct_form_errors');
                return;
            }

            paymentSubmitButton.disabled = true;
            paymentSubmitButton.innerHTML = `<i class="fas fa-spinner fa-spin"></i> ${window.uplasTranslate ? window.uplasTranslate('payment_processing', 'Processing...') : 'Processing...'}`;
            displayPaymentStatus('Your payment is being processed securely...', 'info', true, 'payment_status_processing');

            // SIMULATE BACKEND CALL
            console.log("Submitting Payment Data:", paymentData);
            setTimeout(() => {
                const isPaymentSuccessful = Math.random() > 0.1;
                if (isPaymentSuccessful) {
                    displayPaymentStatus(`Payment Confirmed for ${currentSelectedPlan.name}!`, 'success', false, 'payment_status_success_generic');
                    setTimeout(closePaymentModal, 3000);
                } else {
                    displayPaymentStatus('Payment Declined. Please check your details or try another method.', 'error', false, 'payment_status_declined');
                    paymentSubmitButton.disabled = false;
                    updatePaymentFormForGateway(currentPaymentGateway); // Reset button
                }
            }, 2500);
        });
    }

    // --- Masterclass Section Logic ---
    const checkUserAccessAndLoadMasterclasses = async () => {
        if (!masterclassSection || !masterclassGridContainer) return;

        // TODO: Replace with actual API call to check user subscription status
        // const userStatus = await fetchAuthenticated('/api/user/status');
        // const hasPremiumAccess = userStatus.isPremiumSubscriber;
        const hasPremiumAccess = Math.random() > 0.5; // Simulate 50% chance of premium access

        if (hasPremiumAccess) {
            if(masterclassNoAccessMessage) masterclassNoAccessMessage.style.display = 'none';
            if(masterclassUpgradeCTAContainer) masterclassUpgradeCTAContainer.style.display = 'none';
            loadMasterclasses();
        } else {
            masterclassGridContainer.innerHTML = ''; // Clear any potential placeholders
            if(masterclassNoAccessMessage) masterclassNoAccessMessage.style.display = 'block';
            if(masterclassUpgradeCTAContainer) masterclassUpgradeCTAContainer.style.display = 'flex'; // Show upgrade CTA
        }
    };

    const loadMasterclasses = async () => {
        // TODO: Fetch masterclass data from backend
        // const masterclasses = await fetchAuthenticated('/api/masterclasses');
        // Simulate data
        const masterclasses = [
            { id: 'mc001', titleKey: 'mcourseD_masterclass_example1_title', mentorKey: 'mcourseD_masterclass_example1_mentor', descKey: 'mcourseD_masterclass_example1_desc', duration: '1h 15min', thumbnailUrl: 'https://placehold.co/400x225/0077b6/FFFFFF?text=Masterclass+Ethics&font=poppins', videoUrl: '#' },
            { id: 'mc002', titleKey: 'mcourseD_masterclass_example2_title', mentorKey: 'mcourseD_masterclass_example2_mentor', descKey: 'mcourseD_masterclass_example2_desc', duration: '58min', thumbnailUrl: 'https://placehold.co/400x225/3d405b/FFFFFF?text=Masterclass+MLOps&font=poppins', videoUrl: '#' }
        ];

        masterclassGridContainer.innerHTML = ''; // Clear placeholders
        if (masterclasses.length === 0) {
            masterclassGridContainer.innerHTML = `<p data-translate-key="mcourseD_masterclass_none_available">No masterclasses available at the moment. Check back soon!</p>`;
        } else {
            masterclasses.forEach(mc => {
                const cardHTML = `
                    <article class="masterclass-card">
                        <a href="${mc.videoUrl}" class="masterclass-card__link" aria-label="Watch Masterclass: ${window.uplasTranslate ? window.uplasTranslate(mc.titleKey) : mc.titleKey}">
                            <div class="masterclass-card__thumbnail-container">
                                <img src="${mc.thumbnailUrl}" alt="${window.uplasTranslate ? window.uplasTranslate(mc.titleKey) : mc.titleKey}" class="masterclass-card__thumbnail">
                                <div class="masterclass-card__play-icon"><i class="fas fa-play-circle"></i></div>
                                <span class="masterclass-card__duration">${mc.duration}</span>
                            </div>
                            <div class="masterclass-card__content">
                                <h3 class="masterclass-card__title" data-translate-key="${mc.titleKey}">${window.uplasTranslate ? window.uplasTranslate(mc.titleKey) : mc.titleKey}</h3>
                                <p class="masterclass-card__mentor" data-translate-key="${mc.mentorKey}">${window.uplasTranslate ? window.uplasTranslate(mc.mentorKey) : mc.mentorKey}</p>
                                <p class="masterclass-card__description" data-translate-key="${mc.descKey}">${window.uplasTranslate ? window.uplasTranslate(mc.descKey) : mc.descKey}</p>
                            </div>
                        </a>
                    </article>
                `;
                masterclassGridContainer.insertAdjacentHTML('beforeend', cardHTML);
            });
        }
        // Re-translate the page if new elements were added with keys
        if (window.translatePage) window.translatePage();
    };

    // --- Initializations ---
    // Global.js handles theme, nav, language, currency initial updates.
    // This page specific initializations:
    checkUserAccessAndLoadMasterclasses(); // Load masterclasses based on access

    // Update copyright year (might be handled by global.js if footer is identical)
    const currentYearFooterSpan = document.getElementById('current-year-footer');
    if (currentYearFooterSpan) {
        const yearText = currentYearFooterSpan.textContent;
        if (yearText && yearText.includes("{currentYear}")) {
            currentYearFooterSpan.textContent = yearText.replace("{currentYear}", new Date().getFullYear());
        } else if (!yearText.includes(new Date().getFullYear().toString())) {
            currentYearFooterSpan.textContent = new Date().getFullYear();
        }
    }

    console.log("Uplas Course Detail Page (mcourseD.js) loaded.");
});
