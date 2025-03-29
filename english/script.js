document.addEventListener('DOMContentLoaded', () => {
    const categoryTitleElement = document.getElementById('category-title');
    const sentenceCardsContainer = document.getElementById('sentence-cards-container');
    const nextButton = document.getElementById('next-button');

    // --- IMPORTANT ---
    // You need to convert your "600 english sentences.txt" file
    // into this JavaScript array structure.
    // Each object in the array represents a category.
    // The 'category' key holds the category name (from lines starting with ###).
    // The 'sentences' key holds an array of sentence pairs for that category.
    // Each sentence pair is an object with 'en' (English) and 'zh' (Chinese) keys.

    const categoriesData = [
        // Example Structure: Replace this with your actual data
        {
            category: "日常问候 (Example)",
            sentences: [
                { en: "Hello.", zh: "你好。" },
                { en: "How are you?", zh: "你好吗？" },
                { en: "Good morning.", zh: "早上好。" }
            ]
        },
        {
            category: "问路 (Example)",
            sentences: [
                { en: "Excuse me, where is the station?", zh: "打扰一下，请问车站在哪里？" },
                { en: "How can I get to the library?", zh: "我怎样才能去图书馆？" }
            ]
        },
        // Add all your 60 categories and their sentences here...
        // { category: "...", sentences: [ {en: "...", zh: "..."}, ... ] },
        // { category: "...", sentences: [ {en: "...", zh: "..."}, ... ] },
        // ... and so on
    ];

    let currentCategoryIndex = 0;

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

    nextButton.addEventListener('click', () => {
        currentCategoryIndex++;
        // Wrap around to the first category if we've gone past the last one
        if (currentCategoryIndex >= categoriesData.length) {
            currentCategoryIndex = 0;
        }
        displayCategory(currentCategoryIndex);
    });

    // Initial display of the first category
    if (categoriesData.length > 0) {
        displayCategory(currentCategoryIndex);
    } else {
        // Handle case where categoriesData is empty
        categoryTitleElement.textContent = 'No Data';
        sentenceCardsContainer.innerHTML = '<p>Please add category data to script.js</p>';
        nextButton.disabled = true;
    }
}); 