document.addEventListener('DOMContentLoaded', () => {
    // Core elements that definitely exist
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
    const debugResponseButton = document.getElementById('debug-response-button');
    
    // Optional elements - may not exist in all versions of the HTML
    const directTestButton = document.getElementById('direct-test-button');
    const simpleApiButton = document.getElementById('simple-api-button');
    const checkEnvButton = document.getElementById('check-env-button');
    const apiFunctionRadios = document.querySelectorAll('input[name="api-function"]');
    const fallbackButton = document.getElementById('fallback-button');
    const modelSelect = document.getElementById('model-select');

    let diagnosticsData = null;
    let isListening = false;
    let recognitionTimeout = null;
    let currentApiFunction = 'simple-ai'; // Default to simple-ai instead of ai-proxy
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
        
        recognition.onresult = (event) => {
            const transcript = event.results[0][0].transcript;
            const confidence = event.results[0][0].confidence;
            
            console.log(`Speech recognized: "${transcript}" (confidence: ${Math.round(confidence * 100)}%)`);
            
            // If confidence is too low, maybe warn the user
            if (confidence < 0.5) {
                console.warn('Low confidence in speech recognition result');
            }
            
            // Append the transcript to the input
            userInput.value += transcript;
            
            // Update the language detection for next time based on what was just spoken
            const hasChinese = /[\u4e00-\u9fff]/.test(transcript);
            recognition.lang = hasChinese ? 'zh-CN' : 'en-US';
            
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

    micButton.addEventListener('click', (e) => {
        e.preventDefault(); // Prevent any default behavior
        
        if (recognition) {
            if (isListening) {
                stopListening();
            } else {
                startListening();
            }
        } else {
            console.log('Speech recognition not supported in this browser');
            
            // Show error message
            const errorToast = document.createElement('div');
            errorToast.className = 'error-toast';
            errorToast.textContent = 'Speech recognition is not supported in this browser.';
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

    // Add event listeners for optional elements only if they exist
    if (directTestButton) {
        directTestButton.addEventListener('click', async () => {
            try {
                apiStatus.textContent = 'Running direct API test...';
                apiStatus.className = 'status-checking';
                
                const response = await fetch('/api/direct-api-test');
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
    }

    // Add event listener for the simple API button
    if (simpleApiButton) {
        simpleApiButton.addEventListener('click', async () => {
            const question = userInput.value.trim() || "Hello, how are you?";
            
            if (!question) {
                alert('Please enter a question first.');
                return;
            }
            
            try {
                // Show loading state
                loading.classList.remove('hidden');
                output.innerHTML = '';
                
                const response = await fetch('/api/simple-ai', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({ question })
                });
                
                const data = await response.json();
                console.log('Simple API response:', data);
                
                // Format and display the response
                const content = extractContentFromResponse(data);
                output.innerHTML = `<div class="ai-message">${formatResponse(content)}</div>`;
            } catch (error) {
                console.error('Simple API error:', error);
                output.innerHTML = `<div class="error-message">Error: ${error.message}</div>`;
            } finally {
                // Hide loading state
                loading.classList.add('hidden');
            }
        });
    }

    // Add event listener for the check environment button
    if (checkEnvButton) {
        checkEnvButton.addEventListener('click', async () => {
            try {
                apiStatus.textContent = 'Checking environment...';
                apiStatus.className = 'status-checking';
                
                const response = await fetch('/api/check-env');
                const data = await response.json();
                
                console.log('Environment check results:', data);
                
                // Show diagnostics
                showDiagnosticsButton.classList.remove('hidden');
                diagnosticsPanel.classList.remove('hidden');
                diagnosticsOutput.textContent = JSON.stringify(data, null, 2);
                showDiagnosticsButton.textContent = 'Hide Diagnostics';
                
                if (data.status === 'ok') {
                    apiStatus.textContent = 'Environment check completed';
                    apiStatus.className = 'status-success';
                } else {
                    apiStatus.textContent = `Environment check failed: ${data.message || 'Unknown error'}`;
                    apiStatus.className = 'status-error';
                }
            } catch (error) {
                apiStatus.textContent = `Environment check failed: ${error.message}`;
                apiStatus.className = 'status-error';
                console.error('Environment check error:', error);
            }
        });
    }

    // Add event listeners for API function radio buttons
    if (apiFunctionRadios && apiFunctionRadios.length > 0) {
        apiFunctionRadios.forEach(radio => {
            radio.addEventListener('change', (e) => {
                currentApiFunction = e.target.value;
                console.log('API function changed to:', currentApiFunction);
            });
        });
    }

    // Add event listener for model select if it exists
    if (modelSelect) {
        modelSelect.addEventListener('change', () => {
            currentModel = modelSelect.value;
            console.log('Model changed to:', currentModel);
        });
    }

    // Function to start listening
    function startListening() {
        if (recognition) {
            try {
                // Auto-detect language based on the current input
                const inputText = userInput.value.trim();
                
                // Simple detection: if there are Chinese characters, use Chinese, otherwise English
                const hasChinese = /[\u4e00-\u9fff]/.test(inputText);
                recognition.lang = hasChinese ? 'zh-CN' : 'en-US';
                
                // Start recognition
                recognition.start();
                isListening = true;
                
                // Update UI - use lowercase for English
                micButton.classList.add('recording');
                micButton.setAttribute('data-lang', hasChinese ? '中文' : 'english');
                
                // Set a timeout to automatically stop listening after 10 seconds
                if (recognitionTimeout) {
                    clearTimeout(recognitionTimeout);
                }
                recognitionTimeout = setTimeout(() => {
                    if (isListening) {
                        stopListening();
                    }
                }, 10000);
                
                console.log('Speech recognition started with auto-detected language:', recognition.lang);
            } catch (error) {
                console.error('Error starting speech recognition:', error);
                stopListening();
                
                // Show error message
                const errorToast = document.createElement('div');
                errorToast.className = 'error-toast';
                errorToast.textContent = `Error starting speech recognition: ${error.message}`;
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
            }
        }
    }

    // Function to stop listening
    function stopListening() {
        if (recognition) {
            try {
                recognition.stop();
            } catch (error) {
                console.error('Error stopping speech recognition:', error);
            }
            
            isListening = false;
            micButton.classList.remove('recording');
            
            if (recognitionTimeout) {
                clearTimeout(recognitionTimeout);
                recognitionTimeout = null;
            }
            
            console.log('Speech recognition stopped');
        }
    }

    // Function to handle form submission
    async function handleSubmit() {
        const question = userInput.value.trim();
        if (!question) return;
        
        // Update status to indicate we're processing
        apiStatus.textContent = 'Submitting question...';
        apiStatus.className = 'status-checking';
        showDiagnosticsButton.classList.add('hidden');
        diagnosticsPanel.classList.add('hidden');
        
        // Check if streaming mode is enabled
        const streamingModeEnabled = document.getElementById('streaming-mode').checked;
        
        if (streamingModeEnabled) {
            // Use streaming API
            try {
                // Hide the standard loading indicator since we'll use the streaming one
                loading.classList.add('hidden');
                
                // Call the streaming API
                await callStreamingAPI(question, output);
                
                // Clear input after successful submission
                userInput.value = '';
                
                // Update status to indicate success
                apiStatus.textContent = 'Connected';
                apiStatus.className = 'status-success';
            } catch (error) {
                console.error('Error calling streaming API:', error);
                output.innerHTML = `<div class="error">Error: ${error.message}</div>`;
                
                // Update status to indicate error
                apiStatus.textContent = 'Error';
                apiStatus.className = 'status-error';
            }
            return;
        }
        
        // Non-streaming mode - continue with original implementation
        // Show loading state
        loading.classList.remove('hidden');
        output.innerHTML = '';
        
        // Create a controller for the timeout
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 15000); // Reduce timeout to 15 seconds to avoid waiting too long
        
        try {
            // Skip the CORS proxy attempt since it's failing
            console.log('Using Netlify function as proxy...');
            
            // Set up a timer to show a preliminary response if the request takes too long
            const fallbackTimer = setTimeout(() => {
                // If we're still waiting after 5 seconds, show a preliminary response
                if (loading.classList.contains('hidden')) return; // Already completed
                
                console.log('Request taking longer than expected, showing preliminary response');
                const preliminaryResponse = "I'm processing your question. This might take a moment...";
                
                output.innerHTML = `
                    <div class="system-message">
                        <p>Your request is taking longer than expected. Here's a preliminary response while you wait:</p>
                    </div>
                    <div class="ai-message">${formatResponse(preliminaryResponse)}</div>
                `;
                
                // Keep the loading indicator visible
                loading.classList.remove('hidden');
            }, 5000);
            
            // Use the Netlify function with the new path
            const response = await fetch('/api/simple-ai', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ 
                    question,
                    model: currentModel || 'deepseek-r1'
                }),
                signal: controller.signal
            });
            
            // Clear the fallback timer
            clearTimeout(fallbackTimer);
            
            // Check if the response is ok
            if (!response.ok) {
                let errorMessage = `Server returned status ${response.status}`;
                let errorDetails = '';
                let errorData = null;
                
                try {
                    // Try to parse the error response as JSON
                    errorData = await response.json();
                    errorDetails = JSON.stringify(errorData, null, 2);
                    console.error('Server error details:', errorData);
                    
                    if (errorData.error) {
                        errorMessage = errorData.error;
                    }
                } catch (parseError) {
                    // If we can't parse as JSON, try to get the text
                    try {
                        errorDetails = await response.text();
                    } catch (textError) {
                        errorDetails = 'Could not retrieve error details';
                    }
                }
                
                // Update status
                apiStatus.textContent = `Request failed: ${errorMessage}`;
                apiStatus.className = 'status-error';
                
                // Show diagnostics button
                showDiagnosticsButton.classList.remove('hidden');
                diagnosticsOutput.textContent = errorDetails;
                
                // Check for Lambda timeout error
                if (response.status === 502 && errorData && errorData.errorType === 'Sandbox.Timedout') {
                    console.log('Lambda function timed out, using local fallback response');
                    
                    // Use local fallback for timeout errors
                    const fallbackResponse = generateLocalResponse(question);
                    
                    output.innerHTML = `
                        <div class="system-message">
                            <p>The server request timed out after 10 seconds. Here's a simplified response:</p>
                        </div>
                        <div class="ai-message">${formatResponse(fallbackResponse)}</div>
                    `;
                    
                    // Store the last question
                    lastQuestion = question;
                    return;
                }
                
                // Display appropriate error message based on status code
                if (response.status === 502) {
                    output.innerHTML = `
                        <div class="error-message">
                            <h3>Server Error (502 Bad Gateway)</h3>
                            <p>The server encountered an error while processing your request.</p>
                            <p>This might be due to:</p>
                            <ul>
                                <li>The API service being temporarily unavailable</li>
                                <li>High traffic or server load</li>
                                <li>Network issues between our server and the API</li>
                            </ul>
                            <p>Please try again in a few moments.</p>
                        </div>
                    `;
                } else {
                    output.innerHTML = `
                        <div class="error-message">
                            <h3>Request Failed (${response.status})</h3>
                            <p>Error: ${errorMessage}</p>
                        </div>
                    `;
                }
                
                throw new Error(`Server returned status ${response.status}: ${errorMessage}`);
            }
            
            // Parse the successful response
            const data = await response.json();
            diagnosticsData = data; // Store for diagnostics
            
            // Process successful response
            handleSuccessfulResponse(data, question);
            
        } catch (error) {
            // Handle all errors
            console.error('Request failed:', error);
            
            // Check if this is an abort error (timeout)
            if (error.name === 'AbortError') {
                console.log('Request timed out, using local fallback response');
                
                // Use local fallback for timeout errors
                const fallbackResponse = generateLocalResponse(question);
                
                // Update status
                apiStatus.textContent = 'Using local fallback due to timeout';
                apiStatus.className = 'status-error';
                
                output.innerHTML = `
                    <div class="system-message">
                        <p>The request timed out, so I'm providing a local response:</p>
                    </div>
                    <div class="ai-message">${formatResponse(fallbackResponse)}</div>
                `;
                
                // Store the last question
                lastQuestion = question;
            } 
            // Only update UI if it wasn't already updated by the error handling above
            else if (apiStatus.className !== 'status-error') {
                apiStatus.textContent = `Error: ${error.message}`;
                apiStatus.className = 'status-error';
                
                output.innerHTML = `
                    <div class="error-message">
                        <h3>Request Error</h3>
                        <p>Error: ${error.message}</p>
                        <p>Please check your internet connection and try again.</p>
                    </div>
                `;
            }
            
            lastQuestion = question;
        } finally {
            // Clear the timeout
            clearTimeout(timeoutId);
            
            // Hide loading state
            loading.classList.add('hidden');
        }
    }
    
    // Helper function to handle successful responses
    function handleSuccessfulResponse(data, question) {
        // Update status
        apiStatus.textContent = 'Request successful!';
        apiStatus.className = 'status-success';
        console.log('API response details:', data);
        
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
        
        // Store the last question for retry functionality
        lastQuestion = question;
        
        // Store the raw response for debugging
        lastRawResponse = data;
        debugResponseButton.classList.remove('hidden');
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

    // Function to fetch AI response
    async function fetchAIResponse(question) {
        if (!question) throw new Error('Question is required');
        
        // Show loading state
        loading.classList.remove('hidden');
        
        try {
            // Create a cache key
            const cacheKey = `${currentApiFunction}:${question}`;
            
            // Check if we have a cached response
            if (responseCache[cacheKey]) {
                console.log('Using cached response');
                return responseCache[cacheKey];
            }
            
            // Create a controller for the timeout
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 90000); // 90 seconds timeout
            
            // Make the request
            const response = await fetch(`/api/${currentApiFunction}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ 
                    question,
                    model: currentModel
                }),
                signal: controller.signal
            });
            
            // Clear the timeout
            clearTimeout(timeoutId);
            
            // Check if the response was successful
            if (!response.ok) {
                let errorMessage = `Error: ${response.status} ${response.statusText}`;
                
                try {
                    // Try to get more details from the error response
                    const errorData = await response.json();
                    if (errorData.error) errorMessage = errorData.error;
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
        
        const startTime = Date.now();
        
        try {
            console.log('Starting API health check at', new Date().toISOString());
            
            // Set up a timeout for the health check
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 15000); // 15 second timeout
            
            try {
                const response = await fetch('/api/api-health', {
                    method: 'GET',
                    signal: controller.signal
                });
                
                // Clear the timeout
                clearTimeout(timeoutId);
                
                const endTime = Date.now();
                const responseTime = endTime - startTime;
                console.log(`API health check response time: ${responseTime}ms`);
                
                const data = await response.json();
                diagnosticsData = data;
                
                // Add response time to the diagnostics data
                diagnosticsData.responseTime = responseTime;
                
                if (data.status === 'ok') {
                    apiStatus.textContent = `API connection successful! (${responseTime}ms)`;
                    apiStatus.className = 'status-success';
                    console.log('API health check details:', data);
                    
                    // Add a warning if response time is close to the Lambda timeout
                    if (responseTime > 5000) {
                        apiStatus.textContent += ' (Warning: Slow response)';
                        console.warn(`API health check response time (${responseTime}ms) is more than 5 seconds, which is close to the Lambda timeout of 10 seconds.`);
                        
                        // Show diagnostics with performance warning
                        showDiagnosticsButton.classList.remove('hidden');
                        diagnosticsPanel.classList.remove('hidden');
                        diagnosticsOutput.textContent = JSON.stringify({
                            ...data,
                            performance_warning: `Response time (${responseTime}ms) is more than 5 seconds, which is close to the Lambda timeout of 10 seconds. This may cause timeouts for more complex requests.`,
                            recommendations: [
                                "Try using simpler, shorter questions",
                                "The API might be experiencing high load",
                                "Consider trying again during off-peak hours"
                            ]
                        }, null, 2);
                        showDiagnosticsButton.textContent = 'Hide Diagnostics';
                    }
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
            } catch (fetchError) {
                // Clear the timeout
                clearTimeout(timeoutId);
                
                if (fetchError.name === 'AbortError') {
                    throw new Error('API health check timed out after 15 seconds');
                } else {
                    throw fetchError;
                }
            }
        } catch (error) {
            const endTime = Date.now();
            const responseTime = endTime - startTime;
            
            apiStatus.textContent = `Connection error: ${error.message}`;
            apiStatus.className = 'status-error';
            console.error('API check error:', error, `(after ${responseTime}ms)`);
            
            // Show diagnostics button
            showDiagnosticsButton.classList.remove('hidden');
            diagnosticsPanel.classList.remove('hidden');
            
            // Display diagnostics
            diagnosticsOutput.textContent = JSON.stringify({
                error: error.message,
                stack: error.stack,
                responseTime: responseTime,
                timestamp: new Date().toISOString(),
                troubleshooting_tips: [
                    "Check if the Netlify functions are deployed correctly",
                    "Verify that the API credentials are set in the Netlify environment variables",
                    "The API service might be experiencing issues or high load",
                    "There might be network connectivity issues between Netlify and the API"
                ]
            }, null, 2);
            showDiagnosticsButton.textContent = 'Hide Diagnostics';
        }
    }

    // Add event listener for the debug button
    if (debugResponseButton) {
        debugResponseButton.addEventListener('click', () => {
            if (lastRawResponse) {
                // Show the raw response in the diagnostics panel
                diagnosticsPanel.classList.remove('hidden');
                diagnosticsOutput.textContent = JSON.stringify(lastRawResponse, null, 2);
                showDiagnosticsButton.textContent = 'Hide Diagnostics';
                showDiagnosticsButton.classList.remove('hidden');
            }
        });
    }

    // Add event listener for the fallback button
    if (fallbackButton) {
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
    }

    // Function to generate a local response
    function generateLocalResponse(question) {
        question = question.toLowerCase();
        
        // Simple pattern matching for common questions
        if (question.includes('hello') || question.includes('hi ') || question.includes('hey')) {
            return "Hello! I'm a local fallback assistant. The main AI service is currently unavailable, but I can help with basic questions.";
        }
        
        if (question.includes('how are you')) {
            return "I'm functioning as a fallback service since the main AI is unavailable. I can only provide simple responses.";
        }
        
        if (question.includes('thank')) {
            return "You're welcome! I'm happy to help, even in fallback mode. Please try again later when the main AI service is available for more comprehensive assistance.";
        }
        
        if (question.includes('help') || question.includes('can you')) {
            return `I'm currently in fallback mode with limited capabilities. Here's what I can help with:
            
1. Basic greetings and simple responses
2. Suggesting resources for your questions
3. Explaining why the main service might be unavailable

For more complex assistance, please try again later when the main AI service is available.`;
        }
        
        if (question.includes('what time') || question.includes('date') || question.includes('today')) {
            const now = new Date();
            return `I'm in fallback mode, but I can tell you that the current date and time on your device is: ${now.toLocaleString()}`;
        }
        
        if (question.includes('what is') || question.includes('who is') || question.includes('explain') || question.includes('how to') || question.includes('why')) {
            const searchTerm = question
                .replace(/what is|who is|explain|how to|why/gi, '')
                .replace(/\?/g, '')
                .trim();
                
            return `I'm sorry, I can't provide detailed information about "${searchTerm}" in fallback mode. 

You might want to try:
1. Searching for "${searchTerm}" on Google
2. Checking Wikipedia for information about "${searchTerm}"
3. Looking for tutorials on YouTube if you're trying to learn how to do something
4. Trying again later when the main AI service is available`;
        }
        
        // Check for math-related questions
        if (/[0-9+\-*\/=]/.test(question)) {
            return `It looks like you might be asking about a calculation. In fallback mode, I can't perform calculations, but you can:

1. Use your device's calculator app
2. Try Google's calculator by typing your expression in the search bar
3. Try again later when the main AI service is available`;
        }
        
        // Default response
        return `I'm currently operating in fallback mode because the main AI service is unavailable or timed out. 

The API connection issue could be due to:
1. The API server might be experiencing high traffic or temporary issues
2. The request might be taking longer than the allowed time limit (10 seconds)
3. There might be network connectivity issues

Your question was: "${question}"

While I can't provide a detailed answer right now, you might want to:
1. Try again with a simpler or shorter question
2. Try again later when the service might be less busy
3. Search for this information on Google
4. Contact the site administrator if the problem persists`;
    }

    // Function to call the streaming API endpoint
    async function callStreamingAPI(prompt, outputElement) {
        try {
            // Clear previous content
            outputElement.innerHTML = '';
            outputElement.classList.add('loading');
            
            // Create a loading indicator
            const loadingIndicator = document.createElement('div');
            loadingIndicator.className = 'loading-indicator';
            loadingIndicator.textContent = 'Connecting to AI...';
            outputElement.appendChild(loadingIndicator);
            
            // Try the edge function first
            try {
                console.log('Trying edge function...');
                // Make the API call to the edge function
                const response = await fetch('/.netlify/edge-functions/streaming-ai', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({ prompt }),
                });
                
                if (!response.ok) {
                    throw new Error(`Edge function error: ${response.status}`);
                }
                
                // Remove loading indicator
                outputElement.removeChild(loadingIndicator);
                outputElement.classList.remove('loading');
                
                // Check the content type to determine if we got a streaming response or a fallback JSON response
                const contentType = response.headers.get('Content-Type');
                
                if (contentType && contentType.includes('application/json')) {
                    // This is a fallback response from the regular function
                    console.log('Received fallback response (non-streaming)');
                    const data = await response.json();
                    
                    // Display the content
                    if (data.content) {
                        outputElement.innerHTML = formatResponse(data.content);
                    } else {
                        outputElement.innerHTML = `<div class="system-message">
                            <p>Received a fallback response without content.</p>
                            <pre>${JSON.stringify(data, null, 2)}</pre>
                        </div>`;
                    }
                    
                    return;
                }
                
                // If we get here, we have a streaming response
                console.log('Processing streaming response');
                
                // Set up a reader for the stream
                const reader = response.body.getReader();
                const decoder = new TextDecoder();
                let buffer = '';
                let formattedOutput = '';
                
                // Process the stream
                while (true) {
                    const { done, value } = await reader.read();
                    if (done) break;
                    
                    // Decode the chunk and add to buffer
                    buffer += decoder.decode(value, { stream: true });
                    
                    // Process SSE format (data: lines)
                    const lines = buffer.split('\n');
                    buffer = lines.pop() || ''; // Keep the last incomplete line in the buffer
                    
                    for (const line of lines) {
                        if (line.startsWith('data: ')) {
                            const data = line.slice(6); // Remove 'data: ' prefix
                            
                            // Check if it's the [DONE] message
                            if (data.trim() === '[DONE]') continue;
                            
                            try {
                                // Parse the JSON data
                                const parsed = JSON.parse(data);
                                
                                // Extract the content if it exists
                                if (parsed.choices && parsed.choices[0] && parsed.choices[0].delta && parsed.choices[0].delta.content) {
                                    const content = parsed.choices[0].delta.content;
                                    formattedOutput += content;
                                    
                                    // Format and display the accumulated output
                                    outputElement.innerHTML = formatResponse(formattedOutput);
                                }
                            } catch (e) {
                                console.error('Error parsing JSON:', e);
                            }
                        }
                    }
                }
                
                // Process any remaining data
                if (buffer.length > 0) {
                    const lines = buffer.split('\n');
                    for (const line of lines) {
                        if (line.startsWith('data: ') && line.slice(6).trim() !== '[DONE]') {
                            try {
                                const parsed = JSON.parse(line.slice(6));
                                if (parsed.choices && parsed.choices[0] && parsed.choices[0].delta && parsed.choices[0].delta.content) {
                                    const content = parsed.choices[0].delta.content;
                                    formattedOutput += content;
                                    
                                    // Format and display the accumulated output
                                    outputElement.innerHTML = formatResponse(formattedOutput);
                                }
                            } catch (e) {
                                console.error('Error parsing JSON:', e);
                            }
                        }
                    }
                }
                
                // If we didn't get any content, show an error
                if (!formattedOutput) {
                    console.warn('No content received from streaming response');
                    outputElement.innerHTML = `<div class="system-message">
                        <p>No content was received from the streaming API.</p>
                        <p>This might be due to an issue with the streaming connection or the API response format.</p>
                    </div>`;
                }
                
                return; // Successfully processed the streaming response
            } catch (edgeError) {
                console.error('Edge function failed:', edgeError);
                // Continue to try the regular function
            }
            
            // If we get here, the edge function failed, so try the regular function
            console.log('Trying regular function...');
            const fallbackResponse = await fetch('/.netlify/functions/streaming-ai', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ prompt }),
            });
            
            // Remove loading indicator
            outputElement.removeChild(loadingIndicator);
            outputElement.classList.remove('loading');
            
            if (!fallbackResponse.ok) {
                throw new Error(`Regular function error: ${fallbackResponse.status}`);
            }
            
            const data = await fallbackResponse.json();
            if (data.content) {
                outputElement.innerHTML = formatResponse(data.content);
                return;
            } else {
                outputElement.innerHTML = `<div class="system-message">
                    <p>The fallback function returned a response without content.</p>
                    <pre>${JSON.stringify(data, null, 2)}</pre>
                </div>`;
            }
            
        } catch (error) {
            console.error('Error calling streaming API:', error);
            outputElement.innerHTML = `<div class="error">Error: ${error.message}</div>
                <div class="system-message">
                    <p>Both streaming and fallback attempts failed.</p>
                    <p>Please try again or use the non-streaming mode.</p>
                </div>`;
            outputElement.classList.remove('loading');
        }
    }

    // Add event listener for the test edge function button
    const testEdgeButton = document.getElementById('test-edge-button');
    if (testEdgeButton) {
        testEdgeButton.addEventListener('click', async () => {
            try {
                apiStatus.textContent = 'Testing edge function...';
                apiStatus.className = 'status-checking';
                
                // Try the edge function first
                try {
                    const response = await fetch('/.netlify/edge-functions/test');
                    
                    if (!response.ok) {
                        throw new Error(`Edge function test failed: ${response.status}`);
                    }
                    
                    const data = await response.json();
                    
                    console.log('Edge function test results:', data);
                    
                    // Show diagnostics
                    showDiagnosticsButton.classList.remove('hidden');
                    diagnosticsPanel.classList.remove('hidden');
                    diagnosticsOutput.textContent = JSON.stringify(data, null, 2);
                    showDiagnosticsButton.textContent = 'Hide Diagnostics';
                    
                    apiStatus.textContent = 'Edge function is working!';
                    apiStatus.className = 'status-success';
                    return;
                } catch (edgeError) {
                    console.error('Edge function test failed:', edgeError);
                    // Continue to try the regular function
                }
                
                // If we get here, the edge function failed, so try the regular function
                console.log('Trying regular function test...');
                const fallbackResponse = await fetch('/.netlify/functions/test-edge');
                
                if (!fallbackResponse.ok) {
                    throw new Error(`Regular function test failed: ${fallbackResponse.status}`);
                }
                
                const fallbackData = await fallbackResponse.json();
                
                console.log('Regular function test results:', fallbackData);
                
                // Show diagnostics
                showDiagnosticsButton.classList.remove('hidden');
                diagnosticsPanel.classList.remove('hidden');
                diagnosticsOutput.textContent = JSON.stringify({
                    ...fallbackData,
                    note: "Edge function failed, using regular function instead."
                }, null, 2);
                showDiagnosticsButton.textContent = 'Hide Diagnostics';
                
                apiStatus.textContent = 'Regular function is working (Edge function failed)';
                apiStatus.className = 'status-warning';
                
            } catch (error) {
                apiStatus.textContent = `All function tests failed: ${error.message}`;
                apiStatus.className = 'status-error';
                console.error('Function test error:', error);
                
                // Show diagnostics
                showDiagnosticsButton.classList.remove('hidden');
                diagnosticsPanel.classList.remove('hidden');
                diagnosticsOutput.textContent = JSON.stringify({ 
                    error: error.message,
                    stack: error.stack,
                    timestamp: new Date().toISOString(),
                    troubleshooting_tips: [
                        "Check if Netlify Edge Functions are enabled for your site",
                        "Verify that the functions are deployed correctly",
                        "Check the Netlify logs for any deployment errors",
                        "Make sure your Netlify site is properly configured"
                    ]
                }, null, 2);
                showDiagnosticsButton.textContent = 'Hide Diagnostics';
            }
        });
    }
}); 