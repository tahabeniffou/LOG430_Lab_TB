// Version minimale pour debug
console.log('=== DEBUT DU SCRIPT ===');

try {
  console.log('1. Chargement des modules...');
  const express = require('express');
  console.log('2. Express charge');
  
  const cors = require('cors');
  console.log('3. CORS charge');
  
  const { Sequelize, DataTypes } = require('sequelize');
  console.log('4. Sequelize charge');
  
  require('dotenv').config();
  console.log('5. dotenv configure');
  
  console.log('6. Creation de l\'app Express...');
  const app = express();
  const PORT = process.env.PORT || 3005;
  
  console.log('7. Configuration des middlewares...');
  app.use(cors());
  app.use(express.json());
  
  console.log('8. Configuration de la route de test...');
  app.get('/health', (req, res) => {
    console.log('Route /health appelee');
    res.json({
      status: 'OK',
      service: 'reporting-service-debug',
      timestamp: new Date().toISOString()
    });
  });
  
  console.log('9. Demarrage du serveur...');
  app.listen(PORT, (err) => {
    if (err) {
      console.error('ERREUR lors du demarrage:', err);
    } else {
      console.log(`SERVEUR DEMARRE SUR LE PORT ${PORT}`);
      console.log(`Test: http://localhost:${PORT}/health`);
    }
  });
  
  console.log('10. Configuration terminee');
  
} catch (error) {
  console.error('ERREUR GLOBALE:', error);
  console.error('Stack:', error.stack);
}
