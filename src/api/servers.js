// src// const restApi       = require('./rest');    // ← Module supprimé - routes migrées vers microservicesapi/servers.js

require('dotenv').config();
require('../models/associations');
const express       = require('express');
const cors          = require('cors');
const restApi       = require('./rest');    // ← c’est maintenant un Router
const swaggerJsdoc  = require('swagger-jsdoc');
const swaggerUi     = require('swagger-ui-express');
const redocExpress  = require('redoc-express');
const logger = require('./logger');
const client = require('prom-client');
const { metricsMiddleware } = require('./metrics');

const app = express();

// 1) Exposer /metrics directement ici (plus besoin de metricsRouter)
app.get('/metrics', async (req, res) => {
  res.set('Content-Type', client.register.contentType);
  res.end(await client.register.metrics());
});

// 2) Middlewares globaux
app.use(cors({ origin: process.env.CORS_ORIGINS?.split(',') || '*' }));
app.use(express.json());
app.use(metricsMiddleware); // Ajout du middleware Prometheus juste après les middlewares globaux

// Logging structuré pour toutes les requêtes
app.use((req, res, next) => {
  logger.info({
    message: 'Requête entrante',
    method: req.method,
    url: req.originalUrl,
    ip: req.ip
  });
  next();
});

// 0) route racine pour éviter le "pending" sur "/"
app.get('/', (req, res) => {
  // ou res.redirect('/api-docs');
  res.send('🚀 API LOG430 Lab TB POS – en marche !');
});

// 1) Routes legacy supprimées - fonctionnalités migrées vers les microservices
// Seules les routes de système restent actives (health, metrics, documentation)

// 2) génération du spec OpenAPI à partir de vos JSDoc dans les routes
const swaggerSpec = swaggerJsdoc({
  definition: {
    openapi: '3.0.3',
    info: {
      title:       'LOG430 Lab TB POS API',
      version:     '1.0.0',
      description: 'Documentation des endpoints REST pour le POS et la maison-mère'
    },
    servers: [{ url: 'http://localhost:3000/api/v1' }]
  },
  apis: [__dirname + '/rest/routes/*.js']
});

// 3) point d’entrée Swagger-UI
app.use(
  '/api-docs',
  swaggerUi.serve,
  swaggerUi.setup(swaggerSpec, { explorer: true })
);

// 4) point d’accès ReDoc (facultatif)
app.get(
  '/redoc',
  redocExpress({
    title:   'API LOG430 Lab TB POS',
    specUrl: '/api-docs/swagger.json'
  })
);

// 5) servir le JSON brut pour Redoc
app.get('/api-docs/swagger.json', (req, res) => {
  res.json(swaggerSpec);
});

// 6) handler “catch-all” pour les 404
app.use((req, res) => {
  res.status(404).json({
    timestamp: new Date().toISOString(),
    status:    404,
    error:     'Not Found',
    message:   `Pas de route pour ${req.originalUrl}`,
    path:      req.originalUrl
  });
});

// 7) handler d’erreurs (500, etc.)
app.use((err, req, res, next) => {
  logger.error({
    message: err.message,
    stack: err.stack,
    url: req.originalUrl,
    status: err.status || 500
  });
  res.status(err.status || 500).json({
    timestamp: new Date().toISOString(),
    status:    err.status || 500,
    error:     err.name,
    message:   err.message,
    path:      req.originalUrl
  });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`API démarrée sur le port ${PORT}`));
