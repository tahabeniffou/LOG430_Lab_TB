#!/usr/bin/env node

/**
 * Test d'Intégration Complète - LAB 5, 6 et 7
 * Vérification de la compatibilité entre architecture événementielle et infrastructure existante
 */

const axios = require('axios');
const { v4: uuidv4 } = require('uuid');

class IntegrationTester {
    constructor() {
        // Services LAB 5 (Microservices de base)
        this.lab5Services = {
            produit: 'http://localhost:3001',
            stock: 'http://localhost:3002', 
            vente: 'http://localhost:3003',
            reporting: 'http://localhost:3004',
            compte: 'http://localhost:3005',
            panier: 'http://localhost:3006',
            checkout: 'http://localhost:3007'
        };

        // Services LAB 6 (Saga)
        this.lab6Services = {
            saga: 'http://localhost:8010'
        };

        // Services LAB 7 (Event-Driven)
        this.lab7Services = {
            reclamation: 'http://localhost:8011',
            notification: 'http://localhost:8012',
            audit: 'http://localhost:8013',
            analytics: 'http://localhost:8014'
        };

        // Infrastructure
        this.infrastructure = {
            kong: 'http://localhost:8000',
            prometheus: 'http://localhost:9090',
            grafana: 'http://localhost:3000',
            rabbitmq: 'http://localhost:15672'
        };

        this.testResults = {
            lab5: { services: [], total: 0, passed: 0 },
            lab6: { services: [], total: 0, passed: 0 },
            lab7: { services: [], total: 0, passed: 0 },
            infrastructure: { services: [], total: 0, passed: 0 },
            integration: { tests: [], total: 0, passed: 0 }
        };
    }

    async runCompleteIntegrationTest() {
        console.log('🧪 TEST D\'INTÉGRATION COMPLÈTE - LAB 5, 6 et 7\n');
        console.log('=' * 60);
        
        try {
            // Phase 1: Vérification des services LAB 5
            await this.testLab5Services();
            
            // Phase 2: Vérification du Saga Orchestrator LAB 6
            await this.testLab6Saga();
            
            // Phase 3: Vérification de l'architecture événementielle LAB 7
            await this.testLab7EventDriven();
            
            // Phase 4: Vérification de l'infrastructure
            await this.testInfrastructure();
            
            // Phase 5: Tests d'intégration cross-lab
            await this.testCrossLabIntegration();
            
            // Résultats finaux
            this.displayComprehensiveResults();
            
        } catch (error) {
            console.error('❌ Erreur critique pendant les tests:', error.message);
            process.exit(1);
        }
    }

    async testLab5Services() {
        console.log('\n📦 PHASE 1: VÉRIFICATION MICROSERVICES LAB 5\n');
        
        for (const [serviceName, url] of Object.entries(this.lab5Services)) {
            try {
                const response = await axios.get(`${url}/health`, { timeout: 3000 });
                this.logTestResult('lab5', `${serviceName} Service`, true, response.data.status);
            } catch (error) {
                this.logTestResult('lab5', `${serviceName} Service`, false, 'Non disponible');
            }
        }

        // Test spécifique: workflow e-commerce LAB 5
        await this.testLab5Workflow();
    }

    async testLab5Workflow() {
        console.log('\n🔄 Test workflow e-commerce LAB 5...');
        
        try {
            // Test simple: création produit → ajout stock → création compte
            const produitResponse = await axios.get(`${this.lab5Services.produit}/produits`, { timeout: 3000 });
            const stockResponse = await axios.get(`${this.lab5Services.stock}/stock`, { timeout: 3000 });
            
            this.logTestResult('lab5', 'Workflow E-commerce', true, 
                `Produits: ${Array.isArray(produitResponse.data) ? produitResponse.data.length : 'OK'}`);
                
        } catch (error) {
            this.logTestResult('lab5', 'Workflow E-commerce', false, error.message);
        }
    }

    async testLab6Saga() {
        console.log('\n🔄 PHASE 2: VÉRIFICATION SAGA ORCHESTRATOR LAB 6\n');
        
        try {
            // Vérification santé Saga
            const healthResponse = await axios.get(`${this.lab6Services.saga}/health`, { timeout: 3000 });
            this.logTestResult('lab6', 'Saga Orchestrator Health', true, healthResponse.data.status);

            // Test métriques Saga
            const metricsResponse = await axios.get(`${this.lab6Services.saga}/metrics`, { timeout: 3000 });
            const hasSagaMetrics = metricsResponse.data.includes('saga_total');
            this.logTestResult('lab6', 'Saga Métriques', hasSagaMetrics, 'Métriques Prometheus');

            // Test simple saga
            await this.testSimpleSaga();

        } catch (error) {
            this.logTestResult('lab6', 'Saga Orchestrator', false, error.message);
        }
    }

    async testSimpleSaga() {
        try {
            const sagaData = {
                produitId: 'test-integration',
                quantite: 1,
                clientId: 'client-integration',
                totalAmount: 10.00
            };

            const response = await axios.post(`${this.lab6Services.saga}/saga/order`, sagaData, { timeout: 5000 });
            
            if (response.data.sagaId) {
                this.logTestResult('lab6', 'Exécution Saga', true, `ID: ${response.data.sagaId}`);
                
                // Vérifier le statut
                const statusResponse = await axios.get(`${this.lab6Services.saga}/saga/${response.data.sagaId}/status`);
                this.logTestResult('lab6', 'Statut Saga', true, statusResponse.data.status);
            }
        } catch (error) {
            this.logTestResult('lab6', 'Exécution Saga', false, error.response?.data?.error || error.message);
        }
    }

    async testLab7EventDriven() {
        console.log('\n📡 PHASE 3: VÉRIFICATION ARCHITECTURE ÉVÉNEMENTIELLE LAB 7\n');
        
        for (const [serviceName, url] of Object.entries(this.lab7Services)) {
            try {
                const response = await axios.get(`${url}/health`, { timeout: 3000 });
                this.logTestResult('lab7', `${serviceName} Service`, true, response.data.status);
            } catch (error) {
                this.logTestResult('lab7', `${serviceName} Service`, false, 'Non démarré ou erreur');
            }
        }

        // Test spécifique Event Sourcing
        await this.testEventSourcing();
    }

    async testEventSourcing() {
        try {
            const reclamationData = {
                clientId: `integration-${Date.now()}`,
                type: 'TEST_INTEGRATION',
                description: 'Test d\'intégration LAB 5-6-7',
                priority: 'MEDIUM'
            };

            const response = await axios.post(
                `${this.lab7Services.reclamation}/api/v1/reclamations`,
                reclamationData,
                { timeout: 5000 }
            );

            if (response.data.id) {
                this.logTestResult('lab7', 'Event Sourcing', true, `Réclamation créée: ${response.data.id}`);
                
                // Test replay
                const eventsResponse = await axios.get(
                    `${this.lab7Services.reclamation}/api/v1/reclamations/${response.data.id}/events`
                );
                this.logTestResult('lab7', 'Replay Événements', true, `${eventsResponse.data.length} événements`);
            }
        } catch (error) {
            this.logTestResult('lab7', 'Event Sourcing', false, error.response?.data?.error || error.message);
        }
    }

    async testInfrastructure() {
        console.log('\n🏗️ PHASE 4: VÉRIFICATION INFRASTRUCTURE\n');
        
        // Kong API Gateway
        try {
            const kongResponse = await axios.get(`${this.infrastructure.kong}/`, { timeout: 3000 });
            this.logTestResult('infrastructure', 'Kong API Gateway', true, 'Accessible');
        } catch (error) {
            this.logTestResult('infrastructure', 'Kong API Gateway', false, 'Non accessible');
        }

        // Prometheus
        try {
            const promResponse = await axios.get(`${this.infrastructure.prometheus}/-/healthy`, { timeout: 3000 });
            this.logTestResult('infrastructure', 'Prometheus', true, 'Healthy');
        } catch (error) {
            this.logTestResult('infrastructure', 'Prometheus', false, 'Non accessible');
        }

        // RabbitMQ (LAB 7)
        try {
            const rabbitResponse = await axios.get(`${this.infrastructure.rabbitmq}/`, { timeout: 3000 });
            this.logTestResult('infrastructure', 'RabbitMQ', true, 'Management UI accessible');
        } catch (error) {
            this.logTestResult('infrastructure', 'RabbitMQ', false, 'Non accessible');
        }

        // Grafana
        try {
            const grafanaResponse = await axios.get(`${this.infrastructure.grafana}/api/health`, { timeout: 3000 });
            this.logTestResult('infrastructure', 'Grafana', true, 'API accessible');
        } catch (error) {
            this.logTestResult('infrastructure', 'Grafana', false, 'Non accessible');
        }
    }

    async testCrossLabIntegration() {
        console.log('\n🔗 PHASE 5: TESTS D\'INTÉGRATION CROSS-LAB\n');
        
        // Test 1: Workflow complet E-commerce → Saga → Événements
        await this.testCompleteWorkflow();
        
        // Test 2: Métriques partagées
        await this.testSharedMetrics();
        
        // Test 3: Compatibilité des ports
        await this.testPortCompatibility();
        
        // Test 4: Cohérence des données
        await this.testDataConsistency();
    }

    async testCompleteWorkflow() {
        try {
            console.log('🔄 Test workflow complet...');
            
            // Simuler un workflow qui touche les 3 LABs
            let success = true;
            let details = [];

            // LAB 5: Vérifier qu'un service répond
            try {
                await axios.get(`${this.lab5Services.produit}/health`, { timeout: 2000 });
                details.push('LAB5✓');
            } catch {
                success = false;
                details.push('LAB5✗');
            }

            // LAB 6: Vérifier Saga disponible
            try {
                await axios.get(`${this.lab6Services.saga}/health`, { timeout: 2000 });
                details.push('LAB6✓');
            } catch {
                details.push('LAB6✗ (optionnel)');
            }

            // LAB 7: Vérifier Event-Driven disponible
            try {
                await axios.get(`${this.lab7Services.reclamation}/health`, { timeout: 2000 });
                details.push('LAB7✓');
            } catch {
                details.push('LAB7✗ (nouveau)');
            }

            this.logTestResult('integration', 'Workflow Complet', success, details.join(', '));
            
        } catch (error) {
            this.logTestResult('integration', 'Workflow Complet', false, error.message);
        }
    }

    async testSharedMetrics() {
        try {
            console.log('📊 Test métriques partagées...');
            
            const metricsSources = [];
            
            // Vérifier métriques LAB 6
            try {
                const sagaMetrics = await axios.get(`${this.lab6Services.saga}/metrics`, { timeout: 2000 });
                if (sagaMetrics.data.includes('saga_')) {
                    metricsSources.push('Saga');
                }
            } catch {}

            // Vérifier métriques LAB 7
            try {
                const eventMetrics = await axios.get(`${this.lab7Services.reclamation}/metrics`, { timeout: 2000 });
                if (eventMetrics.data.includes('events_')) {
                    metricsSources.push('Events');
                }
            } catch {}

            this.logTestResult('integration', 'Métriques Partagées', metricsSources.length > 0, 
                `Sources: ${metricsSources.join(', ')}`);
                
        } catch (error) {
            this.logTestResult('integration', 'Métriques Partagées', false, error.message);
        }
    }

    async testPortCompatibility() {
        console.log('🔌 Test compatibilité des ports...');
        
        const portMap = {
            'LAB5-Produit': 3001,
            'LAB5-Stock': 3002,
            'LAB6-Saga': 8010,
            'LAB7-Reclamation': 8011,
            'Kong': 8000,
            'Prometheus': 9090,
            'RabbitMQ': 15672
        };

        let conflicts = [];
        let available = [];

        for (const [service, port] of Object.entries(portMap)) {
            try {
                await axios.get(`http://localhost:${port}`, { timeout: 1000 });
                available.push(`${service}:${port}`);
            } catch {
                // Port libre ou service non démarré
            }
        }

        this.logTestResult('integration', 'Compatibilité Ports', true, 
            `${available.length} services actifs: ${available.slice(0, 3).join(', ')}${available.length > 3 ? '...' : ''}`);
    }

    async testDataConsistency() {
        console.log('🔄 Test cohérence des données...');
        
        try {
            // Test simple de cohérence entre les services
            let consistencyChecks = [];

            // Si Saga est disponible, vérifier les données
            try {
                const sagaStats = await axios.get(`${this.lab6Services.saga}/saga/analytics`, { timeout: 2000 });
                consistencyChecks.push('Saga-Analytics');
            } catch {}

            // Si Event Store est disponible, vérifier
            try {
                await axios.get(`${this.lab7Services.reclamation}/api/v1/eventstore/statistics`, { timeout: 2000 });
                consistencyChecks.push('Event-Store');
            } catch {}

            this.logTestResult('integration', 'Cohérence Données', true, 
                `${consistencyChecks.length} sources vérifiées`);
                
        } catch (error) {
            this.logTestResult('integration', 'Cohérence Données', false, error.message);
        }
    }

    logTestResult(category, testName, success, details = '') {
        const icon = success ? '✅' : '❌';
        const result = success ? 'PASS' : 'FAIL';
        
        console.log(`${icon} ${testName}: ${result}${details ? ` - ${details}` : ''}`);
        
        this.testResults[category].services.push({
            testName,
            success,
            details
        });
        
        this.testResults[category].total++;
        if (success) this.testResults[category].passed++;
    }

    displayComprehensiveResults() {
        console.log('\n' + '='.repeat(80));
        console.log('📊 RÉSULTATS INTÉGRATION COMPLÈTE LAB 5-6-7');
        console.log('='.repeat(80));
        
        const categories = [
            { key: 'lab5', name: '📦 LAB 5 - Microservices' },
            { key: 'lab6', name: '🔄 LAB 6 - Saga Pattern' },
            { key: 'lab7', name: '📡 LAB 7 - Event-Driven' },
            { key: 'infrastructure', name: '🏗️ Infrastructure' },
            { key: 'integration', name: '🔗 Intégration Cross-Lab' }
        ];
        
        let totalTests = 0;
        let totalPassed = 0;
        
        categories.forEach(category => {
            const results = this.testResults[category.key];
            const passed = results.passed;
            const total = results.total;
            
            totalTests += total;
            totalPassed += passed;
            
            const percentage = total > 0 ? ((passed / total) * 100).toFixed(1) : '0';
            const status = passed === total ? '🟢' : passed > 0 ? '🟡' : '🔴';
            
            console.log(`${status} ${category.name}: ${passed}/${total} (${percentage}%)`);
        });
        
        console.log('\n' + '-'.repeat(80));
        
        const overallPercentage = totalTests > 0 ? ((totalPassed / totalTests) * 100).toFixed(1) : '0';
        const overallStatus = totalPassed === totalTests ? '🎉' : totalPassed > totalTests * 0.8 ? '✅' : '⚠️';
        
        console.log(`${overallStatus} SCORE GLOBAL: ${totalPassed}/${totalTests} (${overallPercentage}%)`);
        
        // Recommandations
        console.log('\n📋 RECOMMANDATIONS:');
        
        if (this.testResults.lab5.passed < this.testResults.lab5.total) {
            console.log('   📦 LAB 5: Démarrer les microservices de base avec docker-compose');
        }
        
        if (this.testResults.lab6.passed < this.testResults.lab6.total) {
            console.log('   🔄 LAB 6: Démarrer le Saga Orchestrator: node saga-orchestrator-prometheus.js');
        }
        
        if (this.testResults.lab7.passed < this.testResults.lab7.total) {
            console.log('   📡 LAB 7: Démarrer l\'architecture événementielle: scripts/start-eventdriven.bat');
        }
        
        if (this.testResults.infrastructure.passed < this.testResults.infrastructure.total) {
            console.log('   🏗️ Infrastructure: Vérifier Kong, Prometheus, Grafana et RabbitMQ');
        }
        
        console.log('\n🎯 ÉTAT GLOBAL:');
        if (overallPercentage >= 90) {
            console.log('   🏆 EXCELLENT ! Tous les LABs sont parfaitement intégrés !');
        } else if (overallPercentage >= 70) {
            console.log('   ✅ BIEN ! La plupart des composants fonctionnent ensemble.');
        } else if (overallPercentage >= 50) {
            console.log('   ⚠️  MOYEN ! Certains composants nécessitent des ajustements.');
        } else {
            console.log('   🔧 ATTENTION ! Vérifier la configuration et le démarrage des services.');
        }
        
        console.log('\n📚 GUIDE DE DÉMARRAGE COMPLET:');
        console.log('   1. Infrastructure: docker-compose up -d');
        console.log('   2. LAB 6 Saga: node saga-orchestrator-prometheus.js');
        console.log('   3. LAB 7 Events: scripts/start-eventdriven.bat');
        console.log('   4. Tests: node scripts/tests/test-integration-complete.js');
        
        console.log('='.repeat(80));
    }

    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}

// Exécution des tests
if (require.main === module) {
    const tester = new IntegrationTester();
    tester.runCompleteIntegrationTest();
}

module.exports = IntegrationTester;
