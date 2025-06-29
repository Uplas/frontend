// js/upricing.js
'use strict';

document.addEventListener('DOMContentLoaded', () => {
    // --- Paystack Payment Logic ---
    const paystackButtons = document.querySelectorAll('.paystack-button');
    // IMPORTANT: Use your actual Paystack Public Key in production
    const PAYSTACK_PUBLIC_KEY = 'pk_test_a75debe223b378631e5b583ddf431631562b781e';

    if (paystackButtons.length > 0 && typeof PaystackPop === 'undefined') {
        console.error("Paystack script not loaded. Payment buttons will not work.");
        return;
    }

    const handlePaystackVerification = (reference, planId) => {
        // This is where you would call your backend to verify the transaction reference
        alert(`Payment successful! Reference: ${reference}. You are subscribed to the ${planId} plan.`);
        // For demonstration, redirecting to a dashboard page
        window.location.href = 'dashboard.html';
    };

    const initiatePaystackPayment = (paymentDetails) => {
        const handler = PaystackPop.setup({
            key: paymentDetails.key,
            email: paymentDetails.email,
            amount: paymentDetails.amount, // Amount in Kobo/cents
            currency: 'NGN', // Change to 'USD' or your preferred currency
            ref: paymentDetails.ref,
            metadata: {
                user_id: paymentDetails.userId,
                plan_id: paymentDetails.planId
            },
            callback: (response) => {
                handlePaystackVerification(response.reference, paymentDetails.planId);
            },
            onClose: () => {
                alert('Transaction was not completed.');
            },
        });
        handler.openIframe();
    };

    paystackButtons.forEach(button => {
        button.addEventListener('click', (event) => {
            // In a real app, this `authService` would be your actual authentication utility
            if (typeof authService === 'undefined' || !authService.isLoggedIn()) {
                alert("Please log in or create an account to subscribe.");
                // Optionally redirect to login page
                // window.location.href = 'index.html#auth-section';
                return;
            }

            const currentUser = authService.getCurrentUser();
            const planId = event.target.dataset.planId;
            const price = parseFloat(event.target.dataset.price);
            const planName = event.target.dataset.name;

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

    // --- FAQ Accordion Logic ---
    const faqItems = document.querySelectorAll('.faq-item');
    faqItems.forEach(item => {
        const question = item.querySelector('.faq-question');
        question.addEventListener('click', () => {
            // Close other open items
            faqItems.forEach(otherItem => {
                if (otherItem !== item && otherItem.classList.contains('active')) {
                    otherItem.classList.remove('active');
                }
            });
            // Toggle the clicked item
            item.classList.toggle('active');
        });
    });

    // --- Contact Form Logic ---
    const contactForm = document.getElementById('contact-form');
    if (contactForm) {
        contactForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const statusDiv = document.getElementById('contact-form-status');
            statusDiv.textContent = 'Sending...';
            statusDiv.hidden = false;
            statusDiv.classList.remove('form__status--error');

            // Simulate a network request
            setTimeout(() => {
                // In a real app, you would send this data to your backend API
                // and handle success/error based on the response.
                statusDiv.textContent = 'Thank you! Your message has been sent.';
                statusDiv.classList.add('form__status--success');
                contactForm.reset();
            }, 1500);
        });
    }
});
