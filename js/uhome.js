// js/uhome.js
/* ================================================
   Uplas Homepage Specific JavaScript (uhome.js)
   - Multi-step Signup Form Logic
   - Login Form Logic
   - Form Switching (Tabs & URL Hash)
   - Input Validation & Error Display
   - API Integration with uplasApi
   ================================================ */
'use strict';

document.addEventListener('DOMContentLoaded', () => {
    // --- Element Selectors ---
    const authSection = document.getElementById('auth-section');
    if (!authSection) {
        // console.log("uhome.js: Auth section not found on this page. Exiting.");
        return; // Exit if auth section is not on the page
    }

    const signupForm = document.getElementById('signup-form');
    const loginForm = document.getElementById('login-form');
    const authToggleButtons = document.querySelectorAll('.auth-toggle-button');

    // Signup Form Specific Elements
    const signupFormSteps = signupForm?.querySelectorAll('.form-step');
    const signupCountryCodeSelect = document.getElementById('signup-country-code');
    const signupIndustrySelect = document.getElementById('signup-industry');
    const signupOtherIndustryGroup = document.getElementById('signup-other-industry-group');
    const signupOtherIndustryInput = document.getElementById('signup-other-industry');
    const signupPasswordInput = signupForm?.querySelector('#signup-password');
    const signupConfirmPasswordInput = signupForm?.querySelector('#signup-confirm-password');
    const signupPasswordMismatchSpan = signupForm?.querySelector('#signup-password-mismatch');
    const signupStatusDiv = document.getElementById('signup-status');
    const signupTermsCheckbox = document.getElementById('signup-terms');

    // Login Form Specific Elements
    const loginEmailInput = loginForm?.querySelector('#login-email');
    const loginPasswordInput = loginForm?.querySelector('#login-password');
    const loginStatusDiv = document.getElementById('login-status');

    // --- State Variables ---
    let currentSignupStep = 0;
    const { uplasApi, uplasTranslate, uplasApplyTranslations, uplasScrollToElement } = window; // Destructure global utilities

    // --- Utility Functions ---
    const displayStatus = (formElement, message, typeOrIsError, translateKey = null) => {
        const isError = typeof typeOrIsError === 'boolean' ? typeOrIsError : typeOrIsError === 'error';
        const statusType = typeof typeOrIsError === 'string' ? typeOrIsError : (isError ? 'error' : 'success');

        if (uplasApi && uplasApi.displayFormStatus) {
            uplasApi.displayFormStatus(formElement, message, isError, translateKey);
        } else {
            // Fallback local display
            let statusDiv = (formElement === signupForm) ? signupStatusDiv :
                            (formElement === loginForm) ? loginStatusDiv :
                            formElement?.querySelector('.form__status');

            if (!statusDiv) {
                console.warn("uhome.js (local displayStatus): Form status display element not found for form:", formElement);
                return;
            }
            const text = (translateKey && uplasTranslate) ? uplasTranslate(translateKey, { fallback: message }) : message;
            statusDiv.textContent = text;
            statusDiv.className = 'form__status'; // Reset
            statusDiv.classList.add(`form__status--${statusType}`);
            statusDiv.style.display = 'block';
            statusDiv.setAttribute('aria-live', isError ? 'assertive' : 'polite');
            if(statusType === 'success') setTimeout(() => { if(statusDiv) statusDiv.style.display = 'none';}, 7000);

        }
    };

    const clearFormStatusMessage = (formElement) => {
        let statusDiv = (formElement === signupForm) ? signupStatusDiv :
                        (formElement === loginForm) ? loginStatusDiv :
                        formElement?.querySelector('.form__status');
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
        inputElement.classList.remove('invalid');
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
                errorSpan.textContent = (uplasTranslate && errorKey) ?
                                        uplasTranslate(errorKey, { fallback: defaultMessage }) : defaultMessage;
            }
            return false;
        }
        return true;
    };


    // --- Form Switching Logic (Tabs & URL Hash) ---
    authToggleButtons.forEach(button => { /* ... (same as uhome (4).js, no changes needed here) ... */
        button.addEventListener('click', () => {
            const targetFormId = button.dataset.form;
            const targetForm = document.getElementById(targetFormId);

            authToggleButtons.forEach(btn => btn.classList.remove('active'));
            button.classList.add('active');

            if (signupForm) signupForm.classList.remove('form--active');
            if (loginForm) loginForm.classList.remove('form--active');

            if (targetForm) {
                targetForm.classList.add('form--active');
                if (targetFormId === 'signup-form' && signupForm) {
                    resetSignupFormSteps();
                } else if (loginForm) {
                    clearFormStatusMessage(loginForm);
                }
                const firstInput = targetForm.querySelector('input:not([type="hidden"]):not([disabled]), select:not([disabled]), textarea:not([disabled])');
                firstInput?.focus();
                 // Update URL hash without triggering hashchange listener if not needed for initial load
                if(window.location.hash !== `#${targetFormId}` && window.location.hash !== `#auth-section&form=${targetFormId}`) {
                   // history.pushState(null, '', `#${targetFormId}`); // Or #auth-section&form=...
                }
            }
        });
    });

    const handleHashChange = () => { /* ... (same as uhome (4).js, slightly refined scrolling) ... */
        const hash = window.location.hash;
        let formToActivate = null;

        if (hash.startsWith('#auth-section')) {
            if (authSection) {
                if (uplasScrollToElement) uplasScrollToElement('#auth-section');
                else authSection.scrollIntoView({ behavior: 'smooth' });
            }
            const subHashMatch = hash.match(/&form=(login-form|signup-form)/);
            formToActivate = subHashMatch ? subHashMatch[1] : (document.querySelector('.auth-toggle-button.active')?.dataset.form || 'signup-form');
        } else if (hash === '#signup-form' || hash === '#login-form') {
            formToActivate = hash.substring(1);
            if (authSection) { // Scroll to auth section if directly linking to a form
                 if (uplasScrollToElement) uplasScrollToElement('#auth-section');
                else authSection.scrollIntoView({ behavior: 'smooth' });
            }
        }

        if (formToActivate) {
            const targetButton = document.querySelector(`.auth-toggle-button[data-form="${formToActivate}"]`);
            if (targetButton && !targetButton.classList.contains('active')) { // Click only if not already active
                targetButton.click();
            }
        }
    };
    window.addEventListener('hashchange', handleHashChange);
    // Initial call to handleHashChange is done after initial UI setup.


    // --- Multi-Step Signup Form Logic ---
    const resetSignupFormSteps = () => { /* ... (same as uhome (4).js) ... */
        currentSignupStep = 0;
        if (signupFormSteps && signupFormSteps.length > 0) {
            showSignupStep(currentSignupStep);
            signupForm?.reset(); // Resets form fields
            // Clear validation states
            signupForm?.querySelectorAll('.invalid').forEach(el => el.classList.remove('invalid'));
            signupForm?.querySelectorAll('.form__error-message').forEach(el => el.textContent = '');
            if(signupPasswordMismatchSpan) signupPasswordMismatchSpan.textContent = '';


            if (signupOtherIndustryGroup) signupOtherIndustryGroup.classList.add('form__group--hidden');
            if (signupIndustrySelect) signupIndustrySelect.value = ""; // Explicitly reset select
            if (signupCountryCodeSelect) signupCountryCodeSelect.value = "+254"; // Default country code
            clearFormStatusMessage(signupForm);
        }
    };

    const showSignupStep = (stepIndex) => { /* ... (same as uhome (4).js) ... */
        if (!signupFormSteps || !signupFormSteps[stepIndex]) return;
        signupFormSteps.forEach((stepElement, index) => {
            stepElement.classList.toggle('form-step--active', index === stepIndex);
        });
        const activeStepElement = signupFormSteps[stepIndex];
        const firstInput = activeStepElement?.querySelector('input:not([type="hidden"]):not([disabled]), select:not([disabled]), textarea:not([disabled])');
        firstInput?.focus();
        currentSignupStep = stepIndex;
    };

    const validateCurrentSignupStep = () => { /* ... (same as uhome (4).js, uses uplasTranslate for error messages) ... */
        const currentStepElement = signupFormSteps?.[currentSignupStep];
        if (!currentStepElement) return true; // Should not happen if logic is correct
        let isStepValid = true;

        const inputsToValidate = currentStepElement.querySelectorAll('input[required]:not([type="hidden"]), select[required]:not([type="hidden"]), textarea[required]:not([type="hidden"])');

        inputsToValidate.forEach(input => {
            // Skip validation for 'otherIndustry' if its group is hidden
            if (input.id === 'signup-other-industry' && signupOtherIndustryGroup?.classList.contains('form__group--hidden')) {
                input.classList.remove('invalid');
                const errorSpan = input.closest('.form__group')?.querySelector('.form__error-message');
                if (errorSpan) errorSpan.textContent = '';
                return; // Don't validate if hidden and not required based on parent select
            }
            if (!validateIndividualInput(input)) isStepValid = false;
        });

        if (currentStepElement.dataset.step === '5') { // Password and Terms step
            if (signupPasswordInput && signupConfirmPasswordInput && signupPasswordInput.value !== signupConfirmPasswordInput.value) {
                signupConfirmPasswordInput.classList.add('invalid');
                if (signupPasswordMismatchSpan) {
                    signupPasswordMismatchSpan.textContent = (uplasTranslate) ?
                        uplasTranslate('error_passwords_do_not_match', { fallback: "Passwords do not match."}) : "Passwords do not match.";
                }
                isStepValid = false;
            } else {
                if (signupPasswordMismatchSpan) signupPasswordMismatchSpan.textContent = "";
                 // Only remove 'invalid' if passwords match AND confirm password is not empty
                if(signupConfirmPasswordInput && signupPasswordInput?.value === signupConfirmPasswordInput.value && signupConfirmPasswordInput.value) {
                     signupConfirmPasswordInput.classList.remove('invalid');
                }
            }

            if (signupTermsCheckbox && !signupTermsCheckbox.checked) {
                const termsErrorSpan = signupTermsCheckbox.closest('.form__group')?.querySelector('.form__error-message');
                if (termsErrorSpan) {
                    termsErrorSpan.textContent = (uplasTranslate) ?
                        uplasTranslate('error_terms_required', { fallback: "You must agree to the terms and conditions."}) : "You must agree to the terms and conditions.";
                }
                // It's good practice to also visually indicate the checkbox or its label is in error
                signupTermsCheckbox.classList.add('invalid'); // You might need CSS for .form__group--checkbox input.invalid
                isStepValid = false;
            } else if (signupTermsCheckbox) { // If checkbox exists and is checked (or not required)
                const termsErrorSpan = signupTermsCheckbox.closest('.form__group')?.querySelector('.form__error-message');
                if (termsErrorSpan) termsErrorSpan.textContent = "";
                signupTermsCheckbox.classList.remove('invalid');
            }
        }
        return isStepValid;
    };

    const handleNextSignupStep = () => { /* ... (same as uhome (4).js) ... */
        if (!signupFormSteps || currentSignupStep >= signupFormSteps.length - 1) return;
        if (validateCurrentSignupStep()) {
            showSignupStep(currentSignupStep + 1);
             clearFormStatusMessage(signupForm); // Clear general form status when moving next
        } else {
             // Optionally, display a generic "please correct errors" at the top/bottom of the step
             // displayStatus(signupForm, 'Please correct the highlighted errors in this step.', 'error', 'error_step_validation_failed');
        }
    };

    const handlePrevSignupStep = () => { /* ... (same as uhome (4).js) ... */
        if (currentSignupStep > 0) {
            showSignupStep(currentSignupStep - 1);
            clearFormStatusMessage(signupForm);
        }
    };

    signupForm?.querySelectorAll('.form__button--next').forEach(button => button.addEventListener('click', handleNextSignupStep));
    signupForm?.querySelectorAll('.form__button--prev').forEach(button => button.addEventListener('click', handlePrevSignupStep));
    if (signupIndustrySelect) { /* ... (same as uhome (4).js, `validateIndividualInput` handles clearing error) ... */
         signupIndustrySelect.addEventListener('change', () => {
            const showOther = signupIndustrySelect.value === 'Other';
            if(signupOtherIndustryGroup) signupOtherIndustryGroup.classList.toggle('form__group--hidden', !showOther);
            if(signupOtherIndustryInput) {
                signupOtherIndustryInput.required = showOther;
                if (!showOther) {
                    signupOtherIndustryInput.value = '';
                    validateIndividualInput(signupOtherIndustryInput); // Re-validate to clear potential error
                }
            }
        });
    }
    if (signupPasswordInput && signupConfirmPasswordInput && signupPasswordMismatchSpan) { /* ... (same as uhome (4).js, uses uplasTranslate) ... */
        const checkPasswordMatch = () => {
            if (signupPasswordInput.value && signupConfirmPasswordInput.value && signupPasswordInput.value !== signupConfirmPasswordInput.value) {
                signupPasswordMismatchSpan.textContent = (uplasTranslate) ?
                    uplasTranslate('error_passwords_do_not_match') : "Passwords do not match.";
                signupConfirmPasswordInput.classList.add('invalid');
            } else {
                signupPasswordMismatchSpan.textContent = '';
                if (signupPasswordInput.value === signupConfirmPasswordInput.value && signupConfirmPasswordInput.value) {
                     // Only remove invalid if they match AND confirm is not empty
                    signupConfirmPasswordInput.classList.remove('invalid');
                }
            }
        };
        signupConfirmPasswordInput.addEventListener('input', checkPasswordMatch);
        signupPasswordInput.addEventListener('input', checkPasswordMatch); // Check also when primary password changes
    }


    // --- Populate Country Codes ---
    const populateSignupCountryCodes = () => { /* ... (same as uhome (4).js, no changes needed) ... */
         if (!signupCountryCodeSelect) return;
        // In a real app, this list would be more comprehensive or fetched.
        const countryCodes = [
            { code: '+1', flag: '🇺🇸', name: 'United States' }, { code: '+44', flag: '🇬🇧', name: 'United Kingdom' },
            { code: '+254', flag: '🇰🇪', name: 'Kenya' }, { code: '+234', flag: '🇳🇬', name: 'Nigeria' },
            { code: '+27', flag: '🇿🇦', name: 'South Africa' }, { code: '+91', flag: '🇮🇳', name: 'India' },
            { code: '+61', flag: '🇦🇺', name: 'Australia' }, { code: '+1', flag: '🇨🇦', name: 'Canada' }, // Using primary for Canada
            { code: '+49', flag: '🇩🇪', name: 'Germany' }, { code: '+33', flag: '🇫🇷', name: 'France' },
            { code: '+86', flag: '🇨🇳', name: 'China' }, { code: '+81', flag: '🇯🇵', name: 'Japan' },
            { code: '+55', flag: '🇧🇷', name: 'Brazil' },
            // Add more relevant codes or a full list
        ];
        // Ensure placeholder is translatable
        signupCountryCodeSelect.innerHTML = `<option value="" disabled data-translate-key="form_select_country_code_placeholder">Code</option>`;
        countryCodes.forEach(country => {
            const option = document.createElement('option');
            option.value = country.code;
            // Displaying flag and code is user-friendly
            option.textContent = `${country.flag} ${country.code}`;
            option.setAttribute('aria-label', `${country.name} (${country.code})`);
            signupCountryCodeSelect.appendChild(option);
        });
        signupCountryCodeSelect.value = '+254'; // Default to Kenya
        if(uplasApplyTranslations) uplasApplyTranslations(signupCountryCodeSelect); // Translate the placeholder
    };
    populateSignupCountryCodes();


    // --- Signup Form Submission ---
    const handleSignupSubmit = async (e) => { /* ... (same as uhome (4).js, uses uplasApi, error keys) ... */
        e.preventDefault();
        if (!signupForm || !validateCurrentSignupStep()) {
            displayStatus(signupForm, '', 'error', 'error_correct_form_errors'); // Message from translation key
            return;
        }
        clearFormStatusMessage(signupForm);
        displayStatus(signupForm, '', 'loading', 'signup_status_processing');
        const submitButton = signupForm.querySelector('button[type="submit"]');
        if (submitButton) submitButton.disabled = true;

        if (!uplasApi || !uplasApi.registerUser) {
            console.error("uhome.js: uplasApi.registerUser is not available!");
            displayStatus(signupForm, '', 'error', 'error_service_unavailable');
            if (submitButton) submitButton.disabled = false;
            return;
        }

        const formData = new FormData(signupForm);
        const dataToSend = {
            full_name: formData.get('fullName'),
            email: formData.get('email'),
            organization: formData.get('organization') || null,
            industry: formData.get('industry') === 'Other' ? formData.get('otherIndustry') : formData.get('industry'),
            profession: formData.get('profession'),
            whatsapp_number: `${formData.get('countryCode')}${formData.get('phone')}`,
            password: formData.get('password'),
            password2: formData.get('confirmPassword')
        };

        try {
            const responseData = await uplasApi.registerUser(dataToSend);
            // Assuming registerUser throws an error on failure, so if we reach here, it's success.
            // The responseData from your backend for successful registration is user data.
            displayStatus(signupForm, responseData.message || (uplasTranslate ? uplasTranslate('signup_status_success_verify_whatsapp') : 'Signup successful! Please check for verification instructions.'), 'success');
            // signupForm.reset(); // Consider if form should reset or direct user to login
            // resetSignupFormSteps();
            // Optionally, switch to login tab or show a "Please Login" message.
            const loginButton = document.querySelector('.auth-toggle-button[data-form="login-form"]');
            loginButton?.click(); // Switch to login form
            if (loginEmailInput) loginEmailInput.value = dataToSend.email; // Pre-fill email in login
            if (loginPasswordInput) loginPasswordInput.focus();

        } catch (error) {
            console.error('uhome.js: Signup Error from uplasApi:', error);
            // error.message should contain the formatted error from uplasApi or backend
            displayStatus(signupForm, error.message, 'error', 'error_network'); // Use generic network error key if message is too technical
        } finally {
            if (submitButton) submitButton.disabled = false;
        }
    };
    if (signupForm) signupForm.addEventListener('submit', handleSignupSubmit);


    // --- Login Form Submission ---
    const handleLoginSubmit = async (e) => { /* ... (same as uhome (4).js, uses uplasApi, error keys) ... */
        e.preventDefault();
        if (!loginForm) return;
        clearFormStatusMessage(loginForm);

        let isFormValid = true;
        if (loginEmailInput && !validateIndividualInput(loginEmailInput)) isFormValid = false;
        if (loginPasswordInput && !validateIndividualInput(loginPasswordInput)) isFormValid = false;

        if (!isFormValid) {
            displayStatus(loginForm, '', 'error', 'error_correct_form_errors');
            return;
        }

        displayStatus(loginForm, '', 'loading', 'login_status_attempting');
        const submitButton = loginForm.querySelector('button[type="submit"]');
        if (submitButton) submitButton.disabled = true;

        if (!uplasApi || !uplasApi.loginUser) {
            console.error("uhome.js: uplasApi.loginUser is not available!");
            displayStatus(loginForm, '', 'error', 'error_service_unavailable');
            if (submitButton) submitButton.disabled = false;
            return;
        }

        const email = loginEmailInput.value;
        const password = loginPasswordInput.value;

        try {
            // uplasApi.loginUser handles storing tokens and user data, and dispatches 'authChanged'
            const loginResult = await uplasApi.loginUser(email, password);

            displayStatus(loginForm, loginResult.message || (uplasTranslate ? uplasTranslate('login_status_success_redirect') : 'Login successful! Redirecting...'), 'success');

            const urlParams = new URLSearchParams(window.location.search);
            const returnUrl = urlParams.get('returnUrl');

            setTimeout(() => {
                if (returnUrl) {
                    window.location.href = returnUrl;
                } else {
                    window.location.href = 'uprojects.html'; // Default redirect to user projects/dashboard
                }
            }, 1500);

        } catch (error) {
            console.error('uhome.js: Login Error from uplasApi:', error);
            displayStatus(loginForm, error.message, 'error', 'login_status_error_invalid_credentials');
        } finally {
            if (submitButton) submitButton.disabled = false;
        }
    };
    if (loginForm) loginForm.addEventListener('submit', handleLoginSubmit);

    // --- Initial UI Setup ---
    function initializeFormVisibility() {
        const hash = window.location.hash;
        let activeForm = 'signup-form'; // Default
        if (hash.includes('login-form')) {
            activeForm = 'login-form';
        } else if (hash.includes('signup-form')) {
            activeForm = 'signup-form';
        }

        const targetButton = document.querySelector(`.auth-toggle-button[data-form="${activeForm}"]`);
        if(targetButton) {
            targetButton.click(); // This will handle making the form active and resetting signup if needed
        } else { // Fallback if no button matches (e.g., if hash is just #auth-section)
            const defaultButton = document.querySelector('.auth-toggle-button[data-form="signup-form"]');
            defaultButton?.click();
        }
        handleHashChange(); // Ensure scrolling and correct form display if #auth-section is part of hash
    }
    initializeFormVisibility();


    // Add listeners to clear validation on input
    document.querySelectorAll('#signup-form input[required], #signup-form select[required], #login-form input[required], #signup-form textarea[required]').forEach(input => {
        input.addEventListener('input', () => {
            if (input.id === 'signup-terms') { // For checkbox, validate on change instead
                return;
            }
            validateIndividualInput(input); // Validate on input for immediate feedback
             // Specific logic for password confirmation (also re-check on primary password input)
            if(input.id === 'signup-confirm-password' || input.id === 'signup-password') {
                if(signupPasswordInput && signupConfirmPasswordInput && signupPasswordMismatchSpan) {
                     if (signupPasswordInput.value && signupConfirmPasswordInput.value && signupPasswordInput.value !== signupConfirmPasswordInput.value) {
                        signupPasswordMismatchSpan.textContent = (uplasTranslate) ? uplasTranslate('error_passwords_do_not_match') : "Passwords do not match.";
                        signupConfirmPasswordInput.classList.add('invalid');
                    } else {
                        signupPasswordMismatchSpan.textContent = '';
                        // Remove 'invalid' from confirm only if it matches AND is not empty
                        if (signupPasswordInput.value === signupConfirmPasswordInput.value && signupConfirmPasswordInput.value) {
                           signupConfirmPasswordInput.classList.remove('invalid');
                        }
                    }
                }
            }
        });
        // For checkbox, validate on change
        if (input.id === 'signup-terms') {
            input.addEventListener('change', () => validateIndividualInput(input));
        }
    });


    // Update copyright year (This is also in global.js, but ensures it's handled if footer is static here)
    const currentYearFooterSpan = document.getElementById('current-year-footer');
    if (currentYearFooterSpan && typeof window.updateDynamicFooterYear === 'function') {
        // Prefer global.js's version if available, as it might be more tied to i18n updates
        // window.updateDynamicFooterYear(); // This function is now part of componentLoader.js and called there
    } else if (currentYearFooterSpan) { // Fallback if global function not ready/available
        const yearTextKey = currentYearFooterSpan.dataset.translateKey || 'footer_copyright_dynamic';
        let yearTextContent = currentYearFooterSpan.textContent || "{currentYear}";

        if (yearTextKey && uplasTranslate) {
            yearTextContent = uplasTranslate(yearTextKey, { fallback: "{currentYear}" });
        }
        if (yearTextContent.includes("{currentYear}")) {
            currentYearFooterSpan.textContent = yearTextContent.replace("{currentYear}", new Date().getFullYear());
        } else if (!yearTextContent.match(/\d{4}/)) {
             currentYearFooterSpan.textContent = `© ${new Date().getFullYear()} ${yearTextContent.trim()}`;
        }
    }

    console.log("uhome.js: Uplas Homepage JS refined and initialized.");
});
