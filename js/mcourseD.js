// js/mcourseD.js
/* ==========================================================================
   Uplas Course Detail Page Specific JavaScript (mcourseD.js)
   - Handles course/module enrollment via Paystack.
   - Manages UI interactions like expanding modules.
   - Relies on global.js and apiUtils.js.
   ========================================================================== */
// js/mcourseD.js
'use strict';

document.addEventListener('DOMContentLoaded', () => {
    const paystackButtons = document.querySelectorAll('.paystack-button');
    const PAYSTACK_PUBLIC_KEY = 'pk_test_a75debe223b378631e5b583ddf431631562b781e'; // Replace with your actual Paystack Public Key

    if (!paystackButtons.length) {
        return;
    }

    const initiatePaystackPayment = (paymentDetails) => {
        const handler = PaystackPop.setup({
            key: paymentDetails.key,
            email: paymentDetails.email,
            amount: paymentDetails.amount,
            ref: paymentDetails.ref,
            currency: 'NGN', // Or your preferred currency
            callback: function(response) {
                alert('Payment successful! Reference: ' + response.reference);
            },
            onClose: function() {
                alert('Transaction was not completed, window closed.');
            },
        });
        handler.openIframe();
    };

    paystackButtons.forEach(button => {
        button.addEventListener('click', (event) => {
            const price = event.target.dataset.price * 100; // Price in kobo/cents
            const email = "customer@example.com"; // Replace with dynamically fetched user email

            initiatePaystackPayment({
                key: PAYSTACK_PUBLIC_KEY,
                email: email,
                amount: price,
                ref: '' + Math.floor((Math.random() * 1000000000) + 1),
            });
        });
    });
});

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
            ref: paymentDetails.ref,
            metadata: {
                item_id: paymentDetails.itemId,
                item_type: paymentDetails.itemType, // 'course' or 'module'
                user_id: paymentDetails.userId
            },
            callback: function(response) {
                console.log('Paystack payment successful. Reference:', response.reference);
                paymentDetails.callback(response.reference);
            },
            onClose: function() {
                console.log('Paystack payment popup closed.');
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
        console.log(`Verifying payment for course/module with reference: ${reference}`);
        try {
            const response = await uplasApi.fetchAuthenticated('/api/v1/payments/verify-payment/', { // Assuming the same verification endpoint
                method: 'POST',
                body: JSON.stringify({
                    payment_ref: reference
                }),
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({ detail: 'Verification request failed.' }));
                throw new Error(errorData.detail || `Server responded with status: ${response.status}`);
            }

            const result = await response.json();

            if (result.status === 'success') {
                alert('Payment Successful! You now have access.');
                // Reload the page to reflect the new access rights (e.g., show content instead of buy button)
                window.location.reload();
            } else {
                alert(`Payment Verification Failed: ${result.message}`);
            }
        } catch (error) {
            console.error('An error occurred during payment verification:', error);
            alert('An error occurred while verifying your payment. Please contact support.');
        }
    }


    /**
     * @function handlePurchaseClick
     * @description Handles the click event for course/module purchase buttons.
     */
    function handlePurchaseClick(event) {
        event.preventDefault();
        const button = event.currentTarget;

        if (!uplasApi.isUserLoggedIn()) {
            alert(uplasTranslate('auth_required_for_purchase', { fallback: 'You must be logged in to make a purchase.' }));
            sessionStorage.setItem('uplas_post_auth_action', JSON.stringify({ type: 'purchase', courseId: button.dataset.courseId }));
            window.location.href = '/index.html#auth-section';
            return;
        }

        const userData = uplasApi.getUserData();
        const price = parseFloat(button.dataset.price);
        const itemName = button.dataset.planName || "Course Purchase"; // Generic name
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
            amount: Math.round(price * 100),
            ref: uniqueRef,
            itemId: itemId,
            itemType: itemType,
            userId: userData.id,
            callback: handlePaymentVerification
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
