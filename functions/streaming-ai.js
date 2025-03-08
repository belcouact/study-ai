const fetch = require('node-fetch');

exports.handler = async function(event, context) {
  // Add CORS headers
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization'
  };

  // Handle OPTIONS request for CORS preflight
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 204,
      headers: corsHeaders,
      body: ''
    };
  }

  // Only allow POST requests
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: 'Method Not Allowed' }),
      headers: { 'Content-Type': 'application/json', ...corsHeaders }
    };
  }

  try {
    // Parse the request body
    let requestBody;
    try {
      requestBody = JSON.parse(event.body);
    } catch (error) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Invalid JSON in request body', details: error.message }),
        headers: { 'Content-Type': 'application/json', ...corsHeaders }
      };
    }

    const { prompt, model = 'gpt-3.5-turbo', max_tokens = 1000 } = requestBody;

    if (!prompt) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Prompt is required' }),
        headers: { 'Content-Type': 'application/json', ...corsHeaders }
      };
    }

    // Check for API key
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      console.error('API key not configured');
      return {
        statusCode: 500,
        body: JSON.stringify({ error: 'API key not configured' }),
        headers: { 'Content-Type': 'application/json', ...corsHeaders }
      };
    }

    console.log(`Making request to OpenAI API with model: ${model}`);

    // For regular Netlify Functions, we can't stream directly
    // So we'll make a non-streaming request to OpenAI
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model,
        messages: [{ role: 'user', content: prompt }],
        max_tokens,
        stream: false // Disable streaming for regular functions
      })
    });

    if (!response.ok) {
      let errorText = '';
      try {
        const errorData = await response.json();
        errorText = JSON.stringify(errorData);
      } catch (e) {
        errorText = await response.text();
      }
      
      console.error(`OpenAI API error: ${response.status} - ${errorText}`);
      
      return {
        statusCode: response.status,
        body: JSON.stringify({ 
          error: 'OpenAI API error', 
          status: response.status,
          details: errorText
        }),
        headers: { 'Content-Type': 'application/json', ...corsHeaders }
      };
    }

    // Parse the response
    const data = await response.json();
    
    // Extract the content
    let content = '';
    if (data.choices && data.choices[0] && data.choices[0].message) {
      content = data.choices[0].message.content;
    }

    console.log('Successfully received response from OpenAI API');

    // Return the response
    return {
      statusCode: 200,
      body: JSON.stringify({ 
        success: true,
        content,
        model,
        usage: data.usage,
        fallback: true,
        message: 'Response generated using fallback function (non-streaming)'
      }),
      headers: { 'Content-Type': 'application/json', ...corsHeaders }
    };
  } catch (error) {
    console.error('Unhandled error in function:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Internal Server Error', details: error.message, stack: error.stack }),
      headers: { 'Content-Type': 'application/json', ...corsHeaders }
    };
  }
}; 