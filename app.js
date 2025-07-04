const express = require('express');
const cors = require('cors');
const { sequelize } = require('./src/models');
const { metricsMiddleware, metricsRouter } = require('./src/api/metrics');
const redisService = require('./src/api/cache/redisService');
const logger = require('./src/api/logger');

const app = express();

// Middleware de base
app.use(cors());
app.use(express.json());
app.use(metricsMiddleware);
app.use(metricsRouter);

// Logging des requêtes
app.use((req, res, next) => {
  logger.info(`${req.method} ${req.originalUrl}`, { ip: req.ip });
  next();
});

// Routes de santé
app.get('/', (req, res) => {
  res.json({ 
    message: '🚀 API LOG430 Lab TB POS', 
    status: 'OK',
    timestamp: new Date().toISOString()
  });
});

app.get('/health', (req, res) => {
  res.json({
    status: 'OK',
    services: {
      database: 'connected',
      redis: redisService.isConnected() ? 'connected' : 'disconnected'
    },
    timestamp: new Date().toISOString()
  });
});

// API Routes - Architecture DDD
const apiRoutes = require('./src/interfaces/api/routes');
app.use('/api/v1', apiRoutes);

// Démarrage du serveur
async function startServer() {
  try {
    // Connexion Redis (optionnelle en mode local)
    logger.info('Connexion à Redis...');
    try {
      const redisConnected = await redisService.connect();
      logger.info(redisConnected ? 'Redis connecté' : 'Redis indisponible - mode fallback');
    } catch (redisError) {
      logger.warn('Redis non disponible en mode local - continuera sans cache:', redisError.message);
    }

    // Synchronisation DB
    await sequelize.sync({ alter: true });
    logger.info('Base de données synchronisée');

    // Démarrage serveur
    const PORT = process.env.PORT || 3000;
    app.listen(PORT, () => {
      logger.info(`Serveur démarré sur port ${PORT}`);
    });

  } catch (error) {
    logger.error('Erreur démarrage serveur:', error);
    process.exit(1);
  }
}

// Gestion des erreurs non gérées
process.on('unhandledRejection', (err) => {
  logger.error('Unhandled Rejection:', err);
  process.exit(1);
});

process.on('SIGTERM', async () => {
  logger.info('SIGTERM reçu, arrêt gracieux...');
  await redisService.disconnect();
  process.exit(0);
});

// Démarrage seulement si ce fichier est exécuté directement
if (require.main === module) {
  startServer();
}

module.exports = app;
