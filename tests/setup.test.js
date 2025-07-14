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
      const kongConfigPath = path.join(__dirname, '..', 'config', 'kong-config.sh');
      expect(fs.existsSync(kongConfigPath)).toBe(true);
    });

    test('Configuration Prometheus Kong existe', () => {
      const prometheusConfigPath = path.join(__dirname, '..', 'config', 'prometheus-kong.yml');
      expect(fs.existsSync(prometheusConfigPath)).toBe(true);
    });

    test('Package.json existe', () => {
      const packagePath = path.join(__dirname, '..', 'package.json');
      expect(fs.existsSync(packagePath)).toBe(true);
    });

    test('Kong Gateway configuré dans Docker Compose', () => {
      const dockerComposePath = path.join(__dirname, '..', 'docker-compose.yml');
      const content = fs.readFileSync(dockerComposePath, 'utf8');
      expect(content).toContain('kong:');
      expect(content).toContain('8000:8000');
      expect(content).toContain('kong-database:');
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

    test('Microservices ont package.json', () => {
      const services = ['produit-service', 'vente-service', 'stock-service', 'reporting-service'];
      services.forEach(service => {
        const packagePath = path.join(microservicesPath, service, 'package.json');
        expect(fs.existsSync(packagePath)).toBe(true);
      });
    });
  });

  describe('Legacy System', () => {
    test('Console POS existe', () => {
      const consolePath = path.join(__dirname, '..', 'src', 'appConsole.js');
      expect(fs.existsSync(consolePath)).toBe(true);
    });

    test('Console Maison Mère existe', () => {
      const merePath = path.join(__dirname, '..', 'src', 'maisonMereConsole.js');
      expect(fs.existsSync(merePath)).toBe(true);
    });

    test('Modèles de données existent', () => {
      const modelsPath = path.join(__dirname, '..', 'src', 'models');
      expect(fs.existsSync(modelsPath)).toBe(true);
    });
  });

  describe('Documentation', () => {
    test('README principal existe', () => {
      const readmePath = path.join(__dirname, '..', 'README.md');
      expect(fs.existsSync(readmePath)).toBe(true);
    });

    test('Documentation technique existe', () => {
      const docsPath = path.join(__dirname, '..', 'documentation');
      expect(fs.existsSync(docsPath)).toBe(true);
    });

    test('ADRs existent', () => {
      const adrPath = path.join(__dirname, '..', 'documentation', 'adr');
      expect(fs.existsSync(adrPath)).toBe(true);
    });
  });

  describe('Tests Kong Gateway', () => {
    test('Configuration Kong dans docker-compose contient les bons ports', () => {
      const dockerComposePath = path.join(__dirname, '..', 'docker-compose.yml');
      const content = fs.readFileSync(dockerComposePath, 'utf8');
      
      // Vérifier les ports Kong
      expect(content).toContain('8000:8000');  // Kong Proxy
      expect(content).toContain('8001:8001');  // Kong Admin
      expect(content).toContain('8002:8002');  // Kong Manager
    });

    test('Kong utilise PostgreSQL comme base de données', () => {
      const dockerComposePath = path.join(__dirname, '..', 'docker-compose.yml');
      const content = fs.readFileSync(dockerComposePath, 'utf8');
      
      expect(content).toContain('kong-database:');
      expect(content).toContain('KONG_DATABASE: postgres');
      expect(content).toContain('postgres:13');
    });

    test('Kong a ses dépendances configurées', () => {
      const dockerComposePath = path.join(__dirname, '..', 'docker-compose.yml');
      const content = fs.readFileSync(dockerComposePath, 'utf8');
      
      expect(content).toContain('kong-migrations:');
      expect(content).toContain('depends_on:');
    });
  });
});
