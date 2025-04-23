/* ================================================
   SCRIPT.JS - Uplas Course Page Interactivity
   ================================================ */

// Wait for the DOM to be fully loaded before running scripts
document.addEventListener('DOMContentLoaded', () => {

    /* ================================================
       1. Element Selectors
       ================================================ */
    const body = document.body;
    const themeToggle = document.getElementById('theme-toggle');
    const currentYearSpan = document.getElementById('current-year');
    const moduleToggleBtns = document.querySelectorAll('.module-toggle-btn');
    const topicToggleBtns = document.querySelectorAll('.topic-toggle-btn');
    const tabContainers = document.querySelectorAll('.topic-content'); // Get all topic content areas
    const accessibilityToggle = document.getElementById('accessibility-toggle');
    const accessibilityPanel = document.getElementById('accessibility-panel');
    const closeAccessibilityPanelBtn = accessibilityPanel?.querySelector('.close-panel-btn');
    const fontSizeIncreaseBtn = document.getElementById('increase-font');
    const fontSizeDecreaseBtn = document.getElementById('decrease-font');
    const fontSizeResetBtn = document.getElementById('reset-font');
    const achievementPopup = document.getElementById('achievement-popup');
    const closeAchievementPopupBtn = achievementPopup?.querySelector('.close-popup-btn');
    const aiTutorBtn = document.getElementById('ai-tutor-btn');
    const mobileNavToggle = document.querySelector('.mobile-nav-toggle');
    const siteHeader = document.querySelector('.site-header');
    const likeBtns = document.querySelectorAll('.like-btn');
    const aiActionBtns = document.querySelectorAll('.ai-action-btn');
    const quizOptionBtns = document.querySelectorAll('.quiz-box .option, .personalized-quiz .option'); // Select all quiz options

    /* ================================================
       2. Theme Toggle (Dark/Light Mode)
       ================================================ */
    const applyTheme = (theme) => {
        if (theme === 'dark') {
            body.classList.add('dark-mode');
            if (themeToggle) themeToggle.innerHTML = '<i class="fas fa-sun" aria-hidden="true"></i>';
        } else {
            body.classList.remove('dark-mode');
            if (themeToggle) themeToggle.innerHTML = '<i class="fas fa-moon" aria-hidden="true"></i>';
        }
    };

    // Check for saved theme preference
    const savedTheme = localStorage.getItem('theme') || 'light';
    applyTheme(savedTheme);

    themeToggle?.addEventListener('click', () => {
        const newTheme = body.classList.contains('dark-mode') ? 'light' : 'dark';
        applyTheme(newTheme);
        localStorage.setItem('theme', newTheme);
    });

    /* ================================================
       3. Accordion Functionality (Modules & Topics)
       ================================================ */
    const toggleAccordion = (button, content) => {
        const isExpanded = button.getAttribute('aria-expanded') === 'true';
        button.setAttribute('aria-expanded', !isExpanded);
        content.hidden = isExpanded;

        // Toggle icon class (assuming Font Awesome chevron icons)
        const icon = button.querySelector('.fa-chevron-up, .fa-chevron-down, .toggle-icon');
        if (icon) {
            icon.classList.toggle('fa-chevron-up', !isExpanded);
            icon.classList.toggle('fa-chevron-down', isExpanded);
            // For topic toggle specifically
            if (icon.classList.contains('toggle-icon')) {
                 icon.style.transform = isExpanded ? 'rotate(-90deg)' : 'rotate(0deg)';
            }
        }

        // Update visually hidden text for screen readers
        const srText = button.querySelector('.visually-hidden');
        if (srText) {
            srText.textContent = isExpanded ? `Expand ${content.id}` : `Collapse ${content.id}`;
        }
    };

    // Module Accordions
    moduleToggleBtns.forEach(btn => {
        const contentId = btn.getAttribute('aria-controls');
        const content = document.getElementById(contentId);
        if (content) {
             // Set initial state based on `hidden` attribute
            const isInitiallyExpanded = !content.hidden;
            btn.setAttribute('aria-expanded', isInitiallyExpanded);
            const icon = btn.querySelector('.fa-chevron-up, .fa-chevron-down');
             if (icon) {
                icon.classList.toggle('fa-chevron-up', isInitiallyExpanded);
                icon.classList.toggle('fa-chevron-down', !isInitiallyExpanded);
            }


            btn.addEventListener('click', () => {
                toggleAccordion(btn, content);
            });
        }
    });

    // Topic Accordions
    topicToggleBtns.forEach(btn => {
        const contentId = btn.getAttribute('aria-controls');
        const content = document.getElementById(contentId);
        if (content) {
             // Set initial state based on `hidden` attribute
            const isInitiallyExpanded = !content.hidden;
            btn.setAttribute('aria-expanded', isInitiallyExpanded);
            const icon = btn.querySelector('.toggle-icon');
            if (icon) {
                 icon.style.transform = isInitiallyExpanded ? 'rotate(0deg)' : 'rotate(-90deg)';
            }

            btn.addEventListener('click', () => {
                toggleAccordion(btn, content);
                // Optional: Close other topics in the same module when one is opened
                // const parentModule = btn.closest('.course-module');
                // if (parentModule && !content.hidden) { // If opening this one
                //     parentModule.querySelectorAll('.topic-toggle-btn').forEach(otherBtn => {
                //         if (otherBtn !== btn) {
                //             const otherContentId = otherBtn.getAttribute('aria-controls');
                //             const otherContent = document.getElementById(otherContentId);
                //             if (otherContent && !otherContent.hidden) {
                //                 toggleAccordion(otherBtn, otherContent);
                //             }
                //         }
                //     });
                // }
            });
        }
    });

    /* ================================================
       4. Tab Functionality (Inside Topics)
       ================================================ */
    tabContainers.forEach(container => {
        const tabs = container.querySelectorAll('[role="tab"]');
        const panels = container.querySelectorAll('[role="tabpanel"]');

        tabs.forEach(tab => {
            tab.addEventListener('click', (e) => {
                const targetPanelId = e.target.getAttribute('aria-controls');

                // Deactivate all tabs and hide all panels in this container
                tabs.forEach(t => t.setAttribute('aria-selected', 'false'));
                panels.forEach(p => p.hidden = true);

                // Activate the clicked tab and show the target panel
                e.target.setAttribute('aria-selected', 'true');
                const targetPanel = container.querySelector(`#${targetPanelId}`);
                if (targetPanel) {
                    targetPanel.hidden = false;
                }
            });
        });
    });


    /* ================================================
       5. Accessibility Widget
       ================================================ */
    const toggleAccessibilityPanel = (show) => {
        if (accessibilityPanel && accessibilityToggle) {
            const isExpanded = show === undefined ? accessibilityToggle.getAttribute('aria-expanded') === 'true' : !show;
            accessibilityToggle.setAttribute('aria-expanded', !isExpanded);
            accessibilityPanel.hidden = isExpanded;
            accessibilityPanel.classList.toggle('show', !isExpanded);
            if (!isExpanded) {
                 accessibilityPanel.querySelector('button, input, select, a')?.focus(); // Focus first element when opened
            } else {
                accessibilityToggle.focus(); // Return focus when closed
            }
        }
    };

    accessibilityToggle?.addEventListener('click', () => toggleAccessibilityPanel());
    closeAccessibilityPanelBtn?.addEventListener('click', () => toggleAccessibilityPanel(false));

    // Close panel if clicking outside
    document.addEventListener('click', (event) => {
        if (accessibilityPanel && !accessibilityPanel.hidden) {
            const isClickInsideWidget = accessibilityToggle.contains(event.target) || accessibilityPanel.contains(event.target);
            if (!isClickInsideWidget) {
                toggleAccessibilityPanel(false);
            }
        }
    });

    // Basic Font Size Controls (Example)
    const updateFontSize = (change) => {
        const currentSize = parseFloat(getComputedStyle(document.documentElement).fontSize);
        const newSize = change === 0 ? 16 : currentSize + change; // Reset to 16px or apply change
        document.documentElement.style.fontSize = `${newSize}px`;
        localStorage.setItem('fontSize', `${newSize}px`); // Persist preference
    };

     // Apply saved font size on load
    const savedFontSize = localStorage.getItem('fontSize');
    if (savedFontSize) {
        document.documentElement.style.fontSize = savedFontSize;
    }


    fontSizeIncreaseBtn?.addEventListener('click', () => updateFontSize(1));
    fontSizeDecreaseBtn?.addEventListener('click', () => updateFontSize(-1));
    fontSizeResetBtn?.addEventListener('click', () => updateFontSize(0));

    // Add more accessibility options here (contrast, font family, etc.)


    /* ================================================
       6. Achievement Popup
       ================================================ */
    const showAchievement = (title, description) => {
        if (achievementPopup) {
            achievementPopup.querySelector('#achievement-title').textContent = title;
            achievementPopup.querySelector('#achievement-desc').textContent = description;
            achievementPopup.hidden = false;
            setTimeout(() => achievementPopup.classList.add('show'), 10); // Delay for transition
        }
    };

    const hideAchievement = () => {
        if (achievementPopup) {
            achievementPopup.classList.remove('show');
            // Wait for transition before hiding completely
            setTimeout(() => {
                 achievementPopup.hidden = true;
            }, 500); // Match transition duration in CSS
        }
    };

    closeAchievementPopupBtn?.addEventListener('click', hideAchievement);

    // --- Example: Show an achievement after 3 seconds ---
    // setTimeout(() => {
    //     showAchievement('Welcome Back!', 'You continued your learning journey!');
    //     // Automatically hide after 5 seconds
    //     setTimeout(hideAchievement, 5000);
    // }, 3000);
     // --- End Example ---


    /* ================================================
       7. AI Tutor FAB Interaction
       ================================================ */
    aiTutorBtn?.addEventListener('click', () => {
        // --- Placeholder ---
        // In a real application, this would open a chat interface (modal, sidebar, etc.)
        // You might load content dynamically or interact with an API.
        console.log('AI Tutor button clicked. Implement chat interface opening logic here.');
        alert('AI Tutor chat coming soon!');
        // --- End Placeholder ---
    });


    /* ================================================
       8. Mobile Navigation
       ================================================ */
    mobileNavToggle?.addEventListener('click', () => {
        const isExpanded = mobileNavToggle.getAttribute('aria-expanded') === 'true';
        mobileNavToggle.setAttribute('aria-expanded', !isExpanded);
        siteHeader?.classList.toggle('mobile-nav-active'); // Toggle class on header
        // You'll need CSS rules for .site-header.mobile-nav-active .main-navigation to display the nav
    });


    /* ================================================
       9. Dynamic Content & Placeholders
       ================================================ */

    // Set current year in footer
    if (currentYearSpan) {
        currentYearSpan.textContent = new Date().getFullYear();
    }

    // Placeholder for Like Button Interaction
    likeBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            const isLiked = btn.classList.toggle('liked');
            const likesCountSpan = btn.querySelector('span'); // Assuming likes count is inside <span>
            let currentLikes = parseInt(likesCountSpan?.textContent || '0'); // Or get from data attribute

            if (isLiked) {
                btn.setAttribute('aria-label', 'Unlike this post');
                currentLikes++;
                 // --- Placeholder: Send "like" action to backend ---
                 console.log('Liked post. Send update to backend.');
            } else {
                 btn.setAttribute('aria-label', 'Like this post');
                 currentLikes--;
                 // --- Placeholder: Send "unlike" action to backend ---
                 console.log('Unliked post. Send update to backend.');
            }
             if (likesCountSpan) likesCountSpan.textContent = `${currentLikes} Likes`; // Update count visually
        });
    });

    // Placeholder for AI Action Buttons
    aiActionBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            const action = btn.textContent.trim(); // e.g., "Generate Audio Summary"
             // --- Placeholder: Trigger specific AI action via API ---
             console.log(`AI Action button clicked: ${action}. Implement API call.`);
             alert(`${action} feature coming soon!`);
             // --- End Placeholder ---
        });
    });

     // Placeholder for Quiz Option Interaction
    quizOptionBtns.forEach(option => {
        option.addEventListener('click', () => {
            const isCorrect = option.dataset.correct === 'true'; // Check data attribute set in HTML
            const optionsContainer = option.closest('.options');

            // Remove previous feedback
             optionsContainer?.querySelectorAll('.option').forEach(opt => {
                 opt.classList.remove('correct', 'incorrect');
                 // Optionally disable after selection
                 // opt.style.pointerEvents = 'none';
             });

            // Apply feedback class
            option.classList.add(isCorrect ? 'correct' : 'incorrect');

             // --- Placeholder: Provide detailed feedback, update progress, send results ---
            console.log(`Quiz option selected. Correct: ${isCorrect}. Implement feedback and progress update.`);
             // Add feedback text below options
             const feedbackArea = option.closest('.ai-interaction-box, .quiz-box').querySelector('.answer-feedback'); // Assuming a feedback div exists
             if (feedbackArea) {
                 feedbackArea.textContent = isCorrect ? 'Correct! Well done.' : 'Not quite. Check the reading material again.';
                 feedbackArea.className = `answer-feedback ${isCorrect ? 'feedback-correct' : 'feedback-incorrect'}`; // Add classes for styling
             }
             // --- End Placeholder ---
        });
    });


    console.log("Uplas Course Page script loaded successfully.");

});




document.addEventListener('DOMContentLoaded', () => {

    // ... (Keep existing selectors and functions like theme toggle, accordions, tabs, etc.) ...

    /* ================================================
       Refined Placeholders for Backend Interactions
       ================================================ */

    // --- 6. Achievement Popup ---
    // Showing achievements might be triggered by backend events (e.g., completing a module)
    // You might use WebSockets or fetch user progress periodically.
    const checkAndShowAchievements = async () => {
        try {
            // --- Placeholder: Fetch new achievements from backend ---
            // const response = await fetch('/api/user/achievements/new'); // Example API endpoint
            // if (!response.ok) throw new Error('Failed to fetch achievements');
            // const newAchievements = await response.json();
            // Example Response: [{ title: 'Module Master', description: 'You completed Module 1!' }]
             const newAchievements = []; // Simulate no new achievements for now

            if (newAchievements && newAchievements.length > 0) {
                const achievement = newAchievements[0]; // Show one at a time
                showAchievement(achievement.title, achievement.description);
                 // --- Placeholder: Mark achievement as seen on backend ---
                // await fetch(`/api/user/achievements/${achievement.id}/seen`, { method: 'POST' });
                console.log(`Backend would be notified that achievement "${achievement.title}" was shown.`);
            }
            // --- End Placeholder ---
        } catch (error) {
            console.error("Error checking achievements:", error);
        }
    };
    // checkAndShowAchievements(); // Call this on page load or based on certain actions

    // --- 7. AI Tutor FAB Interaction ---
    const aiTutorBtn = document.getElementById('ai-tutor-btn');
    const aiTutorChatWindow = document.getElementById('ai-tutor-chat-window'); // Assuming you add a chat window element

    const openAiTutor = () => {
         // --- Placeholder: Implement UI logic to show the chat window ---
         console.log('Opening AI Tutor chat window...');
         // aiTutorChatWindow.hidden = false;
         // aiTutorChatWindow.classList.add('active');
         // loadInitialTutorMessage(); // Potentially fetch an initial greeting
         alert('AI Tutor chat interface would open here!');
         // --- End Placeholder ---
    };

    const sendTutorMessage = async (message) => {
        try {
            // --- Placeholder: Send message to backend AI Tutor API ---
            // displayUserMessage(message); // Show user message in UI
            // showTutorLoadingIndicator(true); // Show spinner
            // const response = await fetch('/api/ai/tutor', {
            //     method: 'POST',
            //     headers: { 'Content-Type': 'application/json' },
            //     body: JSON.stringify({ query: message, context: getCurrentLessonContext() }) // Send message and context
            // });
            // if (!response.ok) throw new Error('Tutor API request failed');
            // const tutorResponse = await response.json();
            // Example Response: { answer: "Here's the explanation..." }

            // displayTutorResponse(tutorResponse.answer); // Show tutor response in UI
            console.log(`Sending to Tutor API: "${message}". Backend would process and respond.`);
            alert(`Tutor would respond to: "${message}"`);
             // --- End Placeholder ---
        } catch (error) {
            console.error("Error interacting with AI Tutor:", error);
            // displayTutorError("Sorry, I couldn't process that right now.");
        } finally {
             // showTutorLoadingIndicator(false); // Hide spinner
        }
    };

    aiTutorBtn?.addEventListener('click', openAiTutor);
    // Add event listener to a send button within the chat window to call sendTutorMessage('user input text')

    // --- 9. Dynamic Content & Placeholders ---

    // --- Community Highlights ---
    const discussionListContainer = document.querySelector('.discussion-list'); // Assuming this exists

    const loadCommunityDiscussions = async () => {
        if (!discussionListContainer) return;
        discussionListContainer.innerHTML = '<p>Loading discussions...</p>'; // Loading state
        try {
            // --- Placeholder: Fetch recent discussions from backend ---
            // const response = await fetch('/api/community/discussions/recent?limit=3'); // Example API
            // if (!response.ok) throw new Error('Failed to fetch discussions');
            // const discussions = await response.json();
            // Example Response:
            // [
            //   { id: 1, title: '...', author: 'Sarah K.', time: '2 hours ago', preview: '...', replies: 12, views: 45, likes: 8, url: '/community/post/1' },
            //   ...
            // ]
             const discussions = []; // Simulate empty response for now

            if (discussions && discussions.length > 0) {
                 renderDiscussions(discussions); // Function to build HTML from data
            } else {
                 discussionListContainer.innerHTML = '<p>No recent discussions found.</p>';
            }
             // --- End Placeholder ---
        } catch (error) {
            console.error("Error loading community discussions:", error);
            discussionListContainer.innerHTML = '<p>Could not load discussions.</p>'; // Error state
        }
    };

    const renderDiscussions = (discussions) => {
         discussionListContainer.innerHTML = ''; // Clear loading/previous content
         discussions.forEach(disc => {
             // Create discussion item HTML dynamically based on the 'disc' object
             const item = document.createElement('article');
             item.className = 'discussion-item';
             // ... (build inner HTML using disc.title, disc.author, etc.) ...
             item.innerHTML = `
                <header class="discussion-meta">
                    <div class="author-info">
                        <img src="/api/placeholder/30/30" alt="" class="author-avatar">
                        <span class="author-name">${disc.author || 'Anonymous'}</span>
                    </div>
                    <time datetime="${disc.isoTime || ''}" class="discussion-time">${disc.time || 'Recently'}</time>
                </header>
                <h4 class="discussion-title"><a href="${disc.url || '#'}">${disc.title || 'Untitled Discussion'}</a></h4>
                <p class="discussion-preview">${disc.preview || ''}</p>
                <footer class="discussion-stats">
                    <span><i class="fas fa-comment" aria-hidden="true"></i> ${disc.replies || 0} Replies</span>
                    <span><i class="fas fa-eye" aria-hidden="true"></i> ${disc.views || 0} Views</span>
                    <span><button class="like-btn" data-post-id="${disc.id}" aria-label="Like this post"><i class="fas fa-heart" aria-hidden="true"></i> <span>${disc.likes || 0}</span> Likes</button></span>
                </footer>
             `;
             discussionListContainer.appendChild(item);
         });
         // Re-attach event listeners if needed (e.g., for dynamically added like buttons)
         attachLikeButtonListeners();
    };

    // loadCommunityDiscussions(); // Call on page load

    // --- Like Button (Refined for dynamic content) ---
    const attachLikeButtonListeners = () => {
        discussionListContainer?.querySelectorAll('.like-btn').forEach(btn => {
             // Prevent adding multiple listeners if called again
             if (btn.dataset.listenerAttached) return;
             btn.dataset.listenerAttached = true;

             btn.addEventListener('click', async () => {
                 const postId = btn.dataset.postId;
                 const isLiked = btn.classList.toggle('liked');
                 const likesCountSpan = btn.querySelector('span');
                 let currentLikes = parseInt(likesCountSpan?.textContent || '0');

                 btn.disabled = true; // Prevent double-clicking while waiting for backend

                 try {
                     // --- Placeholder: Send like/unlike to backend ---
                    //  const response = await fetch(`/api/community/posts/${postId}/like`, {
                    //      method: isLiked ? 'POST' : 'DELETE'
                    //  });
                    //  if (!response.ok) throw new Error('Like/Unlike request failed');
                    //  const result = await response.json(); // Get updated like count from backend
                    //  currentLikes = result.likes;

                    // Simulate backend update:
                    currentLikes = isLiked ? currentLikes + 1 : Math.max(0, currentLikes - 1);
                    console.log(`${isLiked ? 'Liked' : 'Unliked'} post ${postId}. New count (simulated): ${currentLikes}`);
                     // --- End Placeholder ---

                     if (likesCountSpan) likesCountSpan.textContent = `${currentLikes}`;
                     btn.setAttribute('aria-label', isLiked ? 'Unlike this post' : 'Like this post');

                 } catch (error) {
                     console.error("Error liking/unliking post:", error);
                     btn.classList.toggle('liked'); // Revert visual state on error
                 } finally {
                      btn.disabled = false; // Re-enable button
                 }
             });
        });
    };
    attachLikeButtonListeners(); // Initial call for statically loaded buttons (if any)

    // --- AI Content Generation Buttons ---
    const aiActionBtns = document.querySelectorAll('.ai-action-btn');
    aiActionBtns.forEach(btn => {
        btn.addEventListener('click', async () => {
            const action = btn.textContent.trim();
            const topicContentElement = btn.closest('.topic-content'); // Find the parent topic
            const topicId = topicContentElement?.id.replace('content-', ''); // Extract topic ID if possible

            btn.disabled = true;
            btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Generating...'; // Loading state

            try {
                 // --- Placeholder: Call backend API for generation ---
                //  const response = await fetch('/api/ai/generate', {
                //      method: 'POST',
                //      headers: { 'Content-Type': 'application/json' },
                //      body: JSON.stringify({ action: action, topicId: topicId }) // Send action and context
                //  });
                //  if (!response.ok) throw new Error('Generation request failed');
                //  const result = await response.json();
                 // Example response: { type: 'audio', url: '/path/to/generated.mp3' }
                 //              or { type: 'video', url: '/path/to/generated.mp4' }

                 // Simulate response
                 await new Promise(resolve => setTimeout(resolve, 2000)); // Wait 2s
                 const result = { type: action.includes('Audio') ? 'audio' : 'video', url: '/api/placeholder/generated_media' };
                 console.log(`Generation requested: ${action} for topic ${topicId}. Simulated Result URL: ${result.url}`);
                 // --- End Placeholder ---

                 // --- Inject the generated content ---
                 if (result.type === 'audio') {
                     const audioWrapper = topicContentElement.querySelector('.audio-player-wrapper');
                     if (audioWrapper) {
                         audioWrapper.innerHTML = `<audio controls src="${result.url}" autoplay>Your browser doesn't support audio.</audio>`;
                     }
                 } else if (result.type === 'video') {
                     const videoWrapper = topicContentElement.querySelector('.video-player-wrapper');
                     if (videoWrapper) {
                         // Adjust iframe or video tag based on your needs
                         videoWrapper.innerHTML = `<iframe width="100%" height="315" src="${result.url}" frameborder="0" allowfullscreen title="Generated Explanation"></iframe>`;
                     }
                 }

            } catch (error) {
                console.error(`Error generating ${action}:`, error);
                alert(`Could not generate ${action} at this time.`);
            } finally {
                btn.disabled = false;
                btn.innerHTML = `<i class="fas ${action.includes('Audio') ? 'fa-headphones' : 'fa-film'}"></i> ${action}`; // Reset button text/icon
            }
        });
    });

    // --- Quiz/Personalized Question Submission ---
    // Assuming quiz options are buttons or divs you click
    const quizOptionBtns = document.querySelectorAll('.quiz-box .option, .personalized-quiz .option');
     quizOptionBtns.forEach(option => {
        option.addEventListener('click', async () => {
            const questionContainer = option.closest('.ai-interaction-box, .quiz-box');
            const optionsContainer = option.closest('.options');
            if (!questionContainer || !optionsContainer) return;

            const questionId = questionContainer.dataset.questionId; // Add data-question-id="xyz" to your HTML container
            const selectedOptionValue = option.dataset.value; // Add data-value="A" etc. to options
            const isCorrect = option.dataset.correct === 'true';

            // Disable options after selection
            optionsContainer.querySelectorAll('.option').forEach(opt => opt.style.pointerEvents = 'none');

             // Apply visual feedback immediately
             option.classList.add(isCorrect ? 'correct' : 'incorrect');


             try {
                 // --- Placeholder: Send answer to backend ---
                //  const response = await fetch('/api/course/submit_answer', {
                //      method: 'POST',
                //      headers: { 'Content-Type': 'application/json' },
                //      body: JSON.stringify({ questionId: questionId, answer: selectedOptionValue })
                //  });
                //  if (!response.ok) throw new Error('Failed to submit answer');
                //  const result = await response.json(); // Backend might return updated progress, feedback ID, etc.
                 console.log(`Answer submitted for Q:${questionId}. Selected: ${selectedOptionValue}. Correct: ${isCorrect}. Backend notified.`);
                 // --- End Placeholder ---

                 // Display detailed feedback (potentially fetched based on backend response)
                 const feedbackArea = questionContainer.querySelector('.answer-feedback'); // Ensure this div exists
                 if (feedbackArea) {
                     feedbackArea.textContent = isCorrect ? 'Correct! Great job.' : 'That was not the right answer. Review the material or ask the AI Tutor!';
                     feedbackArea.className = `answer-feedback ${isCorrect ? 'feedback-correct' : 'feedback-incorrect'}`;
                     feedbackArea.style.display = 'block'; // Make sure it's visible
                 }
             } catch (error) {
                 console.error("Error submitting answer:", error);
                 alert("Could not submit your answer. Please try again.");
                  // Optionally re-enable options on error
                  // optionsContainer.querySelectorAll('.option').forEach(opt => opt.style.pointerEvents = 'auto');
             }
        });
    });

    console.log("Uplas Course Page script loaded with backend integration placeholders.");

}); // End DOMContentLoaded
