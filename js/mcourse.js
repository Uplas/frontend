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
    const aiInitialMessageText = document.getElementById('ai-initial-message-text'); // For initial content display

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

    // --- State ---
    let currentCourseId = "adv_ai"; // Default, will be updated from URL params
    let currentTopicId = "1.1";   // Default, will be updated from URL params
    let ttsAudioElement = null;
    let isTtsPlaying = false;
    let currentTopicData = null; // Populated by API: { title, content_html, questions: [{id, text, type}], resources: [{name, url}], is_completed, is_locked, course_slug }
    let courseNavigationData = null; // Populated by API: { modules: [{id, title, topics: [{id, title, is_completed, is_locked, slug}]}] }
    let userCourseProgress = null; // Populated by API: { percentage, xp_points, badges_count }
    let currentQuestionIndex = 0;
    let userAnswers = {}; // Tracks answers for the current topic
    let isAiTutorModalOpen = false;

    // --- Utility Functions ---
    const escapeHTML = (str) => { /* ... (same as previous version) ... */
        if (typeof str !== 'string') return '';
        return str.replace(/[&<>'"]/g, tag => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[tag] || tag));
    };

    const displayMessageInArea = (areaElement, message, type, translateKey = null, isHtml = false) => {
        if (!areaElement) return;
        const bubbleWrapper = document.createElement('div');
        bubbleWrapper.classList.add('message-bubble-wrapper', type.startsWith('ai-') || type === 'ai-tutor-response' ? 'ai-message-wrapper' : 'user-message-wrapper');

        const bubble = document.createElement('div');
        bubble.classList.add('message-bubble', `${type}-bubble`); // e.g., ai-question-bubble, user-answer-bubble

        if (isHtml) {
            bubble.innerHTML = message; // Use with trusted HTML from backend (e.g., topic content_html)
        } else {
            const p = document.createElement('p');
            const textToDisplay = (translateKey && window.uplasTranslate) ? window.uplasTranslate(translateKey, { fallback: message }) : message;
            p.textContent = textToDisplay;
            bubble.appendChild(p);
        }
        bubbleWrapper.appendChild(bubble);
        areaElement.appendChild(bubbleWrapper);
        areaElement.scrollTop = areaElement.scrollHeight;
    };

    // --- API Data Fetching ---
    async function fetchCourseNavigation(courseIdToFetch) {
        if (!window.uplasApi) return null;
        try {
            const response = await window.uplasApi.fetchAuthenticated(`/courses/courses/${courseIdToFetch}/navigation/`);
            if (!response.ok) throw new Error(`Failed to load course navigation. Status: ${response.status}`);
            courseNavigationData = await response.json(); // Expects { modules: [...] }
            console.log("mcourse: Fetched Course Navigation:", courseNavigationData);
            return true;
        } catch (error) {
            console.error("mcourse: Error fetching course navigation:", error);
            // Display error in a dedicated area if needed, or rely on individual topic load failures
            if (courseModuleTopicNav) courseModuleTopicNav.innerHTML = `<p class="error-message" data-translate-key="mcourse_err_nav_load_failed">Course navigation failed to load.</p>`;
            if (window.uplasApplyTranslations) window.uplasApplyTranslations(courseModuleTopicNav);
            return false;
        }
    }

    async function fetchUserCourseProgress(courseIdToFetch) {
        if (!window.uplasApi) return null;
        try {
            const response = await window.uplasApi.fetchAuthenticated(`/courses/courses/${courseIdToFetch}/progress/`);
            if (!response.ok) throw new Error(`Failed to load user progress. Status: ${response.status}`);
            userCourseProgress = await response.json(); // Expects { percentage_completed, xp_points, badges_count }
            console.log("mcourse: Fetched User Course Progress:", userCourseProgress);
            return true;
        } catch (error) {
            console.error("mcourse: Error fetching user course progress:", error);
            // Silently fail for progress, or show small error
            return false;
        }
    }

    async function fetchAndSetCurrentTopicData(courseIdToFetch, topicIdToFetch) {
        if (!window.uplasApi) return false;
        currentTopicData = null;
        try {
            const response = await window.uplasApi.fetchAuthenticated(`/courses/courses/${courseIdToFetch}/topics/${topicIdToFetch}/`);
            if (!response.ok) {
                const errorData = await response.json().catch(() => ({ detail: "Unknown error" }));
                throw new Error(errorData.detail || `Failed to load topic content. Status: ${response.status}`);
            }
            currentTopicData = await response.json();
            console.log("mcourse: Fetched Topic Data:", currentTopicData);
            return true;
        } catch (error) {
            console.error(`mcourse: Error fetching topic ${topicIdToFetch}:`, error);
            displayMessageInArea(qnaContentArea, error.message, 'ai-error');
            return false;
        }
    }

    // --- UI Update Functions ---
    function buildCourseNavigationUI() {
        if (!courseModuleTopicNav || !courseNavigationData || !courseNavigationData.modules) {
             if (courseModuleTopicNav) courseModuleTopicNav.innerHTML = `<p data-translate-key="mcourse_nav_unavailable">Navigation unavailable.</p>`;
             if (window.uplasApplyTranslations && courseModuleTopicNav) window.uplasApplyTranslations(courseModuleTopicNav);
            return;
        }
        courseModuleTopicNav.innerHTML = ''; // Clear existing
        courseNavigationData.modules.forEach(module => {
            const moduleGroup = document.createElement('div');
            moduleGroup.className = 'module-group';
            moduleGroup.innerHTML = `
                <button class="module-title-btn" aria-expanded="false" aria-controls="module-${module.id}-topics-nav">
                    ${escapeHTML(module.title)}
                    <i class="fas fa-chevron-down"></i>
                </button>
                <ul id="module-${module.id}-topics-nav" class="topic-list-nav" hidden></ul>
            `;
            const topicsList = moduleGroup.querySelector('ul');
            module.topics.forEach(topic => {
                const topicLi = document.createElement('li');
                let statusIcon = '';
                if (topic.is_completed) statusIcon = '<i class="fas fa-check-circle topic-status-icon"></i>';
                else if (topic.is_locked) statusIcon = '<i class="fas fa-lock topic-status-icon"></i>';

                topicLi.innerHTML = `<a href="#" class="topic-link-nav ${topic.is_completed ? 'completed' : ''} ${topic.is_locked ? 'locked' : ''}" data-topic-id="${topic.id}" data-course-id="${currentCourseId}" data-course-slug="${currentTopicData?.course_slug || courseNavigationData.course_slug || currentCourseId}">
                    ${escapeHTML(topic.title)} ${statusIcon}
                </a>`;
                topicsList.appendChild(topicLi);
            });
            courseModuleTopicNav.appendChild(moduleGroup);
        });
        if (window.uplasApplyTranslations) window.uplasApplyTranslations(courseModuleTopicNav);
        updateNavigationHighlights(); // Highlight current topic after building
    }

    function updateNavigationHighlights() {
        if (!courseModuleTopicNav) return;
        courseModuleTopicNav.querySelectorAll('.topic-link-nav.active').forEach(el => el.classList.remove('active'));
        const currentLink = courseModuleTopicNav.querySelector(`.topic-link-nav[data-topic-id="${currentTopicId}"]`);
        if (currentLink) {
            currentLink.classList.add('active');
            const parentModuleBtn = currentLink.closest('.module-group')?.querySelector('.module-title-btn');
            if (parentModuleBtn && parentModuleBtn.getAttribute('aria-expanded') === 'false') {
                parentModuleBtn.click(); // Expand parent module if current topic is in it
            }
        }
    }

    function updateProgressIndicatorsUI() {
        if (!userCourseProgress) return;
        if (topicProgressPercentageEl) topicProgressPercentageEl.textContent = `${userCourseProgress.percentage_completed || 0}%`;
        if (topicProgressBarEl) {
            topicProgressBarEl.style.width = `${userCourseProgress.percentage_completed || 0}%`;
            topicProgressBarEl.setAttribute('aria-valuenow', userCourseProgress.percentage_completed || 0);
        }
        if (userXpPointsEl) userXpPointsEl.textContent = userCourseProgress.xp_points || 0;
        if (userBadgesCountEl) userBadgesCountEl.textContent = userCourseProgress.badges_count || 0;
    }

    function updateTopicResourcesDisplay() {
        if (!topicResourcesList) return;
        topicResourcesList.innerHTML = '';
        if (currentTopicData && currentTopicData.resources && currentTopicData.resources.length > 0) {
            currentTopicData.resources.forEach(resource => {
                const li = document.createElement('li');
                li.innerHTML = `<a href="${escapeHTML(resource.url)}" target="_blank" rel="noopener noreferrer">
                                  <i class="fas ${resource.type === 'video' ? 'fa-video' : (resource.type === 'pdf' ? 'fa-file-pdf' : 'fa-link')}"></i>
                                  ${escapeHTML(resource.name)}
                              </a>`;
                topicResourcesList.appendChild(li);
            });
        } else {
            topicResourcesList.innerHTML = `<li data-translate-key="mcourse_no_resources_for_topic">No specific resources for this topic.</li>`;
        }
        if (window.uplasApplyTranslations) window.uplasApplyTranslations(topicResourcesList);
    }


    // --- Core Topic Loading and Q&A Flow ---
    async function loadTopicContent(topicIdToLoad, courseIdToLoad) {
        currentTopicId = topicIdToLoad;
        currentCourseId = courseIdToLoad;
        currentQuestionIndex = 0;
        userAnswers = {}; // Reset answers for new topic

        // Show loading states
        if (qnaContentArea) qnaContentArea.innerHTML = `<p class="loading-message" data-translate-key="mcourse_loading_topic">Loading topic...</p>`;
        if (window.uplasApplyTranslations && qnaContentArea) window.uplasApplyTranslations(qnaContentArea);
        if (aiInitialMessageText) aiInitialMessageText.innerHTML = ''; // Clear specific initial message area
        if (userAnswerForm) userAnswerForm.hidden = true;

        const topicLoaded = await fetchAndSetCurrentTopicData(currentCourseId, currentTopicId);

        if (currentTopicTitleText && currentTopicData?.title) {
            currentTopicTitleText.textContent = currentTopicData.title;
            document.title = `${currentTopicData.title} | Uplas`;
        } else if (currentTopicTitleText) {
            currentTopicTitleText.textContent = `Topic ${currentTopicId}`;
            document.title = `Topic ${currentTopicId} | Uplas`;
        }


        if (qnaContentArea) qnaContentArea.innerHTML = ''; // Clear loading message
        if (audioPlayerContainer) audioPlayerContainer.innerHTML = '';
        if (ttvPlayerContainer) { ttvPlayerContainer.innerHTML = ''; ttvPlayerContainer.style.display = 'none'; }
        isTtsPlaying = false;
        if (playTtsBtn) {
            playTtsBtn.innerHTML = `<i class="fas fa-play"></i> <span data-translate-key="button_listen">Listen</span>`;
            if(window.uplasApplyTranslations) window.uplasApplyTranslations(playTtsBtn);
        }
        clearAnswerFeedback();

        if (!topicLoaded || !currentTopicData) {
            if (userAnswerForm) userAnswerForm.hidden = true;
            // Error already shown by fetchAndSetCurrentTopicData
            return;
        }

        if (currentTopicData.is_locked) {
            displayMessageInArea(qnaContentArea, '', 'info', 'mcourse_topic_locked_full_html', true); // Assuming key for full HTML
            // mcourse_topic_locked_full_html: <div class="locked-content-message">...</div>
        } else {
            if (userAnswerForm) userAnswerForm.hidden = false;
            if (currentTopicData.content_html) { // Prefer HTML for initial content
                displayMessageInArea(qnaContentArea, currentTopicData.content_html, 'ai-initial', null, true);
            } else if (currentTopicData.initial_message) { // Fallback to plain text
                displayMessageInArea(qnaContentArea, currentTopicData.initial_message, 'ai-initial');
            }
            renderCurrentQuestion();
        }
        updateTopicResourcesDisplay();
        updateNavigationHighlights();
        updateProgressIndicatorsUI(); // Use dedicated UI update for progress
        if (window.uplasApplyTranslations && qnaContentArea) window.uplasApplyTranslations(qnaContentArea); // Translate any keys in initial content
    }

    function renderCurrentQuestion() {
        if (!currentTopicData) return; // Should not happen if loadTopicContent succeeded

        if (!currentTopicData.questions || currentTopicData.questions.length === 0) {
            displayMessageInArea(qnaContentArea, '', 'ai-info', 'mcourse_no_questions_for_topic');
            if (userAnswerForm) userAnswerForm.hidden = true;
            if (!currentTopicData.is_completed) markTopicAsCompleted(); // Auto-complete if no questions
            return;
        }

        if (currentQuestionIndex >= currentTopicData.questions.length) {
            displayMessageInArea(qnaContentArea, '', 'ai-info', 'mcourse_topic_completed_message');
            if (userAnswerForm) { userAnswerForm.reset(); userAnswerForm.hidden = true; }
            if (!currentTopicData.is_completed) markTopicAsCompleted();
            return;
        }

        if (userAnswerForm) userAnswerForm.hidden = false;
        const question = currentTopicData.questions[currentQuestionIndex];
        const questionText = question.text || (window.uplasTranslate ? window.uplasTranslate('mcourse_ai_asks_default', {fallback: "AI asks a question..."}) : "AI asks a question...");

        displayMessageInArea(qnaContentArea, questionText, 'ai-question');

        if (userAnswerInput) { userAnswerInput.value = ''; userAnswerInput.disabled = false; userAnswerInput.focus(); }
        if (submitAnswerBtn) submitAnswerBtn.disabled = false;
    }

    async function handleUserAnswerSubmit(e) {
        e.preventDefault();
        if (!userAnswerInput || !submitAnswerBtn || !window.uplasApi || !currentTopicData?.questions?.[currentQuestionIndex]) return;

        const answerText = userAnswerInput.value.trim();
        if (!answerText) return;

        displayMessageInArea(qnaContentArea, escapeHTML(answerText), 'user-answer');
        const originalAnswerInput = userAnswerInput.value;
        userAnswerInput.value = '';
        userAnswerInput.disabled = true;
        submitAnswerBtn.disabled = true;
        submitAnswerBtn.innerHTML = `<i class="fas fa-spinner fa-spin"></i> <span data-translate-key="button_submitting">Submitting...</span>`;
        if(window.uplasApplyTranslations) window.uplasApplyTranslations(submitAnswerBtn);
        clearAnswerFeedback();

        const currentQuestion = currentTopicData.questions[currentQuestionIndex];
        userAnswers[currentQuestion.id || currentQuestionIndex] = answerText;

        try {
            const response = await window.uplasApi.fetchAuthenticated(
                `/courses/courses/${currentCourseId}/topics/${currentTopicId}/questions/${currentQuestion.id}/submit_answer/`,
                { method: 'POST', body: JSON.stringify({ answer: answerText }) }
            );
            if (!response.ok) {
                const errorData = await response.json().catch(() => ({ detail: "Failed to submit answer."}));
                throw new Error(errorData.detail);
            }
            const feedbackData = await response.json();

            // Use displayFormStatus for feedbackArea, and displayMessageInArea for QnA
            window.uplasApi.displayFormStatus(answerFeedbackArea, feedbackData.feedback, !feedbackData.is_correct);
            displayMessageInArea(qnaContentArea, feedbackData.feedback, 'ai-feedback');

            if (feedbackData.is_correct) {
                currentQuestionIndex++;
                await fetchUserCourseProgress(currentCourseId); // Update progress after correct answer
                updateProgressIndicatorsUI();
                renderCurrentQuestion();
            } else {
                userAnswerInput.value = originalAnswerInput;
                userAnswerInput.disabled = false;
                userAnswerInput.focus();
            }
        } catch (error) {
            console.error("mcourse: Error submitting answer:", error);
            window.uplasApi.displayFormStatus(answerFeedbackArea, error.message, true);
            displayMessageInArea(qnaContentArea, `Error: ${error.message}`, 'ai-error');
            userAnswerInput.value = originalAnswerInput;
            userAnswerInput.disabled = false;
        } finally {
            submitAnswerBtn.disabled = false;
            submitAnswerBtn.innerHTML = `<i class="fas fa-paper-plane"></i> <span data-translate-key="button_submit_answer">Submit</span>`;
            if(window.uplasApplyTranslations) window.uplasApplyTranslations(submitAnswerBtn);
        }
    }

    async function markTopicAsCompleted() {
        if (!window.uplasApi || !currentTopicData || currentTopicData.is_completed) return;
        console.log(`mcourse: Marking topic ${currentTopicId} of course ${currentCourseId} as complete.`);
        try {
            const response = await window.uplasApi.fetchAuthenticated(
                `/courses/courses/${currentCourseId}/topics/${currentTopicId}/complete/`,
                { method: 'POST' }
            );
            if (!response.ok) throw new Error(`Failed to mark topic complete. Status: ${response.status}`);
            const result = await response.json();
            console.log("mcourse: Topic marked as completed on backend:", result);

            currentTopicData.is_completed = true; // Update local state
            await fetchCourseNavigation(currentCourseId); // Re-fetch navigation to show updates
            buildCourseNavigationUI();
            await fetchUserCourseProgress(currentCourseId); // Re-fetch progress
            updateProgressIndicatorsUI();
        } catch (error) {
            console.error("mcourse: Error marking topic as completed:", error);
            displayMessageInArea(qnaContentArea, `Error updating topic completion: ${error.message}`, 'ai-error');
        }
    }


    // --- TTS & TTV Controls ---
    if (playTtsBtn && ttsVoiceCharacterSelect && audioPlayerContainer) {
        playTtsBtn.addEventListener('click', async () => { /* ... (same as previous, using uplasApi) ... */
            if (!window.uplasApi) { displayMessageInArea(qnaContentArea, "TTS service unavailable.", 'ai-error', "error_service_unavailable_tts"); return; }
            const lastBubble = qnaContentArea.querySelector('.message-bubble:last-of-type p'); // Target last message
            let textToSpeak = aiInitialMessageText?.textContent.trim(); // Default to initial message if exists
            if (qnaContentArea.children.length > 0 && lastBubble) { // If QnA has messages, use the last one
                textToSpeak = lastBubble.textContent;
            } else if (!textToSpeak && currentTopicData?.questions?.[currentQuestionIndex]?.text) { // Fallback to current question if no messages displayed
                textToSpeak = currentTopicData.questions[currentQuestionIndex].text;
            } else if (!textToSpeak) {
                textToSpeak = window.uplasTranslate ? window.uplasTranslate('mcourse_tts_no_content', {fallback:"No content to read."}) : "No content to read.";
            }

            const voice = ttsVoiceCharacterSelect.value;

            if (isTtsPlaying && ttsAudioElement) {
                ttsAudioElement.pause(); isTtsPlaying = false;
                playTtsBtn.innerHTML = `<i class="fas fa-play"></i> <span data-translate-key="button_listen">Listen</span>`;
                if(window.uplasApplyTranslations) window.uplasApplyTranslations(playTtsBtn);
                return;
            }
            playTtsBtn.disabled = true;
            playTtsBtn.innerHTML = `<i class="fas fa-spinner fa-spin"></i> <span data-translate-key="button_loading">Loading...</span>`;
             if(window.uplasApplyTranslations) window.uplasApplyTranslations(playTtsBtn);

            try {
                const response = await window.uplasApi.fetchAuthenticated('/ai_agents/tts/', {
                    method: 'POST', body: JSON.stringify({ text: textToSpeak, voice: voice }),
                });
                if (!response.ok) {
                    const err = await response.json().catch(()=>({detail: "TTS generation failed."}));
                    throw new Error(err.detail);
                }
                const data = await response.json();
                audioPlayerContainer.innerHTML = '';
                ttsAudioElement = new Audio(data.audio_url);
                ttsAudioElement.controls = true;
                audioPlayerContainer.appendChild(ttsAudioElement);
                await ttsAudioElement.play();
                isTtsPlaying = true;
                playTtsBtn.innerHTML = `<i class="fas fa-pause"></i> <span data-translate-key="button_pause">Pause</span>`;
                ttsAudioElement.onended = () => {
                    isTtsPlaying = false;
                    playTtsBtn.innerHTML = `<i class="fas fa-play"></i> <span data-translate-key="button_listen">Listen</span>`;
                    if(window.uplasApplyTranslations) window.uplasApplyTranslations(playTtsBtn);
                };
            } catch (error) {
                console.error("mcourse: TTS Error:", error);
                displayMessageInArea(qnaContentArea, `TTS Error: ${error.message}`, 'ai-error');
                playTtsBtn.innerHTML = `<i class="fas fa-play"></i> <span data-translate-key="button_listen">Listen</span>`;
            } finally {
                playTtsBtn.disabled = false;
                if(window.uplasApplyTranslations) window.uplasApplyTranslations(playTtsBtn);
            }
        });
    }

    if (generateTtvBtn && ttvPlayerContainer) {
        generateTtvBtn.addEventListener('click', async () => { /* ... (same as previous, using uplasApi) ... */
             if (!window.uplasApi) { displayMessageInArea(qnaContentArea, "TTV service unavailable.", 'ai-error', "error_service_unavailable_ttv"); return; }
            const lastBubble = qnaContentArea.querySelector('.message-bubble:last-of-type p');
            let textForVideo = aiInitialMessageText?.textContent.trim();
            if (qnaContentArea.children.length > 0 && lastBubble) {
                textForVideo = lastBubble.textContent;
            } else if (!textForVideo && currentTopicData?.questions?.[currentQuestionIndex]?.text) {
                textForVideo = currentTopicData.questions[currentQuestionIndex].text;
            } else if (!textForVideo) {
                 textForVideo = window.uplasTranslate ? window.uplasTranslate('mcourse_ttv_no_content', {fallback:"No content for video."}) : "No content for video.";
            }

            generateTtvBtn.disabled = true;
            generateTtvBtn.innerHTML = `<i class="fas fa-spinner fa-spin"></i> <span data-translate-key="button_generating_video">Generating...</span>`;
             if(window.uplasApplyTranslations) window.uplasApplyTranslations(generateTtvBtn);
            ttvPlayerContainer.innerHTML = ''; ttvPlayerContainer.style.display = 'none';

            try {
                const response = await window.uplasApi.fetchAuthenticated('/ai_agents/ttv/', {
                    method: 'POST', body: JSON.stringify({ text: textForVideo }),
                });
                 if (!response.ok) {
                    const err = await response.json().catch(()=>({detail: "TTV generation failed."}));
                    throw new Error(err.detail);
                }
                const data = await response.json();
                ttvPlayerContainer.innerHTML = `<video controls autoplay width="100%" src="${data.video_url}"><source src="${data.video_url}" type="video/mp4">Video playback not supported.</video>`;
                ttvPlayerContainer.style.display = 'block';
            } catch (error) {
                console.error("mcourse: TTV Error:", error);
                displayMessageInArea(qnaContentArea, `TTV Error: ${error.message}`, 'ai-error');
            } finally {
                generateTtvBtn.disabled = false;
                generateTtvBtn.innerHTML = `<i class="fas fa-video"></i> <span data-translate-key="button_watch_video">Watch Video</span>`;
                if(window.uplasApplyTranslations) window.uplasApplyTranslations(generateTtvBtn);
            }
        });
    }

    // --- AI Tutor Modal ---
    const toggleAiTutorModal = (show) => {
        if (!aiTutorChatModal) return;
        isAiTutorModalOpen = show;
        aiTutorChatModal.hidden = !show;
        document.body.classList.toggle('modal-open', show);
        if (show) {
            aiTutorChatModal.classList.add('active');
            if (aiTutorMessagesArea && aiTutorMessagesArea.children.length <= 1) { // Assuming initial system message might be there
                const topicTitle = currentTopicData?.title || "the current topic";
                const welcomeKey = 'ai_tutor_welcome_message_contextual';
                const welcomeMessage = window.uplasTranslate ? window.uplasTranslate(welcomeKey, { fallback: `Hello! How can I help you with "${topicTitle}" today?`, variables: { topicTitle } }) : `Hello! How can I help you with "${topicTitle}" today?`;
                displayMessageInArea(aiTutorMessagesArea, welcomeMessage, 'ai-tutor-response');
            }
            aiTutorMessageInput?.focus();
        } else {
            aiTutorChatModal.classList.remove('active');
        }
    };
    if (openAiTutorBtn) openAiTutorBtn.addEventListener('click', () => toggleAiTutorModal(true));
    if (closeAiTutorModalBtn) closeAiTutorModalBtn.addEventListener('click', () => toggleAiTutorModal(false));
    aiTutorChatModal?.addEventListener('click', (e) => { if (e.target === aiTutorChatModal) toggleAiTutorModal(false); });
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && isAiTutorModalOpen) toggleAiTutorModal(false); });

    if (aiTutorInputForm && aiTutorMessageInput && aiTutorMessagesArea) {
        aiTutorInputForm.addEventListener('submit', async (e) => { /* ... (same as previous, using uplasApi) ... */
            e.preventDefault();
            if (!window.uplasApi) return;
            const userQuery = aiTutorMessageInput.value.trim();
            if (!userQuery) return;

            displayMessageInArea(aiTutorMessagesArea, escapeHTML(userQuery), 'user-tutor-query');
            const originalQuery = aiTutorMessageInput.value;
            aiTutorMessageInput.value = '';
            aiTutorMessageInput.disabled = true;
            const tutorSubmitBtn = aiTutorInputForm.querySelector('button[type="submit"]');
            if(tutorSubmitBtn) tutorSubmitBtn.disabled = true;

            try {
                const payload = { query: userQuery, course_id: currentCourseId, topic_id: currentTopicId };
                const response = await window.uplasApi.fetchAuthenticated('/ai_agents/tutor/ask/', {
                    method: 'POST', body: JSON.stringify(payload),
                });
                 if (!response.ok) {
                    const err = await response.json().catch(()=>({detail: "AI Tutor request failed."}));
                    throw new Error(err.detail);
                }
                const data = await response.json();
                displayMessageInArea(aiTutorMessagesArea, data.response, 'ai-tutor-response');
            } catch (error) {
                console.error("mcourse: AI Tutor Error:", error);
                displayMessageInArea(aiTutorMessagesArea, `Tutor Error: ${error.message}`, 'ai-tutor-error');
                aiTutorMessageInput.value = originalQuery;
            } finally {
                 aiTutorMessageInput.disabled = false;
                 if(tutorSubmitBtn) tutorSubmitBtn.disabled = false;
                 aiTutorMessageInput.focus();
            }
        });
    }

    // --- Event Listeners ---
    if (userAnswerForm) userAnswerForm.addEventListener('submit', handleUserAnswerSubmit);

    if (courseModuleTopicNav) {
        courseModuleTopicNav.addEventListener('click', (e) => {
            const link = e.target.closest('.topic-link-nav');
            const button = e.target.closest('.module-title-btn');

            if (link) {
                e.preventDefault();
                const topicId = link.dataset.topicId;
                const courseId = link.dataset.courseId || currentCourseId; // Use specific or current
                const courseSlug = link.dataset.courseSlug || currentTopicData?.course_slug || courseNavigationData?.course_slug || currentCourseId;

                if (link.classList.contains('locked')) {
                     window.uplasApi.displayFormStatus(
                        qnaContentArea.parentNode, // Display in the main interaction area's parent for visibility
                        '', // Message is in HTML, handled by translation of the key
                        true, // isError
                        'mcourse_alert_topic_locked_nav_html' // Key for potentially rich HTML message
                        // mcourse_alert_topic_locked_nav_html: "<p>This topic is currently locked. Please complete previous topics or <a href='upricing.html'>check your subscription.</a></p>"
                     );
                    return;
                }
                if (topicId && courseId) {
                    loadTopicContent(topicId, courseId);
                    const newUrl = `mcourse.html?courseId=${encodeURIComponent(courseSlug)}&lessonId=${encodeURIComponent(topicId)}`;
                    history.pushState({ courseId, topicId, courseSlug }, '', newUrl);
                }
            } else if (button) {
                const contentId = button.getAttribute('aria-controls');
                const content = document.getElementById(contentId);
                const isExpanded = button.getAttribute('aria-expanded') === 'true';
                button.setAttribute('aria-expanded', (!isExpanded).toString());
                if (content) content.hidden = isExpanded;
                const icon = button.querySelector('i');
                if (icon) icon.className = `fas fa-chevron-${isExpanded ? 'down' : 'up'}`;
            }
        });
    }

    window.addEventListener('popstate', (event) => {
        if (event.state && event.state.topicId && event.state.courseId) {
            loadTopicContent(event.state.topicId, event.state.courseId);
        } else {
            // Fallback if state is incomplete, reload initial or a default
            const params = new URLSearchParams(window.location.search);
            loadTopicContent(params.get('lessonId') || "1.1", params.get('courseId') || "adv_ai");
        }
    });

    // --- Initial Load ---
    const initialParams = new URLSearchParams(window.location.search);
    const initialCourseIdFromUrl = initialParams.get('courseId') || "adv_ai"; // Use courseId from URL, or default
    // The 'lessonId' from URL should map to our 'topicId' concept
    const initialTopicIdFromUrl = initialParams.get('lessonId') || initialParams.get('topicId') || "1.1"; // Default

    currentCourseId = initialCourseIdFromUrl; // Set global currentCourseId from URL

    const initialSetup = async () => {
        const navLoaded = await fetchCourseNavigation(currentCourseId);
        if (navLoaded) buildCourseNavigationUI();

        await fetchUserCourseProgress(currentCourseId); // Fetch progress early
        updateProgressIndicatorsUI();

        await loadTopicContent(initialTopicIdFromUrl, currentCourseId); // Load the specific topic
    };

    // Handle language change after initial load
    if (typeof window.uplasOnLanguageChange === 'function') {
        let initialLoadDone = false;
        window.uplasOnLanguageChange(async (newLocale) => {
            if (initialLoadDone) { // Re-render content if language changes after initial load
                console.log("mcourse: Language changed to", newLocale, "re-rendering content.");
                if (courseNavigationData) buildCourseNavigationUI(); // Rebuild nav with new lang if data exists
                if (currentTopicData) { // If a topic is loaded, reload its content with new lang context
                     // This might involve re-fetching if content is language-specific from backend
                     // For now, just re-apply translations to existing data.
                    await loadTopicContent(currentTopicId, currentCourseId);
                }
                updateProgressIndicatorsUI(); // These might have translatable parts
                if (window.uplasApplyTranslations) window.uplasApplyTranslations(document.body); // Full re-translate
            }
        });
        // Ensure i18n is ready before first full render attempt
        if (typeof window.uplasTranslate === 'function') {
            initialSetup().then(() => initialLoadDone = true);
        } else { // Fallback if i18n not ready immediately
            setTimeout(() => {
                initialSetup().then(() => initialLoadDone = true);
            }, 500);
        }
    } else {
        initialSetup(); // Proceed if i18n change handler is not setup
    }

    console.log("mcourse.js: Uplas Interactive Learning Page logic initialized.");
} // End of initializeInteractiveCoursePage

// --- DOMContentLoaded Main Execution ---
document.addEventListener('DOMContentLoaded', () => {
    if (typeof window.uplasApi === 'undefined' || typeof window.uplasApi.getAccessToken !== 'function') {
        console.error('mcourse.js: uplasApi or uplasApi.getAccessToken function is not defined. Ensure apiUtils.js is loaded correctly before mcourse.js.');
        const mainContentArea = document.getElementById('main-content-area') || document.body;
        mainContentArea.innerHTML = '<p style="text-align:center; padding: 20px; color: red;" data-translate-key="error_auth_utility_missing">Core authentication utility is missing. Page cannot load correctly.</p>';
        if (typeof window.uplasApplyTranslations === 'function') window.uplasApplyTranslations(mainContentArea);
        return;
    }

    const authToken = window.uplasApi.getAccessToken();

    if (!authToken) {
        console.log('mcourse.js: User not authenticated. Redirecting to login.');
        const currentPath = window.location.pathname + window.location.search + window.location.hash;
        if (typeof window.uplasApi.redirectToLogin === 'function') {
            window.uplasApi.redirectToLogin(`You need to be logged in to access this course. Original page: ${currentPath}`);
        } else { // Fallback if redirectToLogin is somehow missing
            window.location.href = `index.html#auth-section&returnUrl=${encodeURIComponent(currentPath)}`;
        }
    } else {
        console.log('mcourse.js: User authenticated. Initializing interactive course page.');
        initializeInteractiveCoursePage();
    }
});
