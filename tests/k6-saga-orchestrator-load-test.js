import http from 'k6/http';
import { check, sleep } from 'k6';
import { Counter, Rate, Trend } from 'k6/metrics';

// Métriques personnalisées pour le Lab 6
const sagaSuccessRate = new Rate('saga_success_rate');
const sagaFailureRate = new Rate('saga_failure_rate');
const sagaCompensationRate = new Rate('saga_compensation_rate');
const sagaDuration = new Trend('saga_duration');
const sagaStepDuration = new Trend('saga_step_duration');

// Compteurs pour les étapes
const stockReserveSuccess = new Counter('stock_reserve_success');
const stockReserveFailure = new Counter('stock_reserve_failure');
const paymentDebitSuccess = new Counter('payment_debit_success');
const paymentDebitFailure = new Counter('payment_debit_failure');
const saleCreateSuccess = new Counter('sale_create_success');
const saleCreateFailure = new Counter('sale_create_failure');

// Configuration du test de charge
export const options = {
  stages: [
    // Montée en charge progressive
    { duration: '2m', target: 10 },   // 0-10 users over 2 minutes
    { duration: '5m', target: 25 },   // 10-25 users over 5 minutes
    { duration: '10m', target: 50 },  // 25-50 users over 10 minutes
    { duration: '5m', target: 100 },  // 50-100 users over 5 minutes (peak)
    { duration: '10m', target: 100 }, // Stay at 100 users for 10 minutes
    { duration: '5m', target: 50 },   // Scale down to 50 users
    { duration: '5m', target: 25 },   // Scale down to 25 users
    { duration: '3m', target: 0 },    // Scale down to 0 users
  ],
  thresholds: {
    // Seuils de performance pour Lab 6
    'saga_success_rate': ['rate>0.95'],        // 95% de succès minimum
    'saga_failure_rate': ['rate<0.05'],        // 5% d'échec maximum
    'saga_compensation_rate': ['rate<0.10'],   // 10% de compensation maximum
    'saga_duration': ['p(95)<5000'],           // 95% des sagas en moins de 5s
    'http_req_duration': ['p(95)<3000'],       // 95% des requêtes en moins de 3s
    'http_req_failed': ['rate<0.1'],           // 10% d'échecs HTTP maximum
  },
};

// Données de test pour les sagas
const testData = {
  products: [
    { id: 1, name: 'Laptop Dell', price: 1200, stock: 100 },
    { id: 2, name: 'iPhone 15', price: 999, stock: 50 },
    { id: 3, name: 'Samsung Galaxy', price: 850, stock: 75 },
    { id: 4, name: 'MacBook Pro', price: 2500, stock: 25 },
    { id: 5, name: 'iPad Air', price: 600, stock: 80 },
  ],
  customers: [
    { id: 1, name: 'Alice Martin', balance: 5000 },
    { id: 2, name: 'Bob Dupont', balance: 3000 },
    { id: 3, name: 'Charlie Rousseau', balance: 8000 },
    { id: 4, name: 'Diana Leblanc', balance: 2000 },
    { id: 5, name: 'Eve Morin', balance: 6000 },
  ],
};

// URLs des services
const BASE_URL = 'http://localhost:8000'; // Kong Gateway
const SAGA_ORCHESTRATOR_URL = 'http://localhost:8010';

export default function() {
  // Sélection aléatoire des données de test
  const product = testData.products[Math.floor(Math.random() * testData.products.length)];
  const customer = testData.customers[Math.floor(Math.random() * testData.customers.length)];
  const quantity = Math.floor(Math.random() * 3) + 1; // 1-3 items
  
  const sagaPayload = {
    customerId: customer.id,
    productId: product.id,
    quantity: quantity,
    totalAmount: product.price * quantity,
    timestamp: new Date().toISOString(),
    correlationId: `saga-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
  };

  // Démarrage du timer pour la saga complète
  const sagaStart = Date.now();
  
  // 1. Initiation de la saga via l'orchestrateur
  const sagaResponse = http.post(
    `${SAGA_ORCHESTRATOR_URL}/saga/start`,
    JSON.stringify(sagaPayload),
    {
      headers: {
        'Content-Type': 'application/json',
        'X-Correlation-ID': sagaPayload.correlationId,
      },
      timeout: '30s',
    }
  );

  // Vérification de la réponse
  const sagaSuccess = check(sagaResponse, {
    'Saga initiated successfully': (r) => r.status === 200 || r.status === 201,
    'Saga response has correlation ID': (r) => {
      try {
        const body = JSON.parse(r.body);
        return body.correlationId === sagaPayload.correlationId;
      } catch {
        return false;
      }
    },
  });

  if (sagaSuccess) {
    let sagaCompleted = false;
    let compensationOccurred = false;
    let stepResults = {
      stockReserve: false,
      paymentDebit: false,
      saleCreate: false,
    };

    try {
      const responseBody = JSON.parse(sagaResponse.body);
      
      // Attendre la completion de la saga (polling)
      let attempts = 0;
      const maxAttempts = 10;
      
      while (!sagaCompleted && attempts < maxAttempts) {
        sleep(0.5); // Attendre 500ms
        
        // Vérifier le statut de la saga
        const statusResponse = http.get(
          `${SAGA_ORCHESTRATOR_URL}/saga/status/${responseBody.sagaId}`,
          {
            headers: {
              'X-Correlation-ID': sagaPayload.correlationId,
            },
            timeout: '10s',
          }
        );

        if (statusResponse.status === 200) {
          const status = JSON.parse(statusResponse.body);
          
          // Analyser les étapes
          if (status.steps) {
            stepResults.stockReserve = status.steps.stockReserve?.completed || false;
            stepResults.paymentDebit = status.steps.paymentDebit?.completed || false;
            stepResults.saleCreate = status.steps.saleCreate?.completed || false;
          }
          
          // Vérifier si la saga est terminée
          if (status.status === 'COMPLETED') {
            sagaCompleted = true;
            sagaSuccessRate.add(1);
          } else if (status.status === 'FAILED' || status.status === 'COMPENSATED') {
            sagaCompleted = true;
            sagaFailureRate.add(1);
            if (status.status === 'COMPENSATED') {
              compensationOccurred = true;
              sagaCompensationRate.add(1);
            }
          }
        }
        
        attempts++;
      }
      
      // Calculer la durée totale de la saga
      const sagaEnd = Date.now();
      sagaDuration.add(sagaEnd - sagaStart);
      
      // Incrémenter les compteurs d'étapes
      if (stepResults.stockReserve) {
        stockReserveSuccess.add(1);
      } else {
        stockReserveFailure.add(1);
      }
      
      if (stepResults.paymentDebit) {
        paymentDebitSuccess.add(1);
      } else {
        paymentDebitFailure.add(1);
      }
      
      if (stepResults.saleCreate) {
        saleCreateSuccess.add(1);
      } else {
        saleCreateFailure.add(1);
      }

    } catch (error) {
      console.error(`Saga processing error: ${error.message}`);
      sagaFailureRate.add(1);
    }

  } else {
    console.error(`Failed to initiate saga: ${sagaResponse.status} - ${sagaResponse.body}`);
    sagaFailureRate.add(1);
  }

  // Test de santé des services participants
  const healthChecks = [
    { name: 'Stock Service', url: `${BASE_URL}/api/stocks/health` },
    { name: 'Payment Service', url: `${BASE_URL}/api/payments/health` },
    { name: 'Sale Service', url: `${BASE_URL}/api/ventes/health` },
    { name: 'Saga Orchestrator', url: `${SAGA_ORCHESTRATOR_URL}/health` },
  ];

  // Test aléatoire d'un service (20% de chance)
  if (Math.random() < 0.2) {
    const service = healthChecks[Math.floor(Math.random() * healthChecks.length)];
    const healthResponse = http.get(service.url, { timeout: '5s' });
    
    check(healthResponse, {
      [`${service.name} is healthy`]: (r) => r.status === 200,
    });
  }

  // Pause entre les requêtes (1-3 secondes)
  sleep(Math.random() * 2 + 1);
}

// Fonction de setup exécutée une fois au début
export function setup() {
  console.log('🚀 Démarrage du test de charge Lab 6 - Saga Orchestrator');
  
  // Vérifier que les services sont accessibles
  const services = [
    { name: 'Kong Gateway', url: `${BASE_URL}` },
    { name: 'Saga Orchestrator', url: `${SAGA_ORCHESTRATOR_URL}/health` },
  ];
  
  for (const service of services) {
    const response = http.get(service.url, { timeout: '10s' });
    if (response.status !== 200) {
      console.error(`❌ ${service.name} is not accessible (${response.status})`);
    } else {
      console.log(`✅ ${service.name} is accessible`);
    }
  }
}

// Fonction de teardown exécutée à la fin
export function teardown() {
  console.log('🏁 Test de charge Lab 6 terminé');
  console.log('📊 Consultez les métriques dans Grafana: http://localhost:3008');
}
