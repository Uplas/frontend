// js/forgot-password.js
// Handles the form submission for requesting a password reset link.
'use strict';

document.addEventListener('DOMContentLoaded', () => {
    const forgotPasswordForm = document.getElementById('forgot-password-form');
    if (!forgotPasswordForm) return;

    // --- Dependency Check ---
    if (!window.uplasApi || typeof window.uplasApi.requestPasswordReset !== 'function') {
        console.error("forgot-password.js: CRITICAL - uplasApi.requestPasswordReset is not available.");
        return;
    }

    forgotPasswordForm.addEventListener('submit', async (event) => {
        event.preventDefault();
        const submitButton = forgotPasswordForm.querySelector('button[type="submit"]');
        const emailInput = document.getElementById('fp-email');
        const email = emailInput.value.trim();

        if (!email) {
            uplasApi.displayFormStatus(forgotPasswordForm, 'Please enter your email address.', true);
            return;
        }

        submitButton.disabled = true;
        uplasApi.displayFormStatus(forgotPasswordForm, 'Sending request...', false);

        try {
            const result = await uplasApi.requestPasswordReset(email);
            // Display a generic success message to prevent user enumeration
            uplasApi.displayFormStatus(forgotPasswordForm, 'If an account with that email exists, a password reset link has been sent.', false);
            emailInput.value = ''; // Clear the input on success
        } catch (error) {
            // Also display a generic message on error for security
            uplasApi.displayFormStatus(forgotPasswordForm, 'If an account with that email exists, a password reset link has been sent.', false);
            console.error("Forgot Password Error:", error.message);
        } finally {
            // Re-enable the button after a short delay to prevent spamming
            setTimeout(() => {
                submitButton.disabled = false;
            }, 2000);
        }
    });
});
