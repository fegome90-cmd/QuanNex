import client from 'prom-client';

export const register = new client.Registry();
client.collectDefaultMetrics({ register });

export const httpRequests = new client.Counter({
  name: 'qn_http_requests_total',
  help: 'Total de requests HTTP',
  labelNames: ['route', 'method', 'code'],
});

export const httpLatency = new client.Histogram({
  name: 'qn_http_request_duration_seconds',
  help: 'Latencia de requests',
  buckets: [0.05, 0.1, 0.2, 0.5, 1, 2, 5],
  labelNames: ['route', 'method', 'code'],
});

export const agentErrors = new client.Counter({
  name: 'qn_agent_errors_total',
  help: 'Errores por agente',
  labelNames: ['agent', 'type'],
});

export const agentExecutions = new client.Counter({
  name: 'qn_agent_executions_total',
  help: 'Ejecuciones de agentes',
  labelNames: ['agent', 'status'],
});

export const workflowDuration = new client.Histogram({
  name: 'qn_workflow_duration_seconds',
  help: 'Duración de workflows',
  buckets: [0.1, 0.5, 1, 2, 5, 10, 30],
  labelNames: ['workflow_id', 'status'],
});

register.registerMetric(httpRequests);
register.registerMetric(httpLatency);
register.registerMetric(agentErrors);
register.registerMetric(agentExecutions);
register.registerMetric(workflowDuration);
