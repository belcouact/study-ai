// Debug endpoint to test API connectivity
export async function onRequestGet(context) {
  const { env } = context;
  
  // Get API key from environment variables
  const apiKey = env.DEEPSEEK_API_KEY;
  const hasApiKey = !!apiKey;
  const apiKeyPreview = hasApiKey ? `${apiKey.substring(0, 3)}...${apiKey.substring(apiKey.length - 3)}` : "not set";
  
  // Get API base URL
  const apiBaseUrl = env.API_BASE_URL || "https://api.deepseek.com";
  
  // Check if the API_BASE_URL already includes the endpoint path (same logic as chat.js)
  let apiUrl;
  if (apiBaseUrl.includes('/chat/completions')) {
    // If the base URL already includes the endpoint path, use it as is
    apiUrl = apiBaseUrl;
  } else {
    // Otherwise, append the endpoint path
    apiUrl = `${apiBaseUrl}/v1/chat/completions`;
  }
  
  // Extract the base domain for connectivity test
  let baseUrl;
  try {
    const url = new URL(apiBaseUrl);
    // Just test the base domain, not the full path
    baseUrl = `${url.protocol}//${url.hostname}`;
  } catch (e) {
    // If URL parsing fails, use the original
    baseUrl = apiBaseUrl;
  }
  
  // Test connectivity to the API
  let apiConnectivity = "unknown";
  let apiResponse = null;
  
  // Create an AbortController with a 60-second timeout
  const controller = new AbortController();
  const timeoutId = setTimeout(() => {
    controller.abort();
  }, 60000); // 60 seconds timeout (1 minute)
  
  try {
    // Test the actual API endpoint with a simple GET request
    console.log(`Testing API endpoint: ${apiUrl}`);
    
    // Make a simple GET request to test the API endpoint
    const response = await fetch(apiUrl, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        ...(hasApiKey ? { "Authorization": `Bearer ${apiKey}` } : {})
      },
      signal: controller.signal
    });
    
    // Clear the timeout
    clearTimeout(timeoutId);
    
    // Check response
    apiConnectivity = response.ok ? "success" : "error";
    
    // Get response text
    let responseText;
    try {
      responseText = await response.text();
    } catch (e) {
      responseText = "Could not read response text";
    }
    
    // Try to parse as JSON if possible
    let responseJson = null;
    try {
      responseJson = JSON.parse(responseText);
    } catch (e) {
      // Not JSON, that's fine
    }
    
    apiResponse = {
      status: response.status,
      statusText: response.statusText,
      headers: Object.fromEntries([...response.headers.entries()]),
      responseText: responseText.substring(0, 500) + (responseText.length > 500 ? "..." : ""),
      responseJson: responseJson,
      isJson: !!responseJson
    };
    
  } catch (error) {
    // Clear the timeout
    clearTimeout(timeoutId);
    
    // Check if this was a timeout error
    if (error.name === 'AbortError') {
      apiConnectivity = "timeout";
      apiResponse = {
        error: "Request timed out after 60 seconds",
        message: "The connectivity test request timed out"
      };
    } else {
      apiConnectivity = "error";
      apiResponse = {
        error: error.message,
        stack: error.stack
      };
    }
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
      apiUrl: apiUrl,
      baseUrl: baseUrl,
      maxTokens: env.MAX_TOKENS || "4096 (default)",
      temperature: env.TEMPERATURE || "0.7 (default)"
    },
    apiConnectivity: apiConnectivity,
    apiResponse: apiResponse,
    apiUrlAnalysis: {
      includesCompletionsPath: apiBaseUrl.includes('/chat/completions'),
      recommendedFormat: apiBaseUrl.includes('/chat/completions') ? 
        "Your API_BASE_URL already includes the endpoint path" : 
        "Your API_BASE_URL should be the base URL without the endpoint path"
    },
    troubleshooting_tips: [
      "If apiConnectivity is 'error', check your API_BASE_URL",
      "If apiConnectivity is 'timeout', the request took too long to complete",
      "Make sure the API endpoint exists and is accessible",
      "If hasApiKey is false, set the DEEPSEEK_API_KEY environment variable in the Cloudflare Pages dashboard",
      "Make sure your API key has the correct permissions",
      "Check if the API service is available"
    ]
  }), {
    headers: { 
      "Content-Type": "application/json; charset=utf-8",
      "X-Content-Type-Options": "nosniff",
      "Cache-Control": "no-store"
    }
  });
} 