#!/usr/bin/env node

const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = 3000;
const HOST = '127.0.0.1';
const DIST_DIR = path.join(__dirname, 'dist');

const MIME_TYPES = {
  '.html': 'text/html',
  '.js': 'application/javascript',
  '.mjs': 'application/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
  '.eot': 'application/vnd.ms-fontobject',
  '.otf': 'font/otf',
};

const SECURITY_HEADERS = {
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
  'Content-Security-Policy': [
    "default-src 'self'",
    "script-src 'self'",
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: https:",
    "font-src 'self' data:",
    "connect-src 'self'",
    "frame-ancestors 'none'",
    "base-uri 'self'",
    "form-action 'self'",
  ].join('; '),
};

// Relaxed headers for the MelodyLab iframe document only. Strudel needs
// 'unsafe-eval' (it compiles patterns to JS at runtime) and data: scripts (its
// AudioWorklet processors load from data: URLs). This document is also meant to
// be framed by our own pages, so framing is allowed for same-origin only. Every
// other route keeps the strict SECURITY_HEADERS above.
const MELODY_HEADERS = {
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'SAMEORIGIN',
  'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
  'Content-Security-Policy': [
    "default-src 'self'",
    "script-src 'self' 'unsafe-eval' data:",
    "worker-src 'self' blob: data:",
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: https:",
    "font-src 'self' data:",
    // Sample hosts loaded at runtime: GM soundfonts from felixroos.github.io,
    // and Tidal drum-machine banks (bank("RolandTR909") etc.) from
    // raw.githubusercontent.com. Synth waveforms need no network.
    "connect-src 'self' https://felixroos.github.io https://raw.githubusercontent.com",
    "frame-ancestors 'self'",
    "base-uri 'self'",
    "form-action 'self'",
  ].join('; '),
};

// The standalone MelodyLab document and its bundled assets get the relaxed CSP;
// everything else gets the strict default.
const headersFor = (filePath) =>
  path.basename(filePath) === 'melody-frame.html' ? MELODY_HEADERS : SECURITY_HEADERS;

const server = http.createServer((req, res) => {
  let filePath = path.join(DIST_DIR, req.url === '/' ? 'index.html' : req.url);

  const extname = path.extname(filePath);
  const contentType = MIME_TYPES[extname] || 'application/octet-stream';

  fs.readFile(filePath, (error, content) => {
    if (error) {
      if (error.code === 'ENOENT') {
        // Try index.html for SPA routing
        filePath = path.join(DIST_DIR, 'index.html');
        fs.readFile(filePath, (err, indexContent) => {
          if (err) {
            res.writeHead(404, { 'Content-Type': 'text/html', ...SECURITY_HEADERS });
            res.end('<h1>404 Not Found</h1>', 'utf-8');
          } else {
            res.writeHead(200, { 'Content-Type': 'text/html', 'Cache-Control': 'no-store', ...SECURITY_HEADERS });
            res.end(indexContent, 'utf-8');
          }
        });
      } else {
        res.writeHead(500, SECURITY_HEADERS);
        res.end('Server Error: ' + error.code, 'utf-8');
      }
    } else {
      const headers = { 'Content-Type': contentType, ...headersFor(filePath) };
      if (contentType === 'text/html') headers['Cache-Control'] = 'no-store';
      res.writeHead(200, headers);
      res.end(content, 'utf-8');
    }
  });
});

server.listen(PORT, HOST, () => {
  console.log(`HTTP server running at http://${HOST}:${PORT}`);
});
