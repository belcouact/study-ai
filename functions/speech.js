/**
 * Speaks the provided English text using the browser's Speech Synthesis API.
 * Attempts to use a slower rate and find a female US English voice.
 *
 * @param {string} englishText The text to be spoken.
 */
export function speakEnglishSentence(englishText) {
    if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel(); // Stop any ongoing speech
        const utterance = new SpeechSynthesisUtterance(englishText);
        utterance.lang = 'en-US'; // Set desired language
        utterance.rate = 0.85;    // Make speech slightly slower (adjust as needed)

        // Attempt to find a female US English voice
        // Note: getVoices() can be asynchronous. This might need refinement
        // using the 'onvoiceschanged' event for guaranteed voice list access.
        try {
            const voices = window.speechSynthesis.getVoices();
            if (voices.length > 0) {
                let femaleVoice = null;
                const usEnglishVoices = voices.filter(voice => voice.lang === 'en-US');

                // Try to find a voice with "Female" or common female names
                femaleVoice = usEnglishVoices.find(voice => /female|zira|susan|samantha/i.test(voice.name));

                // Fallback to the first available US English voice if no specific female voice found
                if (!femaleVoice && usEnglishVoices.length > 0) {
                    femaleVoice = usEnglishVoices[0];
                }

                // Assign the found voice (if any)
                if (femaleVoice) {
                    utterance.voice = femaleVoice;
                }
            }
        } catch (error) {
            console.error("Error accessing or processing speech synthesis voices:", error);
            // Proceed with default voice if error occurs
        }

        window.speechSynthesis.speak(utterance);

    } else {
        console.error("Browser doesn't support speech synthesis.");
        // Consider a more user-friendly notification than alert
        // e.g., display a message on the page temporarily
        alert("Sorry, your browser doesn't support text-to-speech.");
    }
}

// Pre-load voices if possible (helps with asynchronous nature of getVoices)
// This might run before voices are fully loaded, the logic inside the function
// attempts to get them again, but this can help in some browsers.
if ('speechSynthesis' in window && typeof window.speechSynthesis.getVoices === 'function') {
     window.speechSynthesis.getVoices();
     if (speechSynthesis.onvoiceschanged !== undefined) {
        speechSynthesis.onvoiceschanged = () => window.speechSynthesis.getVoices();
     }
} 