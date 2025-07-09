const express = require('express');
const cors = require('cors');

console.log('Demarrage Reporting Service simplifie...');

const app = express();
const PORT = process.env.PORT || 3005;

app.use(cors());
app.use(express.json());

// Données en mémoire pour commencer
let ventes = [
  {
    id: 1,
    produitId: 1, 
    produitNom: 'Ordinateur Portable', 
    quantite: 2, 
    prixUnitaire: 899.99, 
    montantTotal: 1799.98,
    magasinId: 1, 
    magasinNom: 'Magasin Centre', 
    utilisateurId: 1, 
    utilisateurNom: 'Jean Dupont',
    dateVente: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), 
    statut: 'completed'
  },
  {
    id: 2,
    produitId: 2, 
    produitNom: 'Souris Gaming', 
    quantite: 5, 
    prixUnitaire: 45.50, 
    montantTotal: 227.50,
    magasinId: 1, 
    magasinNom: 'Magasin Centre', 
    utilisateurId: 2, 
    utilisateurNom: 'Marie Martin',
    dateVente: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000), 
    statut: 'completed'
  }
];

let mouvements = [
  {
    id: 1,
    produitId: 1, 
    produitNom: 'Ordinateur Portable', 
    type: 'vente', 
    quantite: -2,
    stockAvant: 15, 
    stockApres: 13, 
    magasinId: 1, 
    utilisateurId: 1,
    commentaire: 'Vente normale',
    createdAt: new Date()
  }
];

// Routes API
app.get('/api/reports', (req, res) => {
  console.log('Route /api/reports appelee');
  
  const rapport = {
    totalVentes: ventes.length,
    chiffreAffaires: ventes.reduce((sum, v) => sum + v.montantTotal, 0),
    produitsVendus: ventes.reduce((sum, v) => sum + v.quantite, 0),
    derniereMiseAJour: new Date().toISOString()
  };
  
  res.json(rapport);
});

app.get('/api/reports/ventes', (req, res) => {
  console.log('Route /api/reports/ventes appelee');
  res.json({ ventes: ventes, total: ventes.length });
});

app.get('/api/reports/mouvements', (req, res) => {
  console.log('Route /api/reports/mouvements appelee');
  res.json({ mouvements: mouvements, total: mouvements.length });
});

app.post('/api/reports/ventes', (req, res) => {
  console.log('Creation vente:', req.body);
  const nouvelleVente = {
    id: ventes.length + 1,
    ...req.body,
    dateVente: new Date()
  };
  ventes.push(nouvelleVente);
  res.status(201).json(nouvelleVente);
});

app.get('/health', (req, res) => {
  console.log('Health check appele');
  res.json({
    status: 'OK',
    service: 'reporting-service',
    timestamp: new Date().toISOString(),
    database: 'Memory',
    ventes: ventes.length,
    mouvements: mouvements.length
  });
});

app.get('/info', (req, res) => {
  console.log('Route /info appelee');
  res.json({
    service: 'reporting-service',
    version: '1.0.0',
    port: PORT,
    database: {
      type: 'Memory',
      ventes: ventes.length,
      mouvements: mouvements.length
    },
    endpoints: [
      'GET /health - Health check',
      'GET /info - Service information', 
      'GET /api/reports - Rapport global',
      'GET /api/reports/ventes - Liste des ventes',
      'GET /api/reports/mouvements - Liste des mouvements',
      'POST /api/reports/ventes - Creer une vente'
    ]
  });
});

app.listen(PORT, () => {
  console.log(`Reporting Service demarre sur le port ${PORT}`);
  console.log(`Health check: http://localhost:${PORT}/health`);
  console.log(`Service info: http://localhost:${PORT}/info`);
  console.log(`API Reports: http://localhost:${PORT}/api/reports`);
});

console.log('Configuration terminee');
