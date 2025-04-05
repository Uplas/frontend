document.addEventListener('DOMContentLoaded', function() {
    // Dark Mode Toggle (Consistent with Homepage)
    const themeToggle = document.getElementById('theme-toggle');
    const body = document.body;
    const savedDarkMode = localStorage.getItem('darkMode'); // Using 'darkMode' key

    if (savedDarkMode === 'true') {
        body.classList.add('dark-mode');
        themeToggle.textContent = 'Light Mode';
        themeToggle.setAttribute('aria-label', 'Switch to Light Mode');
    } else {
        body.classList.remove('dark-mode');
        themeToggle.textContent = 'Dark Mode';
        themeToggle.setAttribute('aria-label', 'Switch to Dark Mode');
    }

    themeToggle.addEventListener('click', function() {
        body.classList.toggle('dark-mode');
        const isDarkMode = body.classList.contains('dark-mode');
        themeToggle.textContent = isDarkMode ? 'Light Mode' : 'Dark Mode';
        themeToggle.setAttribute('aria-label', isDarkMode ? 'Switch to Light Mode' : 'Switch to Dark Mode');
        localStorage.setItem('darkMode', isDarkMode); // Using 'darkMode' key
    });

    // Search Functionality
    const searchInput = document.getElementById('search-input');
    const searchButton = document.getElementById('search-button');
    const blogPosts = document.querySelectorAll('.blog-post-preview');

    function filterBlogPosts() {
        const searchTerm = searchInput.value.toLowerCase();

        blogPosts.forEach(post => {
            const title = post.querySelector('h2').textContent.toLowerCase();
            const content = post.querySelector('.post-excerpt').textContent.toLowerCase(); // Using the class

            if (title.includes(searchTerm) || content.includes(searchTerm)) {
                post.style.display = 'flex'; // Show the post if it matches
            } else {
                post.style.display = 'none'; // Hide the post if it doesn't match
            }
        });
    }

    // Event listener for input changes (real-time filtering)
    searchInput.addEventListener('input', filterBlogPosts);

    // Optional: Event listener for button click (if you want search only on click)
    // searchButton.addEventListener('click', filterBlogPosts);
});