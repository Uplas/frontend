// js/mcourseD.js
/* ==========================================================================
   Uplas Course Detail Page Specific JavaScript (mcourseD.js)
   - Handles tabs, curriculum accordion, payment modal, masterclass display.
   - Relies on global.js for theme, nav, language, currency.
   - Implements authentication check before loading content.
   ========================================================================== */
'use strict';

// This function will be called if the user is authenticated
function initializeCourseDetailPage() {
    // --- Global Element Selectors (from HTML) ---
    const courseTabsNav = document.querySelector('.course-tabs__nav');
    const courseTabButtons = document.querySelectorAll('.course-tabs__button');
    const courseTabPanels = document.querySelectorAll('.course-tabs__panel');
    const moduleAccordion = document.getElementById('module-accordion');
    const paymentModal = document.getElementById('payment-modal');
    const closeModalButton = document.getElementById('payment-modal-close-btn');
    const enrollNowMainCTA = document.getElementById('enroll-now-main-cta');
    const sidebarEnrollCourseButton = document.getElementById('sidebar-enroll-course-btn');
    const sidebarPlanButtons = document.querySelectorAll('.pricing-options-sidebar .select-plan-btn');
    const buyModuleButtons = document.querySelectorAll('.buy-module-btn');
    const summaryPlanNameEl = document.getElementById('summary-plan-name-span');
    const summaryPlanPriceEl = document.getElementById('summary-plan-price-span');
    const summaryBillingCycleDiv = document.getElementById('summary-billing-cycle-div');
    const summaryBillingCycleEl = document.getElementById('summary-billing-cycle-span');
    const gatewaySelector = document.querySelector('.payment-gateway-selector');
    const gatewayButtons = document.querySelectorAll('.payment-gateway-selector__option');
    const gatewayPanels = document.querySelectorAll('.payment-gateway-panel');
    const paymentInstructionsDiv = document.getElementById('payment-instructions-div');
    const mpesaForm = document.getElementById('mpesa-payment-form');
    const mpesaPhoneInput = document.getElementById('mpesa-phone-input');
    const mpesaPhoneErrorMsg = document.getElementById('mpesa-phone-error-msg');
    const stripeCardholderNameInput = document.getElementById('stripe-cardholder-name');
    const paymentFormGlobalStatus = document.getElementById('payment-form-global-status');
    const paymentSubmitButton = document.getElementById('payment-submit-button');
    const masterclassSection = document.getElementById('video-masterclass-section');
    const masterclassGridContainer = document.getElementById('masterclass-grid-container');
    const masterclassNoAccessMessage = masterclassGridContainer?.querySelector('.masterclass-no-access-message');
    const masterclassUpgradeCTAContainer = document.getElementById('masterclass-upgrade-cta-container');
    const currentYearFooterSpan = document.getElementById('current-year-footer');


    // --- State Variables ---
    let isModalOpen = false;
    let currentSelectedPlan = null;
    let currentPaymentGateway = null;

    // --- Helper Functions ---
    const focusFirstElement = (container) => {
        if (!container) return;
        const focusable = container.querySelector('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])');
        focusable?.focus();
    };

    const displayPaymentStatus = (message, type, isLoading = false, translateKey = null) => {
        if (!paymentFormGlobalStatus) return;
        const text = translateKey && typeof window.uplasTranslate === 'function' ? window.uplasTranslate(translateKey, message) : message;
        paymentFormGlobalStatus.textContent = text;
        paymentFormGlobalStatus.className = 'form__status payment-status-message'; // Reset
        if(type) paymentFormGlobalStatus.classList.add(`payment-status-message--${type}`); // Use modified class for distinct styling if needed
        paymentFormGlobalStatus.hidden = false;
        if (isLoading) {
            // Optional: Add a spinner or loading indicator
            paymentFormGlobalStatus.innerHTML = `<i class="fas fa-spinner fa-spin"></i> ${text}`;
        }
    };
    const clearPaymentStatus = () => {
        if (paymentFormGlobalStatus) {
            paymentFormGlobalStatus.hidden = true;
            paymentFormGlobalStatus.textContent = '';
            paymentFormGlobalStatus.className = 'form__status payment-status-message';
        }
    };

    // --- Course Content Tabs ---
    if (courseTabsNav && courseTabButtons.length > 0 && courseTabPanels.length > 0) {
        courseTabsNav.addEventListener('click', (e) => {
            const clickedButton = e.target.closest('.course-tabs__button');
            if (!clickedButton) return;

            courseTabButtons.forEach(button => {
                button.classList.remove('active');
                button.setAttribute('aria-selected', 'false');
            });
            clickedButton.classList.add('active');
            clickedButton.setAttribute('aria-selected', 'true');

            const targetPanelId = clickedButton.getAttribute('aria-controls');
            courseTabPanels.forEach(panel => {
                panel.hidden = panel.id !== targetPanelId;
                if (panel.id === targetPanelId) {
                    panel.classList.add('active'); // Ensure active class for animations
                } else {
                    panel.classList.remove('active');
                }
            });
        });
    }

    // --- Curriculum Accordion ---
    if (moduleAccordion) {
        moduleAccordion.addEventListener('click', (e) => {
            const button = e.target.closest('.module__toggle-button');
            if (!button) return;

            const contentId = button.getAttribute('aria-controls');
            const content = document.getElementById(contentId);
            const isExpanded = button.getAttribute('aria-expanded') === 'true';

            button.setAttribute('aria-expanded', (!isExpanded).toString());
            if (content) content.hidden = isExpanded;

            const icon = button.querySelector('.module__toggle-icon i');
            if (icon) {
                icon.classList.toggle('fa-chevron-down', isExpanded);
                icon.classList.toggle('fa-chevron-up', !isExpanded);
            }
        });
    }

    // --- Payment Modal Logic ---
    function updatePaymentModalSummary() {
        if (!currentSelectedPlan || !summaryPlanNameEl || !summaryPlanPriceEl || !summaryBillingCycleDiv || !summaryBillingCycleEl) return;
        summaryPlanNameEl.textContent = currentSelectedPlan.name;
        summaryPlanPriceEl.dataset.priceUsd = currentSelectedPlan.priceUsd;

        // Trigger global currency update (ensure global.js function is named updateUserCurrencyDisplay and available)
        if (typeof window.updateUserCurrencyDisplay === 'function') {
            window.updateUserCurrencyDisplay(); // This will format all price elements, including the one in the modal
        } else {
            // Fallback if global updater not ready/available - format directly (less ideal)
             const rate = (typeof window.simulatedExchangeRates !== 'undefined' && window.simulatedExchangeRates[window.currentCurrency || 'USD']) || 1;
             const price = parseFloat(currentSelectedPlan.priceUsd) * rate;
             summaryPlanPriceEl.textContent = `${window.currentCurrency || 'USD'} ${price.toFixed(2)}`;
        }


        if (currentSelectedPlan.billingCycle && currentSelectedPlan.billingCycle.toLowerCase() !== 'one-time') {
            summaryBillingCycleEl.textContent = currentSelectedPlan.billingCycle;
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
        
        const defaultInstructionKey = 'payment_modal_instructions_default';
        const defaultButtonKey = 'payment_modal_submit_default';

        if (paymentInstructionsDiv) {
            paymentInstructionsDiv.textContent = typeof window.uplasTranslate === 'function' ? window.uplasTranslate(defaultInstructionKey, 'Select your preferred payment method to continue.') : 'Select your preferred payment method to continue.';
            paymentInstructionsDiv.dataset.translateKey = defaultInstructionKey; // For potential re-translation
        }
        if (paymentSubmitButton) {
            paymentSubmitButton.innerHTML = `<i class="fas fa-lock"></i> ${typeof window.uplasTranslate === 'function' ? window.uplasTranslate(defaultButtonKey, 'Select Payment Method') : 'Select Payment Method'}`;
            paymentSubmitButton.dataset.translateKey = defaultButtonKey;
            paymentSubmitButton.disabled = true;
        }
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

    const allPlanButtons = [enrollNowMainCTA, sidebarEnrollCourseButton, ...Array.from(sidebarPlanButtons), ...Array.from(buyModuleButtons)];
    allPlanButtons.forEach(button => {
        if (button) {
            button.addEventListener('click', (event) => {
                event.preventDefault();
                const planData = {
                    id: button.dataset.planId || button.dataset.moduleId,
                    name: button.dataset.name || `Module ${button.dataset.moduleId}`,
                    priceUsd: button.dataset.priceUsd,
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
        let instructionsKey = 'payment_modal_instructions_default';
        let submitTextKey = 'payment_modal_submit_default';
        let submitTextContent = "Proceed";
        paymentSubmitButton.disabled = false;

        if (mpesaPhoneErrorMsg) mpesaPhoneErrorMsg.textContent = '';
        [mpesaPhoneInput, stripeCardholderNameInput].forEach(input => {
            if(input) input.required = false;
        });

        switch (gateway) {
            case 'mpesa':
                instructionsKey = 'payment_modal_instructions_mpesa';
                submitTextKey = 'payment_modal_submit_mpesa';
                submitTextContent = "Pay with M-Pesa";
                if(mpesaPhoneInput) mpesaPhoneInput.required = true;
                break;
            case 'stripe':
                instructionsKey = 'payment_modal_instructions_stripe';
                submitTextKey = 'payment_modal_submit_stripe_dynamic';
                submitTextContent = `Pay ${summaryPlanPriceEl?.textContent || currentSelectedPlan?.priceUsd + ' USD'}`; // Dynamic based on current displayed price
                if(stripeCardholderNameInput) stripeCardholderNameInput.required = true;
                // TODO: setupStripe(); if dynamically initializing
                break;
            case 'flutterwave':
                instructionsKey = 'payment_modal_instructions_flutterwave';
                submitTextKey = 'payment_modal_submit_flutterwave';
                submitTextContent = "Pay with Flutterwave";
                break;
            case 'paypal':
                instructionsKey = 'payment_modal_instructions_paypal';
                submitTextKey = 'payment_modal_submit_paypal';
                submitTextContent = "Pay with PayPal";
                 // TODO: setupPayPalButton();
                break;
            case 'bank':
                instructionsKey = 'payment_modal_instructions_bank';
                submitTextKey = 'payment_modal_submit_bank';
                submitTextContent = "Confirm Bank Transfer";
                break;
            default:
                submitTextContent = "Select Payment Method";
                paymentSubmitButton.disabled = true;
        }
        
        paymentInstructionsDiv.textContent = typeof window.uplasTranslate === 'function' ? window.uplasTranslate(instructionsKey, "Follow instructions for " + gateway) : "Follow instructions for " + gateway;
        paymentInstructionsDiv.dataset.translateKey = instructionsKey;
        
        if (gateway === 'stripe' && currentSelectedPlan?.priceUsd) {
             const formattedPrice = summaryPlanPriceEl?.textContent || `${parseFloat(currentSelectedPlan.priceUsd).toFixed(2)} ${localStorage.getItem('uplasUserCurrency') || 'USD'}`;
             submitTextContent = (typeof window.uplasTranslate === 'function' ? window.uplasTranslate('pay_amount_button_text', "Pay {amount}") : "Pay {amount}").replace("{amount}", formattedPrice);
             paymentSubmitButton.dataset.translateKey = 'pay_amount_button_text'; // For dynamic part, translation needs placeholder support
        } else {
            submitTextContent = typeof window.uplasTranslate === 'function' ? window.uplasTranslate(submitTextKey, submitTextContent) : submitTextContent;
            paymentSubmitButton.dataset.translateKey = submitTextKey;
        }
        paymentSubmitButton.innerHTML = `<i class="fas fa-shield-alt"></i> ${submitTextContent}`;
    }

    if (gatewaySelector) {
        gatewaySelector.addEventListener('click', (event) => {
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

    if (paymentSubmitButton) {
        paymentSubmitButton.addEventListener('click', async () => {
            if (!currentSelectedPlan || !currentPaymentGateway) {
                displayPaymentStatus('Please select a plan and payment method.', 'error', false, 'err_select_plan_method');
                return;
            }
            let isValid = true;
            let paymentData = {
                planId: currentSelectedPlan.id,
                planName: currentSelectedPlan.name,
                amount: parseFloat(currentSelectedPlan.priceUsd),
                currency: 'USD', // Always send USD to backend, backend handles conversions if needed
                billingCycle: currentSelectedPlan.billingCycle,
                gateway: currentPaymentGateway,
                language: document.documentElement.lang || 'en'
            };

            switch (currentPaymentGateway) {
                case 'mpesa':
                    if (!mpesaForm?.checkValidity()) {
                        isValid = false;
                        if(mpesaPhoneInput && mpesaPhoneErrorMsg) {
                            mpesaPhoneErrorMsg.textContent = mpesaPhoneInput.validationMessage;
                        }
                    } else {
                        paymentData.mpesaPhone = mpesaPhoneInput.value;
                    }
                    break;
                // Add other gateway validations if needed
            }

            if (!isValid) {
                displayPaymentStatus('Please correct the errors in the form.', 'error', false, 'err_correct_form_errors');
                return;
            }

            paymentSubmitButton.disabled = true;
            paymentSubmitButton.innerHTML = `<i class="fas fa-spinner fa-spin"></i> ${typeof window.uplasTranslate === 'function' ? window.uplasTranslate('payment_processing', 'Processing...') : 'Processing...'}`;
            displayPaymentStatus('Your payment is being processed securely...', 'info', true, 'payment_status_processing');
            
            // Backend Integration: Send paymentData
            // const response = await fetchAuthenticated('/api/payments/initiate', {method: 'POST', body: JSON.stringify(paymentData) });
            // const result = response; // fetchAuthenticated should handle JSON parsing

            console.log("Submitting Payment Data (mcourseD):", paymentData);
            setTimeout(() => { // Simulate API call
                const isPaymentSuccessful = Math.random() > 0.1;
                if (isPaymentSuccessful) {
                    displayPaymentStatus(`Payment Confirmed for ${currentSelectedPlan.name}!`, 'success', false, 'payment_status_success_generic');
                    // Backend Integration: On success, unlock course/module access for the user
                    // E.g., update UI, redirect to mcourse.html
                    setTimeout(() => {
                        closePaymentModal();
                        // Potentially redirect to the learning page if a specific module/course was bought
                        // window.location.href = `mcourse.html?courseId=${paymentData.planId}`; // Example
                    }, 3000);
                } else {
                    displayPaymentStatus('Payment Declined. Please check your details or try another method.', 'error', false, 'payment_status_declined');
                    paymentSubmitButton.disabled = false;
                    updatePaymentFormForGateway(currentPaymentGateway);
                }
            }, 2500);
        });
    }

    // --- Masterclass Section Logic ---
    const checkUserAccessAndLoadMasterclasses = async () => { /* ... (content from mcourseD (2).js) ... */ }; // Keep existing
    const loadMasterclasses = async () => {  /* ... (content from mcourseD (2).js) ... */ }; // Keep existing

    // --- Initializations ---
    // Backend Integration: Fetch actual course data based on URL (e.g., /api/courses/adv_ai)
    // For now, this script assumes static content or that global.js handles initial i18n/l10n.
    
    // Get course ID from URL (example)
    const urlParams = new URLSearchParams(window.location.search);
    const courseId = urlParams.get('courseId');
    if (courseId) {
        console.log("Loading details for course:", courseId);
        // Backend Integration: Call a function here to fetch course-specific data
        // fetchCourseDetails(courseId); 
        // This function would populate title, description, curriculum, etc.
    } else {
        console.warn("No courseId found in URL. Displaying generic content.");
        // Potentially show an error or redirect if courseId is mandatory
    }

    checkUserAccessAndLoadMasterclasses();

    if (currentYearFooterSpan) {
        const yearText = currentYearFooterSpan.textContent;
        if (yearText && yearText.includes("{currentYear}")) {
            currentYearFooterSpan.textContent = yearText.replace("{currentYear}", new Date().getFullYear());
        } else if (yearText && !yearText.includes(new Date().getFullYear().toString())) {
             currentYearFooterSpan.textContent = new Date().getFullYear();
        }
    }
    console.log("Uplas Course Detail Page (mcourseD.js) initialized.");
}


document.addEventListener('DOMContentLoaded', () => {
    // --- Authentication Check ---
    if (typeof getAuthToken !== 'function') {
        console.error('getAuthToken function is not defined. Ensure apiUtils.js is loaded correctly.');
        const mainContent = document.getElementById('main-content'); // As per mcourseD (2).html
        if (mainContent) {
            mainContent.innerHTML = '<p style="text-align:center; padding: 20px; color: red;">Authentication utility is missing. Page cannot load correctly.</p>';
        }
        return;
    }
    const authToken = getAuthToken();

    if (!authToken) {
        console.log('User not authenticated for course detail. Redirecting to login.');
        const currentPath = window.location.pathname + window.location.search + window.location.hash;
        window.location.href = `index.html#auth-section&returnUrl=${encodeURIComponent(currentPath)}`;
    } else {
        console.log('User authenticated. Initializing course detail page.');
        initializeCourseDetailPage();
    }
});
