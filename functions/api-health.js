const fetch = require('node-fetch');
const https = require('https');
const dns = require('dns');
const { promisify } = require('util');

const dnsLookup = promisify(dns.lookup);

exports.handler = async function(event, context) {
  try {
    // API details
    const API_KEY = 'sk-3GX9xoFVBu39Ibbrdg5zhmDzudFHCCR9VTib76y8rAWgMh2G';
    const API_BASE_URL = 'https://api.lkeap.cloud.tencent.com/v1';
    
    console.log('Starting API health check');
    
    // Create a custom agent to handle HTTPS requests
    const agent = new https.Agent({
      rejectUnauthorized: false, // For testing only
      keepAlive: true,
      timeout: 10000
    });
    
    // First, check the models endpoint which should be more reliable
    const modelsUrl = `${API_BASE_URL}/models`;
    console.log('Checking models endpoint:', modelsUrl);
    
    const modelsResponse = await fetch(modelsUrl, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${API_KEY}`
      },
      agent,
      timeout: 10000
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
        : 'deepseek-r1';
      
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
        agent,
        timeout: 15000
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
        stack: error.stack
      })
    };
  }
}; 