const fetch = require('node-fetch');
const https = require('https');

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

    // Try both available models
    const models = ['deepseek-r1', 'deepseek-v3'];

    for (const model of models) {
      try {
        console.log(`Trying model: ${model}`);
        
        const payload = {
          model: model,
          messages: [
            { role: "system", content: "You are a helpful AI assistant." },
            { role: "user", content: question }
          ],
          temperature: 0.7,
          max_tokens: 2000,
          stream: false
        };
        
        // Create a custom agent to handle HTTPS requests
        const agent = new https.Agent({
          rejectUnauthorized: false, // For testing only
          keepAlive: true,
          timeout: 30000
        });

        const response = await fetch(API_URL, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${API_KEY}`
          },
          body: JSON.stringify(payload),
          agent,
          timeout: 30000
        });
        
        console.log('API response status:', response.status);
        
        if (response.ok) {
          const data = await response.json();
          console.log('API response received successfully');
          
          // Check if the response has the expected format and adapt it if needed
          if (data.choices && data.choices.length > 0) {
            const choice = data.choices[0];
            
            // Handle the different response format (reasoning_content instead of content)
            if (choice.message && choice.message.reasoning_content && !choice.message.content) {
              choice.message.content = choice.message.reasoning_content;
            }
            
            return {
              statusCode: 200,
              headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
              },
              body: JSON.stringify(data)
            };
          }
          break; // Exit the loop if successful
        }
      } catch (modelError) {
        console.log(`Error with model ${model}:`, modelError.message);
      }
    }
    
    // Use local fallback response as last resort
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

// Add this function to your ai-proxy.js
async function fetchWithRetry(url, options, maxRetries = 3) {
  let lastError;
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      console.log(`API request attempt ${attempt}/${maxRetries}`);
      const response = await fetch(url, options);
      return response;
    } catch (error) {
      console.log(`Attempt ${attempt} failed:`, error.message);
      lastError = error;
      
      // Wait before retrying (exponential backoff)
      if (attempt < maxRetries) {
        const delay = Math.min(1000 * Math.pow(2, attempt), 10000);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }
  
  throw lastError;
} 