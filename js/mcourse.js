// js/mcourse.js
/* ==========================================================================
   Uplas Interactive Learning Page JavaScript (mcourse.js)
   - Handles Q&A flow, TTS/TTV controls, AI Tutor interaction, progress updates.
   - Relies on global.js for theme, nav, language.
   - Relies on apiUtils.js for auth token.
   - Implements authentication check before initializing.
   ========================================================================== */
'use strict';

// This function contains the original logic from your mcourse.js
function initializeInteractiveCoursePage() {
    // --- Element Selectors ---
    const courseModuleTopicNav = document.getElementById('course-module-topic-nav');
    const currentTopicTitleText = document.getElementById('current-topic-title-main');
    const qnaContentArea = document.getElementById('qna-content-area');
    const aiInitialMessageText = document.getElementById('ai-initial-message-text');

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
    const answerFeedbackArea = document.getElementById('answer-feedback-area');

    // AI Tutor
    const openAiTutorBtn = document.getElementById('open-ai-tutor-btn');
    const aiTutorChatModal = document.getElementById('ai-tutor-chat-modal');
    const closeAiTutorModalBtn = document.getElementById('close-ai-tutor-modal-btn');
    const aiTutorMessagesArea = document.getElementById('ai-tutor-messages');
    const aiTutorInputForm = document.getElementById('ai-tutor-input-form');
    const aiTutorMessageInput = document.getElementById('ai-tutor-message-input');

    // Progress Indicators
    const topicProgressPercentageEl = document.getElementById('topic-progress-percentage');
    const topicProgressBarEl = document.getElementById('topic-progress-bar');
    const userXpPointsEl = document.getElementById('user-xp-points');
    const userBadgesCountEl = document.getElementById('user-badges-count');

    // Topic Actions
    const bookmarkTopicBtn = document.getElementById('bookmark-topic-btn');
    const discussTopicBtn = document.getElementById('discuss-topic-btn');
    const topicResourcesList = document.getElementById('topic-resources-list'); // Added selector based on mcourse.html
    const currentYearFooter = document.getElementById('current-year-footer');


    // --- State ---
    let currentCourseId = "adv_ai";
    let currentTopicId = "1.1";
    let ttsAudioElement = null;
    let isTtsPlaying = false;
    let currentTopicData = null;
    let currentQuestionIndex = 0; // Added for Q&A progression
    let userAnswers = {}; // Added to store user answers if needed

    // --- Utility Functions ---
    const appendMessageToQnA = (text, type = 'ai-question', isHtml = false) => {
        if (!qnaContentArea) return;
        const bubbleWrapper = document.createElement('div');
        bubbleWrapper.classList.add('message-bubble-wrapper', type === 'ai-question' || type === 'ai-feedback' || type === 'ai-tutor' ? 'ai-message-wrapper' : 'user-message-wrapper');

        const bubble = document.createElement('div');
        bubble.classList.add('message-bubble');
        if (type === 'ai-question') bubble.classList.add('ai-question-bubble');
        else if (type === 'user-answer') bubble.classList.add('user-answer-bubble');
        else if (type === 'ai-feedback') bubble.classList.add('ai-feedback-bubble');
        else if (type === 'user-tutor') bubble.classList.add('user-tutor-bubble'); // For AI Tutor
        else if (type === 'ai-tutor') bubble.classList.add('ai-tutor-bubble');   // For AI Tutor


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
        answerFeedbackArea.classList.add(isCorrect ? 'feedback-correct' : 'feedback-incorrect');
        answerFeedbackArea.style.display = 'block';
    };
    const clearAnswerFeedback = () => { //
        if (answerFeedbackArea) {
            answerFeedbackArea.textContent = '';
            answerFeedbackArea.style.display = 'none';
        }
    };

    const escapeHTML = (str) => { // Helper to prevent XSS if displaying user input directly
        return str.replace(/[&<>'"]/g,
            tag => ({
                '&': '&amp;', '<': '&lt;', '>': '&gt;',
                "'": '&#39;', '"': '&quot;'
            }[tag] || tag)
        );
    };

    // --- Mock Data (Adapting from my previous version for structure, but can be replaced by your API logic) ---
    const MOCK_COURSE_CONTENT = {
        "adv_ai": { // Course ID
            "module_1": { // Module ID
                titleKey: "mcourse_module1_title_placeholder", // For translation
                topics: {
                    "1.1": { // Topic ID
                        titleKey: "mcourse_topic1.1_title_placeholder",
                        contentSnippet: "Introduction to Artificial Intelligence and its core concepts.", // Used for context
                        questions: [
                            { id: "q1.1.1", type: "open", textKey: "mcourse_ai_welcome_question", aiInstructionKey: "mcourse_ai_welcome_question" },
                            { id: "q1.1.2", type: "open", textKey: "mcourse_q_what_is_ml", aiInstructionKey: "mcourse_q_what_is_ml_instruction" }
                        ],
                        resources: [{ textKey: "mcourse_resource_def_ai", url: "#", type: "article" }],
                        isCompleted: false,
                        isLocked: false
                    },
                    "1.2": {
                        titleKey: "mcourse_topic1.2_title_placeholder",
                        contentSnippet: "Exploring different categories and types of AI.",
                        questions: [{ id: "q1.2.1", type: "open", textKey: "mcourse_q_types_ai" }],
                        resources: [],
                        isCompleted: false,
                        isLocked: false
                    },
                    "1.3": {
                        titleKey: "mcourse_topic1.3_title_placeholder",
                        contentSnippet: "A brief look at the history and evolution of AI.",
                        questions: [{ id: "q1.3.1", type: "open", textKey: "mcourse_q_history_ai" }],
                        resources: [],
                        isCompleted: true, // Example of a completed topic
                        isLocked: false
                    }
                }
            },
            "module_2": {
                titleKey: "mcourse_module2_title_placeholder",
                topics: {
                    "2.1": { titleKey: "mcourse_topic2.1_title_placeholder", contentSnippet: "Understanding supervised learning algorithms.", questions: [{ id: "q2.1.1", type: "open", textKey: "mcourse_q_supervised_learning" }], resources: [], isCompleted: false, isLocked: false },
                    "2.2": { titleKey: "mcourse_topic2.2_title_placeholder", contentSnippet: "Exploring unsupervised learning techniques.", questions: [{ id: "q2.2.1", type: "open", textKey: "mcourse_q_unsupervised_learning" }], resources: [], isCompleted: false, isLocked: true } // Example of a locked topic
                }
            }
        }
    };


    // --- Course Navigation & Content Loading ---
    async function fetchAndSetCurrentTopicData(courseId, topicId) {
        // Backend Integration: Replace this with an actual API call
        // currentTopicData = await fetchAuthenticated(`/api/course/${courseId}/topic/${topicId}/interactive-content`);
        console.log(`Workspaceing data for course ${courseId}, topic ${topicId}`);
        await new Promise(resolve => setTimeout(resolve, 100)); // Simulate short delay

        for (const moduleId in MOCK_COURSE_CONTENT[courseId]) {
            if (MOCK_COURSE_CONTENT[courseId][moduleId].topics[topicId]) {
                currentTopicData = MOCK_COURSE_CONTENT[courseId][moduleId].topics[topicId];
                return;
            }
        }
        currentTopicData = null; // Topic not found
    }


    async function loadTopicContent(topicIdToLoad, courseIdToLoad) { // - adapted
        currentTopicId = topicIdToLoad;
        currentCourseId = courseIdToLoad;
        currentQuestionIndex = 0;
        userAnswers = {};

        await fetchAndSetCurrentTopicData(currentCourseId, currentTopicId);

        if (currentTopicTitleText) {
            const topicLinkElement = courseModuleTopicNav?.querySelector(`.topic-link-nav[data-topic-id="${currentTopicId}"][data-course-id="${currentCourseId}"]`);
            const title = window.uplasTranslate && currentTopicData?.titleKey ? window.uplasTranslate(currentTopicData.titleKey, `Topic ${currentTopicId}`) : (topicLinkElement?.textContent || `Topic ${currentTopicId}`);
            currentTopicTitleText.textContent = title;
            document.title = title + " | Uplas";
            if (currentTopicData?.titleKey) currentTopicTitleText.dataset.translateKey = currentTopicData.titleKey;
        }

        if (qnaContentArea) qnaContentArea.innerHTML = '';
        if (audioPlayerContainer) audioPlayerContainer.innerHTML = '';
        if (ttvPlayerContainer) {
            ttvPlayerContainer.innerHTML = '';
            ttvPlayerContainer.style.display = 'none';
        }
        isTtsPlaying = false;
        if (playTtsBtn) playTtsBtn.innerHTML = `<i class="fas fa-play"></i> <span data-translate-key="button_listen">Listen</span>`;
        clearAnswerFeedback();

        if (!currentTopicData) {
            appendMessageToQnA(window.uplasTranslate ? window.uplasTranslate('mcourse_err_topic_not_found', "Topic content not available.") : "Topic content not available.", 'ai-question system-message-bubble');
            if (userAnswerForm) userAnswerForm.hidden = true;
            return;
        }

        if (currentTopicData.isLocked) {
            qnaContentArea.innerHTML = `<div class="locked-content-message">
                <i class="fas fa-lock"></i>
                <h3 data-translate-key="mcourse_topic_locked_title">Topic Locked</h3>
                <p data-translate-key="mcourse_topic_locked_desc">Please complete previous topics or check your subscription to unlock.</p>
                <a href="upricing.html" class="button button--primary" data-translate-key="mcourse_button_view_plans">View Plans</a>
            </div>`;
            if (userAnswerForm) userAnswerForm.hidden = true;
        } else {
            if (userAnswerForm) userAnswerForm.hidden = false;
            renderCurrentQuestion(); // Start the Q&A flow
        }
        updateTopicResourcesDisplay();
        updateNavigationHighlights();
        updateProgressIndicators();
        if (window.uplasApplyTranslations) window.uplasApplyTranslations();
    }


    function renderCurrentQuestion() {
        if (!currentTopicData || !currentTopicData.questions || currentTopicData.questions.length === 0) {
            appendMessageToQnA(window.uplasTranslate ? window.uplasTranslate('mcourse_no_questions_for_topic', "No questions for this topic.") : "No questions for this topic.", 'ai-question system-message-bubble');
            if(userAnswerForm) userAnswerForm.hidden = true;
            return;
        }

        if (currentQuestionIndex >= currentTopicData.questions.length) {
            appendMessageToQnA(window.uplasTranslate ? window.uplasTranslate('mcourse_topic_completed_message', "Topic completed!") : "Topic completed!", 'ai-question system-message-bubble');
            if (userAnswerForm) { userAnswerForm.reset(); userAnswerForm.hidden = true;}
            markTopicAsCompleted(currentCourseId, currentTopicId);
            return;
        }
        if (userAnswerForm) userAnswerForm.hidden = false;

        const question = currentTopicData.questions[currentQuestionIndex];
        const questionText = window.uplasTranslate ? window.uplasTranslate(question.textKey, "AI asks...") : "AI asks...";
        
        // Use the initial static bubble for the very first question of the first topic.
        if (currentQuestionIndex === 0 && qnaContentArea.children.length === 0 && aiInitialMessageText && question.aiInstructionKey === "mcourse_ai_welcome_question") {
            aiInitialMessageText.textContent = questionText;
            if(question.textKey) aiInitialMessageText.dataset.translateKey = question.textKey;
        } else {
            appendMessageToQnA(questionText, 'ai-question');
        }

        if(userAnswerInput) {userAnswerInput.disabled = false; userAnswerInput.focus();}
        if(submitAnswerBtn) submitAnswerBtn.disabled = false;
    }

    async function handleUserAnswerSubmit(e) { // - adapted
        e.preventDefault();
        const answerText = userAnswerInput.value.trim();
        if (!answerText || !currentTopicData || !currentTopicData.questions) return;

        appendMessageToQnA(escapeHTML(answerText), 'user-answer');
        userAnswerInput.value = '';
        userAnswerInput.disabled = true;
        clearAnswerFeedback();
        if(submitAnswerBtn) {
            submitAnswerBtn.disabled = true;
            submitAnswerBtn.innerHTML = `<i class="fas fa-spinner fa-spin"></i> <span data-translate-key="button_submitting">Submitting...</span>`;
            if(window.uplasApplyTranslations) window.uplasApplyTranslations();
        }

        const currentQuestion = currentTopicData.questions[currentQuestionIndex];
        userAnswers[currentQuestion.id] = answerText;

        // AI Model Integration: Send answerText and context (currentQuestion.textKey, currentTopicData.contentSnippet)
        // const response = await fetchAuthenticated(`/api/course/${currentCourseId}/topic/${currentTopicId}/interact`, { method: 'POST', body: JSON.stringify({ questionId: currentQuestion.id, answer: answerText }) });
        // const aiResponse = await response.json(); // Expects { feedbackTextKey: "...", isCorrect: true/false, nextQuestionKey: "...", xpGained: 10 }

        // Simulate AI response
        await new Promise(resolve => setTimeout(resolve, 1500));
        const isCorrectGuess = Math.random() > 0.3;
        const aiResponse = {
            feedbackTextKey: isCorrectGuess ? "mcourse_feedback_placeholder_correct" : "mcourse_feedback_placeholder_elaborate",
            isCorrect: isCorrectGuess,
            nextQuestion: currentQuestionIndex < currentTopicData.questions.length -1 ? 
                MOCK_COURSE_CONTENT[currentCourseId]?.module_1?.topics[currentTopicId]?.questions[currentQuestionIndex+1] || // Simplified
                { textKey: "mcourse_q_generic_next_step" } : null, // If this was the last question
            xpGained: isCorrectGuess ? 10 : 2
        };
        
        showAnswerFeedback(window.uplasTranslate(aiResponse.feedbackTextKey, "Feedback..."), aiResponse.isCorrect);
        
        if (aiResponse.nextQuestion) {
            currentQuestionIndex++;
            renderCurrentQuestion();
        } else if (currentQuestionIndex >= currentTopicData.questions.length -1) { // Last question answered
            currentQuestionIndex++; // Move past the last question
            renderCurrentQuestion(); // This will trigger completion message
        }


        if (userXpPointsEl && aiResponse.xpGained) {
            userXpPointsEl.textContent = parseInt(userXpPointsEl.textContent || '0') + aiResponse.xpGained;
        }
        if(submitAnswerBtn) {
             submitAnswerBtn.innerHTML = `<i class="fas fa-paper-plane"></i> <span data-translate-key="button_submit_answer">Submit</span>`;
             if(window.uplasApplyTranslations) window.uplasApplyTranslations();
        }
    }


    // --- Navigation & UI Updates ---
    function updateNavigationHighlights() { // - adapted
        courseModuleTopicNav?.querySelectorAll('.topic-link-nav.active').forEach(el => el.classList.remove('active'));
        const activeLink = courseModuleTopicNav?.querySelector(`.topic-link-nav[data-topic-id="${currentTopicId}"][data-course-id="${currentCourseId}"]`);
        if (activeLink) {
            activeLink.classList.add('active');
            const parentModuleDiv = activeLink.closest('.module-group');
            const parentModuleButton = parentModuleDiv?.querySelector('.module-title-btn');
            const parentTopicList = parentModuleDiv?.querySelector('.topic-list-nav');
            if (parentModuleButton && parentTopicList && parentModuleButton.getAttribute('aria-expanded') === 'false') {
                parentModuleButton.setAttribute('aria-expanded', 'true');
                parentTopicList.hidden = false;
            }
        }
    }

    function updateTopicResourcesDisplay() {
        if (!topicResourcesList) return;
        topicResourcesList.innerHTML = '';
        if (currentTopicData && currentTopicData.resources && currentTopicData.resources.length > 0) {
            currentTopicData.resources.forEach(res => {
                const iconClass = res.type === 'pdf' ? 'fa-file-pdf' : (res.type === 'article' ? 'fa-book-open' : 'fa-link');
                const resourceText = window.uplasTranslate ? window.uplasTranslate(res.textKey, res.textKey || "Resource") : (res.textKey || "Resource");
                topicResourcesList.innerHTML += `<li><a href="${res.url || '#'}" target="_blank" rel="noopener noreferrer"><i class="fas ${iconClass}"></i> <span data-translate-key="${res.textKey}">${resourceText}</span></a></li>`;
            });
        } else {
            topicResourcesList.innerHTML = `<li data-translate-key="mcourse_no_resources_for_topic">No specific resources for this topic.</li>`;
        }
        if(window.uplasApplyTranslations) window.uplasApplyTranslations();
    }
    
    function buildCourseNavigation() { // Based on my previous mcourse.js
        if (!courseModuleTopicNav || !currentCourseId || !MOCK_COURSE_CONTENT[currentCourseId]) return;
        courseModuleTopicNav.innerHTML = '';

        const courseData = MOCK_COURSE_CONTENT[currentCourseId];
        for (const moduleId in courseData) {
            const module = courseData[moduleId];
            const moduleEl = document.createElement('div');
            moduleEl.className = 'module-group';
            
            const moduleTitle = window.uplasTranslate ? window.uplasTranslate(module.titleKey, `Module: ${moduleId}`) : `Module: ${moduleId}`;
            const moduleButton = document.createElement('button');
            moduleButton.className = 'module-title-btn';
            moduleButton.setAttribute('aria-expanded', 'false');
            moduleButton.setAttribute('aria-controls', `module-${moduleId}-topics-nav`);
            moduleButton.dataset.translateKey = module.titleKey;
            moduleButton.textContent = moduleTitle;
            
            const topicList = document.createElement('ul');
            topicList.id = `module-${moduleId}-topics-nav`;
            topicList.className = 'topic-list-nav';
            topicList.hidden = true;

            for (const topicId in module.topics) {
                const topic = module.topics[topicId];
                const topicItem = document.createElement('li');
                const topicLink = document.createElement('a');
                topicLink.href = `mcourse.html?courseId=${currentCourseId}&topicId=${topicId}`; // Correct link
                topicLink.className = 'topic-link-nav';
                if (topic.isCompleted) topicLink.classList.add('completed');
                if (topic.isLocked) topicLink.classList.add('locked');
                topicLink.dataset.topicId = topicId;
                topicLink.dataset.courseId = currentCourseId;
                if(topic.titleKey) topicLink.dataset.translateKey = topic.titleKey;
                
                let topicLinkText = window.uplasTranslate && topic.titleKey ? window.uplasTranslate(topic.titleKey) : `Topic ${topicId}`;
                topicLink.textContent = topicLinkText;

                if (topic.isCompleted) topicLink.innerHTML += ' <i class="fas fa-check-circle topic-status-icon"></i>';
                if (topic.isLocked) topicLink.innerHTML += ' <i class="fas fa-lock topic-status-icon"></i>';
                
                topicItem.appendChild(topicLink);
                topicList.appendChild(topicItem);
            }
            moduleEl.appendChild(moduleButton);
            moduleEl.appendChild(topicList);
            courseModuleTopicNav.appendChild(moduleEl);
        }
        if (window.uplasApplyTranslations) window.uplasApplyTranslations();
    }
    
    function markTopicAsCompleted(courseId, topicId) {
        // Backend Integration: Send this update
        console.log(`Marking topic ${topicId} in course ${courseId} as completed (simulated).`);
        // Update mock data for immediate UI feedback
        for (const modId in MOCK_COURSE_CONTENT[courseId]) {
            if (MOCK_COURSE_CONTENT[courseId][modId].topics[topicId]) {
                MOCK_COURSE_CONTENT[courseId][modId].topics[topicId].isCompleted = true;
                break;
            }
        }
        buildCourseNavigation(); // Rebuild to show updated icons
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
        if (userXpPointsEl) userXpPointsEl.textContent = (completedTopics * 100).toString();
        if (userBadgesCountEl) userBadgesCountEl.textContent = Math.floor(completedTopics / 3).toString();
    }


    // --- TTS & TTV Controls ---
    if (playTtsBtn) { // - adapted
        playTtsBtn.addEventListener('click', async () => {
            const currentContentElements = qnaContentArea.querySelectorAll('.ai-question-bubble p, .ai-feedback-bubble p, .user-answer-bubble p');
            if (currentContentElements.length === 0) { alert("No content to play."); return; }
            
            // Get text from the last few bubbles for better context or selected text
            let textToSpeak = Array.from(currentContentElements).slice(-3).map(el => el.textContent).join(" ");
            if (!textToSpeak) textToSpeak = "No text selected or available to speak.";

            const selectedVoice = ttsVoiceCharacterSelect ? ttsVoiceCharacterSelect.value : "alloy";

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
                // AI Model Integration: Call TTS API
                // const response = await fetchAuthenticated('/api/tts', { method: 'POST', body: JSON.stringify({ text: textToSpeak, voice: selectedVoice, language: document.documentElement.lang }) });
                // const data = await response.json(); // Expects { audioUrl: "..." }
                console.log(`Simulating TTS for: "${textToSpeak.substring(0, 50)}..." with voice ${selectedVoice}`);
                await new Promise(resolve => setTimeout(resolve, 1500));
                const data = { audioUrl: `https://translate.google.com/translate_tts?ie=UTF-8&q=${encodeURIComponent(textToSpeak.substring(0,199))}&tl=${document.documentElement.lang || 'en'}&client=tw-ob` };


                if (audioPlayerContainer && data.audioUrl) {
                    audioPlayerContainer.innerHTML = '';
                    ttsAudioElement = new Audio(data.audioUrl);
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
                } else { throw new Error("Audio URL not received or player container missing.");}
            } catch (error) {
                console.error("TTS Error:", error);
                playTtsBtn.innerHTML = `<i class="fas fa-play"></i> <span data-translate-key="button_listen">Listen</span>`;
                // alert("Failed to play audio."); // TODO: better error display
            } finally {
                playTtsBtn.disabled = false;
                if (window.uplasApplyTranslations) window.uplasApplyTranslations();
            }
        });
    }

    if (generateTtvBtn) { // - adapted
        generateTtvBtn.addEventListener('click', async () => {
            const currentContentElements = qnaContentArea.querySelectorAll('.ai-question-bubble p, .ai-feedback-bubble p');
             if (currentContentElements.length === 0) { alert("No AI content for video."); return; }
            const textForVideo = Array.from(currentContentElements).slice(-2).map(el => el.textContent).join("\n\n");


            generateTtvBtn.disabled = true;
            generateTtvBtn.innerHTML = `<i class="fas fa-spinner fa-spin"></i> <span data-translate-key="button_generating_video">Generating...</span>`;
            if (window.uplasApplyTranslations) window.uplasApplyTranslations();
            if(ttvPlayerContainer) ttvPlayerContainer.style.display = 'none';
            if(ttvPlayerContainer) ttvPlayerContainer.innerHTML = '';

            try {
                // AI Model Integration: Call TTV API
                // const response = await fetchAuthenticated('/api/ttv', { method: 'POST', body: JSON.stringify({ text: textForVideo, language: document.documentElement.lang }) });
                // const data = await response.json(); // Expects { videoUrl: "..." }
                console.log(`Simulating TTV for: "${textForVideo.substring(0,50)}..."`);
                await new Promise(resolve => setTimeout(resolve, 3000));
                const data = { videoUrl: "https://www.w3schools.com/html/mov_bbb.mp4" }; // Placeholder

                if (ttvPlayerContainer && data.videoUrl) {
                    ttvPlayerContainer.innerHTML = `<video controls autoplay width="100%" src="${data.videoUrl}" type="video/mp4">Your browser does not support the video tag.</video>`;
                    ttvPlayerContainer.style.display = 'block';
                } else { throw new Error("Video URL not received or player container missing.");}
            } catch (error) {
                console.error("TTV Error:", error);
                // alert("Failed to generate video."); // TODO: Better error display
            } finally {
                generateTtvBtn.disabled = false;
                generateTtvBtn.innerHTML = `<i class="fas fa-video"></i> <span data-translate-key="button_watch_video">Watch Video</span>`;
                if (window.uplasApplyTranslations) window.uplasApplyTranslations();
            }
        });
    }

    // --- AI Tutor Modal --- - adapted
    const toggleAiTutorModal = (show) => {
        if (!aiTutorChatModal) return;
        aiTutorChatModal.hidden = !show;
        document.body.style.overflow = show ? 'hidden' : '';
        if (show) {
            aiTutorChatModal.classList.add('active');
            aiTutorMessageInput?.focus();
            if (aiTutorMessagesArea && aiTutorMessagesArea.children.length === 0) {
                const welcomeMsg = window.uplasTranslate ? window.uplasTranslate('ai_tutor_welcome_message_contextual', "Hello! Ask me anything about {topicTitle}.") : "Hello! Ask me anything.";
                const topicTitle = currentTopicTitleText?.textContent || "the current topic";
                aiTutorMessagesArea.innerHTML = `<div class="message-bubble ai-tutor-bubble"><p>${welcomeMsg.replace('{topicTitle}', topicTitle)}</p></div>`;
            }
        } else {
            aiTutorChatModal.classList.remove('active');
        }
    };

    if (openAiTutorBtn) openAiTutorBtn.addEventListener('click', () => toggleAiTutorModal(true));
    if (closeAiTutorModalBtn) closeAiTutorModalBtn.addEventListener('click', () => toggleAiTutorModal(false));
    aiTutorChatModal?.addEventListener('click', (e) => { if (e.target === aiTutorChatModal) toggleAiTutorModal(false); });
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && aiTutorChatModal && !aiTutorChatModal.hidden) toggleAiTutorModal(false); });

    if (aiTutorInputForm) {
        aiTutorInputForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const userQuery = aiTutorMessageInput.value.trim();
            if (!userQuery || !aiTutorMessagesArea) return;

            // Append user message immediately
            const userMsgBubble = document.createElement('div');
            userMsgBubble.className = 'message-bubble user-tutor-bubble';
            userMsgBubble.innerHTML = `<p>${escapeHTML(userQuery)}</p>`;
            aiTutorMessagesArea.appendChild(userMsgBubble);
            aiTutorMessageInput.value = '';
            aiTutorMessagesArea.scrollTop = aiTutorMessagesArea.scrollHeight;

            // AI Model Integration: Send userQuery + context (currentTopicData.contentSnippet or title)
            // const response = await fetchAuthenticated('/api/ai-tutor/ask', { method: 'POST', body: JSON.stringify({ query: userQuery, courseId: currentCourseId, topicId: currentTopicId }) });
            // const aiTutorRes = await response.json(); // Expects { answer: "..." }

            // Simulate AI Tutor response
            await new Promise(resolve => setTimeout(resolve, 1200));
            const aiTutorRes = { answer: `Regarding your question about "${userQuery.substring(0,30)}...", here's some information related to ${currentTopicTitleText?.textContent || 'this topic'}: [AI Tutor simulated response].` };

            const aiMsgBubble = document.createElement('div');
            aiMsgBubble.className = 'message-bubble ai-tutor-bubble';
            aiMsgBubble.innerHTML = `<p>${aiTutorRes.answer}</p>`; // Assuming AI response is safe or sanitize it
            aiTutorMessagesArea.appendChild(aiMsgBubble);
            aiTutorMessagesArea.scrollTop = aiTutorMessagesArea.scrollHeight;
        });
    }


    // --- Event Listeners for Topic Navigation (from sidebar) & Form Submission ---
    if (userAnswerForm) userAnswerForm.addEventListener('submit', handleUserAnswerSubmit);
    if (courseModuleTopicNav) { // - adapted for dynamic links
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
                    alert(window.uplasTranslate ? window.uplasTranslate('mcourse_alert_topic_locked_nav', "This topic is locked.") : "This topic is locked.");
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

    // Handle browser back/forward for topic navigation
    window.addEventListener('popstate', (event) => { // - kept
        const params = new URLSearchParams(window.location.search);
        const courseIdFromUrl = params.get('courseId') || "adv_ai";
        const topicIdFromUrl = params.get('lessonId') || params.get('topicId') || "1.1"; // 'lessonId' was in your original, added 'topicId' for consistency

        if (event.state && event.state.topicId && event.state.courseId) {
            loadTopicContent(event.state.topicId, event.state.courseId);
        } else if (topicIdFromUrl && courseIdFromUrl) {
            loadTopicContent(topicIdFromUrl, courseIdFromUrl);
        }
    });


    // --- Initial Load --- - adapted
    const initialParams = new URLSearchParams(window.location.search);
    const initialCourseId = initialParams.get('courseId') || "adv_ai";
    const initialTopicId = initialParams.get('lessonId') || initialParams.get('topicId') || "1.1";

    currentCourseId = initialCourseId; // Set globally for first load
    currentTopicId = initialTopicId;
    
    buildCourseNavigation(); // Build nav first based on currentCourseId
    loadTopicContent(initialTopicId, initialCourseId); // Then load the specific topic

    // Update footer year
    if (currentYearFooter) {
        const yearText = currentYearFooter.textContent;
        if (yearText && yearText.includes("{currentYear}")) {
            currentYearFooter.textContent = yearText.replace("{currentYear}", new Date().getFullYear());
        } else if (yearText && !yearText.includes(new Date().getFullYear().toString())) {
             currentYearFooter.textContent = new Date().getFullYear(); // Fallback if placeholder is missing
        }
    }

    console.log("Uplas Interactive Learning Page (mcourse.js) logic initialized.");
} // End of initializeInteractiveCoursePage


// --- DOMContentLoaded Main Execution ---
document.addEventListener('DOMContentLoaded', () => {
    // --- Authentication Check ---
    if (typeof getAuthToken !== 'function') {
        console.error('getAuthToken function is not defined. Ensure apiUtils.js is loaded correctly.');
        const mainContent = document.getElementById('main-content-area'); // As per mcourse.html
        if (mainContent) {
            mainContent.innerHTML = '<p style="text-align:center; padding: 20px; color: red;" data-translate-key="error_auth_utility_missing">Authentication utility is missing. Page cannot load correctly.</p>';
            if(window.uplasApplyTranslations) window.uplasApplyTranslations(); // Attempt to translate error
        }
        return;
    }
    const authToken = getAuthToken(); // Assumes getAuthToken() correctly gets 'accessToken'

    if (!authToken) {
        console.log('User not authenticated for interactive course. Redirecting to login.');
        // Capture current URL to redirect back after login
        const currentPath = window.location.pathname + window.location.search + window.location.hash;
        window.location.href = `index.html#auth-section&returnUrl=${encodeURIComponent(currentPath)}`;
    } else {
        console.log('User authenticated. Initializing interactive course page.');
        initializeInteractiveCoursePage(); // Proceed with page setup
    }
});
