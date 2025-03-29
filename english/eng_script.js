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
    
    // Add this at the top of your script
    const hardcodedData = [
        {
            title: "日常问候",
            sentences: [
                { english: "Hello, how are you?", chinese: "你好，你好吗？", id: "hellohow" },
                { english: "I'm fine, thank you. And you?", chinese: "我很好，谢谢。你呢？", id: "imfinethank" },
                { english: "Good morning!", chinese: "早上好！", id: "goodmorning" },
                { english: "Nice to meet you.", chinese: "很高兴认识你。", id: "nicetomeet" }
            ]
        },
        {
            title: "问候",
            sentences: [
                { english: "Hi there!", chinese: "你好！", id: "hithere" },
                { english: "How's it going?", chinese: "近况如何？", id: "howsitgoing" },
                { english: "What's up?", chinese: "怎么了？", id: "whatsup" }
            ]
        },
        {
            title: "天气",
            sentences: [
                { english: "It's a beautiful day today.", chinese: "今天天气真好。", id: "beautiful" },
                { english: "It's raining.", chinese: "正在下雨。", id: "raining" },
                { english: "It's quite cold.", chinese: "天气很冷。", id: "cold" }
            ]
        }
    ];
    
    // Initialize the app
    init();
    
    function init() {
        // Set up event listeners
        setupEventListeners();
        
        // Start with hardcoded data immediately for best experience
        loadSampleData();
        
        // Then try to fetch the file
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
        
        // Create a new XMLHttpRequest to explicitly set the encoding
        const xhr = new XMLHttpRequest();
        xhr.open('GET', fileUrl, true);
        xhr.responseType = 'blob';
        
        xhr.onload = function() {
            if (xhr.status === 200) {
                const blob = xhr.response;
                const reader = new FileReader();
                reader.onload = function(e) {
                    const text = e.target.result;
                    console.log("Sample of loaded data:", text.substring(0, 100));
                    
                    try {
                        parseContent(text);
                        
                        if (categories.length === 0) {
                            throw new Error('No categories found in the file');
                        }
                        
                        totalCategoriesSpan.textContent = categories.length;
                        displayCategory(currentCategoryIndex);
                        updateNavButtons();
                        updateProgressBar();
                    } catch (error) {
                        console.error('Error parsing content:', error);
                        loadSampleData();
                    }
                };
                reader.readAsText(blob, 'UTF-8'); // Explicitly specify UTF-8 encoding
            } else {
                console.error('Error loading file:', xhr.statusText);
                cardContainer.innerHTML = `
                    <div class="loading">
                        Error loading sentences: ${xhr.statusText}<br>
                        Attempting to load sample data instead...<br>
                        <small>Make sure your "600 english sentences.txt" file is saved with UTF-8 encoding</small>
                    </div>`;
                loadSampleData();
            }
        };
        
        xhr.onerror = function() {
            console.error('Network error while fetching the file');
            cardContainer.innerHTML = `
                <div class="loading">
                    Network error while fetching the file.<br>
                    Attempting to load sample data instead...<br>
                    <small>Make sure your "600 english sentences.txt" file is saved with UTF-8 encoding</small>
                </div>`;
            loadSampleData();
        };
        
        xhr.send();
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
        
        setTimeout(fixChineseDisplay, 500);
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
            case 'h':
                if (e.ctrlKey) {
                    e.preventDefault();
                    toggleHardcodedData();
                }
                break;
        }
    }
    
    function loadSampleData() {
        categories = hardcodedData;
        
        totalCategoriesSpan.textContent = categories.length;
        displayCategory(currentCategoryIndex);
        updateNavButtons();
        updateProgressBar();
    }
    
    // Add this function to manually set Chinese characters if encoding fails
    function fixChineseDisplay() {
        const chineseDivs = document.querySelectorAll('.chinese');
        
        // Check if any Chinese text looks like it has encoding issues
        const hasEncodingIssues = Array.from(chineseDivs).some(div => {
            // More robust check for encoding issues
            const text = div.textContent;
            return text.includes('') || 
                   (text.length > 0 && !/[\u4e00-\u9fa5]/.test(text));
        });
        
        if (hasEncodingIssues) {
            console.log("Detected Chinese encoding issues, applying fix...");
            
            // Use hardcoded data as fallback
            cardContainer.innerHTML = '';
            categories = hardcodedData;
            displayCategory(currentCategoryIndex);
        }
    }
    
    // Add this at the beginning of your script
    function toggleHardcodedData() {
        console.log("Switching to hardcoded dataset");
        categories = hardcodedData;
        totalCategoriesSpan.textContent = categories.length;
        currentCategoryIndex = 0;
        displayCategory(currentCategoryIndex);
        updateNavButtons();
        updateProgressBar();
    }

    // Add this to expose the toggle function to the window
    window.toggleHardcodedData = toggleHardcodedData;

    // Add code to show debug controls when pressing Ctrl+Shift+D
    document.addEventListener('keydown', function(e) {
        if (e.ctrlKey && e.shiftKey && e.key === 'D') {
            e.preventDefault();
            const debugControls = document.querySelector('.debug-controls');
            if (debugControls) {
                debugControls.style.display = debugControls.style.display === 'none' ? 'block' : 'none';
            }
        }
    });
}); 