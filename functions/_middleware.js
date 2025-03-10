// Middleware for all functions
export async function onRequest(context) {
  // Add headers to all responses
  const response = await context.next();
  
  // Set CORS headers
  response.headers.set("Access-Control-Allow-Origin", "*");
  response.headers.set("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  response.headers.set("Access-Control-Allow-Headers", "Content-Type");
  
  // Set security headers
  response.headers.set("X-Content-Type-Options", "nosniff");
  response.headers.set("X-Frame-Options", "DENY");
  response.headers.set("Referrer-Policy", "no-referrer");
  
  // Set content type if not already set
  if (!response.headers.has("Content-Type")) {
    response.headers.set("Content-Type", "application/json; charset=utf-8");
  }
  
  // Set cache control for API responses
  if (!response.headers.has("Cache-Control")) {
    response.headers.set("Cache-Control", "no-store");
  }
  
  return response;
} 