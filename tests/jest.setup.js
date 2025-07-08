/**
 * Setup Jest - Configuration avant chaque test
 */

// Augmenter les timeouts pour les tests réseau
jest.setTimeout(30000);

// Variables d'environnement pour les tests
process.env.NODE_ENV = 'test';
process.env.LOG_LEVEL = 'error'; // Réduire les logs pendant les tests

// Configuration globale pour les tests
global.TEST_CONFIG = {
  services: {
    legacy: 'http://localhost:3000',
    produitService1: 'http://localhost:3001',
    venteService: 'http://localhost:3004',
    produitService2: 'http://localhost:3005',
    produitService3: 'http://localhost:3006',
    stockService: 'http://localhost:3007',
    reportingService: 'http://localhost:3008',
    hybridRouter: 'http://localhost:9000',
    loadBalancer: 'http://localhost:8000',
    kongGateway: 'http://localhost:8001',
    kongAdmin: 'http://localhost:8002',
    prometheus: 'http://localhost:9090',
    grafana: 'http://localhost:3333'
  },
  timeouts: {
    short: 3000,
    medium: 5000,
    long: 10000
  }
};

// Helpers globaux pour les tests
global.testHelpers = {
  // Attendre un délai
  wait: (ms) => new Promise(resolve => setTimeout(resolve, ms)),
  
  // Générer un ID unique pour les tests
  generateTestId: () => `test-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
  
  // Nettoyer les headers de réponse pour les assertions
  cleanHeaders: (headers) => {
    const cleaned = {};
    Object.keys(headers).forEach(key => {
      if (typeof headers[key] === 'string') {
        cleaned[key.toLowerCase()] = headers[key];
      }
    });
    return cleaned;
  },
  
  // Vérifier si un service est accessible
  isServiceAccessible: async (url) => {
    const request = require('supertest');
    try {
      const response = await request(url)
        .get('/health')
        .timeout(3000);
      return response.status === 200;
    } catch (error) {
      try {
        const response = await request(url)
          .get('/')
          .timeout(3000);
        return [200, 404, 302].includes(response.status);
      } catch (innerError) {
        return false;
      }
    }
  }
};

// Mock console si nécessaire pour réduire le bruit
const originalConsole = console;
global.console = {
  ...originalConsole,
  // Garder les erreurs importantes
  error: originalConsole.error,
  warn: originalConsole.warn,
  // Réduire les logs info/debug pendant les tests
  log: process.env.VERBOSE_TESTS === 'true' ? originalConsole.log : () => {},
  info: process.env.VERBOSE_TESTS === 'true' ? originalConsole.info : () => {},
  debug: () => {}
};

// Handlers d'erreurs globales pour éviter les crash de tests
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
});

// Message de début des tests
if (process.env.VERBOSE_TESTS === 'true') {
  console.log('🧪 Configuration Jest chargée pour l\'architecture hybride');
  console.log('📝 Services configurés:', Object.keys(global.TEST_CONFIG.services).length);
}
