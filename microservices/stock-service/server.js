const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3007;

// Middleware
app.use(helmet());
app.use(cors());
app.use(express.json());

// In-memory stock data (pour démo - en production utilisez une base de données)
let stocks = [
  { id: 1, produitId: 1, quantite: 100, seuilMin: 10, seuilMax: 500 },
  { id: 2, produitId: 2, quantite: 50, seuilMin: 5, seuilMax: 200 },
  { id: 3, produitId: 3, quantite: 75, seuilMin: 15, seuilMax: 300 }
];

let stockCounter = 4;

// Routes Stock

// GET /stocks - Obtenir tous les stocks
app.get('/stocks', (req, res) => {
  res.json({
    success: true,
    data: stocks,
    message: 'Stocks récupérés avec succès'
  });
});

// GET /stocks/:id - Obtenir un stock par ID
app.get('/stocks/:id', (req, res) => {
  const stockId = parseInt(req.params.id);
  const stock = stocks.find(s => s.id === stockId);
  
  if (!stock) {
    return res.status(404).json({
      success: false,
      message: 'Stock non trouvé'
    });
  }
  
  res.json({
    success: true,
    data: stock,
    message: 'Stock récupéré avec succès'
  });
});

// GET /stocks/produit/:produitId - Obtenir le stock d'un produit
app.get('/stocks/produit/:produitId', (req, res) => {
  const produitId = parseInt(req.params.produitId);
  const stock = stocks.find(s => s.produitId === produitId);
  
  if (!stock) {
    return res.status(404).json({
      success: false,
      message: 'Stock non trouvé pour ce produit'
    });
  }
  
  res.json({
    success: true,
    data: stock,
    message: 'Stock du produit récupéré avec succès'
  });
});

// POST /stocks - Créer un nouveau stock
app.post('/stocks', (req, res) => {
  const { produitId, quantite, seuilMin, seuilMax } = req.body;
  
  if (!produitId || quantite === undefined || !seuilMin || !seuilMax) {
    return res.status(400).json({
      success: false,
      message: 'Données manquantes: produitId, quantite, seuilMin, seuilMax requis'
    });
  }
  
  // Vérifier si le stock existe déjà pour ce produit
  const existingStock = stocks.find(s => s.produitId === produitId);
  if (existingStock) {
    return res.status(400).json({
      success: false,
      message: 'Stock déjà existant pour ce produit'
    });
  }
  
  const newStock = {
    id: stockCounter++,
    produitId: parseInt(produitId),
    quantite: parseInt(quantite),
    seuilMin: parseInt(seuilMin),
    seuilMax: parseInt(seuilMax)
  };
  
  stocks.push(newStock);
  
  res.status(201).json({
    success: true,
    data: newStock,
    message: 'Stock créé avec succès'
  });
});

// PUT /stocks/:id - Mettre à jour un stock
app.put('/stocks/:id', (req, res) => {
  const stockId = parseInt(req.params.id);
  const stockIndex = stocks.findIndex(s => s.id === stockId);
  
  if (stockIndex === -1) {
    return res.status(404).json({
      success: false,
      message: 'Stock non trouvé'
    });
  }
  
  const { quantite, seuilMin, seuilMax } = req.body;
  
  if (quantite !== undefined) stocks[stockIndex].quantite = parseInt(quantite);
  if (seuilMin !== undefined) stocks[stockIndex].seuilMin = parseInt(seuilMin);
  if (seuilMax !== undefined) stocks[stockIndex].seuilMax = parseInt(seuilMax);
  
  res.json({
    success: true,
    data: stocks[stockIndex],
    message: 'Stock mis à jour avec succès'
  });
});

// PUT /stocks/produit/:produitId/ajuster - Ajuster la quantité (pour les ventes/achats)
app.put('/stocks/produit/:produitId/ajuster', (req, res) => {
  const produitId = parseInt(req.params.produitId);
  const { quantiteAjustement } = req.body; // positif pour ajout, négatif pour soustraction
  
  const stockIndex = stocks.findIndex(s => s.produitId === produitId);
  
  if (stockIndex === -1) {
    return res.status(404).json({
      success: false,
      message: 'Stock non trouvé pour ce produit'
    });
  }
  
  const stock = stocks[stockIndex];
  const nouvelleQuantite = stock.quantite + parseInt(quantiteAjustement);
  
  if (nouvelleQuantite < 0) {
    return res.status(400).json({
      success: false,
      message: 'Stock insuffisant'
    });
  }
  
  stock.quantite = nouvelleQuantite;
  
  // Vérifier les seuils
  let alerts = [];
  if (stock.quantite <= stock.seuilMin) {
    alerts.push('STOCK_FAIBLE');
  }
  if (stock.quantite >= stock.seuilMax) {
    alerts.push('STOCK_ELEVE');
  }
  
  res.json({
    success: true,
    data: stock,
    alerts: alerts,
    message: 'Stock ajusté avec succès'
  });
});

// DELETE /stocks/:id - Supprimer un stock
app.delete('/stocks/:id', (req, res) => {
  const stockId = parseInt(req.params.id);
  const stockIndex = stocks.findIndex(s => s.id === stockId);
  
  if (stockIndex === -1) {
    return res.status(404).json({
      success: false,
      message: 'Stock non trouvé'
    });
  }
  
  stocks.splice(stockIndex, 1);
  
  res.json({
    success: true,
    message: 'Stock supprimé avec succès'
  });
});

// Route de santé
app.get('/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    service: 'stock-service',
    timestamp: new Date().toISOString(),
    port: PORT
  });
});

// Route racine
app.get('/', (req, res) => {
  res.json({
    service: 'Stock Service',
    version: '1.0.0',
    description: 'Microservice pour la gestion du stock',
    endpoints: [
      'GET /stocks',
      'GET /stocks/:id',
      'GET /stocks/produit/:produitId',
      'POST /stocks',
      'PUT /stocks/:id',
      'PUT /stocks/produit/:produitId/ajuster',
      'DELETE /stocks/:id',
      'GET /health'
    ]
  });
});

// Middleware de gestion d'erreur
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({
    success: false,
    message: 'Erreur interne du serveur'
  });
});

// Middleware pour les routes non trouvées
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    message: 'Route non trouvée'
  });
});

app.listen(PORT, () => {
  console.log(`✅ Stock Service démarré sur le port ${PORT}`);
  console.log(`🏥 Health check: http://localhost:${PORT}/health`);
});

module.exports = app;
