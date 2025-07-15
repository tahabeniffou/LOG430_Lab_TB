const axios = require('axios');

class LoadTestRunner {
    constructor(baseUrl = 'http://localhost:8010') {
        this.baseUrl = baseUrl;
        this.stats = {
            totalRequests: 0,
            successfulRequests: 0,
            failedRequests: 0,
            totalDuration: 0,
            minDuration: Infinity,
            maxDuration: 0,
            durations: []
        };
    }

    generateTestData(index) {
        const scenarios = [
            {
                articleId: `STRESS_ARTICLE_${index.toString().padStart(4, '0')}`,
                quantity: Math.floor(Math.random() * 10) + 1,
                compteId: `STRESS_COMPTE_${index.toString().padStart(4, '0')}`,
                totalAmount: parseFloat((Math.random() * 1000 + 50).toFixed(2))
            },
            {
                articleId: `LOAD_PRODUCT_${index.toString().padStart(4, '0')}`,
                quantity: Math.floor(Math.random() * 5) + 1,
                compteId: `LOAD_ACCOUNT_${index.toString().padStart(4, '0')}`,
                totalAmount: parseFloat((Math.random() * 500 + 25).toFixed(2))
            },
            {
                articleId: `BULK_ITEM_${index.toString().padStart(4, '0')}`,
                quantity: Math.floor(Math.random() * 20) + 1,
                compteId: `BULK_CLIENT_${index.toString().padStart(4, '0')}`,
                totalAmount: parseFloat((Math.random() * 2000 + 100).toFixed(2))
            }
        ];
        
        return scenarios[index % scenarios.length];
    }

    async executeSaga(testData) {
        const startTime = Date.now();
        
        try {
            const response = await axios.post(`${this.baseUrl}/saga/start`, testData, {
                timeout: 10000,
                headers: { 'Content-Type': 'application/json' }
            });
            
            const endTime = Date.now();
            const duration = endTime - startTime;
            
            this.stats.totalRequests++;
            this.stats.totalDuration += duration;
            this.stats.durations.push(duration);
            this.stats.minDuration = Math.min(this.stats.minDuration, duration);
            this.stats.maxDuration = Math.max(this.stats.maxDuration, duration);
            
            if (response.data.success) {
                this.stats.successfulRequests++;
                return { success: true, duration, sagaId: response.data.sagaId };
            } else {
                this.stats.failedRequests++;
                return { success: false, duration, error: response.data.error };
            }
            
        } catch (error) {
            const endTime = Date.now();
            const duration = endTime - startTime;
            
            this.stats.totalRequests++;
            this.stats.failedRequests++;
            this.stats.totalDuration += duration;
            this.stats.durations.push(duration);
            
            return { success: false, duration, error: error.message };
        }
    }

    calculatePercentile(arr, percentile) {
        const sorted = arr.slice().sort((a, b) => a - b);
        const index = Math.ceil((percentile / 100) * sorted.length) - 1;
        return sorted[index];
    }

    getStats() {
        const avgDuration = this.stats.totalRequests > 0 ? 
            this.stats.totalDuration / this.stats.totalRequests : 0;
        
        const successRate = this.stats.totalRequests > 0 ? 
            (this.stats.successfulRequests / this.stats.totalRequests * 100) : 0;

        return {
            totalRequests: this.stats.totalRequests,
            successfulRequests: this.stats.successfulRequests,
            failedRequests: this.stats.failedRequests,
            successRate: successRate.toFixed(2) + '%',
            avgDuration: avgDuration.toFixed(2) + 'ms',
            minDuration: this.stats.minDuration === Infinity ? 0 : this.stats.minDuration + 'ms',
            maxDuration: this.stats.maxDuration + 'ms',
            p50: this.calculatePercentile(this.stats.durations, 50) + 'ms',
            p95: this.calculatePercentile(this.stats.durations, 95) + 'ms',
            p99: this.calculatePercentile(this.stats.durations, 99) + 'ms'
        };
    }

    async warmupTest() {
        console.log('🔥 Phase de réchauffement...');
        
        for (let i = 0; i < 5; i++) {
            const testData = this.generateTestData(i);
            await this.executeSaga(testData);
            console.log(`   Warmup ${i + 1}/5 terminé`);
        }
        
        // Reset stats après warmup
        this.stats = {
            totalRequests: 0,
            successfulRequests: 0,
            failedRequests: 0,
            totalDuration: 0,
            minDuration: Infinity,
            maxDuration: 0,
            durations: []
        };
        
        console.log('✅ Réchauffement terminé\n');
    }

    async lightLoadTest() {
        console.log('🟢 Test de charge léger (20 requêtes concurrentes)...');
        
        const promises = [];
        for (let i = 0; i < 20; i++) {
            const testData = this.generateTestData(i);
            promises.push(this.executeSaga(testData));
        }
        
        await Promise.all(promises);
        console.log('✅ Test léger terminé');
        console.log('📊 Statistiques:', this.getStats());
        console.log('');
    }

    async mediumLoadTest() {
        console.log('🟡 Test de charge moyen (50 requêtes en batches)...');
        
        const batchSize = 10;
        const totalRequests = 50;
        
        for (let batch = 0; batch < totalRequests / batchSize; batch++) {
            const promises = [];
            
            for (let i = 0; i < batchSize; i++) {
                const testData = this.generateTestData(batch * batchSize + i);
                promises.push(this.executeSaga(testData));
            }
            
            await Promise.all(promises);
            console.log(`   Batch ${batch + 1}/${totalRequests / batchSize} terminé`);
            
            // Petite pause entre les batches
            await new Promise(resolve => setTimeout(resolve, 1000));
        }
        
        console.log('✅ Test moyen terminé');
        console.log('📊 Statistiques:', this.getStats());
        console.log('');
    }

    async heavyLoadTest() {
        console.log('🔴 Test de charge intense (100 requêtes en rafales)...');
        
        const batchSize = 15;
        const totalRequests = 100;
        
        for (let batch = 0; batch < totalRequests / batchSize; batch++) {
            const promises = [];
            
            for (let i = 0; i < batchSize; i++) {
                const testData = this.generateTestData(batch * batchSize + i);
                promises.push(this.executeSaga(testData));
            }
            
            const batchStart = Date.now();
            await Promise.all(promises);
            const batchDuration = Date.now() - batchStart;
            
            console.log(`   Batch ${batch + 1}/${Math.ceil(totalRequests / batchSize)} terminé en ${batchDuration}ms`);
            
            // Pause très courte
            await new Promise(resolve => setTimeout(resolve, 500));
        }
        
        console.log('✅ Test intense terminé');
        console.log('📊 Statistiques:', this.getStats());
        console.log('');
    }

    async stressTest() {
        console.log('🚨 Test de stress (200 requêtes simultanées)...');
        
        const promises = [];
        const totalRequests = 200;
        
        for (let i = 0; i < totalRequests; i++) {
            const testData = this.generateTestData(i);
            promises.push(this.executeSaga(testData));
        }
        
        const testStart = Date.now();
        await Promise.all(promises);
        const testDuration = Date.now() - testStart;
        
        console.log(`✅ Test de stress terminé en ${testDuration}ms`);
        console.log('📊 Statistiques finales:', this.getStats());
        console.log(`⚡ Throughput: ${(totalRequests / testDuration * 1000).toFixed(2)} req/sec`);
        console.log('');
    }

    async runCompleteLoadTest() {
        console.log('🚀 ================================================');
        console.log('  TEST DE CHARGE COMPLET - SAGA ORCHESTRATOR');
        console.log('🚀 ================================================\n');
        
        const startTime = Date.now();
        
        try {
            await this.warmupTest();
            await this.lightLoadTest();
            await this.mediumLoadTest();
            await this.heavyLoadTest();
            await this.stressTest();
            
            const totalTestTime = Date.now() - startTime;
            
            console.log('🎉 ================================================');
            console.log('  TESTS TERMINÉS AVEC SUCCÈS');
            console.log('🎉 ================================================');
            console.log(`⏱️  Durée totale: ${totalTestTime}ms`);
            console.log('📊 Statistiques globales:', this.getStats());
            console.log('');
            console.log('🔗 Dashboard Grafana: http://localhost:3000');
            console.log('📊 Métriques Prometheus: http://localhost:9090');
            console.log('🌐 Interface Saga: http://localhost:8010');
            
        } catch (error) {
            console.error('❌ Erreur pendant les tests:', error.message);
        }
    }
}

// Exécuter les tests si ce script est lancé directement
if (require.main === module) {
    const runner = new LoadTestRunner();
    
    // Vérifier si le serveur est accessible
    axios.get('http://localhost:8010/health')
        .then(() => {
            console.log('✅ Serveur Saga accessible, démarrage des tests...\n');
            return runner.runCompleteLoadTest();
        })
        .catch((error) => {
            console.error('❌ Impossible de se connecter au serveur Saga Orchestrator');
            console.error('   Assurez-vous que le serveur est démarré sur le port 8010');
            console.error('   Commande: node saga-orchestrator-prometheus.js');
        });
}

module.exports = LoadTestRunner;
