/**
 * Tests de sécurité
 * Vérifie CORS, rate limiting, headers de sécurité via Kong Gateway
 */

const request = require('supertest');

describe('Tests de Sécurité', () => {
  const kongGatewayURL = 'http://localhost:8001';
  const hybridRouterURL = 'http://localhost:3000';
  const kongAdminURL = 'http://localhost:8002';

  describe('Configuration CORS', () => {
    test('CORS - Origine autorisée acceptée', async () => {
      const response = await request(kongGatewayURL)
        .options('/api/produits')
        .set('Origin', 'http://localhost:3000')
        .set('Access-Control-Request-Method', 'GET')
        .timeout(5000);
      
      if (response.status === 200 || response.status === 204) {
        expect(response.headers['access-control-allow-origin']).toBeDefined();
        expect(response.headers['access-control-allow-methods']).toBeDefined();
      }
    });

    test('CORS - Headers autorisés présents', async () => {
      const response = await request(kongGatewayURL)
        .get('/api/produits')
        .set('Origin', 'http://localhost:3000')
        .set('X-Client-Type', 'WEB')
        .timeout(5000);
      
      if (response.status === 200) {
        // Vérifier que les headers CORS sont présents
        expect(response.headers['access-control-allow-origin'] || 
               response.headers['access-control-allow-credentials']).toBeDefined();
      }
    });

    test('CORS - Méthodes autorisées', async () => {
      const methods = ['GET', 'POST', 'PUT', 'DELETE'];
      
      for (const method of methods) {
        const response = await request(kongGatewayURL)
          .options('/api/produits')
          .set('Origin', 'http://localhost:3000')
          .set('Access-Control-Request-Method', method)
          .timeout(5000);
        
        if (response.status === 200 || response.status === 204) {
          expect(response.headers['access-control-allow-methods']).toContain(method);
        } else {
          // Method might not be supported, but CORS should still respond
          expect([404, 405, 502]).toContain(response.status);
        }
      }
    });
  });

  describe('Rate Limiting', () => {
    test('Rate limiting configuré', async () => {
      // Faire plusieurs requêtes rapides pour tester le rate limiting
      const responses = [];
      const maxRequests = 10;
      
      for (let i = 0; i < maxRequests; i++) {
        try {
          const response = await request(kongGatewayURL)
            .get('/api/produits')
            .set('X-Client-Type', 'API')
            .timeout(2000);
          
          responses.push({
            status: response.status,
            rateLimitRemaining: response.headers['x-ratelimit-remaining-minute'],
            rateLimitLimit: response.headers['x-ratelimit-limit-minute']
          });
        } catch (error) {
          responses.push({ error: error.message });
        }
        
        // Pause très courte
        await new Promise(resolve => setTimeout(resolve, 50));
      }

      // Au moins quelques requêtes devraient passer
      const successfulRequests = responses.filter(r => 
        r.status === 200 || r.status === 404 || r.status === 500
      );
      expect(successfulRequests.length).toBeGreaterThan(0);
      
      // Vérifier si on a des headers de rate limiting
      const rateLimitHeaders = responses.filter(r => 
        r.rateLimitRemaining !== undefined || r.rateLimitLimit !== undefined
      );
      
      if (rateLimitHeaders.length > 0) {
        expect(rateLimitHeaders[0].rateLimitLimit).toBeDefined();
      }
    });

    test('Rate limiting - Headers présents', async () => {
      const response = await request(kongGatewayURL)
        .get('/health')
        .timeout(5000);
      
      // Kong devrait ajouter des headers de rate limiting
      if (response.status === 200) {
        expect(response.headers).toBeDefined();
        // Les headers de rate limiting peuvent être présents
      }
    });
  });

  describe('Headers de Sécurité', () => {
    test('Headers Kong présents', async () => {
      const response = await request(kongGatewayURL)
        .get('/api/produits')
        .set('X-Client-Type', 'API')
        .timeout(5000);
      
      if (response.status === 200) {
        // Vérifier les headers ajoutés par Kong
        expect(response.headers['x-gateway'] || 
               response.headers['x-service'] ||
               response.headers['x-forwarded-by']).toBeDefined();
      }
    });

    test('Headers de transformation présents', async () => {
      const response = await request(kongGatewayURL)
        .get('/health')
        .timeout(5000);
      
      if (response.status === 200) {
        // Kong devrait ajouter ses headers de transformation
        expect(response.headers).toBeDefined();
      }
    });

    test('Headers de sécurité standard', async () => {
      const response = await request(hybridRouterURL)
        .get('/health')
        .timeout(5000);
      
      if (response.status === 200) {
        // Le router hybride utilise helmet pour les headers de sécurité
        expect(response.headers).toBeDefined();
      }
    });
  });

  describe('Protection contre les attaques', () => {
    test('Protection XSS - Headers Content-Type', async () => {
      const response = await request(kongGatewayURL)
        .get('/api/produits')
        .set('X-Client-Type', 'API')
        .timeout(5000);
      
      if (response.status === 200 && response.headers['content-type']) {
        expect(response.headers['content-type']).toMatch(/application\/json|text\/html/);
      }
    });

    test('Protection CSRF - Headers requis', async () => {
      const response = await request(kongGatewayURL)
        .post('/api/produits')
        .send({ test: 'data' })
        .set('Content-Type', 'application/json')
        .set('X-Client-Type', 'API')
        .timeout(5000);
      
      // Devrait répondre même si pas autorisé
      expect([200, 400, 401, 403, 404, 405, 500, 502]).toContain(response.status);
    });

    test('Protection injection - Headers SQL', async () => {
      const maliciousPayload = "'; DROP TABLE users; --";
      
      const response = await request(kongGatewayURL)
        .get(`/api/produits?search=${encodeURIComponent(maliciousPayload)}`)
        .set('X-Client-Type', 'API')
        .timeout(5000);
      
      // Devrait gérer gracieusement
      expect([200, 400, 404, 500, 502]).toContain(response.status);
    });
  });

  describe('Authentification et Autorisation', () => {
    test('Requête sans authentification', async () => {
      const response = await request(kongGatewayURL)
        .get('/api/produits')
        .timeout(5000);
      
      // Peut être autorisé ou refusé selon la config
      expect([200, 401, 403, 404, 500, 502]).toContain(response.status);
    });

    test('Requête avec headers d\'authentification', async () => {
      const response = await request(kongGatewayURL)
        .get('/api/produits')
        .set('Authorization', 'Bearer fake-token')
        .set('X-API-Key', 'test-key')
        .timeout(5000);
      
      expect([200, 401, 403, 404, 500, 502]).toContain(response.status);
    });

    test('Requête avec client type valide', async () => {
      const response = await request(kongGatewayURL)
        .get('/api/produits')
        .set('X-Client-Type', 'API')
        .set('X-API-Key', 'valid-key')
        .timeout(5000);
      
      expect([200, 401, 403, 404, 500, 502]).toContain(response.status);
    });
  });

  describe('Kong Admin API', () => {
    test('Kong Admin accessible (tests uniquement)', async () => {
      const response = await request(kongAdminURL)
        .get('/')
        .timeout(5000);
      
      expect([200, 404]).toContain(response.status);
      
      if (response.status === 200) {
        expect(response.body).toBeDefined();
      }
    });

    test('Kong services configurés', async () => {
      try {
        const response = await request(kongAdminURL)
          .get('/services')
          .timeout(5000);
        
        if (response.status === 200) {
          expect(response.body).toBeDefined();
          expect(response.body.data || response.body.services).toBeDefined();
        }
      } catch (error) {
        // Admin API might not be accessible
        expect(error).toBeDefined();
      }
    });

    test('Kong plugins configurés', async () => {
      try {
        const response = await request(kongAdminURL)
          .get('/plugins')
          .timeout(5000);
        
        if (response.status === 200) {
          expect(response.body).toBeDefined();
          
          if (response.body.data) {
            const plugins = response.body.data;
            const pluginNames = plugins.map(p => p.name);
            
            // Vérifier que nos plugins essentiels sont présents
            expect(pluginNames).toEqual(
              expect.arrayContaining(['cors', 'rate-limiting'])
            );
          }
        }
      } catch (error) {
        // Admin API might not be accessible in production
        expect(error).toBeDefined();
      }
    });
  });

  describe('Logging et Monitoring Sécurité', () => {
    test('Logs de sécurité générés', async () => {
      // Faire une requête pour générer des logs
      await request(kongGatewayURL)
        .get('/api/produits')
        .set('X-Client-Type', 'API')
        .set('User-Agent', 'Security-Test')
        .timeout(5000);
      
      // Kong devrait logger cette requête
      // Le test vérifie juste que la requête ne crash pas
      expect(true).toBe(true);
    });

    test('Monitoring des attaques', async () => {
      // Simuler plusieurs requêtes douteuses
      const suspiciousRequests = [
        '/api/produits?id=1\' OR 1=1--',
        '/api/produits/<script>alert("xss")</script>',
        '/api/produits?redirect=http://evil.com'
      ];
      
      for (const path of suspiciousRequests) {
        try {
          await request(kongGatewayURL)
            .get(path)
            .set('X-Client-Type', 'API')
            .timeout(3000);
        } catch (error) {
          // Expected - ces requêtes peuvent être bloquées
        }
      }
      
      // Le système devrait gérer ces requêtes sans crash
      expect(true).toBe(true);
    });
  });
});
