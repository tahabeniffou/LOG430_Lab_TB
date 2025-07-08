/**
 * Jest Sequencer - Définit l'ordre d'exécution des tests
 */

const Sequencer = require('@jest/test-sequencer').default;

class CustomSequencer extends Sequencer {
  sort(tests) {
    // Définir l'ordre logique d'exécution des tests
    const testOrder = [
      'setup.test.js',      // Configuration d'abord
      'health.test.js',     // Santé des services
      'security.test.js',   // Sécurité
      'routing.test.js',    // Routage
      'performance.test.js', // Performance
      'monitoring.test.js', // Monitoring
      'integration.test.js' // Intégration en dernier
    ];

    return tests.sort((testA, testB) => {
      const aName = testA.path.split('/').pop();
      const bName = testB.path.split('/').pop();
      
      const aIndex = testOrder.indexOf(aName);
      const bIndex = testOrder.indexOf(bName);
      
      // Si les deux tests sont dans l'ordre défini
      if (aIndex !== -1 && bIndex !== -1) {
        return aIndex - bIndex;
      }
      
      // Si seul A est dans l'ordre, il passe en premier
      if (aIndex !== -1) return -1;
      
      // Si seul B est dans l'ordre, il passe en premier
      if (bIndex !== -1) return 1;
      
      // Sinon, ordre alphabétique
      return aName.localeCompare(bName);
    });
  }
}

module.exports = CustomSequencer;
