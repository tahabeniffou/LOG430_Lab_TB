import http from 'k6/http';
import { sleep, check } from 'k6';

// Test de charge AGRESSIF pour saturer l'API unique
export let options = {
  stages: [
    { duration: '30s', target: 50 },   // Montée rapide
    { duration: '1m', target: 200 },   // Charge modérée
    { duration: '2m', target: 500 },   // Charge élevée
    { duration: '2m', target: 1000 },  // Saturation
    { duration: '1m', target: 1500 },  // Surcharge extrême
    { duration: '30s', target: 0 },    // Redescente
  ],
  thresholds: {
    http_req_duration: ['p(95)<500'], // 95% des requêtes en moins de 500ms
    http_req_failed: ['rate<0.1'],    // Moins de 10% d'erreurs
  },
};

export default function () {
  // Test de différentes routes avec charge intensive
  
  // 1. Health check (route de base)
  let response1 = http.get('http://localhost:3001/health');
  check(response1, {
    'health status is 200': (r) => r.status === 200,
    'health response time < 200ms': (r) => r.timings.duration < 200,
  });

  // 2. Route CPU stress pour saturer le serveur
  let cpuResponse = http.get('http://localhost:3001/api/v1/cpu-stress');
  check(cpuResponse, {
    'cpu stress completed': (r) => r.status === 200 || r.status === 500,
  });

  // 3. Route memory stress pour consommer la mémoire
  let memResponse = http.get('http://localhost:3001/api/v1/memory-stress');
  check(memResponse, {
    'memory stress completed': (r) => r.status === 200 || r.status === 500,
  });

  // 4. Route always-error pour forcer des erreurs 500
  let errorResponse = http.get('http://localhost:3001/api/v1/always-error');
  check(errorResponse, {
    'error response received': (r) => r.status === 500,
  });

  // 5. Route mémoire stress
  if (Math.random() < 0.3) { // 30% du temps
    let memResponse = http.get('http://localhost:3001/api/v1/memory-stress');
    check(memResponse, {
      'memory stress completed': (r) => r.status === 200 || r.status === 500,
    });
  }

  // 6. Health check (pour monitoring)
  http.get('http://localhost:3001/health');

  // 7. Route d'erreur garantie pour tester la détection
  if (Math.random() < 0.2) { // 20% du temps
    http.get('http://localhost:3001/api/v1/always-error');
  }

  // Pas de sleep pour maximiser la charge
  // sleep(0.1); // Commenté pour charge maximale
}

export function handleSummary(data) {
  console.log('=== RÉSUMÉ DU TEST DE CHARGE AGRESSIF ===');
  console.log(`Requêtes totales: ${data.metrics.http_reqs.values.count}`);
  console.log(`Requêtes échouées: ${data.metrics.http_req_failed.values.rate * 100}%`);
  console.log(`Durée moyenne: ${data.metrics.http_req_duration.values.avg}ms`);
  console.log(`Durée P95: ${data.metrics.http_req_duration.values['p(95)']}ms`);
  console.log(`RPS moyen: ${data.metrics.http_reqs.values.rate}`);
}
