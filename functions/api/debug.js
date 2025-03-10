// Debug endpoint to test API connectivity
export async function onRequestGet(context) {
  const { env } = context;
  
  // Get API key from environment variables
  const apiKey = env.DEEPSEEK_API_KEY;
  const hasApiKey = !!apiKey;
  const apiKeyPreview = hasApiKey ? `${apiKey.substring(0, 3)}...${apiKey.substring(apiKey.length - 3)}` : "not set";
  
  // Get API base URL
  const apiBaseUrl = env.API_BASE_URL || "https://api.deepseek.com";
  
  // Test connectivity to the API
  let apiConnectivity = "unknown";
  let apiResponse = null;
  
  try {
    // Make a simple HEAD request to test connectivity
    const response = await fetch(apiBaseUrl, {
      method: "HEAD",
      headers: hasApiKey ? { "Authorization": `Bearer ${apiKey}` } : {}
    });
    
    apiConnectivity = response.ok ? "success" : "error";
    apiResponse = {
      status: response.status,
      statusText: response.statusText,
      headers: Object.fromEntries([...response.headers.entries()])
    };
  } catch (error) {
    apiConnectivity = "error";
    apiResponse = {
      error: error.message,
      stack: error.stack
    };
  }
  
  // Return debug information
  return new Response(JSON.stringify({
    message: "Debug information for Cloudflare Pages Functions",
    timestamp: new Date().toISOString(),
    environment: {
      NODE_ENV: env.NODE_ENV || "not set",
      hasApiKey: hasApiKey,
      apiKeyPreview: apiKeyPreview,
      apiBaseUrl: apiBaseUrl,
      maxTokens: env.MAX_TOKENS || "4096 (default)",
      temperature: env.TEMPERATURE || "0.7 (default)"
    },
    apiConnectivity: apiConnectivity,
    apiResponse: apiResponse,
    troubleshooting_tips: [
      "If apiConnectivity is 'error', check your API_BASE_URL",
      "If hasApiKey is false, set the DEEPSEEK_API_KEY environment variable in the Cloudflare Pages dashboard",
      "Make sure your API key has the correct permissions",
      "Check if the API service is available"
    ]
  }), {
    headers: { "Content-Type": "application/json" }
  });
} 