const fetch = require('node-fetch');
const https = require('https');

exports.handler = async function(event, context) {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  console.log('Simple-ai function called');
  
  try {
    const body = JSON.parse(event.body);
    const question = body.question;
    
    console.log('Question received:', question ? question.substring(0, 50) + '...' : 'No question');
    
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
    
    console.log('Environment variables:');
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
    
    // Create a hardcoded response for testing
    console.log('Returning hardcoded response for testing');
    
    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify({
        id: "test-response",
        object: "chat.completion",
        created: Math.floor(Date.now() / 1000),
        model: MODEL,
        choices: [
          {
            index: 0,
            message: {
              role: "assistant",
              content: `This is a test response to your question: "${question}"\n\nThe actual API call was bypassed to troubleshoot the 502 error.`
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