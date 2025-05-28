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
    const signupStatusDiv = document.getElementById('signup-status'); // Used by local displayFormStatusMessage
    const signupTermsCheckbox = document.getElementById('signup-terms');

    // Login Form Specific Elements
    const loginEmailInput = loginForm?.querySelector('#login-email');
    const loginPasswordInput = loginForm?.querySelector('#login-password');
    const loginStatusDiv = document.getElementById('login-status'); // Used by local displayFormStatusMessage

    // --- State Variables ---
    let currentSignupStep = 0;

    // --- Utility Functions ---
    // Use uplasApi.displayFormStatus if available, otherwise use local fallback.
    const displayStatus = (formElement, message, type, translateKey = null) => {
        if (typeof window.uplasApi !== 'undefined' && typeof window.uplasApi.displayFormStatus === 'function') {
            window.uplasApi.displayFormStatus(formElement, message, type === 'error', translateKey);
        } else {
            // Fallback to local implementation if uplasApi is not ready or available
            displayFormStatusMessageLocal(formElement, message, type, translateKey);
        }
    };

    const displayFormStatusMessageLocal = (formElement, message, type, translateKey = null) => {
        let statusDiv;
        if (formElement === signupForm) statusDiv = signupStatusDiv;
        else if (formElement === loginForm) statusDiv = loginStatusDiv;
        else statusDiv = formElement?.querySelector('.form__status'); // General fallback

        if (!statusDiv) {
            console.warn("uhome.js (local): Form status display element not found for form:", formElement);
            return;
        }

        let text = message;
        if (translateKey && typeof window.uplasTranslate === 'function') {
            text = window.uplasTranslate(translateKey, { fallback: message });
        }

        statusDiv.textContent = text;
        statusDiv.className = 'form__status'; // Reset classes
        if (type) statusDiv.classList.add(`form__status--${type}`);
        statusDiv.style.display = 'block';
        statusDiv.setAttribute('aria-live', type === 'error' ? 'assertive' : 'polite');
    };

    const clearFormStatusMessage = (formElement) => {
        // This function might not be needed if displayStatus handles clearing or timed display.
        // For now, keeping the local clear logic.
        let statusDiv;
        if (formElement === signupForm) statusDiv = signupStatusDiv;
        else if (formElement === loginForm) statusDiv = loginStatusDiv;
        else statusDiv = formElement?.querySelector('.form__status');

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
                errorSpan.textContent = (typeof window.uplasTranslate === 'function' && errorKey) ?
                                        window.uplasTranslate(errorKey, { fallback: defaultMessage }) : defaultMessage;
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
                // Clear status messages when switching forms
                if (targetFormId === 'signup-form' && signupForm) {
                    resetSignupFormSteps(); // Also clears its own status
                } else if (loginForm) {
                    clearFormStatusMessage(loginForm);
                }
                const firstInput = targetForm.querySelector('input:not([type="hidden"]):not([disabled]), select:not([disabled]), textarea:not([disabled])');
                firstInput?.focus();
            }
        });
    });

    const handleHashChange = () => {
        const hash = window.location.hash;
        if (hash === '#auth-section') {
             if (authSection) {
                if (typeof window.uplasScrollToElement === 'function') {
                    window.uplasScrollToElement('#auth-section');
                } else {
                    authSection.scrollIntoView({ behavior: 'smooth' });
                }
            }
            const subHashMatch = hash.match(/#auth-section&form=(login-form|signup-form)/);
            const formToShow = subHashMatch ? subHashMatch[1] : (document.querySelector('.auth-toggle-button.active')?.dataset.form || 'signup-form');
            const targetButton = document.querySelector(`.auth-toggle-button[data-form="${formToShow}"]`);
            targetButton?.click();

        } else if (hash === '#signup-form' || hash === '#login-form') {
            const targetButton = document.querySelector(`.auth-toggle-button[data-form="${hash.substring(1)}"]`);
            targetButton?.click();
        }
    };
    window.addEventListener('hashchange', handleHashChange);


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
            if (signupCountryCodeSelect) signupCountryCodeSelect.value = "+254";
            clearFormStatusMessage(signupForm); // Clear any previous submission status
        }
    };

    const showSignupStep = (stepIndex) => {
        if (!signupFormSteps || !signupFormSteps[stepIndex]) return;
        signupFormSteps.forEach((stepElement, index) => {
            stepElement.classList.toggle('form-step--active', index === stepIndex);
        });
        const activeStepElement = signupFormSteps[stepIndex];
        const firstInput = activeStepElement?.querySelector('input:not([type="hidden"]):not([disabled]), select:not([disabled]), textarea:not([disabled])');
        firstInput?.focus();
        currentSignupStep = stepIndex;
    };

    const validateCurrentSignupStep = () => {
        const currentStepElement = signupFormSteps?.[currentSignupStep];
        if (!currentStepElement) return true;
        let isStepValid = true;

        const inputsToValidate = currentStepElement.querySelectorAll('input[required]:not([type="hidden"]), select[required]:not([type="hidden"]), textarea[required]:not([type="hidden"])');

        inputsToValidate.forEach(input => {
            if (input.id === 'signup-other-industry' && signupOtherIndustryGroup?.classList.contains('form__group--hidden')) {
                input.classList.remove('invalid');
                const errorSpan = input.closest('.form__group')?.querySelector('.form__error-message');
                if (errorSpan) errorSpan.textContent = '';
                return;
            }
            if (!validateIndividualInput(input)) isStepValid = false;
        });

        if (currentStepElement.dataset.step === '5') { // Final step (password & terms)
            if (signupPasswordInput && signupConfirmPasswordInput && signupPasswordInput.value !== signupConfirmPasswordInput.value) {
                signupConfirmPasswordInput.classList.add('invalid');
                if (signupPasswordMismatchSpan) {
                     signupPasswordMismatchSpan.textContent = typeof window.uplasTranslate === 'function' ?
                        window.uplasTranslate('error_passwords_do_not_match', { fallback: "Passwords do not match."}) : "Passwords do not match.";
                }
                isStepValid = false;
            } else {
                if (signupPasswordMismatchSpan) signupPasswordMismatchSpan.textContent = "";
                if(signupConfirmPasswordInput && signupPasswordInput?.value === signupConfirmPasswordInput.value && signupConfirmPasswordInput.value !== "") {
                     signupConfirmPasswordInput.classList.remove('invalid');
                }
            }

            if (signupTermsCheckbox && !signupTermsCheckbox.checked) {
                const termsErrorSpan = signupTermsCheckbox.closest('.form__group')?.querySelector('.form__error-message');
                if(termsErrorSpan) {
                    termsErrorSpan.textContent = typeof window.uplasTranslate === 'function' ?
                        window.uplasTranslate('error_terms_required', { fallback: "You must agree to the terms and conditions."}) : "You must agree to the terms and conditions.";
                }
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

    const handleNextSignupStep = () => {
        if (!signupFormSteps || currentSignupStep >= signupFormSteps.length - 1) return;
        if (validateCurrentSignupStep()) {
            showSignupStep(currentSignupStep + 1);
        }
    };

    const handlePrevSignupStep = () => {
        if (currentSignupStep > 0) {
            showSignupStep(currentSignupStep - 1);
            clearFormStatusMessage(signupForm); // Clear status when going back
        }
    };

    signupForm?.querySelectorAll('.form__button--next').forEach(button => {
        button.addEventListener('click', handleNextSignupStep);
    });
    signupForm?.querySelectorAll('.form__button--prev').forEach(button => {
        button.addEventListener('click', handlePrevSignupStep);
    });

    if (signupIndustrySelect && signupOtherIndustryGroup && signupOtherIndustryInput) {
        signupIndustrySelect.addEventListener('change', () => {
            const showOther = signupIndustrySelect.value === 'Other';
            signupOtherIndustryGroup.classList.toggle('form__group--hidden', !showOther);
            signupOtherIndustryInput.required = showOther;
            if (!showOther) {
                signupOtherIndustryInput.value = '';
                validateIndividualInput(signupOtherIndustryInput); // Re-validate (should clear error if any)
            }
        });
    }

    if (signupPasswordInput && signupConfirmPasswordInput && signupPasswordMismatchSpan) {
        const checkPasswordMatch = () => {
            if (signupPasswordInput.value !== "" && signupConfirmPasswordInput.value !== "" && signupPasswordInput.value !== signupConfirmPasswordInput.value) {
                signupPasswordMismatchSpan.textContent = typeof window.uplasTranslate === 'function' ?
                    window.uplasTranslate('error_passwords_do_not_match', { fallback: "Passwords do not match."}) : "Passwords do not match.";
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
    const populateSignupCountryCodes = () => {
        if (!signupCountryCodeSelect) return;
        const countryCodes = [
            { code: '+1', flag: '🇺🇸', name: 'United States' }, { code: '+44', flag: '🇬🇧', name: 'United Kingdom' },
            { code: '+254', flag: '🇰🇪', name: 'Kenya' }, { code: '+234', flag: '🇳🇬', name: 'Nigeria' },
            { code: '+27', flag: '🇿🇦', name: 'South Africa' }, { code: '+91', flag: '🇮🇳', name: 'India' },
            { code: '+61', flag: '🇦🇺', name: 'Australia' }, { code: '+1', flag: '🇨🇦', name: 'Canada (alt)' },
             // Add more as needed
        ];
        signupCountryCodeSelect.innerHTML = `<option value="" disabled data-translate-key="form_select_country_code_placeholder">Code</option>`;
        countryCodes.forEach(country => {
            const option = document.createElement('option');
            option.value = country.code;
            option.textContent = `${country.flag} ${country.code}`;
            signupCountryCodeSelect.appendChild(option);
        });
        signupCountryCodeSelect.value = '+254'; // Default to Kenya
    };
    populateSignupCountryCodes();


    // --- Signup Form Submission ---
    const handleSignupSubmit = async (e) => {
        e.preventDefault();
        if (!signupForm || !validateCurrentSignupStep()) {
            displayStatus(signupForm, 'Please correct the errors above.', 'error', 'error_correct_form_errors');
            return;
        }
        clearFormStatusMessage(signupForm); // Clear previous messages
        displayStatus(signupForm, 'Processing signup...', 'loading', 'signup_status_processing');
        const submitButton = signupForm.querySelector('button[type="submit"]');
        if (submitButton) submitButton.disabled = true;

        // Ensure uplasApi is available
        if (typeof window.uplasApi === 'undefined' || typeof window.uplasApi.registerUser !== 'function') {
            console.error("uhome.js: uplasApi.registerUser is not available!");
            displayStatus(signupForm, 'Registration service unavailable. Please try again later.', 'error', 'error_service_unavailable');
            if (submitButton) submitButton.disabled = false;
            return;
        }

        const formData = new FormData(signupForm);
        const dataToSend = {
            full_name: formData.get('fullName'), // Ensure 'name' attributes match
            email: formData.get('email'),
            organization: formData.get('organization') || null,
            industry: formData.get('industry') === 'Other' ? formData.get('otherIndustry') : formData.get('industry'),
            profession: formData.get('profession'),
            whatsapp_number: `${formData.get('countryCode')}${formData.get('phone')}`,
            password: formData.get('password'),
            password2: formData.get('confirmPassword') // Ensure name="confirmPassword" matches
        };

        try {
            console.log("Submitting Signup Data to Backend via uplasApi:", dataToSend);
            // Actual API call using uplasApi.registerUser
            // The backend endpoint for registration is /api/users/register/
            const responseData = await window.uplasApi.registerUser(dataToSend);

            // Assuming backend returns a success message, or specific data on success
            // For example, if backend sends: { "message": "User registered successfully. Please verify your email/WhatsApp." }
            // Your backend's register endpoint might not return a message_key directly,
            // so we might need to define one here or rely on a generic success message.
            displayStatus(signupForm, responseData.message || 'Signup successful! Please check for verification instructions.', 'success', 'signup_status_success_verify_whatsapp');
            // signupForm.reset(); // Optional: reset form on success
            // resetSignupFormSteps(); // Optional: go back to step 1
        } catch (error) {
            console.error('Signup Error from uplasApi:', error);
            displayStatus(signupForm, error.message || 'An unknown error occurred during registration.', 'error', 'error_network');
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
            displayStatus(loginForm, 'Please correct the errors above.', 'error', 'error_correct_form_errors');
            return;
        }

        displayStatus(loginForm, 'Attempting login...', 'loading', 'login_status_attempting');
        const submitButton = loginForm.querySelector('button[type="submit"]');
        if (submitButton) submitButton.disabled = true;

        // Ensure uplasApi is available
        if (typeof window.uplasApi === 'undefined' || typeof window.uplasApi.loginUser !== 'function') {
            console.error("uhome.js: uplasApi.loginUser is not available!");
            displayStatus(loginForm, 'Login service unavailable. Please try again later.', 'error', 'error_service_unavailable');
            if (submitButton) submitButton.disabled = false;
            return;
        }

        const email = loginEmailInput.value;
        const password = loginPasswordInput.value;

        try {
            console.log("Submitting Login Data to Backend via uplasApi:", { email });
            // Actual API call using uplasApi.loginUser
            // The backend endpoint for login is /api/users/login/
            // uplasApi.loginUser handles storing tokens (access, refresh) and basic user data.
            // It also dispatches 'authChanged' event.
            const loginResult = await window.uplasApi.loginUser(email, password);

            displayStatus(loginForm, loginResult.message || 'Login successful! Redirecting...', 'success', 'login_status_success_redirect');

            // Redirect logic
            const urlParams = new URLSearchParams(window.location.search);
            const returnUrl = urlParams.get('returnUrl'); // Check for a returnUrl query parameter

            setTimeout(() => {
                if (returnUrl) {
                    window.location.href = returnUrl;
                } else {
                    window.location.href = 'ucourses_list.html'; // Default redirect to courses list
                }
            }, 1500); // Delay for user to see success message

        } catch (error) {
            console.error('Login Error from uplasApi:', error);
            // error.message should contain the detail from backend or a generic message from uplasApi
            displayStatus(loginForm, error.message || 'An unknown error occurred during login.', 'error', 'login_status_error_invalid_credentials');
        } finally {
            if (submitButton) submitButton.disabled = false;
        }
    };
    if (loginForm) loginForm.addEventListener('submit', handleLoginSubmit);

    // --- Initial UI Setup ---
    const initialActiveAuthButton = document.querySelector('.auth-toggle-buttons .auth-toggle-button.active');
    if (initialActiveAuthButton) {
        const initialFormId = initialActiveAuthButton.dataset.form;
        const initialFormElement = document.getElementById(initialFormId);
        if (initialFormElement) {
            initialFormElement.classList.add('form--active');
            const firstInput = initialFormElement.querySelector('input:not([type="hidden"]), select, textarea');
            firstInput?.focus();
            if (initialFormId === 'signup-form') {
                resetSignupFormSteps();
            }
        }
    } else if (signupForm) {
        const signupButton = document.querySelector('.auth-toggle-button[data-form="signup-form"]');
        signupButton?.classList.add('active');
        signupForm.classList.add('form--active');
        resetSignupFormSteps();
        const firstInput = signupForm.querySelector('input:not([type="hidden"]), select, textarea');
        firstInput?.focus();
    }
    handleHashChange(); // Apply form switch if #login-form or #signup-form is in URL

    // Add listeners to clear validation on input
    document.querySelectorAll('#signup-form input[required], #signup-form select[required], #login-form input[required], #signup-form textarea[required]').forEach(input => {
        input.addEventListener('input', () => {
            if(input.checkValidity()){
                input.classList.remove('invalid');
                const errorSpan = input.closest('.form__group')?.querySelector('.form__error-message');
                if (errorSpan) errorSpan.textContent = '';
            }
            // Specific logic for password confirmation
            if(input.id === 'signup-confirm-password' || input.id === 'signup-password') {
                if(signupPasswordInput?.value === signupConfirmPasswordInput?.value && signupConfirmPasswordInput?.value !== "") {
                    if(signupPasswordMismatchSpan) signupPasswordMismatchSpan.textContent = '';
                    signupConfirmPasswordInput?.classList.remove('invalid');
                     const confirmErrorSpan = signupConfirmPasswordInput?.closest('.form__group')?.querySelector('.form__error-message');
                     if(confirmErrorSpan && confirmErrorSpan.textContent.includes("Passwords do not match")) { // Be careful with translated strings here
                        confirmErrorSpan.textContent = '';
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

    // Update copyright year (This should ideally be handled by global.js after footer loads)
    // If global.js isn't handling it, or this is a fallback:
    const currentYearFooterSpan = document.getElementById('current-year-footer');
    if (currentYearFooterSpan) {
        const yearTextKey = currentYearFooterSpan.dataset.translateKey;
        let yearTextContent = currentYearFooterSpan.textContent;

        if (yearTextKey && typeof window.uplasTranslate === 'function') {
            yearTextContent = window.uplasTranslate(yearTextKey, { fallback: "{currentYear}" });
        }
        
        if (yearTextContent && yearTextContent.includes("{currentYear}")) {
            currentYearFooterSpan.textContent = yearTextContent.replace("{currentYear}", new Date().getFullYear());
        } else if (yearTextContent && !yearTextContent.match(/\d{4}/)) {
             currentYearFooterSpan.textContent = `© ${new Date().getFullYear()} ${yearTextContent.trim()}`;
        } else if (yearTextContent && yearTextContent.trim() === "{currentYear}") {
            currentYearFooterSpan.textContent = `© ${new Date().getFullYear()}`;
        } else if (!yearTextContent.trim()) {
            currentYearFooterSpan.textContent = `© ${new Date().getFullYear()}`;
        }
    }

    console.log("Uplas uhome.js (Homepage JS) Refined and Initialized.");
});
```

**Explanation of Changes and Key Points:**

1.  **`displayStatus` Utility**:
    * A new `displayStatus` function is introduced at the top of `uhome.js`.
    * It first checks if `window.uplasApi.displayFormStatus` (from `apiUtils.js`) is available. If yes, it uses that for consistency across the application.
    * If `uplasApi.displayFormStatus` is *not* available (e.g., if `apiUtils.js` hasn't loaded or there's an issue), it falls back to the `displayFormStatusMessageLocal` function (which is the original `displayFormStatusMessage` from your `uhome (3).js` renamed). This provides resilience.

2.  **`handleSignupSubmit`**:
    * **API Call**: Replaced the simulated response with:
        ```javascript
        const responseData = await window.uplasApi.registerUser(dataToSend);
        ```
    * **Success Handling**: The success message is now more generic, as `registerUser` in `apiUtils.js` is designed to return the backend's response. Your backend's `/api/users/register/` endpoint (from `apps/users/views.py RegisterView`) returns user data upon successful registration but doesn't automatically log them in or send a specific `message_key`. The frontend message reflects this.
        ```javascript
        displayStatus(signupForm, responseData.message || 'Signup successful! Please check for verification instructions.', 'success', 'signup_status_success_verify_whatsapp');
        ```
        (Note: `responseData.message` might not exist directly; your backend sends user data. You might want to adjust the success message or how `registerUser` in `apiUtils` handles the response if a specific message is desired from the backend.)
    * **Error Handling**: Catches errors from `uplasApi.registerUser`. The `error.message` will contain the detailed error string processed by `apiUtils.js` (which often includes backend error details).
        ```javascript
        displayStatus(signupForm, error.message || 'An unknown error occurred during registration.', 'error', 'error_network');
        ```
    * **Input Names**: Ensured `formData.get()` uses names that should match your HTML form input `name` attributes (e.g., `fullName`, `confirmPassword`).

3.  **`handleLoginSubmit`**:
    * **API Call**: Replaced the simulation with:
        ```javascript
        const loginResult = await window.uplasApi.loginUser(email, password);
        ```
    * **Token and UserData Storage**: **Removed** the lines:
        ```javascript
        // localStorage.setItem('accessToken', result.access);
        // if(result.refresh) localStorage.setItem('refreshToken', result.refresh);
        // if(result.user) localStorage.setItem('userData', JSON.stringify(result.user));
        ```
        This is because `window.uplasApi.loginUser` (as defined in the refined `apiUtils.js`) now handles storing the access token, refresh token, and basic user data in `localStorage` internally.
    * **`authChanged` Event**: The `window.dispatchEvent(new CustomEvent('authChanged', ...))` line can also be removed from `handleLoginSubmit` if you've ensured that `window.uplasApi.loginUser` dispatches this event (as recommended for `apiUtils.js`). This avoids dispatching it twice. If `uplasApi.loginUser` does *not* dispatch it, then you should keep this line in `uhome.js`. For this integration, I'm assuming `uplasApi.loginUser` handles the event dispatch.
    * **Success Handling**: Uses `loginResult.message` (if provided by `uplasApi.loginUser`, though `loginUser` typically returns the full backend response).
        ```javascript
        displayStatus(loginForm, loginResult.message || 'Login successful! Redirecting...', 'success', 'login_status_success_redirect');
        ```
    * **Error Handling**: Catches `error.message` from `uplasApi.loginUser`.
        ```javascript
        displayStatus(loginForm, error.message || 'An unknown error occurred during login.', 'error', 'login_status_error_invalid_credentials');
        ```
    * **Redirect Logic**: The redirect logic using `returnUrl` or defaulting to `ucourses_list.html` is preserved.

4.  **Availability Checks**: Added checks for `window.uplasApi` before attempting to call its functions in both handlers to prevent errors if `apiUtils.js` fails to load or initialize `uplasApi` correctly.

**Important Reminders:**

* **Script Loading Order**: Ensure `apiUtils.js` (which defines `window.uplasApi`) is loaded *before* `uhome.js` in your HTML.
    ```html
    <script src="js/apiUtils.js"></script>
    <script src="js/global.js"></script> <script src="js/uhome.js"></script>
    ```
* **Backend Endpoints**: The code assumes your Django backend has:
    * A user registration endpoint at `/api/users/register/` (handled by `apps.users.views.RegisterView`).
    * A login endpoint at `/api/users/login/` (handled by `apps.users.views.MyTokenObtainPairView`).
* **Error Messages from Backend**: The quality of error messages displayed to the user will depend on how your Django backend formats error responses (e.g., using a `detail` key or field-specific errors) and how `window.uplasApi.registerUser` and `window.uplasApi.loginUser` process these into the `error.message` they throw.

This version of `uhome.js` should now correctly use your centralized API utility for handling user authenticati
