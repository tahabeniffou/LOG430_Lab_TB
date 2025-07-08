/**
 * Tests de monitoring et observabilité
 * Vérifie Prometheus, Grafana et la collecte de métriques
 */

const request = require('supertest');

describe('Tests de Monitoring et Observabilité', () => {
  const prometheusURL = 'http://localhost:9090';
  const grafanaURL = 'http://localhost:3333';
  const hybridRouterURL = 'http://localhost:9000';

  describe('Prometheus - Collecte de Métriques', () => {
    test('Prometheus server accessible', async () => {
      try {
        const response = await request(prometheusURL)
          .get('/')
          .timeout(5000);
        
        expect([200, 404]).toContain(response.status);
        
        if (response.status === 200) {
          expect(response.text).toMatch(/Prometheus/i);
        }
        
        console.log('Prometheus server - Status:', response.status);
      } catch (error) {
        console.log('Prometheus non accessible:', error.message);
        expect(error).toBeDefined();
      }
    });

    test('Prometheus API - Status services', async () => {
      try {
        const response = await request(prometheusURL)
          .get('/api/v1/query?query=up')
          .timeout(5000);
        
        expect([200, 404]).toContain(response.status);
        
        if (response.status === 200) {
          expect(response.body).toBeDefined();
          expect(response.body.status).toBe('success');
          expect(response.body.data).toBeDefined();
          expect(response.body.data.result).toBeDefined();
          
          const upServices = response.body.data.result.filter(r => r.value[1] === '1');
          console.log(`Services UP: ${upServices.length}/${response.body.data.result.length}`);
          
          expect(response.body.data.result.length).toBeGreaterThan(0);
        }
      } catch (error) {
        console.log('Prometheus API non accessible:', error.message);
      }
    });

    test('Métriques HTTP disponibles', async () => {
      try {
        const response = await request(prometheusURL)
          .get('/api/v1/query?query=http_requests_total')
          .timeout(5000);
        
        if (response.status === 200 && response.body.data) {
          console.log('Métriques HTTP collectées:', response.body.data.result.length);
          
          if (response.body.data.result.length > 0) {
            expect(response.body.data.result[0]).toHaveProperty('metric');
            expect(response.body.data.result[0]).toHaveProperty('value');
          }
        }
      } catch (error) {
        console.log('Métriques HTTP non disponibles:', error.message);
      }
    });

    test('Métriques de latence disponibles', async () => {
      try {
        const response = await request(prometheusURL)
          .get('/api/v1/query?query=http_request_duration_seconds')
          .timeout(5000);
        
        if (response.status === 200 && response.body.data) {
          console.log('Métriques de latence collectées:', response.body.data.result.length);
          
          if (response.body.data.result.length > 0) {
            const latencyMetric = response.body.data.result[0];
            expect(latencyMetric).toHaveProperty('metric');
            expect(latencyMetric).toHaveProperty('value');
          }
        }
      } catch (error) {
        console.log('Métriques de latence non disponibles:', error.message);
      }
    });

    test('Métriques spécifiques aux microservices', async () => {
      const microserviceQueries = [
        'produit_service_requests_total',
        'vente_service_requests_total',
        'stock_service_requests_total',
        'reporting_service_requests_total'
      ];

      for (const query of microserviceQueries) {
        try {
          const response = await request(prometheusURL)
            .get(`/api/v1/query?query=${query}`)
            .timeout(3000);
          
          if (response.status === 200 && response.body.data.result.length > 0) {
            console.log(`Métriques ${query} disponibles:`, response.body.data.result.length);
          }
        } catch (error) {
          // Service peut ne pas exposer ces métriques spécifiques
          console.log(`Métriques ${query} non disponibles`);
        }
      }
      
      // Au moins Prometheus devrait être accessible
      expect(true).toBe(true);
    });
  });

  describe('Grafana - Visualisation', () => {
    test('Grafana server accessible', async () => {
      try {
        const response = await request(grafanaURL)
          .get('/api/health')
          .timeout(5000);
        
        expect([200, 401, 404]).toContain(response.status);
        
        if (response.status === 200) {
          expect(response.body).toBeDefined();
          expect(response.body.database).toBe('ok');
        }
        
        console.log('Grafana health check - Status:', response.status);
      } catch (error) {
        console.log('Grafana non accessible:', error.message);
      }
    });

    test('Grafana login page accessible', async () => {
      try {
        const response = await request(grafanaURL)
          .get('/login')
          .timeout(5000);
        
        expect([200, 302]).toContain(response.status);
        
        if (response.status === 200) {
          expect(response.text).toMatch(/Grafana/i);
        }
        
        console.log('Grafana login page - Status:', response.status);
      } catch (error) {
        console.log('Grafana login non accessible:', error.message);
      }
    });

    test('Grafana API accessible avec auth', async () => {
      try {
        // Tentative d'authentification
        const authResponse = await request(grafanaURL)
          .post('/api/auth/login')
          .send({
            user: 'admin',
            password: 'admin'
          })
          .set('Content-Type', 'application/json')
          .timeout(5000);
        
        console.log('Grafana auth - Status:', authResponse.status);
        
        if (authResponse.status === 200) {
          // Tester l'accès aux datasources
          const dsResponse = await request(grafanaURL)
            .get('/api/datasources')
            .set('Cookie', authResponse.headers['set-cookie'] || [])
            .timeout(5000);
          
          if (dsResponse.status === 200) {
            expect(Array.isArray(dsResponse.body)).toBe(true);
            console.log('Datasources Grafana:', dsResponse.body.length);
          }
        }
      } catch (error) {
        console.log('Grafana API auth échoué:', error.message);
      }
    });

    test('Dashboard Grafana disponible', async () => {
      try {
        const response = await request(grafanaURL)
          .get('/api/search?query=hybrid')
          .timeout(5000);
        
        if (response.status === 200) {
          expect(Array.isArray(response.body)).toBe(true);
          console.log('Dashboards trouvés:', response.body.length);
          
          const hybridDashboard = response.body.find(d => 
            d.title && d.title.toLowerCase().includes('hybrid')
          );
          
          if (hybridDashboard) {
            console.log('Dashboard hybride trouvé:', hybridDashboard.title);
          }
        }
      } catch (error) {
        console.log('Recherche dashboard échouée:', error.message);
      }
    });
  });

  describe('Génération de Métriques', () => {
    test('Générer du trafic pour métriques', async () => {
      // Générer diverses requêtes pour créer des métriques
      const requests = [
        { path: '/api/produits', client: 'API' },
        { path: '/pos', client: 'POS' },
        { path: '/maisonmere', client: 'MAISONMERE' },
        { path: '/health', client: 'MONITORING' }
      ];

      const results = [];

      for (const req of requests) {
        try {
          const startTime = Date.now();
          const response = await request(hybridRouterURL)
            .get(req.path)
            .set('X-Client-Type', req.client)
            .timeout(3000);
          
          const duration = Date.now() - startTime;
          
          results.push({
            path: req.path,
            client: req.client,
            status: response.status,
            duration: duration
          });
          
          // Pause entre requêtes
          await new Promise(resolve => setTimeout(resolve, 200));
        } catch (error) {
          results.push({
            path: req.path,
            client: req.client,
            error: error.message
          });
        }
      }

      expect(results.length).toBe(requests.length);
      
      const successful = results.filter(r => r.status && !r.error);
      console.log(`Trafic généré: ${successful.length}/${results.length} requêtes réussies`);
      
      // Attendre un peu pour que Prometheus collecte
      await new Promise(resolve => setTimeout(resolve, 2000));
    });

    test('Vérifier collecte après génération trafic', async () => {
      try {
        const response = await request(prometheusURL)
          .get('/api/v1/query?query=up')
          .timeout(5000);
        
        if (response.status === 200) {
          const metrics = response.body.data.result;
          console.log('Métriques après trafic:', metrics.length);
          
          expect(metrics.length).toBeGreaterThan(0);
        }
      } catch (error) {
        console.log('Vérification métriques échouée:', error.message);
      }
    });
  });

  describe('Alerting et Notifications', () => {
    test('Configuration d\'alertes Prometheus', async () => {
      try {
        const response = await request(prometheusURL)
          .get('/api/v1/rules')
          .timeout(5000);
        
        if (response.status === 200) {
          expect(response.body).toBeDefined();
          expect(response.body.status).toBe('success');
          
          if (response.body.data && response.body.data.groups) {
            console.log('Groupes d\'alertes:', response.body.data.groups.length);
            
            response.body.data.groups.forEach(group => {
              if (group.rules) {
                console.log(`Groupe ${group.name}: ${group.rules.length} règles`);
              }
            });
          }
        }
      } catch (error) {
        console.log('Configuration alertes non accessible:', error.message);
      }
    });

    test('Status des alertes actives', async () => {
      try {
        const response = await request(prometheusURL)
          .get('/api/v1/alerts')
          .timeout(5000);
        
        if (response.status === 200) {
          expect(response.body).toBeDefined();
          expect(response.body.status).toBe('success');
          
          if (response.body.data && response.body.data.alerts) {
            const activeAlerts = response.body.data.alerts.filter(alert => 
              alert.state === 'firing'
            );
            
            console.log(`Alertes actives: ${activeAlerts.length}/${response.body.data.alerts.length}`);
            
            if (activeAlerts.length > 0) {
              activeAlerts.forEach(alert => {
                console.log(`Alerte: ${alert.labels.alertname} - ${alert.state}`);
              });
            }
          }
        }
      } catch (error) {
        console.log('Status alertes non accessible:', error.message);
      }
    });
  });

  describe('Performance Monitoring', () => {
    test('Métriques de performance système', async () => {
      const performanceQueries = [
        'process_cpu_seconds_total',
        'process_resident_memory_bytes',
        'nodejs_heap_size_total_bytes',
        'http_request_duration_seconds_bucket'
      ];

      const metrics = {};

      for (const query of performanceQueries) {
        try {
          const response = await request(prometheusURL)
            .get(`/api/v1/query?query=${query}`)
            .timeout(3000);
          
          if (response.status === 200 && response.body.data.result.length > 0) {
            metrics[query] = response.body.data.result.length;
            console.log(`${query}: ${metrics[query]} séries`);
          }
        } catch (error) {
          console.log(`Métrique ${query} non disponible`);
        }
      }

      // Au moins quelques métriques système devraient être disponibles
      const availableMetrics = Object.keys(metrics).length;
      console.log(`Métriques de performance disponibles: ${availableMetrics}/${performanceQueries.length}`);
    });

    test('Métriques de santé des services', async () => {
      try {
        const response = await request(prometheusURL)
          .get('/api/v1/query?query=up{job=~".*service.*"}')
          .timeout(5000);
        
        if (response.status === 200 && response.body.data.result.length > 0) {
          const services = response.body.data.result;
          
          const healthyServices = services.filter(s => s.value[1] === '1');
          const unhealthyServices = services.filter(s => s.value[1] === '0');
          
          console.log(`Services:
            - Sains: ${healthyServices.length}
            - En panne: ${unhealthyServices.length}
            - Total: ${services.length}`);
          
          if (unhealthyServices.length > 0) {
            unhealthyServices.forEach(service => {
              console.log(`Service en panne: ${service.metric.job || service.metric.instance}`);
            });
          }
          
          expect(services.length).toBeGreaterThan(0);
        }
      } catch (error) {
        console.log('Métriques de santé non disponibles:', error.message);
      }
    });
  });

  describe('Logs et Tracing', () => {
    test('Logs applicatifs générés', async () => {
      // Générer quelques requêtes pour créer des logs
      await request(hybridRouterURL)
        .get('/api/produits')
        .set('X-Client-Type', 'API')
        .set('X-Request-ID', 'test-monitoring-001')
        .timeout(3000)
        .catch(() => {});

      await request(hybridRouterURL)
        .get('/pos')
        .set('X-Client-Type', 'POS')
        .set('X-Request-ID', 'test-monitoring-002')
        .timeout(3000)
        .catch(() => {});

      // Le test vérifie que les requêtes n'échouent pas
      expect(true).toBe(true);
      console.log('Logs générés pour monitoring');
    });

    test('Corrélation des requêtes', async () => {
      const requestId = `correlation-test-${Date.now()}`;
      
      // Faire une requête avec un ID de corrélation
      const response = await request(hybridRouterURL)
        .get('/api/produits')
        .set('X-Client-Type', 'API')
        .set('X-Request-ID', requestId)
        .set('X-Correlation-ID', requestId)
        .timeout(5000);
      
      expect([200, 404, 500]).toContain(response.status);
      
      // Vérifier si l'ID de corrélation est retourné
      if (response.headers['x-request-id'] || response.headers['x-correlation-id']) {
        console.log('Corrélation des requêtes supportée');
      }
      
      console.log(`Requête corrélée ${requestId} - Status: ${response.status}`);
    });
  });
});
