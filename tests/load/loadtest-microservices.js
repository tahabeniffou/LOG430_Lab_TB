import http from 'k6/http';
import { sleep, check } from 'k6';
import { Counter, Rate } from 'k6/metrics';

// Métriques personnalisées
let errorRate = new Rate('error_rate');
let customerRequests = new Counter('customer_requests');
let cartRequests = new Counter('cart_requests');
let productRequests = new Counter('product_requests');
let stockRequests = new Counter('stock_requests');

export let options = {
  stages: [
    { duration: '30s', target: 30 },    // Montée progressive
    { duration: '2m', target: 100 },    // Charge normale
    { duration: '3m', target: 200 },    // Pic de charge
    { duration: '2m', target: 300 },    // Charge maximale
    { duration: '1m', target: 100 },    // Redescente
    { duration: '30s', target: 0 },     // Arrêt
  ],
  thresholds: {
    http_req_duration: ['p(95)<800'], // Plus de tolérance avec microservices
    http_req_failed: ['rate<0.02'],   // 2% d'erreurs max
  },
};

// Simulation d'un utilisateur e-commerce complet
export default function () {
  const customerId = `customer_${Math.floor(Math.random() * 1000) + 1}`;
  const productId = Math.floor(Math.random() * 20) + 1;

  // 1. Créer un compte client (20% des utilisateurs)
  if (Math.random() < 0.2) {
    const customerData = {
      email: `${customerId}@example.com`,
      password: 'password123',
      firstName: 'Test',
      lastName: 'User',
      phone: '514-555-0123',
      address: {
        street: '123 Test Street',
        city: 'Montreal',
        postalCode: 'H1H 1H1',
        country: 'Canada'
      }
    };

    let createCustomerResponse = http.post(
      'http://localhost:3014/api/v1/customers', 
      JSON.stringify(customerData),
      { headers: { 'Content-Type': 'application/json' } }
    );

    customerRequests.add(1);
    
    check(createCustomerResponse, {
      'customer creation status is 201 or 409': (r) => r.status === 201 || r.status === 409,
      'customer creation response time < 1000ms': (r) => r.timings.duration < 1000,
    });
    
    errorRate.add(createCustomerResponse.status < 200 || createCustomerResponse.status >= 400);
  }

  // 2. Consultation des produits et stocks (60% des requêtes)
  if (Math.random() < 0.6) {
    // Consultation du stock
    let stockResponse = http.get(`http://localhost:3011/api/v1/produits/${productId}/stock`);
    
    stockRequests.add(1);
    
    check(stockResponse, {
      'stock check status is 200': (r) => r.status === 200,
      'stock check response time < 500ms': (r) => r.timings.duration < 500,
    });
    
    errorRate.add(stockResponse.status !== 200);

    // Consultation des informations produit
    let productResponse = http.get(`http://localhost:3010/api/v1/produits/${productId}`);
    
    productRequests.add(1);
    
    check(productResponse, {
      'product info status is 200': (r) => r.status === 200,
      'product info response time < 500ms': (r) => r.timings.duration < 500,
    });
    
    errorRate.add(productResponse.status !== 200);
  }

  // 3. Gestion du panier (30% des utilisateurs)
  if (Math.random() < 0.3) {
    // Créer un panier
    let createCartResponse = http.post(
      'http://localhost:3015/api/v1/cart',
      JSON.stringify({ customerId: customerId }),
      { headers: { 'Content-Type': 'application/json' } }
    );

    cartRequests.add(1);
    
    check(createCartResponse, {
      'cart creation status is 201': (r) => r.status === 201,
      'cart creation response time < 800ms': (r) => r.timings.duration < 800,
    });

    if (createCartResponse.status === 201) {
      const cart = JSON.parse(createCartResponse.body);
      
      // Ajouter un article au panier
      let addItemResponse = http.post(
        `http://localhost:3015/api/v1/cart/${cart.id}/items`,
        JSON.stringify({
          productId: productId.toString(),
          quantity: Math.floor(Math.random() * 3) + 1,
          price: Math.floor(Math.random() * 100) + 10
        }),
        { headers: { 'Content-Type': 'application/json' } }
      );

      cartRequests.add(1);
      
      check(addItemResponse, {
        'add item status is 200': (r) => r.status === 200,
        'add item response time < 1000ms': (r) => r.timings.duration < 1000,
      });
      
      errorRate.add(addItemResponse.status !== 200);
    }
    
    errorRate.add(createCartResponse.status !== 201);
  }

  // 4. Génération de rapports (10% des requêtes)
  if (Math.random() < 0.1) {
    let reportResponse = http.get('http://localhost:3013/api/v1/rapports');
    
    check(reportResponse, {
      'report status is 200': (r) => r.status === 200,
      'report response time < 2000ms': (r) => r.timings.duration < 2000,
    });
    
    errorRate.add(reportResponse.status !== 200);
  }

  // 5. Health checks (5% des requêtes)
  if (Math.random() < 0.05) {
    const services = [
      'http://localhost:3010/health', // product-service
      'http://localhost:3011/health', // stock-service
      'http://localhost:3014/health', // customer-service
      'http://localhost:3015/health'  // cart-service
    ];
    
    const serviceUrl = services[Math.floor(Math.random() * services.length)];
    let healthResponse = http.get(serviceUrl);
    
    check(healthResponse, {
      'health check is ok': (r) => r.status === 200,
    });
  }

  // Simulation du temps de réflexion utilisateur
  sleep(Math.random() * 2);
}
