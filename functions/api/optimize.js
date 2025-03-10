// Optimize question function
export async function onRequestPost(context) {
  const { request, env } = context;
  
  // Get API key from environment variables
  const apiKey = env.DEEPSEEK_API_KEY;
  if (!apiKey) {
    return new Response(JSON.stringify({ 
      error: "API key not configured",
      message: "The API key is not configured in the environment variables."
    }), {
      status: 500,
      headers: { 
        "Content-Type": "application/json; charset=utf-8",
        "X-Content-Type-Options": "nosniff",
        "Cache-Control": "no-store"
      }
    });
  }
  
  // Get request body
  let body;
  try {
    body = await request.json();
  } catch (e) {
    return new Response(JSON.stringify({ 
      error: "Invalid JSON in request body",
      message: e.message
    }), {
      status: 400,
      headers: { 
        "Content-Type": "application/json; charset=utf-8",
        "X-Content-Type-Options": "nosniff",
        "Cache-Control": "no-store"
      }
    });
  }
  
  // Get the question to optimize
  const question = body.question;
  if (!question) {
    return new Response(JSON.stringify({ 
      error: "Missing question",
      message: "The question parameter is required."
    }), {
      status: 400,
      headers: { 
        "Content-Type": "application/json; charset=utf-8",
        "X-Content-Type-Options": "nosniff",
        "Cache-Control": "no-store"
      }
    });
  }
  
  // Create the optimization prompt
  const optimizationPrompt = `请优化以下问题，使其更清晰、更具体，以便AI更好地理解和回答。只返回优化后的问题，不要添加任何解释或其他内容。原问题：${question}`;
  
  // Forward request to DeepSeek API
  const apiBaseUrl = env.API_BASE_URL || "https://api.deepseek.com";
  
  // Check if the API_BASE_URL already includes the endpoint path
  let apiUrl;
  if (apiBaseUrl.includes('/chat/completions')) {
    // If the base URL already includes the endpoint path, use it as is
    apiUrl = apiBaseUrl;
  } else {
    // Otherwise, append the endpoint path
    apiUrl = `${apiBaseUrl}/v1/chat/completions`;
  }
  
  console.log(`Making optimization request to: ${apiUrl}`);
  
  // Create an AbortController with a 60-second timeout
  const controller = new AbortController();
  const timeoutId = setTimeout(() => {
    controller.abort();
  }, 60000); // 60 seconds timeout (1 minute)
  
  try {
    const response = await fetch(apiUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: "deepseek-reasoner",
        messages: [
          { role: "user", content: optimizationPrompt }
        ],
        max_tokens: parseInt(env.MAX_TOKENS || "1024"),
        temperature: parseFloat(env.TEMPERATURE || "0.5")
      }),
      signal: controller.signal
    });
    
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
          htmlPreview: firstLine
        }), {
          status: 502,
          headers: { 
            "Content-Type": "application/json; charset=utf-8",
            "X-Content-Type-Options": "nosniff",
            "Cache-Control": "no-store"
          }
        });
      }
      
      // Try to parse error as JSON
      try {
        const errorData = await response.json();
        return new Response(JSON.stringify({
          error: "API request failed",
          status: response.status,
          statusText: response.statusText,
          apiError: errorData
        }), {
          status: response.status,
          headers: { 
            "Content-Type": "application/json; charset=utf-8",
            "X-Content-Type-Options": "nosniff",
            "Cache-Control": "no-store"
          }
        });
      } catch (e) {
        // If can't parse as JSON, return text
        const textContent = await response.text();
        return new Response(JSON.stringify({
          error: "API request failed with non-JSON response",
          status: response.status,
          statusText: response.statusText,
          responseText: textContent.substring(0, 500)
        }), {
          status: response.status,
          headers: { 
            "Content-Type": "application/json; charset=utf-8",
            "X-Content-Type-Options": "nosniff",
            "Cache-Control": "no-store"
          }
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
        responseText: textContent.substring(0, 500)
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
        message: "The request to the API timed out after 60 seconds"
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
      stack: error.stack
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