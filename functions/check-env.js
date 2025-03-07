exports.handler = async function(event, context) {
  try {
    // Check environment variables
    const API_KEY = process.env.API_KEY;
    const API_BASE_URL = process.env.API_BASE_URL;
    const API_MODEL = process.env.API_MODEL;
    
    // Get Netlify environment information
    const netlifyInfo = {
      NETLIFY: process.env.NETLIFY,
      NETLIFY_DEV: process.env.NETLIFY_DEV,
      CONTEXT: process.env.CONTEXT,
      DEPLOY_URL: process.env.DEPLOY_URL,
      DEPLOY_PRIME_URL: process.env.DEPLOY_PRIME_URL,
      URL: process.env.URL
    };
    
    // Check if environment variables are set
    const missingVars = [];
    if (!API_KEY) missingVars.push('API_KEY');
    if (!API_BASE_URL) missingVars.push('API_BASE_URL');
    if (!API_MODEL) missingVars.push('API_MODEL');
    
    if (missingVars.length > 0) {
      return {
        statusCode: 200,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        },
        body: JSON.stringify({
          status: 'error',
          message: `Missing environment variables: ${missingVars.join(', ')}`,
          environmentCheck: {
            API_KEY: API_KEY ? 'Set' : 'Missing',
            API_BASE_URL: API_BASE_URL || 'Missing',
            API_MODEL: API_MODEL || 'Missing'
          },
          netlifyInfo
        })
      };
    }
    
    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify({
        status: 'ok',
        message: 'All environment variables are set',
        environmentCheck: {
          API_KEY: 'Set',
          API_BASE_URL: API_BASE_URL,
          API_MODEL: API_MODEL
        },
        netlifyInfo
      })
    };
    
  } catch (error) {
    return {
      statusCode: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify({
        status: 'error',
        message: `Error checking environment: ${error.message}`,
        stack: error.stack
      })
    };
  }
};