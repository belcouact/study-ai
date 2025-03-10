// Simple test function to verify Functions are working
export async function onRequest(context) {
  const { env } = context;
  
  // Return a simple response with environment info (excluding sensitive data)
  return new Response(JSON.stringify({
    message: "Cloudflare Pages Functions are working!",
    environment: env.NODE_ENV || "not set",
    hasApiKey: env.DEEPSEEK_API_KEY ? "yes" : "no",
    hasApiUrl: env.API_BASE_URL ? "yes" : "no",
    troubleshooting_tips: [
      "If hasApiKey is 'no', set the DEEPSEEK_API_KEY in your Cloudflare Pages dashboard",
      "If hasApiUrl is 'no', set the API_BASE_URL in your Cloudflare Pages dashboard if needed",
      "Check the Cloudflare Pages logs for any function errors"
    ]
  }), {
    headers: { "Content-Type": "application/json" }
  });
} 