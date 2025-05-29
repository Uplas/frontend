// js/uprojects.js
/* ==========================================================================
   Uplas Projects Dashboard Page JavaScript (uprojects.js)
   - Handles sidebar navigation, panel switching, AI Tutor, IDE simulation, project management.
   - Relies on global.js for theme, nav, language, currency.
   - Relies on apiUtils.js for API calls and auth state.
   ========================================================================== */
'use strict';

function initializeProjectsDashboard() {
    // --- Global Element Selectors ---
    const uprojectsSidebarNav = document.getElementById('uprojects-sidebar-nav');
    const sidebarItems = uprojectsSidebarNav?.querySelectorAll('.sidebar-item');
    const featurePanels = document.querySelectorAll('.uprojects-main-content .feature-panel');
    // const mainContentArea = document.querySelector('.uprojects-main-content'); // Not directly used now

    // Project Dashboard Panel Specific
    const projectDashboardPanel = document.getElementById('project-dashboard-panel');
    const projectListContainer = document.getElementById('project-list-container');
    const createNewProjectBtn = document.getElementById('create-new-project-btn');
    const noProjectsMessage = document.getElementById('no-projects-message');
    const projectsStartedCountEl = document.getElementById('projects-started-count');
    const projectsCompletedCountEl = document.getElementById('projects-completed-count');
    const overallProgressBarEl = document.getElementById('overall-progress-bar');

    // Create Project Modal (Ensure this HTML exists on uprojects.html)
    const createProjectModal = document.getElementById('create-project-modal');
    const closeCreateProjectModalBtn = document.getElementById('close-create-project-modal-btn');
    const createProjectForm = document.getElementById('create-project-form');
    const createProjectStatus = document.getElementById('create-project-status');

    // AI Tutor Panel Specific
    // const aiTutorPanel = document.getElementById('ai-tutor-panel'); // Not directly used for now
    const chatMessagesAiTutor = document.getElementById('chat-messages-ai-tutor');
    const messageInputAiTutor = document.getElementById('ai-tutor-message-input');
    const aiTutorInputForm = document.getElementById('ai-tutor-input-form');

    // IDE Panel Specific
    // const idePanel = document.getElementById('ide-panel'); // Not directly used for now
    const codeAreaIDE = document.getElementById('ide-code-area');
    const runCodeButtonIDE = document.getElementById('ide-run-code-btn');
    const saveCodeButtonIDE = document.getElementById('ide-save-code-btn');
    const outputAreaIDE = document.getElementById('ide-output-area');
    const ideFileSelector = document.getElementById('ide-file-selector');
    const ideCurrentProjectTitle = document.getElementById('ide-current-project-title'); // In HTML, this might be part of ide-panel title

    // --- Global Utilities ---
    const { uplasApi, uplasTranslate, uplasApplyTranslations } = window;

    // --- State Variables ---
    let activePanelElement = projectDashboardPanel; // Default to dashboard
    let userProjects = [];
    let currentIdeProjectId = null;
    let currentIdeProjectTitle = ""; // Store title for IDE context
    let currentIdeFileName = 'main.py';

    // --- Helper Functions ---
    const localDisplayStatus = (element, message, typeOrIsError, translateKey = null) => {
        const isError = typeof typeOrIsError === 'boolean' ? typeOrIsError : typeOrIsError === 'error';
        // Prefer uplasApi.displayFormStatus if available and suitable
        if (uplasApi && uplasApi.displayFormStatus) {
            uplasApi.displayFormStatus(element, message, isError, translateKey);
        } else if (element) { // Fallback local display
            const text = (translateKey && uplasTranslate) ? uplasTranslate(translateKey, { fallback: message }) : message;
            element.textContent = text;
            element.style.color = isError ? 'var(--color-error, red)' : 'var(--color-success, green)';
            element.style.display = 'block';
            element.hidden = false;
            if (!isError) setTimeout(() => { if(element) element.style.display = 'none'; }, 5000);
        } else {
            console.warn("uprojects.js (localDisplayStatus): Target element not found. Message:", message);
        }
    };
    const escapeHTML = (str) => {
        if (typeof str !== 'string') return '';
        return str.replace(/[&<>'"]/g, tag => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[tag] || tag));
    };


    function showFeaturePanel(panelToShow) {
        if (!panelToShow) panelToShow = projectDashboardPanel; // Default to dashboard
        featurePanels.forEach(panel => {
            panel.classList.toggle('active-panel', panel === panelToShow);
            panel.hidden = (panel !== panelToShow); // Explicitly hide/show
        });
        activePanelElement = panelToShow;
        // If opening IDE, update its context if a project is selected
        if (panelToShow === document.getElementById('ide-panel') && currentIdeProjectId && ideCurrentProjectTitle) {
            ideCurrentProjectTitle.textContent = uplasTranslate ?
                uplasTranslate('uprojects_ide_title_context', { fallback: `Workspace: ${currentIdeProjectTitle}`, variables: { projectTitle: currentIdeProjectTitle } }) :
                `Workspace: ${currentIdeProjectTitle}`;
        }
    }

    function closeFeaturePanel(panelToClose) {
        if (panelToClose) {
            panelToClose.classList.remove('active-panel');
            panelToClose.hidden = true;
            const panelId = panelToClose.id;
            const correspondingButton = uprojectsSidebarNav?.querySelector(`.sidebar-item[data-panel-id="${panelId}"]`);
            correspondingButton?.classList.remove('active');

            if (activePanelElement === panelToClose) activePanelElement = null;
            // If no panel is active, default to the project dashboard
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
                } else { // Fallback to dashboard if panel not found
                    showFeaturePanel(projectDashboardPanel);
                    uprojectsSidebarNav?.querySelector('#project-dashboard-icon')?.classList.add('active');
                }
            });
        });
        featurePanels.forEach(panel => { // Setup close buttons for all panels
            const closeButton = panel.querySelector('.close-panel-btn');
            if (closeButton) closeButton.addEventListener('click', () => closeFeaturePanel(panel));
        });
        // Ensure dashboard is active by default if no hash directs otherwise
        const initialActiveButton = uprojectsSidebarNav.querySelector('.sidebar-item.active') || uprojectsSidebarNav.querySelector('#project-dashboard-icon');
        if(initialActiveButton) initialActiveButton.click(); else showFeaturePanel(projectDashboardPanel);

    } else {
        console.warn("uprojects.js: Sidebar or feature panels not found. UI may be incomplete.");
    }

    // --- Project Dashboard Functionality ---
    function renderProjectCard(project) {
        const statusKey = `uprojects_status_${(project.status || 'not_started').toLowerCase().replace(/\s+/g, '_')}`;
        const statusText = uplasTranslate ? uplasTranslate(statusKey, { fallback: project.status || 'Not Started' }) : (project.status || 'Not Started');
        const statusClass = (project.status || 'not-started').toLowerCase().replace(/\s+/g, '-');
        const progress = (project.total_tasks > 0 && project.completed_tasks >= 0) ? Math.round((project.completed_tasks / project.total_tasks) * 100) : 0;
        const dueDate = project.due_date ? new Date(project.due_date).toLocaleDateString(uplasGetCurrentLocale ? uplasGetCurrentLocale() : 'en-US') : (uplasTranslate ? uplasTranslate('uprojects_date_na') : 'N/A');

        return `
            <article class="project-card project-card--${statusClass}" data-project-id="${project.id}">
                <div class="project-card__header">
                    <h3 class="project-card__title">${escapeHTML(project.title)}</h3>
                    <span class="badge badge--status-${statusClass}">${statusText}</span>
                </div>
                <p class="project-card__description">${escapeHTML(project.description || (uplasTranslate ? uplasTranslate('uprojects_no_description') : 'No description.'))}</p>
                <div class="project-card__meta">
                    <span><i class="fas fa-calendar-alt"></i> <span data-translate-key="uprojects_due_date_prefix">Due:</span> ${dueDate}</span>
                    <span><i class="fas fa-tasks"></i> ${project.completed_tasks || 0}/${project.total_tasks || 0} <span data-translate-key="uprojects_tasks_suffix">Tasks</span></span>
                </div>
                <div class="project-card__progress">
                    <div class="progress-bar-container--small">
                        <div class="progress-bar--small" style="width: ${progress}%;"
                             aria-valuenow="${progress}" aria-valuemin="0" aria-valuemax="100">${progress}%</div>
                    </div>
                </div>
                <div class="project-card__actions">
                    <a href="uproject_detail.html?id=${project.id}" class="button button--secondary button--extra-small view-project-details-btn">
                        <i class="fas fa-eye"></i> <span data-translate-key="uprojects_button_view_details">View Details</span>
                    </a>
                    <button class="button button--primary button--extra-small launch-ide-btn" data-project-id="${project.id}" data-project-title="${escapeHTML(project.title)}">
                        <i class="fas fa-code"></i> <span data-translate-key="uprojects_button_workspace">Workspace</span>
                    </button>
                </div>
            </article>
        `;
    }

    function displayProjects() {
        if (!projectListContainer || !noProjectsMessage) return;
        projectListContainer.innerHTML = '';

        if (userProjects.length === 0) {
            noProjectsMessage.style.display = 'block';
            noProjectsMessage.setAttribute('data-translate-key', 'uprojects_no_projects_msg');
            if(uplasApplyTranslations) uplasApplyTranslations(noProjectsMessage.parentElement);
        } else {
            noProjectsMessage.style.display = 'none';
            userProjects.forEach(project => {
                projectListContainer.insertAdjacentHTML('beforeend', renderProjectCard(project));
            });
            attachProjectCardActionListeners();
            if(uplasApplyTranslations) uplasApplyTranslations(projectListContainer);
        }
        updateDashboardStats();
    }

    function updateDashboardStats() {
        if (!projectsStartedCountEl || !projectsCompletedCountEl || !overallProgressBarEl) return;
        const completedProjects = userProjects.filter(p => p.status?.toLowerCase() === 'completed').length;
        const totalTasks = userProjects.reduce((sum, p) => sum + (p.total_tasks || 0), 0);
        const completedTasks = userProjects.reduce((sum, p) => sum + (p.completed_tasks || 0), 0);
        const overallProgress = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

        projectsStartedCountEl.textContent = userProjects.length;
        projectsCompletedCountEl.textContent = completedProjects;
        overallProgressBarEl.style.width = `${overallProgress}%`;
        overallProgressBarEl.textContent = `${overallProgress}%`;
        overallProgressBarEl.setAttribute('aria-valuenow', overallProgress);
    }

    async function fetchUserProjects() {
        if (!uplasApi || !uplasApi.fetchAuthenticated) {
            console.error("uprojects.js: uplasApi not available for fetching projects.");
            if (noProjectsMessage) {
                noProjectsMessage.textContent = uplasTranslate ? uplasTranslate('error_service_unavailable', {fallback: "Service unavailable."}) : "Service unavailable.";
                noProjectsMessage.style.display = 'block';
            }
            return;
        }
        if (projectListContainer) {
            projectListContainer.innerHTML = `<p class="loading-message" data-translate-key="uprojects_loading_projects">Loading your projects...</p>`;
            if(uplasApplyTranslations) uplasApplyTranslations(projectListContainer);
        }

        try {
            const response = await uplasApi.fetchAuthenticated('/projects/mine/'); // Endpoint for user's projects
            if (!response.ok) {
                const errData = await response.json().catch(() => ({detail: uplasTranslate ? uplasTranslate('error_projects_load_failed', {fallback:"Failed to load projects."}) : "Failed to load projects."}));
                throw new Error(errData.detail);
            }
            const projectData = await response.json();
            userProjects = projectData.results || projectData;
            displayProjects();
        } catch (error) {
            console.error("uprojects.js: Error fetching user projects:", error);
            if (noProjectsMessage) {
                noProjectsMessage.textContent = `${uplasTranslate ? uplasTranslate('error_prefix', {fallback:"Error"}) : "Error"}: ${error.message}`;
                noProjectsMessage.style.display = 'block';
            }
            if (projectListContainer) projectListContainer.innerHTML = '';
        }
    }

    // --- Create New Project Modal and Form ---
    if (createNewProjectBtn && createProjectModal) {
        createNewProjectBtn.addEventListener('click', () => {
            if (!uplasApi || !uplasApi.getAccessToken()) { // Check auth before opening
                uplasApi.redirectToLogin('Please log in to create a project.');
                return;
            }
            if (createProjectForm) createProjectForm.reset();
            if (createProjectStatus && uplasApi.clearFormStatus) uplasApi.clearFormStatus(createProjectStatus);
            else if (createProjectStatus) createProjectStatus.textContent = '';

            createProjectModal.hidden = false;
            setTimeout(() => createProjectModal.classList.add('active'), 10);
            document.body.classList.add('modal-open'); // From global.css for modals
            createProjectForm?.querySelector('input[name="projectTitle"]')?.focus();
        });
    }
    if(closeCreateProjectModalBtn && createProjectModal){
        closeCreateProjectModalBtn.addEventListener('click', () => {
            createProjectModal.classList.remove('active');
            document.body.classList.remove('modal-open');
            setTimeout(() => createProjectModal.hidden = true, 300);
        });
    }

    if (createProjectForm && createProjectStatus) {
        createProjectForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            if (!uplasApi || !uplasApi.fetchAuthenticated) {
                localDisplayStatus(createProjectStatus, '', 'error', 'error_service_unavailable'); return;
            }

            const titleInput = createProjectForm.querySelector('input[name="projectTitle"]');
            const descriptionInput = createProjectForm.querySelector('textarea[name="projectDescription"]');
            const title = titleInput?.value.trim();
            const description = descriptionInput?.value.trim();

            if (!title) { // Basic validation
                localDisplayStatus(createProjectStatus, '', 'error', 'error_project_title_required');
                titleInput?.focus();
                return;
            }
            const submitButton = createProjectForm.querySelector('button[type="submit"]');
            if(submitButton) submitButton.disabled = true;
            localDisplayStatus(createProjectStatus, '', 'loading', 'uprojects_status_creating');

            try {
                const response = await uplasApi.fetchAuthenticated('/projects/', {
                    method: 'POST',
                    body: JSON.stringify({ title, description }) // Ensure backend expects 'title' and 'description'
                });
                const newProjectData = await response.json();
                if (response.ok) {
                    localDisplayStatus(createProjectStatus, '', 'success', 'uprojects_status_creation_success');
                    userProjects.unshift(newProjectData);
                    displayProjects();
                    setTimeout(() => {
                        closeCreateProjectModalBtn?.click();
                        const newCard = projectListContainer?.querySelector(`.project-card[data-project-id="${newProjectData.id}"]`);
                        newCard?.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    }, 1500);
                } else {
                    throw new Error(newProjectData.detail || newProjectData.title?.[0] || (uplasTranslate ? uplasTranslate('error_project_creation_failed') : 'Failed to create project.'));
                }
            } catch (error) {
                console.error("uprojects.js: Error creating project:", error);
                localDisplayStatus(createProjectStatus, error.message, true); // isError = true
            } finally {
                if(submitButton) submitButton.disabled = false;
            }
        });
    }


    function attachProjectCardActionListeners() {
        projectListContainer?.querySelectorAll('.launch-ide-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                currentIdeProjectId = btn.dataset.projectId;
                currentIdeProjectTitle = btn.dataset.projectTitle || "Selected Project"; // Store title

                console.log(`uprojects.js: Opening IDE for project: ${currentIdeProjectId} (${currentIdeProjectTitle})`);

                if (ideCurrentProjectTitle) {
                    ideCurrentProjectTitle.textContent = uplasTranslate ?
                        uplasTranslate('uprojects_ide_title_context', { fallback: `Workspace: ${currentIdeProjectTitle}`, variables: { projectTitle: currentIdeProjectTitle } }) :
                        `Workspace: ${currentIdeProjectTitle}`;
                }
                // TODO: Fetch actual project files/content for the IDE from backend
                if (codeAreaIDE) codeAreaIDE.value = `# Welcome to the Uplas IDE for project: ${currentIdeProjectTitle}\n# File: main.py (default)\n\nprint("Hello from Uplas project: ${currentIdeProjectTitle}!")`;
                if (outputAreaIDE) outputAreaIDE.textContent = uplasTranslate ? uplasTranslate('uprojects_ide_env_loaded', { fallback: `Project environment for "${currentIdeProjectTitle}" loaded. Ready to run main.py.`, variables: { projectTitle: currentIdeProjectTitle } }) : `Project environment for "${currentIdeProjectTitle}" loaded. Ready to run main.py.`;
                if (ideFileSelector) ideFileSelector.value = 'main.py'; // Reset to default
                currentIdeFileName = 'main.py';

                const ideSidebarButton = document.getElementById('ide-icon');
                ideSidebarButton?.click(); // Programmatically click to switch panel
            });
        });
    }


    // --- AI Tutor Panel Functionality ---
    function addMessageToAiChat(text, sender, isHtml = false) {
        if (!chatMessagesAiTutor) return;
        const messageDiv = document.createElement('div');
        messageDiv.classList.add('message', `message--${sender}`); // e.g., message--user, message--assistant
        if (sender === 'user') {
            // You might want an avatar or different styling for user
        } else {
            // Avatar for assistant
            const avatar = document.createElement('img');
            avatar.src = 'images/ai_tutor_avatar.png'; // Replace with actual path
            avatar.alt = 'AI Tutor';
            avatar.classList.add('message__avatar');
            // messageDiv.appendChild(avatar); // Decide on avatar placement (CSS can also handle this)
        }
        const bubble = document.createElement('div');
        bubble.classList.add('message__bubble');
        if (isHtml) bubble.innerHTML = text; // BE CAREFUL WITH UNTRUSTED HTML
        else bubble.textContent = text;
        messageDiv.appendChild(bubble);
        chatMessagesAiTutor.appendChild(messageDiv);
        chatMessagesAiTutor.scrollTop = chatMessagesAiTutor.scrollHeight; // Auto-scroll
    }

    if (aiTutorInputForm && messageInputAiTutor && chatMessagesAiTutor) {
        if(chatMessagesAiTutor.children.length === 0) {
            addMessageToAiChat((uplasTranslate ? uplasTranslate('uprojects_ai_tutor_greeting') : "Hello! I'm your AI Project Assistant. How can I help?"), "assistant");
        }
        aiTutorInputForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            if (!uplasApi || !uplasApi.fetchAuthenticated) {
                addMessageToAiChat((uplasTranslate ? uplasTranslate('error_service_unavailable_tutor') : 'AI Tutor service is currently unavailable.'), 'assistant-error'); return;
            }
            const userMessage = messageInputAiTutor.value.trim();
            if (userMessage) {
                addMessageToAiChat(userMessage, 'user');
                messageInputAiTutor.value = '';
                messageInputAiTutor.disabled = true;
                const submitBtn = aiTutorInputForm.querySelector('button[type="submit"]');
                if(submitBtn) submitBtn.disabled = true;

                try {
                    const payload = {
                        query: userMessage,
                        project_id: currentIdeProjectId, // Contextual project ID
                    };
                    const response = await uplasApi.fetchAuthenticated('/ai_agents/tutor/ask/', {
                        method: 'POST', body: JSON.stringify(payload)
                    });
                    const responseData = await response.json();

                    if (response.ok) {
                        addMessageToAiChat(responseData.response, 'assistant', responseData.is_html || false);
                    } else {
                        throw new Error(responseData.detail || responseData.error || (uplasTranslate ? uplasTranslate('error_tutor_response_failed') : 'AI Tutor failed to respond.'));
                    }
                } catch (error) {
                    console.error("uprojects.js: AI Tutor Error:", error);
                    addMessageToAiChat(`${uplasTranslate ? uplasTranslate('error_tutor_generic', {fallback:"Sorry, I encountered an error"}) : "Sorry, I encountered an error"}: ${error.message}`, 'assistant-error');
                } finally {
                    messageInputAiTutor.disabled = false;
                    if(submitBtn) submitBtn.disabled = false;
                    messageInputAiTutor.focus();
                }
            }
        });
    }


    // --- IDE Panel Functionality (Placeholders for Backend Integration) ---
    if (runCodeButtonIDE && codeAreaIDE && outputAreaIDE) {
        runCodeButtonIDE.addEventListener('click', async () => {
            if (!uplasApi || !uplasApi.fetchAuthenticated) {
                outputAreaIDE.textContent = uplasTranslate ? uplasTranslate('error_ide_execution_unavailable', {fallback:"Error: Code execution service unavailable."}) : "Error: Code execution service unavailable."; return;
            }
            if (!currentIdeProjectId) {
                 outputAreaIDE.textContent = uplasTranslate ? uplasTranslate('error_ide_no_project', {fallback:"Error: No project selected in IDE."}) : "Error: No project selected in IDE."; return;
            }
            const code = codeAreaIDE.value;
            const selectedFile = ideFileSelector ? ideFileSelector.value : 'main.py';
            outputAreaIDE.textContent = uplasTranslate ? uplasTranslate('uprojects_ide_executing', {fallback:`Executing ${selectedFile}...` , variables: {fileName: selectedFile} }) : `Executing ${selectedFile}...\n\n`;
            runCodeButtonIDE.disabled = true;

            try {
                const response = await uplasApi.fetchAuthenticated('/projects/ide/run_code/', {
                    method: 'POST',
                    body: JSON.stringify({ project_id: currentIdeProjectId, file_name: selectedFile, code: code, language: 'python' })
                });
                const result = await response.json();
                if (response.ok) {
                    outputAreaIDE.textContent += `\nOutput:\n${result.output || ''}\n`;
                    if (result.errors) outputAreaIDE.textContent += `Errors:\n${result.errors}\n`;
                    outputAreaIDE.textContent += (uplasTranslate ? uplasTranslate('uprojects_ide_execution_finished') : "Execution finished.");
                } else {
                    throw new Error(result.detail || result.error || (uplasTranslate ? uplasTranslate('error_ide_run_failed') : 'Failed to run code.'));
                }
            } catch (error) {
                console.error("uprojects.js: Error running code:", error);
                outputAreaIDE.textContent += `\n${uplasTranslate ? uplasTranslate('error_prefix') : 'Error'}: ${error.message}\n`;
            } finally {
                runCodeButtonIDE.disabled = false;
            }
        });
    }

    if (saveCodeButtonIDE && codeAreaIDE && outputAreaIDE) {
        saveCodeButtonIDE.addEventListener('click', async () => {
            if (!uplasApi || !uplasApi.fetchAuthenticated) {
                outputAreaIDE.textContent = uplasTranslate ? uplasTranslate('error_ide_save_unavailable', {fallback:"Error: Save service unavailable."}) : "Error: Save service unavailable."; return;
            }
            if (!currentIdeProjectId) {
                outputAreaIDE.textContent = uplasTranslate ? uplasTranslate('error_ide_no_project_save', {fallback:"Error: No project selected to save code."}) : "Error: No project selected to save code."; return;
            }

            const codeToSave = codeAreaIDE.value;
            const fileNameToSave = currentIdeFileName;
            outputAreaIDE.textContent = uplasTranslate ? uplasTranslate('uprojects_ide_saving_file', {fallback:`Saving ${fileNameToSave} for project ${currentIdeProjectTitle}...`, variables: {fileName: fileNameToSave, projectTitle: currentIdeProjectTitle}}) : `Saving ${fileNameToSave}...\n`;
            saveCodeButtonIDE.disabled = true;

            try {
                const response = await uplasApi.fetchAuthenticated(`/projects/${currentIdeProjectId}/files/save/`, {
                    method: 'POST', body: JSON.stringify({ file_name: fileNameToSave, content: codeToSave })
                });
                const result = await response.json();
                if (response.ok) {
                    outputAreaIDE.textContent = result.message || (uplasTranslate ? uplasTranslate('uprojects_ide_save_success', {fallback:`File ${fileNameToSave} saved.`, variables: {fileName: fileNameToSave}}) : `File ${fileNameToSave} saved.`);
                } else {
                    throw new Error(result.detail || result.error || (uplasTranslate ? uplasTranslate('error_ide_save_failed') : 'Failed to save file.'));
                }
            } catch (error) {
                console.error("uprojects.js: Error saving code:", error);
                outputAreaIDE.textContent += `\n${uplasTranslate ? uplasTranslate('error_prefix') : 'Error'}: ${error.message}\n`;
            } finally {
                saveCodeButtonIDE.disabled = false;
            }
        });
    }

    if (ideFileSelector && codeAreaIDE) {
        ideFileSelector.addEventListener('change', async (e) => {
            currentIdeFileName = e.target.value;
            if (!currentIdeProjectId) {
                if(outputAreaIDE) outputAreaIDE.textContent = uplasTranslate ? uplasTranslate('error_ide_no_project_switch_file') : "Select a project first to load files.";
                codeAreaIDE.value = `# ${uplasTranslate ? uplasTranslate('uprojects_ide_select_project_prompt') : "Please open a project from the dashboard."}`;
                return;
            }
            // TODO: Fetch file content from backend: /api/projects/{currentIdeProjectId}/files/get/?file_name={currentIdeFileName}
            if(outputAreaIDE) outputAreaIDE.textContent = uplasTranslate ? uplasTranslate('uprojects_ide_loading_file', { fallback: `Loading ${currentIdeFileName}...`, variables: {fileName: currentIdeFileName} }) : `Loading ${currentIdeFileName}...`;
            codeAreaIDE.value = `# Placeholder for ${currentIdeFileName} in project ${currentIdeProjectTitle}`;
            try {
                const response = await uplasApi.fetchAuthenticated(`/projects/${currentIdeProjectId}/files/get/?file_name=${encodeURIComponent(currentIdeFileName)}`);
                if(!response.ok) {
                    const err = await response.json().catch(() => ({detail: "File not found or error loading."}));
                    throw new Error(err.detail);
                }
                const fileData = await response.json(); // Expects { name, content, project_id }
                codeAreaIDE.value = fileData.content;
                if(outputAreaIDE) outputAreaIDE.textContent = uplasTranslate ? uplasTranslate('uprojects_ide_switched_file', {fallback:`Switched to ${currentIdeFileName}.`, variables: {fileName: currentIdeFileName}}) : `Switched to ${currentIdeFileName}.`;

            } catch (error) {
                 console.error(`uprojects.js: Error fetching file ${currentIdeFileName}:`, error);
                 codeAreaIDE.value = `# Error loading ${currentIdeFileName}: ${error.message}`;
                 if(outputAreaIDE) outputAreaIDE.textContent = `${uplasTranslate ? uplasTranslate('error_prefix') : 'Error'}: ${error.message}`;
            }
        });
        // TODO: Populate ideFileSelector with actual files for the currentIdeProjectId from backend
    }


    // --- Initializations ---
    // Authentication check is handled by the DOMContentLoaded listener at the bottom
    // Initial fetch of projects will be called by that listener if user is authenticated.
    // Set initial panel to dashboard (already default if no specific panel button is pre-activated)
    if (projectDashboardPanel && !document.querySelector('.feature-panel.active-panel')) {
         showFeaturePanel(projectDashboardPanel);
         uprojectsSidebarNav?.querySelector('#project-dashboard-icon')?.classList.add('active');
    }


    console.log("uprojects.js: Uplas Projects Dashboard initialized.");
} // End of initializeProjectsDashboard

// --- Auth Check and Page Initialization ---
document.addEventListener('DOMContentLoaded', () => {
    if (typeof window.uplasApi === 'undefined' || !window.uplasApi.getAccessToken || !window.uplasApi.redirectToLogin) {
        console.error('uprojects.js: uplasApi or its core functions are missing. Ensure apiUtils.js is loaded.');
        document.body.innerHTML = '<p style="color:red;text-align:center;padding:20px;" data-translate-key="error_app_critical_failure">Critical application error. Please try again later.</p>';
        if(window.uplasApplyTranslations) window.uplasApplyTranslations(document.body);
        return;
    }

    if (!window.uplasApi.getAccessToken()) {
        console.log('uprojects.js: User not authenticated. Redirecting to login.');
        window.uplasApi.redirectToLogin('Please log in to access your projects dashboard.');
    } else {
        console.log('uprojects.js: User authenticated. Initializing dashboard.');
        initializeProjectsDashboard();
        // Fetch projects after ensuring the user is authenticated and dashboard is being initialized.
        if (document.getElementById('project-dashboard-panel')) { // Ensure dashboard panel context exists
            const projectsModule = initializeProjectsDashboard; // Re-get reference if needed for scope.
            if(typeof projectsModule !== 'undefined' && typeof fetchUserProjects === 'function') { // fetchUserProjects is inside initializeProjectsDashboard
                 // This direct call is problematic because fetchUserProjects is not global
                 // Instead, fetchUserProjects should be called within initializeProjectsDashboard
            } else {
                // The call to fetchUserProjects is already inside initializeProjectsDashboard,
                // so it will run when the dashboard is initialized.
            }
        }
    }
});
