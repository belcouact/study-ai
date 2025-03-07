document.addEventListener('DOMContentLoaded', () => {
    const userInput = document.getElementById('user-input');
    const submitButton = document.getElementById('submit-button');
    const micButton = document.getElementById('mic-button');
    const output = document.getElementById('output');
    const loading = document.getElementById('loading');

    // API configuration
    const API_KEY = 'sk-ee8971509c3446129f6c0b43ee362e13a4a642pjsvzv199t';
    const API_URL = 'https://ai-gateway.vei.volces.com/v1/chat/completions';
    const MODEL = 'deepseek-reasoner';

    // Speech recognition setup
    let recognition = null;
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
        recognition = new (window.SpeechRecognition || window.webkitSpeechRecognition)();
        recognition.continuous = false;
        recognition.interimResults = false;
        recognition.lang = 'en-US';

        recognition.onresult = (event) => {
            const transcript = event.results[0][0].transcript;
            userInput.value += transcript;
        };

        recognition.onend = () => {
            micButton.classList.remove('recording');
        };

        recognition.onerror = (event) => {
            console.error('Speech recognition error:', event.error);
            micButton.classList.remove('recording');
        };
    } else {
        micButton.style.display = 'none';
        console.log('Speech recognition not supported in this browser');
    }

    // Event listeners
    submitButton.addEventListener('click', handleSubmit);
    userInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && e.ctrlKey) {
            e.preventDefault();
            handleSubmit();
        }
    });

    micButton.addEventListener('click', () => {
        if (recognition) {
            if (micButton.classList.contains('recording')) {
                recognition.stop();
            } else {
                micButton.classList.add('recording');
                recognition.start();
            }
        }
    });

    // Function to handle form submission
    async function handleSubmit() {
        const question = userInput.value.trim();
        if (!question) return;

        // Show loading indicator
        output.innerHTML = '';
        loading.classList.remove('hidden');
        
        try {
            const response = await fetchAIResponse(question);
            
            // Hide loading indicator
            loading.classList.add('hidden');
            
            // Display the response
            output.innerHTML = `<p><strong>You:</strong> ${escapeHTML(question)}</p>
                               <p><strong>AI:</strong> ${formatResponse(response)}</p>`;
            
            // Clear input
            userInput.value = '';
            
        } catch (error) {
            loading.classList.add('hidden');
            output.innerHTML = `<p class="error">Error: ${error.message}</p>
                               <p class="error-details">Please check the console for more details.</p>`;
            console.error('Error details:', error);
        }
    }

    // Function to fetch response from the API (test with OpenAI)
    async function fetchAIResponse(question) {
        // For testing only - replace with your actual implementation
        return "This is a test response to verify that the UI is working correctly. The actual API connection needs to be fixed.";
    }

    // Helper function to escape HTML
    function escapeHTML(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    // Function to format the response with basic markdown support
    function formatResponse(text) {
        // This is a simple implementation - for a more robust solution, consider using a markdown library
        return text
            // Code blocks
            .replace(/```([\s\S]*?)```/g, '<pre><code>$1</code></pre>')
            // Inline code
            .replace(/`([^`]+)`/g, '<code>$1</code>')
            // Bold
            .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
            // Italic
            .replace(/\*(.*?)\*/g, '<em>$1</em>')
            // Line breaks
            .replace(/\n/g, '<br>');
    }
}); 