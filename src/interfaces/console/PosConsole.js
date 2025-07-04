// Console POS simplifiée - Architecture DDD
const ApplicationService = require('../../application/ApplicationService');
const inquirer = require('inquirer');
const Table = require('cli-table3');
const chalk = require('chalk');
const { Magasin, Utilisateur } = require('../../models');

class PosConsole {
  constructor() {
    this.applicationService = new ApplicationService();
    this.magasinActuel = null;
    this.utilisateurActuel = null;
  }

  async demarrer() {
    console.clear();
    console.log(chalk.bold.blue('🏪 === CONSOLE POS DDD ===\n'));

    // Sélection du magasin
    const magasins = await Magasin.findAll();
    const { magasinId } = await inquirer.prompt([
      {
        type: 'list',
        name: 'magasinId',
        message: 'Sélectionnez votre magasin :',
        choices: magasins.map(m => ({ name: m.nom, value: m.id }))
      }
    ]);
    this.magasinActuel = magasins.find(m => m.id === magasinId);

    // Sélection de l'utilisateur du magasin
    const utilisateurs = await Utilisateur.findAll({ where: { magasinId } });
    if (utilisateurs.length === 0) {
      console.log(chalk.red('Aucun utilisateur pour ce magasin.'));
      process.exit(1);
    }
    const { utilisateurId } = await inquirer.prompt([
      {
        type: 'list',
        name: 'utilisateurId',
        message: 'Sélectionnez votre utilisateur :',
        choices: utilisateurs.map(u => ({ name: `${u.nom} (${u.role})`, value: u.id }))
      }
    ]);
    const utilisateur = utilisateurs.find(u => u.id === utilisateurId);

    // Demande du mot de passe
    const { motDePasse } = await inquirer.prompt([
      {
        type: 'password',
        name: 'motDePasse',
        message: 'Mot de passe :',
        mask: '*'
      }
    ]);
    if (motDePasse !== utilisateur.motDePasse) {
      console.log(chalk.red('Mot de passe incorrect. Accès refusé.'));
      process.exit(1);
    }
    this.utilisateurActuel = { id: utilisateur.id, nom: utilisateur.nom, role: utilisateur.role };
    console.log(chalk.green(`Connecté: ${this.utilisateurActuel.nom} - ${this.magasinActuel.nom}\n`));

    await this.menuPrincipal();
  }

  async menuPrincipal() {
    while (true) {
      const { action } = await inquirer.prompt([{
        type: 'list',
        name: 'action',
        message: 'Que voulez-vous faire ?',
        choices: [
          { name: '🛍️  Créer une vente', value: 'vente' },
          { name: '📦 Consulter les produits', value: 'produits' },
          { name: '📊 Voir les ventes', value: 'ventes' },
          { name: '❌ Annuler une vente', value: 'annuler' },
          { name: '🚪 Quitter', value: 'exit' }
        ]
      }]);

      switch (action) {
        case 'vente':
          await this.creerVente();
          break;
        case 'produits':
          await this.consulterProduits();
          break;
        case 'ventes':
          await this.consulterVentes();
          break;
        case 'annuler':
          await this.annulerVente();
          break;
        case 'exit':
          console.log(chalk.gray('Au revoir !'));
          return;
      }
    }
  }

  async creerVente() {
    try {
      console.log(chalk.bold('\n🛍️ === NOUVELLE VENTE ==='));
      
      // Afficher les produits disponibles
      const produits = await this.applicationService.listerProduits();
      
      const table = new Table({
        head: ['ID', 'Nom', 'Prix', 'Stock']
      });
      
      produits.forEach(p => {
        table.push([p.id, p.nom, `$${p.prix}`, p.stock]);
      });
      
      console.log(table.toString());

      const lignes = [];
      let continuer = true;

      while (continuer) {
        const { produitId } = await inquirer.prompt([{
          type: 'number',
          name: 'produitId',
          message: 'ID du produit à ajouter:'
        }]);

        const { quantite } = await inquirer.prompt([{
          type: 'number',
          name: 'quantite',
          message: 'Quantité:'
        }]);

        lignes.push({ produitId, quantite });

        const { encore } = await inquirer.prompt([{
          type: 'confirm',
          name: 'encore',
          message: 'Ajouter un autre produit ?',
          default: false
        }]);

        continuer = encore;
      }

      const donneesVente = {
        magasinId: this.magasinActuel.id,
        utilisateurId: this.utilisateurActuel.id,
        lignes
      };

      const vente = await this.applicationService.creerVente(donneesVente);
      
      console.log(chalk.green(`\n✅ Vente créée avec succès!`));
      console.log(chalk.bold(`Total: $${vente.total}`));
      
    } catch (error) {
      console.log(chalk.red(`\n❌ Erreur: ${error.message}`));
    }

    await this.pause();
  }

  async consulterProduits() {
    try {
      const produits = await this.applicationService.listerProduits();
      
      const table = new Table({
        head: ['ID', 'Nom', 'Prix', 'Stock', 'Catégorie']
      });
      
      produits.forEach(p => {
        const couleurStock = p.stock > 10 ? chalk.green : p.stock > 0 ? chalk.yellow : chalk.red;
        table.push([
          p.id, 
          p.nom, 
          `$${p.prix}`, 
          couleurStock(p.stock), 
          p.categorie
        ]);
      });
      
      console.log('\n📦 === PRODUITS DISPONIBLES ===');
      console.log(table.toString());
      
    } catch (error) {
      console.log(chalk.red(`❌ Erreur: ${error.message}`));
    }

    await this.pause();
  }

  async consulterVentes() {
    try {
      const ventes = await this.applicationService.consulterVentes(this.magasinActuel.id);
      
      const table = new Table({
        head: ['ID', 'Total', 'Date', 'Statut']
      });
      
      ventes.forEach(v => {
        const couleurStatut = v.statut === 'active' ? chalk.green : chalk.red;
        table.push([
          v.id,
          `$${v.total}`,
          v.date.toLocaleDateString(),
          couleurStatut(v.statut)
        ]);
      });
      
      console.log('\n📊 === VENTES DU MAGASIN ===');
      console.log(table.toString());
      
    } catch (error) {
      console.log(chalk.red(`❌ Erreur: ${error.message}`));
    }

    await this.pause();
  }

  async annulerVente() {
    try {
      const { venteId } = await inquirer.prompt([{
        type: 'number',
        name: 'venteId',
        message: 'ID de la vente à annuler:'
      }]);

      await this.applicationService.annulerVente(venteId);
      console.log(chalk.green('✅ Vente annulée avec succès!'));
      
    } catch (error) {
      console.log(chalk.red(`❌ Erreur: ${error.message}`));
    }

    await this.pause();
  }

  async pause() {
    await inquirer.prompt([{
      type: 'input',
      name: 'continue',
      message: 'Appuyez sur Entrée pour continuer...'
    }]);
  }
}

module.exports = PosConsole;

// Point d'entrée pour exécution directe
if (require.main === module) {
  const console = new PosConsole();
  console.demarrer().catch(error => {
    console.error('Erreur lors du démarrage de la console POS:', error);
    process.exit(1);
  });
}
