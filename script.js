// API configuration variables
let currentApiFunction = 'chat';
let currentModel = 'deepseek-r1';

// Global state object to manage application state
const state = {
    questions: [],
    currentQuestionIndex: 0,
    userAnswers: [],
    poems: [],
    currentPoemIndex: 0,
    isInitialized: false
};

// Function to parse questions from API response
function parseQuestionsFromResponse(response) {
    console.log('Parsing questions from response');
    
    if (!response) {
        console.error('Response is empty');
        return [];
    }
    
    try {
        // Check if response is already an object (not a string)
        if (typeof response === 'object' && response !== null) {
            console.log('Response is an object, checking for valid structure');
            
            // Check if it's an array of questions
            if (Array.isArray(response)) {
                console.log('Response is an array, validating questions');
                
                // Validate each question
                const validQuestions = response.filter(q => {
                    const isValid = q && q.question && q.options && q.answer && q.explanation;
                    if (!isValid) {
                        console.log('Skipping question with missing fields:', q);
                    }
                    return isValid;
                });
                
                if (validQuestions.length > 0) {
                    console.log('Successfully parsed', validQuestions.length, 'questions:', validQuestions);
                    return validQuestions;
                }
            }
            
            // Check if it has a choices property (API response format)
            if (response.choices && Array.isArray(response.choices) && response.choices.length > 0) {
                console.log('Response has choices array, extracting content');
                
                // Extract content from the first choice
                let content = '';
                
                if (response.choices[0].message && response.choices[0].message.content) {
                    content = response.choices[0].message.content;
                } else if (response.choices[0].text) {
                    content = response.choices[0].text;
                } else if (response.choices[0].content) {
                    content = response.choices[0].content;
                }
                
                if (content) {
                    console.log('Extracted content from choices:', content);
                    
                    // Try to parse JSON from the content
                    try {
                        // Look for JSON array in the content
                        const jsonRegex = /\[\s*\{.*\}\s*\]/s;
                        const match = content.match(jsonRegex);
                        
                        if (match) {
                            const jsonStr = match[0];
                            const jsonData = JSON.parse(jsonStr);
                            
                            if (Array.isArray(jsonData)) {
                                const validQuestions = jsonData.filter(q => {
                                    const isValid = q && q.question && q.options && q.answer && q.explanation;
                                    if (!isValid) {
                                        console.log('Skipping question with missing fields:', q);
                                    }
                                    return isValid;
                                });
                                
                                if (validQuestions.length > 0) {
            } else if (jsonData.questions && Array.isArray(jsonData.questions)) {
                // Sometimes the API returns { questions: [...] }
                console.log('Response contains a questions array');
                
                const validQuestions = jsonData.questions.filter(q => {
                    const isValid = q && q.question && q.options && q.answer && q.explanation;
                    if (!isValid) {
                        console.log('Skipping question with missing fields:', q);
                    }
                    return isValid;
                });
                
                if (validQuestions.length > 0) {
                    console.log('Successfully parsed', validQuestions.length, 'questions:', validQuestions);
                    return validQuestions;
                }
            }
        } catch (e) {
            console.log('Response is not a valid JSON, trying to extract JSON from text');
        }
        
        // If direct JSON parsing fails, try to extract JSON from the text
        const jsonRegex = /\[\s*\{.*\}\s*\]/s;
        const match = response.match(jsonRegex);
        
        if (match) {
            try {
                const jsonStr = match[0];
                const jsonData = JSON.parse(jsonStr);
                
                if (Array.isArray(jsonData)) {
                    const validQuestions = jsonData.filter(q => {
                        const isValid = q && q.question && q.options && q.answer && q.explanation;
                        if (!isValid) {
                            console.log('Skipping question with missing fields:', q);
                        }
                        return isValid;
                    });
                    
                    if (validQuestions.length > 0) {
                        console.log('Successfully parsed', validQuestions.length, 'questions from extracted JSON:', validQuestions);
                        return validQuestions;
                    }
                }
            } catch (e) {
                console.error('Failed to parse extracted JSON:', e);
            }
        }
        
        // If all else fails, create a default question
        console.log('No questions could be parsed, creating a default question');
        return [{
            question: "无法解析API返回的题目，这是一个示例题目。1+1=?",
            options: {
                "A": "1",
                "B": "2",
                "C": "3",
                "D": "4"
            },
            answer: "B",
            explanation: "1+1=2，所以答案是B。"
        }];
    } catch (error) {
        console.error('Error parsing questions:', error);
        return [];
    }
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
        // Check if data is a string
        if (typeof data === 'string') {
            return data;
        }
        
        // Check if data is an object with choices array (OpenAI format)
        if (data && data.choices && Array.isArray(data.choices) && data.choices.length > 0) {
            const choice = data.choices[0];
            
            // Check for different response formats
            if (choice.message && choice.message.content) {
                return choice.message.content;
            } else if (choice.text) {
                return choice.text;
            } else if (choice.content) {
                return choice.content;
            }
        }
        
        // Check for DeepSeek API format
        if (data && data.choices && Array.isArray(data.choices) && data.choices.length > 0) {
            const choice = data.choices[0];
            if (choice.message && choice.message.content) {
                return choice.message.content;
            }
        }
        
        // Alternative format check (DeepSeek specific)
        if (data && data.response) {
            return data.response;
        }
        
        // Check for message property directly
        if (data && data.message && typeof data.message.content === 'string') {
            return data.message.content;
        }
        
        // Last resort: stringify the entire response
        console.warn('Could not extract content using standard methods, returning stringified data');
        return JSON.stringify(data);
    } catch (error) {
        console.error('Error extracting content from response:', error);
        return 'Error processing response';
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
    console.log('Displaying current question');
    
    // Check if questions exist
    if (!state.questions || state.questions.length === 0) {
        console.error('No questions available to display');
        return;
    }
    
    // Get current question
    const currentQuestion = state.questions[state.currentQuestionIndex];
    if (!currentQuestion) {
        console.error('Current question is undefined');
        return;
    }
    
    console.log('Current question:', currentQuestion);
    
    // Update question counter
    const questionCounter = document.getElementById('question-counter');
    if (questionCounter) {
        questionCounter.textContent = `问题 ${state.currentQuestionIndex + 1} / ${state.questions.length}`;
    }
    
    // Display question text
    const questionText = document.getElementById('question-text');
    if (questionText) {
        questionText.innerHTML = formatMathExpressions(currentQuestion.question);
    }
    
    // Display choices
    const choicesContainer = document.getElementById('choices-container');
    if (choicesContainer) {
        choicesContainer.innerHTML = '';
        
        // Check if options exist and are in the expected format
        if (currentQuestion.options) {
            const options = currentQuestion.options;
            
            // Create choice items
            Object.keys(options).forEach(key => {
                const choiceItem = document.createElement('div');
                choiceItem.className = 'choice-item';
                
                const radio = document.createElement('input');
                radio.type = 'radio';
                radio.name = 'question-choice';
                radio.id = `choice-${key}`;
                radio.value = key;
                
                // Check if this option was previously selected
                if (state.userAnswers[state.currentQuestionIndex] === key) {
                    radio.checked = true;
                }
                
                const label = document.createElement('label');
                label.htmlFor = `choice-${key}`;
                label.innerHTML = `${key}. ${formatMathExpressions(options[key])}`;
                
                choiceItem.appendChild(radio);
                choiceItem.appendChild(label);
                choicesContainer.appendChild(choiceItem);
                
                // Add event listener to radio button
                radio.addEventListener('change', function() {
                    if (this.checked) {
                        // Save user's answer
                        state.userAnswers[state.currentQuestionIndex] = key;
                        
                        // Show answer if this is the first time selecting an option
                        const answerContainer = document.getElementById('answer-container');
                        if (answerContainer && answerContainer.classList.contains('hidden')) {
                            displayAnswer(key);
                        }
                    }
                });
            });
        } else {
            console.error('Question options are missing or in an unexpected format');
            choicesContainer.innerHTML = '<div class="error-message">选项加载失败</div>';
        }
    }
    
    // Hide answer container initially
    const answerContainer = document.getElementById('answer-container');
    if (answerContainer) {
        // If user has already answered this question, show the answer
        if (state.userAnswers[state.currentQuestionIndex]) {
            displayAnswer(state.userAnswers[state.currentQuestionIndex]);
        } else {
            answerContainer.classList.add('hidden');
        }
    }
    
    // Update navigation buttons
    updateNavigationButtons();
}

// Function to display the answer and explanation
function displayAnswer(selectedValue) {
    console.log('Displaying answer for selected value:', selectedValue);
    
    const currentQuestion = state.questions[state.currentQuestionIndex];
    if (!currentQuestion) {
        console.error('Current question is undefined');
        return;
    }
    
    const answerContainer = document.getElementById('answer-container');
    const answerResult = document.getElementById('answer-result');
    const answerExplanation = document.getElementById('answer-explanation');
    
    if (answerContainer && answerResult && answerExplanation) {
        // Show the answer container
        answerContainer.classList.remove('hidden');
        
        // Check if the selected answer is correct
        const isCorrect = selectedValue === currentQuestion.answer;
        
        // Display result
        answerResult.innerHTML = isCorrect 
            ? `<div class="correct-answer">✓ 正确！答案是 ${currentQuestion.answer}。</div>`
            : `<div class="incorrect-answer">✗ 错误。正确答案是 ${currentQuestion.answer}。</div>`;
        
        // Display explanation
        answerExplanation.innerHTML = `<div class="explanation-title">解析：</div>
            <div class="explanation-content">${formatMathExpressions(currentQuestion.explanation)}</div>`;
    }
}

// Function to update navigation buttons
function updateNavigationButtons() {
    console.log('Updating navigation buttons');
    
    // Ensure state object exists
    if (typeof state === 'undefined') {
        console.error('State object is not defined');
        return;
    }
    
    const prevButton = document.getElementById('prev-question-button');
    const nextButton = document.getElementById('next-question-button');
    
    if (prevButton && nextButton) {
        // Disable prev button if on first question
        prevButton.disabled = state.currentQuestionIndex === 0;
        
        // Disable next button if on last question
        nextButton.disabled = state.currentQuestionIndex === state.questions.length - 1;
        
        console.log('Navigation buttons updated:', {
            prevDisabled: prevButton.disabled,
            nextDisabled: nextButton.disabled,
            currentIndex: state.currentQuestionIndex,
            totalQuestions: state.questions.length
        });
    } else {
        console.warn('Navigation buttons not found');
    }
}

// Function to set up navigation buttons
function setupNavigationButtons() {
    console.log('Setting up navigation buttons');
    
    // Ensure state object exists
    if (typeof state === 'undefined') {
        console.error('State object is not defined');
        return;
    }
    
    const prevButton = document.getElementById('prev-question-button');
    const nextButton = document.getElementById('next-question-button');
    
    if (prevButton && nextButton) {
        // Remove any existing event listeners
        const newPrevButton = prevButton.cloneNode(true);
        const newNextButton = nextButton.cloneNode(true);
        
        if (prevButton.parentNode) {
            prevButton.parentNode.replaceChild(newPrevButton, prevButton);
        }
        
        if (nextButton.parentNode) {
            nextButton.parentNode.replaceChild(newNextButton, nextButton);
        }
        
        // Add new event listeners
        newPrevButton.addEventListener('click', function() {
            console.log('Previous button clicked');
            if (state.currentQuestionIndex > 0) {
                state.currentQuestionIndex--;
                displayCurrentQuestion();
            }
        });
        
        newNextButton.addEventListener('click', function() {
            console.log('Next button clicked');
            if (state.currentQuestionIndex < state.questions.length - 1) {
                state.currentQuestionIndex++;
                displayCurrentQuestion();
            }
        });
        
        // Update button states
        newPrevButton.disabled = state.currentQuestionIndex === 0;
        newNextButton.disabled = state.currentQuestionIndex === state.questions.length - 1;
        
        console.log('Navigation buttons set up successfully');
    } else {
        console.warn('Navigation buttons not found');
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
    console.log('handleGenerateQuestionsClick called');
    
    // Get form elements from sidebar
    const schoolSelect = document.getElementById('school-select-sidebar');
    const gradeSelect = document.getElementById('grade-select-sidebar');
    const semesterSelect = document.getElementById('semester-select-sidebar');
    const subjectSelect = document.getElementById('subject-select-sidebar');
    const difficultySelect = document.getElementById('difficulty-select-sidebar');
    const questionCountSelect = document.getElementById('question-count-select-sidebar');
    const generateQuestionsButton = document.querySelector('.sidebar-generate-button');
    const questionsDisplayContainer = document.getElementById('questions-display-container');
    const emptyState = document.getElementById('empty-state');
    
    if (!schoolSelect || !gradeSelect || !semesterSelect || !subjectSelect || 
        !difficultySelect || !questionCountSelect || !generateQuestionsButton) {
        console.error('One or more form elements not found');
        return;
    }
    
    // Only show loading state if we're on the test page
    const isTestPage = document.getElementById('create-container').classList.contains('active') || 
                      !document.getElementById('create-container').classList.contains('hidden');
    
    if (isTestPage) {
    // Show loading state on button
    generateQuestionsButton.textContent = '生成中...';
    generateQuestionsButton.disabled = true;
    
        // Hide empty state if it exists
        if (emptyState) {
            emptyState.classList.add('hidden');
        }
        
        // Show loading indicator on the test page
        showLoadingIndicator();
    }
    
    // Collect form data from sidebar
    const schoolType = schoolSelect.value;
    const grade = gradeSelect.value;
    const semester = semesterSelect.value;
    const subject = subjectSelect.value;
    const difficulty = difficultySelect.value;
    const questionCount = questionCountSelect.value;
    
    console.log('Form data collected:', { schoolType, grade, semester, subject, difficulty, questionCount });
    
    // Create prompt for API
    const prompt = `请生成${questionCount}道${schoolType}${grade}${semester}${subject}的${difficulty}难度选择题，每道题包括题目、四个选项(A、B、C、D)、答案和详细解析。严格的格式要求：
每道题必须包含以下六个部分，缺一不可：
1. "题目："后接具体题目
2. "A."后接选项A的内容
3. "B."后接选项B的内容
4. "C."后接选项C的内容
5. "D."后接选项D的内容
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
                console.log('Parsed questions:', parsedQuestions);
                
                if (parsedQuestions.length === 0) {
                    throw new Error('No questions could be parsed from the response');
                }
                
                // Make variables globally available
                window.questions = parsedQuestions;
                window.userAnswers = Array(parsedQuestions.length).fill(null);
                window.currentQuestionIndex = 0;
                
                // Ensure the questions display container exists and is visible
                if (!questionsDisplayContainer) {
                    console.error('Questions display container not found, creating one');
                    const newContainer = document.createElement('div');
                    newContainer.id = 'questions-display-container';
                    newContainer.className = 'questions-display-container';
                    
                    // Create required elements inside the container
                    newContainer.innerHTML = `
                        <div id="question-counter" class="question-counter"></div>
                        <div id="question-text" class="question-text"></div>
                        <div id="choices-container" class="choices-container"></div>
                        <div id="answer-container" class="answer-container hidden">
                            <div id="answer-result" class="answer-result"></div>
                            <div id="answer-explanation" class="answer-explanation"></div>
                        </div>
                    `;
                    
                    // Add to the create container
                    const createContainer = document.getElementById('create-container');
                    if (createContainer) {
                        createContainer.insertBefore(newContainer, createContainer.firstChild);
                    }
                }
                
                // Get a fresh reference to the questions display container
                const questionsContainer = document.getElementById('questions-display-container');
                
                // Hide empty state if it exists
                if (emptyState) {
                    emptyState.classList.add('hidden');
                    console.log('Empty state hidden');
                }
                
                // Make sure the questions display container is visible
                if (questionsContainer) {
                    questionsContainer.classList.remove('hidden');
                    console.log('Questions display container shown');
                    
                    // Ensure the container has the necessary child elements
                    if (!document.getElementById('question-counter')) {
                        const counterDiv = document.createElement('div');
                        counterDiv.id = 'question-counter';
                        counterDiv.className = 'question-counter';
                        questionsContainer.appendChild(counterDiv);
                    }
                    
                    if (!document.getElementById('question-text')) {
                        const textDiv = document.createElement('div');
                        textDiv.id = 'question-text';
                        textDiv.className = 'question-text';
                        questionsContainer.appendChild(textDiv);
                    }
                    
                    if (!document.getElementById('choices-container')) {
                        const choicesDiv = document.createElement('div');
                        choicesDiv.id = 'choices-container';
                        choicesDiv.className = 'choices-container';
                        questionsContainer.appendChild(choicesDiv);
                    }
                    
                    if (!document.getElementById('answer-container')) {
                        const answerDiv = document.createElement('div');
                        answerDiv.id = 'answer-container';
                        answerDiv.className = 'answer-container hidden';
                        answerDiv.innerHTML = `
                            <div id="answer-result" class="answer-result"></div>
                            <div id="answer-explanation" class="answer-explanation"></div>
                        `;
                        questionsContainer.appendChild(answerDiv);
                    }
                } else {
                    console.error('Questions display container still not found after creation attempt');
                }
                
                // Display the first question
                displayCurrentQuestion();
                updateNavigationButtons();
                
                // Set up navigation button event listeners
                setupNavigationButtons();
                
                // Show success message
                showSystemMessage(`已生成 ${parsedQuestions.length} 道 ${schoolType}${grade}${semester}${subject} ${difficulty}难度题目`, 'success');
            } catch (error) {
                console.error('Error processing questions:', error);
                showSystemMessage('生成题目时出错，请重试', 'error');
                hideLoadingIndicator();
                
                // Show empty state again if there was an error
                if (emptyState && questionsDisplayContainer) {
                    emptyState.classList.remove('hidden');
                    questionsDisplayContainer.classList.remove('hidden');
                }
            } finally {
                // Reset button state
                if (isTestPage) {
                generateQuestionsButton.textContent = '出题';
                generateQuestionsButton.disabled = false;
                }
            }
        })
        .catch(error => {
            console.error('API error:', error);
            showSystemMessage('API调用失败，请重试', 'error');
            hideLoadingIndicator();
            
            // Show empty state again if there was an error
            if (emptyState && questionsDisplayContainer) {
                emptyState.classList.remove('hidden');
                questionsDisplayContainer.classList.remove('hidden');
            }
            
            // Reset button state
            if (isTestPage) {
            generateQuestionsButton.textContent = '出题';
            generateQuestionsButton.disabled = false;
            }
        });
}

// Function to show loading indicator with spinning icon
function showLoadingIndicator() {
    console.log('Showing loading indicator');
    
    // Get the active panel
    const activePanel = document.querySelector('.panel-button.active');
    const panelType = activePanel ? activePanel.id.replace('-button', '') : 'qa';
    
    console.log('Active panel:', panelType);
    
    if (panelType === 'qa') {
        // For QA panel - use the existing loading element
        const loadingElement = document.getElementById('loading');
        
        if (loadingElement) {
            loadingElement.classList.remove('hidden');
            console.log('QA loading indicator shown');
        } else {
            console.error('QA loading element not found');
            
            // Try to create a loading element
            const outputContainer = document.querySelector('.output-container');
            if (outputContainer) {
                const newLoadingElement = document.createElement('div');
                newLoadingElement.id = 'loading';
                newLoadingElement.innerHTML = `
                    <div class="spinner"></div>
                    <p>Thinking...</p>
                `;
                
                // Add the hidden class initially
                newLoadingElement.classList.add('hidden');
                
                // Insert at the beginning of the output container
                outputContainer.insertBefore(newLoadingElement, outputContainer.firstChild);
                
                // Now show it
                newLoadingElement.classList.remove('hidden');
                console.log('Created and showed new QA loading indicator');
            }
        }
    } else if (panelType === 'create') {
        // For test panel
        let loadingElement = document.getElementById('test-loading-indicator');
        
        if (!loadingElement) {
            // Create a loading element
            const createContainer = document.getElementById('create-container');
            
            if (createContainer) {
                loadingElement = document.createElement('div');
                loadingElement.id = 'test-loading-indicator';
                loadingElement.className = 'test-loading-indicator';
                loadingElement.innerHTML = `
                    <div class="spinner-icon"></div>
                    <p>正在生成题目，请稍候...</p>
                `;
                
                // Add to the create container
                createContainer.appendChild(loadingElement);
                console.log('Created new test loading indicator');
            } else {
                console.error('Create container not found');
                return;
            }
        }
        
        // Show the loading element
        loadingElement.classList.remove('hidden');
        console.log('Test loading indicator shown');
    } else if (panelType === 'poetry') {
        // For poetry panel
        let loadingElement = document.getElementById('poetry-loading');
        
        if (!loadingElement) {
            // Create a loading element
            const poetryContent = document.querySelector('.poetry-content');
            
            if (poetryContent) {
                loadingElement = document.createElement('div');
                loadingElement.id = 'poetry-loading';
                loadingElement.className = 'poetry-loading';
                loadingElement.innerHTML = `
                    <div class="spinner"></div>
                    <p>正在生成诗词，请稍候...</p>
                `;
                
                // Add to the poetry content
                poetryContent.appendChild(loadingElement);
                console.log('Created new poetry loading indicator');
            } else {
                console.error('Poetry content not found');
                return;
            }
        }
        
        // Show the loading element
        loadingElement.classList.remove('hidden');
        console.log('Poetry loading indicator shown');
    }
}

// Function to hide loading indicator
function hideLoadingIndicator() {
    console.log('Hiding loading indicator');
    
    // Hide all possible loading indicators
    const loadingElements = [
        document.getElementById('loading'),
        document.getElementById('test-loading-indicator'),
        document.getElementById('poetry-loading')
    ];
    
    loadingElements.forEach(element => {
        if (element) {
            element.classList.add('hidden');
            console.log(`Hidden loading indicator: ${element.id}`);
        }
    });
}

// Function to set up navigation button event listeners
function setupNavigationButtons() {
    console.log('Setting up navigation buttons');
    
    // Ensure state object exists
    if (typeof state === 'undefined') {
        console.error('State object is not defined');
        return;
    }
    
    const prevButton = document.getElementById('prev-question-button');
    const nextButton = document.getElementById('next-question-button');
    
    if (prevButton && nextButton) {
        // Remove any existing event listeners
        const newPrevButton = prevButton.cloneNode(true);
        const newNextButton = nextButton.cloneNode(true);
        
        if (prevButton.parentNode) {
            prevButton.parentNode.replaceChild(newPrevButton, prevButton);
        }
        
        if (nextButton.parentNode) {
            nextButton.parentNode.replaceChild(newNextButton, nextButton);
        }
        
        // Add new event listeners
        newPrevButton.addEventListener('click', function() {
            console.log('Previous button clicked');
            if (state.currentQuestionIndex > 0) {
                state.currentQuestionIndex--;
                displayCurrentQuestion();
            }
        });
        
        newNextButton.addEventListener('click', function() {
            console.log('Next button clicked');
            if (state.currentQuestionIndex < state.questions.length - 1) {
                state.currentQuestionIndex++;
                displayCurrentQuestion();
            }
        });
        
        // Update button states
        newPrevButton.disabled = state.currentQuestionIndex === 0;
        newNextButton.disabled = state.currentQuestionIndex === state.questions.length - 1;
        
        console.log('Navigation buttons set up successfully');
    } else {
        console.warn('Navigation buttons not found');
    }
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
    console.log(`Showing system message: ${message} (${type})`);
    
    // Create message element
    const messageElement = document.createElement('div');
    messageElement.className = `system-message ${type}`;
    messageElement.textContent = message;
    
    // Find the output element
    const outputElement = document.getElementById('output');
    
    if (outputElement) {
        // Insert at the beginning of the output
        if (outputElement.firstChild) {
            outputElement.insertBefore(messageElement, outputElement.firstChild);
        } else {
            outputElement.appendChild(messageElement);
        }
        
        // Remove after 5 seconds
        setTimeout(() => {
            if (messageElement.parentNode) {
                messageElement.parentNode.removeChild(messageElement);
            }
        }, 5000);
    } else {
        console.error('Output element not found');
        
        // Try to find an alternative container based on the active panel
        const activePanel = document.querySelector('.panel-button.active');
        const panelType = activePanel ? activePanel.id.replace('-button', '') : '';
        
        let alternativeContainer = null;
        
        if (panelType === 'qa') {
            alternativeContainer = document.querySelector('.output-container');
        } else if (panelType === 'create') {
            alternativeContainer = document.getElementById('create-container');
        } else if (panelType === 'poetry') {
            alternativeContainer = document.querySelector('.poetry-content');
        }
        
        if (alternativeContainer) {
            // Add the message to the alternative container
            alternativeContainer.appendChild(messageElement);
            
            // Remove after 5 seconds
            setTimeout(() => {
                if (messageElement.parentNode) {
                    messageElement.parentNode.removeChild(messageElement);
                }
            }, 5000);
            
            console.log(`Added system message to alternative container for ${panelType} panel`);
        } else {
            // Last resort: add to body
            document.body.appendChild(messageElement);
            
            // Style for floating message
            messageElement.style.position = 'fixed';
            messageElement.style.top = '20px';
            messageElement.style.left = '50%';
            messageElement.style.transform = 'translateX(-50%)';
            messageElement.style.zIndex = '9999';
            
            // Remove after 5 seconds
            setTimeout(() => {
                if (messageElement.parentNode) {
                    messageElement.parentNode.removeChild(messageElement);
                }
            }, 5000);
            
            console.log('Added system message to body as floating message');
        }
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
    
    // Check if chat buttons are already set up
    if (window.chatButtonsInitialized) {
        console.log('Chat buttons already initialized, skipping setup');
        return;
    }
    
    // Get chat elements
    const chatInput = document.getElementById('user-input');
    const chatOutput = document.getElementById('output');
    const optimizeButton = document.getElementById('optimize-button');
    const submitButton = document.getElementById('submit-button');
    
    // Check if all elements exist
    if (!chatInput || !chatOutput || !optimizeButton || !submitButton) {
        console.error('Chat elements not found');
        return;
    }
    
    // Set up event listeners for the buttons
    setupButtonEventListeners(chatInput, chatOutput, optimizeButton, submitButton);
    
    // Mark chat buttons as initialized
    window.chatButtonsInitialized = true;
    
    console.log('Chat buttons set up successfully');
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
    console.log('Setting up button event listeners with new implementation');
    
    // Track if event listeners are already set up
    if (window.eventListenersInitialized) {
        console.log('Event listeners already initialized, skipping setup');
        return;
    }
    
    if (!chatInput || !chatResponse || !optimizeButton || !submitButton) {
        console.error('Required elements not found for setting up button event listeners');
        return;
    }
    
    // Create new button elements to replace the old ones (removes existing event listeners)
    const newOptimizeButton = optimizeButton.cloneNode(true);
    const newSubmitButton = submitButton.cloneNode(true);
    
    // Replace the old buttons with the new ones
    if (optimizeButton.parentNode) {
        optimizeButton.parentNode.replaceChild(newOptimizeButton, optimizeButton);
    }
    
    if (submitButton.parentNode) {
        submitButton.parentNode.replaceChild(newSubmitButton, submitButton);
    }
    
    // Submit button event listener
    newSubmitButton.addEventListener('click', async function(event) {
        // Prevent default action and stop propagation
        event.preventDefault();
        event.stopPropagation();
        
        console.log('Submit button clicked');
        
        const question = chatInput.value.trim();
        
        if (question === '') {
            showSystemMessage('请输入问题', 'error');
            return;
        }
        
        // Get the loading element
        const loadingElement = document.getElementById('loading');
        
        // Show loading indicator
        if (loadingElement) {
            loadingElement.classList.remove('hidden');
            console.log('Loading indicator shown');
        } else {
            console.error('Loading element not found');
            
            // Try to create a loading element
            const outputContainer = document.querySelector('.output-container');
            if (outputContainer) {
                const newLoadingElement = document.createElement('div');
                newLoadingElement.id = 'loading';
                newLoadingElement.innerHTML = `
                    <div class="spinner"></div>
                    <p>Thinking...</p>
                `;
                
                // Insert at the beginning of the output container
                outputContainer.insertBefore(newLoadingElement, outputContainer.firstChild);
                
                // Now show it
                newLoadingElement.classList.remove('hidden');
                console.log('Created and showed new loading indicator');
            }
        }
        
        try {
            // Get educational context
            const educationalContext = getSimplifiedEducationalContext();
            console.log('Educational context:', educationalContext);
            
            // Prepare the prompt
            const prompt = `请根据以下教育背景回答这个问题，提供详细且教育性的解答：

${educationalContext}

问题：${question}

请提供适合上述教育背景学生的清晰、准确、有教育意义的回答。
如果涉及数学或科学概念，请确保解释清楚，并考虑学生的认知水平。
如果可能，请提供一些例子或应用场景来帮助理解。`;
            
            console.log('Fetching AI response with prompt:', prompt);
            
            // Call the API
            const response = await fetchAIResponse(prompt);
            console.log('API response received:', response);
            
            // Extract content from response
            const content = extractContentFromResponse(response);
            console.log('Extracted content:', content);
            
            // Hide loading indicator
            if (loadingElement) {
                loadingElement.classList.add('hidden');
                console.log('Loading indicator hidden');
            }
            
            // Display the response
            if (chatResponse) {
                // Create a new message element
                const messageElement = document.createElement('div');
                messageElement.className = 'ai-message';
                
                // Format the content with math expressions if the function exists
                if (typeof formatMathExpressions === 'function') {
                    messageElement.innerHTML = formatMathExpressions(content);
                } else {
                    messageElement.textContent = content;
                }
                
                // Add the message to the output
                chatResponse.appendChild(messageElement);
                
                // Scroll to the bottom of the output
                chatResponse.scrollTop = chatResponse.scrollHeight;
                
                // Clear the input
                chatInput.value = '';
            }
        } catch (error) {
            console.error('Error submitting question:', error);
            
            // Hide loading indicator
            if (loadingElement) {
                loadingElement.classList.add('hidden');
                console.log('Loading indicator hidden after error');
            }
            
            // Show error message
            try {
                showSystemMessage('获取回答时出错，请稍后再试', 'error');
            } catch (e) {
                console.error('Error showing system message:', e);
                
                // Fallback error display
                const errorElement = document.createElement('div');
                errorElement.className = 'system-message error';
                errorElement.textContent = '获取回答时出错，请稍后再试';
                chatResponse.appendChild(errorElement);
            }
        }
    });
    
    // Optimize button event listener
    newOptimizeButton.addEventListener('click', async function(event) {
        // Prevent default action and stop propagation
        event.preventDefault();
        event.stopPropagation();
        
        console.log('Optimize button clicked');
        
        const question = chatInput.value.trim();
        
        if (question === '') {
            showSystemMessage('请输入问题以优化', 'error');
            return;
        }
        
        // Add optimizing class to button
        newOptimizeButton.classList.add('optimizing');
        newOptimizeButton.textContent = '优化中...';
        
        try {
            // Prepare the prompt for optimization
            const prompt = `请优化以下问题，使其更加清晰、具体，并包含足够的上下文信息，以便AI能够提供更好的回答：

问题：${question}

请返回优化后的问题，不需要任何额外的解释。`;
            
            // Call the API
            const response = await fetchAIResponse(prompt);
            
            // Extract content from response
            const content = extractContentFromResponse(response);
            
            // Parse the optimized question
            const optimizedQuestion = parseOptimizedQuestion(content);
            
            // Update the input with the optimized question
            chatInput.value = optimizedQuestion;
            
            // Focus on the input
            chatInput.focus();
            
            // Show success message
            showSystemMessage('问题已优化', 'success');
        } catch (error) {
            console.error('Error optimizing question:', error);
            
            // Show error message
            showSystemMessage('优化问题时出错，请稍后再试', 'error');
        } finally {
            // Remove optimizing class from button
            newOptimizeButton.classList.remove('optimizing');
            newOptimizeButton.textContent = '优化问题';
        }
    });
    
    // Enter key event listener for input
    chatInput.addEventListener('keydown', function(event) {
        if (event.key === 'Enter' && !event.shiftKey) {
            event.preventDefault();
            newSubmitButton.click();
        }
    });
    
    // Mark event listeners as initialized
    window.eventListenersInitialized = true;
    
    console.log('Button event listeners set up successfully');
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
    console.log('Getting simplified educational context');
    
    // Get school and grade from sidebar
    const schoolSelect = document.getElementById('school-select-sidebar');
    const gradeSelect = document.getElementById('grade-select-sidebar');
    
    if (!schoolSelect || !gradeSelect) {
        console.error('School or grade select elements not found');
        return '教育背景：\n未指定';
    }
    
    const school = schoolSelect.value;
    const grade = gradeSelect.options[gradeSelect.selectedIndex]?.text || '';
    
    console.log('Educational context:', { school, grade });
    
    // Format the educational context as a string
    const educationalContext = `教育背景：
学校类型：${school}
年级：${grade}`;
    
    return educationalContext;
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
    console.log('Initializing application');
    
    // Check if application is already initialized
    if (window.appInitialized) {
        console.log('Application already initialized, skipping initialization');
        return;
    }
    
    // Cache DOM elements
    const contentArea = document.querySelector('.content-area');
    const sidebarToggle = document.getElementById('sidebar-toggle');
    const leftPanel = document.querySelector('.left-panel');
    const qaButton = document.getElementById('qa-button');
    const createButton = document.getElementById('create-button');
    const poetryButton = document.getElementById('poetry-button');
    const qaContainer = document.getElementById('qa-container');
    const createContainer = document.getElementById('create-container');
    const poetryContainer = document.getElementById('poetry-container');
    
    // Store references in global scope for later use
    window.contentArea = contentArea;
    window.sidebarToggle = sidebarToggle;
    window.leftPanel = leftPanel;
    window.qaButton = qaButton;
    window.createButton = createButton;
    window.poetryButton = poetryButton;
    window.qaContainer = qaContainer;
    window.createContainer = createContainer;
    window.poetryContainer = poetryContainer;
    
    // Initialize the school and grade dropdowns in the sidebar
    const schoolSelect = document.getElementById('school-select-sidebar');
    if (schoolSelect) {
        // Populate grade options based on the default school
        populateSidebarGradeOptions(schoolSelect.value);
        
        // Add event listener to update grade options when school changes
        schoolSelect.addEventListener('change', function() {
            populateSidebarGradeOptions(this.value);
        });
    }
    
    // Set up event listeners
    setupEventListeners();
    
    // Initialize poetry dropdowns
    initializePoetryDropdowns();
    
    // Set up chat buttons (only once)
    setupChatButtons();
    
    // Initialize empty state
    initializeEmptyState();
    
    // Mark application as initialized
    window.appInitialized = true;
    
    // Log initialization complete
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
            
            // Set up the test configuration controls
            setupTestControls();
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

    // Function to set up test controls
    function setupTestControls() {
        console.log('Setting up test controls');
        
        // Get the subject select element from the top of the page
        const subjectSelect = document.getElementById('subject-select');
        const semesterSelect = document.getElementById('semester-select');
        const difficultySelect = document.getElementById('difficulty-select');
        const questionCountSelect = document.getElementById('question-count-select');
        const generateQuestionsButton = document.getElementById('generate-questions-button');
        
        // Get the school and grade from the sidebar
        const schoolSelect = document.getElementById('school-select-sidebar');
        const gradeSelect = document.getElementById('grade-select-sidebar');
        
        if (schoolSelect) {
            // First, populate the grade options based on the current school
            populateSidebarGradeOptions(schoolSelect.value);
            
            // Add event listener to school select to update grade options
            schoolSelect.addEventListener('change', function() {
                populateSidebarGradeOptions(this.value);
            });
        }
        
        if (schoolSelect && gradeSelect && subjectSelect) {
            // Populate subject options based on school
            const school = schoolSelect.value;
            populateSubjectOptions(school, subjectSelect);
            
            // Add event listener to school select to update subject options
            schoolSelect.addEventListener('change', function() {
                const school = this.value;
                populateSubjectOptions(school, subjectSelect);
            });
        }
        
        // Add event listener to generate questions button
        if (generateQuestionsButton) {
            // Remove any existing event listeners
            const newButton = generateQuestionsButton.cloneNode(true);
            if (generateQuestionsButton.parentNode) {
                generateQuestionsButton.parentNode.replaceChild(newButton, generateQuestionsButton);
            }
            
            // Add new event listener
            newButton.addEventListener('click', function() {
                console.log('Generate questions button clicked');
                
                // Get values from the form
                const school = schoolSelect ? schoolSelect.value : '';
                const grade = gradeSelect ? gradeSelect.options[gradeSelect.selectedIndex]?.text || '' : '';
                const subject = subjectSelect ? subjectSelect.value : '';
                const semester = semesterSelect ? semesterSelect.value : '上学期';
                const difficulty = difficultySelect ? difficultySelect.value : '中等';
                const questionCount = questionCountSelect ? questionCountSelect.value : '5';
                
                // Call the function to generate questions
                handleGenerateQuestionsClick(school, grade, subject, semester, difficulty, questionCount);
            });
        }
    }
    
    // Function to populate grade options in the sidebar based on school
    function populateSidebarGradeOptions(school) {
        console.log('Populating sidebar grade options for school:', school);
        const gradeSelect = document.getElementById('grade-select-sidebar');
        
        if (!gradeSelect) {
            console.error('Grade select element not found');
            return;
        }
        
        // Clear existing options
        while (gradeSelect.options.length > 0) {
            gradeSelect.remove(0);
        }
        
        // Add new options based on school
        let grades = [];
        
        if (school === '小学') {
            grades = ['一年级', '二年级', '三年级', '四年级', '五年级', '六年级'];
        } else if (school === '初中') {
            grades = ['初一', '初二', '初三'];
        } else if (school === '高中') {
            grades = ['高一', '高二', '高三'];
        }
        
        // Add options to select
        grades.forEach(grade => {
            const option = document.createElement('option');
            option.value = grade;
            option.textContent = grade;
            gradeSelect.appendChild(option);
        });
        
        console.log('Populated grade options:', grades);
    }
    
    // Function to populate subject options based on school
    function populateSubjectOptions(school, subjectSelect) {
        if (!subjectSelect) return;
        
        // Clear existing options
        while (subjectSelect.options.length > 0) {
            subjectSelect.remove(0);
        }
        
        // Add new options based on school
        let subjects = [];
        
        if (school === '小学') {
            subjects = ['语文', '数学', '英语', '科学'];
        } else if (school === '初中') {
            subjects = ['语文', '数学', '英语', '物理', '化学', '生物', '历史', '地理', '道德与法治'];
        } else if (school === '高中') {
            subjects = ['语文', '数学', '英语', '物理', '化学', '生物', '历史', '地理', '政治'];
        }
        
        // Add options to select
        subjects.forEach(subject => {
            const option = document.createElement('option');
            option.value = subject;
            option.textContent = subject;
            subjectSelect.appendChild(option);
        });
    }
    
    // Function to handle generate questions button click
    async function handleGenerateQuestionsClick(school, grade, subject, semester, difficulty, questionCount) {
        console.log(`Generating questions for: ${school} ${grade} ${subject}, ${semester}, ${difficulty}, ${questionCount} questions`);
        
        // Show loading state
        const emptyState = document.getElementById('empty-state');
        const questionsDisplayContainer = document.getElementById('questions-display-container');
        
        if (emptyState) emptyState.classList.add('hidden');
        
        // Show loading indicator
        showLoadingIndicator();
        
        try {
            // Prepare the prompt for the API
            const prompt = `请为${school}${grade}的学生出${questionCount}道${subject}${semester}的${difficulty}难度选择题。
            每道题应包含题目和4个选项(A, B, C, D)，以及正确答案和详细解析。
            请以JSON格式返回，格式如下：
            [
              {
                "question": "题目内容",
                "options": {
                  "A": "选项A内容",
                  "B": "选项B内容",
                  "C": "选项C内容",
                  "D": "选项D内容"
                },
                "answer": "正确选项字母",
                "explanation": "详细解析"
              },
              ...
            ]`;
            
            // Call the API
            const apiResponse = await fetchAIResponse(prompt);
            console.log('API response received');
            
            // Parse the response to extract the questions
            const questions = parseQuestionsFromResponse(apiResponse);
            
            // Hide loading indicator
            hideLoadingIndicator();
            
            if (questions && questions.length > 0) {
                console.log('Successfully parsed', questions.length, 'questions');
                // Store questions in state
                state.questions = questions;
                state.currentQuestionIndex = 0;
                state.userAnswers = new Array(questions.length).fill(null);
                
                // Display questions
                if (questionsDisplayContainer) questionsDisplayContainer.classList.remove('hidden');
                displayCurrentQuestion();
                setupNavigationButtons();
            } else {
                // Show error message
                if (emptyState) emptyState.classList.remove('hidden');
                showSystemMessage('无法生成题目，请稍后再试', 'error');
            }
        } catch (error) {
            console.error('Error generating questions:', error);
            
            // Hide loading indicator
            hideLoadingIndicator();
            
            // Show error message
            if (emptyState) emptyState.classList.remove('hidden');
            showSystemMessage('生成题目时出错，请稍后再试', 'error');
        }
    }
// ... existing code ...

// Function to format math expressions in text
function formatMathExpressions(text) {
    if (!text) return '';
    
    // Replace inline math expressions (surrounded by $ signs)
    let formattedText = text.replace(/\$([^$]+)\$/g, '<span class="math-inline">$1</span>');
    
    // Replace display math expressions (surrounded by $$ signs)
    formattedText = formattedText.replace(/\$\$([^$]+)\$\$/g, '<div class="math-display">$1</div>');
    
    return formattedText;
}

// ... existing code ...

// Function to handle question submission
async function handleSubmitQuestion(question) {
    console.log('Submitting question:', question);
    
    if (!question || question.trim() === '') {
        showSystemMessage('请输入问题', 'error');
        return;
    }
    
    // Get the loading element
    const loadingElement = document.getElementById('loading');
    
    // Show loading indicator
    if (loadingElement) {
        loadingElement.classList.remove('hidden');
        console.log('Loading indicator shown in handleSubmitQuestion');
    } else {
        console.error('Loading element not found in handleSubmitQuestion');
        
        // Try to create a loading element
        const outputContainer = document.querySelector('.output-container');
        if (outputContainer) {
            const newLoadingElement = document.createElement('div');
            newLoadingElement.id = 'loading';
            newLoadingElement.innerHTML = `
                <div class="spinner"></div>
                <p>Thinking...</p>
            `;
            
            // Insert at the beginning of the output container
            outputContainer.insertBefore(newLoadingElement, outputContainer.firstChild);
            
            // Now show it
            newLoadingElement.classList.remove('hidden');
            console.log('Created and showed new loading indicator in handleSubmitQuestion');
        }
    }
    
    try {
        // Get educational context
        const educationalContext = getSimplifiedEducationalContext();
        console.log('Educational context in handleSubmitQuestion:', educationalContext);
        
        // Prepare the prompt
        const prompt = `请根据以下教育背景回答这个问题，提供详细且教育性的解答：

${educationalContext}

问题：${question}

请提供适合上述教育背景学生的清晰、准确、有教育意义的回答。
如果涉及数学或科学概念，请确保解释清楚，并考虑学生的认知水平。
如果可能，请提供一些例子或应用场景来帮助理解。`;
        
        console.log('Fetching AI response with prompt in handleSubmitQuestion:', prompt);
        
        // Call the API
        const response = await fetchAIResponse(prompt);
        console.log('API response in handleSubmitQuestion:', response);
        
        // Extract content from response
        const content = extractContentFromResponse(response);
        console.log('Extracted content in handleSubmitQuestion:', content);
        
        // Hide loading indicator
        if (loadingElement) {
            loadingElement.classList.add('hidden');
            console.log('Loading indicator hidden in handleSubmitQuestion');
        }
        
        // Display the response
        const outputElement = document.getElementById('output');
        if (outputElement) {
            // Create a new message element
            const messageElement = document.createElement('div');
            messageElement.className = 'ai-message';
            
            // Format the content with math expressions
            messageElement.innerHTML = formatMathExpressions(content);
            
            // Add the message to the output
            outputElement.appendChild(messageElement);
            
            // Scroll to the bottom of the output
            outputElement.scrollTop = outputElement.scrollHeight;
        }
    } catch (error) {
        console.error('Error submitting question in handleSubmitQuestion:', error);
        
        // Hide loading indicator
        if (loadingElement) {
            loadingElement.classList.add('hidden');
            console.log('Loading indicator hidden after error in handleSubmitQuestion');
        }
        
        // Show error message
        const outputElement = document.getElementById('output');
        if (outputElement) {
            showSystemMessage('获取回答时出错，请稍后再试', 'error');
        }
    }
}

// ... existing code ...

// Function to show system message
function showSystemMessage(message, type = 'info') {
    console.log(`Showing system message: ${message} (${type})`);
    
    // Create message element
    const messageElement = document.createElement('div');
    messageElement.className = `system-message ${type}`;
    messageElement.textContent = message;
    
    // Find the output element
    const outputElement = document.getElementById('output');
    
    if (outputElement) {
        // Insert at the beginning of the output
        if (outputElement.firstChild) {
            outputElement.insertBefore(messageElement, outputElement.firstChild);
        } else {
            outputElement.appendChild(messageElement);
        }
        
        // Remove after 5 seconds
        setTimeout(() => {
            if (messageElement.parentNode) {
                messageElement.parentNode.removeChild(messageElement);
            }
        }, 5000);
    } else {
        console.error('Output element not found');
    }
}
// ... existing code ...

// Initialize the application when the DOM is fully loaded
document.addEventListener('DOMContentLoaded', function() {
    console.log('DOM fully loaded');
    
    // Initialize state if not already initialized
    if (!state.isInitialized) {
        state.questions = [];
        state.currentQuestionIndex = 0;
        state.userAnswers = [];
        state.poems = [];
        state.currentPoemIndex = 0;
        state.isInitialized = true;
        
        console.log('State initialized:', state);
    }
    
    // Initialize the application (only once)
    init();
    
    // Set up navigation buttons if they exist
    const prevButton = document.getElementById('prev-question-button');
    const nextButton = document.getElementById('next-question-button');
    
    if (prevButton && nextButton) {
        setupNavigationButtons();
    }
});