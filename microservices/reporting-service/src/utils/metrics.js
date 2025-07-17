const promClient = require('prom-client');

// Registre global pour éviter les doublons
const register = promClient.register;

// Clear all metrics to avoid conflicts
register.clear();

// Fonction pour obtenir ou créer une métrique Counter
function getOrCreateCounter(name, help, labelNames) {
  const existingMetric = register.getSingleMetric(name);
  if (existingMetric) {
    return existingMetric;
  }
  
  return new promClient.Counter({
    name,
    help,
    labelNames,
    registers: [register]
  });
}

// Fonction pour obtenir ou créer une métrique Histogram
function getOrCreateHistogram(name, help, labelNames, buckets) {
  const existingMetric = register.getSingleMetric(name);
  if (existingMetric) {
    return existingMetric;
  }
  
  return new promClient.Histogram({
    name,
    help,
    labelNames,
    buckets,
    registers: [register]
  });
}

// Métriques partagées
const httpRequestsTotal = getOrCreateCounter(
  'http_requests_total',
  'Total number of HTTP requests',
  ['method', 'endpoint', 'status_code', 'service']
);

const httpRequestDuration = getOrCreateHistogram(
  'http_request_duration_seconds',
  'Duration of HTTP requests in seconds',
  ['method', 'endpoint', 'status_code', 'service'],
  [0.1, 0.3, 0.5, 0.7, 1, 3, 5, 7, 10]
);

const dbOperationsTotal = getOrCreateCounter(
  'db_operations_total',
  'Total number of database operations',
  ['operation', 'table', 'service']
);

module.exports = {
  register,
  httpRequestsTotal,
  httpRequestDuration,
  dbOperationsTotal
};
