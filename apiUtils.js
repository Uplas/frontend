// Conceptual function in your frontend JS (e.g., in a utility file)

async function fetchAuthenticated(apiUrl, options = {}) {
    const accessToken = localStorage.getItem('accessToken'); // Or get from sessionStorage/memory

    const headers = {
        'Content-Type': 'application/json',
        ...options.headers, // Allow overriding/adding headers
    };

    if (accessToken) {
        headers['Authorization'] = `Bearer ${accessToken}`;
    } else {
        // Handle case where user should be logged in but token is missing
        console.warn("No access token found for authenticated request.");
        // Optional: Redirect to login
        // window.location.href = '/login'; 
        // throw new Error("User not authenticated."); // Or throw error
    }

    try {
        const response = await fetch(apiUrl, {
            ...options, // Spread other options like method, body
            headers: headers,
        });

        if (response.status === 401) {
             // --- Handle Unauthorized ---
             console.error("API request unauthorized (401). Token might be expired.");
             // Option 1: Try to refresh the token (Requires refresh token logic)
             // const refreshed = await refreshToken(); // Implement refreshToken function
             // if (refreshed) {
             //    // Retry the original request with the new token
             //    return fetchAuthenticated(apiUrl, options); 
             // } else {
             //    // Refresh failed, redirect to login
             //    window.location.href = '/login'; // Adjust login page URL
             //    throw new Error("Session expired. Please login again.");
             // }
             
             // Option 2: Simple redirect to login
             // alert("Your session has expired. Please login again.");
             // window.location.href = '/login'; // Adjust login page URL
             throw new Error("Authentication required."); 
        }

        if (!response.ok) {
            // Handle other errors (4xx, 5xx)
            let errorData;
            try {
                 errorData = await response.json(); // Try to get error details from response body
            } catch (e) {
                 errorData = { detail: `HTTP error! status: ${response.status}` };
            }
            console.error("API Error Data:", errorData);
            throw new Error(errorData.detail || `Request failed with status ${response.status}`);
        }

        // Handle responses with no content (e.g., 204 No Content for DELETE)
        if (response.status === 204) {
             return null; // Or return {} or true based on expected outcome
        }
        
        // Assuming successful response has JSON body
        return await response.json(); 

    } catch (error) {
        console.error('Fetch Authenticated Error:', error);
        // Re-throw the error so the calling code can handle it (e.g., display message to user)
        throw error; 
    }
}

// --- Example Usage ---
/*
async function getUserProfile() {
    try {
        const profileData = await fetchAuthenticated('/api/users/profile/'); // GET request
        console.log("Profile:", profileData);
        // Update UI with profile data
    } catch (error) {
        console.error("Failed to load profile:", error);
        // Show error message in UI
    }
}

async function updateProject(projectId, projectData) {
     try {
        const updatedProject = await fetchAuthenticated(`/api/projects/${projectId}/`, {
             method: 'PUT', // Or PATCH
             body: JSON.stringify(projectData)
        });
        console.log("Project Updated:", updatedProject);
        // Update UI or show success message
     } catch (error) {
         console.error("Failed to update project:", error);
         // Show error message
     }
}

// Call these functions when needed
// getUserProfile(); 
*/

// NOTE: Implement the refreshToken() function if you need automatic token refresh.
// This involves using the stored refresh token to call your `/api/users/login/refresh/` endpoint.
