// js/forgot-password.js
'use strict';

document.addEventListener('DOMContentLoaded', () => {
    const forgotPasswordForm = document.getElementById('forgot-password-form');
    const emailInput = document.getElementById('fp-email');
    const statusDiv = document.getElementById('forgot-password-status');
    const { uplasApi, uplasTranslate } = window; // Destructure from global scope

    if (!forgotPasswordForm || !emailInput || !statusDiv) {
        console.error('Forgot Password JS: Essential form elements not found.');
        return;
    }

    if (!uplasApi || !uplasApi.fetchAuthenticated || !uplasApi.displayFormStatus) {
        console.error('Forgot Password JS: uplasApi or required functions are missing.');
        if (statusDiv) {
            statusDiv.textContent = uplasTranslate ? uplasTranslate('error_api_unavailable_critical', { fallback: 'Core API utility missing.' }) : 'Core API utility missing.';
            statusDiv.className = 'form__status form__status--error';
            statusDiv.style.display = 'block';
        }
        return;
    }

    forgotPasswordForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        uplasApi.clearFormStatus(statusDiv); // Clear previous messages

        const email = emailInput.value.trim();

        if (!email) {
            uplasApi.displayFormStatus(statusDiv, '', true, 'error_email_required');
            emailInput.classList.add('invalid');
            emailInput.focus();
            return;
        }
        // Basic email format validation (HTML5 `type="email"` also handles this)
        if (!/^\S+@\S+\.\S+$/.test(email)) {
            uplasApi.displayFormStatus(statusDiv, '', true, 'error_email_invalid');
            emailInput.classList.add('invalid');
            emailInput.focus();
            return;
        }
        emailInput.classList.remove('invalid');

        const submitButton = forgotPasswordForm.querySelector('button[type="submit"]');
        if (submitButton) {
            submitButton.disabled = true;
            const originalButtonText = submitButton.innerHTML;
            submitButton.innerHTML = `<i class="fas fa-spinner fa-spin"></i> ${uplasTranslate ? uplasTranslate('status_sending', { fallback: 'Sending...' }) : 'Sending...'}`;
        }

        uplasApi.displayFormStatus(statusDiv, '', false, 'forgot_password_status_sending');

        try {
            // This is a public endpoint, so no auth token needed.
            // The `isPublic: true` flag might not be necessary if your `fetchAuthenticated`
            // already handles calls without tokens gracefully, or you have a separate `fetchPublic`.
            // For now, assuming `fetchAuthenticated` can handle public POSTs when needed
            // or this specific endpoint is whitelisted from auth.
            // A dedicated public fetch function in apiUtils might be cleaner.
            const response = await uplasApi.fetchAuthenticated('/users/request-password-reset/', {
                method: 'POST',
                body: JSON.stringify({ email: email }),
                headers: { 'Content-Type': 'application/json' },
                // isPublic: true // If your fetchAuthenticated supports this for public POSTs
            });

            const result = await response.json();

            if (response.ok) {
                uplasApi.displayFormStatus(statusDiv, result.message || (uplasTranslate ? uplasTranslate('forgot_password_success_message', { fallback: 'If an account with that email exists, a password reset link has been sent.' }) : 'If an account with that email exists, a password reset link has been sent.'), false);
                forgotPasswordForm.reset();
            } else {
                throw new Error(result.detail || result.error || (uplasTranslate ? uplasTranslate('forgot_password_error_generic', { fallback: 'Could not process request. Please try again.' }) : 'Could not process request. Please try again.'));
            }
        } catch (error) {
            console.error('Forgot Password Error:', error);
            uplasApi.displayFormStatus(statusDiv, error.message || (uplasTranslate ? uplasTranslate('error_network', { fallback: 'A network error occurred. Please try again.' }) : 'A network error occurred. Please try again.'), true);
        } finally {
            if (submitButton) {
                submitButton.disabled = false;
                submitButton.innerHTML = uplasTranslate ? uplasTranslate('forgot_password_button_send_link', { fallback: 'Send Reset Link' }) : 'Send Reset Link'; // Restore original text
            }
        }
    });

    emailInput.addEventListener('input', () => {
        if (emailInput.classList.contains('invalid')) {
            if (emailInput.checkValidity()) { // Basic HTML5 check to remove invalid state
                emailInput.classList.remove('invalid');
                const errorSpan = emailInput.closest('.form__group')?.querySelector('.form__error-message');
                if (errorSpan) errorSpan.textContent = '';
                uplasApi.clearFormStatus(statusDiv);
            }
        }
    });

    console.log('Forgot Password page JS initialized.');
});
