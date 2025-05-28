// js/mcourse.js
/* ==========================================================================
   Uplas Interactive Learning Page JavaScript (mcourse.js)
   - Handles Q&A flow, TTS/TTV controls, AI Tutor interaction, progress updates.
   - Relies on global.js for theme, nav, language.
   - Relies on apiUtils.js for auth token and API calls.
   - Implements authentication check before initializing.
   ========================================================================== */
'use strict';

function initializeInteractiveCoursePage() {
    // --- Element Selectors ---
    const courseModuleTopicNav = document.getElementById('course-module-topic-nav');
    const currentTopicTitleText = document.getElementById('current-topic-title-main');
    const qnaContentArea = document.getElementById('qna-content-area');
    const aiInitialMessageText = document.getElementById('ai-initial-message-text');

    const ttsVoiceCharacterSelect = document.getElementById('tts-voice-character-select');
    const playTtsBtn = document.getElementById('play-tts-btn');
    const audioPlayerContainer = document.getElementById('audio-player-container');
    const generateTtvBtn = document.getElementById('generate-ttv-btn');
    const ttvPlayerContainer = document.getElementById('ttv-player-container');

    const userAnswerForm = document.getElementById('user-answer-form');
    const userAnswerInput = document.getElementById('user-answer-input');
    const submitAnswerBtn = document.getElementById('submit-answer-btn');
    const answerFeedbackArea = document.getElementById('answer-feedback-area');

    const openAiTutorBtn = document.getElementById('open-ai-tutor-btn');
    const aiTutorChatModal = document.getElementById('ai-tutor-chat-modal');
    const closeAiTutorModalBtn = document.getElementById('close-ai-tutor-modal-btn');
    const aiTutorMessagesArea = document.getElementById('ai-tutor-messages');
    const aiTutorInputForm = document.getElementById('ai-tutor-input-form');
    const aiTutorMessageInput = document.getElementById('ai-tutor-message-input');

    const topicProgressPercentageEl = document.getElementById('topic-progress-percentage');
    const topicProgressBarEl = document.getElementById('topic-progress-bar');
    const userXpPointsEl = document.getElementById('user-xp-points');
    const userBadgesCountEl = document.getElementById('user-badges-count');

    const bookmarkTopicBtn = document.getElementById('bookmark-topic-btn');
    const discussTopicBtn = document.getElementById('discuss-topic-btn');
    const topicResourcesList = document.getElementById('topic-resources-list');
    // const currentYearFooter = document.getElementById('current-year-footer'); // Handled by global.js

    // --- State ---
    let currentCourseId = "adv_ai"; // Default, will be updated from URL params
    let currentTopicId = "1.1";   // Default, will be updated from URL params
    let ttsAudioElement = null;
    let isTtsPlaying = false;
    let currentTopicData = null; // Will be populated by API call
    let currentQuestionIndex = 0;
    let userAnswers = {};
    let isAiTutorModalOpen = false;

    // --- Utility Functions ---
    const displayStatus = (message, type = 'info', area = qnaContentArea) => {
        if (typeof window.uplasApi !== 'undefined' && typeof window.uplasApi.displayFormStatus === 'function') {
            // Using displayFormStatus for general messages in QnA area might need CSS adjustments
            // For now, let's use appendMessageToQnA for QnA, and a specific status for forms
            if (area === qnaContentArea) {
                appendMessageToQnA(message, type === 'error' ? 'ai-error' : 'ai-info');
            } else if (area) { // if it's a form or specific feedback area
                window.uplasApi.displayFormStatus(area, message, type === 'error');
            }
        } else {
            console.warn("uplasApi.displayFormStatus not available. Message:", message);
            if (area === qnaContentArea) appendMessageToQnA(message, 'ai-info'); // Fallback
        }
    };

    const appendMessageToQnA = (text, type = 'ai-question', isHtml = false) => {
        if (!qnaContentArea) return;
        const bubbleWrapper = document.createElement('div');
        bubbleWrapper.classList.add('message-bubble-wrapper', type.startsWith('ai-') || type.startsWith('user-tutor') || type === 'ai-tutor' ? 'ai-message-wrapper' : 'user-message-wrapper');
        if(type === 'user-tutor') bubbleWrapper.classList.replace('ai-message-wrapper', 'user-message-wrapper');


        const bubble = document.createElement('div');
        bubble.classList.add('message-bubble', `${type}-bubble`);

        if (isHtml) {
            bubble.innerHTML = text; // Use with trusted HTML
        } else {
            const p = document.createElement('p');
            p.textContent = text;
            bubble.appendChild(p);
        }
        bubbleWrapper.appendChild(bubble);
        qnaContentArea.appendChild(bubbleWrapper);
        qnaContentArea.scrollTop = qnaContentArea.scrollHeight;
    };
    // AI Tutor specific append (slightly different styling/source)
    const appendMessageToAiTutor = (text, type = 'ai-tutor-response') => {
        if (!aiTutorMessagesArea) return;
        const bubbleWrapper = document.createElement('div');
         bubbleWrapper.classList.add('message-bubble-wrapper', type === 'user-tutor-query' ? 'user-message-wrapper' : 'ai-message-wrapper');

        const bubble = document.createElement('div');
        bubble.classList.add('message-bubble', type === 'user-tutor-query' ? 'user-tutor-bubble' : 'ai-tutor-bubble'); // Specific class for AI tutor

        const p = document.createElement('p');
        p.textContent = text;
        bubble.appendChild(p);

        bubbleWrapper.appendChild(bubble);
        aiTutorMessagesArea.appendChild(bubbleWrapper);
        aiTutorMessagesArea.scrollTop = aiTutorMessagesArea.scrollHeight;
    };


    const showAnswerFeedback = (message, isCorrect) => {
        if (!answerFeedbackArea) return;
        answerFeedbackArea.textContent = message;
        answerFeedbackArea.className = 'answer-feedback-display'; // Reset
        answerFeedbackArea.classList.add(isCorrect ? 'feedback--correct' : 'feedback--incorrect');
        answerFeedbackArea.style.display = 'block';
    };
    const clearAnswerFeedback = () => {
        if (answerFeedbackArea) {
            answerFeedbackArea.textContent = '';
            answerFeedbackArea.style.display = 'none';
        }
    };
    const escapeHTML = (str) => {
        if (typeof str !== 'string') return '';
        return str.replace(/[&<>'"]/g,
            tag => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[tag] || tag)
        );
    };

    // --- Course Navigation & Content Loading ---
    async function fetchAndSetCurrentTopicData(courseIdToFetch, topicIdToFetch) {
        if (!window.uplasApi || !window.uplasApi.fetchAuthenticated) {
            console.error("uplasApi.fetchAuthenticated is not available.");
            displayStatus("Error: Could not load topic data. API utility missing.", 'error');
            return false;
        }
        console.log(`Fetching data for course ${courseIdToFetch}, topic ${topicIdToFetch}`);
        currentTopicData = null; // Reset before fetch

        try {
            // L58: fetchAndSetCurrentTopicData
            // Action: Replace this with an actual API call to /api/courses/{courseId}/topics/{topicId}/.
            const response = await window.uplasApi.fetchAuthenticated(`/courses/courses/${courseIdToFetch}/topics/${topicIdToFetch}/`);

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({ detail: `Failed to load topic. Status: ${response.status}` }));
                throw new Error(errorData.detail || `HTTP error! Status: ${response.status}`);
            }
            currentTopicData = await response.json();
            console.log("Fetched Topic Data:", currentTopicData);
            // Assuming currentTopicData has: title, content_html (for initial message), questions array, resources array, is_completed, is_locked
            return true;
        } catch (error) {
            console.error(`Error fetching topic data for ${courseIdToFetch}/${topicIdToFetch}:`, error);
            displayStatus(`Error loading topic: ${error.message}`, 'error');
            currentTopicData = null; // Ensure it's null on error
            return false;
        }
    }

    async function loadTopicContent(topicIdToLoad, courseIdToLoad) {
        currentTopicId = topicIdToLoad;
        currentCourseId = courseIdToLoad;
        currentQuestionIndex = 0;
        userAnswers = {};

        const topicLoaded = await fetchAndSetCurrentTopicData(currentCourseId, currentTopicId);

        if (currentTopicTitleText) {
            const title = currentTopicData?.title || `Topic ${currentTopicId}`; // Use fetched title
            currentTopicTitleText.textContent = title;
            document.title = title + " | Uplas";
            // currentTopicTitleText.dataset.translateKey = currentTopicData?.titleKey; // If backend provides translation keys
        }

        if (qnaContentArea) qnaContentArea.innerHTML = '';
        if (aiInitialMessageText) aiInitialMessageText.innerHTML = '';

        if (audioPlayerContainer) audioPlayerContainer.innerHTML = '';
        if (ttvPlayerContainer) { ttvPlayerContainer.innerHTML = ''; ttvPlayerContainer.style.display = 'none'; }
        isTtsPlaying = false;
        if (playTtsBtn) playTtsBtn.innerHTML = `<i class="fas fa-play"></i> <span data-translate-key="button_listen">Listen</span>`;
        clearAnswerFeedback();

        if (!topicLoaded || !currentTopicData) {
            // Error message was already displayed by fetchAndSetCurrentTopicData
            if (userAnswerForm) userAnswerForm.hidden = true;
            if (window.uplasApplyTranslations) window.uplasApplyTranslations(); // Translate error messages if any
            return;
        }

        if (currentTopicData.is_locked) { // Assuming backend field name
            qnaContentArea.innerHTML = `<div class="locked-content-message">
                <i class="fas fa-lock"></i>
                <h3 data-translate-key="mcourse_topic_locked_title">Topic Locked</h3>
                <p data-translate-key="mcourse_topic_locked_desc">Please complete previous topics or check your subscription.</p>
                <a href="upricing.html" class="button button--primary" data-translate-key="mcourse_button_view_plans">View Plans</a>
            </div>`;
            if (userAnswerForm) userAnswerForm.hidden = true;
        } else {
            if (userAnswerForm) userAnswerForm.hidden = false;
            // Display initial content/message from topic data if available
            // Backend might provide 'content_html' or 'initial_message'
            if (currentTopicData.content_html && aiInitialMessageText) {
                 aiInitialMessageText.innerHTML = currentTopicData.content_html; // Assumes safe HTML from backend
            } else if (currentTopicData.initial_message && aiInitialMessageText) {
                 aiInitialMessageText.textContent = currentTopicData.initial_message;
            }
            renderCurrentQuestion();
        }
        updateTopicResourcesDisplay(); // Uses currentTopicData.resources
        updateNavigationHighlights();
        updateProgressIndicators(); // Might need data from API
        if (window.uplasApplyTranslations) window.uplasApplyTranslations();
    }

    function renderCurrentQuestion() {
        if (!currentTopicData || !currentTopicData.questions || currentTopicData.questions.length === 0) {
            appendMessageToQnA(window.uplasTranslate ? window.uplasTranslate('mcourse_no_questions_for_topic') : "No questions for this topic.", 'ai-info');
            if (userAnswerForm) userAnswerForm.hidden = true;
            return;
        }
        if (currentQuestionIndex >= currentTopicData.questions.length) {
            appendMessageToQnA(window.uplasTranslate ? window.uplasTranslate('mcourse_topic_completed_message') : "Topic completed!", 'ai-info');
            if (userAnswerForm) { userAnswerForm.reset(); userAnswerForm.hidden = true; }
            if (!currentTopicData.is_completed) { // Mark complete only if not already marked
                markTopicAsCompleted(currentCourseId, currentTopicId);
            }
            return;
        }

        if (userAnswerForm) userAnswerForm.hidden = false;
        const question = currentTopicData.questions[currentQuestionIndex]; // question object from backend
        const questionText = question.text || "AI asks a question..."; // Use 'text' field from backend

        // If it's the very first interaction and there's an initial message placeholder, use it.
        // Otherwise, append.
        if (currentQuestionIndex === 0 && qnaContentArea.children.length === 0 && aiInitialMessageText && aiInitialMessageText.innerHTML.trim() !== "") {
            // Initial message already set from currentTopicData.content_html or initial_message
            // Now, append the first actual question if it's different or if no initial message was set.
            if (!aiInitialMessageText.innerHTML.includes(questionText)) { // Avoid duplicating if initial message *was* the question
                 appendMessageToQnA(questionText, 'ai-question');
            }
        } else {
            appendMessageToQnA(questionText, 'ai-question');
        }


        if (userAnswerInput) { userAnswerInput.disabled = false; userAnswerInput.focus(); }
        if (submitAnswerBtn) submitAnswerBtn.disabled = false;
    }

    async function handleUserAnswerSubmit(e) {
        e.preventDefault();
        if (!userAnswerInput || !submitAnswerBtn || !window.uplasApi || !window.uplasApi.fetchAuthenticated) {
            console.error("Required elements or uplasApi not available for answer submission.");
            return;
        }

        const answerText = userAnswerInput.value.trim();
        if (!answerText || !currentTopicData || !currentTopicData.questions || currentTopicData.questions.length === 0) return;

        appendMessageToQnA(escapeHTML(answerText), 'user-answer');
        const originalAnswerInput = userAnswerInput.value; // Keep original for resubmission if needed
        userAnswerInput.value = '';
        userAnswerInput.disabled = true;
        submitAnswerBtn.disabled = true;
        submitAnswerBtn.innerHTML = `<i class="fas fa-spinner fa-spin"></i> <span data-translate-key="button_submitting">Submitting...</span>`;
        if (window.uplasApplyTranslations) window.uplasApplyTranslations();
        clearAnswerFeedback();

        const currentQuestion = currentTopicData.questions[currentQuestionIndex];
        userAnswers[currentQuestion.id] = answerText; // Store user's raw answer locally

        try {
            // L114: handleUserAnswerSubmit
            // L125: AI Model Integration: Send answerText for feedback
            // Action: API call to /api/courses/{courseId}/topics/{topicId}/questions/{questionId}/submit_answer/
            const response = await window.uplasApi.fetchAuthenticated(
                `/courses/courses/${currentCourseId}/topics/${currentTopicId}/questions/${currentQuestion.id}/submit_answer/`,
                {
                    method: 'POST',
                    body: JSON.stringify({ answer: answerText }),
                }
            );

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({ detail: `Failed to submit answer. Status: ${response.status}` }));
                throw new Error(errorData.detail || `HTTP error! Status: ${response.status}`);
            }

            const feedbackData = await response.json(); // Expects { feedback: "...", is_correct: true/false }
            showAnswerFeedback(feedbackData.feedback, feedbackData.is_correct);
            appendMessageToQnA(feedbackData.feedback, 'ai-feedback'); // Show feedback in QnA

            if (feedbackData.is_correct) {
                currentQuestionIndex++;
                renderCurrentQuestion();
            } else {
                // Optionally allow retry or provide hints
                userAnswerInput.value = originalAnswerInput; // Restore input for editing
                userAnswerInput.disabled = false;
                userAnswerInput.focus();
            }

        } catch (error) {
            console.error("Error submitting answer:", error);
            displayStatus(`Error submitting answer: ${error.message}`, 'error', answerFeedbackArea);
            appendMessageToQnA(`Error: ${error.message}`, 'ai-error');
            userAnswerInput.value = originalAnswerInput; // Restore input on error
            userAnswerInput.disabled = false;
        } finally {
            submitAnswerBtn.disabled = false;
            submitAnswerBtn.innerHTML = `<i class="fas fa-paper-plane"></i> <span data-translate-key="button_submit_answer">Submit</span>`;
            if (window.uplasApplyTranslations) window.uplasApplyTranslations();
        }
    }

    function updateNavigationHighlights() { /* ... (implementation from mcourse (1).js) ... */ }
    function updateTopicResourcesDisplay() { /* ... (implementation from mcourse (1).js, ensure currentTopicData.resources is used) ... */ }
    function buildCourseNavigation() { /* ... (This needs real data, for now uses MOCK or relies on currentTopicData if it contains full course structure) ... */ }

    async function markTopicAsCompleted(courseIdForCompletion, topicIdForCompletion) {
        if (!window.uplasApi || !window.uplasApi.fetchAuthenticated) {
            console.error("uplasApi not available for marking topic complete.");
            return;
        }
        console.log(`Marking topic ${topicIdForCompletion} of course ${courseIdForCompletion} as complete.`);

        try {
            // L149: markTopicAsCompleted
            // Action: API call to /api/courses/{courseId}/topics/{topicId}/complete/
            const response = await window.uplasApi.fetchAuthenticated(
                `/courses/courses/${courseIdForCompletion}/topics/${topicIdForCompletion}/complete/`,
                {
                    method: 'POST',
                    // body: JSON.stringify({ status: 'completed' }), // Backend might not need a body
                }
            );

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({ detail: `Failed to mark topic complete. Status: ${response.status}` }));
                throw new Error(errorData.detail || `HTTP error! Status: ${response.status}`);
            }
            const result = await response.json();
            console.log("Topic marked as completed on backend:", result);

            // Update local state if backend confirms
            if (currentTopicData && currentTopicData.id === topicIdForCompletion) { // Check if it's the current topic
                 currentTopicData.is_completed = true;
            }
            // Ideally, re-fetch course progress or navigation data to get accurate completion states
            // For now, just update mock or local state for immediate UI feedback
            // MOCK_COURSE_CONTENT update (remove if backend drives navigation fully)
            if (MOCK_COURSE_CONTENT[courseIdForCompletion]) {
                for (const modId in MOCK_COURSE_CONTENT[courseIdForCompletion]) {
                    if (MOCK_COURSE_CONTENT[courseIdForCompletion][modId].topics[topicIdForCompletion]) {
                        MOCK_COURSE_CONTENT[courseIdForCompletion][modId].topics[topicIdForCompletion].isCompleted = true;
                        break;
                    }
                }
            }

            buildCourseNavigation(); // Rebuild to show checkmark
            updateNavigationHighlights();
            updateProgressIndicators(); // Update overall progress

        } catch (error) {
            console.error("Error marking topic as completed:", error);
            displayStatus(`Error updating topic completion: ${error.message}`, 'error');
        }
    }

    function updateProgressIndicators() { /* ... (implementation from mcourse (1).js, ideally fetch this from backend) ... */ }

    // --- TTS & TTV Controls ---
    if (playTtsBtn) {
        playTtsBtn.addEventListener('click', async () => {
            if (!window.uplasApi || !window.uplasApi.fetchAuthenticated) {
                displayStatus("TTS service not available.", 'error'); return;
            }
            const lastBubble = qnaContentArea.querySelector('.message-bubble:last-child p');
            const textToSpeak = lastBubble ? lastBubble.textContent : (aiInitialMessageText?.textContent || "No content selected.");
            const voice = ttsVoiceCharacterSelect ? ttsVoiceCharacterSelect.value : 'alloy';

            if (isTtsPlaying && ttsAudioElement) {
                ttsAudioElement.pause(); isTtsPlaying = false;
                playTtsBtn.innerHTML = `<i class="fas fa-play"></i> <span data-translate-key="button_listen">Listen</span>`;
                if (window.uplasApplyTranslations) window.uplasApplyTranslations();
                return;
            }
            playTtsBtn.disabled = true;
            playTtsBtn.innerHTML = `<i class="fas fa-spinner fa-spin"></i> <span data-translate-key="button_loading">Loading...</span>`;
            if (window.uplasApplyTranslations) window.uplasApplyTranslations();

            try {
                // L181: playTtsBtn listener
                // L190: AI Model Integration: TTS API Call to /api/ai_agents/tts/
                const response = await window.uplasApi.fetchAuthenticated('/ai_agents/tts/', {
                    method: 'POST',
                    body: JSON.stringify({ text: textToSpeak, voice: voice }),
                });
                if (!response.ok) {
                    const errorData = await response.json().catch(() => ({ detail: `TTS generation failed. Status: ${response.status}` }));
                    throw new Error(errorData.detail || `HTTP error! Status: ${response.status}`);
                }
                const data = await response.json(); // Expects { audio_url: "..." }

                if (audioPlayerContainer) audioPlayerContainer.innerHTML = '';
                ttsAudioElement = new Audio(data.audio_url); // Use URL from backend
                ttsAudioElement.controls = true;
                audioPlayerContainer.appendChild(ttsAudioElement);
                await ttsAudioElement.play();
                isTtsPlaying = true;
                playTtsBtn.innerHTML = `<i class="fas fa-pause"></i> <span data-translate-key="button_pause">Pause</span>`;
                ttsAudioElement.onended = () => {
                    isTtsPlaying = false;
                    playTtsBtn.innerHTML = `<i class="fas fa-play"></i> <span data-translate-key="button_listen">Listen</span>`;
                    if (window.uplasApplyTranslations) window.uplasApplyTranslations();
                };
            } catch (error) {
                console.error("TTS Error:", error);
                displayStatus(`TTS Error: ${error.message}`, 'error');
                playTtsBtn.innerHTML = `<i class="fas fa-play"></i> <span data-translate-key="button_listen">Listen</span>`;
            } finally {
                playTtsBtn.disabled = false;
                if (window.uplasApplyTranslations) window.uplasApplyTranslations();
            }
        });
    }
    if (generateTtvBtn) {
        generateTtvBtn.addEventListener('click', async () => {
            if (!window.uplasApi || !window.uplasApi.fetchAuthenticated) {
                displayStatus("TTV service not available.", 'error'); return;
            }
            const lastBubble = qnaContentArea.querySelector('.message-bubble:last-child p');
            const textForVideo = lastBubble ? lastBubble.textContent : (aiInitialMessageText?.textContent || "No content for video.");

            generateTtvBtn.disabled = true;
            generateTtvBtn.innerHTML = `<i class="fas fa-spinner fa-spin"></i> <span data-translate-key="button_generating_video">Generating...</span>`;
            if (window.uplasApplyTranslations) window.uplasApplyTranslations();
            if (ttvPlayerContainer) { ttvPlayerContainer.innerHTML = ''; ttvPlayerContainer.style.display = 'none'; }

            try {
                // L210: generateTtvBtn listener
                // L219: AI Model Integration: TTV API Call to /api/ai_agents/ttv/
                const response = await window.uplasApi.fetchAuthenticated('/ai_agents/ttv/', {
                    method: 'POST',
                    body: JSON.stringify({ text: textForVideo }),
                });
                if (!response.ok) {
                    const errorData = await response.json().catch(() => ({ detail: `TTV generation failed. Status: ${response.status}` }));
                    throw new Error(errorData.detail || `HTTP error! Status: ${response.status}`);
                }
                const data = await response.json(); // Expects { video_url: "..." }

                if (ttvPlayerContainer) {
                    ttvPlayerContainer.innerHTML = `<video controls autoplay width="100%" src="${data.video_url}"><source src="${data.video_url}" type="video/mp4">Video not supported.</video>`;
                    ttvPlayerContainer.style.display = 'block';
                }
            } catch (error) {
                console.error("TTV Error:", error);
                displayStatus(`TTV Error: ${error.message}`, 'error');
            } finally {
                generateTtvBtn.disabled = false;
                generateTtvBtn.innerHTML = `<i class="fas fa-video"></i> <span data-translate-key="button_watch_video">Watch Video</span>`;
                if (window.uplasApplyTranslations) window.uplasApplyTranslations();
            }
        });
    }

    // --- AI Tutor Modal ---
    const toggleAiTutorModal = (show) => { /* ... (implementation from mcourse (1).js) ... */ };
    if (openAiTutorBtn) openAiTutorBtn.addEventListener('click', () => toggleAiTutorModal(true));
    if (closeAiTutorModalBtn) closeAiTutorModalBtn.addEventListener('click', () => toggleAiTutorModal(false));
    aiTutorChatModal?.addEventListener('click', (e) => { if (e.target === aiTutorChatModal) toggleAiTutorModal(false); });
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && isAiTutorModalOpen) toggleAiTutorModal(false); });

    if (aiTutorInputForm) {
        aiTutorInputForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            if (!aiTutorMessageInput || !aiTutorMessagesArea || !window.uplasApi || !window.uplasApi.fetchAuthenticated) {
                console.error("AI Tutor elements or uplasApi not available.");
                return;
            }
            const userQuery = aiTutorMessageInput.value.trim();
            if (!userQuery) return;

            appendMessageToAiTutor(escapeHTML(userQuery), 'user-tutor-query');
            const originalQuery = aiTutorMessageInput.value; // Keep for potential resubmission
            aiTutorMessageInput.value = '';
            aiTutorMessageInput.disabled = true;
            const tutorSubmitBtn = aiTutorInputForm.querySelector('button[type="submit"]');
            if(tutorSubmitBtn) tutorSubmitBtn.disabled = true;


            try {
                // L240: aiTutorInputForm listener
                // L248: AI Model Integration: Send query to /api/ai_agents/tutor/ask/
                const payload = {
                    query: userQuery,
                    course_id: currentCourseId,
                    topic_id: currentTopicId,
                    // context: "Previous chat messages could be stringified here or handled by backend session"
                };
                const response = await window.uplasApi.fetchAuthenticated('/ai_agents/tutor/ask/', {
                    method: 'POST',
                    body: JSON.stringify(payload),
                });

                if (!response.ok) {
                    const errorData = await response.json().catch(() => ({ detail: `AI Tutor request failed. Status: ${response.status}` }));
                    throw new Error(errorData.detail || `HTTP error! Status: ${response.status}`);
                }
                const data = await response.json(); // Expects { response: "AI tutor answer" }
                appendMessageToAiTutor(data.response, 'ai-tutor-response');

            } catch (error) {
                console.error("AI Tutor Error:", error);
                appendMessageToAiTutor(`Error: ${error.message}`, 'ai-tutor-error');
                aiTutorMessageInput.value = originalQuery; // Restore query on error
            } finally {
                 aiTutorMessageInput.disabled = false;
                 if(tutorSubmitBtn) tutorSubmitBtn.disabled = false;
                 aiTutorMessageInput.focus();
            }
        });
    }

    // --- Event Listeners ---
    if (userAnswerForm) userAnswerForm.addEventListener('submit', handleUserAnswerSubmit);
    if (courseModuleTopicNav) { /* ... (event delegation from mcourse (1).js) ... */ }
    window.addEventListener('popstate', (event) => { /* ... (popstate handling from mcourse (1).js) ... */ });

    // --- Initial Load ---
    const initialParams = new URLSearchParams(window.location.search);
    const initialCourseId = initialParams.get('courseId') || "adv_ai"; // Default or from URL
    const initialTopicId = initialParams.get('lessonId') || initialParams.get('topicId') || "1.1";

    currentCourseId = initialCourseId; // Set global currentCourseId

    const initialSetup = async () => {
        // Mock data for navigation is still used here.
        // A real app would fetch course structure for navigation separately.
        if (typeof buildCourseNavigation === "function") buildCourseNavigation();
        await loadTopicContent(initialTopicId, initialCourseId); // Load the specific topic
    };

    // Ensure i18n and other global setup might be ready
    if (typeof window.uplasOnLanguageChange === 'function') {
        let initialLoadDone = false;
        window.uplasOnLanguageChange(async () => {
            if (initialLoadDone) { // Re-render content if language changes after initial load
                if (typeof buildCourseNavigation === "function") buildCourseNavigation(); // Rebuild nav with new lang
                await loadTopicContent(currentTopicId, currentCourseId); // Reload current topic
            }
        });
        // If i18nManager is already initialized by global.js, uplasTranslate should be ready
        if (typeof window.uplasTranslate === 'function') {
            initialSetup().then(() => initialLoadDone = true);
        } else {
            setTimeout(() => { // Fallback wait
                initialSetup().then(() => initialLoadDone = true);
            }, 700);
        }
    } else {
        initialSetup();
    }

    console.log("Uplas Interactive Learning Page (mcourse.js) logic initialized.");
}

// --- DOMContentLoaded Main Execution ---
document.addEventListener('DOMContentLoaded', () => {
    if (typeof window.uplasApi === 'undefined' || typeof window.uplasApi.getAccessToken !== 'function') {
        console.error('uplasApi or uplasApi.getAccessToken function is not defined. Ensure apiUtils.js is loaded correctly before mcourse.js.');
        const mainContentArea = document.getElementById('main-content-area') || document.body;
        mainContentArea.innerHTML = '<p style="text-align:center; padding: 20px; color: red;" data-translate-key="error_auth_utility_missing">Core authentication utility is missing. Page cannot load correctly.</p>';
        if (typeof window.uplasApplyTranslations === 'function') window.uplasApplyTranslations(mainContentArea);
        return;
    }

    const authToken = window.uplasApi.getAccessToken();

    if (!authToken) {
        console.log('User not authenticated for interactive course. Redirecting to login.');
        const currentPath = window.location.pathname + window.location.search + window.location.hash;
        // Use uplasApi.redirectToLogin if available for consistent message handling
        if (typeof window.uplasApi.redirectToLogin === 'function') {
            window.uplasApi.redirectToLogin(`You need to be logged in to access the course. Original page: ${currentPath}`);
        } else {
            window.location.href = `index.html#auth-section&returnUrl=${encodeURIComponent(currentPath)}`;
        }
    } else {
        console.log('User authenticated. Initializing interactive course page.');
        initializeInteractiveCoursePage();
    }
});
```

**Key Considerations and Next Steps:**

1.  **`MOCK_COURSE_CONTENT` and Navigation**:
    * The functions `buildCourseNavigation`, `updateNavigationHighlights`, and `updateProgressIndicators` still rely on `MOCK_COURSE_CONTENT`.
    * **Suggestion**: You'll need to create new API endpoints in your Django backend (e.g., in `apps/courses/`) to serve:
        * The overall course structure (modules, topics, their completion status, lock status) for building the navigation. This could be an endpoint like `/api/courses/courses/${courseId}/navigation/`.
        * User progress data (XP, badges, overall completion percentage for a course).
    * Then, update these functions in `mcourse.js` to fetch and use this live data.

2.  **`currentTopicData` Structure**:
    * The code now assumes `currentTopicData` (fetched from `/api/courses/courses/${courseId}/topics/${topicId}/`) will have fields like `title`, `is_locked`, `is_completed`, `content_html` (or `initial_message`), `questions` (array), and `resources` (array).
    * Ensure your Django `TopicSerializer` and `QuestionSerializer` provide data in this structure. For example, `questions` should be an array of objects, each with at least an `id` and `text`.

3.  **Error Display**: The `displayStatus` function is a basic way to show errors. You might want a more sophisticated notification system.

4.  **Loading Indicators**: The current loading indicators are simple text changes on buttons. You could implement more visual spinners or overlays for a better UX during API calls.

5.  **Translating Dynamic Content**:
    * For content fetched from the API (like topic titles, question text, AI responses), if these need to be translatable, your backend API should ideally return content in the currently selected language (based on an `Accept-Language` header or a language parameter in the API call).
    * Alternatively, if the backend returns translation keys, `window.uplasTranslate` would be used extensively after fetching data. The current `loadTopicContent` makes a basic attempt at this if `titleKey` is present.

6.  **AI Tutor Context**: The `aiTutorInputForm` submit handler has a placeholder for `context`. A more advanced implementation might send the recent Q&A history or specific topic content as context to the AI tutor backend.

7.  **Security**: Ensure all backend endpoints, especially those handling user input or AI model interactions, have appropriate authentication, authorization, and input validation.

This version of `mcourse.js` makes significant progress by integrating the core API calls. The next major step for this page would be to replace the mock navigation and progress data with live data from your backe
