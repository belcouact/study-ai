/**
 * Common functionality for the AI Study Assistant website
 */

document.addEventListener('DOMContentLoaded', () => {
    // Grade level population based on school selection
    const schoolSelect = document.getElementById('school-level');
    const gradeSelect = document.getElementById('grade-level');
    
    // Function to update grade options based on school type
    function updateGradeOptions() {
        const schoolType = schoolSelect.value;
        gradeSelect.innerHTML = ''; // Clear existing options
        
        let grades = [];
        
        // Set appropriate grade options based on school type
        if (schoolType === '小学') {
            grades = ['一年级', '二年级', '三年级', '四年级', '五年级', '六年级'];
        } else if (schoolType === '初中') {
            grades = ['初一', '初二', '初三'];
        } else if (schoolType === '高中') {
            grades = ['高一', '高二', '高三'];
        }
        
        // Add options to select
        grades.forEach(grade => {
            const option = document.createElement('option');
            option.value = grade;
            option.textContent = grade;
            gradeSelect.appendChild(option);
        });
    }
    
    // Initialize grade options on load
    updateGradeOptions();
    
    // Update grade options when school type changes
    schoolSelect.addEventListener('change', updateGradeOptions);
    
    // QA functionality
    if (document.getElementById('qa-container')) {
        const userInput = document.getElementById('user-input');
        const submitButton = document.getElementById('submit-button');
        const optimizeButton = document.getElementById('optimize-button');
        const outputDiv = document.getElementById('output');
        const loadingDiv = document.getElementById('loading');
        
        submitButton.addEventListener('click', handleSubmit);
        optimizeButton.addEventListener('click', handleOptimize);
        
        // Handle question submission
        function handleSubmit() {
            const question = userInput.value.trim();
            
            if (!question) {
                alert('请输入问题再提交');
                return;
            }
            
            // Show loading state
            loadingDiv.classList.remove('hidden');
            
            // Simulate AI response (would be replaced with actual API call)
            setTimeout(() => {
                // Hide loading state
                loadingDiv.classList.add('hidden');
                
                // Create response element
                const responseElement = document.createElement('div');
                responseElement.classList.add('ai-message');
                
                // For demo purposes, just echo back the question with a sample response
                const responseText = `
                    <p><strong>问题：</strong>${question}</p>
                    <p><strong>回答：</strong></p>
                    <p>这是一个AI生成的示例回答。在实际实现中，这里将连接到AI服务来获取真实响应。</p>
                `;
                
                responseElement.innerHTML = responseText;
                outputDiv.appendChild(responseElement);
                
                // Clear input
                userInput.value = '';
                
                // Scroll to bottom of output
                outputDiv.scrollTop = outputDiv.scrollHeight;
            }, 1500);
        }
        
        // Handle question optimization
        function handleOptimize() {
            const question = userInput.value.trim();
            
            if (!question) {
                alert('请输入问题再优化');
                return;
            }
            
            // Show loading state
            loadingDiv.classList.remove('hidden');
            
            // Simulate optimization process
            setTimeout(() => {
                // Hide loading state
                loadingDiv.classList.add('hidden');
                
                // Add a question mark if missing
                let optimized = question;
                if (!question.endsWith('?') && !question.endsWith('？')) {
                    optimized += '？';
                }
                
                // Update input with optimized question
                userInput.value = optimized;
                userInput.focus();
            }, 800);
        }
        
        // Allow enter key to submit
        userInput.addEventListener('keydown', (e) => {
            // Enter without shift key submits
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSubmit();
            }
        });
    }
    
    // Quiz functionality
    if (document.getElementById('quiz-container')) {
        const generateBtn = document.getElementById('generate-btn');
        const evaluateBtn = document.getElementById('evaluate-btn');
        const questionsContainer = document.getElementById('questions-display-container');
        const emptyState = document.getElementById('empty-state');
        const questionText = document.getElementById('question-text');
        const choicesContainer = document.getElementById('choices-container');
        const navigationControls = document.querySelector('.navigation-controls');
        const questionCounter = document.getElementById('question-counter');
        const prevButton = document.getElementById('prev-question-button');
        const nextButton = document.getElementById('next-question-button');
        
        let currentQuestions = [];
        let currentQuestionIndex = 0;
        
        generateBtn.addEventListener('click', generateQuestions);
        
        function generateQuestions() {
            // Show loading state
            emptyState.classList.add('hidden');
            
            // Get form values
            const subject = document.getElementById('subject-select').value;
            const schoolLevel = document.getElementById('school-level').value;
            const gradeLevel = document.getElementById('grade-level').value;
            const semester = document.getElementById('semester-select').value;
            const difficulty = document.getElementById('difficulty-select').value;
            const count = parseInt(document.getElementById('question-count-select').value);
            
            // Generate mock questions (would be replaced with API call)
            currentQuestions = generateMockQuestions(subject, schoolLevel, gradeLevel, count);
            currentQuestionIndex = 0;
            
            // Display first question
            displayQuestion(0);
            updateNavigationControls();
            
            // Show navigation
            navigationControls.classList.remove('hidden');
        }
        
        function displayQuestion(index) {
            const question = currentQuestions[index];
            
            // Update question text
            questionText.innerHTML = `<h3>问题 ${index + 1}</h3><p>${question.text}</p>`;
            questionText.classList.remove('hidden');
            
            // Update choices
            choicesContainer.innerHTML = '';
            
            question.choices.forEach((choice, i) => {
                const choiceElement = document.createElement('div');
                choiceElement.classList.add('choice-item');
                
                // Add letter label (A, B, C, D)
                const letter = String.fromCharCode(65 + i);
                
                choiceElement.innerHTML = `
                    <div class="choice-label">${letter}</div>
                    <div class="choice-content">${choice}</div>
                `;
                
                // Add click event to select choice
                choiceElement.addEventListener('click', () => {
                    // Clear previous selections
                    document.querySelectorAll('.choice-item').forEach(item => {
                        item.classList.remove('selected');
                    });
                    
                    // Mark as selected
                    choiceElement.classList.add('selected');
                    
                    // Save user's answer
                    currentQuestions[currentQuestionIndex].userAnswer = i;
                    
                    // Enable evaluate button if all questions answered
                    const allAnswered = currentQuestions.every(q => q.userAnswer !== undefined);
                    evaluateBtn.disabled = !allAnswered;
                });
                
                // If user has already selected this choice, mark it
                if (question.userAnswer === i) {
                    choiceElement.classList.add('selected');
                }
                
                choicesContainer.appendChild(choiceElement);
            });
            
            choicesContainer.classList.remove('hidden');
        }
        
        function updateNavigationControls() {
            // Update counter
            questionCounter.textContent = `${currentQuestionIndex + 1} / ${currentQuestions.length}`;
            
            // Update button states
            prevButton.disabled = currentQuestionIndex === 0;
            nextButton.disabled = currentQuestionIndex === currentQuestions.length - 1;
        }
        
        // Navigation event listeners
        prevButton.addEventListener('click', () => {
            if (currentQuestionIndex > 0) {
                currentQuestionIndex--;
                displayQuestion(currentQuestionIndex);
                updateNavigationControls();
            }
        });
        
        nextButton.addEventListener('click', () => {
            if (currentQuestionIndex < currentQuestions.length - 1) {
                currentQuestionIndex++;
                displayQuestion(currentQuestionIndex);
                updateNavigationControls();
            }
        });
        
        // Evaluate quiz
        evaluateBtn.addEventListener('click', () => {
            // Calculate score
            let correctCount = 0;
            currentQuestions.forEach(question => {
                if (question.userAnswer === question.correctAnswer) {
                    correctCount++;
                }
            });
            
            const score = Math.round((correctCount / currentQuestions.length) * 100);
            
            // Show result in an alert (can be replaced with a modal or in-page result)
            alert(`测验结果: ${correctCount}/${currentQuestions.length} 正确 (${score}%)`);
        });
        
        // Mock question generator
        function generateMockQuestions(subject, school, grade, count) {
            const questions = [];
            
            // Sample questions based on subject
            const subjectQuestions = {
                math: [
                    { text: "如果 x + 5 = 12，那么 x 的值是多少？", choices: ["5", "7", "10", "15"], correctAnswer: 1 },
                    { text: "一个圆的半径是 5 厘米，它的面积是多少平方厘米？", choices: ["25π", "10π", "5π", "15π"], correctAnswer: 0 },
                    { text: "如果一个梯形的上底是 4 厘米，下底是 10 厘米，高是 3 厘米，那么它的面积是多少？", choices: ["21", "42", "14", "28"], correctAnswer: 0 },
                    { text: "在等比数列中，首项为 2，第三项为 18，则公比为？", choices: ["2", "3", "6", "9"], correctAnswer: 1 },
                    { text: "如果函数 f(x) = 2x² - 3x + 1，那么 f(2) 的值是多少？", choices: ["3", "5", "7", "9"], correctAnswer: 1 }
                ],
                chinese: [
                    { text: "下列词语中，加点字的读音完全正确的一项是：", choices: ["勃（bó）然大怒 / 鞭（biān）策 / 功不可没（mò）", "引吭（háng）高歌 / 相形见绌（chù） / 面面相觑（qù）", "踌躇（chú）满志 / 两难（nàn）境地 / 义愤填膺（yīng）", "按图索骥（jì） / 深恶痛疾（jí） / 刚直不阿（ē）"], correctAnswer: 3 },
                    { text: ""明月几时有，把酒问青天"出自哪首诗？", choices: ["《静夜思》", "《水调歌头》", "《天净沙·秋思》", "《菩萨蛮》"], correctAnswer: 1 },
                    { text: "下列句子没有语病的是：", choices: ["今天召开的会议是研究如何提高教学质量的问题。", "我们要学习先进，同时也要看到自己的不足。", "随着社会的发展，这些陈旧的观念已经渐渐被人们所抛弃。", "我们一定要加强体育锻炼，这样就能有效地预防各种疾病。"], correctAnswer: 1 },
                    { text: "下列不属于"四大名著"的是：", choices: ["《红楼梦》", "《三国演义》", "《聊斋志异》", "《西游记》"], correctAnswer: 2 },
                    { text: "下列词语解释有误的一项是：", choices: ["望梅止渴：比喻愿望实现", "画蛇添足：比喻多此一举", "守株待兔：比喻因循守旧", "不刊之论：精辟正确的言论"], correctAnswer: 0 }
                ],
                english: [
                    { text: "Choose the correct answer: She ___ a book when I called her yesterday.", choices: ["reads", "was reading", "has read", "had read"], correctAnswer: 1 },
                    { text: "Which word is the odd one out?", choices: ["Apple", "Banana", "Carrot", "Potato"], correctAnswer: 0 },
                    { text: "Choose the correct translation: '我明天要去图书馆学习。'", choices: ["I went to the library to study yesterday.", "I am going to the library to study tomorrow.", "I will go to the library and study tomorrow.", "I must go to the library for studying tomorrow."], correctAnswer: 2 },
                    { text: "Fill in the blank: If it ___ tomorrow, we will cancel the picnic.", choices: ["rains", "will rain", "is raining", "rained"], correctAnswer: 0 },
                    { text: "Choose the sentence with the correct usage:", choices: ["I have been to Beijing last year.", "I have gone to Beijing last year.", "I went to Beijing last year.", "I had been to Beijing last year."], correctAnswer: 2 }
                ],
                history: [
                    { text: "下列哪个朝代不属于中国古代的"三国"之一？", choices: ["魏", "蜀", "吴", "秦"], correctAnswer: 3 },
                    { text: "第二次世界大战结束于哪一年？", choices: ["1942年", "1943年", "1944年", "1945年"], correctAnswer: 3 },
                    { text: "下列哪位不是中国古代的"四大发明"？", choices: ["指南针", "造纸术", "印刷术", "蒸汽机"], correctAnswer: 3 },
                    { text: ""文景之治"是指哪两位皇帝在位时期的盛世？", choices: ["文帝和景帝", "武帝和昭帝", "宣帝和元帝", "成帝和哀帝"], correctAnswer: 0 },
                    { text: "辛亥革命爆发于哪一年？", choices: ["1910年", "1911年", "1912年", "1913年"], correctAnswer: 1 }
                ]
            };
            
            // Get the appropriate question set
            const questionPool = subjectQuestions[subject] || subjectQuestions.math;
            
            // Select questions based on count
            for (let i = 0; i < Math.min(count, questionPool.length); i++) {
                questions.push({...questionPool[i]});
            }
            
            return questions;
        }
    }
}); 