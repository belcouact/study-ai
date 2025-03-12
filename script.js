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

    // Instead of showing a modal, update the navigation section
    const navigationControls = document.querySelector('.navigation-controls');
    if (!navigationControls) {
        console.error('Navigation controls not found');
        return;
    }

    // Create or update the score summary in the navigation section
    let scoreSummary = document.getElementById('score-summary');
    if (!scoreSummary) {
        scoreSummary = document.createElement('div');
        scoreSummary.id = 'score-summary';
        scoreSummary.className = 'score-summary';
        scoreSummary.style.cssText = `
            margin-top: 20px;
            padding: 15px;
            background-color: #f8f9fa;
            border-radius: 8px;
            text-align: center;
            box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
            animation: fadeIn 0.3s ease;
        `;
        navigationControls.appendChild(scoreSummary);
    }

    // Update the score summary content
    scoreSummary.innerHTML = `
        <div style="
            font-size: clamp(16px, 3vw, 18px);
            color: #2d3748;
            font-weight: 500;
            margin-bottom: 10px;
        ">测试完成！</div>
        
        <div style="
            font-size: clamp(14px, 2.5vw, 16px);
            color: #4a5568;
            margin-bottom: 15px;
        ">
            总题数: ${window.questions.length} | 
            正确: ${correctCount} | 
            正确率: ${scorePercentage.toFixed(1)}%
        </div>
        
        <button id="evaluate-button" style="
            padding: 10px 20px;
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
    `;

    // Add event listener to the evaluate button
    const evaluateButton = document.getElementById('evaluate-button');
    if (evaluateButton) {
        evaluateButton.addEventListener('click', handleEvaluateClick);
    }
}

// Function to display the current question
function displayCurrentQuestion() {
    console.log('displayCurrentQuestion called', window.currentQuestionIndex);
    console.log('Questions array:', window.questions);
    
    if (!window.questions || window.questions.length === 0) {
        console.error('No questions available to display');
        return;
    }
    
    const question = window.questions[window.currentQuestionIndex];
    
    if (!question) {
        console.error('No question found at index', window.currentQuestionIndex);
        return;
    }
    
    console.log('Current question:', question);

    // Make sure the questions display container is visible
    const questionsDisplayContainer = document.getElementById('questions-display-container');
    if (questionsDisplayContainer) {
        questionsDisplayContainer.classList.remove('hidden');
        
        // Hide the empty state if it exists
        const emptyState = document.getElementById('empty-state');
        if (emptyState) {
            emptyState.classList.add('hidden');
        }
        
        // Hide the loading indicator if it exists
        const loadingIndicator = document.getElementById('test-loading-indicator');
        if (loadingIndicator) {
            loadingIndicator.style.display = 'none';
        }
    } else {
        console.error('Questions display container not found in displayCurrentQuestion');
        return;
    }

    // Check if all questions are answered
    const allQuestionsAnswered = window.userAnswers && 
                               window.userAnswers.length === window.questions.length && 
                               window.userAnswers.every(answer => answer !== null);

    // Show results in navigation section if all questions are answered
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
        newCounter.textContent = `题目 ${window.currentQuestionIndex + 1} / ${window.questions.length}`;
        questionsDisplayContainer.appendChild(newCounter);
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
        questionsDisplayContainer.appendChild(newText);
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
                
                // Show the answer container after selecting an option
                const answerContainer = document.getElementById('answer-container');
                if (answerContainer) {
                    answerContainer.classList.remove('hidden');
                    
                    // Update answer result
                    const answerResult = document.getElementById('answer-result');
                    const correctAnswer = question.answer;
                    const isCorrect = value === correctAnswer;
                    
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
                    
                    // Update explanation
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
            if (window.userAnswers && window.userAnswers[window.currentQuestionIndex] === cell.dataset.value) {
                selectedCell = cell;
                updateCellStyles(cell, true);
            }
        });
        
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
        `;
        questionsDisplayContainer.appendChild(newChoices);
        
        // Add event listeners to the newly created choice cells
        const choiceCells = newChoices.querySelectorAll('.choice-cell');
        choiceCells.forEach(cell => {
            cell.addEventListener('click', function() {
                // Save the answer
                const value = this.dataset.value;
                window.userAnswers[window.currentQuestionIndex] = value;
                
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
                
                // Show answer and explanation
                displayAnswer(value);
            });
        });
    }
    
    // Function to display answer and explanation
    function displayAnswer(selectedValue) {
        // Create or get the answer container
        let answerContainer = document.getElementById('answer-container');
        if (!answerContainer) {
            answerContainer = document.createElement('div');
            answerContainer.id = 'answer-container';
            answerContainer.className = 'answer-container';
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
            questionsDisplayContainer.appendChild(answerContainer);
        }
        
        answerContainer.classList.remove('hidden');
        
        // Check if answer is correct
        const correctAnswer = question.answer;
        const isCorrect = selectedValue === correctAnswer;
        
        // Create or update the answer result
        let answerResult = document.getElementById('answer-result');
        if (!answerResult) {
            answerResult = document.createElement('div');
            answerResult.id = 'answer-result';
            answerResult.className = 'answer-result';
            answerContainer.appendChild(answerResult);
        }
        
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
        
        // Create or update the explanation
        let answerExplanation = document.getElementById('answer-explanation');
        if (!answerExplanation) {
            answerExplanation = document.createElement('div');
            answerExplanation.id = 'answer-explanation';
            answerExplanation.className = 'answer-explanation';
            answerContainer.appendChild(answerExplanation);
        }
        
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
    
    console.log('displayCurrentQuestion completed');
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
    
    // Ensure navigation controls container exists
    let navigationControls = document.querySelector('.navigation-controls');
    if (!navigationControls) {
        console.log('Creating navigation controls container');
        navigationControls = document.createElement('div');
        navigationControls.className = 'navigation-controls';
        navigationControls.style.cssText = `
            display: flex;
            flex-direction: column;
            align-items: center;
            margin-top: 30px;
            padding: 20px;
            background-color: white;
            border-radius: 12px;
            box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
        `;
        
        // Create button container
        const buttonContainer = document.createElement('div');
        buttonContainer.style.cssText = `
            display: flex;
            justify-content: center;
            gap: 20px;
            width: 100%;
        `;
        
        // Create prev button if it doesn't exist
        let prevButton = document.getElementById('prev-question-button');
        if (!prevButton) {
            prevButton = document.createElement('button');
            prevButton.id = 'prev-question-button';
            prevButton.className = 'nav-button';
            prevButton.textContent = '上一题';
            prevButton.style.cssText = `
                padding: 10px 20px;
                font-size: 16px;
                background-color: #edf2f7;
                color: #4a5568;
                border: none;
                border-radius: 8px;
                cursor: pointer;
                transition: all 0.2s ease;
            `;
            buttonContainer.appendChild(prevButton);
        }
        
        // Create next button if it doesn't exist
        let nextButton = document.getElementById('next-question-button');
        if (!nextButton) {
            nextButton = document.createElement('button');
            nextButton.id = 'next-question-button';
            nextButton.className = 'nav-button';
            nextButton.textContent = '下一题';
            nextButton.style.cssText = `
                padding: 10px 20px;
                font-size: 16px;
                background-color: #4299e1;
                color: white;
                border: none;
                border-radius: 8px;
                cursor: pointer;
                transition: all 0.2s ease;
                box-shadow: 0 2px 4px rgba(66, 153, 225, 0.2);
            `;
            buttonContainer.appendChild(nextButton);
        }
        
        navigationControls.appendChild(buttonContainer);
        
        // Add to the create container
        const createContainer = document.getElementById('create-container');
        if (createContainer) {
            createContainer.appendChild(navigationControls);
        }
    } else {
        // Get existing buttons
        const prevButton = document.getElementById('prev-question-button');
        const nextButton = document.getElementById('next-question-button');
        
        // If buttons don't exist, create them
        if (!prevButton || !nextButton) {
            // Clear navigation controls
            navigationControls.innerHTML = '';
            
            // Create button container
            const buttonContainer = document.createElement('div');
            buttonContainer.style.cssText = `
                display: flex;
                justify-content: center;
                gap: 20px;
                width: 100%;
            `;
            
            // Create prev button
            const newPrevButton = document.createElement('button');
            newPrevButton.id = 'prev-question-button';
            newPrevButton.className = 'nav-button';
            newPrevButton.textContent = '上一题';
            newPrevButton.style.cssText = `
                padding: 10px 20px;
                font-size: 16px;
                background-color: #edf2f7;
                color: #4a5568;
                border: none;
                border-radius: 8px;
                cursor: pointer;
                transition: all 0.2s ease;
            `;
            buttonContainer.appendChild(newPrevButton);
            
            // Create next button
            const newNextButton = document.createElement('button');
            newNextButton.id = 'next-question-button';
            newNextButton.className = 'nav-button';
            newNextButton.textContent = '下一题';
            newNextButton.style.cssText = `
                padding: 10px 20px;
                font-size: 16px;
                background-color: #4299e1;
                color: white;
                border: none;
                border-radius: 8px;
                cursor: pointer;
                transition: all 0.2s ease;
                box-shadow: 0 2px 4px rgba(66, 153, 225, 0.2);
            `;
            buttonContainer.appendChild(newNextButton);
            
            navigationControls.appendChild(buttonContainer);
        }
    }
    
    // Get fresh references to the buttons
    const prevButton = document.getElementById('prev-question-button');
    const nextButton = document.getElementById('next-question-button');
    
    if (prevButton) {
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
    
    if (nextButton) {
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

// Function to handle evaluate click
function handleEvaluateClick() {
    console.log('Evaluate button clicked');
    
    // Get all questions and answers
    const questions = window.questions;
    const userAnswers = window.userAnswers;
    
    if (!questions || !userAnswers || questions.length === 0) {
        console.error('No questions or answers available for evaluation');
        return;
    }
    
    // Calculate score
    let correctCount = 0;
    userAnswers.forEach((answer, index) => {
        if (answer === questions[index].answer) {
            correctCount++;
        }
    });
    const scorePercentage = (correctCount / questions.length) * 100;
    
    // Create evaluation prompt
    const prompt = `我刚刚完成了一个${questions.length}道题的测验，正确率为${scorePercentage.toFixed(1)}%（${correctCount}/${questions.length}）。
请根据我的表现给出一个简短的评估和建议，包括：
1. 对我表现的总体评价
2. 我可能存在的知识盲点
3. 针对性的学习建议

以下是题目和我的答案：
${questions.map((q, i) => {
    const isCorrect = userAnswers[i] === q.answer;
    let questionText = q.questionText;
    if (questionText.startsWith('题目：')) {
        questionText = questionText.substring(3);
    }
    return `题目${i+1}：${questionText}
我的答案：${userAnswers[i] || '未作答'}
正确答案：${q.answer}
${isCorrect ? '✓ 正确' : '✗ 错误'}
`;
}).join('\n')}`;

    // Show loading state in the evaluation result
    const evaluationResult = document.getElementById('evaluation-result') || document.createElement('div');
    evaluationResult.id = 'evaluation-result';
    evaluationResult.style.cssText = `
        margin-top: 15px;
        padding: 15px;
        background: #f8f9fa;
        border-radius: 8px;
        opacity: 1;
        transition: opacity 0.3s ease;
    `;
    evaluationResult.innerHTML = `
        <div style="display: flex; justify-content: center; align-items: center; padding: 20px;">
            <div class="spinner-icon" style="
                width: 30px;
                height: 30px;
                border: 3px solid #e2e8f0;
                border-top: 3px solid #4299e1;
                border-radius: 50%;
                animation: spin 1s linear infinite;
                margin-right: 15px;
            "></div>
            <div style="font-size: 16px; color: #4a5568;">正在评估您的表现...</div>
        </div>
    `;
    
    // Add to score summary if not already there
    const scoreSummary = document.getElementById('score-summary');
    if (scoreSummary && !document.getElementById('evaluation-result')) {
        scoreSummary.appendChild(evaluationResult);
    }
    
    // Call API to get evaluation
    fetchAIResponse(prompt)
        .then(response => {
            const content = extractContentFromResponse(response);
            
            if (evaluationResult) {
                evaluationResult.innerHTML = `
                    <div style="
                        font-size: 16px;
                        color: #2d3748;
                        line-height: 1.6;
                        white-space: pre-wrap;
                    ">${content}</div>
                `;
                evaluationResult.style.display = 'block';
                evaluationResult.style.opacity = '1';
            }
        })
        .catch(error => {
            console.error('Error getting evaluation:', error);
            
            if (evaluationResult) {
                evaluationResult.innerHTML = `
                    <div style="
                        font-size: 16px;
                        color: #e53e3e;
                        text-align: center;
                        padding: 15px;
                    ">获取评估时出错，请重试</div>
                `;
            }
        });
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
    // Get the questions display container
    const questionsDisplayContainer = document.getElementById('questions-display-container');
    if (!questionsDisplayContainer) {
        console.error('Questions display container not found in showLoadingIndicator');
        return;
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
    
    // Hide empty state if it exists
    const emptyState = document.getElementById('empty-state');
    if (emptyState) {
        emptyState.classList.add('hidden');
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
    
    // Ensure navigation controls container exists
    let navigationControls = document.querySelector('.navigation-controls');
    if (!navigationControls) {
        console.log('Creating navigation controls container');
        navigationControls = document.createElement('div');
        navigationControls.className = 'navigation-controls';
        navigationControls.style.cssText = `
            display: flex;
            flex-direction: column;
            align-items: center;
            margin-top: 30px;
            padding: 20px;
            background-color: white;
            border-radius: 12px;
            box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
        `;
        
        // Create button container
        const buttonContainer = document.createElement('div');
        buttonContainer.style.cssText = `
            display: flex;
            justify-content: center;
            gap: 20px;
            width: 100%;
        `;
        
        // Create prev button if it doesn't exist
        let prevButton = document.getElementById('prev-question-button');
        if (!prevButton) {
            prevButton = document.createElement('button');
            prevButton.id = 'prev-question-button';
            prevButton.className = 'nav-button';
            prevButton.textContent = '上一题';
            prevButton.style.cssText = `
                padding: 10px 20px;
                font-size: 16px;
                background-color: #edf2f7;
                color: #4a5568;
                border: none;
                border-radius: 8px;
                cursor: pointer;
                transition: all 0.2s ease;
            `;
            buttonContainer.appendChild(prevButton);
        }
        
        // Create next button if it doesn't exist
        let nextButton = document.getElementById('next-question-button');
        if (!nextButton) {
            nextButton = document.createElement('button');
            nextButton.id = 'next-question-button';
            nextButton.className = 'nav-button';
            nextButton.textContent = '下一题';
            nextButton.style.cssText = `
                padding: 10px 20px;
                font-size: 16px;
                background-color: #4299e1;
                color: white;
                border: none;
                border-radius: 8px;
                cursor: pointer;
                transition: all 0.2s ease;
                box-shadow: 0 2px 4px rgba(66, 153, 225, 0.2);
            `;
            buttonContainer.appendChild(nextButton);
        }
        
        navigationControls.appendChild(buttonContainer);
        
        // Add to the create container
        const createContainer = document.getElementById('create-container');
        if (createContainer) {
            createContainer.appendChild(navigationControls);
        }
    } else {
        // Get existing buttons
        const prevButton = document.getElementById('prev-question-button');
        const nextButton = document.getElementById('next-question-button');
        
        // If buttons don't exist, create them
        if (!prevButton || !nextButton) {
            // Clear navigation controls
            navigationControls.innerHTML = '';
            
            // Create button container
            const buttonContainer = document.createElement('div');
            buttonContainer.style.cssText = `
                display: flex;
                justify-content: center;
                gap: 20px;
                width: 100%;
            `;
            
            // Create prev button
            const newPrevButton = document.createElement('button');
            newPrevButton.id = 'prev-question-button';
            newPrevButton.className = 'nav-button';
            newPrevButton.textContent = '上一题';
            newPrevButton.style.cssText = `
                padding: 10px 20px;
                font-size: 16px;
                background-color: #edf2f7;
                color: #4a5568;
                border: none;
                border-radius: 8px;
                cursor: pointer;
                transition: all 0.2s ease;
            `;
            buttonContainer.appendChild(newPrevButton);
            
            // Create next button
            const newNextButton = document.createElement('button');
            newNextButton.id = 'next-question-button';
            newNextButton.className = 'nav-button';
            newNextButton.textContent = '下一题';
            newNextButton.style.cssText = `
                padding: 10px 20px;
                font-size: 16px;
                background-color: #4299e1;
                color: white;
                border: none;
                border-radius: 8px;
                cursor: pointer;
                transition: all 0.2s ease;
                box-shadow: 0 2px 4px rgba(66, 153, 225, 0.2);
            `;
            buttonContainer.appendChild(newNextButton);
            
            navigationControls.appendChild(buttonContainer);
        }
    }
    
    // Get fresh references to the buttons
    const prevButton = document.getElementById('prev-question-button');
    const nextButton = document.getElementById('next-question-button');
    
    if (prevButton) {
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
    
    if (nextButton) {
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
        });
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