// Theme Toggle
const themeToggle = document.getElementById('theme-toggle');
const body = document.body;

// Check for saved user preference on page load
const savedDarkMode = localStorage.getItem('darkMode');
if (savedDarkMode === 'true') {
    body.classList.add('dark-mode');
    themeToggle.textContent = 'Light Mode';
    themeToggle.setAttribute('aria-label', 'Switch to Light Mode'); // Accessibility
} else {
    body.classList.remove('dark-mode');
    themeToggle.textContent = 'Dark Mode';
    themeToggle.setAttribute('aria-label', 'Switch to Dark Mode'); // Accessibility
}

themeToggle.addEventListener('click', () => {
    body.classList.toggle('dark-mode');
    const isDarkMode = body.classList.contains('dark-mode');
    localStorage.setItem('darkMode', isDarkMode);
    themeToggle.textContent = isDarkMode ? 'Light Mode' : 'Dark Mode';
    themeToggle.setAttribute('aria-label', isDarkMode ? 'Switch to Light Mode' : 'Switch to Dark Mode'); // Accessibility
});

// Show/Hide Forms (with smoother transitions)
const signupLink = document.getElementById('signup-link');
const loginLink = document.getElementById('login-link');
const signupForm = document.getElementById('signup-form');
const loginForm = document.getElementById('login-form');

signupLink.addEventListener('click', (e) => {
    e.preventDefault();
    signupForm.style.display = 'block';
    loginForm.style.display = 'none';
    signupForm.style.opacity = 1; // Fade in
    loginForm.style.opacity = 0; // fade out
    resetFormSteps();
});

loginLink.addEventListener('click', (e) => {
    e.preventDefault();
    loginForm.style.display = 'block';
    signupForm.style.display = 'none';
    loginForm.style.opacity = 1; // Fade in
    signupForm.style.opacity = 0; // fade out
});

// Interactive Form (Improved UX)
const formSteps = document.querySelectorAll('.form-step');
let currentStep = 0;

const showStep = (step) => {
    formSteps.forEach((stepElement, index) => {
        stepElement.classList.toggle('active', index === step);
        stepElement.style.display = index === step ? 'block' : 'none'; // Ensure display is correct
    });
};

const nextStep = (e) => {
    const currentFormStep = formSteps[currentStep];
    const inputs = currentFormStep.querySelectorAll('input[required], select[required]');
    let isValid = true;

    inputs.forEach(input => {
        if (!input.checkValidity()) {
            isValid = false;
            input.reportValidity();
            input.classList.add('invalid'); // Add visual feedback
        } else {
            input.classList.remove('invalid'); // Remove feedback if valid
        }
    });

    if (isValid && currentStep < formSteps.length - 1) {
        currentStep++;
        showStep(currentStep);
    }
};

const prevStep = () => {
    if (currentStep > 0) {
        currentStep--;
        showStep(currentStep);
    }
};

document.querySelectorAll('.next-btn').forEach((button) => {
    button.addEventListener('click', nextStep);
});

document.querySelectorAll('.prev-btn').forEach((button) => {
    button.addEventListener('click', prevStep);
});

const resetFormSteps = () => {
    currentStep = 0;
    showStep(currentStep);
};

// Password validation (with better feedback)
const passwordInputSignup = document.getElementById('password');
const confirmPasswordInputSignup = document.getElementById('confirm-password');
const passwordMismatch = document.getElementById('password-mismatch'); // Add a span to your html for this message.

if (confirmPasswordInputSignup) {
    confirmPasswordInputSignup.addEventListener('input', () => {
        if (passwordInputSignup.value !== confirmPasswordInputSignup.value) {
            passwordMismatch.textContent = "Passwords don't match";
            confirmPasswordInputSignup.classList.add('invalid');
        } else {
            passwordMismatch.textContent = '';
            confirmPasswordInputSignup.classList.remove('invalid');
        }
    });
}

// Form submission handling (with more user-friendly messages)
const signupFormSubmit = document.getElementById('signup-form');
if (signupFormSubmit) {
    signupFormSubmit.addEventListener('submit', (e) => {
        e.preventDefault();

        if (passwordInputSignup.value !== confirmPasswordInputSignup.value) {
            alert('Passwords do not match. Please correct them.');
            return;
        }

        const fullNameInput = document.getElementById('full-name');
        const emailInput = document.getElementById('email');
        const phoneInput = document.getElementById('phone');
        const password = passwordInputSignup.value;

        if (!fullNameInput || !emailInput || !phoneInput || !password) {
            alert('One or more signup fields were not found. Please check your form.');
            return;
        }

        const fullName = fullNameInput.value;
        const email = emailInput.value;
        const phone = phoneInput.value;

        const formData = new FormData();
        formData.append('username', fullName); // Using full name as username for now
        formData.append('email', email);
        formData.append('password', password);
        formData.append('whatsapp_number', phone); // Using the phone number input for WhatsApp

        fetch('/api/signup/', { // Replace with your actual signup API endpoint
            method: 'POST',
            body: formData,
        })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                alert('Signup successful! Verification code sent to your WhatsApp number.');
                window.location.href = 'ucourse.html'; // Redirect on successful signup
            } else {
                alert(data.message || 'Signup failed. Please try again.'); // Display message from backend
            }
        })
        .catch(error => {
            console.error('Error:', error);
            alert('An error occurred during signup.');
        });
    });
}

const loginFormSubmit = document.getElementById('login-form');
if (loginFormSubmit) {
    loginFormSubmit.addEventListener('submit', (e) => {
        e.preventDefault();

        const emailInputLogin = document.getElementById('email-login');
        const passwordInputLogin = document.getElementById('password-login');

        if (!emailInputLogin || !passwordInputLogin) {
            alert('Please enter your email and password.');
            return;
        }

        const email = emailInputLogin.value;
        const password = passwordInputLogin.value;
        const apiLoginUrl = '/api/users/login/'; // Make sure this matches your urls.py

        fetch(apiLoginUrl, {
    method: 'POST',
    headers: {
        'Content-Type': 'application/json',
        // Add CSRF token header if using SessionAuthentication and CSRF protection
        // 'X-CSRFToken': getCookie('csrftoken') // Function to get CSRF token from cookie
    },
    body: JSON.stringify({ username: email, password: password }) // SimpleJWT expects 'username' by default, even if it's an email
})
.then(response => {
    if (!response.ok) {
        // Handle failed login (e.g., show error message)
        return response.json().then(errData => { throw new Error(errData.detail || 'Login failed') });
    }
    return response.json(); // Parse successful response JSON
})
.then(data => {
    console.log('Login successful:', data);
    // **IMPORTANT: Store tokens securely**
    // localStorage is common but vulnerable to XSS. Consider sessionStorage or in-memory.
    if (data.access) {
        localStorage.setItem('accessToken', data.access);
    }
    if (data.refresh) {
        localStorage.setItem('refreshToken', data.refresh);
    }

    alert('Login successful! Redirecting...');
    window.location.href = 'ucourse.html'; // Redirect on success
})
.catch(error => {
    console.error('Login Error:', error);
    alert(`Login failed: ${error.message}`);
});


        const loginData = {
            email: email,
            password: password
        };

        fetch('/api/login/', { // Replace with your actual login API endpoint
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(loginData)
        })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                alert('Login successful! Redirecting to courses...');
                // Optionally store a token in localStorage or sessionStorage here
                window.location.href = 'ucourse.html'; // Redirect to courses page on successful login
            } else {
                alert(data.message || 'Login failed. Please check your credentials.'); // Display login error message
            }
        })
        .catch(error => {
            console.error('Error:', error);
            alert('An error occurred during login.');
        });
    });
}

// Country Code Dropdown (Improved UX)
const countryCodeSelect = document.getElementById('country-code');
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

countryCodes.forEach(country => {
    const option = document.createElement('option');
    option.value = country.code;
    option.textContent = `${country.flag} ${country.name} (${country.code})`;
    countryCodeSelect.appendChild(option);
});

document.addEventListener('DOMContentLoaded', function() {
    const submitButtons = document.querySelectorAll('.submit-btn');
    const coursesPageURL = 'ucourse.html'; // Replace with the actual URL of your courses page

    submitButtons.forEach(button => {
        if (button.textContent.trim() === 'Login') {
            button.addEventListener('click', function() {
                window.location.href = coursesPageURL;
            });
        } else if (button.textContent.trim() === 'Signup') {
            button.addEventListener('click', function() {
                window.location.href = coursesPageURL;
            });
        }
    });
});


// Example inside uprojects.js or another script

async function getUserData() {
    try {
        // Use the utility function for authenticated endpoints
        const userData = await fetchAuthenticated('/api/users/profile/'); 
        console.log("User profile data:", userData);
        // Update UI with user data
    } catch (error) {
        console.error("Failed to fetch user profile:", error);
        // Handle error (e.g., show message, redirect to login if needed)
    }
}

// Call it when needed
// getUserData();
