// Place this within <script> tags in your community.html

document.addEventListener('DOMContentLoaded', function() {
    const themeToggleBtn = document.getElementById('theme-toggle'); // If you have a theme toggle button
    const goBackLink = document.getElementById('go-back');
    const goBackAlternativeLink = document.getElementById('go-back-alternative');

    // Function to toggle the theme
    function toggleTheme() {
        document.body.classList.toggle('dark-mode');
        // You might also want to save the user's preference in local storage here
    }

    // Event listener for the theme toggle button (if you have one)
    if (themeToggleBtn) {
        themeToggleBtn.addEventListener('click', toggleTheme);
    }

    // Check for user's saved preference on load (optional)
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme === 'dark') {
        document.body.classList.add('dark-mode');
    }

    // Go back to the previous page functionality for "Click here"
    if (goBackLink) {
        goBackLink.addEventListener('click', function(event) {
            event.preventDefault(); // Prevent any default link behavior
            window.history.back();
        });
    }
    
    if (goBackAlternativeLink) {
        goBackAlternativeLink.addEventListener('click', function(event) {
            event.preventDefault(); // Prevent any default link behavior
            window.history.back();
        });
    }
});

// Basic JavaScript for testing - You'll need to expand on this for real functionality
document.addEventListener('DOMContentLoaded', function() {
    const sendButton = document.querySelector('.send-button');
    const messageInput = document.getElementById('message-input');
    const messagesArea = document.getElementById('messages-area');

    sendButton.addEventListener('click', sendMessage);
    messageInput.addEventListener('keypress', function(event) {
        if (event.key === 'Enter') {
            sendMessage();
        }
    });

    function sendMessage() {
        const messageContent = messageInput.value.trim();
        if (messageContent !== "") {
            const newMessageDiv = document.createElement('div');
            newMessageDiv.classList.add('message', 'sent');
            newMessageDiv.innerHTML = `
                <div class="message-content-container">
                    <div class="message-content">${messageContent}</div>
                </div>
                <div class="profile-avatar">Y</div>
            `;
            messagesArea.appendChild(newMessageDiv);
            messageInput.value = "";
            messagesArea.scrollTop = messagesArea.scrollHeight;
        }
    }

    // Scroll to the bottom of the messages area on load
    messagesArea.scrollTop = messagesArea.scrollHeight;
});