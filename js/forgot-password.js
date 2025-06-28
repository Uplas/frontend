/ js/forgot-password.js
'use strict';

document.addEventListener('DOMContentLoaded', () => {
    const forgotPasswordForm = document.getElementById('forgot-password-form');
    const emailInput = document.getElementById('fp-email');
    const statusDiv = document.getElementById('forgot-password-status');
    // Ensure uplasApi and its methods are available from window scope (loaded by global.js)
    const { uplasApi, uplasTranslate } = window;

    if (!forgotPasswordForm || !emailInput || !statusDiv) {
        console.error('Forgot Password JS: Essential form elements (form, email input, or status div) were not found. Check HTML IDs.');
        return;
    }

    if (!uplasApi || typeof uplasApi.fetchAuthenticated !== 'function' || typeof uplasApi.displayFormStatus !== 'function' || typeof uplasApi.clearFormStatus !== 'function') {
        console.error('Forgot Password JS: CRITICAL - uplasApi or its required functions (fetchAuthenticated, displayFormStatus, clearFormStatus) are missing. Ensure apiUtils.js is loaded correctly and provides these on window.uplasApi.');
        statusDiv.innerHTML = (typeof uplasTranslate === 'function' ? uplasTranslate('error_api_unavailable_critical', { fallback: 'Core API utility is missing. Password reset cannot function.' }) : 'Core API utility is missing. Password reset cannot function.');
        statusDiv.className = 'form__status form__status--error';
        statusDiv.style.display = 'block';
        const submitBtn = forgotPasswordForm.querySelector('button[type="submit"]');
        if (submitBtn) {
            submitBtn.disabled = true;
        }
        return;
    }

    forgotPasswordForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        uplasApi.clearFormStatus(statusDiv); // Clear previous messages

        const email = emailInput.value.trim();
        let isValid = true;

        // Frontend validation
        if (!email) {
            uplasApi.displayFormStatus(statusDiv, 'Email address is required.', true, 'error_email_required');
            emailInput.classList.add('invalid');
            isValid = false;
        } else if (!/^\S+@\S+\.\S+$/.test(email)) { // Basic email format check
            uplasApi.displayFormStatus(statusDiv, 'Please enter a valid email address.', true, 'error_email_invalid');
            emailInput.classList.add('invalid');
            isValid = false;
        } else {
            emailInput.classList.remove('invalid');
            const errorSpan = emailInput.closest('.form__group')?.querySelector('.form__error-message');
            if (errorSpan) errorSpan.textContent = '';
        }

        if (!isValid) {
            emailInput.focus();
            return;
        }

        const submitButton = forgotPasswordForm.querySelector('button[type="submit"]');
        let originalButtonHTML = '';

        if (submitButton) {
            originalButtonHTML = submitButton.innerHTML;
            submitButton.disabled = true;
            const loadingText = typeof uplasTranslate === 'function' ? uplasTranslate('status_sending', { fallback: 'Sending...' }) : 'Sending...';
            submitButton.innerHTML = `<i class="fas fa-spinner fa-spin"></i> ${loadingText}`;
        }

        uplasApi.displayFormStatus(statusDiv, 'Processing your request...', false, 'forgot_password_status_sending');

        try {
            // **BACKEND INTEGRATION POINT**
            // Endpoint: /users/request-password-reset/ (Method: POST, Body: {email: "user@example.com"})
            const response = await uplasApi.fetchAuthenticated('/users/request-password-reset/', {
                method: 'POST',
                body: JSON.stringify({ email: email }),
                headers: {
                    'Content-Type': 'application/json',
                },
                isPublic: true // This endpoint should not require authentication
            });

            const result = await response.json();

            if (response.ok) {
                uplasApi.displayFormStatus(statusDiv,
                    result.message || (typeof uplasTranslate === 'function' ? uplasTranslate('forgot_password_success_message', { fallback: 'If an account with that email exists, a password reset link has been sent.' }) : 'If an account with that email exists, a password reset link has been sent.'),
                    false);
                forgotPasswordForm.reset();
            } else {
                throw new Error(result.detail || result.error || (typeof uplasTranslate === 'function' ? uplasTranslate('forgot_password_error_generic', { fallback: 'Could not process your request. Please try again later.' }) : 'Could not process your request. Please try again later.'));
            }

        } catch (error) {
            console.error('Forgot Password Submission Error:', error);
            uplasApi.displayFormStatus(statusDiv,
                error.message || (typeof uplasTranslate === 'function' ? uplasTranslate('error_network', { fallback: 'A network error occurred. Please check your connection and try again.' }) : 'A network error occurred. Please check your connection and try again.'),
                true);
        } finally {
            if (submitButton) {
                submitButton.disabled = false;
                submitButton.innerHTML = originalButtonHTML;
            }
        }
    });

    emailInput.addEventListener('input', () => {
        if (emailInput.classList.contains('invalid')) {
            if (emailInput.value.trim() && /^\S+@\S+\.\S+$/.test(emailInput.value.trim())) {
                emailInput.classList.remove('invalid');
                const errorSpan = emailInput.closest('.form__group')?.querySelector('.form__error-message');
                if (errorSpan) errorSpan.textContent = '';
                uplasApi.clearFormStatus(statusDiv);
            }
        }
    });

    console.log('Forgot Password page JavaScript initialized and ready for backend integration.');
});
