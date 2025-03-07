const fetch = require('node-fetch');
const dns = require('dns');
const { promisify } = require('util');

const dnsLookup = promisify(dns.lookup);
const dnsResolve = promisify(dns.resolve);

exports.handler = async function(event, context) {
  try {
    const API_BASE_URL = process.env.API_BASE_URL || 'https://api.lkeap.cloud.tencent.com/v1';
    
    // Extract hostname from API_BASE_URL
    const url = new URL(API_BASE_URL);
    const hostname = url.hostname;
    
    console.log('Testing network connectivity to:', hostname);
    
    // Test DNS lookup
    let dnsResult = null;
    try {
      dnsResult = await dnsLookup(hostname);
      console.log('DNS lookup result:', dnsResult);
    } catch (dnsError) {
      console.log('DNS lookup error:', dnsError);
      dnsResult = { error: dnsError.message };
    }
    
    // Test DNS resolve
    let dnsResolveResult = null;
    try {
      dnsResolveResult = await dnsResolve(hostname);
      console.log('DNS resolve result:', dnsResolveResult);
    } catch (dnsResolveError) {
      console.log('DNS resolve error:', dnsResolveError);
      dnsResolveResult = { error: dnsResolveError.message };
    }
    
    // Test HTTP connectivity
    let httpResult = null;
    try {
      const response = await fetch(`https://${hostname}`, {
        method: 'HEAD',
        timeout: 5000
      });
      httpResult = {
        status: response.status,
        statusText: response.statusText,
        headers: Object.fromEntries(response.headers.entries())
      };
      console.log('HTTP connectivity result:', httpResult);
    } catch (httpError) {
      console.log('HTTP connectivity error:', httpError);
      httpResult = { error: httpError.message };
    }
    
    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify({
        status: 'completed',
        hostname,
        dns: dnsResult,
        dnsResolve: dnsResolveResult,
        http: httpResult
      })
    };
    
  } catch (error) {
    console.log('Network test error:', error);
    return {
      statusCode: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify({
        status: 'error',
        message: error.message,
        stack: error.stack
      })
    };
  }
}; 