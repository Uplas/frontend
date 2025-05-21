// Uplas Frontend: js/apiUtils.js
// Utility for making authenticated API requests

const BASE_API_URL = '/api'; // Example base URL, configure as needed

/**
 * Retrieves the authentication token from localStorage.
 * @returns {string|null} The auth token or null if not found.
 */
function getAuthToken() {
    return localStorage.getItem('authToken');
}

/**
 * Makes an authenticated fetch request.
 * @param {string} url - The URL to fetch (will be prefixed with BASE_API_URL).
 * @param {object} options - Fetch options (method, body, etc.).
 * @returns {Promise<Response>} The fetch promise.
 */
async function fetchAuthenticated(url, options = {}) {
    const token = getAuthToken();
    const headers = {
        'Content-Type': 'application/json',
        ...options.headers, // Allow overriding content-type or adding other headers
    };

    if (token) {
        headers['Authorization'] = `Bearer ${token}`;
    }

    try {
        const response = await fetch(`${BASE_API_URL}${url}`, {
            ...options,
            headers,
        });

        if (response.status === 401) {
            // Unauthorized: Token might be expired or invalid
            console.warn('Unauthorized request. Redirecting to login.');
            // Backend Integration: Clear any local user session data
            localStorage.removeItem('authToken');
            localStorage.removeItem('userData'); // If you store user data

            // Redirect to login page (ensure it exists and path is correct)
            // Check if already on index.html to avoid loop, otherwise redirect.
            if (!window.location.pathname.endsWith('index.html') && window.location.pathname !== '/') {
                window.location.href = '/index.html#auth-section'; // Or your primary login page
            } else {
                 // If on index.html, perhaps just show the auth section
                const authSection = document.getElementById('auth-section');
                if (authSection) authSection.scrollIntoView({ behavior: 'smooth' });
            }
        }
        return response;
    } catch (error) {
        console.error('Fetch API error:', error);
        throw error; // Re-throw to be caught by calling function
    }
}

/**
 * A utility to display form submission status messages.
 * @param {HTMLElement} formElement - The form to display message for.
 * @param {string} message - The message to display.
 * @param {boolean} isError - True if it's an error message, false for success.
 */
function displayFormStatus(formElement, message, isError = false) {
    let statusElement = formElement.querySelector('.form-status-message');
    if (!statusElement) {
        statusElement = document.createElement('p');
        statusElement.className = 'form-status-message';
        // Insert after the last form element, or before the submit button
        const submitButton = formElement.querySelector('button[type="submit"]');
        if (submitButton) {
            submitButton.parentNode.insertBefore(statusElement, submitButton);
        } else {
            formElement.appendChild(statusElement);
        }
    }
    statusElement.textContent = message;
    statusElement.style.color = isError ? 'var(--color-error)' : 'var(--color-success)'; // Ensure these CSS vars exist
    statusElement.style.display = 'block';

    // Optionally hide after a few seconds for non-error messages
    if (!isError) {
        setTimeout(() => {
            statusElement.style.display = 'none';
        }, 5000);
    }
}


// Example of how it might be used in other files:
/*
async function fetchUserProfile() {
    try {
        const response = await fetchAuthenticated('/users/profile');
        if (!response.ok) {
            const errorData = await response.json().catch(() => ({ message: 'Failed to fetch profile' }));
            throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        console.log('User Profile:', data);
        // Backend Integration: Use data to update UI
    } catch (error) {
        console.error('Error fetching user profile:', error);
        // Backend Integration: Display error to user
    }
}
*/
