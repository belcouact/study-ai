// API configuration variables
let currentApiFunction = 'chat';
let currentModel = 'deepseek-chat';
// Add global variable for current question index
let currentQuestionIndex = 0;
let currentWordIndex = 0;
// Global variables
let vocabularyWords = [];

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
    
    // Get valu es from the dropdowns using the new IDs (without -sidebar suffix)
    const schoolSelect = document.getElementById('school-select-sidebar');
    const gradeSelect = document.getElementById('grade-select-sidebar');
    const subjectSelect = document.getElementById('subject-select');
    const semesterSelect = document.getElementById('semester-select');
    const difficultySelect = document.getElementById('difficulty-select');
    const questionCountSelect = document.getElementById('question-count-select');
    const questionsDisplayContainer = document.getElementById('questions-display-container');
    const emptyState = document.querySelector('.empty-state'); // Use class selector if ID is not available
    
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
    // Get main loading element
    const loadingElement = document.getElementById('loading');
    if (loadingElement) {
        const loadingMessages = [
            "与魔法同行...",
            "旅途中，请稍候...",
            "正在穿越森林...",
            "魔法正在生效...",
            "小精灵正在努力...",
            "穿越云层中...",
            "探索知识的世界..."
        ];
        
        const randomMessage = loadingMessages[Math.floor(Math.random() * loadingMessages.length)];
        const messageElement = loadingElement.querySelector('p');
        if (messageElement) {
            messageElement.textContent = randomMessage;
        }
        
        loadingElement.classList.remove('hidden');
    }
    
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
            padding: 50px 20px;
        `;
        
        // Create a spinner element
        const spinner = document.createElement('div');
        spinner.classList.add('spinner');
        
        // Create loading text element
        const loadingText = document.createElement('p');
        loadingText.style.cssText = `
            margin-top: 20px;
            color: #6c757d;
            font-size: 1.1rem;
            text-align: center;
        `;
        
        // Choose a random Ghibli-themed loading message
        const testLoadingMessages = [
            "创造魔法题目中...",
            "寻找知识精灵...",
            "拜访智慧森林...",
            "穿越学习云层...",
            "小魔女正在出题..."
        ];
        
        loadingText.textContent = testLoadingMessages[Math.floor(Math.random() * testLoadingMessages.length)];
        
        // Append elements to loading indicator
        loadingIndicator.appendChild(spinner);
        loadingIndicator.appendChild(loadingText);
        
        // Show the loading indicator in the container
        questionsDisplayContainer.innerHTML = '';
        questionsDisplayContainer.appendChild(loadingIndicator);
        questionsDisplayContainer.classList.remove('hidden');
    }
    
    return loadingIndicator;
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
            if (window.questions && currentQuestionIndex < window.questions.length - 1) {
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
    // Create system message container
    const systemMessage = document.createElement('div');
    systemMessage.className = `system-message ${type}`;
    
    // Create message content
    const messageContent = document.createElement('p');
    
    // Add a Ghibli-themed prefix based on message type
    let prefix = '';
    if (type === 'info') {
        prefix = '✨ ';
    } else if (type === 'error') {
        prefix = '⚠️ ';
    } else if (type === 'success') {
        prefix = '🌱 ';
    }
    
    messageContent.textContent = prefix + message;
    systemMessage.appendChild(messageContent);
    
    // Add to document
    document.body.appendChild(systemMessage);
    
    // Remove after timeout
    setTimeout(() => {
        systemMessage.style.opacity = '0';
        setTimeout(() => {
            document.body.removeChild(systemMessage);
        }, 300);
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
    
    // Add Ghibli animation styles
    addAnimationStyles();
    
    // Add ripple effect to buttons
    document.querySelectorAll('button').forEach(button => {
        button.addEventListener('click', function(e) {
            const x = e.clientX - e.target.getBoundingClientRect().left;
            const y = e.clientY - e.target.getBoundingClientRect().top;
            
            const ripple = document.createElement('span');
            ripple.className = 'ripple';
            ripple.style.width = ripple.style.height = `${Math.max(e.target.offsetWidth, e.target.offsetHeight) * 2}px`;
            ripple.style.left = `${x - parseInt(ripple.style.width)/2}px`;
            ripple.style.top = `${y - parseInt(ripple.style.height)/2}px`;
            
            e.target.appendChild(ripple);
            
            setTimeout(() => {
                ripple.remove();
            }, 600);
        });
    });
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

// Add floating animation keyframes to the head
function addAnimationStyles() {
    if (!document.getElementById('ghibli-animations')) {
        const styleElement = document.createElement('style');
        styleElement.id = 'ghibli-animations';
        styleElement.textContent = `
            @keyframes floatCard {
                0% { transform: translateY(0); }
                50% { transform: translateY(-5px); }
                100% { transform: translateY(0); }
            }
            
            @keyframes fadeInUp {
                from { opacity: 0; transform: translateY(20px); }
                to { opacity: 1; transform: translateY(0); }
            }
            
            @keyframes rippleEffect {
                0% { transform: scale(0); opacity: 1; }
                100% { transform: scale(2.5); opacity: 0; }
            }
            
            .ripple {
                position: absolute;
                border-radius: 50%;
                background: rgba(255, 255, 255, 0.4);
                transform: scale(0);
                animation: rippleEffect 0.6s linear;
            }
        `;
        document.head.appendChild(styleElement);
    }
}

function displayWordCard(index) {
    if (!vocabularyWords || vocabularyWords.length === 0 || index < 0 || index >= vocabularyWords.length) {
        showVocabularyError('无法显示单词卡片');
        return;
    }
    
    currentWordIndex = index;
    const word = vocabularyWords[index];
    
    // Create a professional word card
    const cardHtml = `
        <div class="word-card">
            <div class="word-header">
                <div class="word-english">${word.english || 'Unknown Word'}</div>
                <div class="word-details">
                    ${word.form ? `<div class="word-form">${word.form}</div>` : ''}
                    ${word.pronunciation ? `<div class="word-pronunciation">${word.pronunciation}</div>` : ''}
                </div>
            </div>
            
            <div class="word-meanings">
                ${processWordMeanings(word)}
            </div>
            
            <div class="word-examples">
                <h3 class="section-title">例句</h3>
                ${renderExamples(processExamples(word))}
            </div>
            
            ${word.wordFamily && word.wordFamily.length > 0 ? `
                <div class="word-family">
                    <h3 class="section-title">词族</h3>
                    ${renderWordFamily(processWordFamily(word))}
                </div>
            ` : ''}
            
            ${word.collocations && word.collocations.length > 0 ? `
                <div class="collocations">
                    <h3 class="section-title">常见搭配</h3>
                    ${renderCollocations(processCollocations(word))}
                </div>
            ` : ''}
            
            <div class="word-relationships">
                ${word.synonyms && word.synonyms.length > 0 ? `
                    <div class="synonyms">
                        <h3 class="section-title">近义词</h3>
                        ${renderSynonyms(processSynonyms(word))}
                    </div>
                ` : ''}
                
                ${word.antonyms && word.antonyms.length > 0 ? `
                    <div class="antonyms">
                        <h3 class="section-title">反义词</h3>
                        ${renderAntonyms(processAntonyms(word))}
                    </div>
                ` : ''}
            </div>
            
            ${word.relatedPhrases && word.relatedPhrases.length > 0 ? `
                <div class="related-phrases">
                    <h3 class="section-title">相关短语</h3>
                    ${renderRelatedPhrases(processRelatedPhrases(word))}
                </div>
            ` : ''}
            
            ${word.learningTips ? `
                <div class="learning-tips">
                    <h3 class="section-title">学习提示</h3>
                    ${renderLearningTips(processLearningTips(word))}
                </div>
            ` : ''}
        </div>
    `;
    
    const container = document.getElementById('vocabulary-container');
    if (container) {
        // Add fade-in animation
        container.style.opacity = '0';
        container.innerHTML = cardHtml;
        
        // Animate the card entrance with a slight delay
        setTimeout(() => {
            container.style.transition = 'opacity 0.5s ease';
            container.style.opacity = '1';
            
            // Add subtle floating animation to the card after it appears
            const card = container.querySelector('.word-card');
            if (card) {
                setTimeout(() => {
                    card.style.animation = 'floatCard 3s ease-in-out infinite';
                }, 500);
            }
        }, 100);
    }
    
    // Update navigation controls
    updateNavigationControls();
}
