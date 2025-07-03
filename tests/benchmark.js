const axios = require('axios');

const API_BASE_URL = process.env.API_URL || 'http://localhost:3000/api/v1';

async function benchmark() {
  console.log('🏁 Benchmark de performance avec cache');
  console.log('=====================================\n');

  const endpoints = [
    { name: 'Produits par magasin', url: '/produits?magasinId=1' },
    { name: 'Stock du magasin', url: '/produits/stock?magasinId=1' },
    { name: 'Rapport de ventes', url: '/rapports?type=ventes' },
    { name: 'Liste des magasins', url: '/magasins' }
  ];

  try {
    // Nettoyer le cache avant le benchmark
    await axios.delete(`${API_BASE_URL}/admin/cache/clear`);
    console.log('🧹 Cache vidé\n');

    for (const endpoint of endpoints) {
      console.log(`📊 Test: ${endpoint.name}`);
      console.log(`🔗 URL: ${endpoint.url}`);

      const times = {
        withoutCache: [],
        withCache: []
      };

      // Test sans cache (premier appel)
      console.log('   Sans cache (cache miss):');
      for (let i = 0; i < 3; i++) {
        await axios.delete(`${API_BASE_URL}/admin/cache/clear`);
        const start = Date.now();
        await axios.get(`${API_BASE_URL}${endpoint.url}`);
        const time = Date.now() - start;
        times.withoutCache.push(time);
        console.log(`     Essai ${i + 1}: ${time}ms`);
      }

      // Attendre que le cache soit écrit
      await new Promise(resolve => setTimeout(resolve, 100));

      // Test avec cache
      console.log('   Avec cache (cache hit):');
      for (let i = 0; i < 5; i++) {
        const start = Date.now();
        const response = await axios.get(`${API_BASE_URL}${endpoint.url}`);
        const time = Date.now() - start;
        times.withCache.push(time);
        console.log(`     Essai ${i + 1}: ${time}ms (cache: ${response.headers['x-cache']})`);
      }

      // Calculer les statistiques
      const avgWithoutCache = times.withoutCache.reduce((a, b) => a + b, 0) / times.withoutCache.length;
      const avgWithCache = times.withCache.reduce((a, b) => a + b, 0) / times.withCache.length;
      const improvement = avgWithoutCache / avgWithCache;

      console.log(`   📈 Résultats:`);
      console.log(`     Moyenne sans cache: ${Math.round(avgWithoutCache * 100) / 100}ms`);
      console.log(`     Moyenne avec cache: ${Math.round(avgWithCache * 100) / 100}ms`);
      console.log(`     🚀 Amélioration: ${Math.round(improvement * 100) / 100}x`);
      console.log(`     💾 Économie: ${Math.round((1 - 1/improvement) * 100)}%\n`);
    }

    // Test de charge simultanée
    console.log('🚀 Test de charge simultanée');
    console.log('============================');

    const concurrentRequests = 20;
    const testUrl = `${API_BASE_URL}/produits?magasinId=1`;

    // Sans cache
    await axios.delete(`${API_BASE_URL}/admin/cache/clear`);
    console.log(`Exécution de ${concurrentRequests} requêtes simultanées SANS cache...`);
    
    const startNoCacheLoad = Date.now();
    const noCachePromises = Array(concurrentRequests).fill().map(() => 
      axios.get(testUrl)
    );
    await Promise.all(noCachePromises);
    const noCacheLoadTime = Date.now() - startNoCacheLoad;

    console.log(`✅ ${concurrentRequests} requêtes sans cache: ${noCacheLoadTime}ms`);
    console.log(`   Moyenne par requête: ${Math.round(noCacheLoadTime / concurrentRequests * 100) / 100}ms`);

    // Avec cache
    await axios.get(testUrl); // Premier appel pour remplir le cache
    await new Promise(resolve => setTimeout(resolve, 100));

    console.log(`Exécution de ${concurrentRequests} requêtes simultanées AVEC cache...`);
    
    const startCacheLoad = Date.now();
    const cachePromises = Array(concurrentRequests).fill().map(() => 
      axios.get(testUrl)
    );
    await Promise.all(cachePromises);
    const cacheLoadTime = Date.now() - startCacheLoad;

    console.log(`✅ ${concurrentRequests} requêtes avec cache: ${cacheLoadTime}ms`);
    console.log(`   Moyenne par requête: ${Math.round(cacheLoadTime / concurrentRequests * 100) / 100}ms`);
    
    const loadImprovement = noCacheLoadTime / cacheLoadTime;
    console.log(`   🚀 Amélioration en charge: ${Math.round(loadImprovement * 100) / 100}x`);

    console.log('\n🎯 Benchmark terminé !');

  } catch (error) {
    console.error('❌ Erreur lors du benchmark:', error.message);
    if (error.response) {
      console.error('   Statut:', error.response.status);
      console.error('   Données:', error.response.data);
    }
  }
}

// Exécuter le benchmark si ce fichier est lancé directement
if (require.main === module) {
  benchmark();
}

module.exports = benchmark;
