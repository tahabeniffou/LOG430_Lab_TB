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
let currentUtilisateurId = null;
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

async function authentificationMaisonMere() {
  console.clear();
  console.log(chalk.blue.bold('🏢 === AUTHENTIFICATION MAISON MÈRE ==='));
  console.log(chalk.gray('Accès réservé aux managers et administrateurs'));
  console.log('');
  
  // Filtrer seulement les managers et admins
  const utilisateurs = await Utilisateur.findAll({ 
    where: { role: ['manager', 'admin'] },
    include: [{ model: Magasin, as: 'magasin' }]
  });
  
  if (utilisateurs.length === 0) {
    console.log(chalk.red('❌ Aucun manager/admin trouvé.'));
    process.exit(1);
  }
  
  const choixUtilisateurs = utilisateurs.map(u => ({
    name: `${u.prenom} ${u.nom} (${u.role}) - ${u.magasin ? u.magasin.nom : 'N/A'}`,
    value: u.id
  }));
  
  const { utilisateurId } = await inquirer.prompt([
    {
      type: 'list',
      name: 'utilisateurId',
      message: 'Sélectionnez votre compte administrateur:',
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

async function afficherMenuMaisonMere() {
  console.clear();
  console.log(chalk.blue.bold('🏢 === CONSOLE MAISON MÈRE ==='));
  console.log(chalk.gray('Supervision et rapports centralisés'));
  console.log(chalk.cyan(`👤 Administrateur: ${currentUtilisateur.prenom} ${currentUtilisateur.nom} (${currentUtilisateur.role})`));
  console.log('');
  
  await testServices();
  
  const choices = [
    { name: '📊 Rapports consolidés', value: 'rapports_consolides' },
    { name: '🏪 Vue des magasins', value: 'vue_magasins' },
    { name: '💰 Analyses financières', value: 'analyses_financieres' },
    { name: '📈 Performances globales', value: 'performances_globales' },
    { name: '📦 Inventaire global', value: 'inventaire_global' },
    { name: '👥 Gestion utilisateurs', value: 'gestion_users' },
    { name: '⚙️  Configuration système', value: 'config' },
    { name: '🔄 Changer d\'utilisateur', value: 'changer_user' },
    { name: '🚪 Quitter', value: 'quitter' }
  ];

  const { action } = await inquirer.prompt([
    {
      type: 'list',
      name: 'action',
      message: 'Que voulez-vous consulter ?',
      choices
    }
  ]);

  switch (action) {
    case 'rapports_consolides':
      await afficherRapportsConsolides();
      break;
    case 'vue_magasins':
      await afficherVueMagasins();
      break;
    case 'analyses_financieres':
      await afficherAnalysesFinancieres();
      break;
    case 'performances_globales':
      await afficherPerformancesGlobales();
      break;
    case 'inventaire_global':
      await afficherInventaireGlobal();
      break;
    case 'gestion_users':
      await afficherGestionUtilisateurs();
      break;
    case 'config':
      await afficherConfigMaisonMere();
      break;
    case 'changer_user':
      await changerUtilisateur();
      break;
    case 'quitter':
      console.log(chalk.yellow('👋 Au revoir !'));
      process.exit(0);
  }
  
  await afficherMenuMaisonMere();
}

async function afficherRapportsConsolides() {
  console.log(chalk.cyan('📊 Génération des rapports consolidés...'));
  
  try {
    // Rapport global des ventes
    const ventesResult = await makeRequest('http://localhost:3004/api/reports/ventes');
    console.log(chalk.green('\n💰 Rapport des ventes:'));
    if (ventesResult.status === 200 && ventesResult.data) {
      if (ventesResult.data.data && Array.isArray(ventesResult.data.data)) {
        const totalVentes = ventesResult.data.data.length;
        const chiffreAffaires = ventesResult.data.data.reduce((sum, vente) => sum + (vente.total || 0), 0);
        console.log(`- Total ventes: ${totalVentes}`);
        console.log(`- Chiffre d'affaires: ${chiffreAffaires.toFixed(2)}$`);
      }
    }
    
    // Rapport du stock global
    const stockResult = await makeRequest('http://localhost:3004/api/reports/stock');
    console.log(chalk.green('\n📦 État du stock global:'));
    if (stockResult.status === 200 && stockResult.data) {
      console.log('- Données de stock consolidées disponibles');
    }
    
    // Rapport financier
    const financeResult = await makeRequest('http://localhost:3004/api/reports/finances');
    console.log(chalk.green('\n💵 Rapport financier:'));
    if (financeResult.status === 200 && financeResult.data) {
      console.log('- Analyses financières disponibles');
    }
    
  } catch (error) {
    console.log(chalk.red('❌ Erreur lors de la génération des rapports:', error.message));
  }
  
  await inquirer.prompt([{ type: 'input', name: 'continue', message: 'Appuyez sur Entrée pour continuer...' }]);
}

async function afficherVueMagasins() {
  console.log(chalk.cyan('🏪 Vue d\'ensemble des magasins...'));
  
  try {
    const magasins = await Magasin.findAll({
      include: [{ model: Utilisateur, as: 'utilisateurs' }]
    });
    
    const table = new Table({
      head: ['ID', 'Nom', 'Adresse', 'Nb Utilisateurs', 'Managers']
    });
    
    for (const magasin of magasins) {
      const managers = magasin.utilisateurs.filter(u => u.role === 'manager');
      table.push([
        magasin.id,
        magasin.nom,
        magasin.adresse || 'N/A',
        magasin.utilisateurs.length,
        managers.length
      ]);
    }
    
    console.log(table.toString());
    
  } catch (error) {
    console.log(chalk.red('❌ Erreur lors de la récupération des magasins:', error.message));
  }
  
  await inquirer.prompt([{ type: 'input', name: 'continue', message: 'Appuyez sur Entrée pour continuer...' }]);
}

async function afficherAnalysesFinancieres() {
  console.log(chalk.cyan('💰 Analyses financières...'));
  
  try {
    const result = await makeRequest('http://localhost:3004/api/reports/finances');
    if (result.status === 200 && result.data) {
      console.log('\n📈 Données financières:');
      console.log(JSON.stringify(result.data, null, 2));
    } else {
      console.log(chalk.yellow('⚠️  Service financier non disponible'));
    }
  } catch (error) {
    console.log(chalk.red('❌ Service financier non disponible:', error.message));
  }
  
  await inquirer.prompt([{ type: 'input', name: 'continue', message: 'Appuyez sur Entrée pour continuer...' }]);
}

async function afficherPerformancesGlobales() {
  console.log(chalk.cyan('📈 Performances globales du réseau...'));
  
  try {
    // Métriques du service reporting
    const metricsResult = await makeRequest('http://localhost:3004/metrics');
    if (metricsResult.status === 200) {
      console.log(chalk.green('✅ Métriques système collectées'));
    }
    
    // Mouvements globaux
    const mouvementsResult = await makeRequest('http://localhost:3004/api/reports/mouvements');
    if (mouvementsResult.status === 200 && mouvementsResult.data) {
      console.log('\n📊 Mouvements globaux:');
      console.log(JSON.stringify(mouvementsResult.data, null, 2));
    }
    
  } catch (error) {
    console.log(chalk.red('❌ Erreur lors de la récupération des performances:', error.message));
  }
  
  await inquirer.prompt([{ type: 'input', name: 'continue', message: 'Appuyez sur Entrée pour continuer...' }]);
}

async function afficherInventaireGlobal() {
  console.log(chalk.cyan('📦 Inventaire global des produits...'));
  
  try {
    const result = await makeRequest('http://localhost:3001/api/produits');
    if (result.status === 200 && result.data && result.data.data) {
      const produits = result.data.data;
      
      const table = new Table({
        head: ['ID', 'Nom', 'Prix', 'Stock Total', 'Valeur']
      });
      
      let valeurTotale = 0;
      produits.forEach(p => {
        const stock = p.quantiteStock || 0;
        const prix = p.prix || 0;
        const valeur = stock * prix;
        valeurTotale += valeur;
        
        table.push([
          p.id,
          p.nom || 'N/A',
          `${prix}$`,
          stock,
          `${valeur.toFixed(2)}$`
        ]);
      });
      
      console.log(table.toString());
      console.log(chalk.green(`\n💰 Valeur totale du stock: ${valeurTotale.toFixed(2)}$`));
      
    } else {
      console.log(chalk.yellow('⚠️  Aucun produit trouvé'));
    }
  } catch (error) {
    console.log(chalk.red('❌ Erreur lors de la récupération de l\'inventaire:', error.message));
  }
  
  await inquirer.prompt([{ type: 'input', name: 'continue', message: 'Appuyez sur Entrée pour continuer...' }]);
}

async function afficherGestionUtilisateurs() {
  console.log(chalk.cyan('👥 Gestion des utilisateurs...'));
  
  try {
    const utilisateurs = await Utilisateur.findAll({
      include: [{ model: Magasin, as: 'magasin' }]
    });
    
    const table = new Table({
      head: ['ID', 'Nom', 'Prénom', 'Rôle', 'Email', 'Magasin']
    });
    
    utilisateurs.forEach(u => {
      table.push([
        u.id,
        u.nom,
        u.prenom,
        u.role,
        u.courriel,
        u.magasin ? u.magasin.nom : 'N/A'
      ]);
    });
    
    console.log(table.toString());
    console.log(chalk.cyan(`\n📊 Total: ${utilisateurs.length} utilisateurs`));
    
  } catch (error) {
    console.log(chalk.red('❌ Erreur lors de la récupération des utilisateurs:', error.message));
  }
  
  await inquirer.prompt([{ type: 'input', name: 'continue', message: 'Appuyez sur Entrée pour continuer...' }]);
}

async function afficherConfigMaisonMere() {
  console.log(chalk.cyan('⚙️  Configuration système Maison Mère'));
  console.log(`Utilisateur: ${currentUtilisateur.prenom} ${currentUtilisateur.nom} (ID: ${currentUtilisateurId})`);
  console.log(`Rôle: ${currentUtilisateur.role}`);
  console.log(`Email: ${currentUtilisateur.courriel}`);
  console.log(`Mode: Console Maison Mère - Supervision centralisée`);
  console.log(`Microservices: Produit, Stock, Vente, Reporting`);
  await inquirer.prompt([{ type: 'input', name: 'continue', message: 'Appuyez sur Entrée pour continuer...' }]);
}

async function changerUtilisateur() {
  const confirmed = await confirmerAction('Êtes-vous sûr de vouloir changer d\'utilisateur ?');
  if (confirmed) {
    await demarrerSessionMaisonMere();
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

async function demarrerSessionMaisonMere() {
  let authentifie = false;
  while (!authentifie) {
    authentifie = await authentificationMaisonMere();
  }
  
  await afficherMenuMaisonMere();
}

// Démarrage de l'application
async function main() {
  try {
    console.log(chalk.green('🚀 Démarrage de la Console Maison Mère...'));
    console.log(chalk.gray('Mode: Supervision centralisée + Rapports consolidés'));
    console.log('');
    
    // Test de connexion à la base
    await sequelize.authenticate();
    console.log(chalk.green('✅ Connexion à la base de données établie'));
    
    await demarrerSessionMaisonMere();
    
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
