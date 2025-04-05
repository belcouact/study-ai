/**
 * 数学学习模块脚本
 */

document.addEventListener('DOMContentLoaded', () => {
    // 导航切换
    const navButtons = document.querySelectorAll('.nav-btn');
    const contentSections = document.querySelectorAll('.content-section');
    
    // 为导航按钮添加点击事件
    navButtons.forEach(button => {
        button.addEventListener('click', () => {
            // 获取目标部分的 ID
            const targetId = button.getAttribute('data-target');
            
            // 移除所有按钮的 active 类
            navButtons.forEach(btn => btn.classList.remove('active'));
            
            // 给点击的按钮添加 active 类
            button.classList.add('active');
            
            // 隐藏所有内容部分
            contentSections.forEach(section => {
                section.classList.remove('active');
            });
            
            // 显示目标内容部分
            document.getElementById(targetId).classList.add('active');
        });
    });
    
    // 解题技巧功能
    const mathTopicSelect = document.getElementById('math-topic');
    const loadTechniquesBtn = document.getElementById('load-techniques-btn');
    const techniquesList = document.getElementById('techniques-list');
    
    loadTechniquesBtn.addEventListener('click', () => {
        const selectedTopic = mathTopicSelect.value;
        loadTechniques(selectedTopic);
    });
    
    // 加载技巧内容
    function loadTechniques(topic) {
        // 显示加载中效果
        techniquesList.innerHTML = '<div class="loading">加载中...</div>';
        techniquesList.classList.remove('hidden');
        
        // 模拟加载数据（实际应用中这里会从API获取数据）
        setTimeout(() => {
            // 获取对应主题的技巧
            const techniques = getTechniquesByTopic(topic);
            
            // 清空并填充内容
            techniquesList.innerHTML = '';
            
            techniques.forEach(technique => {
                const techniqueElement = document.createElement('div');
                techniqueElement.classList.add('technique-card');
                
                techniqueElement.innerHTML = `
                    <h3>${technique.title}</h3>
                    <div class="technique-content">${technique.content}</div>
                    ${technique.example ? `
                        <div class="technique-example">
                            <h4>例题</h4>
                            <div class="example-content">${technique.example}</div>
                        </div>
                    ` : ''}
                `;
                
                techniquesList.appendChild(techniqueElement);
            });
        }, 800);
    }
    
    // 获取不同主题的技巧数据
    function getTechniquesByTopic(topic) {
        // 模拟数据，实际应用中这些数据可能来自服务器
        const techniquesData = {
            algebra: [
                {
                    title: "因式分解技巧",
                    content: "<p>因式分解是代数运算中的基本技巧。常见的因式分解方法有：</p><ul><li>提取公因式</li><li>公式法（如：完全平方公式、立方和公式等）</li><li>分组分解法</li></ul>",
                    example: "<p>例如，对于表达式 $x^2 - 9$，可以使用平方差公式：$a^2 - b^2 = (a+b)(a-b)$</p><p>所以 $x^2 - 9 = x^2 - 3^2 = (x+3)(x-3)$</p>"
                },
                {
                    title: "解方程步骤",
                    content: "<p>解方程时，可以按照以下步骤进行：</p><ol><li>去分母（如果有分式）</li><li>移项，集合同类项</li><li>因式分解（如果需要）</li><li>求解</li><li>检验</li></ol>",
                    example: "<p>解方程：$\\frac{x-1}{2} + \\frac{x+1}{3} = 1$</p><p>步骤1：消除分母 $3(x-1) + 2(x+1) = 6$</p><p>步骤2：展开、合并 $3x - 3 + 2x + 2 = 6$，即 $5x - 1 = 6$</p><p>步骤3：解得 $5x = 7$，$x = \\frac{7}{5}$</p>"
                }
            ],
            geometry: [
                {
                    title: "三角形性质应用",
                    content: "<p>解几何问题时，可以利用以下基本性质：</p><ul><li>三角形内角和为 180°</li><li>勾股定理 $a^2 + b^2 = c^2$</li><li>相似三角形的对应边成比例</li><li>三角函数</li></ul>",
                    example: "<p>在直角三角形中，已知两边长分别为 3 和 4，求第三边的长度。</p><p>根据勾股定理，$c^2 = 3^2 + 4^2 = 9 + 16 = 25$</p><p>所以 $c = 5$</p>"
                },
                {
                    title: "圆的性质应用",
                    content: "<p>圆的核心性质包括：</p><ul><li>圆的周长 $C = 2\\pi r$</li><li>圆的面积 $A = \\pi r^2$</li><li>圆内接四边形的对角互补</li><li>切线与半径垂直</li></ul>",
                    example: "<p>一个圆的半径为 4 厘米，求该圆的周长和面积。</p><p>周长 $C = 2\\pi \\times 4 = 8\\pi$ 厘米</p><p>面积 $A = \\pi \\times 4^2 = 16\\pi$ 平方厘米</p>"
                }
            ],
            calculus: [
                {
                    title: "求导法则",
                    content: "<p>求导的基本法则：</p><ul><li>常数的导数为 0</li><li>幂函数 $f(x) = x^n$ 的导数为 $f'(x) = nx^{n-1}$</li><li>和差法则 $(f \\pm g)' = f' \\pm g'$</li><li>乘积法则 $(fg)' = f'g + fg'$</li><li>商法则 $(\\frac{f}{g})' = \\frac{f'g - fg'}{g^2}$</li><li>链式法则 $(f(g(x)))' = f'(g(x)) \\cdot g'(x)$</li></ul>",
                    example: "<p>计算 $f(x) = x^3 + 2x^2 - 5x + 1$ 的导数。</p><p>使用幂函数法则和和差法则：</p><p>$f'(x) = 3x^2 + 4x - 5$</p>"
                }
            ],
            probability: [
                {
                    title: "概率基本公式",
                    content: "<p>概率统计中的核心公式：</p><ul><li>概率公式：$P(A) = \\frac{事件A的有利结果数}{样本空间的总结果数}$</li><li>互斥事件：$P(A 或 B) = P(A) + P(B)$</li><li>非互斥事件：$P(A 或 B) = P(A) + P(B) - P(A 和 B)$</li><li>条件概率：$P(A|B) = \\frac{P(A 和 B)}{P(B)}$</li></ul>",
                    example: "<p>在一个公平的骰子中，求掷出大于 4 的点数的概率。</p><p>有利结果：掷出 5 或 6，共 2 种。</p><p>样本空间：1, 2, 3, 4, 5, 6，共 6 种。</p><p>所以概率 $P = \\frac{2}{6} = \\frac{1}{3}$</p>"
                }
            ]
        };
        
        return techniquesData[topic] || [];
    }
    
    // 公式库功能
    const formulaCatButtons = document.querySelectorAll('.formula-cat-btn');
    const formulaSections = document.querySelectorAll('.formula-section');
    
    // 公式分类切换
    formulaCatButtons.forEach(button => {
        button.addEventListener('click', () => {
            const category = button.getAttribute('data-category');
            
            // 更新按钮状态
            formulaCatButtons.forEach(btn => btn.classList.remove('active'));
            button.classList.add('active');
            
            // 更新显示的公式部分
            formulaSections.forEach(section => {
                section.classList.remove('active');
            });
            
            document.getElementById(`${category}-formulas`).classList.add('active');
        });
    });
    
    // 练习区功能
    const practiceDifficulty = document.getElementById('practice-difficulty');
    const practiceTopic = document.getElementById('practice-topic');
    const generatePracticeBtn = document.getElementById('generate-practice-btn');
    const practiceQuestions = document.getElementById('practice-questions');
    
    generatePracticeBtn.addEventListener('click', () => {
        const difficulty = practiceDifficulty.value;
        const topic = practiceTopic.value;
        
        generatePractice(difficulty, topic);
    });
    
    // 生成练习题
    function generatePractice(difficulty, topic) {
        // 显示加载状态
        practiceQuestions.innerHTML = '<div class="loading">正在生成练习题...</div>';
        practiceQuestions.classList.remove('hidden');
        
        // 模拟加载数据
        setTimeout(() => {
            // 获取练习题
            const questions = getPracticeQuestions(difficulty, topic);
            
            // 清空并填充内容
            practiceQuestions.innerHTML = '';
            
            // 添加题目
            const questionsForm = document.createElement('form');
            questionsForm.id = 'practice-form';
            
            questions.forEach((question, index) => {
                const questionElement = document.createElement('div');
                questionElement.classList.add('practice-question');
                
                let choicesHTML = '';
                if (question.choices) {
                    choicesHTML = '<div class="question-choices">';
                    question.choices.forEach((choice, choiceIndex) => {
                        const choiceLetter = String.fromCharCode(65 + choiceIndex); // A, B, C, D...
                        choicesHTML += `
                            <div class="choice-item">
                                <input type="radio" id="q${index+1}_${choiceLetter}" name="q${index+1}" value="${choiceLetter}">
                                <label for="q${index+1}_${choiceLetter}">${choiceLetter}. ${choice}</label>
                            </div>
                        `;
                    });
                    choicesHTML += '</div>';
                }
                
                questionElement.innerHTML = `
                    <div class="question-header">问题 ${index+1}</div>
                    <div class="question-text">${question.text}</div>
                    ${choicesHTML}
                    <div class="answer-input">
                        ${!question.choices ? `
                            <label for="answer${index+1}">答案：</label>
                            <input type="text" id="answer${index+1}" name="answer${index+1}" placeholder="请输入答案">
                        ` : ''}
                    </div>
                `;
                
                questionsForm.appendChild(questionElement);
            });
            
            // 添加提交按钮
            const submitButton = document.createElement('button');
            submitButton.type = 'button';
            submitButton.textContent = '检查答案';
            submitButton.classList.add('submit-practice');
            submitButton.addEventListener('click', checkAnswers);
            
            questionsForm.appendChild(submitButton);
            practiceQuestions.appendChild(questionsForm);
        }, 1000);
    }
    
    // 检查练习答案
    function checkAnswers() {
        alert('此功能尚未实现，将在未来版本中添加。');
    }
    
    // 获取练习题
    function getPracticeQuestions(difficulty, topic) {
        // 模拟数据，实际应用中可能从服务器获取
        const questionsData = {
            arithmetic: {
                easy: [
                    {
                        text: "计算：$25 + 18$",
                        answer: "43"
                    },
                    {
                        text: "计算：$72 ÷ 9$",
                        answer: "8"
                    }
                ],
                medium: [
                    {
                        text: "计算：$137 + 285$",
                        answer: "422"
                    },
                    {
                        text: "计算：$528 ÷ 12$",
                        answer: "44"
                    }
                ],
                hard: [
                    {
                        text: "计算：$3.75 × 2.6$",
                        answer: "9.75"
                    }
                ]
            },
            algebra: {
                easy: [
                    {
                        text: "解方程：$x + 5 = 12$",
                        answer: "7"
                    },
                    {
                        text: "化简：$3x + 2x$",
                        answer: "5x"
                    }
                ],
                medium: [
                    {
                        text: "解方程：$2x - 3 = 7$",
                        answer: "5"
                    },
                    {
                        text: "解方程：$\\frac{x}{3} = 4$",
                        answer: "12"
                    }
                ],
                hard: [
                    {
                        text: "解方程：$3(x-1) - 2(x+2) = 4$",
                        choices: ["$x = 7$", "$x = 8$", "$x = 9$", "$x = 10$"],
                        answer: "B"
                    }
                ]
            },
            geometry: {
                easy: [
                    {
                        text: "计算正方形的面积，边长为 5 厘米。",
                        answer: "25"
                    },
                    {
                        text: "三角形的底是 6 厘米，高是 4 厘米，求面积。",
                        answer: "12"
                    }
                ],
                medium: [
                    {
                        text: "圆的半径是 4 厘米，求周长（用 $\\pi$ 表示）。",
                        answer: "8π"
                    }
                ],
                hard: [
                    {
                        text: "直角三角形的两直角边分别为 5 和 12，求斜边长。",
                        choices: ["12", "13", "14", "15"],
                        answer: "B"
                    }
                ]
            },
            functions: {
                easy: [
                    {
                        text: "函数 $f(x) = 2x + 3$ 中，计算 $f(2)$。",
                        answer: "7"
                    }
                ],
                medium: [
                    {
                        text: "函数 $f(x) = x^2 - 3x + 2$ 中，计算 $f(3)$。",
                        answer: "2"
                    }
                ],
                hard: [
                    {
                        text: "求函数 $f(x) = 2x^2 - 3x + 1$ 的导数。",
                        choices: ["$f'(x) = 4x - 3$", "$f'(x) = 4x^2 - 3$", "$f'(x) = 2x - 3$", "$f'(x) = 4x - 6$"],
                        answer: "A"
                    }
                ]
            }
        };
        
        return questionsData[topic]?.[difficulty] || [];
    }
    
    // 初始加载
    // 如果 URL 有参数，可以根据参数加载不同的内容
    const urlParams = new URLSearchParams(window.location.search);
    const sectionParam = urlParams.get('section');
    
    if (sectionParam) {
        const targetButton = document.querySelector(`.nav-btn[data-target="${sectionParam}"]`);
        if (targetButton) {
            targetButton.click();
        }
    }
}); 