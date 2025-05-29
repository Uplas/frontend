// Uplas Frontend: js/apiUtils.js
// Utility for making authenticated API requests and managing user sessions.

// --- Configuration ---

/**
 * Determines the base API URL.
 * For development, '/api' assumes your frontend dev server proxies requests to the backend.
 * For production, this should be the absolute URL of your backend API.
 * Example in HTML:
 * <script>
 * window.UPLAS_CONFIG = {
 * BASE_API_URL: '/api', // Or 'https://yourdomain.com/api' for production
 * BACKEND_LOGOUT_ENABLED: true // If you have a backend logout endpoint for token blacklisting
 * };
 * </script>
 */
const BASE_API_URL = (typeof UPLAS_CONFIG !== 'undefined' && UPLAS_CONFIG.BASE_API_URL)
    ? UPLAS_CONFIG.BASE_API_URL
    : '/api'; // Default fallback

const ACCESS_TOKEN_KEY = 'uplasAccessToken';
const REFRESH_TOKEN_KEY = 'uplasRefreshToken';
const USER_DATA_KEY = 'uplasUserData';
const AUTH_REDIRECT_MESSAGE_KEY = 'uplasAuthRedirectMessage'; // For messages on redirect to login

// --- Token Management ---

/**
 * Retrieves the access token from localStorage.
 * @returns {string|null} The access token or null if not found.
 */
function getAccessTokenInternal() {
    return localStorage.getItem(ACCESS_TOKEN_KEY);
}

/**
 * Retrieves the refresh token from localStorage.
 * @returns {string|null} The refresh token or null if not found.
 */
function getRefreshTokenInternal() {
    return localStorage.getItem(REFRESH_TOKEN_KEY);
}

/**
 * Stores access and refresh tokens in localStorage.
 * @param {string} accessToken - The access token.
 * @param {string} [refreshTokenValue] - The refresh token (backend might rotate it).
 */
function storeTokensInternal(accessToken, refreshTokenValue) {
    if (accessToken) {
        localStorage.setItem(ACCESS_TOKEN_KEY, accessToken);
    }
    if (refreshTokenValue) { // Only update refresh token if a new one is provided
        localStorage.setItem(REFRESH_TOKEN_KEY, refreshTokenValue);
    }
}

/**
 * Clears authentication tokens and user data from localStorage.
 */
function clearTokensAndUserDataInternal() {
    localStorage.removeItem(ACCESS_TOKEN_KEY);
    localStorage.removeItem(REFRESH_TOKEN_KEY);
    localStorage.removeItem(USER_DATA_KEY);
}

/**
 * Stores minimal user data in localStorage.
 * @param {object} userData - The user data object (e.g., from profile or login response).
 */
function storeUserDataInternal(userData) {
    if (userData) {
        localStorage.setItem(USER_DATA_KEY, JSON.stringify(userData));
    } else {
        localStorage.removeItem(USER_DATA_KEY); // Clear if null/undefined userData is passed
    }
}

/**
 * Retrieves user data from localStorage.
 * @returns {object|null} The user data object or null.
 */
function getUserDataInternal() {
    const data = localStorage.getItem(USER_DATA_KEY);
    try {
        return data ? JSON.parse(data) : null;
    } catch (e) {
        console.error("apiUtils: Error parsing user data from localStorage", e);
        localStorage.removeItem(USER_DATA_KEY); // Clear corrupted data
        return null;
    }
}


// --- Redirection & UI ---

/**
 * Redirects the user to the login page, optionally with a message.
 * @param {string} [message] - An optional message to display on the login page.
 */
function redirectToLoginInternal(message) {
    clearTokensAndUserDataInternal(); // Always clear session before redirecting to login
    if (message) {
        sessionStorage.setItem(AUTH_REDIRECT_MESSAGE_KEY, message);
    }

    const loginPath = '/index.html';
    const loginHash = '#auth-section';

    const currentPathname = window.location.pathname;
    const currentHashValue = window.location.hash;

    const isOnLoginPage = currentPathname.endsWith(loginPath) || currentPathname.endsWith(loginPath + '/');
    const isOnAuthSection = currentHashValue === loginHash;

    if (isOnLoginPage && isOnAuthSection) {
        console.log("apiUtils: Already on the login page/auth section. Message (if any) should be displayed by page logic.");
        const authSectionEl = document.querySelector(loginHash);
        if (authSectionEl && message && typeof displayFormStatusInternal === 'function') {
           // displayFormStatusInternal(authSectionEl, message, true); // This could display the message if needed
        }
        return;
    }
    window.location.href = `${loginPath}${loginHash}`;
}

/**
 * A utility to display form submission status messages.
 * @param {HTMLElement|string} formElementOrSelector - The form element or a CSS selector for it.
 * @param {string} message - The message to display.
 * @param {boolean} isError - True if it's an error message, false for success/info.
 * @param {string} [translateKey=null] - Optional translation key for the message.
 */
function displayFormStatusInternal(formElementOrSelector, message, isError = false, translateKey = null) {
    const formElement = typeof formElementOrSelector === 'string'
        ? document.querySelector(formElementOrSelector)
        : formElementOrSelector;

    if (!formElement) {
        console.warn(`apiUtils (displayFormStatus): formElement not found. Selector/Element:`, formElementOrSelector, "Message:", message);
        if (isError) console.error("Form Status (Error):", message);
        else console.log("Form Status (Info/Success):", message);
        return;
    }

    let statusElement = formElement.querySelector('.form__status');
    if (!statusElement) {
        statusElement = formElement.querySelector('.form-status-message');
    }
    if (!statusElement) {
        statusElement = document.createElement('div');
        statusElement.className = 'form__status'; // Use the more general class
        const submitButton = formElement.querySelector('button[type="submit"], input[type="submit"]');
        if (submitButton && submitButton.parentNode) {
            submitButton.parentNode.insertBefore(statusElement, submitButton.nextSibling);
        } else {
            formElement.appendChild(statusElement);
        }
    }

    const textToDisplay = (translateKey && typeof window.uplasTranslate === 'function')
        ? window.uplasTranslate(translateKey, { fallback: message })
        : message;

    statusElement.textContent = textToDisplay;
    statusElement.classList.remove('form__status--success', 'form__status--error', 'form__status--loading');
    const statusType = message.toLowerCase().includes('loading') || message.toLowerCase().includes('processing') ? 'loading' : (isError ? 'error' : 'success');
    statusElement.classList.add(`form__status--${statusType}`);
    
    statusElement.style.display = 'block';
    statusElement.setAttribute('role', isError ? 'alert' : 'status');
    statusElement.setAttribute('aria-live', isError ? 'assertive' : 'polite');

    if (statusType === 'success') { // Auto-hide only success messages
        setTimeout(() => {
            if (statusElement) {
                statusElement.style.display = 'none';
                statusElement.textContent = '';
            }
        }, 7000);
    }
}

// --- Core API Call Logic ---

let isCurrentlyRefreshingTokenGlobal = false;
let tokenRefreshSubscribersGlobal = [];

function subscribeToTokenRefreshInternal(callback) {
    tokenRefreshSubscribersGlobal.push(callback);
}

function onTokenRefreshedInternal(error, newAccessToken) {
    tokenRefreshSubscribersGlobal.forEach(callback => callback(error, newAccessToken));
    tokenRefreshSubscribersGlobal = [];
}

async function refreshTokenInternal() {
    const currentRefreshToken = getRefreshTokenInternal();
    if (!currentRefreshToken) {
        console.warn('apiUtils (refreshToken): No refresh token available.');
        onTokenRefreshedInternal(new Error('No refresh token available for session refresh.'), null);
        redirectToLoginInternal('Your session has ended. Please log in.');
        return null;
    }

    if (isCurrentlyRefreshingTokenGlobal) {
        console.log("apiUtils (refreshToken): Token refresh already in progress. Queuing request.");
        return new Promise((resolve) => {
            subscribeToTokenRefreshInternal((err, newToken) => {
                if (err) resolve(null); else resolve(newToken);
            });
        });
    }

    isCurrentlyRefreshingTokenGlobal = true;
    console.log("apiUtils (refreshToken): Attempting to refresh token.");

    try {
        const response = await fetch(`${BASE_API_URL}/users/token/refresh/`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ refresh: currentRefreshToken }),
        });

        if (response.ok) {
            const data = await response.json();
            storeTokensInternal(data.access, data.refresh);
            console.info('apiUtils (refreshToken): Token refreshed successfully.');
            onTokenRefreshedInternal(null, data.access);
            return data.access;
        } else {
            console.warn('apiUtils (refreshToken): Failed to refresh token. Status:', response.status);
            const errorData = await response.json().catch(() => ({ detail: `Token refresh request failed, status ${response.status}` }));
            onTokenRefreshedInternal(new Error(errorData.detail || 'Token refresh failed definitively.'), null);
            redirectToLoginInternal('Your session has expired. Please log in again.');
            return null;
        }
    } catch (error) {
        console.error('apiUtils (refreshToken): Network or other error during token refresh:', error);
        onTokenRefreshedInternal(error, null);
        redirectToLoginInternal('Could not re-establish session due to a network problem. Please log in again.');
        return null;
    } finally {
        isCurrentlyRefreshingTokenGlobal = false;
    }
}

async function fetchAuthenticatedInternal(relativeUrl, options = {}) {
    const isPublicCall = options.isPublic === true;

    if (isCurrentlyRefreshingTokenGlobal && !isPublicCall) {
        console.log(`apiUtils (fetchAuth): Queuing request for ${relativeUrl} due to ongoing token refresh.`);
        return new Promise((resolve, reject) => {
            subscribeToTokenRefreshInternal(async (error, newAccessToken) => {
                if (error || !newAccessToken) {
                    console.error(`apiUtils (fetchAuth): Token refresh failed for queued request ${relativeUrl}.`, error);
                    reject(new Error('Authentication failed after token refresh attempt.'));
                    return;
                }
                const retryOptions = { ...options };
                if (!retryOptions.headers) retryOptions.headers = {};
                retryOptions.headers['Authorization'] = `Bearer ${newAccessToken}`;
                try {
                    const response = await fetch(`${BASE_API_URL}${relativeUrl.startsWith('/') ? relativeUrl : '/' + relativeUrl}`, retryOptions);
                    resolve(response);
                } catch (fetchError) {
                    reject(fetchError);
                }
            });
        });
    }

    let token = getAccessTokenInternal();
    const headers = { ...options.headers };

    if (!(options.body instanceof FormData) && !headers['Content-Type']) {
        headers['Content-Type'] = 'application/json';
    }

    if (!isPublicCall) {
        if (token) {
            headers['Authorization'] = `Bearer ${token}`;
        } else {
            console.warn(`apiUtils (fetchAuth): No access token for protected URL: ${relativeUrl}. Checking refresh token.`);
            const newAccessTokenViaRefresh = await refreshTokenInternal();
            if (newAccessTokenViaRefresh) {
                token = newAccessTokenViaRefresh; // Use the newly refreshed token
                headers['Authorization'] = `Bearer ${token}`;
            } else {
                // redirectToLoginInternal was likely called by refreshTokenInternal if it failed critically.
                // If not (e.g., no refresh token initially), this ensures redirection.
                if(!getRefreshTokenInternal()) redirectToLoginInternal('Please log in to access this content.');
                return Promise.reject(new Error('Authentication required and refresh failed. User should be redirected.'));
            }
        }
    }
    // If isPublicCall, no Authorization header is added unless explicitly provided in options.headers.

    const fullUrl = `${BASE_API_URL}${relativeUrl.startsWith('/') ? relativeUrl : '/' + relativeUrl}`;

    try {
        let response = await fetch(fullUrl, { ...options, headers });

        if (response.status === 401 && !isPublicCall) {
            console.warn(`apiUtils (fetchAuth): Unauthorized (401) for ${fullUrl}. Attempting token refresh.`);
            const newAccessToken = await refreshTokenInternal();

            if (newAccessToken) {
                headers['Authorization'] = `Bearer ${newAccessToken}`;
                console.log(`apiUtils (fetchAuth): Retrying ${fullUrl} with new token.`);
                response = await fetch(fullUrl, { ...options, headers });
            } else {
                throw new Error('Session refresh failed and user should have been redirected.');
            }
        }
        return response;
    } catch (error) {
        console.error(`apiUtils (fetchAuth): Fetch API error for ${fullUrl}:`, error.message);
        if (error.name === 'TypeError' && error.message.toLowerCase().includes('failed to fetch')) {
            console.error("apiUtils (fetchAuth): Network error. Check connection and server status.");
        }
        throw error;
    }
}

// --- Specific API Call Functions (Public Interface) ---

async function registerUser(userData) {
    try {
        const response = await fetch(`${BASE_API_URL}/users/register/`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(userData),
        });
        const data = await response.json();
        if (!response.ok) {
            let errorMessage = "Registration failed.";
            if (data.detail) errorMessage = data.detail;
            else if (typeof data === 'object' && Object.keys(data).length > 0) {
                errorMessage = Object.entries(data)
                    .map(([field, errors]) => `${field.replace(/_/g, ' ')}: ${Array.isArray(errors) ? errors.join(', ') : errors}`)
                    .join('; ');
            } else if (response.statusText) {
                errorMessage = `Registration failed: ${response.statusText} (Status: ${response.status})`;
            }
            throw new Error(errorMessage);
        }
        return data;
    } catch (error) {
        console.error("apiUtils (registerUser):", error);
        throw error;
    }
}

async function loginUser(email, password) {
    try {
        const response = await fetch(`${BASE_API_URL}/users/login/`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password }),
        });
        const data = await response.json();
        if (!response.ok) {
            throw new Error(data.detail || `Login failed. Please check your credentials.`);
        }
        storeTokensInternal(data.access, data.refresh);
        if (data.user) {
            storeUserDataInternal({
                id: data.user.id,
                email: data.user.email,
                full_name: data.user.full_name,
                is_instructor: data.user.is_instructor,
            });
        }
        window.dispatchEvent(new CustomEvent('authChanged', { detail: { loggedIn: true, user: getUserDataInternal() } }));
        return data;
    } catch (error) {
        console.error("apiUtils (loginUser):", error);
        throw error;
    }
}

async function logoutUser() {
    const refreshTokenValue = getRefreshTokenInternal();
    const backendLogoutEnabled = typeof UPLAS_CONFIG !== 'undefined' && UPLAS_CONFIG.BACKEND_LOGOUT_ENABLED;

    if (refreshTokenValue && backendLogoutEnabled) {
        try {
            await fetchAuthenticatedInternal('/users/logout/', {
                method: 'POST',
                body: JSON.stringify({ refresh: refreshTokenValue })
            });
            console.info('apiUtils (logoutUser): Backend logout request sent.');
        } catch (error) {
            console.warn('apiUtils (logoutUser): Backend logout call failed, clearing local session anyway:', error.message);
        }
    }
    const previousUserData = getUserDataInternal();
    clearTokensAndUserDataInternal();
    window.dispatchEvent(new CustomEvent('authChanged', { detail: { loggedIn: false, user: null, previousUser: previousUserData } }));
    redirectToLoginInternal('You have been successfully logged out.');
}

async function fetchUserProfile() {
    try {
        const response = await fetchAuthenticatedInternal('/users/profile/');
        if (!response.ok) {
            const errorData = await response.json().catch(() => ({ detail: `Failed to fetch profile. Status: ${response.status}` }));
            // If 401, fetchAuthenticatedInternal would have tried to refresh and potentially redirected.
            // If it's still 401 or another error, it means session is invalid or server issue.
            if (response.status === 401) { // If retry also failed with 401
                redirectToLoginInternal("Your session is invalid. Please log in again.");
            }
            throw new Error(errorData.detail || `HTTP error fetching profile! Status: ${response.status}`);
        }
        const profileData = await response.json();
        const oldUserData = getUserDataInternal();
        storeUserDataInternal(profileData);
        if (JSON.stringify(oldUserData) !== JSON.stringify(profileData)) {
            window.dispatchEvent(new CustomEvent('authChanged', { detail: { loggedIn: true, user: profileData } }));
        }
        return profileData;
    } catch (error) {
        console.error("apiUtils (fetchUserProfile):", error);
        // If the error message indicates a redirect happened, we don't need to do it again.
        if (!error.message.toLowerCase().includes('redirected')) {
            // For other errors, or if refresh was impossible (no refresh token), ensure user is logged out if appropriate
             if(!getAccessTokenInternal() && !getRefreshTokenInternal()){
                redirectToLoginInternal("Could not verify your session. Please log in.");
             }
        }
        throw error; // Re-throw for the caller, which might be initializeUserSession
    }
}

// --- Application Initialization ---

async function initializeUserSession() {
    const accessToken = getAccessTokenInternal();
    const refreshTokenValue = getRefreshTokenInternal();

    if (isCurrentlyRefreshingTokenGlobal) {
        console.log("apiUtils (initSession): Waiting for ongoing token refresh.");
        return new Promise((resolve) => {
            subscribeToTokenRefreshInternal(async (error, newAccessToken) => {
                if (error || !newAccessToken) {
                    console.log("apiUtils (initSession): Queued refresh failed.");
                    window.dispatchEvent(new CustomEvent('authChanged', { detail: { loggedIn: false, user: null } }));
                    resolve(null);
                } else {
                    try {
                        console.log("apiUtils (initSession): Queued refresh succeeded, fetching profile.");
                        const profile = await fetchUserProfile();
                        window.dispatchEvent(new CustomEvent('authChanged', { detail: { loggedIn: true, user: profile } }));
                        resolve(profile);
                    } catch (profileError) {
                        console.error("apiUtils (initSession): Profile fetch failed after queued refresh.", profileError);
                        window.dispatchEvent(new CustomEvent('authChanged', { detail: { loggedIn: false, user: null } }));
                        resolve(null);
                    }
                }
            });
        });
    }

    let currentUserData = null;
    if (refreshTokenValue) { // If there's a refresh token, a session might be recoverable
        if (!accessToken) {
            console.info('apiUtils (initSession): No access token, attempting refresh with existing refresh token...');
            const newAccessToken = await refreshTokenInternal(); // This handles redirect on critical failure
            if (newAccessToken) {
                try { currentUserData = await fetchUserProfile(); } // Validate new session
                catch (profileError) {
                    console.error('apiUtils (initSession): Failed to fetch profile after initial refresh:', profileError.message);
                    // refreshTokenInternal or fetchUserProfile would have handled critical auth errors/redirects
                }
            }
            // If newAccessToken is null, refreshTokenInternal already redirected.
        } else { // Have both access and refresh: validate access token by fetching profile
            console.info('apiUtils (initSession): Access token found, validating session by fetching profile...');
            try { currentUserData = await fetchUserProfile(); } // This handles its own 401s (triggers refresh)
            catch (error) {
                console.warn('apiUtils (initSession): Failed to fetch profile with existing access token (refresh might have been triggered or failed):', error.message);
            }
        }
    } else { // No refresh token (implies no access token either, or they were cleared)
        console.info('apiUtils (initSession): No refresh token found. User is not logged in.');
        clearTokensAndUserDataInternal(); // Ensure everything is cleared
    }

    // Dispatch authChanged based on the outcome
    if (currentUserData) {
        console.log("apiUtils (initSession): Session initialized successfully for user:", currentUserData.email);
        window.dispatchEvent(new CustomEvent('authChanged', { detail: { loggedIn: true, user: currentUserData } }));
    } else {
        console.log("apiUtils (initSession): Session initialization failed or no active session.");
        // Ensure tokens are cleared if initialization ultimately fails to get user data
        if(getAccessTokenInternal() || getRefreshTokenInternal()){ // If tokens still exist but no user data
            clearTokensAndUserDataInternal();
        }
        window.dispatchEvent(new CustomEvent('authChanged', { detail: { loggedIn: false, user: null } }));
    }
    return currentUserData;
}

// --- Expose Public API via window.uplasApi ---
window.uplasApi = {
    BASE_API_URL,
    AUTH_REDIRECT_MESSAGE_KEY,
    getAccessToken: getAccessTokenInternal,
    getUserData: getUserDataInternal,
    storeUserData: storeUserDataInternal,
    clearTokensAndUserData: clearTokensAndUserDataInternal,
    redirectToLogin: redirectToLoginInternal,
    displayFormStatus: displayFormStatusInternal,
    fetchAuthenticated: fetchAuthenticatedInternal,
    registerUser,
    loginUser,
    logoutUser,
    fetchUserProfile,
    initializeUserSession,
};

console.info('apiUtils.js: uplasApi utility initialized and ready. Access functions via window.uplasApi.*');
