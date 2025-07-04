// Tests simplifiés des consoles HTTP - sans import de modules problématiques
const fs = require('fs');
const path = require('path');

describe('Tests des Consoles HTTP', () => {
  describe('Architecture et Fichiers des Consoles', () => {
    test('Les fichiers de consoles HTTP existent', () => {
      const posPath = path.join(__dirname, '../src/interfaces/console/PosConsoleHttp.js');
      const maisonMerePath = path.join(__dirname, '../src/interfaces/console/MaisonMereConsoleHttp.js');
      
      expect(fs.existsSync(posPath)).toBe(true);
      expect(fs.existsSync(maisonMerePath)).toBe(true);
    });

    test('Les consoles contiennent les URLs API correctes', () => {
      const posPath = path.join(__dirname, '../src/interfaces/console/PosConsoleHttp.js');
      const maisonMerePath = path.join(__dirname, '../src/interfaces/console/MaisonMereConsoleHttp.js');
      
      const posConsoleContent = fs.readFileSync(posPath, 'utf8');
      const maisonMereConsoleContent = fs.readFileSync(maisonMerePath, 'utf8');
      
      // Vérifier que les consoles utilisent HTTP et non des connexions directes
      expect(posConsoleContent).toContain('axios');
      expect(posConsoleContent).toContain('http://localhost:8000');
      expect(maisonMereConsoleContent).toContain('axios');
      expect(maisonMereConsoleContent).toContain('http://localhost:8000');
    });

    test('Les consoles utilisent le Load Balancer HTTP', () => {
      const posPath = path.join(__dirname, '../src/interfaces/console/PosConsoleHttp.js');
      const maisonMerePath = path.join(__dirname, '../src/interfaces/console/MaisonMereConsoleHttp.js');
      
      const posConsoleContent = fs.readFileSync(posPath, 'utf8');
      const maisonMereConsoleContent = fs.readFileSync(maisonMerePath, 'utf8');
      
      // Vérifier que les consoles n'accèdent pas directement à la base de données
      expect(posConsoleContent).not.toContain('require(\'../models');
      expect(posConsoleContent).not.toContain('sequelize');
      expect(maisonMereConsoleContent).not.toContain('require(\'../models');
      expect(maisonMereConsoleContent).not.toContain('sequelize');
      
      // Vérifier qu'elles utilisent l'API HTTP
      expect(posConsoleContent).toContain('/api/v1');
      expect(maisonMereConsoleContent).toContain('/api/v1');
    });

    test('Les consoles sont prêtes pour la production Docker', () => {
      const posPath = path.join(__dirname, '../src/interfaces/console/PosConsoleHttp.js');
      const maisonMerePath = path.join(__dirname, '../src/interfaces/console/MaisonMereConsoleHttp.js');
      
      const posConsoleContent = fs.readFileSync(posPath, 'utf8');
      const maisonMereConsoleContent = fs.readFileSync(maisonMerePath, 'utf8');
      
      // Vérifier que les consoles acceptent des URLs configurables (pour Docker)
      expect(posConsoleContent).toMatch(/constructor.*apiBaseUrl/);
      expect(maisonMereConsoleContent).toMatch(/constructor.*apiBaseUrl/);
    });
  });
});