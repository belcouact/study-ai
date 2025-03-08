const fetch = require('node-fetch');
const https = require('https');
const dns = require('dns');
const { promisify } = require('util');

const dnsLookup = promisify(dns.lookup);

exports.handler = async function(event, context) {
  try {
    // Get API details from environment variables
    const API_KEY = process.env.API_KEY;
    const API_BASE_URL = process.env.API_BASE_URL;
    const DEFAULT_MODEL = process.env.API_MODEL || 'deepseek-r1';
    
    if (!API_KEY || !API_BASE_URL) {
      return {
        statusCode: 500,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        },
        body: JSON.stringify({
          status: 'error',
          message: 'Missing required environment variables: API_KEY or API_BASE_URL',
          environmentCheck: {
            API_KEY: API_KEY ? 'Set' : 'Missing',
            API_BASE_URL: API_BASE_URL ? 'Set' : 'Missing',
            API_MODEL: DEFAULT_MODEL ? 'Set' : 'Missing'
          }
        })
      };
    }
    
    console.log('Starting API health check');
    
    // Create a custom agent to handle HTTPS requests
    const agent = new https.Agent({
      rejectUnauthorized: false, // For testing only
      keepAlive: true,
      timeout: 90000  // Increased from 10000 to 90000 (90 seconds)
    });
    
    // First, check the models endpoint which should be more reliable
    const modelsUrl = `${API_BASE_URL}/models`;
    console.log('Checking models endpoint:', modelsUrl);
    
    const modelsResponse = await fetch(modelsUrl, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${API_KEY}`
      },
      agent: agent,
      timeout: 90000  // Increased from 10000 to 90000 (90 seconds)
    }).catch(err => {
      console.log('Models request failed:', err.message);
      return { ok: false, status: 'network_error', statusText: err.message };
    });
    
    console.log('Models response status:', modelsResponse.status);
    
    let modelsData = null;
    if (modelsResponse.ok) {
      try {
        modelsData = await modelsResponse.json();
        console.log('Models data received:', modelsData);
      } catch (e) {
        console.log('Failed to parse models response:', e.message);
      }
    }
    
    // If models endpoint worked, try a simple chat completion
    if (modelsResponse.ok && modelsData) {
      const chatUrl = `${API_BASE_URL}/chat/completions`;
      console.log('Testing chat completions endpoint:', chatUrl);
      
      // Use the first available model
      const model = modelsData.data && modelsData.data.length > 0 
        ? modelsData.data[0].id 
        : DEFAULT_MODEL;
      
      const payload = {
        model: model,
        messages: [
          { role: "system", content: "You are a helpful AI assistant." },
          { role: "user", content: "Say hello in one word" }
        ],
        max_tokens: 10,
        temperature: 0.7,
        stream: false
      };
      
      const chatResponse = await fetch(chatUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${API_KEY}`
        },
        body: JSON.stringify(payload),
        agent: agent,
        timeout: 90000  // Increased from 15000 to 90000 (90 seconds)
      }).catch(err => {
        console.log('Chat request failed:', err.message);
        return { ok: false, status: 'network_error', statusText: err.message };
      });
      
      console.log('Chat response status:', chatResponse.status);
      
      let chatData = null;
      if (chatResponse.ok) {
        try {
          chatData = await chatResponse.json();
          console.log('Chat data received:', chatData);
        } catch (e) {
          console.log('Failed to parse chat response:', e.message);
        }
      }
      
      // If both endpoints worked, return success
      if (chatResponse.ok && chatData) {
        return {
          statusCode: 200,
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*'
          },
          body: JSON.stringify({
            status: 'ok',
            message: 'API connection successful',
            models: modelsData.data,
            chat: {
              model: model,
              response: chatData.choices && chatData.choices[0] ? chatData.choices[0].message : null
            },
            environmentCheck: {
              API_KEY: 'Set',
              API_BASE_URL: API_BASE_URL,
              API_MODEL: DEFAULT_MODEL
            }
          })
        };
      }
      
      // If chat endpoint failed but models worked
      return {
        statusCode: 200,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        },
        body: JSON.stringify({
          status: 'partial',
          message: 'API models endpoint is working, but chat completions failed',
          models: modelsData.data,
          chatError: {
            status: chatResponse.status,
            statusText: chatResponse.statusText
          },
          environmentCheck: {
            API_KEY: 'Set',
            API_BASE_URL: API_BASE_URL,
            API_MODEL: DEFAULT_MODEL
          }
        })
      };
    }
    
    // If models endpoint failed
    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify({
        status: 'error',
        message: 'API connection failed',
        details: {
          status: modelsResponse.status,
          statusText: modelsResponse.statusText
        },
        environmentCheck: {
          API_KEY: 'Set',
          API_BASE_URL: API_BASE_URL,
          API_MODEL: DEFAULT_MODEL
        }
      })
    };
    
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
        message: 'Failed to run health check',
        details: error.message,
        stack: error.stack,
        environmentCheck: {
          API_KEY: process.env.API_KEY ? 'Set' : 'Missing',
          API_BASE_URL: process.env.API_BASE_URL ? 'Set' : 'Missing',
          API_MODEL: process.env.API_MODEL ? 'Set' : 'Missing'
        }
      })
    };
  }
}; 