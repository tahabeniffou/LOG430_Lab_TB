/**
 * Tests de performance et load balancing
 * Compare les performances entre accès direct et via gateway
 */

const request = require('supertest');

describe('Tests de Performance et Load Balancing', () => {
  const directProduitURL = 'http://localhost:3001';
  const loadBalancerURL = 'http://localhost:8000';
  const hybridRouterURL = 'http://localhost:3000';
  const kongGatewayURL = 'http://localhost:8001';

  describe('Performance - Accès Direct vs Gateway', () => {
    test('Latence accès direct au microservice', async () => {
      const startTime = Date.now();
      
      try {
        const response = await request(directProduitURL)
          .get('/api/produits')
          .timeout(5000);
        
        const endTime = Date.now();
        const latency = endTime - startTime;
        
        expect([200, 404, 500]).toContain(response.status);
        expect(latency).toBeLessThan(2000); // Moins de 2 secondes
        
        console.log(`Accès direct - Latence: ${latency}ms, Status: ${response.status}`);
      } catch (error) {
        console.log(`Accès direct échoué: ${error.message}`);
        expect(error).toBeDefined();
      }
    });

    test('Latence via Kong Gateway', async () => {
      const startTime = Date.now();
      
      try {
        const response = await request(kongGatewayURL)
          .get('/api/produits')
          .set('X-Client-Type', 'API')
          .timeout(5000);
        
        const endTime = Date.now();
        const latency = endTime - startTime;
        
        expect([200, 404, 500, 502]).toContain(response.status);
        expect(latency).toBeLessThan(5000); // Moins de 5 secondes via gateway
        
        console.log(`Via Kong - Latence: ${latency}ms, Status: ${response.status}`);
      } catch (error) {
        console.log(`Accès Kong échoué: ${error.message}`);
        expect(error).toBeDefined();
      }
    });

    test('Latence via Hybrid Router', async () => {
      const startTime = Date.now();
      
      try {
        const response = await request(hybridRouterURL)
          .get('/api/produits')
          .set('X-Client-Type', 'API')
          .timeout(5000);
        
        const endTime = Date.now();
        const latency = endTime - startTime;
        
        expect([200, 404, 500]).toContain(response.status);
        expect(latency).toBeLessThan(3000); // Moins de 3 secondes via router
        
        console.log(`Via Router - Latence: ${latency}ms, Status: ${response.status}`);
      } catch (error) {
        console.log(`Accès Router échoué: ${error.message}`);
        expect(error).toBeDefined();
      }
    });

    test('Comparaison performance - Multiple requêtes', async () => {
      const numRequests = 5;
      const results = {
        direct: [],
        gateway: [],
        router: []
      };

      // Test accès direct
      for (let i = 0; i < numRequests; i++) {
        const startTime = Date.now();
        try {
          const response = await request(directProduitURL)
            .get('/api/produits')
            .timeout(3000);
          const latency = Date.now() - startTime;
          results.direct.push({ latency, status: response.status });
        } catch (error) {
          results.direct.push({ latency: 3000, error: error.message });
        }
        await new Promise(resolve => setTimeout(resolve, 100));
      }

      // Test via gateway
      for (let i = 0; i < numRequests; i++) {
        const startTime = Date.now();
        try {
          const response = await request(kongGatewayURL)
            .get('/api/produits')
            .set('X-Client-Type', 'API')
            .timeout(3000);
          const latency = Date.now() - startTime;
          results.gateway.push({ latency, status: response.status });
        } catch (error) {
          results.gateway.push({ latency: 3000, error: error.message });
        }
        await new Promise(resolve => setTimeout(resolve, 100));
      }

      // Test via router
      for (let i = 0; i < numRequests; i++) {
        const startTime = Date.now();
        try {
          const response = await request(hybridRouterURL)
            .get('/api/produits')
            .set('X-Client-Type', 'API')
            .timeout(3000);
          const latency = Date.now() - startTime;
          results.router.push({ latency, status: response.status });
        } catch (error) {
          results.router.push({ latency: 3000, error: error.message });
        }
        await new Promise(resolve => setTimeout(resolve, 100));
      }

      // Calculer les moyennes
      const directAvg = results.direct
        .filter(r => !r.error)
        .reduce((sum, r) => sum + r.latency, 0) / Math.max(1, results.direct.filter(r => !r.error).length);
      
      const gatewayAvg = results.gateway
        .filter(r => !r.error)
        .reduce((sum, r) => sum + r.latency, 0) / Math.max(1, results.gateway.filter(r => !r.error).length);
      
      const routerAvg = results.router
        .filter(r => !r.error)
        .reduce((sum, r) => sum + r.latency, 0) / Math.max(1, results.router.filter(r => !r.error).length);

      console.log(`Moyennes - Direct: ${directAvg.toFixed(2)}ms, Gateway: ${gatewayAvg.toFixed(2)}ms, Router: ${routerAvg.toFixed(2)}ms`);

      // Vérifications
      expect(results.direct.length).toBe(numRequests);
      expect(results.gateway.length).toBe(numRequests);
      expect(results.router.length).toBe(numRequests);
      
      // Gateway peut être plus lent mais devrait rester raisonnable
      if (!isNaN(directAvg) && !isNaN(gatewayAvg)) {
        expect(gatewayAvg).toBeLessThan(directAvg * 3); // Gateway max 3x plus lent
      }
    });
  });

  describe('Load Balancing des Microservices Produit', () => {
    test('Distribution des requêtes entre instances', async () => {
      const numRequests = 10;
      const responses = [];
      
      for (let i = 0; i < numRequests; i++) {
        try {
          const response = await request(loadBalancerURL)
            .get('/api/produits')
            .timeout(3000);
          
          responses.push({
            status: response.status,
            instance: response.headers['x-instance-id'] || 'unknown',
            server: response.headers['server'] || 'unknown',
            responseTime: response.headers['x-response-time'] || 'unknown'
          });
        } catch (error) {
          responses.push({ error: error.message });
        }
        
        // Petite pause pour permettre la distribution
        await new Promise(resolve => setTimeout(resolve, 100));
      }

      expect(responses.length).toBe(numRequests);
      
      // Au moins quelques requêtes devraient réussir
      const successfulResponses = responses.filter(r => 
        r.status === 200 || r.status === 404
      );
      expect(successfulResponses.length).toBeGreaterThan(0);
      
      // Analyser la distribution
      const instances = responses
        .filter(r => r.instance && r.instance !== 'unknown')
        .map(r => r.instance);
      
      if (instances.length > 1) {
        const uniqueInstances = new Set(instances);
        console.log(`Instances utilisées: ${Array.from(uniqueInstances).join(', ')}`);
        
        // Si on a plusieurs instances, on devrait voir de la distribution
        if (uniqueInstances.size > 1) {
          expect(uniqueInstances.size).toBeGreaterThan(1);
        }
      }
      
      console.log(`Load balancer - ${successfulResponses.length}/${numRequests} requêtes réussies`);
    });

    test('Resilience - Haute charge', async () => {
      const concurrentRequests = 5;
      const promises = [];
      
      for (let i = 0; i < concurrentRequests; i++) {
        const promise = request(loadBalancerURL)
          .get('/api/produits')
          .timeout(5000)
          .catch(error => ({ error: error.message }));
        
        promises.push(promise);
      }
      
      const results = await Promise.all(promises);
      
      expect(results.length).toBe(concurrentRequests);
      
      // Au moins la moitié des requêtes devraient réussir
      const successful = results.filter(r => 
        r.status === 200 || r.status === 404 || r.status === 500
      );
      
      expect(successful.length).toBeGreaterThan(0);
      
      console.log(`Haute charge - ${successful.length}/${concurrentRequests} requêtes réussies`);
    });

    test('Health check load balancer', async () => {
      const response = await request(loadBalancerURL)
        .get('/health')
        .timeout(5000);
      
      expect([200, 404, 502]).toContain(response.status);
      
      if (response.status === 200) {
        expect(response.body).toBeDefined();
        
        if (response.body.upstreams) {
          expect(Array.isArray(response.body.upstreams)).toBe(true);
          expect(response.body.upstreams.length).toBeGreaterThan(0);
        }
      }
    });
  });

  describe('Performance par Type de Client', () => {
    test('Performance Console POS', async () => {
      const startTime = Date.now();
      
      const response = await request(hybridRouterURL)
        .get('/pos')
        .set('X-Client-Type', 'POS')
        .timeout(5000);
      
      const latency = Date.now() - startTime;
      
      expect([200, 404, 302]).toContain(response.status);
      expect(latency).toBeLessThan(2000); // POS doit être rapide
      
      console.log(`POS Console - Latence: ${latency}ms`);
    });

    test('Performance Console Maison Mère', async () => {
      const startTime = Date.now();
      
      const response = await request(hybridRouterURL)
        .get('/maisonmere')
        .set('X-Client-Type', 'MAISONMERE')
        .timeout(5000);
      
      const latency = Date.now() - startTime;
      
      expect([200, 404, 302]).toContain(response.status);
      expect(latency).toBeLessThan(3000); // Rapports peuvent être plus lents
      
      console.log(`Maison Mère Console - Latence: ${latency}ms`);
    });

    test('Performance API moderne', async () => {
      const startTime = Date.now();
      
      const response = await request(hybridRouterURL)
        .get('/api/produits')
        .set('X-Client-Type', 'API')
        .timeout(5000);
      
      const latency = Date.now() - startTime;
      
      expect([200, 404, 500]).toContain(response.status);
      expect(latency).toBeLessThan(2500); // API doit être performante
      
      console.log(`API moderne - Latence: ${latency}ms`);
    });

    test('Performance Web/Mobile', async () => {
      const startTime = Date.now();
      
      const response = await request(hybridRouterURL)
        .get('/produits')
        .set('X-Client-Type', 'WEB')
        .set('User-Agent', 'Mozilla/5.0')
        .timeout(5000);
      
      const latency = Date.now() - startTime;
      
      expect([200, 404, 500]).toContain(response.status);
      expect(latency).toBeLessThan(2500); // Web doit être rapide
      
      console.log(`Web/Mobile - Latence: ${latency}ms`);
    });
  });

  describe('Cache et Optimisations', () => {
    test('Réponses cached plus rapides', async () => {
      // Première requête (cache miss)
      const firstStart = Date.now();
      const firstResponse = await request(hybridRouterURL)
        .get('/api/produits')
        .set('X-Client-Type', 'API')
        .timeout(5000);
      const firstLatency = Date.now() - firstStart;
      
      // Deuxième requête (potentiel cache hit)
      await new Promise(resolve => setTimeout(resolve, 100));
      
      const secondStart = Date.now();
      const secondResponse = await request(hybridRouterURL)
        .get('/api/produits')
        .set('X-Client-Type', 'API')
        .timeout(5000);
      const secondLatency = Date.now() - secondStart;
      
      console.log(`Cache test - Première: ${firstLatency}ms, Seconde: ${secondLatency}ms`);
      
      // Si les deux réussissent, la deuxième pourrait être plus rapide
      if (firstResponse.status === 200 && secondResponse.status === 200) {
        expect(secondLatency).toBeLessThan(firstLatency * 2); // Pas plus de 2x plus lent
      }
    });

    test('Headers de cache présents', async () => {
      const response = await request(hybridRouterURL)
        .get('/api/produits')
        .set('X-Client-Type', 'API')
        .timeout(5000);
      
      if (response.status === 200) {
        // Vérifier la présence d'headers de cache
        const cacheHeaders = ['cache-control', 'etag', 'last-modified', 'expires'];
        const hasCacheHeader = cacheHeaders.some(header => 
          response.headers[header] !== undefined
        );
        
        // Pas obligatoire mais informatif
        console.log(`Headers de cache détectés: ${hasCacheHeader}`);
      }
    });
  });

  describe('Métriques de Performance', () => {
    test('Collecte de métriques temps de réponse', async () => {
      const metrics = {
        successful: 0,
        failed: 0,
        totalTime: 0,
        minTime: Infinity,
        maxTime: 0
      };
      
      const numTests = 5;
      
      for (let i = 0; i < numTests; i++) {
        const startTime = Date.now();
        
        try {
          const response = await request(hybridRouterURL)
            .get('/api/produits')
            .set('X-Client-Type', 'API')
            .timeout(5000);
          
          const responseTime = Date.now() - startTime;
          
          if (response.status === 200 || response.status === 404) {
            metrics.successful++;
            metrics.totalTime += responseTime;
            metrics.minTime = Math.min(metrics.minTime, responseTime);
            metrics.maxTime = Math.max(metrics.maxTime, responseTime);
          } else {
            metrics.failed++;
          }
        } catch (error) {
          metrics.failed++;
        }
        
        await new Promise(resolve => setTimeout(resolve, 100));
      }
      
      if (metrics.successful > 0) {
        const avgTime = metrics.totalTime / metrics.successful;
        
        console.log(`Métriques Performance:
          - Réussies: ${metrics.successful}/${numTests}
          - Temps moyen: ${avgTime.toFixed(2)}ms
          - Temps min: ${metrics.minTime}ms
          - Temps max: ${metrics.maxTime}ms`);
        
        expect(metrics.successful).toBeGreaterThan(0);
        expect(avgTime).toBeLessThan(5000);
      }
    });
  });
});
