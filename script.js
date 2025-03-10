document.addEventListener('DOMContentLoaded', () => {
    // Core elements that definitely exist
    const userInput = document.getElementById('user-input');
    const submitButton = document.getElementById('submit-button');
    const optimizeButton = document.getElementById('optimize-button');
    const output = document.getElementById('output');
    const loading = document.getElementById('loading');
    
    // Panel navigation elements
    const qaButton = document.getElementById('qa-button');
    const createButton = document.getElementById('create-button');
    const qaContainer = document.getElementById('qa-container');
    const createContainer = document.getElementById('create-container');
    
    // Panel resizer elements
    const leftPanel = document.querySelector('.left-panel');
    const panelResizer = document.getElementById('panel-resizer');
    const contentArea = document.querySelector('.content-area');
    
    // Optional elements - may not exist in all versions of the HTML
    const directTestButton = document.getElementById('direct-test-button');
    const simpleApiButton = document.getElementById('simple-api-button');
    const checkEnvButton = document.getElementById('check-env-button');
    const apiFunctionRadios = document.querySelectorAll('input[name="api-function"]');
    const fallbackButton = document.getElementById('fallback-button');
    const modelSelect = document.getElementById('model-select');

    let currentApiFunction = 'chat'; // Updated to use the Cloudflare Pages function
    let lastQuestion = null;
    let currentModel = 'deepseek-r1';

    // API configuration
    // Note: These values are now for reference only and not actually used for API calls
    // The actual values are stored in Cloudflare Pages environment variables
    const API_BASE_URL = 'https://api.lkeap.cloud.tencent.com/v1';
    const MODEL = 'deepseek-r1';

    // Add event listener for the submit button
    submitButton.addEventListener('click', handleSubmit);
    
    // Add event listener for the optimize button
    optimizeButton.addEventListener('click', optimizeQuestion);
    
    // Add event listeners for panel navigation
    qaButton.addEventListener('click', () => {
        // Show Q&A container, hide Create container
        qaContainer.classList.remove('hidden');
        createContainer.classList.add('hidden');
        
        // Update active button
        qaButton.classList.add('active');
        createButton.classList.remove('active');
    });
    
    createButton.addEventListener('click', () => {
        // Show Create container, hide Q&A container
        createContainer.classList.remove('hidden');
        qaContainer.classList.add('hidden');
        
        // Update active button
        createButton.classList.add('active');
        qaButton.classList.remove('active');
    });
    
    // Panel resizer functionality
    let isResizing = false;
    let lastDownX = 0;
    
    // Function to handle resize start
    function startResize(clientX) {
        isResizing = true;
        lastDownX = clientX;
        panelResizer.classList.add('active');
        document.body.style.userSelect = 'none'; // Prevent text selection during resize
        
        // Add a visual indicator that resizing is active
        document.body.classList.add('resizing');
    }
    
    // Function to handle resize move
    function doResize(clientX) {
        if (!isResizing) return;
        
        // Calculate the new width with a smoother movement (reduce the sensitivity)
        const offsetX = (clientX - lastDownX) * 0.8; // Apply a dampening factor
        const newPanelWidth = Math.max(150, Math.min(400, leftPanel.offsetWidth + offsetX));
        
        // Apply the new width to all relevant elements
        leftPanel.style.width = `${newPanelWidth}px`;
        panelResizer.style.left = `${newPanelWidth}px`;
        contentArea.style.marginLeft = `${newPanelWidth}px`;
        
        // Update the last position
        lastDownX = clientX;
        
        // Force a repaint to make the movement smoother
        window.requestAnimationFrame(() => {});
    }
    
    // Function to handle resize end
    function endResize() {
        if (isResizing) {
            isResizing = false;
            panelResizer.classList.remove('active');
            document.body.style.userSelect = ''; // Restore text selection
            document.body.classList.remove('resizing');
            
            // Save the panel width preference to localStorage
            localStorage.setItem('leftPanelWidth', leftPanel.style.width);
        }
    }
    
    // Mouse event handlers
    panelResizer.addEventListener('mousedown', (e) => {
        e.preventDefault(); // Prevent text selection
        startResize(e.clientX);
    });
    
    document.addEventListener('mousemove', (e) => {
        doResize(e.clientX);
    });
    
    document.addEventListener('mouseup', endResize);
    
    // Touch event handlers for mobile devices
    panelResizer.addEventListener('touchstart', (e) => {
        e.preventDefault(); // Prevent scrolling
        startResize(e.touches[0].clientX);
    });
    
    document.addEventListener('touchmove', (e) => {
        if (isResizing) {
            e.preventDefault(); // Prevent scrolling while resizing
            doResize(e.touches[0].clientX);
        }
    });
    
    document.addEventListener('touchend', endResize);
    document.addEventListener('touchcancel', endResize);
    
    // Double-click to reset to default width
    panelResizer.addEventListener('dblclick', () => {
        const defaultWidth = 200;
        leftPanel.style.width = `${defaultWidth}px`;
        panelResizer.style.left = `${defaultWidth}px`;
        contentArea.style.marginLeft = `${defaultWidth}px`;
        localStorage.setItem('leftPanelWidth', `${defaultWidth}px`);
    });
    
    // Load saved panel width from localStorage
    window.addEventListener('DOMContentLoaded', () => {
        const savedWidth = localStorage.getItem('leftPanelWidth');
        if (savedWidth) {
            const width = parseInt(savedWidth);
            if (!isNaN(width)) {
                leftPanel.style.width = savedWidth;
                panelResizer.style.left = savedWidth;
                contentArea.style.marginLeft = savedWidth;
            }
        }
    });
    
    // Removed Enter key event listener to prevent submitting when Enter is pressed

    // Removed show diagnostics button event listener

    // Add event listener for the direct test button (if it exists)
    if (directTestButton) {
        directTestButton.addEventListener('click', async () => {
            try {
                // Show loading state
                loading.classList.remove('hidden');
                
                const response = await fetch('/api/direct-test');
                const data = await response.json();
                
                // Hide loading state
                loading.classList.add('hidden');
                
                // Removed diagnostics code
                
                console.log('Direct API test completed:', data);
            } catch (error) {
                // Hide loading state
                loading.classList.add('hidden');
                
                console.error('Direct API test failed:', error);
            }
        });
    }

    // Add event listener for the check environment button (if it exists)
    if (checkEnvButton) {
        checkEnvButton.addEventListener('click', async () => {
            try {
                // Show loading state
                loading.classList.remove('hidden');
                
                const response = await fetch('/api/check-env');
                const data = await response.json();
                
                // Hide loading state
                loading.classList.add('hidden');
                
                // Removed diagnostics code
                
                if (data.status === 'ok') {
                    console.log('Environment check completed:', data);
                } else {
                    console.error('Environment check failed:', data);
                }
            } catch (error) {
                // Hide loading state
                loading.classList.add('hidden');
                
                console.error('Environment check failed:', error);
            }
        });
    }

    // Add event listeners for optional elements only if they exist
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

    // Function to handle form submission
    async function handleSubmit() {
        const question = userInput.value.trim();
        
        if (!question) {
            alert('请先输入问题');
            return;
        }
        
        // Clear previous response
        output.innerHTML = '';
        
        // Show loading state
        loading.classList.remove('hidden');
        
        try {
            const data = await fetchAIResponse(question);
            
            // Hide loading state
            loading.classList.add('hidden');
            
            // Handle the response
            handleSuccessfulResponse(data, question);
            
        } catch (error) {
            // Hide loading state
            loading.classList.add('hidden');
            
            // Show error message
            output.innerHTML = `<div class="system-message error">
                <p>Sorry, I encountered an error: ${error.message}</p>
                <p>Please try again later or rephrase your question.</p>
            </div>`;
            
            console.error('Request failed:', error);
        }
    }
    
    // Helper function to handle successful responses
    function handleSuccessfulResponse(data, question) {
        // Update status (removed API status update)
        console.log('API response details:', data);
        
        // Extract and display content
        let content = extractContentFromResponse(data);
        
        // Check if the content contains literal '\n' characters and handle them
        if (typeof content === 'string' && content.includes('\\n')) {
            console.log('Content contains literal \\n characters, handling them...');
        }
        
        // Format the response
        const formattedContent = formatResponse(content);
        
        // Display the formatted content
        output.innerHTML = `<div class="ai-message">${formattedContent}</div>`;
        
        // Render math formulas
        if (window.MathJax && typeof window.MathJax.typeset === 'function') {
            window.MathJax.typeset();
        }
        
        // Store the last question for retry functionality
        lastQuestion = question;
    }

    // Function to extract content from various response formats
    function extractContentFromResponse(data) {
        // Handle null or undefined data
        if (!data) return "No response data received";
        
        // If data is already a string, return it directly
        if (typeof data === 'string') return data;
        
        // Try to extract from standard OpenAI format
        if (data.choices && data.choices[0]) {
            // Check for message format
            if (data.choices[0].message) {
                const message = data.choices[0].message;
                if (message.content) return message.content;
            }
            
            // Check for text/content format
            if (data.choices[0].text) return data.choices[0].text;
            if (data.choices[0].content) return data.choices[0].content;
        }
        
        // If we have a direct content field
        if (data.content) return data.content;
        
        // If we have a message field
        if (data.message) {
            if (typeof data.message === 'string') return data.message;
            if (data.message.content) return data.message.content;
        }
        
        // If we have a text field
        if (data.text) return data.text;
        
        // If we have a response field
        if (data.response) {
            if (typeof data.response === 'string') return data.response;
            if (data.response.content) return data.response.content;
        }
        
        // If we have a raw data object, stringify it
        try {
            return JSON.stringify(data, null, 2);
        } catch (e) {
            return "Could not parse response data";
        }
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
            const timeoutId = setTimeout(() => controller.abort(), 300000); // 300 seconds timeout (5 minutes)
            
            // Make the request
            const response = await fetch(`/api/${currentApiFunction}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ 
                    messages: [
                        { role: "user", content: question }
                    ]
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

    // Function to escape HTML special characters
    function escapeHTML(text) {
        return text
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#039;');
    }

    // Function to format the response with proper line breaks and formatting
    function formatResponse(text) {
        if (!text) return '';
        
        // Escape HTML special characters
        let escapedText = escapeHTML(text);
        
        // Handle literal '\n' characters in the text (convert them to actual newlines)
        escapedText = escapedText.replace(/\\n/g, '\n');
        
        // Handle Chinese poetry formatting
        if (escapedText.includes('《') && escapedText.includes('》')) {
            // Split the text into lines
            const lines = escapedText.split('\n');
            let formattedPoem = '';
            
            // Process each line
            for (let i = 0; i < lines.length; i++) {
                const line = lines[i].trim();
                
                // Skip empty lines
                if (!line) continue;
                
                // If it's a title line (contains 《》)
                if (line.includes('《') && line.includes('》')) {
                    formattedPoem += `<h3 class="poem-title">${line}</h3>`;
                } else {
                    // Regular poem line
                    formattedPoem += `<div class="poem-line">${line}</div>`;
                }
            }
            
            // Add poetry class for styling
            return `<div class="poetry">${formattedPoem}</div>`;
        }
        
        // Process math formulas
        escapedText = processMathFormulas(escapedText);
        
        // Detect and format code blocks
        const codeBlockRegex = /```([a-z]*)\n([\s\S]*?)```/g;
        escapedText = escapedText.replace(codeBlockRegex, function(match, language, code) {
            // Check if this is a math block
            if (language === 'math') {
                return `<div class="math-code">${code}</div>`;
            }
            return `<pre><code class="language-${language}">${code}</code></pre>`;
        });
        
        // Format tables
        escapedText = formatTables(escapedText);
        
        // Format lists with proper indentation
        escapedText = formatLists(escapedText);
        
        // Regular formatting for non-poetry text
        return escapedText
            // Handle literal '\n' characters that might still be in the text
            .replace(/\\n/g, '\n')
            // Replace double newlines with paragraph breaks
            .replace(/\n\n/g, '</p><p>')
            // Replace single newlines with line breaks
            .replace(/\n/g, '<br>')
            // Wrap in paragraphs if not already
            .replace(/^(.+)$/gm, function(match) {
                if (!match.startsWith('<p>') && !match.startsWith('<h') && 
                    !match.startsWith('<ul') && !match.startsWith('<ol') && 
                    !match.startsWith('<pre') && !match.startsWith('<blockquote') &&
                    !match.startsWith('<div class="math')) {
                    return `<p>${match}</p>`;
                }
                return match;
            })
            // Format markdown
            .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
            .replace(/\*(.*?)\*/g, '<em>$1</em>')
            .replace(/`([^`]+)`/g, '<code>$1</code>')
            .replace(/^# (.*$)/gm, '<h1>$1</h1>')
            .replace(/^## (.*$)/gm, '<h2>$1</h2>')
            .replace(/^### (.*$)/gm, '<h3>$1</h3>')
            .replace(/^> (.*$)/gm, '<blockquote>$1</blockquote>')
            .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>')
            // Highlight important information
            .replace(/!!(.*?)!!/g, '<span class="highlight">$1</span>');
    }

    // Function to process math formulas
    function processMathFormulas(text) {
        // Process inline math: $formula$
        text = text.replace(/\$([^\$\n]+?)\$/g, function(match, formula) {
            return `<span class="math-inline">\\(${formula}\\)</span>`;
        });
        
        // Process display math: $$formula$$
        text = text.replace(/\$\$([\s\S]+?)\$\$/g, function(match, formula) {
            return `<div class="math-display">\\[${formula}\\]</div>`;
        });
        
        return text;
    }

    // Helper function to format tables in markdown
    function formatTables(text) {
        // Split the text into lines
        const lines = text.split('\n');
        let inTable = false;
        let tableContent = '';
        let result = [];
        
        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];
            
            // Check if this is a table row (contains | character)
            if (line.includes('|') && line.trim().startsWith('|')) {
                if (!inTable) {
                    // Start of a new table
                    inTable = true;
                    tableContent = '<table>';
                }
                
                // Check if this is a header separator row
                if (line.includes('---') || line.includes('===')) {
                    continue; // Skip the separator row
                }
                
                // Process the table row
                const cells = line.split('|').filter(cell => cell.trim() !== '');
                const isHeader = i > 0 && lines[i-1].includes('|') && 
                                 (i+1 < lines.length && (lines[i+1].includes('---') || lines[i+1].includes('===')));
                
                tableContent += '<tr>';
                cells.forEach(cell => {
                    if (isHeader) {
                        tableContent += `<th>${cell.trim()}</th>`;
                    } else {
                        tableContent += `<td>${cell.trim()}</td>`;
                    }
                });
                tableContent += '</tr>';
            } else if (inTable) {
                // End of the table
                inTable = false;
                tableContent += '</table>';
                result.push(tableContent);
                result.push(line);
            } else {
                result.push(line);
            }
        }
        
        // If we're still in a table at the end of the text
        if (inTable) {
            tableContent += '</table>';
            result.push(tableContent);
        }
        
        return result.join('\n');
    }

    // Helper function to format lists in markdown
    function formatLists(text) {
        // Split the text into lines
        const lines = text.split('\n');
        let inList = false;
        let listType = '';
        let listContent = '';
        let result = [];
        
        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];
            
            // Check if this is an unordered list item
            if (line.trim().match(/^[\*\-\+]\s/)) {
                if (!inList || listType !== 'ul') {
                    // Start of a new unordered list
                    if (inList) {
                        // Close the previous list
                        listContent += `</${listType}>`;
                        result.push(listContent);
                    }
                    inList = true;
                    listType = 'ul';
                    listContent = '<ul>';
                }
                
                // Extract the list item content
                const content = line.trim().replace(/^[\*\-\+]\s/, '');
                listContent += `<li>${content}</li>`;
            }
            // Check if this is an ordered list item
            else if (line.trim().match(/^\d+\.\s/)) {
                if (!inList || listType !== 'ol') {
                    // Start of a new ordered list
                    if (inList) {
                        // Close the previous list
                        listContent += `</${listType}>`;
                        result.push(listContent);
                    }
                    inList = true;
                    listType = 'ol';
                    listContent = '<ol>';
                }
                
                // Extract the list item content
                const content = line.trim().replace(/^\d+\.\s/, '');
                listContent += `<li>${content}</li>`;
            }
            else if (inList) {
                // End of the list
                inList = false;
                listContent += `</${listType}>`;
                result.push(listContent);
                result.push(line);
            } else {
                result.push(line);
            }
        }
        
        // If we're still in a list at the end of the text
        if (inList) {
            listContent += `</${listType}>`;
            result.push(listContent);
        }
        
        return result.join('\n');
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
                const response = await fetch('/api/streaming-ai', {
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
                    
                    // Format and display the response
                    if (data.content) {
                        outputElement.innerHTML = formatResponse(data.content);
                    } else {
                        outputElement.innerHTML = `<div class="system-message">
                            <p>The API returned a response without content.</p>
                            <pre>${JSON.stringify(data, null, 2)}</pre>
                        </div>`;
                    }
                    
                    return;
                }
                
                // If we get here, we have a streaming response
                console.log('Received streaming response');
                
                // Set up a reader for the stream
                const reader = response.body.getReader();
                const decoder = new TextDecoder();
                let buffer = '';
                let fullContent = '';
                
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
                                    fullContent += content;
                                    
                                    // Format and display the accumulated output
                                    outputElement.innerHTML = formatResponse(fullContent);
                                }
                            } catch (e) {
                                console.error('Error parsing JSON:', e);
                            }
                        }
                    }
                }
                
                // Streaming completed
                
                // Enable the submit button
                submitButton.disabled = false;
                
                // Hide loading indicator
                loading.classList.add('hidden');
                
                return;
            } catch (edgeError) {
                console.error('Edge function failed:', edgeError);
                
                // If we get here, the edge function failed, so try the regular function
                console.log('Trying regular function test...');
                const fallbackResponse = await fetch('/api/test');
                
                if (!fallbackResponse.ok) {
                    throw new Error(`Regular function test failed: ${fallbackResponse.status}`);
                }
                
                const fallbackData = await fallbackResponse.json();
                
                console.log('Regular function test results:', fallbackData);
                
                // Removed diagnostics code
            }
        } catch (error) {
            console.error('Streaming error:', error);
            
            // Show timeout message if it was a timeout
            if (error.name === 'AbortError') {
                outputElement.innerHTML += `<div class="system-message warning">
                    <p>The request is taking longer than expected. Please wait...</p>
                </div>`;
                
                // Try again with non-streaming API
                try {
                    const data = await fetchAIResponse(prompt);
                    handleSuccessfulResponse(data, prompt);
                } catch (fallbackError) {
                    outputElement.innerHTML = `<div class="system-message error">
                        <p>Sorry, I encountered an error: ${fallbackError.message}</p>
                        <p>Please try again later or rephrase your question.</p>
                    </div>`;
                }
            } 
            
            // Enable the submit button
            submitButton.disabled = false;
            
            // Hide loading indicator
            loading.classList.add('hidden');
        }
    }

    // Function to test the edge function
    async function testEdgeFunction() {
        try {
            console.log('Testing edge function...');
            
            // Make a test request to the edge function
            const response = await fetch('/api/test-edge');
            
            if (!response.ok) {
                throw new Error(`Edge function test failed: ${response.status}`);
            }
            
            const data = await response.json();
            console.log('Edge function test results:', data);
            
            // Removed diagnostics code
            
            return true;
        } catch (error) {
            console.error('Edge function test error:', error);
            
            // If we get here, the edge function failed, so try the regular function
            console.log('Trying regular function test...');
            const fallbackResponse = await fetch('/api/test');
            
            if (!fallbackResponse.ok) {
                throw new Error(`Regular function test failed: ${fallbackResponse.status}`);
            }
            
            const fallbackData = await fallbackResponse.json();
            console.log('Regular function test results:', fallbackData);
            
            // Removed diagnostics code
            
            return false;
        }
    }

    // Function to optimize the question
    async function optimizeQuestion() {
        const question = userInput.value.trim();
        
        if (!question) {
            alert('请先输入问题');
            return;
        }
        
        // Disable the optimize button and change its appearance
        optimizeButton.disabled = true;
        optimizeButton.classList.add('optimizing');
        optimizeButton.textContent = '优化中...';
        
        // Show loading state
        loading.classList.remove('hidden');
        
        try {
            // Send the optimization request to the API
            const response = await fetch('/api/chat', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ 
                    messages: [
                        { 
                            role: "user", 
                            content: `请优化以下问题，使其更清晰、更具体，以便AI更好地理解和回答。只返回优化后的问题，不要添加任何解释或其他内容。\n\n原问题：${question}` 
                        }
                    ]
                })
            });
            
            // Check if the response was successful
            if (!response.ok) {
                throw new Error(`优化失败: ${response.status} ${response.statusText}`);
            }
            
            // Parse the response
            const data = await response.json();
            
            // Extract the optimized question
            const optimizedQuestion = extractContentFromResponse(data);
            
            // Clean up the optimized question (remove quotes, etc.)
            let cleanedQuestion = optimizedQuestion.trim();
            
            // Remove quotes if present
            if ((cleanedQuestion.startsWith('"') && cleanedQuestion.endsWith('"')) || 
                (cleanedQuestion.startsWith("'") && cleanedQuestion.endsWith("'"))) {
                cleanedQuestion = cleanedQuestion.substring(1, cleanedQuestion.length - 1);
            }
            
            // Remove "优化后的问题："/"优化问题："/"问题：" prefix if present
            const prefixes = ["优化后的问题：", "优化问题：", "问题：", "优化后："];
            for (const prefix of prefixes) {
                if (cleanedQuestion.startsWith(prefix)) {
                    cleanedQuestion = cleanedQuestion.substring(prefix.length).trim();
                    break;
                }
            }
            
            // Update the input field with the optimized question
            userInput.value = cleanedQuestion;
            
            // Focus on the input field
            userInput.focus();
            
            console.log('Question optimized successfully');
        } catch (error) {
            console.error('Error optimizing question:', error);
            alert(`优化问题时出错: ${error.message}`);
        } finally {
            // Hide loading state
            loading.classList.add('hidden');
            
            // Re-enable the optimize button and restore its appearance
            optimizeButton.disabled = false;
            optimizeButton.classList.remove('optimizing');
            optimizeButton.textContent = '优化问题';
        }
    }
}); 