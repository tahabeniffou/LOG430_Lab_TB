// Console Maison Mère HTTP - Utilise l'API Gateway
const axios = require('axios');
const inquirer = require('inquirer');
const Table = require('cli-table3');
const chalk = require('chalk');

class MaisonMereConsoleHttp {
  constructor(apiBaseUrl = 'http://localhost:3000') {
    this.apiBaseUrl = `${apiBaseUrl}/maisonmere`;
    this.utilisateurActuel = null;
    this.utilisateurConnecte = null;
  }

  async demarrer() {
    console.clear();
    console.log(chalk.bold.magenta('🏢 === CONSOLE MAISON MÈRE (HTTP) ===\n'));
    console.log(chalk.yellow(`🌐 Connecté au Load Balancer: ${this.apiBaseUrl}\n`));

    try {
      // Test de connectivité
      await this.verifierConnectivite();

      // Authentification admin
      await this.authentifierAdmin();

      // Menu principal
      await this.afficherMenuPrincipal();
    } catch (error) {
      console.log(chalk.red('❌ Erreur de connexion:', error.message));
      process.exit(1);
    }
  }

  async verifierConnectivite() {
    console.log(chalk.yellow('🔍 Vérification de la connectivité...'));
    const healthUrl = `${this.apiBaseUrl.replace('/maisonmere', '')}/health`;
    console.log(chalk.gray(`🔗 Tentative de connexion: ${healthUrl}`));
    const response = await axios.get(healthUrl);
    if (response.data.status === 'OK') {
      console.log(chalk.green('✅ Connexion au système réussie'));
      return true;
    } else {
      throw new Error('Système non disponible');
    }
  }

  async authentifierAdmin() {
    const response = await axios.get(`${this.apiBaseUrl}/utilisateurs`);
    const admins = response.data.filter(u => u.role === 'admin' || u.role === 'directeur');

    if (admins.length === 0) {
      throw new Error('Aucun administrateur disponible');
    }

    const choix = await inquirer.prompt([
      {
        type: 'list',
        name: 'utilisateur',
        message: 'Sélectionnez votre compte administrateur:',
        choices: admins.map(u => ({
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
      console.log('\n' + '='.repeat(60));
      console.log(chalk.bold.magenta('🏢 CONSOLE MAISON MÈRE'));
      console.log(chalk.yellow(`👤 ${this.utilisateurActuel.prenom} ${this.utilisateurActuel.nom} (${this.utilisateurActuel.role})`));
      console.log('='.repeat(60));

      const choix = await inquirer.prompt([
        {
          type: 'list',
          name: 'action',
          message: 'Que souhaitez-vous faire?',
          choices: [
            { name: '📊 Rapports de ventes', value: 'rapports' },
            { name: '🏪 Gestion des magasins', value: 'magasins' },
            { name: '👥 Gestion des utilisateurs', value: 'utilisateurs' },
            { name: '📦 Inventaire global', value: 'inventaire' },
            { name: '💰 Chiffre d\'affaires', value: 'chiffre_affaires' },
            { name: '📈 Statistiques détaillées', value: 'statistiques' },
            { name: '🔍 Recherche avancée', value: 'recherche' },
            { name: '🚪 Quitter', value: 'quitter' }
          ]
        }
      ]);

      switch (choix.action) {
        case 'rapports':
          await this.afficherRapports();
          break;
        case 'magasins':
          await this.gererMagasins();
          break;
        case 'utilisateurs':
          await this.gererUtilisateurs();
          break;
        case 'inventaire':
          await this.afficherInventaire();
          break;
        case 'chiffre_affaires':
          await this.afficherChiffreAffaires();
          break;
        case 'statistiques':
          await this.afficherStatistiques();
          break;
        case 'recherche':
          await this.rechercheAvancee();
          break;
        case 'quitter':
          console.log(chalk.yellow('👋 Au revoir!'));
          process.exit(0);
          break;
      }
    }
  }

  async afficherRapports() {
    console.log(chalk.bold.cyan('\n📊 === RAPPORTS DE VENTES ==='));
    
    const rapports = await this.genererRapports();
    
    console.log(chalk.bold.green(`💰 Chiffre d'affaires total: ${rapports.chiffreAffaireTotal.toFixed(2)}$`));
    console.log(chalk.bold.blue(`📊 Nombre total de ventes: ${rapports.totalVentes}`));

    if (rapports.ventes && rapports.ventes.length > 0) {
      const table = new Table({
        head: ['ID', 'Date', 'Magasin', 'Vendeur', 'Total'],
        style: { head: ['cyan'] }
      });

      rapports.ventes.slice(0, 10).forEach(vente => {
        table.push([
          vente.id,
          new Date(vente.date || vente.createdAt).toLocaleDateString(),
          vente.Magasin?.nom || 'N/A',
          `${vente.Utilisateur?.prenom || ''} ${vente.Utilisateur?.nom || ''}`.trim() || 'N/A',
          `${vente.total.toFixed(2)}$`
        ]);
      });

      console.log('\n📋 Dernières ventes:');
      console.log(table.toString());

      if (rapports.ventes.length > 10) {
        console.log(chalk.yellow(`... et ${rapports.ventes.length - 10} autres ventes`));
      }
    }
  }

  async gererMagasins() {
    console.log(chalk.bold.cyan('\n🏪 === GESTION DES MAGASINS ==='));
    
    const magasins = await this.listerMagasins();
    
    const table = new Table({
      head: ['ID', 'Nom', 'Adresse', 'Utilisateurs'],
      style: { head: ['cyan'] }
    });

    for (const magasin of magasins) {
      const utilisateurs = await this.obtenirUtilisateursMagasin(magasin.id);
      table.push([
        magasin.id,
        magasin.nom,
        magasin.adresse || 'N/A',
        utilisateurs.length
      ]);
    }

    console.log(table.toString());

    // Options de gestion
    const action = await inquirer.prompt([
      {
        type: 'list',
        name: 'action',
        message: 'Action à effectuer:',
        choices: [
          { name: '👁️  Voir détails d\'un magasin', value: 'details' },
          { name: '📊 Statistiques par magasin', value: 'stats' },
          { name: '🔙 Retour', value: 'retour' }
        ]
      }
    ]);

    if (action.action === 'details') {
      await this.afficherDetailsMagasin(magasins);
    } else if (action.action === 'stats') {
      await this.afficherStatistiquesMagasins(magasins);
    }
  }

  async afficherDetailsMagasin(magasins) {
    const choix = await inquirer.prompt([
      {
        type: 'list',
        name: 'magasin',
        message: 'Sélectionnez un magasin:',
        choices: magasins.map(m => ({
          name: `${m.nom} - ${m.adresse}`,
          value: m
        }))
      }
    ]);

    const magasin = choix.magasin;
    console.log(chalk.bold.cyan(`\n🏪 DÉTAILS - ${magasin.nom}`));
    
    // Utilisateurs du magasin
    const utilisateurs = await this.obtenirUtilisateursMagasin(magasin.id);
    console.log(chalk.bold.blue('\n👥 UTILISATEURS:'));
    const tableUsers = new Table({
      head: ['Nom', 'Prénom', 'Rôle', 'Email'],
      style: { head: ['blue'] }
    });
    
    utilisateurs.forEach(user => {
      tableUsers.push([
        user.nom,
        user.prenom,
        user.role,
        user.courriel || 'N/A'
      ]);
    });
    console.log(tableUsers.toString());

    // Ventes du magasin
    const ventes = await this.obtenirVentesMagasin(magasin.id);
    console.log(chalk.bold.green(`\n💰 VENTES: ${ventes.length} vente(s)`));
    
    if (ventes.length > 0) {
      const totalCA = ventes.reduce((sum, v) => sum + parseFloat(v.total), 0);
      console.log(chalk.bold.green(`💰 Chiffre d'affaires: ${totalCA.toFixed(2)}$`));
    }
  }

  async gererUtilisateurs() {
    console.log(chalk.bold.cyan('\n👥 === GESTION DES UTILISATEURS ==='));
    
    const utilisateurs = await this.listerUtilisateurs();
    
    const table = new Table({
      head: ['ID', 'Nom', 'Prénom', 'Rôle', 'Magasin'],
      style: { head: ['cyan'] }
    });

    const magasins = await this.listerMagasins();
    const magasinsMap = new Map(magasins.map(m => [m.id, m.nom]));

    utilisateurs.forEach(user => {
      table.push([
        user.id,
        user.nom,
        user.prenom,
        user.role,
        magasinsMap.get(user.magasinId) || 'N/A'
      ]);
    });

    console.log(table.toString());

    // Statistiques
    const stats = this.calculerStatistiquesUtilisateurs(utilisateurs);
    console.log(chalk.bold.blue('\n📊 STATISTIQUES:'));
    console.log(`👥 Total utilisateurs: ${stats.total}`);
    console.log(`👨‍💼 Administrateurs: ${stats.admins}`);
    console.log(`👤 Vendeurs: ${stats.vendeurs}`);
    console.log(`👨‍💼 Directeurs: ${stats.directeurs}`);
  }

  async afficherInventaire() {
    console.log(chalk.bold.cyan('\n📦 === INVENTAIRE GLOBAL ==='));
    
    const produits = await this.listerTousProduits();
    
    const table = new Table({
      head: ['ID', 'Nom', 'Prix', 'Stock', 'Magasin', 'Statut'],
      style: { head: ['cyan'] }
    });

    const magasins = await this.listerMagasins();
    const magasinsMap = new Map(magasins.map(m => [m.id, m.nom]));

    produits.forEach(produit => {
      let statut = '✅ OK';
      if (produit.stock === 0) statut = '❌ RUPTURE';
      else if (produit.stock <= 5) statut = '⚠️ FAIBLE';

      table.push([
        produit.id,
        produit.nom,
        `${produit.prix.toFixed(2)}$`,
        produit.stock,
        magasinsMap.get(produit.magasinId) || 'N/A',
        statut
      ]);
    });

    console.log(table.toString());

    // Alertes
    const produitsRupture = produits.filter(p => p.stock === 0);
    const produitsFaibleStock = produits.filter(p => p.stock > 0 && p.stock <= 5);

    if (produitsRupture.length > 0) {
      console.log(chalk.red(`\n❌ RUPTURES DE STOCK: ${produitsRupture.length} produit(s)`));
    }
    if (produitsFaibleStock.length > 0) {
      console.log(chalk.yellow(`\n⚠️ STOCK FAIBLE: ${produitsFaibleStock.length} produit(s)`));
    }
  }

  async afficherChiffreAffaires() {
    console.log(chalk.bold.cyan('\n💰 === CHIFFRE D\'AFFAIRES ==='));
    
    const rapports = await this.genererRapports();
    const magasins = await this.listerMagasins();

    console.log(chalk.bold.green(`💰 TOTAL GÉNÉRAL: ${rapports.chiffreAffaireTotal.toFixed(2)}$`));
    console.log(chalk.bold.blue(`📊 NOMBRE DE VENTES: ${rapports.totalVentes}`));

    // Chiffre d'affaires par magasin
    const caParMagasin = new Map();
    const ventesParMagasin = new Map();

    if (rapports.ventes) {
      rapports.ventes.forEach(vente => {
        const magasinNom = vente.Magasin?.nom || 'Inconnu';
        const currentCA = caParMagasin.get(magasinNom) || 0;
        const currentVentes = ventesParMagasin.get(magasinNom) || 0;
        
        caParMagasin.set(magasinNom, currentCA + parseFloat(vente.total));
        ventesParMagasin.set(magasinNom, currentVentes + 1);
      });
    }

    if (caParMagasin.size > 0) {
      console.log(chalk.bold.cyan('\n📊 RÉPARTITION PAR MAGASIN:'));
      const tableMagasins = new Table({
        head: ['Magasin', 'Ventes', 'Chiffre d\'affaires', '% du total'],
        style: { head: ['cyan'] }
      });

      for (const [magasin, ca] of caParMagasin.entries()) {
        const ventes = ventesParMagasin.get(magasin) || 0;
        const pourcentage = ((ca / rapports.chiffreAffaireTotal) * 100).toFixed(1);
        
        tableMagasins.push([
          magasin,
          ventes,
          `${ca.toFixed(2)}$`,
          `${pourcentage}%`
        ]);
      }

      console.log(tableMagasins.toString());
    }
  }

  async afficherStatistiques() {
    console.log(chalk.bold.cyan('\n📈 === STATISTIQUES DÉTAILLÉES ==='));
    
    const [rapports, produits, utilisateurs, magasins] = await Promise.all([
      this.genererRapports(),
      this.listerTousProduits(),
      this.listerUtilisateurs(),
      this.listerMagasins()
    ]);

    // Statistiques générales
    console.log(chalk.bold.blue('📊 STATISTIQUES GÉNÉRALES:'));
    console.log(`🏪 Nombre de magasins: ${magasins.length}`);
    console.log(`👥 Nombre d'utilisateurs: ${utilisateurs.length}`);
    console.log(`📦 Nombre de produits: ${produits.length}`);
    console.log(`🛍️ Nombre de ventes: ${rapports.totalVentes}`);
    console.log(`💰 Chiffre d'affaires: ${rapports.chiffreAffaireTotal.toFixed(2)}$`);

    // Statistiques produits
    const produitsRupture = produits.filter(p => p.stock === 0).length;
    const produitsFaibleStock = produits.filter(p => p.stock > 0 && p.stock <= 5).length;
    const stockTotal = produits.reduce((sum, p) => sum + p.stock, 0);
    const valeurStock = produits.reduce((sum, p) => sum + (p.stock * p.prix), 0);

    console.log(chalk.bold.green('\n📦 STATISTIQUES INVENTAIRE:'));
    console.log(`📊 Stock total: ${stockTotal} unités`);
    console.log(`💰 Valeur du stock: ${valeurStock.toFixed(2)}$`);
    console.log(`❌ Produits en rupture: ${produitsRupture}`);
    console.log(`⚠️ Produits à stock faible: ${produitsFaibleStock}`);

    // Statistiques ventes
    if (rapports.ventes && rapports.ventes.length > 0) {
      const panierMoyen = rapports.chiffreAffaireTotal / rapports.totalVentes;
      console.log(chalk.bold.magenta('\n🛍️ STATISTIQUES VENTES:'));
      console.log(`💰 Panier moyen: ${panierMoyen.toFixed(2)}$`);
    }
  }

  async rechercheAvancee() {
    console.log(chalk.bold.cyan('\n🔍 === RECHERCHE AVANCÉE ==='));
    
    const typeRecherche = await inquirer.prompt([
      {
        type: 'list',
        name: 'type',
        message: 'Type de recherche:',
        choices: [
          { name: '👤 Rechercher un utilisateur', value: 'utilisateur' },
          { name: '📦 Rechercher un produit', value: 'produit' },
          { name: '🛍️ Rechercher une vente', value: 'vente' },
          { name: '🔙 Retour', value: 'retour' }
        ]
      }
    ]);

    switch (typeRecherche.type) {
      case 'utilisateur':
        await this.rechercherUtilisateur();
        break;
      case 'produit':
        await this.rechercherProduit();
        break;
      case 'vente':
        await this.rechercherVente();
        break;
    }
  }

  async rechercherUtilisateur() {
    const critere = await inquirer.prompt([
      {
        type: 'input',
        name: 'terme',
        message: 'Nom ou prénom à rechercher:'
      }
    ]);

    const utilisateurs = await this.listerUtilisateurs();
    const resultats = utilisateurs.filter(u => 
      u.nom.toLowerCase().includes(critere.terme.toLowerCase()) ||
      u.prenom.toLowerCase().includes(critere.terme.toLowerCase())
    );

    if (resultats.length === 0) {
      console.log(chalk.yellow('Aucun utilisateur trouvé'));
      return;
    }

    const table = new Table({
      head: ['ID', 'Nom', 'Prénom', 'Rôle', 'Email'],
      style: { head: ['cyan'] }
    });

    resultats.forEach(user => {
      table.push([
        user.id,
        user.nom,
        user.prenom,
        user.role,
        user.courriel || 'N/A'
      ]);
    });

    console.log(`\n✅ ${resultats.length} utilisateur(s) trouvé(s):`);
    console.log(table.toString());
  }

  async rechercherProduit() {
    const critere = await inquirer.prompt([
      {
        type: 'input',
        name: 'terme',
        message: 'Nom du produit à rechercher:'
      }
    ]);

    const produits = await this.listerTousProduits();
    const resultats = produits.filter(p => 
      p.nom.toLowerCase().includes(critere.terme.toLowerCase())
    );

    if (resultats.length === 0) {
      console.log(chalk.yellow('Aucun produit trouvé'));
      return;
    }

    const table = new Table({
      head: ['ID', 'Nom', 'Prix', 'Stock'],
      style: { head: ['cyan'] }
    });

    resultats.forEach(produit => {
      table.push([
        produit.id,
        produit.nom,
        `${produit.prix.toFixed(2)}$`,
        produit.stock
      ]);
    });

    console.log(`\n✅ ${resultats.length} produit(s) trouvé(s):`);
    console.log(table.toString());
  }

  async rechercherVente() {
    const critere = await inquirer.prompt([
      {
        type: 'number',
        name: 'id',
        message: 'ID de la vente à rechercher:'
      }
    ]);

    const rapports = await this.genererRapports();
    const vente = rapports.ventes?.find(v => v.id === critere.id);

    if (!vente) {
      console.log(chalk.yellow('Vente non trouvée'));
      return;
    }

    console.log(chalk.bold.cyan(`\n🛍️ VENTE #${vente.id}`));
    console.log(`📅 Date: ${new Date(vente.date || vente.createdAt).toLocaleString()}`);
    console.log(`🏪 Magasin: ${vente.Magasin?.nom || 'N/A'}`);
    console.log(`👤 Vendeur: ${vente.Utilisateur?.prenom || ''} ${vente.Utilisateur?.nom || ''}`.trim() || 'N/A');
    console.log(`💰 Total: ${vente.total.toFixed(2)}$`);
    console.log(`📊 Statut: ${vente.statut || 'active'}`);
  }

  // Méthodes utilitaires
  async genererRapports() {
    const response = await axios.get(`${this.apiBaseUrl}/rapports`);
    return response.data;
  }

  async listerMagasins() {
    const response = await axios.get(`${this.apiBaseUrl}/magasins`);
    return response.data;
  }

  async listerUtilisateurs() {
    const response = await axios.get(`${this.apiBaseUrl}/utilisateurs`);
    return response.data;
  }

  async listerTousProduits() {
    const response = await axios.get(`${this.apiBaseUrl}/produits`);
    return response.data;
  }

  async obtenirUtilisateursMagasin(magasinId) {
    const response = await axios.get(`${this.apiBaseUrl}/utilisateurs?magasinId=${magasinId}`);
    return response.data;
  }

  async obtenirVentesMagasin(magasinId) {
    const response = await axios.get(`${this.apiBaseUrl}/ventes?magasinId=${magasinId}`);
    return response.data;
  }

  calculerStatistiquesUtilisateurs(utilisateurs) {
    return {
      total: utilisateurs.length,
      admins: utilisateurs.filter(u => u.role === 'admin').length,
      vendeurs: utilisateurs.filter(u => u.role === 'vendeur').length,
      directeurs: utilisateurs.filter(u => u.role === 'directeur').length
    };
  }

  async afficherStatistiquesMagasins(magasins) {
    console.log(chalk.bold.cyan('\n📊 === STATISTIQUES PAR MAGASIN ==='));
    
    const table = new Table({
      head: ['Magasin', 'Utilisateurs', 'Ventes', 'CA'],
      style: { head: ['cyan'] }
    });

    for (const magasin of magasins) {
      const utilisateurs = await this.obtenirUtilisateursMagasin(magasin.id);
      const ventes = await this.obtenirVentesMagasin(magasin.id);
      const ca = ventes.reduce((sum, v) => sum + parseFloat(v.total), 0);

      table.push([
        magasin.nom,
        utilisateurs.length,
        ventes.length,
        `${ca.toFixed(2)}$`
      ]);
    }

    console.log(table.toString());
  }
}

// Démarrage de la console si exécutée directement
if (require.main === module) {
  const console = new MaisonMereConsoleHttp();
  console.demarrer().catch(err => {
    console.error('Erreur fatale:', err);
    process.exit(1);
  });
}

module.exports = MaisonMereConsoleHttp;
