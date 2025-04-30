// uhome.js - Refactored and Enhanced

// Strict mode helps catch common coding errors
'use strict';

/**
 * DOMContentLoaded ensures the script runs after the HTML is fully loaded.
 */
document.addEventListener('DOMContentLoaded', () => {

    // --- Element Selectors ---
    const body = document.body;
    const themeToggle = document.getElementById('theme-toggle');
    const signupLink = document.getElementById('signup-link');
    const loginLink = document.getElementById('login-link');
    const signupForm = document.getElementById('signup-form');
    const loginForm = document.getElementById('login-form');
    const formSteps = signupForm?.querySelectorAll('.form-step');
    const countryCodeSelect = document.getElementById('country-code');
    const industrySelect = document.getElementById('industry');
    const otherIndustryGroup = document.getElementById('other-industry-group');
    const otherIndustryInput = document.getElementById('other-industry');
    const passwordInputSignup = document.getElementById('password');
    const confirmPasswordInputSignup = document.getElementById('confirm-password');
    const passwordMismatchSpan = document.getElementById('password-mismatch');
    const signupStatusDiv = document.getElementById('signup-status');
    const loginStatusDiv = document.getElementById('login-status');
    const navToggle = document.querySelector('.nav__toggle');
    const navMenu = document.querySelector('.nav');


    // --- State Variables ---
    let currentStep = 0; // For multi-step form

    // --- Utility Functions ---

    /**
     * Sets attributes for the theme toggle button.
     * @param {boolean} isDarkMode - Indicates if dark mode is active.
     */
    const updateThemeButton = (isDarkMode) => {
        if (!themeToggle) return;
        const themeText = themeToggle.querySelector('.theme-text');
        themeToggle.setAttribute('aria-label', isDarkMode ? 'Switch to Light Mode' : 'Switch to Dark Mode');
        if (themeText) {
             themeText.textContent = isDarkMode ? 'Light Mode' : 'Dark Mode';
        }
        // Toggle icons visibility directly if needed, or rely on CSS :not/.dark-mode selectors
    };

    /**
     * Applies the theme based on saved preference or system setting.
     */
    const applyTheme = () => {
        const savedDarkMode = localStorage.getItem('darkMode');
        // Prefers-color-scheme can be added for initial load if no preference saved
        const systemPrefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
        const isDarkMode = savedDarkMode === 'true' || (savedDarkMode === null && systemPrefersDark);

        body.classList.toggle('dark-mode', isDarkMode);
        updateThemeButton(isDarkMode);
    };

    /**
     * Toggles between signup and login forms with smooth transition.
     * @param {HTMLElement} formToShow - The form element to display.
     * @param {HTMLElement} formToHide - The form element to hide.
     */
    const switchForm = (formToShow, formToHide) => {
        if (!formToShow || !formToHide) return;

        // Reset steps if switching to signup form
        if (formToShow.id === 'signup-form') {
            resetFormSteps();
            clearFormStatus(signupStatusDiv); // Clear status on switch
        } else {
             clearFormStatus(loginStatusDiv); // Clear status on switch
        }


        // Use classes for transitions
        formToHide.classList.remove('form--visible');
        formToHide.classList.add('form--hidden');

        formToShow.classList.remove('form--hidden');
        formToShow.classList.add('form--visible');

        // Optional: Scroll to the form
        const authSection = document.getElementById('auth-section');
        if(authSection) {
            authSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }

        // Focus first input field in the shown form for accessibility
         const firstInput = formToShow.querySelector('input, select');
         if (firstInput) {
             setTimeout(() => firstInput.focus(), 300); // Delay focus until transition likely complete
         }

    };

    /**
     * Displays a specific step in the multi-step signup form.
     * @param {number} stepIndex - The index of the step to show.
     */
    const showStep = (stepIndex) => {
        if (!formSteps || formSteps.length === 0) return;
        formSteps.forEach((stepElement, index) => {
            const isActive = index === stepIndex;
            stepElement.classList.toggle('form-step--active', isActive);
             // Ensure display style is correct - handled by active class now
            // stepElement.style.display = isActive ? 'block' : 'none';
        });
         // Focus first input of the new step
         const activeStep = formSteps[stepIndex];
         const firstInput = activeStep?.querySelector('input, select');
         firstInput?.focus();
    };

     /**
     * Resets the signup form to the first step.
     */
    const resetFormSteps = () => {
        currentStep = 0;
        showStep(currentStep);
         // Clear validation states on all steps? Maybe too aggressive. Clear on switchForm instead.
    };

    /**
     * Validates inputs within the current form step.
     * @param {HTMLElement} currentStepElement - The current step element.
     * @returns {boolean} - True if all required inputs are valid, false otherwise.
     */
    const validateStep = (currentStepElement) => {
        let isValid = true;
        const inputs = currentStepElement.querySelectorAll('input[required], select[required]');

        inputs.forEach(input => {
            const errorSpan = input.closest('.form__group')?.querySelector('.form__error-message');
             // Skip hidden 'other industry' input if not required
            if(input.id === 'other-industry' && otherIndustryGroup?.classList.contains('form__group--hidden')) {
                 input.classList.remove('invalid');
                 if (errorSpan) errorSpan.textContent = '';
                 return; // Skip validation
            }

            if (!input.checkValidity()) {
                isValid = false;
                input.classList.add('invalid');
                if (errorSpan) {
                     errorSpan.textContent = input.validationMessage;
                }
                 // Optional: reportValidity shows the browser's default bubble
                // input.reportValidity();
            } else {
                input.classList.remove('invalid');
                if (errorSpan) {
                    errorSpan.textContent = '';
                }
            }
        });

        // Specific check for password confirmation in the last step
        if (currentStepElement.dataset.step === '5') {
             if (passwordInputSignup?.value !== confirmPasswordInputSignup?.value) {
                 isValid = false;
                 confirmPasswordInputSignup?.classList.add('invalid');
                 if(passwordMismatchSpan) passwordMismatchSpan.textContent = "Passwords do not match.";
             } else {
                  // If step is generally valid, ensure mismatch error is cleared
                  if (isValid) {
                      confirmPasswordInputSignup?.classList.remove('invalid');
                      if(passwordMismatchSpan) passwordMismatchSpan.textContent = "";
                  }
             }
        }

        return isValid;
    };


     /**
     * Moves to the next step in the signup form if the current step is valid.
     */
    const nextStep = () => {
        if (!formSteps || currentStep >= formSteps.length - 1) return;

        const currentFormStepElement = formSteps[currentStep];
        if (validateStep(currentFormStepElement)) {
            currentStep++;
            showStep(currentStep);
        }
        // else: validation messages are shown by validateStep
    };

    /**
     * Moves to the previous step in the signup form.
     */
    const prevStep = () => {
        if (currentStep > 0) {
            currentStep--;
            showStep(currentStep);
             clearFormStatus(signupStatusDiv); // Clear status when moving back
        }
    };

     /**
     * Populates the country code dropdown select element.
     */
    const populateCountryCodes = () => {
        if (!countryCodeSelect) return;

        // Basic list - Consider fetching this from an API or a separate JSON file for maintainability
        const countryCodes = [
            { code: '+93', flag: '🇦🇫', name: 'Afghanistan' },
                { code: '+358', flag: '🇦🇽', name: 'Åland Islands' },
                { code: '+355', flag: '🇦🇱', name: 'Albania' },
                { code: '+213', flag: '🇩🇿', name: 'Algeria' },
                { code: '+1684', flag: '🇦🇸', name: 'American Samoa' },
                { code: '+376', flag: '🇦🇩', name: 'Andorra' },
                { code: '+244', flag: '🇦🇴', name: 'Angola' },
                { code: '+1264', flag: '🇦🇮', name: 'Anguilla' },
                { code: '+672', flag: '🇦🇶', name: 'Antarctica' },
                { code: '+1268', flag: '🇦🇬', name: 'Antigua and Barbuda' },
                { code: '+54', flag: '🇦🇷', name: 'Argentina' },
                { code: '+374', flag: '🇦🇲', name: 'Armenia' },
                { code: '+297', flag: '🇦🇼', name: 'Aruba' },
                { code: '+61', flag: '🇦🇺', name: 'Australia' },
                { code: '+43', flag: '🇦🇹', name: 'Austria' },
                { code: '+994', flag: '🇦🇿', name: 'Azerbaijan' },
                { code: '+1242', flag: '🇧🇸', name: 'Bahamas' },
                { code: '+973', flag: '🇧🇭', name: 'Bahrain' },
                { code: '+880', flag: '🇧🇩', name: 'Bangladesh' },
                { code: '+1246', flag: '🇧🇧', name: 'Barbados' },
                { code: '+375', flag: '🇧🇾', name: 'Belarus' },
                { code: '+32', flag: '🇧🇪', name: 'Belgium' },
                { code: '+501', flag: '🇧🇿', name: 'Belize' },
                { code: '+229', flag: '🇧🇯', name: 'Benin' },
                { code: '+1441', flag: '🇧🇲', name: 'Bermuda' },
                { code: '+975', flag: '🇧🇹', name: 'Bhutan' },
                { code: '+591', flag: '🇧🇴', name: 'Bolivia' },
                { code: '+599', flag: '🇧🇶', name: 'Caribbean Netherlands' },
                { code: '+387', flag: '🇧🇦', name: 'Bosnia and Herzegovina' },
                { code: '+267', flag: '🇧🇼', name: 'Botswana' },
                { code: '+55', flag: '🇧🇷', name: 'Brazil' },
                { code: '+246', flag: '🇮🇴', name: 'British Indian Ocean Territory' },
                { code: '+1284', flag: '🇻🇬', name: 'British Virgin Islands' },
                { code: '+673', flag: '🇧🇳', name: 'Brunei' },
                { code: '+359', flag: '🇧🇬', name: 'Bulgaria' },
                { code: '+226', flag: '🇧🇫', name: 'Burkina Faso' },
                { code: '+257', flag: '🇧🇮', name: 'Burundi' },
                { code: '+855', flag: '🇰🇭', name: 'Cambodia' },
                { code: '+237', flag: '🇨🇲', name: 'Cameroon' },
                { code: '+1', flag: '🇨🇦', name: 'Canada' },
                { code: '+238', flag: '🇨🇻', name: 'Cape Verde' },
                { code: '+1345', flag: '🇰🇾', name: 'Cayman Islands' },
                { code: '+236', flag: '🇨🇫', name: 'Central African Republic' },
                { code: '+235', flag: '🇹🇩', name: 'Chad' },
                { code: '+56', flag: '🇨🇱', name: 'Chile' },
                { code: '+86', flag: '🇨🇳', name: 'China' },
                { code: '+61', flag: '🇨🇨', name: 'Cocos (Keeling) Islands' },
                { code: '+57', flag: '🇨🇴', name: 'Colombia' },
                { code: '+269', flag: '🇰🇲', name: 'Comoros' },
                { code: '+242', flag: '🇨🇬', name: 'Congo' },
                { code: '+243', flag: '🇨🇩', name: 'Congo, Democratic Republic of the' },
                { code: '+682', flag: '🇨🇰', name: 'Cook Islands' },
                { code: '+506', flag: '🇨🇷', name: 'Costa Rica' },
                { code: '+385', flag: '🇭🇷', name: 'Croatia' },
                { code: '+53', flag: '🇨🇺', name: 'Cuba' },
                { code: '+599', flag: '🇨🇼', name: 'Curaçao' },
                { code: '+357', flag: '🇨🇾', name: 'Cyprus' },
                { code: '+420', flag: '🇨🇿', name: 'Czechia' },
                { code: '+45', flag: '🇩🇰', name: 'Denmark' },
                { code: '+253', flag: '🇩🇯', name: 'Djibouti' },
                { code: '+1767', flag: '🇩🇲', name: 'Dominica' },
                { code: '+1809', flag: '🇩🇴', name: 'Dominican Republic' },
                { code: '+593', flag: '🇪🇨', name: 'Ecuador' },
                { code: '+20', flag: '🇪🇬', name: 'Egypt' },
                { code: '+503', flag: '🇸🇻', name: 'El Salvador' },
                { code: '+240', flag: '🇬🇶', name: 'Equatorial Guinea' },
                { code: '+291', flag: '🇪🇷', name: 'Eritrea' },
                { code: '+372', flag: '🇪🇪', name: 'Estonia' },
                { code: '+268', flag: '🇸🇿', name: 'Eswatini' },
                { code: '+251', flag: '🇪🇹', name: 'Ethiopia' },
                { code: '+500', flag: '🇫🇰', name: 'Falkland Islands (Malvinas)' },
                { code: '+298', flag: '🇫🇴', name: 'Faroe Islands' },
                { code: '+679', flag: '🇫🇯', name: 'Fiji' },
                { code: '+358', flag: '🇫🇮', name: 'Finland' },
                { code: '+33', flag: '🇫🇷', name: 'France' },
                { code: '+594', flag: '🇬🇫', name: 'French Guiana' },
                { code: '+689', flag: '🇵🇫', name: 'French Polynesia' },
                { code: '+241', flag: '🇬🇦', name: 'Gabon' },
                { code: '+220', flag: '🇬🇲', name: 'Gambia' },
                { code: '+995', flag: '🇬🇪', name: 'Georgia' },
                { code: '+49', flag: '🇩🇪', name: 'Germany' },
                { code: '+233', flag: '🇬🇭', name: 'Ghana' },
                { code: '+350', flag: '🇬🇮', name: 'Gibraltar' },
                { code: '+30', flag: '🇬🇷', name: 'Greece' },
                { code: '+299', flag: '🇬🇱', name: 'Greenland' },
                { code: '+1473', flag: '🇬🇩', name: 'Grenada' },
                { code: '+590', flag: '🇬🇵', name: 'Guadeloupe' },
                { code: '+1671', flag: '🇬🇺', name: 'Guam' },
                { code: '+502', flag: '🇬🇹', name: 'Guatemala' },
                { code: '+44', flag: '🇬🇬', name: 'Guernsey' },
                { code: '+224', flag: '🇬🇳', name: 'Guinea' },
                { code: '+245', flag: '🇬🇼', name: 'Guinea-Bissau' },
                { code: '+592', flag: '🇬🇾', name: 'Guyana' },
                { code: '+509', flag: '🇭🇹', name: 'Haiti' },
                { code: '+39', flag: '🇻🇦', name: 'Holy See (Vatican City State)' },
                { code: '+504', flag: '🇭🇳', name: 'Honduras' },
                { code: '+852', flag: '🇭🇰', name: 'Hong Kong' },
                { code: '+36', flag: '🇭🇺', name: 'Hungary' },
                { code: '+354', flag: '🇮🇸', name: 'Iceland' },
                { code: '+91', flag: '🇮🇳', name: 'India' },
                { code: '+62', flag: '🇮🇩', name: 'Indonesia' },
                { code: '+98', flag: '🇮🇷', name: 'Iran, Islamic Republic of' },
                { code: '+964', flag: '🇮🇶', name: 'Iraq' },
                { code: '+353', flag: '🇮🇪', name: 'Ireland' },
                { code: '+44', flag: '🇮🇲', name: 'Isle of Man' },
                { code: '+972', flag: '🇮🇱', name: 'Israel' },
                { code: '+39', flag: '🇮🇹', name: 'Italy' },
                { code: '+1876', flag: '🇯🇲', name: 'Jamaica' },
                { code: '+81', flag: '🇯🇵', name: 'Japan' },
                { code: '+44', flag: '🇯🇪', name: 'Jersey' },
                { code: '+962', flag: '🇯🇴', name: 'Jordan' },
                { code: '+7', flag: '🇰🇿', name: 'Kazakhstan' },
                { code: '+254', flag: '🇰🇪', name: 'Kenya' },
                { code: '+686', flag: '🇰🇮', name: 'Kiribati' },
                { code: '+850', flag: '🇰🇵', name: 'Korea, Democratic People\'s Republic of' },
                { code: '+82', flag: '🇰🇷', name: 'Korea, Republic of' },
                { code: '+965', flag: '🇰🇼', name: 'Kuwait' },
                { code: '+996', flag: '🇰🇬', name: 'Kyrgyzstan' },
                { code: '+856', flag: '🇱🇦', name: 'Lao People\'s Democratic Republic' },
                { code: '+371', flag: '🇱🇻', name: 'Latvia' },
                { code: '+961', flag: '🇱🇧', name: 'Lebanon' },
                { code: '+266', flag: '🇱🇸', name: 'Lesotho' },
                { code: '+231', flag: '🇱🇷', name: 'Liberia' },
                { code: '+218', flag: '🇱🇾', name: 'Libya' },
                { code: '+423', flag: '🇱🇮', name: 'Liechtenstein' },
                { code: '+370', flag: '🇱🇹', name: 'Lithuania' },
                { code: '+352', flag: '🇱🇺', name: 'Luxembourg' },
                { code: '+853', flag: '🇲🇴', name: 'Macao' },
                { code: '+261', flag: '🇲🇬', name: 'Madagascar' },
                { code: '+265', flag: '🇲🇼', name: 'Malawi' },
                { code: '+60', flag: '🇲🇾', name: 'Malaysia' },
                { code: '+960', flag: '🇲🇻', name: 'Maldives' },
                { code: '+223', flag: '🇲🇱', name: 'Mali' },
                { code: '+356', flag: '🇲🇹', name: 'Malta' },
                { code: '+692', flag: '🇲🇭', name: 'Marshall Islands' },
                { code: '+596', flag: '🇲🇶', name: 'Martinique' },
                { code: '+222', flag: '🇲🇷', name: 'Mauritania' },
                { code: '+230', flag: '🇲🇺', name: 'Mauritius' },
                { code: '+262', flag: '🇾🇹', name: 'Mayotte' },
                { code: '+52', flag: '🇲🇽', name: 'Mexico' },
                { code: '+691', flag: '🇫🇲', name: 'Micronesia, Federated States of' },
                { code: '+373', flag: '🇲🇩', name: 'Moldova, Republic of' },
                { code: '+377', flag: '🇲🇨', name: 'Monaco' },
                { code: '+976', flag: '🇲🇳', name: 'Mongolia' },
                { code: '+382', flag: '🇲🇪', name: 'Montenegro' },
                { code: '+1664', flag: '🇲🇸', name: 'Montserrat' },
                { code: '+212', flag: '🇲🇦', name: 'Morocco' },
                { code: '+258', flag: '🇲🇿', name: 'Mozambique' },
                { code: '+95', flag: '🇲🇲', name: 'Myanmar' },
                { code: '+264', flag: '🇳🇦', name: 'Namibia' },
                { code: '+674', flag: '🇳🇷', name: 'Nauru' },
                { code: '+977', flag: '🇳🇵', name: 'Nepal' },
                { code: '+31', flag: '🇳🇱', name: 'Netherlands' },
                { code: '+687', flag: '🇳🇨', name: 'New Caledonia' },
                { code: '+64', flag: '🇳🇿', name: 'New Zealand' },
                { code: '+505', flag: '🇳🇮', name: 'Nicaragua' },
                { code: '+227', flag: '🇳🇪', name: 'Niger' },
                { code: '+234', flag: '🇳🇬', name: 'Nigeria' },
                { code: '+683', flag: '🇳🇺', name: 'Niue' },
                { code: '+672', flag: '🇳🇫', name: 'Norfolk Island' },
                { code: '+1670', flag: '🇲🇵', name: 'Northern Mariana Islands' },
                { code: '+47', flag: '🇳🇴', name: 'Norway' },
                { code: '+96', flag: '🇳🇴', name: 'Jordan' },
                { code: '+968', flag: '🇴🇲', name: 'Oman' },
                { code: '+92', flag: '🇵🇰', name: 'Pakistan' },
                { code: '+680', flag: '🇵🇼', name: 'Palau' },
                { code: '+970', flag: '🇵🇸', name: 'Palestine, State of' },
                { code: '+507', flag: '🇵🇦', name: 'Panama' },
                { code: '+675', flag: '🇵🇬', name: 'Papua New Guinea' },
                { code: '+595', flag: '🇵🇾', name: 'Paraguay' },
                { code: '+51', flag: '🇵🇪', name: 'Peru' },
                { code: '+63', flag: '🇵🇭', name: 'Philippines' },
                { code: '+870', flag: '🇵🇳', name: 'Pitcairn' },
                { code: '+48', flag: '🇵🇱', name: 'Poland' },
                { code: '+351', flag: '🇵🇹', name: 'Portugal' },
                { code: '+1787', flag: '🇵🇷', name: 'Puerto Rico' },
                { code: '+974', flag: '🇶🇦', name: 'Qatar' },
                { code: '+262', flag: '🇷🇪', name: 'Réunion' },
                { code: '+40', flag: '🇷🇴', name: 'Romania' },
                { code: '+7', flag: '🇷🇺', name: 'Russian Federation' },
                { code: '+250', flag: '🇷🇼', name: 'Rwanda' },
                { code: '+590', flag: '🇧🇱', name: 'Saint Barthélemy' },
                { code: '+290', flag: '🇸🇭', name: 'Saint Helena, Ascension and Tristan da Cunha' },
                { code: '+1869', flag: '🇰🇳', name: 'Saint Kitts and Nevis' },
                { code: '+1758', flag: '🇱🇨', name: 'Saint Lucia' },
                { code: '+590', flag: '🇲🇫', name: 'Saint Martin (French part)' },
                { code: '+508', flag: '🇵🇲', name: 'Saint Pierre and Miquelon' },
                { code: '+1784', flag: '🇻🇨', name: 'Saint Vincent and the Grenadines' },
                { code: '+685', flag: '🇼🇸', name: 'Samoa' },
                { code: '+378', flag: '🇸🇲', name: 'San Marino' },
                { code: '+239', flag: '🇸🇹', name: 'Sao Tome and Principe' },
                { code: '+966', flag: '🇸🇦', name: 'Saudi Arabia' },
                { code: '+221', flag: '🇸🇳', name: 'Senegal' },
                { code: '+381', flag: '🇷🇸', name: 'Serbia' },
                { code: '+248', flag: '🇸🇨', name: 'Seychelles' },
                { code: '+232', flag: '🇸🇱', name: 'Sierra Leone' },
                { code: '+65', flag: '🇸🇬', name: 'Singapore' },
                { code: '+1721', flag: '🇸🇽', name: 'Sint Maarten (Dutch part)' },
                { code: '+421', flag: '🇸🇰', name: 'Slovakia' },
                { code: '+386', flag: '🇸🇮', name: 'Slovenia' },
                { code: '+677', flag: '🇸🇧', name: 'Solomon Islands' },
                { code: '+252', flag: '🇸🇴', name: 'Somalia' },
                { code: '+27', flag: '🇿🇦', name: 'South Africa' },
                { code: '+211', flag: '🇸🇸', name: 'South Sudan' },
                { code: '+34', flag: '🇪🇸', name: 'Spain' },
                { code: '+94', flag: '🇱🇰', name: 'Sri Lanka' },
                { code: '+249', flag: '🇸🇩', name: 'Sudan' },
                { code: '+597', flag: '🇸🇷', name: 'Suriname' },
                { code: '+47', flag: '🇸🇯', name: 'Svalbard and Jan Mayen' },
                { code: '+46', flag: '🇸🇪', name: 'Sweden' },
                { code: '+41', flag: '🇨🇭', name: 'Switzerland' },
                { code: '+963', flag: '🇸🇾', name: 'Syrian Arab Republic' },
                { code: '+886', flag: '🇹🇼', name: 'Taiwan, Province of China' },
                { code: '+992', flag: '🇹🇯', name: 'Tajikistan' },
                { code: '+255', flag: '🇹🇿', name: 'Tanzania, United Republic of' },
                { code: '+66', flag: '🇹🇭', name: 'Thailand' },
                { code: '+670', flag: '🇹🇱', name: 'Timor-Leste' },
                { code: '+228', flag: '🇹🇬', name: 'Togo' },
                { code: '+690', flag: '🇹🇰', name: 'Tokelau' },
                { code: '+676', flag: '🇹🇴', name: 'Tonga' },
                { code: '+1868', flag: '🇹🇹', name: 'Trinidad and Tobago' },
                { code: '+216', flag: '🇹🇳', name: 'Tunisia' },
                { code: '+90', flag: '🇹🇷', name: 'Turkey' },
                { code: '+993', flag: '🇹🇲', name: 'Turkmenistan' },
                { code: '+1649', flag: '🇹🇨', name: 'Turks and Caicos Islands' },
                { code: '+688', flag: '🇹🇻', name: 'Tuvalu' },
                { code: '+256', flag: '🇺🇬', name: 'Uganda' },
                { code: '+380', flag: '🇺🇦', name: 'Ukraine' },
                { code: '+971', flag: '🇦🇪', name: 'United Arab Emirates' },
                { code: '+44', flag: '🇬🇧', name: 'United Kingdom' },
                { code: '+1', flag: '🇺🇸', name: 'United States' },
                { code: '+1', flag: '🇺🇲', name: 'United States Minor Outlying Islands' },
                { code: '+598', flag: '🇺🇾', name: 'Uruguay' },
                { code: '+998', flag: '🇺🇿', name: 'Uzbekistan' },
                { code: '+678', flag: '🇻🇺', name: 'Vanuatu' },
                { code: '+58', flag: '🇻🇪', name: 'Venezuela, Bolivarian Republic of' },
                { code: '+84', flag: '🇻🇳', name: 'Viet Nam' },
                { code: '+1284', flag: '🇻🇬', name: 'Virgin Islands, British' },
                { code: '+1340', flag: '🇻🇮', name: 'Virgin Islands, U.S.' },
                { code: '+681', flag: '🇼🇫', name: 'Wallis and Futuna' },
                { code: '+212', flag: '🇪🇭', name: 'Western Sahara' },
                { code: '+967', flag: '🇾🇪', name: 'Yemen' },
                { code: '+260', flag: '🇿🇲', name: 'Zambia' },
                { code: '+263', flag: '🇿🇼', name: 'Zimbabwe' }
            ];

         // Clear existing options first (optional)
        countryCodeSelect.innerHTML = '<option value="">Select Code</option>';


        countryCodes.forEach(country => {
            const option = document.createElement('option');
            option.value = country.code;
            // Use textContent for security
            option.textContent = `${country.flag} ${country.name} (${country.code})`;
            countryCodeSelect.appendChild(option);
        });
         // Set default selected based on location or common choice (optional)
         // Example: countryCodeSelect.value = '+254';
    };

     /**
     * Handles the submission of the signup form.
     * @param {Event} e - The form submission event.
     */
    const handleSignupSubmit = async (e) => {
        e.preventDefault(); // Prevent default browser submission
        clearFormStatus(signupStatusDiv); // Clear previous messages

        // Final validation check (especially for password match)
        if (!validateStep(formSteps[formSteps.length - 1])) {
             displayFormStatus(signupStatusDiv, 'Please fix the errors above.', 'error');
             return;
        }

         displayFormStatus(signupStatusDiv, 'Processing signup...', 'loading'); // Indicate loading state
         // Disable submit button during processing
        const submitButton = signupForm.querySelector('button[type="submit"]');
        if (submitButton) submitButton.disabled = true;


        const formData = new FormData(signupForm);
        // Adjust form data keys if needed by the backend API
        // Example: formData.set('username', formData.get('fullName'));

        // Use phone + country code for whatsapp_number
        const countryCode = formData.get('countryCode');
        const phoneNum = formData.get('phone');
        if (countryCode && phoneNum) {
            formData.set('whatsapp_number', `${countryCode}${phoneNum}`);
        }
         // Remove individual code/phone if combined
         formData.delete('countryCode');
         formData.delete('phone');
         // Remove confirm password
         formData.delete('confirm-password'); // Assuming HTML name="confirm-password"


        try {
            // --- Replace with your ACTUAL API endpoint ---
            const response = await fetch('/api/signup/', {
                method: 'POST',
                body: formData, // FormData is sent as multipart/form-data by default
                // Add headers if needed (e.g., CSRF token)
            });

            const data = await response.json();

            if (response.ok && data.success) {
                displayFormStatus(signupStatusDiv, 'Signup successful! Verification code sent to WhatsApp.', 'success');
                // alert('Signup successful! Verification code sent to your WhatsApp number.'); // Replace alert
                // Redirect after a short delay
                setTimeout(() => {
                     window.location.href = 'ucourse.html'; // Redirect on successful signup
                }, 1500);
            } else {
                displayFormStatus(signupStatusDiv, data.message || 'Signup failed. Please check your details and try again.', 'error');
                // alert(data.message || 'Signup failed. Please try again.'); // Replace alert
                 if (submitButton) submitButton.disabled = false; // Re-enable button on failure
            }
        } catch (error) {
            console.error('Signup Error:', error);
             displayFormStatus(signupStatusDiv, 'An network error occurred during signup. Please try again later.', 'error');
            // alert('An error occurred during signup.'); // Replace alert
             if (submitButton) submitButton.disabled = false; // Re-enable button on error
        }
    };

     /**
     * Handles the submission of the login form.
     * @param {Event} e - The form submission event.
     */
    const handleLoginSubmit = async (e) => {
        e.preventDefault();
         clearFormStatus(loginStatusDiv);

         // Basic client-side validation
         let isValid = true;
         const emailInputLogin = document.getElementById('login-email');
         const passwordInputLogin = document.getElementById('login-password');

         [emailInputLogin, passwordInputLogin].forEach(input => {
             const errorSpan = input.closest('.form__group')?.querySelector('.form__error-message');
              if (!input.checkValidity()) {
                 isValid = false;
                 input.classList.add('invalid');
                 if(errorSpan) errorSpan.textContent = input.validationMessage;
             } else {
                  input.classList.remove('invalid');
                  if(errorSpan) errorSpan.textContent = '';
             }
         });


        if (!isValid) {
            displayFormStatus(loginStatusDiv, 'Please enter a valid email and password.', 'error');
             return;
        }

         displayFormStatus(loginStatusDiv, 'Attempting login...', 'loading');
          // Disable submit button during processing
        const submitButton = loginForm.querySelector('button[type="submit"]');
        if (submitButton) submitButton.disabled = true;

        const loginData = {
            // Backend might expect 'username' or 'email'
            username: emailInputLogin.value, // Adjust field name if backend expects 'email'
            password: passwordInputLogin.value
        };

        try {
            // --- Replace with your ACTUAL API endpoint ---
            // Note: SimpleJWT often uses /api/token/
             const apiLoginUrl = '/api/users/login/'; // Or '/api/token/'

            const response = await fetch(apiLoginUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    // Add CSRF token header if required by backend
                    // 'X-CSRFToken': getCookie('csrftoken')
                },
                body: JSON.stringify(loginData)
            });

             const data = await response.json(); // Attempt to parse JSON regardless of status code for error details

            if (response.ok) {
                 console.log('Login successful:', data);
                 displayFormStatus(loginStatusDiv, 'Login successful! Redirecting...', 'success');
                 // alert('Login successful! Redirecting...'); // Replace alert

                // **IMPORTANT: Secure Token Storage**
                // localStorage is vulnerable to XSS. Consider sessionStorage (cleared on tab close)
                // or storing tokens in memory (requires re-login on refresh).
                // For this example, using localStorage as in original, but add warnings.
                 if (data.access) {
                     localStorage.setItem('accessToken', data.access);
                     console.warn("Access token stored in localStorage - vulnerable to XSS attacks.");
                 }
                 if (data.refresh) {
                     localStorage.setItem('refreshToken', data.refresh);
                     console.warn("Refresh token stored in localStorage - vulnerable to XSS attacks.");
                 }

                 setTimeout(() => {
                     window.location.href = 'ucourse.html'; // Redirect on success
                 }, 1000);

            } else {
                // Use error detail from SimpleJWT or custom message
                 const errorMessage = data.detail || data.message || `Login failed (Status: ${response.status}). Please check credentials.`;
                 displayFormStatus(loginStatusDiv, errorMessage, 'error');
                 // alert(`Login failed: ${errorMessage}`); // Replace alert
                  if (submitButton) submitButton.disabled = false;
            }

        } catch (error) {
            console.error('Login Error:', error);
             displayFormStatus(loginStatusDiv, 'A network error occurred during login. Please try again later.', 'error');
            // alert('An error occurred during login.'); // Replace alert
             if (submitButton) submitButton.disabled = false;
        }
    };

    /**
     * Displays status messages within the form.
     * @param {HTMLElement} element - The status container element.
     * @param {string} message - The message to display.
     * @param {'success'|'error'|'loading'} type - The type of message.
     */
    const displayFormStatus = (element, message, type) => {
        if (!element) return;
        element.textContent = message;
        element.className = 'form__status'; // Reset classes
        if (type === 'error') {
            element.classList.add('form__status--error');
        } else if (type === 'success') {
            element.classList.add('form__status--success');
        } else if (type === 'loading') {
             // Optional: Add a loading style
             element.classList.add('form__status--loading'); // You'd need to style this
             element.style.display = 'block'; // Ensure it's visible
        }
         element.style.display = 'block'; // Make sure it's visible
    };

     /**
      * Clears status messages from a form status container.
      * @param {HTMLElement} element - The status container element.
      */
    const clearFormStatus = (element) => {
         if (!element) return;
         element.textContent = '';
         element.style.display = 'none';
         element.className = 'form__status'; // Reset classes
    };

    /**
     * Toggles the visibility of the mobile navigation menu.
     */
     const toggleMobileNav = () => {
         if (!navMenu || !navToggle) return;
         const isOpen = navMenu.classList.toggle('nav--open');
         navToggle.setAttribute('aria-expanded', isOpen);
         navToggle.querySelector('i').classList.toggle('fa-bars', !isOpen);
         navToggle.querySelector('i').classList.toggle('fa-times', isOpen); // Change icon to X
     };


    // --- Event Listeners ---

    // Theme Toggle
    if (themeToggle) {
        themeToggle.addEventListener('click', () => {
            const isDarkMode = body.classList.toggle('dark-mode');
            localStorage.setItem('darkMode', isDarkMode);
            updateThemeButton(isDarkMode);
        });
    }

    // Form Switching
    if (signupLink && loginForm && signupForm) {
        signupLink.addEventListener('click', (e) => {
            e.preventDefault();
            switchForm(signupForm, loginForm);
        });
    }
    if (loginLink && loginForm && signupForm) {
        loginLink.addEventListener('click', (e) => {
            e.preventDefault();
            switchForm(loginForm, signupForm);
        });
    }

    // Multi-step Form Navigation
    signupForm?.querySelectorAll('.form__button--next').forEach(button => {
        button.addEventListener('click', nextStep);
    });
    signupForm?.querySelectorAll('.form__button--prev').forEach(button => {
        button.addEventListener('click', prevStep);
    });

    // Industry Dropdown -> Other Input Field
    if (industrySelect && otherIndustryGroup && otherIndustryInput) {
        industrySelect.addEventListener('change', () => {
            const showOther = industrySelect.value === 'Other';
             otherIndustryGroup.classList.toggle('form__group--hidden', !showOther);
             otherIndustryInput.required = showOther; // Make required only if visible
            if (!showOther) {
                 otherIndustryInput.value = ''; // Clear if hidden
                 otherIndustryInput.classList.remove('invalid'); // Remove validation state
                 const errorSpan = otherIndustryInput.closest('.form__group')?.querySelector('.form__error-message');
                 if (errorSpan) errorSpan.textContent = ''; // Clear error message
            }
        });
    }

    // Password Confirmation Validation (Real-time)
    if (passwordInputSignup && confirmPasswordInputSignup && passwordMismatchSpan) {
        confirmPasswordInputSignup.addEventListener('input', () => {
            if (passwordInputSignup.value !== confirmPasswordInputSignup.value && confirmPasswordInputSignup.value !== '') {
                 passwordMismatchSpan.textContent = "Passwords don't match";
                 confirmPasswordInputSignup.classList.add('invalid');
             } else {
                 passwordMismatchSpan.textContent = '';
                 // Only remove invalid class if the passwords *do* match.
                 // If it was invalid for another reason (e.g., required), don't remove it here.
                 if (passwordInputSignup.value === confirmPasswordInputSignup.value) {
                    confirmPasswordInputSignup.classList.remove('invalid');
                 }
             }
        });
         // Also check when the *first* password field changes
         passwordInputSignup.addEventListener('input', () => {
              if (confirmPasswordInputSignup.value !== '' && passwordInputSignup.value !== confirmPasswordInputSignup.value) {
                  passwordMismatchSpan.textContent = "Passwords don't match";
                  confirmPasswordInputSignup.classList.add('invalid');
              } else if (confirmPasswordInputSignup.value !== '') {
                   passwordMismatchSpan.textContent = '';
                   confirmPasswordInputSignup.classList.remove('invalid');
              }
         });
    }

    // Form Submissions
    if (signupForm) {
        signupForm.addEventListener('submit', handleSignupSubmit);
    }
    if (loginForm) {
        loginForm.addEventListener('submit', handleLoginSubmit);
    }

     // Mobile Navigation Toggle
    if (navToggle) {
        navToggle.addEventListener('click', toggleMobileNav);
    }

    // --- Initializations ---
    applyTheme(); // Apply theme on load
    populateCountryCodes(); // Populate country codes
    showStep(currentStep); // Show the initial form step

    // Determine initial form visibility (e.g., based on URL hash or default to signup)
    if (window.location.hash === '#login-form' && loginForm && signupForm) {
        switchForm(loginForm, signupForm);
    } else if (signupForm && loginForm) {
         // Default to showing signup, but hidden until link clicked
         signupForm.classList.add('form--hidden');
         signupForm.classList.remove('form--visible');
         loginForm.classList.add('form--hidden');
         loginForm.classList.remove('form--visible');
         // You might want to default show one slightly differently,
         // e.g., make signup visible if no hash is present
         // switchForm(signupForm, loginForm); // uncomment to show signup by default
    }


    // Add listeners to clear validation on input
    document.querySelectorAll('.form__input, .form__select').forEach(input => {
        input.addEventListener('input', () => {
            if (input.checkValidity()) {
                 input.classList.remove('invalid');
                 const errorSpan = input.closest('.form__group')?.querySelector('.form__error-message');
                  if (errorSpan) errorSpan.textContent = '';

                 // Special case for password confirmation
                  if(input === confirmPasswordInputSignup && passwordInputSignup?.value === confirmPasswordInputSignup.value) {
                     if(passwordMismatchSpan) passwordMismatchSpan.textContent = '';
                  } else if (input === passwordInputSignup && passwordInputSignup?.value === confirmPasswordInputSignup?.value) {
                       if(passwordMismatchSpan) passwordMismatchSpan.textContent = '';
                       confirmPasswordInputSignup?.classList.remove('invalid');
                  }
            }
        });
    });

    // Helper function (if needed for CSRF token with Django/other frameworks)
function getCookie(name) {
    let cookieValue = null;
    if (document.cookie && document.cookie !== '') {
        const cookies = document.cookie.split(';');
        for (let i = 0; i < cookies.length; i++) {
            const cookie = cookies[i].trim();
            if (cookie.substring(0, name.length + 1) === (name + '=')) {
                cookieValue = decodeURIComponent(cookie.substring(name.length + 1));
                break;
            }
        }
    }
    return cookieValue;
}


}); // End DOMContentLoaded
