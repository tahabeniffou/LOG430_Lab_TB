const inquirer = require('inquirer');
const chalk = require('chalk');
const { sequelize } = require('./models'); // Garde seulement les entités non extraites
const Table = require('cli-table3');
const ApiClient = require('./services/ApiClient');

let apiClient = null;

// Initialisation du client API
function initApiClient() {
  const gatewayUrl = process.env.API_GATEWAY_URL || 'http://localhost:9000';
  apiClient = new ApiClient(gatewayUrl);
  console.log(chalk.cyan(`🔗 Connexion à l'API Gateway: ${gatewayUrl}`));
}

// --- Fonctions de la console Maison Mère ---

async function showMainMenu() {
  const { action } = await inquirer.prompt([
    {
      type: 'list',
      name: 'action',
      message: 'Menu Principal - Maison Mère (Version Microservices)',
      choices: [
        { name: '📊  Afficher les stocks globaux', value: 'global_stock' },
        { name: '📈  Générer un rapport des ventes', value: 'sales_report' },
        { name: '🚚  Voir les demandes de réapprovisionnement', value: 'view_reappro' },
        new inquirer.Separator(),
        { name: '🚪  Quitter', value: 'exit' }
      ]
    }
  ]);

  switch (action) {
    case 'global_stock':
      await showGlobalStock();
      break;
    case 'sales_report':
      await showSalesReport();
      break;
    case 'view_reappro':
      await viewReapproRequests();
      break;
    case 'exit':
      console.log(chalk.blue('Au revoir!'));
      await sequelize.close();
      process.exit(0);
  }
  showMainMenu();
}

async function showGlobalStock() {
  try {
    // Récupération du stock global via l'API
    const response = await apiClient.getStockGlobal();
    if (!response.success) {
      console.log(chalk.red('Erreur lors de la récupération du stock global'));
      return;
    }

    const stocks = response.data;
    if (stocks.length === 0) {
      console.log(chalk.yellow('Aucun stock disponible.'));
      return;
    }

    const table = new Table({ 
      head: [chalk.bold('Magasin'), chalk.bold('Produit'), chalk.bold('Prix'), chalk.bold('Stock')] 
    });
    
    stocks.forEach(item => {
      table.push([
        item.magasinNom || `Magasin #${item.magasinId}`, 
        item.produitNom || `Produit #${item.produitId}`, 
        `${item.prix.toFixed(2)}€`, 
        item.stock
      ]);
    });
    
    console.log(table.toString());
  } catch (error) {
    console.error(chalk.red('❌ Erreur lors de la récupération du stock global:', error.message));
  }
}

async function showSalesReport() {
  try {
    // Récupération du rapport de ventes via l'API
    const response = await apiClient.getRapportVentes();
    if (!response.success) {
      console.log(chalk.red('Erreur lors de la génération du rapport de ventes'));
      return;
    }

    const rapport = response.data;
    
    // Affichage du chiffre d'affaires total
    console.log(chalk.bold.green(`\nChiffre d'affaires total: ${rapport.chiffreAffairesTotal ? rapport.chiffreAffairesTotal.toFixed(2) : '0.00'}€`));

    // Produit le plus vendu
    if (rapport.produitPlusVendu) {
      console.log(chalk.bold.cyan(`Produit le plus vendu: ${rapport.produitPlusVendu.nom} (${rapport.produitPlusVendu.quantiteTotale} unités)`));
    }

    // Ventes par magasin
    if (rapport.ventesParMagasin && rapport.ventesParMagasin.length > 0) {
      const table = new Table({ 
        head: [chalk.bold('Magasin'), chalk.bold('Chiffre d\'affaires'), chalk.bold('Nombre de ventes')] 
      });
      
      rapport.ventesParMagasin.forEach(magasin => {
        table.push([
          magasin.nom || `Magasin #${magasin.id}`,
          `${magasin.chiffreAffaires ? magasin.chiffreAffaires.toFixed(2) : '0.00'}€`,
          magasin.nombreVentes || 0
        ]);
      });
      
      console.log('\n' + table.toString());
    }
  } catch (error) {
    console.error(chalk.red('❌ Erreur lors de la génération du rapport de ventes:', error.message));
  }
}

async function viewReapproRequests() {
  try {
    // Récupération des demandes de réapprovisionnement via l'API
    const response = await apiClient.getDemandesReappro();
    if (!response.success) {
      console.log(chalk.red('Erreur lors de la récupération des demandes de réapprovisionnement'));
      return;
    }

    const demandes = response.data.filter(d => d.statut === 'en_attente');
    if (demandes.length === 0) {
      console.log(chalk.yellow('Aucune demande de réapprovisionnement en attente.'));
      return;
    }

    const table = new Table({ 
      head: [
        chalk.bold('ID'), 
        chalk.bold('Magasin'), 
        chalk.bold('Produit'), 
        chalk.bold('Qté Demandée'), 
        chalk.bold('Date')
      ] 
    });
    
    demandes.forEach(demande => {
      table.push([
        demande.id,
        demande.magasinNom || `Magasin #${demande.magasinId}`,
        demande.produitNom || `Produit #${demande.produitId}`,
        demande.quantiteDemandee,
        new Date(demande.createdAt).toLocaleDateString()
      ]);
    });
    
    console.log(table.toString());
  } catch (error) {
    console.error(chalk.red('❌ Erreur lors de la récupération des demandes de réapprovisionnement:', error.message));
  }
}

// --- Démarrage de l'application ---
async function start() {
  try {
    console.log(chalk.bold.yellow('--- Console Maison Mère (Version Microservices) ---'));
    
    // Initialisation du client API
    initApiClient();
    
    // Attendre un peu que l'API Gateway soit prête
    console.log(chalk.cyan('🔄 Vérification de la disponibilité de l\'API Gateway...'));
    try {
      await apiClient.healthCheck();
      console.log(chalk.green('✅ API Gateway disponible'));
    } catch (error) {
      console.log(chalk.yellow('⚠️  API Gateway non disponible, certaines fonctionnalités pourraient être limitées'));
    }
    
    await showMainMenu();
  } catch (error) {
    console.error(chalk.red('Une erreur critique est survenue:', error));
    await sequelize.close();
    process.exit(1);
  }
}

start();
