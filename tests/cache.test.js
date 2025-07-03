const axios = require('axios');

const API_BASE_URL = process.env.API_URL || 'http://localhost:3000/api/v1';

async function testCache() {
  console.log('🧪 Tests du système de cache');
  console.log('==============================\n');

  try {
    // 1. Vérifier le statut du cache
    console.log('1. Vérification du statut Redis...');
    const statusResponse = await axios.get(`${API_BASE_URL}/admin/cache/status`);
    console.log(`   ✅ Status: ${statusResponse.data.message}`);
    
    if (!statusResponse.data.connected) {
      console.log('   ⚠️  Redis non connecté - Les tests de cache ne peuvent pas être effectués');
      return;
    }

    // 2. Nettoyer le cache
    console.log('\n2. Nettoyage du cache...');
    await axios.delete(`${API_BASE_URL}/admin/cache/clear`);
    console.log('   ✅ Cache vidé');

    // 3. Tester un endpoint avec cache (produits)
    console.log('\n3. Test de cache - endpoint produits...');
    
    // Premier appel (cache miss)
    console.log('   Premier appel (cache miss attendu)...');
    const start1 = Date.now();
    const response1 = await axios.get(`${API_BASE_URL}/produits?magasinId=1`);
    const time1 = Date.now() - start1;
    console.log(`   ✅ Réponse reçue en ${time1}ms`);
    console.log(`   📊 Cache: ${response1.headers['x-cache'] || 'non défini'}`);
    console.log(`   📦 Produits trouvés: ${response1.data.length}`);

    // Attendre un peu pour s'assurer que le cache a été écrit
    await new Promise(resolve => setTimeout(resolve, 100));

    // Deuxième appel (cache hit)
    console.log('\n   Deuxième appel (cache hit attendu)...');
    const start2 = Date.now();
    const response2 = await axios.get(`${API_BASE_URL}/produits?magasinId=1`);
    const time2 = Date.now() - start2;
    console.log(`   ✅ Réponse reçue en ${time2}ms`);
    console.log(`   📊 Cache: ${response2.headers['x-cache'] || 'non défini'}`);
    console.log(`   ⚡ Accélération: ${Math.round((time1 / time2) * 100) / 100}x`);

    // 4. Tester l'endpoint stock
    console.log('\n4. Test de cache - endpoint stock...');
    const start3 = Date.now();
    const stockResponse = await axios.get(`${API_BASE_URL}/produits/stock?magasinId=1`);
    const time3 = Date.now() - start3;
    console.log(`   ✅ Stock récupéré en ${time3}ms`);
    console.log(`   📊 Cache: ${stockResponse.headers['x-cache'] || 'non défini'}`);
    console.log(`   📦 Produits en stock: ${stockResponse.data.length}`);

    // 5. Vérifier les statistiques du cache
    console.log('\n5. Statistiques du cache...');
    const statsResponse = await axios.get(`${API_BASE_URL}/admin/cache/stats`);
    console.log(`   📈 Total clés: ${statsResponse.data.totalKeys}`);
    console.log(`   📋 Préfixes:`, statsResponse.data.prefixes);

    // 6. Tester l'invalidation du cache
    console.log('\n6. Test d\'invalidation du cache...');
    console.log('   Création d\'un nouveau produit...');
    
    const newProduct = {
      nom: `Produit Test ${Date.now()}`,
      prix: 9.99,
      stock: 10,
      magasinId: 1
    };

    await axios.post(`${API_BASE_URL}/produits`, newProduct);
    console.log('   ✅ Produit créé');

    // Vérifier que le cache a été invalidé
    const start4 = Date.now();
    const response4 = await axios.get(`${API_BASE_URL}/produits?magasinId=1`);
    const time4 = Date.now() - start4;
    console.log(`   ✅ Liste produits récupérée en ${time4}ms`);
    console.log(`   📊 Cache: ${response4.headers['x-cache'] || 'non défini'}`);
    console.log(`   📦 Nouveaux produits trouvés: ${response4.data.length}`);

    // 7. Tester les rapports (endpoint coûteux)
    console.log('\n7. Test de cache - endpoint rapports...');
    const start5 = Date.now();
    const reportResponse = await axios.get(`${API_BASE_URL}/rapports?type=ventes`);
    const time5 = Date.now() - start5;
    console.log(`   ✅ Rapport généré en ${time5}ms`);
    console.log(`   📊 Cache: ${reportResponse.headers['x-cache'] || 'non défini'}`);

    // Deuxième appel du rapport (devrait être en cache)
    const start6 = Date.now();
    const reportResponse2 = await axios.get(`${API_BASE_URL}/rapports?type=ventes`);
    const time6 = Date.now() - start6;
    console.log(`   ✅ Rapport récupéré en ${time6}ms`);
    console.log(`   📊 Cache: ${reportResponse2.headers['x-cache'] || 'non défini'}`);
    console.log(`   ⚡ Accélération rapport: ${Math.round((time5 / time6) * 100) / 100}x`);

    console.log('\n🎉 Tests de cache terminés avec succès !');

  } catch (error) {
    console.error('❌ Erreur lors des tests:', error.message);
    if (error.response) {
      console.error('   Statut:', error.response.status);
      console.error('   Données:', error.response.data);
    }
  }
}

// Exécuter les tests si ce fichier est lancé directement
if (require.main === module) {
  testCache();
}

module.exports = testCache;
