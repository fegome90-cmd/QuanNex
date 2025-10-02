#!/usr/bin/env node
/**
 * Test Server Simple para métricas
 */

const PORT = process.env.PORT || 3000;

// Métricas simples en formato Prometheus
const metrics = `
# HELP qn_http_requests_total Total number of HTTP requests
# TYPE qn_http_requests_total counter
qn_http_requests_total{route="/agent",method="GET",code="200"} 42

# HELP qn_http_request_duration_seconds HTTP request duration in seconds
# TYPE qn_http_request_duration_seconds histogram
qn_http_request_duration_seconds_bucket{route="/agent",method="GET",code="200",le="0.1"} 10
qn_http_request_duration_seconds_bucket{route="/agent",method="GET",code="200",le="0.25"} 20
qn_http_request_duration_seconds_bucket{route="/agent",method="GET",code="200",le="0.5"} 35
qn_http_request_duration_seconds_bucket{route="/agent",method="GET",code="200",le="1"} 42
qn_http_request_duration_seconds_bucket{route="/agent",method="GET",code="200",le="+Inf"} 42
qn_http_request_duration_seconds_sum{route="/agent",method="GET",code="200"} 12.5
qn_http_request_duration_seconds_count{route="/agent",method="GET",code="200"} 42

# HELP qn_test_coverage_percent Test coverage percentage
# TYPE qn_test_coverage_percent gauge
qn_test_coverage_percent 78

# HELP qn_error_rate_percent Error rate percentage
# TYPE qn_error_rate_percent gauge
qn_error_rate_percent 0.8

# HELP qn_uptime_percent Uptime percentage
# TYPE qn_uptime_percent gauge
qn_uptime_percent 99.2
`;

// Servidor HTTP simple
const http = require('http');

const server = http.createServer((req, res) => {
  if (req.url === '/metrics') {
    res.writeHead(200, { 'Content-Type': 'text/plain' });
    res.end(metrics);
  } else if (req.url === '/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(
      JSON.stringify({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
      })
    );
  } else if (req.url === '/agent/ping') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(
      JSON.stringify({
        pong: true,
        responseTime: '245ms',
        timestamp: new Date().toISOString(),
      })
    );
  } else {
    res.writeHead(404);
    res.end('Not found');
  }
});

server.listen(PORT, () => {
  console.log(`🚀 Test server running on port ${PORT}`);
  console.log(`📊 Metrics available at http://localhost:${PORT}/metrics`);
  console.log(`❤️  Health check at http://localhost:${PORT}/health`);
});

export default server;
