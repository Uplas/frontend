// js/auth.js
// Handles the authentication forms (Login and Sign Up) on the homepage.
'use strict';

document.addEventListener('DOMContentLoaded', () => {
    const authSection = document.getElementById('auth-section');
    if (!authSection) {
        return; // Exit if the auth section isn't on this page
    }

    // --- Element Selectors ---
    const toggleButtons = authSection.querySelectorAll('.auth-toggle-button');
    const signupForm = document.getElementById('signup-form');
    const loginForm = document.getElementById('login-form');

    // --- Dependency Check ---
    if (!window.uplasApi || typeof window.uplasApi.displayFormStatus !== 'function') {
        console.error("auth.js: CRITICAL - uplasApi is not available. Authentication will not work.");
        return;
    }

    // --- Event Listener for Tab Switching ---
    toggleButtons.forEach(button => {
        button.addEventListener('click', () => {
            toggleButtons.forEach(btn => btn.classList.remove('active'));
            signupForm.classList.remove('form--active');
            loginForm.classList.remove('form--active');

            button.classList.add('active');
            const formId = button.dataset.form;
            document.getElementById(formId).classList.add('form--active');
        });
    });

    // --- Sign Up Form Submission ---
    if (signupForm) {
        signupForm.addEventListener('submit', async (event) => {
            event.preventDefault();
            const submitButton = signupForm.querySelector('button[type="submit"]');
            submitButton.disabled = true;
            uplasApi.displayFormStatus(signupForm, 'Creating account...', false);

            const formData = new FormData(signupForm);
            const data = Object.fromEntries(formData.entries());

            if (data.password !== data.password2) {
                uplasApi.displayFormStatus(signupForm, 'Passwords do not match.', true);
                submitButton.disabled = false;
                return;
            }
            if (data.password.length < 8) {
                uplasApi.displayFormStatus(signupForm, 'Password must be at least 8 characters.', true);
                submitButton.disabled = false;
                return;
            }

            try {
                const userData = {
                    full_name: data.full_name,
                    email: data.email,
                    password: data.password,
                };
                await uplasApi.registerUser(userData);
                uplasApi.displayFormStatus(signupForm, 'Registration successful! Please log in.', false);
                
                setTimeout(() => {
                    document.querySelector('.auth-toggle-button[data-form="login-form"]').click();
                    document.getElementById('login-email').value = data.email;
                    document.getElementById('login-password').focus();
                }, 2000);

            } catch (error) {
                uplasApi.displayFormStatus(signupForm, error.message, true);
            } finally {
                submitButton.disabled = false;
            }
        });
    }

    // --- Login Form Submission ---
    if (loginForm) {
        loginForm.addEventListener('submit', async (event) => {
            event.preventDefault();
            const submitButton = loginForm.querySelector('button[type="submit"]');
            submitButton.disabled = true;
            uplasApi.displayFormStatus(loginForm, 'Logging in...', false);

            const formData = new FormData(loginForm);
            const { email, password } = Object.fromEntries(formData.entries());

            if (!email || !password) {
                uplasApi.displayFormStatus(loginForm, 'Please enter both email and password.', true);
                submitButton.disabled = false;
                return;
            }

            try {
                await uplasApi.loginUser(email, password);
                window.location.href = '/uprojects.html'; // Redirect to dashboard on success
            } catch (error) {
                uplasApi.displayFormStatus(loginForm, error.message, true);
            } finally {
                submitButton.disabled = false;
            }
        });
    }

    console.log("auth.js: Authentication forms initialized.");
});
