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

    // Function to handle text-to-speech for sentence cards
    function speakEnglishSentence(englishText) {
        if ('speechSynthesis' in window) {
            window.speechSynthesis.cancel(); // Stop any ongoing speech
            const utterance = new SpeechSynthesisUtterance(englishText);
            utterance.lang = 'en-US'; // Set desired language
            utterance.rate = 0.75; // Keep the slower rate

            // Attempt to find a female US English voice
            const voices = window.speechSynthesis.getVoices();
            let femaleVoice = null;

            // Filter for US English voices first
            const usEnglishVoices = voices.filter(voice => voice.lang === 'en-US');

            // Try to find a voice with "Female" or common female names in its name
            femaleVoice = usEnglishVoices.find(voice => /female|zira|susan|samantha/i.test(voice.name));

            // If no specific female voice is found, just use the first available US English voice
            if (!femaleVoice && usEnglishVoices.length > 0) {
                // Fallback to the first available US English voice
                // You could refine this fallback logic if needed
                femaleVoice = usEnglishVoices[0];
                 // console.log("Using first available US English voice:", femaleVoice.name);
            } else if (femaleVoice) {
                // console.log("Using specific female voice:", femaleVoice.name);
            } else {
                 // console.log("No US English voices found, using default.");
            }


            // Assign the found voice (if any) to the utterance
            if (femaleVoice) {
                utterance.voice = femaleVoice;
            }
            // If no suitable voice was found, the browser will use the default for the specified lang.

            window.speechSynthesis.speak(utterance);

            // Note: getVoices() might be asynchronous. If voices aren't found initially,
            // you might need a more complex setup involving the 'onvoiceschanged' event.
            // However, calling it right before speak() often works in modern browsers.
            /* Example of listening for voices:
            let voices = [];
            function populateVoiceList() {
              voices = window.speechSynthesis.getVoices();
              // Now you could use the 'voices' array
            }
            populateVoiceList();
            if (speechSynthesis.onvoiceschanged !== undefined) {
              speechSynthesis.onvoiceschanged = populateVoiceList;
            }
            // Then use the 'voices' array within speakEnglishSentence
            */

        } else {
            console.error("Browser doesn't support speech synthesis.");
            alert("Sorry, your browser doesn't support text-to-speech.");
        }
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
        sentenceCardsContainer.innerHTML = ''; // Clear previous cards

        // Create and append new sentence cards
        category.sentences.forEach((sentencePair, cardIndex) => {
            const card = document.createElement('div');
            card.classList.add('sentence-card');
            const delay = cardIndex * 0.07;
            card.style.setProperty('--animation-delay', `${delay}s`);

            const englishP = document.createElement('p');
            englishP.classList.add('english-sentence');
            englishP.textContent = sentencePair.en;

            const chineseP = document.createElement('p');
            chineseP.classList.add('chinese-translation');
            chineseP.textContent = sentencePair.zh;

            card.appendChild(englishP);
            card.appendChild(chineseP);

            // --- Add Event Listeners Here ---
            const englishText = sentencePair.en; // Get text directly

            // Make card focusable and announce its role
            card.setAttribute('role', 'button');
            card.setAttribute('tabindex', '0');
            card.setAttribute('aria-label', `Read sentence: ${englishText}`); // Accessibility label

            // Add click listener
            card.addEventListener('click', () => {
                speakEnglishSentence(englishText);
            });

            // Add keyboard listener (Enter or Space)
            card.addEventListener('keypress', (e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault(); // Prevent default space bar scroll/action
                    speakEnglishSentence(englishText);
                }
            });
            // --- End Event Listener Addition ---

            sentenceCardsContainer.appendChild(card);
        });

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