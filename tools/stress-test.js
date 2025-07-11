const http = require('http');
const https = require('https');
const { performance } = require('perf_hooks');

class StressTestRunner {
    constructor() {
        this.isRunning = false;
        this.results = {
            totalRequests: 0,
            successfulRequests: 0,
            failedRequests: 0,
            averageLatency: 0,
            minLatency: Infinity,
            maxLatency: 0,
            errors: [],
            startTime: null,
            endTime: null
        };
        this.latencies = [];
    }

    async makeRequest(url, method = 'GET', data = null) {
        return new Promise((resolve) => {
            const startTime = performance.now();
            const urlObj = new URL(url);
            const isHttps = urlObj.protocol === 'https:';
            const client = isHttps ? https : http;

            const options = {
                hostname: urlObj.hostname,
                port: urlObj.port || (isHttps ? 443 : 80),
                path: urlObj.pathname + urlObj.search,
                method: method,
                headers: {
                    'Content-Type': 'application/json',
                    'User-Agent': 'StressTest/1.0'
                },
                timeout: 10000
            };

            if (data && method !== 'GET') {
                const postData = JSON.stringify(data);
                options.headers['Content-Length'] = Buffer.byteLength(postData);
            }

            const req = client.request(options, (res) => {
                let responseData = '';
                
                res.on('data', (chunk) => {
                    responseData += chunk;
                });

                res.on('end', () => {
                    const endTime = performance.now();
                    const latency = endTime - startTime;
                    
                    resolve({
                        success: res.statusCode >= 200 && res.statusCode < 400,
                        statusCode: res.statusCode,
                        latency: latency,
                        size: responseData.length,
                        error: null
                    });
                });
            });

            req.on('error', (error) => {
                const endTime = performance.now();
                const latency = endTime - startTime;
                
                resolve({
                    success: false,
                    statusCode: 0,
                    latency: latency,
                    size: 0,
                    error: error.message
                });
            });

            req.on('timeout', () => {
                req.destroy();
                const endTime = performance.now();
                const latency = endTime - startTime;
                
                resolve({
                    success: false,
                    statusCode: 0,
                    latency: latency,
                    size: 0,
                    error: 'Timeout'
                });
            });

            if (data && method !== 'GET') {
                req.write(JSON.stringify(data));
            }

            req.end();
        });
    }

    async runStressTest(config) {
        console.log('🚀 DÉMARRAGE DU STRESS TEST');
        console.log('============================');
        console.log(`🎯 Target: ${config.baseUrl}`);
        console.log(`⚡ RPS: ${config.rps}`);
        console.log(`⏱️  Durée: ${config.duration}s`);
        console.log(`🔗 Endpoints: ${config.endpoints.length}`);
        console.log('');

        this.isRunning = true;
        this.results.startTime = Date.now();
        
        const interval = 1000 / config.rps; // Intervalle entre les requêtes en ms
        const totalDuration = config.duration * 1000;
        const endTime = Date.now() + totalDuration;

        const requestPromises = [];

        while (Date.now() < endTime && this.isRunning) {
            const endpoint = config.endpoints[Math.floor(Math.random() * config.endpoints.length)];
            const url = `${config.baseUrl}${endpoint.path}`;
            
            const requestPromise = this.makeRequest(url, endpoint.method, endpoint.data)
                .then(result => this.processResult(result));
            
            requestPromises.push(requestPromise);

            // Attendre avant la prochaine requête
            await new Promise(resolve => setTimeout(resolve, interval));
        }

        // Attendre que toutes les requêtes se terminent
        await Promise.all(requestPromises);

        this.results.endTime = Date.now();
        this.calculateFinalStats();
        this.printResults();
    }

    processResult(result) {
        this.results.totalRequests++;
        
        if (result.success) {
            this.results.successfulRequests++;
        } else {
            this.results.failedRequests++;
            this.results.errors.push(result.error || `HTTP ${result.statusCode}`);
        }

        this.latencies.push(result.latency);
        this.results.minLatency = Math.min(this.results.minLatency, result.latency);
        this.results.maxLatency = Math.max(this.results.maxLatency, result.latency);

        // Affichage en temps réel
        if (this.results.totalRequests % 10 === 0) {
            const currentAvg = this.latencies.reduce((a, b) => a + b, 0) / this.latencies.length;
            process.stdout.write(`\r📊 Requêtes: ${this.results.totalRequests} | Succès: ${this.results.successfulRequests} | Échecs: ${this.results.failedRequests} | Latence moy: ${Math.round(currentAvg)}ms`);
        }
    }

    calculateFinalStats() {
        if (this.latencies.length > 0) {
            this.results.averageLatency = this.latencies.reduce((a, b) => a + b, 0) / this.latencies.length;
        }
        
        // Calculer les percentiles
        const sortedLatencies = this.latencies.sort((a, b) => a - b);
        const len = sortedLatencies.length;
        
        this.results.p50 = len > 0 ? sortedLatencies[Math.floor(len * 0.5)] : 0;
        this.results.p95 = len > 0 ? sortedLatencies[Math.floor(len * 0.95)] : 0;
        this.results.p99 = len > 0 ? sortedLatencies[Math.floor(len * 0.99)] : 0;
    }

    printResults() {
        console.log('\n\n');
        console.log('📊 RÉSULTATS DU STRESS TEST');
        console.log('===========================');
        
        const duration = (this.results.endTime - this.results.startTime) / 1000;
        const actualRps = this.results.totalRequests / duration;
        const successRate = (this.results.successfulRequests / this.results.totalRequests * 100).toFixed(2);
        const errorRate = (this.results.failedRequests / this.results.totalRequests * 100).toFixed(2);

        console.log(`⏱️  Durée réelle: ${duration.toFixed(2)}s`);
        console.log(`📈 RPS réel: ${actualRps.toFixed(2)}`);
        console.log(`✅ Taux de succès: ${successRate}%`);
        console.log(`❌ Taux d'erreur: ${errorRate}%`);
        console.log('');
        console.log('📊 STATISTIQUES DE LATENCE:');
        console.log(`   Moyenne: ${Math.round(this.results.averageLatency)}ms`);
        console.log(`   Minimum: ${Math.round(this.results.minLatency)}ms`);
        console.log(`   Maximum: ${Math.round(this.results.maxLatency)}ms`);
        console.log(`   P50: ${Math.round(this.results.p50)}ms`);
        console.log(`   P95: ${Math.round(this.results.p95)}ms`);
        console.log(`   P99: ${Math.round(this.results.p99)}ms`);
        
        if (this.results.errors.length > 0) {
            console.log('\n❌ ERREURS RENCONTRÉES:');
            const errorCounts = {};
            this.results.errors.forEach(error => {
                errorCounts[error] = (errorCounts[error] || 0) + 1;
            });
            Object.entries(errorCounts).forEach(([error, count]) => {
                console.log(`   ${error}: ${count} fois`);
            });
        }

        console.log('\n🎯 RECOMMANDATIONS:');
        if (errorRate > 5) {
            console.log('   ⚠️  Taux d\'erreur élevé - Vérifier la stabilité du système');
        }
        if (this.results.averageLatency > 1000) {
            console.log('   ⚠️  Latence élevée - Optimisation recommandée');
        }
        if (successRate > 95 && this.results.averageLatency < 500) {
            console.log('   ✅ Performance excellente!');
        }
    }

    stop() {
        this.isRunning = false;
        console.log('\n⏹️  Arrêt du stress test demandé...');
    }
}

// Configuration des tests prédéfinis
const testConfigs = {
    light: {
        baseUrl: 'http://localhost:3000',
        rps: 5,
        duration: 30,
        endpoints: [
            { path: '/api/health', method: 'GET' },
            { path: '/api/products', method: 'GET' },
            { path: '/api/sales', method: 'GET' }
        ]
    },
    medium: {
        baseUrl: 'http://localhost:3000',
        rps: 25,
        duration: 60,
        endpoints: [
            { path: '/api/health', method: 'GET' },
            { path: '/api/products', method: 'GET' },
            { path: '/api/products/1', method: 'GET' },
            { path: '/api/sales', method: 'GET' },
            { path: '/api/stock', method: 'GET' },
            { path: '/api/reporting/stats', method: 'GET' }
        ]
    },
    heavy: {
        baseUrl: 'http://localhost:3000',
        rps: 100,
        duration: 120,
        endpoints: [
            { path: '/api/health', method: 'GET' },
            { path: '/api/products', method: 'GET' },
            { path: '/api/products/1', method: 'GET' },
            { path: '/api/sales', method: 'GET' },
            { path: '/api/sales', method: 'POST', data: { productId: 1, quantity: 1, price: 29.99 } },
            { path: '/api/stock', method: 'GET' },
            { path: '/api/stock/1', method: 'GET' },
            { path: '/api/reporting/stats', method: 'GET' }
        ]
    },
    extreme: {
        baseUrl: 'http://localhost:3000',
        rps: 500,
        duration: 60,
        endpoints: [
            { path: '/api/health', method: 'GET' },
            { path: '/api/products', method: 'GET' },
            { path: '/api/products/1', method: 'GET' },
            { path: '/api/products/2', method: 'GET' },
            { path: '/api/sales', method: 'GET' },
            { path: '/api/sales', method: 'POST', data: { productId: 1, quantity: 1, price: 29.99 } },
            { path: '/api/stock', method: 'GET' },
            { path: '/api/stock/1', method: 'GET' },
            { path: '/api/stock/2', method: 'GET' },
            { path: '/api/reporting/stats', method: 'GET' },
            { path: '/api/reporting/sales', method: 'GET' }
        ]
    }
};

// Interface CLI
async function main() {
    const args = process.argv.slice(2);
    const testLevel = args[0] || 'medium';
    
    if (!testConfigs[testLevel]) {
        console.log('❌ Niveau de test invalide!');
        console.log('Usage: node stress-test.js [light|medium|heavy|extreme]');
        console.log('');
        console.log('Niveaux disponibles:');
        Object.entries(testConfigs).forEach(([level, config]) => {
            console.log(`  ${level}: ${config.rps} RPS pendant ${config.duration}s`);
        });
        process.exit(1);
    }

    const stressTest = new StressTestRunner();
    
    // Gestion de l'arrêt propre
    process.on('SIGINT', () => {
        stressTest.stop();
    });

    try {
        await stressTest.runStressTest(testConfigs[testLevel]);
    } catch (error) {
        console.error('❌ Erreur lors du stress test:', error.message);
        process.exit(1);
    }
}

if (require.main === module) {
    main();
}

module.exports = { StressTestRunner, testConfigs };
