const fetch = require('node-fetch');

exports.handler = async function(event, context) {
  try {
    const API_KEY = 'sk-ee8971509c3446129f6c0b43ee362e13a4a642pjsvzv199t';
    const API_URL = 'https://ai-gateway.vei.volces.com/v1/chat/completions';
    
    // Simple test request to check if the API is responsive
    const payload = {
      model: 'deepseek-reasoner',
      messages: [
        { role: "system", content: "You are a helpful AI assistant." },
        { role: "user", content: "Hello" }
      ],
      max_tokens: 5  // Request minimal tokens to save resources
    };

    const response = await fetch(API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${API_KEY}`
      },
      body: JSON.stringify(payload)
    });

    if (response.ok) {
      return {
        statusCode: 200,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        },
        body: JSON.stringify({ status: 'ok', message: 'API connection successful' })
      };
    } else {
      const errorData = await response.json().catch(() => ({}));
      return {
        statusCode: 500,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        },
        body: JSON.stringify({ 
          status: 'error', 
          message: 'API connection failed', 
          details: errorData 
        })
      };
    }
  } catch (error) {
    console.log('Health check error:', error);
    return {
      statusCode: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify({ 
        status: 'error', 
        message: 'Failed to connect to API',
        details: error.message
      })
    };
  }
}; 