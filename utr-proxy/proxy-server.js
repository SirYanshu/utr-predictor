const express = require('express');
const cors = require('cors');
const fetch = require('node-fetch');

const app = express();
const PORT = 3000;
const UTR_API_BASE = 'https://api.utrsports.net/v4';

// Enable CORS for your Angular app
app.use(cors({
  origin: 'http://localhost:4200',
  credentials: true
}));

app.use(express.json());

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    message: 'UTR API Proxy is running',
    targetApi: UTR_API_BASE,
    port: PORT
  });
});

// Root endpoint with instructions
app.get('/', (req, res) => {
  res.json({
    message: 'UTR API Proxy Server',
    status: 'running',
    endpoints: {
      health: '/health',
      api: '/api/*'
    },
    usage: 'Send requests to /api/* and they will be proxied to UTR API with authentication'
  });
});

// Proxy middleware - must be after other routes
app.use('/api', async (req, res) => {
  try {
    // Extract the JWT token from custom header
    const jwtToken = req.headers['x-jwt-token'];
    
    console.log('\n=== Incoming Request ===');
    console.log('Method:', req.method);
    console.log('Path:', req.url);
    console.log('Has JWT Token:', !!jwtToken);
    console.log('JWT Token (first 50 chars):', jwtToken ? jwtToken.substring(0, 50) + '...' : 'NONE');
    
    if (!jwtToken) {
      console.log('❌ No JWT token provided');
      return res.status(401).json({ error: 'No JWT token provided' });
    }

    // Build the target URL
    const path = req.url;
    const targetUrl = `${UTR_API_BASE}${path}`;
    
    console.log('Target URL:', targetUrl);

    // Prepare headers
    const headers = {
      'accept': 'application/json, text/plain, */*',
      'Content-Type': 'application/json',
      'Cookie': `jwt=${jwtToken}`,
      'User-Agent': 'UTR-Calculator-Proxy/1.0',
      'Origin': 'https://app.utrsports.net',
      'Referer': 'https://app.utrsports.net/'
    };

    console.log('Request Headers:', JSON.stringify(headers, null, 2));

    // Forward the request to UTR API
    console.log('Sending request to UTR API...');
    
    const response = await fetch(targetUrl, {
      method: req.method,
      headers: headers,
      body: req.method !== 'GET' && req.method !== 'HEAD' ? JSON.stringify(req.body) : undefined
    });

    console.log('\n=== Response from UTR API ===');
    console.log('Status:', response.status, response.statusText);
    console.log('Headers:', JSON.stringify(Object.fromEntries(response.headers.entries()), null, 2));

    // Get response data
    const contentType = response.headers.get('content-type');
    console.log('Content-Type:', contentType);
    
    let data;
    
    try {
      if (contentType && contentType.includes('application/json')) {
        data = await response.json();
        console.log('Response Data (JSON):', JSON.stringify(data, null, 2));
      } else {
        data = await response.text();
        console.log('Response Data (Text):', data);
      }
    } catch (parseError) {
      console.error('❌ Error parsing response:', parseError);
      data = { error: 'Failed to parse response', details: parseError.message };
    }

    console.log('=== Sending response to client ===\n');

    // Forward the response with proper status
    res.status(response.status);
    
    if (typeof data === 'string') {
      res.send(data);
    } else {
      res.json(data);
    }

  } catch (error) {
    console.error('\n❌ Proxy error:', error);
    console.error('Error details:', {
      message: error.message,
      stack: error.stack
    });
    
    res.status(500).json({ 
      error: 'Proxy error', 
      message: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

app.listen(PORT, () => {
  console.log(`
╔════════════════════════════════════════════╗
║   UTR API Proxy Server (DEBUG MODE)        ║
╠════════════════════════════════════════════╣
║   Status: Running ✓                        ║
║   Port: ${PORT}                                ║
║   Target: ${UTR_API_BASE}    ║
║                                            ║
║   Detailed logging enabled                 ║
╚════════════════════════════════════════════╝
  `);
});
