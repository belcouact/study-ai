/**
 * Navigation script for handling navigation between different sections
 */

document.addEventListener('DOMContentLoaded', () => {
    // DOM elements
    const sidebar = document.querySelector('.left-panel');
    const sidebarToggle = document.getElementById('sidebar-toggle');
    const homeButton = document.getElementById('home-button');
    const qaButton = document.getElementById('qa-button');
    const quizButton = document.getElementById('quiz-button');
    const mathButton = document.getElementById('math-button');
    const chineseButton = document.getElementById('chinese-button');
    const englishButton = document.getElementById('english-button');
    const historyButton = document.getElementById('history-button');
    const aboutLink = document.getElementById('about-link');
    const aboutModalOverlay = document.getElementById('about-modal-overlay');
    const aboutModalClose = document.getElementById('about-modal-close');
    
    // Containers
    const homeContainer = document.getElementById('home-container');
    const qaContainer = document.getElementById('qa-container');
    const quizContainer = document.getElementById('quiz-container');
    
    // Sidebar toggle
    sidebarToggle.addEventListener('click', () => {
        sidebar.classList.toggle('hidden');
        sidebarToggle.classList.toggle('collapsed');
    });
    
    // Initialize on small screens
    function initMobileLayout() {
        if (window.innerWidth < 576) {
            sidebar.classList.add('hidden');
            sidebarToggle.classList.add('collapsed');
        } else {
            sidebar.classList.remove('hidden');
            sidebarToggle.classList.remove('collapsed');
        }
    }
    
    // Resize handler
    window.addEventListener('resize', initMobileLayout);
    initMobileLayout();
    
    // Navigation functions
    function setActiveButton(button) {
        // Remove active class from all buttons
        document.querySelectorAll('.panel-button').forEach(btn => {
            btn.classList.remove('active');
        });
        
        // Add active class to clicked button
        button.classList.add('active');
    }
    
    function showContainer(container) {
        // Hide all containers
        document.querySelectorAll('.container').forEach(cont => {
            cont.classList.remove('active');
            cont.classList.add('hidden');
        });
        
        // Show selected container
        container.classList.remove('hidden');
        container.classList.add('active');
    }
    
    // Navigation event listeners
    homeButton.addEventListener('click', () => {
        setActiveButton(homeButton);
        showContainer(homeContainer);
    });
    
    qaButton.addEventListener('click', () => {
        setActiveButton(qaButton);
        showContainer(qaContainer);
    });
    
    quizButton.addEventListener('click', () => {
        setActiveButton(quizButton);
        showContainer(quizContainer);
    });
    
    // Subject buttons navigation (external links)
    mathButton.addEventListener('click', () => {
        window.location.href = 'subjects/math/main.html';
    });
    
    chineseButton.addEventListener('click', () => {
        window.location.href = 'subjects/chinese/main.html';
    });
    
    englishButton.addEventListener('click', () => {
        window.location.href = 'subjects/english/main.html';
    });
    
    historyButton.addEventListener('click', () => {
        window.location.href = 'subjects/history/main.html';
    });
    
    // Feature card navigation
    window.navigateTo = function(destination) {
        if (destination === 'qa-container') {
            setActiveButton(qaButton);
            showContainer(qaContainer);
        } else if (destination === 'quiz-container') {
            setActiveButton(quizButton);
            showContainer(quizContainer);
        } else {
            // External navigation
            window.location.href = destination;
        }
    };
    
    // About modal
    aboutLink.addEventListener('click', (e) => {
        e.preventDefault();
        aboutModalOverlay.classList.add('active');
    });
    
    aboutModalClose.addEventListener('click', () => {
        aboutModalOverlay.classList.remove('active');
    });
    
    // Close modal when clicking outside
    aboutModalOverlay.addEventListener('click', (e) => {
        if (e.target === aboutModalOverlay) {
            aboutModalOverlay.classList.remove('active');
        }
    });
    
    // Escape key to close modal
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && aboutModalOverlay.classList.contains('active')) {
            aboutModalOverlay.classList.remove('active');
        }
    });
}); 