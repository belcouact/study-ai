document.addEventListener('DOMContentLoaded', () => {
    const userInput = document.getElementById('user-input');
    const submitButton = document.getElementById('submit-button');
    const micButton = document.getElementById('mic-button');
    const output = document.getElementById('output');
    const loading = document.getElementById('loading');
    const checkApiButton = document.getElementById('check-api-button');
    const apiStatus = document.getElementById('api-status');

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

    // Add event listener for the check API button
    checkApiButton.addEventListener('click', checkApiConnection);

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

    // Function to fetch response from the API
    async function fetchAIResponse(question) {
        try {
            const response = await fetch('/.netlify/functions/ai-proxy', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ question }),
                timeout: 30000 // 30 second timeout
            });

            const data = await response.json();
            
            if (!response.ok) {
                console.error('API error details:', data);
                throw new Error(data.error || `Request failed with status ${response.status}`);
            }

            return data.choices[0].message.content;
        } catch (error) {
            console.error('Fetch error details:', error);
            
            // If we're in development or testing, provide a fallback response
            if (window.location.hostname === 'localhost' || 
                window.location.hostname === '127.0.0.1' ||
                window.location.hostname.includes('netlify.app')) {
                console.log('Using fallback response due to API error');
                return `I'm sorry, I couldn't connect to the AI service at this time. This could be due to:
                
1. API connectivity issues
2. Rate limiting
3. Invalid API credentials

Error details: ${error.message}

Please try again later or contact the site administrator.`;
            }
            
            throw error;
        }
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

    // Function to check API connection
    async function checkApiConnection() {
        apiStatus.textContent = 'Checking connection...';
        apiStatus.className = 'status-checking';
        
        try {
            const response = await fetch('/.netlify/functions/api-health', {
                method: 'GET'
            });
            
            const data = await response.json();
            
            if (response.ok) {
                apiStatus.textContent = 'API connection successful!';
                apiStatus.className = 'status-success';
                console.log('API health check details:', data);
            } else {
                apiStatus.textContent = `API connection failed: ${data.message || 'Unknown error'}`;
                apiStatus.className = 'status-error';
                console.error('API health check failed:', data);
            }
        } catch (error) {
            apiStatus.textContent = `Connection error: ${error.message}`;
            apiStatus.className = 'status-error';
            console.error('API check error:', error);
        }
    }
}); 