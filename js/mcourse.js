// js/mcourse.js
/* ==========================================================================
   Uplas Interactive Learning Page JavaScript (mcourse.js)
   - Handles Q&A flow, TTS/TTV controls, AI Tutor interaction, progress updates.
   - Relies on global.js for theme, nav, language.
   - Relies on apiUtils.js for auth token.
   - Implements authentication check before initializing.
   ========================================================================== */
'use strict';

// This function contains the logic from your uploaded mcourse.js
function initializeInteractiveCoursePage() {
    // --- Element Selectors ---
    const courseModuleTopicNav = document.getElementById('course-module-topic-nav'); //
    const currentTopicTitleText = document.getElementById('current-topic-title-main'); //
    const qnaContentArea = document.getElementById('qna-content-area'); //
    const aiInitialMessageText = document.getElementById('ai-initial-message-text'); //

    // Media Controls
    const ttsVoiceCharacterSelect = document.getElementById('tts-voice-character-select'); //
    const playTtsBtn = document.getElementById('play-tts-btn'); //
    const audioPlayerContainer = document.getElementById('audio-player-container'); //
    const generateTtvBtn = document.getElementById('generate-ttv-btn'); //
    const ttvPlayerContainer = document.getElementById('ttv-player-container'); //

    // User Input
    const userAnswerForm = document.getElementById('user-answer-form'); //
    const userAnswerInput = document.getElementById('user-answer-input'); //
    const submitAnswerBtn = document.getElementById('submit-answer-btn'); //
    const answerFeedbackArea = document.getElementById('answer-feedback-area'); //

    // AI Tutor
    const openAiTutorBtn = document.getElementById('open-ai-tutor-btn'); //
    const aiTutorChatModal = document.getElementById('ai-tutor-chat-modal'); //
    const closeAiTutorModalBtn = document.getElementById('close-ai-tutor-modal-btn'); //
    const aiTutorMessagesArea = document.getElementById('ai-tutor-messages'); //
    const aiTutorInputForm = document.getElementById('ai-tutor-input-form'); //
    const aiTutorMessageInput = document.getElementById('ai-tutor-message-input'); //

    // Progress Indicators
    const topicProgressPercentageEl = document.getElementById('topic-progress-percentage'); //
    const topicProgressBarEl = document.getElementById('topic-progress-bar'); //
    const userXpPointsEl = document.getElementById('user-xp-points'); //
    const userBadgesCountEl = document.getElementById('user-badges-count'); //

    // Topic Actions
    const bookmarkTopicBtn = document.getElementById('bookmark-topic-btn'); //
    const discussTopicBtn = document.getElementById('discuss-topic-btn'); //
    const topicResourcesList = document.getElementById('topic-resources-list');
    const currentYearFooter = document.getElementById('current-year-footer'); //


    // --- State ---
    let currentCourseId = "adv_ai"; //
    let currentTopicId = "1.1"; //
    let ttsAudioElement = null; //
    let isTtsPlaying = false; //
    let currentTopicData = null;
    let currentQuestionIndex = 0;
    let userAnswers = {};
    let isAiTutorModalOpen = false; // Added based on modal logic

    // --- Utility Functions ---
    const appendMessageToQnA = (text, type = 'ai-question', isHtml = false) => { //
        if (!qnaContentArea) return;
        const bubbleWrapper = document.createElement('div');
        bubbleWrapper.classList.add('message-bubble-wrapper', type.startsWith('ai-') ? 'ai-message-wrapper' : 'user-message-wrapper');

        const bubble = document.createElement('div');
        bubble.classList.add('message-bubble', `${type}-bubble`);


        if (isHtml) {
            bubble.innerHTML = text;
        } else {
            const p = document.createElement('p');
            p.textContent = text;
            bubble.appendChild(p);
        }
        bubbleWrapper.appendChild(bubble);
        qnaContentArea.appendChild(bubbleWrapper);
        qnaContentArea.scrollTop = qnaContentArea.scrollHeight;
    };

    const showAnswerFeedback = (message, isCorrect) => { //
        if (!answerFeedbackArea) return;
        answerFeedbackArea.textContent = message;
        answerFeedbackArea.className = 'answer-feedback-display';
        answerFeedbackArea.classList.add(isCorrect ? 'feedback--correct' : 'feedback--incorrect'); // Adjusted class name based on common patterns
        answerFeedbackArea.style.display = 'block';
    };
    const clearAnswerFeedback = () => { //
        if (answerFeedbackArea) {
            answerFeedbackArea.textContent = '';
            answerFeedbackArea.style.display = 'none';
        }
    };
     const escapeHTML = (str) => {
        return str.replace(/[&<>'"]/g,
            tag => ({
                '&': '&amp;', '<': '&lt;', '>': '&gt;',
                "'": '&#39;', '"': '&quot;'
            }[tag] || tag)
        );
    };


    // --- Mock Data (Adapting from my previous version for structure, based on your HTML's needs) ---
    const MOCK_COURSE_CONTENT = { // for structure
        "adv_ai": {
            "module_1": {
                titleKey: "mcourse_module1_title_placeholder",
                topics: {
                    "1.1": { titleKey: "mcourse_topic1.1_title_placeholder", contentSnippet: "AI definitions.", questions: [{ id: "q1", textKey: "mcourse_ai_welcome_question" }], resources: [{ textKey: "mcourse_resource_placeholder1", url: "#", type: "pdf" }], isCompleted: false, isLocked: false },
                    "1.2": { titleKey: "mcourse_topic1.2_title_placeholder", contentSnippet: "Types of AI.", questions: [{ id: "q2", textKey: "mcourse_q_types_ai_placeholder" }], resources: [], isCompleted: false, isLocked: false },
                    "1.3": { titleKey: "mcourse_topic1.3_title_placeholder", contentSnippet: "History of AI.", questions: [{ id: "q3", textKey: "mcourse_q_history_ai_placeholder" }], resources: [], isCompleted: true, isLocked: false }
                }
            },
            "module_2": {
                titleKey: "mcourse_module2_title_placeholder",
                topics: {
                    "2.1": { titleKey: "mcourse_topic2.1_title_placeholder", contentSnippet: "Supervised learning.", questions: [{ id: "q4", textKey: "mcourse_q_supervised_placeholder" }], resources: [], isCompleted: false, isLocked: false },
                    "2.2": { titleKey: "mcourse_topic2.2_title_placeholder", contentSnippet: "Unsupervised learning.", questions: [{ id: "q5", textKey: "mcourse_q_unsupervised_placeholder" }], resources: [{ textKey: "mcourse_resource_placeholder2", url: "#", type: "article" }], isCompleted: false, isLocked: true }
                }
            }
        }
    };

    // --- Course Navigation & Content Loading ---
    async function fetchAndSetCurrentTopicData(courseId, topicId) { // logic adapted
        // Backend Integration: Replace this with an actual API call
        console.log(`Simulating fetch for course ${courseId}, topic ${topicId}`);
        await new Promise(resolve => setTimeout(resolve, 100));

        for (const moduleId in MOCK_COURSE_CONTENT[courseId]) {
            if (MOCK_COURSE_CONTENT[courseId][moduleId].topics[topicId]) {
                currentTopicData = MOCK_COURSE_CONTENT[courseId][moduleId].topics[topicId];
                return;
            }
        }
        currentTopicData = null;
        console.error(`Topic data not found for ${courseId} / ${topicId}`);
    }

    async function loadTopicContent(topicIdToLoad, courseIdToLoad) { // logic adapted
        currentTopicId = topicIdToLoad;
        currentCourseId = courseIdToLoad;
        currentQuestionIndex = 0;
        userAnswers = {};

        await fetchAndSetCurrentTopicData(currentCourseId, currentTopicId);

        if (currentTopicTitleText) {
            const title = (window.uplasTranslate && currentTopicData?.titleKey) ? window.uplasTranslate(currentTopicData.titleKey, `Topic ${currentTopicId}`) : `Topic ${currentTopicId}`;
            currentTopicTitleText.textContent = title;
            document.title = title + " | Uplas";
            if (currentTopicData?.titleKey) currentTopicTitleText.dataset.translateKey = currentTopicData.titleKey;
        }

        if (qnaContentArea) qnaContentArea.innerHTML = ''; // Clear previous Q&A
        if (aiInitialMessageText) aiInitialMessageText.innerHTML = ''; // Clear initial message before prepending new one
        
        if (audioPlayerContainer) audioPlayerContainer.innerHTML = '';
        if (ttvPlayerContainer) { ttvPlayerContainer.innerHTML = ''; ttvPlayerContainer.style.display = 'none';}
        isTtsPlaying = false;
        if (playTtsBtn) playTtsBtn.innerHTML = `<i class="fas fa-play"></i> <span data-translate-key="button_listen">Listen</span>`;
        clearAnswerFeedback();

        if (!currentTopicData) {
            appendMessageToQnA((window.uplasTranslate ? window.uplasTranslate('mcourse_err_topic_not_found') : "Topic content not available."), 'ai-question', false);
            if (userAnswerForm) userAnswerForm.hidden = true;
            if (window.uplasApplyTranslations) window.uplasApplyTranslations();
            return;
        }

        if (currentTopicData.isLocked) {
            qnaContentArea.innerHTML = `<div class="locked-content-message">
                <i class="fas fa-lock"></i>
                <h3 data-translate-key="mcourse_topic_locked_title">Topic Locked</h3>
                <p data-translate-key="mcourse_topic_locked_desc">Please complete previous topics or check your subscription.</p>
                <a href="upricing.html" class="button button--primary" data-translate-key="mcourse_button_view_plans">View Plans</a>
            </div>`;
            if (userAnswerForm) userAnswerForm.hidden = true;
        } else {
            if (userAnswerForm) userAnswerForm.hidden = false;
            renderCurrentQuestion();
        }
        updateTopicResourcesDisplay();
        updateNavigationHighlights();
        updateProgressIndicators();
        if (window.uplasApplyTranslations) window.uplasApplyTranslations();
    }

    function renderCurrentQuestion() {
        if (!currentTopicData || !currentTopicData.questions || currentTopicData.questions.length === 0) {
            appendMessageToQnA(window.uplasTranslate ? window.uplasTranslate('mcourse_no_questions_for_topic') : "No questions for this topic.", 'ai-question');
            if(userAnswerForm) userAnswerForm.hidden = true;
            return;
        }
        if (currentQuestionIndex >= currentTopicData.questions.length) {
            appendMessageToQnA(window.uplasTranslate ? window.uplasTranslate('mcourse_topic_completed_message') : "Topic completed!", 'ai-question');
            if (userAnswerForm) { userAnswerForm.reset(); userAnswerForm.hidden = true; }
            markTopicAsCompleted(currentCourseId, currentTopicId);
            return;
        }

        if (userAnswerForm) userAnswerForm.hidden = false;
        const question = currentTopicData.questions[currentQuestionIndex];
        const questionText = window.uplasTranslate ? window.uplasTranslate(question.textKey, "AI asks a question...") : "AI asks a question...";
        
        // Use the aiInitialMessageText for the first question from HTML structure, then append.
        if (currentQuestionIndex === 0 && qnaContentArea.children.length === 0 && aiInitialMessageText && question.textKey === "mcourse_ai_welcome_question") {
            aiInitialMessageText.textContent = questionText; // Set text of the static element
             if (question.textKey) aiInitialMessageText.dataset.translateKey = question.textKey;
        } else {
            appendMessageToQnA(questionText, 'ai-question');
        }

        if(userAnswerInput) {userAnswerInput.disabled = false; userAnswerInput.focus();}
        if(submitAnswerBtn) submitAnswerBtn.disabled = false;
    }

    async function handleUserAnswerSubmit(e) { // - structure adapted
        e.preventDefault();
        const answerText = userAnswerInput.value.trim();
        if (!answerText || !currentTopicData || !currentTopicData.questions) return;

        appendMessageToQnA(escapeHTML(answerText), 'user-answer');
        userAnswerInput.value = '';
        userAnswerInput.disabled = true;
        if(submitAnswerBtn) {
            submitAnswerBtn.disabled = true;
            submitAnswerBtn.innerHTML = `<i class="fas fa-spinner fa-spin"></i> <span data-translate-key="button_submitting">Submitting...</span>`;
        }
        if(window.uplasApplyTranslations) window.uplasApplyTranslations(); // Translate submitting button
        clearAnswerFeedback();

        const currentQuestion = currentTopicData.questions[currentQuestionIndex];
        userAnswers[currentQuestion.id] = answerText;

        // AI Model Integration: Send answerText for feedback
        console.log(`User answered "${answerText}" to question "${currentQuestion.textKey}"`);
        await new Promise(resolve => setTimeout(resolve, 1500)); // Simulate AI processing
        const isCorrect = Math.random() > 0.4; // Simulate correctness
        const feedbackMsgKey = isCorrect ? "mcourse_feedback_correct_generic" : "mcourse_feedback_incorrect_generic";
        const feedbackMsg = window.uplasTranslate ? window.uplasTranslate(feedbackMsgKey, (isCorrect ? "Good!" : "Not quite.")) : (isCorrect ? "Good!" : "Not quite.");
        
        showAnswerFeedback(feedbackMsg, isCorrect);
        appendMessageToQnA(feedbackMsg, 'ai-feedback'); // Also show feedback in QnA flow

        if(submitAnswerBtn) {
            submitAnswerBtn.innerHTML = `<i class="fas fa-paper-plane"></i> <span data-translate-key="button_submit_answer">Submit</span>`;
            if(window.uplasApplyTranslations) window.uplasApplyTranslations();
        }
        
        currentQuestionIndex++;
        renderCurrentQuestion(); // Load next question or completion
    }

    function updateNavigationHighlights() { //
        courseModuleTopicNav?.querySelectorAll('.topic-link-nav.active').forEach(el => el.classList.remove('active'));
        const activeLink = courseModuleTopicNav?.querySelector(`.topic-link-nav[data-topic-id="${currentTopicId}"][data-course-id="${currentCourseId}"]`);
        activeLink?.classList.add('active');
    }

    function updateTopicResourcesDisplay() { // - improved
        if (!topicResourcesList) return;
        topicResourcesList.innerHTML = '';
        if (currentTopicData && currentTopicData.resources && currentTopicData.resources.length > 0) {
            currentTopicData.resources.forEach(res => {
                const icon = res.type === 'pdf' ? 'fa-file-pdf' : (res.type === 'article' ? 'fa-book-open' : 'fa-link');
                const text = window.uplasTranslate ? window.uplasTranslate(res.textKey, "Resource") : "Resource";
                topicResourcesList.innerHTML += `<li><a href="${res.url || '#'}" target="_blank" rel="noopener noreferrer"><i class="fas ${icon}"></i> <span data-translate-key="${res.textKey}">${text}</span></a></li>`;
            });
        } else {
            topicResourcesList.innerHTML = `<li data-translate-key="mcourse_no_resources_for_topic">No resources for this topic.</li>`;
        }
        if(window.uplasApplyTranslations) window.uplasApplyTranslations();
    }
    
    function buildCourseNavigation() { // - adapted for current mock data
        if (!courseModuleTopicNav || !currentCourseId || !MOCK_COURSE_CONTENT[currentCourseId]) return;
        courseModuleTopicNav.innerHTML = '';

        const courseData = MOCK_COURSE_CONTENT[currentCourseId];
        Object.entries(courseData).forEach(([moduleId, moduleData]) => {
            const moduleEl = document.createElement('div');
            moduleEl.className = 'module-group';
            const moduleTitle = window.uplasTranslate ? window.uplasTranslate(moduleData.titleKey, `Module ${moduleId.split('_')[1]}`) : `Module ${moduleId.split('_')[1]}`;
            
            moduleEl.innerHTML = `
                <button class="module-title-btn" aria-expanded="false" aria-controls="module-${moduleId}-topics-nav" data-translate-key="${moduleData.titleKey}">${moduleTitle}</button>
                <ul id="module-${moduleId}-topics-nav" class="topic-list-nav" hidden>
                    ${Object.entries(moduleData.topics).map(([topicId, topic]) => `
                        <li>
                            <a href="mcourse.html?courseId=${currentCourseId}&topicId=${topicId}" 
                               class="topic-link-nav ${topic.isCompleted ? 'completed' : ''} ${topic.isLocked ? 'locked' : ''}" 
                               data-topic-id="${topicId}" 
                               data-course-id="${currentCourseId}"
                               ${topic.titleKey ? `data-translate-key="${topic.titleKey}"` : ''}>
                               ${window.uplasTranslate && topic.titleKey ? window.uplasTranslate(topic.titleKey) : `Topic ${topicId}`}
                               ${topic.isCompleted ? '<i class="fas fa-check-circle topic-status-icon"></i>' : ''}
                               ${topic.isLocked ? '<i class="fas fa-lock topic-status-icon"></i>' : ''}
                            </a>
                        </li>
                    `).join('')}
                </ul>`;
            courseModuleTopicNav.appendChild(moduleEl);
        });
        if (window.uplasApplyTranslations) window.uplasApplyTranslations();
    }

    function markTopicAsCompleted(courseId, topicId) {
        console.log(`Marking topic ${topicId} of course ${courseId} as complete (simulated).`);
        // Backend Integration: Send completion status to the server
        if (MOCK_COURSE_CONTENT[courseId]) {
            for (const modId in MOCK_COURSE_CONTENT[courseId]) {
                if (MOCK_COURSE_CONTENT[courseId][modId].topics[topicId]) {
                    MOCK_COURSE_CONTENT[courseId][modId].topics[topicId].isCompleted = true;
                    break;
                }
            }
        }
        buildCourseNavigation();
        updateNavigationHighlights();
        updateProgressIndicators();
    }

    function updateProgressIndicators() { // - adapted
         if (!currentCourseId || !MOCK_COURSE_CONTENT[currentCourseId]) return;
        let totalAccessibleTopics = 0;
        let completedTopics = 0;
        for (const modId in MOCK_COURSE_CONTENT[currentCourseId]) {
            const module = MOCK_COURSE_CONTENT[currentCourseId][modId];
            for (const topicId in module.topics) {
                if (!module.topics[topicId].isLocked) {
                    totalAccessibleTopics++;
                    if (module.topics[topicId].isCompleted) completedTopics++;
                }
            }
        }
        const completionPercentage = totalAccessibleTopics > 0 ? Math.round((completedTopics / totalAccessibleTopics) * 100) : 0;

        if (topicProgressPercentageEl) topicProgressPercentageEl.textContent = `${completionPercentage}%`;
        if (topicProgressBarEl) {
            topicProgressBarEl.style.width = `${completionPercentage}%`;
            topicProgressBarEl.setAttribute('aria-valuenow', completionPercentage.toString());
        }
        // Mock XP and Badges - fetch from backend
        if (userXpPointsEl) userXpPointsEl.textContent = (completedTopics * 50).toString(); // Example XP
        if (userBadgesCountEl) userBadgesCountEl.textContent = Math.floor(completedTopics / 2).toString(); // Example badges
    }

    // --- TTS & TTV Controls ---
    if (playTtsBtn) { // - adapted
        playTtsBtn.addEventListener('click', async () => {
            const lastBubble = qnaContentArea.querySelector('.message-bubble:last-child p');
            const textToSpeak = lastBubble ? lastBubble.textContent : (aiInitialMessageText?.textContent || "No content selected.");
            const voice = ttsVoiceCharacterSelect ? ttsVoiceCharacterSelect.value : 'alloy';

            if (isTtsPlaying && ttsAudioElement) {
                ttsAudioElement.pause(); isTtsPlaying = false;
                playTtsBtn.innerHTML = `<i class="fas fa-play"></i> <span data-translate-key="button_listen">Listen</span>`;
                return;
            }
            playTtsBtn.disabled = true;
            playTtsBtn.innerHTML = `<i class="fas fa-spinner fa-spin"></i> <span data-translate-key="button_loading">Loading...</span>`;
            if(window.uplasApplyTranslations) window.uplasApplyTranslations();

            try {
                // AI Model Integration: TTS API Call
                console.log(`TTS Request: Text="${textToSpeak.substring(0,30)}...", Voice=${voice}`);
                await new Promise(resolve => setTimeout(resolve, 1000)); // Simulate API
                const audioURL = `https://translate.google.com/translate_tts?ie=UTF-8&q=${encodeURIComponent(textToSpeak.substring(0,199))}&tl=${document.documentElement.lang || 'en'}&client=tw-ob`; // Example, replace

                if (audioPlayerContainer) audioPlayerContainer.innerHTML = '';
                ttsAudioElement = new Audio(audioURL);
                ttsAudioElement.controls = true;
                audioPlayerContainer.appendChild(ttsAudioElement);
                await ttsAudioElement.play();
                isTtsPlaying = true;
                playTtsBtn.innerHTML = `<i class="fas fa-pause"></i> <span data-translate-key="button_pause">Pause</span>`;
                ttsAudioElement.onended = () => {
                    isTtsPlaying = false;
                    playTtsBtn.innerHTML = `<i class="fas fa-play"></i> <span data-translate-key="button_listen">Listen</span>`;
                    if(window.uplasApplyTranslations) window.uplasApplyTranslations();
                };
            } catch (error) {
                console.error("TTS Error:", error);
                playTtsBtn.innerHTML = `<i class="fas fa-play"></i> <span data-translate-key="button_listen">Listen</span>`;
            } finally {
                playTtsBtn.disabled = false;
                if(window.uplasApplyTranslations) window.uplasApplyTranslations();
            }
        });
    }
    if (generateTtvBtn) { // - adapted
        generateTtvBtn.addEventListener('click', async () => {
            const lastBubble = qnaContentArea.querySelector('.message-bubble:last-child p');
            const textForVideo = lastBubble ? lastBubble.textContent : (aiInitialMessageText?.textContent || "No content for video.");

            generateTtvBtn.disabled = true;
            generateTtvBtn.innerHTML = `<i class="fas fa-spinner fa-spin"></i> <span data-translate-key="button_generating_video">Generating...</span>`;
            if(window.uplasApplyTranslations) window.uplasApplyTranslations();
            if(ttvPlayerContainer) { ttvPlayerContainer.innerHTML = ''; ttvPlayerContainer.style.display = 'none';}

            try {
                // AI Model Integration: TTV API Call
                console.log(`TTV Request: Text="${textForVideo.substring(0,30)}..."`);
                await new Promise(resolve => setTimeout(resolve, 2500)); // Simulate API
                const videoURL = "https://www.w3schools.com/html/mov_bbb.mp4"; // Placeholder

                if (ttvPlayerContainer) {
                    ttvPlayerContainer.innerHTML = `<video controls autoplay width="100%" src="${videoURL}"><source src="${videoURL}" type="video/mp4">Video not supported.</video>`;
                    ttvPlayerContainer.style.display = 'block';
                }
            } catch (error) { console.error("TTV Error:", error);
            } finally {
                generateTtvBtn.disabled = false;
                generateTtvBtn.innerHTML = `<i class="fas fa-video"></i> <span data-translate-key="button_watch_video">Watch Video</span>`;
                if(window.uplasApplyTranslations) window.uplasApplyTranslations();
            }
        });
    }

    // --- AI Tutor Modal ---
    const toggleAiTutorModal = (show) => { //
        if (!aiTutorChatModal) return;
        isAiTutorModalOpen = show; // Track state
        aiTutorChatModal.hidden = !show;
        document.body.style.overflow = show ? 'hidden' : '';
        if (show) {
            aiTutorChatModal.classList.add('active');
            aiTutorMessageInput?.focus();
            if (aiTutorMessagesArea && aiTutorMessagesArea.children.length === 0) {
                const topicTitle = currentTopicTitleText?.textContent || "this topic";
                const welcomeMsg = (window.uplasTranslate ? window.uplasTranslate('ai_tutor_welcome_message_contextual', { variables: { topicTitle: topicTitle } }) : `Ask about ${topicTitle}.`);
                aiTutorMessagesArea.innerHTML = `<div class="message-bubble ai-tutor-bubble"><p>${welcomeMsg}</p></div>`;
            }
        } else {
            aiTutorChatModal.classList.remove('active');
        }
    };

    if (openAiTutorBtn) openAiTutorBtn.addEventListener('click', () => toggleAiTutorModal(true));
    if (closeAiTutorModalBtn) closeAiTutorModalBtn.addEventListener('click', () => toggleAiTutorModal(false));
    aiTutorChatModal?.addEventListener('click', (e) => { if (e.target === aiTutorChatModal) toggleAiTutorModal(false); });
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && isAiTutorModalOpen) toggleAiTutorModal(false); });

    if (aiTutorInputForm) { // - adapted for form submission
        aiTutorInputForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const userQuery = aiTutorMessageInput.value.trim();
            if (!userQuery || !aiTutorMessagesArea) return;
            
            appendMessageToQnA(escapeHTML(userQuery),'user-tutor'); // Use appendMessage for AI Tutor area
            aiTutorMessageInput.value = '';

            // AI Model Integration: Send query with context to AI tutor backend
            console.log(`AI Tutor Query: "${userQuery}" for topic "${currentTopicTitleText?.textContent}"`);
            await new Promise(resolve => setTimeout(resolve, 1000)); // Simulate response
            const tutorResponse = `Regarding "${userQuery.substring(0,20)}...", for ${currentTopicTitleText?.textContent || 'this topic'}, let me clarify... [Simulated AI Tutor Explanation]`;
            appendMessageToQnA(tutorResponse, 'ai-tutor');
        });
    }

    // --- Event Listeners ---
    if (userAnswerForm) userAnswerForm.addEventListener('submit', handleUserAnswerSubmit); //
    if (courseModuleTopicNav) { // - event delegation for dynamic links
        courseModuleTopicNav.addEventListener('click', (e) => {
            const target = e.target.closest('.topic-link-nav, .module-title-btn');
            if (!target) return;

            if (target.classList.contains('module-title-btn')) {
                e.preventDefault();
                const contentId = target.getAttribute('aria-controls');
                const content = document.getElementById(contentId);
                const isExpanded = target.getAttribute('aria-expanded') === 'true';
                target.setAttribute('aria-expanded', (!isExpanded).toString());
                if (content) content.hidden = isExpanded;
            } else if (target.classList.contains('topic-link-nav')) {
                e.preventDefault();
                if (target.classList.contains('locked')) {
                    alert(window.uplasTranslate ? window.uplasTranslate('mcourse_alert_topic_locked_nav') : "This topic is locked.");
                    return;
                }
                const newTopicId = target.dataset.topicId;
                const newCourseId = target.dataset.courseId;
                if (newCourseId && newTopicId && (newTopicId !== currentTopicId || newCourseId !== currentCourseId)) {
                    history.pushState({ courseId: newCourseId, topicId: newTopicId }, "", `mcourse.html?courseId=${newCourseId}&topicId=${newTopicId}`);
                    loadTopicContent(newTopicId, newCourseId);
                }
            }
        });
    }

    // Handle browser back/forward
    window.addEventListener('popstate', (event) => {
        const params = new URLSearchParams(window.location.search);
        const courseIdFromUrl = params.get('courseId') || "adv_ai";
        const topicIdFromUrl = params.get('lessonId') || params.get('topicId') || "1.1";

        if (event.state && event.state.topicId && event.state.courseId) {
            loadTopicContent(event.state.topicId, event.state.courseId);
        } else if (topicIdFromUrl && courseIdFromUrl) {
            loadTopicContent(topicIdFromUrl, courseIdFromUrl);
        }
    });

    // --- Initial Load ---
    const initialParams = new URLSearchParams(window.location.search); //
    const initialCourseId = initialParams.get('courseId') || "adv_ai";
    const initialTopicId = initialParams.get('lessonId') || initialParams.get('topicId') || "1.1"; // 'lessonId' was in your JS

    currentCourseId = initialCourseId;
    
    // Ensure i18n is ready before building nav and loading topic that rely on translations
    const initialSetup = () => {
        buildCourseNavigation();
        loadTopicContent(initialTopicId, initialCourseId);
    };

    if (typeof window.uplasOnLanguageChange === 'function') {
        let initialLoadDone = false;
        window.uplasOnLanguageChange(() => {
            // Rebuild/reload content if language changes AFTER initial load
            if (initialLoadDone) {
                buildCourseNavigation();
                loadTopicContent(currentTopicId, currentCourseId); // Use current state
            }
        });
        // If i18nManager is already initialized by global.js, uplasTranslate should be ready
        if(typeof window.uplasTranslate === 'function') {
            initialSetup();
            initialLoadDone = true;
        } else {
            // Fallback: wait a bit for i18n from global.js to initialize fully
            // This is a bit fragile; a more robust event/promise system from i18nManager would be better
            setTimeout(() => {
                initialSetup();
                initialLoadDone = true;
            }, 500); 
        }
    } else { // If i18n system isn't ready or not using onLanguageChange
        initialSetup();
    }


    // Update footer year
    if (currentYearFooter) {
        const yearText = currentYearFooter.textContent;
        if (yearText && yearText.includes("{currentYear}")) {
            currentYearFooter.textContent = yearText.replace("{currentYear}", new Date().getFullYear());
        } else if (yearText && !yearText.match(/\d{4}/) && !yearText.includes(new Date().getFullYear().toString())) {
            currentYearFooter.textContent = new Date().getFullYear();
        }
    }

    console.log("Uplas Interactive Learning Page (mcourse.js) logic initialized.");
} // End of initializeInteractiveCoursePage


// --- DOMContentLoaded Main Execution ---
document.addEventListener('DOMContentLoaded', () => {
    // --- Authentication Check ---
    if (typeof getAuthToken !== 'function') {
        console.error('getAuthToken function is not defined. Ensure apiUtils.js is loaded correctly.');
        const mainContent = document.getElementById('main-content-area');
        if (mainContent) {
            mainContent.innerHTML = '<p style="text-align:center; padding: 20px; color: red;" data-translate-key="error_auth_utility_missing">Authentication utility is missing. Page cannot load correctly.</p>';
            if (window.uplasApplyTranslations) window.uplasApplyTranslations();
        }
        return;
    }
    const authToken = getAuthToken(); // Assumes getAuthToken from apiUtils.js looks for 'accessToken'

    if (!authToken) {
        console.log('User not authenticated for interactive course. Redirecting to login.');
        const currentPath = window.location.pathname + window.location.search + window.location.hash;
        window.location.href = `index.html#auth-section&returnUrl=${encodeURIComponent(currentPath)}`;
    } else {
        console.log('User authenticated. Initializing interactive course page.');
        initializeInteractiveCoursePage(); // Proceed with page setup
    }
});
