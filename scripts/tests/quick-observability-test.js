const axios = require('axios');

async function quickTest() {
    console.log('🧪 Test rapide d\'observabilité et traçabilité...\n');
    
    const baseUrl = 'http://localhost:8010';
    
    try {
        // Test 1: Saga réussie
        console.log('1️⃣ Test saga réussie...');
        const successTest = await axios.post(`${baseUrl}/saga/start`, {
            articleId: 'OBS_ARTICLE_001',
            quantity: 2,
            compteId: 'OBS_COMPTE_001',
            totalAmount: 75.50
        });
        console.log(`   ✅ Saga ${successTest.data.sagaId} réussie\n`);
        
        // Test 2: Quelques sagas supplémentaires
        console.log('2️⃣ Tests multiples en parallèle...');
        const promises = [];
        for (let i = 0; i < 5; i++) {
            promises.push(axios.post(`${baseUrl}/saga/start`, {
                articleId: `BATCH_${i}_ARTICLE`,
                quantity: Math.floor(Math.random() * 5) + 1,
                compteId: `BATCH_${i}_COMPTE`,
                totalAmount: parseFloat((Math.random() * 100 + 20).toFixed(2))
            }));
        }
        await Promise.all(promises);
        console.log('   ✅ 5 sagas en parallèle terminées\n');
        
        // Attendre un peu pour que les métriques se mettent à jour
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        // Récupérer les métriques
        console.log('📊 Métriques actuelles:');
        const metrics = await axios.get(`${baseUrl}/saga/metrics`);
        console.log(JSON.stringify(metrics.data, null, 2));
        console.log('');
        
        // Récupérer les événements métiers
        console.log('🏢 Événements métiers récents:');
        const events = await axios.get(`${baseUrl}/saga/business-events`);
        events.data.slice(0, 5).forEach(event => {
            console.log(`   • ${event.event_type} @ ${event.service_name} (${event.timestamp})`);
        });
        console.log('');
        
        // Récupérer les transitions d'état
        console.log('🔄 Transitions d\'état récentes:');
        const transitions = await axios.get(`${baseUrl}/saga/state-transitions`);
        transitions.data.slice(0, 5).forEach(transition => {
            console.log(`   • ${transition.from_state} → ${transition.to_state}: ${transition.transition_reason}`);
        });
        console.log('');
        
        // Récupérer les métriques Prometheus
        console.log('📈 Métriques Prometheus disponibles:');
        const promMetrics = await axios.get(`${baseUrl}/metrics`);
        const metricLines = promMetrics.data.split('\n').filter(line => 
            line.startsWith('saga_') && !line.startsWith('#')
        );
        metricLines.slice(0, 10).forEach(line => {
            console.log(`   ${line}`);
        });
        
        console.log('\n🎉 Tests terminés avec succès!');
        console.log('🔗 Dashboards disponibles:');
        console.log('   • Interface Saga: http://localhost:8010');
        console.log('   • Prometheus: http://localhost:9090');
        console.log('   • Grafana: http://localhost:3000 (admin/admin123)');
        console.log('');
        console.log('📁 Logs structurés dans: saga-orchestrator.log');
        
    } catch (error) {
        console.error('❌ Erreur pendant les tests:', error.message);
        if (error.response) {
            console.error('   Réponse:', error.response.data);
        }
    }
}

// Exécuter le test
quickTest();
