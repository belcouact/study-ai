export default async (request, context) => {
  // Add CORS headers to allow cross-origin requests
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization'
  };

  // Handle OPTIONS request for CORS preflight
  if (request.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: corsHeaders
    });
  }

  // Only allow POST requests
  if (request.method !== 'POST') {
    return new Response(
      JSON.stringify({ error: 'Method Not Allowed' }),
      {
        status: 405,
        headers: { 
          'Content-Type': 'application/json',
          ...corsHeaders
        }
      }
    );
  }

  try {
    // Parse the request body
    let requestBody;
    try {
      requestBody = await request.json();
    } catch (error) {
      return new Response(
        JSON.stringify({ error: 'Invalid JSON in request body', details: error.message }),
        {
          status: 400,
          headers: { 
            'Content-Type': 'application/json',
            ...corsHeaders
          }
        }
      );
    }

    const { prompt, model = 'gpt-3.5-turbo', max_tokens = 1000 } = requestBody;

    if (!prompt) {
      return new Response(
        JSON.stringify({ error: 'Prompt is required' }),
        {
          status: 400,
          headers: { 
            'Content-Type': 'application/json',
            ...corsHeaders
          }
        }
      );
    }

    // Check for API key
    const apiKey = Netlify.env.get("OPENAI_API_KEY");
    if (!apiKey) {
      console.error('API key not configured');
      return new Response(
        JSON.stringify({ error: 'API key not configured' }),
        {
          status: 500,
          headers: { 
            'Content-Type': 'application/json',
            ...corsHeaders
          }
        }
      );
    }

    console.log(`Making request to OpenAI API with model: ${model}`);

    // Set up the request to OpenAI API with streaming enabled
    let response;
    try {
      response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`
        },
        body: JSON.stringify({
          model,
          messages: [{ role: 'user', content: prompt }],
          max_tokens,
          stream: true // Enable streaming
        })
      });
    } catch (error) {
      console.error('Error fetching from OpenAI:', error);
      return new Response(
        JSON.stringify({ error: 'Failed to connect to OpenAI API', details: error.message }),
        {
          status: 502,
          headers: { 
            'Content-Type': 'application/json',
            ...corsHeaders
          }
        }
      );
    }

    if (!response.ok) {
      let errorText = '';
      try {
        const errorData = await response.json();
        errorText = JSON.stringify(errorData);
      } catch (e) {
        errorText = await response.text();
      }
      
      console.error(`OpenAI API error: ${response.status} - ${errorText}`);
      
      return new Response(
        JSON.stringify({ 
          error: 'OpenAI API error', 
          status: response.status,
          details: errorText
        }),
        {
          status: response.status,
          headers: { 
            'Content-Type': 'application/json',
            ...corsHeaders
          }
        }
      );
    }

    console.log('Successfully connected to OpenAI API, streaming response');

    // For Edge Functions, we can return the response directly
    return new Response(response.body, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
        ...corsHeaders
      }
    });
  } catch (error) {
    console.error('Unhandled error in edge function:', error);
    return new Response(
      JSON.stringify({ error: 'Internal Server Error', details: error.message, stack: error.stack }),
      {
        status: 500,
        headers: { 
          'Content-Type': 'application/json',
          ...corsHeaders
        }
      }
    );
  }
}; 