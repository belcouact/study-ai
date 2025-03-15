// API configuration variables
let currentApiFunction = 'chat';
let currentModel = 'deepseek-r1';

// Global variables for question management
let questionsArray = [];
let currentQuestionIndex = 0;
let userAnswers = [];

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
    console.log('displayCurrentQuestion called', currentQuestionIndex);
    console.log('Questions array: ', questionsArray);
    
    // Ensure we have questions to display
    if (!questionsArray || questionsArray.length === 0) {
        console.error('No questions to display');
        return;
    }
    
    // Get the current question
    const currentQuestion = questionsArray[currentQuestionIndex];
    console.log('Current question: ', currentQuestion);
    
    // Ensure the questions display container exists
    ensureQuestionsDisplayContainer();
    
    // Get the questions container
    const questionsContainer = document.querySelector('.questions-container');
    if (!questionsContainer) {
        console.error('\n Questions display container not found in displayCurrentQuestion');
        return;
    }
    
    // Clear the container
    questionsContainer.innerHTML = '';
    
    // Create the question element
    const questionElement = document.createElement('div');
    questionElement.className = 'question';
    
    // Create the question text
    const questionText = document.createElement('div');
    questionText.className = 'question-text';
    
    // Format the question text to handle math expressions
    const formattedText = formatMathExpressions(currentQuestion.questionText);
    questionText.innerHTML = formattedText;
    
    questionElement.appendChild(questionText);
    
    // Create the choices
    const choicesContainer = document.createElement('div');
    choicesContainer.className = 'choices-container';
    
    // Add each choice
    for (const [key, value] of Object.entries(currentQuestion.choices)) {
        const choiceRow = document.createElement('div');
        choiceRow.className = 'choice-row';
        
        const choiceCell = document.createElement('div');
        choiceCell.className = 'choice-cell';
        choiceCell.dataset.value = key;
        
        // Format the choice text to handle math expressions
        const formattedChoice = formatMathExpressions(value);
        
        choiceCell.innerHTML = `<span class="choice-label">${key}.</span> ${formattedChoice}`;
        
        // Add click handler
        choiceCell.addEventListener('click', function() {
            // Remove selected class from all cells
            document.querySelectorAll('.choice-cell').forEach(cell => {
                cell.classList.remove('selected');
            });
            
            // Add selected class to this cell
            this.classList.add('selected');
            
            // Store the selected answer
            displayAnswer(this.dataset.value);
        });
        
        choiceRow.appendChild(choiceCell);
        choicesContainer.appendChild(choiceRow);
    }
    
    questionElement.appendChild(choicesContainer);
    
    // Add the question to the container
    questionsContainer.appendChild(questionElement);
    
    // Update the navigation buttons
    updateNavigationButtons();
    
    // Display completion status
    displayCompletionStatus();
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
    console.log('updateNavigationButtons called', currentQuestionIndex, questionsArray ? questionsArray.length : 0);
    
    const prevButton = document.getElementById('prev-question-button');
    const nextButton = document.getElementById('next-question-button');
    
    if (prevButton) {
        prevButton.disabled = !questionsArray || currentQuestionIndex <= 0;
    }
    
    if (nextButton) {
        nextButton.disabled = !questionsArray || currentQuestionIndex >= questionsArray.length - 1;
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
    if (userAnswers && questionsArray) {
        const allQuestionsAnswered = userAnswers.length === questionsArray.length && 
                                   userAnswers.every(answer => answer !== null);
        
        if (allQuestionsAnswered) {
            displayCompletionStatus();
        }
    }
}

// Function to display completion status and score in navigation section
function displayCompletionStatus() {
    // Check if we have questions and answers
    if (!questionsArray || questionsArray.length === 0) {
        return; // No questions to display completion for
    }
    
    // Initialize userAnswers array if it doesn't exist
    if (!userAnswers || userAnswers.length !== questionsArray.length) {
        userAnswers = new Array(questionsArray.length).fill(null);
    }
    
    // Calculate score
    let correctCount = 0;
    userAnswers.forEach((answer, index) => {
        if (answer && answer === questionsArray[index].answer) {
            correctCount++;
        }
    });
    const scorePercentage = (correctCount / questionsArray.length) * 100;
    
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
        
        // Add score
        const scoreElement = document.createElement('div');
        scoreElement.style.cssText = `
            font-size: 16px;
            color: #2b6cb0;
        `;
        scoreElement.textContent = `得分: ${correctCount}/${questionsArray.length} (${scorePercentage.toFixed(1)}%)`;
        completionStatus.appendChild(scoreElement);
        
        // Add view results button
        const viewResultsButton = document.createElement('button');
        viewResultsButton.textContent = '查看结果';
        viewResultsButton.style.cssText = `
            padding: 8px 16px;
            background-color: #4299e1;
            color: white;
            border: none;
            border-radius: 6px;
            font-weight: 500;
            cursor: pointer;
            margin-top: 10px;
            transition: all 0.2s ease;
        `;
        viewResultsButton.addEventListener('click', showResultsPopup);
        completionStatus.appendChild(viewResultsButton);
        
        // Add to navigation controls
        navigationControls.appendChild(completionStatus);
    } else {
        // Update existing completion status
        const scoreElement = completionStatus.querySelector('div:nth-child(2)');
        if (scoreElement) {
            scoreElement.textContent = `得分: ${correctCount}/${questionsArray.length} (${scorePercentage.toFixed(1)}%)`;
        }
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
    // Show loading indicator
    showLoadingIndicator();
    
    // Get the prompt from the form
    const prompt = getEducationalContext();
    console.log('Generated prompt:', prompt);
    
    // Ensure the questions display container exists
    ensureQuestionsDisplayContainer();
    
    // Fetch AI response
    fetchAIResponse(prompt)
        .then(response => {
            // Parse questions from the response
            const parsedQuestions = parseQuestionsFromResponse(response);
            console.log('Successfully parsed ' + parsedQuestions.length + ' questions: ');
            console.log(parsedQuestions);
            
            // Store the questions in the global array
            questionsArray = parsedQuestions;
            console.log('Parsed questions: ');
            console.log(questionsArray);
            
            // Hide empty state if questions were generated
            if (questionsArray && questionsArray.length > 0) {
                const emptyStateContainer = document.querySelector('.empty-state-container');
                if (emptyStateContainer) {
                    emptyStateContainer.style.display = 'none';
                    console.log('Empty state hidden');
                }
                
                // Ensure questions container is visible
                const questionsContainer = document.querySelector('.questions-container');
                if (questionsContainer) {
                    questionsContainer.style.display = 'block';
                }
                
                // Make sure the questions display container exists and is visible
                ensureQuestionsDisplayContainer();
                
                // Display the first question
                currentQuestionIndex = 0;
                displayCurrentQuestion();
                
                // Update navigation buttons
                updateNavigationButtons();
            }
            
            // Hide loading indicator
            hideLoadingIndicator();
        })
        .catch(error => {
            console.error('\n Error processing questions:', error);
            showSystemMessage('Error generating questions. Please try again.', 'error');
            hideLoadingIndicator();
            console.error('\n API error:', error);
        });
}

// Function to ensure the questions display container exists
function ensureQuestionsDisplayContainer() {
    let questionsDisplayContainer = document.getElementById('questions-display-container');
    
    // If container doesn't exist, create it
    if (!questionsDisplayContainer) {
        console.log('Creating questions display container');
        questionsDisplayContainer = document.createElement('div');
        questionsDisplayContainer.id = 'questions-display-container';
        questionsDisplayContainer.className = 'questions-display-container';
        questionsDisplayContainer.style.cssText = `
            width: 100%;
            margin-bottom: 20px;
            background: #ffffff;
            border-radius: 12px;
            box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
            padding: 20px;
            box-sizing: border-box;
        `;
        
        // Find the create container to append to
        const createContainer = document.getElementById('create-container');
        if (createContainer) {
            // Insert at the beginning of the create container
            createContainer.insertBefore(questionsDisplayContainer, createContainer.firstChild);
            console.log('Questions display container added to create container');
        } else {
            // If create container doesn't exist, try to find the main container
            const mainContainer = document.querySelector('.main-container') || document.querySelector('.container');
            if (mainContainer) {
                mainContainer.appendChild(questionsDisplayContainer);
                console.log('Questions display container added to main container');
            } else {
                console.error('No suitable container found for questions display');
            }
        }
    }
    
    // Ensure the questions container exists inside the display container
    let questionsContainer = document.querySelector('.questions-container');
    if (!questionsContainer) {
        console.log('Creating questions container');
        questionsContainer = document.createElement('div');
        questionsContainer.className = 'questions-container';
        questionsDisplayContainer.appendChild(questionsContainer);
    }
    
    return questionsDisplayContainer;
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
    
    // Find or create the navigation controls container
    let navigationControls = document.querySelector('.navigation-controls');
    if (!navigationControls) {
        navigationControls = document.createElement('div');
        navigationControls.className = 'navigation-controls';
        navigationControls.style.cssText = `
            display: flex;
            justify-content: space-between;
            margin-top: 20px;
            width: 100%;
        `;
        
        // Find the questions display container to append to
        const questionsDisplayContainer = document.getElementById('questions-display-container');
        if (questionsDisplayContainer) {
            questionsDisplayContainer.appendChild(navigationControls);
        } else {
            // If questions display container doesn't exist, try to find the create container
            const createContainer = document.getElementById('create-container');
            if (createContainer) {
                createContainer.appendChild(navigationControls);
            }
        }
    }
    
    // Find existing buttons
    const prevButton = document.getElementById('prev-question-button');
    const nextButton = document.getElementById('next-question-button');
    
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
            if (currentQuestionIndex > 0) {
                currentQuestionIndex--;
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
            if (currentQuestionIndex > 0) {
                currentQuestionIndex--;
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
            if (questionsArray && currentQuestionIndex < questionsArray.length - 1) {
                currentQuestionIndex++;
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
            if (questionsArray && currentQuestionIndex < questionsArray.length - 1) {
                currentQuestionIndex++;
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
    // Find all option buttons
    const optionButtons = document.querySelectorAll('.option-button');
    if (!optionButtons.length) {
        console.log('No option buttons found');
        return;
    }
    
    // Initialize userAnswers array if not already done
    if (!userAnswers) {
        userAnswers = new Array(questionsArray ? questionsArray.length : 0).fill(null);
    }
    
    optionButtons.forEach(button => {
        // Remove any existing event listeners
        const newButton = button.cloneNode(true);
        button.parentNode.replaceChild(newButton, button);
        
        // Add new event listener
        newButton.addEventListener('click', function() {
            const option = this.getAttribute('data-option');
            if (option && questionsArray) {
                // Save user's answer
                userAnswers[currentQuestionIndex] = option;
                
                // Update UI to show selected option
                document.querySelectorAll('.option-button').forEach(btn => {
                    btn.classList.remove('selected');
                });
                this.classList.add('selected');
                
                // Check if answer is correct
                const currentQuestion = questionsArray[currentQuestionIndex];
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
    console.log('\n', message);
    
    const container = document.querySelector('.questions-container');
    if (!container) {
        console.error('System message container not found');
        return; // Exit the function if container doesn't exist
    }
    
    const messageElement = document.createElement('div');
    messageElement.className = `system-message ${type}`;
    messageElement.textContent = message;
    
    // Check if container has a firstChild before using insertBefore
    if (container.firstChild) {
        container.insertBefore(messageElement, container.firstChild);
    } else {
        container.appendChild(messageElement); // Use appendChild if there's no firstChild
    }
    
    // Auto-remove the message after 5 seconds
    setTimeout(() => {
        if (messageElement.parentNode) {
            messageElement.remove();
        }
    }, 5000);
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
    // Only initialize empty state for the test page
    if (window.location.pathname.includes('test.html') || document.querySelector('.test-container')) {
        const emptyStateContainer = document.querySelector('.empty-state-container');
        const questionsContainer = document.querySelector('.questions-container');
        
        if (emptyStateContainer && questionsContainer) {
            // Only show empty state if we're on initial page load (not tab switching)
            // Check if this is the first load of the test page
            const isInitialLoad = !sessionStorage.getItem('testPageLoaded');
            
            if (isInitialLoad) {
                // First time loading the test page
                emptyStateContainer.style.display = 'flex';
                questionsContainer.style.display = 'none';
                sessionStorage.setItem('testPageLoaded', 'true');
            } else {
                // This is a tab switch or reload, keep the current state
                // Don't show empty state when switching tabs
                if (questionsArray && questionsArray.length > 0) {
                    emptyStateContainer.style.display = 'none';
                    questionsContainer.style.display = 'block';
                    console.log('Empty state hidden - questions exist');
                }
            }
        } else {
            console.error('Empty state or questions container not found');
        }
    }
}

// Modify the switchPanel function to preserve state when switching to the create tab
function switchPanel(panelId) {
    // ... existing code ...
    
    // If switching to create tab on the test page, don't reset the empty state
    if (panelId === 'create' && (window.location.pathname.includes('test.html') || document.querySelector('.test-container'))) {
        // Don't initialize empty state here, preserve current state
        // This prevents empty state from showing when switching to create tab
    } else {
        // For other tabs or pages, proceed with normal initialization
        initializeEmptyState();
    }
    
    // ... existing code ...
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

// Function to get educational context from form inputs
function getEducationalContext() {
    // Get values from form elements
    const school = document.getElementById('school-select') ? document.getElementById('school-select').value : '';
    const grade = document.getElementById('grade-select') ? document.getElementById('grade-select').value : '';
    const subject = document.getElementById('subject-select') ? document.getElementById('subject-select').value : '';
    const topic = document.getElementById('topic-input') ? document.getElementById('topic-input').value : '';
    const difficulty = document.getElementById('difficulty-select') ? document.getElementById('difficulty-select').value : '';
    const questionCount = document.getElementById('question-count-select') ? document.getElementById('question-count-select').value : '5';
    
    // Get additional context if available
    const additionalContext = document.getElementById('additional-context') ? 
                             document.getElementById('additional-context').value : '';
    
    // Build the prompt
    let prompt = `请根据以下教育背景，生成${questionCount}道选择题，每题包含4个选项(A、B、C、D)，并标明正确答案和详细解析。`;
    
    // Add educational level context
    if (school && grade) {
        prompt += `\n教育阶段: ${school}${grade}`;
    }
    
    // Add subject and topic
    if (subject) {
        prompt += `\n学科: ${subject}`;
    }
    
    if (topic && topic.trim() !== '') {
        prompt += `\n主题: ${topic}`;
    }
    
    // Add difficulty
    if (difficulty) {
        prompt += `\n难度: ${difficulty}`;
    }
    
    // Add additional context if provided
    if (additionalContext && additionalContext.trim() !== '') {
        prompt += `\n额外要求: ${additionalContext}`;
    }
    
    // Add format requirements
    prompt += `\n请按以下格式输出:
题目：[题目内容]
A. [选项A]
B. [选项B]
C. [选项C]
D. [选项D]
答案：[正确选项字母]
解析：[详细解析]

请确保每道题目都有明确的正确答案，并提供详细的解析说明为什么该选项是正确的。`;
    
    return prompt;
}