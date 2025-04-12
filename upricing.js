// upricing.js - Modified
document.addEventListener('DOMContentLoaded', function() {

    // Theme Toggle Functionality
    const themeToggle = document.getElementById('theme-toggle');
    const footerThemeToggle = document.getElementById('footer-theme-toggle');
    const body = document.body;
  
    // Check for saved theme preference
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme === 'dark') {  
      body.classList.add('dark-mode'); 
      updateToggleButtons(true); 
    }
  
    // Theme toggle event listeners
    themeToggle.addEventListener('click', toggleTheme);
    footerThemeToggle.addEventListener('click', toggleTheme); 
  
    function toggleTheme() { 
      body.classList.toggle('dark-mode'); 
      const isDarkMode = body.classList.contains('dark-mode');
      localStorage.setItem('theme', isDarkMode ? 'dark' : 'light'); 
      updateToggleButtons(isDarkMode);
    }
   
    function updateToggleButtons(isDarkMode) { 
      const text = isDarkMode ? 'Light Mode' : 'Dark Mode';
      themeToggle.textContent = text;  
      if(footerThemeToggle){  
        footerThemeToggle.textContent = text; 
      }  
    }
  
    // Smooth scrolling for contact link  
    document.querySelectorAll('a[href^="#"]').forEach(anchor => { 
      anchor.addEventListener('click', function(e) { 
        e.preventDefault();  
        const targetId = this.getAttribute('href');  
        if (targetId === '#') return; 
        const targetElement = document.querySelector(targetId);
        if (targetElement) {  
          targetElement.scrollIntoView({  
            behavior: 'smooth'  
          })  
        } 
      });
    }); 
  
    // Contact form submission
    const contactForm = document.getElementById('contactForm'); 
    if (contactForm) {
      contactForm.addEventListener('submit', function(e) {
        e.preventDefault();
  
  
  
        // Form validation
        const name = document.getElementById('name').value.trim(); 
        const email = document.getElementById('email').value.trim(); 
        const message = document.getElementById('message').value.trim();  
        if (!name || !email || !message) {  
          alert('Please fill in all required fields.');  
          return;  
        } 

        // Simulate form submission 
        alert('Thank you for your message! We will get back to you soon.'); 
        this.reset();  
      }); 
    }
  
    // Scroll to contact function for Enterprise button  
    window.scrollToContact = function() {  
      document.getElementById('contact-section').scrollIntoView({  
        behavior: 'smooth' 
      });
    };
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
  
