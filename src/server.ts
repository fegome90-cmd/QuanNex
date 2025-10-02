import express, { Request, Response, NextFunction } from 'express';

import { register, httpRequests, httpLatency } from './metrics/metrics.js';

const app = express();
const PORT = process.env.PORT || 3000;

// Endpoint de métricas
app.get('/metrics', async (_req: Request, res: Response) => {
  res.set('Content-Type', register.contentType);
  res.end(await register.metrics());
});

// Endpoint de salud
app.get('/health', (_req: Request, res: Response) => {
  res.json({ status: 'healthy', timestamp: new Date().toISOString() });
});

// Wrapper para medir rutas
function wrap(
  route: string,
  method: 'get' | 'post',
  handler: (req: Request, res: Response, next?: NextFunction) => void
) {
  if (method === 'get') {
    app.get(route, async (req: Request, res: Response, next: NextFunction) => {
      const end = httpLatency.startTimer({ route, method: 'GET' });
      res.on('finish', () => {
        end({ code: String(res.statusCode) });
        httpRequests.inc({
          route,
          method: 'GET',
          code: String(res.statusCode),
        });
      });
      handler(req, res, next);
    });
  } else if (method === 'post') {
    app.post(route, async (req: Request, res: Response, next: NextFunction) => {
      const end = httpLatency.startTimer({ route, method: 'POST' });
      res.on('finish', () => {
        end({ code: String(res.statusCode) });
        httpRequests.inc({
          route,
          method: 'POST',
          code: String(res.statusCode),
        });
      });
      handler(req, res, next);
    });
  }
}

// Rutas de ejemplo
wrap('/', 'get', (_req: Request, res: Response) => {
  res.json({ message: 'QuanNex Lab Server' });
});

wrap('/api/workflow', 'post', (_req: Request, res: Response) => {
  res.json({ message: 'Workflow endpoint' });
});

// Iniciar servidor
app.listen(PORT, () => {
  console.warn(`🚀 QuanNex Lab Server running on port ${PORT}`);
  console.warn(`📊 Metrics available at http://localhost:${PORT}/metrics`);
  console.warn(`❤️  Health check at http://localhost:${PORT}/health`);
});

export default app;
