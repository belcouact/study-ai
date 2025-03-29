document.addEventListener('DOMContentLoaded', () => {
    const categoryTitleElement = document.getElementById('category-title');
    const sentenceCardsContainer = document.getElementById('sentence-cards-container');
    // Get references to both buttons
    const prevButton = document.getElementById('prev-button');
    const nextButton = document.getElementById('next-button');

    let categoriesData = []; // Initialize as empty array
    let currentCategoryIndex = 0;

    // Function to fetch and parse the text file
    async function loadSentenceData() {
        try {
            const response = await fetch('600 english sentences.txt'); // Fetch the file
            console.log("Fetch response status:", response.status, "ok:", response.ok); // Log fetch status

            if (!response.ok) {
                if (response.status === 404 || response.status === 0) {
                     throw new Error(`File not found or inaccessible: '600 english sentences.txt'. Ensure it's in the same folder and accessed via a web server (http://) not directly (file://).`);
                }
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const buffer = await response.arrayBuffer();
            console.log("Fetched ArrayBuffer size:", buffer.byteLength); // Log buffer size

            // Decode the ArrayBuffer as UTF-8 text
            const decoder = new TextDecoder('utf-8');
            const text = decoder.decode(buffer);
            //console.log("Decoded text (first 500 chars):", text.substring(0, 500)); // Log the start of the decoded text

            // Check if decoding produced replacement characters '' which indicates an encoding issue
            /*
            if (text.includes('') && text.length > 0) {
                 console.warn("Decoded text contains '' replacement characters, suggesting the source file might not be valid UTF-8 or was corrupted.");
                 // You might still try parsing, but warn the user
            }
            */
           
            // Proceed with parsing the decoded text
            return parseSentenceData(text);
        } catch (error) {
            console.error("Error loading or parsing sentence data:", error);
            categoryTitleElement.textContent = 'Error Loading Data';
            // Make the error message more prominent and informative
            sentenceCardsContainer.innerHTML = `<p style="color: red; font-weight: bold;">Could not load or decode sentence data.</p><p><strong>Error message:</strong> ${error.message}</p><p>Please check the browser's developer console (F12) for more details. Also, verify '600 english sentences.txt' is correctly saved as UTF-8 and is in the same folder.</p>`;
            // Disable both buttons on error
            prevButton.disabled = true;
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

            // Simple check for BOM (Byte Order Mark) - common in UTF-8 files from Windows editors
            if (line.charCodeAt(0) === 0xFEFF) {
                line = line.substring(1);
            }

            if (line.startsWith('###')) {
                // Start of a new category
                const categoryName = line.substring(3).trim();
                // Ignore potential BOM in category name if it wasn't trimmed above
                 if (categoryName.charCodeAt(0) === 0xFEFF) {
                    currentCategory = { category: categoryName.substring(1), sentences: [] };
                 } else {
                    currentCategory = { category: categoryName, sentences: [] };
                 }
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
        // Filter out categories that might have been created but ended up empty
        return data.filter(category => category.sentences.length > 0 || category.category);
    }

    function displayCategory(index) {
        if (!categoriesData || categoriesData.length === 0) {
             console.warn("displayCategory called with no data.");
             return;
        }
        index = (index + categoriesData.length) % categoriesData.length;
        currentCategoryIndex = index;

        if (index < 0 || index >= categoriesData.length) {
            console.error("Invalid category index after wrap around:", index);
            sentenceCardsContainer.innerHTML = '<p>Error: Category not found.</p>';
            categoryTitleElement.textContent = 'Error';
            prevButton.disabled = true;
            nextButton.disabled = true;
            return;
        }

        const category = categoriesData[index];
        categoryTitleElement.textContent = category.category;

        // Clear previous cards
        sentenceCardsContainer.innerHTML = '';

        // --- Animation Trigger ---
        // Create and append new sentence cards with staggered delay
        category.sentences.forEach((sentencePair, cardIndex) => {
            const card = document.createElement('div');
            card.classList.add('sentence-card');

            // Apply staggered animation delay using CSS custom property
            const delay = cardIndex * 0.07; // 70ms delay between cards
            card.style.setProperty('--animation-delay', `${delay}s`);

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
        // --- End Animation Trigger ---

         const numCategories = categoriesData.length;
         prevButton.disabled = numCategories <= 1;
         nextButton.disabled = numCategories <= 1;
    }

    // Event listener for the NEXT button
    nextButton.addEventListener('click', () => {
        if (!categoriesData || categoriesData.length === 0) return; // Don't do anything if data isn't loaded

        currentCategoryIndex++;
        // Wrap around to the first category if we've gone past the last one
        if (currentCategoryIndex >= categoriesData.length) {
            currentCategoryIndex = 0;
        }
        displayCategory(currentCategoryIndex);
    });

    // Event listener for the PREVIOUS button
    prevButton.addEventListener('click', () => {
        if (!categoriesData || categoriesData.length === 0) return; // Don't do anything if data isn't loaded

        currentCategoryIndex--;
        // Wrap around to the last category if we go below the first one
        if (currentCategoryIndex < 0) {
            currentCategoryIndex = categoriesData.length - 1;
        }
        displayCategory(currentCategoryIndex);
    });

    // Main function to initialize the page
    async function initializePage() {
        // Initially disable buttons until data is loaded
        prevButton.disabled = true;
        nextButton.disabled = true;

        categoriesData = await loadSentenceData(); // Load and parse data

        // Initial display of the first category if data loaded successfully
        if (categoriesData && categoriesData.length > 0) {
            displayCategory(currentCategoryIndex); // displayCategory handles enabling/disabling based on count
        } else if (!categoriesData || categoriesData.length === 0) {
            // Handle case where data loading failed or file was empty/incorrectly formatted
            // Error message is already displayed by loadSentenceData
            if (!document.querySelector('#sentence-cards-container p')) {
                 categoryTitleElement.textContent = 'No Data';
                 sentenceCardsContainer.innerHTML = '<p>No categories found in the data file or the file is empty/incorrectly formatted.</p>';
            }
            // Ensure buttons remain disabled
            prevButton.disabled = true;
            nextButton.disabled = true;
        }
    }

    // Start the initialization process
    initializePage();

}); 