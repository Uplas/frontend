// js/ucommunity.js
/* ==========================================================================
   Uplas Community Platform JavaScript (ucommunity.js)
   - Handles career selection, post creation, feed loading, filtering, interactions.
   - Relies on global.js for theme, nav, language.
   - Relies on apiUtils.js for API calls and auth state.
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
    const createPostBtnSidebar = document.getElementById('create-post-btn-sidebar');
    const closeCreatePostModalBtn = document.getElementById('close-create-post-modal-btn');
    const createPostForm = document.getElementById('create-post-form');
    const createPostStatus = document.getElementById('create-post-status');
    const postCategorySelectModal = document.getElementById('post-category-select');
    const postContentTextarea = document.getElementById('post-content-textarea'); // Assuming this is the ID
    const postImageUpload = document.getElementById('post-image-upload'); // Assuming this ID
    const imagePreviewContainer = document.getElementById('image-preview-container'); // Assuming this ID
    const imagePreview = document.getElementById('image-preview'); // Assuming this ID

    const postListContainer = document.getElementById('post-list-container');
    const postsLoadingMessage = document.getElementById('posts-loading-message');
    const loadMorePostsBtn = document.getElementById('load-more-posts-btn');

    const feedFilterNav = document.getElementById('feed-filter-nav');
    const categoryFilterList = document.getElementById('category-filter-list');
    const groupListNav = document.getElementById('group-list');
    const sortPostsSelect = document.getElementById('sort-posts-select');

    const communityUserAvatar = document.getElementById('community-user-avatar');
    const communityUserName = document.getElementById('community-user-name');
    const communityUserCareer = document.getElementById('community-user-career');
    const communityUserProfileLink = document.getElementById('community-user-profile-link'); // Link to user's profile

    // --- State ---
    let currentUserCareer = localStorage.getItem('uplasUserCareer') || null;
    let postsCurrentPage = 1;
    const POSTS_PER_PAGE = 10; // Defined for clarity
    let isLoadingPosts = false;
    let currentFeedFilter = 'all';
    let currentCategoryFilter = 'all-categories';
    let currentSortOption = 'latest';
    let currentSearchTerm = ''; // Added for future search integration with fetchPosts
    let noMorePostsToLoad = false;

    // --- Utility Functions (Local to ucommunity.js or fallbacks) ---
    const openModal = (modalElement) => {
        if (modalElement) {
            modalElement.hidden = false;
            document.body.classList.add('modal-open');
            setTimeout(() => modalElement.classList.add('active'), 10);
            const firstFocusable = modalElement.querySelector('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])');
            firstFocusable?.focus();
        }
    };
    const closeModal = (modalElement) => {
        if (modalElement) {
            modalElement.classList.remove('active');
            document.body.classList.remove('modal-open');
            setTimeout(() => modalElement.hidden = true, 300);
        }
    };

    const displayFormStatus = (element, message, type, translateKey = null, isError = (type === 'error')) => {
        if (typeof window.uplasApi !== 'undefined' && typeof window.uplasApi.displayFormStatus === 'function') {
            window.uplasApi.displayFormStatus(element, message, isError, translateKey);
        } else if (element) { // Fallback
            element.textContent = message;
            element.className = 'form-status-message'; // Reset
            if(type) element.classList.add(`form-status-message--${type}`);
            element.style.color = isError ? 'var(--color-error, red)' : 'var(--color-success, green)';
            element.style.display = 'block';
            if (!isError) setTimeout(() => { if(element) element.style.display = 'none'; }, 5000);
        }
    };
    const clearFormStatus = (element) => {
        if (element) {
            element.textContent = '';
            element.style.display = 'none';
        }
    };
    const validateInput = (inputElement) => { /* ... (existing validation logic) ... */ return inputElement.checkValidity(); };
    const escapeHTML = (str) => { /* ... (from global.js or defined here if needed) ... */ return str; };


    // --- Career/Industry Selection ---
    const handleCareerSelection = async (event) => {
        event.preventDefault();
        if (!careerInterestSelect || !otherCareerInput || !careerSelectionForm) return;

        const selectedCareerValue = careerInterestSelect.value;
        const otherCareerValue = otherCareerInput.value.trim();
        let finalCareer = selectedCareerValue;

        if (selectedCareerValue === 'other-tech' && !otherCareerValue) {
            displayFormStatus(careerSelectionForm, 'Please specify your tech field.', 'error', 'err_specify_other_career');
            return;
        }
        if (selectedCareerValue === 'other-tech') finalCareer = otherCareerValue;

        if (finalCareer) {
            const submitButton = careerSelectionForm.querySelector('button[type="submit"]');
            if(submitButton) submitButton.disabled = true;
            displayFormStatus(careerSelectionForm, 'Saving preference...', 'loading', 'status_saving_preference');

            if (typeof window.uplasApi === 'undefined' || typeof window.uplasApi.fetchAuthenticated !== 'function') {
                console.error("ucommunity.js: uplasApi.fetchAuthenticated is not available!");
                displayFormStatus(careerSelectionForm, 'Service unavailable.', 'error', 'error_service_unavailable');
                if(submitButton) submitButton.disabled = false;
                return;
            }

            try {
                // L54: handleCareerSelection
                // L67: Action: API call to save user's career preference (e.g., /api/users/me/preferences/).
                // Assuming PATCH to user's profile with 'career_interest' field
                const response = await window.uplasApi.fetchAuthenticated('/users/profile/', {
                    method: 'PATCH',
                    body: JSON.stringify({ career_interest: finalCareer })
                });
                const responseData = await response.json();

                if (response.ok) {
                    localStorage.setItem('uplasUserCareer', finalCareer);
                    currentUserCareer = finalCareer;
                    console.log('User career preference saved via API:', finalCareer);
                    displayFormStatus(careerSelectionForm, 'Preference saved!', 'success', 'status_preference_saved');
                    setTimeout(() => closeModal(careerSelectionModal), 1500);
                    updateUserProfileSummary(); // Update sidebar
                    fetchPosts(1, true);    // Refresh feed
                } else {
                    throw new Error(responseData.detail || 'Failed to save preference.');
                }
            } catch (error) {
                console.error("Error saving career preference:", error);
                displayFormStatus(careerSelectionForm, error.message, 'error', 'err_saving_preference_failed');
            } finally {
                 if(submitButton) submitButton.disabled = false;
            }
        }
    };

    if (careerInterestSelect) { /* ... (existing listener) ... */ }
    if (careerSelectionForm) careerSelectionForm.addEventListener('submit', handleCareerSelection);

    async function checkAndShowCareerModal() {
        if (typeof window.uplasApi === 'undefined' || !window.uplasApi.getAccessToken()) {
             console.log("User not logged in, career modal check skipped.");
             updateUserProfileSummary(); // Update to show login prompt
             return;
        }
        // currentUserCareer is from localStorage. Fetch from profile for source of truth.
        const userProfileData = await window.uplasApi.getUserData(); // Assumes this fetches if not present or is fresh
        currentUserCareer = userProfileData?.career_interest || localStorage.getItem('uplasUserCareer');


        if (!currentUserCareer && careerSelectionModal) {
             openModal(careerSelectionModal);
        } else if (currentUserCareer) {
            updateUserProfileSummary();
        }
    }

    // --- Create Post Modal & Form Handling ---
    if (createPostBtnSidebar) createPostBtnSidebar.addEventListener('click', () => openModal(createPostModal));
    if (closeCreatePostModalBtn) closeCreatePostModalBtn.addEventListener('click', () => closeModal(createPostModal));

    if (postImageUpload) {
        postImageUpload.addEventListener('change', function(event) {
            const file = event.target.files[0];
            if (file && imagePreviewContainer && imagePreview) {
                const reader = new FileReader();
                reader.onload = function(e) {
                    imagePreview.src = e.target.result;
                    imagePreviewContainer.style.display = 'block';
                }
                reader.readAsDataURL(file);
            } else if(imagePreviewContainer) {
                imagePreviewContainer.style.display = 'none';
            }
        });
    }

    const handleCreatePostSubmit = async (event) => {
        event.preventDefault();
        if (!createPostForm || !postContentTextarea || !postCategorySelectModal ) return;

        const postText = postContentTextarea.value.trim();
        const categoryId = postCategorySelectModal.value;
        const imageFile = postImageUpload?.files[0]; // Get the file if selected

        if (!postText) {
            displayFormStatus(createPostStatus, 'Post content cannot be empty.', 'error', 'err_post_content_empty');
            return;
        }
        if (!categoryId || categoryId === "all-categories" || categoryId === "") { // Ensure a specific category is chosen
            displayFormStatus(createPostStatus, 'Please select a category for your post.', 'error', 'err_post_category_required');
            return;
        }

        const submitButton = createPostForm.querySelector('button[type="submit"]');
        if(submitButton) submitButton.disabled = true;
        displayFormStatus(createPostStatus, 'Creating post...', 'loading', 'status_creating_post');

        if (typeof window.uplasApi === 'undefined' || typeof window.uplasApi.fetchAuthenticated !== 'function') {
            console.error("ucommunity.js: uplasApi.fetchAuthenticated is not available!");
            displayFormStatus(createPostStatus, 'Service unavailable.', 'error', 'error_service_unavailable');
            if(submitButton) submitButton.disabled = false;
            return;
        }

        try {
            // L87: handleCreatePostSubmit
            // L92: Action: API call to create a new community post (e.g., /api/community/posts/create/ or just /api/community/posts/).
            // Assuming POST to /api/community/posts/
            let response;
            const endpoint = '/community/posts/';

            if (imageFile) {
                const formData = new FormData();
                formData.append('content', postText);
                formData.append('category_id', categoryId); // Assuming backend expects category_id
                formData.append('image', imageFile);
                // For FormData, fetchAuthenticated needs to handle it (no 'Content-Type': 'application/json')
                response = await window.uplasApi.fetchAuthenticated(endpoint, {
                    method: 'POST',
                    body: formData,
                    // Let browser set Content-Type for FormData
                    headers: {} // Pass empty or specific headers for FormData if uplasApi allows
                });
            } else {
                response = await window.uplasApi.fetchAuthenticated(endpoint, {
                    method: 'POST',
                    body: JSON.stringify({ content: postText, category_id: categoryId }),
                });
            }

            const newPostData = await response.json();

            if (response.ok) {
                displayFormStatus(createPostStatus, 'Post created successfully!', 'success', 'status_post_created');
                prependPostToFeed(newPostData); // Assuming newPostData is the created post object
                createPostForm.reset();
                if(imagePreviewContainer) imagePreviewContainer.style.display = 'none';
                if(imagePreview) imagePreview.src = '#';
                setTimeout(() => closeModal(createPostModal), 1500);
            } else {
                throw new Error(newPostData.detail || 'Failed to create post.');
            }
        } catch (error) {
            console.error('Error creating post:', error);
            displayFormStatus(createPostStatus, error.message, 'error', 'err_creating_post_failed');
        } finally {
            if(submitButton) submitButton.disabled = false;
        }
    };
    if (createPostForm) createPostForm.addEventListener('submit', handleCreatePostSubmit);

    // --- Fetching and Displaying Posts ---
    const renderPostItem = (post) => {
        // Ensure post and nested properties exist to prevent errors.
        // Adapt fields based on your actual API response for a Community Post.
        const postId = post.id;
        const authorName = escapeHTML(post.author?.full_name || post.author?.username || 'Anonymous');
        const authorId = post.author?.id || '#'; // Link to profile if available
        const authorAvatarChar = (post.author?.full_name || post.author?.username || 'U').charAt(0).toUpperCase();
        const authorAvatarUrl = post.author?.profile_picture_url; // Assuming this field exists
        const postTimestamp = new Date(post.created_at).toLocaleString(document.documentElement.lang || 'en-US', { dateStyle: 'medium', timeStyle: 'short' });
        const categoryName = escapeHTML(post.category?.name || ''); // Assuming post.category is an object with 'name'
        const postContent = escapeHTML(post.content); // Or use a Markdown renderer if content is Markdown
        const likeCount = post.like_count || 0;
        const commentCount = post.comment_count || 0; // Assuming backend provides this
        const isLikedByCurrentUser = post.is_liked_by_current_user || false; // Assuming backend provides this
        const isSavedByCurrentUser = post.is_saved_by_current_user || false; // Assuming backend provides this

        let imageHTML = '';
        if (post.image_url) { // Assuming backend provides 'image_url' if an image was uploaded
            imageHTML = `<div class="post-item__image-container">
                            <img src="${post.image_url}" alt="Post image" class="post-item__image" loading="lazy">
                         </div>`;
        }

        return `
            <article class="post-item" data-post-id="${postId}">
                <header class="post-item__header">
                    <div class="post-item__avatar" ${authorAvatarUrl ? `style="background-image:url('${authorAvatarUrl}')"` : ''}>
                        ${!authorAvatarUrl ? authorAvatarChar : ''}
                    </div>
                    <div class="post-item__author-time">
                        <a href="uprofile.html?userId=${authorId}" class="post-item__author">${authorName}</a>
                        <span class="post-item__timestamp">${postTimestamp}</span>
                    </div>
                    ${categoryName ? `<span class="post-item__category-badge">${categoryName}</span>` : ''}
                    </header>
                <a href="ucommunity-post-detail.html?postId=${postId}" class="post-item__link">
                    <div class="post-item__content-preview">${postContent}</div>
                </a>
                ${imageHTML}
                <footer class="post-item__actions">
                    <button class="post-action-btn like-btn ${isLikedByCurrentUser ? 'active' : ''}" aria-pressed="${isLikedByCurrentUser}" aria-label="Like this post">
                        <i class="${isLikedByCurrentUser ? 'fas' : 'far'} fa-heart"></i> <span data-translate-key="ucommunity_action_likes">${likeCount}</span>
                    </button>
                    <a href="ucommunity-post-detail.html?postId=${postId}#comments-section" class="post-action-btn">
                        <i class="far fa-comment-alt"></i> <span data-translate-key="ucommunity_action_comments">${commentCount}</span>
                    </a>
                    <button class="post-action-btn share-btn"><i class="fas fa-share-square"></i> <span data-translate-key="ucommunity_action_share">Share</span></button>
                    <button class="post-action-btn save-btn ${isSavedByCurrentUser ? 'active' : ''}" aria-pressed="${isSavedByCurrentUser}" aria-label="Save this post">
                        <i class="${isSavedByCurrentUser ? 'fas' : 'far'} fa-bookmark"></i> <span data-translate-key="ucommunity_action_save">Save</span>
                    </button>
                </footer>
            </article>
        `;
    };

    const prependPostToFeed = (post) => {
        if (postListContainer && post) {
            postListContainer.insertAdjacentHTML('afterbegin', renderPostItem(post));
            const newPostElement = postListContainer.firstChild;
            if (newPostElement) attachActionListenersToPost(newPostElement);
            if (noPostsMessage) noPostsMessage.style.display = 'none';
            if (window.uplasApplyTranslations) window.uplasApplyTranslations(newPostElement);
        }
    };

    const fetchPosts = async (page = 1, resetList = false) => {
        if (isLoadingPosts || !postListContainer || !window.uplasApi || !window.uplasApi.fetchAuthenticated) {
            if (!window.uplasApi || !window.uplasApi.fetchAuthenticated) console.error("uplasApi not available for fetching posts.");
            return;
        }
        isLoadingPosts = true;
        noMorePostsToLoad = page === 1 ? false : noMorePostsToLoad; // Reset if it's a new filter/sort

        if (resetList) {
            postListContainer.innerHTML = '';
            postsCurrentPage = 1; // Ensure page is reset
            noMorePostsToLoad = false;
        }
        if (postsLoadingMessage && postsCurrentPage === 1) postsLoadingMessage.style.display = 'block';
        if (loadMorePostsBtn) loadMorePostsBtn.style.display = 'none';

        // Construct query parameters
        let queryParams = `?page=${postsCurrentPage}&limit=${POSTS_PER_PAGE}`;
        if (currentFeedFilter !== 'all') queryParams += `&feed_type=${encodeURIComponent(currentFeedFilter)}`;
        if (currentCategoryFilter !== 'all-categories') queryParams += `&category_id=${encodeURIComponent(currentCategoryFilter)}`; // Assuming backend uses category_id
        if (currentSortOption !== 'latest') queryParams += `&sort=${encodeURIComponent(currentSortOption)}`;
        if (currentSearchTerm) queryParams += `&search=${encodeURIComponent(currentSearchTerm)}`;
        if (currentUserCareer && currentFeedFilter === 'personalized') queryParams += `&career_path=${encodeURIComponent(currentUserCareer)}`;


        try {
            console.log(`Fetching posts: ${queryParams}`);
            // L121: fetchPosts
            // L130: Action: API call to fetch community posts with pagination and filtering.
            const response = await window.uplasApi.fetchAuthenticated(`/community/posts/${queryParams}`);
            const data = await response.json();
            // Assuming DRF paginated response: { count, next, previous, results: [posts] }
            // Each post: { id, author: {id, full_name, username, profile_picture_url}, category: {id, name},
            //              content, image_url, created_at, like_count, comment_count, is_liked_by_current_user, is_saved_by_current_user }

            if (!response.ok) {
                throw new Error(data.detail || 'Failed to fetch posts.');
            }

            if (postsLoadingMessage) postsLoadingMessage.style.display = 'none';
            if (data.results && data.results.length > 0) {
                data.results.forEach(post => postListContainer.insertAdjacentHTML('beforeend', renderPostItem(post)));
                attachActionListenersToFeed(); // Attach listeners to newly added posts
                if (noPostsMessage) noPostsMessage.style.display = 'none';
            } else if (postsCurrentPage === 1) { // No results at all for the first page
                if (noPostsMessage) {
                     noPostsMessage.style.display = 'block';
                     noPostsMessage.textContent = window.uplasTranslate ? window.uplasTranslate('ucommunity_no_posts_message_filters', {fallback: "No posts found matching your criteria."}) : "No posts found matching your criteria.";
                }
            }

            if (data.next) { // If there's a next page URL from DRF pagination
                if(loadMorePostsBtn) loadMorePostsBtn.style.display = 'block';
                noMorePostsToLoad = false;
            } else {
                if(loadMorePostsBtn) loadMorePostsBtn.style.display = 'none';
                noMorePostsToLoad = true;
                 if (postsCurrentPage > 1 && data.results.length === 0) { // Reached end, no new items
                    // Optionally display a "no more posts" message briefly
                }
            }
        } catch (error) {
            console.error("Error fetching posts:", error);
            if (postsLoadingMessage) postsLoadingMessage.style.display = 'none';
            if (postListContainer && postsCurrentPage === 1) { // Show error only if initial load fails
                postListContainer.innerHTML = `<p class="error-message" data-translate-key="ucommunity_error_loading_posts">Could not load posts: ${escapeHTML(error.message)}</p>`;
            }
        } finally {
            isLoadingPosts = false;
            if (window.uplasApplyTranslations) window.uplasApplyTranslations(postListContainer);
        }
    };

    if (loadMorePostsBtn) {
        loadMorePostsBtn.addEventListener('click', () => {
            if (!isLoadingPosts && !noMorePostsToLoad) {
                postsCurrentPage++;
                fetchPosts(postsCurrentPage);
            }
        });
    }

    // --- Filtering and Sorting Event Handlers ---
    if (feedFilterNav) { /* ... (existing listener, ensure calls fetchPosts(1, true)) ... */ }
    if (sortPostsSelect) { /* ... (existing listener, ensure calls fetchPosts(1, true)) ... */ }

    // --- Dynamic Content Population ---
    const populateCategories = async () => {
        if (!categoryFilterList || !window.uplasApi || !window.uplasApi.fetchAuthenticated) return;
        const loadingMsg = categoryFilterList.querySelector('.loading-message');

        try {
            // L165: populateCategories - Action: API call to fetch community categories (e.g., /api/community/categories/).
            // Using /api/community/forums/ as per backend structure.
            const response = await window.uplasApi.fetchAuthenticated('/community/forums/?limit=100'); // Assuming categories are forums
            if (!response.ok) throw new Error('Failed to load categories');
            const categories = await response.json(); // Expects { results: [{id, name, slug}] }
            const results = categories.results || categories;

            if(loadingMsg) loadingMsg.remove();
            categoryFilterList.innerHTML = `<li class="nav-item"><a href="#" class="sidebar-link active" data-category-id="all-categories" data-translate-key="ucommunity_filter_all_categories">All Categories</a></li>`; // Reset
            results.forEach(cat => {
                const li = document.createElement('li');
                li.className = 'nav-item';
                li.innerHTML = `<a href="#" class="sidebar-link" data-category-id="${cat.slug}">${escapeHTML(cat.name)}</a>`; // Filter by slug
                categoryFilterList.appendChild(li);
            });

            // Populate create post modal select
            if(postCategorySelectModal){
                postCategorySelectModal.innerHTML = `<option value="" data-translate-key="ucommunity_modal_select_category_placeholder" disabled selected>Select Category...</option>`;
                results.forEach(cat => {
                    const option = document.createElement('option');
                    option.value = cat.id; // Use category ID for posting
                    option.textContent = escapeHTML(cat.name);
                    postCategorySelectModal.appendChild(option);
                });
            }
             if (window.uplasApplyTranslations) window.uplasApplyTranslations(categoryFilterList);
             if (window.uplasApplyTranslations && postCategorySelectModal) window.uplasApplyTranslations(postCategorySelectModal);

        } catch (error) {
            console.error("Error populating categories:", error);
            if(loadingMsg) loadingMsg.textContent = 'Error loading categories.';
        }
    };
    const populateGroups = async () => {
        if (!groupListNav || !window.uplasApi || !window.uplasApi.fetchAuthenticated) return;
        const loadingMsg = groupListNav.querySelector('.loading-message');
        try {
            // L175: populateGroups - Action: API call to fetch community groups (e.g., /api/community/groups/).
            // This endpoint might not exist in current backend structure. Assuming it does for now.
            const response = await window.uplasApi.fetchAuthenticated('/community/groups/?limit=10'); // Replace with actual endpoint
            if (!response.ok) throw new Error('Failed to load groups');
            const groups = await response.json(); // Expects { results: [{id, name, slug?, member_count?}] }
            const results = groups.results || groups;

            if(loadingMsg) loadingMsg.remove();
            groupListNav.innerHTML = ''; // Clear
            results.forEach(group => {
                const li = document.createElement('li');
                li.className = 'nav-item';
                // Adjust link based on how groups are navigated
                li.innerHTML = `<a href="/community/group/${group.slug || group.id}" class="sidebar-link">
                                    <i class="fas fa-users group-icon"></i> ${escapeHTML(group.name)}
                                    ${group.member_count ? `<span class="group-member-count">${group.member_count}</span>` : ''}
                               </a>`;
                groupListNav.appendChild(li);
            });
            if (window.uplasApplyTranslations) window.uplasApplyTranslations(groupListNav);

        } catch (error) {
            console.error("Error populating groups:", error);
            if(loadingMsg) loadingMsg.textContent = 'Error loading groups.';
            if(groupListNav && groupListNav.children.length === 0) groupListNav.innerHTML = '<li>No groups to show.</li>';
        }
    };

    async function updateUserProfileSummary() {
        if (!window.uplasApi || !window.uplasApi.fetchAuthenticated || !window.uplasApi.getUserData) {
            // Show login prompt if API utils not ready
            const profileWidget = document.getElementById('user-profile-summary-community');
            if(profileWidget && communityUserName) { // Check if communityUserName exists to avoid error if widget itself is missing
                 profileWidget.innerHTML = `<p data-translate-key="ucommunity_login_prompt_sidebar">Login to personalize your experience and contribute!</p><a href="index.html#auth-section" class="button button--primary button--small button--full-width" data-translate-key="nav_login_signup">Login/Sign Up</a>`;
                 if (window.uplasApplyTranslations) window.uplasApplyTranslations(profileWidget);
            }
            return;
        }

        try {
            // L186: updateUserProfileSummary
            // L188: Action: API call to get user summary (e.g., /api/users/me/profile_summary/ or /api/users/profile/).
            // Using /api/users/profile/ which returns UserSerializer data (includes profile nested)
            const response = await window.uplasApi.fetchAuthenticated('/users/profile/');
            if (!response.ok) {
                 console.warn("Failed to fetch user profile summary for sidebar.");
                 // Call the non-API dependent part of checkAndShowCareerModal to ensure login prompt if relevant
                 if (localStorage.getItem('uplasUserCareer')) { // Only if career was locally set but profile fetch failed
                     if (communityUserName) communityUserName.textContent = "User";
                     if (communityUserCareer) communityUserCareer.textContent = localStorage.getItem('uplasUserCareer');
                     if (communityUserAvatar) communityUserAvatar.textContent = "U";
                 } else { // Fallback to show login prompt again
                    const profileWidget = document.getElementById('user-profile-summary-community');
                    if(profileWidget && communityUserName) {
                         profileWidget.innerHTML = `<p data-translate-key="ucommunity_login_prompt_sidebar">Login to personalize your experience and contribute!</p><a href="index.html#auth-section" class="button button--primary button--small button--full-width" data-translate-key="nav_login_signup">Login/Sign Up</a>`;
                         if (window.uplasApplyTranslations) window.uplasApplyTranslations(profileWidget);
                    }
                 }
                return;
            }
            const userData = await response.json();
            // userData from UserSerializer: { full_name, email, profile: { avatar_url_or_initials_logic }, career_interest }

            if (communityUserName) communityUserName.textContent = userData.full_name || userData.username || "Uplas User";
            if (communityUserCareer) communityUserCareer.textContent = userData.career_interest || currentUserCareer || (window.uplasTranslate ? window.uplasTranslate('ucommunity_career_placeholder', {fallback: 'AI Explorer'}) : 'AI Explorer');
            if (communityUserAvatar) {
                if (userData.profile_picture_url) {
                    communityUserAvatar.innerHTML = `<img src="${userData.profile_picture_url}" alt="${userData.full_name || 'User'} avatar">`;
                } else {
                    communityUserAvatar.textContent = (userData.full_name || userData.username || 'U').charAt(0).toUpperCase();
                    communityUserAvatar.style.backgroundImage = ''; // Clear if it was set
                }
            }
            if(communityUserProfileLink && userData.username) { // Assuming profile links use username
                 communityUserProfileLink.href = `uprofile.html?username=${userData.username}`;
            }
             if (window.uplasApplyTranslations) window.uplasApplyTranslations(document.getElementById('user-profile-summary-community'));


        } catch (error) {
            console.error("Error updating user profile summary:", error);
            // Fallback to local or show login prompt if auth error
            const profileWidget = document.getElementById('user-profile-summary-community');
            if(profileWidget && communityUserName) {
                 profileWidget.innerHTML = `<p data-translate-key="ucommunity_login_prompt_sidebar">Login to personalize your experience and contribute!</p><a href="index.html#auth-section" class="button button--primary button--small button--full-width" data-translate-key="nav_login_signup">Login/Sign Up</a>`;
                 if (window.uplasApplyTranslations) window.uplasApplyTranslations(profileWidget);
            }
        }
    }

    // --- Post Action Listeners (Like, Share, Save) ---
    function attachActionListenersToPost(postElement) {
        const postId = postElement.dataset.postId;
        if (!postId) return;

        const likeBtn = postElement.querySelector('.like-btn');
        const saveBtn = postElement.querySelector('.save-btn');
        const shareBtn = postElement.querySelector('.share-btn'); // Assuming share is client-side for now

        if (likeBtn) {
            likeBtn.addEventListener('click', async () => {
                if (!window.uplasApi || !window.uplasApi.fetchAuthenticated) { alert("Login to like posts."); return; }
                const isLiked = likeBtn.classList.contains('active');
                const method = isLiked ? 'DELETE' : 'POST'; // Assuming DELETE to unlike, POST to like
                const likeCountSpan = likeBtn.querySelector('span');
                const originalLikeCount = parseInt(likeCountSpan.textContent) || 0;

                likeBtn.disabled = true;
                try {
                    // API call to /api/community/like-toggle/
                    // The backend LikeToggleAPIView expects content_type_model and object_id in the body for both POST and DELETE
                    const response = await window.uplasApi.fetchAuthenticated('/community/like-toggle/', {
                        method: method,
                        body: JSON.stringify({ content_type_model: 'post', object_id: postId })
                    });
                    const data = await response.json();

                    if (response.ok) {
                        likeBtn.classList.toggle('active', data.liked);
                        likeBtn.setAttribute('aria-pressed', data.liked.toString());
                        likeBtn.querySelector('i').className = data.liked ? 'fas fa-heart' : 'far fa-heart';
                        // Update count based on actual server response if available, or optimistically
                        if (data.like_count !== undefined) {
                             likeCountSpan.textContent = data.like_count;
                        } else {
                             likeCountSpan.textContent = data.liked ? originalLikeCount + 1 : Math.max(0, originalLikeCount -1) ;
                        }
                    } else {
                        throw new Error(data.detail || 'Failed to update like status.');
                    }
                } catch (error) {
                    console.error("Error liking/unliking post:", error);
                    alert(`Error: ${error.message}`);
                } finally {
                    likeBtn.disabled = false;
                }
            });
        }

        if (saveBtn) {
            saveBtn.addEventListener('click', async () => {
                if (!window.uplasApi || !window.uplasApi.fetchAuthenticated) { alert("Login to save posts."); return; }
                const isSaved = saveBtn.classList.contains('active');
                // API call to /api/community/posts/{postId}/save/ (POST to toggle) - Assuming this endpoint exists
                const method = 'POST'; // Assuming toggle behavior
                saveBtn.disabled = true;

                try {
                    const response = await window.uplasApi.fetchAuthenticated(`/community/posts/${postId}/save/`, { method: method });
                    const data = await response.json(); // Expects { saved: true/false }

                    if (response.ok) {
                        saveBtn.classList.toggle('active', data.saved);
                        saveBtn.setAttribute('aria-pressed', data.saved.toString());
                        saveBtn.querySelector('i').className = data.saved ? 'fas fa-bookmark' : 'far fa-bookmark';
                        // No count shown for save in this example
                    } else {
                        throw new Error(data.detail || 'Failed to update save status.');
                    }
                } catch (error) {
                    console.error("Error saving/unsaving post:", error);
                    alert(`Error: ${error.message}`);
                } finally {
                    saveBtn.disabled = false;
                }
            });
        }

        if (shareBtn) {
            shareBtn.addEventListener('click', () => {
                const postUrl = `${window.location.origin}/ucommunity-post-detail.html?postId=${postId}`;
                const postTitle = postElement.querySelector('.post-item__title')?.textContent || 'Check out this post';
                if (navigator.share) {
                    navigator.share({
                        title: postTitle,
                        text: `Found this interesting post on Uplas Community: ${postTitle}`,
                        url: postUrl,
                    }).catch(console.error);
                } else {
                    // Fallback for browsers that don't support Web Share API
                    prompt("Copy this link to share:", postUrl);
                }
            });
        }
    }

    function attachActionListenersToFeed() {
        postListContainer.querySelectorAll('.post-item').forEach(postElement => {
            // Check if listeners already attached to prevent duplicates if posts are re-rendered without full clear
            if (!postElement.dataset.listenersAttached) {
                attachActionListenersToPost(postElement);
                postElement.dataset.listenersAttached = 'true';
            }
        });
    }

    // --- Initial Load ---
    const initializeCommunityPage = async () => {
        console.log("Initializing Uplas Community Page with API integrations...");
        if (typeof window.uplasApi === 'undefined') {
             console.error("CRITICAL: uplasApi is not defined. Community page will not function correctly.");
             // Display a prominent error to the user
            if (document.body) document.body.innerHTML = "<p style='color:red; text-align:center; padding: 20px;'>Critical error: Core application utilities failed to load. Please refresh or contact support.</p>";
             return;
        }

        await checkAndShowCareerModal(); // This also calls updateUserProfileSummary based on its logic.
                                        // If it wasn't called (e.g. career modal not shown), call it explicitly.
        if (!careerSelectionModal || careerSelectionModal.hidden) { // If career modal wasn't displayed
            await updateUserProfileSummary(); // Ensure user profile is updated
        }

        populateCategories();
        populateGroups(); // This function will likely show an error if /api/community/groups/ is not implemented
        fetchPosts(1, true); // Initial fetch
    };

    initializeCommunityPage();

}); // End DOMContentLoaded
```

**Explanation of Changes and Key Points:**

1.  **`displayFormStatus` / `clearFormStatus`**: Kept using the local versions provided in `ucommunity (1).js` as they are directly tied to `createPostStatus` etc. If you want to centralize all status displays through `uplasApi.displayFormStatus`, you would replace these local functions and update their call sites.
2.  **`handleCareerSelection` (L54, L67)**:
    * API Call: `await window.uplasApi.fetchAuthenticated('/users/profile/', { method: 'PATCH', body: JSON.stringify({ career_interest: finalCareer }) });`
    * It now saves the `career_interest` by PATCHing the user's profile. Your `UserSerializer` in `apps/users/serializers.py` should be able to handle updating the `career_interest` field on the `User` model.
    * Success/error handling is included.

3.  **`handleCreatePostSubmit` (L87, L92)**:
    * API Call: `await window.uplasApi.fetchAuthenticated('/community/posts/', { method: 'POST', body: ... });`
    * **Image Handling**: If `imageFile` is present, it now uses `FormData` to send the request. `uplasApi.fetchAuthenticated` would need to be flexible enough not to force `Content-Type: application/json` when a `FormData` body is passed. Typically, `fetch` handles `FormData` content type automatically. If `apiUtils.js` always sets JSON content type, it might need a small adjustment. I've added `headers: {}` when sending FormData to let the browser set the correct `Content-Type`.
    * Payload: Sends `content` and `category_id`. Your backend `PostSerializer` should accept `category_id` and link it to the `Category` (or `Forum` if that's what you're using for categories) model.
    * On success, it calls `prependPostToFeed(newPostData)` where `newPostData` is the response from the backend (the created post object).

4.  **`fetchPosts` (L121, L130)**:
    * API Call: `await window.uplasApi.fetchAuthenticated(\`/community/posts/\${queryParams}\`);`
    * `queryParams`: Constructs a query string including `page`, `limit` (using `POSTS_PER_PAGE`), `feed_type` (from `currentFeedFilter`), `category_id` (from `currentCategoryFilter`), `sort` (from `currentSortOption`), `search` (from `currentSearchTerm`), and `career_path` (from `currentUserCareer` if `personalized` feed).
    * **Backend Dependency**: Your backend `/api/community/posts/` endpoint (likely `CommunityPostViewSet`) needs to support these query parameters for filtering and sorting. You'll need to set up `filter_backends` and `filterset_fields` / `search_fields` / `ordering_fields` in your `PostViewSet` in `apps/community/views.py`.
    * Pagination: Assumes a DRF-style paginated response (`{ count, next, previous, results: [...] }`) and updates the "Load More" button logic based on the `next` URL. `noMorePostsToLoad` state variable added.

5.  **`populateCategories` (L165)**:
    * API Call: `await window.uplasApi.fetchAuthenticated('/community/forums/?limit=100');`
    * It now fetches from `/api/community/forums/` (assuming your "categories" are actually "forums" from the backend `ForumViewSet`).
    * It populates both the filter list (`categoryFilterList`) and the select dropdown in the create post modal (`postCategorySelectModal`). Uses category `slug` for filtering links and category `id` for the select option value.

6.  **`populateGroups` (L175)**:
    * API Call: `await window.uplasApi.fetchAuthenticated('/community/groups/?limit=10');`
    * **Backend Dependency**: This integration assumes an endpoint `/api/community/groups/` exists. Your provided backend files do not show a `CommunityGroupViewSet`. If "groups" are a feature you intend to implement, you'll need to add the corresponding models, serializers, views, and URLs on the backend. If "groups" are not a separate concept from "forums/categories", this function might be redundant or need to fetch from the forums endpoint.
    * The rendering logic expects group objects with `id`, `name`, `slug` (optional), and `member_count` (optional).

7.  **`updateUserProfileSummary` (L186, L188)**:
    * API Call: `await window.uplasApi.fetchAuthenticated('/users/profile/');`
    * Fetches the user's profile (which includes nested profile data via `UserSerializer`).
    * Updates the sidebar elements (`communityUserName`, `communityUserCareer`, `communityUserAvatar`) with data like `full_name`, `career_interest`, `profile_picture_url`.
    * Includes a fallback to show a login prompt if `uplasApi` isn't ready or profile fetch fails.

8.  **Post Action Listeners (`attachActionListenersToPost`)**:
    * **Like**:
        * API Call: `await window.uplasApi.fetchAuthenticated('/community/like-toggle/', { method: method, body: JSON.stringify({ content_type_model: 'post', object_id: postId }) });`
        * It uses the `/api/community/like-toggle/` endpoint. The backend's `LikeToggleAPIView` expects `content_type_model: 'post'` and the `object_id` (postId) in the request body for both `POST` (like) and `DELETE` (unlike).
        * Updates button state and like count (optimistically or from response if backend provides it).
    * **Save**:
        * API Call: `await window.uplasApi.fetchAuthenticated(\`/community/posts/\${postId}/save/\`, { method: 'POST' });`
        * **Backend Dependency**: This assumes an endpoint like `/api/community/posts/{postId}/save/` that toggles the save state. Your backend `CommunityPostViewSet` would need a custom `@action` for this.
        * Updates button state.
    * **Share**: Remains a client-side Web Share API implementation.

9.  **Initial Load & Auth**:
    * `checkAndShowCareerModal` now attempts to get `currentUserCareer` from `uplasApi.getUserData()` first as a source of truth before falling back to `localStorage`.
    * `initializeCommunityPage` calls `updateUserProfileSummary` more explicitly if the career modal isn't shown, ensuring the profile summary is attempted.
    * Added a more robust check for `uplasApi` at the beginning of `initializeCommunityPage` to prevent the page from breaking if core utilities aren't loaded.

**Important Next Steps & Considerations:**

* **Backend Endpoints & Filters**:
    * **Crucially**, ensure your backend `CommunityPostViewSet` supports the filtering parameters used in `fetchPosts` (`feed_type`, `category_id` or `category__slug`, `sort`, `search`, `career_path`). You'll need to configure `django-filter` and DRF's `SearchFilter`, `OrderingFilter` on your `PostViewSet`.
    * Implement the `/api/community/groups/` endpoint if "groups" are a distinct feature.
    * Implement the `/api/community/posts/{postId}/save/` endpoint on your `CommunityPostViewSet`.
    * Ensure your `/api/users/profile/` (PATCH) can update `career_interest`.
* **`renderPostItem` Data**: Adjust the fields accessed in `renderPostItem` (e.g., `post.author.full_name`, `post.category.name`, `post.image_url`, `post.is_liked_by_current_user`, `post.is_saved_by_current_user`, `post.comment_count`) to match exactly what your `CommunityPostSerializer` provides.
* **Image Upload in `uplasApi.fetchAuthenticated`**: The `fetchAuthenticated` function in `apiUtils.js` needs to be able to handle `FormData` for image uploads. This usually means *not* setting the `Content-Type` header to `application/json` when the body is `FormData`, as the browser will set it correctly to `multipart/form-data`.
    ```javascript
    // In apiUtils.js, inside fetchAuthenticated, before setting headers:
    if (!(options.body instanceof FormData)) {
        headers['Content-Type'] = 'application/json';
    } // else, let the browser set Content-Type for FormData
    ```
* **Error Messages**: Enhance the user-facing error messages based on the specific errors returned by the backend.
* **Loading States**: The current loading states are basic. Consider more comprehensive visual feedback.
* **Translation**: Ensure all new user-facing strings have `data-translate-key` attributes if they are static, or are translated using `window.uplasTranslate` if dynamic.

This version of `ucommunity.js` should provide a solid foundation for a dynamic, API-driven community page. Remember to test thoroughly with your backe
