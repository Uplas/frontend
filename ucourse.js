document.addEventListener('DOMContentLoaded', function() {
    // Theme Toggle Functionality (Existing Code)
    const themeToggle = document.getElementById('theme-toggle');
    const body = document.body;
    const currentTheme = localStorage.getItem('theme');

    if (currentTheme === 'dark') {
        body.classList.add('dark-mode');
        themeToggle.textContent = 'Light Mode';
    }

    themeToggle.addEventListener('click', function() {
        body.classList.toggle('dark-mode');
        const isDarkMode = body.classList.contains('dark-mode');
        themeToggle.textContent = isDarkMode ? 'Light Mode' : 'Dark Mode';
        localStorage.setItem('theme', isDarkMode ? 'dark' : 'light');
    });

    // Enhanced Search Functionality (Existing Code)
    const searchInput = document.querySelector('.search-bar input[type="text"]');
    const courseItems = document.querySelectorAll('.course-item');

    if (searchInput) {
        searchInput.addEventListener('input', function() {
            const searchTerm = this.value.toLowerCase();
            courseItems.forEach(item => {
                const courseTitle = item.querySelector('h3').textContent.toLowerCase();
                if (courseTitle.includes(searchTerm)) {
                    item.style.display = 'flex'; // Show the course item
                } else {
                    item.style.display = 'none'; // Hide the course item
                }
            });
        });
    }

    // Click Handling for Course Items (Existing Code)
    courseItems.forEach(item => {
        item.addEventListener('click', function() {
            if (this.classList.contains('available')) {
                const courseTitle = this.querySelector('h3').textContent;
                alert(`Navigating to course: ${courseTitle}`); // In a real application, this would be a navigation to the course page
            } else if (this.classList.contains('locked')) {
                alert('This course is currently locked. Please check the requirements to unlock it.'); // Provide feedback for locked courses
            }
        });
    });

    // Make WhatsApp Chat Icon Draggable
    const whatsappChat = document.getElementById('whatsapp-chat');
    let isDragging = false;
    let offsetX, offsetY;

    if (whatsappChat) {
        whatsappChat.addEventListener('mousedown', (e) => {
            isDragging = true;
            whatsappChat.style.cursor = 'grabbing';
            offsetX = e.clientX - whatsappChat.getBoundingClientRect().left;
            offsetY = e.clientY - whatsappChat.getBoundingClientRect().top;
        });

        document.addEventListener('mousemove', (e) => {
            if (!isDragging) return;

            whatsappChat.style.left = e.clientX - offsetX + 'px';
            whatsappChat.style.top = e.clientY - offsetY + 'px';
        });

        document.addEventListener('mouseup', () => {
            if (!isDragging) return;
            isDragging = false;
            whatsappChat.style.cursor = 'grab';
        });

        // Prevent default drag behavior on the anchor tag inside
        whatsappChat.querySelector('a').addEventListener('dragstart', (e) => {
            e.preventDefault();
        });
    }
});


document.addEventListener('DOMContentLoaded', function() {
    const whatsappLink = document.getElementById('whatsapp-link');
    const whatsappChatWindow = document.getElementById('whatsapp-chat-window');
    const closeChatButton = document.getElementById('close-whatsapp-chat');

    whatsappLink.addEventListener('click', function(event) {
        event.preventDefault(); // Prevent the default link behavior
        whatsappChatWindow.style.display = 'block'; // Show the chat window
    });

    // Example function to fetch courses in ucourse.js

function fetchCourses() {
    const apiCoursesUrl = '/api/courses/';
    const accessToken = localStorage.getItem('accessToken'); // Retrieve stored token

    const headers = {
        'Content-Type': 'application/json',
    };
    // Add Authorization header ONLY if the token exists (for protected endpoints)
    if (accessToken) {
         headers['Authorization'] = `Bearer ${accessToken}`;
    }

    fetch(apiCoursesUrl, { headers: headers })
    .then(response => {
        if (response.status === 401) { // Handle unauthorized (e.g., token expired)
             console.error("Unauthorized. Token might be expired.");
             // Redirect to login or attempt token refresh
             // refreshToken(); // Implement a function to refresh the token
             return; // Stop processing
        }
        if (!response.ok) {
            throw new Error('Failed to fetch courses');
        }
        return response.json();
    })
    .then(courses => {
        console.log('Courses received:', courses);
        // --- Update your frontend UI ---
        // Clear existing course list
        // Loop through 'courses' array and create HTML elements to display them
        // e.g., update the .courses-grid element
        displayCourses(courses); // Call a function to render the courses
    })
    .catch(error => {
        console.error('Fetch Courses Error:', error);
        // Display an error message to the user
    });
}

// Call fetchCourses when the page loads or as needed
// fetchCourses(); 

function displayCourses(courses) {
     const grid = document.querySelector('.courses-grid');
     if (!grid) return;
     grid.innerHTML = ''; // Clear previous entries
     courses.forEach(course => {
          // Create HTML elements for each course based on your ucourse.html structure
          // Add event listeners etc.
          const courseDiv = document.createElement('div');
          courseDiv.classList.add('course-item', 'available'); // Add 'locked' class based on data later
          courseDiv.innerHTML = `
              <i class="fas fa-play-circle course-icon"></i>
              <h3><span class="math-inline">\{course\.title\}</h3\>

    closeChatButton.addEventListener('click', function() {
        whatsappChatWindow.style.display = 'none'; // Hide the chat window
    });
});
