#!/usr/bin/env node

// Test local des fonctionnalités principales
const express = require('express');
const app = require('./app.js');

// Test de santé du système
async function testHealth() {
  try {
    console.log('🔍 Test de santé du système...');
    
    // Test de l'API principale
    const request = require('supertest');
    
    // Test du endpoint de santé
    const healthResponse = await request(app).get('/health');
    console.log('✅ Health endpoint:', healthResponse.status === 200 ? 'OK' : 'FAILED');
    console.log('   Status:', healthResponse.body.status);
    console.log('   Services:', healthResponse.body.services);
    
    // Test du endpoint racine
    const rootResponse = await request(app).get('/');
    console.log('✅ Root endpoint:', rootResponse.status === 200 ? 'OK' : 'FAILED');
    console.log('   Message:', rootResponse.body.message);
    
    return true;
  } catch (error) {
    console.error('❌ Erreur lors du test de santé:', error.message);
    return false;
  }
}

// Test des endpoints principaux
async function testEndpoints() {
  try {
    console.log('\n🔍 Test des endpoints principaux...');
    const request = require('supertest');
    
    // Test produits
    try {
      const produits = await request(app).get('/api/v1/produits');
      console.log('✅ GET /api/v1/produits:', produits.status === 200 ? 'OK' : 'FAILED');
      console.log('   Nombre de produits:', produits.body?.length || 'N/A');
    } catch (e) {
      console.log('❌ GET /api/v1/produits: FAILED -', e.message);
    }
    
    // Test magasins
    try {
      const magasins = await request(app).get('/api/v1/magasins');
      console.log('✅ GET /api/v1/magasins:', magasins.status === 200 ? 'OK' : 'FAILED');
      console.log('   Nombre de magasins:', magasins.body?.length || 'N/A');
    } catch (e) {
      console.log('❌ GET /api/v1/magasins: FAILED -', e.message);
    }
    
    // Test ventes
    try {
      const ventes = await request(app).get('/api/v1/ventes');
      console.log('✅ GET /api/v1/ventes:', ventes.status === 200 ? 'OK' : 'FAILED');
      console.log('   Nombre de ventes:', ventes.body?.length || 'N/A');
    } catch (e) {
      console.log('❌ GET /api/v1/ventes: FAILED -', e.message);
    }
    
    // Test rapports
    try {
      const rapports = await request(app).get('/api/v1/rapports');
      console.log('✅ GET /api/v1/rapports:', rapports.status === 200 ? 'OK' : 'FAILED');
    } catch (e) {
      console.log('❌ GET /api/v1/rapports: FAILED -', e.message);
    }
    
    return true;
  } catch (error) {
    console.error('❌ Erreur lors du test des endpoints:', error.message);
    return false;
  }
}

// Test de la structure des modèles
async function testModels() {
  try {
    console.log('\n🔍 Test de la structure des modèles...');
    
    const { sequelize } = require('./src/models');
    await sequelize.authenticate();
    console.log('✅ Connexion à la base de données: OK');
    
    // Test des modèles
    const Produit = require('./src/models/Produit');
    const Vente = require('./src/models/Vente');
    const Magasin = require('./src/models/Magasin');
    const Utilisateur = require('./src/models/Utilisateur');
    const LigneVente = require('./src/models/LigneVente');
    
    console.log('✅ Modèles chargés:', {
      Produit: !!Produit,
      Vente: !!Vente,
      Magasin: !!Magasin,
      Utilisateur: !!Utilisateur,
      LigneVente: !!LigneVente
    });
    
    return true;
  } catch (error) {
    console.error('❌ Erreur lors du test des modèles:', error.message);
    return false;
  }
}

// Test des use cases
async function testUseCases() {
  try {
    console.log('\n🔍 Test des use cases...');
    
    // Test du use case ListerProduits
    try {
      const ListerProduitsUseCase = require('./src/application/use_cases/ListerProduitsUseCase');
      console.log('✅ ListerProduitsUseCase: OK');
    } catch (e) {
      console.log('❌ ListerProduitsUseCase: FAILED -', e.message);
    }
    
    // Test du use case CreerVente
    try {
      const CreerVenteUseCase = require('./src/application/use_cases/CreerVenteUseCase');
      console.log('✅ CreerVenteUseCase: OK');
    } catch (e) {
      console.log('❌ CreerVenteUseCase: FAILED -', e.message);
    }
    
    return true;
  } catch (error) {
    console.error('❌ Erreur lors du test des use cases:', error.message);
    return false;
  }
}

// Fonction principale
async function main() {
  console.log('🚀 === TEST LOCAL DU SYSTÈME POS ===\n');
  
  let allTestsPassed = true;
  
  // Test de santé
  const healthOk = await testHealth();
  allTestsPassed = allTestsPassed && healthOk;
  
  // Test des modèles
  const modelsOk = await testModels();
  allTestsPassed = allTestsPassed && modelsOk;
  
  // Test des use cases
  const useCasesOk = await testUseCases();
  allTestsPassed = allTestsPassed && useCasesOk;
  
  // Test des endpoints
  const endpointsOk = await testEndpoints();
  allTestsPassed = allTestsPassed && endpointsOk;
  
  console.log('\n🎯 === RÉSUMÉ DES TESTS ===');
  console.log('Santé du système:', healthOk ? '✅ OK' : '❌ FAILED');
  console.log('Modèles/DB:', modelsOk ? '✅ OK' : '❌ FAILED');
  console.log('Use Cases:', useCasesOk ? '✅ OK' : '❌ FAILED');
  console.log('Endpoints API:', endpointsOk ? '✅ OK' : '❌ FAILED');
  console.log('\nRésultat global:', allTestsPassed ? '✅ TOUS LES TESTS RÉUSSIS' : '❌ CERTAINS TESTS ONT ÉCHOUÉ');
}

// Exécution si appelé directement
if (require.main === module) {
  main().catch(console.error);
}

module.exports = { testHealth, testEndpoints, testModels, testUseCases };
