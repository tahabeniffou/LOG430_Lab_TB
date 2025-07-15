/**
 * Test du Saga Orchestrator
 * Script de test simple pour valider le fonctionnement du Saga
 */

const axios = require('axios');

// Configuration des services
const SAGA_ORCHESTRATOR_URL = 'http://localhost:8010';
const STOCK_SERVICE_URL = 'http://localhost:8005';
const COMPTE_SERVICE_URL = 'http://localhost:8007';
const VENTE_SERVICE_URL = 'http://localhost:8006';

// Données de test
const testOrder = {
    produitId: '1',
    quantite: 2,
    clientId: '2',
    montant: 50.00
};

async function testSagaSuccess() {
    console.log('\n🧪 Test: Saga Success - Commande normale');
    console.log('=====================================');
    
    try {
        const response = await axios.post(`${SAGA_ORCHESTRATOR_URL}/saga/order`, testOrder);
        
        if (response.status === 200) {
            console.log('✅ Saga exécutée avec succès');
            console.log('Response:', JSON.stringify(response.data, null, 2));
            
            // Vérifier le statut du saga
            const sagaId = response.data.sagaId;
            const statusResponse = await axios.get(`${SAGA_ORCHESTRATOR_URL}/saga/${sagaId}/status`);
            console.log('📊 Statut du Saga:', JSON.stringify(statusResponse.data, null, 2));
        }
    } catch (error) {
        console.error('❌ Erreur:', error.response?.data || error.message);
    }
}

async function testSagaFailureStock() {
    console.log('\n🧪 Test: Saga Failure - Stock insuffisant');
    console.log('==========================================');
    
    const failOrder = {
        ...testOrder,
        produitId: '999', // Produit qui n'existe pas
        quantite: 100
    };
    
    try {
        const response = await axios.post(`${SAGA_ORCHESTRATOR_URL}/saga/order`, failOrder);
        console.log('Response:', JSON.stringify(response.data, null, 2));
    } catch (error) {
        console.log('✅ Échec attendu - Stock insuffisant');
        console.log('Error:', error.response?.data || error.message);
    }
}

async function testSagaFailurePayment() {
    console.log('\n🧪 Test: Saga Failure - Paiement échoué');
    console.log('========================================');
    
    const failOrder = {
        ...testOrder,
        montant: 1500 // Montant trop élevé pour simuler un échec de paiement
    };
    
    try {
        const response = await axios.post(`${SAGA_ORCHESTRATOR_URL}/saga/order`, failOrder);
        console.log('Response:', JSON.stringify(response.data, null, 2));
    } catch (error) {
        console.log('✅ Échec attendu - Paiement refusé');
        console.log('Error:', error.response?.data || error.message);
    }
}

async function testServiceHealth() {
    console.log('\n🔍 Vérification de la santé des services');
    console.log('========================================');
    
    const services = [
        { name: 'Saga Orchestrator', url: `${SAGA_ORCHESTRATOR_URL}/health` },
        { name: 'Stock Service', url: `${STOCK_SERVICE_URL}/health` },
        { name: 'Compte Service', url: `${COMPTE_SERVICE_URL}/health` },
        { name: 'Vente Service', url: `${VENTE_SERVICE_URL}/health` }
    ];
    
    for (const service of services) {
        try {
            const response = await axios.get(service.url, { timeout: 5000 });
            console.log(`✅ ${service.name}: ${response.data.status || 'OK'}`);
        } catch (error) {
            console.log(`❌ ${service.name}: ${error.message}`);
        }
    }
}

async function listSagas() {
    console.log('\n📋 Liste des Sagas exécutées');
    console.log('============================');
    
    try {
        const response = await axios.get(`${SAGA_ORCHESTRATOR_URL}/saga/list`);
        console.log(JSON.stringify(response.data, null, 2));
    } catch (error) {
        console.error('❌ Erreur:', error.response?.data || error.message);
    }
}

async function runAllTests() {
    console.log('🚀 Démarrage des tests du Saga Orchestrator');
    console.log('=============================================');
    
    // Vérifier la santé des services
    await testServiceHealth();
    
    // Attendre un peu pour que les services soient prêts
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Tests des scénarios
    await testSagaSuccess();
    await testSagaFailureStock();
    await testSagaFailurePayment();
    
    // Lister les sagas
    await listSagas();
    
    console.log('\n✨ Tests terminés');
}

// Gestion des arguments de ligne de commande
const args = process.argv.slice(2);
if (args.length > 0) {
    switch (args[0]) {
        case 'health':
            testServiceHealth();
            break;
        case 'success':
            testSagaSuccess();
            break;
        case 'fail-stock':
            testSagaFailureStock();
            break;
        case 'fail-payment':
            testSagaFailurePayment();
            break;
        case 'list':
            listSagas();
            break;
        default:
            console.log('Usage: node test-saga.js [health|success|fail-stock|fail-payment|list]');
            break;
    }
} else {
    runAllTests();
}

module.exports = {
    testSagaSuccess,
    testSagaFailureStock,
    testSagaFailurePayment,
    testServiceHealth,
    listSagas
};
