document.addEventListener('DOMContentLoaded', function() {
    // DOM Elements
    const categoryTitle = document.getElementById('category-title');
    const cardContainer = document.getElementById('card-container');
    const prevButton = document.getElementById('prev-category');
    const nextButton = document.getElementById('next-category');
    const currentCategorySpan = document.getElementById('current-category');
    const totalCategoriesSpan = document.getElementById('total-categories');
    const progressBar = document.getElementById('progress-bar');
    const shuffleBtn = document.getElementById('shuffle-btn');
    const autoPlayBtn = document.getElementById('auto-play-btn');
    const speedSlider = document.getElementById('speed-slider');
    const masteredCountSpan = document.getElementById('mastered-count');
    
    // Application state
    let categories = [];
    let currentCategoryIndex = 0;
    let autoPlayInterval = null;
    let autoPlaySpeed = 5000; // 5 seconds default
    let masteredSentences = new Set();
    
    // Initialize the app
    init();
    
    function init() {
        // Set up event listeners
        setupEventListeners();
        
        // Fetch sentences
        fetchSentences();
        
        // Set initial speed based on slider
        updateSpeed();
    }
    
    function setupEventListeners() {
        // Category navigation
        prevButton.addEventListener('click', navigateToPrevCategory);
        nextButton.addEventListener('click', navigateToNextCategory);
        
        // Interactive features
        shuffleBtn.addEventListener('click', shuffleCurrentCategory);
        autoPlayBtn.addEventListener('click', toggleAutoPlay);
        speedSlider.addEventListener('input', updateSpeed);
        
        // Keyboard navigation
        document.addEventListener('keydown', handleKeyboardNavigation);
    }
    
    function fetchSentences() {
        fetch('600 english sentences.txt')
            .then(response => {
                if (!response.ok) {
                    throw new Error('Failed to load sentence file');
                }
                return response.text();
            })
            .then(data => {
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
                cardContainer.innerHTML = `<div class="loading">Error loading sentences: ${error.message}<br>Attempting to load sample data instead...</div>`;
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
            
            // Create front side (English)
            const front = document.createElement('div');
            front.className = 'front';
            
            const englishDiv = document.createElement('div');
            englishDiv.className = 'english';
            englishDiv.textContent = sentence.english;
            
            front.appendChild(englishDiv);
            
            // Create back side (Chinese)
            const back = document.createElement('div');
            back.className = 'back';
            
            const chineseDiv = document.createElement('div');
            chineseDiv.className = 'chinese';
            chineseDiv.textContent = sentence.chinese;
            
            back.appendChild(chineseDiv);
            
            // Add mastered badge
            const masteredBadge = document.createElement('div');
            masteredBadge.className = 'mastered-badge';
            masteredBadge.innerHTML = '<i class="fas fa-check"></i>';
            
            // Add elements to card
            card.appendChild(front);
            card.appendChild(back);
            card.appendChild(masteredBadge);
            
            // Add card click event for flipping
            card.addEventListener('click', function(e) {
                if (e.target.closest('.mastered-badge')) {
                    toggleMastered(sentence.id, card);
                } else {
                    card.classList.toggle('flipped');
                }
            });
            
            // Add double click event for marking as mastered
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
    
    function shuffleCurrentCategory() {
        if (categories.length === 0 || !categories[currentCategoryIndex]) return;
        
        // Shuffle the sentences in the current category
        const category = categories[currentCategoryIndex];
        shuffleArray(category.sentences);
        
        // Re-display the category
        displayCategory(currentCategoryIndex);
        
        // Add animation to the button
        shuffleBtn.classList.add('success');
        setTimeout(() => shuffleBtn.classList.remove('success'), 500);
    }
    
    function shuffleArray(array) {
        for (let i = array.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [array[i], array[j]] = [array[j], array[i]];
        }
    }
    
    function toggleAutoPlay() {
        if (autoPlayInterval) {
            clearInterval(autoPlayInterval);
            autoPlayInterval = null;
            autoPlayBtn.innerHTML = '<i class="fas fa-play"></i> Auto Play';
            autoPlayBtn.classList.remove('active');
        } else {
            autoPlayCards();
            autoPlayBtn.innerHTML = '<i class="fas fa-pause"></i> Pause';
            autoPlayBtn.classList.add('active');
        }
    }
    
    function autoPlayCards() {
        // First flip all cards to front
        const cards = cardContainer.querySelectorAll('.card');
        cards.forEach(card => card.classList.remove('flipped'));
        
        let cardIndex = 0;
        
        // Show each card one by one
        autoPlayInterval = setInterval(() => {
            if (cardIndex < cards.length) {
                // First make all cards not flipped
                cards.forEach(card => card.classList.remove('flipped'));
                
                // Then flip the current one
                cards[cardIndex].classList.add('flipped');
                cards[cardIndex].scrollIntoView({ behavior: 'smooth', block: 'center' });
                cardIndex++;
            } else {
                // Move to next category when all cards are shown
                if (currentCategoryIndex < categories.length - 1) {
                    navigateToNextCategory();
                    cardIndex = 0;
                } else {
                    toggleAutoPlay(); // Stop auto play when reached the end
                }
            }
        }, autoPlaySpeed);
    }
    
    function updateSpeed() {
        // Map slider value (1-10) to milliseconds (7000ms - 1000ms)
        const value = parseInt(speedSlider.value);
        autoPlaySpeed = 8000 - (value * 700); // Faster as the value increases
        
        // If auto play is running, restart it with new speed
        if (autoPlayInterval) {
            clearInterval(autoPlayInterval);
            autoPlayCards();
        }
    }
    
    function handleKeyboardNavigation(e) {
        switch(e.key) {
            case 'ArrowLeft':
                navigateToPrevCategory();
                break;
            case 'ArrowRight':
                navigateToNextCategory();
                break;
            case ' ': // Space bar
                // Flip the first visible card or the first unflipped card
                const cards = cardContainer.querySelectorAll('.card');
                const unflippedCard = Array.from(cards).find(card => !card.classList.contains('flipped'));
                if (unflippedCard) {
                    unflippedCard.classList.add('flipped');
                } else if (cards.length > 0) {
                    cards.forEach(card => card.classList.remove('flipped'));
                }
                break;
            case 's':
                if (e.ctrlKey) {
                    e.preventDefault();
                    shuffleCurrentCategory();
                }
                break;
            case 'p':
                if (e.ctrlKey) {
                    e.preventDefault();
                    toggleAutoPlay();
                }
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