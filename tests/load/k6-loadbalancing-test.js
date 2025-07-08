import http from 'k6/http';
import { check, group, sleep } from 'k6';
import { Rate } from 'k6/metrics';

// Métriques personnalisées
const errorRate = new Rate('errors');

// Configuration du test
export const options = {
  stages: [
    { duration: '30s', target: 10 },  // Montée à 10 utilisateurs en 30s
    { duration: '1m', target: 20 },   // Montée à 20 utilisateurs en 1 min
    { duration: '2m', target: 20 },   // Maintien à 20 utilisateurs pendant 2 min
    { duration: '30s', target: 0 },   // Descente à 0 en 30s
  ],
  thresholds: {
    http_req_duration: ['p(95)<500'], // 95% des requêtes doivent être < 500ms
    errors: ['rate<0.1'],              // Taux d'erreur < 10%
  },
};

// Configuration
const BASE_URL = 'http://localhost:8000';

// Fonction pour extraire l'instance ID des headers
function getInstanceId(response) {
  const instanceHeader = response.headers['X-Instance-Id'] || response.headers['x-instance-id'];
  return instanceHeader || 'unknown';
}

export default function () {
  group('Load Balancing Tests', function () {
    
    // Test 1: Health Check avec Load Balancing
    group('Health Check Load Balanced', function () {
      const response = http.get(`${BASE_URL}/health-lb`);
      
      const result = check(response, {
        'status is 200': (r) => r.status === 200,
        'response time < 500ms': (r) => r.timings.duration < 500,
        'has load balanced header': (r) => r.headers['X-Load-Balanced'] === 'true',
        'has instance ID': (r) => r.headers['X-Instance-Id'] !== undefined,
      });
      
      errorRate.add(!result);
      
      // Afficher l'instance qui a répondu
      const instanceId = getInstanceId(response);
      console.log(`Health check handled by: ${instanceId}`);
    });

    // Test 2: API Produits avec Load Balancing
    group('API Produits Load Balanced', function () {
      const response = http.get(`${BASE_URL}/api/produits-lb`);
      
      const result = check(response, {
        'status is 200': (r) => r.status === 200,
        'response time < 1000ms': (r) => r.timings.duration < 1000,
        'has instance ID': (r) => r.headers['X-Instance-Id'] !== undefined,
        'response is JSON': (r) => {
          try {
            JSON.parse(r.body);
            return true;
          } catch (e) {
            return false;
          }
        },
      });
      
      errorRate.add(!result);
      
      const instanceId = getInstanceId(response);
      console.log(`API request handled by: ${instanceId}`);
    });

    // Test 3: Comparaison avec accès direct
    group('Direct Instance Access', function () {
      const ports = [3001, 3005, 3006];
      const randomPort = ports[Math.floor(Math.random() * ports.length)];
      
      const response = http.get(`http://localhost:${randomPort}/health`);
      
      check(response, {
        'direct access status is 200': (r) => r.status === 200,
        'direct access time < 300ms': (r) => r.timings.duration < 300,
      });
      
      const instanceId = getInstanceId(response);
      console.log(`Direct access to port ${randomPort}: ${instanceId}`);
    });

  });

  // Pause entre les itérations
  sleep(1);
}

// Fonction de setup (avant le test)
export function setup() {
  console.log('🚀 Démarrage du test de charge Load Balancing');
  console.log('📊 Configuration: 3 stages, max 20 utilisateurs virtuels');
  console.log('🎯 Cibles: /health-lb et /api/produits-lb');
  
  // Vérifier que les services sont accessibles
  const healthCheck = http.get(`${BASE_URL}/health-lb`);
  if (healthCheck.status !== 200) {
    throw new Error('Services non accessibles avant le test');
  }
  
  return { startTime: new Date() };
}

// Fonction de teardown (après le test)
export function teardown(data) {
  const endTime = new Date();
  const duration = (endTime - data.startTime) / 1000;
  console.log(`✅ Test terminé en ${duration}s`);
}
