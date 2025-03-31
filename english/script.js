document.addEventListener('DOMContentLoaded', () => {
    const categoryTitleElement = document.getElementById('category-title');
    const sentenceCardsContainer = document.getElementById('sentence-cards-container');
    const prevButton = document.getElementById('prev-button');
    const nextButton = document.getElementById('next-button');
    const totoro = document.querySelector('.totoro-icon');

    let categoriesData = []; // Initialize as empty array
    let currentCategoryIndex = 0;
    let currentlySpeakingSentenceCard = null;

    // Function to fetch and parse the text file
    async function loadSentenceData() {
        try {
            const response = await fetch('600 english sentences.txt');
            console.log("Fetch response status:", response.status, "ok:", response.ok);

            if (!response.ok) {
                if (response.status === 404 || response.status === 0) {
                     throw new Error(`File not found or inaccessible: '600 english sentences.txt'. Ensure it's in the same folder and accessed via a web server (http://) not directly (file://).`);
                }
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const buffer = await response.arrayBuffer();
            console.log("Fetched ArrayBuffer size:", buffer.byteLength);

            // Decode the ArrayBuffer as UTF-8 text
            const decoder = new TextDecoder('utf-8');
            const text = decoder.decode(buffer);
           
            // Proceed with parsing the decoded text
            return parseSentenceData(text);
        } catch (error) {
            console.error("Error loading or parsing sentence data:", error);
            categoryTitleElement.textContent = 'Error Loading Data';
            // Make the error message more prominent and informative
            sentenceCardsContainer.innerHTML = `
                <div class="error-container">
                    <div class="error-icon">📝</div>
                    <p class="error-message">Could not load or decode sentence data.</p>
                    <p><strong>Error message:</strong> ${error.message}</p>
                    <p>Please check the browser's developer console (F12) for more details. Also, verify '600 english sentences.txt' is correctly saved as UTF-8 and is in the same folder.</p>
                </div>
            `;
            // Disable both buttons on error
            prevButton.disabled = true;
            nextButton.disabled = true;
            return []; // Return empty array on error
        }
    }

    // Function to parse the raw text data into the structured format
    function parseSentenceData(text) {
        const lines = text.split(/\r?\n/);
        const data = [];
        let currentCategory = null;

        lines.forEach(line => {
            line = line.trim();

            if (line.charCodeAt(0) === 0xFEFF) {
                line = line.substring(1);
            }

            if (line.startsWith('###')) {
                const categoryName = line.substring(3).trim();
                if (categoryName.charCodeAt(0) === 0xFEFF) {
                    currentCategory = { category: categoryName.substring(1), sentences: [] };
                } else {
                    currentCategory = { category: categoryName, sentences: [] };
                }
                data.push(currentCategory);
            } else if (line.includes('/') && currentCategory) {
                const parts = line.split('/');
                if (parts.length >= 2) {
                    const en = parts[0].trim();
                    const zh = parts.slice(1).join('/').trim();
                    if (en && zh) {
                       currentCategory.sentences.push({ en, zh });
                    }
                }
            }
        });
        return data.filter(category => category.sentences.length > 0 || category.category);
    }

    // Function to handle text-to-speech for sentence cards
    function speakEnglishSentence(englishText, cardElement) {
        if ('speechSynthesis' in window) {
            // If there's a currently speaking card, remove its speaking class
            if (currentlySpeakingSentenceCard) {
                currentlySpeakingSentenceCard.classList.remove('speaking');
            }
            
            // Set the new speaking card and add the speaking class
            currentlySpeakingSentenceCard = cardElement;
            cardElement.classList.add('speaking');
            
            // Animate the Totoro icon if it exists
            if (totoro) {
                totoro.style.transform = 'scale(1.1) rotate(5deg)';
                setTimeout(() => {
                    totoro.style.transform = '';
                }, 500);
            }
            
            window.speechSynthesis.cancel(); // Stop any ongoing speech
            const utterance = new SpeechSynthesisUtterance(englishText);
            utterance.lang = 'en-US';
            utterance.rate = 0.75;

            // Get available voices
            const voices = window.speechSynthesis.getVoices();
            const usEnglishVoices = voices.filter(voice => voice.lang === 'en-US');
            let femaleVoice = usEnglishVoices.find(voice => /female|zira|susan|samantha/i.test(voice.name));

            if (!femaleVoice && usEnglishVoices.length > 0) {
                femaleVoice = usEnglishVoices[0];
            }

            if (femaleVoice) {
                utterance.voice = femaleVoice;
            }
            
            // When speech ends, remove the speaking class
            utterance.onend = () => {
                if (cardElement) {
                    cardElement.classList.remove('speaking');
                }
                currentlySpeakingSentenceCard = null;
            };
            
            window.speechSynthesis.speak(utterance);

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
        
        // Add a smooth transition effect for category change
        sentenceCardsContainer.style.opacity = '0';
        
        setTimeout(() => {
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
            sentenceCardsContainer.innerHTML = '';
    
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
    
                // Make card focusable and announce its role
                card.setAttribute('role', 'button');
                card.setAttribute('tabindex', '0');
                card.setAttribute('aria-label', `Read sentence: ${sentencePair.en}`);
    
                // Add click listener
                card.addEventListener('click', () => {
                    speakEnglishSentence(sentencePair.en, card);
                });
    
                // Add keyboard listener
                card.addEventListener('keypress', (e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        speakEnglishSentence(sentencePair.en, card);
                    }
                });
    
                sentenceCardsContainer.appendChild(card);
            });
    
            const numCategories = categoriesData.length;
            prevButton.disabled = numCategories <= 1;
            nextButton.disabled = numCategories <= 1;
            
            // Fade in the cards container
            sentenceCardsContainer.style.opacity = '1';
            
        }, 300); // Match this timeout with the CSS transition
    }

    // Event listener for the NEXT button
    nextButton.addEventListener('click', () => {
        if (!categoriesData || categoriesData.length === 0) return;

        // Add a small animation to the button
        nextButton.classList.add('clicked');
        setTimeout(() => {
            nextButton.classList.remove('clicked');
        }, 300);

        currentCategoryIndex++;
        if (currentCategoryIndex >= categoriesData.length) {
            currentCategoryIndex = 0;
        }
        displayCategory(currentCategoryIndex);
    });

    // Event listener for the PREVIOUS button
    prevButton.addEventListener('click', () => {
        if (!categoriesData || categoriesData.length === 0) return;

        // Add a small animation to the button
        prevButton.classList.add('clicked');
        setTimeout(() => {
            prevButton.classList.remove('clicked');
        }, 300);

        currentCategoryIndex--;
        if (currentCategoryIndex < 0) {
            currentCategoryIndex = categoriesData.length - 1;
        }
        displayCategory(currentCategoryIndex);
    });

    // Add keyboard navigation
    document.addEventListener('keydown', (e) => {
        if (e.key === 'ArrowRight') {
            nextButton.click();
        } else if (e.key === 'ArrowLeft') {
            prevButton.click();
        }
    });

    // Add transition style for category changes
    const style = document.createElement('style');
    style.textContent = `
        #sentence-cards-container {
            transition: opacity 0.3s ease;
        }
        
        .nav-button.clicked {
            animation: clickEffect 0.3s ease;
        }
        
        @keyframes clickEffect {
            0%, 100% { transform: translateY(-50%) scale(1); }
            50% { transform: translateY(-50%) scale(0.9); }
        }
        
        .error-container {
            text-align: center;
            padding: 30px;
            border-radius: 10px;
            background-color: rgba(255, 240, 240, 0.5);
            border: 1px dashed #f4a261;
        }
        
        .error-icon {
            font-size: 3em;
            margin-bottom: 20px;
            color: #f4a261;
        }
        
        .error-message {
            color: #e76f51;
            font-weight: bold;
            font-size: 1.2em;
            margin-bottom: 20px;
        }
    `;
    document.head.appendChild(style);

    // Main function to initialize the page
    async function initializePage() {
        // Initially disable buttons until data is loaded
        prevButton.disabled = true;
        nextButton.disabled = true;
        
        // Show loading animation in the container
        sentenceCardsContainer.innerHTML = `
            <div class="loading-container">
                <div class="loading-animation"></div>
                <p>Loading sentences...</p>
            </div>
        `;

        categoriesData = await loadSentenceData();

        if (categoriesData && categoriesData.length > 0) {
            displayCategory(currentCategoryIndex);
        } else if (!categoriesData || categoriesData.length === 0) {
            if (!document.querySelector('#sentence-cards-container .error-container')) {
                 categoryTitleElement.textContent = 'No Data';
                 sentenceCardsContainer.innerHTML = `
                    <div class="error-container">
                        <div class="error-icon">📝</div>
                        <p class="error-message">No categories found</p>
                        <p>The data file is empty or incorrectly formatted.</p>
                    </div>
                 `;
            }
            prevButton.disabled = true;
            nextButton.disabled = true;
        }
    }

    // Add styles for loading animation
    const loadingStyle = document.createElement('style');
    loadingStyle.textContent = `
        .loading-container {
            text-align: center;
            padding: 40px;
        }
        
        .loading-animation {
            display: inline-block;
            width: 50px;
            height: 50px;
            border: 3px solid rgba(92, 158, 173, 0.3);
            border-radius: 50%;
            border-top-color: var(--primary-color);
            animation: spin 1s ease-in-out infinite;
            margin-bottom: 20px;
        }
        
        @keyframes spin {
            to { transform: rotate(360deg); }
        }
    `;
    document.head.appendChild(loadingStyle);

    // Start the initialization process
    initializePage();
}); 