// js/uprojects.js
/* ==========================================================================
   Uplas Projects Dashboard Page JavaScript (uprojects.js)
   - Handles sidebar navigation, panel switching, AI Tutor, IDE simulation.
   - Relies on global.js for theme, nav, language, currency.
   ========================================================================== */
'use strict';

document.addEventListener('DOMContentLoaded', () => {
    // --- Global Element Selectors ---
    // Theme, Nav, Language, Currency are handled by js/global.js
    const uprojectsSidebarNav = document.getElementById('uprojects-sidebar-nav');
    const sidebarItems = uprojectsSidebarNav?.querySelectorAll('.sidebar-item');
    const featurePanels = document.querySelectorAll('.uprojects-main-content .feature-panel');
    const mainContentArea = document.querySelector('.uprojects-main-content');

    // Project Dashboard Panel Specific
    const projectDashboardPanel = document.getElementById('project-dashboard-panel');
    const projectListContainer = document.getElementById('project-list-container');
    const createNewProjectBtn = document.getElementById('create-new-project-btn');
    const noProjectsMessage = document.getElementById('no-projects-message');
    const projectsStartedCountEl = document.getElementById('projects-started-count');
    const projectsCompletedCountEl = document.getElementById('projects-completed-count');
    const overallProgressBarEl = document.getElementById('overall-progress-bar');


    // AI Tutor Panel Specific
    const aiTutorPanel = document.getElementById('ai-tutor-panel');
    const chatMessagesAiTutor = document.getElementById('chat-messages-ai-tutor');
    const messageInputAiTutor = document.getElementById('ai-tutor-message-input');
    const aiTutorInputForm = document.getElementById('ai-tutor-input-form');

    // IDE Panel Specific
    const idePanel = document.getElementById('ide-panel');
    const codeAreaIDE = document.getElementById('ide-code-area');
    const runCodeButtonIDE = document.getElementById('ide-run-code-btn');
    const saveCodeButtonIDE = document.getElementById('ide-save-code-btn');
    const outputAreaIDE = document.getElementById('ide-output-area');
    const ideFileSelector = document.getElementById('ide-file-selector');

    // --- State Variables ---
    let activePanelElement = projectDashboardPanel; // Default to dashboard
    let userProjects = []; // To store fetched or simulated project data

    // --- Helper Functions ---
    function showFeaturePanel(panelToShow) {
        featurePanels.forEach(panel => {
            const isActive = panel === panelToShow;
            panel.classList.toggle('active-panel', isActive);
            // JS display none/flex is now primarily handled by .active-panel CSS
            // panel.style.display = isActive ? (panel.classList.contains('draggable-resizable-panel') ? 'flex' : 'block') : 'none';
        });
        activePanelElement = panelToShow;
        // If panel is draggable, ensure it's initialized (basic drag from original uprojects.js can be adapted)
        // if (panelToShow && panelToShow.classList.contains('draggable-resizable-panel')) {
        //     makePanelDraggable(panelToShow);
        // }
    }

    function closeFeaturePanel(panelToClose) {
        if (panelToClose) {
            panelToClose.classList.remove('active-panel');
            // panelToClose.style.display = 'none';
            if (activePanelElement === panelToClose) {
                activePanelElement = null;
            }
            const panelId = panelToClose.id;
            const correspondingButton = uprojectsSidebarNav?.querySelector(`.sidebar-item[data-panel-id="${panelId}"]`);
            correspondingButton?.classList.remove('active');

            // Default to showing dashboard if no other panel is meant to be active
            if (!document.querySelector('.feature-panel.active-panel') && projectDashboardPanel) {
                showFeaturePanel(projectDashboardPanel);
                uprojectsSidebarNav?.querySelector('#project-dashboard-icon')?.classList.add('active');
            }
        }
    }

    // --- Sidebar Tool Panel Activation ---
    if (uprojectsSidebarNav && sidebarItems.length > 0 && featurePanels.length > 0) {
        sidebarItems.forEach(item => {
            item.addEventListener('click', () => {
                const panelIdToOpen = item.dataset.panelId;
                const panelToOpen = document.getElementById(panelIdToOpen);

                if (panelToOpen) {
                    sidebarItems.forEach(si => si.classList.remove('active'));
                    item.classList.add('active');
                    showFeaturePanel(panelToOpen);
                } else {
                    console.warn(`Panel with ID "${panelIdToOpen}" not found.`);
                    // Fallback: show dashboard
                    showFeaturePanel(projectDashboardPanel);
                    uprojectsSidebarNav?.querySelector('#project-dashboard-icon')?.classList.add('active');
                }
            });
        });

        // Panel Close Buttons
        featurePanels.forEach(panel => {
            const closeButton = panel.querySelector('.close-panel-btn');
            if (closeButton) {
                closeButton.addEventListener('click', () => {
                    closeFeaturePanel(panel);
                });
            }
        });
    }

    // --- Project Dashboard Functionality ---
    function renderProjectCard(project) {
        const statusClass = project.status.toLowerCase().replace(/\s+/g, '-');
        const progress = project.tasksTotal > 0 ? Math.round((project.tasksCompleted / project.tasksTotal) * 100) : 0;
        // TODO: Use data-translate-key for static parts of the card if needed
        return `
            <article class="project-card project-card--${statusClass}" data-project-id="${project.id}">
                <div class="project-card__header">
                    <h3 class="project-card__title">${project.title}</h3>
                    <span class="badge badge--status-${statusClass}">${project.status}</span>
                </div>
                <p class="project-card__description">${project.description}</p>
                <div class="project-card__meta">
                    <span><i class="fas fa-calendar-alt"></i> Due: ${project.dueDate || 'N/A'}</span>
                    <span><i class="fas fa-tasks"></i> ${project.tasksCompleted}/${project.tasksTotal} Tasks</span>
                </div>
                <div class="project-card__progress">
                    <div class="progress-bar-container--small">
                        <div class="progress-bar--small" style="width: ${progress}%;"
                             aria-valuenow="${progress}" aria-valuemin="0" aria-valuemax="100">${progress}%</div>
                    </div>
                </div>
                <div class="project-card__actions">
                    <a href="uproject_detail_example.html?id=${project.id}" class="button button--secondary button--extra-small view-project-details-btn">
                        <i class="fas fa-eye"></i> View Details
                    </a>
                    <button class="button button--primary button--extra-small launch-ide-btn" data-project-id="${project.id}">
                        <i class="fas fa-code"></i> Workspace
                    </button>
                </div>
            </article>
        `;
    }

    function displayProjects() {
        if (!projectListContainer || !noProjectsMessage) return;
        projectListContainer.innerHTML = ''; // Clear existing

        if (userProjects.length === 0) {
            noProjectsMessage.style.display = 'block';
        } else {
            noProjectsMessage.style.display = 'none';
            userProjects.forEach(project => {
                projectListContainer.innerHTML += renderProjectCard(project);
            });
            attachProjectCardActionListeners();
        }
        updateDashboardStats();
    }

    function updateDashboardStats() {
        if (!projectsStartedCountEl || !projectsCompletedCountEl || !overallProgressBarEl) return;

        const completedProjects = userProjects.filter(p => p.status.toLowerCase() === 'completed').length;
        const totalTasks = userProjects.reduce((sum, p) => sum + p.tasksTotal, 0);
        const completedTasks = userProjects.reduce((sum, p) => sum + p.tasksCompleted, 0);
        const overallProgress = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

        projectsStartedCountEl.textContent = userProjects.length;
        projectsCompletedCountEl.textContent = completedProjects;
        overallProgressBarEl.style.width = `${overallProgress}%`;
        overallProgressBarEl.textContent = `${overallProgress}%`;
        overallProgressBarEl.setAttribute('aria-valuenow', overallProgress);
    }


    async function fetchUserProjects() {
        // TODO: Replace with actual API call to fetch user's projects
        // userProjects = await fetchAuthenticated('/api/user/projects');
        // Simulate API response:
        await new Promise(resolve => setTimeout(resolve, 500));
        userProjects = [
            { id: "proj001", title: "AI Email Categorizer", status: "In Progress", description: "Develop an ML model to categorize emails.", dueDate: "Dec 30, 2025", tasksCompleted: 3, tasksTotal: 5, courseLink: "mcourseD.html#module-3" },
            { id: "proj002", title: "Churn Prediction Model", status: "Not Started", description: "Build a model to predict customer churn.", dueDate: "Jan 15, 2026", tasksCompleted: 0, tasksTotal: 8, courseLink: "mcourseD.html#module-4" },
            { id: "proj003", title: "Image Recognition Tagger", status: "Completed", description: "Create a CV model to auto-tag products.", dueDate: "Nov 20, 2025", tasksCompleted: 7, tasksTotal: 7, courseLink: "mcourseD.html#module-5" }
        ];
        displayProjects();
    }

    if (createNewProjectBtn) {
        createNewProjectBtn.addEventListener('click', () => {
            // TODO: Implement actual project creation flow (modal or new page)
            // For now, simulate adding a new project
            const newProjectId = `proj${String(Date.now()).slice(-4)}`;
            const newProject = {
                id: newProjectId,
                title: `New AI Project ${newProjectId.substring(4)}`,
                status: "Not Started",
                description: "Define the goals and scope of your new AI venture. This project was started by the user.",
                dueDate: "Set Deadline", tasksCompleted: 0, tasksTotal: 5, courseLink: "#"
            };
            userProjects.unshift(newProject); // Add to the beginning
            displayProjects();
            // Optionally, scroll to the new project or open its details/IDE
            const newCard = projectListContainer?.querySelector(`.project-card[data-project-id="${newProjectId}"]`);
            newCard?.scrollIntoView({ behavior: 'smooth', block: 'center' });
        });
    }

    function attachProjectCardActionListeners() {
        projectListContainer?.querySelectorAll('.launch-ide-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const projectId = btn.dataset.projectId;
                console.log(`Opening IDE for project: ${projectId} (simulated)`);
                const ideSidebarButton = document.getElementById('ide-icon');
                ideSidebarButton?.click(); // Switch to IDE panel
                if (codeAreaIDE) codeAreaIDE.value = `# Code for project ${projectId}\nprint("Hello from Uplas project: ${projectId}!")`;
                if (outputAreaIDE) outputAreaIDE.textContent = `Project ${projectId} environment loaded into IDE.`;
                if (ideFileSelector) ideFileSelector.value = 'main.py'; // Reset to default file
            });
        });
    }


    // --- AI Tutor Panel Functionality ---
    function addMessageToAiChat(text, sender, isHtml = false) {
        if (!chatMessagesAiTutor) return;
        const messageDiv = document.createElement('div');
        messageDiv.classList.add('message', `message--${sender}`); // 'user' or 'assistant'

        if (sender === 'assistant') {
            const avatarImg = document.createElement('img');
            avatarImg.src = 'https://placehold.co/36x36/00b4d8/FFFFFF?text=AI&font=poppins'; // Placeholder AI avatar
            avatarImg.alt = 'AI Tutor';
            avatarImg.classList.add('message__avatar');
            messageDiv.appendChild(avatarImg);
        }

        const bubbleDiv = document.createElement('div');
        bubbleDiv.classList.add('message__bubble');
        if (isHtml) {
            bubbleDiv.innerHTML = text; // Use innerHTML if content is HTML
        } else {
            bubbleDiv.textContent = text;
        }
        messageDiv.appendChild(bubbleDiv);

        chatMessagesAiTutor.appendChild(messageDiv);
        chatMessagesAiTutor.scrollTop = chatMessagesAiTutor.scrollHeight;
    }

    if (aiTutorInputForm && messageInputAiTutor) {
        // Add initial greeting from AI Tutor
        addMessageToAiChat("Hello! I'm your AI Project Assistant. How can I help you with your projects today?", "assistant");

        aiTutorInputForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const userMessage = messageInputAiTutor.value.trim();
            if (userMessage) {
                addMessageToAiChat(userMessage, 'user');
                messageInputAiTutor.value = '';
                messageInputAiTutor.disabled = true; // Disable input while AI "thinks"

                // Simulate AI response (TODO: Replace with actual API call)
                // const aiResponse = await fetchAuthenticated('/api/ai_tutor/ask', { method: 'POST', body: JSON.stringify({ query: userMessage, projectId: "current_project_id_if_any" }) });
                // const responseData = await aiResponse.json();
                await new Promise(resolve => setTimeout(resolve, 1200 + Math.random() * 800));
                let simulatedResponseText = `I've received your query: "${userMessage.substring(0, 40)}${userMessage.length > 40 ? '...' : ''}". Let me process that.`;
                if (userMessage.toLowerCase().includes('python error')) {
                    simulatedResponseText = "It looks like you have a Python error. Can you paste the error message or the relevant code snippet? I can help you debug common issues like <code>SyntaxError</code> or <code>NameError</code>. For example, make sure your indentation is correct!";
                } else if (userMessage.toLowerCase().includes('explain')) {
                    simulatedResponseText = "Sure, I can explain that! For instance, if you're asking about 'list comprehensions in Python', they are a concise way to create lists. Example: <code>squares = [x**2 for x in range(10)]</code>. What specific concept are you curious about?";
                }
                addMessageToAiChat(simulatedResponseText, 'assistant', true); // Assuming response might contain HTML (like <code>)
                messageInputAiTutor.disabled = false;
                messageInputAiTutor.focus();
            }
        });
    }


    // --- IDE Panel Functionality (Basic Simulation) ---
    if (runCodeButtonIDE && codeAreaIDE && outputAreaIDE) {
        runCodeButtonIDE.addEventListener('click', () => {
            const code = codeAreaIDE.value;
            const selectedFile = ideFileSelector ? ideFileSelector.value : 'script.py';
            outputAreaIDE.textContent = `Simulating execution of ${selectedFile}...\n\n`;
            if (code.trim() === '') {
                outputAreaIDE.textContent += 'No code to execute.\n';
            } else if (code.toLowerCase().includes('print("hello uplas")')) {
                outputAreaIDE.textContent += 'Hello Uplas\nExecution complete (simulated).\n';
            } else if (code.toLowerCase().includes('error')) {
                outputAreaIDE.textContent += `Traceback (most recent call last):\n  File "${selectedFile}", line X, in <module>\nSimulatedError: Something went wrong during execution.\n`;
            }
            else {
                outputAreaIDE.textContent += `Output for ${selectedFile}:\n(Simulated execution - no specific output matched)\nExecution complete.\n`;
            }
            // TODO: In a real scenario, send code to a backend execution environment.
        });
    }
    if (saveCodeButtonIDE && codeAreaIDE && outputAreaIDE) {
        saveCodeButtonIDE.addEventListener('click', () => {
            const selectedFile = ideFileSelector ? ideFileSelector.value : 'script.py';
            // TODO: Implement actual save to localStorage or backend
            outputAreaIDE.textContent = `Code in ${selectedFile} saved (simulated).\nTimestamp: ${new Date().toLocaleTimeString()}`;
        });
    }


    // --- Initializations ---
    // Global.js handles theme, nav, language, currency.
    if (projectDashboardPanel) { // If dashboard is the default view
        fetchUserProjects(); // Load projects on page load
    } else {
        // If another panel is default, ensure its content is loaded if necessary
    }

    // Set current year in footer
    const currentYearFooterSpan = document.getElementById('current-year-footer');
    if (currentYearFooterSpan) {
        const yearText = currentYearFooterSpan.textContent;
        if (yearText && yearText.includes("{currentYear}")) {
            currentYearFooterSpan.textContent = yearText.replace("{currentYear}", new Date().getFullYear());
        } else if (!yearText.includes(new Date().getFullYear().toString())) {
             currentYearFooterSpan.textContent = new Date().getFullYear();
        }
    }

    console.log("Uplas Projects Dashboard (uprojects.js) loaded.");
});

