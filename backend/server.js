// backend/server.js
// Purpose: Initialize Express app, mount routes, and handle graceful shutdown.
// Usage: node backend/server.js

import express from 'express';
import dotenv from 'dotenv';
import videosRouter from './routes/videos.js';

dotenv.config();

const app = express();
app.use(express.json({ limit: '10mb' }));

// basic request logger
app.use((req, _res, next) => {
  const start = Date.now();
  console.log(`[REQ] ${req.method} ${req.url}`);
  const end = _res.end;
  _res.end = function (...args) {
    const ms = Date.now() - start;
    console.log(`[RES] ${req.method} ${req.url} -> ${_res.statusCode} (${ms}ms)`);
    return end.apply(this, args);
  };
  next();
});

app.get('/health', (_req, res) => res.json({ ok: true }));
app.use('/api/videos', videosRouter);

// Centralized error handler (fallback)
app.use((err, _req, res, _next) => {
  console.error('Unhandled error:', err?.message);
  res.status(500).json({ error: 'Internal server error' });
});

const PORT = Number(process.env.PORT || 3000);
let server;

export function start() {
  if (!server) {
    server = app.listen(PORT, () => {
      console.log(`Server listening on http://localhost:${PORT}`);
      if (process.env.AUTO_SCAN_ON_START === 'true') {
        try {
          const url = `http://localhost:${PORT}/api/videos/upload`;
          setTimeout(async () => {
            try {
              console.log('[bootstrap] Auto-scan trigger start');
              const res = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({}) });
              const text = await res.text();
              console.log('[bootstrap] Auto-scan response', res.status, text);
            } catch (e) {
              console.warn('[bootstrap] Auto-scan failed:', e?.message);
            }
          }, 250);
        } catch {}
      }
    });
  }
  return server;
}

export function stop() {
  return new Promise((resolve) => {
    if (!server) return resolve();
    server.close(() => resolve());
  });
}

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('Shutting down...');
  await stop();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('Shutting down...');
  await stop();
  process.exit(0);
});

export default app;

// Auto-start when executed directly (not imported)
if (import.meta.url === `file://${process.argv[1]}`) {
  start();
}
