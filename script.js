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
    
    // Question form elements
    const questionFormContainer = document.getElementById('question-form-container');
    const questionForm = document.getElementById('question-form');
    const schoolSelect = document.getElementById('school-select');
    const gradeSelect = document.getElementById('grade-select');
    const subjectSelect = document.getElementById('subject-select');
    
    // Sidebar elements
    const leftPanel = document.querySelector('.left-panel');
    const sidebarToggle = document.getElementById('sidebar-toggle');
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

    // Sidebar toggle functionality
    sidebarToggle.addEventListener('click', () => {
        leftPanel.classList.toggle('hidden');
        contentArea.classList.toggle('full-width');
        sidebarToggle.classList.toggle('collapsed');
        
        // Save sidebar state to localStorage
        const isSidebarHidden = leftPanel.classList.contains('hidden');
        localStorage.setItem('sidebarHidden', isSidebarHidden);
    });
    
    // Load saved sidebar state from localStorage
    const savedSidebarState = localStorage.getItem('sidebarHidden');
    if (savedSidebarState === 'true') {
        leftPanel.classList.add('hidden');
        contentArea.classList.add('full-width');
        sidebarToggle.classList.add('collapsed');
    }

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
        
        // Initialize the dropdowns when switching to create mode
        populateGradeOptions(schoolSelect.value);
        populateSubjectOptions(schoolSelect.value);
    });
    
    // School select change event
    if (schoolSelect) {
        schoolSelect.addEventListener('change', () => {
            populateGradeOptions(schoolSelect.value);
            populateSubjectOptions(schoolSelect.value);
        });
    }
    
    // Question form submit event
    if (questionForm) {
        questionForm.addEventListener('submit', (e) => {
            e.preventDefault();
            
            // Get form values
            const school = schoolSelect.value;
            const grade = gradeSelect.value;
            const semester = document.getElementById('semester-select').value;
            const subject = subjectSelect.value;
            const difficulty = document.getElementById('difficulty-select').value;
            const questionCount = document.getElementById('question-count-select').value;
            
            // Here you would typically send these values to your backend
            // For now, we'll just log them
            console.log('Generating questions with:', {
                school,
                grade,
                semester,
                subject,
                difficulty,
                questionCount
            });
            
            // Show a message to the user
            showSystemMessage(`正在生成 ${questionCount} 道 ${school}${grade}${semester}${subject} ${difficulty}难度题目...`, 'info');
            
            // TODO: Implement the actual question generation logic
        });
    }
    
    // Function to populate grade options based on selected school
    function populateGradeOptions(school) {
        // Clear existing options
        gradeSelect.innerHTML = '';
        
        let options = [];
        
        // Set options based on school
        switch (school) {
            case '小学':
                options = ['一年级', '二年级', '三年级', '四年级', '五年级', '六年级'];
                break;
            case '初中':
                options = ['初一', '初二', '初三'];
                break;
            case '高中':
                options = ['高一', '高二', '高三'];
                break;
            case '大学':
                options = ['大一', '大二', '大三', '大四'];
                break;
            default:
                options = ['请先选择学校'];
        }
        
        // Add options to select
        options.forEach(option => {
            const optionElement = document.createElement('option');
            optionElement.value = option;
            optionElement.textContent = option;
            gradeSelect.appendChild(optionElement);
        });
    }
    
    // Function to populate subject options based on selected school
    function populateSubjectOptions(school) {
        // Clear existing options
        subjectSelect.innerHTML = '';
        
        let options = [];
        
        // Set options based on school
        switch (school) {
            case '小学':
                options = ['语文', '数学', '英语', '科学', '道德与法治'];
                break;
            case '初中':
                options = ['语文', '数学', '英语', '物理', '化学', '生物', '历史', '地理', '政治'];
                break;
            case '高中':
                options = ['语文', '数学', '英语', '物理', '化学', '生物', '历史', '地理', '政治'];
                break;
            case '大学':
                options = ['高等数学', '大学物理', '线性代数', '概率论', '英语', '计算机科学', '经济学', '管理学'];
                break;
            default:
                options = ['请先选择学校'];
        }
        
        // Add options to select
        options.forEach(option => {
            const optionElement = document.createElement('option');
            optionElement.value = option;
            optionElement.textContent = option;
            subjectSelect.appendChild(optionElement);
        });
    }
    
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

    // Main submit function
    async function handleSubmit() {
        const question = userInput.value.trim();
        
        if (!question) {
            showSystemMessage('Please enter a question.', 'warning');
            return;
        }
        
        // Show loading indicator
        loading.classList.remove('hidden');
        output.innerHTML = '';
        
        try {
            // Call the AI API
            const response = await fetchAIResponse(question);
            
            // Handle the response
            handleSuccessfulResponse(response, question);
        } catch (error) {
            console.error('Error:', error);
            showSystemMessage(`Error: ${error.message}`, 'error');
        } finally {
            // Hide loading indicator
            loading.classList.add('hidden');
        }
    }
    
    // Function to handle successful responses
    function handleSuccessfulResponse(data, question) {
        // Extract and display content
        let content = extractContentFromResponse(data);
        
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
    
    // Function to extract content from the API response
    function extractContentFromResponse(data) {
        if (!data) return 'No response received.';
        
        // Handle different response formats
        if (typeof data === 'string') {
            return data;
        }
        
        if (data.choices && data.choices.length > 0) {
            const choice = data.choices[0];
            if (choice.message && choice.message.content) {
                return choice.message.content;
            }
            if (choice.text) {
                return choice.text;
            }
        }
        
        if (data.content) {
            return data.content;
        }
        
        if (data.message) {
            return data.message;
        }
        
        return JSON.stringify(data);
    }
    
    // Function to fetch AI response
    async function fetchAIResponse(question) {
        // This is a placeholder function
        // In a real application, this would make an API call to an AI service
        
        // Simulate API call with a delay
        return new Promise((resolve) => {
            setTimeout(() => {
                // Sample response for demonstration
                const response = generateLocalResponse(question);
                resolve(response);
            }, 1500); // Simulate network delay
        });
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
    
    // Function to format tables in markdown
    function formatTables(text) {
        const tableRegex = /\|(.+)\|\n\|(?:[-:]+\|)+\n((?:\|.+\|\n)+)/g;
        
        return text.replace(tableRegex, function(match, headerRow, bodyRows) {
            // Process header
            const headers = headerRow.split('|').map(cell => cell.trim()).filter(cell => cell);
            
            // Process body rows
            const rows = bodyRows.trim().split('\n');
            
            let tableHTML = '<table><thead><tr>';
            
            // Add headers
            headers.forEach(header => {
                tableHTML += `<th>${header}</th>`;
            });
            
            tableHTML += '</tr></thead><tbody>';
            
            // Add rows
            rows.forEach(row => {
                const cells = row.split('|').map(cell => cell.trim()).filter(cell => cell);
                tableHTML += '<tr>';
                cells.forEach(cell => {
                    tableHTML += `<td>${cell}</td>`;
                });
                tableHTML += '</tr>';
            });
            
            tableHTML += '</tbody></table>';
            return tableHTML;
        });
    }
    
    // Function to format lists
    function formatLists(text) {
        // Process unordered lists
        let formattedText = text.replace(/^(\s*)-\s+(.+)$/gm, function(match, indent, content) {
            const indentLevel = indent.length;
            return `<ul style="margin-left: ${indentLevel * 20}px;"><li>${content}</li></ul>`;
        });
        
        // Process ordered lists
        formattedText = formattedText.replace(/^(\s*)\d+\.\s+(.+)$/gm, function(match, indent, content) {
            const indentLevel = indent.length;
            return `<ol style="margin-left: ${indentLevel * 20}px;"><li>${content}</li></ol>`;
        });
        
        // Combine adjacent list items of the same type and level
        formattedText = formattedText
            .replace(/<\/ul>\s*<ul style="margin-left: (\d+)px;">/g, '')
            .replace(/<\/ol>\s*<ol style="margin-left: (\d+)px;">/g, '');
        
        return formattedText;
    }
    
    // Function to show system messages
    function showSystemMessage(message, type = 'info') {
        const messageElement = document.createElement('div');
        messageElement.className = `system-message ${type}`;
        messageElement.textContent = message;
        
        // Clear previous messages
        const existingMessages = output.querySelectorAll('.system-message');
        existingMessages.forEach(msg => msg.remove());
        
        // Add new message
        output.prepend(messageElement);
        
        // Auto-remove after 5 seconds for non-error messages
        if (type !== 'error') {
            setTimeout(() => {
                messageElement.remove();
            }, 5000);
        }
    }
    
    // Function to generate a local response for demonstration
    function generateLocalResponse(question) {
        // Convert question to lowercase for easier matching
        const lowerQuestion = question.toLowerCase();
        
        // Sample responses for different types of questions
        if (lowerQuestion.includes('hello') || lowerQuestion.includes('hi')) {
            return "Hello! How can I help you today?";
        }
        
        if (lowerQuestion.includes('who are you') || lowerQuestion.includes('what are you')) {
            return "I'm an AI assistant designed to help with your questions. I can provide information, explain concepts, and assist with various topics.";
        }
        
        if (lowerQuestion.includes('math') || lowerQuestion.includes('equation')) {
            return "Here's a simple math equation: $E = mc^2$\n\nAnd here's a more complex one:\n\n$$\\int_{0}^{\\infty} e^{-x^2} dx = \\frac{\\sqrt{\\pi}}{2}$$\n\nMathematical formulas can be rendered inline like $f(x) = x^2$ or as display equations.";
        }
        
        if (lowerQuestion.includes('code') || lowerQuestion.includes('programming')) {
            return "Here's a simple Python function:\n\n```python\ndef fibonacci(n):\n    if n <= 1:\n        return n\n    else:\n        return fibonacci(n-1) + fibonacci(n-2)\n\n# Print the first 10 Fibonacci numbers\nfor i in range(10):\n    print(fibonacci(i))\n```\n\nThis code calculates and prints the first 10 numbers in the Fibonacci sequence.";
        }
        
        if (lowerQuestion.includes('table') || lowerQuestion.includes('data')) {
            return "Here's a simple data table:\n\n| Name | Age | Occupation |\n|------|-----|------------|\n| John | 28  | Developer  |\n| Lisa | 32  | Designer   |\n| Mark | 45  | Manager    |\n| Sara | 39  | Analyst    |\n\nTables are useful for organizing structured data.";
        }
        
        if (lowerQuestion.includes('list') || lowerQuestion.includes('steps')) {
            return "Here are some steps to follow:\n\n1. First, identify the problem\n2. Research possible solutions\n3. Choose the best approach\n4. Implement your solution\n5. Test and evaluate results\n\nAlternatively, here's a bullet point list:\n\n- Main point one\n- Main point two\n  - Sub-point A\n  - Sub-point B\n- Main point three";
        }
        
        if (lowerQuestion.includes('poem') || lowerQuestion.includes('poetry') || lowerQuestion.includes('唐诗')) {
            return "《静夜思》\n床前明月光，\n疑是地上霜。\n举头望明月，\n低头思故乡。\n\n这是唐代诗人李白的著名诗作，表达了诗人思乡之情。";
        }
        
        // Default response for other questions
        return "Thank you for your question. I'm a demonstration AI without access to real-time data or the internet. In a fully implemented version, I would connect to an AI service like DeepSeek to provide accurate and helpful responses to your queries.\n\nYou can try asking me about:\n- Math equations\n- Code examples\n- Data tables\n- Lists and steps\n- Chinese poetry\n\nOr just say hello!";
    }
    
    // Function to optimize the question
    async function optimizeQuestion() {
        const question = userInput.value.trim();
        
        if (!question) {
            showSystemMessage('Please enter a question to optimize.', 'warning');
            return;
        }
        
        // Show optimizing state
        optimizeButton.classList.add('optimizing');
        optimizeButton.textContent = 'Optimizing...';
        
        try {
            // In a real implementation, this would call an API
            // For demonstration, we'll just simulate optimization
            await new Promise(resolve => setTimeout(resolve, 1500));
            
            // Simulate an optimized question
            const optimizedQuestion = `${question} (Please provide a detailed explanation with examples)`;
            
            // Update the input with the optimized question
            userInput.value = optimizedQuestion;
            
            // Show success message
            showSystemMessage('Question optimized successfully!', 'success');
        } catch (error) {
            console.error('Error optimizing question:', error);
            showSystemMessage(`Error optimizing question: ${error.message}`, 'error');
        } finally {
            // Reset button state
            optimizeButton.classList.remove('optimizing');
            optimizeButton.textContent = '优化问题';
        }
    }
}); 