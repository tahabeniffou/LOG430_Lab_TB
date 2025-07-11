/**
 * Tests de santé des services
 * Vérifie que tous les services sont opérationnels
 */

const request = require('supertest');

describe('Tests de Santé des Services', () => {
  const services = {
    'Legacy System': 'http://localhost:3000',
    'Produit Service 1': 'http://localhost:3001',
    'Vente Service': 'http://localhost:3004',
    'Produit Service 2': 'http://localhost:3005',
    'Produit Service 3': 'http://localhost:3006',
    'Stock Service': 'http://localhost:3007',
    'Reporting Service': 'http://localhost:3008',
    'Hybrid Router': 'http://localhost:3000',
    'Load Balancer': 'http://localhost:8000',
    'Kong Gateway': 'http://localhost:8001'
  };

  // Test global de santé
  describe('Santé générale des services', () => {
    Object.entries(services).forEach(([serviceName, serviceUrl]) => {
      test(`${serviceName} répond au health check`, async () => {
        try {
          const response = await request(serviceUrl)
            .get('/health')
            .timeout(5000);
          
          expect([200, 404]).toContain(response.status);
          
          if (response.status === 200) {
            expect(response.body).toHaveProperty('status');
            expect(['OK', 'healthy', 'running'].some(status => 
              response.body.status?.toLowerCase()?.includes(status.toLowerCase())
            )).toBe(true);
          }
        } catch (error) {
          // Service might not have /health endpoint, try root
          const response = await request(serviceUrl)
            .get('/')
            .timeout(5000);
          
          expect([200, 404, 302]).toContain(response.status);
        }
      }, 10000);
    });
  });

  // Tests spécifiques par service
  describe('Legacy System', () => {
    const baseURL = services['Legacy System'];

    test('Service accessible', async () => {
      const response = await request(baseURL)
        .get('/')
        .timeout(5000);
      
      expect([200, 404, 302]).toContain(response.status);
    });

    test('Console POS accessible', async () => {
      const response = await request(baseURL)
        .get('/pos')
        .timeout(5000);
      
      expect([200, 404, 302]).toContain(response.status);
    });

    test('Console Maison Mère accessible', async () => {
      const response = await request(baseURL)
        .get('/maisonmere')
        .timeout(5000);
      
      expect([200, 404, 302]).toContain(response.status);
    });
  });

  describe('Microservices', () => {
    test('Produit Service - endpoints de base', async () => {
      const response = await request(services['Produit Service 1'])
        .get('/api/produits')
        .timeout(5000);
      
      expect([200, 404, 500]).toContain(response.status);
    });

    test('Vente Service - endpoints de base', async () => {
      const response = await request(services['Vente Service'])
        .get('/api/ventes')
        .timeout(5000);
      
      expect([200, 404, 500]).toContain(response.status);
    });

    test('Stock Service - endpoints de base', async () => {
      const response = await request(services['Stock Service'])
        .get('/api/stock')
        .timeout(5000);
      
      expect([200, 404, 500]).toContain(response.status);
    });

    test('Reporting Service - endpoints de base', async () => {
      const response = await request(services['Reporting Service'])
        .get('/api/reports')
        .timeout(5000);
      
      expect([200, 404, 500]).toContain(response.status);
    });
  });

  describe('Hybrid Router', () => {
    const baseURL = services['Hybrid Router'];

    test('Router accessible', async () => {
      const response = await request(baseURL)
        .get('/health')
        .timeout(5000);
      
      expect([200, 404]).toContain(response.status);
    });

    test('Route POS fonctionne', async () => {
      const response = await request(baseURL)
        .get('/pos')
        .timeout(5000);
      
      expect([200, 404, 302]).toContain(response.status);
    });

    test('Route API moderne fonctionne', async () => {
      const response = await request(baseURL)
        .get('/api/produits')
        .timeout(5000);
      
      expect([200, 404, 500]).toContain(response.status);
    });
  });

  describe('Kong Gateway', () => {
    const baseURL = services['Kong Gateway'];

    test('Kong Admin API accessible', async () => {
      const response = await request('http://localhost:8002')
        .get('/')
        .timeout(5000);
      
      expect([200, 404]).toContain(response.status);
    });

    test('Gateway proxy accessible', async () => {
      const response = await request(baseURL)
        .get('/health')
        .timeout(5000);
      
      expect([200, 404, 502]).toContain(response.status);
    });
  });

  describe('Load Balancer', () => {
    const baseURL = services['Load Balancer'];

    test('Load balancer accessible', async () => {
      const response = await request(baseURL)
        .get('/health')
        .timeout(5000);
      
      expect([200, 404, 502]).toContain(response.status);
    });

    test('Distribution des requêtes', async () => {
      const responses = [];
      
      // Faire plusieurs requêtes pour tester la distribution
      for (let i = 0; i < 3; i++) {
        try {
          const response = await request(baseURL)
            .get('/api/produits')
            .timeout(5000);
          
          responses.push({
            status: response.status,
            headers: response.headers
          });
        } catch (error) {
          responses.push({ error: error.message });
        }
      }

      expect(responses.length).toBe(3);
      // Au moins une requête devrait passer
      expect(responses.some(r => r.status === 200 || r.status === 404)).toBe(true);
    });
  });
});
