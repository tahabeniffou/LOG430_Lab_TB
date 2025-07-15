#!/usr/bin/env node

/**
 * Script de test du workflow complet POS
 * Teste les APIs directement et via Kong Gateway
 */

const http = require('http');
const https = require('https');

class ApiTester {
    constructor() {
        this.results = {
            direct: {},
            kong: {},
            errors: []
        };
    }

    async makeRequest(url, options = {}) {
        return new Promise((resolve, reject) => {
            const client = url.startsWith('https') ? https : http;
            const req = client.request(url, options, (res) => {
                let data = '';
                res.on('data', chunk => data += chunk);
                res.on('end', () => {
                    try {
                        const json = JSON.parse(data);
                        resolve({ status: res.statusCode, data: json });
                    } catch {
                        resolve({ status: res.statusCode, data });
                    }
                });
            });
            
            req.on('error', reject);
            req.setTimeout(5000, () => {
                req.destroy();
                reject(new Error('Timeout'));
            });
            
            req.end();
        });
    }

    async testService(name, directUrl, kongUrl = null) {
        console.log(`🧪 Test du service ${name}...`);
        
        // Test direct
        try {
            const directResult = await this.makeRequest(`${directUrl}/health`);
            this.results.direct[name] = {
                health: directResult.status === 200,
                status: directResult.status,
                response: directResult.data
            };
            
            // Test API data
            const apiResult = await this.makeRequest(`${directUrl}/api/${name}s`);
            this.results.direct[name].api = {
                working: apiResult.status === 200,
                status: apiResult.status,
                dataCount: apiResult.data?.count || 0
            };
            
            console.log(`  ✅ Direct: ${directResult.status} (API: ${apiResult.status})`);
        } catch (error) {
            console.log(`  ❌ Direct: ${error.message}`);
            this.results.direct[name] = { error: error.message };
        }

        // Test via Kong (si configuré)
        if (kongUrl) {
            try {
                const kongResult = await this.makeRequest(`${kongUrl}/api/${name}s`);
                this.results.kong[name] = {
                    working: kongResult.status === 200,
                    status: kongResult.status,
                    dataCount: kongResult.data?.count || 0
                };
                console.log(`  ✅ Kong Gateway: ${kongResult.status}`);
            } catch (error) {
                console.log(`  ❌ Kong Gateway: ${error.message}`);
                this.results.kong[name] = { error: error.message };
            }
        }
    }

    async testInfrastructure() {
        console.log('🏗️  Test de l\'infrastructure...');
        
        const services = [
            { name: 'Kong Admin', url: 'http://localhost:8001/status' },
            { name: 'Kong Proxy', url: 'http://localhost:8000' },
            { name: 'Prometheus', url: 'http://localhost:9090/api/v1/targets' },
            { name: 'Grafana', url: 'http://localhost:3005/api/health' }
        ];

        for (const service of services) {
            try {
                const result = await this.makeRequest(service.url);
                console.log(`  ✅ ${service.name}: ${result.status}`);
            } catch (error) {
                console.log(`  ❌ ${service.name}: ${error.message}`);
            }
        }
    }

    async testWorkflow() {
        console.log('🚀 Démarrage des tests du système POS...\n');
        
        // Test infrastructure
        await this.testInfrastructure();
        console.log('');

        // Test microservices (2 instances chacun)
        const services = [
            { name: 'produit', ports: [3001, 3011] },
            { name: 'stock', ports: [3002, 3012] },
            { name: 'vente', ports: [3003, 3013] },
            { name: 'reporting', ports: [3004, 3014] }
        ];

        for (const service of services) {
            for (let i = 0; i < service.ports.length; i++) {
                const instanceName = `${service.name}-${i + 1}`;
                await this.testService(
                    instanceName,
                    `http://localhost:${service.ports[i]}`,
                    i === 0 ? 'http://localhost:8000' : null // Test Kong seulement sur première instance
                );
            }
        }

        // Test Legacy service
        try {
            const legacyResult = await this.makeRequest('http://localhost:3000/health');
            console.log(`🏛️  Legacy Service: ${legacyResult.status}`);
        } catch (error) {
            console.log(`🏛️  Legacy Service: ❌ ${error.message}`);
        }

        this.printSummary();
    }

    printSummary() {
        console.log('\n📊 RÉSUMÉ DES TESTS\n');
        
        console.log('🔗 **SERVICES DIRECTS:**');
        Object.entries(this.results.direct).forEach(([name, result]) => {
            if (result.error) {
                console.log(`  ❌ ${name}: ${result.error}`);
            } else {
                const healthIcon = result.health ? '✅' : '❌';
                const apiIcon = result.api?.working ? '✅' : '❌';
                const dataCount = result.api?.dataCount || 0;
                console.log(`  ${healthIcon} ${name}: Health OK, ${apiIcon} API OK (${dataCount} items)`);
            }
        });

        console.log('\n🌐 **VIA KONG GATEWAY:**');
        Object.entries(this.results.kong).forEach(([name, result]) => {
            if (result.error) {
                console.log(`  ❌ ${name}: ${result.error}`);
            } else {
                const icon = result.working ? '✅' : '❌';
                const dataCount = result.dataCount || 0;
                console.log(`  ${icon} ${name}: ${result.status} (${dataCount} items)`);
            }
        });

        console.log('\n🎯 **WORKFLOW CONSOLE:**');
        console.log('Vos consoles peuvent utiliser:');
        console.log('  📡 Direct: http://localhost:3001,3011/api/produits');
        console.log('  📡 Direct: http://localhost:3002,3012/api/stocks');
        console.log('  📡 Direct: http://localhost:3003,3013/api/ventes');
        console.log('  📡 Direct: http://localhost:3004,3014/api/reportings');
        console.log('  🌐 Kong Gateway: http://localhost:8000/api/[service]s');
        console.log('  🏛️  Legacy: http://localhost:3000');
        console.log('\n✨ Test terminé!');
    }
}

// Exécution des tests
const tester = new ApiTester();
tester.testWorkflow().catch(console.error);
