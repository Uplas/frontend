// js/blog-post-detail.js
/* ==========================================================================
   Uplas Blog Post Detail Page JavaScript (blog-post-detail.js)
   - Handles dynamic content loading for a specific blog post.
   - Manages social sharing, comments.
   - Relies on global.js for theme, nav, language.
   - Relies on apiUtils.js for API calls.
   ========================================================================== */
'use strict';

document.addEventListener('DOMContentLoaded', () => {
    // --- Element Selectors ---
    const articleContainer = document.getElementById('blog-article-container');
    const breadcrumbArticleTitle = document.getElementById('breadcrumb-article-title');
    const articleMainTitle = document.getElementById('article-main-title');
    const articleAuthorAvatar = document.getElementById('article-author-avatar');
    const articleAuthorName = document.getElementById('article-author-name');
    const articlePublishDate = document.getElementById('article-publish-date');
    const articleCategoryLink = document.getElementById('article-category-link');
    const articleReadingTime = document.getElementById('article-reading-time');
    const articleFeaturedImage = document.getElementById('article-featured-image');
    const featuredImageCaption = document.getElementById('featured-image-caption');
    const articleBodyContent = document.getElementById('article-body-content');
    const articleTagsContainer = document.getElementById('article-tags-container');

    const bioAuthorAvatar = document.getElementById('bio-author-avatar');
    const bioAuthorName = document.getElementById('bio-author-name');
    const bioAuthorTitleOrg = document.getElementById('bio-author-title-org');
    const bioAuthorDescription = document.getElementById('bio-author-description');
    const bioAuthorSocial = document.getElementById('bio-author-social');

    const relatedArticlesGrid = document.getElementById('related-articles-grid');
    const commentsList = document.getElementById('comments-list');
    const commentCountSpan = document.getElementById('comment-count');
    const addCommentForm = document.getElementById('add-comment-form');
    const commentFormStatus = document.getElementById('comment-form-status');

    const shareTwitterBtn = document.getElementById('share-twitter');
    const shareLinkedinBtn = document.getElementById('share-linkedin');
    const shareFacebookBtn = document.getElementById('share-facebook');
    const copyLinkBtn = document.getElementById('copy-link');
    const copyLinkFeedback = document.getElementById('copy-link-feedback');

    let currentArticleSlug = null; // Store the slug for comment submission

    // --- Utility Functions ---
    const displayStatus = (element, message, type = 'info', isError = false, translateKey = null) => {
        if (typeof window.uplasApi !== 'undefined' && typeof window.uplasApi.displayFormStatus === 'function') {
            // uplasApi.displayFormStatus expects (element, message, isError, translateKey)
            window.uplasApi.displayFormStatus(element, message, isError, translateKey);
        } else if (element) {
            element.textContent = message;
            element.style.color = isError ? 'var(--color-error, red)' : 'var(--color-success, green)';
            element.style.display = 'block';
            element.hidden = false;
            if (!isError) setTimeout(() => { if(element) element.style.display = 'none'; }, 5000);
        } else {
            console.warn("displayStatus: Target element not found. Message:", message);
        }
    };

    const clearStatus = (element) => {
        if (element) {
            element.textContent = '';
            element.style.display = 'none';
            element.hidden = true;
        }
    };

    const escapeHTML = (str) => {
        if (typeof str !== 'string') return '';
        return str.replace(/[&<>'"]/g,
            tag => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[tag] || tag)
        );
    };

    // --- Dynamic Content Loading ---
    async function fetchArticleData(slug) {
        if (!articleContainer) {
            console.error("Article container not found.");
            return;
        }
        if (typeof window.uplasApi === 'undefined' || typeof window.uplasApi.fetchAuthenticated !== 'function') {
            console.error("uplasApi.fetchAuthenticated is not available.");
            if (articleBodyContent) articleBodyContent.innerHTML = `<p class="error-message">Core API utility not loaded. Cannot fetch article.</p>`;
            return;
        }

        currentArticleSlug = slug;

        if (articleBodyContent) articleBodyContent.innerHTML = `<p class="loading-article-message" data-translate-key="blog_post_loading_content">Loading article content...</p>`;
        if (window.uplasTranslate && articleBodyContent) window.uplasTranslate(articleBodyContent.querySelector('p'));


        try {
            console.log(`Fetching article with slug: ${slug}`);
            // L38: fetchArticleData(slug)
            // L44-L46: Action: Replace simulation with an API call to fetch a single blog post by its slug.
            // Blog posts are often public. If this endpoint doesn't require authentication,
            // you could use a direct `fetch` or add an `isPublic: true` option to fetchAuthenticated if supported.
            // For now, assuming fetchAuthenticated handles it (e.g., doesn't add token if not needed or endpoint is whitelisted).
            const response = await window.uplasApi.fetchAuthenticated(`/blog/posts/${slug}/`);

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({ detail: `Failed to fetch article. Status: ${response.status}` }));
                throw new Error(errorData.detail || `HTTP error! Status: ${response.status}`);
            }
            const article = await response.json();
            // Expected article structure from backend:
            // title, slug, author: { full_name, profile_picture_url, username, bio (optional sub-object) },
            // published_at, category: { name, slug, name_key (optional) }, reading_time,
            // featured_image_url, featured_image_caption, content_html,
            // tags: [{ name, slug }], related_posts_slugs: ['slug1', 'slug2']

            populateArticleContent(article);
            setupSocialSharing(article.title, window.location.href);

            if (article.related_posts_slugs && article.related_posts_slugs.length > 0) {
                fetchRelatedArticles(article.related_posts_slugs);
            } else {
                if (relatedArticlesGrid) relatedArticlesGrid.innerHTML = `<p data-translate-key="blog_post_no_related">No related articles found.</p>`;
            }
            fetchComments(slug);

            if (window.Prism) window.Prism.highlightAll(); // Re-run Prism for new code blocks
            if (window.uplasApplyTranslations) window.uplasApplyTranslations(articleContainer); // Translate newly added content

        } catch (error) {
            console.error("Error fetching article data:", error);
            if (articleBodyContent) articleBodyContent.innerHTML = `<p class="error-message" data-translate-key="blog_post_error_loading">Could not load the article: ${escapeHTML(error.message)}. Please try again later.</p>`;
            if (window.uplasTranslate && articleBodyContent) window.uplasTranslate(articleBodyContent.querySelector('p'));
        }
    }

    function populateArticleContent(article) {
        document.title = `${article.title || 'Blog Post'} | Uplas AI Insights`;
        updateMetaTag('meta[name="description"]', article.excerpt || (article.content_html?.substring(0, 155).replace(/<[^>]*>/g, '') + "..."));
        updateMetaTag('meta[property="og:title"]', `${article.title || 'Uplas Blog'} | Uplas`);
        if (article.featured_image_url) updateMetaTag('meta[property="og:image"]', article.featured_image_url);
        // ... (other meta tags from your original file)

        if (breadcrumbArticleTitle) breadcrumbArticleTitle.textContent = article.title;
        if (articleMainTitle) articleMainTitle.textContent = article.title;

        if (article.author) {
            if (articleAuthorAvatar) articleAuthorAvatar.src = article.author.profile_picture_url || 'https://placehold.co/40x40/00b4d8/FFFFFF?text=A&font=poppins';
            if (articleAuthorName) articleAuthorName.textContent = article.author.full_name || article.author.username || 'Uplas Team';
        }

        if (articlePublishDate && article.published_at) {
            const date = new Date(article.published_at);
            articlePublishDate.textContent = date.toLocaleDateString(document.documentElement.lang || 'en-US', { year: 'numeric', month: 'long', day: 'numeric' });
            articlePublishDate.dateTime = date.toISOString();
        }
        if (articleCategoryLink && article.category) {
            articleCategoryLink.textContent = article.category.name;
            articleCategoryLink.href = `ublog.html?category=${article.category.slug}`;
            if (article.category.name_key) articleCategoryLink.dataset.translateKey = article.category.name_key;
        }
        if (articleReadingTime && article.reading_time) {
            articleReadingTime.textContent = article.reading_time; // e.g., "7 min read"
            if (article.reading_time_key) articleReadingTime.dataset.translateKey = article.reading_time_key;
        }

        if (articleFeaturedImage && article.featured_image_url) {
            articleFeaturedImage.src = article.featured_image_url;
            articleFeaturedImage.alt = article.title || 'Blog post image';
            articleFeaturedImage.hidden = false;
        } else if (articleFeaturedImage) {
            articleFeaturedImage.hidden = true;
        }

        if (featuredImageCaption) {
            featuredImageCaption.textContent = article.featured_image_caption || '';
            if (article.featured_image_caption_key) featuredImageCaption.dataset.translateKey = article.featured_image_caption_key;
            featuredImageCaption.style.display = article.featured_image_caption ? 'block' : 'none';
        }

        if (articleBodyContent) {
            articleBodyContent.innerHTML = article.content_html || '<p data-translate-key="blog_post_content_unavailable">Content not available.</p>';
        }

        if (articleTagsContainer && article.tags && article.tags.length > 0) {
            articleTagsContainer.innerHTML = `<strong data-translate-key="blog_tags_label">Tags:</strong> `;
            article.tags.forEach(tag => {
                const tagLink = document.createElement('a');
                tagLink.href = `ublog.html?tag=${encodeURIComponent(tag.slug)}`;
                tagLink.classList.add('tag');
                tagLink.textContent = `#${tag.name}`;
                articleTagsContainer.appendChild(tagLink);
                articleTagsContainer.appendChild(document.createTextNode(' '));
            });
            articleTagsContainer.style.display = 'block';
        } else if (articleTagsContainer) {
            articleTagsContainer.style.display = 'none';
        }

        const authorBioSection = document.getElementById('author-bio-section');
        if (article.author_bio && authorBioSection) { // Assuming author_bio is a sub-object on article
            if(bioAuthorAvatar) bioAuthorAvatar.src = article.author_bio.avatar_url || article.author?.profile_picture_url || 'https://placehold.co/100x100/0077b6/FFFFFF?text=A&font=poppins';
            if(bioAuthorName) bioAuthorName.textContent = article.author_bio.name || article.author?.full_name || 'Uplas Author';
            if(bioAuthorTitleOrg) bioAuthorTitleOrg.textContent = article.author_bio.title_org || '';
            if(bioAuthorDescription) bioAuthorDescription.innerHTML = article.author_bio.description_html || escapeHTML(article.author_bio.description || 'No biography available.'); // Prefer HTML if available
            if(bioAuthorSocial) {
                bioAuthorSocial.innerHTML = '';
                if(article.author_bio.social_links?.twitter) bioAuthorSocial.innerHTML += `<a href="${article.author_bio.social_links.twitter}" target="_blank" rel="noopener noreferrer" aria-label="Author on Twitter"><i class="fab fa-twitter"></i></a> `;
                if(article.author_bio.social_links?.linkedin) bioAuthorSocial.innerHTML += `<a href="${article.author_bio.social_links.linkedin}" target="_blank" rel="noopener noreferrer" aria-label="Author on LinkedIn"><i class="fab fa-linkedin-in"></i></a>`;
            }
            authorBioSection.style.display = 'block';
        } else if (authorBioSection) {
            authorBioSection.style.display = 'none';
        }
    }

    function updateMetaTag(selector, content) {
        const element = document.querySelector(selector);
        if (element && content) {
            element.setAttribute('content', content);
        }
    }

    function setupSocialSharing(title, url) {
        const encodedUrl = encodeURIComponent(url);
        const encodedTitle = encodeURIComponent(title);

        if (shareTwitterBtn) shareTwitterBtn.href = `https://twitter.com/intent/tweet?url=${encodedUrl}&text=${encodedTitle}&via=UplasPlatform`;
        if (shareLinkedinBtn) shareLinkedinBtn.href = `https://www.linkedin.com/shareArticle?mini=true&url=${encodedUrl}&title=${encodedTitle}`;
        if (shareFacebookBtn) shareFacebookBtn.href = `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`;

        if (copyLinkBtn && copyLinkFeedback) {
            copyLinkBtn.addEventListener('click', (e) => {
                e.preventDefault();
                navigator.clipboard.writeText(url).then(() => {
                    copyLinkFeedback.textContent = window.uplasTranslate ? window.uplasTranslate('link_copied_feedback', {fallback: 'Link copied!'}) : 'Link copied!';
                    copyLinkFeedback.style.opacity = 1;
                    setTimeout(() => { copyLinkFeedback.style.opacity = 0; }, 2000);
                }).catch(err => {
                    console.error('Failed to copy link:', err);
                    copyLinkFeedback.textContent = window.uplasTranslate ? window.uplasTranslate('link_copy_failed_feedback', {fallback: 'Failed to copy.'}) : 'Failed to copy.';
                    copyLinkFeedback.style.opacity = 1;
                    setTimeout(() => { copyLinkFeedback.style.opacity = 0; }, 2000);
                });
            });
        }
    }

    async function fetchRelatedArticles(relatedSlugsArray) {
        if (!relatedArticlesGrid || !relatedSlugsArray || relatedSlugsArray.length === 0) {
            if (relatedArticlesGrid) relatedArticlesGrid.innerHTML = `<p data-translate-key="blog_post_no_related">No related articles found.</p>`;
            if (window.uplasTranslate && relatedArticlesGrid) window.uplasTranslate(relatedArticlesGrid.querySelector('p'));
            return;
        }
        if (typeof window.uplasApi === 'undefined' || typeof window.uplasApi.fetchAuthenticated !== 'function') {
            console.error("uplasApi.fetchAuthenticated is not available for related articles.");
            if (relatedArticlesGrid) relatedArticlesGrid.innerHTML = `<p class="error-message">Could not load related articles.</p>`;
            return;
        }

        relatedArticlesGrid.innerHTML = `<p class="loading-message" data-translate-key="blog_post_loading_related">Loading related articles...</p>`;
        if (window.uplasTranslate && relatedArticlesGrid) window.uplasTranslate(relatedArticlesGrid.querySelector('p'));

        try {
            // L161: fetchRelatedArticles(relatedSlugs)
            // L167-L168: Action: API call to fetch previews for related articles.
            const response = await window.uplasApi.fetchAuthenticated(`/blog/posts/previews/?slugs=${relatedSlugsArray.join(',')}`);
            if (!response.ok) {
                const errorData = await response.json().catch(() => ({ detail: `Failed to fetch related articles. Status: ${response.status}` }));
                throw new Error(errorData.detail);
            }
            const relatedArticles = await response.json(); // Expects an array of { slug, title, category: { name, name_key? }, featured_image_url, title_key? }

            relatedArticlesGrid.innerHTML = '';
            if (relatedArticles && relatedArticles.length > 0) {
                relatedArticles.forEach(article => {
                    const cardHTML = `
                        <article class="related-article-card">
                            <a href="blog-post-detail.html?slug=${article.slug}" class="related-article-link">
                                <img src="${article.featured_image_url || 'https://placehold.co/300x200/00b4d8/FFFFFF?text=Related&font=poppins'}" alt="${escapeHTML(article.title)}" class="related-article-image">
                                <div class="related-article-content">
                                    <h4 class="related-article-title" ${article.title_key ? `data-translate-key="${article.title_key}"` : ''}>${escapeHTML(article.title)}</h4>
                                    ${article.category ? `<span class="related-article-category" ${article.category.name_key ? `data-translate-key="${article.category.name_key}"` : ''}>${escapeHTML(article.category.name)}</span>` : ''}
                                </div>
                            </a>
                        </article>
                    `;
                    relatedArticlesGrid.insertAdjacentHTML('beforeend', cardHTML);
                });
            } else {
                relatedArticlesGrid.innerHTML = `<p data-translate-key="blog_post_no_related">No related articles found.</p>`;
            }
            if (window.uplasApplyTranslations) window.uplasApplyTranslations(relatedArticlesGrid);
        } catch (error) {
            console.error("Error fetching related articles:", error);
            if (relatedArticlesGrid) relatedArticlesGrid.innerHTML = `<p class="error-message">Error loading related articles: ${escapeHTML(error.message)}</p>`;
        }
    }

    async function fetchComments(slugForComments) {
        if (!commentsList || !commentCountSpan) return;
        if (typeof window.uplasApi === 'undefined' || typeof window.uplasApi.fetchAuthenticated !== 'function') {
            console.error("uplasApi.fetchAuthenticated is not available for comments.");
            if (commentsList) commentsList.innerHTML = `<p class="error-message">Could not load comments.</p>`;
            return;
        }

        commentsList.innerHTML = `<p class="loading-message" data-translate-key="blog_post_loading_comments">Loading comments...</p>`;
        if (window.uplasTranslate && commentsList) window.uplasTranslate(commentsList.querySelector('p'));

        try {
            // L186: fetchComments(articleSlug)
            // L190-L191: Action: API call to fetch comments.
            const response = await window.uplasApi.fetchAuthenticated(`/blog/posts/${slugForComments}/comments/`);
            if (!response.ok) {
                const errorData = await response.json().catch(() => ({ detail: `Failed to load comments. Status: ${response.status}` }));
                throw new Error(errorData.detail);
            }
            const commentsData = await response.json(); // Expects { count: X, results: [...] } or just [...]
            // Comment object: { id, author: { full_name, username, profile_picture_url }, created_at, content, parent_comment_id? }

            const commentsArray = commentsData.results || commentsData;
            commentCountSpan.textContent = commentsData.count !== undefined ? commentsData.count : commentsArray.length;
            commentsList.innerHTML = '';

            if (commentsArray.length > 0) {
                commentsArray.forEach(comment => {
                    const authorName = escapeHTML(comment.author?.full_name || comment.author?.username || 'Anonymous');
                    const commentDate = new Date(comment.created_at).toLocaleDateString(document.documentElement.lang || 'en-US', { year: 'numeric', month: 'short', day: 'numeric' });
                    const commentText = escapeHTML(comment.content);
                    // Basic comment HTML, can be enhanced for replies
                    const commentHTML = `
                        <div class="comment-item" id="comment-${comment.id}">
                            <img src="${comment.author?.profile_picture_url || 'https://placehold.co/40x40/adb5bd/FFFFFF?text=U&font=poppins'}" alt="${authorName}" class="comment-author-avatar">
                            <div class="comment-content">
                                <p class="comment-meta">
                                    <strong class="comment-author">${authorName}</strong>
                                    <span class="comment-date">on ${commentDate}</span>
                                </p>
                                <p class="comment-text">${commentText.replace(/\n/g, '<br>')}</p>
                                </div>
                        </div>
                    `;
                    commentsList.insertAdjacentHTML('beforeend', commentHTML);
                });
            } else {
                commentsList.innerHTML = `<p class="no-comments-message" data-translate-key="blog_post_no_comments">Be the first to comment!</p>`;
            }
            if (window.uplasApplyTranslations) window.uplasApplyTranslations(commentsList);
        } catch (error) {
            console.error("Error fetching comments:", error);
            if (commentsList) commentsList.innerHTML = `<p class="error-message">Error loading comments: ${escapeHTML(error.message)}</p>`;
        }
    }

    if (addCommentForm) {
        addCommentForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            if (typeof window.uplasApi === 'undefined' || typeof window.uplasApi.fetchAuthenticated !== 'function') {
                displayStatus(commentFormStatus, 'Commenting service unavailable.', 'error', true, 'error_service_unavailable');
                return;
            }
            if (!currentArticleSlug) {
                displayStatus(commentFormStatus, 'Cannot submit comment: Article not identified.', 'error', true, 'blog_post_error_no_slug_for_comment');
                return;
            }

            const textInput = addCommentForm.querySelector('[name="commentText"]'); // Ensure name="commentText"
            const text = textInput ? textInput.value.trim() : '';

            if (!text) {
                displayStatus(commentFormStatus, 'Comment text cannot be empty.', 'error', true, 'error_comment_text_required');
                return;
            }
            const submitButton = addCommentForm.querySelector('button[type="submit"]');
            if (submitButton) submitButton.disabled = true;
            displayStatus(commentFormStatus, 'Submitting comment...', 'info', false, 'blog_post_comment_submitting');

            const commentData = { content: text };
            // Backend will associate the comment with the authenticated user.
            // If anonymous comments were allowed, you'd collect name/email here.

            try {
                // L207: Inside addCommentForm.addEventListener
                // L216: Action: API call to submit a new comment.
                // POST to /api/blog/posts/{currentArticleSlug}/comments/
                const response = await window.uplasApi.fetchAuthenticated(
                    `/blog/posts/${currentArticleSlug}/comments/`,
                    {
                        method: 'POST',
                        body: JSON.stringify(commentData),
                    }
                );
                const responseData = await response.json(); // Try to parse JSON even for errors

                if (response.ok) {
                    displayStatus(commentFormStatus, responseData.message || 'Comment submitted successfully!', 'success', false, 'blog_post_comment_success');
                    addCommentForm.reset();
                    fetchComments(currentArticleSlug); // Refresh comments list
                } else {
                    let errorMessage = 'Failed to submit comment.';
                    if (responseData.detail) errorMessage = responseData.detail;
                    else if (responseData.content && Array.isArray(responseData.content)) errorMessage = `Content: ${responseData.content.join(' ')}`;
                    else if (typeof responseData === 'object' && Object.keys(responseData).length > 0) {
                        errorMessage = Object.entries(responseData)
                            .map(([field, errors]) => `${field}: ${Array.isArray(errors) ? errors.join(', ') : errors}`)
                            .join('; ');
                    }
                    displayStatus(commentFormStatus, errorMessage, 'error', true);
                }
            } catch (error) {
                console.error("Error submitting comment:", error);
                displayStatus(commentFormStatus, error.message || 'An error occurred. Please try again.', 'error', true, 'error_network');
            } finally {
                if (submitButton) submitButton.disabled = false;
            }
        });
    }

    // --- Initial Load ---
    const urlParams = new URLSearchParams(window.location.search);
    const articleSlugFromUrl = urlParams.get('slug');

    if (articleSlugFromUrl) {
        fetchArticleData(articleSlugFromUrl);
    } else {
        if (articleBodyContent) articleBodyContent.innerHTML = `<p class="error-message" data-translate-key="blog_post_error_no_slug">Article not specified. Please return to the blog to select an article.</p>`;
        if (window.uplasTranslate && articleBodyContent) window.uplasTranslate(articleBodyContent.querySelector('p'));
        console.error("No article slug found in URL.");
    }

    // const currentYearFooterSpan = document.getElementById('current-year-footer'); // Handled by global.js
    // if (currentYearFooterSpan && !currentYearFooterSpan.textContent?.match(/\d{4}/)) {
    //     currentYearFooterSpan.textContent = new Date().getFullYear();
    // }

    console.log("Uplas Blog Post Detail (blog-post-detail.js) loaded and API calls integrated.");
});
```

**Key Changes and Explanations:**

1.  **`fetchArticleData(slug)`** (L38 / L44-L46):
    * Replaced the simulation with:
        ```javascript
        const response = await window.uplasApi.fetchAuthenticated(`/blog/posts/${slug}/`);
        ```
    * It now assumes that blog posts might require authentication to view or that `fetchAuthenticated` handles public endpoints gracefully. If your blog posts are always public and never need an auth token, you could use a direct `fetch` call here or ensure `fetchAuthenticated` has an option to bypass token sending for specific paths.
    * The `populateArticleContent` function will now use the fields from the actual API response. I've updated it to expect common field names from a Django REST Framework serializer (e.g., `author.full_name`, `category.name`, `content_html`, `tags` as an array of objects, `related_posts_slugs`). **You'll need to ensure your backend `BlogPostDetailSerializer` provides these fields.**

2.  **`fetchRelatedArticles(relatedSlugsArray)`** (L161 / L167-L168):
    * Replaced simulation with:
        ```javascript
        const response = await window.uplasApi.fetchAuthenticated(`/blog/posts/previews/?slugs=${relatedSlugsArray.join(',')}`);
        ```
    * This calls the `/api/blog/posts/previews/` endpoint with a comma-separated list of slugs.
    * The rendering part now expects an array of article preview objects from the API, each with `slug`, `title`, `featured_image_url`, and `category` (which itself is an object with `name`).

3.  **`fetchComments(slugForComments)`** (L186 / L190-L191):
    * Replaced simulation with:
        ```javascript
        const response = await window.uplasApi.fetchAuthenticated(`/blog/posts/${slugForComments}/comments/`);
        ```
    * It expects a paginated response (like `{ count: X, results: [...] }`) or a direct array from the API. Each comment object should have `id`, `author` (object with `full_name`, `username`, `profile_picture_url`), `created_at`, and `content`.
    * The rendering logic for comments has been slightly enhanced to use these fields and display an author avatar.

4.  **`addCommentForm` Submit Listener** (L207 / L216):
    * Replaced simulation with:
        ```javascript
        const response = await window.uplasApi.fetchAuthenticated(
            `/blog/posts/${currentArticleSlug}/comments/`, // POST to the list endpoint is standard for DRF
            {
                method: 'POST',
                body: JSON.stringify(commentData),
            }
        );
        ```
    * The `commentData` payload now only sends `content`. The backend should automatically associate the comment with the currently authenticated user (via the JWT token). If you allow anonymous comments and want to capture name/email, your backend API and this payload would need to be adjusted.
    * On successful submission, it now calls `fetchComments(currentArticleSlug)` to refresh the comments list and display the newly added comment.
    * Error handling for comment submission has been improved to parse JSON error responses from the backend.

5.  **`displayStatus` Utility**:
    * Modified to use `window.uplasApi.displayFormStatus` if available, providing a consistent way to show messages. It falls back to a simpler local implementation if `uplasApi` or its method isn't found.

6.  **Error Handling & API Availability Checks**:
    * Added checks for `window.uplasApi` and `window.uplasApi.fetchAuthenticated` before making API calls to prevent errors if `apiUtils.js` hasn't loaded or initialized correctly.
    * `try...catch` blocks are used for all API calls, and error messages from the backend (parsed from JSON responses) are displayed to the user.

**Important Considerations:**

* **Script Loading Order**: Ensure `apiUtils.js` (which defines `window.uplasApi`) is loaded *before* `blog-post-detail.js` in your HTML.
* **Backend Endpoints & Serializers**:
    * Double-check that your Django backend API endpoints (`/api/blog/posts/{slug}/`, `/api/blog/posts/previews/?slugs=...`, `/api/blog/posts/{slug}/comments/`) are correctly configured and match these URLs.
    * Ensure your Django REST Framework serializers (`BlogPostDetailSerializer`, `BlogCommentSerializer`, and a new one for related post previews if needed) return data in the structure that this JavaScript now expects (e.g., nested author/category objects, field names like `content_html`, `featured_image_url`, `related_posts_slugs`).
* **Authentication for Blog Posts**:
    * Currently, all fetches use `fetchAuthenticated`. If your blog posts, related articles, and comments are meant to be publicly viewable without login, you might consider:
        1.  Making these specific backend endpoints public (e.g., using `permission_classes = [AllowAny]` in DRF views).
        2.  Modifying `fetchAuthenticated` in `apiUtils.js` to have an option (e.g., `options.isPublic = true`) to not send the `Authorization` header.
        3.  Or, using a direct `fetch()` call in `blog-post-detail.js` for these public endpoints.
    * Submitting a comment, however, should almost always require authentication.
* **CSRF Token**: If your Django backend uses session-based authentication alongside JWT for some views or if CSRF protection is enabled for POST requests even with JWT, you might need to include a CSRF token in the headers for the POST request (comment submission). `fetchAuthenticated` in `apiUtils.js` would be the place to add logic for fetching and including this token if necessary. However, for typical DRF + SimpleJWT setups, the `Authorization: Bearer <token>` header is usually sufficient for authenticated POST requests.

This updated `blog-post-detail.js` should now correctly interact with your backend to display blog content and handle comments. Remember to test thorough
