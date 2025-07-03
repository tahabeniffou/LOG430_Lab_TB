const express = require('express');
const cors = require('cors');
const { sequelize } = require('./src/models');
require('./src/models/associations');
const { metricsMiddleware, metricsRouter } = require('./src/api/metrics');
const redisService = require('./src/api/cache/redisService');

const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(metricsMiddleware); // Instrumentation Prometheus
app.use(metricsRouter); // Expose /metrics

// Route racine
app.get('/', (req, res) => {
  res.json({ message: '🚀 API LOG430 Lab TB POS – en marche !', status: 'OK' });
});

// Route de santé (health check)
app.get('/api/health', (req, res) => {
  res.json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    service: 'LOG430 Lab TB API'
  });
});

// Attacher les routes API (toujours, même en test)
const api = require('./src/api/rest');
app.use('/api/v1', api);

async function startServer() {
  try {
    // Initialiser Redis
    console.log('🔌 Connexion à Redis...');
    const redisConnected = await redisService.connect();
    if (redisConnected) {
      console.log('✅ Redis connecté - Cache activé');
    } else {
      console.log('⚠️  Redis non connecté - Fonctionnement sans cache');
    }

    await sequelize.sync({ alter: true });
    console.log('✅ Base de données synchronisée');
    const PORT = process.env.PORT || 3000;
    app.listen(PORT, () => {
      console.log(`🚀 API démarrée sur le port ${PORT}`);
    });
  } catch (error) {
    console.error('❌ Erreur au démarrage:', error);
  }
}

if (require.main === module) {
  startServer();
}

// Gestion propre de l'arrêt du serveur
process.on('SIGINT', async () => {
  console.log('🛑 Arrêt du serveur...');
  await redisService.disconnect();
  console.log('✅ Redis déconnecté');
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('🛑 Arrêt du serveur...');
  await redisService.disconnect();
  console.log('✅ Redis déconnecté');
  process.exit(0);
});

module.exports = app;
