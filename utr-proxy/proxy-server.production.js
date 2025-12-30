const express = require('express');
const cors = require('cors');
const fetch = require('node-fetch');

const app = express();
const PORT = process.env.PROXY_PORT || 3000;
const UTR_API_BASE = 'https://api.utrsports.net/v4';
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:4200';
const NODE_ENV = process.env.NODE_ENV || 'production';

// Enable CORS for your frontend
app.use(cors({
  origin: FRONTEND_URL,
  credentials: true
}));

app.use(express.json());

// Logging middleware
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
  next();
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    message: 'UTR API Proxy is running',
    environment: NODE_ENV,
    timestamp: new Date().toISOString()
  });
});

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    message: 'UTR API Proxy Server',
    status: 'running',
    version: '1.0.0',
    endpoints: {
      health: '/health',
      api: '/api/*'
    }
  });
});

// Proxy middleware
app.use('/api', async (req, res) => {
  try {
    const jwtToken = req.headers['x-jwt-token'];
    
    if (!jwtToken) {
      console.warn('Request without JWT token');
      return res.status(401).json({ error: 'No JWT token provided' });
    }

    const path = req.url;
    const targetUrl = `${UTR_API_BASE}${path}`;

    const headers = {
      'accept': 'application/json, text/plain, */*',
      'Content-Type': 'application/json',
      'Cookie': `jwt=${jwtToken}`,
      'User-Agent': 'UTR-Calculator-Proxy/1.0',
      'Origin': 'https://app.utrsports.net',
      'Referer': 'https://app.utrsports.net/'
    };

    if (NODE_ENV === 'development') {
      console.log('Proxying request to:', targetUrl);
    }

    const response = await fetch(targetUrl, {
      method: req.method,
      headers: headers,
      body: req.method !== 'GET' && req.method !== 'HEAD' ? JSON.stringify(req.body) : undefined
    });

    const contentType = response.headers.get('content-type');
    let data;
    
    try {
      if (contentType && contentType.includes('application/json')) {
        data = await response.json();
      } else {
        data = await response.text();
      }
    } catch (parseError) {
      console.error('Error parsing response:', parseError.message);
      return res.status(500).json({ 
        error: 'Failed to parse UTR API response',
        details: parseError.message
      });
    }

    res.status(response.status);
    
    if (typeof data === 'string') {
      res.send(data);
    } else {
      res.json(data);
    }

  } catch (error) {
    console.error('Proxy error:', error.message);
    res.status(500).json({ 
      error: 'Proxy error', 
      message: NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({
    error: 'Internal server error',
    message: NODE_ENV === 'development' ? err.message : undefined
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`
╔════════════════════════════════════════════╗
║   UTR API Proxy Server                     ║
╠════════════════════════════════════════════╣
║   Status: Running ✓                        ║
║   Environment: ${NODE_ENV.padEnd(28)}║
║   Port: ${PORT.toString().padEnd(34)}║
║   Frontend: ${FRONTEND_URL.substring(0, 28).padEnd(28)}║
║   Target: ${UTR_API_BASE.padEnd(28)}║
╚════════════════════════════════════════════╝
  `);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully...');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('SIGINT received, shutting down gracefully...');
  process.exit(0);
});
