#!/bin/bash

# Script de démarrage automatique LOG430 Lab TB
echo "🚀 Démarrage automatique LOG430 Lab TB"
echo "======================================"

# Arrêter tout processus Node existant sur le port 3000
echo "🧹 Nettoyage des processus existants..."
pkill -f "node app.js" 2>/dev/null || true
sleep 1

# Installation des dépendances
echo "📦 Installation des dépendances..."
npm install --silent

# Initialisation de la base de données
echo "🗄️ Initialisation de la base de données..."
node -e "
const { sequelize, Magasin, Utilisateur, Produit, Vente } = require('./src/models');
require('./src/models/associations');

async function initDB() {
  try {
    await sequelize.sync({ force: true });
    
    // Magasins
    const magasins = await Magasin.bulkCreate([
      { nom: 'Magasin Centre', adresse: '123 rue Principale' },
      { nom: 'Magasin Nord', adresse: '456 avenue du Nord' },
      { nom: 'Magasin Sud', adresse: '789 boulevard du Sud' }
    ], { returning: true });
    
    // Utilisateurs pour chaque magasin
    for (let i = 0; i < magasins.length; i++) {
      await Utilisateur.bulkCreate([
        { nom: 'Dupont', prenom: 'Jean', role: 'caissier', motDePasse: '1234', magasinId: magasins[i].id },
        { nom: 'Martin', prenom: 'Sophie', role: 'gerant', motDePasse: 'abcd', magasinId: magasins[i].id }
      ]);
    }
    
    // Produits pour chaque magasin
    for (let i = 0; i < magasins.length; i++) {
      await Produit.bulkCreate([
        { nom: 'Pain', prix: 2.5, stock: 100, magasinId: magasins[i].id },
        { nom: 'Lait', prix: 1.5, stock: 80, magasinId: magasins[i].id },
        { nom: 'Fromage', prix: 4.0, stock: 50, magasinId: magasins[i].id }
      ]);
    }
    
    console.log('✅ Base de données initialisée avec succès');
  } catch (error) {
    console.log('❌ Erreur:', error.message);
    process.exit(1);
  }
}

initDB();
"

echo "🌐 Démarrage de l'API..."
node app.js &
API_PID=$!

# Attendre que l'API démarre
sleep 3

# Test de l'API
echo "🧪 Test de l'API..."
if curl -s http://localhost:3000/health > /dev/null 2>&1; then
    echo "✅ API démarrée avec succès sur http://localhost:3000"
else
    echo "❌ Erreur: API non accessible"
    kill $API_PID 2>/dev/null
    exit 1
fi

echo ""
echo "🎉 SYSTÈME DÉPLOYÉ AVEC SUCCÈS !"
echo ""
echo "📋 Commandes disponibles:"
echo "   • API déjà démarrée sur: http://localhost:3000"
echo "   • Console POS:           npm run pos-console"
echo "   • Console Maison Mère:   npm run maison-mere-console"
echo ""
echo "🔑 Utilisateurs de test:"
echo "   • Tous les magasins: Jean Dupont (1234), Sophie Martin (abcd)"
echo ""
echo "🌐 Endpoints API:"
echo "   • http://localhost:3000/health"
echo "   • http://localhost:3000/api/v1/produits"
echo "   • http://localhost:3000/api/v1/magasins"
echo ""
echo "⚠️  Pour arrêter l'API: kill $API_PID"
echo ""

# Garder le script en vie pour maintenir l'API
wait $API_PID
