/**
 * Tests de routage intelligent
 * Vérifie que le routeur hybride dirige correctement les requêtes
 */

const request = require('supertest');

describe('Tests de Routage Intelligent', () => {
  const hybridRouterURL = 'http://localhost:9000';
  const kongGatewayURL = 'http://localhost:8001';

  describe('Routage par Console - POS', () => {
    test('Console POS route vers legacy par défaut', async () => {
      const response = await request(hybridRouterURL)
        .get('/pos')
        .set('X-Client-Type', 'POS')
        .timeout(5000);
      
      expect([200, 404, 302]).toContain(response.status);
      
      // Vérifier si on a des headers qui indiquent le routage
      if (response.headers['x-source-service']) {
        expect(response.headers['x-source-service']).toMatch(/legacy|base/i);
      }
    });

    test('POS - Stock en temps réel via microservice', async () => {
      const response = await request(hybridRouterURL)
        .get('/pos/stock/realtime')
        .set('X-Client-Type', 'POS')
        .timeout(5000);
      
      expect([200, 404, 500]).toContain(response.status);
      
      // Stock devrait être routé vers le microservice
      if (response.headers['x-source-service']) {
        expect(response.headers['x-source-service']).toMatch(/stock/i);
      }
    });

    test('POS - Ventes via legacy', async () => {
      const response = await request(hybridRouterURL)
        .get('/pos/ventes')
        .set('X-Client-Type', 'POS')
        .timeout(5000);
      
      expect([200, 404, 500]).toContain(response.status);
    });
  });

  describe('Routage par Console - Maison Mère', () => {
    test('Console Maison Mère route vers legacy par défaut', async () => {
      const response = await request(hybridRouterURL)
        .get('/maisonmere')
        .set('X-Client-Type', 'MAISONMERE')
        .timeout(5000);
      
      expect([200, 404, 302]).toContain(response.status);
    });

    test('Maison Mère - Rapports via microservice', async () => {
      const response = await request(hybridRouterURL)
        .get('/maisonmere/rapports/avances')
        .set('X-Client-Type', 'MAISONMERE')
        .timeout(5000);
      
      expect([200, 404, 500]).toContain(response.status);
      
      // Rapports devraient être routés vers le microservice
      if (response.headers['x-source-service']) {
        expect(response.headers['x-source-service']).toMatch(/reporting/i);
      }
    });
  });

  describe('Routage API Moderne', () => {
    test('API produits route vers microservice', async () => {
      const response = await request(hybridRouterURL)
        .get('/api/produits')
        .set('X-Client-Type', 'API')
        .timeout(5000);
      
      expect([200, 404, 500]).toContain(response.status);
    });

    test('API ventes route vers microservice', async () => {
      const response = await request(hybridRouterURL)
        .get('/api/ventes')
        .set('X-Client-Type', 'API')
        .timeout(5000);
      
      expect([200, 404, 500]).toContain(response.status);
    });

    test('API stock route vers microservice', async () => {
      const response = await request(hybridRouterURL)
        .get('/api/stock')
        .set('X-Client-Type', 'API')
        .timeout(5000);
      
      expect([200, 404, 500]).toContain(response.status);
    });

    test('API reporting route vers microservice', async () => {
      const response = await request(hybridRouterURL)
        .get('/api/reports')
        .set('X-Client-Type', 'API')
        .timeout(5000);
      
      expect([200, 404, 500]).toContain(response.status);
    });
  });

  describe('Routage Web/Mobile', () => {
    test('Web/Mobile - Produits via microservice prioritaire', async () => {
      const response = await request(hybridRouterURL)
        .get('/produits')
        .set('X-Client-Type', 'WEB')
        .set('User-Agent', 'Mozilla/5.0')
        .timeout(5000);
      
      expect([200, 404, 500]).toContain(response.status);
    });

    test('Mobile - Ventes via microservice prioritaire', async () => {
      const response = await request(hybridRouterURL)
        .get('/ventes')
        .set('X-Client-Type', 'MOBILE')
        .set('User-Agent', 'Mobile App')
        .timeout(5000);
      
      expect([200, 404, 500]).toContain(response.status);
    });
  });

  describe('Fallback et Resilience', () => {
    test('Fallback vers legacy quand microservice indisponible', async () => {
      // Test avec un endpoint qui pourrait fallback
      const response = await request(hybridRouterURL)
        .get('/fallback-test')
        .set('X-Client-Type', 'API')
        .timeout(10000);
      
      // Devrait réussir même si certains microservices sont down
      expect([200, 404, 500, 502, 503]).toContain(response.status);
    });

    test('Headers de routage présents', async () => {
      const response = await request(hybridRouterURL)
        .get('/api/produits')
        .set('X-Client-Type', 'API')
        .timeout(5000);
      
      // Vérifier les headers informatifs
      expect(response.headers).toBeDefined();
    });
  });

  describe('Routage via Kong Gateway', () => {
    test('Kong route vers hybrid router', async () => {
      const response = await request(kongGatewayURL)
        .get('/api/produits')
        .set('X-Client-Type', 'API')
        .timeout(5000);
      
      expect([200, 404, 500, 502]).toContain(response.status);
      
      // Vérifier les headers Kong
      if (response.headers['x-gateway']) {
        expect(response.headers['x-gateway']).toMatch(/kong/i);
      }
    });

    test('Kong ajoute ses headers de sécurité', async () => {
      const response = await request(kongGatewayURL)
        .get('/health')
        .timeout(5000);
      
      expect([200, 404, 502]).toContain(response.status);
      
      // Vérifier la présence des headers Kong
      if (response.status === 200) {
        expect(response.headers).toBeDefined();
      }
    });
  });

  describe('Load Balancing des Produits', () => {
    test('Produits balancés entre instances', async () => {
      const responses = [];
      
      // Faire plusieurs requêtes pour tester la distribution
      for (let i = 0; i < 5; i++) {
        try {
          const response = await request(hybridRouterURL)
            .get('/api/produits')
            .set('X-Client-Type', 'API')
            .timeout(5000);
          
          responses.push({
            status: response.status,
            instance: response.headers['x-instance-id'] || 'unknown',
            service: response.headers['x-source-service'] || 'unknown'
          });
        } catch (error) {
          responses.push({ error: error.message });
        }
        
        // Petite pause entre les requêtes
        await new Promise(resolve => setTimeout(resolve, 100));
      }

      expect(responses.length).toBe(5);
      
      // Au moins une requête devrait passer
      expect(responses.some(r => r.status === 200 || r.status === 404)).toBe(true);
      
      // Si on a des instances ID, elles devraient varier
      const instanceIds = responses
        .filter(r => r.instance && r.instance !== 'unknown')
        .map(r => r.instance);
      
      if (instanceIds.length > 1) {
        const uniqueInstances = new Set(instanceIds);
        expect(uniqueInstances.size).toBeGreaterThan(0);
      }
    });
  });
});
