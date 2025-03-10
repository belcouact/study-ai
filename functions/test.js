// Simple test function to verify Functions are working
export async function onRequest(context) {
  const { env } = context;
  
  // Return a simple response with environment info (excluding sensitive data)
  return new Response(JSON.stringify({
    message: "Functions are working!",
    environment: env.NODE_ENV || "not set",
    hasApiKey: env.DEEPSEEK_API_KEY ? "yes" : "no",
    hasApiUrl: env.API_BASE_URL ? "yes" : "no"
  }), {
    headers: { "Content-Type": "application/json" }
  });
} 