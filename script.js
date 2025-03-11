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
            
            if (!questionText || !answer) {
                console.warn('Skipping question with missing text or answer');
                continue;
            }
            
            parsedQuestions.push({
                questionText: `题目：${questionText}`,
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
    
    console.log(`Successfully parsed ${parsedQuestions.length} questions`);
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

// Global function to display the current question
function displayCurrentQuestion() {
    console.log('displayCurrentQuestion called', window.currentQuestionIndex);
    const question = window.questions[window.currentQuestionIndex];
    
    if (!question) {
        console.error('No question found at index', window.currentQuestionIndex);
        return;
    }

    // Check if all questions are answered
    const allQuestionsAnswered = window.userAnswers && 
                               window.userAnswers.length === window.questions.length && 
                               window.userAnswers.every(answer => answer !== null);

    // Show results popup if all questions are answered
    if (allQuestionsAnswered) {
        showResultsPopup();
    }
    
    // Update question counter with responsive styling
    const questionCounter = document.getElementById('question-counter');
    if (questionCounter) {
        questionCounter.style.cssText = `
            font-size: clamp(14px, 2.5vw, 16px);
            color: #4a5568;
            font-weight: 500;
            margin-bottom: 20px;
            padding: 8px 16px;
            background: #edf2f7;
            border-radius: 20px;
            display: inline-block;
            width: fit-content;
        `;
        questionCounter.textContent = `题目 ${window.currentQuestionIndex + 1} / ${window.questions.length}`;
    }
    
    // Format and display question text with responsive styling
    const questionText = document.getElementById('question-text');
    if (questionText) {
        questionText.style.cssText = `
            font-size: clamp(16px, 4vw, 18px);
            color: #2d3748;
            line-height: 1.6;
            margin-bottom: clamp(15px, 4vw, 25px);
            padding: clamp(15px, 4vw, 20px);
            background: #f8f9fa;
            border-radius: 12px;
            width: 100%;
            box-sizing: border-box;
        `;
        questionText.innerHTML = formatMathExpressions(question.questionText);
    }
    
    // Create responsive grid for choices with 2x2 layout
    const choicesContainer = document.getElementById('choices-container');
    if (choicesContainer) {
        choicesContainer.innerHTML = `
            <div class="choices-grid" style="
                display: grid;
                grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
                gap: clamp(8px, 2vw, 20px);
                margin: 25px 0;
                width: 100%;
            ">
                ${['A', 'B', 'C', 'D'].map(letter => `
                    <div class="choice-cell" data-value="${letter}" style="
                        padding: clamp(10px, 2vw, 15px);
                        border: 2px solid #e2e8f0;
                        border-radius: 12px;
                        background-color: white;
                        display: flex;
                        align-items: center;
                        gap: 12px;
                        cursor: pointer;
                        transition: all 0.2s ease;
                        user-select: none;
                        -webkit-tap-highlight-color: transparent;
                    ">
                        <div class="choice-indicator" style="
                            width: 28px;
                            height: 28px;
                            border-radius: 50%;
                            background: #edf2f7;
                            display: flex;
                            align-items: center;
                            justify-content: center;
                            font-weight: 500;
                            color: #4a5568;
                            flex-shrink: 0;
                        ">${letter}</div>
                        <div class="choice-text" style="
                            flex: 1;
                            font-size: clamp(14px, 2.5vw, 16px);
                            color: #2d3748;
                            line-height: 1.5;
                        ">${formatMathExpressions(question.choices[letter])}</div>
                    </div>
                `).join('')}
            </div>
        `;

        // Add enhanced interaction effects for choice cells
        const choiceCells = choicesContainer.querySelectorAll('.choice-cell');
        let selectedCell = null;

        choiceCells.forEach(cell => {
            const indicator = cell.querySelector('.choice-indicator');
            
            // Function to update cell styles
            const updateCellStyles = (cell, isSelected) => {
                cell.style.borderColor = isSelected ? '#4299e1' : '#e2e8f0';
                cell.style.backgroundColor = isSelected ? '#ebf8ff' : 'white';
                cell.querySelector('.choice-indicator').style.backgroundColor = isSelected ? '#4299e1' : '#edf2f7';
                cell.querySelector('.choice-indicator').style.color = isSelected ? 'white' : '#4a5568';
            };
            
            // Click handling with single choice enforcement
            cell.addEventListener('click', () => {
                if (selectedCell) {
                    updateCellStyles(selectedCell, false);
                }
                selectedCell = cell;
                updateCellStyles(cell, true);
                
                // Save the answer
                const value = cell.dataset.value;
                window.userAnswers[window.currentQuestionIndex] = value;
            });
            
            // Touch and hover effects
            cell.addEventListener('touchstart', () => {
                if (cell !== selectedCell) {
                    cell.style.backgroundColor = '#f7fafc';
                }
            }, { passive: true });
            
            cell.addEventListener('touchend', () => {
                if (cell !== selectedCell) {
                    cell.style.backgroundColor = 'white';
                }
            }, { passive: true });
            
            cell.addEventListener('mouseover', () => {
                if (cell !== selectedCell) {
                    cell.style.borderColor = '#cbd5e0';
                    cell.style.backgroundColor = '#f7fafc';
                    cell.style.transform = 'translateY(-1px)';
                }
            });
            
            cell.addEventListener('mouseout', () => {
                if (cell !== selectedCell) {
                    cell.style.borderColor = '#e2e8f0';
                    cell.style.backgroundColor = 'white';
                    cell.style.transform = 'none';
                }
            });

            // Set initial state if answer exists
            if (window.userAnswers[window.currentQuestionIndex] === cell.dataset.value) {
                selectedCell = cell;
                updateCellStyles(cell, true);
            }
        });
    }
    
    // Style the answer container when showing results
    if (window.userAnswers && window.userAnswers[window.currentQuestionIndex]) {
        const answerContainer = document.getElementById('answer-container');
        if (answerContainer) {
            answerContainer.classList.remove('hidden');
            answerContainer.style.cssText = `
                margin-top: clamp(20px, 5vw, 30px);
                padding: clamp(15px, 4vw, 25px);
                border-radius: 12px;
                background-color: white;
                box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
                width: 100%;
                box-sizing: border-box;
                animation: fadeIn 0.3s ease;
            `;
            
            const selectedAnswer = window.userAnswers[window.currentQuestionIndex];
            const correctAnswer = question.answer;
            const isCorrect = selectedAnswer === correctAnswer;
            
            // Style the result section
            const answerResult = document.getElementById('answer-result');
            if (answerResult) {
                answerResult.style.cssText = `
                    font-size: 18px;
                    font-weight: 500;
                    color: ${isCorrect ? '#48bb78' : '#e53e3e'};
                    margin-bottom: 20px;
                    padding: 15px;
                    background: ${isCorrect ? '#f0fff4' : '#fff5f5'};
                    border-radius: 8px;
                    display: flex;
                    align-items: center;
                    gap: 10px;
                `;
                
                const resultText = isCorrect 
                    ? `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 6L9 17l-5-5"/></svg> 正确！答案是：${correctAnswer}`
                    : `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 6L6 18M6 6l12 12"/></svg> 错误。正确答案是：${correctAnswer}`;
                
                answerResult.innerHTML = formatMathExpressions(resultText);
            }
            
            // Style the explanation section
            const answerExplanation = document.getElementById('answer-explanation');
            if (answerExplanation) {
                answerExplanation.style.cssText = `
                    font-size: 16px;
                    color: #4a5568;
                    line-height: 1.8;
                    margin-top: 20px;
                    padding: 20px;
                    background: #f8f9fa;
                    border-radius: 8px;
                    white-space: pre-wrap;
                `;
                answerExplanation.innerHTML = formatMathExpressions(question.explanation);
            }
            
            // Check if all questions are answered after showing the current answer
            const allQuestionsAnswered = window.userAnswers.length === window.questions.length && 
                                       window.userAnswers.every(answer => answer !== null);
            
            if (allQuestionsAnswered) {
                // Only show the popup, don't create score-summary-container
                showResultsPopup();
            }
        }
    } else {
        const answerContainer = document.getElementById('answer-container');
        if (answerContainer) {
            answerContainer.classList.add('hidden');
        }
    }
    
    // Ensure create container has enough space and smooth scrolling
    const createContainer = document.getElementById('create-container');
    if (createContainer) {
        createContainer.style.cssText = `
            min-height: 100vh;
            height: auto;
            padding: clamp(15px, 4vw, 30px);
            overflow-y: auto;
            scroll-behavior: smooth;
            background: transparent;
            border-radius: 16px;
            box-shadow: none;
            width: 100%;
            max-width: 100%;
            box-sizing: border-box;
            margin: 0 auto;
        `;
    }
    
    // Render math expressions
    if (window.MathJax) {
        window.MathJax.typesetPromise && window.MathJax.typesetPromise();
    }
}

// Function to format math expressions
function formatMathExpressions(text) {
    if (!text) return '';
    
    // Replace simple math expressions with LaTeX
    text = text.replace(/\b(\d+[+\-*/]\d+)\b/g, '\\($1\\)');
    
    // Replace fractions
    text = text.replace(/(\d+)\/(\d+)/g, '\\(\\frac{$1}{$2}\\)');
    
    // Replace powers
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
}

// Global function to handle generate questions button click
function handleGenerateQuestionsClick() {
    console.log('handleGenerateQuestionsClick called');
    
    // Get form elements
    const schoolSelect = document.getElementById('school-select');
    const gradeSelect = document.getElementById('grade-select');
    const semesterSelect = document.getElementById('semester-select');
    const subjectSelect = document.getElementById('subject-select');
    const difficultySelect = document.getElementById('difficulty-select');
    const questionCountSelect = document.getElementById('question-count-select');
    const generateQuestionsButton = document.getElementById('generate-questions-button');
    const questionsDisplayContainer = document.getElementById('questions-display-container');
    
    if (!schoolSelect || !gradeSelect || !semesterSelect || !subjectSelect || 
        !difficultySelect || !questionCountSelect || !generateQuestionsButton) {
        console.error('One or more form elements not found');
        return;
    }
    
    // Show loading state on button
    generateQuestionsButton.textContent = '生成中...';
    generateQuestionsButton.disabled = true;
    
    // Collect form data
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
`;

    // Call API to generate questions
    fetchAIResponse(prompt)
        .then(response => {
            try {
                console.log('Processing API response:', response);
                
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
                
                // Show the questions display container
                questionsDisplayContainer.classList.remove('hidden');
                
                // Display the first question
                displayCurrentQuestion();
                updateNavigationButtons();
                
                // Show success message
                showSystemMessage(`已生成 ${parsedQuestions.length} 道 ${schoolType}${grade}${semester}${subject} ${difficulty}难度题目`, 'success');
            } catch (error) {
                console.error('Error processing questions:', error);
                showSystemMessage('生成题目时出错，请重试', 'error');
            } finally {
                // Reset button state
                generateQuestionsButton.textContent = '出题';
                generateQuestionsButton.disabled = false;
            }
        })
        .catch(error => {
            console.error('API error:', error);
            showSystemMessage('API调用失败，请重试', 'error');
            // Reset button state
            generateQuestionsButton.textContent = '出题';
            generateQuestionsButton.disabled = false;
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
}

document.addEventListener('DOMContentLoaded', () => {
    // Debug all clicks
    document.addEventListener('click', (e) => {
        console.log('Element clicked:', e.target);
        if (e.target.id === 'generate-questions-button') {
            console.log('Generate questions button clicked via document listener');
        }
    });
    
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
        console.log('Found generate questions button:', generateQuestionsButton);
        
        generateQuestionsButton.addEventListener('click', handleGenerateQuestionsClick);
    } else {
        console.error('Generate questions button not found');
    }
    
    // Add event listeners for navigation and submit buttons
    if (submitAnswerButton) {
        submitAnswerButton.addEventListener('click', function() {
            console.log('Submit answer button clicked');
            
            // Get the selected answer from our custom choice system
            const selectedAnswer = window.userAnswers[window.currentQuestionIndex];
            
            if (!selectedAnswer) {
                alert('请选择一个答案');
                return;
            }
            
            // Get the correct answer
            const correctAnswer = window.questions[window.currentQuestionIndex].answer;
            
            // Show the answer container
            const answerContainer = document.getElementById('answer-container');
            answerContainer.classList.remove('hidden');
            answerContainer.style.cssText = `
                margin-top: 20px;
                padding: 15px;
                border: 1px solid #ddd;
                border-radius: 8px;
                background-color: #f9f9f9;
                width: 100%;
                box-sizing: border-box;
            `;
            
            // Display result with math formatting
            const answerResult = document.getElementById('answer-result');
            if (answerResult) {
                const resultText = selectedAnswer === correctAnswer 
                    ? `✓ 正确！答案是：${correctAnswer}`
                    : `✗ 错误。正确答案是：${correctAnswer}`;
                
                answerResult.innerHTML = formatMathExpressions(resultText);
                answerResult.style.cssText = `
                    color: ${selectedAnswer === correctAnswer ? '#28a745' : '#dc3545'};
                    margin-bottom: 10px;
                    font-weight: bold;
                    font-size: 16px;
                `;
            }
            
            // Display explanation with math formatting
            const answerExplanation = document.getElementById('answer-explanation');
            if (answerExplanation) {
                const explanation = window.questions[window.currentQuestionIndex].explanation;
                answerExplanation.innerHTML = formatMathExpressions(explanation);
                answerExplanation.style.cssText = `
                    line-height: 1.6;
                    margin-top: 10px;
                    white-space: pre-wrap;
                    font-size: 15px;
                `;
            }
            
            // Render math expressions
            if (window.MathJax && window.MathJax.typesetPromise) {
                window.MathJax.typesetPromise([answerContainer]).catch((err) => {
                    console.error('MathJax typesetting failed:', err);
                });
            }
            
            // Enable navigation buttons
            updateNavigationButtons();
            
            // Check if all questions are answered and display score summary if needed
            displayCurrentQuestion();
        });
    }
    
    if (prevQuestionButton) {
        prevQuestionButton.addEventListener('click', function() {
            console.log('Previous question button clicked');
            if (window.currentQuestionIndex > 0) {
                window.currentQuestionIndex--;
                displayCurrentQuestion();
                updateNavigationButtons();
            }
        });
    }
    
    if (nextQuestionButton) {
        nextQuestionButton.addEventListener('click', function() {
            console.log('Next question button clicked');
            if (window.currentQuestionIndex < window.questions.length - 1) {
                window.currentQuestionIndex++;
                displayCurrentQuestion();
                updateNavigationButtons();
            }
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
        
        try {
            // Call the AI API with the user's question
            const prompt = question;
            const response = await fetchAIResponse(prompt);
            
            // Handle the response
            handleSuccessfulResponse(response, question);
        } catch (error) {
            console.error('Error:', error);
            showSystemMessage(`Error: ${error.message}`, 'error');
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
    
    // Make handleEvaluateClick available globally
    window.handleEvaluateClick = async function() {
        const evaluateButton = document.getElementById('evaluate-button');
        const evaluationResult = document.querySelector('#results-modal #evaluation-result');
        
        if (!evaluateButton || !evaluationResult) {
            console.error('Evaluation button or result container not found');
            return;
        }
        
        // Show loading state with improved animation
        evaluationResult.style.display = 'block';
        evaluationResult.innerHTML = `
            <div class="evaluation-loading" style="
                text-align: center;
                padding: 30px;
                color: #4a5568;
                font-size: 16px;
                background: #f8fafc;
                border-radius: 12px;
                box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
            ">
                <div class="loading-spinner" style="
                    margin-bottom: 15px;
                    display: inline-block;
                    width: 40px;
                    height: 40px;
                    border: 3px solid #e2e8f0;
                    border-radius: 50%;
                    border-top-color: #4299e1;
                    animation: spin 1s linear infinite;
                "></div>
                <div style="font-weight: 500;">正在生成评估报告，请稍候...</div>
                <style>
                    @keyframes spin {
                        to { transform: rotate(360deg); }
                    }
                </style>
            </div>
        `;
        
        evaluateButton.disabled = true;
        evaluateButton.textContent = '评估中...';
        evaluateButton.style.backgroundColor = '#90cdf4';
        
        try {
            // Calculate score and prepare data
            let correctCount = 0;
            window.userAnswers.forEach((answer, index) => {
                if (answer === window.questions[index].answer) {
                    correctCount++;
                }
            });
            const scorePercentage = (correctCount / window.questions.length) * 100;

            // Prepare test results data
            const testResults = window.questions.map((question, index) => ({
                questionText: question.questionText,
                userAnswer: window.userAnswers[index],
                correctAnswer: question.answer,
                isCorrect: window.userAnswers[index] === question.answer,
                explanation: question.explanation
            }));

            // Create evaluation prompt
            const prompt = `请对以下测试结果进行全面评估。总题数：${window.questions.length}，正确题数：${correctCount}，正确率：${scorePercentage.toFixed(1)}%。
            
测试详情：${JSON.stringify(testResults, null, 2)}

请按照以下五个方面进行分析，每个部分至少提供3-4点具体内容：

总体表现评价
• 整体答题表现分析
• 知识掌握程度评估
• 解题思路和方法评价

知识点掌握情况
• 已掌握的知识点（请具体指出）
• 需要加强的知识点（请具体指出）
• 知识运用能力分析

易错点分析
• 错误原因分析（针对具体题目）
• 典型错误模式总结
• 易混淆知识点辨析

针对性改进建议
• 具体的学习方法建议
• 练习重点推荐
• 时间分配建议

推荐复习重点
• 需要重点关注的知识点
• 推荐的练习题型
• 建议的学习资源

回复要求：
1. 保持鼓励性的语气
2. 每个分析点要具体明确
3. 建议要可操作可执行
4. 适当使用表情符号增加亲和力

请确保分析内容具体且有针对性，避免模糊的表述。`;

            // Call API for evaluation
            const response = await fetchAIResponse(prompt);
            const evaluationContent = extractContentFromResponse(response);

            // Enhanced evaluation result container styling
            evaluationResult.style.cssText = `
                display: block;
                margin-top: 30px;
                padding: 25px;
                background: #ffffff;
                border-radius: 12px;
                text-align: left;
                line-height: 1.6;
                max-height: none;
                opacity: 1;
                transition: all 0.3s ease;
                box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
            `;

            // Format the evaluation content with enhanced sections
            const formattedEvaluation = evaluationContent
                .split(/(?=总体表现评价|知识点掌握情况|易错点分析|针对性改进建议|推荐复习重点)/)
                .map((section, index) => {
                    const title = section.match(/^[^：\n]+/);
                    if (title) {
                        // Define section-specific icons and colors
                        const sectionStyles = {
                            '总体表现评价': { icon: '📊', color: '#4299e1', bgColor: '#ebf8ff' },
                            '知识点掌握情况': { icon: '📚', color: '#48bb78', bgColor: '#f0fff4' },
                            '易错点分析': { icon: '⚠️', color: '#ed8936', bgColor: '#fffaf0' },
                            '针对性改进建议': { icon: '💡', color: '#667eea', bgColor: '#ebf4ff' },
                            '推荐复习重点': { icon: '🎯', color: '#9f7aea', bgColor: '#faf5ff' }
                        };
                        
                        const style = sectionStyles[title[0]] || { icon: '📝', color: '#4a5568', bgColor: '#f7fafc' };
                        
                        return `
                            <div class="evaluation-section" style="
                                margin-bottom: 25px;
                                padding: 20px;
                                background: ${style.bgColor};
                                border-radius: 12px;
                                border: 1px solid ${style.color}20;
                                animation: fadeIn 0.5s ease ${index * 0.1}s both;
                            ">
                                <h3 style="
                                    color: ${style.color};
                                    margin-bottom: 15px;
                                    font-size: 1.25rem;
                                    font-weight: 600;
                                    display: flex;
                                    align-items: center;
                                    gap: 8px;
                                ">
                                    <span style="font-size: 1.5rem;">${style.icon}</span>
                                    ${title[0]}
                                </h3>
                                <div style="
                                    color: #4a5568;
                                    line-height: 1.8;
                                    font-size: 1rem;
                                ">
                                    ${section.replace(title[0], '').trim()
                                        .split('•').map(point => point.trim())
                                        .filter(point => point)
                                        .map(point => `
                                            <div class="evaluation-point" style="
                                                margin: 12px 0;
                                                padding-left: 20px;
                                                position: relative;
                                            ">
                                                <span style="
                                                    position: absolute;
                                                    left: 0;
                                                    color: ${style.color};
                                                ">•</span>
                                                ${point}
                                            </div>
                                        `).join('')}
                                </div>
                            </div>
                        `;
                    }
                    return section;
                })
                .join('');

            // Add styles for animations
            evaluationResult.innerHTML = `
                <style>
                    @keyframes fadeIn {
                        from { opacity: 0; transform: translateY(10px); }
                        to { opacity: 1; transform: translateY(0); }
                    }
                </style>
                ${formattedEvaluation}
            `;

            // Force a reflow to ensure the content is displayed
            evaluationResult.offsetHeight;

            // Smooth scroll to show the evaluation
            const modalContent = evaluationResult.closest('.modal-content');
            if (modalContent) {
                modalContent.scrollTo({
                    top: evaluationResult.offsetTop - 20,
                    behavior: 'smooth'
                });
            }

            console.log('Evaluation content loaded and displayed in popup');

        } catch (error) {
            console.error('Evaluation error:', error);
            evaluationResult.innerHTML = `
                <div style="
                    color: #e53e3e;
                    padding: 20px;
                    background: #fff5f5;
                    border-radius: 12px;
                    border: 1px solid #feb2b2;
                    text-align: center;
                    font-weight: 500;
                ">
                    <span style="font-size: 24px; margin-bottom: 10px; display: block;">❌</span>
                    评估过程出错，请重试
                </div>
            `;
            evaluationResult.style.display = 'block';
        } finally {
            evaluateButton.disabled = false;
            evaluateButton.textContent = '成绩评估';
            evaluateButton.style.backgroundColor = '#4299e1';
        }
    };
    
    // Initialize the page
    populateGradeOptions(schoolSelect.value);
    populateSubjectOptions(schoolSelect.value);

    // Initialize form layout
    initializeFormLayout();

    // Add event listener for generate questions button
    if (generateQuestionsButton) {
        generateQuestionsButton.addEventListener('click', function() {
            console.log('Generate questions button clicked via event listener');
            handleGenerateQuestionsClick();
        });
    }

    // Update output container styles
    if (output) {
        output.style.cssText = `
            width: 100%;
            max-width: 100%;
            padding: clamp(10px, 3vw, 20px);
            margin: 0;
            background-color: white;
            border-radius: 8px;
            box-sizing: border-box;
            font-size: clamp(14px, 4vw, 16px);
            line-height: 1.6;
        `;
    }

    // Update choices grid for better mobile display
    const choicesGrid = document.querySelector('.choices-grid');
    if (choicesGrid) {
        choicesGrid.style.cssText = `
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
            gap: clamp(8px, 2vw, 20px);
            margin: 25px 0;
            width: 100%;
        `;
    }

    // Make answer container more responsive
    if (answerContainer) {
        answerContainer.style.cssText = `
            margin-top: clamp(20px, 5vw, 30px);
            padding: clamp(15px, 4vw, 25px);
            border-radius: 12px;
            background-color: white;
            box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
            width: 100%;
            box-sizing: border-box;
            animation: fadeIn 0.3s ease;
        `;
    }
}); 