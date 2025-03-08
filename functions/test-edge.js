exports.handler = async function(event, context) {
  return {
    statusCode: 200,
    body: JSON.stringify({
      message: "Regular function is working!",
      timestamp: new Date().toISOString(),
      url: event.rawUrl,
      method: event.httpMethod,
      headers: event.headers,
      env: {
        hasOpenAIKey: !!process.env.OPENAI_API_KEY
      },
      note: "This is the regular function version, not the edge function."
    }),
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization'
    }
  };
}; 