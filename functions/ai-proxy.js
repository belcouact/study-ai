const fetch = require('node-fetch');

exports.handler = async function(event, context) {
  // Only allow POST requests
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  try {
    const body = JSON.parse(event.body);
    const question = body.question;
    
    if (!question) {
      return { statusCode: 400, body: JSON.stringify({ error: 'Question is required' }) };
    }

    const API_KEY = 'sk-ee8971509c3446129f6c0b43ee362e13a4a642pjsvzv199t';
    const API_URL = 'https://ai-gateway.vei.volces.com/v1/chat/completions';
    const MODEL = 'deepseek-reasoner';

    const payload = {
      model: MODEL,
      messages: [
        { role: "system", content: "You are a helpful AI assistant." },
        { role: "user", content: question }
      ],
      temperature: 0.7,
      max_tokens: 2000
    };

    const response = await fetch(API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${API_KEY}`
      },
      body: JSON.stringify(payload)
    });

    const data = await response.json();
    
    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify(data)
    };
  } catch (error) {
    console.log('Error:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Failed to process request' })
    };
  }
}; 