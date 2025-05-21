// js/uhome.js
/* ================================================
   Uplas Homepage Specific JavaScript (uhome.js)
   - Multi-step Signup Form Logic
   - Login Form Logic
   - Form Switching (Tabs & URL Hash)
   - Input Validation & Error Display
   - API Integration Placeholders
   ================================================ */
'use strict';

document.addEventListener('DOMContentLoaded', () => {
    // --- Element Selectors ---
    const authSection = document.getElementById('auth-section');
    if (!authSection) return; // Exit if auth section is not on the page

    const signupForm = document.getElementById('signup-form');
    const loginForm = document.getElementById('login-form');
    const authToggleButtons = document.querySelectorAll('.auth-toggle-button');

    // Signup Form Specific Elements
    const signupFormSteps = signupForm?.querySelectorAll('.form-step');
    const signupCountryCodeSelect = document.getElementById('signup-country-code');
    const signupIndustrySelect = document.getElementById('signup-industry');
    const signupOtherIndustryGroup = document.getElementById('signup-other-industry-group');
    const signupOtherIndustryInput = document.getElementById('signup-other-industry');
    const signupPasswordInput = signupForm?.querySelector('#signup-password'); // Scoped to signup form
    const signupConfirmPasswordInput = signupForm?.querySelector('#signup-confirm-password'); // Scoped
    const signupPasswordMismatchSpan = signupForm?.querySelector('#signup-password-mismatch');
    const signupStatusDiv = document.getElementById('signup-status');
    const signupTermsCheckbox = document.getElementById('signup-terms');

    // Login Form Specific Elements
    const loginEmailInput = loginForm?.querySelector('#login-email'); // Scoped
    const loginPasswordInput = loginForm?.querySelector('#login-password'); // Scoped
    const loginStatusDiv = document.getElementById('login-status');

    // User Avatar in Header (from index (3).html)
    const userAvatarHeader = document.getElementById('user-avatar-header');
    const loginSignupHeaderLink = document.querySelector('.nav__link--cta[href="#auth-section"]');


    // --- State Variables ---
    let currentSignupStep = 0;

    // --- Utility Functions ---
    // These functions are defined within uhome.js but could be moved to global.js if used elsewhere.
    // For now, keeping them here as they are closely tied to form validation and status display.

    const displayFormStatusMessage = (formElement, message, type, translateKey = null) => {
        let statusDiv;
        if (formElement === signupForm) statusDiv = signupStatusDiv;
        else if (formElement === loginForm) statusDiv = loginStatusDiv;
        else statusDiv = formElement.querySelector('.form__status'); // Fallback

        if (!statusDiv) {
            console.warn("Form status display element not found for form:", formElement);
            return;
        }

        let text = message;
        // Assuming window.uplasTranslate is made available by global.js
        if (translateKey && typeof window.uplasTranslate === 'function') {
            text = window.uplasTranslate(translateKey, message);
        }

        statusDiv.textContent = text;
        statusDiv.className = 'form__status'; // Reset classes
        if (type) statusDiv.classList.add(`form__status--${type}`); // e.g., success, error, loading
        statusDiv.style.display = 'block';
        statusDiv.setAttribute('aria-live', type === 'error' ? 'assertive' : 'polite');
    };

    const clearFormStatusMessage = (formElement) => {
        let statusDiv;
        if (formElement === signupForm) statusDiv = signupStatusDiv;
        else if (formElement === loginForm) statusDiv = loginStatusDiv;
        else statusDiv = formElement.querySelector('.form__status');

        if (statusDiv) {
            statusDiv.textContent = '';
            statusDiv.style.display = 'none';
            statusDiv.className = 'form__status';
        }
    };

    const validateIndividualInput = (inputElement) => {
        const group = inputElement.closest('.form__group');
        if (!group) return inputElement.checkValidity();

        const errorSpan = group.querySelector('.form__error-message');
        inputElement.classList.remove('invalid'); // Clear previous invalid state
        if (errorSpan) errorSpan.textContent = '';


        if (!inputElement.checkValidity()) {
            inputElement.classList.add('invalid');
            if (errorSpan) {
                let errorKey = null;
                let defaultMessage = inputElement.validationMessage || "Invalid input.";

                if (inputElement.validity.valueMissing) {
                    errorKey = inputElement.dataset.errorKeyRequired || 'error_field_required';
                    defaultMessage = "This field is required.";
                } else if (inputElement.validity.patternMismatch) {
                    errorKey = inputElement.dataset.errorKeyPattern || 'error_pattern_mismatch';
                    defaultMessage = inputElement.title || "Please match the requested format.";
                } else if (inputElement.validity.typeMismatch) {
                    errorKey = inputElement.dataset.errorKeyType || 'error_type_mismatch';
                    defaultMessage = `Please enter a valid ${inputElement.type}.`;
                }
                // Assuming window.uplasTranslate is available from global.js
                errorSpan.textContent = (typeof window.uplasTranslate === 'function' && errorKey) ?
                                        window.uplasTranslate(errorKey, defaultMessage) : defaultMessage;
            }
            return false;
        }
        return true;
    };


    // --- Form Switching Logic (Tabs & URL Hash) ---
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
                    resetSignupFormSteps(); // Reset form state when switching to signup
                    clearFormStatusMessage(signupForm);
                } else {
                    clearFormStatusMessage(loginForm);
                }
                const firstInput = targetForm.querySelector('input:not([type="hidden"]), select, textarea');
                firstInput?.focus(); // Focus on the first field of the active form
            }
        });
    });

    const handleHashChange = () => {
        const hash = window.location.hash;
        if (hash === '#signup-form' || hash === '#login-form') {
            const targetButton = document.querySelector(`.auth-toggle-button[data-form="${hash.substring(1)}"]`);
            targetButton?.click(); // Simulate click to switch tab and form
            // Scroll to auth section if uplasScrollToElement is available (from global.js)
            if (authSection) {
                if (typeof window.uplasScrollToElement === 'function') {
                    window.uplasScrollToElement('#auth-section');
                } else {
                    authSection.scrollIntoView({ behavior: 'smooth' });
                }
            }
        }
    };
    window.addEventListener('hashchange', handleHashChange);
    // Initial check for hash on page load (e.g., if linked directly to #login-form)
    if(window.location.hash) handleHashChange();


    // --- Multi-Step Signup Form Logic ---
    const resetSignupFormSteps = () => {
        currentSignupStep = 0;
        if (signupFormSteps && signupFormSteps.length > 0) {
            showSignupStep(currentSignupStep);
            signupForm?.reset(); // Reset form fields
            signupForm?.querySelectorAll('.invalid').forEach(el => el.classList.remove('invalid'));
            signupForm?.querySelectorAll('.form__error-message').forEach(el => el.textContent = '');
            if (signupOtherIndustryGroup) signupOtherIndustryGroup.classList.add('form__group--hidden');
            if (signupIndustrySelect) signupIndustrySelect.value = ""; // Ensure placeholder is shown
            if (signupCountryCodeSelect) signupCountryCodeSelect.value = "+254"; // Default to Kenya or a sensible default
        }
    };
    
    const showSignupStep = (stepIndex) => {
        if (!signupFormSteps || !signupFormSteps[stepIndex]) return;
        signupFormSteps.forEach((stepElement, index) => {
            stepElement.classList.toggle('form-step--active', index === stepIndex);
        });
        const activeStepElement = signupFormSteps[stepIndex];
        const firstInput = activeStepElement?.querySelector('input:not([type="hidden"]):not([disabled]), select:not([disabled]), textarea:not([disabled])');
        firstInput?.focus(); // Focus on the first interactive element of the current step
        currentSignupStep = stepIndex;
    };

    const validateCurrentSignupStep = () => {
        const currentStepElement = signupFormSteps?.[currentSignupStep];
        if (!currentStepElement) return true; // Should not happen if steps are defined
        let isStepValid = true;
        
        // Validate only visible and required inputs within the current step
        const inputsToValidate = currentStepElement.querySelectorAll('input[required]:not([type="hidden"]), select[required]:not([type="hidden"]), textarea[required]:not([type="hidden"])');

        inputsToValidate.forEach(input => {
            // Skip validation for 'other industry' if it's hidden and not required
            if (input.id === 'signup-other-industry' && signupOtherIndustryGroup?.classList.contains('form__group--hidden')) {
                input.classList.remove('invalid');
                const errorSpan = input.closest('.form__group')?.querySelector('.form__error-message');
                if (errorSpan) errorSpan.textContent = '';
                return;
            }
            if (!validateIndividualInput(input)) isStepValid = false;
        });

        // Specific validation for the final step (Step 5)
        if (currentStepElement.dataset.step === '5') {
            if (signupPasswordInput && signupConfirmPasswordInput && signupPasswordInput.value !== signupConfirmPasswordInput.value) {
                signupConfirmPasswordInput.classList.add('invalid');
                if (signupPasswordMismatchSpan) {
                     signupPasswordMismatchSpan.textContent = typeof window.uplasTranslate === 'function' ?
                        window.uplasTranslate('error_passwords_do_not_match', "Passwords do not match.") : "Passwords do not match.";
                }
                isStepValid = false;
            } else {
                if (signupPasswordMismatchSpan) signupPasswordMismatchSpan.textContent = "";
                if(signupConfirmPasswordInput && signupPasswordInput?.value === signupConfirmPasswordInput.value) {
                     signupConfirmPasswordInput.classList.remove('invalid');
                }
            }

            if (signupTermsCheckbox && !signupTermsCheckbox.checked) {
                const termsErrorSpan = signupTermsCheckbox.closest('.form__group')?.querySelector('.form__error-message');
                if(termsErrorSpan) {
                    termsErrorSpan.textContent = typeof window.uplasTranslate === 'function' ?
                        window.uplasTranslate('error_terms_required', "You must agree to the terms and conditions.") : "You must agree to the terms and conditions.";
                }
                // Optionally add an 'invalid' class to the checkbox or its label for styling
                signupTermsCheckbox.classList.add('invalid'); // You might need CSS for this
                isStepValid = false;
            } else if (signupTermsCheckbox) {
                const termsErrorSpan = signupTermsCheckbox.closest('.form__group')?.querySelector('.form__error-message');
                if(termsErrorSpan) termsErrorSpan.textContent = "";
                signupTermsCheckbox.classList.remove('invalid');
            }
        }
        return isStepValid;
    };

    const handleNextSignupStep = () => {
        if (!signupFormSteps || currentSignupStep >= signupFormSteps.length - 1) return;
        if (validateCurrentSignupStep()) {
            showSignupStep(currentSignupStep + 1);
        }
    };

    const handlePrevSignupStep = () => {
        if (currentSignupStep > 0) {
            showSignupStep(currentSignupStep - 1);
            clearFormStatusMessage(signupForm); // Clear general status message when moving back
        }
    };

    signupForm?.querySelectorAll('.form__button--next').forEach(button => {
        button.addEventListener('click', handleNextSignupStep);
    });
    signupForm?.querySelectorAll('.form__button--prev').forEach(button => {
        button.addEventListener('click', handlePrevSignupStep);
    });

    // "Other Industry" field visibility
    if (signupIndustrySelect && signupOtherIndustryGroup && signupOtherIndustryInput) {
        signupIndustrySelect.addEventListener('change', () => {
            const showOther = signupIndustrySelect.value === 'Other';
            signupOtherIndustryGroup.classList.toggle('form__group--hidden', !showOther);
            signupOtherIndustryInput.required = showOther;
            if (!showOther) {
                signupOtherIndustryInput.value = ''; // Clear if hidden
                validateIndividualInput(signupOtherIndustryInput); // Clear potential errors by re-validating
            }
        });
    }

    // Live password confirmation check
    if (signupPasswordInput && signupConfirmPasswordInput && signupPasswordMismatchSpan) {
        const checkPasswordMatch = () => {
            if (signupPasswordInput.value !== "" && signupConfirmPasswordInput.value !== "" && signupPasswordInput.value !== signupConfirmPasswordInput.value) {
                signupPasswordMismatchSpan.textContent = typeof window.uplasTranslate === 'function' ?
                    window.uplasTranslate('error_passwords_do_not_match', "Passwords do not match.") : "Passwords do not match.";
                signupConfirmPasswordInput.classList.add('invalid');
            } else {
                signupPasswordMismatchSpan.textContent = '';
                if (signupPasswordInput.value === signupConfirmPasswordInput.value) {
                    signupConfirmPasswordInput.classList.remove('invalid');
                }
            }
        };
        signupConfirmPasswordInput.addEventListener('input', checkPasswordMatch);
        signupPasswordInput.addEventListener('input', checkPasswordMatch); // Check also when primary password changes
    }


    // --- Populate Country Codes ---
    const populateSignupCountryCodes = () => {
        if (!signupCountryCodeSelect) return;
        const countryCodes = [ /* Basic list from index (3).html, can be expanded */
            { code: '+1', flag: '🇺🇸', name: 'United States' }, { code: '+44', flag: '🇬🇧', name: 'United Kingdom' },
            { code: '+254', flag: '🇰🇪', name: 'Kenya' }, { code: '+234', flag: '🇳🇬', name: 'Nigeria' },
            { code: '+27', flag: '🇿🇦', name: 'South Africa' }, { code: '+91', flag: '🇮🇳', name: 'India' },
            { code: '+61', flag: '🇦🇺', name: 'Australia' }, { code: '+1', flag: '🇨🇦', name: 'Canada (alt)' }, // Ensure values are unique if names are similar
        ];
        signupCountryCodeSelect.innerHTML = `<option value="" disabled data-translate-key="form_select_country_code_placeholder">Code</option>`; // Placeholder
        countryCodes.forEach(country => {
            const option = document.createElement('option');
            option.value = country.code; // Use code as value
            option.textContent = `${country.flag} ${country.code}`;
            signupCountryCodeSelect.appendChild(option);
        });
        signupCountryCodeSelect.value = '+254'; // Default to Kenya
        // If global.js has a translatePage function, call it to translate the new options
        if (typeof window.translatePage === 'function') window.translatePage();
    };
    populateSignupCountryCodes();


    // --- Signup Form Submission ---
    const handleSignupSubmit = async (e) => {
        e.preventDefault();
        if (!signupForm || !validateCurrentSignupStep()) { // Validate the final step
            displayFormStatusMessage(signupForm, 'Please correct the errors above.', 'error', 'error_correct_form_errors');
            return;
        }
        clearFormStatusMessage(signupForm);
        displayFormStatusMessage(signupForm, 'Processing signup...', 'loading', 'signup_status_processing');
        const submitButton = signupForm.querySelector('button[type="submit"]');
        if (submitButton) submitButton.disabled = true;

        const formData = new FormData(signupForm);
        const dataToSend = {
            full_name: formData.get('fullName'),
            email: formData.get('email'),
            organization: formData.get('organization') || null,
            industry: formData.get('industry') === 'Other' ? formData.get('otherIndustry') : formData.get('industry'),
            profession: formData.get('profession'),
            whatsapp_number: `${formData.get('countryCode')}${formData.get('phone')}`,
            password: formData.get('password'),
            // Backend should verify terms implicitly by processing signup; terms checkbox is client-side validated
        };

        try {
            console.log("Submitting Signup Data to Backend:", dataToSend);
            // Backend Integration: Replace with actual API call using fetchAuthenticated
            // const response = await fetchAuthenticated('/users/register/', { // Example Endpoint
            //     method: 'POST',
            //     body: JSON.stringify(dataToSend),
            //     // headers: { 'X-CSRFToken': window.uplasGetCookie('csrftoken') } // If using Django CSRF with cookies
            // });
            // const result = response; // fetchAuthenticated should parse JSON

            // Simulate API response
            await new Promise(resolve => setTimeout(resolve, 2000));
            const isSuccess = Math.random() > 0.1; // 90% success rate for demo
            let result;
            if (isSuccess) {
                result = { success: true, message: 'Signup successful! A verification code has been sent to your WhatsApp.', message_key: 'signup_status_success_verify_whatsapp' };
            } else {
                const errorType = Math.random();
                if (errorType < 0.5) result = { success: false, message: 'This email address is already registered.', message_key: 'signup_status_error_email_exists' };
                else result = { success: false, message: 'An unexpected error occurred. Please try again.', message_key: 'signup_status_error_generic' };
            }

            if (result.success) {
                displayFormStatusMessage(signupForm, result.message, 'success', result.message_key);
                // signupForm.reset(); // Reset form fields
                // resetSignupFormSteps(); // Go back to step 1
                // Optional: Automatically switch to login form or show a "Login Now" button
                // document.querySelector('.auth-toggle-button[data-form="login-form"]')?.click();
            } else {
                displayFormStatusMessage(signupForm, result.message, 'error', result.message_key);
            }
        } catch (error) {
            console.error('Signup Error:', error);
            displayFormStatusMessage(signupForm, error.message || 'A network error occurred. Please try again.', 'error', 'error_network');
        } finally {
            if (submitButton) submitButton.disabled = false;
        }
    };
    if (signupForm) signupForm.addEventListener('submit', handleSignupSubmit);


    // --- Login Form Submission ---
    const handleLoginSubmit = async (e) => {
        e.preventDefault();
        if (!loginForm) return;
        clearFormStatusMessage(loginForm);

        let isFormValid = true;
        if (loginEmailInput && !validateIndividualInput(loginEmailInput)) isFormValid = false;
        if (loginPasswordInput && !validateIndividualInput(loginPasswordInput)) isFormValid = false;

        if (!isFormValid) {
            displayFormStatusMessage(loginForm, 'Please correct the errors above.', 'error', 'error_correct_form_errors');
            return;
        }

        displayFormStatusMessage(loginForm, 'Attempting login...', 'loading', 'login_status_attempting');
        const submitButton = loginForm.querySelector('button[type="submit"]');
        if (submitButton) submitButton.disabled = true;

        const loginData = {
            email: loginEmailInput.value,
            password: loginPasswordInput.value
        };

        try {
            console.log("Submitting Login Data to Backend:", loginData);
            // Backend Integration: Replace with actual API call to your token/login endpoint
            // const response = await fetchAuthenticated('/users/login/', { // Example Endpoint
            //     method: 'POST',
            //     body: JSON.stringify(loginData),
            //     // headers: { 'X-CSRFToken': window.uplasGetCookie('csrftoken') }
            // });
            // const result = response; // Assuming fetchAuthenticated parses JSON

            // Simulate API response
            await new Promise(resolve => setTimeout(resolve, 1500));
            const isSuccess = Math.random() > 0.2; // Higher success for demo
            let result;
            if(isSuccess) {
                result = { 
                    success: true, 
                    message: 'Login successful! Redirecting to your learning dashboard...', 
                    message_key: 'login_status_success_redirect', 
                    access: 'simulated_access_token_xyz123', 
                    refresh: 'simulated_refresh_token_abc789',
                    user: { fullName: "Demo User", initials: "DU" } // Simulated user data
                };
            } else {
                result = { success: false, message: 'Invalid email or password. Please try again.', detail_key: 'login_status_error_invalid_credentials' };
            }

            if (result.success && result.access) {
                localStorage.setItem('accessToken', result.access);
                if(result.refresh) localStorage.setItem('refreshToken', result.refresh);
                if(result.user) localStorage.setItem('userData', JSON.stringify(result.user)); // Store basic user info

                displayFormStatusMessage(loginForm, result.message, 'success', result.message_key);
                
                // Update UI immediately to reflect login state (from index (3).html structure)
                if (userAvatarHeader && loginSignupHeaderLink && result.user) {
                    const userAvatarButton = userAvatarHeader.querySelector('.user-avatar-button-header');
                    if (userAvatarButton) userAvatarButton.textContent = result.user.initials || 'U';
                    userAvatarHeader.style.display = 'flex';
                    loginSignupHeaderLink.style.display = 'none'; // Hide Login/Signup link
                }

                // AI Model Integration Point: Could fetch personalized course recommendations or dashboard summary here
                // based on the logged-in user before redirecting.
                // Example: const dashboardData = await fetchAuthenticated('/users/dashboard-summary');

                setTimeout(() => { 
                    window.location.href = 'ucourses_list.html'; // Redirect to course listing or dashboard
                }, 1500);
            } else {
                displayFormStatusMessage(loginForm, result.message || 'Login failed.', 'error', result.detail_key || 'login_status_error_generic');
            }
        } catch (error) {
            console.error('Login Error:', error);
            displayFormStatusMessage(loginForm, error.message || 'A network error occurred. Please try again.', 'error', 'error_network');
        } finally {
            if (submitButton) submitButton.disabled = false;
        }
    };
    if (loginForm) loginForm.addEventListener('submit', handleLoginSubmit);

    // Initial setup for form visibility and focus based on HTML structure
    const initialActiveAuthButton = document.querySelector('.auth-toggle-buttons .auth-toggle-button.active');
    if (initialActiveAuthButton) {
        const initialFormId = initialActiveAuthButton.dataset.form;
        const initialFormElement = document.getElementById(initialFormId);
        if (initialFormElement) {
            initialFormElement.classList.add('form--active');
            const firstInput = initialFormElement.querySelector('input:not([type="hidden"]), select, textarea');
            firstInput?.focus();
            if (initialFormId === 'signup-form') {
                resetSignupFormSteps(); // Ensure signup form is on step 1
            }
        }
    } else if (signupForm) { // Default to signup if no active button is set in HTML
        const signupButton = document.querySelector('.auth-toggle-button[data-form="signup-form"]');
        signupButton?.classList.add('active');
        signupForm.classList.add('form--active');
        resetSignupFormSteps();
        const firstInput = signupForm.querySelector('input:not([type="hidden"]), select, textarea');
        firstInput?.focus();
    }


    // Add listeners to clear validation on input for all relevant inputs
    document.querySelectorAll('#signup-form input[required], #signup-form select[required], #login-form input[required], #signup-form textarea[required]').forEach(input => {
        input.addEventListener('input', () => {
            // Basic clearing, specific validation (like password match) is handled by its own listener
            if(input.checkValidity()){
                input.classList.remove('invalid');
                const errorSpan = input.closest('.form__group')?.querySelector('.form__error-message');
                if (errorSpan) errorSpan.textContent = '';
            }
            if (input.id === 'signup-terms' && input.checked) {
                 input.classList.remove('invalid');
                 const termsErrorSpan = input.closest('.form__group')?.querySelector('.form__error-message');
                if(termsErrorSpan) termsErrorSpan.textContent = "";
            }
        });
    });
    
    // Update copyright year (global.js might also handle this, ensure no conflict)
    const currentYearFooterSpan = document.getElementById('current-year-footer');
    if (currentYearFooterSpan) {
        const yearTextKey = currentYearFooterSpan.dataset.translateKey;
        let yearTextContent = currentYearFooterSpan.textContent; // Get current text

        if (yearTextKey && typeof window.uplasTranslate === 'function') { // If using translate key
            yearTextContent = window.uplasTranslate(yearTextKey, "{currentYear}");
        }
        
        if (yearTextContent && yearTextContent.includes("{currentYear}")) {
            currentYearFooterSpan.textContent = yearTextContent.replace("{currentYear}", new Date().getFullYear());
        } else if (yearTextContent && !yearTextContent.match(/\d{4}/)) { // If no placeholder and no year found
             currentYearFooterSpan.textContent = `© ${new Date().getFullYear()} ${yearTextContent}`;
        } else if (!yearTextContent) { // If element is empty
            currentYearFooterSpan.textContent = `© ${new Date().getFullYear()}`;
        }
    }


    console.log("Uplas uhome.js (Homepage JS) Refined and Initialized.");
});
