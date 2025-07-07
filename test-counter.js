const client = require('prom-client');

// Test simple du Counter
const httpRequestsTotal = new client.Counter({
  name: 'http_requests_total',
  help: 'Nombre total de requêtes HTTP',
  labelNames: ['method', 'route', 'code']
});

console.log('Counter créé');

// Test d'incrémentation
httpRequestsTotal.inc({
  method: 'GET',
  route: '/test',
  code: 200
});

console.log('Counter incrémenté');

// Voir les métriques
client.register.metrics().then(metrics => {
  console.log('=== MÉTRIQUES ===');
  console.log(metrics);
});
