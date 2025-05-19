```javascript
// js/mcourse.js
/* ==========================================================================
   Uplas Interactive Learning Page JavaScript (mcourse.js)
   - Handles Q&A flow, TTS/TTV controls, AI Tutor interaction, progress updates.
   - Relies on global.js for theme, nav, language, currency.
   ========================================================================== */
'use strict';

document.addEventListener('DOMContentLoaded', () => {
    // --- Element Selectors ---
    const courseModuleTopicNav = document.getElementById('course-module-topic-nav');
    const currentTopicTitleText = document.getElementById('current-topic-title-text');
    const qnaContentArea = document.getElementById('qna-content-area');
    const aiQuestionText = document.getElementById('ai-question-text'); // Initial question bubble

    // Media Controls
    const ttsVoiceCharacterSelect = document.getElementById('tts-voice-character-select');
    const playTtsBtn = document.getElementById('play-tts-btn');
    const audioPlayerContainer = document.getElementById('audio-player-container');
    const generateTtvBtn = document.getElementById('generate-ttv-btn');
    const ttvPlayerContainer = document.getElementById('ttv-player-container');

    // User Input
    const userAnswerForm = document.getElementById('user-answer-form');
    const userAnswerInput = document.getElementById('user-answer-input');
    const submitAnswerBtn = document.getElementById('submit-answer-btn');

    // AI Tutor
    const openAiTutorBtn = document.getElementById('open-ai-tutor-btn');
    const aiTutorChatModal = document.getElementById('ai-tutor-chat-modal');
    const closeAiTutorModalBtn = document.getElementById('close-ai-tutor-modal-btn');
    const aiTutorMessagesArea = document.getElementById('ai-tutor-messages');
    const aiTutorInputForm = document.getElementById('ai-tutor-input-form');
    const aiTutorMessageInput = document.getElementById('ai-tutor-message-input');

    // Progress Indicators (placeholders for now)
    const topicProgressPercentage = document.getElementById('topic-progress-percentage');
    const topicProgressBar = document.getElementById('topic-progress-bar');
    const userXpPoints = document.getElementById('user-xp-points');
    const userBadgesCount = document.getElementById('user-badges-count');

    // Topic Actions
    const bookmarkTopicBtn = document.getElementById('bookmark-topic-btn');
    const discussTopicBtn = document.getElementById('discuss-topic-btn');


    // --- State ---
    let currentTopicId = "1.1"; // Default or loaded from URL/backend
    let currentCourseId = "adv_ai"; // Example, should be dynamic
    let ttsAudioElement = null;
    let isTtsPlaying = false;

    // --- Utility Functions ---
    const appendMessageToQnA = (text, type = 'ai-question') => {
        if (!qnaContentArea) return;
        const bubble = document.createElement('div');
        bubble.classList.add(type === 'ai-question' ? 'ai-question-bubble' : 'user-answer-bubble');
        const p = document.createElement('p');
        p.textContent = text;
        bubble.appendChild(p);
        qnaContentArea.appendChild(bubble);
        qnaContentArea.scrollTop = qnaContentArea.scrollHeight; // Scroll to bottom
    };

    // --- Course Navigation (Simplified) ---
    if (courseModuleTopicNav) {
        courseModuleTopicNav.addEventListener('click', (e) => {
            const target = e.target.closest('.topic-link-nav, .module-title-btn');
            if (!target) return;

            if (target.classList.contains('module-title-btn')) {
                e.preventDefault();
                const contentId = target.getAttribute('aria-controls');
                const content = document.getElementById(contentId);
                const isExpanded = target.getAttribute('aria-expanded') === 'true';
                target.setAttribute('aria-expanded', !isExpanded);
                if (content) content.hidden = isExpanded;
            } else if (target.classList.contains('topic-link-nav')) {
                e.preventDefault();
                document.querySelectorAll('.topic-link-nav.active').forEach(el => el.classList.remove('active'));
                target.classList.add('active');
                currentTopicId = target.dataset.topicId;
                loadTopicContent(currentTopicId);
            }
        });
    }

    async function loadTopicContent(topicId) {
        console.log(`Loading content for topic: ${topicId}`);
        if (currentTopicTitleText) currentTopicTitleText.textContent = `${topicId} ${document.querySelector(`.topic-link-nav[data-topic-id="${topicId}"]`)?.textContent || 'Topic Title'}`;
        // Clear previous Q&A, media
        if (qnaContentArea) qnaContentArea.innerHTML = '';
        if (audioPlayerContainer) audioPlayerContainer.innerHTML = '';
        if (ttvPlayerContainer) {
            ttvPlayerContainer.innerHTML = '';
            ttvPlayerContainer.style.display = 'none';
        }
        isTtsPlaying = false;
        if(playTtsBtn) playTtsBtn.innerHTML = `<i class="fas fa-play"></i> <span data-translate-key="button_listen">Listen</span>`;


        // TODO: Fetch initial question/content for this topic from backend
        // const topicData = await fetchAuthenticated(`/api/course/${currentCourseId}/topic/${topicId}/content`);
        // For now, simulate:
        const simulatedFirstQuestion = `This is the start of topic ${topicId}. What would you like to know first about it? Or, here is an initial piece of information... [Content for topic ${topicId}]`;
        appendMessageToQnA(simulatedFirstQuestion, 'ai-question');
        if (aiQuestionText && qnaContentArea.firstChild.isEqualNode(aiQuestionText.parentElement)) {
             aiQuestionText.textContent = simulatedFirstQuestion; // Update initial bubble if it's still the only one
        }


        // TODO: Update resources list based on topicId
        const resourcesList = document.getElementById('topic-resources-list');
        if (resourcesList) {
            resourcesList.innerHTML = `<li><a href="#"><i class="fas fa-link"></i> Resource for Topic ${topicId}</a></li>`;
        }
        // TODO: Update progress indicators
        if(topicProgressPercentage) topicProgressPercentage.textContent = `${Math.floor(Math.random()*30)}%`; // Simulate
        if(topicProgressBar) topicProgressBar.style.width = topicProgressPercentage.textContent;
    }

    // --- TTS Controls ---
    if (playTtsBtn && ttsVoiceCharacterSelect) {
        playTtsBtn.addEventListener('click', async () => {
            const currentContentElements = qnaContentArea.querySelectorAll('.ai-question-bubble p, .user-answer-bubble p');
            if (currentContentElements.length === 0) {
                alert("No content to play."); // TODO: Translate
                return;
            }

            const textToSpeak = Array.from(currentContentElements).map(el => el.textContent).join("\n\n");
            const selectedVoice = ttsVoiceCharacterSelect.value;

            if (isTtsPlaying && ttsAudioElement) {
                ttsAudioElement.pause();
                isTtsPlaying = false;
                playTtsBtn.innerHTML = `<i class="fas fa-play"></i> <span data-translate-key="button_listen">Listen</span>`;
                return;
            }

            playTtsBtn.disabled = true;
            playTtsBtn.innerHTML = `<i class="fas fa-spinner fa-spin"></i> <span data-translate-key="button_loading">Loading...</span>`;

            try {
                console.log(`Requesting TTS for: "${textToSpeak.substring(0,50)}..." with voice: ${selectedVoice}`);
                // TODO: Call backend API to get TTS audio URL
                // const response = await fetchAuthenticated('/api/tts', {
                //     method: 'POST',
                //     body: JSON.stringify({ text: textToSpeak, voice: selectedVoice, language: document.documentElement.lang })
                // });
                // if (!response.ok) throw new Error('TTS generation failed');
                // const data = await response.json(); // Expects { audioUrl: "..." }

                // Simulate API response
                await new Promise(resolve => setTimeout(resolve, 1500));
                const data = { audioUrl: `https://translate.google.com/translate_tts?ie=UTF-8&q=${encodeURIComponent(textToSpeak.substring(0,100))}&tl=${document.documentElement.lang}&client=tw-ob` }; // Example using Google Translate TTS (for demo only, has limitations)

                if (audioPlayerContainer) {
                    audioPlayerContainer.innerHTML = ''; // Clear previous player
                    ttsAudioElement = new Audio(data.audioUrl);
                    ttsAudioElement.controls = true;
                    audioPlayerContainer.appendChild(ttsAudioElement);
                    ttsAudioElement.play();
                    isTtsPlaying = true;
                    playTtsBtn.innerHTML = `<i class="fas fa-pause"></i> <span data-translate-key="button_pause">Pause</span>`;

                    ttsAudioElement.onended = () => {
                        isTtsPlaying = false;
                        playTtsBtn.innerHTML = `<i class="fas fa-play"></i> <span data-translate-key="button_listen">Listen</span>`;
                    };
                }
            } catch (error) {
                console.error("TTS Error:", error);
                alert("Could not play audio."); // TODO: Translate
                playTtsBtn.innerHTML = `<i class="fas fa-play"></i> <span data-translate-key="button_listen">Listen</span>`;
            } finally {
                playTtsBtn.disabled = false;
            }
        });
    }

    // --- TTV Controls ---
    if (generateTtvBtn) {
        generateTtvBtn.addEventListener('click', async () => {
            const currentContentElements = qnaContentArea.querySelectorAll('.ai-question-bubble p, .user-answer-bubble p');
            if (currentContentElements.length === 0) {
                alert("No content for video generation."); // TODO: Translate
                return;
            }
            const textForVideo = Array.from(currentContentElements).map(el => el.textContent).join("\n\n");

            generateTtvBtn.disabled = true;
            generateTtvBtn.innerHTML = `<i class="fas fa-spinner fa-spin"></i> <span data-translate-key="button_generating_video">Generating...</span>`;
            ttvPlayerContainer.style.display = 'none';
            ttvPlayerContainer.innerHTML = '';

            try {
                console.log(`Requesting TTV for: "${textForVideo.substring(0,50)}..."`);
                // TODO: Call backend API for TTV generation
                // const response = await fetchAuthenticated('/api/ttv', {
                //     method: 'POST',
                //     body: JSON.stringify({ text: textForVideo, language: document.documentElement.lang })
                // });
                // if (!response.ok) throw new Error('TTV generation failed');
                // const data = await response.json(); // Expects { videoUrl: "..." }

                // Simulate API response
                await new Promise(resolve => setTimeout(resolve, 3000));
                // Placeholder video - replace with actual video URL or embed code
                const data = { videoUrl: "https://www.w3schools.com/html/mov_bbb.mp4" };

                if (ttvPlayerContainer && data.videoUrl) {
                    ttvPlayerContainer.innerHTML = `<video controls width="100%" src="${data.videoUrl}" type="video/mp4">Your browser does not support the video tag.</video>`;
                    ttvPlayerContainer.style.display = 'block';
                }
            } catch (error) {
                console.error("TTV Error:", error);
                alert("Could not generate video at this time."); // TODO: Translate
            } finally {
                generateTtvBtn.disabled = false;
                generateTtvBtn.innerHTML = `<i class="fas fa-video"></i> <span data-translate-key="button_watch_video">Watch Video</span>`;
            }
        });
    }

    // --- User Answer Submission ---
    if (userAnswerForm) {
        userAnswerForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const answerText = userAnswerInput.value.trim();
            if (!answerText) return;

            appendMessageToQnA(answerText, 'user-answer');
            userAnswerInput.value = '';
            submitAnswerBtn.disabled = true;
            submitAnswerBtn.innerHTML = `<i class="fas fa-spinner fa-spin"></i> <span data-translate-key="button_submitting">Submitting...</span>`;

            try {
                console.log(`Submitting answer for topic ${currentTopicId}: "${answerText}"`);
                // TODO: Send answer to backend Q&A engine
                // const response = await fetchAuthenticated(`/api/course/${currentCourseId}/topic/${currentTopicId}/answer`, {
                //     method: 'POST',
                //     body: JSON.stringify({ answer: answerText })
                // });
                // if (!response.ok) throw new Error('Failed to submit answer');
                // const aiResponse = await response.json(); // Expects { nextQuestion: "...", feedback: "...", xp_gained: 10, badge_earned: "..." }

                // Simulate API response
                await new Promise(resolve => setTimeout(resolve, 1500));
                const aiResponse = {
                    nextQuestion: `That's an interesting point about "${answerText.substring(0,20)}...". Now, consider this: [New AI Question based on user's answer and topic ${currentTopicId}]`,
                    feedback: Math.random() > 0.5 ? "Good insight!" : "Okay, let's explore that further.",
                    xp_gained: Math.floor(Math.random() * 10) + 5
                };

                if (aiResponse.feedback) {
                    appendMessageToQnA(`Tutor: ${aiResponse.feedback}`, 'ai-question'); // Display feedback
                }
                appendMessageToQnA(aiResponse.nextQuestion, 'ai-question'); // Display next question

                // Update progress (simulation)
                if(userXpPoints && aiResponse.xp_gained) {
                    userXpPoints.textContent = parseInt(userXpPoints.textContent) + aiResponse.xp_gained;
                }
                // TODO: Handle badge earning display

            } catch (error) {
                console.error("Error submitting answer:", error);
                appendMessageToQnA("Sorry, I couldn't process your answer right now. Please try again.", 'ai-question');
            } finally {
                submitAnswerBtn.disabled = false;
                submitAnswerBtn.innerHTML = `<i class="fas fa-paper-plane"></i> <span data-translate-key="button_submit_answer">Submit Answer</span>`;
                userAnswerInput.focus();
            }
        });
    }

    // --- AI Tutor Modal ---
    const openTutorChat = () => aiTutorChatModal && (aiTutorChatModal.hidden = false, setTimeout(()=>aiTutorChatModal.classList.add('active'),10), aiTutorMessageInput?.focus());
    const closeTutorChat = () => aiTutorChatModal && (aiTutorChatModal.classList.remove('active'), setTimeout(()=>aiTutorChatModal.hidden = true, 300));

    if(openAiTutorBtn) openAiTutorBtn.addEventListener('click', openTutorChat);
    if(closeAiTutorModalBtn) closeAiTutorModalBtn.addEventListener('click', closeTutorChat);

    if (aiTutorInputForm) {
        aiTutorInputForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const userQuery = aiTutorMessageInput.value.trim();
            if (!userQuery) return;

            // Display user message in tutor chat
            const userMsgDiv = document.createElement('div');
            userMsgDiv.classList.add('tutor-message', 'user-tutor-message');
            userMsgDiv.textContent = userQuery;
            aiTutorMessagesArea.appendChild(userMsgDiv);
            aiTutorMessageInput.value = '';
            aiTutorMessagesArea.scrollTop = aiTutorMessagesArea.scrollHeight;

            // TODO: Send query to backend AI Tutor
            // const response = await fetchAuthenticated(`/api/ai/tutor/ask`, {
            //     method: 'POST',
            //     body: JSON.stringify({ query: userQuery, courseId: currentCourseId, topicId: currentTopicId })
            // });
            // const tutorRes = await response.json(); // Expects { answer: "..." }

            // Simulate response
            await new Promise(resolve => setTimeout(resolve, 1200));
            const tutorRes = { answer: `Regarding "${userQuery.substring(0,30)}...", here's some information related to topic ${currentTopicId}: [AI Tutor's detailed answer].` };

            const tutorMsgDiv = document.createElement('div');
            tutorMsgDiv.classList.add('tutor-message', 'ai-tutor-message');
            tutorMsgDiv.textContent = tutorRes.answer;
            aiTutorMessagesArea.appendChild(tutorMsgDiv);
            aiTutorMessagesArea.scrollTop = aiTutorMessagesArea.scrollHeight;
        });
    }


    // --- Topic Actions (Bookmark, Discuss) ---
    if (bookmarkTopicBtn) {
        bookmarkTopicBtn.addEventListener('click', () => {
            const isBookmarked = bookmarkTopicBtn.classList.toggle('active');
            bookmarkTopicBtn.querySelector('i').classList.toggle('far'); // Outline
            bookmarkTopicBtn.querySelector('i').classList.toggle('fas'); // Solid
            bookmarkTopicBtn.setAttribute('aria-label', isBookmarked ? 'Remove bookmark' : 'Bookmark this topic');
            // TODO: API call to save/remove bookmark for currentTopicId
            console.log(`Topic ${currentTopicId} ${isBookmarked ? 'bookmarked' : 'unbookmarked'}`);
        });
    }
    if (discussTopicBtn) {
        discussTopicBtn.addEventListener('click', () => {
            // TODO: Redirect to community page, potentially to a specific discussion thread for this topic
            window.open(`ucommunity.html?topicRef=${currentCourseId}-${currentTopicId}`, '_blank');
        });
    }


    // --- Initial Load ---
    loadTopicContent(currentTopicId); // Load content for the initial/default topic
    // Global.js handles theme, nav, language, currency.

    console.log("Uplas Interactive Learning Page (mcourse.js) loaded.");
});
