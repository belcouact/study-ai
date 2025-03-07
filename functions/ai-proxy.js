const fetch = require('node-fetch');

exports.handler = async function(event, context) {
  // Only allow POST requests
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  try {
    const body = JSON.parse(event.body);
    const question = body.question;
    
    if (!question) {
      return { statusCode: 400, body: JSON.stringify({ error: 'Question is required' }) };
    }

    // Try to use the primary API
    try {
      // Updated API details
      const API_KEY = 'sk-3GX9xoFVBu39Ibbrdg5zhmDzudFHCCR9VTib76y8rAWgMh2G';
      const API_BASE_URL = 'https://api.lkeap.cloud.tencent.com/v1';
      const API_URL = `${API_BASE_URL}/chat/completions`;
      const MODEL = 'deepseek-r1';

      console.log('Sending request to API for question:', question.substring(0, 50) + '...');

      const payload = {
        model: MODEL,
        messages: [
          { role: "system", content: "You are a helpful AI assistant." },
          { role: "user", content: question }
        ],
        temperature: 0.7,
        max_tokens: 2000
      };

      const response = await fetch(API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${API_KEY}`
        },
        body: JSON.stringify(payload),
        timeout: 30000 // 30 second timeout
      });

      console.log('API response status:', response.status);

      if (response.ok) {
        const data = await response.json();
        console.log('API response received successfully');
        
        return {
          statusCode: 200,
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*'
          },
          body: JSON.stringify(data)
        };
      }
      
      // If we get here, the API request failed
      console.log('API request failed, using local fallback');
    } catch (apiError) {
      console.log('API error:', apiError.message);
    }
    
    // Use local fallback response
    console.log('Generating local fallback response');
    
    // Generate a simple response based on the question
    let fallbackResponse = generateLocalResponse(question);
    
    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify({
        choices: [
          {
            message: {
              content: fallbackResponse,
              role: "assistant"
            }
          }
        ]
      })
    };
    
  } catch (error) {
    console.log('Error:', error);
    return {
      statusCode: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify({ 
        error: `Failed to process request: ${error.message}`,
        stack: error.stack
      })
    };
  }
};

// Function to generate a local response when the API fails
function generateLocalResponse(question) {
  question = question.toLowerCase();
  
  // Simple pattern matching for common questions
  if (question.includes('hello') || question.includes('hi ')) {
    return "Hello! I'm a local fallback assistant. The main AI service is currently unavailable, but I can help with basic questions.";
  }
  
  if (question.includes('how are you')) {
    return "I'm functioning as a fallback service since the main AI is unavailable. I can only provide simple responses.";
  }
  
  if (question.includes('what is') || question.includes('who is') || question.includes('explain')) {
    const searchTerm = question.replace(/what is|who is|explain/gi, '').trim();
    return `I'm sorry, I can't provide detailed information about "${searchTerm}" in fallback mode. 

You might want to try:
1. Searching for "${searchTerm}" on Google
2. Checking Wikipedia for information about "${searchTerm}"
3. Trying again later when the main AI service is available`;
  }
  
  // Default response
  return `I'm currently operating in fallback mode because the main AI service is unavailable. 

The API connection issue could be due to:
1. The API server might be down or unreachable
2. There might be network connectivity issues
3. The API credentials might be incorrect

Your question was: "${question}"

While I can't provide a detailed answer right now, you might want to:
1. Try again later
2. Search for this information on Google
3. Contact the site administrator if the problem persists`;
}

// In the catch block or when the primary API fails
console.log('Primary API failed, trying public fallback API...');

// Use a free, public API as fallback
try {
  const FALLBACK_API_URL = 'https://api.dictionaryapi.dev/api/v2/entries/en/';
  const wordToLookup = question.split(' ')[0].toLowerCase();
  
  const fallbackResponse = await fetch(`${FALLBACK_API_URL}${wordToLookup}`);
  
  if (fallbackResponse.ok) {
    const fallbackData = await fallbackResponse.json();
    
    let definition = "I couldn't find information about that.";
    
    if (Array.isArray(fallbackData) && fallbackData.length > 0) {
      const entry = fallbackData[0];
      if (entry.meanings && entry.meanings.length > 0) {
        const meaning = entry.meanings[0];
        if (meaning.definitions && meaning.definitions.length > 0) {
          definition = `The word "${entry.word}" means: ${meaning.definitions[0].definition}`;
        }
      }
    }
    
    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify({
        choices: [
          {
            message: {
              content: `I'm currently in fallback mode using a dictionary API. ${definition}\n\nNote: The main AI service is unavailable.`,
              role: "assistant"
            }
          }
        ]
      })
    };
  }
} catch (fallbackError) {
  console.log('Fallback API also failed:', fallbackError.message);
} 