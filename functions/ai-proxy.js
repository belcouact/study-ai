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
      const API_KEY = 'sk-ee8971509c3446129f6c0b43ee362e13a4a642pjsvzv199t';
      const API_URL = 'https://ai-gateway.vei.volces.com/v1/chat/completions';
      const MODEL = 'deepseek-reasoner';

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
    return "I'm sorry, I can't provide detailed information in fallback mode. The main AI service is currently unavailable. Please try again later.";
  }
  
  if (question.includes('weather') || question.includes('forecast')) {
    return "I can't access real-time weather data in fallback mode. Please check a weather service or try again later when the main AI service is available.";
  }
  
  // Default response
  return `I'm currently operating in fallback mode because the main AI service is unavailable. 

The API returned a 502 Bad Gateway error, which typically indicates:

1. The API server might be down or unreachable
2. There might be network connectivity issues
3. The API might be rejecting requests due to rate limiting or authentication issues

Your question was: "${question}"

Please try again later when the service is restored.`;
} 