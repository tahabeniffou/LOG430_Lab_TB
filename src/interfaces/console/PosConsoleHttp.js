// Console POS HTTP - Utilise le Load Balancer
const axios = require('axios');
const inquirer = require('inquirer');
const Table = require('cli-table3');
const chalk = require('chalk');

class PosConsoleHttp {
  constructor(apiBaseUrl = 'http://localhost:8000') {
    this.apiBaseUrl = `${apiBaseUrl}/api/v1`;
    this.magasinActuel = null;
    this.utilisateurActuel = null;
    this.utilisateurConnecte = null;
  }

  async demarrer() {
    console.clear();
    console.log(chalk.bold.blue('🏪 === CONSOLE POS (HTTP) ===\n'));
    console.log(chalk.yellow(`🌐 Connecté au Load Balancer: ${this.apiBaseUrl}\n`));

    try {
      // Test de connectivité
      await this.verifierConnectivite();

      // Sélection du magasin
      await this.selectionnerMagasin();

      // Sélection de l'utilisateur du magasin
      await this.selectionnerUtilisateur();

      // Menu principal
      await this.afficherMenuPrincipal();
    } catch (error) {
      console.log(chalk.red('❌ Erreur de connexion:', error.message));
      process.exit(1);
    }
  }

  async verifierConnectivite() {
    console.log(chalk.yellow('🔍 Vérification de la connectivité...'));
    const response = await axios.get(`${this.apiBaseUrl.replace('/api/v1', '')}/health`);
    if (response.data.status === 'OK') {
      console.log(chalk.green('✅ Connexion au système réussie'));
      return true;
    } else {
      throw new Error('Système non disponible');
    }
  }

  async selectionnerMagasin() {
    const response = await axios.get(`${this.apiBaseUrl}/magasins`);
    const magasins = response.data;

    if (magasins.length === 0) {
      throw new Error('Aucun magasin disponible');
    }

    const choix = await inquirer.prompt([
      {
        type: 'list',
        name: 'magasin',
        message: 'Sélectionnez votre magasin:',
        choices: magasins.map(m => ({
          name: `${m.nom} - ${m.adresse}`,
          value: m
        }))
      }
    ]);

    this.magasinActuel = choix.magasin;
    console.log(chalk.green(`✅ Magasin sélectionné: ${this.magasinActuel.nom}`));
  }

  async selectionnerUtilisateur() {
    const response = await axios.get(`${this.apiBaseUrl}/utilisateurs?magasinId=${this.magasinActuel.id}`);
    const utilisateurs = response.data;

    if (utilisateurs.length === 0) {
      throw new Error('Aucun utilisateur disponible pour ce magasin');
    }

    const choix = await inquirer.prompt([
      {
        type: 'list',
        name: 'utilisateur',
        message: 'Sélectionnez votre compte utilisateur:',
        choices: utilisateurs.map(u => ({
          name: `${u.prenom} ${u.nom} (${u.role})`,
          value: u
        }))
      }
    ]);

    // Demander le mot de passe
    const motDePasse = await inquirer.prompt([
      {
        type: 'password',
        name: 'motDePasse',
        message: 'Mot de passe:'
      }
    ]);

    // Vérification du mot de passe
    if (motDePasse.motDePasse !== choix.utilisateur.motDePasse) {
      console.log(chalk.red('❌ Mot de passe incorrect'));
      process.exit(1);
    }

    this.utilisateurActuel = choix.utilisateur;
    this.utilisateurConnecte = choix.utilisateur;
    console.log(chalk.green(`✅ Bienvenue ${this.utilisateurActuel.prenom} ${this.utilisateurActuel.nom}!`));
  }

  async afficherMenuPrincipal() {
    while (true) {
      console.log('\n' + '='.repeat(50));
      console.log(chalk.bold.blue(`🏪 POS - ${this.magasinActuel.nom}`));
      console.log(chalk.yellow(`👤 ${this.utilisateurActuel.prenom} ${this.utilisateurActuel.nom}`));
      console.log('='.repeat(50));

      const choix = await inquirer.prompt([
        {
          type: 'list',
          name: 'action',
          message: 'Que souhaitez-vous faire?',
          choices: [
            { name: '🛍️  Nouvelle vente', value: 'nouvelle_vente' },
            { name: '📦 Consulter produits', value: 'produits' },
            { name: '📊 Consulter ventes', value: 'ventes' },
            { name: '📋 Vérifier stock', value: 'stock' },
            { name: '❌ Annuler une vente', value: 'annuler_vente' },
            { name: '🚪 Quitter', value: 'quitter' }
          ]
        }
      ]);

      switch (choix.action) {
        case 'nouvelle_vente':
          await this.creerNouvelleVente();
          break;
        case 'produits':
          await this.consulterProduits();
          break;
        case 'ventes':
          await this.consulterVentes();
          break;
        case 'stock':
          await this.verifierStock();
          break;
        case 'annuler_vente':
          await this.annulerVente();
          break;
        case 'quitter':
          console.log(chalk.yellow('👋 Au revoir!'));
          process.exit(0);
          break;
      }
    }
  }

  async creerNouvelleVente() {
    console.log(chalk.bold.cyan('\n🛍️ === NOUVELLE VENTE ==='));

    const lignesVente = [];
    let continuer = true;

    while (continuer) {
      // Afficher les produits disponibles
      const produits = await this.listerProduits();
      
      const choixProduit = await inquirer.prompt([
        {
          type: 'list',
          name: 'produit',
          message: 'Choisissez un produit:',
          choices: [
            ...produits.map(p => ({
              name: `${p.nom} - ${p.prix}$ (Stock: ${p.stock})`,
              value: p
            })),
            { name: '❌ Annuler', value: null }
          ]
        }
      ]);

      if (!choixProduit.produit) break;

      const quantite = await inquirer.prompt([
        {
          type: 'number',
          name: 'quantite',
          message: 'Quantité:',
          validate: (input) => input > 0 || 'La quantité doit être positive'
        }
      ]);

      if (quantite.quantite > choixProduit.produit.stock) {
        console.log(chalk.red(`❌ Stock insuffisant (disponible: ${choixProduit.produit.stock})`));
        continue;
      }

      lignesVente.push({
        produitId: choixProduit.produit.id,
        quantite: quantite.quantite,
        nom: choixProduit.produit.nom,
        prix: choixProduit.produit.prix
      });

      const continuerChoix = await inquirer.prompt([
        {
          type: 'confirm',
          name: 'continuer',
          message: 'Ajouter un autre produit?',
          default: false
        }
      ]);

      continuer = continuerChoix.continuer;
    }

    if (lignesVente.length === 0) {
      console.log(chalk.yellow('Vente annulée - Aucun produit sélectionné'));
      return;
    }

    // Afficher récapitulatif
    console.log(chalk.bold.cyan('\n📋 RÉCAPITULATIF DE LA VENTE:'));
    const table = new Table({
      head: ['Produit', 'Quantité', 'Prix unit.', 'Sous-total'],
      style: { head: ['cyan'] }
    });

    let total = 0;
    lignesVente.forEach(ligne => {
      const sousTotal = ligne.quantite * ligne.prix;
      total += sousTotal;
      table.push([
        ligne.nom,
        ligne.quantite,
        `${ligne.prix.toFixed(2)}$`,
        `${sousTotal.toFixed(2)}$`
      ]);
    });

    console.log(table.toString());
    console.log(chalk.bold.green(`💰 TOTAL: ${total.toFixed(2)}$`));

    const confirmation = await inquirer.prompt([
      {
        type: 'confirm',
        name: 'confirmer',
        message: 'Confirmer la vente?'
      }
    ]);

    if (confirmation.confirmer) {
      try {
        const vente = await this.creerVente({
          magasinId: this.magasinActuel.id,
          utilisateurId: this.utilisateurActuel.id,
          lignes: lignesVente.map(l => ({
            produitId: l.produitId,
            quantite: l.quantite
          }))
        });

        console.log(chalk.bold.green(`✅ Vente créée avec succès! ID: ${vente.id}`));
        console.log(chalk.green(`💰 Total: ${vente.total.toFixed(2)}$`));
      } catch (error) {
        console.log(chalk.red(`❌ Erreur lors de la création: ${error.message}`));
      }
    } else {
      console.log(chalk.yellow('Vente annulée'));
    }
  }

  async consulterProduits() {
    console.log(chalk.bold.cyan('\n📦 === PRODUITS DISPONIBLES ==='));
    
    const produits = await this.listerProduits();
    
    const table = new Table({
      head: ['ID', 'Nom', 'Prix', 'Stock'],
      style: { head: ['cyan'] }
    });

    produits.forEach(produit => {
      table.push([
        produit.id,
        produit.nom,
        `${produit.prix.toFixed(2)}$`,
        produit.stock
      ]);
    });

    console.log(table.toString());
  }

  async consulterVentes() {
    console.log(chalk.bold.cyan('\n📊 === VENTES DU MAGASIN ==='));
    
    const response = await axios.get(`${this.apiBaseUrl}/ventes?magasinId=${this.magasinActuel.id}`);
    const ventes = response.data;

    if (ventes.length === 0) {
      console.log(chalk.yellow('Aucune vente trouvée'));
      return;
    }

    const table = new Table({
      head: ['ID', 'Date', 'Total', 'Statut'],
      style: { head: ['cyan'] }
    });

    ventes.forEach(vente => {
      table.push([
        vente.id,
        new Date(vente.date || vente.createdAt).toLocaleDateString(),
        `${vente.total.toFixed(2)}$`,
        vente.statut || 'active'
      ]);
    });

    console.log(table.toString());
  }

  async verifierStock() {
    console.log(chalk.bold.cyan('\n📋 === VÉRIFICATION STOCK ==='));
    
    const produits = await this.listerProduits();
    const produitsRupture = produits.filter(p => p.stock <= 5);

    if (produitsRupture.length > 0) {
      console.log(chalk.red('⚠️  PRODUITS EN RUPTURE/FAIBLE STOCK:'));
      const table = new Table({
        head: ['Produit', 'Stock', 'Statut'],
        style: { head: ['red'] }
      });

      produitsRupture.forEach(produit => {
        const statut = produit.stock === 0 ? 'RUPTURE' : 'FAIBLE';
        table.push([
          produit.nom,
          produit.stock,
          chalk.red(statut)
        ]);
      });

      console.log(table.toString());
    } else {
      console.log(chalk.green('✅ Tous les produits ont un stock suffisant'));
    }
  }

  async annulerVente() {
    console.log(chalk.bold.red('\n❌ === ANNULATION VENTE ==='));
    
    const venteId = await inquirer.prompt([
      {
        type: 'number',
        name: 'id',
        message: 'ID de la vente à annuler:',
        validate: (input) => input > 0 || 'L\'ID doit être positif'
      }
    ]);

    try {
      await axios.post(`${this.apiBaseUrl}/ventes/${venteId.id}/annuler`);
      console.log(chalk.green('✅ Vente annulée avec succès!'));
    } catch (error) {
      console.log(chalk.red(`❌ Erreur: ${error.response?.data?.message || error.message}`));
    }
  }

  // Méthodes utilitaires
  async listerProduits() {
    const response = await axios.get(`${this.apiBaseUrl}/produits`);
    return response.data;
  }

  async creerVente(donneesVente) {
    const response = await axios.post(`${this.apiBaseUrl}/ventes`, donneesVente);
    return response.data;
  }
}

// Démarrage de la console si exécutée directement
if (require.main === module) {
  const console = new PosConsoleHttp();
  console.demarrer().catch(err => {
    console.error('Erreur fatale:', err);
    process.exit(1);
  });
}

module.exports = PosConsoleHttp;
