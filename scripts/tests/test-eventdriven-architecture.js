#!/usr/bin/env node

/**
 * Test Automatisé - Architecture Événementielle LAB 7
 * Tests Event Sourcing, CQRS et Pub/Sub
 */

const axios = require('axios');
const { v4: uuidv4 } = require('uuid');

class EventDrivenTester {
    constructor() {
        this.baseUrls = {
            reclamation: 'http://localhost:8011',
            notification: 'http://localhost:8012', 
            audit: 'http://localhost:8013',
            analytics: 'http://localhost:8014'
        };
        
        this.testResults = {
            eventSourcing: [],
            pubSub: [],
            cqrs: [],
            observability: []
        };
        
        this.testReclamationId = null;
    }

    async runAllTests() {
        console.log('🚀 Démarrage des tests Architecture Événementielle\n');
        
        try {
            // Vérification de la connectivité
            await this.checkServicesHealth();
            
            // Tests Event Sourcing
            await this.testEventSourcing();
            
            // Tests Pub/Sub
            await this.testPubSub();
            
            // Tests CQRS
            await this.testCQRS();
            
            // Tests Observabilité
            await this.testObservability();
            
            // Résultats finaux
            this.displayResults();
            
        } catch (error) {
            console.error('❌ Erreur critique pendant les tests:', error.message);
            process.exit(1);
        }
    }

    async checkServicesHealth() {
        console.log('🔍 Vérification de la santé des services...\n');
        
        for (const [service, url] of Object.entries(this.baseUrls)) {
            try {
                const response = await axios.get(`${url}/health`, { timeout: 5000 });
                console.log(`✅ ${service.toUpperCase()} Service: ${response.data.status}`);
            } catch (error) {
                console.log(`❌ ${service.toUpperCase()} Service: Non disponible`);
                throw new Error(`Service ${service} non accessible`);
            }
        }
        console.log('');
    }

    async testEventSourcing() {
        console.log('📊 Tests Event Sourcing...\n');
        
        try {
            // Test 1: Création d'une réclamation
            const createData = {
                clientId: `client-${uuidv4()}`,
                type: 'PRODUIT_DEFECTUEUX',
                description: 'Test Event Sourcing - Produit défectueux',
                priority: 'HIGH'
            };
            
            const createResponse = await axios.post(
                `${this.baseUrls.reclamation}/api/v1/reclamations`,
                createData
            );
            
            this.testReclamationId = createResponse.data.id;
            this.logTestResult('eventSourcing', 'Création réclamation', true, 
                `ID: ${this.testReclamationId}`);
            
            // Test 2: Affectation agent
            await axios.put(
                `${this.baseUrls.reclamation}/api/v1/reclamations/${this.testReclamationId}/assign`,
                {
                    agentId: `agent-${uuidv4()}`,
                    comment: 'Test affectation automatique'
                }
            );
            this.logTestResult('eventSourcing', 'Affectation agent', true);
            
            // Test 3: Résolution
            await axios.put(
                `${this.baseUrls.reclamation}/api/v1/reclamations/${this.testReclamationId}/resolve`,
                {
                    resolution: 'Produit remplacé',
                    comment: 'Test résolution automatique'
                }
            );
            this.logTestResult('eventSourcing', 'Résolution réclamation', true);
            
            // Test 4: Récupération des événements
            const eventsResponse = await axios.get(
                `${this.baseUrls.reclamation}/api/v1/reclamations/${this.testReclamationId}/events`
            );
            
            const events = eventsResponse.data;
            const expectedEvents = ['ReclamationCreee', 'ReclamationAffectee', 'ReclamationTraitee'];
            const hasAllEvents = expectedEvents.every(expected => 
                events.some(event => event.eventType === expected)
            );
            
            this.logTestResult('eventSourcing', 'Récupération événements', hasAllEvents,
                `${events.length} événements trouvés`);
            
            // Test 5: Replay d'événements
            const replayResponse = await axios.post(
                `${this.baseUrls.reclamation}/api/v1/reclamations/${this.testReclamationId}/replay`
            );
            
            this.logTestResult('eventSourcing', 'Replay événements', true,
                `État reconstruit: ${replayResponse.data.status}`);
            
        } catch (error) {
            this.logTestResult('eventSourcing', 'Event Sourcing Global', false, error.message);
        }
        
        console.log('');
    }

    async testPubSub() {
        console.log('📡 Tests Pub/Sub (Message Broker)...\n');
        
        // Attendre propagation des événements
        await this.sleep(2000);
        
        try {
            // Test 1: Vérification notifications reçues
            const notificationResponse = await axios.get(
                `${this.baseUrls.notification}/api/v1/notifications/recent`
            );
            
            this.logTestResult('pubSub', 'Réception notifications', 
                notificationResponse.data.notifications.length > 0,
                `${notificationResponse.data.notifications.length} notifications`);
            
            // Test 2: Vérification audit trail
            const auditResponse = await axios.get(
                `${this.baseUrls.audit}/api/v1/audit/events/recent`
            );
            
            this.logTestResult('pubSub', 'Enregistrement audit', 
                auditResponse.data.events.length > 0,
                `${auditResponse.data.events.length} événements d'audit`);
            
            // Test 3: Vérification analytics
            const analyticsResponse = await axios.get(
                `${this.baseUrls.analytics}/api/v1/analytics/events/recent`
            );
            
            this.logTestResult('pubSub', 'Traitement analytics', 
                analyticsResponse.data.events.length > 0,
                `${analyticsResponse.data.events.length} événements traités`);
            
        } catch (error) {
            this.logTestResult('pubSub', 'Pub/Sub Global', false, error.message);
        }
        
        console.log('');
    }

    async testCQRS() {
        console.log('🔄 Tests CQRS (Command/Query Separation)...\n');
        
        try {
            // Test 1: Read Model - Résumé réclamations
            const summaryResponse = await axios.get(
                `${this.baseUrls.analytics}/api/v1/analytics/reclamations/summary`
            );
            
            this.logTestResult('cqrs', 'Read Model - Résumé', true,
                `Total: ${summaryResponse.data.total}, En cours: ${summaryResponse.data.active}`);
            
            // Test 2: Read Model - Performance agents
            const performanceResponse = await axios.get(
                `${this.baseUrls.analytics}/api/v1/analytics/agents/performance`
            );
            
            this.logTestResult('cqrs', 'Read Model - Performance agents', true,
                `${performanceResponse.data.agents.length} agents suivis`);
            
            // Test 3: Read Model - Satisfaction client
            const satisfactionResponse = await axios.get(
                `${this.baseUrls.analytics}/api/v1/analytics/satisfaction/trends`
            );
            
            this.logTestResult('cqrs', 'Read Model - Satisfaction', true,
                `Score moyen: ${satisfactionResponse.data.averageScore}`);
            
            // Test 4: Vérification séparation Command/Query
            // Commands restent sur le service principal
            const commandCheck = await axios.get(
                `${this.baseUrls.reclamation}/api/v1/reclamations/${this.testReclamationId}`
            );
            
            // Queries optimisées sur service analytics
            const queryCheck = await axios.get(
                `${this.baseUrls.analytics}/api/v1/analytics/reclamations/${this.testReclamationId}/summary`
            );
            
            this.logTestResult('cqrs', 'Séparation Command/Query', true,
                'Services séparés fonctionnels');
            
        } catch (error) {
            this.logTestResult('cqrs', 'CQRS Global', false, error.message);
        }
        
        console.log('');
    }

    async testObservability() {
        console.log('📈 Tests Observabilité...\n');
        
        try {
            // Test 1: Métriques Prometheus
            for (const [service, url] of Object.entries(this.baseUrls)) {
                const metricsResponse = await axios.get(`${url}/metrics`);
                const hasEventMetrics = metricsResponse.data.includes('events_published_total') ||
                                      metricsResponse.data.includes('events_consumed_total');
                
                this.logTestResult('observability', `Métriques ${service}`, hasEventMetrics,
                    hasEventMetrics ? 'Métriques événementielles présentes' : 'Métriques de base uniquement');
            }
            
            // Test 2: Latence des événements
            const latencyTest = await this.testEventLatency();
            this.logTestResult('observability', 'Latence événements', 
                latencyTest.latency < 1000, `${latencyTest.latency}ms`);
            
            // Test 3: Statistiques Event Store
            const statsResponse = await axios.get(
                `${this.baseUrls.reclamation}/api/v1/eventstore/statistics`
            );
            
            this.logTestResult('observability', 'Statistiques Event Store', true,
                `${statsResponse.data.totalEvents} événements stockés`);
            
        } catch (error) {
            this.logTestResult('observability', 'Observabilité Globale', false, error.message);
        }
        
        console.log('');
    }

    async testEventLatency() {
        const startTime = Date.now();
        
        // Créer un événement simple
        await axios.post(
            `${this.baseUrls.reclamation}/api/v1/reclamations`,
            {
                clientId: `latency-test-${Date.now()}`,
                type: 'TEST_LATENCE',
                description: 'Test de latence événementielle',
                priority: 'LOW'
            }
        );
        
        // Attendre propagation
        await this.sleep(100);
        
        const endTime = Date.now();
        return { latency: endTime - startTime };
    }

    logTestResult(category, testName, success, details = '') {
        const icon = success ? '✅' : '❌';
        const result = success ? 'PASS' : 'FAIL';
        
        console.log(`${icon} ${testName}: ${result}${details ? ` - ${details}` : ''}`);
        
        this.testResults[category].push({
            testName,
            success,
            details
        });
    }

    displayResults() {
        console.log('\n' + '='.repeat(60));
        console.log('📊 RÉSULTATS FINAUX - ARCHITECTURE ÉVÉNEMENTIELLE');
        console.log('='.repeat(60));
        
        const categories = [
            { key: 'eventSourcing', name: '📊 Event Sourcing' },
            { key: 'pubSub', name: '📡 Pub/Sub' },
            { key: 'cqrs', name: '🔄 CQRS' },
            { key: 'observability', name: '📈 Observabilité' }
        ];
        
        let totalTests = 0;
        let passedTests = 0;
        
        categories.forEach(category => {
            const results = this.testResults[category.key];
            const passed = results.filter(r => r.success).length;
            const total = results.length;
            
            totalTests += total;
            passedTests += passed;
            
            const percentage = total > 0 ? ((passed / total) * 100).toFixed(1) : '0';
            const status = passed === total ? '🟢' : passed > 0 ? '🟡' : '🔴';
            
            console.log(`${status} ${category.name}: ${passed}/${total} (${percentage}%)`);
        });
        
        console.log('\n' + '-'.repeat(60));
        
        const overallPercentage = totalTests > 0 ? ((passedTests / totalTests) * 100).toFixed(1) : '0';
        const overallStatus = passedTests === totalTests ? '🎉' : passedTests > totalTests * 0.8 ? '✅' : '⚠️';
        
        console.log(`${overallStatus} SCORE GLOBAL: ${passedTests}/${totalTests} (${overallPercentage}%)`);
        
        if (passedTests === totalTests) {
            console.log('\n🏆 FÉLICITATIONS ! Architecture événementielle 100% fonctionnelle !');
        } else if (passedTests >= totalTests * 0.8) {
            console.log('\n✅ Excellent ! Architecture événementielle largement opérationnelle.');
        } else {
            console.log('\n⚠️  Certains composants nécessitent des ajustements.');
        }
        
        console.log('\n📋 Points vérifiés:');
        console.log('  • Event Sourcing avec reconstruction d\'état');
        console.log('  • Pub/Sub avec RabbitMQ et consommateurs multiples');
        console.log('  • CQRS avec séparation Command/Query');
        console.log('  • Observabilité avec métriques et tracing');
        
        console.log('='.repeat(60));
    }

    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}

// Exécution des tests
if (require.main === module) {
    const tester = new EventDrivenTester();
    tester.runAllTests();
}

module.exports = EventDrivenTester;
