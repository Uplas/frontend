// js/uprojects.js
/* ==========================================================================
   Uplas Projects Dashboard Page JavaScript (uprojects.js)
   - Handles sidebar navigation, panel switching, AI Tutor, IDE simulation, project management.
   - Relies on global.js for theme, nav, language, currency.
   - Relies on apiUtils.js for API calls.
   ========================================================================== */
'use strict';

document.addEventListener('DOMContentLoaded', () => {
    // --- Global Element Selectors ---
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

    // Create Project Modal (Assuming you will add this to your HTML)
    const createProjectModal = document.getElementById('create-project-modal');
    const closeCreateProjectModalBtn = document.getElementById('close-create-project-modal-btn');
    const createProjectForm = document.getElementById('create-project-form');
    const createProjectStatus = document.getElementById('create-project-status');


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
    const ideCurrentProjectTitle = document.getElementById('ide-current-project-title');


    // --- State Variables ---
    let activePanelElement = projectDashboardPanel;
    let userProjects = [];
    let currentIdeProjectId = null; // To track which project is open in IDE
    let currentIdeFileName = 'main.py'; // Default file name

    // --- Helper Functions ---
    const displayStatus = (element, message, type = 'info', isError = (type === 'error'), translateKey = null) => {
        if (typeof window.uplasApi !== 'undefined' && typeof window.uplasApi.displayFormStatus === 'function') {
            window.uplasApi.displayFormStatus(element, message, isError, translateKey);
        } else if (element) {
            element.textContent = message;
            element.style.color = isError ? 'var(--color-error, red)' : 'var(--color-success, green)';
            element.style.display = 'block';
            element.hidden = false;
            if (!isError) setTimeout(() => { if(element) element.style.display = 'none'; }, 5000);
        } else {
            console.warn("displayStatus: Target element not found. Message:", message);
        }
    };
    const escapeHTML = (str) => { /* ... (from global.js or defined here if needed) ... */
        if (typeof str !== 'string') return '';
        return str.replace(/[&<>'"]/g, tag => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[tag] || tag));
    };


    function showFeaturePanel(panelToShow) {
        featurePanels.forEach(panel => {
            const isActive = panel === panelToShow;
            panel.classList.toggle('active-panel', isActive);
        });
        activePanelElement = panelToShow;
    }

    function closeFeaturePanel(panelToClose) {
        if (panelToClose) {
            panelToClose.classList.remove('active-panel');
            const panelId = panelToClose.id;
            const correspondingButton = uprojectsSidebarNav?.querySelector(`.sidebar-item[data-panel-id="${panelId}"]`);
            correspondingButton?.classList.remove('active');

            if (activePanelElement === panelToClose) activePanelElement = null;
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
                    showFeaturePanel(projectDashboardPanel); // Fallback
                    uprojectsSidebarNav?.querySelector('#project-dashboard-icon')?.classList.add('active');
                }
            });
        });
        featurePanels.forEach(panel => {
            const closeButton = panel.querySelector('.close-panel-btn');
            if (closeButton) closeButton.addEventListener('click', () => closeFeaturePanel(panel));
        });
    }

    // --- Project Dashboard Functionality ---
    function renderProjectCard(project) {
        const statusClass = (project.status || 'not-started').toLowerCase().replace(/\s+/g, '-');
        const progress = project.total_tasks > 0 ? Math.round((project.completed_tasks / project.total_tasks) * 100) : 0;
        // Backend fields: id, title, description, status, due_date, completed_tasks, total_tasks
        return `
            <article class="project-card project-card--${statusClass}" data-project-id="${project.id}">
                <div class="project-card__header">
                    <h3 class="project-card__title">${escapeHTML(project.title)}</h3>
                    <span class="badge badge--status-${statusClass}">${escapeHTML(project.status)}</span>
                </div>
                <p class="project-card__description">${escapeHTML(project.description || 'No description.')}</p>
                <div class="project-card__meta">
                    <span><i class="fas fa-calendar-alt"></i> Due: ${project.due_date ? new Date(project.due_date).toLocaleDateString() : 'N/A'}</span>
                    <span><i class="fas fa-tasks"></i> ${project.completed_tasks || 0}/${project.total_tasks || 0} Tasks</span>
                </div>
                <div class="project-card__progress">
                    <div class="progress-bar-container--small">
                        <div class="progress-bar--small" style="width: ${progress}%;"
                             aria-valuenow="${progress}" aria-valuemin="0" aria-valuemax="100">${progress}%</div>
                    </div>
                </div>
                <div class="project-card__actions">
                    <a href="uproject_detail.html?id=${project.id}" class="button button--secondary button--extra-small view-project-details-btn">
                        <i class="fas fa-eye"></i> View Details
                    </a>
                    <button class="button button--primary button--extra-small launch-ide-btn" data-project-id="${project.id}" data-project-title="${escapeHTML(project.title)}">
                        <i class="fas fa-code"></i> Workspace
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
        } else {
            noProjectsMessage.style.display = 'none';
            userProjects.forEach(project => {
                projectListContainer.insertAdjacentHTML('beforeend', renderProjectCard(project));
            });
            attachProjectCardActionListeners();
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
        if (!window.uplasApi || !window.uplasApi.fetchAuthenticated) {
            console.error("uplasApi not available for fetching projects.");
            if (noProjectsMessage) noProjectsMessage.style.display = 'block';
            return;
        }
        if (projectListContainer) projectListContainer.innerHTML = `<p class="loading-message">Loading your projects...</p>`;

        try {
            // L98: fetchUserProjects
            // L100: Action: API call to fetch projects for the logged-in user (e.g., /api/projects/mine/).
            const response = await window.uplasApi.fetchAuthenticated('/projects/mine/'); // Your backend uses /api/projects/
            if (!response.ok) {
                const errData = await response.json().catch(() => ({detail: "Failed to load projects."}));
                throw new Error(errData.detail);
            }
            const projectData = await response.json();
            userProjects = projectData.results || projectData; // Handle paginated or direct array
            displayProjects();
        } catch (error) {
            console.error("Error fetching user projects:", error);
            if (noProjectsMessage) {
                noProjectsMessage.textContent = `Error: ${error.message}`;
                noProjectsMessage.style.display = 'block';
            }
            if (projectListContainer) projectListContainer.innerHTML = ''; // Clear loading message
        }
    }

    // --- Create New Project ---
    if (createNewProjectBtn && createProjectModal) {
        createNewProjectBtn.addEventListener('click', () => {
            // L109: createNewProjectBtn.addEventListener('click', () => { ... })
            // L111: Action: This will involve an API call to create a new project (e.g., /api/projects/create/).
            // Open a modal for project creation details
            if (createProjectForm) createProjectForm.reset();
            if (createProjectStatus) clearStatus(createProjectStatus);
            createProjectModal.hidden = false;
            setTimeout(() => createProjectModal.classList.add('active'), 10);
            document.body.classList.add('modal-open');
            createProjectForm?.querySelector('input[name="projectTitle"]')?.focus();
        });
    }
    if(closeCreateProjectModalBtn){
        closeCreateProjectModalBtn.addEventListener('click', () => {
            createProjectModal.classList.remove('active');
            document.body.classList.remove('modal-open');
            setTimeout(() => createProjectModal.hidden = true, 300);
        });
    }

    if (createProjectForm) {
        createProjectForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            if (!window.uplasApi || !window.uplasApi.fetchAuthenticated) {
                displayStatus(createProjectStatus, 'Service unavailable.', 'error', true); return;
            }

            const titleInput = createProjectForm.querySelector('input[name="projectTitle"]');
            const descriptionInput = createProjectForm.querySelector('textarea[name="projectDescription"]');
            const title = titleInput?.value.trim();
            const description = descriptionInput?.value.trim();

            if (!title) {
                displayStatus(createProjectStatus, 'Project title is required.', 'error', true);
                titleInput?.focus();
                return;
            }
            const submitButton = createProjectForm.querySelector('button[type="submit"]');
            if(submitButton) submitButton.disabled = true;
            displayStatus(createProjectStatus, 'Creating project...', 'loading', false);

            try {
                const response = await window.uplasApi.fetchAuthenticated('/projects/', { // POST to /api/projects/
                    method: 'POST',
                    body: JSON.stringify({ title, description })
                });
                const newProjectData = await response.json();
                if (response.ok) {
                    displayStatus(createProjectStatus, 'Project created successfully!', 'success', false);
                    userProjects.unshift(newProjectData); // Add to local list
                    displayProjects(); // Re-render
                    setTimeout(() => {
                        closeCreateProjectModalBtn?.click();
                        const newCard = projectListContainer?.querySelector(`.project-card[data-project-id="${newProjectData.id}"]`);
                        newCard?.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    }, 1500);
                } else {
                    throw new Error(newProjectData.detail || newProjectData.title?.[0] || 'Failed to create project.');
                }
            } catch (error) {
                console.error("Error creating project:", error);
                displayStatus(createProjectStatus, error.message, 'error', true);
            } finally {
                if(submitButton) submitButton.disabled = false;
            }
        });
    }


    function attachProjectCardActionListeners() {
        projectListContainer?.querySelectorAll('.launch-ide-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                currentIdeProjectId = btn.dataset.projectId;
                const projectTitle = btn.dataset.projectTitle || "Selected Project";
                console.log(`Opening IDE for project: ${currentIdeProjectId}`);

                if (ideCurrentProjectTitle) ideCurrentProjectTitle.textContent = `Workspace: ${projectTitle}`;
                if (codeAreaIDE) codeAreaIDE.value = `# Welcome to the Uplas IDE for project: ${projectTitle}\n# File: main.py (default)\n\nprint("Hello from Uplas project: ${projectTitle}!")`;
                if (outputAreaIDE) outputAreaIDE.textContent = `Project environment for "${projectTitle}" loaded. Ready to run main.py.`;
                if (ideFileSelector) ideFileSelector.value = 'main.py';
                currentIdeFileName = 'main.py';

                const ideSidebarButton = document.getElementById('ide-icon'); // Assuming this ID for the sidebar item
                ideSidebarButton?.click(); // Switch to IDE panel
            });
        });
    }


    // --- AI Tutor Panel Functionality ---
    function addMessageToAiChat(text, sender, isHtml = false) { /* ... (same as uprojects (1).js) ... */ }
    if (aiTutorInputForm && messageInputAiTutor && chatMessagesAiTutor) {
        if(chatMessagesAiTutor.children.length === 0) { // Add initial greeting only if chat is empty
            addMessageToAiChat("Hello! I'm your AI Project Assistant. How can I help you with your projects today?", "assistant");
        }
        aiTutorInputForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            if (!window.uplasApi || !window.uplasApi.fetchAuthenticated) {
                addMessageToAiChat('AI Tutor service is currently unavailable.', 'assistant-error'); return;
            }
            const userMessage = messageInputAiTutor.value.trim();
            if (userMessage) {
                addMessageToAiChat(userMessage, 'user');
                messageInputAiTutor.value = '';
                messageInputAiTutor.disabled = true;
                const submitBtn = aiTutorInputForm.querySelector('button[type="submit"]');
                if(submitBtn) submitBtn.disabled = true;

                try {
                    // L162: aiTutorInputForm.addEventListener
                    // L170-L171: Action: API call for the AI Project Assistant
                    // Endpoint: /api/ai_agents/tutor/ask/ (from backend urls.py)
                    const payload = {
                        query: userMessage,
                        project_id: currentIdeProjectId, // Send current project context if available
                        // You might add more context like current file, selected code etc.
                    };
                    const response = await window.uplasApi.fetchAuthenticated('/ai_agents/tutor/ask/', {
                        method: 'POST',
                        body: JSON.stringify(payload)
                    });
                    const responseData = await response.json();

                    if (response.ok) {
                        addMessageToAiChat(responseData.response, 'assistant', responseData.is_html || false); // Assuming backend might send HTML
                    } else {
                        throw new Error(responseData.detail || responseData.error || 'AI Tutor failed to respond.');
                    }
                } catch (error) {
                    console.error("AI Tutor Error:", error);
                    addMessageToAiChat(`Sorry, I encountered an error: ${error.message}`, 'assistant-error');
                } finally {
                    messageInputAiTutor.disabled = false;
                    if(submitBtn) submitBtn.disabled = false;
                    messageInputAiTutor.focus();
                }
            }
        });
    }


    // --- IDE Panel Functionality ---
    if (runCodeButtonIDE && codeAreaIDE && outputAreaIDE) {
        runCodeButtonIDE.addEventListener('click', async () => {
            if (!window.uplasApi || !window.uplasApi.fetchAuthenticated) {
                outputAreaIDE.textContent = "Error: Code execution service unavailable."; return;
            }
            const code = codeAreaIDE.value;
            const selectedFile = ideFileSelector ? ideFileSelector.value : 'script.py';
            outputAreaIDE.textContent = `Executing ${selectedFile}...\n\n`;
            runCodeButtonIDE.disabled = true;

            try {
                // L194: runCodeButtonIDE.addEventListener
                // L205: Action: API call to a secure code execution service
                // Endpoint: /api/projects/ide/run_code/ (Needs to be created in backend)
                const response = await window.uplasApi.fetchAuthenticated('/projects/ide/run_code/', { // Placeholder endpoint
                    method: 'POST',
                    body: JSON.stringify({
                        project_id: currentIdeProjectId,
                        file_name: selectedFile,
                        code: code,
                        language: 'python' // Or derive from file_name
                    })
                });
                const result = await response.json();
                if (response.ok) {
                    outputAreaIDE.textContent += `Output:\n${result.output || ''}\n`;
                    if (result.errors) {
                        outputAreaIDE.textContent += `Errors:\n${result.errors}\n`;
                    }
                    outputAreaIDE.textContent += `Execution finished.`;
                } else {
                    throw new Error(result.detail || result.error || 'Failed to run code.');
                }
            } catch (error) {
                console.error("Error running code:", error);
                outputAreaIDE.textContent += `Error: ${error.message}\n`;
            } finally {
                runCodeButtonIDE.disabled = false;
            }
        });
    }

    if (saveCodeButtonIDE && codeAreaIDE && outputAreaIDE) {
        saveCodeButtonIDE.addEventListener('click', async () => {
            if (!window.uplasApi || !window.uplasApi.fetchAuthenticated) {
                outputAreaIDE.textContent = "Error: Save service unavailable."; return;
            }
            if (!currentIdeProjectId) {
                outputAreaIDE.textContent = "No project selected in IDE to save to."; return;
            }

            const codeToSave = codeAreaIDE.value;
            const fileNameToSave = currentIdeFileName || (ideFileSelector ? ideFileSelector.value : 'main.py');
            outputAreaIDE.textContent = `Saving ${fileNameToSave} for project ${currentIdeProjectId}...\n`;
            saveCodeButtonIDE.disabled = true;

            try {
                // L209: saveCodeButtonIDE.addEventListener
                // L212: Action: API call to save code/file content for a project
                // Endpoint: /api/projects/{projectId}/files/save/ (Needs to be created in backend)
                // Assuming a simple file content save. A real IDE might have a more complex file structure.
                const response = await window.uplasApi.fetchAuthenticated(`/projects/${currentIdeProjectId}/files/save/`, { // Placeholder
                    method: 'POST', // Or PUT if updating an existing file
                    body: JSON.stringify({
                        file_name: fileNameToSave,
                        content: codeToSave
                    })
                });
                const result = await response.json();
                if (response.ok) {
                    outputAreaIDE.textContent = result.message || `File ${fileNameToSave} saved successfully for project ${currentIdeProjectId}.`;
                } else {
                    throw new Error(result.detail || result.error || 'Failed to save file.');
                }
            } catch (error) {
                console.error("Error saving code:", error);
                outputAreaIDE.textContent += `Error: ${error.message}\n`;
            } finally {
                saveCodeButtonIDE.disabled = false;
            }
        });
    }
    if (ideFileSelector && codeAreaIDE) {
        ideFileSelector.addEventListener('change', (e) => {
            currentIdeFileName = e.target.value;
            // TODO: In a real IDE, this would fetch the content of the selected file for currentIdeProjectId
            codeAreaIDE.value = `# Code for ${currentIdeFileName} in project ${currentIdeProjectId || 'N/A'}\n\n# Add your ${currentIdeFileName.split('.').pop()} code here.`;
            if(outputAreaIDE) outputAreaIDE.textContent = `Switched to ${currentIdeFileName}.`;
        });
    }


    // --- Initializations ---
    if (projectDashboardPanel) {
        fetchUserProjects();
    }

    // const currentYearFooterSpan = document.getElementById('current-year-footer'); // Handled by global.js
    // if (currentYearFooterSpan && !currentYearFooterSpan.textContent?.match(/\d{4}/)) {
    //     currentYearFooterSpan.textContent = new Date().getFullYear();
    // }

    console.log("Uplas Projects Dashboard (uprojects.js) API integrated and loaded.");
});
```

**Key Changes and Explanations:**

1.  **`fetchUserProjects()`** (L98 / L100):
    * Replaced simulation with:
        ```javascript
        const response = await window.uplasApi.fetchAuthenticated('/projects/mine/');
        // ...
        userProjects = projectData.results || projectData; // Handle DRF pagination
        ```
    * Calls `/api/projects/mine/` to get projects for the logged-in user. Your backend `ProjectViewSet` should have a `mine` action or filter for the current user.
    * Updates `userProjects` with the fetched data and calls `displayProjects()`.
    * Error handling included.

2.  **`createNewProjectBtn` Listener & `createProjectForm` Submit** (L109 / L111):
    * The `createNewProjectBtn` now opens a modal (assuming HTML for `create-project-modal` and `create-project-form` will be added).
    * The `createProjectForm` submit handler makes an API call:
        ```javascript
        const response = await window.uplasApi.fetchAuthenticated('/projects/', { // POST to /api/projects/
            method: 'POST',
            body: JSON.stringify({ title, description })
        });
        ```
    * Sends `title` and `description` to `/api/projects/` (POST) to create a new project. Your backend `ProjectViewSet` should handle this.
    * On success, it adds the new project to the local `userProjects` list and re-renders.

3.  **AI Tutor (`aiTutorInputForm` listener)** (L162 / L170-L171):
    * Replaced simulation with:
        ```javascript
        const response = await window.uplasApi.fetchAuthenticated('/ai_agents/tutor/ask/', {
            method: 'POST',
            body: JSON.stringify(payload)
        });
        ```
    * Sends the `query` and `project_id` (if `currentIdeProjectId` is set) to `/api/ai_agents/tutor/ask/`. This matches the AI Tutor endpoint in your backend.
    * Displays the AI's response.

4.  **IDE "Run Code" (`runCodeButtonIDE` listener)** (L194 / L205):
    * Replaced simulation with:
        ```javascript
        const response = await window.uplasApi.fetchAuthenticated('/projects/ide/run_code/', { /* ... */ });
        ```
    * Sends `project_id`, `file_name`, `code`, and `language` to a **placeholder endpoint** `/api/projects/ide/run_code/`.
    * **Backend Dependency**: You need to implement this backend endpoint. It should be a secure environment to execute code (e.g., using Docker containers, sandboxing). This is a complex feature. The frontend just sends the code and expects output/errors.

5.  **IDE "Save Code" (`saveCodeButtonIDE` listener)** (L209 / L212):
    * Replaced simulation with:
        ```javascript
        const response = await window.uplasApi.fetchAuthenticated(`/projects/${currentIdeProjectId}/files/save/`, { /* ... */ });
        ```
    * Sends `file_name` and `content` (code) to a **placeholder endpoint** `/api/projects/{projectId}/files/save/`.
    * **Backend Dependency**: You need to implement this. It could save the file content to the project's associated storage (e.g., database field, file system, cloud storage). `currentIdeProjectId` is used to identify the project. `currentIdeFileName` (new state variable) tracks the active file.

6.  **State Variables for IDE**:
    * `currentIdeProjectId`: Added to keep track of which project's code is being edited/run in the IDE. This is set when the "Workspace" button on a project card is clicked.
    * `currentIdeFileName`: Added to track the currently "open" file in the IDE, initialized to `main.py`. The `ideFileSelector` change event updates this.

7.  **Display/Error Handling**: Uses the `displayStatus` utility (which now prefers `uplasApi.displayFormStatus`) for user feedback.

**Important Next Steps & Considerations:**

* **Backend Endpoints**:
    * Ensure `/api/projects/mine/` is set up to return projects for the authenticated user.
    * Ensure `/api/projects/` (POST) correctly creates a new project.
    * **Crucially, implement the backend for `/api/projects/ide/run_code/` and `/api/projects/{projectId}/files/save/`. These are new and require careful design, especially the code execution part for security.**
    * Ensure `/api/ai_agents/tutor/ask/` can handle an optional `project_id`.
* **HTML for Create Project Modal**: You'll need to add the HTML structure for `create-project-modal`, `close-create-project-modal-btn`, `create-project-form`, and `create-project-status` for the "Create New Project" functionality to work.
* **IDE File Management**: The current IDE simulation is very basic (one code area, one file selector). A real IDE would involve:
    * Fetching a list of files for a project.
    * Fetching the content of a selected file.
    * Saving new files, renaming, deleting.
    * Each of these would be additional API calls.
* **Data Structures**: Verify that the data sent to and expected from the new backend endpoints matches what your serializers will handle. For example, when fetching projects, the `renderProjectCard` function expects fields like `id`, `title`, `description`, `status`, `due_date`, `completed_tasks`, `total_tasks`.
* **Security for Code Execution**: The `/api/projects/ide/run_code/` endpoint is security-sensitive. Ensure it's properly sandboxed to prevent abuse.
* **Error Handling**: Enhance specific error messages based on what the backend might return for these new endpoints.

This version of `uprojects.js` makes significant progress by integrating the core project management and IDE-related API calls. The most substantial work remaining is on the backend to support the new IDE and file management functionaliti
