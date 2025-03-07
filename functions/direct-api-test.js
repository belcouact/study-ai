const fetch = require('node-fetch');
const https = require('https');

exports.handler = async function(event, context) {
  try {
    // API details
    const API_KEY = 'sk-3GX9xoFVBu39Ibbrdg5zhmDzudFHCCR9VTib76y8rAWgMh2G';
    const API_BASE_URL = 'https://api.lkeap.cloud.tencent.com/v1';
    
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
            model: 'deepseek-r1',
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
        results
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
        stack: error.stack
      })
    };
  }
}; 