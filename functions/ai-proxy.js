const fetch = require('node-fetch');
const https = require('https');

// Simple in-memory cache (will be cleared on function cold starts)
const responseCache = {};

// Simple analytics tracking
let apiCallCount = 0;
let successCount = 0;
let errorCount = 0;
const modelStats = {};

exports.handler = async function(event, context) {
  apiCallCount++;

  // Only allow POST requests
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  try {
    console.log('Environment variables check:');
    console.log('API_KEY exists:', !!process.env.API_KEY);
    console.log('API_BASE_URL:', process.env.API_BASE_URL);
    console.log('API_MODEL:', process.env.API_MODEL || 'deepseek-r1');

    const body = JSON.parse(event.body);
    const question = body.question;
    
    if (!question) {
      return { statusCode: 400, body: JSON.stringify({ error: 'Question is required' }) };
    }

    // Check cache first
    const cacheKey = question.trim().toLowerCase();
    if (responseCache[cacheKey]) {
      console.log('Cache hit for question:', cacheKey);
      return {
        statusCode: 200,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        },
        body: responseCache[cacheKey]
      };
    }

    // Get API details from environment variables
    const API_KEY = process.env.API_KEY;
    const API_BASE_URL = process.env.API_BASE_URL;
    const DEFAULT_MODEL = process.env.API_MODEL || 'deepseek-r1';
    
    if (!API_KEY || !API_BASE_URL) {
      console.error('Missing required environment variables: API_KEY or API_BASE_URL');
      return {
        statusCode: 500,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        },
        body: JSON.stringify({ 
          error: 'Server configuration error: Missing API credentials'
        })
      };
    }
    
    // Try both available models
    const models = [DEFAULT_MODEL, 'deepseek-v3'];

    for (const model of models) {
      try {
        console.log(`Trying model: ${model}`);
        
        const API_URL = `${API_BASE_URL}/chat/completions`;
        
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

        // Use the fetchWithRetry function for better reliability
        const response = await fetchWithRetry(
          API_URL,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${API_KEY}`
            },
            body: JSON.stringify(payload),
            agent,
            timeout: 30000
          },
          3 // Number of retries
        );
        
        console.log('API response status:', response.status);
        
        if (response.ok) {
          successCount++;
          // Track model usage
          if (!modelStats[model]) modelStats[model] = 0;
          modelStats[model]++;
          const data = await response.json();
          console.log('API response received successfully');
          
          // Check if the response has the expected format and adapt it if needed
          if (data.choices && data.choices.length > 0) {
            const choice = data.choices[0];
            
            // Handle the different response format (reasoning_content instead of content)
            if (choice.message && choice.message.reasoning_content && !choice.message.content) {
              choice.message.content = choice.message.reasoning_content;
            }
            
            // Store in cache before returning
            responseCache[cacheKey] = JSON.stringify(data);
            
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
        } else {
          errorCount++;
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
    if (error.message.includes('ECONNREFUSED') || error.message.includes('ETIMEDOUT')) {
      console.log('Network connectivity issue detected');
      // Try a different approach or provide a more specific error message
    }

    if (error.message.includes('401')) {
      console.log('Authentication error detected');
      // Provide a specific error message about API key issues
    }
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

// Improved fetchWithRetry function
async function fetchWithRetry(url, options, maxRetries = 3) {
  let lastError;
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      console.log(`API request attempt ${attempt}/${maxRetries}`);
      console.log('Request options:', {
        method: options.method,
        headers: {
          ...options.headers,
          'Authorization': 'Bearer ***' // Hide the actual key
        },
        timeout: options.timeout
      });
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