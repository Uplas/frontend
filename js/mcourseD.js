// js/mcourseD.js
/* ==========================================================================
   Uplas Course Detail Page Specific JavaScript (mcourseD.js)
   - Handles course/module enrollment via Paystack.
   - Manages UI interactions like expanding modules.
   - Relies on global.js and apiUtils.js.
   ========================================================================== */
'use strict';

document.addEventListener('DOMContentLoaded', () => {
    // --- Element Selectors ---
    const paymentButtons = document.querySelectorAll('.paystack-button');
    const curriculumItems = document.querySelectorAll('.curriculum-item-header');
    // IMPORTANT: Replace with your actual Paystack Public Key
    const PAYSTACK_PUBLIC_KEY = 'pk_test_a75debe223b378631e5b583ddf431631562b781e';
    const uplasApi = window.uplasApi;
    const uplasTranslate = window.uplasTranslate || ((key, opts) => opts.fallback);

    if (paymentButtons.length === 0) {
        console.log("mcourseD.js: No payment buttons found on this page.");
    }
    if (!window.PaystackPop) {
        console.error("mcourseD.js: PaystackPop is not available. Paystack script might be missing or blocked.");
        paymentButtons.forEach(btn => btn.disabled = true);
        return;
    }

    /**
     * @function handlePaymentVerification
     * @description Sends the transaction reference to the backend for verification.
     * @param {string} reference - The transaction reference from Paystack.
     */
    async function handlePaymentVerification(reference) {
        console.log(`Verifying payment for course/module with reference: ${reference}`);
        alert(uplasTranslate('payment_status_verifying', {fallback: 'Payment successful! Verifying your access...'}));

        // In a real implementation, you would call your backend API here.
        /*
        try {
            const response = await uplasApi.fetchAuthenticated('/payments/verify-paystack/', {
                method: 'POST',
                body: JSON.stringify({ reference: reference }),
            });
            const result = await response.json();
            if (result.success) {
                alert('Verification successful! You now have access to the course.');
                window.location.reload(); // Reload to show updated access rights
            } else {
                throw new Error(result.message || 'Verification failed.');
            }
        } catch (error) {
            console.error('An error occurred during payment verification:', error);
            alert('Your payment was successful, but we had trouble verifying it. Please contact support.');
        }
        */

        // For this demo, we'll simulate a successful verification and reload.
        setTimeout(() => {
            alert("Verification complete! You now have full access.");
            window.location.reload();
        }, 1500);
    }

    /**
     * @function initiatePaystackPayment
     * @description Reusable function to handle Paystack payment popups.
     * @param {object} paymentDetails - The details for the payment.
     */
    function initiatePaystackPayment(paymentDetails) {
        const handler = PaystackPop.setup({
            key: paymentDetails.key,
            email: paymentDetails.email,
            amount: paymentDetails.amount,
            currency: 'NGN', // Or your preferred currency
            ref: paymentDetails.ref,
            metadata: {
                item_id: paymentDetails.itemId,
                item_type: paymentDetails.itemType, // 'course' or 'module'
                user_id: paymentDetails.userId
            },
            callback: function(response) {
                console.log('Paystack payment successful. Reference:', response.reference);
                handlePaymentVerification(response.reference);
            },
            onClose: function() {
                console.log('Paystack payment popup closed.');
                alert(uplasTranslate('payment_cancelled', {fallback: 'Payment was cancelled.'}));
            }
        });
        handler.openIframe();
    }


    /**
     * @function handlePurchaseClick
     * @description Handles the click event for course/module purchase buttons.
     */
    function handlePurchaseClick(event) {
        event.preventDefault();
        const button = event.currentTarget;

        if (!uplasApi || !uplasApi.isUserLoggedIn()) {
            alert(uplasTranslate('auth_required_for_purchase', { fallback: 'You must be logged in to make a purchase.' }));
            sessionStorage.setItem('uplas_post_auth_action', JSON.stringify({ type: 'purchase', courseId: button.dataset.courseId }));
            window.location.href = '/index.html#auth-section';
            return;
        }

        const userData = uplasApi.getUserData();
        const price = parseFloat(button.dataset.price);
        const itemName = button.dataset.planName || "Course Purchase";
        const itemId = button.dataset.courseId || button.dataset.moduleId;
        const itemType = button.dataset.courseId ? 'course' : 'module';

        if (isNaN(price) || !itemId) {
            console.error('Payment button missing required data attributes (data-price, data-course-id/data-module-id).', button);
            alert('Cannot process payment. Item information is missing.');
            return;
        }

        const uniqueRef = `uplas_${itemType}_${itemId}_${Date.now()}`;

        const paymentDetails = {
            key: PAYSTACK_PUBLIC_KEY,
            email: userData.email,
            amount: Math.round(price * 100), // Convert to kobo/cents
            ref: uniqueRef,
            itemId: itemId,
            itemType: itemType,
            userId: userData.id
        };

        console.log('Initiating Paystack payment for course/module:', { ...paymentDetails, key: '***' });
        initiatePaystackPayment(paymentDetails);
    }

    // --- Attach Event Listeners ---
    paymentButtons.forEach(button => {
        button.addEventListener('click', handlePurchaseClick);
    });

    curriculumItems.forEach(header => {
        header.addEventListener('click', () => {
            const item = header.parentElement;
            item.classList.toggle('active');

            const content = item.querySelector('.curriculum-item-content');
            const icon = header.querySelector('.curriculum-toggle-icon i');

            if (item.classList.contains('active')) {
                content.style.maxHeight = content.scrollHeight + "px";
                content.style.paddingTop = "1rem";
                content.style.paddingBottom = "1rem";
                icon.classList.remove('fa-plus');
                icon.classList.add('fa-minus');
            } else {
                content.style.maxHeight = null;
                content.style.paddingTop = "0";
                content.style.paddingBottom = "0";
                icon.classList.remove('fa-minus');
                icon.classList.add('fa-plus');
            }
        });
    });

    console.log("mcourseD.js: Uplas Course Detail Page initialized successfully.");
});
