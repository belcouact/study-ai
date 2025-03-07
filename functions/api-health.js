const fetch = require('node-fetch');
const https = require('https');
const dns = require('dns');
const { promisify } = require('util');

const dnsLookup = promisify(dns.lookup);

exports.handler = async function(event, context) {
  try {
    // Updated API details
    const API_KEY = 'sk-3GX9xoFVBu39Ibbrdg5zhmDzudFHCCR9VTib76y8rAWgMh2G';
    const API_BASE_URL = 'https://api.lkeap.cloud.tencent.com/v1';
    const API_URL = `${API_BASE_URL}/chat/completions`;
    const MODEL = 'deepseek-r1';
    
    console.log('Starting comprehensive API diagnostics');
    
    // Step 1: DNS lookup to check if the domain exists
    let dnsResult;
    try {
      const domain = new URL(API_URL).hostname;
      console.log('Performing DNS lookup for:', domain);
      dnsResult = await dnsLookup(domain);
      console.log('DNS lookup successful:', dnsResult);
    } catch (dnsError) {
      console.log('DNS lookup failed:', dnsError.message);
      dnsResult = { error: dnsError.message };
    }
    
    // Step 2: Try a simple HTTPS request to check basic connectivity
    let connectivityResult;
    try {
      console.log('Testing basic HTTPS connectivity');
      const domain = new URL(API_URL).hostname;
      const connectivityPromise = new Promise((resolve, reject) => {
        const req = https.request({
          hostname: domain,
          port: 443,
          path: '/',
          method: 'HEAD',
          timeout: 5000
        }, (res) => {
          resolve({ statusCode: res.statusCode, headers: res.headers });
        });
        
        req.on('error', (e) => {
          reject(e);
        });
        
        req.on('timeout', () => {
          req.destroy();
          reject(new Error('Connection timed out'));
        });
        
        req.end();
      });
      
      connectivityResult = await connectivityPromise;
      console.log('Basic connectivity test result:', connectivityResult);
    } catch (connectError) {
      console.log('Connectivity test failed:', connectError.message);
      connectivityResult = { error: connectError.message };
    }
    
    // Step 3: Try the actual API request
    console.log('Attempting API request');
    const payload = {
      model: MODEL,
      messages: [
        { role: "system", content: "You are a helpful AI assistant." },
        { role: "user", content: "Say hello in one word" }
      ],
      max_tokens: 10,
      temperature: 0.7
    };

    const agent = new https.Agent({
      rejectUnauthorized: false, // For testing only - allows self-signed certs
      timeout: 10000
    });

    const response = await fetch(API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${API_KEY}`
      },
      body: JSON.stringify(payload),
      agent,
      timeout: 10000 // 10 second timeout
    }).catch(err => {
      console.log('API request failed:', err.message);
      return { ok: false, status: 'network_error', statusText: err.message };
    });

    console.log('API response status:', response.status, response.statusText);

    let responseData = null;
    let responseText = null;
    
    try {
      if (response.status !== 'network_error') {
        responseText = await response.text();
        console.log('Response text:', responseText.substring(0, 200) + (responseText.length > 200 ? '...' : ''));
        
        try {
          responseData = JSON.parse(responseText);
        } catch (e) {
          console.log('Failed to parse response as JSON:', e.message);
        }
      }
    } catch (e) {
      console.log('Error reading response:', e.message);
    }

    // Compile all diagnostic information
    const diagnostics = {
      dns: dnsResult,
      connectivity: connectivityResult,
      apiRequest: {
        url: API_URL,
        status: response.status,
        statusText: response.statusText,
        headers: response.headers ? Object.fromEntries(response.headers.entries()) : null,
        responseData: responseData,
        responseText: responseText ? (responseText.length > 500 ? responseText.substring(0, 500) + '...' : responseText) : null
      }
    };

    if (response.ok && responseData && responseData.choices && responseData.choices[0] && responseData.choices[0].message) {
      return {
        statusCode: 200,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        },
        body: JSON.stringify({ 
          status: 'ok', 
          message: 'API connection successful',
          details: { 
            status: response.status,
            response: responseData.choices[0].message.content
          },
          diagnostics
        })
      };
    } else {
      return {
        statusCode: 200, // Return 200 so the frontend can display the diagnostics
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        },
        body: JSON.stringify({ 
          status: 'error', 
          message: 'API connection failed',
          details: {
            status: response.status,
            statusText: response.statusText
          },
          diagnostics
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
        message: 'Failed to run diagnostics',
        details: error.message,
        stack: error.stack
      })
    };
  }
}; 