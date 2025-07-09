/**
 * Configuration Jest pour les tests de l'architecture hybride
 * Configuration consolidée pour Windows/PowerShell
 */

module.exports = {
  // Environnement de test
  testEnvironment: 'node',
  
  // Timeout global pour tous les tests
  testTimeout: 30000,
  
  // Patterns de fichiers de tests
  testMatch: [
    '**/tests/**/*.test.js',
    '**/__tests__/**/*.js',
    '**/?(*.)+(spec|test).js'
  ],
  
  // Fichiers à ignorer
  testPathIgnorePatterns: [
    '/node_modules/',
    '/coverage/',
    '/reports/',
    '/scripts/'
  ],
  
  // Configuration de la couverture de code
  collectCoverage: false, // Activé uniquement quand demandé
  collectCoverageFrom: [
    '*.js',
    'src/**/*.js',
    'microservices/**/*.js',
    '!node_modules/**',
    '!coverage/**',
    '!reports/**',
    '!tests/**',
    '!jest.config.js',
    '!eslint.config.mjs'
  ],
  
  // Répertoire de sortie pour la couverture
  coverageDirectory: 'reports/coverage',
  
  // Format des rapports de couverture
  coverageReporters: [
    'text',
    'lcov',
    'html',
    'json'
  ],
  
  // Seuils de couverture (optionnel)
  coverageThreshold: {
    global: {
      branches: 50,
      functions: 50,
      lines: 60,
      statements: 60
    }
  },
  
  // Setup avant tous les tests
  setupFilesAfterEnv: ['<rootDir>/tests/jest.setup.js'],
  
  // Variables d'environnement pour les tests
  testEnvironmentOptions: {
    NODE_ENV: 'test'
  },
  
  // Transformation des modules (si nécessaire)
  transform: {},
  
  // Extensions de fichiers supportées
  moduleFileExtensions: ['js', 'json', 'node'],
  
  // Verbosité des tests
  verbose: true,
  
  // Couleurs dans la sortie
  colors: true,
  
  // Comportement en cas d'échec
  bail: false, // Continue même si un test échoue
  
  // Cache Jest
  cache: true,
  cacheDirectory: '<rootDir>/.jest-cache',
  
  // Ordre d'exécution des tests
  testSequencer: '<rootDir>/tests/jest.sequencer.js',
  
  // Reporters personnalisés
  reporters: [
    'default',
    ['jest-html-reporters', {
      publicPath: './reports',
      filename: 'jest-report.html',
      expand: true,
      hideIcon: false,
      pageTitle: 'Tests Architecture Hybride'
    }]
  ],
  
  // Modules à mocker automatiquement
  automock: false,
  
  // Fichiers de setup global
  globalSetup: '<rootDir>/tests/jest.globalSetup.js',
  globalTeardown: '<rootDir>/tests/jest.globalTeardown.js'
};
