#!/usr/bin/env node

/**
 * Validation Post-Démarrage
 * Script de validation rapide après démarrage de l'intégration complète
 */

const axios = require('axios');

class PostStartupValidator {
    constructor() {
        this.services = {
            // LAB 5 - Microservices de base
            'Produit': 'http://localhost:3001/health',
            'Stock': 'http://localhost:3002/health',
            'Vente': 'http://localhost:3003/health',
            'Reporting': 'http://localhost:3004/health',
            
            // LAB 6 - Saga
            'Saga': 'http://localhost:8010/health',
            
            // LAB 7 - Event-Driven
            'Reclamation': 'http://localhost:8011/health',
            'Notification': 'http://localhost:8012/health',
            'Audit': 'http://localhost:8013/health',
            'Analytics': 'http://localhost:8014/health',
            
            // Infrastructure
            'Kong': 'http://localhost:8000/',
            'Prometheus': 'http://localhost:9090/-/healthy',
            'RabbitMQ': 'http://localhost:15672/',
            'Grafana': 'http://localhost:3000/api/health'
        };
    }

    async validateAll() {
        console.log('🔍 VALIDATION POST-DÉMARRAGE\n');
        console.log('=' * 50);
        
        const results = {
            lab5: [],
            lab6: [],
            lab7: [],
            infrastructure: [],
            total: 0,
            success: 0
        };

        // Validation par catégorie
        await this.validateCategory('LAB 5 - Microservices', ['Produit', 'Stock', 'Vente', 'Reporting'], results.lab5);
        await this.validateCategory('LAB 6 - Saga', ['Saga'], results.lab6);
        await this.validateCategory('LAB 7 - Event-Driven', ['Reclamation', 'Notification', 'Audit', 'Analytics'], results.lab7);
        await this.validateCategory('Infrastructure', ['Kong', 'Prometheus', 'RabbitMQ', 'Grafana'], results.infrastructure);

        // Calcul des résultats totaux
        [results.lab5, results.lab6, results.lab7, results.infrastructure].forEach(category => {
            category.forEach(result => {
                results.total++;
                if (result.success) results.success++;
            });
        });

        // Tests fonctionnels rapides
        await this.quickFunctionalTests();

        // Affichage des résultats
        this.displayResults(results);
        
        return results.success / results.total;
    }

    async validateCategory(categoryName, serviceNames, results) {
        console.log(`\n📦 ${categoryName}:`);
        
        for (const serviceName of serviceNames) {
            const url = this.services[serviceName];
            const result = await this.checkService(serviceName, url);
            results.push(result);
            
            const icon = result.success ? '✅' : '❌';
            const status = result.success ? 'OK' : result.error;
            console.log(`   ${icon} ${serviceName}: ${status}`);
        }
    }

    async checkService(name, url) {
        try {
            const response = await axios.get(url, { 
                timeout: 3000,
                validateStatus: (status) => status < 500 // Accepter les redirections
            });
            
            return {
                name,
                success: true,
                response: response.status,
                error: null
            };
            
        } catch (error) {
            return {
                name,
                success: false,
                response: null,
                error: error.code || error.message
            };
        }
    }

    async quickFunctionalTests() {
        console.log('\n🧪 Tests fonctionnels rapides:');
        
        // Test 1: Création d'événement (si service réclamation disponible)
        try {
            const eventTest = await axios.post('http://localhost:8011/api/v1/reclamations', {
                clientId: 'validation-test',
                type: 'VALIDATION',
                description: 'Test de validation post-démarrage',
                priority: 'LOW'
            }, { timeout: 3000 });
            
            console.log('   ✅ Event Sourcing: Création d\'événement OK');
        } catch (error) {
            console.log('   ❌ Event Sourcing: Service non disponible ou erreur');
        }

        // Test 2: Saga simple (si service saga disponible)
        try {
            const sagaTest = await axios.get('http://localhost:8010/saga/analytics', { timeout: 3000 });
            console.log('   ✅ Saga Pattern: Analytics accessibles');
        } catch (error) {
            console.log('   ❌ Saga Pattern: Service non disponible ou erreur');
        }

        // Test 3: Métriques Prometheus
        try {
            const metricsTest = await axios.get('http://localhost:9090/api/v1/query?query=up', { timeout: 3000 });
            console.log('   ✅ Métriques: Prometheus responding');
        } catch (error) {
            console.log('   ❌ Métriques: Prometheus non accessible');
        }
    }

    displayResults(results) {
        console.log('\n' + '='.repeat(60));
        console.log('📊 RÉSULTATS DE VALIDATION');
        console.log('='.repeat(60));
        
        const percentage = (results.success / results.total * 100).toFixed(1);
        const status = percentage >= 90 ? '🎉' : percentage >= 70 ? '✅' : percentage >= 50 ? '⚠️' : '❌';
        
        console.log(`${status} Score global: ${results.success}/${results.total} (${percentage}%)`);
        
        // Détail par LAB
        const categories = [
            { name: 'LAB 5', data: results.lab5, emoji: '📦' },
            { name: 'LAB 6', data: results.lab6, emoji: '🔄' },
            { name: 'LAB 7', data: results.lab7, emoji: '📡' },
            { name: 'Infrastructure', data: results.infrastructure, emoji: '🏗️' }
        ];

        categories.forEach(category => {
            const success = category.data.filter(r => r.success).length;
            const total = category.data.length;
            const categoryPercentage = total > 0 ? (success / total * 100).toFixed(0) : 0;
            const categoryStatus = success === total ? '🟢' : success > 0 ? '🟡' : '🔴';
            
            console.log(`${categoryStatus} ${category.emoji} ${category.name}: ${success}/${total} (${categoryPercentage}%)`);
        });

        console.log('\n📋 Recommandations:');
        
        if (percentage === 100) {
            console.log('   🏆 Parfait ! Tous les services sont opérationnels.');
            console.log('   🚀 Vous pouvez commencer à utiliser l\'architecture complète.');
        } else if (percentage >= 80) {
            console.log('   ✅ Très bien ! La plupart des services fonctionnent.');
            console.log('   🔧 Vérifiez les services en échec si nécessaire.');
        } else if (percentage >= 60) {
            console.log('   ⚠️  Acceptable, mais certains services ont des problèmes.');
            console.log('   🔧 Redémarrez les services en échec : docker-compose restart [service]');
        } else {
            console.log('   ❌ Plusieurs services ont des problèmes.');
            console.log('   🔧 Vérifiez les logs : docker-compose logs [service]');
            console.log('   🔄 Redémarrage complet recommandé : scripts/stop-all.bat puis start-integration-complete.bat');
        }

        console.log('\n🔗 Accès rapides:');
        console.log('   📊 Grafana: http://localhost:3000 (admin/admin)');
        console.log('   📈 Prometheus: http://localhost:9090');
        console.log('   🐰 RabbitMQ: http://localhost:15672 (guest/guest)');
        console.log('   🌐 Kong Admin: http://localhost:8001');
        
        if (results.success > 0) {
            console.log('\n🧪 Tests disponibles:');
            console.log('   node scripts/tests/test-integration-complete.js');
            console.log('   node test-microservices-workflow.js');
        }
        
        console.log('='.repeat(60));
    }
}

// Exécution
if (require.main === module) {
    const validator = new PostStartupValidator();
    validator.validateAll().then(score => {
        process.exit(score >= 0.8 ? 0 : 1); // Exit code basé sur le score
    });
}

module.exports = PostStartupValidator;
