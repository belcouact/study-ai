// Add this at the start of script.js
document.addEventListener('DOMContentLoaded', () => {
    // Move all initialization code here
    initializeApp();
});

function initializeApp() {
    // Cache DOM elements that are frequently accessed
    const domElements = {
        vocabularyContainer: document.getElementById('vocabulary-container'),
        loadBtn: document.getElementById('load-vocabulary-btn'),
        prevWordBtn: document.getElementById('prev-word-btn'),
        nextWordBtn: document.getElementById('next-word-btn'),
        wordCounter: document.getElementById('word-counter'),
        schoolSelect: document.getElementById('school-select-sidebar'),
        gradeSelect: document.getElementById('grade-select-sidebar')
    };

    // Initialize event listeners
    initializeEventListeners(domElements);
}

function initializeEventListeners(elements) {
    const { loadBtn, prevWordBtn, nextWordBtn } = elements;
    
    // Use event delegation for dynamic content
    document.addEventListener('click', (e) => {
        if (e.target.matches('.nav-button')) {
            handleNavigation(e);
        }
    });

    // Add debounced event listeners for performance
    loadBtn?.addEventListener('click', debounce(handleLoadVocabularyClick, 300));
    
    // Use passive event listeners for better scroll performance
    document.addEventListener('scroll', handleScroll, { passive: true });
}

// Add utility functions
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

// Optimize the handleLoadVocabularyClick function
async function handleLoadVocabularyClick() {
    const loadBtn = document.getElementById('load-vocabulary-btn');
    const vocabularyContainer = document.getElementById('vocabulary-container');
    const vocabularyCount = document.getElementById('vocabulary-cnt').value || 5;

    if (!vocabularyContainer) return;

    try {
        loadBtn.disabled = true;
        loadBtn.innerHTML = '<span class="loading-spinner"></span> 加载中...';

        // Show loading state
        vocabularyContainer.innerHTML = `
            <div class="initial-message loading-message">
                <div class="loading-spinner vocabulary-spinner"></div>
                <p>正在加载${vocabularyCount}个词汇，请耐心等待...</p>
                <p>Loading ${vocabularyCount} vocabularies, please be patient...</p>
            </div>
        `;

        // Use Promise.all for parallel requests if needed
        const [words, otherData] = await Promise.all([
            fetchVocabularyWords(/* params */),
            fetchOtherRequiredData(/* params */)
        ]);

        if (words?.length) {
            vocabularyWords = words;
            currentWordIndex = 0;
            displayWordCard(currentWordIndex);
            updateNavigationControls();
        }
    } catch (error) {
        console.error('Error loading vocabulary:', error);
        showVocabularyError(error.message);
    } finally {
        loadBtn.disabled = false;
        loadBtn.innerHTML = '加载词汇';
    }
}
