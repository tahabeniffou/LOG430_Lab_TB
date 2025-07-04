// Configuration globale pour les tests Jest
jest.setTimeout(10000); // 10 secondes max par test

// Mock complet de chalk pour éviter les erreurs avec inquirer
jest.mock('chalk', () => {
  const mockColor = jest.fn(text => text);
  return {
    // Couleurs de base
    red: mockColor,
    green: mockColor,
    blue: mockColor,
    yellow: mockColor,
    cyan: mockColor,
    magenta: mockColor,
    white: mockColor,
    black: mockColor,
    gray: mockColor,
    grey: mockColor,
    
    // Styles
    bold: {
      blue: mockColor,
      red: mockColor,
      green: mockColor,
      yellow: mockColor,
      cyan: mockColor,
      magenta: mockColor,
      white: mockColor
    },
    
    // Toutes les autres méthodes retournent simplement le texte
    ...Object.fromEntries(['red', 'green', 'blue', 'yellow', 'cyan', 'magenta', 'white', 'black', 'gray', 'grey'].map(color => [color, mockColor]))
  };
});

jest.mock('cli-table3', () => {
  return jest.fn().mockImplementation(() => ({
    push: jest.fn(),
    toString: jest.fn(() => 'Mocked Table')
  }));
});

// Mock du service Redis
jest.mock('../src/api/cache/redisService', () => ({
  get: jest.fn(),
  set: jest.fn(),
  del: jest.fn(),
  flushall: jest.fn()
}));

// Mock global de console.log pour éviter les sorties pendant les tests
const originalConsole = global.console;
global.console = {
  ...originalConsole,
  log: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
  info: jest.fn(),
  clear: jest.fn()
};

// Mock partiel de process pour préserver les méthodes essentielles
const originalProcess = global.process;
global.process = {
  ...originalProcess,
  exit: jest.fn()
};

// Configuration pour éviter les warnings
process.env.NODE_ENV = 'test';