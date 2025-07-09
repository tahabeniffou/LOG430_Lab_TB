const express = require('express');
const cors = require('cors');

console.log('Demarrage du reporting service...');

const app = express();
const PORT = process.env.PORT || 3005;

app.use(cors());
app.use(express.json());

console.log('Express configure');

// Route de test simple
app.get('/health', (req, res) => {
  console.log('Health check appele');
  res.json({
    status: 'OK',
    service: 'reporting-service',
    timestamp: new Date().toISOString()
  });
});

app.get('/test', (req, res) => {
  console.log('Route test appelee');
  res.json({ message: 'Service reporting fonctionne!' });
});

// Routes pour les rapports (version simple en mémoire)
app.get('/api/reports', (req, res) => {
  console.log('Route reports appelee');
  res.json({
    totalVentes: 127,
    ventesParMagasin: [
      { magasinId: 1, magasinNom: 'Magasin Centre', totalVentes: 85 },
      { magasinId: 2, magasinNom: 'Magasin Nord', totalVentes: 42 }
    ],
    ventesRecentes: [
      {
        id: 1,
        produitNom: 'Ordinateur Portable',
        quantite: 2,
        montantTotal: 1799.98,
        magasinNom: 'Magasin Centre',
        dateVente: new Date().toISOString()
      }
    ]
  });
});

app.get('/api/reports/ventes', (req, res) => {
  console.log('Route reports/ventes appelee');
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
      }
    ],
    total: 1
  });
});

app.get('/api/reports/mouvements', (req, res) => {
  console.log('Route reports/mouvements appelee');
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
        dateCreation: new Date().toISOString()
      }
    ],
    total: 1
  });
});

// Démarrage simple
app.listen(PORT, () => {
  console.log(`Reporting Service demarre sur le port ${PORT}`);
  console.log(`Test: http://localhost:${PORT}/test`);
  console.log(`Health: http://localhost:${PORT}/health`);
});

console.log('Configuration terminee');
