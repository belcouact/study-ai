const fetch = require('node-fetch');
const https = require('https');

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
      timeout: 30000
    });
    
    // Try different payload formats
    const payloads = [
      // Standard format
      {
        model: MODEL,
        messages: [
          { role: "user", content: question }
        ],
        max_tokens: 1000
      },
      // With system message
      {
        model: MODEL,
        messages: [
          { role: "system", content: "You are a helpful AI assistant." },
          { role: "user", content: question }
        ],
        max_tokens: 1000
      },
      // With temperature
      {
        model: MODEL,
        messages: [
          { role: "user", content: question }
        ],
        max_tokens: 1000,
        temperature: 0.7
      }
    ];
    
    // Try each payload
    for (let i = 0; i < payloads.length; i++) {
      const payload = payloads[i];
      console.log(`Trying payload format ${i+1}:`, JSON.stringify(payload).substring(0, 100) + '...');
      
      try {
        // Make the request
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
        
        console.log(`Payload ${i+1} response status:`, response.status);
        
        if (response.ok) {
          const data = await response.json();
          console.log(`Payload ${i+1} successful:`, JSON.stringify(data).substring(0, 100) + '...');
          
          return {
            statusCode: 200,
            headers: {
              'Content-Type': 'application/json',
              'Access-Control-Allow-Origin': '*'
            },
            body: JSON.stringify({
              success: true,
              data: data,
              payloadUsed: i+1
            })
          };
        } else {
          // Try to get error details
          let errorText = '';
          try {
            errorText = await response.text();
          } catch (e) {
            errorText = 'Could not read error response';
          }
          console.log(`Payload ${i+1} error:`, errorText);
        }
      } catch (requestError) {
        console.log(`Payload ${i+1} request error:`, requestError.message);
      }
    }
    
    // If we get here, all payloads failed
    return {
      statusCode: 502,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify({
        error: 'All API request formats failed',
        details: 'Check server logs for more information'
      })
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
        error: `Failed to process request: ${error.message}`
      })
    };
  }
}; 