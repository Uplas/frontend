// js/blog-post-detail.js
/* ==========================================================================
   Uplas Blog Post Detail Page JavaScript (blog-post-detail.js)
   - Handles dynamic content loading for a specific blog post.
   - Manages social sharing, comments (simulation).
   - Relies on global.js for theme, nav, language.
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

    // Author Bio Elements
    const bioAuthorAvatar = document.getElementById('bio-author-avatar');
    const bioAuthorName = document.getElementById('bio-author-name');
    const bioAuthorTitleOrg = document.getElementById('bio-author-title-org');
    const bioAuthorDescription = document.getElementById('bio-author-description');
    const bioAuthorSocial = document.getElementById('bio-author-social');

    // Related Articles & Comments
    const relatedArticlesGrid = document.getElementById('related-articles-grid');
    const commentsList = document.getElementById('comments-list');
    const commentCountSpan = document.getElementById('comment-count');
    const addCommentForm = document.getElementById('add-comment-form');
    const commentFormStatus = document.getElementById('comment-form-status');

    // Social Share Buttons
    const shareTwitterBtn = document.getElementById('share-twitter');
    const shareLinkedinBtn = document.getElementById('share-linkedin');
    const shareFacebookBtn = document.getElementById('share-facebook');
    const copyLinkBtn = document.getElementById('copy-link');
    const copyLinkFeedback = document.getElementById('copy-link-feedback');

    // --- Utility Functions ---
    const displayStatus = (element, message, type) => { /* ... (from global or uhome.js) ... */ };
    const clearStatus = (element) => { /* ... (from global or uhome.js) ... */ };

    // --- Dynamic Content Loading ---
    async function fetchArticleData(slug) {
        if (!articleContainer) return;
        // Clear current content and show loading message
        if (articleBodyContent) articleBodyContent.innerHTML = `<p class="loading-article-message" data-translate-key="blog_post_loading_content">Loading article content...</p>`;
        if(window.translatePage) window.translatePage(); // Translate loading message

        try {
            console.log(`Fetching article with slug: ${slug}`);
            // TODO: Replace with actual API call
            // const response = await fetchAuthenticated(`/api/blog/posts/${slug}`);
            // if (!response.ok) throw new Error(`Failed to fetch article: ${response.statusText}`);
            // const article = await response.json();

            // Simulate API response
            await new Promise(resolve => setTimeout(resolve, 1000));
            const exampleArticle = {
                title: "The Transformative Power of AI in Education",
                titleKey: "ublog_post1_title", // For translation
                slug: "transformative-power-ai-education",
                author: { name: "Uplas Team", avatarUrl: "https://placehold.co/40x40/00b4d8/FFFFFF?text=UT&font=poppins", bioTitle: "Content Creators at Uplas", bioDescription: "The Uplas Team is dedicated to bringing you the latest insights and knowledge in the world of Artificial Intelligence.", social: { twitter: "#", linkedin: "#"} },
                publishDate: "2025-05-15T10:00:00Z",
                category: { name: "AI in Education", nameKey: "ublog_filter_ai_education_badge", slug: "ai-in-education" },
                readingTime: "7 min read", // Or calculate based on content
                readingTimeKey: "blog_post_reading_time_7min",
                featuredImageUrl: "https://placehold.co/1200x500/00b4d8/FFFFFF?text=AI+Education+Full&font=poppins",
                featuredImageCaption: "AI is revolutionizing how we learn and teach.",
                featuredImageCaptionKey: "ublog_post1_featured_caption",
                // Full content should be HTML (e.g., rendered from Markdown on backend)
                // Or, if Markdown is sent, use a client-side Markdown renderer like Showdown.js or Marked.js
                contentHtml: `
                    <p>Artificial intelligence (AI) is rapidly reshaping the educational landscape. From personalized learning paths and intelligent tutoring systems to automated grading and administrative task management, AI offers immense potential to enhance teaching and learning experiences for students and educators alike. Discover how Uplas is at the forefront of leveraging these technologies to create more effective, engaging, and accessible AI education for everyone.</p>
                    <h2>Personalized Learning Journeys</h2>
                    <p>One of the most significant impacts of AI in education is its ability to facilitate personalized learning. Unlike traditional one-size-fits-all approaches, AI can adapt to individual student needs, learning styles, and paces. Uplas utilizes AI to create dynamic Q&A sessions that adjust in difficulty and focus based on your responses, ensuring you master concepts thoroughly before moving on.</p>
                    <img src="https://placehold.co/800x400/72d2e8/000000?text=Personalized+Paths&font=poppins" alt="Illustrative image of personalized learning paths" class="in-article-image">
                    <h3>Adaptive Assessments</h3>
                    <p>AI-powered assessments can provide more nuanced insights into a student's understanding than traditional tests. These systems can identify specific areas of weakness and suggest targeted resources or exercises, helping learners overcome challenges more effectively.</p>
                    <h2>The Role of AI Tutors</h2>
                    <p>Imagine having a dedicated tutor available 24/7. AI tutors can provide instant feedback, answer questions, and guide students through complex topics. While not a replacement for human educators, AI tutors offer invaluable support, especially for remote learners or those needing extra help outside of scheduled sessions. Uplas integrates an AI Tutor to provide this on-demand assistance throughout your learning journey.</p>
                    <blockquote>"The future of education lies in the symbiotic relationship between human educators and artificial intelligence, creating a more personalized, efficient, and engaging learning environment for all." - Dr. AI Visionary</blockquote>
                    <h2>Ethical Considerations</h2>
                    <p>As with any powerful technology, the integration of AI in education comes with ethical considerations that must be addressed. These include data privacy, algorithmic bias, and ensuring equitable access to AI-powered tools. At Uplas, we are committed to responsible AI development and deployment, prioritizing fairness and transparency in our learning platform.</p>
                    <pre><code class="language-python"># Example of how Uplas might use AI (conceptual)
class UplasLearningAgent:
    def __init__(self, user_profile):
        self.user = user_profile
        self.knowledge_graph = self.load_knowledge_graph()

    def get_next_question(self, previous_answer_eval):
        # AI logic to determine the next best question
        if previous_answer_eval.is_correct:
            return self.select_advanced_question(self.user.current_topic)
        else:
            return self.select_remedial_question(self.user.current_topic, previous_answer_eval.weakness_area)
    # ... more methods
</code></pre>
                    <p>The journey of integrating AI into education is just beginning, but its potential to revolutionize how we learn and teach is undeniable. Uplas is excited to be part of this transformation, empowering individuals to thrive in an AI-driven world.</p>
                `,
                tags: ["personalized learning", "edtech", "future of education", "AI tools"],
                relatedArticleSlugs: ["ml-trends-2025", "getting-started-python-ai"] // For fetching related articles
            };
            // const article = exampleArticle; // Use this for testing

            // For actual use with dynamic slug:
            if (slug === "transformative-power-ai-education") {
                 article = exampleArticle;
            } else {
                 // Simulate finding another article or error
                 const anotherArticle = { ...exampleArticle, title: "Another AI Topic", titleKey: "ublog_another_topic", slug: "another-ai-topic", contentHtml: "<p>Content for another topic.</p>", featuredImageUrl: "https://placehold.co/1200x500/f4a261/FFFFFF?text=Another+Topic&font=poppins"};
                 article = (slug === "ml-trends-2025") ? { ...anotherArticle, title: "ML Trends 2025", titleKey: "ublog_post2_title", slug: "ml-trends-2025", contentHtml: "<p>Detailed content on ML trends...</p>", featuredImageUrl: "https://placehold.co/1200x500/3d405b/FFFFFF?text=ML+Trends+Full&font=poppins" } : article;
                 if (!article && slug !== "transformative-power-ai-education") throw new Error("Article not found");
            }


            populateArticleContent(article);
            setupSocialSharing(article.title, window.location.href);
            // After main content is loaded, fetch related and comments
            fetchRelatedArticles(article.relatedArticleSlugs || []);
            fetchComments(slug);

            // Highlight code blocks if Prism.js is loaded
            if (window.Prism) {
                window.Prism.highlightAll();
            }

        } catch (error) {
            console.error("Error fetching article data:", error);
            if (articleBodyContent) articleBodyContent.innerHTML = `<p class="error-message" data-translate-key="blog_post_error_loading">Could not load the article. Please try again later or return to the blog.</p>`;
            if(window.translatePage) window.translatePage();
        }
    }

    function populateArticleContent(article) {
        // Update Page Title
        document.title = `${article.title} | Uplas AI Insights`;
        // Update Meta Tags (important for SEO and sharing)
        updateMetaTag('meta[name="description"]', article.contentHtml.substring(0, 155).replace(/<[^>]*>/g, '') + "..."); // Basic excerpt
        updateMetaTag('meta[property="og:title"]', `${article.title} | Uplas`);
        updateMetaTag('meta[property="og:description"]', article.contentHtml.substring(0, 155).replace(/<[^>]*>/g, '') + "...");
        updateMetaTag('meta[property="og:image"]', article.featuredImageUrl);
        updateMetaTag('meta[property="og:url"]', window.location.href);
        updateMetaTag('meta[name="twitter:title"]', `${article.title} | Uplas`);
        updateMetaTag('meta[name="twitter:description"]', article.contentHtml.substring(0, 155).replace(/<[^>]*>/g, '') + "...");
        updateMetaTag('meta[name="twitter:image"]', article.featuredImageUrl);
        if (article.author && article.author.name) {
            updateMetaTag('meta[name="author"]', article.author.name);
        }


        // Populate Header
        if (breadcrumbArticleTitle) breadcrumbArticleTitle.textContent = article.title;
        if (articleMainTitle) articleMainTitle.textContent = article.title;
        if (articleAuthorAvatar && article.author) articleAuthorAvatar.src = article.author.avatarUrl || 'https://placehold.co/40x40/00b4d8/FFFFFF?text=A&font=poppins';
        if (articleAuthorName && article.author) {
            articleAuthorName.textContent = article.author.name;
            // articleAuthorName.href = `/author/${article.author.slug}`; // If author pages exist
        }
        if (articlePublishDate) {
            const date = new Date(article.publishDate);
            articlePublishDate.textContent = date.toLocaleDateString(document.documentElement.lang || 'en-US', { year: 'numeric', month: 'long', day: 'numeric' });
            articlePublishDate.dateTime = date.toISOString();
        }
        if (articleCategoryLink && article.category) {
            articleCategoryLink.textContent = article.category.name;
            articleCategoryLink.href = `ublog.html?category=${article.category.slug}`; // Link to category filter on blog list
            if(article.category.nameKey && window.translatePage) { // Set key for translation
                articleCategoryLink.dataset.translateKey = article.category.nameKey;
            }
        }
        if (articleReadingTime && article.readingTime) {
            articleReadingTime.textContent = article.readingTime;
            if(article.readingTimeKey && window.translatePage) {
                 articleReadingTime.dataset.translateKey = article.readingTimeKey;
                 // Assuming readingTimeKey's value is like "X min read"
                 // For dynamic numbers, i18n library would handle "blog_post_reading_time_dynamic" with a {minutes} placeholder
            }
        }


        // Populate Featured Image
        if (articleFeaturedImage) articleFeaturedImage.src = article.featuredImageUrl;
        if (articleFeaturedImage) articleFeaturedImage.alt = article.title; // Alt text
        if (featuredImageCaption) {
            featuredImageCaption.textContent = article.featuredImageCaption || '';
            if(article.featuredImageCaptionKey && window.translatePage) {
                featuredImageCaption.dataset.translateKey = article.featuredImageCaptionKey;
            }
            featuredImageCaption.style.display = article.featuredImageCaption ? 'block' : 'none';
        }


        // Populate Article Body
        if (articleBodyContent) {
            articleBodyContent.innerHTML = article.contentHtml; // Assumes contentHtml is safe
            // If content is Markdown, you'd use a library here:
            // articleBodyContent.innerHTML = marked.parse(article.markdownContent);
        }

        // Populate Tags
        if (articleTagsContainer && article.tags && article.tags.length > 0) {
            // Clear existing static tags except the label
            const existingTags = articleTagsContainer.querySelectorAll('.tag');
            existingTags.forEach(tag => tag.remove());

            article.tags.forEach(tag => {
                const tagLink = document.createElement('a');
                tagLink.href = `ublog.html?tag=${encodeURIComponent(tag)}`;
                tagLink.classList.add('tag');
                tagLink.textContent = `#${tag}`;
                articleTagsContainer.appendChild(tagLink);
            });
        } else if (articleTagsContainer) {
             articleTagsContainer.style.display = 'none'; // Hide tags section if no tags
        }

        // Populate Author Bio
        if (article.author && bioAuthorAvatar) {
            if(bioAuthorAvatar) bioAuthorAvatar.src = article.author.avatarUrl || 'https://placehold.co/100x100/0077b6/FFFFFF?text=A&font=poppins';
            if(bioAuthorName) bioAuthorName.textContent = article.author.name;
            if(bioAuthorTitleOrg) bioAuthorTitleOrg.textContent = article.author.bioTitle || '';
            if(bioAuthorDescription) bioAuthorDescription.textContent = article.author.bioDescription || 'No biography available.';
            if(bioAuthorSocial) {
                bioAuthorSocial.innerHTML = ''; // Clear previous
                if(article.author.social?.twitter) bioAuthorSocial.innerHTML += `<a href="${article.author.social.twitter}" target="_blank" rel="noopener noreferrer" aria-label="Author on Twitter"><i class="fab fa-twitter"></i></a>`;
                if(article.author.social?.linkedin) bioAuthorSocial.innerHTML += `<a href="${article.author.social.linkedin}" target="_blank" rel="noopener noreferrer" aria-label="Author on LinkedIn"><i class="fab fa-linkedin-in"></i></a>`;
            }
        } else if (document.getElementById('author-bio-section')) {
            document.getElementById('author-bio-section').style.display = 'none';
        }
        
        // After populating, re-translate the page for any new data-translate-key elements
        if(window.translatePage) window.translatePage();
    }

    function updateMetaTag(selector, content) {
        const element = document.querySelector(selector);
        if (element && content) {
            element.setAttribute('content', content);
        }
    }


    // --- Social Sharing ---
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
                    copyLinkFeedback.textContent = 'Link copied!'; // TODO: Translate
                    setTimeout(() => { copyLinkFeedback.textContent = ''; }, 2000);
                }).catch(err => {
                    console.error('Failed to copy link:', err);
                    copyLinkFeedback.textContent = 'Failed to copy.'; // TODO: Translate
                    setTimeout(() => { copyLinkFeedback.textContent = ''; }, 2000);
                });
            });
        }
    }

    // --- Related Articles & Comments (Simulated) ---
    async function fetchRelatedArticles(relatedSlugs) {
        if (!relatedArticlesGrid || relatedSlugs.length === 0) {
            if(relatedArticlesGrid) relatedArticlesGrid.innerHTML = `<p data-translate-key="blog_post_no_related">No related articles found.</p>`;
            if(window.translatePage) window.translatePage();
            return;
        }
        relatedArticlesGrid.innerHTML = `<p class="loading-message" data-translate-key="blog_post_loading_related">Loading related articles...</p>`;
        if(window.translatePage) window.translatePage();

        // TODO: API call to fetch preview data for relatedSlugs
        // const response = await fetchAuthenticated(`/api/blog/posts/previews?slugs=${relatedSlugs.join(',')}`);
        // const relatedArticles = await response.json();
        await new Promise(resolve => setTimeout(resolve, 800)); // Simulate delay
        const relatedArticles = [ // Simulate response
            { slug: 'ml-trends-2025', title: 'ML Trends 2025', titleKey: 'ublog_post2_title', category: { name: 'AI Trends', nameKey: 'ublog_filter_ai_trends_badge' }, imageUrl: 'https://placehold.co/300x200/3d405b/FFFFFF?text=Related+1&font=poppins' },
            { slug: 'getting-started-python-ai', title: "Getting Started with Python for AI", titleKey: "ublog_post3_title", category: { name: 'Tutorials', nameKey: 'ublog_filter_tutorials_badge' }, imageUrl: 'https://placehold.co/300x200/f4a261/000000?text=Related+2&font=poppins' }
        ].filter(art => relatedSlugs.includes(art.slug));


        relatedArticlesGrid.innerHTML = ''; // Clear loading
        if (relatedArticles.length > 0) {
            relatedArticles.forEach(article => {
                // Simplified preview card - can reuse .blog-post-preview structure if desired
                const cardHTML = `
                    <article class="related-article-card">
                        <a href="blog-post-detail.html?slug=${article.slug}" class="related-article-link">
                            <img src="${article.imageUrl}" alt="${article.title}" class="related-article-image">
                            <div class="related-article-content">
                                <h4 class="related-article-title" data-translate-key="${article.titleKey || ''}">${article.title}</h4>
                                <span class="related-article-category" data-translate-key="${article.category.nameKey || ''}">${article.category.name}</span>
                            </div>
                        </a>
                    </article>
                `;
                relatedArticlesGrid.insertAdjacentHTML('beforeend', cardHTML);
            });
        } else {
            relatedArticlesGrid.innerHTML = `<p data-translate-key="blog_post_no_related">No related articles found.</p>`;
        }
        if(window.translatePage) window.translatePage();
    }

    async function fetchComments(articleSlug) {
        if (!commentsList || !commentCountSpan) return;
        commentsList.innerHTML = `<p class="loading-message" data-translate-key="blog_post_loading_comments">Loading comments...</p>`;
        if(window.translatePage) window.translatePage();

        // TODO: API Call: const response = await fetchAuthenticated(`/api/blog/posts/${articleSlug}/comments`);
        // const commentsData = await response.json(); // Expects { count: X, comments: [...] }
        await new Promise(resolve => setTimeout(resolve, 700));
        const commentsData = { // Simulate
            count: 2,
            comments: [
                { author: 'Learner123', date: '2025-05-18T10:00:00Z', text: 'Great article, very insightful!' },
                { author: 'AI_Fan', date: '2025-05-19T14:30:00Z', text: 'Thanks for sharing. The section on ethical AI was particularly interesting.' }
            ]
        };

        commentCountSpan.textContent = commentsData.count;
        commentsList.innerHTML = ''; // Clear loading
        if (commentsData.comments.length > 0) {
            commentsData.comments.forEach(comment => {
                const commentHTML = `
                    <div class="comment-item">
                        <p class="comment-meta">
                            <strong class="comment-author">${comment.author}</strong> 
                            <span class="comment-date">on ${new Date(comment.date).toLocaleDateString()}</span>
                        </p>
                        <p class="comment-text">${comment.text}</p>
                    </div>
                `;
                commentsList.insertAdjacentHTML('beforeend', commentHTML);
            });
        } else {
            commentsList.innerHTML = `<p class="no-comments-message" data-translate-key="blog_post_no_comments">Be the first to comment!</p>`;
        }
        if(window.translatePage) window.translatePage();
    }

    if (addCommentForm) {
        addCommentForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const name = addCommentForm.commenterName.value.trim();
            const text = addCommentForm.commentText.value.trim();
            if (!name || !text) {
                // TODO: Use displayStatus for form errors
                alert("Name and comment text are required."); return;
            }
            const submitButton = addCommentForm.querySelector('button[type="submit"]');
            if(submitButton) submitButton.disabled = true;
            if(commentFormStatus) displayStatus(commentFormStatus, 'Submitting comment...', 'info');

            // TODO: API Call: await fetchAuthenticated(`/api/blog/posts/${currentArticleSlug}/comments`, { method: 'POST', body: JSON.stringify({ author: name, text: text }) });
            await new Promise(resolve => setTimeout(resolve, 1000)); // Simulate
            console.log("Comment submitted:", { name, text });
            if(commentFormStatus) displayStatus(commentFormStatus, 'Comment submitted for moderation.', 'success');
            addCommentForm.reset();
            if(submitButton) submitButton.disabled = false;
            // Optionally, optimistically add comment to list or re-fetch comments
            // fetchComments(currentArticleSlug);
        });
    }


    // --- Initial Load ---
    const urlParams = new URLSearchParams(window.location.search);
    const articleSlug = urlParams.get('slug');

    if (articleSlug) {
        fetchArticleData(articleSlug);
    } else {
        if (articleBodyContent) articleBodyContent.innerHTML = `<p class="error-message" data-translate-key="blog_post_error_no_slug">Article not specified. Please return to the blog to select an article.</p>`;
        if(window.translatePage) window.translatePage();
        console.error("No article slug found in URL.");
    }

    // Update copyright year (global.js might also do this)
    const currentYearFooterSpan = document.getElementById('current-year-footer');
    if (currentYearFooterSpan) {
        const yearText = currentYearFooterSpan.textContent;
        if (yearText && yearText.includes("{currentYear}")) {
            currentYearFooterSpan.textContent = yearText.replace("{currentYear}", new Date().getFullYear());
        } else if (yearText && !yearText.match(/\d{4}/)) {
             currentYearFooterSpan.textContent = new Date().getFullYear() + " " + yearText;
        }
    }

    console.log("Uplas Blog Post Detail (blog-post-detail.js) loaded.");
});
