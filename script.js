// API configuration variables
let currentApiFunction = 'chat';
let currentModel = 'deepseek-r1';

// Function to parse questions from API response
function parseQuestionsFromResponse(response) {
    console.log('Parsing questions from response:', response);
    
    try {
        // Try to parse as JSON first
        let data;
        try {
            // If response is already an object, use it directly
            if (typeof response === 'object' && response !== null) {
                // Try to extract content from the object
                const extractedContent = extractContentFromResponse(response);
                
                // If the extracted content is a string, try to parse it as JSON
                if (typeof extractedContent === 'string') {
                    try {
                        data = JSON.parse(extractedContent);
                        console.log('Successfully parsed extracted content as JSON:', data);
                    } catch (jsonError) {
                        console.log('Could not parse extracted content as JSON, using as text');
                        // If we can't parse as JSON, use the extracted content as text
                        return parseQuestionsFromText(extractedContent);
                    }
                } else {
                    // If the extracted content is not a string, use it directly
                    data = extractedContent;
                }
            } else if (typeof response === 'string') {
                // Try to parse the string as JSON
                try {
                    data = JSON.parse(response);
                    console.log('Successfully parsed response string as JSON:', data);
                } catch (jsonError) {
                    console.log('Could not parse response string as JSON, using as text');
                    // If we can't parse as JSON, use the response as text
                    return parseQuestionsFromText(response);
                }
            } else {
                console.log('Response is neither object nor string, creating default question');
                return createDefaultQuestion();
            }
            
            // Check if we have a questions array
            if (data && data.questions && Array.isArray(data.questions) && data.questions.length > 0) {
                // Validate each question
                const validQuestions = data.questions.filter(q => {
                    if (!q.text) {
                        console.log('Skipping question with missing text');
                        return false;
                    }
                    
                    if (!q.answer) {
                        console.log('Skipping question with missing answer');
                        return false;
                    }
                    
                    return true;
                });
                
                if (validQuestions.length === 0) {
                    console.log('No valid questions found in JSON');
                    return createDefaultQuestion();
                }
                
                return validQuestions;
            } else {
                console.log('No questions array found in data, trying to parse as text');
                // If we don't have a questions array, try to parse as text
                const textContent = typeof data === 'string' ? data : JSON.stringify(data);
                return parseQuestionsFromText(textContent);
            }
        } catch (error) {
            console.error('Error parsing JSON:', error);
            // Continue to text extraction if JSON parsing fails
            if (typeof response === 'string') {
                return parseQuestionsFromText(response);
            } else {
                const textContent = extractContentFromResponse(response);
                return parseQuestionsFromText(textContent);
            }
        }
    } catch (error) {
        console.error('Error parsing questions:', error);
        return createDefaultQuestion();
    }
}

function createDefaultQuestion() {
    return [{
        text: '示例问题：1+1=?',
        choices: ['A. 1', 'B. 2', 'C. 3', 'D. 4'],
        answer: 'B',
        explanation: '1加1等于2，这是基本的加法运算。'
    }];
}

function extractContentFromResponse(data) {
    console.log('Extracting content from response:', data);
    
    try {
        // If it's a string, return it directly
        if (typeof data === 'string') {
            return data;
        }
        
        // If it's an object, try to extract content
        if (typeof data === 'object' && data !== null) {
            // Log the structure to help with debugging
            console.log('Response structure:', JSON.stringify(data, null, 2).substring(0, 500) + '...');
            
            // Check for deepseek API response structure
            if (data.choices && Array.isArray(data.choices) && data.choices.length > 0) {
                console.log('Found choices array with length:', data.choices.length);
                
                const choice = data.choices[0];
                console.log('First choice:', choice);
                
                if (choice.message && choice.message.content) {
                    console.log('Extracted content from message.content');
                    return choice.message.content;
                }
                
                if (choice.text) {
                    console.log('Extracted content from text');
                    return choice.text;
                }
                
                // If we can't find specific fields in the choice, stringify it
                console.log('Could not find content in choice, stringifying');
                return JSON.stringify(choice);
            }
            
            // Check for direct content field
            if (data.content) {
                console.log('Extracted content from direct content field');
                return data.content;
            }
            
            // Check for message field
            if (data.message) {
                if (typeof data.message === 'string') {
                    console.log('Extracted content from message string');
                    return data.message;
                }
                if (typeof data.message === 'object' && data.message.content) {
                    console.log('Extracted content from message.content');
                    return data.message.content;
                }
            }
            
            // Check for text field
            if (data.text) {
                console.log('Extracted content from text field');
                return data.text;
            }
            
            // If we can't find a specific field, try to extract from the response structure
            if (data.object === 'chat.completion' && data.choices && Array.isArray(data.choices)) {
                for (const choice of data.choices) {
                    if (choice.message && choice.message.content) {
                        console.log('Extracted content from chat.completion message content');
                        return choice.message.content;
                    }
                    if (choice.delta && choice.delta.content) {
                        console.log('Extracted content from delta content');
                        return choice.delta.content;
                    }
                }
            }
            
            // If all else fails, stringify the whole object
            console.log('Could not find content in specific fields, stringifying whole object');
            return JSON.stringify(data);
        }
        
        // If all else fails, convert to string
        console.log('Converting non-object to string');
        return String(data);
    } catch (error) {
        console.error('Error extracting content:', error);
        return String(data);
    }
}

// Global function to fetch AI response for question generation
async function fetchAIResponse(prompt) {
    console.log('Fetching AI response for prompt:', prompt);
    
    try {
        // Show a loading message
        showSystemMessage('正在生成内容，请稍候...', 'info');
        
        // Get the API endpoint from the form if it exists
        const form = document.querySelector('form');
        const apiEndpoint = form ? form.action : '/api/chat';
        
        console.log('Using API endpoint:', apiEndpoint);
        
        // Create the request payload
        const payload = {
            prompt: prompt,
            max_tokens: 2000,
            temperature: 0.7,
            model: 'gpt-3.5-turbo'  // Use the same model as the chat interface
        };
        
        console.log('Sending payload:', payload);
        
        // Make the API call
        const response = await fetch(apiEndpoint, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(payload),
        });
        
        if (!response.ok) {
            throw new Error(`API request failed with status ${response.status}`);
        }
        
        const data = await response.json();
        console.log('Raw API response:', data);
        
        // Extract the content from the response
        const content = extractContentFromResponse(data);
        console.log('Extracted content:', content);
        
        return content;
    } catch (error) {
        console.error('Error fetching AI response:', error);
        
        // Show error message to the user
        showSystemMessage('生成内容失败，请稍后再试', 'error');
        
        // Instead of returning mock data, throw the error to be handled by the caller
        throw new Error('API request failed: ' + error.message);
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
    console.log('Displaying current question:', window.currentQuestionIndex);
    
    if (!window.questions || !Array.isArray(window.questions) || window.questions.length === 0) {
        console.error('No questions available to display');
        return;
    }
    
    const question = window.questions[window.currentQuestionIndex];
    if (!question) {
        console.error('Question not found at index', window.currentQuestionIndex);
        return;
    }
    
    // Get the questions display container
    const questionsDisplayContainer = document.getElementById('questions-display-container');
    if (!questionsDisplayContainer) {
        console.error('Questions display container not found');
        return;
    }
    
    // Clear any existing content
    questionsDisplayContainer.innerHTML = '';
    
    // Create question counter
    const questionCounter = document.createElement('div');
    questionCounter.id = 'question-counter';
    questionCounter.className = 'question-counter';
    questionCounter.textContent = `问题 ${window.currentQuestionIndex + 1} / ${window.questions.length}`;
    questionsDisplayContainer.appendChild(questionCounter);
    
    // Create question text
    const questionText = document.createElement('div');
    questionText.id = 'question-text';
    questionText.className = 'question-text';
    questionText.innerHTML = formatMathExpressions(question.text);
    questionsDisplayContainer.appendChild(questionText);
    
    // Create choices container
    const choicesContainer = document.createElement('div');
    choicesContainer.id = 'choices-container';
    choicesContainer.className = 'choices-container';
    
    // Add choices if they exist
    if (question.choices && Array.isArray(question.choices) && question.choices.length > 0) {
        question.choices.forEach((choice, index) => {
            const choiceButton = document.createElement('button');
            choiceButton.className = 'choice-button';
            choiceButton.innerHTML = formatMathExpressions(choice);
            choiceButton.dataset.value = choice.charAt(0); // Assuming format "A. Choice text"
            
            choiceButton.addEventListener('click', function() {
                // Remove selected class from all buttons
                document.querySelectorAll('.choice-button').forEach(btn => {
                    btn.classList.remove('selected');
                });
                
                // Add selected class to this button
                this.classList.add('selected');
                
                // Display the answer
                displayAnswer(this.dataset.value);
            });
            
            choicesContainer.appendChild(choiceButton);
        });
    } else {
        // If no choices, create a text input for the answer
        const answerInput = document.createElement('input');
        answerInput.type = 'text';
        answerInput.id = 'answer-input';
        answerInput.className = 'answer-input';
        answerInput.placeholder = '请输入你的答案';
        
        const submitButton = document.createElement('button');
        submitButton.className = 'submit-answer-button';
        submitButton.textContent = '提交答案';
        submitButton.addEventListener('click', function() {
            const userAnswer = answerInput.value.trim();
            if (userAnswer) {
                displayAnswer(userAnswer);
            }
        });
        
        choicesContainer.appendChild(answerInput);
        choicesContainer.appendChild(submitButton);
    }
    
    questionsDisplayContainer.appendChild(choicesContainer);
    
    // Create answer container (initially hidden)
    const answerContainer = document.createElement('div');
    answerContainer.id = 'answer-container';
    answerContainer.className = 'answer-container hidden';
    questionsDisplayContainer.appendChild(answerContainer);
    
    // Update navigation buttons
    updateNavigationButtons();
    
    // If MathJax is available, typeset the math expressions
    if (window.MathJax) {
        try {
            MathJax.typeset();
        } catch (error) {
            console.error('Error typesetting math:', error);
        }
    }
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
function setupNavigationButtons() {
    // Check if we've already set up the navigation buttons
    if (window.navigationButtonsSetup) {
        console.log('Navigation buttons already set up, skipping');
        return;
    }
    
    console.log('Setting up navigation buttons');
    
    // Check if we have questions
    if (!window.questions || !Array.isArray(window.questions) || window.questions.length <= 1) {
        console.log('No questions or only one question, skipping navigation setup');
        return;
    }
    
    // Get the questions display container
    const questionsDisplayContainer = document.getElementById('questions-display-container');
    if (!questionsDisplayContainer) {
        console.error('Questions display container not found');
        return;
    }
    
    // Check if navigation controls already exist
    let navigationControls = document.querySelector('.navigation-controls');
    
    // Create navigation controls if they don't exist
    if (!navigationControls) {
        navigationControls = document.createElement('div');
        navigationControls.className = 'navigation-controls';
        questionsDisplayContainer.appendChild(navigationControls);
    } else {
        // Clear existing navigation controls to prevent duplicates
        navigationControls.innerHTML = '';
    }
    
    // Create previous button
    const prevButton = document.createElement('button');
    prevButton.id = 'prev-question-button';
    prevButton.className = 'nav-button';
    prevButton.innerHTML = '&larr; 上一题';
    prevButton.style.cssText = `
        padding: clamp(8px, 3vw, 12px) clamp(15px, 4vw, 25px);
        border-radius: 8px;
        font-size: clamp(14px, 2vw, 16px);
        font-weight: 500;
        margin: clamp(5px, 2vw, 10px);
        background-color: #edf2f7;
        color: #4a5568;
        border: none;
        cursor: pointer;
        transition: all 0.2s ease;
    `;
    
    prevButton.addEventListener('click', function(event) {
        event.preventDefault();
        event.stopPropagation();
        console.log('Previous button clicked');
        if (window.currentQuestionIndex > 0) {
            window.currentQuestionIndex--;
            displayCurrentQuestion();
            updateNavigationButtons();
        }
    });
    
    navigationControls.appendChild(prevButton);
    
    // Create next button
    const nextButton = document.createElement('button');
    nextButton.id = 'next-question-button';
    nextButton.className = 'nav-button';
    nextButton.innerHTML = '下一题 &rarr;';
    nextButton.style.cssText = `
        padding: clamp(8px, 3vw, 12px) clamp(15px, 4vw, 25px);
        border-radius: 8px;
        font-size: clamp(14px, 2vw, 16px);
        font-weight: 500;
        margin: clamp(5px, 2vw, 10px);
        background-color: #4299e1;
        color: white;
        border: none;
        cursor: pointer;
        transition: all 0.2s ease;
    `;
    
    nextButton.addEventListener('click', function(event) {
        event.preventDefault();
        event.stopPropagation();
        console.log('Next button clicked');
        if (window.currentQuestionIndex < window.questions.length - 1) {
            window.currentQuestionIndex++;
            displayCurrentQuestion();
            updateNavigationButtons();
        }
    });
    
    navigationControls.appendChild(nextButton);
    
    // Create completion status button
    const completionButton = document.createElement('button');
    completionButton.id = 'completion-status-button';
    completionButton.className = 'completion-button';
    completionButton.innerHTML = '查看完成情况';
    completionButton.style.cssText = `
        padding: clamp(8px, 3vw, 12px) clamp(15px, 4vw, 25px);
        border-radius: 8px;
        font-size: clamp(14px, 2vw, 16px);
        font-weight: 500;
        margin: clamp(5px, 2vw, 10px);
        background-color: #48bb78;
        color: white;
        border: none;
        cursor: pointer;
        transition: all 0.2s ease;
        display: block;
        width: 100%;
        margin-top: 20px;
    `;
    
    completionButton.addEventListener('click', function() {
        displayCompletionStatus();
    });
    
    navigationControls.appendChild(completionButton);
    
    // Update the navigation buttons
    updateNavigationButtons();
}

// Function to set up option selection buttons
function setupOptionButtons() {
    console.log('Setting up option buttons');
    
    const optionButtons = document.querySelectorAll('.option-button');
    
    optionButtons.forEach(button => {
        // Remove any existing event listeners
        const newButton = button.cloneNode(true);
        button.parentNode.replaceChild(newButton, button);
        
        // Add new event listener
        newButton.addEventListener('click', function() {
            const option = this.getAttribute('data-option');
            if (option && window.questions) {
                // Save user's answer
                window.userAnswers[window.currentQuestionIndex] = option;
                
                // Update UI to show selected option
                document.querySelectorAll('.option-button').forEach(btn => {
                    btn.classList.remove('selected');
                });
                this.classList.add('selected');
                
                // Check if answer is correct
                const currentQuestion = window.questions[window.currentQuestionIndex];
                const isCorrect = option === currentQuestion.answer;
                
                // Show feedback
                const feedbackElement = document.getElementById('answer-feedback');
                if (feedbackElement) {
                    feedbackElement.textContent = isCorrect ? '✓ 正确!' : '✗ 错误!';
                    feedbackElement.className = isCorrect ? 'feedback correct' : 'feedback incorrect';
                    feedbackElement.style.display = 'block';
                }
                
                // Show explanation
                const explanationElement = document.getElementById('explanation');
                if (explanationElement) {
                    explanationElement.innerHTML = formatMathExpressions(currentQuestion.explanation);
                    explanationElement.style.display = 'block';
                    
                    // Render math expressions if MathJax is available
                    if (window.MathJax) {
                        MathJax.typeset();
                    }
                }
            }
        });
        });
}

// Make sure the function is available globally for the inline onclick handler
window.handleGenerateQuestionsClick = handleGenerateQuestionsClick;
window.fetchAIResponse = fetchAIResponse;
window.parseQuestionsFromResponse = parseQuestionsFromResponse;
window.showSystemMessage = showSystemMessage;
window.extractContentFromResponse = extractContentFromResponse;

// Function to show system messages
function showSystemMessage(message, type = 'info') {
    console.log('Showing system message:', message, type);
    
    // Create message element
    const messageElement = document.createElement('div');
    messageElement.className = `system-message ${type}`;
    messageElement.textContent = message;
    
    // Find a container to add the message to
    let container = document.getElementById('output');
    
    if (!container) {
        // Try to find an alternative container
        container = document.querySelector('.content-area') || 
                   document.querySelector('.app-container') || 
                   document.body;
    }
    
    if (container) {
        // Check if we should insert at the beginning or append
        const firstChild = container.firstChild;
        if (firstChild) {
            try {
                container.insertBefore(messageElement, firstChild);
            } catch (error) {
                console.error('Error inserting message:', error);
                // Fallback to append
                container.appendChild(messageElement);
            }
        } else {
            container.appendChild(messageElement);
        }
        
        // Remove the message after 5 seconds
        setTimeout(() => {
            if (messageElement.parentNode) {
                messageElement.parentNode.removeChild(messageElement);
            }
        }, 5000);
    } else {
        console.error('No container found to show system message');
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

// Modify the setupChatButtons function to include school and grade information
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
        
            // Get educational context from sidebar
            const educationalContext = getEducationalContext();
            
            // Show loading state
            optimizeButton.disabled = true;
            optimizeButton.innerHTML = '<i class="fas fa-spinner fa-spin"></i> 优化中...';
            
            // Prepare the prompt for optimization with educational context
            const prompt = `请根据以下教育背景优化这个问题，使其更清晰、更有教育价值：

教育背景：
${educationalContext}

原始问题：${questionText}

请返回优化后的问题，使其更适合上述教育背景的学生，保持原始意图但使其更加清晰、准确和有教育意义。
优化时请考虑学生的认知水平、课程要求和教育阶段，使问题更有针对性。`;
            
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
                    showSystemMessage('问题已根据教育背景成功优化！', 'success');
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
        
            // Get educational context from sidebar
            const educationalContext = getEducationalContext();
            
            // Show loading state
            submitButton.disabled = true;
            submitButton.innerHTML = '<i class="fas fa-spinner fa-spin"></i> 提交中...';
            chatResponse.innerHTML = '<div class="loading-indicator"><i class="fas fa-spinner fa-spin"></i> 正在思考...</div>';
            
            // Prepare the prompt for the AI with educational context
            const prompt = `请根据以下教育背景回答这个问题，提供详细且教育性的解答：

教育背景：
${educationalContext}

问题：${questionText}

请提供适合上述教育背景学生的清晰、准确、有教育意义的回答。
如果涉及数学或科学概念，请确保解释清楚，并考虑学生的认知水平和课程要求。
如果可能，请提供一些例子或应用场景来帮助理解。`;
            
            // Call the API
            fetchAIResponse(prompt)
                .then(response => {
                    // Extract the AI response
                    const aiResponse = extractContentFromResponse(response);
                    
                    // Format the response with MathJax
                    const formattedResponse = formatMathExpressions(aiResponse);
                    
                    // Get context summary for display
                    const contextSummary = getContextSummary();
                    
                    // Display the response with educational context
                    chatResponse.innerHTML = `
                        <div class="response-header">
                            <i class="fas fa-robot"></i> AI 助手回答
                            ${contextSummary ? `<span class="context-badge">${contextSummary}</span>` : ''}
                        </div>
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
                            抱歉，处理您的问题时出现了错误。请重试。
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

// Function to get educational context from any available dropdowns in the document
function getEducationalContext() {
    console.log('Getting educational context - direct approach');
    
    // Initialize with default values
    let school = '未指定学校类型';
    let grade = '未指定年级';
    let semester = '未指定学期';
    let subject = '未指定科目';
    
    // Get all select elements in the document
    const allSelects = document.querySelectorAll('select');
    console.log('Found ' + allSelects.length + ' select elements');
    
    // Scan through all selects to find our dropdowns
    allSelects.forEach(select => {
        const id = select.id || '';
        const name = select.name || '';
        const value = select.value;
        
        console.log('Examining select:', id, name, value);
        
        // Check if this is a school dropdown
        if (id.includes('school') || name.includes('school')) {
            if (value && value !== 'none') {
                try {
                    school = select.options[select.selectedIndex].text;
                } catch (e) {
                    // Map values to text
                    const schoolMap = {
                        'primary': '小学',
                        'middle': '初中',
                        'high': '高中'
                    };
                    school = schoolMap[value] || value;
                }
                console.log('Found school:', school);
            }
        }
        
        // Check if this is a grade dropdown
        if (id.includes('grade') || name.includes('grade')) {
            if (value && value !== 'none') {
                try {
                    grade = select.options[select.selectedIndex].text;
                } catch (e) {
                    grade = value;
                }
                console.log('Found grade:', grade);
            }
        }
        
        // Check if this is a semester dropdown
        if (id.includes('semester') || name.includes('semester')) {
            if (value && value !== 'none') {
                try {
                    semester = select.options[select.selectedIndex].text;
                } catch (e) {
                    semester = value;
                }
                console.log('Found semester:', semester);
            }
        }
        
        // Check if this is a subject dropdown
        if (id.includes('subject') || name.includes('subject')) {
            if (value && value !== 'none') {
                try {
                    subject = select.options[select.selectedIndex].text;
                } catch (e) {
                    subject = value;
                }
                console.log('Found subject:', subject);
            }
        }
    });
    
    // Build educational context string
    let context = `学校类型：${school}\n年级：${grade}\n学期：${semester}\n科目：${subject}\n`;
    
    // Add curriculum information based on selections
    context += getCurriculumInfo(school, grade, subject);
    
    console.log('Educational context:', context);
    return context;
}

// Function to get a brief summary of the context for display
function getContextSummary() {
    // Initialize with default values
    let school = '';
    let grade = '';
    let subject = '';
    let hasValues = false;
    
    // Get all select elements in the document
    const allSelects = document.querySelectorAll('select');
    
    // Scan through all selects to find our dropdowns
    allSelects.forEach(select => {
        const id = select.id || '';
        const name = select.name || '';
        const value = select.value;
        
        // Check if this is a school dropdown
        if (id.includes('school') || name.includes('school')) {
            if (value && value !== 'none') {
                try {
                    school = select.options[select.selectedIndex].text;
                } catch (e) {
                    // Map values to text
                    const schoolMap = {
                        'primary': '小学',
                        'middle': '初中',
                        'high': '高中'
                    };
                    school = schoolMap[value] || value;
                }
                hasValues = true;
            }
        }
        
        // Check if this is a grade dropdown
        if (id.includes('grade') || name.includes('grade')) {
            if (value && value !== 'none') {
                try {
                    grade = select.options[select.selectedIndex].text;
                } catch (e) {
                    grade = value;
                }
                hasValues = true;
            }
        }
        
        // Check if this is a subject dropdown
        if (id.includes('subject') || name.includes('subject')) {
            if (value && value !== 'none') {
                try {
                    subject = select.options[select.selectedIndex].text;
                } catch (e) {
                    subject = value;
                }
                hasValues = true;
            }
        }
    });
    
    if (!hasValues) {
        return '';
    }
    
    let summary = '';
    
    if (school) {
        summary += school;
    }
    
    if (grade) {
        if (summary) summary += ' · ';
        summary += grade;
    }
    
    if (subject) {
        if (summary) summary += ' · ';
        summary += subject;
    }
    
    return summary;
}

// Add a direct DOM inspection function to debug the issue
function inspectDropdowns() {
    console.log('Inspecting all dropdowns in the document');
    
    // Get all select elements
    const allSelects = document.querySelectorAll('select');
    console.log('Total select elements found:', allSelects.length);
    
    // Log details of each select
    allSelects.forEach((select, index) => {
        console.log(`Select #${index + 1}:`);
        console.log('  ID:', select.id);
        console.log('  Name:', select.name);
        console.log('  Value:', select.value);
        console.log('  Options:', select.options.length);
        
        // Log the selected option text if available
        if (select.selectedIndex >= 0) {
            try {
                console.log('  Selected text:', select.options[select.selectedIndex].text);
            } catch (e) {
                console.log('  Error getting selected text:', e);
            }
        }
        
        // Log parent elements to help identify location
        let parent = select.parentElement;
        let parentPath = '';
        for (let i = 0; i < 3 && parent; i++) {
            parentPath += ' > ' + (parent.id || parent.tagName);
            parent = parent.parentElement;
        }
        console.log('  Parent path:', parentPath);
    });
}

// Call the inspection function when setting up chat buttons
function setupChatButtons() {
    console.log('Setting up chat buttons');
    
    // Inspect dropdowns to debug the issue
    inspectDropdowns();
    
    // First, ensure the chat interface exists and get references to its elements
    const chatElements = createChatInterface();
    
    // If createChatInterface didn't return elements, try to get them directly
    let chatInput = chatElements?.chatInput || document.getElementById('chat-input');
    let chatResponse = chatElements?.chatResponse || document.getElementById('chat-response');
    let optimizeButton = chatElements?.optimizeButton || document.getElementById('optimize-button');
    let submitButton = chatElements?.submitButton || document.getElementById('submit-button');
    
    // If we still don't have the elements, try one more time with a delay
    if (!chatInput || !chatResponse || !optimizeButton || !submitButton) {
        console.log('Elements not found, trying again with delay');
        setTimeout(() => {
            // Create the interface again
            createChatInterface();
            
            // Get references to the elements
            chatInput = document.getElementById('chat-input');
            chatResponse = document.getElementById('chat-response');
            optimizeButton = document.getElementById('optimize-button');
            submitButton = document.getElementById('submit-button');
            
            if (!chatInput || !chatResponse) {
                console.error('Chat input or response area not found even after retry');
                return;
            }
            
            // Set up the event listeners
            setupButtonEventListeners(chatInput, chatResponse, optimizeButton, submitButton);
        }, 500);
        return;
    }
    
    // Set up the event listeners
    setupButtonEventListeners(chatInput, chatResponse, optimizeButton, submitButton);
}

// First, let's fix the createChatInterface function definition issue by ensuring it's defined only once
// and placed before setupChatButtons

// Function to create the chat interface
function createChatInterface() {
    console.log('Creating chat interface');
    
    // Get or create the QA container
    let qaContainer = document.getElementById('qa-container');
    if (!qaContainer) {
        console.log('QA container not found, creating it');
        // Create the QA container if it doesn't exist
        qaContainer = document.createElement('div');
        qaContainer.id = 'qa-container';
        qaContainer.className = 'qa-container';
        qaContainer.style.cssText = 'display: block; height: 100%; padding: 20px;';
        
        // Find a suitable parent to append it to
        const contentArea = document.querySelector('.content-area');
        if (contentArea) {
            contentArea.appendChild(qaContainer);
        } else {
            // If content area not found, append to body
            document.body.appendChild(qaContainer);
        }
    }
    
    // Check if the chat interface already exists
    if (document.getElementById('chat-interface')) {
        console.log('Chat interface already exists');
        return; // Already exists, no need to create it
    }
    
    console.log('Creating new chat interface elements');
    
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
        .context-badge {
            font-size: 12px;
            background-color: #ebf8ff;
            color: #3182ce;
            padding: 2px 8px;
            border-radius: 12px;
            margin-left: 8px;
            font-weight: normal;
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
    
    console.log('Chat interface created successfully');
    return { chatInput, chatResponse, optimizeButton, submitButton };
}

// Now let's fix the grade and subject dropdowns by ensuring they're populated
function initializeFormLayout() {
    // ... existing code ...
    
    // Ensure dropdowns are populated in the sidebar
    const sidebarSchoolSelect = document.getElementById('sidebar-school-select');
    if (sidebarSchoolSelect) {
        // Add event listener to populate grade options when school changes
        sidebarSchoolSelect.addEventListener('change', function() {
            const selectedSchool = this.value;
            populateSidebarGradeOptions(selectedSchool);
            populateSidebarSubjectOptions(selectedSchool);
        });
        
        // Populate grade and subject options initially
        const selectedSchool = sidebarSchoolSelect.value;
        if (selectedSchool && selectedSchool !== 'none') {
            populateSidebarGradeOptions(selectedSchool);
            populateSidebarSubjectOptions(selectedSchool);
        }
    }
    
    // ... rest of existing code ...
}

// Function to populate sidebar grade options
function populateSidebarGradeOptions(school) {
    const gradeSelect = document.getElementById('sidebar-grade-select');
    if (!gradeSelect) return;
    
    // Clear existing options
    gradeSelect.innerHTML = '<option value="none">选择年级</option>';
    
    // Add appropriate grade options based on school
    if (school === 'primary') {
        const grades = ['一年级', '二年级', '三年级', '四年级', '五年级', '六年级'];
        grades.forEach((grade, index) => {
            const option = document.createElement('option');
            option.value = `grade${index + 1}`;
            option.textContent = grade;
            gradeSelect.appendChild(option);
        });
    } else if (school === 'middle') {
        const grades = ['初一', '初二', '初三'];
        grades.forEach((grade, index) => {
            const option = document.createElement('option');
            option.value = `middle${index + 1}`;
            option.textContent = grade;
            gradeSelect.appendChild(option);
        });
    } else if (school === 'high') {
        const grades = ['高一', '高二', '高三'];
        grades.forEach((grade, index) => {
            const option = document.createElement('option');
            option.value = `high${index + 1}`;
            option.textContent = grade;
            gradeSelect.appendChild(option);
        });
    }
    
    console.log('Populated sidebar grade options for school:', school);
}

// Function to populate sidebar subject options
function populateSidebarSubjectOptions(school) {
    const subjectSelect = document.getElementById('sidebar-subject-select');
    if (!subjectSelect) return;
    
    // Clear existing options
    subjectSelect.innerHTML = '<option value="none">选择科目</option>';
    
    // Add appropriate subject options based on school
    if (school === 'primary') {
        const subjects = ['语文', '数学', '英语', '科学', '道德与法治'];
        subjects.forEach((subject, index) => {
            const option = document.createElement('option');
            option.value = `subject${index + 1}`;
            option.textContent = subject;
            subjectSelect.appendChild(option);
        });
    } else if (school === 'middle') {
        const subjects = ['语文', '数学', '英语', '物理', '化学', '生物', '历史', '地理', '政治'];
        subjects.forEach((subject, index) => {
            const option = document.createElement('option');
            option.value = `subject${index + 1}`;
            option.textContent = subject;
            subjectSelect.appendChild(option);
        });
    } else if (school === 'high') {
        const subjects = ['语文', '数学', '英语', '物理', '化学', '生物', '历史', '地理', '政治'];
        subjects.forEach((subject, index) => {
            const option = document.createElement('option');
            option.value = `subject${index + 1}`;
            option.textContent = subject;
            subjectSelect.appendChild(option);
        });
    }
    
    console.log('Populated sidebar subject options for school:', school);
}

// Add this at the end of the file to ensure dropdowns are populated when the page loads
document.addEventListener('DOMContentLoaded', function() {
    console.log('DOM fully loaded');
    
    // Populate sidebar dropdowns if school is selected
    const sidebarSchoolSelect = document.getElementById('sidebar-school-select');
    if (sidebarSchoolSelect && sidebarSchoolSelect.value && sidebarSchoolSelect.value !== 'none') {
        populateSidebarGradeOptions(sidebarSchoolSelect.value);
        populateSidebarSubjectOptions(sidebarSchoolSelect.value);
    }
    
    // Set up chat buttons when the page loads with multiple retries
    setTimeout(() => {
        setupChatButtons();
        
        // Try again after a longer delay to ensure everything is loaded
        setTimeout(setupChatButtons, 1000);
    }, 300);
});

// Add the missing setupButtonEventListeners function
function setupButtonEventListeners(chatInput, chatResponse, optimizeButton, submitButton) {
    console.log('Setting up button event listeners');
    
    // Set up optimize button
    if (optimizeButton) {
        // Remove any existing event listeners
        const newOptimizeButton = optimizeButton.cloneNode(true);
        optimizeButton.parentNode.replaceChild(newOptimizeButton, optimizeButton);
        optimizeButton = newOptimizeButton;
        
        optimizeButton.addEventListener('click', function() {
            const questionText = chatInput.value.trim();
            
            if (!questionText) {
                showSystemMessage('请先输入问题内容', 'warning');
                return;
            }
            
            // Get simplified educational context (school and grade only)
            const { school, grade } = getSimplifiedEducationalContext();
            
            // Show loading state
            optimizeButton.disabled = true;
            optimizeButton.innerHTML = '<i class="fas fa-spinner fa-spin"></i> 优化中...';
            
            // Prepare the prompt for optimization with simplified educational context
            const prompt = `请根据以下教育背景优化这个问题，使其更清晰、更有教育价值：

教育背景：
学校类型：${school}
年级：${grade}

原始问题：${questionText}

请返回优化后的问题，使其更适合上述教育背景的学生，保持原始意图但使其更加清晰、准确和有教育意义。
优化时请考虑学生的认知水平和教育阶段，使问题更有针对性。`;
            
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
                    showSystemMessage('问题已根据教育背景成功优化！', 'success');
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
    if (submitButton) {
        // Remove any existing event listeners
        const newSubmitButton = submitButton.cloneNode(true);
        submitButton.parentNode.replaceChild(newSubmitButton, submitButton);
        submitButton = newSubmitButton;
        
        submitButton.addEventListener('click', function() {
            const questionText = chatInput.value.trim();
            
            if (!questionText) {
                showSystemMessage('请先输入问题内容', 'warning');
                return;
            }
            
            // Get simplified educational context (school and grade only)
            const { school, grade } = getSimplifiedEducationalContext();
            
            // Show loading state
            submitButton.disabled = true;
            submitButton.innerHTML = '<i class="fas fa-spinner fa-spin"></i> 提交中...';
            chatResponse.innerHTML = '<div class="loading-indicator"><i class="fas fa-spinner fa-spin"></i> 正在思考...</div>';
            
            // Prepare the prompt for the AI with simplified educational context
            const prompt = `请根据以下教育背景回答这个问题，提供详细且教育性的解答：

教育背景：
学校类型：${school}
年级：${grade}

问题：${questionText}

请提供适合上述教育背景学生的清晰、准确、有教育意义的回答。
如果涉及数学或科学概念，请确保解释清楚，并考虑学生的认知水平。
如果可能，请提供一些例子或应用场景来帮助理解。`;
            
            // Call the API
            fetchAIResponse(prompt)
                .then(response => {
                    // Extract the AI response
                    const aiResponse = extractContentFromResponse(response);
                    
                    // Format the response with MathJax
                    const formattedResponse = formatMathExpressions(aiResponse);
                    
                    // Get simplified context summary for display
                    const contextSummary = getSimplifiedContextSummary();
                    
                    // Display the response with educational context
                    chatResponse.innerHTML = `
                        <div class="response-header">
                            <i class="fas fa-robot"></i> AI 助手回答
                            ${contextSummary ? `<span class="context-badge">${contextSummary}</span>` : ''}
                        </div>
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
                            抱歉，处理您的问题时出现了错误。请重试。
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

// Function to get curriculum information based on school, grade and subject
function getCurriculumInfo(school, grade, subject) {
    // Default curriculum info
    let curriculumInfo = '根据中国教育大纲标准提供适合的回答。';
    
    // Primary school curriculum info
    if (school.includes('小学')) {
        curriculumInfo = '根据小学教育大纲，注重基础知识的讲解，使用简单易懂的语言，多用具体例子，避免抽象概念。';
        
        if (subject.includes('数学')) {
            if (grade.includes('一年级') || grade.includes('二年级')) {
                curriculumInfo += '一二年级数学主要包括20以内的加减法、100以内的加减法、认识图形、认识时间等基础内容。';
            } else if (grade.includes('三年级') || grade.includes('四年级')) {
                curriculumInfo += '三四年级数学主要包括乘除法、分数初步、小数初步、面积、周长等内容。';
            } else if (grade.includes('五年级') || grade.includes('六年级')) {
                curriculumInfo += '五六年级数学主要包括分数四则运算、小数四则运算、比例、百分数、统计等内容。';
            }
        } else if (subject.includes('语文')) {
            curriculumInfo += '小学语文注重汉字识记、阅读理解、写作基础等能力培养。';
        } else if (subject.includes('英语')) {
            curriculumInfo += '小学英语注重基础词汇、简单句型和日常交流用语的学习。';
        } else if (subject.includes('科学')) {
            curriculumInfo += '小学科学注重培养观察能力和好奇心，了解自然现象和简单科学原理。';
        }
    }
    // Middle school curriculum info
    else if (school.includes('初中')) {
        curriculumInfo = '根据初中教育大纲，注重系统性知识的讲解，可以引入一定的抽象概念，但需要配合例子说明。';
        
        if (subject.includes('数学')) {
            if (grade.includes('初一')) {
                curriculumInfo += '初一数学主要包括有理数、整式、一元一次方程、几何初步等内容。';
            } else if (grade.includes('初二')) {
                curriculumInfo += '初二数学主要包括二元一次方程组、不等式、相似三角形、勾股定理等内容。';
            } else if (grade.includes('初三')) {
                curriculumInfo += '初三数学主要包括一元二次方程、二次函数、圆、概率初步等内容。';
            }
        } else if (subject.includes('物理')) {
            curriculumInfo += '初中物理注重基本概念、基本规律的理解和简单应用，包括力学、热学、光学、电学等基础内容。';
        } else if (subject.includes('化学')) {
            curriculumInfo += '初中化学注重基本概念、元素性质、化学反应等基础内容的学习。';
        } else if (subject.includes('生物')) {
            curriculumInfo += '初中生物注重生物的基本结构、功能和分类，以及生态系统的基本概念。';
        }
    }
    // High school curriculum info
    else if (school.includes('高中')) {
        curriculumInfo = '根据高中教育大纲，可以使用较为抽象的概念和复杂的理论，注重知识的系统性和应用能力的培养。';
        
        if (subject.includes('数学')) {
            if (grade.includes('高一')) {
                curriculumInfo += '高一数学主要包括集合、函数、三角函数、平面向量等内容。';
            } else if (grade.includes('高二')) {
                curriculumInfo += '高二数学主要包括立体几何、概率统计、数列、导数等内容。';
            } else if (grade.includes('高三')) {
                curriculumInfo += '高三数学主要是对高中数学知识的综合复习和应用，注重解题技巧和方法。';
            }
        } else if (subject.includes('物理')) {
            curriculumInfo += '高中物理包括力学、热学、电磁学、原子物理等内容，注重理论与实验的结合。';
        } else if (subject.includes('化学')) {
            curriculumInfo += '高中化学包括化学反应原理、元素化学、有机化学等内容，注重微观结构与宏观性质的联系。';
        } else if (subject.includes('生物')) {
            curriculumInfo += '高中生物包括分子与细胞、遗传与进化、稳态与环境等内容，注重生命活动的分子基础。';
        }
    }
    
    return curriculumInfo;
}

// Add a new function to get simplified educational context (school and grade only)
function getSimplifiedEducationalContext() {
    try {
        // Get the selected school
        const schoolSelect = document.getElementById('school-select') || document.getElementById('school-select-sidebar');
        const school = schoolSelect ? schoolSelect.value : '小学';
        
        // Get the selected grade
        const gradeSelect = document.getElementById('grade-select') || document.getElementById('grade-select-sidebar');
        const grade = gradeSelect ? gradeSelect.value : '一年级';
        
        // Get the selected subject
        const subjectSelect = document.getElementById('subject-select') || document.getElementById('subject-select-sidebar');
        const subject = subjectSelect ? subjectSelect.value : '语文';
        
        // Get curriculum info
        const curriculumInfo = getCurriculumInfo(school, grade, subject);
        
        return {
            school,
            grade,
            subject,
            curriculum: curriculumInfo
        };
    } catch (error) {
        console.error('Error getting educational context:', error);
        return {
            school: '小学',
            grade: '一年级',
            subject: '语文'
        };
    }
}

// Add a new function to get simplified context summary (school and grade only)
function getSimplifiedContextSummary() {
    // Initialize with default values
    let school = '';
    let grade = '';
    let hasValues = false;
    
    // Get all select elements in the document
    const allSelects = document.querySelectorAll('select');
    
    // Scan through all selects to find our dropdowns
    allSelects.forEach(select => {
        const id = select.id || '';
        const name = select.name || '';
        const value = select.value;
        
        // Check if this is a school dropdown
        if (id.includes('school') || name.includes('school')) {
            if (value && value !== 'none') {
                try {
                    school = select.options[select.selectedIndex].text;
                } catch (e) {
                    // Map values to text
                    const schoolMap = {
                        'primary': '小学',
                        'middle': '初中',
                        'high': '高中'
                    };
                    school = schoolMap[value] || value;
                }
                hasValues = true;
            }
        }
        
        // Check if this is a grade dropdown
        if (id.includes('grade') || name.includes('grade')) {
            if (value && value !== 'none') {
                try {
                    grade = select.options[select.selectedIndex].text;
                } catch (e) {
                    grade = value;
                }
                hasValues = true;
            }
        }
    });
    
    if (!hasValues) {
        return '';
    }
    
    let summary = '';
    
    if (school) {
        summary += school;
    }
    
    if (grade) {
        if (summary) summary += ' · ';
        summary += grade;
    }
    
    return summary;
}

// ... existing code ...

    // Set up all event listeners
    function setupEventListeners() {
        // Sidebar toggle
        elements.sidebarToggle.addEventListener('click', toggleSidebar);
        
        // Panel buttons
        elements.qaButton.addEventListener('click', () => switchPanel('qa'));
        elements.createButton.addEventListener('click', () => switchPanel('create'));
        
        // Make sure the poetry button has an event listener
        if (elements.poetryButton) {
            elements.poetryButton.addEventListener('click', () => switchPanel('poetry'));
            console.log('Poetry button event listener added');
        } else {
            console.error('Poetry button element not found');
        }
        
        // School select change
        elements.schoolSelectSidebar.addEventListener('change', (e) => {
            populateSidebarGradeOptions(e.target.value);
            populateSidebarSubjectOptions(e.target.value);
        });
        
        // Poetry type change
        if (elements.poetryTypeSelect) {
            elements.poetryTypeSelect.addEventListener('change', (e) => {
                updatePoetryStyleOptions(e.target.value);
            });
            
            // Initialize poetry style options based on default poetry type
            updatePoetryStyleOptions(elements.poetryTypeSelect.value);
        }
        
        // Chat buttons
        setupChatButtons();
        
        // Navigation buttons
        setupNavigationButtons();
        
        // Poetry buttons
        setupPoetryButtons();
    }

// ... existing code ...

    // Update poetry style options based on selected poetry type
    function updatePoetryStyleOptions(poetryType) {
        const styleSelect = elements.poetryStyleSelect;
        if (!styleSelect) return;
        
        // Clear existing options
        styleSelect.innerHTML = '';
        
        // Define style options based on poetry type
        let options = [];
        
        if (poetryType === '唐诗') {
            options = ['山水', '边塞', '浪漫', '现实'];
        } else if (poetryType === '宋词') {
            options = ['婉约', '豪放'];
        } else if (poetryType === '元曲') {
            options = ['杂居', '散曲'];
        }
        
        // Add options to select element
        options.forEach(style => {
            const option = document.createElement('option');
            option.value = style;
            option.textContent = style;
            styleSelect.appendChild(option);
        });
        
        console.log(`Updated poetry style options for ${poetryType}: ${options.join(', ')}`);
    }

// ... existing code ...

    // Function to handle learn poetry button click
    async function handleLearnPoetryClick() {
        console.log('Learn poetry button clicked');
        
        // Get user's educational context
        const schoolSelect = document.getElementById('school-select-sidebar');
        const gradeSelect = document.getElementById('grade-select-sidebar');
        
        if (!schoolSelect || !gradeSelect) {
            showSystemMessage('无法获取学校和年级信息', 'error');
            return;
        }
        
        const school = schoolSelect.value;
        const grade = gradeSelect.options[gradeSelect.selectedIndex].text;
        
        if (!school || !grade) {
            showSystemMessage('请先选择学校和年级', 'warning');
            return;
        }
        
        // Get poetry type and style
        const poetryType = poetryTypeSelect ? poetryTypeSelect.value : '唐诗';
        const poetryStyle = poetryStyleSelect ? poetryStyleSelect.value : '山水';
        
        console.log(`Generating poems for: ${school} ${grade}, Type: ${poetryType}, Style: ${poetryStyle}`);
        
        // Show loading state
        const poetryEmptyState = document.getElementById('poetry-empty-state');
        const poetryDisplay = document.getElementById('poetry-display');
        
        if (poetryEmptyState) poetryEmptyState.classList.add('hidden');
        if (poetryDisplay) poetryDisplay.classList.add('hidden');
        
        // Create and show loading indicator
        let loadingIndicator = document.getElementById('poetry-loading');
        if (!loadingIndicator) {
            loadingIndicator = document.createElement('div');
            loadingIndicator.id = 'poetry-loading';
            loadingIndicator.innerHTML = `
                <div class="spinner"></div>
                <p>正在查找适合${school}${grade}学生的经典${poetryType}，风格为${poetryStyle}...</p>
            `;
            loadingIndicator.style.display = 'flex';
            loadingIndicator.style.flexDirection = 'column';
            loadingIndicator.style.alignItems = 'center';
            loadingIndicator.style.justifyContent = 'center';
            loadingIndicator.style.padding = '3rem';
            
            const poetryContent = document.querySelector('.poetry-content');
            if (poetryContent) {
                poetryContent.appendChild(loadingIndicator);
            }
        } else {
            loadingIndicator.style.display = 'flex';
        }
        
        try {
            // Prepare the prompt for the API - specifically requesting famous ancient poems
            const prompt = `请为${school}${grade}的学生推荐5首著名的古代${poetryType}，风格为${poetryStyle}。
            请选择中国文学史上最著名、最经典的作品，这些作品应该是真实存在的古代诗词，不要创作新的内容。
            
            每首诗都应包含以下内容：
            1. 题目
            2. 作者（必须是真实的历史人物）
            3. 原文（必须是原始的古代诗词文本）
            4. 创作背景（包括历史背景和创作缘由）
            5. 赏析（包括艺术特色和文学价值）
            
            请以JSON格式返回，格式如下：
            [
              {
                "title": "诗词标题",
                "author": "作者",
                "content": "诗词原文",
                "background": "创作背景",
                "explanation": "赏析"
              },
              ...
            ]`;
            
            // Call the API
            const apiResponse = await fetchAIResponse(prompt);
            console.log('API response received');
            
            // Extract text content from the response
            let responseText = '';
            if (typeof apiResponse === 'string') {
                responseText = apiResponse;
            } else if (apiResponse && typeof apiResponse === 'object') {
                // Try to extract content from response object
                if (apiResponse.choices && apiResponse.choices.length > 0 && apiResponse.choices[0].message) {
                    responseText = apiResponse.choices[0].message.content || '';
                } else if (apiResponse.content) {
                    responseText = apiResponse.content;
                } else if (apiResponse.text) {
                    responseText = apiResponse.text;
                } else if (apiResponse.message) {
                    responseText = apiResponse.message;
                } else if (apiResponse.data) {
                    responseText = typeof apiResponse.data === 'string' ? apiResponse.data : JSON.stringify(apiResponse.data);
                } else {
                    // Last resort: stringify the entire response
                    responseText = JSON.stringify(apiResponse);
                }
            } else {
                throw new Error('Unexpected response format');
            }
            
            console.log('Extracted response text:', responseText.substring(0, 100) + '...');
            
            // Parse the response to extract the poems
            let poems = [];
            try {
                // First try: direct JSON parse if the response is already JSON
                try {
                    if (responseText.trim().startsWith('[') && responseText.trim().endsWith(']')) {
                        poems = JSON.parse(responseText);
                        console.log('Parsed JSON directly');
                    } else {
                        throw new Error('Response is not direct JSON');
                    }
                } catch (directParseError) {
                    console.log('Direct JSON parse failed, trying to extract JSON from text');
                    
                    // Second try: find JSON in the response text
                    const jsonMatch = responseText.match(/\[\s*\{[\s\S]*\}\s*\]/);
                    if (jsonMatch) {
                        poems = JSON.parse(jsonMatch[0]);
                        console.log('Extracted and parsed JSON from text');
                    } else {
                        throw new Error('No JSON found in response');
                    }
                }
            } catch (parseError) {
                console.error('Error parsing poems from response:', parseError);
                
                // Fallback: Try to extract structured content
                console.log('Trying to extract structured content');
                const sections = responseText.split(/(?=\d+\.\s*题目[:：])/);
                console.log('Found', sections.length - 1, 'potential poem sections');
                
                for (let i = 1; i < sections.length; i++) {
                    const section = sections[i];
                    
                    const titleMatch = section.match(/题目[:：]\s*(.+?)(?=\n|$)/);
                    const authorMatch = section.match(/作者[:：]\s*(.+?)(?=\n|$)/);
                    const contentMatch = section.match(/原文[:：]\s*([\s\S]+?)(?=\n\d+\.\s*创作背景[:：]|$)/);
                    const backgroundMatch = section.match(/创作背景[:：]\s*([\s\S]+?)(?=\n\d+\.\s*赏析[:：]|$)/);
                    const explanationMatch = section.match(/赏析[:：]\s*([\s\S]+?)(?=\n\d+\.\s*题目[:：]|$)/);
                    
                    if (titleMatch && authorMatch && contentMatch) {
                        poems.push({
                            title: titleMatch[1].trim(),
                            author: authorMatch[1].trim(),
                            content: contentMatch[1].trim(),
                            background: backgroundMatch ? backgroundMatch[1].trim() : "暂无背景信息",
                            explanation: explanationMatch ? explanationMatch[1].trim() : "暂无赏析"
                        });
                    }
                }
                
                // If still no poems, try one more approach with a different pattern
                if (poems.length === 0) {
                    console.log('Trying alternative parsing approach');
                    
                    // Look for numbered poems (1. 2. 3. etc.)
                    const poemSections = responseText.split(/(?=\d+\.)/);
                    
                    for (let i = 1; i < poemSections.length; i++) {
                        const section = poemSections[i];
                        
                        // Extract what we can
                        const titleMatch = section.match(/(?:题目[:：]|《(.+?)》)/);
                        const authorMatch = section.match(/(?:作者[:：]|[\(（](.+?)[\)）])/);
                        
                        // If we found at least a title, create a basic poem entry
                        if (titleMatch) {
                            const title = titleMatch[1] || titleMatch[0].replace(/题目[:：]/, '').trim();
                            const author = authorMatch ? (authorMatch[1] || authorMatch[0].replace(/作者[:：]/, '').trim()) : "未知";
                            
                            // Get the rest of the content
                            const contentStart = section.indexOf(titleMatch[0]) + titleMatch[0].length;
                            let content = section.substring(contentStart).trim();
                            
                            // Basic poem with what we could extract
                            poems.push({
                                title: title,
                                author: author,
                                content: content,
                                background: "暂无背景信息",
                                explanation: "暂无赏析"
                            });
                        }
                    }
                }
                
                // Last resort: if we still have no poems, create a single poem from the entire response
                if (poems.length === 0 && responseText.length > 0) {
                    console.log('Creating fallback poem from entire response');
                    poems.push({
                        title: `${poetryType}·${poetryStyle}`,
                        author: "古代诗人",
                        content: responseText.substring(0, 200), // Take first 200 chars as content
                        background: "这是根据您的要求查找的内容，但解析遇到了困难。",
                        explanation: "由于解析困难，无法提供完整赏析。请尝试重新生成。"
                    });
                }
            }
            
            // Validate poem objects
            poems = poems.map(poem => {
                return {
                    title: poem.title || '无标题',
                    author: poem.author || '佚名',
                    content: poem.content || '无内容',
                    background: poem.background || '无背景信息',
                    explanation: poem.explanation || '无赏析'
                };
            });
            
            // Remove loading indicator
            if (loadingIndicator) {
                loadingIndicator.style.display = 'none';
            }
            
            if (poems.length > 0) {
                console.log('Successfully parsed', poems.length, 'poems');
                // Store poems in state
                poemState.poems = poems;
                poemState.currentIndex = 0;
                
                // Display poems
                if (poetryDisplay) poetryDisplay.classList.remove('hidden');
                displayCurrentPoem();
            } else {
                // Show error message
                if (poetryEmptyState) poetryEmptyState.classList.remove('hidden');
                showSystemMessage(`无法生成${poetryType}的${poetryStyle}风格诗词，请稍后再试`, 'error');
            }
        } catch (error) {
            console.error('Error generating poems:', error);
            
            // Remove loading indicator
            if (loadingIndicator) {
                loadingIndicator.style.display = 'none';
            }
            
            // Show error message
            if (poetryEmptyState) poetryEmptyState.classList.remove('hidden');
            showSystemMessage('生成诗词时出错，请稍后再试', 'error');
        }
    }

// ... existing code ...

// Initialize the application
function init() {
    console.log('Initializing application...');
    
    // Setup event listeners
    setupEventListeners();
    
    // Populate sidebar options based on selected school
    const selectedSchool = elements.schoolSelectSidebar.value;
    if (selectedSchool) {
        populateSidebarGradeOptions(selectedSchool);
    }
    
    // Initialize empty state for quiz creation
    initializeEmptyState();
    
    // IMPORTANT: Directly add event listener to poetry button
    const poetryButton = document.getElementById('poetry-button');
    if (poetryButton) {
        console.log('Adding direct click event listener to poetry button');
        poetryButton.addEventListener('click', function() {
            console.log('Poetry button clicked directly');
            // Hide all panels
            document.getElementById('qa-panel').classList.add('hidden');
            document.getElementById('create-panel').classList.add('hidden');
            
            // Show poetry panel
            const poetryPanel = document.getElementById('poetry-panel');
            if (poetryPanel) {
                poetryPanel.classList.remove('hidden');
                console.log('Poetry panel is now visible');
            } else {
                console.error('Poetry panel element not found');
            }
            
            // Update active states
            document.getElementById('qa-button').classList.remove('active');
            document.getElementById('create-button').classList.remove('active');
            poetryButton.classList.add('active');
        });
    } else {
        console.error('Poetry button not found during init');
    }
    
    console.log('Application initialized');
}

// ... existing code ...

// Switch between different panels (keep this function for other buttons)
function switchPanel(panelId) {
    console.log('Switching to panel:', panelId);
    
    // Hide all panels
    const qaPanel = document.getElementById('qa-panel');
    const createPanel = document.getElementById('create-panel');
    const poetryPanel = document.getElementById('poetry-panel');
    
    if (qaPanel) qaPanel.classList.add('hidden');
    if (createPanel) createPanel.classList.add('hidden');
    if (poetryPanel) poetryPanel.classList.add('hidden');
    
    // Show the selected panel
    if (panelId === 'qa-panel' && qaPanel) {
        qaPanel.classList.remove('hidden');
        document.getElementById('qa-button').classList.add('active');
        document.getElementById('create-button').classList.remove('active');
        const poetryButton = document.getElementById('poetry-button');
        if (poetryButton) poetryButton.classList.remove('active');
    } else if (panelId === 'create-panel' && createPanel) {
        createPanel.classList.remove('hidden');
        document.getElementById('create-button').classList.add('active');
        document.getElementById('qa-button').classList.remove('active');
        const poetryButton = document.getElementById('poetry-button');
        if (poetryButton) poetryButton.classList.remove('active');
    } else if (panelId === 'poetry-panel' && poetryPanel) {
        poetryPanel.classList.remove('hidden');
        const poetryButton = document.getElementById('poetry-button');
        if (poetryButton) poetryButton.classList.add('active');
        document.getElementById('qa-button').classList.remove('active');
        document.getElementById('create-button').classList.remove('active');
        console.log('Poetry panel is now visible via switchPanel');
    }
}

// Setup event listeners
function setupEventListeners() {
    console.log('Setting up event listeners...');
    
    // Sidebar toggle
    const sidebarToggle = document.getElementById('sidebar-toggle');
    if (sidebarToggle) {
        sidebarToggle.addEventListener('click', toggleSidebar);
    }
    
    // Panel buttons
    const qaButton = document.getElementById('qa-button');
    const createButton = document.getElementById('create-button');
    
    if (qaButton) {
        qaButton.addEventListener('click', function() {
            switchPanel('qa-panel');
        });
    }
    
    if (createButton) {
        createButton.addEventListener('click', function() {
            switchPanel('create-panel');
        });
    }
}

// Add this code at the end of the file to ensure it runs after everything else

// Poetry Tab Functionality - Self-contained implementation
document.addEventListener('DOMContentLoaded', function() {
    console.log('Poetry tab functionality initializing...');
    
    // Get the poetry button and panel
    const poetryButton = document.getElementById('poetry-button');
    const poetryPanel = document.getElementById('poetry-panel');
    const qaPanel = document.getElementById('qa-panel');
    const createPanel = document.getElementById('create-panel');
    const qaButton = document.getElementById('qa-button');
    const createButton = document.getElementById('create-button');
    
    // Log what we found
    console.log('Poetry elements found:', {
        poetryButton: !!poetryButton,
        poetryPanel: !!poetryPanel,
        qaPanel: !!qaPanel,
        createPanel: !!createPanel
    });
    
    // Add direct event listener to poetry button
    if (poetryButton) {
        poetryButton.addEventListener('click', function(event) {
            console.log('Poetry button clicked (direct handler)');
            
            // Hide other panels
            if (qaPanel) qaPanel.classList.add('hidden');
            if (createPanel) createPanel.classList.add('hidden');
            
            // Show poetry panel
            if (poetryPanel) {
                poetryPanel.classList.remove('hidden');
                console.log('Poetry panel is now visible');
            } else {
                console.error('Poetry panel not found');
            }
            
            // Update active states
            if (qaButton) qaButton.classList.remove('active');
            if (createButton) createButton.classList.remove('active');
            poetryButton.classList.add('active');
            
            // Prevent default behavior
            event.preventDefault();
        });
        console.log('Direct event listener added to poetry button');
    } else {
        console.error('Poetry button not found');
    }
    
    // Add event listener to Learn Poetry button
    const learnPoetryButton = document.getElementById('learn-poetry-button');
    if (learnPoetryButton) {
        learnPoetryButton.addEventListener('click', function() {
            console.log('Learn poetry button clicked (direct handler)');
            
            // Mock data for testing
            const mockPoems = [
                {
                    title: "望庐山瀑布",
                    author: "李白",
                    content: "日照香炉生紫烟，\n遥看瀑布挂前川。\n飞流直下三千尺，\n疑是银河落九天。",
                    background: "这首诗是唐代诗人李白游览庐山时所作，描写了庐山瀑布的壮观景象。",
                    explanation: "这首诗生动地描绘了庐山瀑布的壮丽景象，表现了诗人对自然的热爱和赞美。"
                },
                {
                    title: "静夜思",
                    author: "李白",
                    content: "床前明月光，\n疑是地上霜。\n举头望明月，\n低头思故乡。",
                    background: "这首诗是唐代诗人李白所作，表达了诗人思乡之情。",
                    explanation: "这首诗通过月光和霜的联想，表达了诗人对故乡的思念之情。"
                }
            ];
            
            // Get poetry display elements
            const poetryEmptyState = document.getElementById('poetry-empty-state');
            const poetryDisplay = document.getElementById('poetry-display');
            const poemTitle = document.getElementById('poem-title');
            const poemAuthor = document.getElementById('poem-author');
            const poemContent = document.getElementById('poem-content');
            const poemBackground = document.getElementById('poem-background');
            const poemExplanation = document.getElementById('poem-explanation');
            const poemCounter = document.getElementById('poem-counter');
            
            // Hide empty state and show display
            if (poetryEmptyState) poetryEmptyState.classList.add('hidden');
            if (poetryDisplay) poetryDisplay.classList.remove('hidden');
            
            // Display the first poem
            if (poemTitle) poemTitle.textContent = mockPoems[0].title;
            if (poemAuthor) poemAuthor.textContent = mockPoems[0].author;
            if (poemContent) poemContent.innerHTML = mockPoems[0].content.replace(/\n/g, '<br>');
            if (poemBackground) poemBackground.innerHTML = mockPoems[0].background;
            if (poemExplanation) poemExplanation.innerHTML = mockPoems[0].explanation;
            if (poemCounter) poemCounter.textContent = `1 / ${mockPoems.length}`;
            
            console.log('Mock poem displayed');
        });
        console.log('Direct event listener added to learn poetry button');
    }
    
    // Add event listeners for navigation buttons
    const prevPoemButton = document.getElementById('prev-poem-button');
    const nextPoemButton = document.getElementById('next-poem-button');
    
    if (prevPoemButton) {
        prevPoemButton.addEventListener('click', function() {
            console.log('Previous poem button clicked');
        });
    }
    
    if (nextPoemButton) {
        nextPoemButton.addEventListener('click', function() {
            console.log('Next poem button clicked');
        });
    }
    
    // Add event listener for poetry type dropdown
    const poetryTypeSelect = document.getElementById('poetry-type');
    const poetryStyleSelect = document.getElementById('poetry-style');
    
    if (poetryTypeSelect && poetryStyleSelect) {
        poetryTypeSelect.addEventListener('change', function() {
            const poetryType = poetryTypeSelect.value;
            console.log('Poetry type changed to:', poetryType);
            
            // Clear existing options
            while (poetryStyleSelect.options.length > 0) {
                poetryStyleSelect.remove(0);
            }
            
            // Add new options based on selected type
            if (poetryType === '唐诗') {
                const styles = ['山水', '边塞', '浪漫', '现实'];
                styles.forEach(style => {
                    const option = document.createElement('option');
                    option.value = style;
                    option.textContent = style;
                    poetryStyleSelect.appendChild(option);
                });
            } else if (poetryType === '宋词') {
                const styles = ['婉约', '豪放'];
                styles.forEach(style => {
                    const option = document.createElement('option');
                    option.value = style;
                    option.textContent = style;
                    poetryStyleSelect.appendChild(option);
                });
            } else if (poetryType === '元曲') {
                const styles = ['杂居', '散曲'];
                styles.forEach(style => {
                    const option = document.createElement('option');
                    option.value = style;
                    option.textContent = style;
                    poetryStyleSelect.appendChild(option);
                });
            }
            
            console.log('Updated poetry style options');
        });
    }
    
    console.log('Poetry tab functionality initialized');
});

// Add this code at the end of the file

// Poetry Tab Functionality - Complete implementation
document.addEventListener('DOMContentLoaded', function() {
    console.log('Poetry tab functionality initializing...');
    
    // Get the poetry button and panel
    const poetryButton = document.getElementById('poetry-button');
    const poetryPanel = document.getElementById('poetry-panel');
    const qaPanel = document.getElementById('qa-panel');
    const createPanel = document.getElementById('create-panel');
    const qaButton = document.getElementById('qa-button');
    const createButton = document.getElementById('create-button');
    
    // Log what we found
    console.log('Poetry elements found:', {
        poetryButton: !!poetryButton,
        poetryPanel: !!poetryPanel,
        qaPanel: !!qaPanel,
        createPanel: !!createPanel
    });
    
    // If poetry panel doesn't exist, create it
    if (!poetryPanel) {
        console.log('Creating poetry panel element');
        const newPoetryPanel = document.createElement('div');
        newPoetryPanel.id = 'poetry-panel';
        newPoetryPanel.className = 'panel hidden';
        
        // Create the basic structure
        newPoetryPanel.innerHTML = `
            <div id="poetry-container" class="content-container">
                <div class="poetry-header">
                    <h2>诗词学习</h2>
                    <div class="poetry-config-frame">
                        <div class="config-row">
                            <label for="poetry-type">诗词类型:</label>
                            <select id="poetry-type">
                                <option value="唐诗">唐诗</option>
                                <option value="宋词">宋词</option>
                                <option value="元曲">元曲</option>
                            </select>
                        </div>
                        <div class="config-row">
                            <label for="poetry-style">诗词风格:</label>
                            <select id="poetry-style">
                                <option value="山水">山水</option>
                                <option value="边塞">边塞</option>
                                <option value="浪漫">浪漫</option>
                                <option value="现实">现实</option>
                            </select>
                        </div>
                    </div>
                    <button id="learn-poetry-button" class="primary-button poetry-button">学习诗词</button>
                </div>
                <div class="poetry-content">
                    <div id="poetry-empty-state" class="empty-state">
                        <p>请选择学校和年级，然后点击"学习诗词"按钮生成适合您的诗词。</p>
                    </div>
                    <div id="poetry-display" class="hidden">
                        <div class="poem-navigation">
                            <button id="prev-poem-button" class="poem-nav-button" disabled>◀ 上一首</button>
                            <span id="poem-counter">1 / 5</span>
                            <button id="next-poem-button" class="poem-nav-button">下一首 ▶</button>
                        </div>
                        <div class="poem-display">
                            <h3 id="poem-title" class="poem-title"></h3>
                            <p id="poem-author" class="poem-author"></p>
                            <div id="poem-content" class="poem-content"></div>
                            <div class="poem-info">
                                <div class="poem-section">
                                    <h4>背景</h4>
                                    <p id="poem-background"></p>
                                </div>
                                <div class="poem-section">
                                    <h4>赏析</h4>
                                    <p id="poem-explanation"></p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;
        
        // Add the panel to the document
        const mainContent = document.querySelector('.main-content');
        if (mainContent) {
            mainContent.appendChild(newPoetryPanel);
            console.log('Poetry panel added to the document');
        } else {
            console.error('Main content element not found');
        }
    }
    
    // Add direct event listener to poetry button
    if (poetryButton) {
        poetryButton.addEventListener('click', function(event) {
            console.log('Poetry button clicked (direct handler)');
            
            // Get the poetry panel again in case it was just created
            const poetryPanel = document.getElementById('poetry-panel');
            
            // Hide other panels
            if (qaPanel) qaPanel.classList.add('hidden');
            if (createPanel) createPanel.classList.add('hidden');
            
            // Show poetry panel
            if (poetryPanel) {
                poetryPanel.classList.remove('hidden');
                console.log('Poetry panel is now visible');
            } else {
                console.error('Poetry panel not found');
            }
            
            // Update active states
            if (qaButton) qaButton.classList.remove('active');
            if (createButton) createButton.classList.remove('active');
            poetryButton.classList.add('active');
            
            // Initialize poetry type and style dropdowns
            initializePoetryDropdowns();
        });
        console.log('Direct event listener added to poetry button');
    } else {
        console.error('Poetry button not found');
    }
    
    // Initialize poetry type and style dropdowns
    function initializePoetryDropdowns() {
        const poetryTypeSelect = document.getElementById('poetry-type');
        const poetryStyleSelect = document.getElementById('poetry-style');
        
        if (poetryTypeSelect && poetryStyleSelect) {
            // Add event listener for poetry type dropdown
            poetryTypeSelect.addEventListener('change', function() {
                updatePoetryStyleOptions(poetryTypeSelect.value);
            });
            
            // Initialize style options based on current type
            updatePoetryStyleOptions(poetryTypeSelect.value);
        }
    }
    
    // Update poetry style options based on selected type
    function updatePoetryStyleOptions(poetryType) {
        console.log('Updating poetry style options for type:', poetryType);
        
        const poetryStyleSelect = document.getElementById('poetry-style');
        if (!poetryStyleSelect) {
            console.error('Poetry style select element not found');
            return;
        }
        
        // Clear existing options
        while (poetryStyleSelect.options.length > 0) {
            poetryStyleSelect.remove(0);
        }
        
        // Add new options based on selected type
        let styles = [];
        
        if (poetryType === '唐诗') {
            styles = ['山水', '边塞', '浪漫', '现实'];
        } else if (poetryType === '宋词') {
            styles = ['婉约', '豪放'];
        } else if (poetryType === '元曲') {
            styles = ['杂居', '散曲'];
        }
        
        // Add options to select
        styles.forEach(style => {
            const option = document.createElement('option');
            option.value = style;
            option.textContent = style;
            poetryStyleSelect.appendChild(option);
        });
        
        console.log('Updated poetry style options:', styles);
    }
    
    // Add event listener to Learn Poetry button
    document.addEventListener('click', function(event) {
        if (event.target && event.target.id === 'learn-poetry-button') {
            console.log('Learn poetry button clicked via delegation');
            
            // Get selected values
            const poetryTypeSelect = document.getElementById('poetry-type-select');
            const poetryStyleSelect = document.getElementById('poetry-style-select');
            const poetryType = poetryTypeSelect ? poetryTypeSelect.value : '唐诗';
            const poetryStyle = poetryStyleSelect ? poetryStyleSelect.value : '山水';
            
            // Call the API function directly - no mock data
            handleLearnPoetryClick();
        }
    });
    
    // Update the prompt in handleLearnPoetryClick function to specifically request famous ancient poems
    const prompt = `请为${school}${grade}的学生推荐5首著名的古代${poetryType}，风格为${poetryStyle}。
    请选择中国文学史上最著名、最经典的作品，这些作品应该是真实存在的古代诗词，不要创作新的内容。
    
    每首诗都应包含以下内容：
    1. 题目
    2. 作者（必须是真实的历史人物）
    3. 原文（必须是原始的古代诗词文本）
    4. 创作背景（包括历史背景和创作缘由）
    5. 赏析（包括艺术特色和文学价值）
    
    请以JSON格式返回，格式如下：
    [
      {
        "title": "诗词标题",
        "author": "作者",
        "content": "诗词原文",
        "background": "创作背景",
        "explanation": "赏析"
      },
      ...
    ]`;
    
    // Remove any other instances of mock poem data in the file
});

// Add this code at the end of the file, replacing the previous fix

// Fix for poetry functionality
document.addEventListener('DOMContentLoaded', function() {
    console.log('Poetry functionality initializing...');
    
    // Get the poetry type and style select elements from the main panel (not sidebar)
    const poetryTypeSelect = document.getElementById('poetry-type-select');
    const poetryStyleSelect = document.getElementById('poetry-style-select');
    
    if (poetryTypeSelect && poetryStyleSelect) {
        console.log('Found poetry type and style selects');
        
        // Function to update style options based on selected type
        function updatePoetryStyleOptions() {
            const poetryType = poetryTypeSelect.value;
            console.log('Updating poetry style options for type:', poetryType);
            
            // Clear existing options
            while (poetryStyleSelect.options.length > 0) {
                poetryStyleSelect.remove(0);
            }
            
            // Always add "任意" option first
            const anyOption = document.createElement('option');
            anyOption.value = '任意';
            anyOption.textContent = '任意';
            poetryStyleSelect.appendChild(anyOption);
            
            // Add new options based on selected type
            let styles = [];
            
            if (poetryType === '唐诗') {
                styles = ['山水', '边塞', '浪漫', '现实'];
            } else if (poetryType === '宋词') {
                styles = ['婉约', '豪放'];
            } else if (poetryType === '元曲') {
                styles = ['杂居', '散曲'];
            }
            
            // Add options to select
            styles.forEach(style => {
                const option = document.createElement('option');
                option.value = style;
                option.textContent = style;
                poetryStyleSelect.appendChild(option);
            });
            
            console.log('Updated poetry style options:', ['任意', ...styles]);
        }
        
        // Add event listener for poetry type change
        poetryTypeSelect.addEventListener('change', updatePoetryStyleOptions);
        
        // Initialize style options based on default type
        updatePoetryStyleOptions();
    } else {
        console.error('Poetry type or style select not found');
    }
    
    // Get all containers and store their original parent nodes
    const poetryContainer = document.getElementById('poetry-container');
    const qaContainer = document.getElementById('qa-container');
    const createContainer = document.getElementById('create-container');
    
    // Store original parent nodes
    let poetryParent = null;
    let qaParent = null;
    let createParent = null;
    
    if (poetryContainer) {
        poetryParent = poetryContainer.parentNode;
        // Initially remove poetry container from DOM
        if (poetryParent) {
            poetryParent.removeChild(poetryContainer);
        }
    }
    
    if (qaContainer) {
        qaParent = qaContainer.parentNode;
    }
    
    if (createContainer) {
        createParent = createContainer.parentNode;
    }
    
    // Get all buttons
    const poetryButton = document.getElementById('poetry-button');
    const qaButton = document.getElementById('qa-button');
    const createButton = document.getElementById('create-button');
    
    // Get the content area where containers should be placed
    const contentArea = document.querySelector('.content-area');
    
    // Function to handle tab switching
    function handleTabSwitch(containerType) {
        console.log('Switching to tab:', containerType);
        
        // First, remove all containers from DOM to ensure clean state
        if (qaContainer && qaContainer.parentNode) {
            qaContainer.parentNode.removeChild(qaContainer);
        }
        
        if (createContainer && createContainer.parentNode) {
            createContainer.parentNode.removeChild(createContainer);
        }
        
        if (poetryContainer && poetryContainer.parentNode) {
            poetryContainer.parentNode.removeChild(poetryContainer);
        }
        
        // Reset active states
        if (qaButton) qaButton.classList.remove('active');
        if (createButton) createButton.classList.remove('active');
        if (poetryButton) poetryButton.classList.remove('active');
        
        // Add only the appropriate container to the content area
        if (containerType === 'qa' && qaContainer && contentArea) {
            contentArea.appendChild(qaContainer);
            if (qaButton) qaButton.classList.add('active');
            console.log('QA container added to content area');
            
            // Ensure poetry container is not present
            const existingPoetryContainer = document.getElementById('poetry-container');
            if (existingPoetryContainer && existingPoetryContainer.parentNode) {
                existingPoetryContainer.parentNode.removeChild(existingPoetryContainer);
            }
        } else if (containerType === 'create' && createContainer && contentArea) {
            contentArea.appendChild(createContainer);
            if (createButton) createButton.classList.add('active');
            console.log('Create container added to content area');
            
            // Ensure poetry container is not present
            const existingPoetryContainer = document.getElementById('poetry-container');
            if (existingPoetryContainer && existingPoetryContainer.parentNode) {
                existingPoetryContainer.parentNode.removeChild(existingPoetryContainer);
            }
            
            // Show empty state on test page
            const questionsDisplayContainer = document.getElementById('questions-display-container');
            const emptyState = document.getElementById('empty-state');
            
            if (questionsDisplayContainer) {
                questionsDisplayContainer.classList.remove('hidden');
                
                if (emptyState) {
                    emptyState.classList.remove('hidden');
                }
                
                // Hide any existing question content
                const questionCounter = document.getElementById('question-counter');
                const questionText = document.getElementById('question-text');
                const choicesContainer = document.getElementById('choices-container');
                const answerContainer = document.getElementById('answer-container');
                
                if (questionCounter) questionCounter.textContent = '';
                if (questionText) questionText.textContent = '';
                if (choicesContainer) choicesContainer.innerHTML = '';
                if (answerContainer) answerContainer.classList.add('hidden');
            }
        } else if (containerType === 'poetry' && poetryContainer && contentArea) {
            contentArea.appendChild(poetryContainer);
            if (poetryButton) poetryButton.classList.add('active');
            console.log('Poetry container added to content area');
            
            // After switching to poetry tab, add event listener to learn poetry button
            setTimeout(() => {
                const learnPoetryButton = document.getElementById('learn-poetry-button');
                if (learnPoetryButton) {
                    // Remove any existing event listeners
                    const newButton = learnPoetryButton.cloneNode(true);
                    learnPoetryButton.parentNode.replaceChild(newButton, learnPoetryButton);
                    
                    // Add new event listener
                    newButton.addEventListener('click', function() {
                        console.log('Learn poetry button clicked');
                        handleLearnPoetryClick();
                    });
                }
            }, 100);
        }
    }
    
    // Add event listeners to buttons
    if (qaButton) {
        qaButton.addEventListener('click', function() {
            console.log('QA button clicked');
            handleTabSwitch('qa');
        });
    }
    
    if (createButton) {
        createButton.addEventListener('click', function() {
            console.log('Create button clicked');
            handleTabSwitch('create');
        });
    }
    
    if (poetryButton) {
        poetryButton.addEventListener('click', function() {
            console.log('Poetry button clicked');
            handleTabSwitch('poetry');
        });
    }
    
    // Initialize with QA container
    handleTabSwitch('qa');
    
    // Global state for poems
    const poemState = {
        poems: [],
        currentIndex: 0
    };
    
    // Function to display the current poem
    function displayCurrentPoem() {
        if (!poemState.poems || poemState.poems.length === 0) {
            console.error('No poems available to display');
            return;
        }
        
        const poem = poemState.poems[poemState.currentIndex];
        console.log('Displaying poem:', poem, 'Current index:', poemState.currentIndex);
        
        // Get poem elements
        const poemTitle = document.querySelector('.poem-title');
        const poemAuthor = document.querySelector('.poem-author');
        const poemContent = document.querySelector('.poem-content');
        const poemBackground = document.querySelector('.poem-background');
        const poemExplanation = document.querySelector('.poem-explanation');
        const poemCounter = document.querySelector('.poem-counter');
        
        // Display poem data with null checks
        if (poemTitle) poemTitle.textContent = poem.title || '无标题';
        if (poemAuthor) poemAuthor.textContent = poem.author || '佚名';
        
        // Handle content with null check
        if (poemContent) {
            if (poem.content) {
                poemContent.innerHTML = poem.content.replace ? poem.content.replace(/\n/g, '<br>') : poem.content;
            } else {
                poemContent.innerHTML = '无内容';
            }
        }
        
        // Handle background with null check
        if (poemBackground) {
            poemBackground.innerHTML = poem.background || '无背景信息';
        }
        
        // Handle explanation with null check
        if (poemExplanation) {
            poemExplanation.innerHTML = poem.explanation || '无赏析';
        }
        
        if (poemCounter) {
            poemCounter.textContent = `${poemState.currentIndex + 1} / ${poemState.poems.length}`;
        }
        
        // Update navigation buttons
        updatePoemNavigationButtons();
    }
    
    // Function to update navigation buttons
    function updatePoemNavigationButtons() {
        const prevButton = document.getElementById('prev-poem-button');
        const nextButton = document.getElementById('next-poem-button');
        
        if (prevButton) {
            prevButton.disabled = poemState.currentIndex === 0;
            console.log('Prev button disabled:', prevButton.disabled);
        }
        
        if (nextButton) {
            nextButton.disabled = poemState.currentIndex === poemState.poems.length - 1;
            console.log('Next button disabled:', nextButton.disabled);
        }
    }
    
    // Improved direct event listeners for navigation buttons
    function setupPoemNavigationButtons() {
        console.log('Setting up poem navigation buttons');
        
        // Remove any existing event listeners by cloning and replacing
        const prevButton = document.getElementById('prev-poem-button');
        const nextButton = document.getElementById('next-poem-button');
        
        if (prevButton) {
            const newPrevButton = prevButton.cloneNode(true);
            prevButton.parentNode.replaceChild(newPrevButton, prevButton);
            
            newPrevButton.addEventListener('click', function(event) {
                event.preventDefault();
                event.stopPropagation(); // Stop event from bubbling up to document
                console.log('Previous poem button clicked directly');
                if (poemState.currentIndex > 0) {
                    poemState.currentIndex--;
                    displayCurrentPoem();
                }
            });
        }
        
        if (nextButton) {
            const newNextButton = nextButton.cloneNode(true);
            nextButton.parentNode.replaceChild(newNextButton, nextButton);
            
            newNextButton.addEventListener('click', function(event) {
                event.preventDefault();
                event.stopPropagation(); // Stop event from bubbling up to document
                console.log('Next poem button clicked directly');
                if (poemState.currentIndex < poemState.poems.length - 1) {
                    poemState.currentIndex++;
                    displayCurrentPoem();
                }
            });
        }
    }
    
    // REMOVE the event delegation approach to avoid duplicate handling
    // We'll rely solely on the direct event listeners set up in setupPoemNavigationButtons
    
    // Function to handle learn poetry button click
    async function handleLearnPoetryClick() {
        console.log('Learn poetry button clicked - function invoked');
        
        // Get user's educational context
        const schoolSelect = document.getElementById('school-select-sidebar');
        const gradeSelect = document.getElementById('grade-select-sidebar');
        
        if (!schoolSelect || !gradeSelect) {
            showSystemMessage('无法获取学校和年级信息', 'error');
            return;
        }
        
        const school = schoolSelect.value;
        const grade = gradeSelect.options[gradeSelect.selectedIndex].text;
        
        if (!school || !grade) {
            showSystemMessage('请先选择学校和年级', 'warning');
            return;
        }
        
        // Get poetry type and style from the main panel selects (not sidebar)
        // Get fresh references to avoid stale data
        const currentTypeSelect = document.getElementById('poetry-type-select');
        const currentStyleSelect = document.getElementById('poetry-style-select');
        
        if (!currentTypeSelect || !currentStyleSelect) {
            console.error('Poetry type or style select not found');
            showSystemMessage('无法获取诗词类型和风格信息', 'error');
            return;
        }
        
        const poetryType = currentTypeSelect.value;
        const poetryStyle = currentStyleSelect.value;
        
        console.log(`Generating poems for: ${school} ${grade}, Type: ${poetryType}, Style: ${poetryStyle}`);
        
        // Show loading state
        const poetryEmptyState = document.getElementById('poetry-empty-state');
        const poetryDisplay = document.getElementById('poetry-display');
        
        if (poetryEmptyState) poetryEmptyState.classList.add('hidden');
        if (poetryDisplay) poetryDisplay.classList.add('hidden');
        
        // Create and show loading indicator
        let loadingIndicator = document.getElementById('poetry-loading');
        if (!loadingIndicator) {
            loadingIndicator = document.createElement('div');
            loadingIndicator.id = 'poetry-loading';
            loadingIndicator.innerHTML = `
                <div class="spinner"></div>
                <p>正在查找适合${school}${grade}学生的经典${poetryType}，风格为${poetryStyle}...</p>
            `;
            loadingIndicator.style.display = 'flex';
            loadingIndicator.style.flexDirection = 'column';
            loadingIndicator.style.alignItems = 'center';
            loadingIndicator.style.justifyContent = 'center';
            loadingIndicator.style.padding = '3rem';
            
            const poetryContent = document.querySelector('.poetry-content');
            if (poetryContent) {
                poetryContent.appendChild(loadingIndicator);
            }
        } else {
            loadingIndicator.style.display = 'flex';
        }
        
        try {
            // Determine appropriate complexity level based on educational background
            let complexityLevel = "简单";
            let vocabularyLevel = "基础";
            let explanationDetail = "详细";
            let examplePoems = "";
            let wordCount = "20-40字";
            
            // Adjust complexity based on school level
            if (school === "小学") {
                if (parseInt(grade) <= 3) {
                    complexityLevel = "非常简单";
                    vocabularyLevel = "最基础";
                    explanationDetail = "非常详细且通俗易懂";
                    wordCount = "20-30字";
                    examplePoems = "如《静夜思》《春晓》《悯农》等简短易懂的诗";
                } else {
                    complexityLevel = "简单";
                    vocabularyLevel = "基础";
                    explanationDetail = "详细且通俗易懂";
                    wordCount = "30-40字";
                    examplePoems = "如《登鹳雀楼》《游子吟》《咏柳》等小学课本中的经典诗";
                }
            } else if (school === "初中") {
                complexityLevel = "中等";
                vocabularyLevel = "适中";
                explanationDetail = "较详细";
                wordCount = "40-60字";
                examplePoems = "如《望岳》《送元二使安西》《茅屋为秋风所破歌》等初中课本中的经典诗";
            } else if (school === "高中") {
                complexityLevel = "适当";
                vocabularyLevel = "丰富";
                explanationDetail = "深入";
                wordCount = "不限";
                examplePoems = "如《蜀相》《琵琶行》《念奴娇·赤壁怀古》等高中课本中的经典诗";
            }
            
            // Modify the prompt to handle "任意" style
            let stylePrompt = '';
            if (poetryStyle === '任意') {
                stylePrompt = `风格不限`;
            } else {
                stylePrompt = `风格为${poetryStyle}`;
            }
            
            // Prepare the prompt for the API - specifically requesting famous ancient poems
            // with consideration for the student's educational level
            const prompt = `请为${school}${grade}的学生推荐5首著名的古代${poetryType}，${stylePrompt}。
            请选择中国文学史上最著名、最经典的作品，这些作品应该是真实存在的古代诗词，不要创作新的内容。
            
            【重要】这些诗词必须严格符合${school}${grade}学生的认知水平和学习需求：
            1. 诗词长度：优先选择${wordCount}左右的诗词，${examplePoems}
            2. 难度要求：选择难度${complexityLevel}、词汇量${vocabularyLevel}的诗词
            3. 内容要求：主题积极向上，意境清晰，适合${school}${grade}学生理解和背诵
            4. 教育价值：具有明确的情感表达和思想内涵，能够引发学生共鸣
            
            针对不同学龄段的具体要求：
            - 小学低年级(1-3年级)：选择字数少、节奏感强、内容生动形象的诗词，如《静夜思》《春晓》
            - 小学高年级(4-6年级)：选择意境优美、主题明确的诗词，如《望庐山瀑布》《黄鹤楼送孟浩然之广陵》
            - 初中：选择思想内涵较丰富、艺术手法有特色的诗词，如《望岳》《茅屋为秋风所破歌》
            - 高中：选择思想深度和艺术价值较高的诗词，如《蜀相》《琵琶行》《念奴娇·赤壁怀古》
            
            解释和赏析要求：
            - 解释要${explanationDetail}，使用适合${school}${grade}学生理解的语言
            - 背景介绍要有趣且与学生的知识水平相符
            - 赏析要重点解释难词难句，并用${school}${grade}学生能理解的现代语言翻译原文
            - 分析要点明诗词的意境、情感和艺术特色，但避免过于学术化的术语
            
            每首诗都应包含以下内容：
            1. 题目
            2. 作者（必须是真实的历史人物）
            3. 原文（必须是原始的古代诗词文本）
            4. 创作背景（包括历史背景和创作缘由的详细介绍，适合${school}${grade}学生理解的深度）
            5. 赏析（逐句解释翻译，同时指出难词难句，用现代语言描述诗词曲描述的画面和故事，并介绍诗词曲的艺术特色和文学价值，使用${school}${grade}学生能理解的语言）
            
            请以JSON格式返回，格式如下：
            [
              {
                "title": "诗词标题",
                "author": "作者",
                "content": "诗词原文",
                "background": "创作背景",
                "explanation": "赏析"
              },
              ...
            ]`;
            
            // Call the API
            const apiResponse = await fetchAIResponse(prompt);
            console.log('API response received');
            
            // Extract text content from the response
            let responseText = '';
            if (typeof apiResponse === 'string') {
                responseText = apiResponse;
            } else if (apiResponse && typeof apiResponse === 'object') {
                // Try to extract content from response object
                if (apiResponse.choices && apiResponse.choices.length > 0 && apiResponse.choices[0].message) {
                    responseText = apiResponse.choices[0].message.content || '';
                } else if (apiResponse.content) {
                    responseText = apiResponse.content;
                } else if (apiResponse.text) {
                    responseText = apiResponse.text;
                } else if (apiResponse.message) {
                    responseText = apiResponse.message;
                } else if (apiResponse.data) {
                    responseText = typeof apiResponse.data === 'string' ? apiResponse.data : JSON.stringify(apiResponse.data);
                } else {
                    // Last resort: stringify the entire response
                    responseText = JSON.stringify(apiResponse);
                }
            } else {
                throw new Error('Unexpected response format');
            }
            
            console.log('Extracted response text:', responseText.substring(0, 100) + '...');
            
            // Parse the response to extract the poems
            let poems = [];
            try {
                // First try: direct JSON parse if the response is already JSON
                try {
                    if (responseText.trim().startsWith('[') && responseText.trim().endsWith(']')) {
                        poems = JSON.parse(responseText);
                        console.log('Parsed JSON directly');
                    } else {
                        throw new Error('Response is not direct JSON');
                    }
                } catch (directParseError) {
                    console.log('Direct JSON parse failed, trying to extract JSON from text');
                    
                    // Second try: find JSON in the response text
                    const jsonMatch = responseText.match(/\[\s*\{[\s\S]*\}\s*\]/);
                    if (jsonMatch) {
                        poems = JSON.parse(jsonMatch[0]);
                        console.log('Extracted and parsed JSON from text');
                    } else {
                        throw new Error('No JSON found in response');
                    }
                }
            } catch (parseError) {
                console.error('Error parsing poems from response:', parseError);
                
                // Fallback: Try to extract structured content
                console.log('Trying to extract structured content');
                const sections = responseText.split(/(?=\d+\.\s*题目[:：])/);
                console.log('Found', sections.length - 1, 'potential poem sections');
                
                for (let i = 1; i < sections.length; i++) {
                    const section = sections[i];
                    
                    const titleMatch = section.match(/题目[:：]\s*(.+?)(?=\n|$)/);
                    const authorMatch = section.match(/作者[:：]\s*(.+?)(?=\n|$)/);
                    const contentMatch = section.match(/原文[:：]\s*([\s\S]+?)(?=\n\d+\.\s*创作背景[:：]|$)/);
                    const backgroundMatch = section.match(/创作背景[:：]\s*([\s\S]+?)(?=\n\d+\.\s*赏析[:：]|$)/);
                    const explanationMatch = section.match(/赏析[:：]\s*([\s\S]+?)(?=\n\d+\.\s*题目[:：]|$)/);
                    
                    if (titleMatch && authorMatch && contentMatch) {
                        poems.push({
                            title: titleMatch[1].trim(),
                            author: authorMatch[1].trim(),
                            content: contentMatch[1].trim(),
                            background: backgroundMatch ? backgroundMatch[1].trim() : "暂无背景信息",
                            explanation: explanationMatch ? explanationMatch[1].trim() : "暂无赏析"
                        });
                    }
                }
                
                // If still no poems, try one more approach with a different pattern
                if (poems.length === 0) {
                    console.log('Trying alternative parsing approach');
                    
                    // Look for numbered poems (1. 2. 3. etc.)
                    const poemSections = responseText.split(/(?=\d+\.)/);
                    
                    for (let i = 1; i < poemSections.length; i++) {
                        const section = poemSections[i];
                        
                        // Extract what we can
                        const titleMatch = section.match(/(?:题目[:：]|《(.+?)》)/);
                        const authorMatch = section.match(/(?:作者[:：]|[\(（](.+?)[\)）])/);
                        
                        // If we found at least a title, create a basic poem entry
                        if (titleMatch) {
                            const title = titleMatch[1] || titleMatch[0].replace(/题目[:：]/, '').trim();
                            const author = authorMatch ? (authorMatch[1] || authorMatch[0].replace(/作者[:：]/, '').trim()) : "未知";
                            
                            // Get the rest of the content
                            const contentStart = section.indexOf(titleMatch[0]) + titleMatch[0].length;
                            let content = section.substring(contentStart).trim();
                            
                            // Basic poem with what we could extract
                            poems.push({
                                title: title,
                                author: author,
                                content: content,
                                background: "暂无背景信息",
                                explanation: "暂无赏析"
                            });
                        }
                    }
                }
                
                // Last resort: if we still have no poems, create a single poem from the entire response
                if (poems.length === 0 && responseText.length > 0) {
                    console.log('Creating fallback poem from entire response');
                    poems.push({
                        title: `${poetryType}·${poetryStyle}`,
                        author: "古代诗人",
                        content: responseText.substring(0, 200), // Take first 200 chars as content
                        background: "这是根据您的要求查找的内容，但解析遇到了困难。",
                        explanation: "由于解析困难，无法提供完整赏析。请尝试重新生成。"
                    });
                }
            }
            
            // Validate poem objects
            poems = poems.map(poem => {
                return {
                    title: poem.title || '无标题',
                    author: poem.author || '佚名',
                    content: poem.content || '无内容',
                    background: poem.background || '无背景信息',
                    explanation: poem.explanation || '无赏析'
                };
            });
            
            // Remove loading indicator
            if (loadingIndicator) {
                loadingIndicator.style.display = 'none';
            }
            
            if (poems.length > 0) {
                console.log('Successfully parsed', poems.length, 'poems');
                // Store poems in state
                poemState.poems = poems;
                poemState.currentIndex = 0;
                
                // Display poems
                if (poetryDisplay) poetryDisplay.classList.remove('hidden');
                displayCurrentPoem();
                
                // Set up navigation buttons after poems are loaded
                setTimeout(() => {
                    setupPoemNavigationButtons();
                }, 100);
            } else {
                // Show error message
                if (poetryEmptyState) poetryEmptyState.classList.remove('hidden');
                showSystemMessage(`无法生成${poetryType}的${poetryStyle}风格诗词，请稍后再试`, 'error');
            }
        } catch (error) {
            console.error('Error generating poems:', error);
            
            // Remove loading indicator
            if (loadingIndicator) {
                loadingIndicator.style.display = 'none';
            }
            
            // Show error message
            if (poetryEmptyState) poetryEmptyState.classList.remove('hidden');
            showSystemMessage('生成诗词时出错，请稍后再试', 'error');
        }
    }
    
    // IMPORTANT: Removing the delegation event listener to avoid duplicate API calls
    
    console.log('Poetry functionality initialized');
});

// ... existing code ...

// Move handleGenerateQuestionsClick to the global scope
async function handleGenerateQuestionsClick() {
    console.log('Generate questions button clicked');
    
    // Reset navigation buttons setup flag
    window.navigationButtonsSetup = false;
    
    // Show loading indicator
    showLoadingIndicator();
    
    try {
        // Get educational context
        const contextObj = getSimplifiedEducationalContext();
        console.log('Educational context:', contextObj);
        
        // Format the context properly
        let contextStr = '';
        if (contextObj && typeof contextObj === 'object') {
            if (contextObj.school) contextStr += `学校: ${contextObj.school}`;
            if (contextObj.grade) contextStr += `, 年级: ${contextObj.grade}`;
            if (contextObj.subject) contextStr += `, 学科: ${contextObj.subject}`;
            
            // If we have curriculum info, add it
            if (contextObj.curriculum) contextStr += `, 课程: ${contextObj.curriculum}`;
        } else {
            contextStr = '小学一年级';
        }
        
        console.log('Formatted context:', contextStr);
        
        // Get the number of questions
        const numQuestions = document.getElementById('num-questions')?.value || 5;
        
        // Get the selected question type
        const questionType = document.getElementById('question-type')?.value || '选择题';
        
        // Get the selected difficulty
        const difficulty = document.getElementById('difficulty')?.value || '中等';
        
        // Get the selected topic
        const topic = document.getElementById('topic')?.value || '';
        
        // Prepare the prompt
        const prompt = `请根据以下教育背景为学生生成${numQuestions}道${difficulty}难度的${questionType}，主题是"${topic}"。
教育背景：${contextStr}

请确保题目格式如下：
1. 每个题目必须包含题干和选项（如果是选择题）
2. 每个题目必须包含正确答案
3. 每个题目必须包含详细解析

请以JSON格式返回，格式如下：
{
  "questions": [
    {
      "text": "题目内容",
      "choices": ["A. 选项1", "B. 选项2", "C. 选项3", "D. 选项4"],
      "answer": "正确答案（例如：A）",
      "explanation": "详细解析"
    }
  ]
}`;

        console.log('Sending prompt:', prompt);
        
        // Call the API
        const response = await fetchAIResponse(prompt);
        console.log('API response received:', response);
        
        // Parse the questions from the response
        const questions = parseQuestionsFromResponse(response);
        console.log('Successfully parsed', questions.length, 'questions:', questions);
        
        // Store the questions in the window object
        window.questions = questions;
        window.currentQuestionIndex = 0;
        
        // Find or create the container to display questions
        let contentArea = document.querySelector('.content-area');
        if (!contentArea) {
            console.log('Content area not found, looking for app container');
            contentArea = document.querySelector('.app-container');
            if (!contentArea) {
                console.log('App container not found, using body');
                contentArea = document.body;
            }
        }
        
        // Check if we're on the test page by looking for the create container
        let createContainer = document.getElementById('create-container');
        
        // If create container doesn't exist, try to find it by class
        if (!createContainer) {
            createContainer = document.querySelector('.create-container');
        }
        
        // If still not found, create it
        if (!createContainer) {
            console.log('Create container not found, creating it');
            createContainer = document.createElement('div');
            createContainer.id = 'create-container';
            createContainer.className = 'create-container';
            contentArea.appendChild(createContainer);
        }
        
        // Hide the empty state if it exists
        const emptyState = document.getElementById('empty-state');
        if (emptyState) {
            emptyState.classList.add('hidden');
        }
        
        // Make sure the questions display container exists and is visible
        let questionsDisplayContainer = document.getElementById('questions-display-container');
        
        if (!questionsDisplayContainer) {
            console.log('Questions display container not found, creating it');
            
            // Create the container
            questionsDisplayContainer = document.createElement('div');
            questionsDisplayContainer.id = 'questions-display-container';
            questionsDisplayContainer.className = 'questions-display-container';
            
            // Add to the create container
            createContainer.appendChild(questionsDisplayContainer);
            console.log('Created questions display container');
        }
        
        // Remove the 'hidden' class if it exists
        questionsDisplayContainer.classList.remove('hidden');
        
        // Display the first question
        displayCurrentQuestion();
        
        // Setup navigation buttons (only once)
        setupNavigationButtons();
        
        // Hide loading indicator
        hideLoadingIndicator();
        
    } catch (error) {
        console.error('Error processing questions:', error);
        hideLoadingIndicator();
        
        try {
            // Find a safe element to show the message in
            let container = document.getElementById('create-container');
            
            if (!container) {
                container = document.querySelector('.create-container');
            }
            
            if (!container) {
                container = document.querySelector('.content-area');
            }
            
            if (!container) {
                container = document.querySelector('.app-container');
            }
            
            if (!container) {
                container = document.body;
            }
            
            if (container) {
                const errorMessage = document.createElement('div');
                errorMessage.className = 'system-message error';
                errorMessage.textContent = '生成题目时出错，请稍后再试';
                errorMessage.style.cssText = `
                    padding: 15px;
                    margin: 15px 0;
                    background-color: #FEE2E2;
                    color: #B91C1C;
                    border-radius: 8px;
                    font-weight: 500;
                    text-align: center;
                `;
                
                // Clear container first
                const existingError = container.querySelector('.system-message.error');
                if (existingError) {
                    container.removeChild(existingError);
                }
                
                // Add the new error message
                container.appendChild(errorMessage);
                
                // Remove after 5 seconds
                setTimeout(() => {
                    if (errorMessage.parentNode) {
                        errorMessage.parentNode.removeChild(errorMessage);
                    }
                }, 5000);
            } else {
                console.error('Cannot show error message, no suitable container found');
                alert('生成题目时出错，请稍后再试');
            }
        } catch (displayError) {
            console.error('Failed to display error message:', displayError);
            alert('生成题目时出错，请稍后再试');
        }
    }
}

// ... existing code ...

function initializeEmptyState(container) {
    console.log('Initializing empty state');
    
    // Use the provided container or find it
    const targetContainer = container || document.getElementById('create-container');
    
    if (!targetContainer) {
        console.error('Target container not found for empty state');
        return;
    }
    
    // Create the empty state
    const emptyState = document.createElement('div');
    emptyState.id = 'empty-state';
    emptyState.className = 'empty-state';
    
    // Create the content
    emptyState.innerHTML = `
        <div class="empty-state-icon">
            <svg width="64" height="64" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M12 22C17.5228 22 22 17.5228 22 12C22 6.47715 17.5228 2 12 2C6.47715 2 2 6.47715 2 12C2 17.5228 6.47715 22 12 22Z" stroke="#4A5568" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                <path d="M9.09 9C9.3251 8.33167 9.78915 7.76811 10.4 7.40913C11.0108 7.05016 11.7289 6.91894 12.4272 7.03871C13.1255 7.15849 13.7588 7.52152 14.2151 8.06353C14.6713 8.60553 14.9211 9.29152 14.92 10C14.92 12 11.92 13 11.92 13" stroke="#4A5568" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                <path d="M12 17H12.01" stroke="#4A5568" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
        </div>
        <h3>还没有题目</h3>
        <p>点击"出题"按钮生成题目</p>
    `;
    
    // Style the empty state
    emptyState.style.cssText = `
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        padding: 40px;
        text-align: center;
        background-color: #f7fafc;
        border-radius: 12px;
        margin: 20px 0;
    `;
    
    // Add the empty state to the container
    targetContainer.appendChild(emptyState);
    
    // Create the questions display container (hidden initially)
    const questionsDisplayContainer = document.createElement('div');
    questionsDisplayContainer.id = 'questions-display-container';
    questionsDisplayContainer.className = 'questions-display-container hidden';
    targetContainer.appendChild(questionsDisplayContainer);
    
    // Create the form for generating questions
    const form = document.createElement('div');
    form.className = 'question-form';
    form.innerHTML = `
        <div class="form-group">
            <label for="num-questions">题目数量</label>
            <select id="num-questions" class="form-control">
                <option value="1">1</option>
                <option value="3">3</option>
                <option value="5" selected>5</option>
                <option value="10">10</option>
            </select>
        </div>
        <div class="form-group">
            <label for="question-type">题目类型</label>
            <select id="question-type" class="form-control">
                <option value="选择题" selected>选择题</option>
                <option value="填空题">填空题</option>
                <option value="简答题">简答题</option>
            </select>
        </div>
        <div class="form-group">
            <label for="difficulty">难度</label>
            <select id="difficulty" class="form-control">
                <option value="简单">简单</option>
                <option value="中等" selected>中等</option>
                <option value="困难">困难</option>
            </select>
        </div>
        <div class="form-group">
            <label for="topic">主题（可选）</label>
            <input type="text" id="topic" class="form-control" placeholder="输入主题">
        </div>
        <div class="form-actions">
            <button id="generate-questions-button" class="generate-button">出题</button>
        </div>
    `;
    
    // Style the form
    form.style.cssText = `
        margin-top: 20px;
        padding: 20px;
        background-color: white;
        border-radius: 12px;
        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
    `;
    
    // Add the form to the container
    targetContainer.appendChild(form);
    
    // Add event listener to the generate button
    const generateButton = form.querySelector('#generate-questions-button');
    if (generateButton) {
        // Make sure we're using the global handleGenerateQuestionsClick function
        generateButton.addEventListener('click', handleGenerateQuestionsClick);
        console.log('Added event listener to generate button');
    }
}

// ... existing code ...

function initializeFormLayout() {
    console.log('Initializing form layout');
    
    // Get the form container
    const formContainer = document.querySelector('.form-container');
    if (!formContainer) {
        console.error('Form container not found');
        return;
    }
    
    // Create the dropdowns container
    const dropdownContainer = document.createElement('div');
    dropdownContainer.className = 'dropdown-container';
    dropdownContainer.style.cssText = `
        display: flex;
        flex-wrap: wrap;
        gap: 10px;
        margin-bottom: 15px;
    `;
    
    formContainer.appendChild(dropdownContainer);
    
    // Define the dropdowns
    const dropdowns = [
        { id: 'school-select', label: '学校', options: ['小学', '初中', '高中', '大学'] },
        { id: 'grade-select', label: '年级', options: ['一年级', '二年级', '三年级', '四年级', '五年级', '六年级'] },
        { id: 'subject-select', label: '学科', options: ['语文', '数学', '英语', '科学', '历史', '地理'] }
    ];
    
    // Create the dropdowns
    dropdowns.forEach(dropdown => {
        const wrapper = document.createElement('div');
        wrapper.className = 'dropdown-wrapper';
        wrapper.style.cssText = `
            flex: 1;
            min-width: 120px;
        `;
        
        const label = document.createElement('label');
        label.htmlFor = dropdown.id;
        label.textContent = dropdown.label;
        label.style.cssText = `
            display: block;
            margin-bottom: 5px;
            font-size: 14px;
            color: #4a5568;
        `;
        
        wrapper.appendChild(label);
        
        const select = document.createElement('select');
        select.id = dropdown.id;
        select.className = 'form-control';
        select.style.cssText = `
            width: 100%;
            padding: 8px 30px 8px 10px;
            font-size: 14px;
            border: 1px solid #e2e8f0;
            border-radius: 6px;
            color: #4a5568;
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
        
        // Add options to the select
        dropdown.options.forEach(optionText => {
            const option = document.createElement('option');
            option.value = optionText;
            option.textContent = optionText;
            select.appendChild(option);
        });
        
        // Add event listeners for school and grade selects
        if (dropdown.id === 'school-select') {
            select.addEventListener('change', function() {
                populateGradeOptions(this.value);
                populateSubjectOptions(this.value);
            });
        }
        
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
        
        // Make sure we're using the global handleGenerateQuestionsClick function
        generateButton.addEventListener('click', handleGenerateQuestionsClick);
        console.log('Added event listener to generate button in form layout');
        
        buttonContainer.appendChild(generateButton);
    }
    
    // Style the API function container with reduced spacing
    const apiRadioContainer = document.querySelector('.api-function-container');
    if (apiRadioContainer) {
        apiRadioContainer.style.cssText = `
            padding: 12px;
            margin-top: 5px;
            background-color: #f8f9fa;
            border-radius: 8px;
        `;
    }
    
    // Add the button container to the form
    formContainer.appendChild(buttonContainer);
    
    // Initialize the grade options based on the default school
    const schoolSelect = document.getElementById('school-select');
    if (schoolSelect) {
        populateGradeOptions(schoolSelect.value);
        populateSubjectOptions(schoolSelect.value);
    }
}

// ... existing code ...

function handleTabSwitch(containerType) {
    console.log('Switching to container:', containerType);
    
    // Get all containers
    const chatContainer = document.getElementById('chat-container');
    const createContainer = document.getElementById('create-container');
    const poetryContainer = document.getElementById('poetry-container');
    
    // Get the content area
    const contentArea = document.querySelector('.content-area');
    if (!contentArea) {
        console.error('Content area not found');
        return;
    }
    
    // Remove all containers from the content area
    if (chatContainer && chatContainer.parentNode === contentArea) {
        contentArea.removeChild(chatContainer);
    }
    
    if (createContainer && createContainer.parentNode === contentArea) {
        contentArea.removeChild(createContainer);
    }
    
    if (poetryContainer && poetryContainer.parentNode === contentArea) {
        contentArea.removeChild(poetryContainer);
    }
    
    // Create the container if it doesn't exist
    let containerToAdd;
    
    if (containerType === 'chat') {
        if (!chatContainer) {
            containerToAdd = document.createElement('div');
            containerToAdd.id = 'chat-container';
            containerToAdd.className = 'chat-container';
            
            // Create chat interface
            createChatInterface(containerToAdd);
        } else {
            containerToAdd = chatContainer;
        }
    } else if (containerType === 'create') {
        if (!createContainer) {
            containerToAdd = document.createElement('div');
            containerToAdd.id = 'create-container';
            containerToAdd.className = 'create-container';
            
            // Initialize empty state
            initializeEmptyState(containerToAdd);
        } else {
            containerToAdd = createContainer;
            
            // Show the empty state
            const emptyState = document.getElementById('empty-state');
            const questionsDisplayContainer = document.getElementById('questions-display-container');
            
            if (emptyState) {
                emptyState.classList.remove('hidden');
            }
            
            if (questionsDisplayContainer) {
                questionsDisplayContainer.classList.add('hidden');
            }
            
            // Clear any existing question content
            const questionCounter = document.getElementById('question-counter');
            const questionText = document.getElementById('question-text');
            const choicesContainer = document.getElementById('choices-container');
            const answerContainer = document.getElementById('answer-container');
            
            if (questionCounter) questionCounter.textContent = '';
            if (questionText) questionText.innerHTML = '';
            if (choicesContainer) choicesContainer.innerHTML = '';
            if (answerContainer) answerContainer.classList.add('hidden');
        }
    } else if (containerType === 'poetry') {
        if (!poetryContainer) {
            containerToAdd = document.createElement('div');
            containerToAdd.id = 'poetry-container';
            containerToAdd.className = 'poetry-container';
            
            // Initialize poetry interface
            const poetryInterface = document.createElement('div');
            poetryInterface.className = 'poetry-interface';
            poetryInterface.innerHTML = `
                <div class="poetry-header">
                    <h2>诗词学习</h2>
                </div>
                <div class="poetry-content">
                    <div class="poetry-controls">
                        <button id="learn-poetry-button" class="learn-poetry-button">学习诗词</button>
                    </div>
                    <div id="poetry-display" class="poetry-display hidden">
                        <div class="poem-container">
                            <h3 id="poem-title" class="poem-title"></h3>
                            <p id="poem-author" class="poem-author"></p>
                            <div id="poem-content" class="poem-content"></div>
                            <div class="poem-details">
                                <div id="poem-background" class="poem-background"></div>
                                <div id="poem-explanation" class="poem-explanation"></div>
                            </div>
                        </div>
                        <div class="poem-navigation">
                            <button id="prev-poem-button" class="nav-button">上一首</button>
                            <button id="next-poem-button" class="nav-button">下一首</button>
                        </div>
                    </div>
                </div>
            `;
            containerToAdd.appendChild(poetryInterface);
            
            // Initialize poetry dropdowns
            initializePoetryDropdowns();
        } else {
            containerToAdd = poetryContainer;
        }
    }
    
    // Add the container to the content area
    if (containerToAdd) {
        contentArea.appendChild(containerToAdd);
        console.log('Added container to content area:', containerType);
        
        // Setup event listeners for the current container
        if (containerType === 'chat') {
            setupChatButtons();
        } else if (containerType === 'create') {
            // Setup event listeners for the create container
            const generateButton = document.getElementById('generate-questions-button');
            if (generateButton) {
                // Make sure we're using the global handleGenerateQuestionsClick function
                generateButton.addEventListener('click', handleGenerateQuestionsClick);
                console.log('Added event listener to generate button in tab switch');
            }
        } else if (containerType === 'poetry') {
            // Setup event listeners for the poetry container
            const learnPoetryButton = document.getElementById('learn-poetry-button');
            if (learnPoetryButton) {
                learnPoetryButton.addEventListener('click', handleLearnPoetryClick);
            }
            
            // Setup poem navigation buttons
            setupPoemNavigationButtons();
        }
    }
}

// ... existing code ...

// Add the missing loading indicator functions
function showLoadingIndicator() {
    console.log('Showing loading indicator');
    
    // Check if a loading indicator already exists
    let loadingIndicator = document.querySelector('.loading-indicator');
    
    if (!loadingIndicator) {
        // Create the loading indicator
        loadingIndicator = document.createElement('div');
        loadingIndicator.className = 'loading-indicator';
        
        // Create the spinner
        const spinner = document.createElement('div');
        spinner.className = 'spinner';
        
        // Create the loading text
        const loadingText = document.createElement('div');
        loadingText.className = 'loading-text';
        loadingText.textContent = '正在生成题目，请稍候...';
        
        // Add the spinner and text to the loading indicator
        loadingIndicator.appendChild(spinner);
        loadingIndicator.appendChild(loadingText);
        
        // Style the loading indicator
        loadingIndicator.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            display: flex;
            flex-direction: column;
            justify-content: center;
            align-items: center;
            background-color: rgba(255, 255, 255, 0.8);
            z-index: 9999;
        `;
        
        // Style the spinner
        spinner.style.cssText = `
            width: 50px;
            height: 50px;
            border: 5px solid #e2e8f0;
            border-top: 5px solid #4299e1;
            border-radius: 50%;
            animation: spin 1s linear infinite;
            margin-bottom: 20px;
        `;
        
        // Add the keyframes for the spinner animation
        const style = document.createElement('style');
        style.textContent = `
            @keyframes spin {
                0% { transform: rotate(0deg); }
                100% { transform: rotate(360deg); }
            }
        `;
        document.head.appendChild(style);
        
        // Style the loading text
        loadingText.style.cssText = `
            font-size: 18px;
            color: #4a5568;
            font-weight: 500;
        `;
        
        // Add the loading indicator to the body
        document.body.appendChild(loadingIndicator);
    } else {
        // Show the existing loading indicator
        loadingIndicator.style.display = 'flex';
    }
}

function hideLoadingIndicator() {
    console.log('Hiding loading indicator');
    
    // Find the loading indicator
    const loadingIndicator = document.querySelector('.loading-indicator');
    
    if (loadingIndicator) {
        // Hide the loading indicator
        loadingIndicator.style.display = 'none';
        
        // Optionally remove it from the DOM
        if (loadingIndicator.parentNode) {
            loadingIndicator.parentNode.removeChild(loadingIndicator);
        }
    }
}

// ... existing code ...