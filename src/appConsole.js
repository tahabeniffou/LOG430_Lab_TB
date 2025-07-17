const inquirer = require('inquirer');
const chalk = require('chalk');
const { Utilisateur, Magasin, sequelize } = require('./models'); // Garde seulement les entités non extraites
const Table = require('cli-table3');
const ApiClient = require('./services/ApiClient');

let currentMagasinId = null;
let currentUtilisateurId = null;
let apiClient = null;

// Initialisation du client API
function initApiClient() {
  const gatewayUrl = process.env.API_GATEWAY_URL || 'http://localhost:8000';
  apiClient = new ApiClient(gatewayUrl);
  console.log(chalk.cyan(`🔗 Connexion à l'API Gateway: ${gatewayUrl}`));
}

// --- Fonctions de la console POS ---

async function login() {
  const magasins = await Magasin.findAll();
  if (magasins.length === 0) {
    console.log(chalk.red('Aucun magasin trouvé. Veuillez d\'abord peupler la base de données avec `node src/models/seed.js`'));
    process.exit(1);
  }
  const { magasinId } = await inquirer.prompt([
    {
      type: 'list',
      name: 'magasinId',
      message: 'Veuillez choisir votre magasin:',
      choices: magasins.map(m => ({ name: m.nom, value: m.id }))
    }
  ]);
  currentMagasinId = magasinId;

  const utilisateurs = await Utilisateur.findAll({ where: { MagasinId: magasinId } });
   if (utilisateurs.length === 0) {
    console.log(chalk.red('Aucun utilisateur trouvé pour ce magasin.'));
    process.exit(1);
  }
  const { utilisateurId } = await inquirer.prompt([
    {
      type: 'list',
      name: 'utilisateurId',
      message: 'Veuillez vous connecter:',
      choices: utilisateurs.map(u => ({ name: u.nom, value: u.id }))
    }
  ]);
  currentUtilisateurId = utilisateurId;

  const magasin = magasins.find(m => m.id === currentMagasinId);
  const utilisateur = utilisateurs.find(u => u.id === currentUtilisateurId);
  console.log(chalk.green(`\nConnecté au magasin ${chalk.bold(magasin.nom)} en tant que ${chalk.bold(utilisateur.nom)}\n`));
}

async function showMainMenu() {
  const { action } = await inquirer.prompt([
    {
      type: 'list',
      name: 'action',
      message: 'Menu Principal - POS Caisse (Version Microservices)',
      choices: [
        { name: '🛒  Nouvelle vente', value: 'new_sale' },
        { name: '📋  Voir les ventes récentes', value: 'view_sales' },
        { name: '❌  Annuler une vente', value: 'cancel_sale' },
        { name: '📦  Consulter le stock', value: 'view_stock' },
        { name: '🚚  Demander un réapprovisionnement', value: 'request_reappro' },
        new inquirer.Separator(),
        { name: '🚪  Quitter', value: 'exit' }
      ]
    }
  ]);

  switch (action) {
    case 'new_sale':
      await handleNewSale();
      break;
    case 'view_sales':
      await viewSales();
      break;
    case 'cancel_sale':
      await cancelSale();
      break;
    case 'view_stock':
      await viewStock();
      break;
    case 'request_reappro':
      await requestReapro();
      break;
    case 'exit':
      console.log(chalk.blue('Au revoir!'));
      await sequelize.close();
      process.exit(0);
  }
  showMainMenu();
}

async function handleNewSale() {
  try {
    // Récupération des produits via l'API
    const response = await apiClient.getProduits(currentMagasinId);
    if (!response.success) {
      console.log(chalk.red('Erreur lors de la récupération des produits'));
      return;
    }

    const produits = response.data.filter(p => p.stock > 0);
    if (produits.length === 0) {
      console.log(chalk.yellow('Aucun produit en stock disponible.'));
      return;
    }

    const produitsEnVente = [];
    let totalVente = 0;

    while (true) {
      const { produitId } = await inquirer.prompt([
        {
          type: 'list',
          name: 'produitId',
          message: 'Ajouter un produit à la vente (ou terminer):',
          choices: [
            ...produits.map(p => ({ 
              name: `${p.nom} - ${p.prix.toFixed(2)}€ (Stock: ${p.stock})`, 
              value: p.id 
            })),
            new inquirer.Separator(),
            { name: 'Terminer la vente et passer au paiement', value: 'done' }
          ]
        }
      ]);

      if (produitId === 'done') break;

      const produit = produits.find(p => p.id === produitId);
      const { quantite } = await inquirer.prompt([
        {
          type: 'number',
          name: 'quantite',
          message: `Quantité pour ${produit.nom}:`,
          validate: (value) => value > 0 && value <= produit.stock ? true : `Quantité invalide (max: ${produit.stock})`
        }
      ]);

      produitsEnVente.push({ produit, quantite });
      totalVente += produit.prix * quantite;
      
      // Mise à jour du stock local pour éviter les surventes
      produit.stock -= quantite;
      
      console.log(chalk.cyan(`Sous-total: ${totalVente.toFixed(2)}€`));
    }

    if (produitsEnVente.length === 0) {
      console.log(chalk.yellow('Vente annulée.'));
      return;
    }

    console.log(chalk.bold(`Total de la vente: ${totalVente.toFixed(2)}€`));
    const { methode } = await inquirer.prompt([
        {
          type: 'list',
          name: 'methode',
          message: 'Méthode de paiement:',
          choices: ['espece', 'carte']
        }
    ]);

    // Création de la vente via l'API
    const venteData = {
      magasinId: currentMagasinId,
      utilisateurId: currentUtilisateurId,
      lignes: produitsEnVente.map(item => ({
        produitId: item.produit.id,
        quantite: item.quantite,
        prixUnitaire: item.produit.prix,
        prixTotal: item.produit.prix * item.quantite
      })),
      total: totalVente,
      methodePaiement: methode
    };

    const createResponse = await apiClient.creerVente(venteData);
    if (createResponse.success) {
      console.log(chalk.green(`✅ Vente créée avec succès (ID: ${createResponse.data.id})`));
      console.log(chalk.green(`💰 Total: ${totalVente.toFixed(2)}€`));
    } else {
      console.log(chalk.red('❌ Erreur lors de la création de la vente'));
    }
  } catch (error) {
    console.error(chalk.red('❌ Erreur lors du traitement de la vente:', error.message));
  }
}

async function viewSales() {
  try {
    // Récupération des ventes via l'API
    const response = await apiClient.getVentes(currentMagasinId);
    if (!response.success) {
      console.log(chalk.red('Erreur lors de la récupération des ventes'));
      return;
    }

    const ventes = response.data.slice(0, 10); // Limiter à 10 ventes récentes
    if (ventes.length === 0) {
      console.log(chalk.yellow('Aucune vente récente pour ce magasin.'));
      return;
    }

    ventes.forEach(vente => {
      const table = new Table({
        head: [
          chalk.blue(`Vente #${vente.id}`), 
          chalk.blue(`Date: ${new Date(vente.date).toLocaleString()}`), 
          chalk.blue(`Total: ${vente.total.toFixed(2)}€`), 
          chalk.blue(`Statut: ${vente.statut}`)
        ]
      });

      if (vente.lignes && vente.lignes.length > 0) {
        vente.lignes.forEach(ligne => {
          table.push([
            ligne.produitNom || `Produit #${ligne.produitId}`,
            `Qté: ${ligne.quantite}`,
            `Prix unitaire: ${ligne.prixUnitaire.toFixed(2)}€`,
            `Sous-total: ${ligne.prixTotal.toFixed(2)}€`
          ]);
        });
      }

      console.log(table.toString());
    });
  } catch (error) {
    console.error(chalk.red('❌ Erreur lors de la récupération des ventes:', error.message));
  }
}

async function cancelSale() {
  try {
    // Récupération des ventes via l'API
    const response = await apiClient.getVentes(currentMagasinId);
    if (!response.success || response.data.length === 0) {
      console.log(chalk.yellow('Aucune vente à annuler.'));
      return;
    }

    const ventesAnnulables = response.data.filter(v => v.statut !== 'annulee');
    if (ventesAnnulables.length === 0) {
      console.log(chalk.yellow('Aucune vente active à annuler.'));
      return;
    }

    const { venteId } = await inquirer.prompt([
      {
        type: 'list',
        name: 'venteId',
        message: 'Quelle vente annuler?',
        choices: ventesAnnulables.map(v => ({ 
          name: `Vente #${v.id} - ${v.total.toFixed(2)}€ - ${new Date(v.date).toLocaleDateString()}`, 
          value: v.id 
        }))
      }
    ]);

    const cancelResponse = await apiClient.annulerVente(venteId);
    if (cancelResponse.success) {
      console.log(chalk.green(`✅ Vente #${venteId} annulée avec succès.`));
    } else {
      console.log(chalk.red('❌ Erreur lors de l\'annulation de la vente'));
    }
  } catch (error) {
    console.error(chalk.red('❌ Erreur lors de l\'annulation:', error.message));
  }
}

async function viewStock() {
  try {
    // Récupération du stock via l'API
    const response = await apiClient.getStockByMagasin(currentMagasinId);
    if (!response.success) {
      console.log(chalk.red('Erreur lors de la récupération du stock'));
      return;
    }

    const produits = response.data;
    if (produits.length === 0) {
      console.log(chalk.yellow('Aucun produit en stock.'));
      return;
    }

    const table = new Table({ 
      head: [chalk.bold('ID'), chalk.bold('Produit'), chalk.bold('Prix'), chalk.bold('Stock')] 
    });
    
    produits.forEach(p => {
      table.push([p.id, p.nom, `${p.prix.toFixed(2)}€`, p.stock]);
    });
    
    console.log(table.toString());
  } catch (error) {
    console.error(chalk.red('❌ Erreur lors de la récupération du stock:', error.message));
  }
}

async function requestReapro() {
  try {
    // Récupération des produits via l'API
    const response = await apiClient.getProduits(currentMagasinId);
    if (!response.success) {
      console.log(chalk.red('Erreur lors de la récupération des produits'));
      return;
    }

    const produits = response.data;
    if (produits.length === 0) {
      console.log(chalk.yellow('Aucun produit disponible.'));
      return;
    }

    const { produitId } = await inquirer.prompt([
      {
        type: 'list',
        name: 'produitId',
        message: 'Pour quel produit faire une demande?',
        choices: produits.map(p => ({ 
          name: `${p.nom} (Stock: ${p.stock})`, 
          value: p.id 
        }))
      }
    ]);

    const { quantiteDemandee } = await inquirer.prompt([
      {
        type: 'number',
        name: 'quantiteDemandee',
        message: 'Quantité demandée:',
        validate: (value) => value > 0 ? true : 'La quantité doit être positive.'
      }
    ]);

    const reapproData = {
      produitId: produitId,
      magasinId: currentMagasinId,
      quantiteDemandee: quantiteDemandee
    };

    const reapproResponse = await apiClient.demanderReapprovisionnement(reapproData);
    if (reapproResponse.success) {
      console.log(chalk.green('✅ Demande de réapprovisionnement envoyée!'));
    } else {
      console.log(chalk.red('❌ Erreur lors de l\'envoi de la demande'));
    }
  } catch (error) {
    console.error(chalk.red('❌ Erreur lors de la demande de réapprovisionnement:', error.message));
  }
}

// --- Démarrage de l'application ---
async function start() {
  try {
    console.log(chalk.bold.yellow('--- Système de Caisse POS (Version Microservices) ---'));
    
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
    
    await login();
    await showMainMenu();
  } catch (error) {
    console.error(chalk.red('Une erreur critique est survenue:', error));
    await sequelize.close();
    process.exit(1);
  }
}

start();
