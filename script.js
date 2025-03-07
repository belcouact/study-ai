document.addEventListener('DOMContentLoaded', () => {
    const userInput = document.getElementById('user-input');
    const submitButton = document.getElementById('submit-button');
    const micButton = document.getElementById('mic-button');
    const output = document.getElementById('output');
    const loading = document.getElementById('loading');
    const checkApiButton = document.getElementById('check-api-button');
    const apiStatus = document.getElementById('api-status');
    const showDiagnosticsButton = document.getElementById('show-diagnostics');
    const diagnosticsPanel = document.getElementById('diagnostics-panel');
    const diagnosticsOutput = document.getElementById('diagnostics-output');
    const directTestButton = document.getElementById('direct-test-button');
    const simpleApiButton = document.getElementById('simple-api-button');
    const speechLanguage = document.getElementById('speech-language');
    const checkEnvButton = document.getElementById('check-env-button');
    const apiFunctionRadios = document.querySelectorAll('input[name="api-function"]');
    
    let diagnosticsData = null;
    let isListening = false;
    let recognitionTimeout = null;
    let currentApiFunction = 'ai-proxy'; // Default

    // API configuration
    // Note: These values are now for reference only and not actually used for API calls
    // The actual values are stored in Netlify environment variables
    const API_BASE_URL = 'https://api.lkeap.cloud.tencent.com/v1';
    const MODEL = 'deepseek-r1';

    // Speech recognition setup
    let recognition = null;
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
        recognition = new (window.SpeechRecognition || window.webkitSpeechRecognition)();
        recognition.continuous = false;
        recognition.interimResults = false;
        
        // Set default language to Chinese (Mandarin)
        recognition.lang = 'zh-CN';
        
        recognition.onresult = (event) => {
            const transcript = event.results[0][0].transcript;
            const confidence = event.results[0][0].confidence;
            
            console.log(`Speech recognized: "${transcript}" (confidence: ${Math.round(confidence * 100)}%)`);
            
            // If confidence is too low, maybe warn the user
            if (confidence < 0.5) {
                console.warn('Low confidence in speech recognition result');
            }
            
            userInput.value += transcript;
            
            // Automatically stop listening after getting a result
            stopListening();
        };

        recognition.onend = () => {
            stopListening();
        };

        recognition.onerror = (event) => {
            console.error('Speech recognition error:', event.error);
            
            // Show a message to the user based on the error
            let errorMessage = '';
            switch (event.error) {
                case 'no-speech':
                    errorMessage = 'No speech detected. Please try again.';
                    break;
                case 'aborted':
                    errorMessage = 'Speech recognition was aborted.';
                    break;
                case 'audio-capture':
                    errorMessage = 'No microphone detected. Please check your device.';
                    break;
                case 'network':
                    errorMessage = 'Network error occurred. Please check your connection.';
                    break;
                case 'not-allowed':
                    errorMessage = 'Microphone access denied. Please allow microphone access.';
                    break;
                case 'service-not-allowed':
                    errorMessage = 'Speech recognition service not allowed.';
                    break;
                default:
                    errorMessage = `Error: ${event.error}`;
            }
            
            // Display the error briefly
            const errorToast = document.createElement('div');
            errorToast.className = 'error-toast';
            errorToast.textContent = errorMessage;
            document.body.appendChild(errorToast);
            
            setTimeout(() => {
                errorToast.classList.add('show');
                setTimeout(() => {
                    errorToast.classList.remove('show');
                    setTimeout(() => {
                        document.body.removeChild(errorToast);
                    }, 300);
                }, 3000);
            }, 10);
            
            stopListening();
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
            if (isListening) {
                stopListening();
            } else {
                startListening();
            }
        }
    });

    speechLanguage.addEventListener('change', () => {
        if (recognition) {
            recognition.lang = speechLanguage.value;
            console.log('Speech recognition language set to:', speechLanguage.value);
        }
    });

    // Add event listener for the check API button
    checkApiButton.addEventListener('click', checkApiConnection);
    
    // Add event listener for the show diagnostics button
    showDiagnosticsButton.addEventListener('click', () => {
        if (diagnosticsPanel.classList.contains('hidden')) {
            diagnosticsPanel.classList.remove('hidden');
            showDiagnosticsButton.textContent = 'Hide Diagnostics';
        } else {
            diagnosticsPanel.classList.add('hidden');
            showDiagnosticsButton.textContent = 'Show Diagnostics';
        }
    });

    // Add event listener for the direct test button
    directTestButton.addEventListener('click', async () => {
        try {
            apiStatus.textContent = 'Running direct API test...';
            apiStatus.className = 'status-checking';
            
            const response = await fetch('/.netlify/functions/direct-api-test');
            const data = await response.json();
            
            console.log('Direct API test results:', data);
            
            // Show diagnostics
            showDiagnosticsButton.classList.remove('hidden');
            diagnosticsPanel.classList.remove('hidden');
            diagnosticsOutput.textContent = JSON.stringify(data, null, 2);
            showDiagnosticsButton.textContent = 'Hide Diagnostics';
            
            apiStatus.textContent = 'Direct API test completed';
            apiStatus.className = 'status-success';
        } catch (error) {
            apiStatus.textContent = `Direct API test failed: ${error.message}`;
            apiStatus.className = 'status-error';
            console.error('Direct API test error:', error);
        }
    });

    // Add event listener for the simple API button
    simpleApiButton.addEventListener('click', async () => {
        const question = userInput.value.trim() || "Hello, how are you?";
        
        try {
            apiStatus.textContent = 'Trying simple API...';
            apiStatus.className = 'status-checking';
            
            const response = await fetch('/.netlify/functions/simple-ai', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ question })
            });
            
            const data = await response.json();
            
            console.log('Simple API response:', data);
            
            if (response.ok) {
                apiStatus.textContent = 'Simple API request successful!';
                apiStatus.className = 'status-success';
                
                // Show the response
                showDiagnosticsButton.classList.remove('hidden');
                diagnosticsPanel.classList.remove('hidden');
                diagnosticsOutput.textContent = JSON.stringify(data, null, 2);
                showDiagnosticsButton.textContent = 'Hide Diagnostics';
            } else {
                apiStatus.textContent = `Simple API failed: ${data.error || 'Unknown error'}`;
                apiStatus.className = 'status-error';
            }
        } catch (error) {
            apiStatus.textContent = `Simple API error: ${error.message}`;
            apiStatus.className = 'status-error';
            console.error('Simple API error:', error);
        }
    });

    // Add event listener for the check environment button
    checkEnvButton.addEventListener('click', async () => {
        try {
            apiStatus.textContent = 'Checking environment variables...';
            apiStatus.className = 'status-checking';
            
            const response = await fetch('/.netlify/functions/check-env');
            const data = await response.json();
            
            console.log('Environment check results:', data);
            
            if (data.status === 'ok') {
                apiStatus.textContent = 'Environment variables are set correctly!';
                apiStatus.className = 'status-success';
            } else {
                apiStatus.textContent = `Environment issue: ${data.message}`;
                apiStatus.className = 'status-error';
            }
            
            // Show diagnostics
            showDiagnosticsButton.classList.remove('hidden');
            diagnosticsPanel.classList.remove('hidden');
            diagnosticsOutput.textContent = JSON.stringify(data, null, 2);
            showDiagnosticsButton.textContent = 'Hide Diagnostics';
        } catch (error) {
            apiStatus.textContent = `Environment check failed: ${error.message}`;
            apiStatus.className = 'status-error';
            console.error('Environment check error:', error);
        }
    });

    apiFunctionRadios.forEach(radio => {
        radio.addEventListener('change', (e) => {
            currentApiFunction = e.target.value;
            console.log(`Switched to ${currentApiFunction} function`);
        });
    });

    // Function to start listening
    function startListening() {
        // Update the language before starting
        recognition.lang = speechLanguage.value;
        console.log('Starting speech recognition in:', recognition.lang);
        
        // Add language indicator to the button
        micButton.setAttribute('data-lang', speechLanguage.options[speechLanguage.selectedIndex].text.split(' ')[0]);
        
        // Clear any existing timeout
        if (recognitionTimeout) {
            clearTimeout(recognitionTimeout);
        }
        
        // Set a timeout to automatically stop listening after 10 seconds
        recognitionTimeout = setTimeout(() => {
            if (isListening) {
                console.log('Speech recognition timed out');
                stopListening();
            }
        }, 10000);
        
        micButton.classList.add('recording');
        isListening = true;
        
        try {
            recognition.start();
        } catch (e) {
            console.error('Speech recognition error:', e);
            stopListening();
        }
    }

    // Function to stop listening
    function stopListening() {
        if (recognitionTimeout) {
            clearTimeout(recognitionTimeout);
            recognitionTimeout = null;
        }
        
        micButton.classList.remove('recording');
        isListening = false;
        
        try {
            recognition.stop();
        } catch (e) {
            console.error('Error stopping speech recognition:', e);
        }
    }

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
            const response = await fetch(`/.netlify/functions/${currentApiFunction}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ question })
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.error || `Request failed with status ${response.status}`);
            }

            const data = await response.json();
            
            // Handle different response formats
            if (data.choices && data.choices[0] && data.choices[0].message) {
                const message = data.choices[0].message;
                // Use content or reasoning_content, whichever is available
                return message.content || message.reasoning_content || "No response content found";
            }
            
            return "Unexpected response format from API";
        } catch (error) {
            console.error('Fetch error details:', error);
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
        showDiagnosticsButton.classList.add('hidden');
        diagnosticsPanel.classList.add('hidden');
        
        try {
            const response = await fetch('/.netlify/functions/api-health', {
                method: 'GET'
            });
            
            const data = await response.json();
            diagnosticsData = data;
            
            if (data.status === 'ok') {
                apiStatus.textContent = 'API connection successful!';
                apiStatus.className = 'status-success';
                console.log('API health check details:', data);
            } else {
                apiStatus.textContent = `API connection failed: ${data.message || 'Unknown error'}`;
                apiStatus.className = 'status-error';
                console.error('API health check failed:', data);
                
                // Show diagnostics button
                showDiagnosticsButton.classList.remove('hidden');
                
                // Display diagnostics
                if (data.diagnostics) {
                    diagnosticsOutput.textContent = JSON.stringify(data.diagnostics, null, 2);
                } else {
                    diagnosticsOutput.textContent = JSON.stringify(data, null, 2);
                }
            }
        } catch (error) {
            apiStatus.textContent = `Connection error: ${error.message}`;
            apiStatus.className = 'status-error';
            console.error('API check error:', error);
        }
    }
}); 