// app.js
// Point d'entrée principal de l'application Node.js multi-API

const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const morgan = require('morgan');
const client = require('prom-client');
client.collectDefaultMetrics();

// Counter pour le nombre total de requêtes HTTP
const httpRequestsTotal = new client.Counter({
  name: 'http_requests_total',
  help: 'Nombre total de requêtes HTTP',
  labelNames: ['method', 'route', 'code']
});

// Histogramme pour la latence et le comptage des requêtes
const httpRequestDurationSeconds = new client.Histogram({
  name: 'http_request_duration_seconds',
  help: 'Durée des requêtes HTTP en secondes',
  labelNames: ['method', 'route', 'code'],
  buckets: [0.005, 0.01, 0.025, 0.05, 0.1, 0.3, 0.5, 1, 1.5, 2, 5]
});

const app = express();

// Middlewares
app.use(cors());
app.use(bodyParser.json());
app.use(morgan('dev'));
app.use((req, res, next) => {
  if (req.path === '/metrics') {
    return next();
  }
  
  const end = httpRequestDurationSeconds.startTimer();
  res.on('finish', () => {
    const route = req.route ? req.route.path : req.path;
    
    // Incrémenter le Counter
    httpRequestsTotal.inc({
      method: req.method,
      route: route,
      code: res.statusCode
    });
    
    // Observer l'histogram  
    end({
      method: req.method,
      route: route,
      code: res.statusCode
    });
  });
  next();
});

// Healthcheck
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok' });
});

// Exemple de route API (à adapter selon vos routes réelles)
app.get('/api/v1/produits/:id/stock', (req, res) => {
  // TODO: remplacer par logique réelle
  res.json({ produitId: req.params.id, stock: Math.floor(Math.random() * 100) });
});

app.get('/api/v1/rapports', (req, res) => {
  // TODO: remplacer par logique réelle
  res.json({ rapport: 'Rapport consolidé exemple' });
});

app.put('/api/v1/produits/:id', (req, res) => {
  // TODO: remplacer par logique réelle
  res.json({ produitId: req.params.id, maj: true, stock: req.body.stock });
});

// Route de test pour générer des erreurs 500
app.get('/api/v1/test-error', (req, res) => {
  // Générer une erreur 500 de façon aléatoire (30% de chance)
  if (Math.random() < 0.3) {
    res.status(500).json({ error: 'Erreur interne du serveur simulée' });
  } else {
    res.json({ status: 'success', message: 'Tout va bien' });
  }
});

// Route qui génère toujours une erreur 500
app.get('/api/v1/always-error', (req, res) => {
  res.status(500).json({ error: 'Cette route génère toujours une erreur 500' });
});

// Route CPU-intensive pour saturer le serveur
app.get('/api/v1/cpu-stress', (req, res) => {
  const start = Date.now();
  // Calcul intensif pour consommer du CPU (simulation)
  let result = 0;
  for (let i = 0; i < 1000000; i++) {
    result += Math.sqrt(i) * Math.sin(i);
  }
  const duration = Date.now() - start;
  
  // Simuler une surcharge si trop de requêtes simultanées
  if (duration > 100) {
    res.status(500).json({ 
      error: 'Serveur surchargé - CPU stress trop élevé',
      duration: duration 
    });
  } else {
    res.json({ 
      result: result, 
      duration: duration,
      status: 'success' 
    });
  }
});

// Route mémoire-intensive
app.get('/api/v1/memory-stress', (req, res) => {
  try {
    // Créer un gros tableau pour consommer de la mémoire
    const bigArray = new Array(100000).fill('x'.repeat(1000));
    res.json({ 
      message: 'Memory stress test completed',
      arraySize: bigArray.length 
    });
  } catch (error) {
    res.status(500).json({ 
      error: 'Erreur mémoire - serveur surchargé',
      message: error.message 
    });
  }
});

// Endpoint Prometheus /metrics
app.get('/metrics', async (req, res) => {
  res.set('Content-Type', client.register.contentType);
  res.end(await client.register.metrics());
});

// Port configurable
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`API démarrée sur le port ${PORT}`);
});

module.exports = app;

// Routes de base pour le système legacy
app.get('/api/v1/magasins', (req, res) => {
  console.log('Legacy: GET /api/v1/magasins');
  res.json([
    { id: 1, nom: 'Magasin Centre', adresse: '123 Rue Principale', statut: 'actif' },
    { id: 2, nom: 'Magasin Nord', adresse: '456 Avenue du Nord', statut: 'actif' },
    { id: 3, nom: 'Magasin Sud', adresse: '789 Boulevard Sud', statut: 'actif' }
  ]);
});

app.get('/api/v1/produits', (req, res) => {
  console.log('Legacy: GET /api/v1/produits');
  res.json([
    { id: 1, nom: 'Ordinateur Portable', prix: 899.99, disponible: true },
    { id: 2, nom: 'Souris Wireless', prix: 29.99, disponible: true },
    { id: 3, nom: 'Clavier Mécanique', prix: 79.99, disponible: true }
  ]);
});

app.get('/api/v1/utilisateurs', (req, res) => {
  console.log('Legacy: GET /api/v1/utilisateurs');
  res.json([
    { id: 1, nom: 'Admin', email: 'admin@example.com', role: 'admin', magasinId: null, motDePasse: 'admin' },
    { id: 2, nom: 'Vendeur Centre', email: 'vendeur1@example.com', role: 'vendeur', magasinId: 1, motDePasse: 'vendeur' },
    { id: 3, nom: 'Vendeur Nord', email: 'vendeur2@example.com', role: 'vendeur', magasinId: 2, motDePasse: 'vendeur' }
  ]);
});

app.get('/api/v1/ventes', (req, res) => {
  console.log('Legacy: GET /api/v1/ventes');
  res.json([
    { 
      id: 1, 
      produitId: 1, 
      produitNom: 'Ordinateur Portable',
      quantite: 1, 
      montantTotal: 899.99, 
      magasinId: 1,
      magasinNom: 'Magasin Centre',
      dateVente: new Date().toISOString(),
      statut: 'completed'
    },
    { 
      id: 2, 
      produitId: 2, 
      produitNom: 'Souris Wireless',
      quantite: 2, 
      montantTotal: 59.98, 
      magasinId: 2,
      magasinNom: 'Magasin Nord',
      dateVente: new Date(Date.now() - 3600000).toISOString(),
      statut: 'completed'
    }
  ]);
});

// Routes POST pour créer des resources
app.post('/api/v1/ventes', (req, res) => {
  console.log('Legacy: POST /api/v1/ventes', req.body);
  const newVente = {
    id: Math.floor(Math.random() * 1000) + 100,
    ...req.body,
    dateVente: new Date().toISOString(),
    statut: 'completed'
  };
  res.status(201).json(newVente);
});

app.post('/api/v1/produits', (req, res) => {
  console.log('Legacy: POST /api/v1/produits', req.body);
  const newProduit = {
    id: Math.floor(Math.random() * 1000) + 100,
    ...req.body,
    disponible: true
  };
  res.status(201).json(newProduit);
});

// Route générique pour les health checks
