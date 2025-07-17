/**
 * Simulateur de Saga Choreography - Cas de Réussite et d'Échec
 * LAB 7 - Architecture Événementielle
 */

const axios = require('axios');
const { faker } = require('@faker-js/faker');

const SERVICES = {
    validation: 'http://localhost:8012',
    notification: 'http://localhost:8013',
    payment: 'http://localhost:8014', 
    reclamation: 'http://localhost:8015'
};

const SIMULATION_CONFIG = {
    totalTransactions: 100,
    successRate: 0.7, // 70% de succès
    partialFailureRate: 0.2, // 20% d'échec partiel
    completeFailureRate: 0.1, // 10% d'échec complet
    delayBetweenRequests: 100 // ms
};

class SagaSimulator {
    constructor() {
        this.stats = {
            total: 0,
            success: 0,
            partialFailure: 0,
            completeFailure: 0,
            validationFailures: 0,
            paymentFailures: 0,
            notificationFailures: 0,
            reclamationFailures: 0
        };
    }

    /**
     * Génère des données de test réalistes
     */
    generateTestData(scenario = 'success') {
        const baseData = {
            orderId: `ORDER-${faker.string.alphanumeric(8)}`,
            customerId: `CUSTOMER-${faker.string.alphanumeric(6)}`,
            amount: faker.number.float({ min: 10, max: 1000, fractionDigits: 2 }),
            currency: faker.helpers.arrayElement(['EUR', 'USD', 'CAD']),
            paymentMethod: faker.helpers.arrayElement(['BANK_TRANSFER', 'PAYPAL', 'STRIPE', 'SEPA']),
            email: faker.internet.email(),
            phone: faker.phone.number(),
            metadata: {
                source: 'saga-simulation',
                scenario: scenario,
                timestamp: new Date().toISOString(),
                sessionId: faker.string.uuid()
            }
        };

        // Modifier les données selon le scénario
        switch (scenario) {
            case 'validation_failure':
                // Données invalides pour déclencher échec validation
                baseData.amount = -100; // Montant négatif
                baseData.email = 'invalid-email'; // Email invalide
                break;
                
            case 'payment_failure':
                // Données valides mais qui échoueront au paiement
                baseData.paymentMethod = 'INVALID_METHOD';
                baseData.amount = 9999999; // Montant trop élevé
                break;
                
            case 'notification_failure':
                // Email invalide pour test notification
                baseData.email = '';
                baseData.phone = '';
                break;
                
            case 'reclamation_failure':
                // Type de réclamation non supporté
                baseData.reclamationType = 'UNSUPPORTED_TYPE';
                break;
                
            case 'success':
            default:
                // Données valides pour succès
                baseData.reclamationType = faker.helpers.arrayElement([
                    'SERVICE', 'PRODUIT', 'FACTURATION', 'LIVRAISON', 'REFUND'
                ]);
                break;
        }

        return baseData;
    }

    /**
     * Simule une saga complète
     */
    async simulateSaga(scenario) {
        const correlationId = faker.string.uuid();
        const startTime = Date.now();
        
        console.log(`\n🎯 [${correlationId.substring(0, 8)}] Démarrage saga - Scénario: ${scenario}`);
        
        try {
            const testData = this.generateTestData(scenario);
            
            // === ÉTAPE 1: VALIDATION ===
            console.log(`📋 [${correlationId.substring(0, 8)}] Validation...`);
            const validationResult = await this.callValidationService(testData, correlationId);
            
            if (!validationResult.success) {
                this.stats.validationFailures++;
                throw new Error(`Validation échouée: ${validationResult.reason}`);
            }
            
            // === ÉTAPE 2: NOTIFICATION ===  
            console.log(`📧 [${correlationId.substring(0, 8)}] Notification...`);
            const notificationResult = await this.callNotificationService(testData, correlationId);
            
            if (!notificationResult.success && scenario !== 'notification_failure') {
                this.stats.notificationFailures++;
                throw new Error(`Notification échouée: ${notificationResult.reason}`);
            }
            
            // === ÉTAPE 3: PAIEMENT ===
            console.log(`💳 [${correlationId.substring(0, 8)}] Paiement...`);
            const paymentResult = await this.callPaymentService(testData, correlationId);
            
            if (!paymentResult.success) {
                this.stats.paymentFailures++;
                // Compensation: annuler la notification
                await this.compensateNotification(correlationId);
                throw new Error(`Paiement échoué: ${paymentResult.reason}`);
            }
            
            // === ÉTAPE 4: RÉCLAMATION ===
            console.log(`📋 [${correlationId.substring(0, 8)}] Réclamation...`);
            const reclamationResult = await this.callReclamationService(testData, correlationId);
            
            if (!reclamationResult.success) {
                this.stats.reclamationFailures++;
                // Compensation: annuler paiement et notification
                await this.compensatePayment(correlationId);
                await this.compensateNotification(correlationId);
                throw new Error(`Réclamation échouée: ${reclamationResult.reason}`);
            }
            
            // === SUCCÈS ===
            const duration = Date.now() - startTime;
            console.log(`✅ [${correlationId.substring(0, 8)}] Saga réussie en ${duration}ms`);
            this.stats.success++;
            
            return { success: true, duration, correlationId };
            
        } catch (error) {
            const duration = Date.now() - startTime;
            console.log(`❌ [${correlationId.substring(0, 8)}] Saga échouée: ${error.message} (${duration}ms)`);
            
            if (scenario === 'validation_failure') {
                this.stats.completeFailure++;
            } else {
                this.stats.partialFailure++;
            }
            
            return { success: false, error: error.message, duration, correlationId };
        }
    }

    /**
     * Appel du service de validation
     */
    async callValidationService(data, correlationId) {
        try {
            const response = await axios.post(`${SERVICES.validation}/validate`, {
                ...data,
                correlationId,
                sagaStep: 'validation'
            }, { timeout: 5000 });
            
            return { 
                success: response.data.valid === true,
                reason: response.data.rejectionReason || 'OK',
                data: response.data
            };
        } catch (error) {
            return { 
                success: false, 
                reason: error.response?.data?.message || error.message 
            };
        }
    }

    /**
     * Appel du service de notification
     */
    async callNotificationService(data, correlationId) {
        try {
            const response = await axios.post(`${SERVICES.notification}/notify`, {
                templateId: 'saga_started',
                recipient: data.email,
                channel: 'EMAIL',
                data: {
                    orderId: data.orderId,
                    amount: data.amount,
                    currency: data.currency
                },
                correlationId,
                sagaStep: 'notification'
            }, { timeout: 5000 });
            
            return { 
                success: response.status === 200,
                reason: 'OK',
                data: response.data
            };
        } catch (error) {
            return { 
                success: false, 
                reason: error.response?.data?.message || error.message 
            };
        }
    }

    /**
     * Appel du service de paiement
     */
    async callPaymentService(data, correlationId) {
        try {
            const response = await axios.post(`${SERVICES.payment}/process`, {
                amount: data.amount,
                currency: data.currency,
                paymentMethod: data.paymentMethod,
                orderId: data.orderId,
                customerId: data.customerId,
                correlationId,
                sagaStep: 'payment'
            }, { timeout: 10000 });
            
            return { 
                success: response.data.status === 'SUCCESS',
                reason: response.data.message || 'OK',
                data: response.data
            };
        } catch (error) {
            return { 
                success: false, 
                reason: error.response?.data?.message || error.message 
            };
        }
    }

    /**
     * Appel du service de réclamation
     */
    async callReclamationService(data, correlationId) {
        try {
            const response = await axios.post(`${SERVICES.reclamation}/create`, {
                type: data.reclamationType || 'SERVICE',
                orderId: data.orderId,
                customerId: data.customerId,
                description: `Réclamation générée automatiquement pour ${data.orderId}`,
                priority: 'MEDIUM',
                correlationId,
                sagaStep: 'reclamation'
            }, { timeout: 5000 });
            
            return { 
                success: response.status === 200 || response.status === 201,
                reason: 'OK',
                data: response.data
            };
        } catch (error) {
            return { 
                success: false, 
                reason: error.response?.data?.message || error.message 
            };
        }
    }

    /**
     * Compensation: annuler notification
     */
    async compensateNotification(correlationId) {
        try {
            console.log(`🔄 [${correlationId.substring(0, 8)}] Compensation notification...`);
            // Simulation de compensation
            return true;
        } catch (error) {
            console.log(`❌ Erreur compensation notification: ${error.message}`);
            return false;
        }
    }

    /**
     * Compensation: annuler paiement
     */
    async compensatePayment(correlationId) {
        try {
            console.log(`🔄 [${correlationId.substring(0, 8)}] Compensation paiement...`);
            // Simulation de compensation
            return true;
        } catch (error) {
            console.log(`❌ Erreur compensation paiement: ${error.message}`);
            return false;
        }
    }

    /**
     * Détermine le scénario à exécuter selon les probabilités
     */
    determineScenario() {
        const rand = Math.random();
        
        if (rand < SIMULATION_CONFIG.successRate) {
            return 'success';
        } else if (rand < SIMULATION_CONFIG.successRate + SIMULATION_CONFIG.partialFailureRate) {
            // Échecs partiels aléatoirement distribués
            const failures = ['payment_failure', 'notification_failure', 'reclamation_failure'];
            return faker.helpers.arrayElement(failures);
        } else {
            return 'validation_failure'; // Échec complet
        }
    }

    /**
     * Lance la simulation complète
     */
    async runSimulation() {
        console.log('🚀 Démarrage de la simulation Saga Choreography');
        console.log(`📊 Configuration: ${SIMULATION_CONFIG.totalTransactions} transactions`);
        console.log(`   - Succès attendu: ${SIMULATION_CONFIG.successRate * 100}%`);
        console.log(`   - Échec partiel: ${SIMULATION_CONFIG.partialFailureRate * 100}%`);
        console.log(`   - Échec complet: ${SIMULATION_CONFIG.completeFailureRate * 100}%\n`);

        const startTime = Date.now();

        for (let i = 0; i < SIMULATION_CONFIG.totalTransactions; i++) {
            this.stats.total++;
            const scenario = this.determineScenario();
            
            await this.simulateSaga(scenario);
            
            // Petite pause entre les requêtes
            await new Promise(resolve => setTimeout(resolve, SIMULATION_CONFIG.delayBetweenRequests));
            
            // Affichage de progression
            if (i % 10 === 0 && i > 0) {
                console.log(`\n📈 Progression: ${i}/${SIMULATION_CONFIG.totalTransactions} (${Math.round(i/SIMULATION_CONFIG.totalTransactions*100)}%)`);
            }
        }

        const totalDuration = Date.now() - startTime;
        this.printFinalStats(totalDuration);
    }

    /**
     * Affiche les statistiques finales
     */
    printFinalStats(duration) {
        console.log('\n' + '='.repeat(60));
        console.log('📊 RÉSULTATS DE LA SIMULATION SAGA CHOREOGRAPHY');
        console.log('='.repeat(60));
        console.log(`⏱️  Durée totale: ${Math.round(duration/1000)}s`);
        console.log(`📦 Transactions totales: ${this.stats.total}`);
        console.log(`✅ Succès: ${this.stats.success} (${Math.round(this.stats.success/this.stats.total*100)}%)`);
        console.log(`⚠️  Échecs partiels: ${this.stats.partialFailure} (${Math.round(this.stats.partialFailure/this.stats.total*100)}%)`);
        console.log(`❌ Échecs complets: ${this.stats.completeFailure} (${Math.round(this.stats.completeFailure/this.stats.total*100)}%)`);
        console.log('\n📋 Détail des échecs par service:');
        console.log(`   🔍 Validation: ${this.stats.validationFailures}`);
        console.log(`   📧 Notification: ${this.stats.notificationFailures}`);
        console.log(`   💳 Paiement: ${this.stats.paymentFailures}`);
        console.log(`   📋 Réclamation: ${this.stats.reclamationFailures}`);
        console.log('\n🎯 Consultez Grafana (http://localhost:3000) pour les métriques détaillées');
        console.log('='.repeat(60));
    }
}

// Exécution si appelé directement
if (require.main === module) {
    const simulator = new SagaSimulator();
    simulator.runSimulation().catch(console.error);
}

module.exports = SagaSimulator;
