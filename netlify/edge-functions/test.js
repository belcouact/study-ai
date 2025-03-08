export default async (request, context) => {
  return new Response(
    JSON.stringify({
      message: "Edge function is working!",
      timestamp: new Date().toISOString(),
      url: request.url,
      method: request.method,
      headers: Object.fromEntries([...request.headers.entries()]),
      env: {
        hasOpenAIKey: !!Netlify.env.get("OPENAI_API_KEY")
      }
    }),
    {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization'
      }
    }
  );
}; 