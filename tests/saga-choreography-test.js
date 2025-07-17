const axios = require('axios');
const { v4: uuidv4 } = require('uuid');

class SagaTestSuite {
    constructor() {
        this.baseUrls = {
            reclamation: 'http://localhost:8011',
            validation: 'http://localhost:8012',
            notification: 'http://localhost:8013',
            payment: 'http://localhost:8014'
        };
        this.testResults = [];
        this.sagaTracking = new Map();
    }

    async runAllTests() {
        console.log('🎭 Démarrage des tests de saga chorégraphiée\n');
        
        try {
            // Vérification des services
            await this.checkServicesHealth();
            
            // Tests de saga
            await this.testSuccessfulSaga();
            await this.testValidationFailureSaga();
            await this.testPaymentFailureSaga();
            await this.testMultipleConcurrentSagas();
            
            // Analyse des résultats
            this.analyzeResults();
            
        } catch (error) {
            console.error('❌ Erreur lors des tests:', error.message);
        }
    }

    async checkServicesHealth() {
        console.log('🔍 Vérification de l\'état des services...');
        
        for (const [service, url] of Object.entries(this.baseUrls)) {
            try {
                const response = await axios.get(`${url}/health`, { timeout: 5000 });
                console.log(`✅ ${service}: ${response.data.status}`);
            } catch (error) {
                console.log(`❌ ${service}: Service indisponible`);
                throw new Error(`Service ${service} non disponible`);
            }
        }
        console.log();
    }

    async testSuccessfulSaga() {
        console.log('📝 Test: Saga réussie complète');
        const testId = uuidv4();
        
        try {
            const reclamationData = {
                titre: `Test Saga Réussie ${testId}`,
                description: 'Réclamation test avec montant 50.00€ pour saga complète',
                priorite: 'haute',
                clientId: `client-test-${testId}`,
                type: 'REMBOURSEMENT'
            };

            const startTime = Date.now();
            const response = await axios.post(`${this.baseUrls.reclamation}/api/reclamations`, reclamationData);
            
            this.sagaTracking.set(response.data.saga.id, {
                testType: 'SUCCESS',
                startTime,
                reclamationId: response.data.reclamation.id,
                sagaId: response.data.saga.id,
                status: 'STARTED'
            });

            console.log(`   ✅ Saga créée: ${response.data.saga.id}`);
            
            // Attente pour que la saga se termine
            await this.waitForSagaCompletion(response.data.saga.id, 30000);
            
            this.testResults.push({
                test: 'Saga Successful Flow',
                result: 'PASS',
                duration: Date.now() - startTime,
                sagaId: response.data.saga.id
            });

        } catch (error) {
            console.log(`   ❌ Erreur: ${error.message}`);
            this.testResults.push({
                test: 'Saga Successful Flow',
                result: 'FAIL',
                error: error.message
            });
        }
        console.log();
    }

    async testValidationFailureSaga() {
        console.log('📝 Test: Saga avec échec de validation');
        const testId = uuidv4();
        
        try {
            const reclamationData = {
                titre: `Test Validation Failure ${testId}`,
                description: 'FORCE_VALIDATION_FAILURE - Test de compensation',
                priorite: 'basse',
                clientId: `client-test-${testId}`,
                type: 'PLAINTE'
            };

            const startTime = Date.now();
            const response = await axios.post(`${this.baseUrls.reclamation}/api/reclamations`, reclamationData);
            
            this.sagaTracking.set(response.data.saga.id, {
                testType: 'VALIDATION_FAILURE',
                startTime,
                reclamationId: response.data.reclamation.id,
                sagaId: response.data.saga.id,
                status: 'STARTED'
            });

            console.log(`   ✅ Saga créée: ${response.data.saga.id}`);
            
            // Attente pour que la saga soit compensée
            await this.waitForSagaCompletion(response.data.saga.id, 15000);
            
            this.testResults.push({
                test: 'Saga Validation Failure',
                result: 'PASS',
                duration: Date.now() - startTime,
                sagaId: response.data.saga.id
            });

        } catch (error) {
            console.log(`   ❌ Erreur: ${error.message}`);
            this.testResults.push({
                test: 'Saga Validation Failure',
                result: 'FAIL',
                error: error.message
            });
        }
        console.log();
    }

    async testPaymentFailureSaga() {
        console.log('📝 Test: Saga avec échec de paiement');
        const testId = uuidv4();
        
        try {
            const reclamationData = {
                titre: `Test Payment Failure ${testId}`,
                description: 'Réclamation test avec montant 999.99€ - FORCE_PAYMENT_FAILURE',
                priorite: 'haute',
                clientId: `client-test-${testId}`,
                type: 'REMBOURSEMENT'
            };

            const startTime = Date.now();
            const response = await axios.post(`${this.baseUrls.reclamation}/api/reclamations`, reclamationData);
            
            this.sagaTracking.set(response.data.saga.id, {
                testType: 'PAYMENT_FAILURE',
                startTime,
                reclamationId: response.data.reclamation.id,
                sagaId: response.data.saga.id,
                status: 'STARTED'
            });

            console.log(`   ✅ Saga créée: ${response.data.saga.id}`);
            
            // Attente pour que la saga soit compensée
            await this.waitForSagaCompletion(response.data.saga.id, 25000);
            
            this.testResults.push({
                test: 'Saga Payment Failure',
                result: 'PASS',
                duration: Date.now() - startTime,
                sagaId: response.data.saga.id
            });

        } catch (error) {
            console.log(`   ❌ Erreur: ${error.message}`);
            this.testResults.push({
                test: 'Saga Payment Failure',
                result: 'FAIL',
                error: error.message
            });
        }
        console.log();
    }

    async testMultipleConcurrentSagas() {
        console.log('📝 Test: Sagas concurrentes multiples');
        
        try {
            const promises = [];
            const sagaIds = [];
            const startTime = Date.now();

            for (let i = 0; i < 5; i++) {
                const testId = uuidv4();
                const reclamationData = {
                    titre: `Test Concurrent Saga ${i + 1}`,
                    description: `Réclamation concurrente ${i + 1} avec montant ${(i + 1) * 25}.00€`,
                    priorite: i % 2 === 0 ? 'haute' : 'normale',
                    clientId: `client-concurrent-${testId}`,
                    type: 'REMBOURSEMENT'
                };

                const promise = axios.post(`${this.baseUrls.reclamation}/api/reclamations`, reclamationData)
                    .then(response => {
                        sagaIds.push(response.data.saga.id);
                        this.sagaTracking.set(response.data.saga.id, {
                            testType: 'CONCURRENT',
                            startTime: Date.now(),
                            reclamationId: response.data.reclamation.id,
                            sagaId: response.data.saga.id,
                            status: 'STARTED',
                            index: i + 1
                        });
                        return response.data.saga.id;
                    });

                promises.push(promise);
            }

            await Promise.all(promises);
            console.log(`   ✅ ${sagaIds.length} sagas concurrentes créées`);

            // Attente que toutes les sagas se terminent
            const completionPromises = sagaIds.map(sagaId => 
                this.waitForSagaCompletion(sagaId, 45000)
            );

            await Promise.all(completionPromises);

            this.testResults.push({
                test: 'Concurrent Sagas',
                result: 'PASS',
                duration: Date.now() - startTime,
                sagaCount: sagaIds.length,
                sagaIds: sagaIds
            });

        } catch (error) {
            console.log(`   ❌ Erreur: ${error.message}`);
            this.testResults.push({
                test: 'Concurrent Sagas',
                result: 'FAIL',
                error: error.message
            });
        }
        console.log();
    }

    async waitForSagaCompletion(sagaId, timeout = 30000) {
        const startTime = Date.now();
        
        while (Date.now() - startTime < timeout) {
            try {
                const response = await axios.get(`${this.baseUrls.reclamation}/api/sagas/${sagaId}`);
                const saga = response.data;
                
                if (saga.status === 'COMPLETED') {
                    console.log(`   ✅ Saga ${sagaId} terminée avec succès (${saga.duration}s)`);
                    this.sagaTracking.get(sagaId).status = 'COMPLETED';
                    this.sagaTracking.get(sagaId).finalStatus = saga.status;
                    return saga;
                } else if (saga.status === 'COMPENSATED') {
                    console.log(`   ⚠️  Saga ${sagaId} compensée: ${saga.compensationReason}`);
                    this.sagaTracking.get(sagaId).status = 'COMPENSATED';
                    this.sagaTracking.get(sagaId).finalStatus = saga.status;
                    return saga;
                }
                
                // Attente avant la prochaine vérification
                await new Promise(resolve => setTimeout(resolve, 1000));
                
            } catch (error) {
                if (error.response?.status === 404) {
                    console.log(`   ❌ Saga ${sagaId} non trouvée`);
                    break;
                }
                await new Promise(resolve => setTimeout(resolve, 1000));
            }
        }
        
        throw new Error(`Timeout waiting for saga ${sagaId} completion`);
    }

    async getMetrics() {
        console.log('📊 Collecte des métriques...');
        
        const metrics = {};
        
        for (const [service, url] of Object.entries(this.baseUrls)) {
            try {
                const response = await axios.get(`${url}/metrics`);
                metrics[service] = this.parsePrometheusMetrics(response.data);
            } catch (error) {
                console.log(`   ⚠️  Impossible de récupérer les métriques de ${service}`);
                metrics[service] = null;
            }
        }
        
        return metrics;
    }

    parsePrometheusMetrics(data) {
        const lines = data.split('\n');
        const metrics = {};
        
        for (const line of lines) {
            if (line.startsWith('#') || line.trim() === '') continue;
            
            const [name, value] = line.split(' ');
            if (name && value) {
                metrics[name] = parseFloat(value);
            }
        }
        
        return metrics;
    }

    analyzeResults() {
        console.log('📊 ANALYSE DES RÉSULTATS DES TESTS SAGA');
        console.log('═'.repeat(50));
        
        const passed = this.testResults.filter(r => r.result === 'PASS').length;
        const failed = this.testResults.filter(r => r.result === 'FAIL').length;
        
        console.log(`✅ Tests réussis: ${passed}`);
        console.log(`❌ Tests échoués: ${failed}`);
        console.log(`📈 Taux de réussite: ${((passed / this.testResults.length) * 100).toFixed(1)}%`);
        console.log();
        
        // Détails des tests
        this.testResults.forEach(result => {
            console.log(`${result.result === 'PASS' ? '✅' : '❌'} ${result.test}`);
            if (result.duration) {
                console.log(`   ⏱️  Durée: ${result.duration}ms`);
            }
            if (result.sagaId) {
                console.log(`   🎭 Saga ID: ${result.sagaId}`);
            }
            if (result.sagaCount) {
                console.log(`   📊 Nombre de sagas: ${result.sagaCount}`);
            }
            if (result.error) {
                console.log(`   ❌ Erreur: ${result.error}`);
            }
            console.log();
        });
        
        // Analyse des sagas
        console.log('📊 ANALYSE DES SAGAS');
        console.log('═'.repeat(30));
        
        const sagasByStatus = {};
        for (const saga of this.sagaTracking.values()) {
            const status = saga.finalStatus || saga.status;
            sagasByStatus[status] = (sagasByStatus[status] || 0) + 1;
        }
        
        Object.entries(sagasByStatus).forEach(([status, count]) => {
            console.log(`${status}: ${count} sagas`);
        });
        
        console.log('\n🎯 Tests de saga chorégraphiée terminés!');
    }
}

// Fonction utilitaire pour attendre
function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

// Exécution des tests si le script est lancé directement
if (require.main === module) {
    const tester = new SagaTestSuite();
    
    tester.runAllTests().catch(error => {
        console.error('Erreur lors de l\'exécution des tests:', error);
        process.exit(1);
    });
}

module.exports = SagaTestSuite;
