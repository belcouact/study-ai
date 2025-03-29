document.addEventListener('DOMContentLoaded', () => {
    const categoryTitleElement = document.getElementById('category-title');
    const sentenceCardsContainer = document.getElementById('sentence-cards-container');
    const nextButton = document.getElementById('next-button');

    let categoriesData = []; // Initialize as empty array
    let currentCategoryIndex = 0;

    // Function to fetch and parse the text file
    async function loadSentenceData() {
        try {
            const response = await fetch('600 english sentences.txt'); // Fetch the file
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            const text = await response.text(); // Get the file content as text
            return parseSentenceData(text); // Parse the text content
        } catch (error) {
            console.error("Error loading or parsing sentence data:", error);
            // Display error message to the user
            categoryTitleElement.textContent = 'Error';
            sentenceCardsContainer.innerHTML = `<p>Could not load sentence data. Please ensure '600 english sentences.txt' is in the same folder and the page is served correctly.</p><p>Error: ${error.message}</p>`;
            nextButton.disabled = true;
            return []; // Return empty array on error
        }
    }

    // Function to parse the raw text data into the structured format
    function parseSentenceData(text) {
        const lines = text.split(/\r?\n/); // Split text into lines (handle different line endings)
        const data = [];
        let currentCategory = null;

        lines.forEach(line => {
            line = line.trim(); // Remove leading/trailing whitespace

            if (line.startsWith('###')) {
                // Start of a new category
                const categoryName = line.substring(3).trim();
                currentCategory = {
                    category: categoryName,
                    sentences: []
                };
                data.push(currentCategory);
            } else if (line.includes('/') && currentCategory) {
                // Sentence pair line within a category
                const parts = line.split('/');
                if (parts.length >= 2) {
                    const en = parts[0].trim();
                    const zh = parts.slice(1).join('/').trim(); // Join remaining parts in case '/' is in the Chinese text
                    if (en && zh) { // Only add if both parts are non-empty
                       currentCategory.sentences.push({ en, zh });
                    }
                }
            }
            // Ignore empty lines or lines without '/' outside a category context
        });
        return data;
    }


    function displayCategory(index) {
        if (index < 0 || index >= categoriesData.length) {
            console.error("Invalid category index:", index);
            // Optionally display an error message or handle gracefully
            sentenceCardsContainer.innerHTML = '<p>Error: Category not found.</p>';
            categoryTitleElement.textContent = 'Error';
            nextButton.disabled = true; // Disable button if data is wrong
            return;
        }

        const category = categoriesData[index];
        categoryTitleElement.textContent = category.category;

        // Clear previous cards
        sentenceCardsContainer.innerHTML = '';

        // Create and append new sentence cards
        category.sentences.forEach(sentencePair => {
            const card = document.createElement('div');
            card.classList.add('sentence-card');

            const englishP = document.createElement('p');
            englishP.classList.add('english-sentence');
            englishP.textContent = sentencePair.en;

            const chineseP = document.createElement('p');
            chineseP.classList.add('chinese-translation');
            chineseP.textContent = sentencePair.zh;

            card.appendChild(englishP);
            card.appendChild(chineseP);
            sentenceCardsContainer.appendChild(card);
        });

         // Disable button if it's the last category (optional)
         // Or let it loop back around as implemented in the click handler
         // nextButton.disabled = (index === categoriesData.length - 1);
    }

    // Event listener for the next button
    nextButton.addEventListener('click', () => {
        if (!categoriesData || categoriesData.length === 0) return; // Don't do anything if data isn't loaded

        currentCategoryIndex++;
        // Wrap around to the first category if we've gone past the last one
        if (currentCategoryIndex >= categoriesData.length) {
            currentCategoryIndex = 0;
        }
        displayCategory(currentCategoryIndex);
    });

    // Main function to initialize the page
    async function initializePage() {
        categoriesData = await loadSentenceData(); // Load and parse data

        // Initial display of the first category if data loaded successfully
        if (categoriesData && categoriesData.length > 0) {
            displayCategory(currentCategoryIndex);
            nextButton.disabled = false; // Ensure button is enabled
        } else if (!categoriesData || categoriesData.length === 0) {
            // Handle case where data loading failed or file was empty/incorrectly formatted
            // Error message is already displayed by loadSentenceData in case of fetch errors
            if (!document.querySelector('#sentence-cards-container p')) { // Avoid overwriting fetch error message
                 categoryTitleElement.textContent = 'No Data';
                 sentenceCardsContainer.innerHTML = '<p>No categories found in the data file or the file is empty/incorrectly formatted.</p>';
            }
            nextButton.disabled = true;
        }
    }

    // Start the initialization process
    initializePage();

}); 