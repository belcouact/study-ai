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
    const generateQuestionsButton = document.getElementById('generate-questions-button');
    
    // Question display elements
    const questionsDisplayContainer = document.getElementById('questions-display-container');
    const questionCounter = document.getElementById('question-counter');
    const questionText = document.getElementById('question-text');
    const choiceAText = document.getElementById('choice-a-text');
    const choiceBText = document.getElementById('choice-b-text');
    const choiceCText = document.getElementById('choice-c-text');
    const choiceDText = document.getElementById('choice-d-text');
    const submitAnswerButton = document.getElementById('submit-answer-button');
    const answerContainer = document.getElementById('answer-container');
    const answerResult = document.getElementById('answer-result');
    const answerExplanation = document.getElementById('answer-explanation');
    const prevQuestionButton = document.getElementById('prev-question-button');
    const nextQuestionButton = document.getElementById('next-question-button');
    const choiceRadios = document.querySelectorAll('input[name="choice"]');
    
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

    // Question generation variables
    let currentQuestions = [];
    let currentQuestionIndex = 0;
    let userAnswers = [];

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
        // Create message element
        const messageElement = document.createElement('div');
        messageElement.className = `system-message ${type}`;
        messageElement.textContent = message;
        
        // Add to output
        output.prepend(messageElement);
        
        // Remove after 5 seconds
        setTimeout(() => {
            messageElement.remove();
        }, 5000);
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

    // Generate Questions Button Event
    if (generateQuestionsButton) {
        generateQuestionsButton.addEventListener('click', async () => {
            // Show loading indicator
            loading.classList.remove('hidden');
            
            // Collect form data
            const schoolType = schoolSelect.value;
            const grade = gradeSelect.value;
            const semester = document.getElementById('semester-select').value;
            const subject = subjectSelect.value;
            const difficulty = document.getElementById('difficulty-select').value;
            const questionsPerSet = document.getElementById('question-count-select').value;
            
            // Map difficulty to text
            const difficultyText = difficulty;
            
            // Create the system prompt
            const systemPrompt = `作为一位经验丰富的${schoolType}${subject}老师，请严格按照以下格式生成${questionsPerSet}道${grade}年级${semester}的选择题，难度要求为${difficultyText}级。

严格的格式要求：
每道题必须包含以下六个部分，缺一不可：
1. "题目："后接具体题目
2. "A."后接选项A的内容
3. "B."后接选项B的内容
4. "C."后接选项C的内容
5. "D."后接选项D的内容
6. "答案："后接正确选项（必须是A、B、C、D其中之一）
7. "解析："后必须包含完整的解析（至少100字）

解析部分必须包含以下内容（缺一不可）：
1. 解题思路和方法
2. 关键知识点解释
3. 正确答案的推导过程
4. 为什么其他选项是错误的
5. 相关知识点的总结
6. 易错点提醒

示例格式：
题目：[题目内容]
A. [选项A内容]
B. [选项B内容]
C. [选项C内容]
D. [选项D内容]
答案：[A或B或C或D]
解析：本题主要考察[知识点]。解题思路是[详细说明]。首先，[推导过程]。选项分析：A选项[分析]，B选项[分析]，C选项[分析]，D选项[分析]。需要注意的是[易错点]。总的来说，[知识点总结]。同学们在解题时要特别注意[关键提醒]。

题目质量要求：
1. 题目表述必须清晰、准确，无歧义
2. 选项内容必须完整，符合逻辑
3. 所有选项必须有实际意义，不能有无意义的干扰项
4. 难度必须符合年级水平
5. 解析必须详尽，有教育意义`;
            
            try {
                // Call API to generate questions
                const response = await fetchGeneratedQuestions(systemPrompt);
                
                // Parse the response to extract questions
                currentQuestions = parseQuestionsFromResponse(response);
                
                // Reset user answers
                userAnswers = Array(currentQuestions.length).fill(null);
                
                // Hide the form and show the questions
                questionFormContainer.classList.add('hidden');
                questionsDisplayContainer.classList.remove('hidden');
                
                // Display the first question
                currentQuestionIndex = 0;
                displayCurrentQuestion();
                
                // Update navigation buttons
                updateNavigationButtons();
                
            } catch (error) {
                console.error('Error generating questions:', error);
                showSystemMessage(`Error generating questions: ${error.message}`, 'error');
            } finally {
                // Hide loading indicator
                loading.classList.add('hidden');
            }
        });
    }
    
    // Submit Answer Button Event
    if (submitAnswerButton) {
        submitAnswerButton.addEventListener('click', () => {
            // Get selected answer
            const selectedRadio = document.querySelector('input[name="choice"]:checked');
            
            if (!selectedRadio) {
                showSystemMessage('请选择一个答案', 'warning');
                return;
            }
            
            // Store user's answer
            userAnswers[currentQuestionIndex] = selectedRadio.value;
            
            // Get correct answer
            const correctAnswer = currentQuestions[currentQuestionIndex].answer;
            
            // Show answer container
            answerContainer.classList.remove('hidden');
            
            // Display result
            if (selectedRadio.value === correctAnswer) {
                answerResult.textContent = `✓ 正确！答案是：${correctAnswer}`;
                answerResult.style.color = '#28a745';
            } else {
                answerResult.textContent = `✗ 错误。正确答案是：${correctAnswer}`;
                answerResult.style.color = '#dc3545';
            }
            
            // Display explanation
            answerExplanation.textContent = currentQuestions[currentQuestionIndex].explanation;
            
            // Enable navigation buttons
            nextQuestionButton.disabled = false;
            prevQuestionButton.disabled = currentQuestionIndex === 0;
        });
    }
    
    // Navigation Button Events
    if (prevQuestionButton) {
        prevQuestionButton.addEventListener('click', () => {
            if (currentQuestionIndex > 0) {
                currentQuestionIndex--;
                displayCurrentQuestion();
                updateNavigationButtons();
            }
        });
    }
    
    if (nextQuestionButton) {
        nextQuestionButton.addEventListener('click', () => {
            if (currentQuestionIndex < currentQuestions.length - 1) {
                currentQuestionIndex++;
                displayCurrentQuestion();
                updateNavigationButtons();
            }
        });
    }
    
    // Function to display the current question
    function displayCurrentQuestion() {
        // Reset the question display
        answerContainer.classList.add('hidden');
        
        // Uncheck all radio buttons
        choiceRadios.forEach(radio => {
            radio.checked = false;
        });
        
        // Get the current question
        const question = currentQuestions[currentQuestionIndex];
        
        // Update question counter
        questionCounter.textContent = `题目 ${currentQuestionIndex + 1} / ${currentQuestions.length}`;
        
        // Display question text and choices
        questionText.textContent = question.question;
        choiceAText.textContent = question.choices.A;
        choiceBText.textContent = question.choices.B;
        choiceCText.textContent = question.choices.C;
        choiceDText.textContent = question.choices.D;
        
        // If user has already answered this question, show their answer and the explanation
        if (userAnswers[currentQuestionIndex] !== null) {
            // Find and check the radio button for the user's answer
            document.getElementById(`choice-${userAnswers[currentQuestionIndex].toLowerCase()}`).checked = true;
            
            // Show the answer container
            answerContainer.classList.remove('hidden');
            
            // Display result
            const correctAnswer = question.answer;
            if (userAnswers[currentQuestionIndex] === correctAnswer) {
                answerResult.textContent = `✓ 正确！答案是：${correctAnswer}`;
                answerResult.style.color = '#28a745';
            } else {
                answerResult.textContent = `✗ 错误。正确答案是：${correctAnswer}`;
                answerResult.style.color = '#dc3545';
            }
            
            // Display explanation
            answerExplanation.textContent = question.explanation;
        }
    }
    
    // Function to update navigation buttons
    function updateNavigationButtons() {
        prevQuestionButton.disabled = currentQuestionIndex === 0;
        nextQuestionButton.disabled = currentQuestionIndex === currentQuestions.length - 1;
    }
    
    // Function to fetch generated questions from API
    async function fetchGeneratedQuestions(systemPrompt) {
        // For now, we'll use a mock response for demonstration
        // In a real application, this would make an API call
        
        // Simulate API call with a delay
        return new Promise((resolve) => {
            setTimeout(() => {
                // Sample response for demonstration
                const response = generateMockQuestions();
                resolve(response);
            }, 2000); // Simulate network delay
        });
    }
    
    // Function to parse questions from API response
    function parseQuestionsFromResponse(response) {
        // In a real application, this would parse the actual API response
        // For now, we'll just return the mock questions
        
        return response.map(item => {
            return {
                question: item.question,
                choices: {
                    A: item.choices.A,
                    B: item.choices.B,
                    C: item.choices.C,
                    D: item.choices.D
                },
                answer: item.answer,
                explanation: item.explanation
            };
        });
    }
    
    // Function to generate mock questions for demonstration
    function generateMockQuestions() {
        return [
            {
                question: "在平面直角坐标系中，点A(2, 3)关于y轴的对称点的坐标是什么？",
                choices: {
                    A: "(-2, 3)",
                    B: "(2, -3)",
                    C: "(-2, -3)",
                    D: "(3, 2)"
                },
                answer: "A",
                explanation: "本题主要考察点关于y轴对称的性质。解题思路是利用对称点的坐标关系。首先，当一个点关于y轴对称时，其x坐标变为相反数，而y坐标保持不变。因此，点A(2, 3)关于y轴的对称点的坐标应为(-2, 3)。选项分析：A选项(-2, 3)是正确答案，符合关于y轴对称的坐标变换规则；B选项(2, -3)是关于x轴对称的结果；C选项(-2, -3)是关于原点对称的结果；D选项(3, 2)是将x、y坐标互换的结果。需要注意的是对称变换中各种情况的区别：关于y轴对称时x坐标取反，关于x轴对称时y坐标取反，关于原点对称时x和y坐标都取反。总的来说，理解坐标轴对称变换的基本规则是解决此类问题的关键。同学们在解题时要特别注意不同对称变换的区别，避免混淆。"
            },
            {
                question: "下列哪个选项中的化合物能发生水解反应？",
                choices: {
                    A: "NaCl",
                    B: "CH₄",
                    C: "CH₃COOC₂H₅",
                    D: "C₆H₁₂O₆"
                },
                answer: "C",
                explanation: "本题主要考察有机化合物的水解反应知识点。解题思路是分析各个化合物的结构特点，判断它们是否含有可水解的官能团。首先，水解反应通常发生在含有酯基、酰胺基、腈基等官能团的化合物中。选项分析：A选项NaCl是离子化合物，在水中会电离但不发生水解反应；B选项CH₄是烷烃，分子中只有C-H键，稳定性高，不易发生水解；C选项CH₃COOC₂H₅是乙酸乙酯，属于酯类化合物，在酸或碱的催化下可以水解生成乙酸和乙醇；D选项C₆H₁₂O₆是葡萄糖，虽然含有多个羟基，但不具备典型的可水解官能团。需要注意的是酯类化合物的水解反应是可逆的，在酸性条件下需要过量的水才能使平衡向生成羧酸的方向移动。总的来说，识别有机化合物中的官能团及其反应性是有机化学学习的重要内容。同学们在解题时要特别注意区分不同官能团的化学性质，尤其是酯类、酰胺类等容易发生水解的官能团。"
            },
            {
                question: "下列关于细胞膜的说法，错误的是：",
                choices: {
                    A: "细胞膜由脂质双分子层构成",
                    B: "蛋白质是细胞膜的重要组成部分",
                    C: "细胞膜具有选择透过性",
                    D: "细胞膜是完全不透水的屏障"
                },
                answer: "D",
                explanation: "本题主要考察细胞膜的结构和功能特点。解题思路是分析各选项内容，判断其是否符合细胞膜的科学认知。首先，根据流动镶嵌模型，细胞膜由脂质双分子层构成，其中镶嵌着蛋白质分子。选项分析：A选项正确，细胞膜的基本骨架是脂质双分子层；B选项正确，蛋白质是细胞膜的重要组成部分，承担着物质转运、信号传递等功能；C选项正确，细胞膜具有选择透过性，允许某些物质通过而阻止其他物质通过；D选项错误，细胞膜并非完全不透水，水分子可以通过简单扩散或通过水通道蛋白穿过细胞膜。需要注意的是细胞膜的选择透过性是相对的，不同物质通过细胞膜的方式和难易程度不同。总的来说，理解细胞膜的结构与功能的关系是细胞生物学的基础知识。同学们在解题时要特别注意区分细胞膜的选择透过性与完全不透性的区别，避免对细胞膜功能的绝对化理解。"
            },
            {
                question: "《红楼梦》中，以下哪个人物不是金陵十二钗之一？",
                choices: {
                    A: "林黛玉",
                    B: "薛宝钗",
                    C: "王熙凤",
                    D: "晴雯"
                },
                answer: "D",
                explanation: "本题主要考察《红楼梦》中金陵十二钗的相关知识。解题思路是回忆金陵十二钗的具体人物组成。首先，金陵十二钗是《红楼梦》中十二位重要女性角色的统称，她们分别是：林黛玉、薛宝钗、贾元春、贾探春、贾迎春、贾惜春、李纨、妙玉、史湘云、王熙凤、贾巧姐和秦可卿。选项分析：A选项林黛玉是金陵十二钗之一，是书中的女主角；B选项薛宝钗也是金陵十二钗之一，与林黛玉并称为"金陵二尤"；C选项王熙凤是金陵十二钗之一，是贾府的掌权人物；D选项晴雯虽然是书中重要的丫鬟形象，但她不属于金陵十二钗，而是属于"四大丫鬟"之一。需要注意的是《红楼梦》中还有金陵十二钗正册和副册之分，有时会引起混淆。总的来说，《红楼梦》中的人物关系复杂，需要系统地理解和记忆。同学们在解题时要特别注意区分主要人物的身份和地位，尤其是金陵十二钗与其他女性角色的区别。"
            },
            {
                question: "下列哪项不是牛顿运动定律的内容？",
                choices: {
                    A: "物体保持静止或匀速直线运动状态，直到有外力迫使它改变这种状态为止",
                    B: "物体加速度的大小与所受合外力成正比，与物体质量成反比",
                    C: "两个物体间的引力与它们的质量乘积成正比，与距离的平方成反比",
                    D: "作用力与反作用力大小相等，方向相反，作用在同一直线上"
                },
                answer: "C",
                explanation: "本题主要考察牛顿运动定律的基本内容。解题思路是分析各选项，判断其是否属于牛顿三大运动定律的内容。首先，牛顿三大运动定律包括：牛顿第一定律（惯性定律）、牛顿第二定律（加速度定律）和牛顿第三定律（作用力与反作用力定律）。选项分析：A选项描述的是牛顿第一定律，即惯性定律，正确；B选项描述的是牛顿第二定律，即F=ma，正确；C选项描述的是万有引力定律（F=G·m₁m₂/r²），而非牛顿运动定律的内容；D选项描述的是牛顿第三定律，即作用力与反作用力定律，正确。需要注意的是万有引力定律虽然也是牛顿发现的，但它不属于牛顿运动定律的范畴，而是描述两个质点之间引力大小的定律。总的来说，牛顿力学体系包含多个定律，需要明确区分各定律的内容和适用范围。同学们在解题时要特别注意区分牛顿运动定律与万有引力定律的区别，避免混淆不同物理定律的内容。"
            }
        ];
    }
}); 