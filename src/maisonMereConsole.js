// maisonMereConsole.js
const inquirer = require('inquirer');
const axios    = require('axios');
const Table    = require('cli-table3');
const chalk    = require('chalk').default;

const API_URL = process.env.API_URL || 'http://localhost:3000/api/v1';

function resetConsole() {
  console.clear();
}

async function mainMenu() {
  while (true) {
    resetConsole();
    const { action } = await inquirer.prompt([{
      type: 'list',
      name: 'action',
      message: chalk.bold(chalk.cyan('=== Maison Mère ===')),
      choices: [
        { name: 'Générer un rapport consolidé des ventes', value: 'rapport' },
        { name: 'Visualiser le tableau de bord des magasins', value: 'dashboard' },
        { name: 'Quitter',                            value: 'exit' }
      ]
    }]);

    if (action === 'rapport') {
      // Appel à /rapports?type=ventes
      const { data: rapport } = await axios.get(
        `${API_URL}/rapports`,
        { params: { type: 'ventes' } }
      );

      console.log(chalk.bold(chalk.cyan('\n=== Rapport consolidé des ventes ===\n')));
      rapport.forEach(r => {
        console.log(chalk.bold(`🏬 ${r.magasin.nom} (${r.magasin.adresse})`));
        console.log(chalk.green(`Chiffre d'affaires: $${r.chiffreAffaires.toFixed(2)}`));

        const tableTop = new Table({
          head: [chalk.yellow('Produit'), chalk.yellow('Quantité vendue')],
          style: { head: ['yellow'] }
        });
        r.topProduits.forEach(tp => tableTop.push([tp.nom, tp.quantite]));
        console.log(chalk.magenta('Top produits:'));
        console.log(tableTop.toString());

        const tableStock = new Table({
          head: [chalk.blue('Produit'), chalk.blue('Stock restant')],
          style: { head: ['blue'] }
        });
        r.stock.forEach(s => tableStock.push([s.nom, s.stock]));
        console.log(chalk.magenta('Stock restant:'));
        console.log(tableStock.toString());
        console.log();
      });

      await pause();
    }

    if (action === 'dashboard') {
      // Appel à /rapports?type=dashboard
      const { data: dashboard } = await axios.get(
        `${API_URL}/rapports`,
        { params: { type: 'dashboard' } }
      );

      console.log(chalk.bold(chalk.cyan('\n=== Tableau de bord des magasins ===\n')));
      dashboard.forEach(d => {
        if (d.Magasin) {
          console.log(chalk.bold(`🏬 ${d.Magasin.nom} (${d.Magasin.adresse})`));
        } else {
          console.log(chalk.red('Magasin inconnu'));
        }
        if (typeof d.chiffreAffaires === 'number') {
          console.log(chalk.green(`Chiffre d'affaires: $${d.chiffreAffaires.toFixed(2)}`));
        }
        if (d.ruptures?.length) {
          console.log(chalk.red(`⚠️ Ruptures de stock: ${d.ruptures.join(', ')}`));
        }
        if (d.surstocks?.length) {
          console.log(chalk.yellow(`📦 Surstocks: ${d.surstocks.join(', ')}`));
        }
        if (d.tendance?.length) {
          console.log(chalk.cyan('Tendance hebdomadaire :'));
          d.tendance.forEach(t => {
            console.log(`  - ${t.jour} : $${t.total.toFixed(2)}`);
          });
        }
        console.log();
      });

      await pause();
    }

    if (action === 'exit') {
      console.log(chalk.gray('\n👋 À bientôt !'));
      break;
    }
  }
}

async function pause() {
  await inquirer.prompt({
    type: 'input',
    name: 'pause',
    message: chalk.gray('\nAppuie sur [Entrée] pour continuer...')
  });
}

mainMenu().catch(err => {
  console.error(chalk.red(err.message));
  process.exit(1);
});
