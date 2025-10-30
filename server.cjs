const https = require('https');
const http = require('http');
const express = require('express');
const path = require('path');
const fs = require('fs');
const { createProxyMiddleware } = require('http-proxy-middleware');

// Load environment variables from .env file
require('dotenv').config();

const app = express();
const port = 3000;

// Log all /api requests
app.use('/api', (req, res, next) => {
  next();
});

// Proxy API requests to the backend server
app.use('/api', createProxyMiddleware({
  target: 'http://127.0.0.1:4000/api',
  changeOrigin: true,
  secure: false,
  headers: {
    'Authorization': `Bearer ${process.env.VITE_API_TOKEN}`
  },
  onError: (err, req, res) => {
    console.error('Proxy error:', err);
    res.status(500).json({ error: 'Proxy error' });
  }
}));

// Serve static files from the dist directory
app.use(express.static(path.join(__dirname, 'dist')));

// Simple test route
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

// Catch-all handler: send back index.html for any non-API routes
// This enables client-side routing for SPAs
app.use((req, res, next) => {
  // Only serve index.html for non-API routes
  if (!req.path.startsWith('/api')) {
    res.sendFile(path.join(__dirname, 'dist', 'index.html'));
  } else {
    next();
  }
});

// Create HTTP server for testing
const httpServer = http.createServer(app);

httpServer.listen(port, '0.0.0.0', () => {
});
