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
    const postContentTextarea = document.getElementById('post-content-textarea');
    const postAttachmentInput = document.getElementById('post-attachment'); // Changed from postImageUpload

    const postListContainer = document.getElementById('post-list-container');
    const postsLoadingMessage = document.getElementById('posts-loading-message');
    const loadMorePostsBtn = document.getElementById('load-more-posts-btn');

    const feedFilterNav = document.getElementById('feed-filter-nav');
    const categoryFilterList = document.getElementById('category-filter-list');
    const groupListNav = document.getElementById('group-list'); // For "Industry Groups"
    const sortPostsSelect = document.getElementById('sort-posts-select');

    const communityUserAvatar = document.getElementById('community-user-avatar');
    const communityUserName = document.getElementById('community-user-name');
    const communityUserCareer = document.getElementById('community-user-career');
    // const communityUserProfileLink = document.getElementById('community-user-profile-link'); // Not in HTML, but good for future
    const editProfileCommunityBtn = document.getElementById('edit-profile-community-btn');


    // --- State ---
    let currentUserCareer = localStorage.getItem('uplasUserCareer') || null;
    let postsCurrentPage = 1;
    const POSTS_PER_PAGE = 10;
    let isLoadingPosts = false;
    let currentFeedFilter = 'all'; // 'all', 'personalized', 'following'
    let currentCategoryFilter = 'all-categories'; // 'all-categories' or a category slug
    let currentSortOption = 'latest'; // 'latest', 'trending', 'top'
    let currentSearchTerm = ''; // For future search integration
    let noMorePostsToLoad = false;

    // --- Utility Functions ---
    const { displayFormStatus, clearFormStatus, validateInput: validateSingleInput, getAccessToken, redirectToLogin, getUserData } = window.uplasApi || {};
    const { uplasTranslate, uplasApplyTranslations, uplasGetCurrentLocale } = window;

    const escapeHTML = (str) => {
        if (typeof str !== 'string') return '';
        return str.replace(/[&<>'"]/g,
            tag => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[tag] || tag)
        );
    };

    const openModal = (modalElement) => {
        if (!modalElement) return;
        if (modalElement === createPostModal && !getAccessToken()) {
            redirectToLogin('Please log in to create a post.');
            return;
        }
        modalElement.hidden = false;
        document.body.classList.add('modal-open');
        setTimeout(() => modalElement.classList.add('active'), 10);
        const firstFocusable = modalElement.querySelector('input:not([type="hidden"]):not([disabled]), select, textarea, button');
        firstFocusable?.focus();
    };

    const closeModal = (modalElement) => {
        if (modalElement) {
            modalElement.classList.remove('active');
            document.body.classList.remove('modal-open');
            setTimeout(() => modalElement.hidden = true, 300);
        }
    };


    // --- Career/Industry Selection ---
    const handleCareerSelection = async (event) => {
        event.preventDefault();
        if (!careerInterestSelect || !otherCareerInput || !careerSelectionForm || !displayFormStatus) return;

        const selectedCareerValue = careerInterestSelect.value;
        const otherCareerValue = otherCareerInput.value.trim();
        let finalCareer = selectedCareerValue;

        if (selectedCareerValue === 'other-tech' && !otherCareerValue) {
            displayFormStatus(careerSelectionForm, uplasTranslate ? uplasTranslate('error_career_specify_other', {fallback:'Please specify your tech field.'}) : 'Please specify your tech field.', true);
            return;
        }
        if (selectedCareerValue === 'other-tech') finalCareer = otherCareerValue;

        if (finalCareer) {
            const submitButton = careerSelectionForm.querySelector('button[type="submit"]');
            if (submitButton) submitButton.disabled = true;
            displayFormStatus(careerSelectionForm, uplasTranslate ? uplasTranslate('status_saving_preference') : 'Saving preference...', false);

            try {
                const response = await window.uplasApi.fetchAuthenticated('/users/profile/', {
                    method: 'PATCH',
                    body: JSON.stringify({ career_interest: finalCareer })
                });
                const responseData = await response.json();

                if (response.ok) {
                    localStorage.setItem('uplasUserCareer', finalCareer);
                    currentUserCareer = finalCareer;
                     if (window.uplasApi && typeof window.uplasApi.storeUserData === 'function') { // Update local user data
                        const existingUserData = getUserData() || {};
                        window.uplasApi.storeUserData({...existingUserData, career_interest: finalCareer });
                    }
                    displayFormStatus(careerSelectionForm, uplasTranslate ? uplasTranslate('status_preference_saved') : 'Preference saved!', false);
                    setTimeout(() => closeModal(careerSelectionModal), 1500);
                    updateUserProfileSummary();
                    fetchPosts(1, true); // Refresh feed with new preference
                } else {
                    throw new Error(responseData.detail || 'Failed to save preference.');
                }
            } catch (error) {
                console.error("ucommunity.js: Error saving career preference:", error);
                displayFormStatus(careerSelectionForm, error.message, true, 'err_saving_preference_failed');
            } finally {
                if (submitButton) submitButton.disabled = false;
            }
        }
    };

    if (careerInterestSelect) {
        careerInterestSelect.addEventListener('change', () => {
            if (otherCareerGroup) {
                otherCareerGroup.classList.toggle('form__group--hidden', careerInterestSelect.value !== 'other-tech');
                if(otherCareerInput) otherCareerInput.required = (careerInterestSelect.value === 'other-tech');
            }
        });
    }
    if (careerSelectionForm) careerSelectionForm.addEventListener('submit', handleCareerSelection);

    async function checkAndShowCareerModal() {
        if (!getAccessToken()) {
            updateUserProfileSummary(); // Show login prompt
            return;
        }
        const userProfileData = getUserData(); // From uplasApi, uses localStorage
        currentUserCareer = userProfileData?.career_interest || localStorage.getItem('uplasUserCareer');

        if (!currentUserCareer && careerSelectionModal) {
            openModal(careerSelectionModal);
        } else {
            updateUserProfileSummary();
        }
    }

    // --- Create Post Modal & Form Handling ---
    if (createPostBtnSidebar) createPostBtnSidebar.addEventListener('click', () => openModal(createPostModal));
    if (closeCreatePostModalBtn) closeCreatePostModalBtn.addEventListener('click', () => closeModal(createPostModal));
    // Image preview for post attachment (if it were an image) - current HTML uses generic 'file'
    // if (postAttachmentInput && postAttachmentInput.type === 'file' && imagePreviewContainer && imagePreview) {
    //     postAttachmentInput.addEventListener('change', function(event) { /* ... image preview logic ... */ });
    // }

    const handleCreatePostSubmit = async (event) => {
        event.preventDefault();
        if (!createPostForm || !postContentTextarea || !postCategorySelectModal || !displayFormStatus) return;

        const title = createPostForm.querySelector('input[name="postTitle"]')?.value.trim(); // Get title
        const content = postContentTextarea.value.trim();
        const categoryId = postCategorySelectModal.value;
        const attachmentFile = postAttachmentInput?.files[0];

        if (!title) {
            displayFormStatus(createPostStatus, uplasTranslate ? uplasTranslate('error_post_title_required') : 'Post title cannot be empty.', true);
            return;
        }
        if (!content) {
            displayFormStatus(createPostStatus, uplasTranslate ? uplasTranslate('error_post_content_required') : 'Post content cannot be empty.', true);
            return;
        }
        if (!categoryId || categoryId === "all-categories" || categoryId === "") {
            displayFormStatus(createPostStatus, uplasTranslate ? uplasTranslate('error_post_category_required') : 'Please select a category for your post.', true);
            return;
        }

        const submitButton = createPostForm.querySelector('button[type="submit"]');
        if (submitButton) submitButton.disabled = true;
        displayFormStatus(createPostStatus, uplasTranslate ? uplasTranslate('status_creating_post') : 'Creating post...', false);

        try {
            const formData = new FormData();
            formData.append('title', title);
            formData.append('content', content);
            formData.append('category', categoryId); // Backend expects category ID directly
            if (createPostForm.querySelector('input[name="postTags"]')) { // If tags input exists
                 formData.append('tags_string', createPostForm.querySelector('input[name="postTags"]').value.trim());
            }
            if (attachmentFile) {
                formData.append('attachment', attachmentFile);
            }

            const response = await window.uplasApi.fetchAuthenticated('/community/posts/', {
                method: 'POST',
                body: formData, // fetchAuthenticated handles FormData Content-Type
                headers: {} // Let browser set Content-Type for FormData
            });
            const newPostData = await response.json();

            if (response.ok) {
                displayFormStatus(createPostStatus, uplasTranslate ? uplasTranslate('status_post_created') : 'Post created successfully!', false);
                prependPostToFeed(newPostData);
                createPostForm.reset();
                // if (imagePreviewContainer) imagePreviewContainer.style.display = 'none';
                // if (imagePreview) imagePreview.src = '#';
                setTimeout(() => closeModal(createPostModal), 1500);
                fetchPosts(1, true); // Refresh the feed to show the new post at the top with correct sorting
            } else {
                let errorMsg = 'Failed to create post.';
                if (newPostData.detail) errorMsg = newPostData.detail;
                else if (typeof newPostData === 'object') {
                    errorMsg = Object.entries(newPostData).map(([key, val]) => `${key}: ${Array.isArray(val) ? val.join(', ') : val}`).join('; ');
                }
                throw new Error(errorMsg);
            }
        } catch (error) {
            console.error('ucommunity.js: Error creating post:', error);
            displayFormStatus(createPostStatus, error.message, true, 'err_creating_post_failed');
        } finally {
            if (submitButton) submitButton.disabled = false;
        }
    };
    if (createPostForm) createPostForm.addEventListener('submit', handleCreatePostSubmit);

    // --- Fetching and Displaying Posts ---
    const renderPostItem = (post) => {
        const postId = post.id;
        const authorName = escapeHTML(post.author_details?.full_name || post.author_details?.username || 'Anonymous');
        const authorId = post.author_details?.id;
        const authorAvatarChar = (authorName === 'Anonymous' ? 'A' : authorName.charAt(0).toUpperCase());
        const authorAvatarUrl = post.author_details?.profile_picture_url;
        const currentLang = uplasGetCurrentLocale ? uplasGetCurrentLocale() : 'en-US';
        const postTimestamp = new Date(post.created_at).toLocaleString(currentLang, { dateStyle: 'medium', timeStyle: 'short' });
        const categoryName = escapeHTML(post.category_details?.name || 'General'); // Ensure category_details
        const postTitle = escapeHTML(post.title || 'Untitled Post'); // Add title
        const postContent = escapeHTML(post.content); // Markdown rendering can be added here
        const likeCount = post.likes_count || 0;
        const commentCount = post.comments_count || 0;
        const isLikedByCurrentUser = post.is_liked_by_current_user || false;
        const isSavedByCurrentUser = post.is_saved_by_current_user || false;
        let attachmentHTML = '';
        if (post.attachment_url) { // Check for attachment
             // Basic: just a link. Could be an image preview if type is image.
            attachmentHTML = `<div class="post-item__attachment">
                                <a href="${post.attachment_url}" target="_blank" rel="noopener noreferrer" data-translate-key="ucommunity_view_attachment">View Attachment</a>
                              </div>`;
        }


        return `
            <article class="post-item" data-post-id="${postId}">
                <header class="post-item__header">
                    <div class="post-item__avatar" ${authorAvatarUrl ? `style="background-image:url('${authorAvatarUrl}')"` : ''}>
                        ${!authorAvatarUrl ? authorAvatarChar : ''}
                    </div>
                    <div class="post-item__author-time">
                        <a href="${authorId ? `uprofile.html?userId=${authorId}` : '#'}" class="post-item__author">${authorName}</a>
                        <span class="post-item__timestamp">${postTimestamp}</span>
                    </div>
                    ${categoryName !== 'General' ? `<span class="post-item__category-badge">${categoryName}</span>` : ''}
                </header>
                <a href="ucommunity-post-detail.html?postId=${postId}" class="post-item__link">
                    <h4 class="post-item__title">${postTitle}</h4> {/* Display Post Title */}
                    <div class="post-item__content-preview">${postContent}</div>
                </a>
                ${attachmentHTML}
                <footer class="post-item__actions">
                    <button class="post-action-btn like-btn ${isLikedByCurrentUser ? 'active' : ''}" aria-pressed="${isLikedByCurrentUser}" aria-label="${uplasTranslate ? uplasTranslate('sr_like_this_post') : 'Like this post'}">
                        <i class="${isLikedByCurrentUser ? 'fas' : 'far'} fa-heart"></i> <span data-count="${likeCount}">${likeCount}</span> <span class="sr-only" data-translate-key="ucommunity_action_likes_sr">Likes</span>
                    </button>
                    <a href="ucommunity-post-detail.html?postId=${postId}#comments-section" class="post-action-btn">
                        <i class="far fa-comment-alt"></i> <span>${commentCount}</span> <span class="sr-only" data-translate-key="ucommunity_action_comments_sr">Comments</span>
                    </a>
                    <button class="post-action-btn share-btn" aria-label="${uplasTranslate ? uplasTranslate('sr_share_this_post') : 'Share this post'}"><i class="fas fa-share-square"></i> <span data-translate-key="ucommunity_action_share">Share</span></button>
                    <button class="post-action-btn save-btn ${isSavedByCurrentUser ? 'active' : ''}" aria-pressed="${isSavedByCurrentUser}" aria-label="${uplasTranslate ? uplasTranslate('sr_save_this_post') : 'Save this post'}">
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
            if (uplasApplyTranslations) uplasApplyTranslations(newPostElement);
        }
    };

    const fetchPosts = async (page = 1, resetList = false) => {
        if (isLoadingPosts || !postListContainer || !window.uplasApi ) return;
        isLoadingPosts = true;
        if (resetList) {
            if (postListContainer) postListContainer.innerHTML = '';
            postsCurrentPage = 1;
            noMorePostsToLoad = false;
        }
        if (postsLoadingMessage && postsCurrentPage === 1) postsLoadingMessage.style.display = 'block';
        if (loadMorePostsBtn) loadMorePostsBtn.style.display = 'none';

        let queryParams = `?page=${postsCurrentPage}&limit=${POSTS_PER_PAGE}`;
        if (currentFeedFilter !== 'all') queryParams += `&feed_type=${encodeURIComponent(currentFeedFilter)}`;
        if (currentCategoryFilter !== 'all-categories') queryParams += `&category_slug=${encodeURIComponent(currentCategoryFilter)}`; // Filter by slug
        if (currentSortOption !== 'latest') queryParams += `&ordering=${encodeURIComponent(currentSortOption === 'top' ? '-likes_count' : '-created_at')}`; // Adjust for backend ordering
        if (currentSearchTerm) queryParams += `&search=${encodeURIComponent(currentSearchTerm)}`;
        if (currentUserCareer && currentFeedFilter === 'personalized') queryParams += `&career_interest=${encodeURIComponent(currentUserCareer)}`;

        try {
            const response = await window.uplasApi.fetchAuthenticated(`/community/posts/${queryParams}`, {isPublic: true}); // Posts can be public
            const data = await response.json();

            if (!response.ok) throw new Error(data.detail || 'Failed to fetch posts.');

            if (postsLoadingMessage) postsLoadingMessage.style.display = 'none';
            if (data.results && data.results.length > 0) {
                data.results.forEach(post => postListContainer.insertAdjacentHTML('beforeend', renderPostItem(post)));
                attachActionListenersToFeed();
                if (noPostsMessage) noPostsMessage.style.display = 'none';
            } else if (postsCurrentPage === 1) {
                if (noPostsMessage) {
                    noPostsMessage.style.display = 'block';
                    noPostsMessage.textContent = uplasTranslate ? uplasTranslate('ucommunity_no_posts_message_filters') : "No posts found matching your criteria.";
                }
            }
            if (data.next) {
                if (loadMorePostsBtn) loadMorePostsBtn.style.display = 'block';
            } else {
                noMorePostsToLoad = true;
            }
        } catch (error) {
            console.error("ucommunity.js: Error fetching posts:", error);
            if (postsLoadingMessage) postsLoadingMessage.style.display = 'none';
            if (postListContainer && postsCurrentPage === 1) {
                postListContainer.innerHTML = `<p class="error-message" data-translate-key="ucommunity_error_loading_posts_param" data-translate-args='{"errorMessage": "${escapeHTML(error.message)}"}'>Could not load posts: ${escapeHTML(error.message)}</p>`;
            }
        } finally {
            isLoadingPosts = false;
            if (uplasApplyTranslations && postListContainer) uplasApplyTranslations(postListContainer);
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
    if (feedFilterNav) {
        feedFilterNav.addEventListener('click', (e) => {
            e.preventDefault();
            const targetLink = e.target.closest('a.sidebar-link');
            if (!targetLink || targetLink.classList.contains('active')) return;
            feedFilterNav.querySelectorAll('a.sidebar-link').forEach(link => link.classList.remove('active'));
            targetLink.classList.add('active');
            currentFeedFilter = targetLink.dataset.filter || 'all';
            fetchPosts(1, true);
        });
    }
    if (categoryFilterList) {
        categoryFilterList.addEventListener('click', (e) => {
            e.preventDefault();
            const targetLink = e.target.closest('a.sidebar-link');
            if (!targetLink || targetLink.classList.contains('active')) return;
            categoryFilterList.querySelectorAll('a.sidebar-link').forEach(link => link.classList.remove('active'));
            targetLink.classList.add('active');
            currentCategoryFilter = targetLink.dataset.categoryId || 'all-categories';
            fetchPosts(1, true);
        });
    }

    if (sortPostsSelect) {
        sortPostsSelect.addEventListener('change', () => {
            currentSortOption = sortPostsSelect.value;
            fetchPosts(1, true);
        });
    }

    // --- Dynamic Content Population (Categories, Groups, User Summary) ---
    const populateCategories = async () => {
        if (!categoryFilterList || !window.uplasApi) return;
        const loadingMsgEl = categoryFilterList.querySelector('.loading-message');
        try {
            const response = await window.uplasApi.fetchAuthenticated('/community/forums/?limit=100', {isPublic: true});
            if (!response.ok) throw new Error('Failed to load categories');
            const data = await response.json();
            const categories = data.results || data;

            if (loadingMsgEl) loadingMsgEl.remove();
            // Keep "All Categories" static, append fetched ones
            const allCategoriesLink = categoryFilterList.querySelector('a[data-category-id="all-categories"]');
            categoryFilterList.innerHTML = ''; // Clear only dynamic part
            if(allCategoriesLink) categoryFilterList.appendChild(allCategoriesLink.parentElement); // Re-add "All Categories" if it was there

            if(!allCategoriesLink) { // Add "All Categories" if not present from HTML
                 categoryFilterList.insertAdjacentHTML('afterbegin', `<a href="#" class="sidebar-link active" data-category-id="all-categories" data-translate-key="ucommunity_category_all">All Categories</a>`);
            }


            categories.forEach(cat => {
                const link = document.createElement('a');
                link.href = "#";
                link.className = 'sidebar-link';
                link.dataset.categoryId = cat.slug; // Use slug for filtering
                link.innerHTML = `<i class="fas ${cat.icon_class || 'fa-comments'}"></i> <span>${escapeHTML(cat.name)}</span>`;
                categoryFilterList.appendChild(link);

                if(postCategorySelectModal){ // Also populate create post modal
                    const option = document.createElement('option');
                    option.value = cat.id; // Use ID for posting
                    option.textContent = escapeHTML(cat.name);
                    postCategorySelectModal.appendChild(option);
                }
            });
            if (uplasApplyTranslations) {
                uplasApplyTranslations(categoryFilterList);
                if(postCategorySelectModal) uplasApplyTranslations(postCategorySelectModal);
            }
        } catch (error) {
            console.error("ucommunity.js: Error populating categories:", error);
            if (loadingMsgEl) loadingMsgEl.textContent = uplasTranslate ? uplasTranslate('error_loading_categories') : 'Error loading categories.';
            else if (categoryFilterList) categoryFilterList.insertAdjacentHTML('beforeend', `<p class="error-message">${uplasTranslate ? uplasTranslate('error_loading_categories') : 'Error loading categories.'}</p>`);
        }
    };

    const populateGroups = async () => { // Industry Groups
        if (!groupListNav || !window.uplasApi) return;
        const loadingMsgEl = groupListNav.querySelector('.loading-message');
        try {
            // Backend endpoint for groups. Placeholder.
            // This needs to be created in your Django 'community' app.
            // const response = await window.uplasApi.fetchAuthenticated('/community/industry-groups/?limit=20', {isPublic: true});
            // if (!response.ok) throw new Error('Failed to load industry groups');
            // const data = await response.json();
            // const groups = data.results || data;

            // --- MOCK DATA FOR GROUPS until backend is ready ---
            await new Promise(resolve => setTimeout(resolve, 500)); // Simulate delay
            const groups = [
                { id: 'ai-healthcare', name: 'AI in Healthcare', slug: 'ai-healthcare', member_count: 120, icon_class: 'fa-hospital-user' },
                { id: 'ml-finance', name: 'ML in Finance', slug: 'ml-finance', member_count: 85, icon_class: 'fa-chart-line' },
                { id: 'nlp-research', name: 'NLP Researchers', slug: 'nlp-research', member_count: 200, icon_class: 'fa-brain' }
            ];
            // --- END MOCK DATA ---

            if (loadingMsgEl) loadingMsgEl.remove();
            groupListNav.innerHTML = '';
            if (groups.length === 0) {
                groupListNav.innerHTML = `<p data-translate-key="ucommunity_no_groups_available">No groups available yet.</p>`;
            } else {
                groups.forEach(group => {
                    const link = document.createElement('a');
                    link.href = `/community/groups/${group.slug || group.id}`; // Link to group detail page
                    link.className = 'sidebar-link';
                    link.innerHTML = `<i class="fas ${group.icon_class || 'fa-users'}"></i> <span>${escapeHTML(group.name)}</span> ${group.member_count ? `<span class="badge badge--small">${group.member_count}</span>` : ''}`;
                    groupListNav.appendChild(link);
                });
            }
            if (uplasApplyTranslations) uplasApplyTranslations(groupListNav);
        } catch (error) {
            console.error("ucommunity.js: Error populating industry groups:", error);
            if (loadingMsgEl) loadingMsgEl.textContent = uplasTranslate ? uplasTranslate('error_loading_groups') : 'Error loading groups.';
             else if (groupListNav) groupListNav.insertAdjacentHTML('beforeend', `<p class="error-message">${uplasTranslate ? uplasTranslate('error_loading_groups') : 'Error loading groups.'}</p>`);
        }
    };

    async function updateUserProfileSummary() {
        if (!window.uplasApi) {
            // Show login prompt if API utils not ready
            const profileWidget = document.getElementById('user-profile-summary-community');
            if (profileWidget && communityUserName) {
                profileWidget.innerHTML = `<p data-translate-key="ucommunity_login_prompt_sidebar">Login to personalize your experience and contribute!</p><a href="index.html#auth-section" class="button button--primary button--small button--full-width" data-translate-key="nav_login_signup">Login/Sign Up</a>`;
                if (uplasApplyTranslations) uplasApplyTranslations(profileWidget);
            }
            return;
        }

        const userData = getUserData(); // Uses localStorage, updated by initializeUserSession

        if (userData && getAccessToken()) {
            if (communityUserName) communityUserName.textContent = userData.full_name || userData.username || "Uplas User";
            if (communityUserCareer) communityUserCareer.textContent = userData.career_interest || currentUserCareer || (uplasTranslate ? uplasTranslate('ucommunity_career_placeholder_sidebar') : 'AI Explorer');
            if (communityUserAvatar) {
                if (userData.profile_picture_url) {
                    communityUserAvatar.innerHTML = `<img src="${userData.profile_picture_url}" alt="${userData.full_name || 'User'} avatar" style="width:100%; height:100%; border-radius:50%; object-fit:cover;">`;
                } else {
                    communityUserAvatar.textContent = (userData.full_name || userData.username || 'U').charAt(0).toUpperCase();
                    communityUserAvatar.style.backgroundImage = '';
                }
            }
            if(editProfileCommunityBtn) editProfileCommunityBtn.href = "uprofile_settings.html"; // Link to profile settings
        } else {
            // User not logged in - display login prompt
            const profileWidget = document.getElementById('user-profile-summary-community');
            if (profileWidget) {
                profileWidget.innerHTML = `
                    <h3 class="sidebar-title" data-translate-key="ucommunity_sidebar_my_profile">My Profile</h3>
                    <p data-translate-key="ucommunity_login_prompt_sidebar">Login to personalize your experience and contribute!</p>
                    <a href="index.html#auth-section" class="button button--primary button--small button--full-width" data-translate-key="nav_login_signup">Login/Sign Up</a>`;
                if (uplasApplyTranslations) uplasApplyTranslations(profileWidget);
            }
        }
    }


    // --- Post Action Listeners (Like, Share, Save) ---
    function attachActionListenersToPost(postElement) {
        const postId = postElement.dataset.postId;
        if (!postId) return;

        const likeBtn = postElement.querySelector('.like-btn');
        const saveBtn = postElement.querySelector('.save-btn');
        const shareBtn = postElement.querySelector('.share-btn');

        if (likeBtn) {
            likeBtn.addEventListener('click', async () => {
                if (!getAccessToken()) { redirectToLogin('Please log in to like posts.'); return; }
                const isLiked = likeBtn.classList.contains('active');
                const method = 'POST'; // Backend LikeToggleAPIView handles toggle with POST
                const likeCountSpan = likeBtn.querySelector('span[data-count]');
                const currentLikeCount = parseInt(likeCountSpan.dataset.count) || 0;

                likeBtn.disabled = true;
                try {
                    const response = await window.uplasApi.fetchAuthenticated('/community/like-toggle/', {
                        method: method,
                        body: JSON.stringify({ content_type_model: 'communitypost', object_id: postId }) // Ensure model name matches backend
                    });
                    const data = await response.json();
                    if (response.ok) {
                        likeBtn.classList.toggle('active', data.liked);
                        likeBtn.setAttribute('aria-pressed', data.liked.toString());
                        likeBtn.querySelector('i').className = data.liked ? 'fas fa-heart' : 'far fa-heart';
                        likeCountSpan.textContent = data.likes_count;
                        likeCountSpan.dataset.count = data.likes_count;
                    } else { throw new Error(data.detail || 'Failed to update like status.'); }
                } catch (error) {
                    console.error("ucommunity.js: Error liking/unliking post:", error);
                    // Optionally display an error to the user
                    if(displayFormStatus) displayFormStatus(postElement.querySelector('.post-item__actions'), error.message, true);

                } finally { likeBtn.disabled = false; }
            });
        }

        if (saveBtn) {
            saveBtn.addEventListener('click', async () => {
                if (!getAccessToken()) { redirectToLogin('Please log in to save posts.'); return; }
                // API call to /api/community/posts/{postId}/save-toggle/
                saveBtn.disabled = true;
                try {
                    const response = await window.uplasApi.fetchAuthenticated(`/community/posts/${postId}/save-toggle/`, { method: 'POST' });
                    const data = await response.json();
                    if (response.ok) {
                        saveBtn.classList.toggle('active', data.is_saved);
                        saveBtn.setAttribute('aria-pressed', data.is_saved.toString());
                        saveBtn.querySelector('i').className = data.is_saved ? 'fas fa-bookmark' : 'far fa-bookmark';
                    } else { throw new Error(data.detail || 'Failed to update save status.'); }
                } catch (error) {
                    console.error("ucommunity.js: Error saving/unsaving post:", error);
                    if(displayFormStatus) displayFormStatus(postElement.querySelector('.post-item__actions'), error.message, true);
                } finally { saveBtn.disabled = false; }
            });
        }

        if (shareBtn) { /* ... (client-side share logic remains the same) ... */ }
    }

    function attachActionListenersToFeed() {
        postListContainer?.querySelectorAll('.post-item').forEach(postElement => {
            if (!postElement.dataset.listenersAttached) {
                attachActionListenersToPost(postElement);
                postElement.dataset.listenersAttached = 'true';
            }
        });
    }

    // --- Initial Load ---
    const initializeCommunityPage = async () => {
        console.log("ucommunity.js: Initializing Uplas Community Page...");
        if (!window.uplasApi) {
            console.error("ucommunity.js: CRITICAL - uplasApi is not defined.");
            if (document.body) document.body.innerHTML = "<p class='error-message' data-translate-key='error_api_unavailable_critical'>Critical error loading page utilities.</p>";
            if(uplasApplyTranslations) uplasApplyTranslations(document.body);
            return;
        }
        // Initial user state check for career modal and profile summary
        await checkAndShowCareerModal(); // Also updates user profile summary if career is set

        // Populate dynamic sidebar content
        populateCategories(); // Fetches categories/forums
        populateGroups();     // Fetches/mocks industry groups

        // Initial fetch of posts
        fetchPosts(1, true);
    };

    initializeCommunityPage();

    // Listen for auth changes to update profile summary
    window.addEventListener('authChanged', (event) => {
        console.log("ucommunity.js: authChanged event detected.", event.detail);
        currentUserCareer = getUserData()?.career_interest || localStorage.getItem('uplasUserCareer');
        updateUserProfileSummary(); // Re-render user profile section
        if (event.detail.loggedIn) {
            fetchPosts(1, true); // Refresh feed if user just logged in
        } else {
            // If user logged out, might want to clear personalized feed or switch to 'all'
            currentFeedFilter = 'all';
            const allPostsFilterLink = feedFilterNav?.querySelector('a[data-filter="all"]');
            if(allPostsFilterLink) {
                feedFilterNav.querySelectorAll('a.sidebar-link').forEach(link => link.classList.remove('active'));
                allPostsFilterLink.classList.add('active');
            }
            fetchPosts(1, true);
        }
    });


}); // End DOMContentLoaded
