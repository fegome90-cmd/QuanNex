/* eslint-env node */
import http from 'node:http';
import client from 'prom-client';

const register = new client.Registry();
client.collectDefaultMetrics({ register, prefix: process.env.METRICS_PREFIX || 'taskdb_' });

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

// Hooks opcionales: si tu cola expone eventos, regístralos aquí.
// Ejemplo (ajusta a tu implementación real):
// import { taskdbQueue } from '../core/taskdb/queueInstance.js'; // si tienes un singleton
// if (taskdbQueue?.on) {
//   taskdbQueue.on('flush:start', (depth) => queueDepth.set(depth));
//   taskdbQueue.on('flush:done', (ms, batch) => {
//     flushLatency.observe(ms / 1000);
//     queueDepth.set(taskdbQueue.depth());
//   });
// }

// "Scrape" HTTP
const port = Number(process.env.METRICS_PORT || 9464);
const server = http.createServer(async (req, res) => {
  if (req.url === '/metrics') {
    res.setHeader('Content-Type', register.contentType);
    res.end(await register.metrics());
    return;
  }
  res.statusCode = 404; res.end('Not Found');
});
server.listen(port, () => {
  console.log(`▶ Metrics at http://localhost:${port}/metrics`);
});

// (Opcional) Incrementa contador desde tu logger central:
// en core/taskdb/logger.ts, cuando llames queue.insert(evt), también:
// eventsTotal.inc({ kind: evt.kind, status: evt.status || 'ok' });
