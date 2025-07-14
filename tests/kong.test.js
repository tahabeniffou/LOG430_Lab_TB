/**
 * Tests Kong Gateway - Configuration
 * Tests statiques de la configuration Kong
 */

const fs = require('fs');
const path = require('path');

describe('Kong Gateway Tests', () => {
  describe('Configuration Kong', () => {
    test('Docker Compose contient Kong Gateway', () => {
      const dockerPath = path.join(__dirname, '..', 'docker-compose.yml');
      const content = fs.readFileSync(dockerPath, 'utf8');
      
      expect(content).toContain('kong:');
      expect(content).toContain('image: kong:3.4');
    });

    test('Kong utilise les bons ports', () => {
      const dockerPath = path.join(__dirname, '..', 'docker-compose.yml');
      const content = fs.readFileSync(dockerPath, 'utf8');
      
      expect(content).toContain('8000:8000');  // Kong Proxy
      expect(content).toContain('8001:8001');  // Kong Admin
      expect(content).toContain('8002:8002');  // Kong Manager
    });

    test('Kong Database configurée', () => {
      const dockerPath = path.join(__dirname, '..', 'docker-compose.yml');
      const content = fs.readFileSync(dockerPath, 'utf8');
      
      expect(content).toContain('kong-database:');
      expect(content).toContain('POSTGRES_USER: kong');
      expect(content).toContain('POSTGRES_DB: kong');
    });

    test('Kong Migrations configurées', () => {
      const dockerPath = path.join(__dirname, '..', 'docker-compose.yml');
      const content = fs.readFileSync(dockerPath, 'utf8');
      
      expect(content).toContain('kong-migrations:');
      expect(content).toContain('kong migrations bootstrap');
    });

    test('Kong Networks configurés', () => {
      const dockerPath = path.join(__dirname, '..', 'docker-compose.yml');
      const content = fs.readFileSync(dockerPath, 'utf8');
      
      expect(content).toContain('kong-net:');
      expect(content).toContain('pos-network:');
    });
  });

  describe('Kong Scripts', () => {
    test('Script de configuration Kong existe', () => {
      const kongScriptPath = path.join(__dirname, '..', 'config', 'kong-config.sh');
      expect(fs.existsSync(kongScriptPath)).toBe(true);
    });

    test('Configuration Prometheus pour Kong existe', () => {
      const prometheusPath = path.join(__dirname, '..', 'config', 'prometheus-kong.yml');
      expect(fs.existsSync(prometheusPath)).toBe(true);
    });
  });

  describe('Legacy System - Kong Integration', () => {
    test('ApiClient configuré pour Kong Gateway', () => {
      const apiClientPath = path.join(__dirname, '..', 'src', 'services', 'ApiClient.js');
      if (fs.existsSync(apiClientPath)) {
        const content = fs.readFileSync(apiClientPath, 'utf8');
        // Vérifier qu'il utilise bien un gateway URL
        expect(content).toContain('baseURL');
      }
    });

    test('Console POS utilise API Gateway URL', () => {
      const consolePath = path.join(__dirname, '..', 'src', 'appConsole.js');
      const content = fs.readFileSync(consolePath, 'utf8');
      
      expect(content).toContain('API_GATEWAY_URL');
    });

    test('Console Maison Mère utilise API Gateway URL', () => {
      const merePath = path.join(__dirname, '..', 'src', 'maisonMereConsole.js');
      const content = fs.readFileSync(merePath, 'utf8');
      
      expect(content).toContain('API_GATEWAY_URL');
    });
  });

  describe('Kong Health Checks', () => {
    test('Kong a un health check configuré', () => {
      const dockerPath = path.join(__dirname, '..', 'docker-compose.yml');
      const content = fs.readFileSync(dockerPath, 'utf8');
      
      expect(content).toContain('healthcheck:');
      expect(content).toContain('"kong", "health"');
    });

    test('Kong Database a un health check', () => {
      const dockerPath = path.join(__dirname, '..', 'docker-compose.yml');
      const content = fs.readFileSync(dockerPath, 'utf8');
      
      expect(content).toContain('pg_isready -U kong');
    });
  });

  describe('Microservices - Kong Integration', () => {
    test('Microservices sur le même réseau que Kong', () => {
      const dockerPath = path.join(__dirname, '..', 'docker-compose.yml');
      const content = fs.readFileSync(dockerPath, 'utf8');
      
      // Vérifier que les microservices utilisent pos-network
      expect(content).toContain('pos-network');
    });

    test('Package.json contient scripts Kong', () => {
      const packagePath = path.join(__dirname, '..', 'package.json');
      const packageContent = JSON.parse(fs.readFileSync(packagePath, 'utf8'));
      
      expect(packageContent.scripts['start:kong']).toBeDefined();
      expect(packageContent.scripts['stop:kong']).toBeDefined();
    });
  });
});
