// js/mcourseD.js
'use strict';

document.addEventListener('DOMContentLoaded', () => {
    // --- Paystack Payment Logic for Course Enrollment ---
    const enrollButton = document.querySelector('.paystack-button');
    // IMPORTANT: Use your actual Paystack Public Key in production
    const PAYSTACK_PUBLIC_KEY = 'pk_test_a75debe223b378631e5b583ddf431631562b781e';

    if (enrollButton && typeof PaystackPop === 'undefined') {
        console.error("Paystack script not loaded. Enrollment button will not work.");
        return;
    }

    const handlePaystackVerification = (reference, courseId) => {
        alert(`Enrollment successful! Reference: ${reference}. You now have access to course ${courseId}.`);
        // In a real application, you'd call your backend here to verify and grant access,
        // then likely redirect to the course learning page.
        window.location.reload(); // Reload page to show enrolled state
    };

    const initiatePaystackPayment = (paymentDetails) => {
        const handler = PaystackPop.setup({
            key: paymentDetails.key,
            email: paymentDetails.email,
            amount: paymentDetails.amount,
            currency: 'NGN', // Change to 'USD' or your preferred currency
            ref: paymentDetails.ref,
            metadata: {
                user_id: paymentDetails.userId,
                course_id: paymentDetails.courseId
            },
            callback: (response) => {
                handlePaystackVerification(response.reference, paymentDetails.courseId);
            },
            onClose: () => {
                alert('Transaction was not completed.');
            },
        });
        handler.openIframe();
    };

    if (enrollButton) {
        enrollButton.addEventListener('click', (event) => {
            // This relies on the authService from global.js
            if (typeof authService === 'undefined' || !authService.isLoggedIn()) {
                alert("Please log in or create an account to enroll in this course.");
                return;
            }

            const currentUser = authService.getCurrentUser();
            const price = parseFloat(event.currentTarget.dataset.price);
            const courseId = event.currentTarget.dataset.courseId;

            initiatePaystackPayment({
                key: PAYSTACK_PUBLIC_KEY,
                email: currentUser.email,
                amount: Math.round(price * 100),
                ref: `uplas_${courseId}_${new Date().getTime()}`,
                userId: currentUser.id,
                courseId: courseId
            });
        });
    }
});
