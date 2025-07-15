#!/usr/bin/env node

/**
 * Script de diagnostic et correction Kong Gateway
 */

const http = require('http');

class KongDiagnostic {
    constructor() {
        this.kongAdmin = 'http://localhost:8001';
        this.kongProxy = 'http://localhost:8000';
    }

    async makeRequest(url, options = {}) {
        return new Promise((resolve, reject) => {
            const req = http.request(url, options, (res) => {
                let data = '';
                res.on('data', chunk => data += chunk);
                res.on('end', () => {
                    try {
                        const json = JSON.parse(data);
                        resolve({ status: res.statusCode, data: json, headers: res.headers });
                    } catch {
                        resolve({ status: res.statusCode, data, headers: res.headers });
                    }
                });
            });
            
            req.on('error', reject);
            req.setTimeout(10000, () => {
                req.destroy();
                reject(new Error('Timeout'));
            });
            
            if (options.body) {
                req.write(options.body);
            }
            req.end();
        });
    }

    async diagnoseKong() {
        console.log('🔍 Diagnostic Kong Gateway...\n');
        
        // 1. Vérifier les services
        console.log('📋 Services configurés:');
        try {
            const services = await this.makeRequest(`${this.kongAdmin}/services`);
            if (services.data.data) {
                services.data.data.forEach(service => {
                    console.log(`  ✅ ${service.name}: ${service.protocol}://${service.host}:${service.port}`);
                });
            }
        } catch (error) {
            console.log(`  ❌ Erreur services: ${error.message}`);
        }

        // 2. Vérifier les routes
        console.log('\n🛣️  Routes configurées:');
        try {
            const routes = await this.makeRequest(`${this.kongAdmin}/routes`);
            if (routes.data.data) {
                routes.data.data.forEach(route => {
                    console.log(`  ✅ ${route.service.id.substring(0,8)}...: ${route.paths}`);
                });
            }
        } catch (error) {
            console.log(`  ❌ Erreur routes: ${error.message}`);
        }

        // 3. Tester connectivité direct aux services
        console.log('\n🔗 Test connectivité directe:');
        const services = [
            { name: 'produit', port: 3001 },
            { name: 'stock', port: 3002 },
            { name: 'vente', port: 3003 },
            { name: 'reporting', port: 3004 }
        ];

        for (const service of services) {
            try {
                const result = await this.makeRequest(`http://localhost:${service.port}/health`);
                console.log(`  ✅ ${service.name}: ${result.status}`);
            } catch (error) {
                console.log(`  ❌ ${service.name}: ${error.message}`);
            }
        }
    }

    async reconfigureKong() {
        console.log('\n🔧 Reconfiguration Kong...\n');
        
        // Supprimer toutes les routes et services existants
        try {
            const routes = await this.makeRequest(`${this.kongAdmin}/routes`);
            if (routes.data.data) {
                for (const route of routes.data.data) {
                    await this.makeRequest(`${this.kongAdmin}/routes/${route.id}`, { method: 'DELETE' });
                    console.log(`🗑️  Route supprimée: ${route.id.substring(0,8)}...`);
                }
            }

            const services = await this.makeRequest(`${this.kongAdmin}/services`);
            if (services.data.data) {
                for (const service of services.data.data) {
                    await this.makeRequest(`${this.kongAdmin}/services/${service.id}`, { method: 'DELETE' });
                    console.log(`🗑️  Service supprimé: ${service.name}`);
                }
            }
        } catch (error) {
            console.log(`⚠️  Erreur nettoyage: ${error.message}`);
        }

        // Recréer les services et routes avec upstreams
        const servicesConfig = [
            { name: 'produit-service', host: 'produit-service-1', port: 3001, path: '/api/produits' },
            { name: 'stock-service', host: 'stock-service-1', port: 3002, path: '/api/stocks' },
            { name: 'vente-service', host: 'vente-service-1', port: 3003, path: '/api/ventes' },
            { name: 'reporting-service', host: 'reporting-service-1', port: 3004, path: '/api/reports' }
        ];

        for (const config of servicesConfig) {
            try {
                // Créer le service
                const serviceBody = JSON.stringify({
                    name: config.name,
                    protocol: 'http',
                    host: config.host,
                    port: config.port
                });

                const serviceResult = await this.makeRequest(`${this.kongAdmin}/services`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: serviceBody
                });

                if (serviceResult.status === 201) {
                    console.log(`✅ Service créé: ${config.name}`);

                    // Créer la route
                    const routeBody = JSON.stringify({
                        paths: [config.path],
                        strip_path: false
                    });

                    const routeResult = await this.makeRequest(`${this.kongAdmin}/services/${config.name}/routes`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: routeBody
                    });

                    if (routeResult.status === 201) {
                        console.log(`✅ Route créée: ${config.path}`);
                    } else {
                        console.log(`❌ Erreur route ${config.path}: ${routeResult.status}`);
                    }
                } else {
                    console.log(`❌ Erreur service ${config.name}: ${serviceResult.status}`);
                }
            } catch (error) {
                console.log(`❌ Erreur ${config.name}: ${error.message}`);
            }
        }
    }

    async testKongRoutes() {
        console.log('\n🧪 Test des routes Kong...\n');
        
        const routes = ['/api/produits', '/api/stocks', '/api/ventes', '/api/reports'];
        
        for (const route of routes) {
            try {
                const result = await this.makeRequest(`${this.kongProxy}${route}`);
                console.log(`  ✅ ${route}: ${result.status}`);
            } catch (error) {
                console.log(`  ❌ ${route}: ${error.message}`);
            }
        }
    }

    async run() {
        await this.diagnoseKong();
        await this.reconfigureKong();
        console.log('\n⏳ Attente stabilisation...');
        await new Promise(resolve => setTimeout(resolve, 3000));
        await this.testKongRoutes();
        console.log('\n✨ Diagnostic terminé!');
    }
}

const diagnostic = new KongDiagnostic();
diagnostic.run().catch(console.error);
