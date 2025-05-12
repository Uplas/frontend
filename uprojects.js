/* ==========================================================================
   uprojects.js (Definitive Functional Version)
   --------------------------------------------------------------------------
   Handles all interactivity for the Uplas Projects Page:
   - Theme Toggle (if #theme-toggle exists and is not handled by a global script)
   - Mobile Navigation Toggle (if .nav__toggle exists)
   - Left Sidebar Tool Panel Activation & Management
     - AI Tutor Panel (Chat functionality)
     - IDE Panel (Basic code execution simulation)
     - Project Overview Panel
     - Resources Panel
     - Placeholder panels for Version Control & Collaboration
   - Panel Controls (Close, Conceptual Minimize/Maximize, Drag & Resize)
   - Accessibility enhancements for dynamic content.
   ========================================================================== */

'use strict';

document.addEventListener('DOMContentLoaded', () => {

    // --- Global Element Selectors (from your uprojects.html) ---
    const body = document.body;
    const themeToggleButton = document.getElementById('theme-toggle'); // From your uprojects.html
    const mobileNavToggleButton = document.querySelector('.header .nav__toggle'); // Assuming a similar global nav toggle
    const mainNav = document.querySelector('.header .nav'); // Assuming this is the main nav UL/DIV

    // Left Sidebar & Panels
    const leftSidebar = document.getElementById('uprojects-sidebar'); // Assuming you'll add this ID to your <aside class="left-sidebar">
    const sidebarItems = document.querySelectorAll('.left-sidebar .sidebar-item');
    const featurePanels = document.querySelectorAll('.main-content .feature-panel'); // All panels in main content
    const mainContentArea = document.querySelector('.main-content.uprojects-main-content');


    // AI Tutor Panel Specific
    const aiTutorPanel = document.getElementById('ai-tutor-panel');
    const chatMessagesAiTutor = document.getElementById('chat-messages'); // From your HTML
    const messageInputAiTutor = document.getElementById('message-input'); // From your HTML
    const sendButtonAiTutor = document.getElementById('send-button'); // From your HTML

    // IDE Panel Specific
    const idePanel = document.getElementById('ide-panel');
    const codeAreaIDE = document.getElementById('code-area'); // From your HTML
    const runCodeButtonIDE = document.getElementById('run-code'); // From your HTML
    const saveCodeButtonIDE = document.getElementById('save-code'); // From your HTML
    const outputAreaIDE = document.getElementById('output'); // From your HTML
    // const ideFileSelector = document.getElementById('ide-file-selector'); // If added per enhanced HTML suggestion
    // const ideFormatCodeBtn = document.getElementById('ide-format-code-btn'); // If added

    // Project Dashboard / Overview Panel (if made dynamic)
    const projectDashboardPanel = document.getElementById('project-dashboard-panel'); // Assuming it's a panel
    const projectListContainer = document.getElementById('project-list-container');
    const createNewProjectBtn = document.getElementById('create-new-project-btn');

    // Footer Year (Assuming structure similar to other pages)
    const currentYearFooterSpan = document.getElementById('current-year-footer'); // Or '#current-year' if from ublog

    // --- State Variables ---
    let activePanel = null; // Stores the currently open feature panel element
    let initialPanelPositions = {}; // For dragging

    // --- Helper Functions ---
    /**
     * Toggles visibility of an element using style.display.
     * Ensures only one main feature panel is visible at a time.
     * @param {HTMLElement} panelToShow - The panel element to show.
     */
    function showFeaturePanel(panelToShow) {
        featurePanels.forEach(panel => {
            if (panel === panelToShow) {
                panel.style.display = 'flex'; // Assuming panels use flex for layout
                panel.classList.add('active-panel'); // For specific styling if needed
                activePanel = panel;
                // Make draggable and resizable if it's a draggable-resizable-panel
                if (panel.classList.contains('draggable-resizable-panel')) {
                    makePanelDraggable(panel);
                    // makePanelResizable(panel); // Resizing is more complex, conceptual for now
                }
            } else {
                panel.style.display = 'none';
                panel.classList.remove('active-panel');
            }
        });
    }

    /**
     * Closes a specific feature panel.
     * @param {HTMLElement} panelToClose - The panel element to close.
     */
    function closeFeaturePanel(panelToClose) {
        if (panelToClose) {
            panelToClose.style.display = 'none';
            panelToClose.classList.remove('active-panel');
            if (activePanel === panelToClose) {
                activePanel = null;
            }
            // Deactivate corresponding sidebar icon
            const panelId = panelToClose.id;
            const correspondingButton = document.querySelector(`.sidebar-item[data-panel-id="${panelId}"]`);
            if (correspondingButton) {
                correspondingButton.classList.remove('active');
            }
            // Show the project dashboard if no other panel is active (or a default view)
            if (!document.querySelector('.feature-panel.active-panel') && projectDashboardPanel) {
                 projectDashboardPanel.style.display = 'block'; // Or 'flex' if it uses flex
                 projectDashboardPanel.classList.add('active-panel');
                 const dashboardButton = document.getElementById('project-dashboard-icon');
                 if(dashboardButton) dashboardButton.classList.add('active');
                 activePanel = projectDashboardPanel;
            }
        }
    }

    // --- Theme Toggle (from your uprojects.html, likely stand-alone for this page) ---
    if (themeToggleButton) {
        const applyUProjectsTheme = () => {
            const isDarkMode = localStorage.getItem('uplasProjectsDarkMode') === 'true';
            body.classList.toggle('dark-mode', isDarkMode);
            themeToggleButton.textContent = isDarkMode ? 'Light Mode' : 'Dark Mode';
            themeToggleButton.setAttribute('aria-label', isDarkMode ? 'Switch to Light Mode' : 'Switch to Dark Mode');
        };

        themeToggleButton.addEventListener('click', () => {
            const isDarkMode = body.classList.toggle('dark-mode');
            localStorage.setItem('uplasProjectsDarkMode', isDarkMode);
            applyUProjectsTheme();
        });
        applyUProjectsTheme(); // Initial theme
    }


    // --- Left Sidebar Tool Panel Activation ---
    if (sidebarItems.length > 0 && featurePanels.length > 0) {
        sidebarItems.forEach(item => {
            item.addEventListener('click', () => {
                const panelIdToOpen = item.dataset.panelId;
                const panelToOpen = document.getElementById(panelIdToOpen);

                if (panelToOpen) {
                    // Deactivate previously active item
                    sidebarItems.forEach(si => si.classList.remove('active'));
                    // Activate clicked item
                    item.classList.add('active');
                    // Show the target panel and hide others
                    showFeaturePanel(panelToOpen);
                } else {
                    console.warn(`Panel with ID "${panelIdToOpen}" not found.`);
                    // Optionally hide all panels if the target is not found
                    featurePanels.forEach(p => {
                        p.style.display = 'none';
                        p.classList.remove('active-panel');
                    });
                    activePanel = null;
                }
            });
        });

        // Panel Controls (Close button within each panel)
        featurePanels.forEach(panel => {
            const closeButton = panel.querySelector('.close-panel, .close-panel-btn'); // Accommodate both class names
            if (closeButton) {
                closeButton.addEventListener('click', () => {
                    closeFeaturePanel(panel);
                });
            }
        });
    } else {
        console.warn("Sidebar items or feature panels not found. Ensure correct IDs and classes in HTML.");
    }

    // --- AI Tutor Panel Functionality ---
    if (aiTutorPanel && sendButtonAiTutor && messageInputAiTutor && chatMessagesAiTutor) {
        function addMessageToAiChat(text, sender) {
            const messageDiv = document.createElement('div');
            messageDiv.classList.add('message', `message--${sender}`); // 'user' or 'assistant'

            if (sender === 'assistant') {
                const avatarImg = document.createElement('img');
                avatarImg.src = 'images/ai_tutor_avatar.png'; // Ensure this path is correct
                avatarImg.alt = 'AI Tutor';
                avatarImg.classList.add('message__avatar');
                messageDiv.appendChild(avatarImg);
            }

            const bubbleDiv = document.createElement('div');
            bubbleDiv.classList.add('message__bubble');
            bubbleDiv.textContent = text;
            messageDiv.appendChild(bubbleDiv);

            chatMessagesAiTutor.appendChild(messageDiv);
            chatMessagesAiTutor.scrollTop = chatMessagesAiTutor.scrollHeight; // Scroll to bottom
        }

        function handleAiTutorSend() {
            const userMessage = messageInputAiTutor.value.trim();
            if (userMessage) {
                addMessageToAiChat(userMessage, 'user');
                messageInputAiTutor.value = '';

                // Simulate AI response
                setTimeout(() => {
                    let aiResponse = "I'm processing your request...";
                    if (userMessage.toLowerCase().includes('python error')) {
                        aiResponse = "It looks like you have a Python error. Can you paste the error message or the relevant code snippet? I can help you debug common issues like `SyntaxError` or `NameError`.";
                    } else if (userMessage.toLowerCase().includes('explain')) {
                        aiResponse = "Sure, I can explain that! For instance, if you're asking about 'list comprehensions in Python', they are a concise way to create lists. Example: `squares = [x**2 for x in range(10)]`. What specific concept are you curious about?";
                    } else if (userMessage.toLowerCase().includes('hello') || userMessage.toLowerCase().includes('hi')) {
                        aiResponse = "Hello there! How can I assist with your AI project today? Feel free to ask about concepts, debugging, or brainstorming.";
                    } else {
                        aiResponse = `I've received your message about: "${userMessage.substring(0, 30)}${userMessage.length > 30 ? '...' : ''}". Let me look into that for you. For more complex queries, consider breaking them down.`;
                    }
                    addMessageToAiChat(aiResponse, 'assistant');
                }, 1000 + Math.random() * 1000);
            }
        }

        sendButtonAiTutor.addEventListener('click', handleAiTutorSend);
        messageInputAiTutor.addEventListener('keypress', (event) => {
            if (event.key === 'Enter' && !event.shiftKey) {
                event.preventDefault();
                handleAiTutorSend();
            }
        });
        // Add form submission handler if chat input is in a form
        const aiTutorInputForm = document.getElementById('ai-tutor-input-form');
        if(aiTutorInputForm) {
            aiTutorInputForm.addEventListener('submit', (e) => {
                e.preventDefault();
                handleAiTutorSend();
            });
        }

    }

    // --- IDE Panel Functionality (Basic Simulation) ---
    if (idePanel && runCodeButtonIDE && codeAreaIDE && outputAreaIDE) {
        runCodeButtonIDE.addEventListener('click', () => {
            const code = codeAreaIDE.value;
            outputAreaIDE.textContent = `Simulating execution of your Python code...\n\n`;
            // Simulate some output based on common Python prints or errors
            if (code.includes('print("Hello Uplas")')) {
                outputAreaIDE.textContent += 'Hello Uplas\n';
            } else if (code.trim() === '') {
                outputAreaIDE.textContent += 'No code to execute.\n';
            } else if (code.includes('import')) {
                 outputAreaIDE.textContent += `Simulated import: ${code.match(/import (\w+)/)?.[1] || 'module'}\n`;
                 outputAreaIDE.textContent += 'Execution complete (simulated).\n';
            }
            else {
                outputAreaIDE.textContent += 'Execution complete (simulated).\n';
            }
            // In a real scenario, this would send code to a backend execution environment.
        });

        if (saveCodeButtonIDE) {
            saveCodeButtonIDE.addEventListener('click', () => {
                // Simulate saving code
                outputAreaIDE.textContent = `Code snapshot saved (simulated).\nTimestamp: ${new Date().toLocaleTimeString()}`;
                // In a real app, this would save to localStorage, a file, or backend.
            });
        }
    }

    // --- Project Dashboard & Dynamic Project Loading (Conceptual) ---
    // Sample project data (in a real app, this would come from an API)
    const sampleProjects = [
        { id: "proj001", title: "AI-Powered Email Categorizer", status: "In Progress", description: "Develop an ML model to categorize emails.", dueDate: "May 30, 2025", tasksCompleted: 3, tasksTotal: 5, progress: 60, courseLink: "mcourse_detail_page.html#module-3" },
        { id: "proj002", title: "Customer Churn Prediction Model", status: "Not Started", description: "Build a model to predict customer churn using historical data.", dueDate: "June 15, 2025", tasksCompleted: 0, tasksTotal: 8, progress: 0, courseLink: "mcourse_detail_page.html#module-4" },
        { id: "proj003", title: "Image Recognition for Product Tagging", status: "Completed", description: "Create a CV model to automatically tag products in images.", dueDate: "April 20, 2025", tasksCompleted: 7, tasksTotal: 7, progress: 100, courseLink: "mcourse_detail_page.html#module-5" }
    ];

    function renderProjectCard(project) {
        const statusClass = project.status.toLowerCase().replace(/\s+/g, '-');
        const cardHTML = `
            <article class="project-card project-card--${statusClass}" data-project-id="${project.id}">
                <div class="project-card__header">
                    <h3 class="project-card__title">${project.title}</h3>
                    <span class="badge badge--status-${statusClass}">${project.status}</span>
                </div>
                <p class="project-card__description">${project.description}</p>
                <div class="project-card__meta">
                    <span><i class="fas fa-calendar-alt"></i> Due: ${project.dueDate}</span>
                    <span><i class="fas fa-tasks"></i> ${project.tasksCompleted}/${project.tasksTotal} Tasks</span>
                </div>
                <div class="project-card__progress">
                    <div class="progress-bar-container--small">
                        <div class="progress-bar--small" style="width: ${project.progress}%;"
                             aria-valuenow="${project.progress}" aria-valuemin="0" aria-valuemax="100">${project.progress}%</div>
                    </div>
                </div>
                <div class="project-card__actions">
                    <a href="uprojects_detail_example.html?id=${project.id}" class="button button--secondary button--extra-small view-project-details-btn">
                        <i class="fas fa-eye"></i> View Details
                    </a>
                    <button class="button button--primary button--extra-small launch-ide-btn" data-project-id="${project.id}">
                        <i class="fas fa-code"></i> Workspace
                    </button>
                </div>
            </article>
        `;
        return cardHTML;
    }

    function displayProjects(projects) {
        if (!projectListContainer) return;
        projectListContainer.innerHTML = ''; // Clear existing
        if (projects.length === 0) {
            projectListContainer.innerHTML = '<p class="empty-state-message">No projects yet. Click "Start New Project" to begin!</p>';
            return;
        }
        projects.forEach(project => {
            projectListContainer.innerHTML += renderProjectCard(project);
        });

        // Re-attach event listeners for newly rendered elements if needed
        attachProjectCardActionListeners();
    }

    function attachProjectCardActionListeners() {
        const ideLaunchButtons = projectListContainer.querySelectorAll('.launch-ide-btn');
        ideLaunchButtons.forEach(btn => {
            btn.addEventListener('click', () => {
                const projectId = btn.dataset.projectId;
                console.log(`Opening IDE for project: ${projectId} (simulated)`);
                // Find the IDE sidebar button and click it
                const ideSidebarButton = document.getElementById('ide-icon');
                if(ideSidebarButton) ideSidebarButton.click();
                // Future: Load project-specific files into IDE
                if(codeAreaIDE) codeAreaIDE.value = `# Code for project ${projectId}\nprint("Hello from ${projectId}!")`;
                if(outputAreaIDE) outputAreaIDE.textContent = `Project ${projectId} environment loaded.`;
            });
        });
    }


    // Initial display of projects (if project dashboard is active by default)
    if (projectDashboardPanel && projectDashboardPanel.classList.contains('active-panel')) {
        displayProjects(sampleProjects);
    }

    if (createNewProjectBtn) {
        createNewProjectBtn.addEventListener('click', () => {
            // Simulate creating a new project
            const newProjectId = `proj${String(Date.now()).slice(-3)}`; // Simple unique ID
            const newProject = {
                id: newProjectId,
                title: `New AI Project ${newProjectId}`,
                status: "Not Started",
                description: "Define the goals and scope of your new AI venture.",
                dueDate: "Set a Deadline",
                tasksCompleted: 0,
                tasksTotal: 5, // Default tasks
                progress: 0,
                courseLink: "mcourse_detail_page.html"
            };
            sampleProjects.unshift(newProject); // Add to the beginning
            displayProjects(sampleProjects);
            // Optionally, scroll to the new project or open a project creation modal/panel
            const newCard = projectListContainer.querySelector(`.project-card[data-project-id="${newProjectId}"]`);
            if(newCard) newCard.scrollIntoView({ behavior: 'smooth', block: 'center' });
        });
    }


    // --- Draggable and Resizable Panels (Conceptual - Basic Dragging) ---
    function makePanelDraggable(panel) {
        const header = panel.querySelector('.panel-drag-handle, .panel-header'); // Use designated drag handle or whole header
        if (!header) return;

        let isDragging = false;
        let offsetX, offsetY;

        header.style.cursor = 'grab';

        header.addEventListener('mousedown', (e) => {
            // Prevent dragging if click is on a button inside the header
            if (e.target.closest('button')) return;

            isDragging = true;
            offsetX = e.clientX - panel.offsetLeft;
            offsetY = e.clientY - panel.offsetTop;
            panel.style.position = 'fixed'; // Ensure fixed positioning for dragging
            panel.style.zIndex = '1001'; // Bring to front
            header.style.cursor = 'grabbing';
            // Remove smooth transition during drag
            panel.style.transition = 'none';
        });

        document.addEventListener('mousemove', (e) => {
            if (!isDragging) return;
            // Boundary checks to keep panel within viewport (simplified)
            let newX = e.clientX - offsetX;
            let newY = e.clientY - offsetY;

            const mainContentRect = mainContentArea.getBoundingClientRect(); // Define mainContentArea globally
            const panelRect = panel.getBoundingClientRect();

            // Keep within main content bounds (approximately)
            newX = Math.max(mainContentRect.left, Math.min(newX, mainContentRect.right - panelRect.width));
            newY = Math.max(mainContentRect.top, Math.min(newY, mainContentRect.bottom - panelRect.height));


            panel.style.left = `${newX}px`;
            panel.style.top = `${newY}px`;
            // Important: translate(-50%, -50%) will be offset by left/top,
            // so if using it for centering, this drag logic needs to account for it or remove it.
            // For simplicity, we assume fixed positioning from top-left for dragging.
            // If panels were initially centered with transform, this logic would need adjustment.
            panel.style.transform = 'none'; // Remove transform if it was used for centering
        });

        document.addEventListener('mouseup', () => {
            if (isDragging) {
                isDragging = false;
                header.style.cursor = 'grab';
                panel.style.zIndex = '1000'; // Reset z-index
                // Restore transition if it was removed
                panel.style.transition = ''; // Or set back to original transition
            }
        });
    }

    // Apply draggable to relevant panels (if they have .draggable-resizable-panel class)
    document.querySelectorAll('.draggable-resizable-panel').forEach(panel => {
        // Initially position panels if they are draggable (example: slightly offset)
        // This might conflict with CSS centering, so it's better if CSS handles initial fixed pos
        // panel.style.top = '50%'; panel.style.left = '50%'; panel.style.transform = 'translate(-50%, -50%)';
        // Draggability will override this if panel.style.position becomes 'fixed' during drag
        if (panel.style.display !== 'none') { // Only make visible panels draggable
            makePanelDraggable(panel);
        }
    });
    // Note: True resizability is much more complex and involves handling resize handles,
    // mouse events on those handles, and updating width/height with boundary checks.
    // For now, dragging is implemented.

    // --- Footer Current Year ---
    if (currentYearFooterSpan) {
        currentYearFooterSpan.textContent = new Date().getFullYear();
    }

    // --- Initial Active Panel (Dashboard) ---
    const initialActiveSidebarItem = document.getElementById('project-dashboard-icon');
    const initialActivePanel = document.getElementById('project-dashboard-panel');
    if (initialActiveSidebarItem && initialActivePanel) {
        sidebarItems.forEach(si => si.classList.remove('active'));
        featurePanels.forEach(fp => {
            fp.style.display = 'none';
            fp.classList.remove('active-panel');
        });
        initialActiveSidebarItem.classList.add('active');
        initialActivePanel.style.display = 'block'; // Or 'flex' if using flex layout for panel
        initialActivePanel.classList.add('active-panel');
        activePanel = initialActivePanel;
        if (initialActivePanel.classList.contains('draggable-resizable-panel')) {
            makePanelDraggable(initialActivePanel);
        }
    }

}); // End DOMContentLoaded
