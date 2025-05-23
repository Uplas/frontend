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
    if (!authSection) {
        // console.log("uhome.js: Auth section not found on this page. Exiting.");
        return; // Exit if auth section is not on the page
    }

    const signupForm = document.getElementById('signup-form'); //
    const loginForm = document.getElementById('login-form'); //
    const authToggleButtons = document.querySelectorAll('.auth-toggle-button'); //

    // Signup Form Specific Elements
    const signupFormSteps = signupForm?.querySelectorAll('.form-step'); //
    const signupCountryCodeSelect = document.getElementById('signup-country-code'); //
    const signupIndustrySelect = document.getElementById('signup-industry'); //
    const signupOtherIndustryGroup = document.getElementById('signup-other-industry-group'); //
    const signupOtherIndustryInput = document.getElementById('signup-other-industry'); //
    const signupPasswordInput = signupForm?.querySelector('#signup-password'); //
    const signupConfirmPasswordInput = signupForm?.querySelector('#signup-confirm-password'); //
    const signupPasswordMismatchSpan = signupForm?.querySelector('#signup-password-mismatch'); //
    const signupStatusDiv = document.getElementById('signup-status'); //
    const signupTermsCheckbox = document.getElementById('signup-terms'); //

    // Login Form Specific Elements
    const loginEmailInput = loginForm?.querySelector('#login-email'); //
    const loginPasswordInput = loginForm?.querySelector('#login-password'); //
    const loginStatusDiv = document.getElementById('login-status'); //

    // User Avatar in Header (from index (3).html and global.js interaction)
    const userAvatarHeader = document.getElementById('user-avatar-header'); //
    const loginSignupHeaderLinkContainer = document.getElementById('auth-header-link-container'); // Assumed ID from header component for Login/Signup link

    // --- State Variables ---
    let currentSignupStep = 0; //

    // --- Utility Functions ---
    const displayFormStatusMessage = (formElement, message, type, translateKey = null) => { //
        let statusDiv;
        if (formElement === signupForm) statusDiv = signupStatusDiv; //
        else if (formElement === loginForm) statusDiv = loginStatusDiv; //
        else statusDiv = formElement.querySelector('.form__status');

        if (!statusDiv) {
            console.warn("uhome.js: Form status display element not found for form:", formElement);
            return;
        }

        let text = message;
        // Assumes window.uplasTranslate is made available by i18n.js via global.js
        if (translateKey && typeof window.uplasTranslate === 'function') { //
            text = window.uplasTranslate(translateKey, { fallback: message }); // Pass fallback text
        }

        statusDiv.textContent = text;
        statusDiv.className = 'form__status'; // Reset classes
        if (type) statusDiv.classList.add(`form__status--${type}`); //
        statusDiv.style.display = 'block'; //
        statusDiv.setAttribute('aria-live', type === 'error' ? 'assertive' : 'polite'); //
    };

    const clearFormStatusMessage = (formElement) => { //
        let statusDiv;
        if (formElement === signupForm) statusDiv = signupStatusDiv; //
        else if (formElement === loginForm) statusDiv = loginStatusDiv; //
        else statusDiv = formElement.querySelector('.form__status');

        if (statusDiv) {
            statusDiv.textContent = ''; //
            statusDiv.style.display = 'none'; //
            statusDiv.className = 'form__status'; //
        }
    };

    const validateIndividualInput = (inputElement) => { //
        const group = inputElement.closest('.form__group'); //
        if (!group) return inputElement.checkValidity();

        const errorSpan = group.querySelector('.form__error-message'); //
        inputElement.classList.remove('invalid'); //
        if (errorSpan) errorSpan.textContent = ''; //

        if (!inputElement.checkValidity()) { //
            inputElement.classList.add('invalid'); //
            if (errorSpan) {
                let errorKey = null;
                let defaultMessage = inputElement.validationMessage || "Invalid input."; //

                if (inputElement.validity.valueMissing) { //
                    errorKey = inputElement.dataset.errorKeyRequired || 'error_field_required'; //
                    defaultMessage = "This field is required."; //
                } else if (inputElement.validity.patternMismatch) { //
                    errorKey = inputElement.dataset.errorKeyPattern || 'error_pattern_mismatch'; //
                    defaultMessage = inputElement.title || "Please match the requested format."; //
                } else if (inputElement.validity.typeMismatch) { //
                    errorKey = inputElement.dataset.errorKeyType || 'error_type_mismatch'; //
                    defaultMessage = `Please enter a valid ${inputElement.type}.`; //
                }
                errorSpan.textContent = (typeof window.uplasTranslate === 'function' && errorKey) ?
                                        window.uplasTranslate(errorKey, { fallback: defaultMessage }) : defaultMessage; //
            }
            return false;
        }
        return true;
    };


    // --- Form Switching Logic (Tabs & URL Hash) ---
    authToggleButtons.forEach(button => { //
        button.addEventListener('click', () => { //
            const targetFormId = button.dataset.form; //
            const targetForm = document.getElementById(targetFormId); //

            authToggleButtons.forEach(btn => btn.classList.remove('active')); //
            button.classList.add('active'); //

            if (signupForm) signupForm.classList.remove('form--active'); //
            if (loginForm) loginForm.classList.remove('form--active'); //

            if (targetForm) {
                targetForm.classList.add('form--active'); //
                if (targetFormId === 'signup-form') { //
                    resetSignupFormSteps(); //
                    clearFormStatusMessage(signupForm); //
                } else {
                    clearFormStatusMessage(loginForm); //
                }
                const firstInput = targetForm.querySelector('input:not([type="hidden"]):not([disabled]), select:not([disabled]), textarea:not([disabled])'); //
                firstInput?.focus(); //
            }
        });
    });

    const handleHashChange = () => { //
        const hash = window.location.hash; //
        if (hash === '#auth-section') { // If navigating directly to auth section, ensure it's visible
             if (authSection) {
                if (typeof window.uplasScrollToElement === 'function') {
                    window.uplasScrollToElement('#auth-section'); //
                } else {
                    authSection.scrollIntoView({ behavior: 'smooth' }); //
                }
            }
            // Determine which form to show based on a potential sub-hash or default to signup
            const subHashMatch = hash.match(/#auth-section&form=(login-form|signup-form)/);
            const formToShow = subHashMatch ? subHashMatch[1] : (document.querySelector('.auth-toggle-button.active')?.dataset.form || 'signup-form');
            const targetButton = document.querySelector(`.auth-toggle-button[data-form="${formToShow}"]`);
            targetButton?.click();

        } else if (hash === '#signup-form' || hash === '#login-form') { //
            const targetButton = document.querySelector(`.auth-toggle-button[data-form="${hash.substring(1)}"]`); //
            targetButton?.click(); //
        }
    };
    window.addEventListener('hashchange', handleHashChange); //
    

    // --- Multi-Step Signup Form Logic ---
    const resetSignupFormSteps = () => { //
        currentSignupStep = 0; //
        if (signupFormSteps && signupFormSteps.length > 0) {
            showSignupStep(currentSignupStep); //
            signupForm?.reset(); //
            signupForm?.querySelectorAll('.invalid').forEach(el => el.classList.remove('invalid')); //
            signupForm?.querySelectorAll('.form__error-message').forEach(el => el.textContent = ''); //
            if (signupOtherIndustryGroup) signupOtherIndustryGroup.classList.add('form__group--hidden'); //
            if (signupIndustrySelect) signupIndustrySelect.value = ""; //
            if (signupCountryCodeSelect) signupCountryCodeSelect.value = "+254"; //
        }
    };
    
    const showSignupStep = (stepIndex) => { //
        if (!signupFormSteps || !signupFormSteps[stepIndex]) return;
        signupFormSteps.forEach((stepElement, index) => { //
            stepElement.classList.toggle('form-step--active', index === stepIndex); //
        });
        const activeStepElement = signupFormSteps[stepIndex]; //
        const firstInput = activeStepElement?.querySelector('input:not([type="hidden"]):not([disabled]), select:not([disabled]), textarea:not([disabled])'); //
        firstInput?.focus(); //
        currentSignupStep = stepIndex; //
    };

    const validateCurrentSignupStep = () => { //
        const currentStepElement = signupFormSteps?.[currentSignupStep]; //
        if (!currentStepElement) return true;
        let isStepValid = true;
        
        const inputsToValidate = currentStepElement.querySelectorAll('input[required]:not([type="hidden"]), select[required]:not([type="hidden"]), textarea[required]:not([type="hidden"])'); //

        inputsToValidate.forEach(input => { //
            if (input.id === 'signup-other-industry' && signupOtherIndustryGroup?.classList.contains('form__group--hidden')) { //
                input.classList.remove('invalid'); //
                const errorSpan = input.closest('.form__group')?.querySelector('.form__error-message'); //
                if (errorSpan) errorSpan.textContent = ''; //
                return;
            }
            if (!validateIndividualInput(input)) isStepValid = false; //
        });

        if (currentStepElement.dataset.step === '5') { // Final step
            if (signupPasswordInput && signupConfirmPasswordInput && signupPasswordInput.value !== signupConfirmPasswordInput.value) { //
                signupConfirmPasswordInput.classList.add('invalid'); //
                if (signupPasswordMismatchSpan) { //
                     signupPasswordMismatchSpan.textContent = typeof window.uplasTranslate === 'function' ?
                        window.uplasTranslate('error_passwords_do_not_match', { fallback: "Passwords do not match."}) : "Passwords do not match."; //
                }
                isStepValid = false;
            } else {
                if (signupPasswordMismatchSpan) signupPasswordMismatchSpan.textContent = ""; //
                if(signupConfirmPasswordInput && signupPasswordInput?.value === signupConfirmPasswordInput.value && signupConfirmPasswordInput.value !== "") { //
                     signupConfirmPasswordInput.classList.remove('invalid'); //
                }
            }

            if (signupTermsCheckbox && !signupTermsCheckbox.checked) { //
                const termsErrorSpan = signupTermsCheckbox.closest('.form__group')?.querySelector('.form__error-message'); //
                if(termsErrorSpan) { //
                    termsErrorSpan.textContent = typeof window.uplasTranslate === 'function' ?
                        window.uplasTranslate('error_terms_required', { fallback: "You must agree to the terms and conditions."}) : "You must agree to the terms and conditions."; //
                }
                signupTermsCheckbox.classList.add('invalid'); //
                isStepValid = false;
            } else if (signupTermsCheckbox) { //
                const termsErrorSpan = signupTermsCheckbox.closest('.form__group')?.querySelector('.form__error-message'); //
                if(termsErrorSpan) termsErrorSpan.textContent = ""; //
                signupTermsCheckbox.classList.remove('invalid'); //
            }
        }
        return isStepValid;
    };

    const handleNextSignupStep = () => { //
        if (!signupFormSteps || currentSignupStep >= signupFormSteps.length - 1) return; //
        if (validateCurrentSignupStep()) { //
            showSignupStep(currentSignupStep + 1); //
        }
    };

    const handlePrevSignupStep = () => { //
        if (currentSignupStep > 0) { //
            showSignupStep(currentSignupStep - 1); //
            clearFormStatusMessage(signupForm); //
        }
    };

    signupForm?.querySelectorAll('.form__button--next').forEach(button => { //
        button.addEventListener('click', handleNextSignupStep); //
    });
    signupForm?.querySelectorAll('.form__button--prev').forEach(button => { //
        button.addEventListener('click', handlePrevSignupStep); //
    });

    if (signupIndustrySelect && signupOtherIndustryGroup && signupOtherIndustryInput) { //
        signupIndustrySelect.addEventListener('change', () => { //
            const showOther = signupIndustrySelect.value === 'Other'; //
            signupOtherIndustryGroup.classList.toggle('form__group--hidden', !showOther); //
            signupOtherIndustryInput.required = showOther; //
            if (!showOther) { //
                signupOtherIndustryInput.value = ''; //
                validateIndividualInput(signupOtherIndustryInput); //
            }
        });
    }

    if (signupPasswordInput && signupConfirmPasswordInput && signupPasswordMismatchSpan) { //
        const checkPasswordMatch = () => { //
            if (signupPasswordInput.value !== "" && signupConfirmPasswordInput.value !== "" && signupPasswordInput.value !== signupConfirmPasswordInput.value) { //
                signupPasswordMismatchSpan.textContent = typeof window.uplasTranslate === 'function' ?
                    window.uplasTranslate('error_passwords_do_not_match', { fallback: "Passwords do not match."}) : "Passwords do not match."; //
                signupConfirmPasswordInput.classList.add('invalid'); //
            } else {
                signupPasswordMismatchSpan.textContent = ''; //
                if (signupPasswordInput.value === signupConfirmPasswordInput.value) { //
                    signupConfirmPasswordInput.classList.remove('invalid'); //
                }
            }
        };
        signupConfirmPasswordInput.addEventListener('input', checkPasswordMatch); //
        signupPasswordInput.addEventListener('input', checkPasswordMatch); //
    }


    // --- Populate Country Codes ---
    const populateSignupCountryCodes = () => { //
        if (!signupCountryCodeSelect) return; //
        const countryCodes = [ //
            { code: '+1', flag: '🇺🇸', name: 'United States' }, { code: '+44', flag: '🇬🇧', name: 'United Kingdom' },
            { code: '+254', flag: '🇰🇪', name: 'Kenya' }, { code: '+234', flag: '🇳🇬', name: 'Nigeria' },
            { code: '+27', flag: '🇿🇦', name: 'South Africa' }, { code: '+91', flag: '🇮🇳', name: 'India' },
            { code: '+61', flag: '🇦🇺', name: 'Australia' }, { code: '+1', flag: '🇨🇦', name: 'Canada (alt)' },
        ];
        // Ensure placeholder has translate key if it's translated by i18n.js
        signupCountryCodeSelect.innerHTML = `<option value="" disabled data-translate-key="form_select_country_code_placeholder">Code</option>`; //
        countryCodes.forEach(country => { //
            const option = document.createElement('option'); //
            option.value = country.code; //
            option.textContent = `${country.flag} ${country.code}`; //
            signupCountryCodeSelect.appendChild(option); //
        });
        signupCountryCodeSelect.value = '+254'; // Default to Kenya
        // Translation of dynamically added options might need an explicit call to apply translations to this specific select
        // if window.uplasApplyTranslations doesn't automatically pick up new option texts without keys.
        // If options have keys, i18nManager should handle it on a full page re-translation.
    };
    populateSignupCountryCodes(); //


    // --- Signup Form Submission ---
    const handleSignupSubmit = async (e) => { //
        e.preventDefault(); //
        if (!signupForm || !validateCurrentSignupStep()) { //
            displayFormStatusMessage(signupForm, 'Please correct the errors above.', 'error', 'error_correct_form_errors'); //
            return;
        }
        clearFormStatusMessage(signupForm); //
        displayFormStatusMessage(signupForm, 'Processing signup...', 'loading', 'signup_status_processing'); //
        const submitButton = signupForm.querySelector('button[type="submit"]'); //
        if (submitButton) submitButton.disabled = true; //

        const formData = new FormData(signupForm); //
        const dataToSend = { //
            full_name: formData.get('fullName'), //
            email: formData.get('email'), //
            organization: formData.get('organization') || null, //
            industry: formData.get('industry') === 'Other' ? formData.get('otherIndustry') : formData.get('industry'), //
            profession: formData.get('profession'), //
            whatsapp_number: `${formData.get('countryCode')}${formData.get('phone')}`, //
            password: formData.get('password'), //
        };

        try {
            console.log("Submitting Signup Data to Backend:", dataToSend); //
            // Backend Integration: Replace with actual API call using fetchAuthenticated
            // const response = await fetchAuthenticated('/users/register/', { //
            //     method: 'POST', //
            //     body: JSON.stringify(dataToSend), //
            //     // headers: { 'X-CSRFToken': window.uplasGetCookie('csrftoken') } // If using Django CSRF with cookies
            // });
            // const result = response; 

            // Simulate API response
            await new Promise(resolve => setTimeout(resolve, 2000)); //
            const isSuccess = Math.random() > 0.1; //
            let result;
            if (isSuccess) { //
                result = { success: true, message: 'Signup successful! A verification code has been sent to your WhatsApp.', message_key: 'signup_status_success_verify_whatsapp' }; //
            } else {
                const errorType = Math.random(); //
                if (errorType < 0.5) result = { success: false, message: 'This email address is already registered.', message_key: 'signup_status_error_email_exists' }; //
                else result = { success: false, message: 'An unexpected error occurred. Please try again.', message_key: 'signup_status_error_generic' }; //
            }

            if (result.success) { //
                displayFormStatusMessage(signupForm, result.message, 'success', result.message_key); //
                // signupForm.reset(); // Optional: reset form fields on success
                // resetSignupFormSteps(); // Optional: go back to step 1
            } else {
                displayFormStatusMessage(signupForm, result.message, 'error', result.message_key); //
            }
        } catch (error) {
            console.error('Signup Error:', error); //
            displayFormStatusMessage(signupForm, error.message || 'A network error occurred. Please try again.', 'error', 'error_network'); //
        } finally {
            if (submitButton) submitButton.disabled = false; //
        }
    };
    if (signupForm) signupForm.addEventListener('submit', handleSignupSubmit); //


    // --- Login Form Submission ---
    const handleLoginSubmit = async (e) => { //
        e.preventDefault(); //
        if (!loginForm) return; //
        clearFormStatusMessage(loginForm); //

        let isFormValid = true;
        if (loginEmailInput && !validateIndividualInput(loginEmailInput)) isFormValid = false; //
        if (loginPasswordInput && !validateIndividualInput(loginPasswordInput)) isFormValid = false; //

        if (!isFormValid) { //
            displayFormStatusMessage(loginForm, 'Please correct the errors above.', 'error', 'error_correct_form_errors'); //
            return;
        }

        displayFormStatusMessage(loginForm, 'Attempting login...', 'loading', 'login_status_attempting'); //
        const submitButton = loginForm.querySelector('button[type="submit"]'); //
        if (submitButton) submitButton.disabled = true; //

        const loginData = { //
            email: loginEmailInput.value, //
            password: loginPasswordInput.value //
        };

        try {
            console.log("Submitting Login Data to Backend:", loginData); //
            // Backend Integration: Replace with actual API call using fetchAuthenticated
            // const response = await fetchAuthenticated('/users/login/', { //
            //     method: 'POST', //
            //     body: JSON.stringify(loginData), //
            // });
            // const result = response; 

            // Simulate API response
            await new Promise(resolve => setTimeout(resolve, 1500)); //
            const isSuccess = Math.random() > 0.2; //
            let result;
            if(isSuccess) { //
                result = {  //
                    success: true, 
                    message: 'Login successful! Redirecting...', 
                    message_key: 'login_status_success_redirect', 
                    access: 'simulated_access_token_xyz123', //
                    refresh: 'simulated_refresh_token_abc789', //
                    user: { fullName: "Demo User", initials: "DU" } 
                };
            } else {
                result = { success: false, message: 'Invalid email or password. Please try again.', detail_key: 'login_status_error_invalid_credentials' }; //
            }

            if (result.success && result.access) { //
                localStorage.setItem('accessToken', result.access); //
                if(result.refresh) localStorage.setItem('refreshToken', result.refresh); //
                if(result.user) localStorage.setItem('userData', JSON.stringify(result.user)); //

                displayFormStatusMessage(loginForm, result.message, 'success', result.message_key); //
                
                // Dispatch a custom event to notify other parts of the app (like global.js for header update)
                window.dispatchEvent(new CustomEvent('authChanged', { detail: { loggedIn: true, user: result.user } }));

                // Redirect logic from your original file:
                const urlParams = new URLSearchParams(window.location.search);
                const returnUrl = urlParams.get('returnUrl');
                
                setTimeout(() => {  //
                    if (returnUrl) {
                        window.location.href = returnUrl;
                    } else {
                        window.location.href = 'ucourses_list.html'; // Default redirect
                    }
                }, 1500);
            } else {
                displayFormStatusMessage(loginForm, result.message || 'Login failed.', 'error', result.detail_key || 'login_status_error_generic'); //
            }
        } catch (error) {
            console.error('Login Error:', error); //
            displayFormStatusMessage(loginForm, error.message || 'A network error occurred. Please try again.', 'error', 'error_network'); //
        } finally {
            if (submitButton) submitButton.disabled = false; //
        }
    };
    if (loginForm) loginForm.addEventListener('submit', handleLoginSubmit); //

    // --- Initial UI Setup ---
    // Initial form visibility (default to signup active)
    const initialActiveAuthButton = document.querySelector('.auth-toggle-buttons .auth-toggle-button.active'); //
    if (initialActiveAuthButton) { //
        const initialFormId = initialActiveAuthButton.dataset.form; //
        const initialFormElement = document.getElementById(initialFormId); //
        if (initialFormElement) { //
            initialFormElement.classList.add('form--active'); //
            const firstInput = initialFormElement.querySelector('input:not([type="hidden"]), select, textarea'); //
            firstInput?.focus(); //
            if (initialFormId === 'signup-form') { //
                resetSignupFormSteps(); // Ensure signup form starts at step 1
            }
        }
    } else if (signupForm) { // Default to signup if no .active button is set in HTML
        const signupButton = document.querySelector('.auth-toggle-button[data-form="signup-form"]'); //
        signupButton?.classList.add('active'); //
        signupForm.classList.add('form--active'); //
        resetSignupFormSteps(); //
        const firstInput = signupForm.querySelector('input:not([type="hidden"]), select, textarea'); //
        firstInput?.focus(); //
    }
    handleHashChange(); // Apply form switch if #login-form or #signup-form is in URL


    // Add listeners to clear validation on input for all relevant inputs
    document.querySelectorAll('#signup-form input[required], #signup-form select[required], #login-form input[required], #signup-form textarea[required]').forEach(input => { //
        input.addEventListener('input', () => { //
            if(input.checkValidity()){ //
                input.classList.remove('invalid'); //
                const errorSpan = input.closest('.form__group')?.querySelector('.form__error-message'); //
                if (errorSpan) errorSpan.textContent = ''; //
            }
            if(input.id === 'signup-confirm-password' || input.id === 'signup-password') { //
                if(signupPasswordInput?.value === signupConfirmPasswordInput?.value) { //
                    if(signupPasswordMismatchSpan) signupPasswordMismatchSpan.textContent = ''; //
                    if(signupConfirmPasswordInput?.value === signupPasswordInput?.value && signupConfirmPasswordInput.value !== "") { //
                        signupConfirmPasswordInput.classList.remove('invalid'); //
                        const confirmErrorSpan = signupConfirmPasswordInput.closest('.form__group')?.querySelector('.form__error-message'); //
                        if(confirmErrorSpan && confirmErrorSpan.textContent === (window.uplasTranslate ? window.uplasTranslate('error_passwords_do_not_match', { fallback: "Passwords do not match."}) : "Passwords do not match.")) { //
                           confirmErrorSpan.textContent = ''; //
                        }
                    }
                }
            }
            if (input.id === 'signup-terms' && input.checked) { //
                 input.classList.remove('invalid'); //
                 const termsErrorSpan = input.closest('.form__group')?.querySelector('.form__error-message'); //
                if(termsErrorSpan) termsErrorSpan.textContent = ""; //
            }
        });
    });
    
    // Update copyright year (global.js should ideally handle this centrally after footer is loaded)
    const currentYearFooterSpan = document.getElementById('current-year-footer'); //
    if (currentYearFooterSpan) { //
        const yearTextKey = currentYearFooterSpan.dataset.translateKey; //
        let yearTextContent = currentYearFooterSpan.textContent; //

        if (yearTextKey && typeof window.uplasTranslate === 'function') { //
            yearTextContent = window.uplasTranslate(yearTextKey, { fallback: "{currentYear}" }); //
        }
        
        if (yearTextContent && yearTextContent.includes("{currentYear}")) { //
            currentYearFooterSpan.textContent = yearTextContent.replace("{currentYear}", new Date().getFullYear()); //
        } else if (yearTextContent && !yearTextContent.match(/\d{4}/)) { //
             currentYearFooterSpan.textContent = `© ${new Date().getFullYear()} ${yearTextContent}`; //
        } else if (yearTextContent && yearTextContent.trim() === "{currentYear}") { // Handles if only placeholder was there.
            currentYearFooterSpan.textContent = `© ${new Date().getFullYear()}`;
        } else if (!yearTextContent.trim()) { // If element is completely empty
            currentYearFooterSpan.textContent = `© ${new Date().getFullYear()}`; //
        }
    }


    console.log("Uplas uhome.js (Homepage JS) Refined and Initialized."); //
});
