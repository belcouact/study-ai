document.addEventListener('DOMContentLoaded', function() {
    // DOM Elements
    const categoryTitle = document.getElementById('category-title');
    const cardContainer = document.getElementById('card-container');
    const prevButton = document.getElementById('prev-category');
    const nextButton = document.getElementById('next-category');
    const currentCategorySpan = document.getElementById('current-category');
    const totalCategoriesSpan = document.getElementById('total-categories');
    
    // Application state
    let categories = [];
    let currentCategoryIndex = 0;
    
    // Fetch and parse the sentences file
    fetch('600 english sentences.txt')
        .then(response => {
            if (!response.ok) {
                throw new Error('Failed to load sentence file');
            }
            return response.text();
        })
        .then(data => {
            // Parse the content
            parseContent(data);
            
            // Update UI with total categories
            totalCategoriesSpan.textContent = categories.length;
            
            // Display the first category
            displayCategory(currentCategoryIndex);
            
            // Enable/disable navigation buttons
            updateNavButtons();
        })
        .catch(error => {
            console.error('Error:', error);
            cardContainer.innerHTML = `<div class="loading">Error loading sentences: ${error.message}</div>`;
        });
    
    // Parse content into categories
    function parseContent(content) {
        const lines = content.split('\n');
        let currentCategory = null;
        
        for (const line of lines) {
            const trimmedLine = line.trim();
            
            // Skip empty lines
            if (!trimmedLine) continue;
            
            // Check if line is a category title
            if (trimmedLine.startsWith('###')) {
                const categoryName = trimmedLine.substring(3).trim();
                currentCategory = {
                    title: categoryName,
                    sentences: []
                };
                categories.push(currentCategory);
            } 
            // If not a category title and we have a current category, it's a sentence
            else if (currentCategory && trimmedLine.includes('/')) {
                const [english, chinese] = trimmedLine.split('/').map(part => part.trim());
                if (english && chinese) {
                    currentCategory.sentences.push({ english, chinese });
                }
            }
        }
    }
    
    // Display a specific category
    function displayCategory(index) {
        if (index < 0 || index >= categories.length) return;
        
        const category = categories[index];
        categoryTitle.textContent = category.title;
        currentCategorySpan.textContent = index + 1;
        
        // Clear previous cards
        cardContainer.innerHTML = '';
        
        // Create cards for each sentence pair
        category.sentences.forEach(sentence => {
            const card = document.createElement('div');
            card.className = 'card';
            
            const englishDiv = document.createElement('div');
            englishDiv.className = 'english';
            englishDiv.textContent = sentence.english;
            
            const chineseDiv = document.createElement('div');
            chineseDiv.className = 'chinese';
            chineseDiv.textContent = sentence.chinese;
            
            card.appendChild(englishDiv);
            card.appendChild(chineseDiv);
            
            cardContainer.appendChild(card);
        });
    }
    
    // Update navigation buttons based on current position
    function updateNavButtons() {
        prevButton.disabled = currentCategoryIndex === 0;
        nextButton.disabled = currentCategoryIndex === categories.length - 1;
    }
    
    // Event listeners for navigation buttons
    prevButton.addEventListener('click', function() {
        if (currentCategoryIndex > 0) {
            currentCategoryIndex--;
            displayCategory(currentCategoryIndex);
            updateNavButtons();
        }
    });
    
    nextButton.addEventListener('click', function() {
        if (currentCategoryIndex < categories.length - 1) {
            currentCategoryIndex++;
            displayCategory(currentCategoryIndex);
            updateNavButtons();
        }
    });
}); 