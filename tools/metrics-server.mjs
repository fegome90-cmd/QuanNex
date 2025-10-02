#!/usr/bin/env node

import http from 'http';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class MetricsServer {
  constructor(port = 3000) {
    this.port = port;
    this.metricsFile = 'reports/continuous-monitor.json';
    this.lastMetrics = null;
  }

  readMetrics() {
    try {
      if (fs.existsSync(this.metricsFile)) {
        const data = fs.readFileSync(this.metricsFile, 'utf8');
        return JSON.parse(data);
      }
    } catch (error) {
      console.error('Error reading metrics:', error);
    }
    return null;
  }

  serveStaticFile(res, filePath, contentType) {
    try {
      const fullPath = path.join(__dirname, filePath);
      if (fs.existsSync(fullPath)) {
        const content = fs.readFileSync(fullPath);
        res.writeHead(200, { 'Content-Type': contentType });
        res.end(content);
      } else {
        res.writeHead(404);
        res.end('Not Found');
      }
    } catch (error) {
      res.writeHead(500);
      res.end('Server Error');
    }
  }

  handleRequest(req, res) {
    // CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
      res.writeHead(200);
      res.end();
      return;
    }

    const url = new URL(req.url, `http://${req.headers.host}`);

    if (url.pathname === '/api/metrics') {
      const metrics = this.readMetrics();
      if (metrics) {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(metrics));
      } else {
        res.writeHead(404, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'No metrics available' }));
      }
    } else if (url.pathname === '/' || url.pathname === '/dashboard') {
      this.serveStaticFile(res, 'dashboard.html', 'text/html');
    } else if (url.pathname === '/health') {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ 
        status: 'ok', 
        timestamp: new Date().toISOString(),
        metrics: !!this.readMetrics()
      }));
    } else {
      res.writeHead(404);
      res.end('Not Found');
    }
  }

  start() {
    const server = http.createServer((req, res) => {
      this.handleRequest(req, res);
    });

    server.listen(this.port, () => {
      console.log(`🚀 Servidor de métricas iniciado en puerto ${this.port}`);
      console.log(`📊 Dashboard: http://localhost:${this.port}/dashboard`);
      console.log(`🔍 API: http://localhost:${this.port}/api/metrics`);
      console.log(`❤️  Health: http://localhost:${this.port}/health`);
      console.log('');
      console.log('💡 Asegúrate de que el monitor continuo esté ejecutándose para ver datos');
    });

    return server;
  }
}

// CLI
function main() {
  const args = process.argv.slice(2);
  let port = 3000;

  for (let i = 0; i < args.length; i++) {
    switch (args[i]) {
      case '--port':
        port = parseInt(args[++i]);
        break;
      case '--help':
        console.log(`
📊 METRICS SERVER - Dashboard MCP

Uso: node tools/metrics-server.mjs [opciones]

Opciones:
  --port <puerto>      Puerto del servidor (default: 3000)
  --help               Mostrar esta ayuda

Ejemplos:
  node tools/metrics-server.mjs
  node tools/metrics-server.mjs --port 8080
        `);
        process.exit(0);
    }
  }

  const server = new MetricsServer(port);
  server.start();
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}

export { MetricsServer };
