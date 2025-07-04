// Console Maison Mère - Architecture DDD
const ApplicationService = require('../../application/ApplicationService');
const inquirer = require('inquirer');
const Table = require('cli-table3');
const chalk = require('chalk');

class MaisonMereConsole {
  constructor() {
    this.applicationService = new ApplicationService();
  }

  async demarrer() {
    console.clear();
    console.log(chalk.bold.blue('🏢 === CONSOLE MAISON MÈRE DDD ===\n'));

    await this.menuPrincipal();
  }

  async menuPrincipal() {
    while (true) {
      const { action } = await inquirer.prompt([{
        type: 'list',
        name: 'action',
        message: 'Que voulez-vous consulter ?',
        choices: [
          { name: '📊 Rapport consolidé des ventes', value: 'rapport-ventes' },
          { name: '🏪 Tableau de bord des magasins', value: 'dashboard' },
          { name: '📦 État global des stocks', value: 'stocks' },
          { name: '🚪 Quitter', value: 'exit' }
        ]
      }]);

      switch (action) {
        case 'rapport-ventes':
          await this.afficherRapportVentes();
          break;
        case 'dashboard':
          await this.afficherDashboard();
          break;
        case 'stocks':
          await this.afficherStocks();
          break;
        case 'exit':
          console.log(chalk.gray('Au revoir !'));
          return;
      }
    }
  }

  async afficherRapportVentes() {
    try {
      console.log(chalk.bold('\n📊 === RAPPORT CONSOLIDÉ DES VENTES ==='));
      
      const ventes = await this.applicationService.consulterVentes();
      
      if (ventes.length === 0) {
        console.log(chalk.yellow('Aucune vente trouvée.'));
        await this.pause();
        return;
      }

      // Calcul des totaux par magasin
      const ventesByMagasin = ventes.reduce((acc, vente) => {
        if (!acc[vente.magasinId]) {
          acc[vente.magasinId] = {
            totalVentes: 0,
            chiffreAffaires: 0,
            nombreVentes: 0
          };
        }
        
        if (vente.statut === 'active') {
          acc[vente.magasinId].chiffreAffaires += vente.total;
          acc[vente.magasinId].nombreVentes++;
        }
        acc[vente.magasinId].totalVentes++;
        
        return acc;
      }, {});

      const table = new Table({
        head: ['Magasin ID', 'CA Total', 'Nb Ventes', 'Ventes Totales', 'Taux Annulation']
      });

      Object.entries(ventesByMagasin).forEach(([magasinId, stats]) => {
        const tauxAnnulation = ((stats.totalVentes - stats.nombreVentes) / stats.totalVentes * 100).toFixed(1);
        table.push([
          magasinId,
          chalk.green(`$${stats.chiffreAffaires.toFixed(2)}`),
          stats.nombreVentes,
          stats.totalVentes,
          chalk.red(`${tauxAnnulation}%`)
        ]);
      });

      console.log(table.toString());
      
    } catch (error) {
      console.log(chalk.red(`❌ Erreur: ${error.message}`));
    }

    await this.pause();
  }

  async afficherDashboard() {
    try {
      console.log(chalk.bold('\n🏪 === TABLEAU DE BORD DES MAGASINS ==='));
      
      const ventes = await this.applicationService.consulterVentes();
      const produits = await this.applicationService.listerProduits();
      
      // Statistiques globales
      const ventesActives = ventes.filter(v => v.statut === 'active');
      const caTotal = ventesActives.reduce((sum, v) => sum + v.total, 0);
      const nombreVentesTotal = ventesActives.length;
      
      console.log(chalk.bold.cyan(`📈 Chiffre d'affaires global: ${chalk.green('$' + caTotal.toFixed(2))}`));
      console.log(chalk.bold.cyan(`🛒 Nombre de ventes: ${chalk.blue(nombreVentesTotal)}`));
      console.log(chalk.bold.cyan(`📦 Produits en catalogue: ${chalk.blue(produits.length)}`));
      
      // Alertes stock
      const produitsEnRupture = produits.filter(p => p.stock <= 0);
      const produitsFaibleStock = produits.filter(p => p.stock > 0 && p.stock <= 5);
      
      if (produitsEnRupture.length > 0) {
        console.log(chalk.red(`⚠️ Ruptures de stock: ${produitsEnRupture.length} produits`));
      }
      
      if (produitsFaibleStock.length > 0) {
        console.log(chalk.yellow(`⚠️ Stock faible: ${produitsFaibleStock.length} produits`));
      }
      
      if (produitsEnRupture.length === 0 && produitsFaibleStock.length === 0) {
        console.log(chalk.green('✅ Tous les stocks sont au niveau optimal'));
      }
      
    } catch (error) {
      console.log(chalk.red(`❌ Erreur: ${error.message}`));
    }

    await this.pause();
  }

  async afficherStocks() {
    try {
      console.log(chalk.bold('\n📦 === ÉTAT GLOBAL DES STOCKS ==='));
      
      const produits = await this.applicationService.listerProduits();
      
      const table = new Table({
        head: ['ID', 'Nom', 'Prix', 'Stock', 'Catégorie', 'État']
      });

      produits.forEach(p => {
        let etatStock, couleurStock;
        if (p.stock <= 0) {
          etatStock = 'RUPTURE';
          couleurStock = chalk.red;
        } else if (p.stock <= 5) {
          etatStock = 'FAIBLE';
          couleurStock = chalk.yellow;
        } else if (p.stock <= 20) {
          etatStock = 'NORMAL';
          couleurStock = chalk.blue;
        } else {
          etatStock = 'ÉLEVÉ';
          couleurStock = chalk.green;
        }

        table.push([
          p.id,
          p.nom,
          `$${p.prix}`,
          couleurStock(p.stock),
          p.categorie,
          couleurStock(etatStock)
        ]);
      });

      console.log(table.toString());
      
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

module.exports = MaisonMereConsole;

// Point d'entrée pour exécution directe
if (require.main === module) {
  const console = new MaisonMereConsole();
  console.demarrer().catch(error => {
    console.error('Erreur lors du démarrage de la console Maison Mère:', error);
    process.exit(1);
  });
}
