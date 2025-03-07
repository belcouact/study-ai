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
      return { 
        statusCode: 400, 
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        },
        body: JSON.stringify({ error: 'Question is required' }) 
      };
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
    
    // Use a simple payload
    const payload = {
      model: MODEL,
      messages: [
        { role: "system", content: "You are a helpful AI assistant." },
        { role: "user", content: question }
      ],
      max_tokens: 1000,
      temperature: 0.7
    };
    
    // Create a custom agent with a 90-second timeout
    const agent = new https.Agent({
      keepAlive: true,
      timeout: 90000 // 90 seconds
    });
    
    try {
      // Make the API request with the custom agent and 90-second timeout
      console.log(`Making API request to ${API_BASE_URL}/chat/completions with model ${MODEL}`);
      
      const response = await fetch(`${API_BASE_URL}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${API_KEY}`
        },
        body: JSON.stringify(payload),
        agent: agent,
        timeout: 90000 // 90 seconds
      });
      
      console.log(`API response status: ${response.status}`);
      
      // If we get a 502 error, provide more detailed information
      if (response.status === 502) {
        console.error('Received 502 Bad Gateway error from API');
        return {
          statusCode: 502,
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*'
          },
          body: JSON.stringify({
            error: 'Bad Gateway (502) error from API server',
            message: 'The API server returned an invalid response. This might be due to server overload or temporary issues.',
            details: {
              apiBaseUrl: API_BASE_URL.replace(/\/[^\/]+$/, '/***/'), // Redact the specific endpoint for security
              model: MODEL,
              timestamp: new Date().toISOString()
            }
          })
        };
      }
      
      // Get the response data
      const data = await response.json();
      
      // Return the data
      return {
        statusCode: response.status,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        },
        body: JSON.stringify(data)
      };
    } catch (apiError) {
      console.error('API request error:', apiError);
      
      // Return a hardcoded response for testing
      return {
        statusCode: 200,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        },
        body: JSON.stringify({
          id: "fallback-response",
          object: "chat.completion",
          created: Math.floor(Date.now() / 1000),
          model: MODEL,
          choices: [
            {
              index: 0,
              message: {
                role: "assistant",
                content: `I'm sorry, but I couldn't connect to the AI service. Here's what I know about your question: "${question}"\n\nPlease try again later or contact support if the problem persists.`
              },
              finish_reason: "stop"
            }
          ],
          usage: {
            prompt_tokens: question.length,
            completion_tokens: 50,
            total_tokens: question.length + 50
          }
        })
      };
    }
    
  } catch (error) {
    console.error('Function error:', error);
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