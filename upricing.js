// upricing.js - Refactored and Enhanced

'use strict';

document.addEventListener('DOMContentLoaded', () => {

    // --- Element Selectors ---
    const body = document.body;
    const themeToggle = document.getElementById('theme-toggle');
    // const footerThemeToggle = document.getElementById('footer-theme-toggle'); // Removed if not present
    const contactForm = document.getElementById('contact-form');
    const contactStatusDiv = document.getElementById('contact-status');
    const contactSalesButtons = document.querySelectorAll('.card__button--contact'); // Use class
    const choosePlanButtons = document.querySelectorAll('.card__button[data-plan]');
    const paymentSection = document.getElementById('payment-section');
    const paymentForm = document.getElementById('payment-form');
    const paymentMethodsRadios = document.querySelectorAll('input[name="paymentMethod"]');
    const paymentDetailsDivs = document.querySelectorAll('.payment__details');
    const paymentStatusDiv = document.getElementById('payment-status');
    const paymentSubmitButton = document.getElementById('payment-submit-button');
    const selectedPlanNameEl = document.getElementById('selected-plan-name');
    const selectedPlanPriceEl = document.getElementById('selected-plan-price');
    const selectedPlanIdInput = document.getElementById('selected-plan-id');
    const mpesaPhoneInput = document.getElementById('mpesa-phone');
    const mpesaErrorSpan = document.getElementById('mpesa-error');
    const currentYearSpan = document.getElementById('current-year');
    const navToggle = document.querySelector('.nav__toggle');
    const navMenu = document.querySelector('.nav');

    // --- Config/State ---
    const planDetails = {
        premium: { name: "Premium (Per Course/Module)", price: "$2/Module or $14/Course", id: "premium" }, // Adjust as needed
        'full-access': { name: "Full Access (Yearly)", price: "$200 / year", id: "full-access" }
        // Add more plan IDs if needed
    };


    // --- Utility Functions ---

    /**
     * Sets attributes for the theme toggle button(s).
     * @param {boolean} isDarkMode - Indicates if dark mode is active.
     */
    const updateThemeButton = (isDarkMode) => {
        if (!themeToggle) return;
         const themeText = themeToggle.querySelector('.theme-text');
        themeToggle.setAttribute('aria-label', isDarkMode ? 'Switch to Light Mode' : 'Switch to Dark Mode');
        if (themeText) {
             themeText.textContent = isDarkMode ? 'Light Mode' : 'Dark Mode';
        }
         // if (footerThemeToggle) footerThemeToggle.textContent = text; // Update footer toggle if exists
    };

    /**
     * Applies the theme based on saved preference or system setting.
     */
    const applyTheme = () => {
        const savedDarkMode = localStorage.getItem('darkMode'); // Use consistent key 'darkMode'
        const systemPrefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
        const isDarkMode = savedDarkMode === 'true' || (savedDarkMode === null && systemPrefersDark);

        body.classList.toggle('dark-mode', isDarkMode);
        updateThemeButton(isDarkMode);
    };

    /**
     * Smoothly scrolls to an element.
     * @param {string} selector - CSS selector for the target element.
     */
    const scrollToElement = (selector) => {
        const targetElement = document.querySelector(selector);
        if (targetElement) {
            targetElement.scrollIntoView({
                behavior: 'smooth',
                block: 'start' // Scroll to the top of the element
            });
        }
    };

    /**
     * Displays status messages within a designated container.
     * @param {HTMLElement} element - The status container element.
     * @param {string} message - The message to display.
     * @param {'success'|'error'|'loading'} type - The type of message.
     */
    const displayStatus = (element, message, type) => {
        if (!element) return;
        element.textContent = message;
        element.className = 'form__status'; // Reset classes
        if (type === 'error') {
            element.classList.add('form__status--error');
        } else if (type === 'success') {
            element.classList.add('form__status--success');
        } else if (type === 'loading') {
            element.classList.add('form__status--loading'); // Add loading style if needed
        }
        element.style.display = 'block';
    };

    /**
     * Clears status messages from a container.
     * @param {HTMLElement} element - The status container element.
     */
    const clearStatus = (element) => {
        if (!element) return;
        element.textContent = '';
        element.style.display = 'none';
        element.className = 'form__status';
    };

     /**
     * Validates form inputs within a container using Constraint Validation API.
     * @param {HTMLElement} formElement - The form element to validate.
     * @returns {boolean} - True if all required inputs are valid, false otherwise.
     */
    const validateForm = (formElement) => {
        let isValid = true;
        const inputs = formElement.querySelectorAll('input[required], select[required], textarea[required]');

        inputs.forEach(input => {
            // Skip inputs within hidden payment detail sections
             if (input.closest('.payment__details') && !input.closest('.payment__details--active')) {
                  input.classList.remove('invalid'); // Clear potential previous errors
                  const errorSpan = input.closest('.form__group')?.querySelector('.form__error-message');
                  if (errorSpan) errorSpan.textContent = '';
                  return; // Skip validation for hidden inputs
             }


            const group = input.closest('.form__group');
            const errorSpan = group?.querySelector('.form__error-message');

            if (!input.checkValidity()) {
                isValid = false;
                input.classList.add('invalid');
                if (errorSpan) {
                    errorSpan.textContent = input.validationMessage;
                }
            } else {
                input.classList.remove('invalid');
                if (errorSpan) {
                    errorSpan.textContent = '';
                }
            }
        });
        return isValid;
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

     /**
      * Shows the payment section and populates plan details.
      * @param {string} planId - The ID of the selected plan ('premium', 'full-access').
      */
     const showPaymentSection = (planId) => {
         const plan = planDetails[planId];
         if (!plan || !paymentSection || !selectedPlanNameEl || !selectedPlanPriceEl || !selectedPlanIdInput) return;

         selectedPlanNameEl.textContent = plan.name;
         selectedPlanPriceEl.textContent = plan.price;
         selectedPlanIdInput.value = plan.id;

         paymentSection.classList.remove('payment-section--hidden');
         // Default to the first payment method (e.g., Stripe)
          showPaymentDetails('stripe');
          document.querySelector('input[name="paymentMethod"][value="stripe"]').checked = true;


         // Scroll to payment section
         scrollToElement('#payment-section');
     };

     /**
     * Shows the relevant payment details div and hides others.
     * @param {string} methodValue - The value of the selected payment method radio button.
     */
     const showPaymentDetails = (methodValue) => {
         paymentDetailsDivs.forEach(div => {
             div.classList.toggle('payment__details--active', div.id === `${methodValue}-details`);
         });

          // Update submit button text (optional)
          const submitTextMap = {
              stripe: 'Pay with Card',
              paypal: 'Proceed to PayPal',
              flutterwave: 'Pay with Flutterwave',
              mpesa: 'Confirm M-Pesa Payment'
          };
          if(paymentSubmitButton) {
             paymentSubmitButton.innerHTML = `<i class="fas fa-credit-card"></i> ${submitTextMap[methodValue] || 'Complete Purchase'}`;
          }

          // Set required attribute for M-Pesa phone only when visible
          if(mpesaPhoneInput) {
               mpesaPhoneInput.required = (methodValue === 'mpesa');
               if (methodValue !== 'mpesa') { // Clear validation if switching away
                   mpesaPhoneInput.classList.remove('invalid');
                   if(mpesaErrorSpan) mpesaErrorSpan.textContent = '';
               }
          }
     };


    // --- Event Handlers ---

    /**
     * Handles contact form submission.
     * @param {Event} e - The form submission event.
     */
    const handleContactSubmit = async (e) => {
        e.preventDefault();
        clearStatus(contactStatusDiv);

        if (!validateForm(contactForm)) {
            displayStatus(contactStatusDiv, 'Please correct the errors above.', 'error');
            return;
        }

        const submitButton = contactForm.querySelector('button[type="submit"]');
        if (submitButton) submitButton.disabled = true;
        displayStatus(contactStatusDiv, 'Sending message...', 'loading');

        const formData = new FormData(contactForm);
        const data = Object.fromEntries(formData.entries()); // Convert to plain object for JSON

        try {
            // --- Replace with your ACTUAL contact API endpoint ---
            const response = await fetch('/api/contact/', { // Example endpoint
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    // Add CSRF token, Auth headers if needed
                },
                body: JSON.stringify(data),
            });

            if (response.ok) {
                displayStatus(contactStatusDiv, 'Thank you! Your message has been sent successfully.', 'success');
                contactForm.reset(); // Clear form
            } else {
                 const errorData = await response.json().catch(() => ({})); // Try to get error message
                 displayStatus(contactStatusDiv, errorData.message || 'An error occurred. Please try again.', 'error');
            }
        } catch (error) {
            console.error('Contact Form Error:', error);
            displayStatus(contactStatusDiv, 'A network error occurred. Please try again later.', 'error');
        } finally {
            if (submitButton) submitButton.disabled = false;
        }
    };

     /**
      * Handles payment form submission (Simulated).
      * @param {Event} e - The form submission event.
      */
     const handlePaymentSubmit = async (e) => {
         e.preventDefault();
         clearStatus(paymentStatusDiv);

         const selectedMethod = paymentForm.querySelector('input[name="paymentMethod"]:checked')?.value;

          // Validate common fields + specific fields for the active method
         if (!validateForm(paymentForm)) {
              displayStatus(paymentStatusDiv, 'Please fill in the required payment details correctly.', 'error');
              return;
         }


         if (!selectedMethod) {
             displayStatus(paymentStatusDiv, 'Please select a payment method.', 'error');
             return;
         }

         if (paymentSubmitButton) paymentSubmitButton.disabled = true;
         displayStatus(paymentStatusDiv, `Processing payment via ${selectedMethod}...`, 'loading');

         const planId = selectedPlanIdInput.value;
         const formData = new FormData(paymentForm); // Contains planId, paymentMethod, potentially mpesaPhone
         const paymentData = Object.fromEntries(formData.entries()); // Convert to object

         console.log("Simulating Payment Submission:");
         console.log("Plan:", planId);
         console.log("Method:", selectedMethod);
         console.log("Data:", paymentData);


         // **--- SIMULATION / PLACEHOLDER ---**
         // In a real application:
         // 1. Prevent default form submission.
         // 2. Based on `selectedMethod`:
         //    - Stripe: Use Stripe.js to create a token/paymentIntent and send the ID to your backend.
         //    - PayPal: Use PayPal SDK to render button; on approval, send transaction details to backend.
         //    - Flutterwave: Use Flutterwave SDK/API to initiate payment, handle callback/webhook on backend.
         //    - M-Pesa: Send phone number and plan details to YOUR backend, which then calls the Daraja API (STK Push). Your backend listens for the callback.
         // 3. Your backend processes the payment with the provider.
         // 4. Backend updates user's course access upon successful payment confirmation.
         // 5. Backend sends success/failure response to frontend.

         // Simulate backend response after a delay
         await new Promise(resolve => setTimeout(resolve, 2000)); // 2-second delay

         try {
             // --- Replace this simulation with actual backend communication ---
             const isSuccess = Math.random() > 0.2; // Simulate 80% success rate

             if (isSuccess) {
                 displayStatus(paymentStatusDiv, 'Payment successful! Your course access has been updated.', 'success');
                 // Optionally hide payment form or redirect after success
                 // paymentSection.classList.add('payment-section--hidden');
                 // setTimeout(() => window.location.href = '/dashboard', 1500);
             } else {
                 displayStatus(paymentStatusDiv, 'Payment failed. Please check your details or try another method.', 'error');
                  if (paymentSubmitButton) paymentSubmitButton.disabled = false;
             }
         } catch (error) {
             console.error("Payment Simulation Error:", error);
             displayStatus(paymentStatusDiv, 'A network error occurred during payment processing.', 'error');
              if (paymentSubmitButton) paymentSubmitButton.disabled = false;
         }
     };


    // --- Event Listeners ---

    // Theme Toggle
    if (themeToggle) {
        themeToggle.addEventListener('click', () => {
            const isDarkMode = body.classList.toggle('dark-mode');
            localStorage.setItem('darkMode', isDarkMode); // Consistent key
            updateThemeButton(isDarkMode);
        });
    }
     // Add listener for footer toggle if it exists
    // if (footerThemeToggle) footerThemeToggle.addEventListener('click', toggleTheme);

    // Smooth scrolling for anchor links
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function (e) {
            const targetId = this.getAttribute('href');
            if (targetId && targetId !== '#') {
                 e.preventDefault();
                scrollToElement(targetId);
            }
        });
    });

    // Contact Form Submission
    if (contactForm) {
        contactForm.addEventListener('submit', handleContactSubmit);
         // Clear validation on input
        contactForm.querySelectorAll('input[required], select[required], textarea[required]').forEach(input => {
             input.addEventListener('input', () => {
                 if (input.checkValidity()) {
                     input.classList.remove('invalid');
                     const errorSpan = input.closest('.form__group')?.querySelector('.form__error-message');
                     if(errorSpan) errorSpan.textContent = '';
                     clearStatus(contactStatusDiv); // Clear general form error on valid input
                 }
             });
         });
    }

     // Contact Sales Button Click (Scroll)
     contactSalesButtons.forEach(button => {
         button.addEventListener('click', () => {
             scrollToElement('#contact-section');
              // Optional: focus the first field in the contact form
             document.getElementById('contact-name')?.focus();
         });
     });

     // Choose Plan Button Click (Show Payment Section)
     choosePlanButtons.forEach(button => {
         button.addEventListener('click', () => {
             const plan = button.dataset.plan;
             if (plan) {
                showPaymentSection(plan);
             }
         });
     });

     // Payment Method Change
     if (paymentMethodsRadios) {
         paymentMethodsRadios.forEach(radio => {
             radio.addEventListener('change', () => {
                 showPaymentDetails(radio.value);
                 clearStatus(paymentStatusDiv); // Clear status on method change
             });
         });
     }

      // Payment Form Submission
    if (paymentForm) {
         paymentForm.addEventListener('submit', handlePaymentSubmit);
          // Clear validation on input
          paymentForm.querySelectorAll('input[required]').forEach(input => {
             input.addEventListener('input', () => {
                 if (input.checkValidity()) {
                     input.classList.remove('invalid');
                     const errorSpan = input.closest('.form__group')?.querySelector('.form__error-message') || document.getElementById('mpesa-error');
                     if(errorSpan) errorSpan.textContent = '';
                      clearStatus(paymentStatusDiv); // Clear general form error
                 }
             });
         });
    }

    // Mobile Navigation Toggle
    if (navToggle) {
        navToggle.addEventListener('click', toggleMobileNav);
    }


    // --- Initializations ---
    applyTheme(); // Apply theme on load
    if (currentYearSpan) {
         currentYearSpan.textContent = new Date().getFullYear(); // Update copyright year
    }


}); // End DOMContentLoaded


// --- Placeholder for potential Payment SDK Initializations ---
// function initializeStripe() {
//     const stripe = Stripe('YOUR_STRIPE_PUBLIC_KEY');
//     const elements = stripe.elements();
//     const cardElement = elements.create('card', { /* options */ });
//     cardElement.mount('#card-element');
//     // Add event listeners for cardElement changes/errors
// }

// function initializePayPal() {
//      paypal.Buttons({
//           createOrder: function(data, actions) { /* ... */ },
//           onApprove: function(data, actions) { /* Send details to backend */ }
//      }).render('#paypal-button-container');
// }

// function initializeFlutterwave() {
//      const flutterwaveButton = document.getElementById('flutterwave-button');
//      flutterwaveButton?.addEventListener('click', () => {
//           FlutterwaveCheckout({
//                public_key: "YOUR_FLUTTERWAVE_PUBLIC_KEY",
//                // other options...
//                callback: function(data) {
//                     console.log("Flutterwave success data:", data);
//                      // Send transaction reference to backend for verification
//                 },
//                onclose: function() { /* Handle modal close */ },
//           });
//      });
// }


// --- Consider calling initialization functions conditionally based on payment method selection ---
// initializeStripe(); // Or call later when Stripe is selected
// initializePayPal(); // Or call later
// initializeFlutterwave(); // Or call later
