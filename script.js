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
    
    // Question set variables
    let questions = [];
    let currentQuestionIndex = 0;
    let userAnswers = [];

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
    
    // Generate Questions button click event
    if (generateQuestionsButton) {
        generateQuestionsButton.addEventListener('click', async () => {
            // Show loading state
            loading.classList.remove('hidden');
            
            // Collect form data
            const schoolType = schoolSelect.value;
            const grade = gradeSelect.value;
            const semester = document.getElementById('semester-select').value;
            const subject = subjectSelect.value;
            const difficulty = document.getElementById('difficulty-select').value;
            const questionCount = document.getElementById('question-count-select').value;
            
            // Create system prompt
            const systemPrompt = `作为一位经验丰富的${schoolType}${subject}老师，请严格按照以下格式生成${questionCount}道${grade}年级${semester}的选择题，难度要求为${difficulty}级。

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
                const response = await fetchAIResponse(systemPrompt);
                
                // Parse the response to extract questions
                questions = parseQuestionsFromResponse(response);
                
                // Reset user answers and current question index
                userAnswers = Array(questions.length).fill(null);
                currentQuestionIndex = 0;
                
                // Hide the form and show the questions display
                questionFormContainer.classList.add('hidden');
                questionsDisplayContainer.classList.remove('hidden');
                
                // Display the first question
                displayCurrentQuestion();
                
                // Update navigation buttons
                updateNavigationButtons();
                
                // Show success message
                showSystemMessage(`已生成 ${questions.length} 道 ${schoolType}${grade}${semester}${subject} ${difficulty}难度题目`, 'success');
            } catch (error) {
                console.error('Error generating questions:', error);
                showSystemMessage('生成题目时出错，请重试', 'error');
            } finally {
                // Hide loading state
                loading.classList.add('hidden');
            }
        });
    }
    
    // Submit Answer button click event
    if (submitAnswerButton) {
        submitAnswerButton.addEventListener('click', () => {
            // Get the selected answer
            const selectedAnswer = getSelectedAnswer();
            
            if (!selectedAnswer) {
                showSystemMessage('请选择一个答案', 'warning');
                return;
            }
            
            // Save the user's answer
            userAnswers[currentQuestionIndex] = selectedAnswer;
            
            // Get the correct answer
            const correctAnswer = questions[currentQuestionIndex].answer;
            
            // Show the answer container
            answerContainer.classList.remove('hidden');
            
            // Display result
            if (selectedAnswer === correctAnswer) {
                answerResult.textContent = `✓ 正确！答案是：${correctAnswer}`;
                answerResult.style.color = '#28a745';
            } else {
                answerResult.textContent = `✗ 错误。正确答案是：${correctAnswer}`;
                answerResult.style.color = '#dc3545';
            }
            
            // Display explanation
            answerExplanation.textContent = questions[currentQuestionIndex].explanation;
            
            // Enable navigation buttons
            nextQuestionButton.disabled = currentQuestionIndex >= questions.length - 1;
            prevQuestionButton.disabled = currentQuestionIndex <= 0;
        });
    }
    
    // Navigation button click events
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
            if (currentQuestionIndex < questions.length - 1) {
                currentQuestionIndex++;
                displayCurrentQuestion();
                updateNavigationButtons();
            }
        });
    }
    
    // Function to display the current question
    function displayCurrentQuestion() {
        const question = questions[currentQuestionIndex];
        
        // Update question counter
        questionCounter.textContent = `题目 ${currentQuestionIndex + 1} / ${questions.length}`;
        
        // Display question text and choices
        questionText.textContent = question.questionText;
        choiceAText.textContent = question.choices.A;
        choiceBText.textContent = question.choices.B;
        choiceCText.textContent = question.choices.C;
        choiceDText.textContent = question.choices.D;
        
        // Clear any selected radio buttons
        choiceRadios.forEach(radio => {
            radio.checked = false;
        });
        
        // If user has already answered this question, select their answer
        if (userAnswers[currentQuestionIndex]) {
            document.getElementById(`choice-${userAnswers[currentQuestionIndex].toLowerCase()}`).checked = true;
            
            // Show the answer container if already answered
            answerContainer.classList.remove('hidden');
            
            // Display result
            const selectedAnswer = userAnswers[currentQuestionIndex];
            const correctAnswer = question.answer;
            
            if (selectedAnswer === correctAnswer) {
                answerResult.textContent = `✓ 正确！答案是：${correctAnswer}`;
                answerResult.style.color = '#28a745';
            } else {
                answerResult.textContent = `✗ 错误。正确答案是：${correctAnswer}`;
                answerResult.style.color = '#dc3545';
            }
            
            // Display explanation
            answerExplanation.textContent = question.explanation;
        } else {
            // Hide the answer container if not answered
            answerContainer.classList.add('hidden');
        }
    }
    
    // Function to update navigation buttons
    function updateNavigationButtons() {
        prevQuestionButton.disabled = currentQuestionIndex <= 0;
        nextQuestionButton.disabled = currentQuestionIndex >= questions.length - 1;
    }
    
    // Function to get the selected answer
    function getSelectedAnswer() {
        const selectedRadio = document.querySelector('input[name="choice"]:checked');
        return selectedRadio ? selectedRadio.value : null;
    }
    
    // Function to parse questions from API response
    function parseQuestionsFromResponse(response) {
        const content = extractContentFromResponse(response);
        const parsedQuestions = [];
        
        // Split the content by "题目："
        const questionBlocks = content.split(/题目：/).filter(block => block.trim());
        
        for (const block of questionBlocks) {
            try {
                // Extract question text
                const questionText = block.split(/[A-D]\.|\n答案：|\n解析：/)[0].trim();
                
                // Extract choices
                const choiceA = block.match(/A\.(.*?)(?=B\.|$)/s)?.[1]?.trim() || '';
                const choiceB = block.match(/B\.(.*?)(?=C\.|$)/s)?.[1]?.trim() || '';
                const choiceC = block.match(/C\.(.*?)(?=D\.|$)/s)?.[1]?.trim() || '';
                const choiceD = block.match(/D\.(.*?)(?=\n答案：|$)/s)?.[1]?.trim() || '';
                
                // Extract answer
                const answer = block.match(/答案：([A-D])/)?.[1] || '';
                
                // Extract explanation
                const explanation = block.match(/解析：([\s\S]*?)(?=题目：|$)/)?.[1]?.trim() || '';
                
                parsedQuestions.push({
                    questionText,
                    choices: {
                        A: choiceA,
                        B: choiceB,
                        C: choiceC,
                        D: choiceD
                    },
                    answer,
                    explanation
                });
            } catch (error) {
                console.error('Error parsing question:', error);
            }
        }
        
        return parsedQuestions;
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
    
    // Function to generate a local response for testing
    function generateLocalResponse(question) {
        // For testing the question generation functionality
        if (question.includes('生成') && question.includes('选择题')) {
            return `题目：下列哪个是二次函数的标准形式？
A. y = ax + b
B. y = ax² + bx + c (a ≠ 0)
C. y = a/x + b
D. y = a^x + b

答案：B
解析：本题主要考察二次函数的标准形式的识别。解题思路是回顾二次函数的定义和表达式形式。首先，二次函数是指自变量的最高次幂为2的函数，其标准形式为y = ax² + bx + c (a ≠ 0)，其中a、b、c是常数，且a不等于0。选项分析：A选项y = ax + b是一次函数的表达式，最高次幂为1；B选项y = ax² + bx + c (a ≠ 0)是二次函数的标准形式，最高次幂为2；C选项y = a/x + b是反比例函数与常数的和，不是多项式函数；D选项y = a^x + b是指数函数与常数的和。需要注意的是二次函数中a不能为0，否则就变成一次函数了。总的来说，二次函数是初中数学中的重要函数类型，它的图像是抛物线。同学们在解题时要特别注意区分不同类型的函数表达式，掌握各种基本函数的特征。

题目：下列关于光的传播说法正确的是：
A. 光在真空中传播速度约为3×10^8 m/s
B. 光在介质中的传播速度总是大于真空中的速度
C. 光在传播过程中不需要介质
D. 光在均匀介质中沿曲线传播

答案：A
解析：本题主要考察光的传播特性。解题思路是回顾光的传播规律和特性。首先，光是一种电磁波，在真空中传播速度约为3×10^8 m/s，这是一个物理常数，通常用字母c表示。选项分析：A选项正确，光在真空中传播速度确实约为3×10^8 m/s；B选项错误，光在介质中的传播速度总是小于真空中的速度，介质的折射率n = c/v > 1，其中v是光在介质中的速度；C选项部分正确但表述不完整，光作为电磁波可以在真空中传播，但这不意味着它在传播过程中"不需要"介质，而是可以在没有介质的情况下传播；D选项错误，根据光的直线传播定律，光在均匀介质中沿直线传播，只有在介质不均匀或经过反射、折射等情况下才会改变传播方向。需要注意的是光的传播特性是物理学中的基础知识，与波动光学和几何光学密切相关。总的来说，光的传播遵循一定的规律，包括直线传播、反射、折射等。同学们在解题时要特别注意区分光在不同环境下的传播特性。

题目：下列哪项不是细胞膜的功能？
A. 控制物质进出细胞
B. 保持细胞形态
C. 进行细胞呼吸
D. 感受外界信号

答案：C
解析：本题主要考察细胞膜的结构和功能。解题思路是回顾细胞膜的主要功能及其在细胞中的作用。首先，细胞膜是由脂质双分子层和蛋白质构成的，具有选择性通透性。选项分析：A选项正确，细胞膜具有选择性通透性，可以控制物质进出细胞，维持细胞内环境的稳定；B选项正确，细胞膜包围细胞，确定细胞边界，有助于保持细胞的形态；C选项错误，细胞呼吸主要在线粒体中进行，特别是有氧呼吸的电子传递链和ATP合成过程发生在线粒体内膜上，而不是细胞膜；D选项正确，细胞膜上有各种受体蛋白，可以感受外界信号并将信号传导到细胞内部。需要注意的是细胞膜与细胞器膜的功能是不同的，不要混淆。总的来说，细胞膜是细胞的重要组成部分，具有多种功能，但不负责细胞呼吸。同学们在解题时要特别注意区分不同细胞结构的功能。`;
        }
        
        // Default response
        return `I'm a simulated AI assistant. Your question was: "${question}". In a real application, this would be answered by connecting to an AI service API. For now, this is just a placeholder response to demonstrate the interface functionality.`;
    }
    
    // Function to optimize questions
    async function optimizeQuestion() {
        const question = userInput.value.trim();
        
        if (!question) {
            showSystemMessage('Please enter a question to optimize.', 'warning');
            return;
        }
        
        // Add optimizing class to button
        optimizeButton.classList.add('optimizing');
        optimizeButton.textContent = '优化中...';
        
        try {
            // In a real application, this would call an API to optimize the question
            // For now, we'll just simulate it
            await new Promise(resolve => setTimeout(resolve, 1500));
            
            // Simulate an optimized question
            const optimizedQuestion = `${question} (请提供详细解释和例子)`;
            
            // Update the textarea
            userInput.value = optimizedQuestion;
            
            // Show success message
            showSystemMessage('问题已优化！', 'success');
        } catch (error) {
            console.error('Error optimizing question:', error);
            showSystemMessage('优化问题时出错，请重试', 'error');
        } finally {
            // Remove optimizing class from button
            optimizeButton.classList.remove('optimizing');
            optimizeButton.textContent = '优化问题';
        }
    }
    
    // Initialize the page
    populateGradeOptions(schoolSelect.value);
    populateSubjectOptions(schoolSelect.value);
}); 