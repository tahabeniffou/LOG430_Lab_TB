import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate, Trend, Counter } from 'k6/metrics';

// Métriques personnalisées
let directResponseTime = new Trend('direct_response_time');
let gatewayResponseTime = new Trend('gateway_response_time');
let directErrorRate = new Rate('direct_error_rate');
let gatewayErrorRate = new Rate('gateway_error_rate');
let directRequestCount = new Counter('direct_requests');
let gatewayRequestCount = new Counter('gateway_requests');

// Configuration du test
export let options = {
  stages: [
    { duration: '30s', target: 10 },   // Ramp-up
    { duration: '2m', target: 50 },    // Stay at 50 users
    { duration: '1m', target: 100 },   // Peak
    { duration: '2m', target: 100 },   // Stay at peak
    { duration: '30s', target: 0 },    // Ramp-down
  ],
  thresholds: {
    'http_req_duration': ['p(95)<2000'], // 95% des requêtes sous 2s
    'http_req_failed': ['rate<0.1'],     // Moins de 10% d'erreurs
    'direct_response_time': ['p(95)<1500'],
    'gateway_response_time': ['p(95)<2500'], // Gateway peut être un peu plus lent
    'direct_error_rate': ['rate<0.05'],
    'gateway_error_rate': ['rate<0.1'],
  },
};

// URLs de test
const DIRECT_BASE_URL = 'http://localhost:9000';
const GATEWAY_BASE_URL = 'http://localhost:8001';

// Scénarios de test
const scenarios = [
  {
    name: 'POS_Legacy_Products',
    path: '/pos/produits',
    headers: { 'X-Client-Type': 'pos' },
    description: 'Console POS - Produits (Legacy)'
  },
  {
    name: 'POS_Stock_Microservice',
    path: '/pos/stock/123',
    headers: { 'X-Client-Type': 'pos' },
    description: 'Console POS - Stock (Microservice)'
  },
  {
    name: 'API_Products_Microservice',
    path: '/api/v2/produits',
    headers: { 'X-Client-Type': 'api', 'X-API-Key': 'test-key' },
    description: 'API Moderne - Produits (Microservice)'
  },
  {
    name: 'MaisonMere_Reports',
    path: '/maisonmere/reports/analytics',
    headers: { 'X-Client-Type': 'maisonmere' },
    description: 'Maison Mère - Rapports (Microservice)'
  },
  {
    name: 'Web_Catalog',
    path: '/web/catalog',
    headers: { 'X-Client-Type': 'web' },
    description: 'Web - Catalogue (Microservice)'
  }
];

export default function() {
  // Choisir un scénario au hasard
  const scenario = scenarios[Math.floor(Math.random() * scenarios.length)];
  
  // Test appel direct
  testDirect(scenario);
  
  // Petite pause
  sleep(0.5);
  
  // Test via Gateway
  testGateway(scenario);
  
  // Pause entre les itérations
  sleep(1);
}

function testDirect(scenario) {
  const startTime = new Date().getTime();
  
  let response = http.get(`${DIRECT_BASE_URL}${scenario.path}`, {
    headers: scenario.headers,
    timeout: '30s',
    tags: { 
      name: `direct_${scenario.name}`,
      architecture: 'direct'
    }
  });
  
  const endTime = new Date().getTime();
  const duration = endTime - startTime;
  
  // Enregistrer les métriques
  directResponseTime.add(duration);
  directRequestCount.add(1);
  
  // Vérifications
  const success = check(response, {
    [`Direct ${scenario.description} - Status 200`]: (r) => r.status === 200,
    [`Direct ${scenario.description} - Response time < 2000ms`]: () => duration < 2000,
    [`Direct ${scenario.description} - Has body`]: (r) => r.body.length > 0,
  });
  
  if (!success) {
    directErrorRate.add(1);
    console.error(`❌ Direct ${scenario.name} failed: ${response.status} - ${response.body}`);
  } else {
    directErrorRate.add(0);
  }
  
  // Logging détaillé pour analyse
  if (__ITER % 10 === 0) { // Log every 10th iteration
    console.log(`📊 Direct ${scenario.name}: ${duration}ms, Status: ${response.status}`);
  }
}

function testGateway(scenario) {
  const startTime = new Date().getTime();
  
  let response = http.get(`${GATEWAY_BASE_URL}${scenario.path}`, {
    headers: scenario.headers,
    timeout: '30s',
    tags: { 
      name: `gateway_${scenario.name}`,
      architecture: 'gateway'
    }
  });
  
  const endTime = new Date().getTime();
  const duration = endTime - startTime;
  
  // Enregistrer les métriques
  gatewayResponseTime.add(duration);
  gatewayRequestCount.add(1);
  
  // Vérifications
  const success = check(response, {
    [`Gateway ${scenario.description} - Status 200`]: (r) => r.status === 200,
    [`Gateway ${scenario.description} - Response time < 3000ms`]: () => duration < 3000,
    [`Gateway ${scenario.description} - Has body`]: (r) => r.body.length > 0,
    [`Gateway ${scenario.description} - Kong headers`]: (r) => 
      r.headers['X-Gateway'] !== undefined || r.headers['x-gateway'] !== undefined,
  });
  
  if (!success) {
    gatewayErrorRate.add(1);
    console.error(`❌ Gateway ${scenario.name} failed: ${response.status} - ${response.body}`);
  } else {
    gatewayErrorRate.add(0);
  }
  
  // Logging détaillé pour analyse
  if (__ITER % 10 === 0) { // Log every 10th iteration
    console.log(`🚪 Gateway ${scenario.name}: ${duration}ms, Status: ${response.status}`);
  }
}

// Fonction de fin de test pour afficher le résumé
export function handleSummary(data) {
  const directAvgTime = data.metrics.direct_response_time.values.avg;
  const gatewayAvgTime = data.metrics.gateway_response_time.values.avg;
  const directErrorRate = data.metrics.direct_error_rate.values.rate * 100;
  const gatewayErrorRate = data.metrics.gateway_error_rate.values.rate * 100;
  
  console.log(`
  
🔍 RÉSUMÉ COMPARATIF - ARCHITECTURE HYBRIDE
============================================

📊 TEMPS DE RÉPONSE MOYEN:
  • Direct (Router):  ${directAvgTime.toFixed(2)}ms
  • Gateway (Kong):   ${gatewayAvgTime.toFixed(2)}ms
  • Overhead Gateway: +${(gatewayAvgTime - directAvgTime).toFixed(2)}ms (+${(((gatewayAvgTime - directAvgTime) / directAvgTime) * 100).toFixed(1)}%)

❌ TAUX D'ERREUR:
  • Direct:  ${directErrorRate.toFixed(2)}%
  • Gateway: ${gatewayErrorRate.toFixed(2)}%

📈 PERFORMANCE P95:
  • Direct:  ${data.metrics.direct_response_time.values['p(95)'].toFixed(2)}ms
  • Gateway: ${data.metrics.gateway_response_time.values['p(95)'].toFixed(2)}ms

🔄 TOTAL REQUÊTES:
  • Direct:  ${data.metrics.direct_requests.values.count}
  • Gateway: ${data.metrics.gateway_requests.values.count}

✅ CONCLUSION:
  ${gatewayAvgTime < directAvgTime * 1.5 ? 
    '✅ Performance Gateway acceptable (< 50% overhead)' : 
    '⚠️  Overhead Gateway significatif (> 50%)'}
  
  `);

  return {
    'stdout': JSON.stringify(data, null, 2),
    'comparison_report.json': JSON.stringify({
      timestamp: new Date().toISOString(),
      architecture: 'hybrid',
      comparison: {
        direct: {
          avg_response_time: directAvgTime,
          p95_response_time: data.metrics.direct_response_time.values['p(95)'],
          error_rate: directErrorRate,
          total_requests: data.metrics.direct_requests.values.count
        },
        gateway: {
          avg_response_time: gatewayAvgTime,
          p95_response_time: data.metrics.gateway_response_time.values['p(95)'],
          error_rate: gatewayErrorRate,
          total_requests: data.metrics.gateway_requests.values.count
        },
        overhead: {
          time_ms: gatewayAvgTime - directAvgTime,
          percentage: ((gatewayAvgTime - directAvgTime) / directAvgTime) * 100
        }
      }
    }, null, 2)
  };
}
