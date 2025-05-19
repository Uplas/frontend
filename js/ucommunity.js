
// js/ucommunity.js
/* ==========================================================================
   Uplas Community Platform JavaScript (ucommunity.js)
   - Handles career selection, post creation, feed loading, filtering, interactions.
   - Relies on global.js for theme, nav, language.
   ========================================================================== */
'use strict';

document.addEventListener('DOMContentLoaded', () => {
    // --- Global Element Selectors ---
    const careerSelectionModal = document.getElementById('career-selection-modal');
    const careerSelectionForm = document.getElementById('career-selection-form');
    const careerInterestSelect = document.getElementById('career-interest-select');
    const otherCareerGroup = document.getElementById('other-career-group');
    const otherCareerInput = document.getElementById('other-career-input');

    const createPostModal = document.getElementById('create-post-modal');
    const createPostBtnSidebar = document.getElementById('create-post-btn-sidebar'); // Button in sidebar
    const closeCreatePostModalBtn = document.getElementById('close-create-post-modal-btn');
    const createPostForm = document.getElementById('create-post-form');
    const createPostStatus = document.getElementById('create-post-status');
    const postCategorySelectModal = document.getElementById('post-category-select'); // In create post modal

    const postListContainer = document.getElementById('post-list-container');
    const postsLoadingMessage = document.getElementById('posts-loading-message');
    const loadMorePostsBtn = document.getElementById('load-more-posts-btn');

    const feedFilterNav = document.getElementById('feed-filter-nav'); // For "All", "For You", "Following"
    const categoryFilterList = document.getElementById('category-filter-list');
    const groupListNav = document.getElementById('group-list'); // For group navigation
    const sortPostsSelect = document.getElementById('sort-posts-select');

    // User Profile Placeholders in Sidebar
    const communityUserAvatar = document.getElementById('community-user-avatar');
    const communityUserName = document.getElementById('community-user-name');
    const communityUserCareer = document.getElementById('community-user-career');


    // --- State ---
    let currentUserCareer = localStorage.getItem('uplasUserCareer') || null;
    let postsCurrentPage = 1;
    const postsPerPage = 10;
    let isLoadingPosts = false;
    let currentFeedFilter = 'all'; // 'all', 'personalized', 'following'
    let currentCategoryFilter = 'all-categories'; // category ID or 'all-categories'
    let currentSortOption = 'latest';

    // --- Utility Functions (from global.js or specific here) ---
    const openModal = (modalElement) => { /* ... (from previous global.js or defined here) ... */
        if (modalElement) {
            modalElement.hidden = false;
            setTimeout(() => modalElement.classList.add('active'), 10);
            const firstFocusable = modalElement.querySelector('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])');
            firstFocusable?.focus();
        }
    };
    const closeModal = (modalElement) => { /* ... (from previous global.js or defined here) ... */
        if (modalElement) {
            modalElement.classList.remove('active');
            setTimeout(() => modalElement.hidden = true, 300);
        }
    };
    const displayFormStatus = (element, message, type, translateKey = null) => { /* ... (from uhome.js) ... */ };
    const clearFormStatus = (element) => { /* ... (from uhome.js) ... */ };
    const validateInput = (inputElement) => { /* ... (from uhome.js) ... */ return true; }; // Simplified for now


    // --- Career/Industry Selection ---
    const handleCareerSelection = async (event) => {
        event.preventDefault();
        const selectedCareer = careerInterestSelect.value;
        const otherCareer = otherCareerInput.value.trim();
        let finalCareer = selectedCareer;

        if (selectedCareer === 'other-tech' && !otherCareer) {
            // TODO: Use displayFormStatus for modal errors
            alert('Please specify your tech field.'); return;
        }
        if (selectedCareer === 'other-tech') finalCareer = otherCareer;

        if (finalCareer) {
            localStorage.setItem('uplasUserCareer', finalCareer);
            currentUserCareer = finalCareer;
            console.log('User career preference saved:', finalCareer);
            closeModal(careerSelectionModal);
            updateUserProfileSummary(); // Update sidebar display
            // TODO: Send preference to backend:
            // await fetchAuthenticated('/api/user/preferences', { method: 'POST', body: JSON.stringify({ career: finalCareer }) });
            fetchPosts(1, true); // Refresh feed with new preference
        }
    };

    if (careerInterestSelect) {
        careerInterestSelect.addEventListener('change', () => {
            otherCareerGroup.hidden = careerInterestSelect.value !== 'other-tech';
            otherCareerInput.required = careerInterestSelect.value === 'other-tech';
        });
    }
    if (careerSelectionForm) careerSelectionForm.addEventListener('submit', handleCareerSelection);

    function checkAndShowCareerModal() {
        // TODO: Check if user is logged in. If not, this modal might not be relevant yet,
        // or it could be part of a post-signup onboarding flow.
        if (!currentUserCareer && careerSelectionModal && window.uplasIsUserLoggedIn) { // Assuming a global flag for login status
             openModal(careerSelectionModal);
        } else if (currentUserCareer) {
            updateUserProfileSummary();
        }
    }
    // Assume uplasIsUserLoggedIn is set elsewhere (e.g., after login in global.js or apiUtils.js)
    // window.uplasIsUserLoggedIn = localStorage.getItem('accessToken') ? true : false; // Example
    // checkAndShowCareerModal(); // Call this after checking login status


    // --- Create Post Modal & Form Handling ---
    if (createPostBtnSidebar) createPostBtnSidebar.addEventListener('click', () => openModal(createPostModal));
    if (closeCreatePostModalBtn) closeCreatePostModalBtn.addEventListener('click', () => closeModal(createPostModal));

    const handleCreatePostSubmit = async (event) => { /* ... (Same as previous community.js, ensure API call and error handling) ... */
        event.preventDefault();
        // ... validation ...
        const postData = { /* ... collect data ... */ };
        // ... display loading, disable button ...
        try {
            // const newPost = await fetchAuthenticated('/api/community/posts', { method: 'POST', body: JSON.stringify(postData) });
            // prependPostToFeed(newPost);
            // ... success message, reset form, close modal ...
        } catch (error) { /* ... error handling ... */ }
        // ... re-enable button ...
    };
    if (createPostForm) createPostForm.addEventListener('submit', handleCreatePostSubmit);


    // --- Fetching and Displaying Posts, Categories, Groups ---
    const renderPostItem = (post) => { /* ... (Same as previous community.js) ... */
        // Ensure all dynamic text within the post item also gets a data-translate-key if it's static,
        // or is translated before rendering if it's from the backend and already translated.
        return `
            <article class="post-item" data-post-id="${post.id}">
                <header class="post-item__header">
                    <div class="post-item__avatar">${post.avatarChar || post.author?.charAt(0)?.toUpperCase() || 'U'}</div>
                    <div class="post-item__author-time">
                        <a href="/profile/${post.authorId || '#'}" class="post-item__author">${post.author || 'Anonymous'}</a>
                        <span class="post-item__timestamp">${new Date(post.timestamp).toLocaleDateString()} at ${new Date(post.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                    </div>
                    ${post.categoryName ? `<span class="post-item__category-badge">${post.categoryName}</span>` : ''}
                </header>
                <a href="/community/post/${post.id}" class="post-item__link">
                    <h3 class="post-item__title">${post.title}</h3>
                </a>
                <div class="post-item__content-preview">${post.contentPreview || post.content?.substring(0, 150) + (post.content?.length > 150 ? '...' : '')}</div>
                <footer class="post-item__actions">
                    <button class="post-action-btn like-btn" data-liked="${post.isLikedByCurrentUser || false}" aria-label="Like this post">
                        <i class="far fa-heart"></i> <span data-translate-key="ucommunity_action_likes">${post.likes || 0}</span>
                    </button>
                    <a href="/community/post/${post.id}#comments" class="post-action-btn">
                        <i class="far fa-comment-alt"></i> <span data-translate-key="ucommunity_action_comments">${post.comments || 0}</span>
                    </a>
                    <button class="post-action-btn share-btn"><i class="fas fa-share-square"></i> <span data-translate-key="ucommunity_action_share">Share</span></button>
                    <button class="post-action-btn save-btn" data-saved="${post.isSavedByCurrentUser || false}" aria-label="Save this post">
                        <i class="far fa-bookmark"></i> <span data-translate-key="ucommunity_action_save">Save</span>
                    </button>
                </footer>
            </article>
        `;
    };

    const prependPostToFeed = (post) => { /* ... (Same as previous community.js) ... */ };

    const fetchPosts = async (page = 1, resetList = false) => {
        if (isLoadingPosts || !postListContainer) return;
        isLoadingPosts = true;
        if (resetList) {
            postListContainer.innerHTML = ''; // Clear for new filter/sort
            postsCurrentPage = 1;
        }
        if (postsLoadingMessage && page === 1) postsLoadingMessage.style.display = 'block';
        if (loadMorePostsBtn) loadMorePostsBtn.style.display = 'none';

        try {
            console.log(`Fetching posts: page ${page}, feedFilter: ${currentFeedFilter}, category: ${currentCategoryFilter}, sort: ${currentSortOption}, career: ${currentUserCareer}`);
            // TODO: API call: const data = await fetchAuthenticated(`/api/community/posts?page=${page}&limit=${postsPerPage}&feed=${currentFeedFilter}&category=${currentCategoryFilter}&sort=${currentSortOption}&career=${currentUserCareer || ''}`);
            await new Promise(resolve => setTimeout(resolve, 1000)); // Simulate delay
            const simulatedPosts = Array.from({ length: page === 3 ? 5 : postsPerPage }, (_, i) => ({ /* ... (simulated post object) ... */
                id: `sim-${page}-${i}-${Date.now()}`, title: `Post ${((page-1)*postsPerPage) + i + 1} (${currentFeedFilter}/${currentCategoryFilter}/${currentSortOption})`, author: `User ${String.fromCharCode(65 + i)}`, timestamp: new Date(Date.now() - Math.random() * 2000000000).toISOString(), content: `This is a simulated preview for post...`, likes: Math.floor(Math.random() * 50), comments: Math.floor(Math.random() * 15)
            }));
            const hasMore = page < 3; // Simulate 3 pages

            if (postsLoadingMessage) postsLoadingMessage.style.display = 'none';
            if (simulatedPosts.length === 0 && page === 1) {
                postListContainer.innerHTML = `<p class="no-posts-message" data-translate-key="ucommunity_no_posts_message">No posts found for this criteria.</p>`;
            } else {
                simulatedPosts.forEach(post => postListContainer.insertAdjacentHTML('beforeend', renderPostItem(post)));
                attachActionListenersToFeed();
            }
            if (loadMorePostsBtn) {
                loadMorePostsBtn.style.display = hasMore ? 'block' : 'none';
                postsCurrentPage = page;
            }
        } catch (error) { /* ... error handling ... */ }
        finally { isLoadingPosts = false; if (window.translatePage) window.translatePage(); /* Translate new content */ }
    };

    if (loadMorePostsBtn) loadMorePostsBtn.addEventListener('click', () => fetchPosts(postsCurrentPage + 1));

    // --- Filtering and Sorting Event Handlers ---
    if (feedFilterNav) {
        feedFilterNav.addEventListener('click', (e) => {
            const targetLink = e.target.closest('.sidebar-link');
            if (targetLink && !targetLink.classList.contains('active')) {
                feedFilterNav.querySelectorAll('.sidebar-link').forEach(l => l.classList.remove('active'));
                targetLink.classList.add('active');
                currentFeedFilter = targetLink.dataset.filter;
                fetchPosts(1, true);
            }
        });
    }
    if (categoryFilterList) { // For dynamically added category links
        categoryFilterList.addEventListener('click', (e) => {
            const targetLink = e.target.closest('.sidebar-link');
            if (targetLink && !targetLink.classList.contains('active')) {
                categoryFilterList.querySelectorAll('.sidebar-link').forEach(l => l.classList.remove('active'));
                targetLink.classList.add('active');
                currentCategoryFilter = targetLink.dataset.categoryId;
                fetchPosts(1, true);
            }
        });
    }
    if (sortPostsSelect) {
        sortPostsSelect.addEventListener('change', () => {
            currentSortOption = sortPostsSelect.value;
            fetchPosts(1, true);
        });
    }

    // --- Dynamic Content Population (Categories, Groups, User Profile) ---
    const populateCategories = async () => { /* ... (Same as previous community.js, ensure links have data-category-id) ... */
        const categories = [ /* ... simulated data ... */ ];
        if (categoryFilterList) {
            const loadingMsg = categoryFilterList.querySelector('.loading-message');
            if(loadingMsg) loadingMsg.remove();
            // ... rest of population logic ...
        }
        if (postCategorySelectModal) { /* ... populate create post modal select ... */ }
    };
    const populateGroups = async () => { /* ... (Same as previous community.js, ensure links have data-group-id) ... */
         const groups = [ /* ... simulated data ... */ ];
         if (groupListNav) {
            const loadingMsg = groupListNav.querySelector('.loading-message');
            if(loadingMsg) loadingMsg.remove();
            // ... rest of population logic ...
         }
    };
    function updateUserProfileSummary() {
        // TODO: Fetch actual user data if logged in
        // const userData = await fetchAuthenticated('/api/user/profile/summary');
        const isLoggedIn = localStorage.getItem('accessToken') ? true : false; // Simple check
        if (isLoggedIn && communityUserName && communityUserCareer && communityUserAvatar) {
            communityUserName.textContent = "John Doe"; // Replace with userData.name
            communityUserCareer.textContent = currentUserCareer || "AI Enthusiast"; // Replace with userData.career
            communityUserAvatar.textContent = "JD"; // Replace with userData.initials or img
        } else if (communityUserName) {
            // Show login/signup prompt if not logged in
            const profileWidget = document.getElementById('user-profile-summary-community');
            if(profileWidget) profileWidget.innerHTML = `<p data-translate-key="ucommunity_login_prompt_sidebar">Login to personalize your experience and contribute!</p><a href="index.html#auth-section" class="button button--primary button--small button--full-width" data-translate-key="nav_login_signup">Login/Sign Up</a>`;
        }
    }


    // --- Post Action Listeners (Like, Share, Save) ---
    function attachActionListenersToPost(postElement) { /* ... (Same as previous community.js) ... */ }
    function attachActionListenersToFeed() { /* ... (Same as previous community.js) ... */ }


    // --- Initial Load ---
    const initializeCommunityPage = () => {
        console.log("Initializing Uplas Community Page v2...");
        // Assume global.js has handled initial language/theme
        window.uplasIsUserLoggedIn = localStorage.getItem('accessToken') ? true : false; // Set global flag
        checkAndShowCareerModal(); // This will also call updateUserProfileSummary if career is set
        populateCategories();
        populateGroups();
        fetchPosts(1, true); // Initial fetch
        updateUserProfileSummary(); // Call again in case career modal wasn't shown
    };

    initializeCommunityPage();

}); // End DOMContentLoaded
