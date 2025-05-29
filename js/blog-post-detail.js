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

    const authorBioSection = document.getElementById('author-bio-section');
    const bioAuthorAvatar = document.getElementById('bio-author-avatar');
    const bioAuthorName = document.getElementById('bio-author-name');
    const bioAuthorTitleOrg = document.getElementById('bio-author-title-org');
    const bioAuthorDescription = document.getElementById('bio-author-description');
    const bioAuthorSocial = document.getElementById('bio-author-social');

    const relatedArticlesGrid = document.getElementById('related-articles-grid');
    const commentsList = document.getElementById('comments-list');
    const commentCountSpan = document.getElementById('comment-count');
    const addCommentForm = document.getElementById('add-comment-form');
    const commentFormStatus = document.getElementById('comment-form-status'); // Specific status for comment form

    const shareTwitterBtn = document.getElementById('share-twitter');
    const shareLinkedinBtn = document.getElementById('share-linkedin');
    const shareFacebookBtn = document.getElementById('share-facebook');
    const copyLinkBtn = document.getElementById('copy-link');
    const copyLinkFeedback = document.getElementById('copy-link-feedback');

    let currentArticleSlug = null;

    // --- Utility Functions ---
    const escapeHTML = (str) => {
        if (typeof str !== 'string') return '';
        return str.replace(/[&<>'"]/g,
            tag => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[tag] || tag)
        );
    };

    // --- Dynamic Content Loading ---
    async function fetchArticleData(slug) {
        if (!articleContainer) {
            console.error("blog-post-detail: Article container not found.");
            return;
        }
        if (typeof window.uplasApi === 'undefined' || typeof window.uplasApi.fetchAuthenticated !== 'function') {
            console.error("blog-post-detail: uplasApi.fetchAuthenticated is not available.");
            if (articleBodyContent) articleBodyContent.innerHTML = `<p class="error-message" data-translate-key="error_api_unavailable_critical">Core API utility not loaded. Cannot fetch article.</p>`;
            if (window.uplasApplyTranslations && articleBodyContent) window.uplasApplyTranslations(articleBodyContent);
            return;
        }

        currentArticleSlug = slug;

        if (articleBodyContent) articleBodyContent.innerHTML = `<p class="loading-article-message" data-translate-key="blog_post_loading_content">Loading article content...</p>`;
        if (window.uplasApplyTranslations && articleBodyContent) window.uplasApplyTranslations(articleBodyContent);

        try {
            console.log(`blog-post-detail: Fetching article with slug: ${slug}`);
            const response = await window.uplasApi.fetchAuthenticated(`/blog/posts/${slug}/`, { isPublic: true });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({ detail: `Failed to fetch article. Status: ${response.status}` }));
                throw new Error(errorData.detail || `HTTP error! Status: ${response.status}`);
            }
            const article = await response.json();

            populateArticleContent(article);
            setupSocialSharing(article.title, window.location.href);

            if (article.related_posts_slugs && article.related_posts_slugs.length > 0) {
                fetchRelatedArticles(article.related_posts_slugs);
            } else {
                if (relatedArticlesGrid) {
                    relatedArticlesGrid.innerHTML = `<p data-translate-key="blog_post_no_related">No related articles found.</p>`;
                    if (window.uplasApplyTranslations) window.uplasApplyTranslations(relatedArticlesGrid);
                }
            }
            fetchComments(slug); // Comments are typically public to view

            // Ensure Prism.js highlights new code blocks if present
            if (window.Prism && typeof window.Prism.highlightAll === 'function') {
                window.Prism.highlightAll();
            }
            if (window.uplasApplyTranslations) window.uplasApplyTranslations(articleContainer);

        } catch (error) {
            console.error("blog-post-detail: Error fetching article data:", error);
            if (articleBodyContent) {
                 articleBodyContent.innerHTML = `<p class="error-message" data-translate-key="blog_post_error_loading_param" data-translate-args='{"errorMessage": "${escapeHTML(error.message)}"}'>Could not load the article: ${escapeHTML(error.message)}. Please try again later.</p>`;
                 if (window.uplasApplyTranslations) window.uplasApplyTranslations(articleBodyContent);
            }
        }
    }

    function populateArticleContent(article) {
        document.title = `${article.title || 'Blog Post'} | Uplas AI Insights`;
        updateMetaTag('meta[name="description"]', article.excerpt || (article.content_html?.substring(0, 155).replace(/<[^>]*>/g, '') + "..."));
        updateMetaTag('meta[property="og:title"]', `${article.title || 'Uplas Blog'} | Uplas`);
        updateMetaTag('meta[property="og:url"]', window.location.href);
        if (article.featured_image_url) updateMetaTag('meta[property="og:image"]', new URL(article.featured_image_url, window.location.origin).href);
        if (article.published_at) updateMetaTag('meta[property="article:published_time"]', new Date(article.published_at).toISOString());
        if (article.author?.full_name) updateMetaTag('meta[property="article:author"]', article.author.full_name);


        if (breadcrumbArticleTitle) breadcrumbArticleTitle.textContent = article.title;
        if (articleMainTitle) articleMainTitle.textContent = article.title;

        if (article.author) {
            if (articleAuthorAvatar) {
                articleAuthorAvatar.src = article.author.profile_picture_url || 'https://placehold.co/40x40/00b4d8/FFFFFF?text=A&font=poppins';
                articleAuthorAvatar.alt = article.author.full_name || article.author.username || 'Author Avatar';
            }
            if (articleAuthorName) articleAuthorName.textContent = article.author.full_name || article.author.username || 'Uplas Team';
        }

        if (articlePublishDate && article.published_at) {
            const date = new Date(article.published_at);
            const currentLang = typeof window.uplasGetCurrentLocale === 'function' ? window.uplasGetCurrentLocale() : 'en-US';
            articlePublishDate.textContent = date.toLocaleDateString(currentLang, { year: 'numeric', month: 'long', day: 'numeric' });
            articlePublishDate.dateTime = date.toISOString();
        }
        if (articleCategoryLink && article.category) {
            articleCategoryLink.textContent = article.category.name;
            articleCategoryLink.href = `ublog.html?category=${article.category.slug}`;
            if (article.category.name_key) articleCategoryLink.dataset.translateKey = article.category.name_key;
        }
        if (articleReadingTime && article.reading_time) {
            articleReadingTime.textContent = article.reading_time;
            if (article.reading_time_key) articleReadingTime.dataset.translateKey = article.reading_time_key;
        }

        if (articleFeaturedImage) {
            if (article.featured_image_url) {
                articleFeaturedImage.src = article.featured_image_url;
                articleFeaturedImage.alt = article.title || 'Blog post image';
                articleFeaturedImage.hidden = false;
            } else {
                articleFeaturedImage.hidden = true;
            }
        }


        if (featuredImageCaption) {
            featuredImageCaption.textContent = article.featured_image_caption || '';
            if (article.featured_image_caption_key) featuredImageCaption.dataset.translateKey = article.featured_image_caption_key;
            featuredImageCaption.style.display = article.featured_image_caption ? 'block' : 'none';
        }

        if (articleBodyContent) {
            articleBodyContent.innerHTML = article.content_html || '<p data-translate-key="blog_post_content_unavailable">Content not available.</p>';
        }

        if (articleTagsContainer) {
            if (article.tags && article.tags.length > 0) {
                articleTagsContainer.innerHTML = `<strong data-translate-key="blog_post_tags_label">Tags:</strong> `;
                article.tags.forEach(tag => {
                    const tagLink = document.createElement('a');
                    tagLink.href = `ublog.html?tag=${encodeURIComponent(tag.slug || tag.name)}`; // Use slug if available
                    tagLink.classList.add('tag');
                    tagLink.textContent = `#${tag.name}`;
                    articleTagsContainer.appendChild(tagLink);
                    articleTagsContainer.appendChild(document.createTextNode(' '));
                });
                articleTagsContainer.style.display = 'block';
            } else {
                articleTagsContainer.style.display = 'none';
            }
        }

        if (authorBioSection) {
            if (article.author_bio) {
                if(bioAuthorAvatar) bioAuthorAvatar.src = article.author_bio.avatar_url || article.author?.profile_picture_url || 'https://placehold.co/100x100/0077b6/FFFFFF?text=A&font=poppins';
                if(bioAuthorName) bioAuthorName.textContent = article.author_bio.name || article.author?.full_name || 'Uplas Author';
                if(bioAuthorTitleOrg) bioAuthorTitleOrg.textContent = article.author_bio.title_org || '';
                if(bioAuthorDescription) bioAuthorDescription.innerHTML = article.author_bio.description_html || escapeHTML(article.author_bio.description || 'No biography available.');
                if(bioAuthorSocial) {
                    bioAuthorSocial.innerHTML = ''; // Clear previous
                    if(article.author_bio.social_links?.twitter) bioAuthorSocial.innerHTML += `<a href="${article.author_bio.social_links.twitter}" target="_blank" rel="noopener noreferrer" aria-label="Author on Twitter" title="Twitter"><i class="fab fa-twitter"></i></a> `;
                    if(article.author_bio.social_links?.linkedin) bioAuthorSocial.innerHTML += `<a href="${article.author_bio.social_links.linkedin}" target="_blank" rel="noopener noreferrer" aria-label="Author on LinkedIn" title="LinkedIn"><i class="fab fa-linkedin-in"></i></a>`;
                }
                authorBioSection.style.display = 'block';
            } else {
                authorBioSection.style.display = 'none';
            }
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
                    console.error('blog-post-detail: Failed to copy link:', err);
                    copyLinkFeedback.textContent = window.uplasTranslate ? window.uplasTranslate('link_copy_failed_feedback', {fallback: 'Failed to copy.'}) : 'Failed to copy.';
                    copyLinkFeedback.style.opacity = 1;
                    setTimeout(() => { copyLinkFeedback.style.opacity = 0; }, 2000);
                });
            });
        }
    }

    async function fetchRelatedArticles(relatedSlugsArray) {
        if (!relatedArticlesGrid || !relatedSlugsArray || relatedSlugsArray.length === 0) {
            if (relatedArticlesGrid) {
                relatedArticlesGrid.innerHTML = `<p data-translate-key="blog_post_no_related">No related articles found.</p>`;
                if (window.uplasApplyTranslations) window.uplasApplyTranslations(relatedArticlesGrid);
            }
            return;
        }
        if (typeof window.uplasApi === 'undefined' || typeof window.uplasApi.fetchAuthenticated !== 'function') {
            console.error("blog-post-detail: uplasApi.fetchAuthenticated is not available for related articles.");
            if (relatedArticlesGrid) relatedArticlesGrid.innerHTML = `<p class="error-message" data-translate-key="error_api_unavailable">Could not load related articles.</p>`;
            if (window.uplasApplyTranslations && relatedArticlesGrid) window.uplasApplyTranslations(relatedArticlesGrid);
            return;
        }

        relatedArticlesGrid.innerHTML = `<p class="loading-message" data-translate-key="blog_post_loading_related">Loading related articles...</p>`;
        if (window.uplasApplyTranslations && relatedArticlesGrid) window.uplasApplyTranslations(relatedArticlesGrid);

        try {
            const response = await window.uplasApi.fetchAuthenticated(`/blog/posts/previews/?slugs=${relatedSlugsArray.join(',')}`, { isPublic: true });
            if (!response.ok) {
                const errorData = await response.json().catch(() => ({ detail: `Failed to fetch related articles. Status: ${response.status}` }));
                throw new Error(errorData.detail);
            }
            const relatedArticles = await response.json();

            relatedArticlesGrid.innerHTML = ''; // Clear loading message
            if (relatedArticles && relatedArticles.length > 0) {
                relatedArticles.forEach(article => {
                    const cardHTML = `
                        <article class="related-article-card">
                            <a href="blog-post-detail.html?slug=${article.slug}" class="related-article-link">
                                <img src="${article.featured_image_url || 'https://placehold.co/300x200/00b4d8/FFFFFF?text=Related&font=poppins'}" alt="${escapeHTML(article.title)}" class="related-article-image" loading="lazy">
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
            console.error("blog-post-detail: Error fetching related articles:", error);
            if (relatedArticlesGrid) relatedArticlesGrid.innerHTML = `<p class="error-message" data-translate-key="blog_post_error_related_param" data-translate-args='{"errorMessage": "${escapeHTML(error.message)}"}'>Error loading related articles: ${escapeHTML(error.message)}</p>`;
            if (window.uplasApplyTranslations && relatedArticlesGrid) window.uplasApplyTranslations(relatedArticlesGrid);
        }
    }

    async function fetchComments(slugForComments) {
        if (!commentsList || !commentCountSpan) return;
        if (typeof window.uplasApi === 'undefined' || typeof window.uplasApi.fetchAuthenticated !== 'function') {
            console.error("blog-post-detail: uplasApi.fetchAuthenticated is not available for comments.");
            if (commentsList) commentsList.innerHTML = `<p class="error-message" data-translate-key="error_api_unavailable">Could not load comments.</p>`;
            if (window.uplasApplyTranslations && commentsList) window.uplasApplyTranslations(commentsList);
            return;
        }

        commentsList.innerHTML = `<p class="loading-message" data-translate-key="blog_post_loading_comments">Loading comments...</p>`;
        if (window.uplasApplyTranslations && commentsList) window.uplasApplyTranslations(commentsList);

        try {
            const response = await window.uplasApi.fetchAuthenticated(`/blog/posts/${slugForComments}/comments/`, { isPublic: true });
            if (!response.ok) {
                const errorData = await response.json().catch(() => ({ detail: `Failed to load comments. Status: ${response.status}` }));
                throw new Error(errorData.detail);
            }
            const commentsData = await response.json();
            const commentsArray = commentsData.results || commentsData;

            commentCountSpan.textContent = commentsData.count !== undefined ? commentsData.count : commentsArray.length;
            commentsList.innerHTML = '';

            if (commentsArray.length > 0) {
                commentsArray.forEach(comment => {
                    const authorName = escapeHTML(comment.author?.full_name || comment.author?.username || 'Anonymous');
                    const currentLang = typeof window.uplasGetCurrentLocale === 'function' ? window.uplasGetCurrentLocale() : 'en-US';
                    const commentDate = new Date(comment.created_at).toLocaleDateString(currentLang, { year: 'numeric', month: 'short', day: 'numeric' });
                    const commentText = escapeHTML(comment.content);
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
            console.error("blog-post-detail: Error fetching comments:", error);
            if (commentsList) commentsList.innerHTML = `<p class="error-message" data-translate-key="blog_post_error_comments_param" data-translate-args='{"errorMessage": "${escapeHTML(error.message)}"}'>Error loading comments: ${escapeHTML(error.message)}</p>`;
            if (window.uplasApplyTranslations && commentsList) window.uplasApplyTranslations(commentsList);
        }
    }

    if (addCommentForm) {
        addCommentForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            if (typeof window.uplasApi === 'undefined' || typeof window.uplasApi.fetchAuthenticated !== 'function') {
                window.uplasApi.displayFormStatus(commentFormStatus, 'Commenting service unavailable.', true, 'error_service_unavailable');
                return;
            }
            if (!currentArticleSlug) {
                window.uplasApi.displayFormStatus(commentFormStatus, 'Cannot submit comment: Article not identified.', true, 'blog_post_error_no_slug_for_comment');
                return;
            }
            // Check if user is logged in BEFORE attempting to submit (important for UX)
            if (!window.uplasApi.getAccessToken()) {
                window.uplasApi.displayFormStatus(commentFormStatus, 'You must be logged in to comment.', true, 'error_login_required_comment');
                // Consider showing login prompt or redirecting
                // window.uplasApi.redirectToLogin('Please log in to leave a comment.');
                return;
            }


            const textInput = addCommentForm.querySelector('[name="commentText"]');
            const nameInput = addCommentForm.querySelector('[name="commenterName"]'); // For anonymous if needed, or hide if logged in

            const text = textInput ? textInput.value.trim() : '';
            const commenterName = nameInput ? nameInput.value.trim() : ''; // May not be used if user is logged in

            if (!text) {
                window.uplasApi.displayFormStatus(commentFormStatus, 'Comment text cannot be empty.', true, 'error_comment_text_required');
                return;
            }
            // Add validation for commenterName if you allow anonymous comments and it's required
            // if (!window.uplasApi.getAccessToken() && !commenterName) { ... }


            const submitButton = addCommentForm.querySelector('button[type="submit"]');
            if (submitButton) submitButton.disabled = true;
            window.uplasApi.displayFormStatus(commentFormStatus, 'Submitting comment...', false, 'blog_post_comment_submitting'); // false for isError (info/loading)

            const commentData = { content: text };
            // If allowing anonymous comments, you might add:
            // if (!window.uplasApi.getAccessToken() && commenterName) commentData.author_name = commenterName;

            try {
                const response = await window.uplasApi.fetchAuthenticated(
                    `/blog/posts/${currentArticleSlug}/comments/`,
                    {
                        method: 'POST',
                        body: JSON.stringify(commentData),
                        // No isPublic: true here, submitting comments requires auth
                    }
                );
                const responseData = await response.json();

                if (response.ok) {
                    window.uplasApi.displayFormStatus(commentFormStatus, responseData.message || 'Comment submitted successfully!', false, 'blog_post_comment_success');
                    addCommentForm.reset();
                    fetchComments(currentArticleSlug);
                } else {
                    let errorMessage = 'Failed to submit comment.';
                    if (responseData.detail) errorMessage = responseData.detail;
                    else if (responseData.content && Array.isArray(responseData.content)) errorMessage = `Content: ${responseData.content.join(' ')}`;
                    else if (typeof responseData === 'object' && Object.keys(responseData).length > 0) {
                        errorMessage = Object.entries(responseData)
                            .map(([field, errors]) => `${field}: ${Array.isArray(errors) ? errors.join(', ') : errors}`)
                            .join('; ');
                    }
                    window.uplasApi.displayFormStatus(commentFormStatus, errorMessage, true);
                }
            } catch (error) {
                console.error("blog-post-detail: Error submitting comment:", error);
                window.uplasApi.displayFormStatus(commentFormStatus, error.message || 'An error occurred. Please try again.', true, 'error_network');
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
        if (articleBodyContent) {
            articleBodyContent.innerHTML = `<p class="error-message" data-translate-key="blog_post_error_no_slug">Article not specified. Please return to the blog to select an article.</p>`;
            if(window.uplasApplyTranslations) window.uplasApplyTranslations(articleBodyContent);
        }
        console.error("blog-post-detail: No article slug found in URL.");
    }

    console.log("Uplas Blog Post Detail (blog-post-detail.js) loaded and initialized.");
});
