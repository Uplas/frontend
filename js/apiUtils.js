// Uplas Frontend: js/apiUtils.js
// Utility for making authenticated API requests and managing user sessions.
'use strict';

// --- Configuration ---
// This configuration assumes your backend API is served from the same domain.
// If your API is on a different domain (e.g., https://api.uplas.me), you must configure CORS on your Django backend.
const BASE_API_URL = '/api/v1'; // Example: /api/v1

const ACCESS_TOKEN_KEY = 'uplasAccessToken';
const REFRESH_TOKEN_KEY = 'uplasRefreshToken';
const USER_DATA_KEY = 'uplasUserData';

// --- Token & User Data Management ---

function getAccessTokenInternal() {
    return localStorage.getItem(ACCESS_TOKEN_KEY);
}

function getRefreshTokenInternal() {
    return localStorage.getItem(REFRESH_TOKEN_KEY);
}

function storeTokensInternal(accessToken, refreshTokenValue) {
    if (accessToken) localStorage.setItem(ACCESS_TOKEN_KEY, accessToken);
    if (refreshTokenValue) localStorage.setItem(REFRESH_TOKEN_KEY, refreshTokenValue);
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
        return null;
    }
}

function isUserLoggedInInternal() {
    return !!getAccessTokenInternal();
}


// --- UI & Redirection ---

function redirectToLoginInternal(message) {
    clearTokensAndUserDataInternal();
    if (message) {
        sessionStorage.setItem('uplasAuthRedirectMessage', message);
    }
    const loginPath = '/index.html#auth-section';
    if (window.location.pathname + window.location.hash !== loginPath) {
        window.location.href = loginPath;
    }
}

function displayFormStatusInternal(formElement, message, isError = false) {
    if (!formElement) return;
    const statusElement = formElement.querySelector('.form-status-message');
    if (!statusElement) return;

    statusElement.textContent = message;
    statusElement.className = 'form-status-message'; // Reset classes
    statusElement.classList.add(isError ? 'error' : 'success');
    statusElement.style.display = 'block';
}

// --- Core API Call Logic ---

let isCurrentlyRefreshingToken = false;
let tokenRefreshSubscribers = [];

async function refreshTokenInternal() {
    if (isCurrentlyRefreshingToken) {
        return new Promise(resolve => tokenRefreshSubscribers.push(resolve));
    }
    isCurrentlyRefreshingToken = true;

    const currentRefreshToken = getRefreshTokenInternal();
    if (!currentRefreshToken) {
        isCurrentlyRefreshingToken = false;
        redirectToLoginInternal('Your session has expired. Please log in again.');
        return null;
    }

    try {
        const response = await fetch(`${BASE_API_URL}/users/token/refresh/`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ refresh: currentRefreshToken }),
        });

        if (response.ok) {
            const data = await response.json();
            storeTokensInternal(data.access, data.refresh);
            tokenRefreshSubscribers.forEach(resolve => resolve(data.access));
            isCurrentlyRefreshingToken = false;
            tokenRefreshSubscribers = [];
            return data.access;
        } else {
            throw new Error('Token refresh failed');
        }
    } catch (error) {
        console.error('apiUtils (refreshToken):', error);
        tokenRefreshSubscribers.forEach(resolve => resolve(null));
        isCurrentlyRefreshingToken = false;
        tokenRefreshSubscribers = [];
        redirectToLoginInternal('Your session has expired. Please log in again.');
        return null;
    }
}

async function fetchAuthenticatedInternal(relativeUrl, options = {}) {
    let token = getAccessTokenInternal();
    if (!token && !options.isPublic) {
        token = await refreshTokenInternal();
        if (!token) return Promise.reject(new Error('Authentication required.'));
    }

    const headers = { ...options.headers };
    if (!(options.body instanceof FormData)) {
        headers['Content-Type'] = 'application/json';
    }
    if (token && !options.isPublic) {
        headers['Authorization'] = `Bearer ${token}`;
    }

    const fullUrl = `${BASE_API_URL}${relativeUrl}`;
    let response = await fetch(fullUrl, { ...options, headers });

    if (response.status === 401 && !options.isPublic) {
        const newAccessToken = await refreshTokenInternal();
        if (newAccessToken) {
            headers['Authorization'] = `Bearer ${newAccessToken}`;
            response = await fetch(fullUrl, { ...options, headers });
        } else {
            return Promise.reject(new Error('Session refresh failed.'));
        }
    }
    return response;
}

// --- Public API Functions ---

async function registerUser(userData) {
    const response = await fetchAuthenticatedInternal('/users/register/', {
        method: 'POST',
        body: JSON.stringify(userData),
        isPublic: true,
    });
    const data = await response.json();
    if (!response.ok) {
        const errorMsg = data.email?.[0] || data.password?.[0] || Object.values(data).flat().join(' ');
        throw new Error(errorMsg || 'Registration failed.');
    }
    return data;
}

async function loginUser(email, password) {
    const response = await fetchAuthenticatedInternal('/users/login/', {
        method: 'POST',
        body: JSON.stringify({ email, password }),
        isPublic: true,
    });
    const data = await response.json();
    if (!response.ok) {
        throw new Error(data.detail || 'Login failed. Please check your credentials.');
    }
    storeTokensInternal(data.access, data.refresh);
    if (data.user) {
        storeUserDataInternal(data.user);
    }
    window.dispatchEvent(new CustomEvent('authChanged', { detail: { loggedIn: true, user: data.user } }));
    return data;
}

function logoutUser() {
    const refreshTokenValue = getRefreshTokenInternal();
    if (refreshTokenValue) {
        fetchAuthenticatedInternal('/users/logout/', {
            method: 'POST',
            body: JSON.stringify({ refresh: refreshTokenValue }),
        }).catch(err => console.warn("Backend logout failed, proceeding with local.", err));
    }
    clearTokensAndUserDataInternal();
    window.dispatchEvent(new CustomEvent('authChanged', { detail: { loggedIn: false, user: null } }));
}

async function initializeUserSession() {
    if (isUserLoggedInInternal()) {
        try {
            const response = await fetchAuthenticatedInternal('/users/profile/');
            if (!response.ok) throw new Error('Invalid session');
            const profileData = await response.json();
            storeUserDataInternal(profileData);
            window.dispatchEvent(new CustomEvent('authChanged', { detail: { loggedIn: true, user: profileData } }));
            return profileData;
        } catch (error) {
            logoutUser(); // Clears invalid/expired tokens
            return null;
        }
    }
    // Ensure UI is in logged-out state if no token
    window.dispatchEvent(new CustomEvent('authChanged', { detail: { loggedIn: false, user: null } }));
    return null;
}

// --- Expose Public API ---
window.uplasApi = {
    isUserLoggedIn: isUserLoggedInInternal,
    getUserData: getUserDataInternal,
    displayFormStatus: displayFormStatusInternal,
    fetchAuthenticated: fetchAuthenticatedInternal,
    registerUser,
    loginUser,
    logoutUser,
    initializeUserSession,
};

console.info('apiUtils.js: Uplas API utility initialized.');
