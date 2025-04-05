/**
 * 语文学习模块脚本
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
    
    // 写作指导功能
    const writingCatButtons = document.querySelectorAll('.writing-cat-btn');
    const writingSections = document.querySelectorAll('.writing-section');
    
    // 写作类型切换
    writingCatButtons.forEach(button => {
        button.addEventListener('click', () => {
            const category = button.getAttribute('data-category');
            
            // 更新按钮状态
            writingCatButtons.forEach(btn => btn.classList.remove('active'));
            button.classList.add('active');
            
            // 更新显示的写作部分
            writingSections.forEach(section => {
                section.classList.remove('active');
            });
            
            document.getElementById(`${category}-section`).classList.add('active');
        });
    });
    
    // 成语学习功能
    const idiomCatButtons = document.querySelectorAll('.idiom-cat-btn');
    const idiomSearchInput = document.getElementById('idiom-search-input');
    const idiomSearchBtn = document.getElementById('idiom-search-btn');
    const idiomList = document.querySelector('.idiom-list');
    const prevPageBtn = document.getElementById('prev-page');
    const nextPageBtn = document.getElementById('next-page');
    const pageInfo = document.getElementById('page-info');
    
    // 成语数据状态
    let idiomData = [];
    let filteredIdioms = [];
    let currentPage = 1;
    const itemsPerPage = 6;
    let currentLevel = 'all';
    
    // 加载示例成语
    const sampleIdioms = [
        {
            title: "画龙点睛",
            pronunciation: "huà lóng diǎn jīng",
            meaning: "比喻在关键处用几句话或几笔把情况或人物的特征突出出来。",
            source: "南朝·宋·刘义庆《世说新语·巧艺》记载，顾恺之画龙，最后点上眼睛，龙就活了。",
            example: "这篇文章的结尾画龙点睛，点明了主题。",
            level: "junior"
        },
        {
            title: "守株待兔",
            pronunciation: "shǒu zhū dài tù",
            meaning: "比喻墨守成规，不知变通。",
            source: "战国韩·韩非《韩非子·五蠹》",
            example: "做事要灵活变通，不能守株待兔。",
            level: "primary"
        },
        {
            title: "亡羊补牢",
            pronunciation: "wáng yáng bǔ láo",
            meaning: "比喻出了问题以后想办法补救，可以防止再次发生同样的错误。",
            source: "《战国策·楚策四》",
            example: "这次考试没考好，亡羊补牢，为时未晚，下次争取考好。",
            level: "primary"
        },
        {
            title: "望洋兴叹",
            pronunciation: "wàng yáng xīng tàn",
            meaning: "面对高深莫测的事物而感到无能为力。",
            source: "《庄子·秋水》",
            example: "面对这道难题，他只能望洋兴叹。",
            level: "junior"
        },
        {
            title: "不言而喻",
            pronunciation: "bù yán ér yù",
            meaning: "不用明说就可以明白。",
            source: "《周易·系辞上》",
            example: "他的态度已经不言而喻了。",
            level: "junior"
        },
        {
            title: "集腋成裘",
            pronunciation: "jí yè chéng qiú",
            meaning: "把狐狸腋下的皮毛集合起来，可以做成一件皮袍。比喻积少成多。",
            source: "《战国策·魏策一》",
            example: "只要我们持之以恒地学习，就能集腋成裘，积累丰富的知识。",
            level: "senior"
        },
        {
            title: "刻舟求剑",
            pronunciation: "kè zhōu qiú jiàn",
            meaning: "比喻做事不懂得随着情况的变化而变化，拘泥固执，必然失败。",
            source: "战国楚·吕不韦《吕氏春秋·察今》",
            example: "他解决问题的方法总是刻舟求剑，不懂得灵活变通。",
            level: "primary"
        },
        {
            title: "一叶障目",
            pronunciation: "yī yè zhàng mù",
            meaning: "被一片树叶挡住眼睛而看不见泰山。比喻为局部或暂时的现象所迷惑,不能看到全局或本质。",
            source: "《吕氏春秋·察今》",
            example: "不要一叶障目，不见泰山，要有全局观念。",
            level: "senior"
        },
        {
            title: "沧海桑田",
            pronunciation: "cāng hǎi sāng tián",
            meaning: "大海变成桑田，桑田变成大海。比喻世事变化很大。",
            source: "唐·白居易《长恨歌》",
            example: "几十年过去了，家乡已经沧海桑田，变得我都快认不出来了。",
            level: "junior"
        },
        {
            title: "一蹴而就",
            pronunciation: "yī cù ér jiù",
            meaning: "踏一步就成功。比喻事情轻而易举，一下子就能完成。",
            source: "《汉书·枚乘传》",
            example: "学习不是一蹴而就的事情，需要长期坚持。",
            level: "senior"
        }
    ];
    
    // 初始化成语数据
    idiomData = sampleIdioms;
    filteredIdioms = sampleIdioms;
    
    // 显示成语列表
    function displayIdioms() {
        // 计算当前页的成语
        const startIndex = (currentPage - 1) * itemsPerPage;
        const endIndex = Math.min(startIndex + itemsPerPage, filteredIdioms.length);
        const currentIdioms = filteredIdioms.slice(startIndex, endIndex);
        
        // 清空列表
        idiomList.innerHTML = '';
        
        // 添加成语卡片
        currentIdioms.forEach(idiom => {
            const idiomCard = document.createElement('div');
            idiomCard.classList.add('idiom-card');
            
            idiomCard.innerHTML = `
                <div class="idiom-title">${idiom.title}</div>
                <div class="idiom-content">
                    <p><strong>发音：</strong>${idiom.pronunciation}</p>
                    <p><strong>释义：</strong>${idiom.meaning}</p>
                    <p><strong>出处：</strong>${idiom.source}</p>
                    <p><strong>例句：</strong>${idiom.example}</p>
                </div>
            `;
            
            idiomList.appendChild(idiomCard);
        });
        
        // 更新分页信息
        pageInfo.textContent = `第 ${currentPage} 页 / 共 ${Math.ceil(filteredIdioms.length / itemsPerPage)} 页`;
        
        // 更新按钮状态
        prevPageBtn.disabled = currentPage === 1;
        nextPageBtn.disabled = currentPage >= Math.ceil(filteredIdioms.length / itemsPerPage);
    }
    
    // 筛选成语
    function filterIdioms() {
        const searchText = idiomSearchInput.value.trim().toLowerCase();
        
        filteredIdioms = idiomData.filter(idiom => {
            // 根据级别筛选
            const levelMatch = currentLevel === 'all' || idiom.level === currentLevel;
            
            // 根据搜索文本筛选
            const searchMatch = searchText === '' || 
                idiom.title.toLowerCase().includes(searchText) || 
                idiom.meaning.toLowerCase().includes(searchText) ||
                idiom.example.toLowerCase().includes(searchText);
            
            return levelMatch && searchMatch;
        });
        
        // 重置页码并显示
        currentPage = 1;
        displayIdioms();
    }
    
    // 搜索按钮点击事件
    idiomSearchBtn.addEventListener('click', filterIdioms);
    
    // 输入框按回车搜索
    idiomSearchInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            filterIdioms();
        }
    });
    
    // 分类按钮点击事件
    idiomCatButtons.forEach(button => {
        button.addEventListener('click', () => {
            currentLevel = button.getAttribute('data-level');
            
            // 更新按钮状态
            idiomCatButtons.forEach(btn => btn.classList.remove('active'));
            button.classList.add('active');
            
            // 筛选并显示
            filterIdioms();
        });
    });
    
    // 分页按钮点击事件
    prevPageBtn.addEventListener('click', () => {
        if (currentPage > 1) {
            currentPage--;
            displayIdioms();
        }
    });
    
    nextPageBtn.addEventListener('click', () => {
        if (currentPage < Math.ceil(filteredIdioms.length / itemsPerPage)) {
            currentPage++;
            displayIdioms();
        }
    });
    
    // 初始显示成语
    displayIdioms();
    
    // 诗词鉴赏功能
    const poetryTypeSelect = document.getElementById('poetry-type');
    const poetryThemeSelect = document.getElementById('poetry-theme');
    const loadPoetryBtn = document.getElementById('load-poetry-btn');
    const poetryDisplay = document.getElementById('poetry-display');
    
    // 用于存储诗词相关DOM元素的引用
    let poetryElements = {
        title: null,
        author: null,
        text: null,
        background: null,
        explanation: null,
        prevBtn: null,
        nextBtn: null,
        counter: null
    };
    
    // 诗词数据状态
    let poems = [];
    let currentPoemIndex = 0;
    
    loadPoetryBtn.addEventListener('click', () => {
        const type = poetryTypeSelect.value;
        const theme = poetryThemeSelect.value;
        
        // 模拟加载诗词数据
        loadPoems(type, theme);
    });
    
    // 加载诗词数据
    function loadPoems(type, theme) {
        // 显示加载中效果
        poetryDisplay.innerHTML = '<div class="loading">加载诗词中...</div>';
        poetryDisplay.classList.remove('hidden');
        
        // 模拟加载延迟
        setTimeout(() => {
            // 获取符合条件的诗词
            poems = getPoemsData(type, theme);
            currentPoemIndex = 0;
            
            if (poems.length > 0) {
                // 显示诗词导航和内容
                poetryDisplay.innerHTML = document.querySelector('#poetry-display').innerHTML;
                
                // 更新诗词元素引用
                updatePoetryElements();
                
                // 显示第一首诗
                displayPoem(currentPoemIndex);
                updatePoetryNavigation();
                
                // 添加导航点击事件
                if (poetryElements.prevBtn) {
                    poetryElements.prevBtn.addEventListener('click', () => {
                        if (currentPoemIndex > 0) {
                            currentPoemIndex--;
                            displayPoem(currentPoemIndex);
                            updatePoetryNavigation();
                        }
                    });
                }
                
                if (poetryElements.nextBtn) {
                    poetryElements.nextBtn.addEventListener('click', () => {
                        if (currentPoemIndex < poems.length - 1) {
                            currentPoemIndex++;
                            displayPoem(currentPoemIndex);
                            updatePoetryNavigation();
                        }
                    });
                }
            } else {
                // 没有找到匹配的诗词
                poetryDisplay.innerHTML = `
                    <div class="empty-state">
                        <i class="fas fa-book"></i>
                        <h3>未找到诗词</h3>
                        <p>未找到符合条件的诗词，请尝试其他类型或主题。</p>
                    </div>
                `;
            }
        }, 1000);
    }
    
    // 更新诗词元素引用
    function updatePoetryElements() {
        poetryElements = {
            title: document.querySelector('.poem-title'),
            author: document.querySelector('.poem-author'),
            text: document.querySelector('.poem-text'),
            background: document.querySelector('.poem-background'),
            explanation: document.querySelector('.poem-explanation'),
            prevBtn: document.getElementById('prev-poem'),
            nextBtn: document.getElementById('next-poem'),
            counter: document.getElementById('poem-counter')
        };
    }
    
    // 显示诗词
    function displayPoem(index) {
        if (index < 0 || index >= poems.length) return;
        
        const poem = poems[index];
        
        // 更新诗词元素引用，以防DOM更新
        updatePoetryElements();
        
        if (poetryElements.title) poetryElements.title.textContent = poem.title;
        if (poetryElements.author) poetryElements.author.textContent = `${poem.dynasty} · ${poem.author}`;
        if (poetryElements.text) poetryElements.text.textContent = poem.content;
        if (poetryElements.background) poetryElements.background.textContent = poem.background;
        if (poetryElements.explanation) poetryElements.explanation.textContent = poem.analysis;
    }
    
    // 更新诗词导航状态
    function updatePoetryNavigation() {
        // 更新诗词元素引用，以防DOM更新
        updatePoetryElements();
        
        if (poetryElements.prevBtn) {
            poetryElements.prevBtn.disabled = currentPoemIndex === 0;
        }
        
        if (poetryElements.nextBtn) {
            poetryElements.nextBtn.disabled = currentPoemIndex === poems.length - 1;
        }
        
        if (poetryElements.counter) {
            poetryElements.counter.textContent = `${currentPoemIndex + 1}/${poems.length}`;
        }
    }
    
    // 获取诗词数据
    function getPoemsData(type, theme) {
        // 示例诗词数据
        const poemsData = [
            {
                title: "静夜思",
                author: "李白",
                dynasty: "唐",
                type: "tang",
                theme: "nature",
                content: "床前明月光，疑是地上霜。\n举头望明月，低头思故乡。",
                background: "作者在客居他乡时，夜晚思念故乡家人所作。",
                analysis: "这是一首思乡诗。诗人透过床前明亮的月光，引发对故乡的思念。全诗语言清新自然，意境优美，情感真挚动人，是中国最著名的古诗之一。"
            },
            {
                title: "望岳",
                author: "杜甫",
                dynasty: "唐",
                type: "tang",
                theme: "nature",
                content: "岱宗夫如何？齐鲁青未了。\n造化钟神秀，阴阳割昏晓。\n荡胸生曾云，决眦入归鸟。\n会当凌绝顶，一览众山小。",
                background: "杜甫壮年时游历至泰山时所作，表达了他对祖国大好河山的热爱和对人生理想的追求。",
                analysis: "诗人通过描绘泰山的雄伟壮观，表达了对自然的赞美和对生活的积极态度。最后两句会当凌绝顶，一览众山小更是成为千古名句，象征着积极进取、勇攀高峰的人生态度。"
            },
            {
                title: "水调歌头·明月几时有",
                author: "苏轼",
                dynasty: "宋",
                type: "song",
                theme: "love",
                content: "明月几时有？把酒问青天。不知天上宫阙，今夕是何年。\n我欲乘风归去，又恐琼楼玉宇，高处不胜寒。\n起舞弄清影，何似在人间。\n转朱阁，低绮户，照无眠。\n不应有恨，何事长向别时圆？\n人有悲欢离合，月有阴晴圆缺，此事古难全。\n但愿人长久，千里共婵娟。",
                background: "苏轼在中秋节思念远方弟弟所作。",
                analysis: "这首词抒发了作者对亲人的思念之情，同时也蕴含了豁达的人生态度。结尾但愿人长久，千里共婵娟成为千古名句，表达了美好的祝愿。"
            }
        ];
        
        // 根据类型和主题过滤
        return poemsData.filter(poem => {
            const typeMatch = type === 'all' || poem.type === type;
            const themeMatch = theme === 'all' || poem.theme === theme;
            return typeMatch && themeMatch;
        });
    }
    
    // 阅读分析功能
    const readingLevelButtons = document.querySelectorAll('.reading-level-btn');
    const readingContent = document.getElementById('reading-content');
    
    // 阅读级别切换
    readingLevelButtons.forEach(button => {
        button.addEventListener('click', () => {
            const level = button.getAttribute('data-level');
            
            // 更新按钮状态
            readingLevelButtons.forEach(btn => btn.classList.remove('active'));
            button.classList.add('active');
            
            // 显示加载状态
            const emptyState = document.querySelector('.reading-container .empty-state');
            if (emptyState) {
                emptyState.innerHTML = '<div class="loading">加载阅读内容中...</div>';
            }
            
            // 加载相应级别的阅读内容
            loadReadingContent(level);
        });
    });
    
    // 加载阅读内容
    function loadReadingContent(level) {
        // 模拟加载延迟
        setTimeout(() => {
            // 显示虚拟阅读内容
            readingContent.innerHTML = `
                <div class="reading-card">
                    <h3>阅读练习（${level === 'primary' ? '小学' : level === 'junior' ? '初中' : '高中'}）</h3>
                    <p class="reading-note">此功能正在开发中，敬请期待更多阅读分析内容。</p>
                </div>
            `;
            readingContent.classList.remove('hidden');
            
            // 隐藏空状态
            const emptyState = document.querySelector('.reading-container .empty-state');
            if (emptyState) {
                emptyState.classList.add('hidden');
            }
        }, 800);
    }
    
    // 初始化
    // 如果URL有参数，可以根据参数加载不同的内容
    const urlParams = new URLSearchParams(window.location.search);
    const sectionParam = urlParams.get('section');
    
    if (sectionParam) {
        const targetButton = document.querySelector(`.nav-btn[data-target="${sectionParam}"]`);
        if (targetButton) {
            targetButton.click();
        }
    }
}); 