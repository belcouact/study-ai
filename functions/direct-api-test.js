const fetch = require('node-fetch');
const https = require('https');

exports.handler = async function(event, context) {
  try {
    // Get API details from environment variables
    const API_KEY = process.env.API_KEY;
    const API_BASE_URL = process.env.API_BASE_URL;
    const MODEL = process.env.API_MODEL || 'deepseek-r1';
    
    // Debug logging
    console.log('Environment variables in direct-api-test:');
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
          status: 'error',
          message: 'Missing required environment variables',
          environmentCheck: {
            API_KEY: API_KEY ? 'Set' : 'Missing',
            API_BASE_URL: API_BASE_URL ? 'Set' : 'Missing',
            API_MODEL: MODEL ? 'Set' : 'Missing'
          }
        })
      };
    }
    
    // Test different endpoints
    const endpoints = [
      '/chat/completions',
      '/completions',
      '/models'
    ];
    
    const results = {};
    
    // Create a custom agent to handle HTTPS requests
    const agent = new https.Agent({
      rejectUnauthorized: false, // For testing only
      keepAlive: true,
      timeout: 10000
    });
    
    // Test each endpoint
    for (const endpoint of endpoints) {
      const url = `${API_BASE_URL}${endpoint}`;
      console.log(`Testing endpoint: ${url}`);
      
      try {
        // First try a simple GET request to the endpoint
        const getResponse = await fetch(url, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${API_KEY}`
          },
          agent,
          timeout: 10000
        }).catch(err => {
          return { ok: false, status: 'network_error', statusText: err.message };
        });
        
        let getResult = {
          status: getResponse.status,
          statusText: getResponse.statusText
        };
        
        if (getResponse.ok) {
          try {
            getResult.data = await getResponse.json();
          } catch (e) {
            getResult.error = 'Failed to parse JSON response';
          }
        } else if (getResponse.status !== 'network_error') {
          try {
            const text = await getResponse.text();
            getResult.responseText = text;
          } catch (e) {
            getResult.error = 'Failed to read response text';
          }
        }
        
        // Only try POST for chat/completions endpoint
        let postResult = null;
        if (endpoint === '/chat/completions') {
          const payload = {
            model: MODEL,
            messages: [
              { role: "system", content: "You are a helpful AI assistant." },
              { role: "user", content: "Hello" }
            ],
            max_tokens: 10,
            temperature: 0.7,
            stream: false
          };
          
          const postResponse = await fetch(url, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${API_KEY}`
            },
            body: JSON.stringify(payload),
            agent,
            timeout: 15000
          }).catch(err => {
            return { ok: false, status: 'network_error', statusText: err.message };
          });
          
          postResult = {
            status: postResponse.status,
            statusText: postResponse.statusText
          };
          
          if (postResponse.ok) {
            try {
              postResult.data = await postResponse.json();
            } catch (e) {
              postResult.error = 'Failed to parse JSON response';
            }
          } else if (postResponse.status !== 'network_error') {
            try {
              const text = await postResponse.text();
              postResult.responseText = text;
            } catch (e) {
              postResult.error = 'Failed to read response text';
            }
          }
        }
        
        results[endpoint] = {
          GET: getResult,
          POST: postResult
        };
        
      } catch (endpointError) {
        results[endpoint] = {
          error: endpointError.message,
          stack: endpointError.stack
        };
      }
    }
    
    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify({
        status: 'completed',
        results,
        environmentCheck: {
          API_KEY: API_KEY ? 'Set' : 'Missing',
          API_BASE_URL: API_BASE_URL,
          API_MODEL: MODEL
        }
      })
    };
    
  } catch (error) {
    console.log('Direct API test error:', error);
    return {
      statusCode: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify({
        status: 'error',
        message: error.message,
        stack: error.stack,
        environmentCheck: {
          API_KEY: process.env.API_KEY ? 'Set' : 'Missing',
          API_BASE_URL: process.env.API_BASE_URL,
          API_MODEL: process.env.API_MODEL
        }
      })
    };
  }
}; 