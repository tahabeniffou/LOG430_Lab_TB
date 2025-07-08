/**
 * Tests de configuration et setup initial
 * Vérifie que l'environnement est correctement configuré
 */

const fs = require('fs');
const path = require('path');

describe('Configuration du Système', () => {
  describe('Fichiers de configuration', () => {
    test('docker-compose.yml existe', () => {
      const dockerComposePath = path.join(__dirname, '..', 'docker-compose.yml');
      expect(fs.existsSync(dockerComposePath)).toBe(true);
    });

    test('Configuration Kong existe', () => {
      const kongConfigPath = path.join(__dirname, '..', 'config', 'kong-hybrid.yml');
      expect(fs.existsSync(kongConfigPath)).toBe(true);
    });

    test('Configuration Prometheus existe', () => {
      const prometheusConfigPath = path.join(__dirname, '..', 'config', 'prometheus-hybrid.yml');
      expect(fs.existsSync(prometheusConfigPath)).toBe(true);
    });

    test('Script de démarrage existe', () => {
      const startScriptPath = path.join(__dirname, '..', 'start.sh');
      expect(fs.existsSync(startScriptPath)).toBe(true);
    });

    test('Hybrid router existe', () => {
      const routerPath = path.join(__dirname, '..', 'hybrid-router.js');
      expect(fs.existsSync(routerPath)).toBe(true);
    });
  });

  describe('Structure des microservices', () => {
    const microservicesPath = path.join(__dirname, '..', 'microservices');
    
    test('Dossier microservices existe', () => {
      expect(fs.existsSync(microservicesPath)).toBe(true);
    });

    test('Produit service existe', () => {
      const produitServicePath = path.join(microservicesPath, 'produit-service');
      expect(fs.existsSync(produitServicePath)).toBe(true);
    });

    test('Vente service existe', () => {
      const venteServicePath = path.join(microservicesPath, 'vente-service');
      expect(fs.existsSync(venteServicePath)).toBe(true);
    });

    test('Stock service existe', () => {
      const stockServicePath = path.join(microservicesPath, 'stock-service');
      expect(fs.existsSync(stockServicePath)).toBe(true);
    });

    test('Reporting service existe', () => {
      const reportingServicePath = path.join(microservicesPath, 'reporting-service');
      expect(fs.existsSync(reportingServicePath)).toBe(true);
    });
  });

  describe('Documentation', () => {
    test('README principal existe', () => {
      const readmePath = path.join(__dirname, '..', 'README.md');
      expect(fs.existsSync(readmePath)).toBe(true);
    });

    test('Documentation Swagger existe', () => {
      const swaggerPath = path.join(__dirname, '..', 'docs', 'swagger-api.yml');
      expect(fs.existsSync(swaggerPath)).toBe(true);
    });

    test('Collection Postman existe', () => {
      const postmanPath = path.join(__dirname, '..', 'docs', 'Architecture_Hybride_Postman.json');
      expect(fs.existsSync(postmanPath)).toBe(true);
    });
  });
});
