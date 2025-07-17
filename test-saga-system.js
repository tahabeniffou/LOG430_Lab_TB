/**
 * Script de test pour la saga choreography
 * LAB 7 - Architecture Événementielle 
 */

const axios = require('axios');

const SERVICES = {
    validation: 'http://localhost:8012',
    notification: 'http://localhost:8013', 
    payment: 'http://localhost:8014',
    reclamation: 'http://localhost:8015'
};

// Test des endpoints de santé
async function testHealthChecks() {
    console.log('🏥 Test des health checks...');
    
    for (const [name, url] of Object.entries(SERVICES)) {
        try {
            const response = await axios.get(`${url}/health`);
            console.log(`✅ ${name}: ${response.data.status}`);
        } catch (error) {
            console.log(`❌ ${name}: FAILED - ${error.message}`);
        }
    }
}

// Test d'une validation saga
async function testSagaValidation() {
    console.log('\n🎯 Test de validation saga...');
    
    const validationData = {
        orderId: 'ORDER-' + Date.now(),
        customerId: 'CUSTOMER-12345',
        amount: 150.00,
        currency: 'EUR',
        paymentMethod: 'BANK_TRANSFER',
        email: 'test@example.com',
        metadata: {
            source: 'saga-test',
            timestamp: new Date().toISOString()
        }
    };

    try {
        const response = await axios.post(`${SERVICES.validation}/validate`, validationData);
        console.log('✅ Validation déclenchée:', response.data);
        return response.data;
    } catch (error) {
        console.log('❌ Erreur de validation:', error.response?.data || error.message);
        return null;
    }
}

// Test de métriques
async function testMetrics() {
    console.log('\n📊 Test des métriques...');
    
    for (const [name, url] of Object.entries(SERVICES)) {
        try {
            const response = await axios.get(`${url}/metrics`);
            const metrics = response.data;
            const lines = metrics.split('\n').filter(line => !line.startsWith('#') && line.trim());
            console.log(`✅ ${name}: ${lines.length} métriques disponibles`);
        } catch (error) {
            console.log(`❌ ${name}: Métriques non disponibles`);
        }
    }
}

// Fonction principale
async function runTests() {
    console.log('🚀 Démarrage des tests de la saga choreography\n');
    
    await testHealthChecks();
    await testSagaValidation(); 
    await testMetrics();
    
    console.log('\n✨ Tests terminés ! Vérifiez Grafana (http://localhost:3000) pour les graphiques.');
}

// Exécution
if (require.main === module) {
    runTests().catch(console.error);
}

module.exports = { testHealthChecks, testSagaValidation, testMetrics };
