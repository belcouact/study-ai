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
    }).catch(err => {
      console.log('Fetch error:', err.message);
      throw new Error(`Network error: ${err.message}`);
    });

    console.log('API response status:', response.status);

    if (!response.ok) {
      console.log('Primary API failed, trying fallback...');
      
      // Example using a different API (replace with an actual working alternative)
      const FALLBACK_API_URL = 'https://api.openai.com/v1/chat/completions';
      const FALLBACK_API_KEY = 'your-fallback-api-key';
      
      const fallbackResponse = await fetch(FALLBACK_API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${FALLBACK_API_KEY}`
        },
        body: JSON.stringify({
          model: 'gpt-3.5-turbo',
          messages: [
            { role: "system", content: "You are a helpful AI assistant." },
            { role: "user", content: question }
          ]
        })
      }).catch(err => {
        console.log('Fallback API error:', err.message);
        return { ok: false };
      });
      
      if (fallbackResponse.ok) {
        const fallbackData = await fallbackResponse.json();
        return {
          statusCode: 200,
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*'
          },
          body: JSON.stringify(fallbackData)
        };
      }
      
      // If both APIs fail, return the original error
      let errorMessage = `API request failed with status ${response.status}`;
      let errorDetails = {};
      
      try {
        const errorText = await response.text();
        console.log('Error response text:', errorText);
        
        try {
          errorDetails = JSON.parse(errorText);
          errorMessage = errorDetails.error?.message || errorMessage;
        } catch (e) {
          errorDetails = { rawResponse: errorText };
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
          error: errorMessage, 
          details: errorDetails
        })
      };
    }

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