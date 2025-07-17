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

    async testService(name, directUrl, apiEndpoint) {
        console.log(`  🧪 Test ${name}...`);
        
        // Test direct health
        try {
            const directResult = await this.makeRequest(`${directUrl}/health`);
            const healthData = directResult.data;
            
            this.results.direct[name] = {
                health: directResult.status === 200,
                status: directResult.status,
                response: healthData,
                instanceId: healthData.instanceId,
                instanceName: healthData.instanceName
            };
            
            console.log(`    ✅ Health: ${directResult.status} - ${healthData.instanceName || name}`);
            
            // Test API si l'endpoint est fourni
            if (apiEndpoint) {
                const apiResult = await this.makeRequest(`${directUrl}/api/${apiEndpoint}`);
                this.results.direct[name].api = {
                    working: apiResult.status === 200,
                    status: apiResult.status,
                    dataCount: apiResult.data?.count || (Array.isArray(apiResult.data?.data) ? apiResult.data.data.length : 0)
                };
                console.log(`    ✅ API: ${apiResult.status} (${this.results.direct[name].api.dataCount} items)`);
            }
            
        } catch (error) {
            console.log(`    ❌ Error: ${error.message}`);
            this.results.direct[name] = { error: error.message };
        }
    }

    async testLoadBalancing(serviceName, apiEndpoint) {
        console.log(`  ⚖️  Load Balancing Test for ${serviceName}:`);
        
        const instances = new Set();
        const totalRequests = 6;
        
        for (let i = 1; i <= totalRequests; i++) {
            try {
                const response = await this.makeRequest(`http://localhost:8000/api/${apiEndpoint}`, {
                    headers: { 'Accept': 'application/json' }
                });
                
                // Essayer de récupérer l'instance ID depuis les headers de réponse
                if (response.headers && response.headers['x-instance-id']) {
                    instances.add(response.headers['x-instance-id']);
                }
                
                console.log(`    Request ${i}/6: Status ${response.status}`);
            } catch (error) {
                console.log(`    Request ${i}/6: ❌ ${error.message}`);
            }
        }
        
        if (instances.size > 1) {
            console.log(`    ✅ Load balancing working: ${instances.size} different instances detected`);
        } else if (instances.size === 1) {
            console.log(`    ⚠️  Only 1 instance responding (load balancing may not be working)`);
        } else {
            console.log(`    ❌ No instance IDs detected in responses`);
        }
    }

    async testInfrastructure() {
        console.log('🏗️  Test de l\'infrastructure...');
        
        const services = [
            { name: 'Kong Admin', url: 'http://localhost:8001/status' },
            { name: 'Kong Proxy', url: 'http://localhost:8000' },
            { name: 'Prometheus', url: 'http://localhost:9090/api/v1/targets' },
            { name: 'Grafana', url: 'http://localhost:3008/api/health' }
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
            { name: 'produit', ports: [3001, 3011], api: 'produits' },
            { name: 'stock', ports: [3002, 3012], api: 'stocks' },
            { name: 'vente', ports: [3003, 3013], api: 'ventes' },
            { name: 'reporting', ports: [3004, 3014], api: 'reports' },
            { name: 'compte', ports: [3005, 3015], api: 'comptes' },
            { name: 'panier', ports: [3006, 3016], api: 'paniers' },
            { name: 'checkout', ports: [3007, 3017], api: 'checkout' }
        ];

        console.log('🔄 **TEST LOAD BALANCING & MICROSERVICES**');
        for (const service of services) {
            console.log(`\n📦 Service ${service.name.toUpperCase()}:`);
            
            for (let i = 0; i < service.ports.length; i++) {
                const instanceName = `${service.name}-instance-${i + 1}`;
                await this.testService(
                    instanceName,
                    `http://localhost:${service.ports[i]}`,
                    service.api
                );
            }
            
            // Test load balancing via Kong pour chaque service
            await this.testLoadBalancing(service.name, service.api);
        }

        // Test API Gateway complet
        console.log('\n🌐 **TEST API GATEWAY KONG**');
        await this.testKongGateway();

        // Test Legacy service
        console.log('\n🏛️  **TEST LEGACY SERVICE**');
        try {
            const legacyResult = await this.makeRequest('http://localhost:3000/health');
            console.log(`  ✅ Legacy Service: ${legacyResult.status}`);
        } catch (error) {
            console.log(`  ❌ Legacy Service: ${error.message}`);
        }

        this.printSummary();
    }

    async testKongGateway() {
        const apis = [
            { name: 'Produits', endpoint: '/api/produits' },
            { name: 'Stocks', endpoint: '/api/stocks' },
            { name: 'Ventes', endpoint: '/api/ventes' },
            { name: 'Reports', endpoint: '/api/reports' },
            { name: 'Comptes', endpoint: '/api/comptes' },
            { name: 'Paniers', endpoint: '/api/paniers' },
            { name: 'Checkout', endpoint: '/api/checkout' }
        ];

        console.log('  🔗 Testing all APIs via Kong Gateway:');
        
        for (const api of apis) {
            try {
                const result = await this.makeRequest(`http://localhost:8000${api.endpoint}`);
                const dataCount = result.data?.count || (Array.isArray(result.data?.data) ? result.data.data.length : 0);
                
                this.results.kong[api.name.toLowerCase()] = {
                    working: result.status === 200,
                    status: result.status,
                    dataCount: dataCount
                };
                
                console.log(`    ✅ ${api.name}: ${result.status} (${dataCount} items)`);
            } catch (error) {
                console.log(`    ❌ ${api.name}: ${error.message}`);
                this.results.kong[api.name.toLowerCase()] = { error: error.message };
            }
        }
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
        console.log('  📡 Direct: http://localhost:3004,3014/api/reports');
        console.log('  📡 Direct: http://localhost:3005,3015/api/comptes');
        console.log('  📡 Direct: http://localhost:3006,3016/api/paniers');
        console.log('  📡 Direct: http://localhost:3007,3017/api/checkout');
        console.log('  🌐 Kong Gateway: http://localhost:8000/api/[service]s');
        console.log('  🏛️  Legacy: http://localhost:3000');
        console.log('\n✨ Test terminé!');
    }
}

// Exécution des tests
const tester = new ApiTester();
tester.testWorkflow().catch(console.error);
