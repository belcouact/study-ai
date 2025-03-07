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
    const debugResponseButton = document.getElementById('debug-response-button');
    const fallbackButton = document.getElementById('fallback-button');
    const retryButton = document.getElementById('retry-button');
    const modelSelect = document.getElementById('model-select');
    const characterCount = document.querySelector('.character-count');
    const testFunctionButton = document.getElementById('test-function-button');
    
    let diagnosticsData = null;
    let isListening = false;
    let recognitionTimeout = null;
    let currentApiFunction = 'ai-proxy'; // Default
    let lastRawResponse = null;
    let lastQuestion = null;
    let currentModel = 'deepseek-r1';

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
            
            // Clear any previous response
            output.innerHTML = '<p class="welcome-message">Switched to ' + currentApiFunction + '. Ask me anything!</p>';
        });
    });

    modelSelect.addEventListener('change', () => {
        currentModel = modelSelect.value;
        console.log('Model changed to:', currentModel);
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
        
        try {
            // Show loading state
            loading.classList.remove('hidden');
            output.innerHTML = '';
            
            console.log('Sending request to simple-ai function');
            
            // Add a timeout for the fetch request
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout
            
            const response = await fetch('/.netlify/functions/simple-ai', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ question }),
                signal: controller.signal
            });
            
            // Clear the timeout
            clearTimeout(timeoutId);
            
            console.log('Response received:', response.status);
            
            let data;
            try {
                data = await response.json();
                console.log('Response data:', data);
            } catch (parseError) {
                console.error('Error parsing response:', parseError);
                output.innerHTML = `<div class="error-message">Error parsing response: ${parseError.message}</div>`;
                return;
            }
            
            if (!response.ok) {
                output.innerHTML = `<div class="error-message">Error: ${data.error || response.status}</div>`;
                return;
            }
            
            // Extract and display content
            let content = "No content found in response";
            
            if (data.choices && data.choices[0] && data.choices[0].message) {
                const message = data.choices[0].message;
                if (message.content) {
                    content = message.content;
                } else if (message.reasoning_content) {
                    content = message.reasoning_content;
                }
            }
            
            output.innerHTML = `<div class="ai-message">${formatResponse(content)}</div>`;
            
        } catch (error) {
            console.error('Error:', error);
            
            if (error.name === 'AbortError') {
                output.innerHTML = `<div class="error-message">Request timed out. The server might be overloaded.</div>`;
            } else {
                output.innerHTML = `<div class="error-message">Error: ${error.message}</div>`;
            }
        } finally {
            // Hide loading state
            loading.classList.add('hidden');
        }
    }

    // Function to extract content from various response formats
    function extractContentFromResponse(data) {
        // Try to extract from standard OpenAI format
        if (data.choices && data.choices[0] && data.choices[0].message) {
            const message = data.choices[0].message;
            if (message.content) return message.content;
            if (message.reasoning_content) {
                // Sometimes reasoning_content might be truncated
                if (message.reasoning_content.length < 20) {
                    return `The AI started to respond but was cut off. Here's what it said: "${message.reasoning_content}"\n\nPlease try asking again or rephrasing your question.`;
                }
                return message.reasoning_content;
            }
        }
        
        // Try to extract from simple-ai format
        if (data.success && data.data) {
            return extractContentFromResponse(data.data);
        }
        
        // Try to extract from other possible formats
        if (data.message && data.message.content) {
            return data.message.content;
        }
        
        if (data.content) {
            return data.content;
        }
        
        if (data.text) {
            return data.text;
        }
        
        // If we can't find a standard format, return a message with the raw data
        return "Couldn't extract content from response. Raw data: " + JSON.stringify(data);
    }

    // Add this at the top of your script
    const responseCache = {};

    // Function to fetch response from the API
    async function fetchAIResponse(question) {
        // Check cache first (only if not in development mode)
        const cacheKey = question.trim().toLowerCase();
        if (!window.location.hostname.includes('localhost') && responseCache[cacheKey]) {
            console.log('Using cached response for:', cacheKey);
            return responseCache[cacheKey];
        }
        
        try {
            // Show loading state
            loading.classList.remove('hidden');
            
            // Add a timeout for the fetch request
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout
            
            const response = await fetch(`/.netlify/functions/${currentApiFunction}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ 
                    question,
                    model: currentModel // Pass the selected model
                }),
                signal: controller.signal
            });
            
            // Clear the timeout
            clearTimeout(timeoutId);

            if (!response.ok) {
                let errorMessage = `Request failed with status ${response.status}`;
                try {
                    const errorData = await response.json();
                    errorMessage = errorData.error || errorMessage;
                    console.error('API error details:', errorData);
                } catch (e) {
                    // If we can't parse the error as JSON, just use the status message
                }
                throw new Error(errorMessage);
            }

            const data = await response.json();
            console.log('API response data:', data);
            
            // Store the raw response for debugging
            lastRawResponse = data;
            debugResponseButton.classList.remove('hidden');
            
            // Extract content
            const content = extractContentFromResponse(data);
            
            // Cache the response
            responseCache[cacheKey] = content;
            
            return content;
        } catch (error) {
            console.error('Fetch error details:', error);
            
            // Check for timeout/abort errors
            if (error.name === 'AbortError') {
                return "The request took too long and was aborted. Please try again or try a different question.";
            }
            
            throw error;
        } finally {
            // Hide loading state
            loading.classList.add('hidden');
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

    // Add event listener for the debug button
    debugResponseButton.addEventListener('click', () => {
        if (lastRawResponse) {
            // Show the raw response in the diagnostics panel
            diagnosticsPanel.classList.remove('hidden');
            diagnosticsOutput.textContent = JSON.stringify(lastRawResponse, null, 2);
            showDiagnosticsButton.textContent = 'Hide Diagnostics';
            showDiagnosticsButton.classList.remove('hidden');
        }
    });

    // Add event listener for the fallback button
    fallbackButton.addEventListener('click', async () => {
        const question = userInput.value.trim();
        if (!question) {
            alert('Please enter a question first.');
            return;
        }
        
        try {
            // Show loading state
            loading.classList.remove('hidden');
            output.innerHTML = '';
            
            // Generate a local fallback response
            const response = generateLocalResponse(question);
            
            // Format and display the response
            const formattedResponse = formatResponse(response);
            output.innerHTML = `<div class="ai-message">${formattedResponse}</div>`;
        } catch (error) {
            console.error('Error generating fallback response:', error);
            output.innerHTML = `<div class="error-message">Error: ${escapeHTML(error.message)}</div>`;
        } finally {
            // Hide loading state
            loading.classList.add('hidden');
        }
    });

    // Function to generate a local response
    function generateLocalResponse(question) {
        question = question.toLowerCase();
        
        // Simple pattern matching for common questions
        if (question.includes('hello') || question.includes('hi ')) {
            return "Hello! I'm a local fallback assistant. The main AI service is currently unavailable, but I can help with basic questions.";
        }
        
        if (question.includes('how are you')) {
            return "I'm functioning as a fallback service since the main AI is unavailable. I can only provide simple responses.";
        }
        
        if (question.includes('what is') || question.includes('who is') || question.includes('explain')) {
            const searchTerm = question.replace(/what is|who is|explain/gi, '').trim();
            return `I'm sorry, I can't provide detailed information about "${searchTerm}" in fallback mode. 

You might want to try:
1. Searching for "${searchTerm}" on Google
2. Checking Wikipedia for information about "${searchTerm}"
3. Trying again later when the main AI service is available`;
        }
        
        // Default response
        return `I'm currently operating in fallback mode because the main AI service is unavailable. 

The API connection issue could be due to:
1. The API server might be down or unreachable
2. There might be network connectivity issues
3. The API credentials might be incorrect

Your question was: "${question}"

While I can't provide a detailed answer right now, you might want to:
1. Try again later
2. Search for this information on Google
3. Contact the site administrator if the problem persists`;
    }

    // Add event listener for retry button
    retryButton.addEventListener('click', async () => {
        if (lastQuestion) {
            retryButton.classList.add('hidden');
            output.innerHTML = '';
            
            // Try with the other API function
            const currentFunction = currentApiFunction;
            currentApiFunction = currentFunction === 'ai-proxy' ? 'simple-ai' : 'ai-proxy';
            
            // Show what we're doing
            output.innerHTML = `<div class="system-message">Retrying with ${currentApiFunction}...</div>`;
            
            // Resubmit the question
            try {
                const response = await fetchAIResponse(lastQuestion);
                const formattedResponse = formatResponse(response);
                output.innerHTML = `<div class="ai-message">${formattedResponse}</div>`;
            } catch (error) {
                output.innerHTML = `<div class="error-message">Error: ${escapeHTML(error.message)}</div>`;
                retryButton.classList.remove('hidden');
                
                // Switch back to original function
                currentApiFunction = currentFunction;
            }
        }
    });

    userInput.addEventListener('input', () => {
        const count = userInput.value.length;
        characterCount.textContent = `${count} characters`;
        
        // Add warning if getting close to limits
        if (count > 2000) {
            characterCount.classList.add('warning');
        } else {
            characterCount.classList.remove('warning');
        }
    });

    testFunctionButton.addEventListener('click', async () => {
        try {
            output.innerHTML = '<div>Testing Netlify function...</div>';
            
            // Try to fetch the test function with a timeout
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 5000);
            
            const response = await fetch('/.netlify/functions/test', {
                signal: controller.signal
            });
            
            clearTimeout(timeoutId);
            
            // Log the raw response
            console.log('Raw response:', response);
            
            // Try to get the text content
            const text = await response.text();
            console.log('Response text:', text);
            
            output.innerHTML = `<div>Test function response: ${text}</div>`;
        } catch (error) {
            console.error('Test function error:', error);
            output.innerHTML = `<div class="error-message">Test function error: ${error.message}</div>`;
        }
    });
}); 