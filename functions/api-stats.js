exports.handler = async function(event, context) {
  // Get stats from other functions (this is just a placeholder)
  // In a real implementation, you'd need to store stats in a database or other persistent storage
  
  return {
    statusCode: 200,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*'
    },
    body: JSON.stringify({
      totalCalls: 100, // Example value
      successRate: "95%",
      averageResponseTime: "1.2s",
      popularQuestions: [
        "What is AI?",
        "How does machine learning work?",
        "Tell me a joke"
      ]
    })
  };
}; 