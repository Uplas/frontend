// Uplas Frontend: js/apiUtils.js
// Utility for making authenticated API requests and managing user sessions.

// --- Configuration ---
const BASE_API_URL = (typeof UPLAS_CONFIG !== 'undefined' && UPLAS_CONFIG.BASE_API_URL)
    ? UPLAS_CONFIG.BASE_API_URL
    : '/api'; // Default fallback

const ACCESS_TOKEN_KEY = 'uplasAccessToken';
const REFRESH_TOKEN_KEY = 'uplasRefreshToken';
const USER_DATA_KEY = 'uplasUserData';
const AUTH_REDIRECT_MESSAGE_KEY = 'uplasAuthRedirectMessage';

// --- Token Management ---

function getAccessTokenInternal() {
    return localStorage.getItem(ACCESS_TOKEN_KEY);
}

function getRefreshTokenInternal() {
    return localStorage.getItem(REFRESH_TOKEN_KEY);
}

function storeTokensInternal(accessToken, refreshTokenValue) {
    if (accessToken) {
        localStorage.setItem(ACCESS_TOKEN_KEY, accessToken);
    }
    if (refreshTokenValue) {
        localStorage.setItem(REFRESH_TOKEN_KEY, refreshTokenValue);
    }
}

function clearTokensAndUserDataInternal() {
    localStorage.removeItem(ACCESS_TOKEN_KEY);
    localStorage.removeItem(REFRESH_TOKEN_KEY);
    localStorage.removeItem(USER_DATA_KEY);
}

function storeUserDataInternal(userData) {
    if (userData) {
        localStorage.setItem(USER_DATA_KEY, JSON.stringify(userData));
    } else {
        localStorage.removeItem(USER_DATA_KEY);
    }
}

function getUserDataInternal() {
    const data = localStorage.getItem(USER_DATA_KEY);
    try {
        return data ? JSON.parse(data) : null;
    } catch (e) {
        console.error("apiUtils: Error parsing user data from localStorage", e);
        localStorage.removeItem(USER_DATA_KEY);
        return null;
    }
}

// --- Redirection & UI ---

/**
 * Redirects the user to the login page (index.html), optionally with a message and specific hash.
 * @param {string} [message] - An optional message to display on the login page.
 * @param {string} [targetHash='#auth-section'] - Optional hash to append (e.g., '#auth-section', or '/' for no hash).
 */
function redirectToLoginInternal(message, targetHash = '#auth-section') { // Added targetHash parameter
    clearTokensAndUserDataInternal();
    if (message) {
        sessionStorage.setItem(AUTH_REDIRECT_MESSAGE_KEY, message);
    }

    const loginPath = '/index.html'; // Assuming index.html is your login/landing page

    const currentPathname = window.location.pathname;
    const currentHashValue = window.location.hash;

    // Check if already on the target page/section to prevent redirect loop
    const isOnTargetPage = currentPathname.endsWith(loginPath) || currentPathname.endsWith(loginPath + '/');
    const isOnTargetHash = (targetHash === '/' || targetHash === '') ? (currentHashValue === '' || currentHashValue === '#') : currentHashValue === targetHash;

    if (isOnTargetPage && isOnTargetHash) {
        console.log("apiUtils: Already on the target login page/section. Message (if any) should be displayed by page logic.");
        // Optionally, try to display message if an auth section exists
        if (message && document.getElementById('auth-section') && typeof displayFormStatusInternal === 'function') {
            // displayFormStatusInternal(document.getElementById('auth-section'), message, true);
        }
        return;
    }

    // Construct the final URL: if targetHash is '/' or empty, redirect to base index.html
    const finalRedirectURL = `${loginPath}${(targetHash === '/' || targetHash === '') ? '' : targetHash}`;
    window.location.href = finalRedirectURL;
}


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
        statusElement = formElement.querySelector('.form-status-message'); // For broader compatibility
    }
    if (!statusElement) { // Create if not found
        statusElement = document.createElement('div');
        statusElement.className = 'form__status';
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
    const statusType = message.toLowerCase().includes('loading...') || message.toLowerCase().includes('processing...') || message.toLowerCase().includes('sending...') ? 'loading' : (isError ? 'error' : 'success');
    statusElement.classList.add(`form__status--${statusType}`);

    statusElement.style.display = 'block';
    statusElement.hidden = false; // Ensure it's not hidden by attribute
    statusElement.setAttribute('role', isError ? 'alert' : 'status');
    statusElement.setAttribute('aria-live', isError ? 'assertive' : 'polite');

    if (statusType === 'success') {
        setTimeout(() => {
            if (statusElement) {
                statusElement.style.display = 'none';
                statusElement.textContent = '';
            }
        }, 7000);
    }
}

function clearFormStatusInternal(formElementOrSelector) {
    const formElement = typeof formElementOrSelector === 'string'
        ? document.querySelector(formElementOrSelector)
        : formElementOrSelector;
    if (!formElement) return;
    let statusElement = formElement.querySelector('.form__status') || formElement.querySelector('.form-status-message');
    if (statusElement) {
        statusElement.textContent = '';
        statusElement.style.display = 'none';
        statusElement.hidden = true;
        statusElement.classList.remove('form__status--success', 'form__status--error', 'form__status--loading');
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
        redirectToLoginInternal('Your session has ended. Please log in.'); // Redirect if no refresh token
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
            storeTokensInternal(data.access, data.refresh); // Ensure new refresh token is stored if provided
            console.info('apiUtils (refreshToken): Token refreshed successfully.');
            onTokenRefreshedInternal(null, data.access);
            return data.access;
        } else {
            console.warn('apiUtils (refreshToken): Failed to refresh token. Status:', response.status);
            const errorData = await response.json().catch(() => ({ detail: `Token refresh request failed, status ${response.status}` }));
            onTokenRefreshedInternal(new Error(errorData.detail || 'Token refresh failed definitively.'), null);
            redirectToLoginInternal('Your session has expired. Please log in again.'); // Critical failure, redirect
            return null;
        }
    } catch (error) {
        console.error('apiUtils (refreshToken): Network or other error during token refresh:', error);
        onTokenRefreshedInternal(error, null);
        redirectToLoginInternal('Could not re-establish session due to a network problem. Please log in again.'); // Network error, redirect
        return null;
    } finally {
        isCurrentlyRefreshingTokenGlobal = false;
    }
}

async function fetchAuthenticatedInternal(relativeUrl, options = {}) {
    const isPublicCall = options.isPublic === true;
    let originalRequestBody = options.body; // Store original body for retries if it's FormData

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
                // If body was FormData, it cannot be re-used directly after being consumed.
                // The caller should handle re-creating FormData if retries are common for such requests.
                // For JSON, stringifying again is fine.
                if (originalRequestBody instanceof FormData) {
                     console.warn("apiUtils (fetchAuth): Retrying FormData request after token refresh. FormData might need to be re-created by caller if issues arise.");
                }
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

    // Set Content-Type to application/json by default, unless it's FormData or already set
    if (!(options.body instanceof FormData) && !headers['Content-Type']) {
        headers['Content-Type'] = 'application/json';
    }
    // For FormData, the browser will set the Content-Type with the correct boundary. Do not set it manually.
    if (options.body instanceof FormData) {
        delete headers['Content-Type'];
    }


    if (!isPublicCall) {
        if (token) {
            headers['Authorization'] = `Bearer ${token}`;
        } else {
            console.warn(`apiUtils (fetchAuth): No access token for protected URL: ${relativeUrl}. Attempting refresh.`);
            const newAccessTokenViaRefresh = await refreshTokenInternal();
            if (newAccessTokenViaRefresh) {
                token = newAccessTokenViaRefresh;
                headers['Authorization'] = `Bearer ${token}`;
            } else {
                // redirectToLoginInternal was called by refreshTokenInternal if it failed critically.
                // This reject ensures the promise chain is broken for the original caller.
                return Promise.reject(new Error('Authentication required and session refresh failed.'));
            }
        }
    }

    const fullUrl = `${BASE_API_URL}${relativeUrl.startsWith('/') ? relativeUrl : '/' + relativeUrl}`;

    try {
        let response = await fetch(fullUrl, { ...options, headers });

        if (response.status === 401 && !isPublicCall) {
            console.warn(`apiUtils (fetchAuth): Unauthorized (401) for ${fullUrl}. Attempting token refresh for the second time.`);
            const newAccessToken = await refreshTokenInternal(); // This will redirect if it fails critically

            if (newAccessToken) {
                headers['Authorization'] = `Bearer ${newAccessToken}`;
                // Re-clone FormData if it was the original body, as it might have been consumed.
                // This is a basic attempt; complex FormData might need more sophisticated handling.
                let bodyForRetry = options.body;
                if (originalRequestBody instanceof FormData) {
                     console.warn("apiUtils (fetchAuth): Retrying FormData request after 401. FormData might need to be re-created by caller if issues arise.");
                     // For simplicity, we assume originalRequestBody is still valid or the caller handles FormData immutability.
                     // A more robust solution would involve the caller passing a function to re-generate FormData.
                     bodyForRetry = originalRequestBody;
                }


                console.log(`apiUtils (fetchAuth): Retrying ${fullUrl} with newly refreshed token.`);
                response = await fetch(fullUrl, { ...options, headers, body: bodyForRetry });
            } else {
                // If newAccessToken is null here, refreshTokenInternal has already initiated a redirect.
                // Throw an error to break the promise chain for the original caller.
                throw new Error('Session refresh failed and user should have been redirected.');
            }
        }
        return response;
    } catch (error) {
        console.error(`apiUtils (fetchAuth): Fetch API error for ${fullUrl}:`, error.message);
        if (error.name === 'TypeError' && error.message.toLowerCase().includes('failed to fetch')) {
            console.error("apiUtils (fetchAuth): This is a Network error. Please check your internet connection and if the backend server is running at the configured BASE_API_URL.");
        }
        throw error; // Re-throw for the calling function to handle
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
                    .map(([field, errors]) => `${field.replace(/_/g, ' ')}: ${Array.isArray(errors) ? errors.join(', ') : String(errors)}`)
                    .join('; ');
            } else if (response.statusText) {
                errorMessage = `Registration failed: ${response.statusText} (Status: ${response.status})`;
            }
            throw new Error(errorMessage);
        }
        return data; // Should be user data or success message from backend
    } catch (error) {
        console.error("apiUtils (registerUser):", error);
        throw error; // Re-throw for the caller (e.g., uhome.js) to handle
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
            // Prefer backend's error message (data.detail) if available
            throw new Error(data.detail || `Login failed. Please check your credentials.`);
        }
        storeTokensInternal(data.access, data.refresh);
        if (data.user) { // Assuming backend sends user details on login
            storeUserDataInternal({
                id: data.user.id,
                email: data.user.email,
                full_name: data.user.full_name,
                is_instructor: data.user.is_instructor,
                // Add any other relevant fields like 'profile_picture_url', 'career_interest'
                profile_picture_url: data.user.profile_picture_url,
                career_interest: data.user.career_interest,
            });
        }
        // Dispatch event after storing data, so listeners get the most up-to-date info
        window.dispatchEvent(new CustomEvent('authChanged', { detail: { loggedIn: true, user: getUserDataInternal() } }));
        return data; // Return full response data (tokens, user info, message)
    } catch (error) {
        console.error("apiUtils (loginUser):", error);
        throw error; // Re-throw for uhome.js to display
    }
}

async function logoutUser() {
    const refreshTokenValue = getRefreshTokenInternal();
    const backendLogoutEnabled = (typeof UPLAS_CONFIG !== 'undefined' && UPLAS_CONFIG.BACKEND_LOGOUT_ENABLED === true);

    if (refreshTokenValue && backendLogoutEnabled) {
        try {
            // This call should be authenticated if your backend requires it for logout/blacklisting
            await fetchAuthenticatedInternal('/users/logout/', { // Endpoint for backend token blacklisting
                method: 'POST',
                body: JSON.stringify({ refresh: refreshTokenValue })
                // `fetchAuthenticatedInternal` will add Authorization header if token exists
            });
            console.info('apiUtils (logoutUser): Backend logout request successfully sent.');
        } catch (error) {
            // Log warning but proceed with local logout; backend might have already invalidated token or session.
            console.warn('apiUtils (logoutUser): Backend logout call failed or was not reachable. Clearing local session anyway:', error.message);
        }
    }
    const previousUserData = getUserDataInternal(); // Get user data before clearing
    clearTokensAndUserDataInternal();
    window.dispatchEvent(new CustomEvent('authChanged', { detail: { loggedIn: false, user: null, previousUser: previousUserData } }));
    // Redirect to the plain homepage, not the auth section
    redirectToLoginInternal('You have been successfully logged out.', '/');
}


async function fetchUserProfile() {
    try {
        const response = await fetchAuthenticatedInternal('/users/profile/'); // This requires authentication
        if (!response.ok) {
            const errorData = await response.json().catch(() => ({ detail: `Failed to fetch profile. Status: ${response.status}` }));
            if (response.status === 401) { // Should have been handled by refresh, but double check
                redirectToLoginInternal("Your session is invalid. Please log in again.");
            }
            throw new Error(errorData.detail || `HTTP error fetching profile! Status: ${response.status}`);
        }
        const profileData = await response.json();
        const oldUserData = getUserDataInternal();
        storeUserDataInternal(profileData); // Update stored user data
        // Dispatch authChanged only if data actually changed, or always if simpler
        if (JSON.stringify(oldUserData) !== JSON.stringify(profileData)) {
            window.dispatchEvent(new CustomEvent('authChanged', { detail: { loggedIn: true, user: profileData } }));
        }
        return profileData;
    } catch (error) {
        console.error("apiUtils (fetchUserProfile): Error fetching user profile ->", error.message);
        // If the error indicates redirection already happened or token refresh failed, don't re-redirect.
        // Check if tokens are still present. If not, user is effectively logged out.
        if (!getAccessTokenInternal() && !getRefreshTokenInternal() && !error.message.toLowerCase().includes('redirected')) {
             redirectToLoginInternal("Could not verify your session. Please log in.");
        }
        throw error; // Re-throw for the caller to handle UI updates if needed
    }
}

// --- Application Initialization ---

async function initializeUserSession() {
    const accessToken = getAccessTokenInternal();
    const refreshTokenValue = getRefreshTokenInternal();

    if (isCurrentlyRefreshingTokenGlobal) {
        console.log("apiUtils (initSession): Waiting for ongoing token refresh to complete.");
        return new Promise((resolve) => {
            subscribeToTokenRefreshInternal(async (error, newAccessToken) => {
                if (error || !newAccessToken) {
                    console.log("apiUtils (initSession): Queued token refresh failed during initialization.");
                    window.dispatchEvent(new CustomEvent('authChanged', { detail: { loggedIn: false, user: null } }));
                    resolve(null); // Resolve with null as session couldn't be established
                } else {
                    try {
                        console.log("apiUtils (initSession): Queued token refresh succeeded. Fetching profile to validate session.");
                        const profile = await fetchUserProfile(); // This will use the new token
                        // fetchUserProfile already dispatches 'authChanged' if data changes
                        resolve(profile); // Resolve with profile data
                    } catch (profileError) {
                        console.error("apiUtils (initSession): Profile fetch failed after queued token refresh.", profileError);
                        // fetchUserProfile would have handled redirection on critical auth failure
                        // Ensure authChanged reflects logged-out state if profile fetch fails for other reasons too.
                        window.dispatchEvent(new CustomEvent('authChanged', { detail: { loggedIn: false, user: null } }));
                        resolve(null);
                    }
                }
            });
        });
    }

    let currentUserData = null;
    if (refreshTokenValue) { // If there's a refresh token, a session might be active or recoverable
        if (!accessToken) { // Access token might have expired or been cleared
            console.info('apiUtils (initSession): No access token, but refresh token exists. Attempting refresh...');
            const newAccessToken = await refreshTokenInternal(); // This handles redirect on critical failure
            if (newAccessToken) { // If refresh was successful
                try {
                    currentUserData = await fetchUserProfile(); // Validate new session by fetching profile
                } catch (profileError) {
                    console.error('apiUtils (initSession): Failed to fetch profile after initial token refresh:', profileError.message);
                    // refreshTokenInternal or fetchUserProfile would have handled critical auth errors/redirects
                }
            }
            // If newAccessToken is null, refreshTokenInternal has already initiated a redirect.
        } else { // Both access and refresh tokens exist, try to validate the access token
            console.info('apiUtils (initSession): Access and refresh tokens found. Validating session by fetching profile...');
            try {
                currentUserData = await fetchUserProfile(); // This attempts fetch, and handles 401 with refresh internally
            } catch (error) {
                console.warn('apiUtils (initSession): Failed to fetch profile with existing access token (refresh might have been triggered or failed):', error.message);
                // If fetchUserProfile fails (even after a refresh attempt), currentUserData will remain null.
                // The fetchUserProfile itself would handle redirection for critical auth errors.
            }
        }
    } else { // No refresh token, definitely not logged in
        console.info('apiUtils (initSession): No refresh token found. User is considered not logged in.');
        clearTokensAndUserDataInternal(); // Ensure local state is clean
    }

    // Final dispatch based on whether currentUserData was successfully fetched
    if (currentUserData) {
        console.log("apiUtils (initSession): User session initialized. User:", currentUserData.email);
        // Note: fetchUserProfile already dispatches 'authChanged' if data changes.
        // This dispatch ensures it happens even if data didn't change but session is confirmed.
        // To avoid duplicate events if data hasn't changed, this could be conditional.
        // For simplicity now, it might dispatch again, which should be harmless if UI updates are idempotent.
        window.dispatchEvent(new CustomEvent('authChanged', { detail: { loggedIn: true, user: currentUserData } }));
    } else {
        console.log("apiUtils (initSession): User session could not be initialized or no active session.");
        if(getAccessTokenInternal() || getRefreshTokenInternal()){ // Defensive: if tokens exist but no user data
            clearTokensAndUserDataInternal(); // Clean up inconsistent state
        }
        window.dispatchEvent(new CustomEvent('authChanged', { detail: { loggedIn: false, user: null } }));
    }
    return currentUserData; // Return the user data (or null)
}

function escapeHTMLInternal(str) {
    if (typeof str !== 'string') return '';
    return str.replace(/[&<>'"]/g,
        tag => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[tag] || tag)
    );
}

// --- Expose Public API via window.uplasApi ---
window.uplasApi = {
    BASE_API_URL,
    AUTH_REDIRECT_MESSAGE_KEY,
    getAccessToken: getAccessTokenInternal,
    getRefreshToken: getRefreshTokenInternal, // Exposing for potential advanced use, though typically internal
    getUserData: getUserDataInternal,
    storeUserData: storeUserDataInternal,
    clearTokensAndUserData: clearTokensAndUserDataInternal, // Exposing for explicit logout scenarios if needed outside logoutUser
    redirectToLogin: redirectToLoginInternal,
    displayFormStatus: displayFormStatusInternal,
    clearFormStatus: clearFormStatusInternal, // Added clear function
    fetchAuthenticated: fetchAuthenticatedInternal,
    registerUser,
    loginUser,
    logoutUser,
    fetchUserProfile,
    initializeUserSession,
    escapeHTML: escapeHTMLInternal, // Added escapeHTML
};

console.info('apiUtils.js: Uplas API utility initialized. Functions are available via window.uplasApi.*');
