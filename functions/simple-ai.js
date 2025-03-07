const fetch = require('node-fetch');

exports.handler = async function(event, context) {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  try {
    const body = JSON.parse(event.body);
    const question = body.question;
    
    if (!question) {
      return { statusCode: 400, body: JSON.stringify({ error: 'Question is required' }) };
    }
    
    // Get API details from environment variables
    const API_KEY = process.env.API_KEY;
    const API_BASE_URL = process.env.API_BASE_URL;
    const MODEL = process.env.API_MODEL || 'deepseek-r1';
    
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
    
    // Simplified payload
    const payload = {
      model: MODEL,
      messages: [
        { role: "user", content: question }
      ],
      max_tokens: 1000
    };
    
    // Make the request with minimal options
    const response = await fetch(API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${API_KEY}`
      },
      body: JSON.stringify(payload)
    });
    
    if (!response.ok) {
      return {
        statusCode: response.status,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        },
        body: JSON.stringify({
          error: `API request failed with status ${response.status}`
        })
      };
    }
    
    const data = await response.json();
    
    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify(data)
    };
    
  } catch (error) {
    return {
      statusCode: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify({
        error: `Failed to process request: ${error.message}`
      })
    };
  }
}; 