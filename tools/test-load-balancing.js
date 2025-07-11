#!/usr/bin/env node

const axios = require('axios');

const GATEWAY_URL = 'http://localhost:3000';
const TEST_ENDPOINTS = [
  '/api/v2/produits',
  '/api/v2/ventes', 
  '/api/v2/stocks',
  '/api/v2/reports',
  '/pos/produits',
  '/pos/ventes',
  '/pos/stock',
  '/pos/reports'
];

// Fonction pour tester la distribution de charge
async function testLoadBalancing() {
  console.log('🧪 Test de Load Balancing - Distribution des requêtes\n');
  
  // 1. Vérifier l'état du load balancer
  console.log('📊 1. Vérification du statut du Load Balancer...');
  try {
    const statusResponse = await axios.get(`${GATEWAY_URL}/load-balancer/status`);
    console.log('✅ Load Balancer opérationnel');
    console.log(`🔄 Algorithme: ${statusResponse.data.algorithm}`);
    console.log(`📈 Services configurés: ${Object.keys(statusResponse.data.services).length}`);
  } catch (error) {
    console.log('❌ Load Balancer non disponible:', error.message);
    return;
  }
  
  console.log('\n🎯 2. Test de distribution des requêtes...');
  
  for (const endpoint of TEST_ENDPOINTS) {
    console.log(`\n📡 Test endpoint: ${endpoint}`);
    
    // Faire plusieurs requêtes pour voir la distribution
    for (let i = 0; i < 5; i++) {
      try {
        const start = Date.now();
        const response = await axios.get(`${GATEWAY_URL}${endpoint}`, { 
          timeout: 5000,
          headers: {
            'X-Test-Request': `test-${i + 1}`
          }
        });
        const duration = Date.now() - start;
        
        console.log(`  Requête ${i + 1}: ✅ ${response.status} (${duration}ms)`);
      } catch (error) {
        const statusCode = error.response?.status || 'N/A';
        console.log(`  Requête ${i + 1}: ❌ ${statusCode} - ${error.message}`);
      }
      
      // Pause entre les requêtes pour voir le round-robin
      await new Promise(resolve => setTimeout(resolve, 200));
    }
  }
  
  // 3. Vérifier les métriques de distribution
  console.log('\n📊 3. Analyse des métriques de distribution...');
  
  try {
    const metricsResponse = await axios.get(`${GATEWAY_URL}/metrics`);
    const metrics = metricsResponse.data;
    
    // Extraire les métriques de load balancing
    const lbMetrics = metrics.split('\n').filter(line => 
      line.includes('load_balancer_requests_total') && 
      !line.startsWith('#') &&
      line.trim() !== ''
    );
    
    if (lbMetrics.length > 0) {
      console.log('⚖️  Répartition observée:');
      lbMetrics.forEach(metric => {
        const match = metric.match(/service="([^"]+)".*instance_url="([^"]+)".*} (\d+)/);
        if (match) {
          const [, service, url, count] = match;
          console.log(`   ${service}: ${url} → ${count} requêtes`);
        }
      });
    } else {
      console.log('📈 Aucune métrique de load balancing trouvée (pas encore de trafic)');
    }
    
    // Afficher quelques métriques générales
    const totalRequests = metrics.split('\n').find(line => 
      line.includes('router_requests_total') && 
      !line.startsWith('#')
    );
    
    if (totalRequests) {
      console.log(`📊 Total requêtes router: ${totalRequests.split(' ')[1] || 'N/A'}`);
    }
    
  } catch (error) {
    console.log('❌ Impossible de récupérer les métriques:', error.message);
  }
}

// Fonction pour tester la résilience
async function testResilience() {
  console.log('\n🛡️  4. Test de résilience (simulation de panne)...');
  
  // Cette partie est informative car nous ne pouvons pas vraiment "couper" un service
  console.log('ℹ️  En cas de panne d\'une instance:');
  console.log('   - Le load balancer continuera à distribuer sur les instances restantes');
  console.log('   - Les requêtes vers l\'instance défaillante échoueront');
  console.log('   - Les métriques d\'erreur seront incrémentées');
  console.log('   - Un monitoring externe pourrait retirer l\'instance du pool');
}

// Fonction pour afficher les recommandations
function showRecommendations() {
  console.log('\n💡 Recommandations pour la production:');
  console.log('   🔍 Ajouter un health check actif pour détecter les pannes');
  console.log('   📊 Implémenter un circuit breaker pour éviter les cascades d\'erreur');
  console.log('   ⚖️  Considérer d\'autres algorithmes (weighted round-robin, least connections)');
  console.log('   🎯 Ajouter des métriques de latence par instance');
  console.log('   🔄 Implémenter un mécanisme de retry avec backoff');
  console.log('   📈 Configurer des alertes sur les métriques de distribution');
}

// Exécution du test principal
async function runTests() {
  console.log('🧪 Tests de Load Balancing - Système POS');
  console.log('=' .repeat(50));
  
  try {
    await testLoadBalancing();
    await testResilience();
    showRecommendations();
    
    console.log('\n✅ Tests de load balancing terminés!');
    console.log('📊 Consultez http://localhost:3000/load-balancer/status pour le statut en temps réel');
    
  } catch (error) {
    console.error('\n❌ Erreur pendant les tests:', error.message);
    process.exit(1);
  }
}

// Vérifier que le gateway est accessible avant de commencer
async function checkGateway() {
  try {
    await axios.get(`${GATEWAY_URL}/health`, { timeout: 3000 });
    console.log('✅ API Gateway accessible\n');
    return true;
  } catch (error) {
    console.log('❌ API Gateway non accessible. Assurez-vous qu\'il est démarré.');
    console.log('💡 Lancez: npm run start:load-balancing');
    return false;
  }
}

// Point d'entrée
async function main() {
  if (await checkGateway()) {
    await runTests();
  }
}

main().catch(console.error);
