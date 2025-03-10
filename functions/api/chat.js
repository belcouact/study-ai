// Handle chat requests to DeepSeek API
export async function onRequestPost(context) {
  try {
    const { request, env } = context;
    
    // Get API key from environment variables
    const apiKey = env.DEEPSEEK_API_KEY;
    if (!apiKey) {
      return new Response(JSON.stringify({ error: "API key not configured" }), {
        status: 500,
        headers: { "Content-Type": "application/json" }
      });
    }
    
    // Get request body
    const body = await request.json();
    
    // Forward request to DeepSeek API
    const apiBaseUrl = env.API_BASE_URL || "https://api.deepseek.com";
    const response = await fetch(`${apiBaseUrl}/v1/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: "deepseek-reasoner",
        messages: body.messages,
        max_tokens: parseInt(env.MAX_TOKENS || "4096"),
        temperature: parseFloat(env.TEMPERATURE || "0.7")
      })
    });
    
    // Return the API response
    const data = await response.json();
    return new Response(JSON.stringify(data), {
      headers: { "Content-Type": "application/json" }
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" }
    });
  }
}

// Handle OPTIONS requests for CORS
export function onRequestOptions() {
  return new Response(null, {
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization"
    }
  });
} 