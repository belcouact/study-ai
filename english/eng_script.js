document.addEventListener('DOMContentLoaded', function() {
    // DOM Elements
    const categoryTitle = document.getElementById('category-title');
    const cardContainer = document.getElementById('card-container');
    const prevButton = document.getElementById('prev-category');
    const nextButton = document.getElementById('next-category');
    const currentCategorySpan = document.getElementById('current-category');
    const totalCategoriesSpan = document.getElementById('total-categories');
    const progressBar = document.getElementById('progress-bar');
    const masteredCountSpan = document.getElementById('mastered-count');
    
    // Application state
    let categories = [];
    let currentCategoryIndex = 0;
    let masteredSentences = new Set();
    
    // Initialize the app
    init();
    
    function init() {
        // Set up event listeners
        setupEventListeners();
        
        // Fetch sentences
        fetchSentences();
    }
    
    function setupEventListeners() {
        // Category navigation
        prevButton.addEventListener('click', navigateToPrevCategory);
        nextButton.addEventListener('click', navigateToNextCategory);
        
        // Keyboard navigation
        document.addEventListener('keydown', handleKeyboardNavigation);
    }
    
    function fetchSentences() {
        // Try to fetch the file with explicit UTF-8 handling
        const fileUrl = '600 english sentences.txt';
        
        fetch(fileUrl)
            .then(response => {
                if (!response.ok) {
                    throw new Error('Failed to load sentence file');
                }
                return response.arrayBuffer();
            })
            .then(buffer => {
                // Convert buffer to UTF-8 text
                const decoder = new TextDecoder('utf-8');
                const data = decoder.decode(buffer);
                
                console.log("Sample of loaded data:", data.substring(0, 100));
                parseContent(data);
                
                if (categories.length === 0) {
                    throw new Error('No categories found in the file');
                }
                
                totalCategoriesSpan.textContent = categories.length;
                displayCategory(currentCategoryIndex);
                updateNavButtons();
                updateProgressBar();
            })
            .catch(error => {
                console.error('Error:', error);
                cardContainer.innerHTML = `
                    <div class="loading">
                        Error loading sentences: ${error.message}<br>
                        Attempting to load sample data instead...<br>
                        <small>Make sure your "600 english sentences.txt" file is saved with UTF-8 encoding</small>
                    </div>`;
                loadSampleData();
            });
    }
    
    function parseContent(content) {
        const lines = content.split('\n');
        let currentCategory = null;
        
        for (const line of lines) {
            const trimmedLine = line.trim();
            
            if (!trimmedLine) continue;
            
            if (trimmedLine.startsWith('###')) {
                const categoryName = trimmedLine.substring(3).trim();
                currentCategory = {
                    title: categoryName,
                    sentences: []
                };
                categories.push(currentCategory);
            } 
            else if (currentCategory && trimmedLine.includes('/')) {
                const [english, chinese] = trimmedLine.split('/').map(part => part.trim());
                if (english && chinese) {
                    currentCategory.sentences.push({ english, chinese, id: generateId(english) });
                }
            }
        }
        
        console.log(`Parsed ${categories.length} categories with sentences`);
    }
    
    function generateId(text) {
        // Generate a simple hash for identification
        return text.toLowerCase().replace(/[^a-z0-9]/g, '').substring(0, 10);
    }
    
    function displayCategory(index) {
        if (index < 0 || index >= categories.length) return;
        
        const category = categories[index];
        categoryTitle.textContent = category.title;
        currentCategorySpan.textContent = index + 1;
        
        // Clear previous cards with fade out effect
        const existingCards = cardContainer.querySelectorAll('.card');
        if (existingCards.length > 0) {
            existingCards.forEach(card => {
                card.style.opacity = '0';
                card.style.transform = 'translateY(20px)';
            });
            
            setTimeout(() => {
                cardContainer.innerHTML = '';
                createCategoryCards(category);
            }, 300);
        } else {
            cardContainer.innerHTML = '';
            createCategoryCards(category);
        }
        
        updateProgressBar();
    }
    
    function createCategoryCards(category) {
        category.sentences.forEach((sentence, index) => {
            const card = document.createElement('div');
            card.className = 'card';
            card.dataset.id = sentence.id;
            
            if (masteredSentences.has(sentence.id)) {
                card.classList.add('mastered');
            }
            
            // Display both English and Chinese together
            const englishDiv = document.createElement('div');
            englishDiv.className = 'english';
            englishDiv.textContent = sentence.english;
            
            const chineseDiv = document.createElement('div');
            chineseDiv.className = 'chinese';
            chineseDiv.textContent = sentence.chinese;
            
            // Add mastered badge
            const masteredBadge = document.createElement('div');
            masteredBadge.className = 'mastered-badge';
            masteredBadge.innerHTML = '<i class="fas fa-check"></i>';
            
            // Add elements to card
            card.appendChild(englishDiv);
            card.appendChild(chineseDiv);
            card.appendChild(masteredBadge);
            
            // Change the click event to just toggle mastered status
            card.addEventListener('click', function(e) {
                if (e.target.closest('.mastered-badge')) {
                    toggleMastered(sentence.id, card);
                }
            });
            
            // Keep double click event for marking as mastered
            card.addEventListener('dblclick', function() {
                toggleMastered(sentence.id, card);
            });
            
            cardContainer.appendChild(card);
            
            // Add staggered animation delay
            setTimeout(() => {
                card.style.animation = `cardAppear 0.5s ease forwards ${index * 0.1}s`;
            }, 10);
        });
    }
    
    function toggleMastered(id, cardElement) {
        if (masteredSentences.has(id)) {
            masteredSentences.delete(id);
            cardElement.classList.remove('mastered');
            cardElement.classList.add('shake');
            setTimeout(() => cardElement.classList.remove('shake'), 500);
        } else {
            masteredSentences.add(id);
            cardElement.classList.add('mastered');
            cardElement.classList.add('success');
            setTimeout(() => cardElement.classList.remove('success'), 500);
        }
        
        updateMasteredCount();
    }
    
    function updateMasteredCount() {
        masteredCountSpan.textContent = masteredSentences.size;
    }
    
    function navigateToPrevCategory() {
        if (currentCategoryIndex > 0) {
            currentCategoryIndex--;
            displayCategory(currentCategoryIndex);
            updateNavButtons();
        }
    }
    
    function navigateToNextCategory() {
        if (currentCategoryIndex < categories.length - 1) {
            currentCategoryIndex++;
            displayCategory(currentCategoryIndex);
            updateNavButtons();
        }
    }
    
    function updateNavButtons() {
        prevButton.disabled = currentCategoryIndex === 0;
        nextButton.disabled = currentCategoryIndex === categories.length - 1;
    }
    
    function updateProgressBar() {
        const progress = ((currentCategoryIndex + 1) / categories.length) * 100;
        progressBar.style.width = `${progress}%`;
    }
    
    function handleKeyboardNavigation(e) {
        switch(e.key) {
            case 'ArrowLeft':
                navigateToPrevCategory();
                break;
            case 'ArrowRight':
                navigateToNextCategory();
                break;
        }
    }
    
    function loadSampleData() {
        const sampleData = `### 日常问候
Hello, how are you? / 你好，你好吗？
Good morning! / 早上好！
Nice to meet you. / 很高兴认识你。

### 问候
Hi there! / 你好！
How's it going? / 近况如何？
What's up? / 怎么了？

### 天气
It's a beautiful day today. / 今天天气真好。
It's raining. / 正在下雨。
It's quite cold. / 天气很冷。`;

        parseContent(sampleData);
        
        totalCategoriesSpan.textContent = categories.length;
        displayCategory(currentCategoryIndex);
        updateNavButtons();
        updateProgressBar();
    }
}); 