#!/usr/bin/env node

const inquirer = require('inquirer');
const chalk = require('chalk');
const { Sequelize, DataTypes } = require('sequelize');
const Table = require('cli-table3');

// Configuration SQLite
const sequelize = new Sequelize({
  dialect: 'sqlite',
  storage: './database.sqlite',
  logging: false
});

// Modèles
const Magasin = sequelize.define('Magasin', {
  nom: { type: DataTypes.STRING, allowNull: false },
  adresse: { type: DataTypes.STRING }
});

const Utilisateur = sequelize.define('Utilisateur', {
  nom: { type: DataTypes.STRING, allowNull: false },
  prenom: { type: DataTypes.STRING, allowNull: false },
  courriel: { type: DataTypes.STRING, allowNull: false },
  motDePasse: { type: DataTypes.STRING, allowNull: false },
  role: { type: DataTypes.STRING, defaultValue: 'caissier' },
  magasinId: { type: DataTypes.INTEGER, allowNull: false }
});

// Associations
Magasin.hasMany(Utilisateur, { foreignKey: 'magasinId', as: 'utilisateurs' });
Utilisateur.belongsTo(Magasin, { foreignKey: 'magasinId', as: 'magasin' });

// Variables globales
let currentMagasinId = null;
let currentUtilisateurId = null;
let currentMagasin = null;
let currentUtilisateur = null;

// Client HTTP simple pour les microservices
const http = require('http');

function makeRequest(url, options = {}) {
  return new Promise((resolve, reject) => {
    const req = http.request(url, {
      method: options.method || 'GET',
      headers: { 'Content-Type': 'application/json', ...options.headers }
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const result = JSON.parse(data);
          resolve({ status: res.statusCode, data: result });
        } catch (e) {
          resolve({ status: res.statusCode, data: data });
        }
      });
    });
    
    req.on('error', reject);
    if (options.body) req.write(JSON.stringify(options.body));
    req.end();
  });
}

async function choisirMagasin() {
  console.clear();
  console.log(chalk.blue.bold('🏪 === SÉLECTION DU MAGASIN ==='));
  console.log('');
  
  const magasins = await Magasin.findAll();
  if (magasins.length === 0) {
    console.log(chalk.red('❌ Aucun magasin trouvé. Lancez: node init-database.js'));
    process.exit(1);
  }
  
  const choixMagasins = magasins.map(m => ({
    name: `${m.nom} - ${m.adresse}`,
    value: m.id
  }));
  
  const { magasinId } = await inquirer.prompt([
    {
      type: 'list',
      name: 'magasinId',
      message: 'Sélectionnez votre magasin:',
      choices: choixMagasins
    }
  ]);
  
  currentMagasinId = magasinId;
  currentMagasin = magasins.find(m => m.id === magasinId);
  console.log(chalk.green(`✅ Magasin sélectionné: ${currentMagasin.nom}`));
}

async function authentification() {
  console.clear();
  console.log(chalk.blue.bold('🔐 === AUTHENTIFICATION ==='));
  console.log(chalk.gray(`Magasin: ${currentMagasin.nom}`));
  console.log('');
  
  const utilisateurs = await Utilisateur.findAll({ 
    where: { magasinId: currentMagasinId } 
  });
  
  if (utilisateurs.length === 0) {
    console.log(chalk.red('❌ Aucun utilisateur trouvé pour ce magasin.'));
    process.exit(1);
  }
  
  const choixUtilisateurs = utilisateurs.map(u => ({
    name: `${u.prenom} ${u.nom} (${u.role})`,
    value: u.id
  }));
  
  const { utilisateurId } = await inquirer.prompt([
    {
      type: 'list',
      name: 'utilisateurId',
      message: 'Sélectionnez votre compte:',
      choices: choixUtilisateurs
    }
  ]);
  
  const utilisateur = utilisateurs.find(u => u.id === utilisateurId);
  
  const { motDePasse } = await inquirer.prompt([
    {
      type: 'password',
      name: 'motDePasse',
      message: `Mot de passe pour ${utilisateur.prenom} ${utilisateur.nom}:`,
      mask: '*'
    }
  ]);
  
  if (motDePasse !== utilisateur.motDePasse) {
    console.log(chalk.red('❌ Mot de passe incorrect !'));
    await inquirer.prompt([{ type: 'input', name: 'continue', message: 'Appuyez sur Entrée pour réessayer...' }]);
    return false;
  }
  
  currentUtilisateurId = utilisateurId;
  currentUtilisateur = utilisateur;
  console.log(chalk.green(`✅ Bienvenue ${utilisateur.prenom} ${utilisateur.nom} !`));
  return true;
}

async function testServices() {
  console.log(chalk.cyan('🔍 Test des microservices...'));
  
  const services = [
    { name: 'Produit', url: 'http://localhost:3001/health' },
    { name: 'Stock', url: 'http://localhost:3002/health' },
    { name: 'Vente', url: 'http://localhost:3003/health' },
    { name: 'Reporting', url: 'http://localhost:3004/health' }
  ];
  
  for (const service of services) {
    try {
      const result = await makeRequest(service.url);
      if (result.status === 200) {
        console.log(chalk.green(`✅ ${service.name} Service: OK`));
      } else {
        console.log(chalk.yellow(`⚠️  ${service.name} Service: ${result.status}`));
      }
    } catch (error) {
      console.log(chalk.red(`❌ ${service.name} Service: ERREUR`));
    }
  }
  console.log('');
}

async function afficherMenuPrincipal() {
  console.clear();
  console.log(chalk.blue.bold('🛍️  === SYSTÈME POS - ARCHITECTURE COMPLÈTE ==='));
  console.log(chalk.gray('Console Legacy → Microservices'));
  console.log(chalk.cyan(`🏪 Magasin: ${currentMagasin.nom}`));
  console.log(chalk.cyan(`👤 Utilisateur: ${currentUtilisateur.prenom} ${currentUtilisateur.nom} (${currentUtilisateur.role})`));
  console.log('');
  
  await testServices();
  
  const choices = [
    { name: '🛒 Nouvelle vente', value: 'nouvelle_vente' },
    { name: '📦 Voir produits', value: 'voir_produits' },
    { name: '📊 Rapports', value: 'rapports' },
    { name: '⚙️  Configuration', value: 'config' },
    { name: '🔄 Changer d\'utilisateur', value: 'changer_user' },
    { name: '🚪 Quitter', value: 'quitter' }
  ];

  const { action } = await inquirer.prompt([
    {
      type: 'list',
      name: 'action',
      message: 'Que voulez-vous faire ?',
      choices
    }
  ]);

  switch (action) {
    case 'nouvelle_vente':
      await nouvelleVente();
      break;
    case 'voir_produits':
      await afficherProduits();
      break;
    case 'rapports':
      await afficherRapports();
      break;
    case 'config':
      await afficherConfig();
      break;
    case 'changer_user':
      await changerUtilisateur();
      break;
    case 'quitter':
      console.log(chalk.yellow('👋 Au revoir !'));
      process.exit(0);
  }
  
  await afficherMenuPrincipal();
}

async function getProduits() {
  try {
    // Récupérer tous les produits
    const resultProduits = await makeRequest('http://localhost:3001/api/produits');
    let produits = [];
    if (resultProduits.data && resultProduits.data.success && resultProduits.data.data) {
      produits = resultProduits.data.data;
    } else {
      produits = resultProduits.data || [];
    }

    // Récupérer les stocks pour ce magasin
    const resultStocks = await makeRequest(`http://localhost:3002/stocks/magasin/${currentMagasinId}`);
    let stocks = [];
    if (resultStocks.data && resultStocks.data.success && resultStocks.data.data) {
      stocks = resultStocks.data.data;
    }

    // Combiner produits et stocks - ne garder que les produits disponibles dans ce magasin
    const produitsAvecStock = [];
    for (const produit of produits) {
      const stock = stocks.find(s => s.produitId === produit.id);
      if (stock && stock.quantite > 0) {
        produitsAvecStock.push({
          ...produit,
          quantiteStock: stock.quantite,
          seuilMin: stock.seuilMin,
          seuilMax: stock.seuilMax,
          stockId: stock.id
        });
      }
    }

    return produitsAvecStock;
  } catch (error) {
    console.log(chalk.red('❌ Erreur récupération produits:', error.message));
    return [];
  }
}

async function afficherProduits() {
  console.log(chalk.cyan(`📦 Récupération des produits disponibles dans ${currentMagasin.nom}...`));
  const produits = await getProduits();
  
  if (!Array.isArray(produits) || produits.length === 0) {
    console.log(chalk.yellow(`Aucun produit disponible dans le magasin ${currentMagasin.nom}`));
    return;
  }
  
  const table = new Table({
    head: ['ID', 'Nom', 'Prix', 'Stock Disponible', 'Catégorie']
  });
  
  produits.forEach(p => {
    table.push([
      p.id || 'N/A',
      p.nom || p.name || 'N/A',
      p.prix ? `${p.prix}$` : 'N/A',
      p.quantiteStock || 'N/A',
      p.categorie || 'N/A'
    ]);
  });
  
  console.log(table.toString());
  console.log(chalk.green(`📊 Total: ${produits.length} produit(s) disponible(s) dans ce magasin`));
  await inquirer.prompt([{ type: 'input', name: 'continue', message: 'Appuyez sur Entrée pour continuer...' }]);
}

async function nouvelleVente() {
  console.log(chalk.cyan('🛒 Nouvelle vente'));
  const produits = await getProduits();
  
  if (!Array.isArray(produits) || produits.length === 0) {
    console.log(chalk.red('❌ Aucun produit disponible'));
    return;
  }
  
  const choixProduits = produits.map(p => ({
    name: `${p.nom || p.name} - ${p.prix || 'N/A'}$ (Stock: ${p.quantiteStock || p.stock || 'N/A'})`,
    value: p.id
  }));
  
  const { produitId } = await inquirer.prompt([
    {
      type: 'list',
      name: 'produitId',
      message: 'Choisissez un produit:',
      choices: choixProduits
    }
  ]);
  
  const { quantite } = await inquirer.prompt([
    {
      type: 'number',
      name: 'quantite',
      message: 'Quantité:',
      default: 1,
      validate: input => input > 0 || 'La quantité doit être positive'
    }
  ]);
  
  const vente = {
    magasinId: currentMagasinId,
    utilisateurId: currentUtilisateurId,
    lignes: [{
      produitId: produitId,
      quantite: quantite
    }],
    statut: 'active'
  };
  
  console.log(chalk.cyan('💳 Création de la vente...'));
  try {
    const result = await makeRequest('http://localhost:3003/api/ventes', {
      method: 'POST',
      body: vente
    });
    
    console.log(chalk.cyan('🔍 Debug - Réponse du serveur:'));
    console.log(`Status: ${result.status}`);
    console.log(`Data:`, JSON.stringify(result.data, null, 2));
    
    if (result.status === 200 || result.status === 201) {
      if (result.data && result.data.success) {
        console.log(chalk.green('✅ Vente créée avec succès !'));
        const venteId = result.data.data?.id || result.data.vente?.id || 'N/A';
        const total = result.data.data?.total || 'N/A';
        console.log(`📝 ID Vente: ${venteId}`);
        console.log(`💰 Total: ${total}$`);
        
        // Afficher les détails de la vente
        if (result.data.data && result.data.data.lignes) {
          console.log(chalk.blue('\n🛒 Détails de la vente:'));
          result.data.data.lignes.forEach((ligne, index) => {
            console.log(`  ${index + 1}. Produit ${ligne.produitId}: ${ligne.quantite}x à ${ligne.prixUnitaire}$ = ${ligne.prixTotal}$`);
          });
        }
      } else {
        console.log(chalk.yellow('⚠️  Vente créée mais réponse inattendue'));
        console.log(JSON.stringify(result.data, null, 2));
      }
    } else {
      console.log(chalk.red(`❌ Erreur lors de la création de la vente (Status: ${result.status})`));
      if (result.data && result.data.message) {
        console.log(chalk.red(`Message d'erreur: ${result.data.message}`));
      }
      if (result.data && result.data.error) {
        console.log(chalk.red(`Détail: ${result.data.error}`));
      }
    }
  } catch (error) {
    console.log(chalk.red('❌ Erreur de communication avec le service de vente:'));
    console.log(chalk.red(`Type: ${error.constructor.name}`));
    console.log(chalk.red(`Message: ${error.message}`));
    if (error.code) {
      console.log(chalk.red(`Code: ${error.code}`));
    }
  }
  
  await inquirer.prompt([{ type: 'input', name: 'continue', message: 'Appuyez sur Entrée pour continuer...' }]);
}

async function afficherRapports() {
  console.log(chalk.cyan('📊 Génération des rapports...'));
  
  try {
    // Rapport principal
    const result = await makeRequest('http://localhost:3004/api/reports');
    if (result.status === 200 && result.data) {
      console.log(chalk.green('✅ Service de reporting disponible'));
      console.log('\n📋 Rapports disponibles:');
      if (result.data.message) {
        console.log(`- ${result.data.message}`);
      }
      if (result.data.endpoints) {
        result.data.endpoints.forEach(endpoint => {
          console.log(`- ${endpoint}`);
        });
      }
    }
    
    // Rapport des ventes
    console.log(chalk.cyan('\n📈 Rapport des ventes:'));
    const ventesResult = await makeRequest('http://localhost:3004/api/reports/ventes');
    if (ventesResult.status === 200 && ventesResult.data) {
      if (ventesResult.data.data && Array.isArray(ventesResult.data.data)) {
        console.log(`- Nombre de ventes: ${ventesResult.data.data.length}`);
        ventesResult.data.data.slice(0, 3).forEach(vente => {
          console.log(`  • Vente #${vente.id}: ${vente.total || 'N/A'}$ (${vente.statut || 'N/A'})`);
        });
      } else {
        console.log('- Aucune vente trouvée');
      }
    }
    
    // Rapport du stock
    console.log(chalk.cyan('\n📦 Rapport du stock:'));
    const stockResult = await makeRequest('http://localhost:3004/api/reports/stock');
    if (stockResult.status === 200 && stockResult.data) {
      console.log('- Données de stock disponibles');
      if (stockResult.data.summary) {
        console.log(`  • Résumé: ${stockResult.data.summary}`);
      }
    }
    
  } catch (error) {
    console.log(chalk.red('❌ Service de reporting non disponible:', error.message));
  }
  
  await inquirer.prompt([{ type: 'input', name: 'continue', message: 'Appuyez sur Entrée pour continuer...' }]);
}

async function afficherConfig() {
  console.log(chalk.cyan('⚙️  Configuration système'));
  console.log(`Magasin: ${currentMagasin.nom} (ID: ${currentMagasinId})`);
  console.log(`Utilisateur: ${currentUtilisateur.prenom} ${currentUtilisateur.nom} (ID: ${currentUtilisateurId})`);
  console.log(`Rôle: ${currentUtilisateur.role}`);
  console.log(`Email: ${currentUtilisateur.courriel}`);
  await inquirer.prompt([{ type: 'input', name: 'continue', message: 'Appuyez sur Entrée pour continuer...' }]);
}

async function changerUtilisateur() {
  const confirmed = await confirmerAction('Êtes-vous sûr de vouloir changer d\'utilisateur ?');
  if (confirmed) {
    await demarrerSession();
  }
}

async function confirmerAction(message) {
  const { confirmed } = await inquirer.prompt([
    {
      type: 'confirm',
      name: 'confirmed',
      message: message,
      default: false
    }
  ]);
  return confirmed;
}

async function demarrerSession() {
  await choisirMagasin();
  
  let authentifie = false;
  while (!authentifie) {
    authentifie = await authentification();
  }
  
  await afficherMenuPrincipal();
}

// Démarrage de l'application
async function main() {
  try {
    console.log(chalk.green('🚀 Démarrage du système POS...'));
    console.log(chalk.gray('Architecture: Console Legacy + Base SQLite + Microservices'));
    console.log('');
    
    // Test de connexion à la base
    await sequelize.authenticate();
    console.log(chalk.green('✅ Connexion à la base de données établie'));
    
    await demarrerSession();
    
  } catch (error) {
    console.error(chalk.red('❌ Erreur de démarrage:', error.message));
    if (error.message.includes('SQLITE_CANTOPEN')) {
      console.log(chalk.yellow('💡 Lancez d\'abord: node init-database.js'));
    }
    process.exit(1);
  }
}

// Gestion des erreurs
process.on('uncaughtException', (error) => {
  console.log(chalk.red('❌ Erreur système:', error.message));
  process.exit(1);
});

process.on('unhandledRejection', (error) => {
  console.log(chalk.red('❌ Erreur async:', error.message));
});

main().catch(console.error);
