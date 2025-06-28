// js/reset-password.js
// Handles the form submission for setting a new password.
'use strict';

document.addEventListener('DOMContentLoaded', () => {
    const resetPasswordForm = document.getElementById('reset-password-form');
    if (!resetPasswordForm) return;

    // --- Dependency Check ---
    if (!window.uplasApi || typeof window.uplasApi.confirmPasswordReset !== 'function') {
        console.error("reset-password.js: CRITICAL - uplasApi.confirmPasswordReset is not available.");
        return;
    }

    // --- Get Token and UID from URL ---
    const urlParams = new URLSearchParams(window.location.search);
    const uid = urlParams.get('uidb64');
    const token = urlParams.get('token');

    if (!uid || !token) {
        uplasApi.displayFormStatus(resetPasswordForm, 'Invalid or expired password reset link.', true);
        resetPasswordForm.querySelector('button[type="submit"]').disabled = true;
        return;
    }

    resetPasswordForm.addEventListener('submit', async (event) => {
        event.preventDefault();
        const submitButton = resetPasswordForm.querySelector('button[type="submit"]');
        const passwordInput = document.getElementById('reset-password');
        const confirmPasswordInput = document.getElementById('reset-confirm-password');

        const password = passwordInput.value;
        const password2 = confirmPasswordInput.value;

        if (password !== password2) {
            uplasApi.displayFormStatus(resetPasswordForm, 'Passwords do not match.', true);
            return;
        }
        if (password.length < 8) {
            uplasApi.displayFormStatus(resetPasswordForm, 'Password must be at least 8 characters.', true);
            return;
        }

        submitButton.disabled = true;
        uplasApi.displayFormStatus(resetPasswordForm, 'Resetting password...', false);

        try {
            const result = await uplasApi.confirmPasswordReset(uid, token, password);
            uplasApi.displayFormStatus(resetPasswordForm, result.detail || 'Password has been reset successfully! Redirecting to login...', false);

            setTimeout(() => {
                window.location.href = '/index.html#auth-section';
            }, 3000);

        } catch (error) {
            uplasApi.displayFormStatus(resetPasswordForm, error.message, true);
            submitButton.disabled = false;
        }
    });
});
