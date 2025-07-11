#!/usr/bin/env node

const axios = require('axios');

console.log('🧪 TESTS DE VALIDATION DU SYSTÈME MICROSERVICES');
console.log('='.repeat(50));

async function testEndpoint(name, url, method = 'GET', data = null) {
  try {
    const config = {
      method,
      url,
      timeout: 5000,
    };
    
    if (data && method === 'POST') {
      config.data = data;
      config.headers = { 'Content-Type': 'application/json' };
    }
    
    const response = await axios(config);
    console.log(`✅ ${name}: ${response.status} - ${response.data?.message || 'OK'}`);
    
    if (response.data?.data && Array.isArray(response.data.data)) {
      console.log(`   📊 Données: ${response.data.data.length} éléments`);
    }
    
    return true;
  } catch (error) {
    if (error.response) {
      console.log(`❌ ${name}: ${error.response.status} - ${error.response.data?.message || error.message}`);
    } else {
      console.log(`❌ ${name}: CONNEXION IMPOSSIBLE - ${error.message}`);
    }
    return false;
  }
}

async function runTests() {
  console.log('\n🏥 TESTS DE SANTÉ (Health Checks)');
  console.log('-'.repeat(40));
  
  const healthTests = [
    ['API Gateway', 'http://localhost:3000/health'],
    ['Produit Service', 'http://localhost:3001/health'],
    ['Stock Service', 'http://localhost:3002/health'],
    ['Vente Service', 'http://localhost:3003/health'],
    ['Reporting Service', 'http://localhost:3004/health'],
    ['Dashboard Monitoring', 'http://localhost:8080/api/metrics']
  ];
  
  let healthyServices = 0;
  for (const [name, url] of healthTests) {
    if (await testEndpoint(name, url)) healthyServices++;
  }
  
  console.log(`\n📊 Services en santé: ${healthyServices}/${healthTests.length}`);
  
  console.log('\n🔗 TESTS DES APIs (via API Gateway)');
  console.log('-'.repeat(40));
  
  const apiTests = [
    ['GET Produits (v2)', 'http://localhost:3000/api/v2/produits'],
    ['GET Ventes (v2)', 'http://localhost:3000/api/v2/ventes'],
    ['GET Reports (v2)', 'http://localhost:3000/api/v2/reports'],
    ['GET Routing Info', 'http://localhost:3000/routing-info'],
  ];
  
  let workingApis = 0;
  for (const [name, url] of apiTests) {
    if (await testEndpoint(name, url)) workingApis++;
  }
  
  console.log(`\n📊 APIs fonctionnelles: ${workingApis}/${apiTests.length}`);
  
  console.log('\n🧪 TESTS DIRECTS DES SERVICES');
  console.log('-'.repeat(40));
  
  const directTests = [
    ['Produits Direct', 'http://localhost:3001/api/produits'],
    ['Ventes Direct', 'http://localhost:3003/api/ventes'],
    ['Reports Direct', 'http://localhost:3004/api/reports'],
  ];
  
  let directApis = 0;
  for (const [name, url] of directTests) {
    if (await testEndpoint(name, url)) directApis++;
  }
  
  console.log(`\n📊 Services directs: ${directApis}/${directTests.length}`);
  
  console.log('\n📋 RÉSUMÉ FINAL');
  console.log('='.repeat(50));
  
  const total = healthyServices + workingApis + directApis;
  const maxTotal = healthTests.length + apiTests.length + directTests.length;
  
  if (total === maxTotal) {
    console.log('🎉 SYSTÈME COMPLÈTEMENT FONCTIONNEL !');
    console.log('✅ Tous les services répondent correctement');
    console.log('✅ API Gateway route correctement');
    console.log('✅ Microservices accessibles directement');
  } else if (total >= maxTotal * 0.8) {
    console.log('⚠️  SYSTÈME MAJORITAIREMENT FONCTIONNEL');
    console.log(`✅ ${total}/${maxTotal} tests passés`);
  } else {
    console.log('❌ PROBLÈMES DÉTECTÉS DANS LE SYSTÈME');
    console.log(`❌ Seulement ${total}/${maxTotal} tests passés`);
  }
  
  console.log('\n🌐 URLs importantes:');
  console.log('- API Gateway: http://localhost:3000');
  console.log('- Dashboard Monitoring: http://localhost:8080');
  console.log('- Routing Info: http://localhost:3000/routing-info');
  console.log('- API v2 Produits: http://localhost:3000/api/v2/produits');
  console.log('- API v2 Ventes: http://localhost:3000/api/v2/ventes');
  
  console.log('\n🔧 Pour plus de détails:');
  console.log('- Consultez les logs des services dans la console de démarrage');
  console.log('- Utilisez le dashboard de monitoring en temps réel');
}

runTests().catch(console.error);
