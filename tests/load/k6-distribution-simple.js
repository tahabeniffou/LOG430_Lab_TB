import http from 'k6/http';
import { check, sleep } from 'k6';

// Configuration simple pour observer la distribution
export const options = {
  vus: 5,        // 5 utilisateurs virtuels
  duration: '30s', // pendant 30 secondes
};

const BASE_URL = 'http://localhost:8000';

// Compteurs pour chaque instance
let instanceCounts = {};

export default function () {
  const response = http.get(`${BASE_URL}/health-lb`);
  
  check(response, {
    'status is 200': (r) => r.status === 200,
  });
  
  // Extraire l'instance ID
  const instanceId = response.headers['X-Instance-Id'] || response.headers['x-instance-id'] || 'unknown';
  
  // Compter les accès par instance
  if (!instanceCounts[instanceId]) {
    instanceCounts[instanceId] = 0;
  }
  instanceCounts[instanceId]++;
  
  console.log(`Request handled by: ${instanceId} (Total: ${instanceCounts[instanceId]})`);
  
  sleep(0.5); // Pause de 500ms entre les requêtes
}

export function teardown() {
  console.log('\n📊 DISTRIBUTION FINALE:');
  for (const [instance, count] of Object.entries(instanceCounts)) {
    console.log(`  ${instance}: ${count} requests`);
  }
}
