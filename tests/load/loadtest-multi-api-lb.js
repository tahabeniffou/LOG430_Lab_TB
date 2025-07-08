import http from 'k6/http';
import { sleep, check } from 'k6';
import { Counter, Rate, Trend } from 'k6/metrics';

// Métriques personnalisées
let errorRate = new Rate('error_rate');
let stockRequests = new Counter('stock_requests');
let reportRequests = new Counter('report_requests');
let updateRequests = new Counter('update_requests');

export let options = {
  stages: [
    { duration: '30s', target: 50 },    // Montée rapide à 50 utilisateurs
    { duration: '1m', target: 100 },    // Montée à 100 utilisateurs
    { duration: '2m', target: 200 },    // Montée à 200 utilisateurs
    { duration: '3m', target: 300 },    // Pic à 300 utilisateurs
    { duration: '2m', target: 400 },    // Pic maximum à 400 utilisateurs
    { duration: '1m', target: 200 },    // Redescente progressive
    { duration: '1m', target: 50 },     // Retour à charge normale
    { duration: '30s', target: 0 },     // Arrêt progressif
  ],
  thresholds: {
    http_req_duration: ['p(95)<500'], // 95% des requêtes sous 500ms
    http_req_failed: ['rate<0.01'],   // Moins de 1% d'erreurs (plus strict)
  },
};

export default function () {
  // Simulation de différents patterns d'utilisation
  const userId = Math.floor(Math.random() * 1000) + 1;
  const produitId = Math.floor(Math.random() * 20) + 1;
  const magasinId = Math.floor(Math.random() * 10) + 1;

  // 1. Consultation intensive des stocks (70% des requêtes)
  if (Math.random() < 0.7) {
    let response1 = http.get(`http://localhost:8000/api/v1/produits/${produitId}/stock`);
    let response2 = http.get(`http://localhost:8000/api/v1/produits/${produitId + 1}/stock`);
    let response3 = http.get(`http://localhost:8000/api/v1/produits/${produitId + 2}/stock`);
    
    stockRequests.add(3);
    
    // Vérifications de réponse
    check(response1, {
      'stock response status is 200': (r) => r.status === 200,
      'stock response time < 500ms': (r) => r.timings.duration < 500,
    });
    
    errorRate.add(response1.status !== 200);
    errorRate.add(response2.status !== 200);
    errorRate.add(response3.status !== 200);
  }

  // 2. Génération de rapports (15% des requêtes - plus coûteuse)
  if (Math.random() < 0.15) {
    let reportResponse = http.get('http://localhost:8000/api/v1/rapports');
    let magasinReportResponse = http.get(`http://localhost:8000/api/v1/rapports?magasin=${magasinId}`);
    
    reportRequests.add(2);
    
    check(reportResponse, {
      'rapport response status is 200': (r) => r.status === 200,
      'rapport response time < 2000ms': (r) => r.timings.duration < 2000,
    });
    
    errorRate.add(reportResponse.status !== 200);
    errorRate.add(magasinReportResponse.status !== 200);
  }

  // 3. Mise à jour de produits (10% des requêtes - écritures)
  if (Math.random() < 0.1) {
    const newStock = Math.floor(Math.random() * 100);
    let updateResponse = http.put(`http://localhost:8000/api/v1/produits/${produitId}`, 
      JSON.stringify({ stock: newStock, userId: userId }), 
      { headers: { 'Content-Type': 'application/json' } }
    );
    
    updateRequests.add(1);
    
    check(updateResponse, {
      'update response status is 200': (r) => r.status === 200,
      'update response time < 1000ms': (r) => r.timings.duration < 1000,
    });
    
    errorRate.add(updateResponse.status !== 200);
  }

  // 4. Requêtes de santé (monitoring)
  if (Math.random() < 0.15) {
    let healthResponse = http.get('http://localhost:8000/health');
    check(healthResponse, {
      'health check is ok': (r) => r.status === 200,
    });
  }

  // Variation du temps d'attente pour simuler différents comportements utilisateur
  const waitTime = Math.random() * 2; // Entre 0 et 2 secondes (réduit pour plus de charge)
  sleep(waitTime);
}
