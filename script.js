// API configuration variables
let currentApiFunction = 'chat';
let currentModel = 'deepseek-chat';
// Add global variable for current question index
let currentQuestionIndex = 0;
let currentWordIndex = 0;
// Global variables
let vocabularyWords = [];

// Global poem state
window.poemState = {
    poems: [],
    currentIndex: 0
};

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
                max_tokens: 4096
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
    
    if (!questions || questions.length === 0) {
        console.log('No questions available to display');
        return;
    }

    // Get the current question from the questions array
    const question = questions[currentQuestionIndex];
    if (!question) {
        console.error('Current question not found at index:', currentQuestionIndex);
        return;
    }

    // Get the create container
    const createContainer = document.getElementById('create-container');
    if (!createContainer || createContainer.style.display === 'none') {
        console.log('Not on create tab, skipping question display');
        return;
    }

    // First ensure we have a questions container
    let questionsContainer = document.querySelector('.questions-container');
    if (!questionsContainer) {
        console.log('Creating new questions container');
        questionsContainer = document.createElement('div');
        questionsContainer.className = 'questions-container';
        createContainer.appendChild(questionsContainer);
    }

    // Create questions display container if it doesn't exist
    let questionsDisplayContainer = document.getElementById('questions-display-container');
    if (!questionsDisplayContainer) {
        console.log('Creating new questions display container');
        questionsDisplayContainer = document.createElement('div');
        questionsDisplayContainer.id = 'questions-display-container';
        questionsDisplayContainer.className = 'questions-display-container';
        questionsContainer.appendChild(questionsDisplayContainer);
    }

    // Ensure required child elements exist
    const requiredElements = [
        { id: 'question-counter', className: 'question-counter' },
        { id: 'question-text', className: 'question-text' },
        { id: 'choices-container', className: 'choices-container' },
        { id: 'answer-container', className: 'answer-container hidden' }
    ];

    requiredElements.forEach(element => {
        if (!document.getElementById(element.id)) {
            const newElement = document.createElement('div');
            newElement.id = element.id;
            newElement.className = element.className;
            questionsDisplayContainer.appendChild(newElement);
        }
    });
    
    // Check if all questions are answered
    const allQuestionsAnswered = window.userAnswers && 
                               window.userAnswers.length === window.questions.length && 
                               window.userAnswers.every(answer => answer !== null);

    // Show completion status if all questions are answered
    if (allQuestionsAnswered) {
        displayCompletionStatus();
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
        questionCounter.textContent = `题目 ${currentQuestionIndex + 1} / ${window.questions.length}`;
        console.log('Updated question counter:', questionCounter.textContent);
    } else {
        console.error('Question counter element not found');
        // Create it if it doesn't exist
        const newCounter = document.createElement('div');
        newCounter.id = 'question-counter';
        newCounter.className = 'question-counter';
        newCounter.style.cssText = `
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
        newCounter.textContent = `题目 ${currentQuestionIndex + 1} / ${window.questions.length}`;
        questionsContainer.appendChild(newCounter);
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
        // Remove "题目：" prefix if it exists
        let displayText = question.questionText;
        if (displayText.startsWith('题目：')) {
            displayText = displayText.substring(3);
        }
        
        // Apply enhanced math formatting
        questionText.innerHTML = formatMathExpressions(displayText);
        console.log('Updated question text:', displayText);
    } else {
        console.error('Question text element not found');
        // Create it if it doesn't exist
        const newText = document.createElement('div');
        newText.id = 'question-text';
        newText.className = 'question-text';
        newText.style.cssText = `
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
        let displayText = question.questionText;
        if (displayText.startsWith('题目：')) {
            displayText = displayText.substring(3);
        }
        newText.innerHTML = formatMathExpressions(displayText);
        questionsContainer.appendChild(newText);
    }
    
    // Create responsive grid for choices with 2x2 layout
    const choicesContainer = document.getElementById('choices-container');
    if (choicesContainer) {
        console.log('Choices container found, updating with choices:', question.choices);
        
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
            <div class="submit-button-container" style="
                display: flex;
                justify-content: center;
                margin-top: 20px;
                width: 100%;
            ">
                <button id="submit-answer-button" style="
                    padding: 12px 30px;
                    font-size: 16px;
                    font-weight: 500;
                    background-color: #4299e1;
                    color: white;
                    border: none;
                    border-radius: 8px;
                    cursor: pointer;
                    transition: all 0.2s ease;
                    box-shadow: 0 2px 4px rgba(66, 153, 225, 0.2);
                    opacity: 0.7;
                    pointer-events: none;
                ">提交答案</button>
            </div>
        `;

        // Add enhanced interaction effects for choice cells
        const choiceCells = choicesContainer.querySelectorAll('.choice-cell');
        const submitButton = document.getElementById('submit-answer-button');
        let selectedCell = null;
        let selectedValue = null;

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
                selectedValue = cell.dataset.value;
                updateCellStyles(cell, true);
                
                // Enable submit button
                if (submitButton) {
                    submitButton.style.opacity = '1';
                    submitButton.style.pointerEvents = 'auto';
                }
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
            if (window.userAnswers && window.userAnswers[currentQuestionIndex] === cell.dataset.value) {
                selectedCell = cell;
                selectedValue = cell.dataset.value;
                updateCellStyles(cell, true);
                
                // Enable submit button if answer already selected
                if (submitButton) {
                    submitButton.style.opacity = '1';
                    submitButton.style.pointerEvents = 'auto';
                }
            }
        });
        
        // Add submit button functionality
        if (submitButton) {
            submitButton.addEventListener('click', () => {
                if (selectedValue) {
                    // Save the answer
                    window.userAnswers[currentQuestionIndex] = selectedValue;
                    
                    // Show the answer container
                    displayAnswer(selectedValue);
                    
                    // Check if all questions are answered
                    const allQuestionsAnswered = window.userAnswers.length === window.questions.length && 
                                               window.userAnswers.every(answer => answer !== null);
                    
                    // Show completion status if all questions are answered
                    if (allQuestionsAnswered) {
                        displayCompletionStatus();
                    }
                }
            });
        }
        
        console.log('Choice cells set up:', choiceCells.length);
    } else {
        console.error('Choices container element not found');
        // Create it if it doesn't exist
        const newChoices = document.createElement('div');
        newChoices.id = 'choices-container';
        newChoices.className = 'choices-container';
        newChoices.innerHTML = `
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
            <div class="submit-button-container" style="
                display: flex;
                justify-content: center;
                margin-top: 20px;
                width: 100%;
            ">
                <button id="submit-answer-button" style="
                    padding: 12px 30px;
                    font-size: 16px;
                    font-weight: 500;
                    background-color: #4299e1;
                    color: white;
                    border: none;
                    border-radius: 8px;
                    cursor: pointer;
                    transition: all 0.2s ease;
                    box-shadow: 0 2px 4px rgba(66, 153, 225, 0.2);
                    opacity: 0.7;
                    pointer-events: none;
                ">提交答案</button>
            </div>
        `;
        questionsContainer.appendChild(newChoices);
        
        // Add event listeners to the newly created choice cells
        const choiceCells = newChoices.querySelectorAll('.choice-cell');
        const submitButton = document.getElementById('submit-answer-button');
        let selectedValue = null;
        
        choiceCells.forEach(cell => {
            cell.addEventListener('click', function() {
                // Update UI to show this cell as selected
                choiceCells.forEach(c => {
                    c.style.borderColor = '#e2e8f0';
                    c.style.backgroundColor = 'white';
                    c.querySelector('.choice-indicator').style.backgroundColor = '#edf2f7';
                    c.querySelector('.choice-indicator').style.color = '#4a5568';
                });
                
                this.style.borderColor = '#4299e1';
                this.style.backgroundColor = '#ebf8ff';
                this.querySelector('.choice-indicator').style.backgroundColor = '#4299e1';
                this.querySelector('.choice-indicator').style.color = 'white';
                
                // Store selected value
                selectedValue = this.dataset.value;
                
                // Enable submit button
                if (submitButton) {
                    submitButton.style.opacity = '1';
                    submitButton.style.pointerEvents = 'auto';
                }
            });
        });
        
        // Add submit button functionality
        if (submitButton) {
            submitButton.addEventListener('click', function() {
                if (selectedValue) {
                    // Save the answer
                    window.userAnswers[currentQuestionIndex] = selectedValue;
                    
                    // Show answer and explanation
                    displayAnswer(selectedValue);
                    
                    // Check if all questions are answered
                    const allQuestionsAnswered = window.userAnswers.length === window.questions.length && 
                                               window.userAnswers.every(answer => answer !== null);
                    
                    // Show completion status if all questions are answered
                    if (allQuestionsAnswered) {
                        displayCompletionStatus();
                    }
                }
            });
        }
    }
    
    // Function to display answer and explanation
    function displayAnswer(selectedValue) {
        const currentQuestion = questions[currentQuestionIndex];
        const answerContainer = document.getElementById('answer-container');
        const answerResult = document.getElementById('answer-result');
        const answerExplanation = document.getElementById('answer-explanation');
        
        if (!currentQuestion.userAnswer) {
            currentQuestion.userAnswer = selectedValue;
            
            // Check if all questions have been answered
            const allQuestionsAnswered = questions.every(q => q.userAnswer);
            
            // Enable the evaluate button if all questions are answered
            const evaluateButton = document.getElementById('evaluate-btn');
            if (evaluateButton) {
                evaluateButton.disabled = !allQuestionsAnswered;
            }
            
            // Show the answer container
            answerContainer.classList.remove('hidden');
            
            // Display whether the answer was correct or not
            const isCorrect = selectedValue === currentQuestion.answer;
            answerResult.textContent = isCorrect ? '✓ 回答正确！' : '✗ 回答错误！';
            answerResult.style.color = isCorrect ? '#27ae60' : '#e74c3c';
            
            // Display the explanation
            answerExplanation.innerHTML = formatMathExpressions(currentQuestion.explanation);
            
            // Disable all radio buttons for this question
            const radioButtons = document.querySelectorAll('input[type="radio"]');
            radioButtons.forEach(radio => {
                radio.disabled = true;
            });
            
            // Update navigation controls
            updateNavigationButtons();
        }
    }
    
    // Style the answer container when showing results
    if (window.userAnswers && window.userAnswers[currentQuestionIndex]) {
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
            
            const selectedAnswer = window.userAnswers[currentQuestionIndex];
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
                    ? `<svg width="20" height="20" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                        <path d="M20,6 L9,17 L4,12" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"></path>
                        </svg> 正确！答案是：${correctAnswer}`
                    : `<svg width="20" height="20" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                        <path d="M18 6L6 18M6 6l12 12" stroke="currentColor" stroke-width="2"  stroke-linecap="round" stroke-linejoin="round"></path>
                      </svg> 错误。正确答案是：${correctAnswer}`;
                
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
            
            // Disable the submit button if already submitted
            const submitButton = document.getElementById('submit-answer-button');
            if (submitButton) {
                submitButton.disabled = true;
                submitButton.style.opacity = '0.5';
                submitButton.style.pointerEvents = 'none';
                submitButton.textContent = '已提交';
            }
        }
    } else {
        const answerContainer = document.getElementById('answer-container');
        if (answerContainer) {
            answerContainer.classList.add('hidden');
        }
    }
    
    // Use the existing createContainer reference
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
    console.log('updateNavigationButtons called', currentQuestionIndex, window.questions ? window.questions.length : 0);
    
    const prevButton = document.getElementById('prev-question-button');
    const nextButton = document.getElementById('next-question-button');
    
    if (prevButton) {
        prevButton.disabled = !window.questions || currentQuestionIndex <= 0;
    }
    
    if (nextButton) {
        nextButton.disabled = !window.questions || currentQuestionIndex >= window.questions.length - 1;
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
    // This function is now empty as we don't want to show completion status in navigation controls
    return;
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
    
    // Store score data in window object so it can be accessed by showEvaluationModal
    window.testScore = {
        totalQuestions: window.questions.length,
        correctCount: correctCount,
        scorePercentage: scorePercentage
    };
    
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

// Helper function to get score grade based on percentage
function getScoreGrade(percentage) {
    if (percentage >= 90) return 'A (优秀)';
    if (percentage >= 80) return 'B (良好)';
    if (percentage >= 70) return 'C (中等)';
    if (percentage >= 60) return 'D (及格)';
    return 'E (不及格)';
}

// Helper function to get color for score grade
function getScoreGradeColor(percentage) {
    if (percentage >= 90) return '#38a169'; // Green for A
    if (percentage >= 80) return '#4299e1'; // Blue for B
    if (percentage >= 70) return '#805ad5'; // Purple for C
    if (percentage >= 60) return '#ed8936'; // Orange for D
    return '#e53e3e'; // Red for E
}

// Make handleEvaluateClick globally available for the onclick attribute
window.handleEvaluateClick = handleEvaluateClick;

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
        
        // Get score data from window object
        const scoreData = window.testScore || { totalQuestions: 0, correctCount: 0, scorePercentage: 0 };
        
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
                
                <!-- Score Summary Card -->
                <div class="score-card" style="
                    background: #ebf8ff;
                    border-radius: 10px;
                    padding: 20px;
                    margin-bottom: 20px;
                    box-shadow: 0 2px 5px rgba(0, 0, 0, 0.05);
                    border-left: 5px solid #3182ce;
                    display: flex;
                    justify-content: space-around;
                    flex-wrap: wrap;
                    gap: 10px;
                ">
                    <div class="score-item" style="
                        text-align: center;
                        padding: 10px;
                        min-width: 120px;
                    ">
                        <div style="font-size: 14px; color: #4a5568; margin-bottom: 5px;">总题数</div>
                        <div style="font-size: 24px; font-weight: bold; color: #2c5282;">${scoreData.totalQuestions}</div>
                    </div>
                    
                    <div class="score-item" style="
                        text-align: center;
                        padding: 10px;
                        min-width: 120px;
                    ">
                        <div style="font-size: 14px; color: #4a5568; margin-bottom: 5px;">答对题数</div>
                        <div style="font-size: 24px; font-weight: bold; color: #2c5282;">${scoreData.correctCount}</div>
                    </div>
                    
                    <div class="score-item" style="
                        text-align: center;
                        padding: 10px;
                        min-width: 120px;
                    ">
                        <div style="font-size: 14px; color: #4a5568; margin-bottom: 5px;">正确率</div>
                        <div style="font-size: 24px; font-weight: bold; color: ${scoreData.scorePercentage >= 60 ? '#38a169' : '#e53e3e'};">
                            ${scoreData.scorePercentage.toFixed(1)}%
                        </div>
                    </div>
                    
                    <div class="score-item" style="
                        text-align: center;
                        padding: 10px;
                        min-width: 120px;
                    ">
                        <div style="font-size: 14px; color: #4a5568; margin-bottom: 5px;">等级评定</div>
                        <div style="font-size: 24px; font-weight: bold; color: ${getScoreGradeColor(scoreData.scorePercentage)};">
                            ${getScoreGrade(scoreData.scorePercentage)}
                        </div>
                    </div>
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
    console.log('handleGenerateQuestionsClick started');
    
    currentQuestionIndex = 0;
    
    // Hide empty state explicitly when generate button is clicked
    const emptyState = document.querySelector('.empty-state');
    if (emptyState) {
        emptyState.style.display = 'none';
    }

    // hide all controls during question loading
    const questionState = document.querySelector('.question-text');
    if (questionState) {
        questionState.style.display = 'none';
    }

    const choiceState = document.querySelector('.choices-container');
    if (choiceState) {
        choiceState.style.display = 'none';
    }

    const answerState = document.querySelector('.answer-container');
    if (answerState) {
        answerState.style.display = 'none';
    }

    const navigationState = document.querySelector('.navigation-controls');
    if (navigationState) {
        navigationState.style.display = 'none';
    }

    // Get values from the dropdowns using the new IDs (without -sidebar suffix)
    const schoolSelect = document.getElementById('school-select-sidebar');
    const gradeSelect = document.getElementById('grade-select-sidebar');
    const subjectSelect = document.getElementById('subject-select');
    const semesterSelect = document.getElementById('semester-select');
    const difficultySelect = document.getElementById('difficulty-select');
    const questionCountSelect = document.getElementById('question-count-select');
    const questionsDisplayContainer = document.getElementById('questions-display-container');
    
    // Validate that we have all the required elements and values
    if (!schoolSelect || !schoolSelect.value ||
        !gradeSelect || !gradeSelect.value ||
        !subjectSelect || !subjectSelect.value ||
        !semesterSelect || !semesterSelect.value ||
        !difficultySelect || !difficultySelect.value ||
        !questionCountSelect || !questionCountSelect.value) {
        
        console.error('Missing required fields');
        showSystemMessage('请完成所有必填项', 'error');
        return;
    }
    
    // Show loading indicator
    showLoadingIndicator();
    
    // Continue with the rest of the function...
    console.log('Proceeding with question generation');
    
    // The rest of your handleGenerateQuestionsClick function should remain unchanged
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
    7. 确保选项ABCD里必须有且只有一个正确答案
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
                    const createContainer = document.getElementById('create-container');
                    if (!createContainer) {
                        console.error('Create container not found');
                        throw new Error('Create container not found');
                    }

                    // Check if there's an empty state and hide it
                    const emptyState = document.getElementById('empty-state');
                    if (emptyState) {
                        emptyState.style.display = 'none';
                    }

                    // Create the new container
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
                    
                    // Find the navigation controls to insert before
                    const navigationControls = createContainer.querySelector('.navigation-controls');
                    if (navigationControls) {
                        createContainer.insertBefore(newContainer, navigationControls);
                    } else {
                        // If no navigation controls, append to the end
                        createContainer.appendChild(newContainer);
                    }
                    
                    // Get a fresh reference to the newly created container
                    questionsDisplayContainer = document.getElementById('questions-display-container');
                    if (!questionsDisplayContainer) {
                        console.error('Failed to create questions display container');
                        throw new Error('Failed to create questions display container');
                    }
                } else {
                    // If it exists, make sure it's visible
                    questionsDisplayContainer.classList.remove('hidden');
                    
                    // Hide the empty state if it exists
                    const emptyState = document.getElementById('empty-state');

                    if (emptyState) {
                        emptyState.style.display = 'none';
                        }
                }
                
                // If it exists, make sure it's visible
                questionState.style.display = 'block';
                choiceState.style.display = 'block';
                answerState.style.display = 'block';
                navigationState.style.display = 'block';

                // Now we can safely use questionsDisplayContainer
                // Display the first question
                displayCurrentQuestion();
                updateNavigationButtons();
                
                // Set up navigation button event listeners
                setupNavigationButtons();
                
                // Show success message
                // showSystemMessage(`已生成 ${parsedQuestions.length} 道 ${schoolType}${grade}${semester}${subject} ${difficulty}难度题目`, 'success');
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
                const generateQuestionsButton = document.getElementById('generate-btn');
                if (generateQuestionsButton) {
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
                questionsDisplayContainer.classList.add('hidden');
            }
            
            // Reset button state
            const generateQuestionsButton = document.getElementById('generate-btn');
            if (generateQuestionsButton) {
                generateQuestionsButton.textContent = '出题';
                generateQuestionsButton.disabled = false;
            }
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
            background-color: AntiqueWhite;
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
        loadingText.textContent = '出题中，请稍候...';
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
        
        const questionsContainer = document.querySelector('.questions-container');
        if (questionsContainer) {
            questionsContainer.appendChild(navigationControls);
        }
    }
    
    // Helper function to clear displayed answers
    function clearDisplayedAnswers() {
        // Hide answer container
        const answerContainer = document.getElementById('answer-container');
        if (answerContainer) {
            answerContainer.classList.add('hidden');
            
            // Reset answer result and explanation
            const answerResult = document.getElementById('answer-result');
            if (answerResult) {
                answerResult.textContent = '';
            }
            
            const answerExplanation = document.getElementById('answer-explanation');
            if (answerExplanation) {
                answerExplanation.textContent = '';
            }
        }
        
        // Reset submit button to enable it for new selection
        const submitButton = document.getElementById('submit-answer-button');
        if (submitButton) {
            submitButton.disabled = false;
            submitButton.style.opacity = '0.7';
            submitButton.style.pointerEvents = 'none';
            submitButton.textContent = '提交答案';
        }
        
        // Clear selected choices
        const choiceItems = document.querySelectorAll('.choice-item.selected');
        choiceItems.forEach(item => {
            item.classList.remove('selected');
        });
        
        // Reset choice cells
        const choiceCells = document.querySelectorAll('.choice-cell');
        choiceCells.forEach(cell => {
            cell.classList.remove('selected');
            // Remove any selection styling
            cell.style.borderColor = '#e2e8f0';
            cell.style.backgroundColor = 'white';
            
            // Reset the choice indicator styling
            const indicator = cell.querySelector('.choice-indicator');
            if (indicator) {
                indicator.style.backgroundColor = '#edf2f7';
                indicator.style.color = '#4a5568';
            }
        });
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
            if (currentQuestionIndex > 0) {
                clearDisplayedAnswers();
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
                clearDisplayedAnswers();
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
            if (window.questions && currentQuestionIndex < window.questions.length - 1) {
                clearDisplayedAnswers();
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
            if (window.questions && currentQuestionIndex < window.questions.length - 1) {
                clearDisplayedAnswers();
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
                window.userAnswers[currentQuestionIndex] = option;
                
                // Update UI to show selected option
                document.querySelectorAll('.option-button').forEach(btn => {
                    btn.classList.remove('selected');
                });
                this.classList.add('selected');
                
                // Check if answer is correct
                const currentQuestion = window.questions[currentQuestionIndex];
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
        const subjectSelect = document.getElementById('subject-select');
        if (subjectSelect) {
            subjectSelect.innerHTML = '';
            subjectOptions.forEach(subject => {
                const option = document.createElement('option');
                option.value = subject;
                option.textContent = subject;
                subjectSelect.appendChild(option);
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
            const subjectSelect = document.getElementById('subject-select');
            if (subjectSelect) {
                subjectSelect.innerHTML = '';
                subjectOptions.forEach(subject => {
                    const option = document.createElement('option');
                    option.value = subject;
                    option.textContent = subject;
                    subjectSelect.appendChild(option);
                });
            }
        });
    }
    
    // Add click handler for sidebar generate button
    /*
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
    */
    
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
    // Function completely removed to disable empty state functionality
    console.log('Empty state functionality disabled');
    return; // Do nothing
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

// Add this at the end of the file to ensure buttons are set up when the page loads
document.addEventListener('DOMContentLoaded', function() {
    // Set up chat buttons when the page loads
    setTimeout(setupChatButtons, 300);
});

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
    // inspectDropdowns();
    
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
    
    // 
    // heck if the chat interface already exists
    if (document.getElementById('chat-interface')) {
        console.log('Chat interface already exists');
        return; // Already exists, no need to create it
    }
    
    //console.log('Creating new chat interface elements');
    
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
        const subjects = ['语文', '数学', '英语', '科学'];
        subjects.forEach((subject, index) => {
            const option = document.createElement('option');
            option.value = `subject${index + 1}`;
            option.textContent = subject;
            subjectSelect.appendChild(option);
        });
    } else if (school === 'middle') {
        const subjects = ['语文', '数学', '英语', '物理', '化学', '生物', '历史', '地理', '道德与法治'];
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
    console.log('Getting simplified educational context');
    
    // Initialize with default values
    let school = '未指定学校类型';
    let grade = '未指定年级';
    
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
            }
        }
    });
    
    console.log('Simplified educational context:', { school, grade });
    return { school, grade };
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
        /*
        const mainContent = document.querySelector('.main-content');
        if (mainContent) {
            mainContent.appendChild(newPoetryPanel);
            console.log('Poetry panel added to the document');
        } else {
            console.error('Main content element not found');
        }
        */
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
            /*
            if (poetryPanel) {
                poetryPanel.classList.remove('hidden');
                console.log('Poetry panel is now visible');
            } else {
                console.error('Poetry panel not found');
            }
            */
            
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
    
/*
    // Update poetry style options based on selected type
    function updatePoetryStyleOptions(poetryType) {
        console.log('Updating poetry style options for type:', poetryType);
        console.log('loading updatePoetryStyleOptions function from line 4870');
        
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
*/
    
    // Add event listener to Learn Poetry button
    document.addEventListener('click', function(event) {
        if (event.target && event.target.id === 'learn-poetry-button') {
            console.log('Learn poetry button clicked via delegation');
            
            // Get selected values
            const poetryTypeSelect = document.getElementById('poetry-type-select');
            const poetryStyleSelect = document.getElementById('poetry-style-select');
            const poetryQtySelect = document.getElementById('poetry-qty-select');
            const poetryType = poetryTypeSelect ? poetryTypeSelect.value : '唐诗';
            const poetryStyle = poetryStyleSelect ? poetryStyleSelect.value : '山水';
            const poetryQty = poetryQtySelect ? poetryQtySelect.value : '10';
            
            // Call the API function directly - no mock data
            handleLearnPoetryClick();
        }
    });

    // Get user's educational context
    const school = document.getElementById('school-select-sidebar');
    const grade = document.getElementById('grade-select-sidebar');
    const poetryType = document.getElementById('poetry-type-select');
    const poetryStyle = document.getElementById('poetry-style-select');

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
    const poetryQtySelect = document.getElementById('poetry-qty-select');
    
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
    const wordContainer = document.getElementById('word-container');
    
    // Store original parent nodes
    let poetryParent = null;
    let qaParent = null;
    let createParent = null;
    let wordParent = null;
    
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

    if (wordContainer) {
        wordParent = wordContainer.parentNode;
    }
    
    // Get all buttons
    const poetryButton = document.getElementById('poetry-button');
    const qaButton = document.getElementById('qa-button');
    const createButton = document.getElementById('create-button');
    const wordButton = document.getElementById('word-button');
    
    // Get the content area where containers should be placed
    const contentArea = document.querySelector('.content-area');
    
    // Function to handle tab switching
    function handleTabSwitch(containerType) {
        console.log('Switching to tab:', containerType);
        
        // First, hide all containers
        if (qaContainer && qaContainer.parentNode) {
            qaContainer.parentNode.removeChild(qaContainer);
        }
        
        if (createContainer && createContainer.parentNode) {
            createContainer.parentNode.removeChild(createContainer);
        }
        
        if (poetryContainer && poetryContainer.parentNode) {
            poetryContainer.parentNode.removeChild(poetryContainer);
        }
        
        // Hide all tab content
        document.querySelectorAll('.tab-content').forEach(content => {
            content.style.display = 'none';
        });
        
        // Reset active states for sidebar buttons
        if (qaButton) qaButton.classList.remove('active');
        if (createButton) createButton.classList.remove('active');
        if (poetryButton) poetryButton.classList.remove('active');
        if (wordButton) wordButton.classList.remove('active');
        
        // Set the appropriate button active based on containerType
        if (containerType === 'qa' && qaButton) {
            qaButton.classList.add('active');
            contentArea.appendChild(qaContainer);
        } else if (containerType === 'create' && createButton) {
            createButton.classList.add('active');
            contentArea.appendChild(createContainer);
        } else if (containerType === 'poetry' && poetryButton) {
            poetryButton.classList.add('active');
            contentArea.appendChild(poetryContainer);
        } else if (containerType === 'vocabulary' && wordButton) {
            wordButton.classList.add('active');
            
            // Show vocabulary content
            const vocabularyContent = document.getElementById('vocabulary-content');
            if (vocabularyContent) {
                vocabularyContent.style.display = 'block';
            } else {
                console.warn('Vocabulary content not found!');
                // Create it if it doesn't exist
                ensureVocabularyTabSetup();
                const newVocabularyContent = document.getElementById('vocabulary-content');
                if (newVocabularyContent) {
                    newVocabularyContent.style.display = 'block';
                }
            }
        }
        
        // Also handle tab selection for any tabs
        document.querySelectorAll('.tab').forEach(tab => {
            tab.classList.remove('active');
            if (tab.dataset.tab === containerType) {
                tab.classList.add('active');
            }
        });
        
        // Show tab content if it exists
        if (containerType !== 'vocabulary' && containerType !== 'qa' && 
            containerType !== 'create' && containerType !== 'poetry') {
            const tabContent = document.getElementById(`${containerType}-content`);
            if (tabContent) {
                tabContent.style.display = 'block';
            }
        }
        
        // Always update the UI state
        if (typeof handleResize === 'function') handleResize();
        if (typeof resetContentArea === 'function') resetContentArea();
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

    if (wordButton) {
        wordButton.addEventListener('click', function() {
            console.log('Word button clicked');
            handleTabSwitch('vocabulary');  // Changed from 'word' to 'vocabulary'
        });
    }
    
    // Initialize with QA container
    handleTabSwitch('qa');
    
    // Global state for poems
    let poemState = {
        poems: [],
        currentIndex: 0
    };
    
    // Function to display the current poem
    function displayCurrentPoem() {
        if (!window.poemState || !window.poemState.poems || window.poemState.poems.length === 0) {
            console.error('No poems available to display');
            return;
        }
        
        const poem = window.poemState.poems[window.poemState.currentIndex];
        console.log('Displaying poem:', poem, 'Current index:', window.poemState.currentIndex);
        
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
            if (poem.explanation) {
                // Convert explanation to string if it's an object
                const explanationText = typeof poem.explanation === 'object' 
                    ? JSON.stringify(poem.explanation, null, 2) 
                    : poem.explanation;
                poemExplanation.innerHTML = explanationText;
            } else {
                poemExplanation.innerHTML = '无赏析';
            }
        }
        
        if (poemCounter) {
            poemCounter.textContent = `${window.poemState.currentIndex + 1} / ${window.poemState.poems.length}`;
        }
        
        // Update navigation buttons
        updatePoemNavigationButtons();
    }
    
    // Function to update navigation buttons
    function updatePoemNavigationButtons() {
        const prevButton = document.getElementById('prev-poem-button');
        const nextButton = document.getElementById('next-poem-button');
        
        if (prevButton) {
            prevButton.disabled = window.poemState.currentIndex === 0;
            console.log('Prev button disabled:', prevButton.disabled);
        }
        
        if (nextButton) {
            nextButton.disabled = window.poemState.currentIndex === window.poemState.poems.length - 1;
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
                if (window.poemState.currentIndex > 0) {
                    window.poemState.currentIndex--;
                    window.displayCurrentPoem();
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
                if (window.poemState.currentIndex < window.poemState.poems.length - 1) {
                    window.poemState.currentIndex++;
                    window.displayCurrentPoem();
                }
            });
        }
    }
    
    // REMOVE the event delegation approach to avoid duplicate handling
    // We'll rely solely on the direct event listeners set up in setupPoemNavigationButtons
    
    // Function to handle learn poetry button click
    window.handleLearnPoetryClick = async function () {
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
        const currentQtySelect = document.getElementById('poetry-qty-select');
        
        if (!currentTypeSelect || !currentStyleSelect) {
            console.error('Poetry type or style select not found');
            showSystemMessage('无法获取诗词类型和风格信息', 'error');
            return;
        }
        
        const poetryType = currentTypeSelect.value;
        const poetryStyle = currentStyleSelect.value;
        const poetryQty = currentQtySelect.value;
        
        console.log(`Generating poems for: ${school} ${grade}, Type: ${poetryType}, Style: ${poetryStyle}`);
        
        // Show loading state
        const poetryEmptyState = document.getElementById('poetry-empty-state');
        const poetryDisplay = document.getElementById('poetry-display');
        let loadingIndicator = document.getElementById('poetry-loading');
        
        // Hide empty state, show loading
        if (poetryEmptyState) poetryEmptyState.style.display = 'none';
        if (poetryDisplay) poetryDisplay.classList.remove('active');
        
        // Create and show loading indicator
        if (!loadingIndicator) {
            loadingIndicator = document.createElement('div');
            loadingIndicator.id = 'poetry-loading';
            loadingIndicator.innerHTML = `
                <div class="spinner"></div>
                <p>十里走马正疾驰，五里扬鞭未敢停...</p>
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
            const prompt = `请为${school}${grade}的学生推荐${poetryQty}首著名的古代${poetryType}，${stylePrompt}。
            请选择中国文学史上最著名、最经典的作品，这些作品应该是真实存在的，不要创作新的内容。
            
            【重要】这些诗词必须严格符合${school}${grade}学生的认知水平和学习需求：
            1. 诗词长度：内容完整，不能节选
            2. 难度要求：选择难度${complexityLevel}、词汇量${vocabularyLevel}
            3. 内容要求：主题积极向上，意境清晰，适合${school}${grade}学生理解和背诵
            4. 教育价值：具有明确的情感表达和思想内涵，能够引发学生共鸣和思考
            
            解释和赏析要求：
            - 原文要求内容完整，不能节选或删减
            - 创作背景介绍要适当且丰富有趣，并与学生的知识水平相符
            - 赏析要逐句翻译，重点解释难词难句，并用${school}${grade}学生能理解的现代语言翻译原文
            - 分析要点明诗词的意境、情感和艺术特色，但避免过于学术化的术语，并介绍诗词曲的艺术特色和文学价值
            
            每首诗都应包含以下内容：
            1. 题目
            2. 作者
            3. 原文
            4. 创作背景
            5. 赏析
            
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
                        throw new Error('Could not find JSON in response');
                    }
                }
                
                // Validate the parsed poems
                if (!Array.isArray(poems) || poems.length === 0) {
                    throw new Error('No valid poems found in the response');
                }
                
                for (let i = 0; i < poems.length; i++) {
                    const poem = poems[i];
                    if (!poem.title || !poem.author || !poem.content) {
                        console.warn(`Poem at index ${i} is missing required fields`);
                        poems[i] = {
                            title: poem.title || 'Unknown Title',
                            author: poem.author || 'Unknown Author',
                            content: poem.content || 'No content available',
                            background: poem.background || 'No background information available',
                            explanation: poem.explanation || poem.analysis || 'No explanation available'
                        };
                    }
                }
                
                console.log(`Successfully parsed ${poems.length} poems`);
                
                // Store the poems and display the first one
                currentPoems = poems;
                currentPoemIndex = 0;
                
                // Update the poemState with the parsed poems
                window.poemState = {
                    poems: poems,
                    currentIndex: 0
                };
                
                console.log('Poems stored in poemState:', window.poemState.poems.length, 'poems');
                
                // Hide loading, show poetry display
                const loadingIndicator = document.getElementById('poetry-loading');
                if (loadingIndicator) {
                    loadingIndicator.style.display = 'none';
                }
                
                // Show poetry display and display the poem
                showPoetryDisplay();
                displayCurrentPoem();
                
                // Update navigation buttons if they exist
                if (typeof updatePoemNavigationButtons === 'function') {
                    updatePoemNavigationButtons();
                }
                
                console.log('Poetry display updated successfully');
                
            } catch (jsonParseError) {
                console.error('Error parsing poems from API response:', jsonParseError);
                
                // Hide loading indicator
                const loadingIndicator = document.getElementById('poetry-loading');
            if (loadingIndicator) {
                loadingIndicator.style.display = 'none';
            }
            
                // Show error in empty state
                const poetryEmptyState = document.getElementById('poetry-empty-state');
                if (poetryEmptyState) {
                    poetryEmptyState.innerHTML = `
                        <div class="error-icon">⚠️</div>
                        <h3>解析诗词失败</h3>
                        <p>${jsonParseError.message || '无法解析服务器返回的数据。'}</p>
                        <button class="retry-button">重试</button>
                    `;
                    poetryEmptyState.style.display = 'flex';
                    
                    // Add event listener to retry button
                    const retryButton = poetryEmptyState.querySelector('.retry-button');
                    if (retryButton) {
                        retryButton.addEventListener('click', handleLearnPoetryClick);
                    }
                }
                
                throw jsonParseError;
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
        
    console.log('Poetry functionality initialized');
});

// Get the school select element
const schoolSelect = document.getElementById('school-select-sidebar');
const subjectSelect = document.getElementById('subject-select');

// Initialize the subject dropdown if school is already selected on page load
document.addEventListener('DOMContentLoaded', function() {
    if (schoolSelect.value) {
        // Trigger the change event to populate subjects
        const event = new Event('change');
        schoolSelect.dispatchEvent(event);
    }
});

// Make sure handleGenerateQuestionsClick is in the global scope
window.handleGenerateQuestionsClick = handleGenerateQuestionsClick;

// Enhance the school-subject linkage
document.addEventListener('DOMContentLoaded', function() {
    const schoolSelect = document.getElementById('school-select');
    const subjectSelect = document.getElementById('subject-select');
    const gradeSelect = document.getElementById('grade-select');
    const generateBtn = document.getElementById('generate-btn');
    
    // Add visual feedback for selections
    function addSelectionFeedback(selectElement) {
        selectElement.addEventListener('change', function() {
            if (this.value) {
                this.classList.add('selected');
            } else {
                this.classList.remove('selected');
            }
            
            // Check if all required fields are filled
            checkRequiredFields();
        });
    }
    
    // Add visual feedback to the generate button based on form completion
    function checkRequiredFields() {
        const requiredSelects = [schoolSelect, gradeSelect, subjectSelect, 
                                document.getElementById('semester-select'),
                                document.getElementById('difficulty-select'),
                                document.getElementById('question-count-select')];
        
        const allFilled = requiredSelects.every(select => select && select.value);
        
        if (generateBtn) {
            if (allFilled) {
                generateBtn.classList.add('ready');
                generateBtn.disabled = false;
            } else {
                generateBtn.classList.remove('ready');
                generateBtn.disabled = true;
            }
        }
    }
    
    // Apply to all select elements
    const allSelects = document.querySelectorAll('.control-panel select');
    allSelects.forEach(addSelectionFeedback);
    
    // Initial check
    checkRequiredFields();
    
    // Make sure the generate button is linked to the handler
    if (generateBtn) {
        generateBtn.addEventListener('click', handleGenerateQuestionsClick);
        console.log('Generate button event listener attached');
    }
});

// Add this to your existing JavaScript to enhance the poetry page interactivity

document.addEventListener('DOMContentLoaded', function() {
    // Wrap each line of the poem in a span for hover effects
    const poemContent = document.querySelector('.poem-content');
    if (poemContent) {
        const lines = poemContent.innerHTML.split('\n');
        let wrappedContent = '';
        
        lines.forEach(line => {
            if (line.trim()) {
                wrappedContent += `<span class="poem-line">${line}</span>\n`;
            } else {
                wrappedContent += '\n';
            }
        });
        
        poemContent.innerHTML = wrappedContent;
    }
    
    // Add subtle parallax effect to poem display
    const poemDisplay = document.querySelector('.poem-display');
    if (poemDisplay) {
        poemDisplay.addEventListener('mousemove', function(e) {
            const xAxis = (window.innerWidth / 2 - e.pageX) / 25;
            const yAxis = (window.innerHeight / 2 - e.pageY) / 25;
            poemDisplay.style.transform = `rotateY(${xAxis}deg) rotateX(${yAxis}deg) translateY(-3px)`;
        });
        
        // Reset transform when mouse leaves
        poemDisplay.addEventListener('mouseleave', function() {
            poemDisplay.style.transform = 'rotateY(0deg) rotateX(0deg) translateY(-3px)';
        });
    }
    
    // Add visual feedback when selections are made
    const poetrySelects = document.querySelectorAll('.poetry-select');
    poetrySelects.forEach(select => {
        select.addEventListener('change', function() {
            if (this.value) {
                this.classList.add('selected');
                this.closest('.selector-group').classList.add('has-selection');
            } else {
                this.classList.remove('selected');
                this.closest('.selector-group').classList.remove('has-selection');
            }
        });
    });
    
    // Add animation when poem sections are scrolled into view
    const poemSections = document.querySelectorAll('.poem-section');
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('animate-in');
                observer.unobserve(entry.target);
            }
        });
    }, { threshold: 0.1 });
    
    poemSections.forEach(section => {
        observer.observe(section);
    });
});

// Fix poem sections display in the loadPoemDetails function
function loadPoemDetails(poem) {
    // ... existing code ...
    
    // Make sure the background and analysis sections are created and populated
    const poemDisplay = document.querySelector('.poem-display') || document.getElementById('poem-display');
    
    // Check if background section exists, create if not
    let backgroundSection = document.querySelector('.poem-background-section');
    if (!backgroundSection) {
        backgroundSection = document.createElement('div');
        backgroundSection.className = 'poem-section poem-background-section';
        poemDisplay.parentNode.insertBefore(backgroundSection, poemDisplay.nextSibling);
    }
    
    // Populate background section
    backgroundSection.innerHTML = `
        <h3>创作背景</h3>
        <div class="poem-background">${poem.background || '暂无创作背景信息'}</div>
    `;
    
    // Check if analysis section exists, create if not
    let analysisSection = document.querySelector('.poem-analysis-section');
    if (!analysisSection) {
        analysisSection = document.createElement('div');
        analysisSection.className = 'poem-section poem-analysis-section';
        backgroundSection.parentNode.insertBefore(analysisSection, backgroundSection.nextSibling);
    }
    
    // Populate analysis section
    let analysisContent = '';

    if (!poem.analysis && !poem.explanation) {
        analysisContent = '暂无赏析信息';
    } else {
        const analysis = poem.analysis || poem.explanation;
        
        if (typeof analysis === 'object') {
            try {
                // Check if it has a text or content property
                if (analysis.text) {
                    analysisContent = analysis.text;
                } else if (analysis.content) {
                    analysisContent = analysis.content;
                } else {
                    // If no known property, stringify the object with formatting
                    analysisContent = Object.entries(analysis)
                        .map(([key, value]) => `<strong>${key}:</strong> ${value}`)
                        .join('<br>');
                }
            } catch (error) {
                console.error('Error formatting analysis:', error);
                analysisContent = '赏析格式错误，请重新生成';
            }
        } else {
            analysisContent = analysis;
        }
    }

    analysisSection.innerHTML = `
        <h3>赏析</h3>
        <div class="poem-explanation">${analysisContent}</div>
    `;
    
    // Make sections visible
    backgroundSection.style.display = 'block';
    analysisSection.style.display = 'block';
}

// Add event listeners after DOM loads
document.addEventListener('DOMContentLoaded', function() {
    // ... existing code ...
    
    // Tab switching
    const tabs = document.querySelectorAll('.tab');
    tabs.forEach(tab => {
        tab.addEventListener('click', () => handleTabSwitch(tab.dataset.tab));
    });
    
    // Add vocabulary related event listeners
    document.getElementById('load-vocabulary-btn').addEventListener('click', handleLoadVocabularyClick);
    document.getElementById('next-word-btn').addEventListener('click', () => navigateWordCard(1));
    document.getElementById('prev-word-btn').addEventListener('click', () => navigateWordCard(-1));
    
    // ... existing code ...
});

// Handle loading vocabulary words
async function handleLoadVocabularyClick() {
    const loadBtn = document.getElementById('load-vocabulary-btn');
    const vocabularyContainer = document.getElementById('vocabulary-container');
    
    loadBtn.disabled = true;
    loadBtn.innerHTML = '加载中...';
    
    // Display loading message in the vocabulary container
    vocabularyContainer.innerHTML = `
        <div class="initial-message loading-message">
            <div class="loading-spinner vocabulary-spinner"></div>
            <p>词汇加载中，请耐心等待...</p>
            <p>Loading ten vocabularies, please be patient...</p>
        </div>
    `;
    
    try {
        // Get education context from sidebar
        const schoolSelect = document.getElementById('school-select-sidebar');
        const gradeSelect = document.getElementById('grade-select-sidebar');
        
        // Check if the elements exist before accessing their values
        if (!schoolSelect || !gradeSelect) {
            console.error('School or grade select elements not found');
            throw new Error('未找到学校或年级选择器，请确保已经设置好教育背景');
        }
        
        const school = schoolSelect.value;
        const grade = gradeSelect.value;
        
        // Add side navigation buttons if they don't exist
        addVocabularySideNavButtons();
        
        // Fetch vocabulary words
        vocabularyWords = await fetchVocabularyWords(school, grade);
        
        if (vocabularyWords && vocabularyWords.length > 0) {
            currentWordIndex = 0;
            displayWordCard(currentWordIndex);
            updateSideNavigationButtons();
        } else {
            throw new Error('无法获取词汇列表，请检查选择的学校和年级');
        }
    } catch (error) {
        console.error('Error loading vocabulary:', error);
        showVocabularyError(error.message);
    } finally {
        loadBtn.disabled = false;
        loadBtn.innerHTML = '学习词汇';
    }
}

// Function to show vocabulary error message
function showVocabularyError(message) {
    const vocabularyContainer = document.getElementById('vocabulary-container');
    if (vocabularyContainer) {
        vocabularyContainer.innerHTML = `
            <div class="error-message">
                <p>${message}</p>
                <p>请确保您已选择正确的学校和年级，然后再试一次。</p>
            </div>
        `;
    }
}

// Fetch vocabulary words from API
async function fetchVocabularyWords(school, grade) {
    try {
        // Create a simpler prompt for more reliable API responses
        const prompt = `Generate 10 English vocabulary words appropriate for ${school} school students in grade ${grade}.

Please format your response as a valid JSON array with objects having the following structure for each word:
  {
    "word": "example",
    "part_of_speech": "noun",
    "pronunciation": "-ɪɡˈzæm.pəl-",
    "definition": "A clear English definition",
    "chinese_translation": "中文翻译",
    "word_family": [
      {
        "english": "examplary (-ɪɡˈzæm.pələri-)",
        "chinese": "adj, 可作榜样的",
      }
    ],
    "related_phrases": [
      {
        "english": "example phrase",
        "chinese": "相关词组",
      }
    ],
    "example_sentences": [
      {
        "english": "This is an example sentence.",
        "chinese": "这是一个例句。"
      }
    ]
  }

Requirements:
1. Choose vocabulary appropriate for ${grade} grade ${school} school students
2. Include 2 related word family (词性变形) for each word
2. Include 2 related phrases (词组) for each word
3. Include two example sentences for each word
4. Provide both English and Chinese translations for all content
5. Keep the JSON structure simple and valid
6. Do not include any text outside the JSON array`;
        
        // Use the existing fetchAIResponse function
        const response = await fetchAIResponse(prompt);
        console.log('Raw API response type:', typeof response);
        
        let wordData;
        if (typeof response === 'object' && response.choices && response.choices[0] && response.choices[0].message) {
            const messageContent = response.choices[0].message.content;
            wordData = extractJsonFromText(messageContent);
        } else if (typeof response === 'string') {
            wordData = extractJsonFromText(response);
        } else if (Array.isArray(response)) {
            wordData = response;
        } else {
            console.warn('Unexpected API response format:', response);
            wordData = null;
        }
        
        if (wordData && Array.isArray(wordData) && wordData.length > 0) {
            console.log('Successfully parsed vocabulary data:', wordData);
            return wordData;
        } else {
            console.warn('Could not extract valid vocabulary data from response');
            //return getMockVocabularyWords();
        }
    } catch (error) {
        console.error('Error in fetchVocabularyWords:', error);
        //return getMockVocabularyWords();
    }
}

// Helper function to extract JSON from text content
function extractJsonFromText(text) {
    if (!text) return null;
    
    try {
        // First try: Direct parse if it's already JSON
        try {
            const parsed = JSON.parse(text);
            if (Array.isArray(parsed)) return parsed;
        } catch (e) {
            // Not directly parseable JSON, continue to other methods
        }
        
        // Second try: Extract JSON from code blocks
        const codeBlockMatch = text.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
        if (codeBlockMatch) {
            try {
                const jsonContent = codeBlockMatch[1].trim();
                const parsed = JSON.parse(jsonContent);
                if (Array.isArray(parsed)) return parsed;
            } catch (e) {
                console.warn('Failed to parse JSON from code block:', e);
            }
        }
        
        // Third try: Look for array pattern in text
        const arrayMatch = text.match(/\[\s*\{[\s\S]*\}\s*\]/);
        if (arrayMatch) {
            try {
                const cleaned = cleanJsonString(arrayMatch[0]);
                const parsed = JSON.parse(cleaned);
                if (Array.isArray(parsed)) return parsed;
            } catch (e) {
                console.warn('Failed to parse JSON from array pattern:', e);
            }
        }
        
        // Final try: Manual extraction of word objects
        return extractWordObjects(text);
    } catch (error) {
        console.error('Error extracting JSON from text:', error);
        return null;
    }
}

// Update the displayWordCard function for more reliable rendering
function displayWordCard(index) {
    const vocabularyContainer = document.getElementById('vocabulary-container');
    const word = vocabularyWords[index];
    
    if (!word || !word.word) {
        vocabularyContainer.innerHTML = '<div class="initial-message">无单词数据</div>';
        return;
    }
    
    // Safely extract all word properties with fallbacks
    const wordData = {
        english: safeGet(word, 'word', ''),
        form: safeGet(word, 'part_of_speech', 'n/a'),
        pronunciation: safeGet(word, 'pronunciation', ''),
        definition: safeGet(word, 'definition', ''),
        chinese: safeGet(word, 'chinese_translation', ''),
        
        // Process complex structures
        examples: processExamples(word),
        relatedPhrases: processRelatedPhrases(word),
        wordFamily: processWordFamily(word),
        collocations: processCollocations(word),
        synonyms: processSynonyms(word),
        antonyms: processAntonyms(word),
        learningTips: processLearningTips(word)
    };
    
    // Create the card HTML
    const cardHTML = `
        <div class="word-card">
            <div class="word-header">
                <div class="word-english">${wordData.english}</div>
                <div class="word-details">
                    <span class="word-form">${wordData.form}</span>
                    ${wordData.pronunciation ? `<span class="word-pronunciation">${wordData.pronunciation}</span>` : ''}
                </div>
            </div>
            
            <div class="word-meanings">
                <div class="meaning-row">
                    <div class="meaning-label">英文释义:</div>
                    <div class="meaning-content">${wordData.definition}</div>
                </div>
                <div class="meaning-row">
                    <div class="meaning-label">中文释义:</div>
                    <div class="meaning-content">${wordData.chinese}</div>
                </div>
            </div>
            
            ${renderRelatedPhrases(wordData.relatedPhrases)}
            ${renderWordFamily(wordData.wordFamily)}
            ${renderExamples(wordData.examples)}
            ${renderCollocations(wordData.collocations)}
            
            <div class="word-relationships">
                ${renderSynonyms(wordData.synonyms)}
                ${renderAntonyms(wordData.antonyms)}
            </div>
            
            ${renderLearningTips(wordData.learningTips)}
        </div>
    `;
    
    vocabularyContainer.innerHTML = cardHTML;
    
    // Update word counter if it exists
    const wordCounter = document.getElementById('word-counter');
    if (wordCounter) {
        wordCounter.textContent = `${index + 1}/${vocabularyWords.length}`;
    }
    
    // Update side navigation buttons
    updateSideNavigationButtons();
}

// Safe property getter with default value
function safeGet(obj, path, defaultValue) {
    if (!obj) return defaultValue;
    
    // Handle dot notation for nested paths
    const keys = path.split('.');
    let current = obj;
    
    for (const key of keys) {
        if (current === null || current === undefined || typeof current !== 'object') {
            return defaultValue;
        }
        current = current[key];
    }
    
    return current !== undefined && current !== null ? current : defaultValue;
}

// Process example sentences from various formats
function processExamples(word) {
    const examples = [];
    
    try {
        if (word.example_sentences) {
            if (Array.isArray(word.example_sentences)) {
                word.example_sentences.forEach(example => {
                    if (typeof example === 'string') {
                        // Handle string format with parentheses for Chinese
                        const match = example.match(/^(.*?)(?:\s*\((.*?)\))?$/);
                        if (match) {
                            examples.push({
                                english: match[1].trim(),
                                chinese: match[2] ? match[2].trim() : ''
                            });
                        } else {
                            examples.push({ english: example, chinese: '' });
                        }
                    } else if (example && typeof example === 'object') {
                        // Handle object format
                        examples.push({
                            english: example.english || example.sentence || '',
                            chinese: example.chinese || example.translation || ''
                        });
                    }
                });
            } else if (typeof word.example_sentences === 'object') {
                // Handle object with numbered keys
                Object.values(word.example_sentences).forEach(example => {
                    if (typeof example === 'string') {
                        const match = example.match(/^(.*?)(?:\s*\((.*?)\))?$/);
                        if (match) {
                            examples.push({
                                english: match[1].trim(),
                                chinese: match[2] ? match[2].trim() : ''
                            });
                        } else {
                            examples.push({ english: example, chinese: '' });
                        }
                    } else if (example && typeof example === 'object') {
                        examples.push({
                            english: example.english || example.sentence || '',
                            chinese: example.chinese || example.translation || ''
                        });
                    }
                });
            }
        }
    } catch (e) {
        console.warn('Error processing examples:', e);
    }
    
    return examples;
}

/*
// Process word family from various formats
function processWordFamily(word) {
    const wordFamilyItems = [];
    
    try {
        if (word.word_family) {
            if (Array.isArray(word.word_family)) {
                word.word_family.forEach(item => {
                    if (typeof item === 'string') {
                        wordFamilyItems.push({ word: item });
                    } else if (item && typeof item === 'object') {
                        const keys = Object.keys(item);
                        if (keys.length > 0) {
                            wordFamilyItems.push({ 
                                type: keys[0], 
                                word: item[keys[0]] 
                            });
                        }
                    }
                });
            } else if (typeof word.word_family === 'object') {
                Object.entries(word.word_family).forEach(([type, value]) => {
                    wordFamilyItems.push({ type, word: value });
                });
            }
        }
    } catch (e) {
        console.warn('Error processing word family:', e);
    }
    
    return wordFamilyItems;
    //console.log(wordFamilyItems);
}
*/

function processWordFamily(word) {
    const wordFamilyItems = [];
    
    try {
        if (word.word_family) {
            if (Array.isArray(word.word_family)) {
                word.word_family.forEach(item => {
                    if (item && typeof item === 'object') {
                        // Process objects with chinese and english properties
                        if (item.chinese && item.english) {
                            wordFamilyItems.push({
                                type: item.chinese,  // Keep the full chinese string (e.g., "adv, 突然地")
                                word: item.english  // The English word
                            });
                        }
                        // Keep the original handling for other object types
                        else {
                            const keys = Object.keys(item);
                            if (keys.length > 0) {
                                wordFamilyItems.push({ 
                                    type: keys[0], 
                                    word: item[keys[0]]     
                                });
                            }
                        }
                    }
                    // Keep the original handling for string items
                    else if (typeof item === 'string') {
                        wordFamilyItems.push({ word: item });
                    }
                });
            } else if (typeof word.word_family === 'object') {
                // Keep the original handling for plain objects
                Object.entries(word.word_family).forEach(([type, value]) => {
                    wordFamilyItems.push({ type, word: value });
                });
            }
        }
    } catch (e) {
        console.warn('Error processing word family:', e);
    }
    
    return wordFamilyItems;
}

// Process collocations from various formats
function processCollocations(word) {
    const collocations = [];
    
    try {
        if (word.common_collocations) {
            if (Array.isArray(word.common_collocations)) {
                word.common_collocations.forEach(item => {
                    if (typeof item === 'string') {
                        // Handle parentheses format
                        const match = item.match(/^(.*?)(?:\s*\((.*?)\))?$/);
                        if (match) {
                            collocations.push({
                                phrase: match[1].trim(),
                                translation: match[2] ? match[2].trim() : ''
                            });
                        } else {
                            collocations.push({ phrase: item });
                        }
                    } else if (item && typeof item === 'object') {
                        const keys = Object.keys(item);
                        if (keys.length > 0) {
                            collocations.push({
                                phrase: keys[0],
                                translation: item[keys[0]]
                            });
                        }
                    }
                });
            } else if (typeof word.common_collocations === 'object') {
                Object.entries(word.common_collocations).forEach(([phrase, translation]) => {
                    collocations.push({ phrase, translation });
                });
            }
        }
    } catch (e) {
        console.warn('Error processing collocations:', e);
    }
    
    return collocations;
}

// Process synonyms from various formats
function processSynonyms(word) {
    return processWordRelationship(word.synonyms);
}

// Process antonyms from various formats
function processAntonyms(word) {
    return processWordRelationship(word.antonyms);
}

// Generic processor for word relationships (synonyms/antonyms)
function processWordRelationship(items) {
    const processed = [];
    
    try {
        if (items) {
            if (Array.isArray(items)) {
                items.forEach(item => {
                    if (typeof item === 'string') {
                        processed.push({ word: item });
                    } else if (item && typeof item === 'object') {
                        if (item.word) {
                            processed.push({
                                word: item.word,
                                definition: item.definition || '',
                                chinese: item.chinese || ''
                            });
                        } else {
                            const keys = Object.keys(item);
                            if (keys.length > 0) {
                                const key = keys[0];
                                const value = item[key];
                                
                                // Try to extract Chinese in parentheses
                                let definition = value;
                                let chinese = '';
                                
                                if (typeof value === 'string') {
                                    const match = value.match(/^(.*?)(?:\s*\((.*?)\))?$/);
                                    if (match) {
                                        definition = match[1].trim();
                                        chinese = match[2] ? match[2].trim() : '';
                                    }
                                }
                                
                                processed.push({
                                    word: key,
                                    definition,
                                    chinese
                                });
                            }
                        }
                    }
                });
            } else if (typeof items === 'object') {
                Object.entries(items).forEach(([word, value]) => {
                    // Try to extract Chinese in parentheses
                    let definition = value;
                    let chinese = '';
                    
                    if (typeof value === 'string') {
                        const match = value.match(/^(.*?)(?:\s*\((.*?)\))?$/);
                        if (match) {
                            definition = match[1].trim();
                            chinese = match[2] ? match[2].trim() : '';
                        }
                    }
                    
                    processed.push({
                        word,
                        definition,
                        chinese
                    });
                });
            }
        }
    } catch (e) {
        console.warn('Error processing word relationship:', e);
    }
    
    return processed;
}

// Process learning tips from various formats
function processLearningTips(word) {
    try {
        if (word.learning_tips) {
            if (typeof word.learning_tips === 'string') {
                // Handle parentheses format
                const match = word.learning_tips.match(/^(.*?)(?:\s*\((.*?)\))?$/);
                if (match) {
                    return {
                        tip: match[1].trim(),
                        chinese: match[2] ? match[2].trim() : ''
                    };
                }
                return { tip: word.learning_tips };
            } else if (typeof word.learning_tips === 'object') {
                return {
                    tip: word.learning_tips.tip || word.learning_tips.english || '',
                    chinese: word.learning_tips.chinese || ''
                };
            }
        }
    } catch (e) {
        console.warn('Error processing learning tips:', e);
    }
    
    return { tip: '', chinese: '' };
}

// Render example sentences section
function renderExamples(examples) {
    if (!examples || examples.length === 0) return '';
    
    return `
        <div class="word-examples">
            <h3 class="section-title">例句</h3>
            ${examples.map(example => `
                <div class="example-item">
                    <div class="example-english">${example.english}</div>
                    ${example.chinese ? `<div class="example-chinese">${example.chinese}</div>` : ''}
                </div>
            `).join('')}
        </div>
    `;
}

/*
// Enhanced render function
function renderWordFamily(wordFamily) {
    if (!wordFamily || wordFamily.length === 0) return '';
    
    return `
        <div class="word-family">
            <h3 class="section-title">词族</h3>
            <div class="word-family-items">
                ${wordFamily.map(item => `
                    <span class="word-family-item" 
                          title="${item.chinese || item.word || ''}">
                        ${item.word || ''}
                        ${item.type ? `(${item.type})` : ''}
                        ${item.chinese ? `${item.chinese}` : ''}
                    </span>
                `).join('')}
            </div>
        </div>
    `;
}
*/

function renderWordFamily(wordFamily) {
    if (!wordFamily || wordFamily.length === 0) return '';
    
    return `
        <div class="word-family">
            <h3 class="section-title">词族</h3>
            <div class="word-family-items">
                ${wordFamily.map(item => `
                    <span class="word-family-item">
                        <span class="english">${item.english || item.word || ''}</span>: 
                        <span class="chinese">${item.chinese || item.type || ''}</span>
                    </span>
                `).join('')}
            </div>
        </div>
    `;
}

// Render collocations section
function renderCollocations(collocations) {
    if (!collocations || collocations.length === 0) return '';
    
    return `
        <div class="collocations">
            <h3 class="section-title">常见搭配</h3>
            <div class="collocation-items">
                ${collocations.map(item => `
                    <span class="collocation-item" title="${item.translation || ''}">
                        ${item.phrase}
                    </span>
                `).join('')}
            </div>
        </div>
    `;
}

// Render synonyms section
function renderSynonyms(synonyms) {
    if (!synonyms || synonyms.length === 0) return '';
    
    return `
        <div class="synonyms">
            <h3 class="section-title">近义词</h3>
            <div class="synonym-items">
                ${synonyms.map(syn => `
                    <div class="synonym-container">
                        <span class="synonym-word">${syn.word}</span>
                        ${syn.definition ? `<span class="synonym-def">- ${syn.definition}</span>` : ''}
                        ${syn.chinese ? `<span class="synonym-chinese">${syn.chinese}</span>` : ''}
                    </div>
                `).join('')}
            </div>
        </div>
    `;
}

// Render antonyms section
function renderAntonyms(antonyms) {
    if (!antonyms || antonyms.length === 0) return '';
    
    return `
        <div class="antonyms">
            <h3 class="section-title">反义词</h3>
            <div class="antonym-items">
                ${antonyms.map(ant => `
                    <div class="antonym-container">
                        <span class="antonym-word">${ant.word}</span>
                        ${ant.definition ? `<span class="antonym-def">- ${ant.definition}</span>` : ''}
                        ${ant.chinese ? `<span class="antonym-chinese">${ant.chinese}</span>` : ''}
                    </div>
                `).join('')}
            </div>
        </div>
    `;
}

// Render learning tips section
function renderLearningTips(tips) {
    if (!tips || !tips.tip) return '';
    
    return `
        <div class="learning-tips">
            <h3 class="section-title">记忆技巧</h3>
            <div class="tip-content">${tips.tip}</div>
            ${tips.chinese ? `<div class="tip-content-chinese">${tips.chinese}</div>` : ''}
        </div>
    `;
}

// Add this function to handle word navigation
function navigateWordCard(direction) {
    console.log('Navigating word card:', direction);
    
    // Calculate new index
    const newIndex = currentWordIndex + direction;
    
    // Check if new index is valid
    if (newIndex >= 0 && newIndex < vocabularyWords.length) {
        currentWordIndex = newIndex;
        displayWordCard(currentWordIndex);
        updateNavigationControls();
        updateSideNavigationButtons();
    }
}

// Update the navigation controls function
function updateNavigationControls() {
    const prevButton = document.getElementById('vocab-prev-btn');
    const nextButton = document.getElementById('vocab-next-btn');
    const wordCounter = document.getElementById('word-counter');

    if (prevButton) {
        prevButton.disabled = currentWordIndex <= 0;
    }

    if (nextButton) {
        nextButton.disabled = currentWordIndex >= vocabularyWords.length - 1;
    }

    if (wordCounter && vocabularyWords.length > 0) {
        wordCounter.textContent = `${currentWordIndex + 1} / ${vocabularyWords.length}`;
    }
}

// Update the handleTabSwitch function to properly manage container visibility
function handleTabSwitch(containerType) {
    console.log('Switching to tab:', containerType);
    
    // Get all possible containers
    const qaContainer = document.getElementById('qa-container');
    const createContainer = document.getElementById('create-container');
    const poetryContainer = document.getElementById('poetry-container');
    const vocabularyContainer = document.getElementById('vocabulary-container');
    const questionsContainer = document.querySelector('.questions-container');
    
    // Hide all containers first
    if (qaContainer) qaContainer.style.display = 'none';
    if (createContainer) createContainer.style.display = 'none';
    if (poetryContainer) poetryContainer.style.display = 'none';
    if (vocabularyContainer) vocabularyContainer.style.display = 'none';
    if (questionsContainer) questionsContainer.style.display = 'none';
    
    // Hide side navigation buttons by default
    const prevNav = document.querySelector('.vocabulary-side-nav-prev');
    const nextNav = document.querySelector('.vocabulary-side-nav-next');
    if (prevNav) prevNav.style.display = 'none';
    if (nextNav) nextNav.style.display = 'none';
    
    // Reset active states for all buttons
    const qaButton = document.getElementById('qa-button');
    const createButton = document.getElementById('create-button');
    const poetryButton = document.getElementById('poetry-button');
    const wordButton = document.getElementById('word-button');
    
    if (qaButton) qaButton.classList.remove('active');
    if (createButton) createButton.classList.remove('active');
    if (poetryButton) poetryButton.classList.remove('active');
    if (wordButton) wordButton.classList.remove('active');
    
    // Show the appropriate container and set active button based on containerType
    switch (containerType) {
        case 'qa':
            if (qaContainer) {
                qaContainer.style.display = 'block';
                if (qaButton) qaButton.classList.add('active');
            }
            break;
            
        case 'create':
            if (createContainer) {
                createContainer.style.display = 'block';
                if (createButton) createButton.classList.add('active');
                if (questionsContainer) questionsContainer.style.display = 'block';
            }
            break;
            
        case 'poetry':
            if (poetryContainer) {
                poetryContainer.style.display = 'block';
                if (poetryButton) poetryButton.classList.add('active');
            }
            break;
            
        case 'vocabulary':
            if (vocabularyContainer) {
                vocabularyContainer.style.display = 'block';
                if (wordButton) wordButton.classList.add('active');
                
                // Show side navigation buttons if vocabulary words exist
                if (vocabularyWords && vocabularyWords.length > 0) {
                    if (prevNav) prevNav.style.display = 'block';
                    if (nextNav) nextNav.style.display = 'block';
                    updateSideNavigationButtons();
                }
            }
            break;
    }
}

// Function to handle the about site popup
function setupAboutSiteLink() {
    console.log('Setting up about site link...');
    const aboutSiteLink = document.getElementById('about-site-link');
    console.log('About site link found:', !!aboutSiteLink);
    
    if (aboutSiteLink) {
        // Remove any existing event listeners to avoid duplicates
        aboutSiteLink.removeEventListener('click', showAboutSiteModal);
        
        // Add click event listener
        aboutSiteLink.addEventListener('click', function(e) {
            console.log('About site link clicked');
            e.preventDefault();
            showAboutSiteModal();
        });
        console.log('About site link event listener added');
    } else {
        console.error('About site link element not found');
        // Try again in 500ms in case the DOM isn't fully loaded yet
        setTimeout(setupAboutSiteLink, 500);
    }
}

// Function to show the about site modal
function showAboutSiteModal() {
    console.log('Showing about site modal...');
    
    // Create modal container
    const modalContainer = document.createElement('div');
    modalContainer.id = 'about-site-modal';
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
    
    // Chinese content
    const chineseContent = `
        <div style="
            font-size: 16px;
            color: #4a5568;
            line-height: 1.7;
        ">
            <p>这是一个由好奇心、探索欲与热忱促成的小小实验项目，它始于几个萦绕心头的问题：</p>
            
            <ul style="
                padding-left: 20px;
                margin: 15px 0;
            ">
                <li>生成式AI如此强大，如何让它适配个性化需求？</li>
                <li>在AI时代，编程与创造是否真的人人可为？</li>
                <li>如何利用AI帮助孩子学习？</li>
            </ul>
            
            <p>以下是实践过程中的一些感悟：</p>
            
            <ul style="
                padding-left: 20px;
                margin: 15px 0;
            ">
                <li>拒绝躺平，开启思考</li>
                <li>不要拖延，立即行动</li>
                <li>无惧试错，在实践中成长</li>
                <li>永不言弃，探索不止</li>
                <li>坚信自己，终有所成</li>
            </ul>
            
            <p>项目所用到的工具（这些都是实践过程中现学现用的）：</p>
            
            <ul style="
                padding-left: 20px;
                margin: 15px 0;
            ">
                <li>内容：DeepSeek-V3 API</li>
                <li>代码：Claude-3.7-sonnet</li>
                <li>编译器：Cursor / VS Code</li>
                <li>网页部署：Github / Cloudflare</li>
            </ul>
        </div>
    `;
    
    // English content
    const englishContent = `
        <div style="
            font-size: 16px;
            color: #4a5568;
            line-height: 1.7;
        ">
            <p>This is a small experimental project fueled by curiosity, exploration, and passion. It began with several lingering questions:</p>
            
            <ul style="
                padding-left: 20px;
                margin: 15px 0;
            ">
                <li>With generative AI being so powerful, how can we adapt it to personalized needs?</li>
                <li>In the AI era, can programming and creation truly become accessible to everyone?</li>
                <li>How can we leverage AI to assist children's learning?</li>
            </ul>
            
            <p>Here are some insights gained during implementation:</p>
            
            <ul style="
                padding-left: 20px;
                margin: 15px 0;
            ">
                <li>Reject complacency, start thinking</li>
                <li>Resist procrastination, take immediate action</li>
                <li>Embrace trial and error, grow through practice</li>
                <li>Never give up, keep exploring</li>
                <li>Believe in yourself, success will follow</li>
            </ul>
            
            <p>Tools used in the project (all learned during implementation):</p>
            
            <ul style="
                padding-left: 20px;
                margin: 15px 0;
            ">
                <li>Content provider: DeepSeek-V3 API</li>
                <li>Coding: Claude-3.7-sonnet</li>
                <li>Code Editor: Cursor / VS Code</li>
                <li>Web deployment: Github / Cloudflare</li>
            </ul>
        </div>
    `;
    
    // Create modal content (initially with Chinese content)
    const modalContent = `
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
            <button id="close-about-modal" style="
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
                display: flex;
                justify-content: space-between;
                align-items: center;
                margin-bottom: 20px;
                padding-bottom: 15px;
                border-bottom: 1px solid #e2e8f0;
            ">
                <button id="lang-toggle" style="
                    background-color: #edf2f7;
                    border: 1px solid #e2e8f0;
                    border-radius: 4px;
                    padding: 5px 10px;
                    font-size: 14px;
                    cursor: pointer;
                    display: flex;
                    align-items: center;
                    color: #4a5568;
                ">
                    <span id="lang-indicator">EN</span>
                    <span style="margin: 0 4px;">|</span>
                    <span>中</span>
                </button>
                
                <h2 id="about-title" style="
                    font-size: 24px;
                    color: #2d3748;
                    margin: 0 auto;
                    text-align: center;
                ">关于本站</h2>
                
                <div style="width: 70px;"></div> <!-- Spacer to balance the layout -->
            </div>
            
            <div id="about-content">
                ${chineseContent}
            </div>
            
            <div style="
                text-align: center;
                margin-top: 25px;
            ">
                <button id="close-about-button" style="
                    padding: 10px 20px;
                    background-color: #4299e1;
                    color: white;
                    border: none;
                    border-radius: 6px;
                    font-size: 14px;
                    font-weight: 500;
                    cursor: pointer;
                ">关闭</button>
            </div>
        </div>
    `;
    
    modalContainer.innerHTML = modalContent;
    document.body.appendChild(modalContainer);
    console.log('Modal added to DOM');
    
    // Add event listeners
    const closeButton = document.getElementById('close-about-modal');
    const closeAboutButton = document.getElementById('close-about-button');
    const langToggle = document.getElementById('lang-toggle');
    const langIndicator = document.getElementById('lang-indicator');
    const aboutContent = document.getElementById('about-content');
    const aboutTitle = document.getElementById('about-title');
    
    // Track current language (start with Chinese)
    let isEnglish = false;
    
    if (langToggle) {
        langToggle.addEventListener('click', function() {
            isEnglish = !isEnglish;
            
            if (isEnglish) {
                // Switch to English
                aboutContent.innerHTML = englishContent;
                aboutTitle.textContent = 'About this website';
                closeAboutButton.textContent = 'Close';
                langIndicator.textContent = '中';
            } else {
                // Switch to Chinese
                aboutContent.innerHTML = chineseContent;
                aboutTitle.textContent = '关于本站';
                closeAboutButton.textContent = '关闭';
                langIndicator.textContent = 'EN';
            }
        });
    }
    
    if (closeButton) {
        closeButton.addEventListener('click', function() {
            console.log('Close button clicked');
            modalContainer.remove();
        });
    }
    
    if (closeAboutButton) {
        closeAboutButton.addEventListener('click', function() {
            console.log('Close button clicked');
            modalContainer.remove();
        });
    }
        // Close modal when clicking outside content
    modalContainer.addEventListener('click', function(e) {
        if (e.target === modalContainer) {
            console.log('Clicked outside modal content');
            modalContainer.remove();
        }
    });
}

// Add direct event listener for the about-site-link
document.addEventListener('DOMContentLoaded', function() {
    console.log('Setting up direct about site link listener...');
    const aboutSiteLink = document.getElementById('about-site-link');
    if (aboutSiteLink) {
        aboutSiteLink.onclick = function(e) {
            console.log('About site link clicked (direct handler)');
            e.preventDefault();
            showAboutSiteModal();
            return false;
        };
        console.log('Direct about site link event handler attached');
    } else {
        console.error('About site link not found for direct handler');
    }
});

// Make the showAboutSiteModal function globally available
window.showAboutModal = function() {
    console.log('Show about modal called from global function');
    showAboutSiteModal();
    return false;
};

// Process related phrases
function processRelatedPhrases(word) {
    const phrases = [];
    
    try {
        if (word.related_phrases && Array.isArray(word.related_phrases)) {
            word.related_phrases.forEach(phrase => {
                if (typeof phrase === 'object') {
                    phrases.push({
                        english: safeGet(phrase, 'english', ''),
                        chinese: safeGet(phrase, 'chinese', ''),
                        usage: safeGet(phrase, 'usage', '')
                    });
                }
            });
        }
    } catch (error) {
        console.error('Error processing related phrases:', error);
    }
    
    return phrases;
}

// Render related phrases section
function renderRelatedPhrases(phrases) {
    if (!phrases || phrases.length === 0) return '';
    
    return `
        <div class="word-section">
            <h3>相关词组</h3>
            <div class="related-phrases">
                ${phrases.map(phrase => `
                    <div class="phrase-item">
                        <div class="phrase-english">${phrase.english}</div>
                        <div class="phrase-chinese">${phrase.chinese}</div>
                        ${phrase.usage ? `<div class="phrase-usage">${phrase.usage}</div>` : ''}
                    </div>
                `).join('')}
            </div>
        </div>
    `;
}

// Add Ghibli-style animations to the poem display when it appears
function animatePoemDisplay() {
  const poemSections = document.querySelectorAll('.poem-section');
  
  // Add animation class with delay to each section
  poemSections.forEach((section, index) => {
    setTimeout(() => {
      section.classList.add('animate-in');
    }, 300 + (index * 150));
  });
  
  // Format poem content with animation for each line
  const poemContent = document.querySelector('.poem-content');
  if (poemContent && poemContent.textContent) {
    const lines = poemContent.textContent.split('\n').filter(line => line.trim());
    poemContent.innerHTML = '';
    
    lines.forEach((line, index) => {
      const lineElement = document.createElement('div');
      lineElement.className = 'poem-line';
      lineElement.textContent = line;
      lineElement.style.animationDelay = `${index * 100}ms`;
      poemContent.appendChild(lineElement);
    });
  }
}

// Call this function after the poem display is populated with content
document.getElementById('next-poem-button').addEventListener('click', () => {
  setTimeout(animatePoemDisplay, 100);
});

document.getElementById('prev-poem-button').addEventListener('click', () => {
  setTimeout(animatePoemDisplay, 100);
});

// Also trigger on initial load
document.getElementById('learn-poetry-button').addEventListener('click', () => {
  // This would run after API response is received and content is displayed
  setTimeout(() => {
    if (!document.getElementById('poetry-display').classList.contains('hidden')) {
      animatePoemDisplay();
    }
  }, 1000);
});

// Function to handle poetry display state
function handlePoetryDisplayState() {
  const emptyState = document.getElementById('poetry-empty-state');
  const loadingElement = document.getElementById('poetry-loading');
  const poetryDisplay = document.getElementById('poetry-display');
  
  // Check if elements exist before manipulating them
  if (!poetryDisplay || !emptyState) {
    console.log('Poetry display elements not found in DOM');
    return;
  }

  // Initially hide poetry display, show empty state
  poetryDisplay.classList.remove('active');
  emptyState.style.display = 'flex';
  
  // When learn-poetry-button is clicked
  const learnButton = document.getElementById('learn-poetry-button');
  if (learnButton) {
    learnButton.addEventListener('click', function() {
      // Hide empty state, show loading
      emptyState.style.display = 'none';
      if (loadingElement) {
        loadingElement.style.display = 'flex';
      }
    });
  }
}

// Make sure DOM is loaded before running the function
document.addEventListener('DOMContentLoaded', function() {
  // Delay the execution slightly to ensure all elements are available
  setTimeout(handlePoetryDisplayState, 0);
});

function showAboutModal() {
    const overlay = document.getElementById('modal-overlay');
    const modal = document.getElementById('about-modal');
    
    overlay.classList.add('active');
    setTimeout(() => {
        modal.classList.add('active');
    }, 100);
    
    return false; // Prevent default link behavior
}

function hideAboutModal() {
    const overlay = document.getElementById('modal-overlay');
    const modal = document.getElementById('about-modal');
    
    modal.classList.remove('active');
    setTimeout(() => {
        overlay.classList.remove('active');
    }, 300);
}

// Close modal when clicking outside
document.getElementById('modal-overlay').addEventListener('click', (e) => {
    if (e.target.id === 'modal-overlay') {
        hideAboutModal();
    }
});

// Add a function to create side navigation buttons
function addVocabularySideNavButtons() {
    // Remove any existing buttons first
    const existingPrevNav = document.querySelector('.vocabulary-side-nav-prev');
    const existingNextNav = document.querySelector('.vocabulary-side-nav-next');
    
    if (existingPrevNav) {
        existingPrevNav.remove();
    }
    
    if (existingNextNav) {
        existingNextNav.remove();
    }
    
    // Create previous button
    const prevNav = document.createElement('div');
    prevNav.className = 'vocabulary-side-nav vocabulary-side-nav-prev';
    prevNav.innerHTML = `
        <button id="vocab-prev-btn" aria-label="Previous word">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M15 18L9 12L15 6" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
        </button>
    `;
    document.body.appendChild(prevNav);
    
    // Create next button
    const nextNav = document.createElement('div');
    nextNav.className = 'vocabulary-side-nav vocabulary-side-nav-next';
    nextNav.innerHTML = `
        <button id="vocab-next-btn" aria-label="Next word">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M9 6L15 12L9 18" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
        </button>
    `;
    document.body.appendChild(nextNav);
    
    // Add event listeners
    document.getElementById('vocab-prev-btn').addEventListener('click', () => navigateWordCard(-1));
    document.getElementById('vocab-next-btn').addEventListener('click', () => navigateWordCard(1));
    
    // Handle sidebar toggle event for button positioning
    const sidebarToggle = document.querySelector('.sidebar-toggle');
    if (sidebarToggle) {
        sidebarToggle.addEventListener('click', function() {
            // The CSS will handle the transition since we're using the ~ selector
            console.log('Sidebar toggle clicked, position will update via CSS');
        });
    }
    
    // Initial position check based on current sidebar state
    adjustButtonPositionForSidebar();
}

// Function to adjust button position based on sidebar state
function adjustButtonPositionForSidebar() {
    const leftPanel = document.querySelector('.left-panel');
    const prevButton = document.querySelector('.vocabulary-side-nav-prev');
    const nextButton = document.querySelector('.vocabulary-side-nav-next');
    
    if (!prevButton || !nextButton) return;
    
    // Only adjust buttons if we're on the vocabulary page
    const wordButton = document.getElementById('word-button');
    const isVocabularyActive = wordButton && wordButton.classList.contains('active');
    
    // If not on vocabulary page, hide the buttons
    if (!isVocabularyActive) {
        prevButton.style.display = 'none';
        nextButton.style.display = 'none';
        return;
    }
    
    // If on vocabulary page, show the buttons and adjust position
    if (leftPanel && leftPanel.classList.contains('hidden')) {
        // Force the position update by adding an inline style
        prevButton.style.left = '20px';
    } else {
        // Reset to the CSS-defined position
        prevButton.style.left = '';
    }
    
    // Make sure buttons are visible if on vocabulary page
    if (vocabularyWords && vocabularyWords.length > 0) {
        prevButton.style.display = 'block';
        nextButton.style.display = 'block';
    }
}

// Add this function call to the sidebar toggle event
document.addEventListener('DOMContentLoaded', function() {
    const sidebarToggle = document.querySelector('.sidebar-toggle');
    if (sidebarToggle) {
        sidebarToggle.addEventListener('click', function() {
            // Wait a bit for the class change to take effect
            setTimeout(adjustButtonPositionForSidebar, 50);
        });
    }
});

// Update side navigation buttons based on current word index
function updateSideNavigationButtons() {
    const prevButton = document.getElementById('vocab-prev-btn');
    const nextButton = document.getElementById('vocab-next-btn');
    
    if (prevButton) {
        prevButton.disabled = currentWordIndex <= 0;
    }
    
    if (nextButton) {
        nextButton.disabled = currentWordIndex >= vocabularyWords.length - 1;
    }
}

// Add event listeners to all tab buttons to ensure vocabulary navigation buttons are hidden
document.addEventListener('DOMContentLoaded', function() {
    // Get all panel buttons that switch tabs
    const tabButtons = document.querySelectorAll('.panel-button');
    
    tabButtons.forEach(button => {
        button.addEventListener('click', function() {
            const tab_id = button.id
            
            // Only show vocabulary navigation buttons when on vocabulary tab
            const prevNav = document.querySelector('.vocabulary-side-nav-prev');
            const nextNav = document.querySelector('.vocabulary-side-nav-next');
            
            if (prevNav && nextNav) {
                if (tab_id === 'word-button') {
                    if (vocabularyWords && vocabularyWords.length > 0) {
                        prevNav.style.display = 'block';
                        nextNav.style.display = 'block';
                        updateSideNavigationButtons();
                    }
                } else {
                    prevNav.style.display = 'none';
                    nextNav.style.display = 'none';
                }
            }
        });
    });
});

// Add function to show poetry display
function showPoetryDisplay() {
    console.log('Showing poetry display');
    
    // Get elements
    const emptyState = document.getElementById('poetry-empty-state');
    const loadingElement = document.getElementById('poetry-loading');
    const poetryDisplay = document.getElementById('poetry-display');
    
    // Check if elements exist before manipulating them
    if (!poetryDisplay) {
        console.warn('Poetry display element not found in DOM');
        return;
    }
    
    // Hide empty state and loading, show poetry display
    if (emptyState) {
        emptyState.style.display = 'none';
    }
    
    if (loadingElement) {
        loadingElement.style.display = 'none';
    }
    
    // Show poetry display with animation
    poetryDisplay.classList.add('active');
    
    try {
        // Check if we have poems to display
        if (window.poemState && window.poemState.poems && window.poemState.poems.length > 0) {
            console.log(`Showing ${window.poemState.poems.length} poems, current index: ${window.poemState.currentIndex}`);
            
            // Call the global displayCurrentPoem function
            if (typeof window.displayCurrentPoem === 'function') {
                window.displayCurrentPoem();
            } else {
                console.error('displayCurrentPoem function not found in global scope');
                throw new Error('displayCurrentPoem function not available');
            }
            
            // Setup navigation buttons if function exists
            if (typeof window.setupPoemNavigationButtons === 'function') {
                window.setupPoemNavigationButtons();
            }
        } else {
            console.warn('No poems available to display in showPoetryDisplay');
            // Create empty message
            const poetryContent = poetryDisplay.querySelector('.poem-content') || poetryDisplay;
            if (poetryContent) {
                poetryContent.innerHTML = '<div class="empty-poem-message">暂无诗词内容，请重新生成</div>';
            }
        }
    } catch (error) {
        console.error('Error in showPoetryDisplay:', error);
        // Handle the error gracefully
        const poetryContent = poetryDisplay.querySelector('.poem-content') || poetryDisplay;
        if (poetryContent) {
            poetryContent.innerHTML = `<div class="error-message">加载诗词时出错: ${error.message}</div>`;
        }
    }
    
    // Animate the poem elements
    try {
        if (typeof animatePoemDisplay === 'function') {
            animatePoemDisplay();
        }
    } catch (error) {
        console.error('Error animating poem display:', error);
    }
}

// Function to handle poetry display state
function handlePoetryDisplayState() {
    const emptyState = document.getElementById('poetry-empty-state');
    const loadingElement = document.getElementById('poetry-loading');
    const poetryDisplay = document.getElementById('poetry-display');
    
    // Check if elements exist before manipulating them
    if (!poetryDisplay || !emptyState) {
        console.log('Poetry display elements not found in DOM');
        return;
    }

    // Initially hide poetry display, show empty state
    poetryDisplay.classList.remove('active');
    emptyState.style.display = 'flex';
    
    if (loadingElement) {
        loadingElement.style.display = 'none';
    }
    
    // When learn-poetry-button is clicked
    const learnButton = document.getElementById('learn-poetry-button');
    if (learnButton) {
        learnButton.addEventListener('click', function() {
            console.log('Learn poetry button clicked');
            // Hide empty state, show loading
            emptyState.style.display = 'none';
            if (loadingElement) {
                loadingElement.style.display = 'flex';
            }
            
            // Call the existing fetch/parse poems function
            // This should eventually call showPoetryDisplay() when poems are loaded
            setTimeout(() => {
                // This is a temporary solution - the actual function that fetches poems 
                // should call showPoetryDisplay() when complete
                fetchAndProcessPoems();
            }, 100);
        });
    }
}

// Placeholder function to simulate fetching and processing poems
// This should be replaced with or integrated into your actual poem fetching code
function fetchAndProcessPoems() {
    console.log('Fetching and processing poems');
    
    // Call the actual poem fetching function
    if (typeof window.handleLearnPoetryClick === 'function') {
        window.handleLearnPoetryClick();
    } else {
        console.error('handleLearnPoetryClick function not found');
        
        // Fallback just to show the UI transition for testing
        setTimeout(() => {
            showPoetryDisplay();
        }, 1500);
    }
}
// Make sure DOM is loaded before running the function
document.addEventListener('DOMContentLoaded', function() {
    // Delay the execution slightly to ensure all elements are available
    setTimeout(handlePoetryDisplayState, 100);
});

// Add this function in the global scope
window.displayCurrentPoem = function() {
    if (!window.poemState || !window.poemState.poems || window.poemState.poems.length === 0) {
        console.error('No poems available to display');
        return;
    }
    
    const poem = window.poemState.poems[window.poemState.currentIndex];
    console.log('Displaying poem:', poem, 'Current index:', window.poemState.currentIndex);
    
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
        poemCounter.textContent = `${window.poemState.currentIndex + 1} / ${window.poemState.poems.length}`;
    }
    
    // Update navigation buttons
    if (typeof window.updatePoemNavigationButtons === 'function') {
        window.updatePoemNavigationButtons();
    }
};

// Add a global version of the navigation update function
window.updatePoemNavigationButtons = function() {
    const prevButton = document.getElementById('prev-poem-button');
    const nextButton = document.getElementById('next-poem-button');
    
    if (prevButton) {
        prevButton.disabled = window.poemState.currentIndex === 0;
    }
    
    if (nextButton) {
        nextButton.disabled = window.poemState.currentIndex >= window.poemState.poems.length - 1;
    }
};

// Add a global version of the navigation setup function
window.setupPoemNavigationButtons = function() {
    console.log('Setting up poem navigation buttons');
    
    // Remove any existing event listeners by cloning and replacing
    const prevButton = document.getElementById('prev-poem-button');
    const nextButton = document.getElementById('next-poem-button');
    
    if (prevButton) {
        const newPrevButton = prevButton.cloneNode(true);
        prevButton.parentNode.replaceChild(newPrevButton, prevButton);
        
        newPrevButton.addEventListener('click', function(event) {
            event.preventDefault();
            if (window.poemState.currentIndex > 0) {
                window.poemState.currentIndex--;
                window.displayCurrentPoem();
            }
        });
    }
    
    if (nextButton) {
        const newNextButton = nextButton.cloneNode(true);
        nextButton.parentNode.replaceChild(newNextButton, nextButton);
        
        newNextButton.addEventListener('click', function(event) {
            event.preventDefault();
            if (window.poemState.currentIndex < window.poemState.poems.length - 1) {
                window.poemState.currentIndex++;
                window.displayCurrentPoem();
            }
        });
    }
};

// In your function that displays question choices:
function displayQuestionChoices(question) {
    const choicesContainer = document.querySelector('.choices-container');
    choicesContainer.innerHTML = '';
    
    // Get choices from the question object
    const choices = question.choices || [];
    
    // Create choice elements with proper content separation
    choices.forEach((choice, index) => {
        const choiceLabel = String.fromCharCode(65 + index); // A, B, C, D
        const choiceContent = choice.text || choice; // Handle both object and string formats
        
        // Create choice item with clear structure
        const choiceItem = document.createElement('div');
        choiceItem.className = 'choice-item';
        choiceItem.setAttribute('data-choice', choiceLabel);
        
        // Ensure only the choice content is displayed, not the answer
        choiceItem.innerHTML = `
            <div class="choice-label">${choiceLabel}</div>
            <div class="choice-content">${choiceContent}</div>
        `;
        
        // Add event listener for selection
        choiceItem.addEventListener('click', () => selectChoice(choiceItem, choiceLabel));
        
        choicesContainer.appendChild(choiceItem);
    });
}

    
