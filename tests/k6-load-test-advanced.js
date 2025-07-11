import http from 'k6/http';
import { check, sleep } from 'k6';

export let options = {
  stages: [
    { duration: '10s', target: 100 }, // Montée progressive
    { duration: '30s', target: 400 }, // Plateau à 400 VUs
    { duration: '20s', target: 0 },   // Redescente
  ],
};

export default function () {
  // Test différentes routes
  const routes = [
    'http://localhost:3000/api/v2/ventes',
    'http://localhost:3000/api/v2/produits', 
    'http://localhost:3000/api/v2/stock',
    'http://localhost:3000/api/v2/reports',
    'http://localhost:3000/health'
  ];

  const route = routes[Math.floor(Math.random() * routes.length)];
  
  let response = http.get(route);
  
  check(response, {
    'status is 200': (r) => r.status === 200,
    'response time < 500ms': (r) => r.timings.duration < 500,
  });

  sleep(1);
}

export function handleSummary(data) {
  return {
    'load-test-results.json': JSON.stringify(data, null, 2),
    stdout: `
📊 RÉSULTATS DU TEST DE CHARGE K6 (400 VUs)
============================================

🎯 Requêtes totales: ${data.metrics.http_reqs.values.count}
⚡ RPS moyen: ${Math.round(data.metrics.http_reqs.values.rate)}
📈 RPS maximum: ${Math.round(data.metrics.http_reqs.values.max)}

⏱️  LATENCE:
   - Moyenne: ${Math.round(data.metrics.http_req_duration.values.avg)}ms
   - 95e percentile: ${Math.round(data.metrics.http_req_duration.values['p(95)'])}ms
   - Maximum: ${Math.round(data.metrics.http_req_duration.values.max)}ms

✅ TAUX DE SUCCÈS:
   - Requêtes réussies: ${Math.round((data.metrics.http_reqs.values.count - (data.metrics.http_req_failed?.values.count || 0)) / data.metrics.http_reqs.values.count * 100)}%
   - Échecs: ${data.metrics.http_req_failed?.values.count || 0}

🔄 UTILISATION:
   - VUs utilisés: ${data.metrics.vus.values.max}
   - Durée totale: ${Math.round(data.metrics.iteration_duration.values.avg)}ms par itération

============================================
    `
  };
}
