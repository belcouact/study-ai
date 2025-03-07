const fetch = require('node-fetch');

exports.handler = async function(event, context) {
  try {
    // Get API details from environment variables
    const API_KEY = process.env.API_KEY;
    const API_BASE_URL = process.env.API_BASE_URL;
    
    if (!API_KEY || !API_BASE_URL) {
      return {
        statusCode: 500,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        },
        body: JSON.stringify({
          status: 'error',
          message: 'Missing required environment variables'
        })
      };
    }
    
    // Test different authorization formats
    const authFormats = [
      { name: 'Bearer with space', value: `Bearer ${API_KEY}` },
      { name: 'Bearer without space', value: `Bearer${API_KEY}` },
      { name: 'Just the key', value: API_KEY },
      { name: 'Token prefix', value: `Token ${API_KEY}` },
      { name: 'API-Key header', headers: { 'API-Key': API_KEY } },
      { name: 'X-API-Key header', headers: { 'X-API-Key': API_KEY } }
    ];
    
    const results = {};
    const url = `${API_BASE_URL}/models`; // Use models endpoint for testing
    
    for (const format of authFormats) {
      try {
        console.log(`Testing auth format: ${format.name}`);
        
        const headers = format.headers || {
          'Authorization': format.value
        };
        
        const response = await fetch(url, {
          method: 'GET',
          headers,
          timeout: 10000
        }).catch(err => {
          return { ok: false, status: 'network_error', statusText: err.message };
        });
        
        let result = {
          status: response.status,
          statusText: response.statusText
        };
        
        if (response.ok) {
          try {
            result.data = await response.json();
          } catch (e) {
            result.error = 'Failed to parse JSON response';
          }
        } else if (response.status !== 'network_error') {
          try {
            const text = await response.text();
            result.responseText = text;
          } catch (e) {
            result.error = 'Failed to read response text';
          }
        }
        
        results[format.name] = result;
        
        // If this format worked, try a chat completion
        if (response.ok) {
          console.log(`Auth format ${format.name} worked for models endpoint, trying chat completion`);
          
          const chatUrl = `${API_BASE_URL}/chat/completions`;
          const payload = {
            model: 'deepseek-r1',
            messages: [
              { role: "user", content: "Hello" }
            ],
            max_tokens: 10
          };
          
          const chatResponse = await fetch(chatUrl, {
            method: 'POST',
            headers: {
              ...headers,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify(payload),
            timeout: 15000
          }).catch(err => {
            return { ok: false, status: 'network_error', statusText: err.message };
          });
          
          let chatResult = {
            status: chatResponse.status,
            statusText: chatResponse.statusText
          };
          
          if (chatResponse.ok) {
            try {
              chatResult.data = await chatResponse.json();
            } catch (e) {
              chatResult.error = 'Failed to parse JSON response';
            }
          } else if (chatResponse.status !== 'network_error') {
            try {
              const text = await chatResponse.text();
              chatResult.responseText = text;
            } catch (e) {
              chatResult.error = 'Failed to read response text';
            }
          }
          
          results[`${format.name} - Chat`] = chatResult;
        }
        
      } catch (formatError) {
        results[format.name] = {
          error: formatError.message
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