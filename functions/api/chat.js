// Handle chat requests to DeepSeek API
export async function onRequestPost(context) {
  try {
    const { request, env } = context;
    
    // Get API key from environment variables
    const apiKey = env.DEEPSEEK_API_KEY;
    if (!apiKey) {
      return new Response(JSON.stringify({ 
        error: "API key not configured",
        troubleshooting_tips: [
          "Set the DEEPSEEK_API_KEY environment variable in your Cloudflare Pages dashboard",
          "Make sure the API key is correct and has not expired"
        ]
      }), {
        status: 500,
        headers: { "Content-Type": "application/json" }
      });
    }
    
    // Get request body
    let body;
    try {
      body = await request.json();
    } catch (e) {
      return new Response(JSON.stringify({ 
        error: "Invalid JSON in request body",
        message: e.message,
        troubleshooting_tips: [
          "Check that your request includes a valid JSON body",
          "Verify the Content-Type header is set to application/json"
        ]
      }), {
        status: 400,
        headers: { "Content-Type": "application/json" }
      });
    }
    
    // Forward request to DeepSeek API
    const apiBaseUrl = env.API_BASE_URL;
    
    // Check if the API_BASE_URL already includes the endpoint path
    let apiUrl;
    if (apiBaseUrl.includes('/chat/completions')) {
      // If the base URL already includes the endpoint path, use it as is
      apiUrl = apiBaseUrl;
    } else {
      // Otherwise, append the endpoint path
      apiUrl = `${apiBaseUrl}/v1/chat/completions`;
    }
    
    // Create an AbortController with a 300-second timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => {
      controller.abort();
    }, 300000); // 300 seconds timeout (5 minutes)
    
    try {
      const response = await fetch(apiUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${apiKey}`
        },
        body: JSON.stringify({
          //model: "deepseek-chat",
          model: env.MODEL,
          messages: body.messages,
          max_tokens: parseInt(env.MAX_TOKENS || "4096"),
          temperature: parseFloat(env.TEMPERATURE || "0.7")
        }),
        signal: controller.signal
      });
      
      console.log(`base url: ${apiUrl}`);
      console.log(`base url: ${env.MODEL}`);

      // Clear the timeout
      clearTimeout(timeoutId);
      
      // Check if response is OK
      if (!response.ok) {
        const contentType = response.headers.get("content-type");
        
        // If response is HTML (error page)
        if (contentType && contentType.includes("text/html")) {
          const htmlContent = await response.text();
          const firstLine = htmlContent.split('\n')[0].substring(0, 100);
          
          return new Response(JSON.stringify({
            error: "Received HTML instead of JSON from API",
            status: response.status,
            statusText: response.statusText,
            contentType: contentType,
            htmlPreview: firstLine,
            troubleshooting_tips: [
              "The API endpoint may be incorrect - check API_BASE_URL",
              "The API service might be down or experiencing issues",
              "Your API key might be invalid or expired",
              "There might be network connectivity issues"
            ]
          }), {
            status: 502,
            headers: { "Content-Type": "application/json" }
          });
        }
        
        // Try to parse error as JSON
        try {
          const errorData = await response.json();
          return new Response(JSON.stringify({
            error: "API request failed",
            status: response.status,
            statusText: response.statusText,
            apiError: errorData,
            troubleshooting_tips: [
              "Check your API key is valid",
              "Verify the request format is correct",
              "The API service might be experiencing issues"
            ]
          }), {
            status: response.status,
            headers: { "Content-Type": "application/json" }
          });
        } catch (e) {
          // If can't parse as JSON, return text
          const textContent = await response.text();
          return new Response(JSON.stringify({
            error: "API request failed with non-JSON response",
            status: response.status,
            statusText: response.statusText,
            responseText: textContent.substring(0, 500),
            troubleshooting_tips: [
              "Check your API key is valid",
              "Verify the API endpoint is correct",
              "The API service might be experiencing issues"
            ]
          }), {
            status: response.status,
            headers: { "Content-Type": "application/json" }
          });
        }
      }
      
      // Try to parse the successful response
      try {
        const data = await response.json();
        return new Response(JSON.stringify(data), {
          headers: { 
            "Content-Type": "application/json; charset=utf-8",
            "X-Content-Type-Options": "nosniff",
            "Cache-Control": "no-store"
          }
        });
      } catch (e) {
        const textContent = await response.text();
        return new Response(JSON.stringify({
          error: "Failed to parse API response as JSON",
          message: e.message,
          responseText: textContent.substring(0, 500),
          troubleshooting_tips: [
            "The API might be returning malformed JSON",
            "The response might be HTML instead of JSON",
            "Check if the API endpoint is correct"
          ]
        }), {
          status: 502,
          headers: { 
            "Content-Type": "application/json; charset=utf-8",
            "X-Content-Type-Options": "nosniff",
            "Cache-Control": "no-store"
          }
        });
      }
    } catch (error) {
      // Clear the timeout if it's still active
      clearTimeout(timeoutId);
      
      // Check if this was a timeout error
      if (error.name === 'AbortError') {
        return new Response(JSON.stringify({ 
          error: "Request timeout",
          message: "The request to the API timed out after 300 seconds",
          troubleshooting_tips: [
            "The API service might be experiencing high load",
            "Try again later or with a simpler request",
            "Check if the API endpoint is correct",
            "Verify that your API key has the correct permissions"
          ]
        }), {
          status: 504, // Gateway Timeout
          headers: { 
            "Content-Type": "application/json; charset=utf-8",
            "X-Content-Type-Options": "nosniff",
            "Cache-Control": "no-store"
          }
        });
      }
      
      return new Response(JSON.stringify({ 
        error: "Server error processing request",
        message: error.message,
        stack: error.stack,
        troubleshooting_tips: [
          "This is likely a bug in the serverless function",
          "Check the Cloudflare Pages function logs for more details",
          "Verify that all environment variables are set correctly in the Cloudflare Pages dashboard"
        ]
      }), {
        status: 500,
        headers: { 
          "Content-Type": "application/json; charset=utf-8",
          "X-Content-Type-Options": "nosniff",
          "Cache-Control": "no-store"
        }
      });
    }
  } catch (error) {
    return new Response(JSON.stringify({ 
      error: "Server error processing request",
      message: error.message,
      stack: error.stack,
      troubleshooting_tips: [
        "This is likely a bug in the serverless function",
        "Check the Cloudflare Pages function logs for more details",
        "Verify that all environment variables are set correctly in the Cloudflare Pages dashboard"
      ]
    }), {
      status: 500,
      headers: { 
        "Content-Type": "application/json; charset=utf-8",
        "X-Content-Type-Options": "nosniff",
        "Cache-Control": "no-store"
      }
    });
  }
}

// Handle OPTIONS requests for CORS
export function onRequestOptions() {
  return new Response(null, {
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
      "X-Content-Type-Options": "nosniff",
      "Cache-Control": "no-store"
    }
  });
} 