const express = require('express');
const cors = require('cors');
const client = require('prom-client');

console.log('Démarrage du reporting service...');

const app = express();
const PORT = process.env.PORT || 3004;

// Configuration des métriques Prometheus
const register = new client.Registry();
client.collectDefaultMetrics({ register });

// Métriques personnalisées pour le reporting service
const httpRequestCounter = new client.Counter({
  name: 'reporting_http_requests_total',
  help: 'Total number of HTTP requests to reporting service',
  labelNames: ['method', 'route', 'status']
});

const httpRequestDuration = new client.Histogram({
  name: 'reporting_http_request_duration_seconds',
  help: 'Duration of HTTP requests in seconds',
  labelNames: ['method', 'route']
});

const reportsGenerated = new client.Counter({
  name: 'reporting_reports_generated_total',
  help: 'Total number of reports generated',
  labelNames: ['type']
});

register.registerMetric(httpRequestCounter);
register.registerMetric(httpRequestDuration);
register.registerMetric(reportsGenerated);

app.use(cors());
app.use(express.json());

// Middleware pour métriques
app.use((req, res, next) => {
  const start = Date.now();
  
  res.on('finish', () => {
    const duration = (Date.now() - start) / 1000;
    httpRequestCounter.inc({
      method: req.method,
      route: req.route?.path || req.path,
      status: res.statusCode
    });
    httpRequestDuration.observe({
      method: req.method,
      route: req.route?.path || req.path
    }, duration);
  });
  
  next();
});

console.log('Express configuré avec métriques');

// Endpoint Prometheus pour les métriques
app.get('/metrics', async (req, res) => {
  res.set('Content-Type', register.contentType);
  res.end(await register.metrics());
});

// Route de santé
app.get('/health', (req, res) => {
  console.log('Health check appelé');
  res.json({
    status: 'OK',
    service: 'reporting-service',
    timestamp: new Date().toISOString(),
    version: '1.0.0'
  });
});

// Route de test
app.get('/test', (req, res) => {
  console.log('Route test appelée');
  res.json({ 
    message: 'Service reporting fonctionne!',
    timestamp: new Date().toISOString()
  });
});

// Routes pour les rapports
app.get('/api/reports', (req, res) => {
  console.log('Route reports appelée');
  reportsGenerated.inc({ type: 'summary' });
  
  res.json({
    totalVentes: 127,
    totalRevenu: 45678.90,
    ventesParMagasin: [
      { magasinId: 1, magasinNom: 'Magasin Centre', totalVentes: 85, revenu: 28456.50 },
      { magasinId: 2, magasinNom: 'Magasin Nord', totalVentes: 42, revenu: 17222.40 }
    ],
    ventesRecentes: [
      {
        id: 1,
        produitNom: 'Ordinateur Portable',
        quantite: 2,
        montantTotal: 1799.98,
        magasinNom: 'Magasin Centre',
        dateVente: new Date().toISOString()
      },
      {
        id: 2,
        produitNom: 'Souris Wireless',
        quantite: 5,
        montantTotal: 149.95,
        magasinNom: 'Magasin Nord',
        dateVente: new Date(Date.now() - 3600000).toISOString()
      }
    ],
    timestamp: new Date().toISOString()
  });
});

app.get('/api/reports/ventes', (req, res) => {
  console.log('Route reports/ventes appelée');
  reportsGenerated.inc({ type: 'ventes' });
  
  res.json({
    ventes: [
      {
        id: 1,
        produitId: 1,
        produitNom: 'Ordinateur Portable',
        quantite: 2,
        prixUnitaire: 899.99,
        montantTotal: 1799.98,
        magasinId: 1,
        magasinNom: 'Magasin Centre',
        dateVente: new Date().toISOString(),
        statut: 'completed'
      },
      {
        id: 2,
        produitId: 2,
        produitNom: 'Souris Wireless',
        quantite: 5,
        prixUnitaire: 29.99,
        montantTotal: 149.95,
        magasinId: 2,
        magasinNom: 'Magasin Nord',
        dateVente: new Date(Date.now() - 3600000).toISOString(),
        statut: 'completed'
      }
    ],
    total: 2,
    timestamp: new Date().toISOString()
  });
});

app.get('/api/reports/stock', (req, res) => {
  console.log('Route reports/stock appelée');
  reportsGenerated.inc({ type: 'stock' });
  
  res.json({
    stock: [
      {
        produitId: 1,
        produitNom: 'Ordinateur Portable',
        quantiteDisponible: 15,
        quantiteReservee: 3,
        seuilAlerte: 5,
        statut: 'disponible',
        magasinId: 1,
        magasinNom: 'Magasin Centre'
      },
      {
        produitId: 2,
        produitNom: 'Souris Wireless',
        quantiteDisponible: 45,
        quantiteReservee: 0,
        seuilAlerte: 10,
        statut: 'disponible',
        magasinId: 2,
        magasinNom: 'Magasin Nord'
      }
    ],
    alertes: [
      {
        produitId: 3,
        produitNom: 'Clavier Mécanique',
        quantiteDisponible: 2,
        seuilAlerte: 5,
        statut: 'stock_faible'
      }
    ],
    timestamp: new Date().toISOString()
  });
});

app.get('/api/reports/mouvements', (req, res) => {
  console.log('Route reports/mouvements appelée');
  reportsGenerated.inc({ type: 'mouvements' });
  
  res.json({
    mouvements: [
      {
        id: 1,
        produitId: 1,
        produitNom: 'Ordinateur Portable',
        type: 'vente',
        quantite: -2,
        magasinId: 1,
        magasinNom: 'Magasin Centre',
        dateCreation: new Date().toISOString(),
        reference: 'VENTE-001'
      },
      {
        id: 2,
        produitId: 2,
        produitNom: 'Souris Wireless',
        type: 'approvisionnement',
        quantite: +50,
        magasinId: 2,
        magasinNom: 'Magasin Nord',
        dateCreation: new Date(Date.now() - 7200000).toISOString(),
        reference: 'APPRO-001'
      }
    ],
    total: 2,
    timestamp: new Date().toISOString()
  });
});

// Route pour les statistiques financières
app.get('/api/reports/finances', (req, res) => {
  console.log('Route reports/finances appelée');
  reportsGenerated.inc({ type: 'finances' });
  
  res.json({
    revenus: {
      aujourd_hui: 1949.93,
      cette_semaine: 12789.45,
      ce_mois: 45678.90,
      cette_annee: 234567.80
    },
    ventesParPeriode: [
      { periode: '2024-01', montant: 38456.70, nombre_ventes: 234 },
      { periode: '2024-02', montant: 42123.80, nombre_ventes: 267 },
      { periode: '2024-03', montant: 45678.90, nombre_ventes: 289 }
    ],
    topProduits: [
      { produitId: 1, produitNom: 'Ordinateur Portable', revenus: 17999.80, quantite_vendue: 20 },
      { produitId: 2, produitNom: 'Souris Wireless', revenus: 1199.50, quantite_vendue: 40 }
    ],
    timestamp: new Date().toISOString()
  });
});

// Gestion des erreurs
app.use((err, req, res, next) => {
  console.error('Erreur dans reporting-service:', err);
  res.status(500).json({
    error: 'Erreur interne du service de reporting',
    timestamp: new Date().toISOString()
  });
});

// Route 404
app.use('*', (req, res) => {
  res.status(404).json({
    error: 'Route non trouvée',
    path: req.originalUrl,
    timestamp: new Date().toISOString()
  });
});

// Démarrage du serveur
app.listen(PORT, () => {
  console.log(`✅ Reporting Service démarré sur le port ${PORT}`);
  console.log(`📊 Test: http://localhost:${PORT}/test`);
  console.log(`❤️ Health: http://localhost:${PORT}/health`);
  console.log(`📈 Metrics: http://localhost:${PORT}/metrics`);
  console.log(`📋 Reports: http://localhost:${PORT}/api/reports`);
});

console.log('✅ Configuration terminée');
