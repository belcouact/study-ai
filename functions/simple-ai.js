const fetch = require('node-fetch');
const https = require('https');

exports.handler = async function(event, context) {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  try {
    const body = JSON.parse(event.body);
    const question = body.question;
    const requestedModel = body.model; // Get the requested model
    
    if (!question) {
      return { statusCode: 400, body: JSON.stringify({ error: 'Question is required' }) };
    }
    
    // Get API details from environment variables
    const API_KEY = process.env.API_KEY;
    const API_BASE_URL = process.env.API_BASE_URL;
    const MODEL = requestedModel || process.env.API_MODEL || 'deepseek-r1';
    
    // Debug logging
    console.log('Environment variables in simple-ai:');
    console.log('API_KEY exists:', !!API_KEY);
    console.log('API_BASE_URL:', API_BASE_URL);
    console.log('API_MODEL:', MODEL);
    
    if (!API_KEY || !API_BASE_URL) {
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
    
    const API_URL = `${API_BASE_URL}/chat/completions`;
    console.log('Using API URL:', API_URL);
    
    // Create a custom agent to handle HTTPS requests
    const agent = new https.Agent({
      rejectUnauthorized: false, // For testing only
      keepAlive: true,
      timeout: 60000 // Increased timeout
    });
    
    // Use a single, simplified payload
    const payload = {
      model: MODEL,
      messages: [
        { role: "system", content: "You are a helpful AI assistant." },
        { role: "user", content: question }
      ],
      max_tokens: 1000,
      temperature: 0.7
    };
    
    console.log('Sending request with payload:', JSON.stringify(payload).substring(0, 100) + '...');
    
    // Use fetchWithRetry for more reliable requests
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
        timeout: 60000 // Increased timeout
      },
      3 // Number of retries
    );
    
    console.log('Response status:', response.status);
    
    if (!response.ok) {
      let errorText = 'Unknown error';
      try {
        errorText = await response.text();
        console.log('Error response:', errorText);
      } catch (e) {
        console.log('Could not read error response:', e.message);
      }
      
      return {
        statusCode: response.status,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        },
        body: JSON.stringify({
          error: `API request failed with status ${response.status}`,
          details: errorText
        })
      };
    }
    
    // Process the successful response
    let data;
    try {
      data = await response.json();
      console.log('Successful response:', JSON.stringify(data).substring(0, 100) + '...');
    } catch (parseError) {
      console.log('Error parsing JSON response:', parseError);
      return {
        statusCode: 500,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        },
        body: JSON.stringify({
          error: 'Failed to parse API response',
          details: parseError.message
        })
      };
    }
    
    // Return the data directly
    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify(data)
    };
    
  } catch (error) {
    console.log('Simple-ai function error:', error);
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

// Improved fetchWithRetry function
async function fetchWithRetry(url, options, maxRetries = 3) {
  let lastError;
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      console.log(`API request attempt ${attempt}/${maxRetries}`);
      
      // Simple fetch without the race
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