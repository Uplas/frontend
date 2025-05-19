// js/uhome.js
/* ================================================
   Uplas Homepage Specific JavaScript (uhome.js)
   - Multi-step Signup Form Logic
   - Login Form Logic
   - Form Switching
   - API Integration Placeholders
   ================================================ */
'use strict';

document.addEventListener('DOMContentLoaded', () => {
    // --- Element Selectors ---
    const authSection = document.getElementById('auth-section');
    const signupForm = document.getElementById('signup-form');
    const loginForm = document.getElementById('login-form');
    const authToggleButtons = document.querySelectorAll('.auth-toggle-button');

    // Signup Form Specific
    const signupFormSteps = signupForm?.querySelectorAll('.form-step');
    const signupCountryCodeSelect = document.getElementById('signup-country-code');
    const signupIndustrySelect = document.getElementById('signup-industry');
    const signupOtherIndustryGroup = document.getElementById('signup-other-industry-group');
    const signupOtherIndustryInput = document.getElementById('signup-other-industry');
    const signupPasswordInput = document.getElementById('signup-password');
    const signupConfirmPasswordInput = document.getElementById('signup-confirm-password');
    const signupPasswordMismatchSpan = document.getElementById('signup-password-mismatch');
    const signupStatusDiv = document.getElementById('signup-status');
    const signupTermsCheckbox = document.getElementById('signup-terms');

    // Login Form Specific
    const loginEmailInput = document.getElementById('login-email');
    const loginPasswordInput = document.getElementById('login-password');
    const loginStatusDiv = document.getElementById('login-status');

    // --- State Variables ---
    let currentSignupStep = 0;

    // --- Utility Functions ---
    // Assumes displayFormStatus, clearFormStatus, validateInput are available
    // (e.g., from global.js or defined here if not globally needed)
    const displayFormStatus = (element, message, type, translateKey = null) => {
        if (!element) return;
        let text = message;
        if (translateKey && typeof window.uplasTranslate === 'function') {
            text = window.uplasTranslate(translateKey, message); // Fallback to message if key not found
        }
        element.textContent = text;
        element.className = 'form__status';
        if (type) element.classList.add(`form__status--${type}`);
        element.style.display = 'block';
        element.setAttribute('aria-live', type === 'error' ? 'assertive' : 'polite');
    };

    const clearFormStatus = (element) => {
        if (!element) return;
        element.textContent = '';
        element.style.display = 'none';
        element.className = 'form__status';
    };

    const validateInput = (inputElement) => {
        const group = inputElement.closest('.form__group');
        if (!group) return inputElement.checkValidity();

        const errorSpan = group.querySelector('.form__error-message');
        if (!inputElement.checkValidity()) {
            inputElement.classList.add('invalid');
            if (errorSpan) {
                let errorKey = null;
                if (inputElement.validity.valueMissing) errorKey = inputElement.dataset.errorKeyRequired || 'error_field_required';
                else if (inputElement.validity.patternMismatch) errorKey = inputElement.dataset.errorKeyPattern || 'error_pattern_mismatch';
                else if (inputElement.validity.typeMismatch) errorKey = inputElement.dataset.errorKeyType || 'error_type_mismatch';
                
                if (errorKey && typeof window.uplasTranslate === 'function') {
                    errorSpan.textContent = window.uplasTranslate(errorKey, inputElement.title || inputElement.validationMessage);
                } else {
                     errorSpan.textContent = inputElement.title || inputElement.validationMessage || "Invalid input.";
                }
            }
            return false;
        } else {
            inputElement.classList.remove('invalid');
            if (errorSpan) errorSpan.textContent = '';
            return true;
        }
    };


    // --- Form Switching Logic ---
    authToggleButtons.forEach(button => {
        button.addEventListener('click', () => {
            const targetFormId = button.dataset.form;
            const targetForm = document.getElementById(targetFormId);

            authToggleButtons.forEach(btn => btn.classList.remove('active'));
            button.classList.add('active');

            if (signupForm) signupForm.classList.remove('form--active');
            if (loginForm) loginForm.classList.remove('form--active');

            if (targetForm) {
                targetForm.classList.add('form--active');
                if (targetFormId === 'signup-form') {
                    resetSignupFormSteps();
                    clearFormStatus(signupStatusDiv);
                } else {
                    clearFormStatus(loginStatusDiv);
                }
                const firstInput = targetForm.querySelector('input:not([type="hidden"]), select, textarea');
                firstInput?.focus();
            }
        });
    });

    const handleHashChange = () => {
        const hash = window.location.hash;
        if (hash === '#signup-form' || hash === '#login-form') {
            const targetButton = document.querySelector(`.auth-toggle-button[data-form="${hash.substring(1)}"]`);
            targetButton?.click();
            if (authSection && typeof window.uplasScrollToElement === 'function') {
                 window.uplasScrollToElement('#auth-section');
            } else if (authSection) {
                authSection.scrollIntoView({ behavior: 'smooth' });
            }
        }
    };
    window.addEventListener('hashchange', handleHashChange);
    handleHashChange(); // Check hash on initial load


    // --- Multi-Step Signup Form Logic ---
    const resetSignupFormSteps = () => {
        currentSignupStep = 0;
        if (signupFormSteps && signupFormSteps.length > 0) {
            showSignupStep(currentSignupStep);
            signupForm?.reset();
            signupForm?.querySelectorAll('.invalid').forEach(el => el.classList.remove('invalid'));
            signupForm?.querySelectorAll('.form__error-message').forEach(el => el.textContent = '');
            if (signupOtherIndustryGroup) signupOtherIndustryGroup.classList.add('form__group--hidden');
            if (signupIndustrySelect) signupIndustrySelect.value = "";
            if (signupCountryCodeSelect) signupCountryCodeSelect.value = "+254"; // Reset to default
        }
    };
    
    const showSignupStep = (stepIndex) => {
        if (!signupFormSteps || !signupFormSteps[stepIndex]) return;
        signupFormSteps.forEach((stepElement, index) => {
            stepElement.classList.toggle('form-step--active', index === stepIndex);
        });
        const activeStep = signupFormSteps[stepIndex];
        const firstInput = activeStep?.querySelector('input:not([type="hidden"]):not([disabled]), select:not([disabled]), textarea:not([disabled])');
        firstInput?.focus();
        currentSignupStep = stepIndex;
    };

    const validateSignupStep = (stepElement) => {
        if (!stepElement) return true;
        let isStepValid = true;
        // Validate only visible and required inputs within the current step
        const inputsToValidate = stepElement.querySelectorAll('input[required]:not([type="hidden"]), select[required]:not([type="hidden"])');

        inputsToValidate.forEach(input => {
            // Special handling for 'other industry' which might be hidden
            if (input.id === 'signup-other-industry' && signupOtherIndustryGroup?.classList.contains('form__group--hidden')) {
                input.classList.remove('invalid'); // Clear validation state if hidden
                const errorSpan = input.closest('.form__group')?.querySelector('.form__error-message');
                if (errorSpan) errorSpan.textContent = '';
                return; // Skip validation for hidden 'other industry'
            }
            if (!validateInput(input)) isStepValid = false;
        });

        if (stepElement.dataset.step === '5') { // Final step specific validation
            if (signupPasswordInput && signupConfirmPasswordInput && signupPasswordInput.value !== signupConfirmPasswordInput.value) {
                signupConfirmPasswordInput.classList.add('invalid');
                if (signupPasswordMismatchSpan) signupPasswordMismatchSpan.textContent = window.uplasTranslate ? window.uplasTranslate('error_passwords_do_not_match', "Passwords do not match.") : "Passwords do not match.";
                isStepValid = false;
            } else {
                if (signupPasswordMismatchSpan) signupPasswordMismatchSpan.textContent = "";
                if(signupConfirmPasswordInput && signupPasswordInput?.value === signupConfirmPasswordInput.value) {
                     signupConfirmPasswordInput.classList.remove('invalid'); // Clear if they now match
                }
            }
            if (signupTermsCheckbox && !signupTermsCheckbox.checked) {
                const termsErrorSpan = signupTermsCheckbox.closest('.form__group')?.querySelector('.form__error-message');
                if(termsErrorSpan) termsErrorSpan.textContent = window.uplasTranslate ? window.uplasTranslate('error_terms_required', "You must agree to the terms.") : "You must agree to the terms.";
                signupTermsCheckbox.classList.add('invalid');
                isStepValid = false;
            } else if (signupTermsCheckbox) {
                const termsErrorSpan = signupTermsCheckbox.closest('.form__group')?.querySelector('.form__error-message');
                if(termsErrorSpan) termsErrorSpan.textContent = "";
                signupTermsCheckbox.classList.remove('invalid');
            }
        }
        return isStepValid;
    };

    const nextSignupStep = () => {
        if (!signupFormSteps || currentSignupStep >= signupFormSteps.length - 1) return;
        const currentFormStepElement = signupFormSteps[currentSignupStep];
        if (validateSignupStep(currentFormStepElement)) {
            showSignupStep(currentSignupStep + 1);
        }
    };

    const prevSignupStep = () => {
        if (currentSignupStep > 0) {
            showSignupStep(currentSignupStep - 1);
            clearFormStatus(signupStatusDiv); // Clear general status when moving back
        }
    };

    signupForm?.querySelectorAll('.form__button--next').forEach(button => {
        button.addEventListener('click', nextSignupStep);
    });
    signupForm?.querySelectorAll('.form__button--prev').forEach(button => {
        button.addEventListener('click', prevSignupStep);
    });

    if (signupIndustrySelect && signupOtherIndustryGroup && signupOtherIndustryInput) {
        signupIndustrySelect.addEventListener('change', () => {
            const showOther = signupIndustrySelect.value === 'Other';
            signupOtherIndustryGroup.classList.toggle('form__group--hidden', !showOther);
            signupOtherIndustryInput.required = showOther;
            if (!showOther) {
                signupOtherIndustryInput.value = '';
                validateInput(signupOtherIndustryInput); // Clear potential errors by re-validating
            }
        });
    }

    if (signupPasswordInput && signupConfirmPasswordInput && signupPasswordMismatchSpan) {
        const checkPasswordMatch = () => {
            if (signupPasswordInput.value !== signupConfirmPasswordInput.value && signupConfirmPasswordInput.value !== '') {
                signupPasswordMismatchSpan.textContent = window.uplasTranslate ? window.uplasTranslate('error_passwords_do_not_match', "Passwords do not match.") : "Passwords do not match.";
                signupConfirmPasswordInput.classList.add('invalid');
            } else {
                signupPasswordMismatchSpan.textContent = '';
                if (signupPasswordInput.value === signupConfirmPasswordInput.value) {
                    signupConfirmPasswordInput.classList.remove('invalid');
                }
            }
        };
        signupConfirmPasswordInput.addEventListener('input', checkPasswordMatch);
        signupPasswordInput.addEventListener('input', checkPasswordMatch);
    }


    // --- Populate Country Codes ---
    const populateCountryCodes = () => {
        if (!signupCountryCodeSelect) return;
        // A more comprehensive list or fetch from an API is recommended for production
        const countryCodes = [
            { code: '+1', flag: '🇺🇸', name: 'United States' }, { code: '+44', flag: '🇬🇧', name: 'United Kingdom' },
            { code: '+254', flag: '🇰🇪', name: 'Kenya' }, { code: '+234', flag: '🇳🇬', name: 'Nigeria' },
            { code: '+27', flag: '🇿🇦', name: 'South Africa' }, { code: '+91', flag: '🇮🇳', name: 'India' },
            { code: '+61', flag: '🇦🇺', name: 'Australia' }, { code: '+1', flag: '🇨🇦', name: 'Canada' },
            // Add more or use the extensive list from previous turns
        ];
        signupCountryCodeSelect.innerHTML = `<option value="" disabled selected data-translate-key="form_select_country_code_placeholder">Code</option>`;
        countryCodes.forEach(country => {
            const option = document.createElement('option');
            option.value = country.code;
            option.textContent = `${country.flag} ${country.code}`;
            signupCountryCodeSelect.appendChild(option);
        });
        signupCountryCodeSelect.value = '+254'; // Default to Kenya
        if(window.translatePage) window.translatePage(); // Translate new options if they have keys
    };
    populateCountryCodes();


    // --- Signup Form Submission ---
    const handleSignupSubmit = async (e) => {
        e.preventDefault();
        if (!signupForm || !validateSignupStep(signupFormSteps[currentSignupStep])) {
            displayFormStatus(signupStatusDiv, 'Please correct the errors above.', 'error', 'error_correct_form_errors');
            return;
        }
        clearFormStatus(signupStatusDiv);
        displayFormStatus(signupStatusDiv, 'Processing signup...', 'loading', 'signup_status_processing');
        const submitButton = signupForm.querySelector('button[type="submit"]');
        if (submitButton) submitButton.disabled = true;

        const formData = new FormData(signupForm);
        const dataToSend = {
            full_name: formData.get('fullName'),
            email: formData.get('email'),
            organization: formData.get('organization') || null, // Send null if empty
            industry: formData.get('industry') === 'Other' ? formData.get('otherIndustry') : formData.get('industry'),
            profession: formData.get('profession'),
            whatsapp_number: `${formData.get('countryCode')}${formData.get('phone')}`,
            password: formData.get('password'),
            // Backend should verify terms agreement implicitly by allowing signup
        };

        try {
            console.log("Submitting Signup Data to Backend:", dataToSend);
            // TODO: Replace with actual API call
            // const response = await fetch('/api/users/register/', { // Your Django endpoint
            //     method: 'POST',
            //     headers: { 'Content-Type': 'application/json', 'X-CSRFToken': window.uplasGetCookie('csrftoken') }, // Add CSRF if needed
            //     body: JSON.stringify(dataToSend),
            // });
            // const result = await response.json();

            // Simulate API response
            await new Promise(resolve => setTimeout(resolve, 2000));
            const isSuccess = Math.random() > 0.1; // 90% success rate for demo
            let result;
            if (isSuccess) {
                result = { success: true, message_key: 'signup_status_success_verify_whatsapp' };
            } else {
                // Simulate different error types
                const errorType = Math.random();
                if (errorType < 0.5) result = { success: false, message_key: 'signup_status_error_email_exists' };
                else result = { success: false, message_key: 'signup_status_error_generic' };
            }

            if (result.success) {
                displayFormStatus(signupStatusDiv, result.message || "Signup successful!", 'success', result.message_key);
                // Optionally redirect or change UI state
                // setTimeout(() => { window.location.href = 'ucourse.html'; }, 2500);
            } else {
                displayFormStatus(signupStatusDiv, result.message || "Signup failed.", 'error', result.message_key);
            }
        } catch (error) {
            console.error('Signup Error:', error);
            displayFormStatus(signupStatusDiv, 'A network error occurred. Please try again.', 'error', 'error_network');
        } finally {
            if (submitButton) submitButton.disabled = false;
        }
    };
    if (signupForm) signupForm.addEventListener('submit', handleSignupSubmit);


    // --- Login Form Submission ---
    const handleLoginSubmit = async (e) => {
        e.preventDefault();
        if (!loginForm) return;
        clearFormStatus(loginStatusDiv);

        let isFormValid = true;
        if (!validateInput(loginEmailInput)) isFormValid = false;
        if (!validateInput(loginPasswordInput)) isFormValid = false;

        if (!isFormValid) {
            displayFormStatus(loginStatusDiv, 'Please correct the errors above.', 'error', 'error_correct_form_errors');
            return;
        }

        displayFormStatus(loginStatusDiv, 'Attempting login...', 'loading', 'login_status_attempting');
        const submitButton = loginForm.querySelector('button[type="submit"]');
        if (submitButton) submitButton.disabled = true;

        const loginData = {
            email: loginEmailInput.value, // Django typically uses 'username' or 'email'
            password: loginPasswordInput.value
        };

        try {
            console.log("Submitting Login Data to Backend:", loginData);
            // TODO: Replace with actual API call to your token endpoint or login endpoint
            // const response = await fetch('/api/users/login/', { // Your Django endpoint
            //     method: 'POST',
            //     headers: { 'Content-Type': 'application/json', 'X-CSRFToken': window.uplasGetCookie('csrftoken') },
            //     body: JSON.stringify(loginData)
            // });
            // const result = await response.json();

            // Simulate API response
            await new Promise(resolve => setTimeout(resolve, 1500));
            const isSuccess = Math.random() > 0.2;
            let result;
            if(isSuccess) {
                result = { success: true, message_key: 'login_status_success', access: 'simulated_access_token_123', refresh: 'simulated_refresh_token_456' };
            } else {
                result = { success: false, detail_key: 'login_status_error_invalid_credentials' };
            }

            if (result.success && result.access) {
                localStorage.setItem('accessToken', result.access);
                if(result.refresh) localStorage.setItem('refreshToken', result.refresh);
                displayFormStatus(loginStatusDiv, result.message || 'Login successful! Redirecting...', 'success', result.message_key);
                // Update UI to show user is logged in (e.g., show avatar, change nav links)
                // This might be handled in global.js or by a dedicated auth state manager
                document.getElementById('user-avatar-header')?.style.display = 'flex'; // Show avatar
                document.querySelector('.nav__link--cta[href="#auth-section"]')?.remove(); // Remove Login/Signup nav link

                setTimeout(() => { window.location.href = 'ucourse.html'; }, 1500); // Redirect to course listing or dashboard
            } else {
                displayFormStatus(loginStatusDiv, result.detail || result.message || 'Login failed.', 'error', result.detail_key || 'login_status_error_generic');
            }
        } catch (error) {
            console.error('Login Error:', error);
            displayFormStatus(loginStatusDiv, 'A network error occurred. Please try again.', 'error', 'error_network');
        } finally {
            if (submitButton) submitButton.disabled = false;
        }
    };
    if (loginForm) loginForm.addEventListener('submit', handleLoginSubmit);

    // Initial setup for form visibility and focus
    const initialActiveAuthButton = document.querySelector('.auth-toggle-button.active');
    if (initialActiveAuthButton) {
        const initialFormId = initialActiveAuthButton.dataset.form;
        const initialFormElement = document.getElementById(initialFormId);
        if (initialFormElement) {
            initialFormElement.classList.add('form--active');
            const firstInput = initialFormElement.querySelector('input:not([type="hidden"]), select, textarea');
            firstInput?.focus();
        }
    } else if (signupForm) { // Default to signup if no active button
        document.querySelector('.auth-toggle-button[data-form="signup-form"]')?.classList.add('active');
        signupForm.classList.add('form--active');
        const firstInput = signupForm.querySelector('input:not([type="hidden"]), select, textarea');
        firstInput?.focus();
    }

    // Add listeners to clear validation on input for all relevant inputs
    document.querySelectorAll('#signup-form input[required], #signup-form select[required], #login-form input[required]').forEach(input => {
        input.addEventListener('input', () => {
            if(input.checkValidity()){
                input.classList.remove('invalid');
                const errorSpan = input.closest('.form__group')?.querySelector('.form__error-message');
                if (errorSpan) errorSpan.textContent = '';
            }
            if(input.id === 'signup-confirm-password' || input.id === 'signup-password') {
                if(signupPasswordInput?.value === signupConfirmPasswordInput?.value) {
                    if(signupPasswordMismatchSpan) signupPasswordMismatchSpan.textContent = '';
                    if(signupConfirmPasswordInput?.value === signupPasswordInput?.value) {
                        signupConfirmPasswordInput.classList.remove('invalid');
                        const confirmErrorSpan = signupConfirmPasswordInput.closest('.form__group')?.querySelector('.form__error-message');
                        if(confirmErrorSpan && confirmErrorSpan.textContent === (window.uplasTranslate ? window.uplasTranslate('error_passwords_do_not_match', "Passwords do not match.") : "Passwords do not match.")) {
                           confirmErrorSpan.textContent = '';
                        }
                    }
                }
            }
            if (input.id === 'signup-terms' && input.checked) {
                input.classList.remove('invalid');
                const termsErrorSpan = input.closest('.form__group')?.querySelector('.form__error-message');
                if(termsErrorSpan) termsErrorSpan.textContent = "";
            }
        });
    });

    // Update copyright year (this is also in global.js, ensure it's robust)
    const currentYearFooterSpan = document.getElementById('current-year-footer');
    if (currentYearFooterSpan) {
        const yearText = currentYearFooterSpan.dataset.translateKey === "footer_copyright_dynamic" ?
                         (window.uplasTranslate ? window.uplasTranslate("footer_copyright_dynamic", "{currentYear}") : "{currentYear}") :
                         currentYearFooterSpan.textContent;

        if (yearText && yearText.includes("{currentYear}")) {
            currentYearFooterSpan.textContent = yearText.replace("{currentYear}", new Date().getFullYear());
        } else if (yearText && !yearText.match(/\d{4}/)) { // If no placeholder and no year found in default
             currentYearFooterSpan.textContent = `© ${new Date().getFullYear()} ${yearText}`;
        } else if (!yearText) { // If element is empty
            currentYearFooterSpan.textContent = `© ${new Date().getFullYear()}`;
        }
    }


    console.log("Uplas uhome.js (Homepage JS) v4 loaded and initialized.");
});

