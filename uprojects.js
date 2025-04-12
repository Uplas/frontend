document.addEventListener('DOMContentLoaded', function() {
    const themeToggle = document.getElementById('theme-toggle');
    const body = document.body;
    const navLinks = document.querySelectorAll('.nav-link');
    const sidebarItems = document.querySelectorAll('.sidebar-item');
    const featurePanels = document.querySelectorAll('.feature-panel');
    const closeButtons = document.querySelectorAll('.close-panel');
    const messageInput = document.getElementById('message-input'); // For AI Tutor
    const codeArea = document.getElementById('code-area');       // For IDE

    // Function to set the active navigation link
    function setActiveLink() {
        navLinks.forEach(link => {
            link.classList.remove('active');
            if (link.getAttribute('href') === 'uprojects.html') {
                link.classList.add('active');
            }
        });
    }
    setActiveLink(); // Set active link on page load

    // Function to toggle dark mode
    themeToggle.addEventListener('click', function() {
        body.classList.toggle('dark-mode');
        themeToggle.textContent = body.classList.contains('dark-mode') ? 'Light Mode' : 'Dark Mode';
    });

    // Function to open a feature panel
    function openPanel(panelId) {
        featurePanels.forEach(panel => {
            panel.style.display = 'none';
        });
        const panel = document.getElementById(panelId);
        if (panel) {
            panel.style.display = 'flex';
        }
    }

    // Function to close all feature panels
    function closeAllPanels() {
        featurePanels.forEach(panel => {
            panel.style.display = 'none';
        });
    }

    // Event listeners for sidebar items to open feature panels
    sidebarItems.forEach(item => {
        item.addEventListener('click', function() {
            const iconId = this.id;
            let panelId = '';
            switch (iconId) {
                case 'ai-tutor-icon':
                    panelId = 'ai-tutor-panel';
                    break;
                case 'ide-icon':
                    panelId = 'ide-panel';
                    break;
                case 'project-overview-icon':
                    panelId = 'project-overview-panel';
                    break;
                case 'resources-icon':
                    panelId = 'resources-panel';
                    break;
            }
            openPanel(panelId);

            // Focus on the input field when the panel opens (if it exists)
            const activePanel = document.getElementById(panelId);
            if (activePanel && panelId === 'ai-tutor-panel' && messageInput) {
                messageInput.focus();
            } else if (activePanel && panelId === 'ide-panel' && codeArea) {
                codeArea.focus();
            }
        });
    });

    // Event listeners for close buttons
    closeButtons.forEach(button => {
        button.addEventListener('click', closeAllPanels);
    });

    // Optional: Close panels if clicking outside
    document.addEventListener('click', function(event) {
        if (!event.target.closest('.left-sidebar') && !event.target.closest('.feature-panel') && !event.target.closest('.sidebar-item')) {
            closeAllPanels();
        }
    });

    // Prevent panel content from stealing focus on click (potential fix for input issue)
    featurePanels.forEach(panel => {
        panel.addEventListener('mousedown', function(event) {
            if (event.target.tagName !== 'INPUT' && event.target.tagName !== 'TEXTAREA' && event.target.tagName !== 'BUTTON') {
                event.preventDefault();
            }
        });
    });
});

// Example inside uprojects.js or another script

async function getUserData() {
    try {
        // Use the utility function for authenticated endpoints
        const userData = await fetchAuthenticated('/api/users/profile/'); 
        console.log("User profile data:", userData);
        // Update UI with user data
    } catch (error) {
        console.error("Failed to fetch user profile:", error);
        // Handle error (e.g., show message, redirect to login if needed)
    }
}

// Call it when needed
// getUserData();
