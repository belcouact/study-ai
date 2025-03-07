const fetch = require('node-fetch');

exports.handler = async function(event, context) {
  try {
    const API_KEY = 'sk-ee8971509c3446129f6c0b43ee362e13a4a642pjsvzv199t';
    const API_URL = 'https://ai-gateway.vei.volces.com/v1/chat/completions';
    
    console.log('Attempting to connect to API:', API_URL);
    
    // Simple test request to check if the API is responsive
    const payload = {
      model: 'deepseek-reasoner',
      messages: [
        { role: "system", content: "You are a helpful AI assistant." },
        { role: "user", content: "Hello" }
      ],
      max_tokens: 5  // Request minimal tokens to save resources
    };

    // First, try a simple OPTIONS request to check connectivity
    const pingResponse = await fetch(API_URL, {
      method: 'OPTIONS',
      headers: {
        'Content-Type': 'application/json'
      }
    }).catch(err => {
      console.log('Ping request failed:', err.message);
      return { ok: false, status: 'network_error', statusText: err.message };
    });

    console.log('Ping response status:', pingResponse.status, pingResponse.statusText);

    // Now try the actual API request
    const response = await fetch(API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${API_KEY}`
      },
      body: JSON.stringify(payload)
    }).catch(err => {
      console.log('API request failed:', err.message);
      return { ok: false, status: 'network_error', statusText: err.message };
    });

    console.log('API response status:', response.status, response.statusText);

    if (response.ok) {
      const data = await response.json();
      console.log('API response data received');
      
      return {
        statusCode: 200,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        },
        body: JSON.stringify({ 
          status: 'ok', 
          message: 'API connection successful',
          details: { status: response.status }
        })
      };
    } else {
      let errorDetails = {};
      
      try {
        if (response.status !== 'network_error') {
          const errorText = await response.text();
          console.log('Error response text:', errorText);
          
          try {
            errorDetails = JSON.parse(errorText);
          } catch (e) {
            errorDetails = { rawResponse: errorText };
          }
        } else {
          errorDetails = { networkError: response.statusText };
        }
      } catch (e) {
        errorDetails = { parseError: e.message };
      }
      
      return {
        statusCode: 502,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        },
        body: JSON.stringify({ 
          status: 'error', 
          message: `API connection failed with status ${response.status}`, 
          details: errorDetails
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
        details: error.message,
        stack: error.stack
      })
    };
  }
}; 