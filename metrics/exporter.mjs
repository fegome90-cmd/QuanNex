/* eslint-env node */
/* global console, process */
import http from 'node:http';
import client from 'prom-client';
import { getCurrentTaskDB } from '../core/taskdb/state.ts';

const METRIC_PREFIX = process.env.METRICS_PREFIX || 'taskdb_';

const register = new client.Registry();
client.collectDefaultMetrics({ register, prefix: METRIC_PREFIX });

// Métricas principales
const eventsTotal = new client.Counter({
  name: 'taskdb_events_total',
  help: 'Eventos insertados (sumados por proceso)',
  labelNames: ['kind', 'status'],
});
const flushLatency = new client.Histogram({
  name: 'taskdb_flush_latency_seconds',
  help: 'Latencia del flush de la cola (si aplica)',
  buckets: [0.01, 0.05, 0.1, 0.25, 0.5, 1, 2, 5],
});
const queueDepth = new client.Gauge({
  name: 'taskdb_queue_depth',
  help: 'Eventos en cola pendientes de flush',
});
register.registerMetric(eventsTotal);
register.registerMetric(flushLatency);
register.registerMetric(queueDepth);

let instrumented = false;
const maybeInstrumentQueue = () => {
  if (instrumented) return;
  const db = getCurrentTaskDB();
  if (!db || typeof db.on !== 'function') return;

  instrumented = true;
  queueDepth.set(typeof db.depth === 'function' ? db.depth() : 0);

  db.on('enqueue', depth => queueDepth.set(depth));
  db.on('flush:start', depth => queueDepth.set(depth));
  db.on('flush:batch', (durationMs, batch, remaining) => {
    flushLatency.observe(durationMs / 1000);
    queueDepth.set(remaining);
    for (const evt of batch) {
      eventsTotal.inc({ kind: evt.kind, status: evt.status ?? 'ok' });
    }
  });
  db.on('flush:idle', depth => queueDepth.set(depth));
};

maybeInstrumentQueue();
setInterval(maybeInstrumentQueue, 1000).unref();

// "Scrape" HTTP
const explicitPort = process.env.PORT_METRICS || process.env.METRICS_PORT;
let port = Number(explicitPort || 9464);
let retriedPort = false;

const server = http.createServer(async (req, res) => {
  if (req.url === '/metrics') {
    res.setHeader('Content-Type', register.contentType);
    res.end(await register.metrics());
    return;
  }
  res.statusCode = 404; res.end('Not Found');
});
server.on('error', err => {
  if (err.code === 'EADDRINUSE' && !explicitPort && !retriedPort) {
    console.warn(`⚠️ Puerto ${port} en uso, reintentando en ${port + 1}`);
    retriedPort = true;
    port += 1;
    server.listen(port);
  } else {
    console.error('❌ No se pudo iniciar el exporter de métricas:', err.message);
    process.exit(1);
  }
});

server.listen(port, () => {
  console.log(`▶ Metrics at http://localhost:${port}/metrics`);
});

// (Opcional) Incrementa contador desde tu logger central:
// en core/taskdb/logger.ts, cuando llames queue.insert(evt), también:
// eventsTotal.inc({ kind: evt.kind, status: evt.status || 'ok' });
