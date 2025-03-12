// Add this code at the very beginning of the file, right after any initial comments

// Immediately executing function to initialize dropdowns with empty values
(function() {
    // Create a function that will run as soon as the DOM is ready
    function initializeEmptyDropdowns() {
        console.log('EARLY INITIALIZATION: Setting empty values for all dropdowns');
        
        // Get all select elements in the document
        const allDropdowns = document.querySelectorAll('select');
        
        // For each dropdown, add an empty option and set it as selected
        allDropdowns.forEach(dropdown => {
            // Skip if this is not a form dropdown we care about
            if (!dropdown.id || 
                (!dropdown.id.includes('school') && 
                 !dropdown.id.includes('grade') && 
                 !dropdown.id.includes('subject') && 
                 !dropdown.id.includes('semester') && 
                 !dropdown.id.includes('difficulty') && 
                 !dropdown.id.includes('count'))) {
                return;
            }
            
            console.log(`EARLY INITIALIZATION: Setting empty value for ${dropdown.id}`);
            
            // Check if an empty option already exists
            let emptyOption = Array.from(dropdown.options).find(option => option.value === '');
            
            // If no empty option exists, create one
            if (!emptyOption) {
                emptyOption = document.createElement('option');
                emptyOption.value = '';
                
                // Set appropriate text based on dropdown type
                if (dropdown.id.includes('school')) {
                    emptyOption.textContent = '请选择学校';
                } else if (dropdown.id.includes('grade')) {
                    emptyOption.textContent = '请选择年级';
                } else if (dropdown.id.includes('subject')) {
                    emptyOption.textContent = '请选择科目';
                } else if (dropdown.id.includes('semester')) {
                    emptyOption.textContent = '请选择学期';
                } else if (dropdown.id.includes('difficulty')) {
                    emptyOption.textContent = '请选择难度';
                } else if (dropdown.id.includes('count')) {
                    emptyOption.textContent = '请选择题数';
                }
                
                // Insert at the beginning
                dropdown.insertBefore(emptyOption, dropdown.firstChild);
            }
            
            // Force select the empty option
            dropdown.value = '';
            
            // Dispatch a change event to ensure any listeners are notified
            const event = new Event('change', { bubbles: true });
            dropdown.dispatchEvent(event);
        });
    }
    
    // Run immediately if DOM is already loaded
    if (document.readyState === 'interactive' || document.readyState === 'complete') {
        initializeEmptyDropdowns();
    } else {
        // Otherwise wait for DOMContentLoaded
        document.addEventListener('DOMContentLoaded', initializeEmptyDropdowns);
    }
    
    // Also run after a short delay to catch any dynamically created dropdowns
    setTimeout(initializeEmptyDropdowns, 100);
    setTimeout(initializeEmptyDropdowns, 500);
    setTimeout(initializeEmptyDropdowns, 1000);
})();

// Override the populateGradeOptions and populateSubjectOptions functions
// to ensure they always include an empty option
const originalPopulateGradeOptions = window.populateGradeOptions || function() {};
window.populateGradeOptions = function(school) {
    // Call the original function
    originalPopulateGradeOptions(school);
    
    // Get both the form and sidebar grade dropdowns
    const gradeDropdown = document.getElementById('grade');
    const sidebarGradeDropdown = document.getElementById('sidebar-grade');
    
    // Ensure empty option exists and is selected for both dropdowns
    [gradeDropdown, sidebarGradeDropdown].forEach(dropdown => {
        if (!dropdown) return;
        
        // Check if an empty option already exists
        let emptyOption = Array.from(dropdown.options).find(option => option.value === '');
        
        // If no empty option exists, create one
        if (!emptyOption) {
            emptyOption = document.createElement('option');
            emptyOption.value = '';
            emptyOption.textContent = '请选择年级';
            dropdown.insertBefore(emptyOption, dropdown.firstChild);
        }
        
        // Force select the empty option if no value is currently selected
        if (!dropdown.value) {
            dropdown.value = '';
        }
    });
};

const originalPopulateSubjectOptions = window.populateSubjectOptions || function() {};
window.populateSubjectOptions = function(school) {
    // Call the original function
    originalPopulateSubjectOptions(school);
    
    // Get both the form and sidebar subject dropdowns
    const subjectDropdown = document.getElementById('subject');
    const sidebarSubjectDropdown = document.getElementById('sidebar-subject');
    
    // Ensure empty option exists and is selected for both dropdowns
    [subjectDropdown, sidebarSubjectDropdown].forEach(dropdown => {
        if (!dropdown) return;
        
        // Check if an empty option already exists
        let emptyOption = Array.from(dropdown.options).find(option => option.value === '');
        
        // If no empty option exists, create one
        if (!emptyOption) {
            emptyOption = document.createElement('option');
            emptyOption.value = '';
            emptyOption.textContent = '请选择科目';
            dropdown.insertBefore(emptyOption, dropdown.firstChild);
        }
        
        // Force select the empty option if no value is currently selected
        if (!dropdown.value) {
            dropdown.value = '';
        }
    });
};

// API configuration variables
let currentApiFunction = 'chat';
let currentModel = 'deepseek-r1';

// Function to parse questions from API response
function parseQuestionsFromResponse(response) {
    console.log('Parsing questions from response:', response);
    
    // Extract content from the API response
    const content = extractContentFromResponse(response);
    if (!content) {
        console.error('No content found in response');
        return [];
    }
    
    console.log('Extracted content:', content);
    const parsedQuestions = [];
    
    // Check if the content already contains "题目：" marker
    let contentToProcess = content;
    if (!content.includes('题目：') && !content.startsWith('题目')) {
        // If not, add it to make parsing consistent
        contentToProcess = '题目：' + content;
    }
    
    // Split the content by "题目："
    const questionBlocks = contentToProcess.split(/题目：/).filter(block => block.trim());
    console.log(`Found ${questionBlocks.length} question blocks`);
    
    if (questionBlocks.length === 0) {
        // If no question blocks found with standard format, try alternative parsing
        console.log('Attempting alternative parsing method');
        
        // Look for numbered questions like "1." or "Question 1:"
        const altQuestionBlocks = content.split(/\d+[\.\:]\s+/).filter(block => block.trim());
        
        if (altQuestionBlocks.length > 0) {
            console.log(`Found ${altQuestionBlocks.length} alternative question blocks`);
            
            for (const block of altQuestionBlocks) {
                try {
                    // Try to extract choices, answer and explanation with more flexible patterns
                    const lines = block.split('\n').map(line => line.trim()).filter(line => line);
                    
                    if (lines.length < 5) continue; // Need at least question + 4 choices
                    
                    const questionText = lines[0];
                    let choiceA = '', choiceB = '', choiceC = '', choiceD = '';
                    let answer = '';
                    let explanation = '';
                    
                    // Look for choices
                    for (let i = 1; i < lines.length; i++) {
                        const line = lines[i];
                        if (line.startsWith('A') || line.startsWith('A.') || line.startsWith('(A)')) {
                            choiceA = line.replace(/^A\.?\s*|\(A\)\s*/, '');
                        } else if (line.startsWith('B') || line.startsWith('B.') || line.startsWith('(B)')) {
                            choiceB = line.replace(/^B\.?\s*|\(B\)\s*/, '');
                        } else if (line.startsWith('C') || line.startsWith('C.') || line.startsWith('(C)')) {
                            choiceC = line.replace(/^C\.?\s*|\(C\)\s*/, '');
                        } else if (line.startsWith('D') || line.startsWith('D.') || line.startsWith('(D)')) {
                            choiceD = line.replace(/^D\.?\s*|\(D\)\s*/, '');
                        } else if (line.includes('答案') || line.toLowerCase().includes('answer')) {
                            answer = line.match(/[A-D]/)?.[0] || '';
                        } else if (line.includes('解析') || line.toLowerCase().includes('explanation')) {
                            explanation = lines.slice(i).join('\n');
                            break;
                        }
                    }
                    
                    if (questionText && (choiceA || choiceB || choiceC || choiceD)) {
                        parsedQuestions.push({
                            questionText: `题目：${questionText}`,
                            choices: {
                                A: choiceA || '选项A',
                                B: choiceB || '选项B',
                                C: choiceC || '选项C',
                                D: choiceD || '选项D'
                            },
                            answer: answer || 'A',
                            explanation: explanation || '无解析'
                        });
                    }
                } catch (error) {
                    console.error('Error parsing alternative question block:', error, block);
                }
            }
        }
    }
    
    // Standard parsing for normal format
    for (const block of questionBlocks) {
        try {
            console.log('Processing question block:', block.substring(0, 100) + '...');
            
            // Extract question text
            const questionText = block.split(/[A-D]\.|\n答案：|\n解析：/)[0].trim();
            console.log('Extracted question text:', questionText);
            
            // Extract choices
            const choiceA = block.match(/A\.(.*?)(?=B\.|$)/s)?.[1]?.trim() || '';
            const choiceB = block.match(/B\.(.*?)(?=C\.|$)/s)?.[1]?.trim() || '';
            const choiceC = block.match(/C\.(.*?)(?=D\.|$)/s)?.[1]?.trim() || '';
            const choiceD = block.match(/D\.(.*?)(?=\n答案：|$)/s)?.[1]?.trim() || '';
            
            console.log('Extracted choices:', { A: choiceA, B: choiceB, C: choiceC, D: choiceD });
            
            // Extract answer
            const answer = block.match(/答案：([A-D])/)?.[1] || '';
            console.log('Extracted answer:', answer);
            
            // Extract explanation
            const explanation = block.match(/解析：([\s\S]*?)(?=题目：|$)/)?.[1]?.trim() || '';
            console.log('Extracted explanation:', explanation.substring(0, 100) + '...');
            
            if (!questionText || !answer) {
                console.warn('Skipping question with missing text or answer');
                continue;
            }
            
            parsedQuestions.push({
                questionText: `题目：${questionText}`,
                choices: {
                    A: choiceA || '选项A未提供',
                    B: choiceB || '选项B未提供',
                    C: choiceC || '选项C未提供',
                    D: choiceD || '选项D未提供'
                },
                answer: answer,
                explanation: explanation || '无解析'
            });
        } catch (error) {
            console.error('Error parsing question block:', error, block);
        }
    }
    
    // If we still have no questions, create a default one to prevent errors
    if (parsedQuestions.length === 0) {
        console.warn('No questions could be parsed, creating a default question');
        parsedQuestions.push({
            questionText: '题目：无法解析API返回的题目，这是一个默认题目',
            choices: {
                A: '选项A',
                B: '选项B',
                C: '选项C',
                D: '选项D'
            },
            answer: 'A',
            explanation: '由于API返回格式问题，无法解析题目。这是一个默认解析。'
        });
    }
    
    console.log(`Successfully parsed ${parsedQuestions.length} questions:`, parsedQuestions);
    return parsedQuestions;
}

// Global function to fetch AI response for question generation
async function fetchAIResponse(prompt) {
    console.log('Fetching AI response with prompt:', prompt);
    
    try {
        // Show loading indicator if it exists
        const loading = document.getElementById('loading');
        if (loading) {
            loading.classList.remove('hidden');
        }
        
        // Make the actual API call using the current API function and model
        const apiEndpoint = `/api/${currentApiFunction}`;
        const response = await fetch(apiEndpoint, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                messages: [
                    {
                        role: "user",
                        content: prompt
                    }
                ],
                model: currentModel,
                temperature: 0.7,
                max_tokens: 2000
            })
        });
        
        if (!response.ok) {
            throw new Error(`API call failed with status: ${response.status}`);
        }
        
        const data = await response.json();
        console.log('API response:', data);
        return data;
        
    } catch (error) {
        console.error('Error in fetchAIResponse:', error);
        throw error; // Re-throw the error to be handled by the caller
    } finally {
        // Hide loading indicator if it exists
        const loading = document.getElementById('loading');
        if (loading) {
            loading.classList.add('hidden');
        }
    }
}

// Function to extract content from API response
function extractContentFromResponse(data) {
    console.log('Extracting content from response:', data);
    
    try {
        // Handle different API response formats
        if (data.choices && data.choices[0]) {
            if (data.choices[0].message && data.choices[0].message.content) {
                // OpenAI-like format
                return data.choices[0].message.content;
            } else if (data.choices[0].content) {
                // Deepseek format
                return data.choices[0].content;
            }
        } else if (data.response) {
            // Simple API format
            return data.response;
        } else if (data.content) {
            // Direct content format
            return data.content;
        } else if (typeof data === 'string') {
            // Already a string
            return data;
        } else {
            // Try to find content in the response
            const possibleContentFields = ['text', 'answer', 'result', 'output', 'generated_text'];
            for (const field of possibleContentFields) {
                if (data[field]) {
                    return data[field];
                }
            }
            
            // If all else fails, stringify the entire response
            console.warn('Could not extract content from response, using stringified response');
            return JSON.stringify(data);
        }
    } catch (error) {
        console.error('Error extracting content from response:', error);
        return '';
    }
}

// Function to show results popup
function showResultsPopup() {
    // Calculate score
    let correctCount = 0;
    window.userAnswers.forEach((answer, index) => {
        if (answer === window.questions[index].answer) {
            correctCount++;
        }
    });
    const scorePercentage = (correctCount / window.questions.length) * 100;

    // Create modal container
    let modalContainer = document.getElementById('results-modal');
    if (!modalContainer) {
        modalContainer = document.createElement('div');
        modalContainer.id = 'results-modal';
        modalContainer.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background-color: rgba(0, 0, 0, 0.5);
            display: flex;
            justify-content: center;
            align-items: center;
            z-index: 1000;
        `;
        document.body.appendChild(modalContainer);
    }

    // Create modal content
    modalContainer.innerHTML = `
        <div class="modal-content" style="
            background: white;
            padding: 30px;
            border-radius: 12px;
            max-width: 800px;
            width: 90%;
            max-height: 90vh;
            overflow-y: auto;
            position: relative;
            box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
        ">
            <button id="close-modal" style="
                position: absolute;
                top: 15px;
                right: 15px;
                background: none;
                border: none;
                font-size: 24px;
                cursor: pointer;
                color: #4a5568;
                padding: 5px;
                z-index: 1;
            ">×</button>
            
            <div style="
                text-align: center;
                margin-bottom: 25px;
            ">
                <h2 style="
                    font-size: clamp(24px, 4vw, 28px);
                    color: #2d3748;
                    margin-bottom: 20px;
                ">测试完成！</h2>
                
                <div style="
                    font-size: clamp(16px, 3vw, 18px);
                    color: #4a5568;
                    margin-bottom: 25px;
                ">
                    总题数: ${window.questions.length} | 
                    正确: ${correctCount} | 
                    正确率: ${scorePercentage.toFixed(1)}%
                </div>
                
                <button id="evaluate-button" style="
                    padding: 12px 25px;
                    font-size: clamp(14px, 2.5vw, 16px);
                    font-weight: 500;
                    background-color: #4299e1;
                    color: white;
                    border: none;
                    border-radius: 8px;
                    cursor: pointer;
                    transition: all 0.2s ease;
                    box-shadow: 0 2px 4px rgba(66, 153, 225, 0.2);
                ">成绩评估</button>
            </div>
            
            <div id="evaluation-result" style="
                display: none;
                margin-top: 20px;
                padding: 20px;
                background: #f8f9fa;
                border-radius: 8px;
                opacity: 0;
                transition: opacity 0.3s ease;
            "></div>
        </div>
    `;

    // Add event listeners
    const closeButton = document.getElementById('close-modal');
    const evaluateButton = document.getElementById('evaluate-button');

    closeButton.addEventListener('click', () => {
        modalContainer.remove();
    });

    evaluateButton.addEventListener('click', handleEvaluateClick);

    // Close modal when clicking outside
    modalContainer.addEventListener('click', (e) => {
        if (e.target === modalContainer) {
            modalContainer.remove();
        }
    });
}

// Function to display the current question
function displayCurrentQuestion() {
    console.log('Displaying current question:', currentQuestionIndex);
    
    if (!questions || questions.length === 0 || currentQuestionIndex === undefined) {
        console.error('No questions available or currentQuestionIndex is undefined');
        return;
    }
    
    // Get the current question
    const currentQuestion = questions[currentQuestionIndex];
    if (!currentQuestion) {
        console.error('Current question is undefined');
        return;
    }
    
    // Get the create container
    const createContainer = document.getElementById('create-container');
    if (!createContainer) {
        console.error('Create container not found');
        return;
    }
    
    // Get or create the questions display container
    let questionsDisplayContainer = document.querySelector('.questions-display-container');
    if (!questionsDisplayContainer) {
        questionsDisplayContainer = document.createElement('div');
        questionsDisplayContainer.className = 'questions-display-container';
        createContainer.appendChild(questionsDisplayContainer);
    }
    
    // Clear the container
    questionsDisplayContainer.innerHTML = '';
    
    // Get educational context from sidebar dropdowns
    const schoolDropdown = document.getElementById('sidebar-school');
    const gradeDropdown = document.getElementById('sidebar-grade');
    const subjectDropdown = document.getElementById('sidebar-subject');
    
    const school = schoolDropdown ? schoolDropdown.value : '';
    const grade = gradeDropdown ? gradeDropdown.value : '';
    const subject = subjectDropdown ? subjectDropdown.value : '';
    
    // Create educational context badge if context is available
    let contextBadge = '';
    if (school || grade || subject) {
        const contextParts = [];
        if (school) contextParts.push(school);
        if (grade) contextParts.push(grade);
        if (subject) contextParts.push(subject);
        
        contextBadge = `
            <div class="context-badge">
                ${contextParts.join(' · ')}
            </div>
        `;
    }
    
    // Create the question counter
    const questionCounter = document.createElement('div');
    questionCounter.className = 'question-counter';
    questionCounter.innerHTML = `
        ${contextBadge}
        <span>第 ${currentQuestionIndex + 1} 题 / 共 ${questions.length} 题</span>
    `;
    questionsDisplayContainer.appendChild(questionCounter);
    
    // Create the question text
    const questionText = document.createElement('div');
    questionText.className = 'question-text';
    questionText.innerHTML = formatMathExpressions(currentQuestion.question);
    questionsDisplayContainer.appendChild(questionText);
    
    // Create the choices container
    const choicesContainer = document.createElement('div');
    choicesContainer.className = 'choices-container';
    questionsDisplayContainer.appendChild(choicesContainer);
    
    // Add the choices
    const choices = currentQuestion.choices;
    const choiceLabels = ['A', 'B', 'C', 'D'];
    
    choices.forEach((choice, index) => {
        const choiceCell = document.createElement('div');
        choiceCell.className = 'choice-cell';
        choiceCell.setAttribute('data-value', choiceLabels[index]);
        
        const choiceLabel = document.createElement('div');
        choiceLabel.className = 'choice-label';
        choiceLabel.textContent = choiceLabels[index];
        
        const choiceContent = document.createElement('div');
        choiceContent.className = 'choice-content';
        choiceContent.innerHTML = formatMathExpressions(choice);
        
        choiceCell.appendChild(choiceLabel);
        choiceCell.appendChild(choiceContent);
        choicesContainer.appendChild(choiceCell);
        
        // Add click event to select the choice
        choiceCell.addEventListener('click', function() {
            // Update all cells
            const allCells = document.querySelectorAll('.choice-cell');
            allCells.forEach(cell => {
                cell.classList.remove('selected');
            });
            
            // Select this cell
            this.classList.add('selected');
            
            // Enable the submit button if it exists
            const submitButton = document.getElementById('submit-button');
            if (submitButton) {
                submitButton.disabled = false;
                submitButton.classList.remove('disabled');
            }
        });
    });
    
    // Create the answer container (initially hidden)
    const answerContainer = document.createElement('div');
    answerContainer.className = 'answer-container hidden';
    questionsDisplayContainer.appendChild(answerContainer);
    
    // Create the navigation controls
    const navigationControls = document.createElement('div');
    navigationControls.className = 'navigation-controls';
    
    // Create the action buttons container
    const actionButtons = document.createElement('div');
    actionButtons.className = 'action-buttons';
    
    // Create the optimize button
    const optimizeButton = document.createElement('button');
    optimizeButton.id = 'optimize-button';
    optimizeButton.className = 'action-button optimize-button';
    optimizeButton.innerHTML = '<i class="fas fa-magic"></i> 优化问题';
    actionButtons.appendChild(optimizeButton);
    
    // Create the submit button
    const submitButton = document.createElement('button');
    submitButton.id = 'submit-button';
    submitButton.className = 'action-button submit-button';
    submitButton.innerHTML = '<i class="fas fa-check"></i> 提交答案';
    actionButtons.appendChild(submitButton);
    
    // Add action buttons to navigation controls
    navigationControls.appendChild(actionButtons);
    
    // Create the navigation buttons
    const navigationButtons = document.createElement('div');
    navigationButtons.className = 'navigation-buttons';
    
    // Create the previous button
    const prevButton = document.createElement('button');
    prevButton.id = 'prev-button';
    prevButton.className = 'nav-button prev-button';
    prevButton.innerHTML = '<i class="fas fa-chevron-left"></i> 上一题';
    prevButton.disabled = currentQuestionIndex === 0;
    navigationButtons.appendChild(prevButton);
    
    // Create the next button
    const nextButton = document.createElement('button');
    nextButton.id = 'next-button';
    nextButton.className = 'nav-button next-button';
    nextButton.innerHTML = '下一题 <i class="fas fa-chevron-right"></i>';
    nextButton.disabled = currentQuestionIndex === questions.length - 1;
    navigationButtons.appendChild(nextButton);
    
    // Add navigation buttons to navigation controls
    navigationControls.appendChild(navigationButtons);
    
    // Add navigation controls to the container
    questionsDisplayContainer.appendChild(navigationControls);
    
    // Make the container visible
    questionsDisplayContainer.classList.remove('hidden');
    
    // Set up the option buttons
    setupOptionButtons();
    
    // Update navigation buttons
    updateNavigationButtons();
    
    // Render math expressions
    if (window.MathJax) {
        window.MathJax.typesetPromise && window.MathJax.typesetPromise();
    } else {
        // If MathJax is not loaded, try to load it
        if (!document.getElementById('mathjax-script')) {
            const script = document.createElement('script');
            script.id = 'mathjax-script';
            script.src = 'https://cdn.jsdelivr.net/npm/mathjax@3/es5/tex-mml-chtml.js';
            script.async = true;
            document.head.appendChild(script);
            
            script.onload = function() {
                window.MathJax = {
                    tex: {
                        inlineMath: [['\\(', '\\)']],
                        displayMath: [['\\[', '\\]']]
                    },
                    svg: {
                        fontCache: 'global'
                    }
                };
                
                // Typeset the math after MathJax is loaded
                window.MathJax.typesetPromise && window.MathJax.typesetPromise();
            };
        }
    }
    
    console.log('displayCurrentQuestion completed');
}

// Function to format math expressions
function formatMathExpressions(text) {
    if (!text) return '';
    
    // Don't process text that already contains properly formatted LaTeX
    if (text.includes('\\(') && text.includes('\\)')) {
        return text;
    }
    
    // Replace LaTeX-style expressions with proper LaTeX delimiters
    // This handles expressions like \( g' = \frac{GM}{(R+h)^2} \)
    text = text.replace(/\\\( (.*?) \\\)/g, '\\($1\\)');
    
    // Replace simple math expressions with LaTeX
    text = text.replace(/\b(\d+[+\-*/]\d+)\b/g, '\\($1\\)');
    
    // Replace fractions written as a/b
    text = text.replace(/(\d+)\/(\d+)/g, '\\(\\frac{$1}{$2}\\)');
    
    // Replace powers written as a^b
    text = text.replace(/(\d+)\^(\d+)/g, '\\($1^{$2}\\)');
    
    // Replace square roots
    text = text.replace(/sqrt\(([^)]+)\)/g, '\\(\\sqrt{$1}\\)');
    
    // Replace existing LaTeX delimiters
    text = text.replace(/\$\$(.*?)\$\$/g, '\\[$1\\]');
    text = text.replace(/\$(.*?)\$/g, '\\($1\\)');
    
    return text;
}

// Global function to update navigation buttons
function updateNavigationButtons() {
    console.log('updateNavigationButtons called', window.currentQuestionIndex, window.questions ? window.questions.length : 0);
    
    const prevButton = document.getElementById('prev-question-button');
    const nextButton = document.getElementById('next-question-button');
    
    if (prevButton) {
        prevButton.disabled = !window.questions || window.currentQuestionIndex <= 0;
    }
    
    if (nextButton) {
        nextButton.disabled = !window.questions || window.currentQuestionIndex >= window.questions.length - 1;
    }

    // Update navigation buttons for mobile
    if (prevButton && nextButton) {
        const buttonStyle = `
            padding: clamp(8px, 3vw, 12px) clamp(15px, 4vw, 25px);
            font-size: clamp(14px, 3.5vw, 16px);
            border-radius: 8px;
            margin: clamp(5px, 2vw, 10px);
        `;
        prevButton.style.cssText += buttonStyle;
        nextButton.style.cssText += buttonStyle;
    }
    
    // Check if all questions are answered and display completion status
    if (window.userAnswers && window.questions) {
        const allQuestionsAnswered = window.userAnswers.length === window.questions.length && 
                                   window.userAnswers.every(answer => answer !== null);
        
        if (allQuestionsAnswered) {
            displayCompletionStatus();
        }
    }
}

// Function to display completion status and score in navigation section
function displayCompletionStatus() {
    // Calculate score
    let correctCount = 0;
    window.userAnswers.forEach((answer, index) => {
        if (answer === window.questions[index].answer) {
            correctCount++;
        }
    });
    const scorePercentage = (correctCount / window.questions.length) * 100;
    
    // Get or create navigation controls
    let navigationControls = document.querySelector('.navigation-controls');
    if (!navigationControls) {
        navigationControls = document.createElement('div');
        navigationControls.className = 'navigation-controls';
        navigationControls.style.cssText = `
            display: flex;
            justify-content: center;
            align-items: center;
            margin: 20px 0;
            width: 100%;
            flex-wrap: wrap;
        `;
        
        const questionsDisplayContainer = document.getElementById('questions-display-container');
        if (questionsDisplayContainer) {
            questionsDisplayContainer.appendChild(navigationControls);
        }
    }
    
    // Check if completion status already exists
    let completionStatus = document.getElementById('completion-status');
    if (!completionStatus) {
        // Create completion status element
        completionStatus = document.createElement('div');
        completionStatus.id = 'completion-status';
        completionStatus.style.cssText = `
            background-color: #ebf8ff;
            border: 1px solid #4299e1;
            border-radius: 8px;
            padding: 12px 20px;
            margin: 0 15px 15px 15px;
            text-align: center;
            color: #2b6cb0;
            font-weight: 500;
            font-size: 16px;
            display: flex;
            flex-direction: column;
            align-items: center;
            gap: 8px;
            width: 100%;
            max-width: 400px;
            box-shadow: 0 2px 4px rgba(66, 153, 225, 0.2);
            animation: fadeIn 0.5s ease;
        `;
        
        // Add completion message
        const completionMessage = document.createElement('div');
        completionMessage.style.cssText = `
            font-size: 18px;
            font-weight: 600;
            color: #2c5282;
            margin-bottom: 5px;
        `;
        completionMessage.textContent = '测试完成！';
        completionStatus.appendChild(completionMessage);
        
        // Add score information
        const scoreInfo = document.createElement('div');
        scoreInfo.style.cssText = `
            display: flex;
            gap: 15px;
            justify-content: center;
            flex-wrap: wrap;
        `;
        
        const totalQuestions = document.createElement('span');
        totalQuestions.textContent = `总题数: ${window.questions.length}`;
        
        const correctAnswers = document.createElement('span');
        correctAnswers.textContent = `正确: ${correctCount}`;
        
        const scorePercent = document.createElement('span');
        scorePercent.textContent = `正确率: ${scorePercentage.toFixed(1)}%`;
        
        scoreInfo.appendChild(totalQuestions);
        scoreInfo.appendChild(correctAnswers);
        scoreInfo.appendChild(scorePercent);
        completionStatus.appendChild(scoreInfo);
        
        // Add evaluation button
        const evaluateButton = document.createElement('button');
        evaluateButton.textContent = '成绩评估';
        evaluateButton.style.cssText = `
            margin-top: 10px;
            padding: 8px 16px;
            background-color: #4299e1;
            color: white;
            border: none;
            border-radius: 6px;
            cursor: pointer;
            font-size: 14px;
            font-weight: 500;
            transition: all 0.2s ease;
        `;
        evaluateButton.addEventListener('click', handleEvaluateClick);
        completionStatus.appendChild(evaluateButton);
        
        // Insert completion status between navigation buttons
        const prevButton = document.getElementById('prev-question-button');
        if (prevButton && prevButton.parentNode === navigationControls) {
            navigationControls.insertBefore(completionStatus, prevButton.nextSibling);
        } else {
            navigationControls.appendChild(completionStatus);
        }
        
        // Add fadeIn animation
        const styleElement = document.createElement('style');
        styleElement.textContent = `
            @keyframes fadeIn {
                from { opacity: 0; transform: translateY(-10px); }
                to { opacity: 1; transform: translateY(0); }
            }
        `;
        document.head.appendChild(styleElement);
    }
}

// Function to handle evaluation button click
function handleEvaluateClick() {
    // Create a summary of the test results
    let correctCount = 0;
    const questionResults = [];
    
    window.userAnswers.forEach((answer, index) => {
        const question = window.questions[index];
        const isCorrect = answer === question.answer;
        if (isCorrect) correctCount++;
        
        // Extract question text without "题目：" prefix
        let questionText = question.questionText;
        if (questionText.startsWith('题目：')) {
            questionText = questionText.substring(3);
        }
        
        questionResults.push({
            questionNumber: index + 1,
            questionText: questionText.substring(0, 50) + (questionText.length > 50 ? '...' : ''),
            userAnswer: answer,
            correctAnswer: question.answer,
            isCorrect: isCorrect
        });
    });
    
    const scorePercentage = (correctCount / window.questions.length) * 100;
    
    // Create prompt for API
    const prompt = `
我刚完成了一个测试，请根据我的表现给出评估和建议。

测试信息：
- 总题数: ${window.questions.length}
- 正确数: ${correctCount}
- 正确率: ${scorePercentage.toFixed(1)}%

题目详情：
${questionResults.map(result => 
    `${result.questionNumber}. ${result.questionText} - ${result.isCorrect ? '正确' : '错误'} (我的答案: ${result.userAnswer}, 正确答案: ${result.correctAnswer})`
).join('\n')}

请提供以下内容：
1. 对我的表现的总体评价
2. 我的优势和不足
3. 针对性的学习建议
4. 如何提高我的弱项
5. 下一步学习计划建议

请用鼓励的语气，并给出具体、实用的建议。
`;

    // Show loading state in the modal
    showEvaluationModal('加载中...');
    
    // Call API to get evaluation
    fetchAIResponse(prompt)
        .then(response => {
            const content = extractContentFromResponse(response);
            showEvaluationModal(content);
        })
        .catch(error => {
            console.error('Error fetching evaluation:', error);
            showEvaluationModal('获取评估时出错，请重试。');
        });
}

// Function to show evaluation modal
function showEvaluationModal(content) {
    // Create or get modal container
    let modalContainer = document.getElementById('evaluation-modal');
    if (!modalContainer) {
        modalContainer = document.createElement('div');
        modalContainer.id = 'evaluation-modal';
        modalContainer.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background-color: rgba(0, 0, 0, 0.5);
            display: flex;
            justify-content: center;
            align-items: center;
            z-index: 1000;
        `;
        document.body.appendChild(modalContainer);
    }
    
    // Create modal content
    let modalContent = '';
    
    if (content === '加载中...') {
        // Show loading spinner
        modalContent = `
            <div class="modal-content" style="
                background: white;
                padding: 30px;
                border-radius: 12px;
                max-width: 800px;
                width: 90%;
                max-height: 90vh;
                overflow-y: auto;
                position: relative;
                box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
                text-align: center;
            ">
                <h2 style="
                    font-size: 24px;
                    color: #2d3748;
                    margin-bottom: 20px;
                ">正在生成评估结果</h2>
                
                <div class="spinner" style="
                    width: 50px;
                    height: 50px;
                    border: 5px solid #e2e8f0;
                    border-top: 5px solid #4299e1;
                    border-radius: 50%;
                    margin: 20px auto;
                    animation: spin 1s linear infinite;
                "></div>
                
                <p style="
                    font-size: 16px;
                    color: #4a5568;
                ">请稍候，我们正在分析您的测试结果...</p>
                
                <style>
                    @keyframes spin {
                        0% { transform: rotate(0deg); }
                        100% { transform: rotate(360deg); }
                    }
                </style>
            </div>
        `;
    } else {
        // Process the content to identify different sections
        const sections = processEvaluationContent(content);
        
        modalContent = `
            <div class="modal-content" style="
                background: white;
                padding: 30px;
                border-radius: 12px;
                max-width: 800px;
                width: 90%;
                max-height: 90vh;
                overflow-y: auto;
                position: relative;
                box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
            ">
                <button id="close-modal" style="
                    position: absolute;
                    top: 15px;
                    right: 15px;
                    background: none;
                    border: none;
                    font-size: 24px;
                    cursor: pointer;
                    color: #4a5568;
                    padding: 5px;
                    z-index: 1;
                ">×</button>
                
                <div style="
                    text-align: center;
                    margin-bottom: 20px;
                    padding-bottom: 15px;
                    border-bottom: 1px solid #e2e8f0;
                ">
                    <h2 style="
                        font-size: 24px;
                        color: #2d3748;
                        margin-bottom: 5px;
                    ">成绩评估结果</h2>
                    <div style="
                        font-size: 14px;
                        color: #718096;
                    ">基于您的测试表现提供的个性化评估和建议</div>
                </div>
                
                <div class="evaluation-cards" style="
                    display: flex;
                    flex-direction: column;
                    gap: 20px;
                ">
                    ${sections.map(section => `
                        <div class="evaluation-card" style="
                            background: ${section.color};
                            border-radius: 10px;
                            padding: 20px;
                            box-shadow: 0 2px 5px rgba(0, 0, 0, 0.05);
                            border-left: 5px solid ${section.borderColor};
                        ">
                            <div class="card-header" style="
                                display: flex;
                                align-items: center;
                                margin-bottom: 15px;
                            ">
                                <div class="card-icon" style="
                                    width: 32px;
                                    height: 32px;
                                    display: flex;
                                    align-items: center;
                                    justify-content: center;
                                    margin-right: 12px;
                                    color: ${section.iconColor};
                                ">${section.icon}</div>
                                <h3 style="
                                    font-size: 18px;
                                    color: #2d3748;
                                    margin: 0;
                                    font-weight: 600;
                                ">${section.title}</h3>
                            </div>
                            <div class="card-content" style="
                                font-size: 16px;
                                color: #4a5568;
                                line-height: 1.6;
                            ">
                                ${section.content}
                            </div>
                        </div>
                    `).join('')}
                </div>
                
                <div style="
                    text-align: center;
                    margin-top: 25px;
                ">
                    <button id="print-evaluation" style="
                        padding: 10px 20px;
                        background-color: #4299e1;
                        color: white;
                        border: none;
                        border-radius: 6px;
                        font-size: 14px;
                        font-weight: 500;
                        cursor: pointer;
                        margin-right: 10px;
                    ">打印评估结果</button>
                    <button id="close-evaluation" style="
                        padding: 10px 20px;
                        background-color: #e2e8f0;
                        color: #4a5568;
                        border: none;
                        border-radius: 6px;
                        font-size: 14px;
                        font-weight: 500;
                        cursor: pointer;
                    ">关闭</button>
                </div>
            </div>
        `;
    }
    
    modalContainer.innerHTML = modalContent;
    
    // Add event listeners
    const closeButton = document.getElementById('close-modal');
    const closeEvaluation = document.getElementById('close-evaluation');
    const printEvaluation = document.getElementById('print-evaluation');
    
    if (closeButton) {
        closeButton.addEventListener('click', () => {
            modalContainer.remove();
        });
    }
    
    if (closeEvaluation) {
        closeEvaluation.addEventListener('click', () => {
            modalContainer.remove();
        });
    }
    
    if (printEvaluation) {
        printEvaluation.addEventListener('click', () => {
            // Create a printable version
            const printContent = document.querySelector('.evaluation-cards').innerHTML;
            const printWindow = window.open('', '_blank');
            printWindow.document.write(`
                <html>
                <head>
                    <title>成绩评估结果</title>
                    <style>
                        body {
                            font-family: Arial, sans-serif;
                            line-height: 1.6;
                            color: #333;
                            max-width: 800px;
                            margin: 0 auto;
                            padding: 20px;
                        }
                        h1 {
                            text-align: center;
                            margin-bottom: 30px;
                        }
                        .evaluation-card {
                            margin-bottom: 20px;
                            padding: 15px;
                            border-radius: 8px;
                            border-left: 5px solid #4299e1;
                        }
                        .card-header {
                            display: flex;
                            align-items: center;
                            margin-bottom: 10px;
                        }
                        .card-icon {
                            margin-right: 10px;
                        }
                        h3 {
                            margin: 0;
                            font-size: 18px;
                        }
                        @media print {
                            body {
                                padding: 0;
                            }
                            .evaluation-card {
                                break-inside: avoid;
                                page-break-inside: avoid;
                            }
                        }
                    </style>
                </head>
                <body>
                    <h1>成绩评估结果</h1>
                    <div class="evaluation-cards">${printContent}</div>
                </body>
                </html>
            `);
            printWindow.document.close();
            printWindow.focus();
            setTimeout(() => {
                printWindow.print();
            }, 500);
        });
    }
    
    // Close modal when clicking outside
    modalContainer.addEventListener('click', (e) => {
        if (e.target === modalContainer) {
            modalContainer.remove();
        }
    });
}

// Function to process evaluation content into sections
function processEvaluationContent(content) {
    // Define section patterns to look for
    const sectionPatterns = [
        {
            keywords: ['总体评价', '总评', '整体表现', 'overall', '总结'],
            title: '总体评价',
            color: '#f0f9ff',
            borderColor: '#3b82f6',
            iconColor: '#3b82f6',
            icon: '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><path d="M12 16v-4"></path><path d="M12 8h.01"></path></svg>'
        },
        {
            keywords: ['优势', '强项', '做得好', 'strengths', '正确'],
            title: '优势与亮点',
            color: '#f0fff4',
            borderColor: '#38a169',
            iconColor: '#38a169',
            icon: '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6L9 17l-5-5"></path></svg>'
        },
        {
            keywords: ['不足', '弱项', '问题', 'weaknesses', '错误', '需要改进'],
            title: '需要改进的地方',
            color: '#fff5f5',
            borderColor: '#e53e3e',
            iconColor: '#e53e3e',
            icon: '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="15" y1="9" x2="9" y2="15"></line><line x1="9" y1="9" x2="15" y2="15"></line></svg>'
        },
        {
            keywords: ['建议', '提高', '改进', '提升', 'suggestions', '学习方法'],
            title: '学习建议',
            color: '#ebf8ff',
            borderColor: '#4299e1',
            iconColor: '#4299e1',
            icon: '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20h9"></path><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"></path></svg>'
        },
        {
            keywords: ['下一步', '计划', '未来', '接下来', 'next steps', '后续'],
            title: '下一步计划',
            color: '#faf5ff',
            borderColor: '#805ad5',
            iconColor: '#805ad5',
            icon: '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14"></path><path d="M12 5l7 7-7 7"></path></svg>'
        }
    ];
    
    // Split content into paragraphs
    const paragraphs = content.split('\n\n').filter(p => p.trim());
    
    // Initialize sections with default "Other" section
    const sections = [];
    let currentSection = null;
    
    // Process each paragraph
    paragraphs.forEach(paragraph => {
        // Check if paragraph starts a new section
        let foundSection = false;
        
        for (const pattern of sectionPatterns) {
            // Check if paragraph contains any of the section keywords
            if (pattern.keywords.some(keyword => 
                paragraph.toLowerCase().includes(keyword.toLowerCase()) &&
                (paragraph.length < 100 || paragraph.indexOf(keyword) < 50)
            )) {
                // If we already have content in the current section, add it to sections
                if (currentSection && currentSection.content) {
                    sections.push(currentSection);
                }
                
                // Start a new section
                currentSection = {
                    title: pattern.title,
                    color: pattern.color,
                    borderColor: pattern.borderColor,
                    iconColor: pattern.iconColor,
                    icon: pattern.icon,
                    content: formatParagraph(paragraph)
                };
                
                foundSection = true;
                break;
            }
        }
        
        // If not a new section, add to current section
        if (!foundSection && currentSection) {
            currentSection.content += formatParagraph(paragraph);
        } else if (!foundSection && !currentSection) {
            // If no current section, create a general section
            currentSection = {
                title: '评估结果',
                color: '#f7fafc',
                borderColor: '#718096',
                iconColor: '#718096',
                icon: '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>',
                content: formatParagraph(paragraph)
            };
        }
    });
    
    // Add the last section if it exists
    if (currentSection && currentSection.content) {
        sections.push(currentSection);
    }
    
    // If no sections were created, create a default one with all content
    if (sections.length === 0) {
        sections.push({
            title: '评估结果',
            color: '#f7fafc',
            borderColor: '#718096',
            iconColor: '#718096',
            icon: '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>',
            content: formatParagraph(content)
        });
    }
    
    return sections;
}

// Helper function to format paragraphs with proper styling
function formatParagraph(paragraph) {
    // Format headings
    let formatted = paragraph
        .replace(/# (.*?)(\n|$)/g, '<h3 style="color:#2c5282;margin-top:15px;margin-bottom:10px;font-size:18px;">$1</h3>')
        .replace(/## (.*?)(\n|$)/g, '<h4 style="color:#2b6cb0;margin-top:12px;margin-bottom:8px;font-size:16px;">$1</h4>')
        .replace(/### (.*?)(\n|$)/g, '<h5 style="color:#3182ce;margin-top:10px;margin-bottom:6px;font-size:15px;">$1</h5>');
    
    // Format lists
    formatted = formatted
        .replace(/\n(\d+\. .*?)(?=\n\d+\. |\n\n|$)/g, '<li style="margin-bottom:8px;">$1</li>')
        .replace(/\n- (.*?)(?=\n- |\n\n|$)/g, '<li style="margin-bottom:8px;">$1</li>');
    
    // Wrap lists in ul tags
    formatted = formatted
        .replace(/(<li.*?<\/li>)+/g, '<ul style="padding-left:20px;margin:10px 0;">$&</ul>');
    
    // Format bold and italic
    formatted = formatted
        .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
        .replace(/\*(.*?)\*/g, '<em>$1</em>');
    
    // Replace newlines with <br> tags
    formatted = formatted.replace(/\n/g, '<br>');
    
    // Add color highlighting for important terms
    formatted = formatted
        .replace(/(优势|strengths|强项)/gi, '<span style="color:#38a169;font-weight:500;">$1</span>')
        .replace(/(不足|weaknesses|弱项|问题)/gi, '<span style="color:#e53e3e;font-weight:500;">$1</span>')
        .replace(/(建议|suggestions|提高|改进|提升)/gi, '<span style="color:#3182ce;font-weight:500;">$1</span>')
        .replace(/(总体评价|overall|表现)/gi, '<span style="color:#6b46c1;font-weight:500;">$1</span>');
    
    return formatted;
}

// Function to handle generating questions
function handleGenerateQuestionsClick() {
    console.log('Generate questions button clicked');
    
    // Get form elements from sidebar
    const schoolDropdown = document.getElementById('sidebar-school');
    const gradeDropdown = document.getElementById('sidebar-grade');
    const semesterDropdown = document.getElementById('sidebar-semester');
    const subjectDropdown = document.getElementById('sidebar-subject');
    const difficultyDropdown = document.getElementById('sidebar-difficulty');
    const countDropdown = document.getElementById('sidebar-count');
    
    // Validate all dropdowns are filled
    const dropdowns = [
        { element: schoolDropdown, name: '学校类型' },
        { element: gradeDropdown, name: '年级' },
        { element: semesterDropdown, name: '学期' },
        { element: subjectDropdown, name: '科目' },
        { element: difficultyDropdown, name: '难度' },
        { element: countDropdown, name: '题目数量' }
    ];
    
    // Check each dropdown
    for (const dropdown of dropdowns) {
        if (!dropdown.element || !dropdown.element.value) {
            showSystemMessage(`请选择${dropdown.name}`, 'warning');
            
            // Highlight the empty dropdown
            if (dropdown.element) {
                // Add a red border to highlight the empty dropdown
                dropdown.element.style.border = '2px solid #e53e3e';
                
                // Remove the highlight after 3 seconds
                setTimeout(() => {
                    dropdown.element.style.border = '';
                }, 3000);
                
                // Focus on the empty dropdown
                dropdown.element.focus();
            }
            
            return; // Stop execution if any dropdown is empty
        }
    }
    
    // If we get here, all dropdowns are filled
    
    // Get the create container and questions display container
    const createContainer = document.getElementById('create-container');
    let questionsDisplayContainer = document.querySelector('.questions-display-container');
    
    // Create the questions display container if it doesn't exist
    if (!questionsDisplayContainer && createContainer) {
        questionsDisplayContainer = document.createElement('div');
        questionsDisplayContainer.className = 'questions-display-container';
        createContainer.appendChild(questionsDisplayContainer);
    }
    
    // Show loading indicator
    showLoadingIndicator();
    
    // Hide empty state if it exists
    const emptyState = document.querySelector('.empty-state');
    if (emptyState) {
        emptyState.classList.add('hidden');
    }
    
    // Get form data
    const school = schoolDropdown ? schoolDropdown.value : '';
    const grade = gradeDropdown ? gradeDropdown.value : '';
    const semester = semesterDropdown ? semesterDropdown.value : '';
    const subject = subjectDropdown ? subjectDropdown.value : '';
    const difficulty = difficultyDropdown ? difficultyDropdown.value : '';
    const count = countDropdown ? countDropdown.value : '5';
    
    console.log(`Generating questions for ${school} ${grade} ${semester} ${subject}, difficulty: ${difficulty}, count: ${count}`);
    
    // Prepare the prompt
    const prompt = `请为${school}${grade}${semester}${subject}生成${count}道${difficulty}难度的选择题，每道题有4个选项(A,B,C,D)，并且只有一个正确答案。

题目格式要求：
1. 每道题必须包含题目、4个选项、答案和详细解析
2. 题目必须按顺序编号
3. 选项必须使用A、B、C、D标记
4. 每道题的答案必须是A、B、C、D中的一个
5. 每道题必须有详细解析
6. "答案："后接正确选项（必须是A、B、C、D其中之一）
7. "解析："后必须包含完整的解析（至少50字）

解析部分必须包含以下内容（缺一不可）：
1. 解题思路和方法，不能超纲
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
5. 解析必须详尽，有教育意义
6. 不出带图形的题目
`;
    
    // Call API to generate questions
    fetchAIResponse(prompt)
        .then(response => {
            try {
                console.log('Processing API response:', response);
                
                // Hide loading indicator
                hideLoadingIndicator();
                
                // Parse the response
                const parsedQuestions = parseQuestionsFromResponse(response);
                
                if (parsedQuestions.length > 0) {
                    // Store the questions globally
                    window.questions = parsedQuestions;
                    window.currentQuestionIndex = 0;
                    
                    // Display the first question
                    displayCurrentQuestion();
                    
                    // Set up navigation buttons
                    setupNavigationButtons();
                    
                    // Hide empty state if it exists
                    if (emptyState) {
                        emptyState.classList.add('hidden');
                    }
                    
                    // Show success message
                    showSystemMessage(`成功生成了 ${parsedQuestions.length} 道题目`, 'success');
                } else {
                    // Show error message
                    showSystemMessage('无法解析生成的题目，请重试', 'error');
                    
                    // Show empty state
                    initializeEmptyState();
                }
            } catch (error) {
                console.error('Error processing questions:', error);
                
                // Hide loading indicator
                hideLoadingIndicator();
                
                // Show error message
                showSystemMessage('处理题目时出错，请重试', 'error');
                
                // Show empty state
                initializeEmptyState();
            }
        })
        .catch(error => {
            console.error('Error generating questions:', error);
            
            // Hide loading indicator
            hideLoadingIndicator();
            
            // Show error message
            showSystemMessage('生成题目时出错，请重试', 'error');
            
            // Show empty state
            initializeEmptyState();
        });
}

// Function to show loading indicator with spinning icon
function showLoadingIndicator() {
    // Get the questions display container
    const questionsDisplayContainer = document.getElementById('questions-display-container');
    if (!questionsDisplayContainer) {
        console.error('Questions display container not found in showLoadingIndicator');
        return;
    }
    
    // Hide empty state if it exists
    const emptyState = document.getElementById('empty-state');
    if (emptyState) {
        emptyState.classList.add('hidden');
    }
    
    // Create loading indicator if it doesn't exist
    let loadingIndicator = document.getElementById('test-loading-indicator');
    if (!loadingIndicator) {
        loadingIndicator = document.createElement('div');
        loadingIndicator.id = 'test-loading-indicator';
        loadingIndicator.style.cssText = `
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            padding: 40px;
            background-color: white;
            border-radius: 12px;
            box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
            margin: 20px auto;
            width: 80%;
            max-width: 500px;
            position: absolute;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            z-index: 100;
        `;
        
        // Create spinning icon
        const spinnerIcon = document.createElement('div');
        spinnerIcon.className = 'spinner-icon';
        spinnerIcon.style.cssText = `
            width: 40px;
            height: 40px;
            border: 4px solid #e2e8f0;
            border-top: 4px solid #4299e1;
            border-radius: 50%;
            animation: spin 1s linear infinite;
            margin-bottom: 20px;
        `;
        
        // Create loading text
        const loadingText = document.createElement('div');
        loadingText.textContent = 'Thinking...';
        loadingText.style.cssText = `
            font-size: 18px;
            color: #4a5568;
            font-weight: 500;
        `;
        
        // Add spinner animation
        const styleElement = document.createElement('style');
        styleElement.textContent = `
            @keyframes spin {
                0% { transform: rotate(0deg); }
                100% { transform: rotate(360deg); }
            }
        `;
        document.head.appendChild(styleElement);
        
        // Assemble loading indicator
        loadingIndicator.appendChild(spinnerIcon);
        loadingIndicator.appendChild(loadingText);
        
        // Add to container without clearing its contents
        questionsDisplayContainer.style.position = 'relative';
        questionsDisplayContainer.appendChild(loadingIndicator);
        questionsDisplayContainer.classList.remove('hidden');
    } else {
        loadingIndicator.style.display = 'flex';
    }
}

// Function to hide loading indicator
function hideLoadingIndicator() {
    const loadingIndicator = document.getElementById('test-loading-indicator');
    if (loadingIndicator) {
        loadingIndicator.style.display = 'none';
    }
}

// Function to set up navigation button event listeners
function setupNavigationButtons() {
    console.log('Setting up navigation buttons');
    
    const prevButton = document.getElementById('prev-question-button');
    const nextButton = document.getElementById('next-question-button');
    
    // Create navigation controls if they don't exist
    let navigationControls = document.querySelector('.navigation-controls');
    if (!navigationControls) {
        navigationControls = document.createElement('div');
        navigationControls.className = 'navigation-controls';
        navigationControls.style.cssText = `
            display: flex;
            justify-content: center;
            align-items: center;
            margin: 20px 0;
            width: 100%;
            flex-wrap: wrap;
            gap: 10px;
        `;
        
        const questionsDisplayContainer = document.getElementById('questions-display-container');
        if (questionsDisplayContainer) {
            questionsDisplayContainer.appendChild(navigationControls);
        }
    }
    
    // Create prev button if it doesn't exist
    if (!prevButton) {
        const newPrevButton = document.createElement('button');
        newPrevButton.id = 'prev-question-button';
        newPrevButton.className = 'nav-button';
        newPrevButton.innerHTML = '&larr; 上一题';
        newPrevButton.style.cssText = `
            padding: clamp(8px, 3vw, 12px) clamp(15px, 4vw, 25px);
            font-size: clamp(14px, 3.5vw, 16px);
            border-radius: 8px;
            margin: clamp(5px, 2vw, 10px);
            background-color: #edf2f7;
            color: #4a5568;
            border: none;
            cursor: pointer;
            transition: all 0.2s ease;
        `;
        
        newPrevButton.addEventListener('click', function() {
            if (window.currentQuestionIndex > 0) {
                window.currentQuestionIndex--;
                displayCurrentQuestion();
                updateNavigationButtons();
            }
        });
        
        navigationControls.appendChild(newPrevButton);
    } else {
        // Remove any existing event listeners
        const newPrevButton = prevButton.cloneNode(true);
        prevButton.parentNode.replaceChild(newPrevButton, prevButton);
        
        // Add new event listener
        newPrevButton.addEventListener('click', function() {
            if (window.currentQuestionIndex > 0) {
                window.currentQuestionIndex--;
                displayCurrentQuestion();
                updateNavigationButtons();
            }
        });
    }
    
    // Create next button if it doesn't exist
    if (!nextButton) {
        const newNextButton = document.createElement('button');
        newNextButton.id = 'next-question-button';
        newNextButton.className = 'nav-button';
        newNextButton.innerHTML = '下一题 &rarr;';
        newNextButton.style.cssText = `
            padding: clamp(8px, 3vw, 12px) clamp(15px, 4vw, 25px);
            font-size: clamp(14px, 3.5vw, 16px);
            border-radius: 8px;
            margin: clamp(5px, 2vw, 10px);
            background-color: #4299e1;
            color: white;
            border: none;
            cursor: pointer;
            transition: all 0.2s ease;
        `;
        
        newNextButton.addEventListener('click', function() {
            if (window.questions && window.currentQuestionIndex < window.questions.length - 1) {
                window.currentQuestionIndex++;
                displayCurrentQuestion();
                updateNavigationButtons();
            }
        });
        
        navigationControls.appendChild(newNextButton);
    } else {
        // Remove any existing event listeners
        const newNextButton = nextButton.cloneNode(true);
        nextButton.parentNode.replaceChild(newNextButton, nextButton);
        
        // Add new event listener
        newNextButton.addEventListener('click', function() {
            if (window.questions && window.currentQuestionIndex < window.questions.length - 1) {
                window.currentQuestionIndex++;
                displayCurrentQuestion();
                updateNavigationButtons();
            }
        });
    }
    
    // Update button states
    updateNavigationButtons();
}

// Function to set up option selection buttons
function setupOptionButtons() {
    console.log('Setting up option buttons');
    
    // Set up optimize button
    const optimizeButton = document.getElementById('optimize-button');
    if (optimizeButton) {
        optimizeButton.addEventListener('click', function() {
            const currentQuestion = questions[currentQuestionIndex];
            if (!currentQuestion) return;
            
            // Get educational context from sidebar dropdowns
            const schoolDropdown = document.getElementById('sidebar-school');
            const gradeDropdown = document.getElementById('sidebar-grade');
            const subjectDropdown = document.getElementById('sidebar-subject');
            
            const school = schoolDropdown ? schoolDropdown.value : '';
            const grade = gradeDropdown ? gradeDropdown.value : '';
            const subject = subjectDropdown ? subjectDropdown.value : '';
            
            // Show loading state
            optimizeButton.disabled = true;
            optimizeButton.innerHTML = '<i class="fas fa-spinner fa-spin"></i> 优化中...';
            
            // Prepare the prompt for optimization with educational context
            let prompt = `请优化以下${school}${grade}${subject}的题目，使其更清晰、更有教育价值，并确保答案和解析准确：
            
问题：${currentQuestion.question}
选项：
A. ${currentQuestion.choices[0]}
B. ${currentQuestion.choices[1]}
C. ${currentQuestion.choices[2]}
D. ${currentQuestion.choices[3]}
答案：${currentQuestion.answer}
解析：${currentQuestion.explanation}`;

            // Add specific educational guidance based on school level
            if (school === '小学') {
                prompt += `\n\n请特别注意：
1. 使用简单、直观的语言，适合${grade}学生的理解水平
2. 确保题目内容符合${grade}${subject}教学大纲
3. 解析应该循序渐进，使用具体例子帮助理解
4. 避免使用过于抽象的概念
5. 增加趣味性和生活化的元素`;
            } else if (school === '初中') {
                prompt += `\n\n请特别注意：
1. 使用清晰但稍有挑战性的语言，适合${grade}学生
2. 确保题目内容符合${grade}${subject}教学大纲
3. 解析应该既有基础知识点讲解，也有思维方法指导
4. 可以适当引入抽象概念，但需要配合具体例子
5. 增加与实际应用相关的内容`;
            } else if (school === '高中') {
                prompt += `\n\n请特别注意：
1. 使用准确、规范的学科语言，适合${grade}学生
2. 确保题目内容符合${grade}${subject}教学大纲和考试要求
3. 解析应该深入分析解题思路和方法，强调知识点间的联系
4. 可以使用较为抽象的概念和复杂的推理
5. 增加与升学考试相关的解题技巧和方法`;
            }

            prompt += `\n\n请返回优化后的问题、选项、答案和解析，格式如下：
问题：[优化后的问题]
选项：
A. [选项A]
B. [选项B]
C. [选项C]
D. [选项D]
答案：[答案]
解析：[解析]`;
            
            // Call the API
            fetchAIResponse(prompt)
                .then(response => {
                    // Extract the optimized question
                    const optimizedContent = extractContentFromResponse(response);
                    
                    // Parse the optimized question
                    const optimizedQuestion = parseOptimizedQuestion(optimizedContent);
                    
                    if (optimizedQuestion) {
                        // Update the current question with optimized content
                        questions[currentQuestionIndex] = {
                            ...questions[currentQuestionIndex],
                            ...optimizedQuestion
                        };
                        
                        // Display the updated question
                        displayCurrentQuestion();
                        
                        // Show success message with educational context
                        showSystemMessage(`问题已根据${school}${grade}${subject}教学要求成功优化！`, 'success');
                    } else {
                        showSystemMessage('无法解析优化后的问题，请重试。', 'error');
                    }
                })
                .catch(error => {
                    console.error('Error optimizing question:', error);
                    showSystemMessage('优化问题时出错，请重试。', 'error');
                })
                .finally(() => {
                    // Reset button state
                    optimizeButton.disabled = false;
                    optimizeButton.innerHTML = '<i class="fas fa-magic"></i> 优化问题';
                });
        });
    }
    
    // Set up submit button
    const submitButton = document.getElementById('submit-button');
    if (submitButton) {
        submitButton.addEventListener('click', function() {
            const selectedChoice = document.querySelector('.choice-cell.selected');
            if (selectedChoice) {
                const selectedValue = selectedChoice.getAttribute('data-value');
                displayAnswer(selectedValue);
                
                // Disable the submit button after submission
                submitButton.disabled = true;
                submitButton.classList.add('disabled');
            } else {
                showSystemMessage('请先选择一个答案', 'warning');
            }
        });
    }
}

// Make sure the function is available globally for the inline onclick handler
window.handleGenerateQuestionsClick = handleGenerateQuestionsClick;
window.fetchAIResponse = fetchAIResponse;
window.parseQuestionsFromResponse = parseQuestionsFromResponse;
window.showSystemMessage = showSystemMessage;
window.extractContentFromResponse = extractContentFromResponse;

// Function to show system messages
function showSystemMessage(message, type = 'info') {
    const messageElement = document.createElement('div');
    messageElement.className = `system-message ${type}`;
    messageElement.textContent = message;
    
    // Get the questions display container
    const questionsDisplayContainer = document.getElementById('questions-display-container');
    
    // Create status container if it doesn't exist
    let statusContainer = document.getElementById('status-container');
    if (!statusContainer) {
        statusContainer = document.createElement('div');
        statusContainer.id = 'status-container';
        statusContainer.className = 'status-container';
        questionsDisplayContainer.insertBefore(statusContainer, questionsDisplayContainer.firstChild);
    }
    
    // Clear previous messages
    statusContainer.innerHTML = '';
    
    // Add new message
    statusContainer.appendChild(messageElement);
    
    // Auto-remove after 5 seconds for non-error messages
    if (type !== 'error') {
        setTimeout(() => {
            messageElement.remove();
        }, 5000);
    }
}

// Initialize the page with form layout
function initializeFormLayout() {
    const formContainer = document.getElementById('question-form-container');
    if (!formContainer) return;
    
    // Style the form container with a more compact look
    formContainer.style.cssText = `
        padding: 15px;
        margin-bottom: 10px;
        background: #ffffff;
        border-radius: 12px;
        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
        min-height: auto;
        height: auto;
        display: flex;
        flex-direction: column;
        transition: all 0.3s ease;
    `;
    
    // Create a flex container for the dropdowns with reduced spacing
    const dropdownContainer = document.createElement('div');
    dropdownContainer.className = 'dropdown-container';
    dropdownContainer.style.cssText = `
        display: flex;
        flex-direction: row;
        justify-content: space-between;
        gap: 12px;
        margin-bottom: 15px;
        flex-wrap: nowrap;
        padding: 8px;
        background: #f8f9fa;
        border-radius: 8px;
    `;
    
    // Move all select elements into the dropdown container
    const selects = formContainer.querySelectorAll('select');
    selects.forEach(select => {
        const wrapper = document.createElement('div');
        wrapper.className = 'select-wrapper';
        wrapper.style.cssText = `
            flex: 1;
            min-width: 0;
            display: flex;
            flex-direction: column;
            margin: 0;
            position: relative;
        `;
        
        // Get the label for this select
        const label = formContainer.querySelector(`label[for="${select.id}"]`);
        if (label) {
            label.style.cssText = `
                margin-bottom: 4px;
                font-size: 13px;
                font-weight: 500;
                color: #4a5568;
                white-space: nowrap;
            `;
            wrapper.appendChild(label);
        }
        
        // Style the select element
        select.style.cssText = `
            width: 100%;
            padding: 6px 10px;
            border: 1px solid #e2e8f0;
            border-radius: 6px;
            font-size: 13px;
            color: #2d3748;
            background-color: white;
            transition: all 0.2s ease;
            cursor: pointer;
            appearance: none;
            background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' fill='%234a5568' viewBox='0 0 16 16'%3E%3Cpath d='M8 11L3 6h10l-5 5z'/%3E%3C/svg%3E");
            background-repeat: no-repeat;
            background-position: right 8px center;
            background-size: 12px;
            margin: 0;
        `;
        
        wrapper.appendChild(select);
        dropdownContainer.appendChild(wrapper);
    });
    
    // Create a more compact button container
    const buttonContainer = document.createElement('div');
    buttonContainer.style.cssText = `
        display: flex;
        justify-content: center;
        padding: 10px 0;
        margin: 5px 0 10px 0;
        border-bottom: 1px solid #edf2f7;
    `;
    
    // Style the generate questions button
    const generateButton = document.getElementById('generate-questions-button');
    if (generateButton) {
        generateButton.style.cssText = `
            padding: 10px 25px;
            font-size: 15px;
            font-weight: 500;
            background-color: #4299e1;
            color: white;
            border: none;
            border-radius: 6px;
            cursor: pointer;
            transition: all 0.2s ease;
            box-shadow: 0 2px 4px rgba(66, 153, 225, 0.2);
        `;
        
        buttonContainer.appendChild(generateButton);
    }
    
    // Style the API function container with reduced spacing
    const apiRadioContainer = document.querySelector('.api-function-container');
    if (apiRadioContainer) {
        apiRadioContainer.style.cssText = `
            padding: 12px;
            margin-top: 5px;
            background-color: #f8f9fa;
            border-top: 1px solid #edf2f7;
            border-radius: 0 0 12px 12px;
            display: flex;
            justify-content: center;
            gap: 15px;
        `;
        
        // Style radio buttons and labels
        const radioButtons = apiRadioContainer.querySelectorAll('input[type="radio"]');
        radioButtons.forEach(radio => {
            const label = radio.nextElementSibling;
            if (label) {
                const wrapper = document.createElement('div');
                wrapper.style.cssText = `
                    display: flex;
                    align-items: center;
                    gap: 6px;
                    padding: 6px 12px;
                    background: white;
                    border-radius: 4px;
                    cursor: pointer;
                    transition: all 0.2s ease;
                `;
                
                radio.style.cssText = `
                    width: 14px;
                    height: 14px;
                    cursor: pointer;
                    accent-color: #4299e1;
                    margin: 0;
                `;
                
                label.style.cssText = `
                    font-size: 13px;
                    color: #4a5568;
                    cursor: pointer;
                    margin: 0;
                `;
                
                // Move radio and label to the wrapper
                radio.parentNode.insertBefore(wrapper, radio);
                wrapper.appendChild(radio);
                wrapper.appendChild(label);
            }
        });
    }
    
    // Insert elements in the correct order with minimal spacing
    const form = document.getElementById('question-form');
    if (form) {
        form.style.cssText = `
            display: flex;
            flex-direction: column;
            gap: 10px;
            padding: 0;
            margin: 0;
        `;
        
        // Remove any existing containers
        const existingDropdownContainer = form.querySelector('.dropdown-container');
        if (existingDropdownContainer) {
            existingDropdownContainer.remove();
        }
        
        // Remove the header if it exists
        const header = form.querySelector('h3');
        if (header && header.textContent.includes('设置问题参数')) {
            header.remove();
        }
        
        // Insert containers in the correct order
        form.insertBefore(dropdownContainer, form.firstChild);
        formContainer.parentNode.insertBefore(buttonContainer, formContainer.nextSibling);
    }
    
    // Set up event listeners for the sidebar toggle
    const sidebarToggle = document.getElementById('sidebar-toggle');
    if (sidebarToggle) {
        sidebarToggle.addEventListener('click', function() {
            const leftPanel = document.querySelector('.left-panel');
    const contentArea = document.querySelector('.content-area');
    
        leftPanel.classList.toggle('hidden');
        contentArea.classList.toggle('full-width');
        sidebarToggle.classList.toggle('collapsed');
        
            // Change the icon direction
            const icon = sidebarToggle.querySelector('i');
            if (icon) {
                if (leftPanel.classList.contains('hidden')) {
                    icon.className = 'fas fa-chevron-right';
                } else {
                    icon.className = 'fas fa-chevron-left';
                }
            }
        });
    }
    
    // Set up event listeners for tab buttons
    const qaButton = document.getElementById('qa-button');
    const createButton = document.getElementById('create-button');
    const qaContainer = document.getElementById('qa-container');
    const createContainer = document.getElementById('create-container');
    
    if (qaButton && createButton && qaContainer && createContainer) {
        qaButton.addEventListener('click', function() {
        qaButton.classList.add('active');
        createButton.classList.remove('active');
            qaContainer.style.display = 'block';
            createContainer.style.display = 'none';
        });
        
        createButton.addEventListener('click', function() {
        createButton.classList.add('active');
        qaButton.classList.remove('active');
            createContainer.style.display = 'block';
            qaContainer.style.display = 'none';
        });
    }
    
    // Set up event listeners for the sidebar generate button
    const sidebarGenerateButton = document.getElementById('sidebar-generate-button');
    if (sidebarGenerateButton) {
        sidebarGenerateButton.addEventListener('click', function() {
            // If not already on the test tab, switch to it
            if (createButton && !createButton.classList.contains('active')) {
                createButton.click();
            }
            
            // Call the generate questions function
            handleGenerateQuestionsClick();
        });
    }
    
    // Add event listeners for the optimize and submit buttons
    setupOptimizeAndSubmitButtons();
}

// Function to set up optimize and submit buttons
function setupOptimizeAndSubmitButtons() {
    // Set up event listener for optimize button
    const optimizeButton = document.getElementById('optimize-button');
    if (optimizeButton) {
        optimizeButton.addEventListener('click', function() {
            const currentQuestion = questions[currentQuestionIndex];
            if (!currentQuestion) return;
            
            // Show loading state
            optimizeButton.disabled = true;
            optimizeButton.innerHTML = '<i class="fas fa-spinner fa-spin"></i> 优化中...';
            
            // Prepare the prompt for optimization
            const prompt = `请优化以下问题，使其更清晰、更有教育价值，并确保答案和解析准确：
            
问题：${currentQuestion.question}
选项：
A. ${currentQuestion.choices[0]}
B. ${currentQuestion.choices[1]}
C. ${currentQuestion.choices[2]}
D. ${currentQuestion.choices[3]}
答案：${currentQuestion.answer}
解析：${currentQuestion.explanation}

请返回优化后的问题、选项、答案和解析，格式如下：
问题：[优化后的问题]
选项：
A. [选项A]
B. [选项B]
C. [选项C]
D. [选项D]
答案：[答案]
解析：[解析]`;
            
            // Call the API
            fetchAIResponse(prompt)
                .then(response => {
                    // Extract the optimized question
                    const optimizedContent = extractContentFromResponse(response);
                    
                    // Parse the optimized question
                    const optimizedQuestion = parseOptimizedQuestion(optimizedContent);
                    
                    if (optimizedQuestion) {
                        // Update the current question with optimized content
                        questions[currentQuestionIndex] = {
                            ...questions[currentQuestionIndex],
                            ...optimizedQuestion
                        };
                        
                        // Display the updated question
                        displayCurrentQuestion();
                        
                        // Show success message
                        showSystemMessage('问题已成功优化！', 'success');
                    } else {
                        showSystemMessage('无法解析优化后的问题，请重试。', 'error');
                    }
                })
                .catch(error => {
                    console.error('Error optimizing question:', error);
                    showSystemMessage('优化问题时出错，请重试。', 'error');
                })
                .finally(() => {
                    // Reset button state
                    optimizeButton.disabled = false;
                    optimizeButton.innerHTML = '<i class="fas fa-magic"></i> 优化问题';
                });
        });
    }
    
    // Set up event listener for submit button
    const submitButton = document.getElementById('submit-button');
    if (submitButton) {
        submitButton.addEventListener('click', function() {
            const selectedChoice = document.querySelector('.choice-cell.selected');
            if (selectedChoice) {
                const selectedValue = selectedChoice.getAttribute('data-value');
                displayAnswer(selectedValue);
                
                // Disable the submit button after submission
                submitButton.disabled = true;
                submitButton.classList.add('disabled');
            } else {
                showSystemMessage('请先选择一个答案', 'warning');
            }
        });
    }
}

// Helper function to parse optimized question from AI response
function parseOptimizedQuestion(content) {
    try {
        const questionMatch = content.match(/问题：([\s\S]*?)(?=选项：|$)/);
        const optionsMatch = content.match(/选项：\s*([\s\S]*?)(?=答案：|$)/);
        const answerMatch = content.match(/答案：([\s\S]*?)(?=解析：|$)/);
        const explanationMatch = content.match(/解析：([\s\S]*?)(?=$)/);
        
        if (!questionMatch || !optionsMatch || !answerMatch || !explanationMatch) {
            return null;
        }
        
        const question = questionMatch[1].trim();
        
        // Parse options
        const optionsText = optionsMatch[1].trim();
        const optionLines = optionsText.split('\n');
        const choices = [];
        
        for (const line of optionLines) {
            const match = line.match(/[A-D]\.\s*(.*)/);
            if (match) {
                choices.push(match[1].trim());
            }
        }
        
        if (choices.length !== 4) {
            return null;
        }
        
        const answer = answerMatch[1].trim();
        const explanation = explanationMatch[1].trim();
        
        return {
            question,
            choices,
            answer,
            explanation
        };
    } catch (error) {
        console.error('Error parsing optimized question:', error);
        return null;
    }
    }
    
    // Function to populate grade options based on selected school
    function populateGradeOptions(school) {
    const gradeSelect = document.getElementById('grade-select');
    const gradeSelectSidebar = document.getElementById('grade-select-sidebar');
    
    if (!gradeSelect) return;
    
        // Clear existing options
        gradeSelect.innerHTML = '';
        
    // Define grade options based on school
    let gradeOptions = [];
        
        switch (school) {
            case '小学':
            gradeOptions = ['一年级', '二年级', '三年级', '四年级', '五年级', '六年级'];
                break;
            case '初中':
            gradeOptions = ['初一', '初二', '初三'];
                break;
            case '高中':
            gradeOptions = ['高一', '高二', '高三'];
                break;
            case '大学':
            gradeOptions = ['大一', '大二', '大三', '大四'];
                break;
            default:
            gradeOptions = ['一年级', '二年级', '三年级', '四年级', '五年级', '六年级'];
    }
    
    // Add options to the select element
    gradeOptions.forEach(grade => {
        const option = document.createElement('option');
        option.value = grade;
        option.textContent = grade;
        gradeSelect.appendChild(option);
    });
    
    // Also update the sidebar dropdown if it exists
    if (gradeSelectSidebar) {
        // Clear existing options
        gradeSelectSidebar.innerHTML = '';
        
        // Add the same options to the sidebar dropdown
        gradeOptions.forEach(grade => {
            const option = document.createElement('option');
            option.value = grade;
            option.textContent = grade;
            gradeSelectSidebar.appendChild(option);
        });
    }
    }
    
    // Function to populate subject options based on selected school
    function populateSubjectOptions(school) {
    const subjectSelect = document.getElementById('subject-select');
    const subjectSelectSidebar = document.getElementById('subject-select-sidebar');
    
    if (!subjectSelect) return;
    
        // Clear existing options
        subjectSelect.innerHTML = '';
        
    // Define subject options based on school
    let subjectOptions = [];
        
        switch (school) {
            case '小学':
            subjectOptions = ['语文', '数学', '英语', '科学', '道德与法治'];
                break;
            case '初中':
            subjectOptions = ['语文', '数学', '英语', '物理', '化学', '生物', '历史', '地理', '政治'];
                break;
            case '高中':
            subjectOptions = ['语文', '数学', '英语', '物理', '化学', '生物', '历史', '地理', '政治'];
                break;
            case '大学':
            subjectOptions = ['高等数学', '大学物理', '计算机科学', '经济学', '管理学'];
                break;
            default:
            subjectOptions = ['语文', '数学', '英语'];
    }
    
    // Add options to the select element
    subjectOptions.forEach(subject => {
        const option = document.createElement('option');
        option.value = subject;
        option.textContent = subject;
        subjectSelect.appendChild(option);
    });
    
    // Also update the sidebar dropdown if it exists
    if (subjectSelectSidebar) {
        // Clear existing options
        subjectSelectSidebar.innerHTML = '';
        
        // Add the same options to the sidebar dropdown
        subjectOptions.forEach(subject => {
            const option = document.createElement('option');
            option.value = subject;
            option.textContent = subject;
            subjectSelectSidebar.appendChild(option);
        });
    }
}

document.addEventListener('DOMContentLoaded', function() {
    // Initialize form layout
    initializeFormLayout();
    
    // Move content creation area to the top for better screen utilization
    moveContentCreationToTop();
    
    // Setup sidebar toggle functionality
    const sidebarToggle = document.getElementById('sidebar-toggle');
    const leftPanel = document.querySelector('.left-panel');
    const contentArea = document.querySelector('.content-area');
    
    if (sidebarToggle && leftPanel && contentArea) {
        sidebarToggle.addEventListener('click', function() {
            leftPanel.classList.toggle('hidden');
            contentArea.classList.toggle('full-width');
            this.classList.toggle('collapsed');
        });
    }
    
    // Setup tab switching functionality
    const qaButton = document.getElementById('qa-button');
    const createButton = document.getElementById('create-button');
    const qaContainer = document.getElementById('qa-container');
    const createContainer = document.getElementById('create-container');
    
    if (qaButton && createButton && qaContainer && createContainer) {
        qaButton.addEventListener('click', function() {
            qaButton.classList.add('active');
            createButton.classList.remove('active');
            qaContainer.classList.remove('hidden');
            createContainer.classList.add('hidden');
        });
        
        createButton.addEventListener('click', function() {
            createButton.classList.add('active');
            qaButton.classList.remove('active');
            createContainer.classList.remove('hidden');
            qaContainer.classList.add('hidden');
            
            // Initialize empty state if no questions are loaded
            initializeEmptyState();
        });
        
        // Initialize empty state on the test page if it's active
        if (createButton.classList.contains('active')) {
            initializeEmptyState();
        }
                } else {
        // If tab buttons don't exist, initialize empty state anyway
        initializeEmptyState();
    }
    
    // Set up initial navigation buttons
    setupNavigationButtons();
    
    // Set up initial option buttons if they exist
    setupOptionButtons();
    
    // Directly populate sidebar dropdowns with initial values
    const schoolSelectSidebar = document.getElementById('school-select-sidebar');
    if (schoolSelectSidebar) {
        const initialSchool = schoolSelectSidebar.value || '小学';
        
        // Define grade options based on school
        let gradeOptions = [];
        switch (initialSchool) {
            case '小学':
                gradeOptions = ['一年级', '二年级', '三年级', '四年级', '五年级', '六年级'];
                break;
            case '初中':
                gradeOptions = ['初一', '初二', '初三'];
                break;
            case '高中':
                gradeOptions = ['高一', '高二', '高三'];
                break;
            case '大学':
                gradeOptions = ['大一', '大二', '大三', '大四'];
                break;
            default:
                gradeOptions = ['一年级', '二年级', '三年级', '四年级', '五年级', '六年级'];
        }
        
        // Define subject options based on school
        let subjectOptions = [];
        switch (initialSchool) {
            case '小学':
                subjectOptions = ['语文', '数学', '英语', '科学'];
                break;
            case '初中':
                subjectOptions = ['语文', '数学', '英语', '物理', '化学', '生物', '历史', '地理', '政治'];
                break;
            case '高中':
                subjectOptions = ['语文', '数学', '英语', '物理', '化学', '生物', '历史', '地理', '政治'];
                break;
            case '大学':
                subjectOptions = ['高等数学', '大学物理', '计算机科学', '经济学', '管理学'];
                break;
            default:
                subjectOptions = ['语文', '数学', '英语'];
        }
        
        // Populate grade dropdown
        const gradeSelectSidebar = document.getElementById('grade-select-sidebar');
        if (gradeSelectSidebar) {
            gradeSelectSidebar.innerHTML = '';
            gradeOptions.forEach(grade => {
                const option = document.createElement('option');
                option.value = grade;
                option.textContent = grade;
                gradeSelectSidebar.appendChild(option);
            });
        }
        
        // Populate subject dropdown
        const subjectSelectSidebar = document.getElementById('subject-select-sidebar');
        if (subjectSelectSidebar) {
            subjectSelectSidebar.innerHTML = '';
            subjectOptions.forEach(subject => {
                const option = document.createElement('option');
                option.value = subject;
                option.textContent = subject;
                subjectSelectSidebar.appendChild(option);
            });
        }
        
        // Add change event listener to update dropdowns when school changes
        schoolSelectSidebar.addEventListener('change', function() {
            const school = this.value;
            
            // Define grade options based on school
            let gradeOptions = [];
            switch (school) {
                case '小学':
                    gradeOptions = ['一年级', '二年级', '三年级', '四年级', '五年级', '六年级'];
                    break;
                case '初中':
                    gradeOptions = ['初一', '初二', '初三'];
                    break;
                case '高中':
                    gradeOptions = ['高一', '高二', '高三'];
                    break;
                case '大学':
                    gradeOptions = ['大一', '大二', '大三', '大四'];
                    break;
                default:
                    gradeOptions = ['一年级', '二年级', '三年级', '四年级', '五年级', '六年级'];
            }
            
            // Define subject options based on school
            let subjectOptions = [];
            switch (school) {
                case '小学':
                    subjectOptions = ['语文', '数学', '英语', '科学'];
                    break;
                case '初中':
                    subjectOptions = ['语文', '数学', '英语', '物理', '化学', '生物', '历史', '地理', '道德与法治'];
                    break;
                case '高中':
                    subjectOptions = ['语文', '数学', '英语', '物理', '化学', '生物', '历史', '地理', '政治'];
                    break;
                case '大学':
                    subjectOptions = ['高等数学', '大学物理', '计算机科学', '经济学', '管理学'];
                    break;
                default:
                    subjectOptions = ['语文', '数学', '英语'];
            }
            
            // Update grade dropdown
            const gradeSelectSidebar = document.getElementById('grade-select-sidebar');
            if (gradeSelectSidebar) {
                gradeSelectSidebar.innerHTML = '';
                gradeOptions.forEach(grade => {
                    const option = document.createElement('option');
                    option.value = grade;
                    option.textContent = grade;
                    gradeSelectSidebar.appendChild(option);
                });
            }
            
            // Update subject dropdown
            const subjectSelectSidebar = document.getElementById('subject-select-sidebar');
            if (subjectSelectSidebar) {
                subjectSelectSidebar.innerHTML = '';
                subjectOptions.forEach(subject => {
                    const option = document.createElement('option');
                    option.value = subject;
                    option.textContent = subject;
                    subjectSelectSidebar.appendChild(option);
                });
            }
        });
    }

    // Add click handler for sidebar generate button
    const sidebarGenerateButton = document.createElement('button');
    sidebarGenerateButton.textContent = '出题';
    sidebarGenerateButton.className = 'sidebar-generate-button';
    sidebarGenerateButton.addEventListener('click', function() {
        // Switch to the test tab if not already there
        const createButton = document.getElementById('create-button');
        if (createButton && !createButton.classList.contains('active')) {
            createButton.click();
        }
        
        // Then generate questions
        handleGenerateQuestionsClick();
    });
    
    // Add the button to the second frame
    const testFrame = document.querySelector('.sidebar-frame:nth-child(2) .frame-content');
    if (testFrame) {
        testFrame.appendChild(sidebarGenerateButton);
    }
});

// Function to move content creation area to the top
function moveContentCreationToTop() {
    const createContainer = document.getElementById('create-container');
    const questionsDisplayContainer = document.getElementById('questions-display-container');
    
    if (createContainer && questionsDisplayContainer) {
        // Ensure the questions display container is at the top
        createContainer.style.display = 'flex';
        createContainer.style.flexDirection = 'column';
        
        // Move questions display to the top
        if (questionsDisplayContainer.parentNode === createContainer) {
            createContainer.insertBefore(questionsDisplayContainer, createContainer.firstChild);
        }
        
        // Style the questions display container for better visibility
        questionsDisplayContainer.style.cssText = `
            margin-bottom: 20px;
            width: 100%;
            box-sizing: border-box;
        `;
        
        // Ensure navigation controls are below the questions
        const navigationControls = document.querySelector('.navigation-controls');
        if (navigationControls && navigationControls.parentNode === createContainer) {
            createContainer.appendChild(navigationControls);
        }
    }
}

// Function to initialize empty state on the test page
function initializeEmptyState() {
    const createContainer = document.getElementById('create-container');
    const questionsDisplayContainer = document.getElementById('questions-display-container');
    
    // Only initialize empty state if no questions are loaded
    if (!window.questions || window.questions.length === 0) {
        // Create or get the empty state element
        let emptyState = document.getElementById('empty-state');
        
        if (!emptyState) {
            emptyState = document.createElement('div');
            emptyState.id = 'empty-state';
            emptyState.className = 'empty-state';
            emptyState.style.cssText = `
                display: flex;
                flex-direction: column;
                align-items: center;
                justify-content: center;
                padding: 40px 20px;
                text-align: center;
                background-color: white;
                border-radius: 12px;
                box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
                margin: 20px auto;
                max-width: 600px;
            `;
            
            // Create icon
            const icon = document.createElement('div');
            icon.innerHTML = `
                <svg width="80" height="80" viewBox="0 0 24 24" fill="none" stroke="#4299e1" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M12 20h9"></path>
                    <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"></path>
                </svg>
            `;
            icon.style.cssText = `
                margin-bottom: 20px;
                color: #4299e1;
            `;
            
            // Create heading
            const heading = document.createElement('h3');
            heading.textContent = '准备好开始测验了吗？';
            heading.style.cssText = `
                font-size: 24px;
                color: #2d3748;
                                    margin-bottom: 15px;
            `;
            
            // Create description
            const description = document.createElement('p');
            description.textContent = '使用左侧边栏选择学校类型、年级、学期、科目、难度和题目数量，然后点击"出题"按钮生成测验题目。';
            description.style.cssText = `
                font-size: 16px;
                color: #4a5568;
                line-height: 1.6;
                max-width: 500px;
            `;
            
            // Assemble empty state
            emptyState.appendChild(icon);
            emptyState.appendChild(heading);
            emptyState.appendChild(description);
            
            // Add to container
            if (questionsDisplayContainer) {
                questionsDisplayContainer.innerHTML = '';
                questionsDisplayContainer.appendChild(emptyState);
                questionsDisplayContainer.classList.remove('hidden');
            } else if (createContainer) {
                // Create questions display container if it doesn't exist
                const newQuestionsContainer = document.createElement('div');
                newQuestionsContainer.id = 'questions-display-container';
                newQuestionsContainer.className = 'questions-display-container';
                newQuestionsContainer.appendChild(emptyState);
                
                createContainer.innerHTML = '';
                createContainer.appendChild(newQuestionsContainer);
            }
        } else {
            // Make sure the empty state is visible
            emptyState.classList.remove('hidden');
            
            // Make sure the questions display container is visible
            if (questionsDisplayContainer) {
                questionsDisplayContainer.classList.remove('hidden');
            }
        }
    }
} 

// Add event listeners for the optimize and submit buttons in the chat interface
const optimizeButton = document.getElementById('optimize-button');
if (optimizeButton) {
    optimizeButton.addEventListener('click', function() {
        // Get the chat input
        const chatInput = document.getElementById('chat-input');
        if (!chatInput || !chatInput.value.trim()) {
            showSystemMessage('请先输入问题内容', 'warning');
                return;
            }
            
        const questionText = chatInput.value.trim();
        
                // Show loading state
        optimizeButton.disabled = true;
        optimizeButton.innerHTML = '<i class="fas fa-spinner fa-spin"></i> 优化中...';
        
        // Prepare the prompt for optimization
        const prompt = `请优化以下问题，使其更清晰、更有教育价值：
        
问题：${questionText}

请返回优化后的问题，保持原始意图但使其更加清晰、准确和有教育意义。`;
        
        // Call the API
        fetchAIResponse(prompt)
            .then(response => {
                // Extract the optimized question
                const optimizedContent = extractContentFromResponse(response);
                
                // Update the chat input with the optimized question
                chatInput.value = optimizedContent.replace(/^问题：|^优化后的问题：/i, '').trim();
                
                // Focus the input and move cursor to end
                chatInput.focus();
                chatInput.setSelectionRange(chatInput.value.length, chatInput.value.length);
                
                // Show success message
                showSystemMessage('问题已成功优化！', 'success');
            })
            .catch(error => {
                console.error('Error optimizing question:', error);
                showSystemMessage('优化问题时出错，请重试。', 'error');
            })
            .finally(() => {
                // Reset button state
                optimizeButton.disabled = false;
                optimizeButton.innerHTML = '<i class="fas fa-magic"></i> 优化问题';
            });
    });
}

const submitButton = document.getElementById('submit-button');
if (submitButton) {
    submitButton.addEventListener('click', function() {
        // Get the chat input
        const chatInput = document.getElementById('chat-input');
        if (!chatInput || !chatInput.value.trim()) {
            showSystemMessage('请先输入问题内容', 'warning');
            return;
        }
        
        const questionText = chatInput.value.trim();
        
        // Show loading state
        submitButton.disabled = true;
        submitButton.innerHTML = '<i class="fas fa-spinner fa-spin"></i> 提交中...';
        
        // Add the user message to the chat
        const chatMessages = document.querySelector('.chat-messages');
        if (chatMessages) {
            const userMessage = document.createElement('div');
            userMessage.className = 'chat-message user-message';
            userMessage.innerHTML = `
                <div class="message-content">
                    <div class="message-text">${questionText}</div>
                    <div class="message-time">${new Date().toLocaleTimeString()}</div>
                </div>
                <div class="avatar user-avatar"><i class="fas fa-user"></i></div>
            `;
            chatMessages.appendChild(userMessage);
            chatMessages.scrollTop = chatMessages.scrollHeight;
        }
        
        // Clear the input
        chatInput.value = '';
        
        // Prepare the prompt for the AI
        const prompt = `请回答以下问题，提供详细且教育性的解答：
        
${questionText}

请提供清晰、准确、有教育意义的回答，如果涉及数学或科学概念，请确保解释清楚。`;
        
        // Call the API
        fetchAIResponse(prompt)
            .then(response => {
                // Extract the AI response
                const aiResponse = extractContentFromResponse(response);
                
                // Add the AI response to the chat
                if (chatMessages) {
                    const assistantMessage = document.createElement('div');
                    assistantMessage.className = 'chat-message assistant-message';
                    assistantMessage.innerHTML = `
                        <div class="avatar assistant-avatar"><i class="fas fa-robot"></i></div>
                        <div class="message-content">
                            <div class="message-text">${formatMathExpressions(aiResponse)}</div>
                            <div class="message-time">${new Date().toLocaleTimeString()}</div>
                        </div>
                    `;
                    chatMessages.appendChild(assistantMessage);
                    chatMessages.scrollTop = chatMessages.scrollHeight;
                    
                    // Render MathJax in the new message
                    if (window.MathJax) {
                        MathJax.typesetPromise([assistantMessage]).catch(err => console.error('MathJax error:', err));
                    }
                }
            })
            .catch(error => {
                console.error('Error submitting question:', error);
                showSystemMessage('提交问题时出错，请重试。', 'error');
                
                // Add error message to chat
                if (chatMessages) {
                    const errorMessage = document.createElement('div');
                    errorMessage.className = 'chat-message system-message';
                    errorMessage.innerHTML = `
                        <div class="avatar system-avatar"><i class="fas fa-exclamation-circle"></i></div>
                        <div class="message-content">
                            <div class="message-text">抱歉，处理您的问题时出现了错误。请重试。</div>
                            <div class="message-time">${new Date().toLocaleTimeString()}</div>
                        </div>
                    `;
                    chatMessages.appendChild(errorMessage);
                    chatMessages.scrollTop = chatMessages.scrollHeight;
                }
            })
            .finally(() => {
                // Reset button state
                submitButton.disabled = false;
                submitButton.innerHTML = '<i class="fas fa-paper-plane"></i> 提交问题';
            });
    });
}

// Modify initializeFormLayout to call setupChatButtons
function initializeFormLayout() {
    // ... existing code ...
    
    // Setup tab switching functionality
    const qaButton = document.getElementById('qa-button');
    const createButton = document.getElementById('create-button');
    const qaContainer = document.getElementById('qa-container');
    const createContainer = document.getElementById('create-container');
    
    if (qaButton && createButton && qaContainer && createContainer) {
        qaButton.addEventListener('click', function() {
            qaButton.classList.add('active');
            createButton.classList.remove('active');
            qaContainer.classList.remove('hidden');
            createContainer.classList.add('hidden');
            
            // Set up chat buttons when switching to QA tab
            setTimeout(setupChatButtons, 100);
        });
        
        createButton.addEventListener('click', function() {
            createButton.classList.add('active');
            qaButton.classList.remove('active');
            createContainer.classList.remove('hidden');
            qaContainer.classList.add('hidden');
            
            // Initialize empty state if no questions are loaded
            initializeEmptyState();
        });
        
        // Initialize empty state on the test page if it's active
        if (createButton.classList.contains('active')) {
            initializeEmptyState();
        } else if (qaButton.classList.contains('active')) {
            // Set up chat buttons if QA tab is active
            setTimeout(setupChatButtons, 100);
        }
    } else {
        // If tab buttons don't exist, initialize empty state anyway
        initializeEmptyState();
    }
    
    // Set up initial navigation buttons
    setupNavigationButtons();
    
    // Set up chat buttons on page load
    setupChatButtons();
    
    // ... existing code ...
}

// Add this at the end of the file to ensure buttons are set up when the page loads
document.addEventListener('DOMContentLoaded', function() {
    // Set up chat buttons when the page loads
    setTimeout(setupChatButtons, 300);
});

// Modify the setupChatButtons function to create the chat interface if it doesn't exist
function setupChatButtons() {
    console.log('Setting up chat buttons');
    
    // First, ensure the chat interface exists
    createChatInterface();
    
    // Now get the chat input and response area
    const chatInput = document.getElementById('chat-input');
    const chatResponse = document.getElementById('chat-response');
    
    if (!chatInput || !chatResponse) {
        console.error('Chat input or response area not found even after creation');
        return;
    }
    
    // Set up optimize button
    const optimizeButton = document.getElementById('optimize-button');
    if (optimizeButton) {
        optimizeButton.addEventListener('click', function() {
            const questionText = chatInput.value.trim();
            
            if (!questionText) {
                showSystemMessage('请先输入问题内容', 'warning');
                return;
            }
            
            // Get selected school and grade from sidebar (ignore subject)
            const selectedSchool = document.getElementById('sidebar-school')?.value || '';
            const selectedGrade = document.getElementById('sidebar-grade')?.value || '';
            
            // Show loading state
            optimizeButton.disabled = true;
            optimizeButton.innerHTML = '<i class="fas fa-spinner fa-spin"></i> 优化中...';
            
            // Prepare the prompt for optimization with educational context
            let prompt = `请优化以下问题，使其更清晰、更有教育价值：
            
问题：${questionText}`;

            // Add educational context if available - focus on school and grade only
            if (selectedSchool || selectedGrade) {
                prompt += `\n\n教育背景：`;
                
                if (selectedSchool) {
                    prompt += `\n- 学校类型：${selectedSchool}`;
                }
                
                if (selectedGrade) {
                    prompt += `\n- 年级：${selectedGrade}`;
                }
                
                // Add specific guidance based on school level
                if (selectedSchool === '小学') {
                    prompt += `\n\n请根据上述教育背景，优化问题使其更适合${selectedGrade}学生的理解水平。使用简单、直观的语言，避免抽象概念，增加趣味性和生活化的元素。`;
                } else if (selectedSchool === '初中') {
                    prompt += `\n\n请根据上述教育背景，优化问题使其更适合${selectedGrade}学生的理解水平。使用清晰但稍有挑战性的语言，可以适当引入抽象概念，但需要配合具体例子。`;
                } else if (selectedSchool === '高中') {
                    prompt += `\n\n请根据上述教育背景，优化问题使其更适合${selectedGrade}学生的理解水平。使用准确、规范的学科语言，可以使用较为抽象的概念和复杂的推理。`;
                } else {
                    prompt += `\n\n请根据上述教育背景，优化问题使其更适合该年级学生的理解水平和学习需求。`;
                }
            } else {
                prompt += `\n\n请保持原始意图但使其更加清晰、准确和有教育意义。`;
            }
            
            // Call the API
            fetchAIResponse(prompt)
                .then(response => {
                    // Extract the optimized question
                    const optimizedContent = extractContentFromResponse(response);
                    
                    // Update the chat input with the optimized question
                    chatInput.value = optimizedContent.replace(/^问题：|^优化后的问题：/i, '').trim();
                    
                    // Focus the input and move cursor to end
                    chatInput.focus();
                    chatInput.setSelectionRange(chatInput.value.length, chatInput.value.length);
                    
                    // Show success message with educational context if available
                    if (selectedSchool && selectedGrade) {
                        showSystemMessage(`问题已根据${selectedSchool}${selectedGrade}教学要求成功优化！`, 'success');
                    } else {
                        showSystemMessage('问题已成功优化！', 'success');
                    }
                })
                .catch(error => {
                    console.error('Error optimizing question:', error);
                    showSystemMessage('优化问题时出错，请重试。', 'error');
                })
                .finally(() => {
                    // Reset button state
                    optimizeButton.disabled = false;
                    optimizeButton.innerHTML = '<i class="fas fa-magic"></i> 优化问题';
                });
        });
    }
    
    // Set up submit button
    const submitButton = document.getElementById('submit-button');
    if (submitButton) {
        submitButton.addEventListener('click', function() {
            const questionText = chatInput.value.trim();
            
            if (!questionText) {
                showSystemMessage('请先输入问题内容', 'warning');
                return;
            }
            
            // Get selected school and grade from sidebar (ignore subject)
            const selectedSchool = document.getElementById('sidebar-school')?.value || '';
            const selectedGrade = document.getElementById('sidebar-grade')?.value || '';
            
            // Show loading state
            submitButton.disabled = true;
            submitButton.innerHTML = '<i class="fas fa-spinner fa-spin"></i> 提交中...';
            chatResponse.innerHTML = '<div class="loading-indicator"><i class="fas fa-spinner fa-spin"></i> 正在思考...</div>';
            
            // Prepare the prompt for the AI with educational context
            let prompt = `请回答以下问题，提供详细且教育性的解答：
            
${questionText}`;

            // Add educational context if available - focus on school and grade only
            if (selectedSchool || selectedGrade) {
                prompt += `\n\n教育背景：`;
                
                if (selectedSchool) {
                    prompt += `\n- 学校类型：${selectedSchool}`;
                }
                
                if (selectedGrade) {
                    prompt += `\n- 年级：${selectedGrade}`;
                }
                
                // Add specific guidance based on school level
                if (selectedSchool === '小学') {
                    prompt += `\n\n请根据上述教育背景，提供适合${selectedGrade}学生理解水平的回答。解释应该：
1. 使用简单、直观的语言
2. 避免复杂的术语和抽象概念
3. 使用具体的例子和生活化的比喻
4. 分步骤解释，每一步都要清晰明了
5. 增加趣味性和鼓励性的内容`;
                } else if (selectedSchool === '初中') {
                    prompt += `\n\n请根据上述教育背景，提供适合${selectedGrade}学生理解水平的回答。解释应该：
1. 使用清晰但稍有挑战性的语言
2. 可以引入基础学科术语，但需要解释
3. 结合具体例子和适当的抽象概念
4. 强调思维方法和解题思路
5. 鼓励批判性思考和自主探索`;
                } else if (selectedSchool === '高中') {
                    prompt += `\n\n请根据上述教育背景，提供适合${selectedGrade}学生理解水平的回答。解释应该：
1. 使用准确、规范的学科语言
2. 可以使用专业术语和抽象概念
3. 深入分析问题的本质和解决方法
4. 强调知识点之间的联系和系统性
5. 提供与升学考试相关的解题技巧和方法`;
                } else {
                    prompt += `\n\n请根据上述教育背景，提供适合该年级学生理解水平的回答。解释应该清晰易懂，使用适合该年级学生的语言和概念。`;
                }
            } else {
                prompt += `\n\n请提供清晰、准确、有教育意义的回答，如果涉及数学或科学概念，请确保解释清楚。`;
            }
            
            // Call the API
            fetchAIResponse(prompt)
                .then(response => {
                    // Extract the AI response
                    const aiResponse = extractContentFromResponse(response);
                    
                    // Format the response with MathJax
                    const formattedResponse = formatMathExpressions(aiResponse);
                    
                    // Display the response with educational context
                    let contextHeader = '';
                    if (selectedSchool || selectedGrade) {
                        const contextParts = [];
                        if (selectedSchool) contextParts.push(selectedSchool);
                        if (selectedGrade) contextParts.push(selectedGrade);
                        
                        contextHeader = `
                            <div class="context-header">
                                <span class="context-badge">${contextParts.join(' · ')}</span>
                            </div>
                        `;
                    }
                    
                    chatResponse.innerHTML = `
                        <div class="response-header">
                            <i class="fas fa-robot"></i> AI 助手回答
                        </div>
                        ${contextHeader}
                        <div class="response-content">
                            ${formattedResponse}
            </div>
        `;
        
                    // Render MathJax in the response
                    if (window.MathJax) {
                        MathJax.typesetPromise([chatResponse]).catch(err => console.error('MathJax error:', err));
                    }
                })
                .catch(error => {
                    console.error('Error submitting question:', error);
                    chatResponse.innerHTML = `
                        <div class="error-message">
                            <i class="fas fa-exclamation-circle"></i>
                            抱歉，处理您的问题时出错。请重试。
                        </div>
                    `;
                    showSystemMessage('提交问题时出错，请重试。', 'error');
                })
                .finally(() => {
                    // Reset button state
                    submitButton.disabled = false;
                    submitButton.innerHTML = '<i class="fas fa-paper-plane"></i> 提交问题';
                });
        });
    }
}

// Add a new function to create the chat interface
function createChatInterface() {
    const qaContainer = document.getElementById('qa-container');
    if (!qaContainer) {
        console.error('QA container not found');
        return;
    }
    
    // Check if the chat interface already exists
    if (document.getElementById('chat-interface')) {
        return; // Already exists, no need to create it
    }
    
    // Create the chat interface
    const chatInterface = document.createElement('div');
    chatInterface.id = 'chat-interface';
    chatInterface.className = 'chat-interface';
    chatInterface.style.cssText = 'display: flex; flex-direction: column; height: 100%; padding: 20px; gap: 20px;';
    
    // Create the chat input area
    const chatInputArea = document.createElement('div');
    chatInputArea.className = 'chat-input-area';
    chatInputArea.style.cssText = 'display: flex; flex-direction: column; gap: 10px;';
    
    // Create the textarea
    const chatInput = document.createElement('textarea');
    chatInput.id = 'chat-input';
    chatInput.className = 'chat-input';
    chatInput.placeholder = '输入您的问题...';
    chatInput.style.cssText = 'width: 100%; min-height: 100px; padding: 12px; border: 1px solid #e2e8f0; border-radius: 8px; font-size: 16px; resize: vertical;';
    
    // Create the buttons container
    const buttonsContainer = document.createElement('div');
    buttonsContainer.className = 'chat-buttons';
    buttonsContainer.style.cssText = 'display: flex; gap: 10px; justify-content: flex-end;';
    
    // Create the optimize button
    const optimizeButton = document.createElement('button');
    optimizeButton.id = 'optimize-button';
    optimizeButton.className = 'chat-button optimize-button';
    optimizeButton.innerHTML = '<i class="fas fa-magic"></i> 优化问题';
    optimizeButton.style.cssText = 'padding: 8px 16px; background-color: #4299e1; color: white; border: none; border-radius: 4px; cursor: pointer; display: flex; align-items: center; gap: 5px;';
    
    // Create the submit button
    const submitButton = document.createElement('button');
    submitButton.id = 'submit-button';
    submitButton.className = 'chat-button submit-button';
    submitButton.innerHTML = '<i class="fas fa-paper-plane"></i> 提交问题';
    submitButton.style.cssText = 'padding: 8px 16px; background-color: #48bb78; color: white; border: none; border-radius: 4px; cursor: pointer; display: flex; align-items: center; gap: 5px;';
    
    // Add buttons to container
    buttonsContainer.appendChild(optimizeButton);
    buttonsContainer.appendChild(submitButton);
    
    // Add textarea and buttons to input area
    chatInputArea.appendChild(chatInput);
    chatInputArea.appendChild(buttonsContainer);
    
    // Create the response area
    const chatResponse = document.createElement('div');
    chatResponse.id = 'chat-response';
    chatResponse.className = 'chat-response';
    chatResponse.style.cssText = 'background-color: #f8fafc; border-radius: 8px; padding: 20px; min-height: 100px; max-height: 500px; overflow-y: auto;';
    
    // Add a welcome message
    chatResponse.innerHTML = `
        <div class="welcome-message" style="text-align: center; color: #718096;">
            <i class="fas fa-comment-dots" style="font-size: 24px; margin-bottom: 10px;"></i>
            <h3 style="margin: 0 0 10px 0; font-size: 18px;">欢迎使用AI学习助手</h3>
            <p style="margin: 0; font-size: 14px;">在上方输入您的问题，点击"提交问题"获取回答</p>
        </div>
    `;
    
    // Add input area and response area to chat interface
    chatInterface.appendChild(chatInputArea);
    chatInterface.appendChild(chatResponse);
    
    // Add the chat interface to the QA container
    qaContainer.innerHTML = ''; // Clear any existing content
    qaContainer.appendChild(chatInterface);
    
    // Add CSS for the chat interface
    const style = document.createElement('style');
    style.textContent = `
        .chat-button:hover {
            opacity: 0.9;
        }
        .chat-button:active {
            transform: translateY(1px);
        }
        .chat-button:disabled {
            opacity: 0.7;
            cursor: not-allowed;
        }
        .loading-indicator {
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 10px;
            color: #718096;
            font-size: 16px;
            padding: 20px;
        }
        .response-header {
            display: flex;
            align-items: center;
            gap: 8px;
            font-weight: 600;
            color: #2d3748;
            margin-bottom: 10px;
            font-size: 16px;
        }
        .context-header {
            margin-bottom: 12px;
        }
        .context-badge {
            display: inline-block;
            background-color: #ebf8ff;
            color: #3182ce;
            padding: 4px 8px;
            border-radius: 4px;
            font-size: 12px;
            font-weight: 500;
        }
        .response-content {
            line-height: 1.6;
            color: #4a5568;
            white-space: pre-wrap;
        }
        .error-message {
            color: #e53e3e;
            display: flex;
            align-items: center;
            gap: 8px;
            font-size: 16px;
        }
    `;
    document.head.appendChild(style);
    
    // Add event listener for Ctrl+Enter to submit
    chatInput.addEventListener('keydown', function(event) {
        if ((event.ctrlKey || event.metaKey) && event.key === 'Enter') {
            event.preventDefault();
            submitButton.click();
        }
    });
}

// Modify the populateGradeOptions function to start with an empty option
function populateGradeOptions(school) {
    const gradeOptions = {
        '小学': ['一年级', '二年级', '三年级', '四年级', '五年级', '六年级'],
        '初中': ['初一', '初二', '初三'],
        '高中': ['高一', '高二', '高三']
    };
    
    // Get both the form and sidebar grade dropdowns
    const gradeDropdown = document.getElementById('grade');
    const sidebarGradeDropdown = document.getElementById('sidebar-grade');
    
    // Clear existing options in both dropdowns
    if (gradeDropdown) {
        gradeDropdown.innerHTML = '<option value="">请选择年级</option>';
    }
    
    if (sidebarGradeDropdown) {
        sidebarGradeDropdown.innerHTML = '<option value="">请选择年级</option>';
    }
    
    // If no school is selected, return early
    if (!school || school === '') {
        return;
    }
    
    // Get the options for the selected school
    const options = gradeOptions[school] || [];
    
    // Add options to both dropdowns
    options.forEach(option => {
        if (gradeDropdown) {
            const optElement = document.createElement('option');
            optElement.value = option;
            optElement.textContent = option;
            gradeDropdown.appendChild(optElement);
        }
        
        if (sidebarGradeDropdown) {
            const sidebarOptElement = document.createElement('option');
            sidebarOptElement.value = option;
            sidebarOptElement.textContent = option;
            sidebarGradeDropdown.appendChild(sidebarOptElement);
        }
    });
}

// Modify the populateSubjectOptions function to start with an empty option
function populateSubjectOptions(school) {
    const subjectOptions = {
        '小学': ['语文', '数学', '英语', '科学', '道德与法治'],
        '初中': ['语文', '数学', '英语', '物理', '化学', '生物', '历史', '地理', '道德与法治'],
        '高中': ['语文', '数学', '英语', '物理', '化学', '生物', '历史', '地理', '政治']
    };
    
    // Get both the form and sidebar subject dropdowns
    const subjectDropdown = document.getElementById('subject');
    const sidebarSubjectDropdown = document.getElementById('sidebar-subject');
    
    // Clear existing options in both dropdowns
    if (subjectDropdown) {
        subjectDropdown.innerHTML = '<option value="">请选择科目</option>';
    }
    
    if (sidebarSubjectDropdown) {
        sidebarSubjectDropdown.innerHTML = '<option value="">请选择科目</option>';
    }
    
    // If no school is selected, return early
    if (!school || school === '') {
        return;
    }
    
    // Get the options for the selected school
    const options = subjectOptions[school] || [];
    
    // Add options to both dropdowns
    options.forEach(option => {
        if (subjectDropdown) {
            const optElement = document.createElement('option');
            optElement.value = option;
            optElement.textContent = option;
            subjectDropdown.appendChild(optElement);
        }
        
        if (sidebarSubjectDropdown) {
            const sidebarOptElement = document.createElement('option');
            sidebarOptElement.value = option;
            sidebarOptElement.textContent = option;
            sidebarSubjectDropdown.appendChild(sidebarOptElement);
        }
    });
}

// Modify the initializeFormLayout function to initialize all dropdowns with empty values
function initializeFormLayout() {
    // ... existing code ...
    
    // Initialize school dropdowns with empty option
    const schoolDropdown = document.getElementById('school');
    const sidebarSchoolDropdown = document.getElementById('sidebar-school');
    
    if (schoolDropdown) {
        // Clear existing options
        schoolDropdown.innerHTML = '';
        
        // Add empty option
        const emptyOption = document.createElement('option');
        emptyOption.value = '';
        emptyOption.textContent = '请选择学校';
        schoolDropdown.appendChild(emptyOption);
        
        // Add school options
        const schoolOptions = ['小学', '初中', '高中'];
        schoolOptions.forEach(option => {
            const optElement = document.createElement('option');
            optElement.value = option;
            optElement.textContent = option;
            schoolDropdown.appendChild(optElement);
        });
    }
    
    if (sidebarSchoolDropdown) {
        // Clear existing options
        sidebarSchoolDropdown.innerHTML = '';
        
        // Add empty option
        const emptyOption = document.createElement('option');
        emptyOption.value = '';
        emptyOption.textContent = '请选择学校';
        sidebarSchoolDropdown.appendChild(emptyOption);
        
        // Add school options
        const schoolOptions = ['小学', '初中', '高中'];
        schoolOptions.forEach(option => {
            const optElement = document.createElement('option');
            optElement.value = option;
            optElement.textContent = option;
            sidebarSchoolDropdown.appendChild(optElement);
        });
    }
    
    // Initialize semester dropdown with empty option
    const semesterDropdown = document.getElementById('semester');
    const sidebarSemesterDropdown = document.getElementById('sidebar-semester');
    
    if (semesterDropdown) {
        // Clear existing options
        semesterDropdown.innerHTML = '';
        
        // Add empty option
        const emptyOption = document.createElement('option');
        emptyOption.value = '';
        emptyOption.textContent = '请选择学期';
        semesterDropdown.appendChild(emptyOption);
        
        // Add semester options
        const semesterOptions = ['上学期', '下学期'];
        semesterOptions.forEach(option => {
            const optElement = document.createElement('option');
            optElement.value = option;
            optElement.textContent = option;
            semesterDropdown.appendChild(optElement);
        });
    }
    
    if (sidebarSemesterDropdown) {
        // Clear existing options
        sidebarSemesterDropdown.innerHTML = '';
        
        // Add empty option
        const emptyOption = document.createElement('option');
        emptyOption.value = '';
        emptyOption.textContent = '请选择学期';
        sidebarSemesterDropdown.appendChild(emptyOption);
        
        // Add semester options
        const semesterOptions = ['上学期', '下学期'];
        semesterOptions.forEach(option => {
            const optElement = document.createElement('option');
            optElement.value = option;
            optElement.textContent = option;
            sidebarSemesterDropdown.appendChild(optElement);
        });
    }
    
    // Initialize difficulty dropdown with empty option
    const difficultyDropdown = document.getElementById('difficulty');
    const sidebarDifficultyDropdown = document.getElementById('sidebar-difficulty');
    
    if (difficultyDropdown) {
        // Clear existing options
        difficultyDropdown.innerHTML = '';
        
        // Add empty option
        const emptyOption = document.createElement('option');
        emptyOption.value = '';
        emptyOption.textContent = '请选择难度';
        difficultyDropdown.appendChild(emptyOption);
        
        // Add difficulty options
        const difficultyOptions = ['简单', '中等', '困难'];
        difficultyOptions.forEach(option => {
            const optElement = document.createElement('option');
            optElement.value = option;
            optElement.textContent = option;
            difficultyDropdown.appendChild(optElement);
        });
    }
    
    if (sidebarDifficultyDropdown) {
        // Clear existing options
        sidebarDifficultyDropdown.innerHTML = '';
        
        // Add empty option
        const emptyOption = document.createElement('option');
        emptyOption.value = '';
        emptyOption.textContent = '请选择难度';
        sidebarDifficultyDropdown.appendChild(emptyOption);
        
        // Add difficulty options
        const difficultyOptions = ['简单', '中等', '困难'];
        difficultyOptions.forEach(option => {
            const optElement = document.createElement('option');
            optElement.value = option;
            optElement.textContent = option;
            sidebarDifficultyDropdown.appendChild(optElement);
        });
    }
    
    // Initialize count dropdown with empty option
    const countDropdown = document.getElementById('count');
    const sidebarCountDropdown = document.getElementById('sidebar-count');
    
    if (countDropdown) {
        // Clear existing options
        countDropdown.innerHTML = '';
        
        // Add empty option
        const emptyOption = document.createElement('option');
        emptyOption.value = '';
        emptyOption.textContent = '请选择题数';
        countDropdown.appendChild(emptyOption);
        
        // Add count options
        const countOptions = ['5', '10', '15', '20'];
        countOptions.forEach(option => {
            const optElement = document.createElement('option');
            optElement.value = option;
            optElement.textContent = option + '题';
            countDropdown.appendChild(optElement);
        });
    }
    
    if (sidebarCountDropdown) {
        // Clear existing options
        sidebarCountDropdown.innerHTML = '';
        
        // Add empty option
        const emptyOption = document.createElement('option');
        emptyOption.value = '';
        emptyOption.textContent = '请选择题数';
        sidebarCountDropdown.appendChild(emptyOption);
        
        // Add count options
        const countOptions = ['5', '10', '15', '20'];
        countOptions.forEach(option => {
            const optElement = document.createElement('option');
            optElement.value = option;
            optElement.textContent = option + '题';
            sidebarCountDropdown.appendChild(optElement);
        });
    }
    
    // Initialize grade and subject dropdowns with empty options
    populateGradeOptions('');
    populateSubjectOptions('');
    
    // Add event listeners for school dropdowns to update grade and subject options
    if (schoolDropdown) {
        schoolDropdown.addEventListener('change', function() {
            const selectedSchool = this.value;
            populateGradeOptions(selectedSchool);
            populateSubjectOptions(selectedSchool);
            
            // Sync with sidebar dropdown
            if (sidebarSchoolDropdown && sidebarSchoolDropdown.value !== selectedSchool) {
                sidebarSchoolDropdown.value = selectedSchool;
            }
        });
    }
    
    if (sidebarSchoolDropdown) {
        sidebarSchoolDropdown.addEventListener('change', function() {
            const selectedSchool = this.value;
            populateGradeOptions(selectedSchool);
            populateSubjectOptions(selectedSchool);
            
            // Sync with main form dropdown
            if (schoolDropdown && schoolDropdown.value !== selectedSchool) {
                schoolDropdown.value = selectedSchool;
            }
        });
    }
    
    // ... rest of existing code ...
}

// Make sure this runs when the document is loaded
document.addEventListener('DOMContentLoaded', function() {
    console.log('DOM fully loaded, initializing dropdowns with empty values');
    
    // Initialize all dropdowns with empty values
    initializeDropdownsWithEmptyValues();
    
    // Set up chat buttons
    setupChatButtons();
});

// Add a new function to initialize all dropdowns with empty values
function initializeDropdownsWithEmptyValues() {
    console.log('Initializing dropdowns with empty values');
    
    // Get all dropdown elements
    const schoolDropdowns = [
        document.getElementById('school'),
        document.getElementById('sidebar-school')
    ];
    
    const gradeDropdowns = [
        document.getElementById('grade'),
        document.getElementById('sidebar-grade')
    ];
    
    const subjectDropdowns = [
        document.getElementById('subject'),
        document.getElementById('sidebar-subject')
    ];
    
    const semesterDropdowns = [
        document.getElementById('semester'),
        document.getElementById('sidebar-semester')
    ];
    
    const difficultyDropdowns = [
        document.getElementById('difficulty'),
        document.getElementById('sidebar-difficulty')
    ];
    
    const countDropdowns = [
        document.getElementById('count'),
        document.getElementById('sidebar-count')
    ];
    
    // Initialize school dropdowns
    schoolDropdowns.forEach(dropdown => {
        if (dropdown) {
            dropdown.innerHTML = '<option value="">请选择学校</option>';
            
            const schoolOptions = ['小学', '初中', '高中'];
            schoolOptions.forEach(option => {
                const optElement = document.createElement('option');
                optElement.value = option;
                optElement.textContent = option;
                dropdown.appendChild(optElement);
            });
            
            // Force the empty value
            dropdown.value = '';
        }
    });
    
    // Initialize grade dropdowns with empty option
    gradeDropdowns.forEach(dropdown => {
        if (dropdown) {
            dropdown.innerHTML = '<option value="">请选择年级</option>';
            // Force the empty value
            dropdown.value = '';
        }
    });
    
    // Initialize subject dropdowns with empty option
    subjectDropdowns.forEach(dropdown => {
        if (dropdown) {
            dropdown.innerHTML = '<option value="">请选择科目</option>';
            // Force the empty value
            dropdown.value = '';
        }
    });
    
    // Initialize semester dropdowns
    semesterDropdowns.forEach(dropdown => {
        if (dropdown) {
            dropdown.innerHTML = '<option value="">请选择学期</option>';
            
            const semesterOptions = ['上学期', '下学期'];
            semesterOptions.forEach(option => {
                const optElement = document.createElement('option');
                optElement.value = option;
                optElement.textContent = option;
                dropdown.appendChild(optElement);
            });
            
            // Force the empty value
            dropdown.value = '';
        }
    });
    
    // Initialize difficulty dropdowns
    difficultyDropdowns.forEach(dropdown => {
        if (dropdown) {
            dropdown.innerHTML = '<option value="">请选择难度</option>';
            
            const difficultyOptions = ['简单', '中等', '困难'];
            difficultyOptions.forEach(option => {
                const optElement = document.createElement('option');
                optElement.value = option;
                optElement.textContent = option;
                dropdown.appendChild(optElement);
            });
            
            // Force the empty value
            dropdown.value = '';
        }
    });
    
    // Initialize count dropdowns
    countDropdowns.forEach(dropdown => {
        if (dropdown) {
            dropdown.innerHTML = '<option value="">请选择题数</option>';
            
            const countOptions = ['5', '10', '15', '20'];
            countOptions.forEach(option => {
                const optElement = document.createElement('option');
                optElement.value = option;
                optElement.textContent = option + '题';
                dropdown.appendChild(optElement);
            });
            
            // Force the empty value
            dropdown.value = '';
        }
    });
    
    // Set up event listeners for school dropdowns
    schoolDropdowns.forEach((dropdown, index) => {
        if (dropdown) {
            dropdown.addEventListener('change', function() {
                const selectedSchool = this.value;
                console.log(`School changed to: ${selectedSchool}`);
                
                // Update grade and subject dropdowns based on selected school
                updateGradeOptions(selectedSchool);
                updateSubjectOptions(selectedSchool);
                
                // Sync with other school dropdown
                const otherIndex = index === 0 ? 1 : 0;
                if (schoolDropdowns[otherIndex] && schoolDropdowns[otherIndex].value !== selectedSchool) {
                    schoolDropdowns[otherIndex].value = selectedSchool;
                }
            });
        }
    });
}

// Function to update grade options based on selected school
function updateGradeOptions(school) {
    console.log(`Updating grade options for school: ${school}`);
    
    const gradeOptions = {
        '小学': ['一年级', '二年级', '三年级', '四年级', '五年级', '六年级'],
        '初中': ['初一', '初二', '初三'],
        '高中': ['高一', '高二', '高三']
    };
    
    const gradeDropdowns = [
        document.getElementById('grade'),
        document.getElementById('sidebar-grade')
    ];
    
    gradeDropdowns.forEach(dropdown => {
        if (dropdown) {
            // Clear existing options
            dropdown.innerHTML = '<option value="">请选择年级</option>';
            
            // If a school is selected, add the corresponding grade options
            if (school && school !== '') {
                const options = gradeOptions[school] || [];
                options.forEach(option => {
                    const optElement = document.createElement('option');
                    optElement.value = option;
                    optElement.textContent = option;
                    dropdown.appendChild(optElement);
                });
            }
            
            // Force the empty value
            dropdown.value = '';
        }
    });
}

// Function to update subject options based on selected school
function updateSubjectOptions(school) {
    console.log(`Updating subject options for school: ${school}`);
    
    const subjectOptions = {
        '小学': ['语文', '数学', '英语', '科学', '道德与法治'],
        '初中': ['语文', '数学', '英语', '物理', '化学', '生物', '历史', '地理', '道德与法治'],
        '高中': ['语文', '数学', '英语', '物理', '化学', '生物', '历史', '地理', '政治']
    };
    
    const subjectDropdowns = [
        document.getElementById('subject'),
        document.getElementById('sidebar-subject')
    ];
    
    subjectDropdowns.forEach(dropdown => {
        if (dropdown) {
            // Clear existing options
            dropdown.innerHTML = '<option value="">请选择科目</option>';
            
            // If a school is selected, add the corresponding subject options
            if (school && school !== '') {
                const options = subjectOptions[school] || [];
                options.forEach(option => {
                    const optElement = document.createElement('option');
                    optElement.value = option;
                    optElement.textContent = option;
                    dropdown.appendChild(optElement);
                });
            }
            
            // Force the empty value
            dropdown.value = '';
        }
    });
}

// Add CSS for the context badge
const style = document.createElement('style');
style.textContent = `
    .context-badge {
        display: inline-block;
        background-color: #ebf8ff;
        color: #3182ce;
        padding: 4px 8px;
        border-radius: 4px;
        font-size: 12px;
        font-weight: 500;
        margin-right: 10px;
    }
    
    .question-counter {
        display: flex;
        align-items: center;
        margin-bottom: 15px;
        color: #718096;
        font-size: 14px;
    }
`;
document.head.appendChild(style);