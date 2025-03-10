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
  let connectivityTestUrl;
  try {
    const url = new URL(apiBaseUrl);
    // Just test the base domain, not the full path
    connectivityTestUrl = `${url.protocol}//${url.hostname}`;
  } catch (e) {
    // If URL parsing fails, use the original
    connectivityTestUrl = apiBaseUrl;
  }
  
  // Test connectivity to the API
  let apiConnectivity = "unknown";
  let apiResponse = null;
  
  // Create an AbortController with a 30-second timeout
  const controller = new AbortController();
  const timeoutId = setTimeout(() => {
    controller.abort();
  }, 30000); // 30 seconds timeout
  
  try {
    // Make a simple HEAD request to test connectivity to the base domain
    console.log(`Testing base domain connectivity to: ${connectivityTestUrl}`);
    const baseResponse = await fetch(connectivityTestUrl, {
      method: "HEAD",
      headers: hasApiKey ? { "Authorization": `Bearer ${apiKey}` } : {},
      signal: controller.signal
    });
    
    // If base domain is reachable, test the actual API endpoint
    if (baseResponse.ok) {
      console.log(`Base domain is reachable. Testing API endpoint: ${apiUrl}`);
      
      try {
        // Make a simple OPTIONS request to test the API endpoint
        const apiResponse = await fetch(apiUrl, {
          method: "OPTIONS",
          headers: hasApiKey ? { "Authorization": `Bearer ${apiKey}` } : {},
          signal: controller.signal
        });
        
        apiConnectivity = apiResponse.ok ? "success" : "partial";
        apiResponse = {
          baseConnectivity: "success",
          apiEndpoint: apiUrl,
          status: apiResponse.status,
          statusText: apiResponse.statusText,
          headers: Object.fromEntries([...apiResponse.headers.entries()])
        };
      } catch (endpointError) {
        // API endpoint test failed but base domain is reachable
        apiConnectivity = "partial";
        apiResponse = {
          baseConnectivity: "success",
          apiEndpoint: apiUrl,
          error: endpointError.message,
          message: "Base domain is reachable but API endpoint test failed"
        };
      }
    } else {
      // Base domain test failed
      apiConnectivity = "error";
      apiResponse = {
        status: baseResponse.status,
        statusText: baseResponse.statusText,
        headers: Object.fromEntries([...baseResponse.headers.entries()]),
        message: "Base domain is not reachable"
      };
    }
    
    // Clear the timeout
    clearTimeout(timeoutId);
    
  } catch (error) {
    // Clear the timeout
    clearTimeout(timeoutId);
    
    // Check if this was a timeout error
    if (error.name === 'AbortError') {
      apiConnectivity = "timeout";
      apiResponse = {
        error: "Request timed out after 30 seconds",
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
      connectivityTestUrl: connectivityTestUrl,
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
      "If apiConnectivity is 'partial', the base domain is reachable but the specific API endpoint may not exist",
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