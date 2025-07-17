const promClient = require('prom-client');

// Créer un registre partagé pour les métriques
const register = promClient.register;

// Fonction pour obtenir ou créer une métrique
function getOrCreateCounter(name, help, labelNames = []) {
  try {
    const existingMetric = register.getSingleMetric(name);
    if (existingMetric) {
      return existingMetric;
    }
  } catch (error) {
    // La métrique n'existe pas, on la crée
  }
  
  return new promClient.Counter({
    name,
    help,
    labelNames,
    registers: [register]
  });
}

function getOrCreateHistogram(name, help, labelNames = [], buckets) {
  try {
    const existingMetric = register.getSingleMetric(name);
    if (existingMetric) {
      return existingMetric;
    }
  } catch (error) {
    // La métrique n'existe pas, on la crée
  }
  
  return new promClient.Histogram({
    name,
    help,
    labelNames,
    buckets,
    registers: [register]
  });
}

// Métriques partagées pour le service produit
const dbOperationsTotal = getOrCreateCounter(
  'db_operations_total',
  'Total number of database operations',
  ['operation', 'table', 'service']
);

const httpRequestsTotal = getOrCreateCounter(
  'http_requests_total',
  'Total number of HTTP requests',
  ['method', 'endpoint', 'status_code', 'service']
);

const httpRequestDuration = getOrCreateHistogram(
  'http_request_duration_seconds',
  'Duration of HTTP requests in seconds',
  ['method', 'endpoint', 'status_code', 'service'],
  [0.001, 0.005, 0.015, 0.05, 0.1, 0.2, 0.3, 0.4, 0.5, 1, 2, 5]
);

module.exports = {
  promClient,
  register,
  dbOperationsTotal,
  httpRequestsTotal,
  httpRequestDuration
};
