#!/usr/bin/env node

const axios = require('axios');
const chalk = require('chalk');

console.log(chalk.green('🔍 TEST WORKFLOW COMPLET DES MICROSERVICES'));
console.log(chalk.green('==========================================='));

async function testMicroservices() {
  const tests = [
    { name: 'Produit Service', url: 'http://localhost:3001/api/produits' },
    { name: 'Stock Service', url: 'http://localhost:3002/stocks' },
    { name: 'Vente Service', url: 'http://localhost:3003/api/ventes' },
    { name: 'Reporting Service', url: 'http://localhost:3004/api/reports' }
  ];

  for (const test of tests) {
    try {
      const response = await axios.get(test.url, { timeout: 5000 });
      console.log(chalk.green(`✅ ${test.name}: OK (${response.data.data?.length || 'données'} items)`));
    } catch (error) {
      console.log(chalk.red(`❌ ${test.name}: ERREUR - ${error.message}`));
    }
  }
}

async function testWorkflow() {
  console.log(chalk.blue('\n📋 TEST WORKFLOW VENTE COMPLÈTE'));
  console.log(chalk.blue('================================='));

  try {
    // 1. Récupérer les produits
    console.log('1️⃣ Récupération des produits...');
    const produits = await axios.get('http://localhost:3001/api/produits');
    const produit = produits.data.data[0];
    console.log(chalk.green(`   ✅ Produit trouvé: ${produit.nom} - ${produit.prix}€`));

    // 2. Vérifier le stock
    console.log('2️⃣ Vérification du stock...');
    const stocks = await axios.get('http://localhost:3002/stocks');
    const stock = stocks.data.data.find(s => s.produitId === produit.id);
    console.log(chalk.green(`   ✅ Stock disponible: ${stock?.quantite || 'N/A'} unités`));

    // 3. Créer une vente
    console.log('3️⃣ Création d\'une vente test...');
    const venteData = {
      utilisateurId: 1,
      magasinId: 1,
      items: [{
        produitId: produit.id,
        quantite: 1,
        prix: produit.prix
      }],
      methodePaiement: 'especes'
    };
    
    const vente = await axios.post('http://localhost:3003/api/ventes', venteData);
    console.log(chalk.green(`   ✅ Vente créée: ID ${vente.data.vente?.id || 'N/A'}`));

    // 4. Vérifier les rapports
    console.log('4️⃣ Génération des rapports...');
    const rapports = await axios.get('http://localhost:3004/api/reports');
    console.log(chalk.green(`   ✅ Rapports générés: ${rapports.data.totalVentes} ventes, ${rapports.data.totalRevenu}€`));

    console.log(chalk.green('\n🎉 WORKFLOW COMPLET TESTÉ AVEC SUCCÈS !'));
    
  } catch (error) {
    console.log(chalk.red(`❌ Erreur dans le workflow: ${error.message}`));
    if (error.response?.data) {
      console.log(chalk.yellow(`   Détails: ${JSON.stringify(error.response.data)}`));
    }
  }
}

async function main() {
  await testMicroservices();
  await testWorkflow();
  
  console.log(chalk.blue('\n📱 COMMANDES POUR TESTER LES CONSOLES:'));
  console.log(chalk.yellow('   npm run console:pos     # Console POS (caissier)'));
  console.log(chalk.yellow('   npm run console:mere    # Console Maison-Mère (manager)'));
  
  process.exit(0);
}

main().catch(console.error);
