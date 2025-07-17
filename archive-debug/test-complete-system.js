const http = require('http');
const fs = require('fs');

// Configuration des services
const services = [
    { name: 'Kong Admin', url: 'http://localhost:8001/' },
    { name: 'Kong Proxy', url: 'http://localhost:8000/' },
    { name: 'Produit Service 1', url: 'http://localhost:3001/health' },
    { name: 'Produit Service 2', url: 'http://localhost:3001/health' },
    { name: 'Stock Service', url: 'http://localhost:3002/health' },
    { name: 'Vente Service', url: 'http://localhost:3003/health' },
    { name: 'Prometheus', url: 'http://localhost:9090/' },
    { name: 'Grafana', url: 'http://localhost:3005/' }
];

// Configuration Kong
const kongConfig = {
    services: [
        {
            name: "produit-service",
            url: "http://produit-service-1:3001",
            routes: [{ name: "produit-route", paths: ["/api/produits"] }]
        },
        {
            name: "stock-service", 
            url: "http://stock-service-1:3002",
            routes: [{ name: "stock-route", paths: ["/api/stocks"] }]
        },
        {
            name: "vente-service",
            url: "http://vente-service-1:3003", 
            routes: [{ name: "vente-route", paths: ["/api/ventes"] }]
        }
    ]
};

function makeRequest(url, options = {}) {
    return new Promise((resolve, reject) => {
        const req = http.request(url, options, (res) => {
            let data = '';
            res.on('data', (chunk) => data += chunk);
            res.on('end', () => resolve({ status: res.statusCode, data }));
        });
        req.on('error', reject);
        if (options.body) req.write(JSON.stringify(options.body));
        req.end();
    });
}

async function testServices() {
    console.log('🔍 Test des services de base...\n');
    
    for (const service of services) {
        try {
            const response = await makeRequest(service.url);
            console.log(`✅ ${service.name}: ${response.status === 200 ? 'OK' : 'ERREUR ' + response.status}`);
        } catch (error) {
            console.log(`❌ ${service.name}: ${error.message}`);
        }
    }
}

async function configureKong() {
    console.log('\n🔧 Configuration Kong Gateway...\n');
    
    // Supprimer les services existants
    console.log('🧹 Nettoyage des services existants...');
    for (const serviceConfig of kongConfig.services) {
        try {
            await makeRequest(`http://localhost:8001/services/${serviceConfig.name}`, { method: 'DELETE' });
            console.log(`   🗑️  Service ${serviceConfig.name} supprimé`);
        } catch (error) {
            // Service n'existe pas
        }
    }
    
    // Créer les services
    console.log('\n📝 Création des services...');
    for (const serviceConfig of kongConfig.services) {
        try {
            const response = await makeRequest('http://localhost:8001/services', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: {
                    name: serviceConfig.name,
                    url: serviceConfig.url
                }
            });
            
            if (response.status === 201) {
                console.log(`   ✅ Service ${serviceConfig.name} créé`);
                
                // Créer les routes pour ce service
                for (const route of serviceConfig.routes) {
                    try {
                        const routeResponse = await makeRequest(`http://localhost:8001/services/${serviceConfig.name}/routes`, {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: {
                                name: route.name,
                                paths: route.paths
                            }
                        });
                        
                        if (routeResponse.status === 201) {
                            console.log(`   📍 Route ${route.name} créée pour ${route.paths.join(', ')}`);
                        }
                    } catch (routeError) {
                        console.log(`   ❌ Erreur route ${route.name}: ${routeError.message}`);
                    }
                }
            }
        } catch (error) {
            console.log(`   ❌ Erreur service ${serviceConfig.name}: ${error.message}`);
        }
    }
}

async function testKongRoutes() {
    console.log('\n🧪 Test des routes Kong...\n');
    
    const tests = [
        { name: 'Produits via Kong', url: 'http://localhost:8000/api/produits' },
        { name: 'Stocks via Kong', url: 'http://localhost:8000/api/stocks' },
        { name: 'Ventes via Kong', url: 'http://localhost:8000/api/ventes' }
    ];
    
    for (const test of tests) {
        try {
            const response = await makeRequest(test.url);
            console.log(`✅ ${test.name}: ${response.status === 200 ? 'OK' : 'ERREUR ' + response.status}`);
            if (response.status === 200) {
                const data = JSON.parse(response.data);
                console.log(`   📊 Données: ${JSON.stringify(data).substring(0, 100)}...`);
            }
        } catch (error) {
            console.log(`❌ ${test.name}: ${error.message}`);
        }
    }
}

async function generateReport() {
    console.log('\n📋 Génération du rapport système...\n');
    
    const report = {
        timestamp: new Date().toISOString(),
        services: [],
        kong: { configured: false, routes: [] },
        summary: { total: 0, healthy: 0, errors: 0 }
    };
    
    // Test des services
    for (const service of services) {
        try {
            const response = await makeRequest(service.url);
            const status = response.status === 200 ? 'healthy' : 'error';
            report.services.push({ name: service.name, status, url: service.url });
            report.summary.total++;
            if (status === 'healthy') report.summary.healthy++;
            else report.summary.errors++;
        } catch (error) {
            report.services.push({ name: service.name, status: 'error', error: error.message });
            report.summary.total++;
            report.summary.errors++;
        }
    }
    
    // Test Kong
    try {
        const kongResponse = await makeRequest('http://localhost:8001/services');
        if (kongResponse.status === 200) {
            report.kong.configured = true;
            const services = JSON.parse(kongResponse.data);
            report.kong.routes = services.data || [];
        }
    } catch (error) {
        report.kong.error = error.message;
    }
    
    // Sauvegarder le rapport
    fs.writeFileSync('system-status-report.json', JSON.stringify(report, null, 2));
    
    console.log(`📊 Statut système: ${report.summary.healthy}/${report.summary.total} services opérationnels`);
    console.log(`🔧 Kong Gateway: ${report.kong.configured ? 'Configuré' : 'Non configuré'}`);
    console.log(`📄 Rapport sauvegardé: system-status-report.json`);
    
    return report;
}

async function main() {
    console.log('🚀 Test complet du système POS\n');
    console.log('========================================\n');
    
    await testServices();
    await configureKong();
    await testKongRoutes();
    const report = await generateReport();
    
    console.log('\n========================================');
    console.log('✅ Test système terminé !');
    
    if (report.summary.errors === 0) {
        console.log('🎉 Tous les services sont opérationnels !');
        console.log('🔗 URLs principales:');
        console.log('   📡 Kong Proxy: http://localhost:8000');
        console.log('   ⚙️  Kong Admin: http://localhost:8001');
        console.log('   📊 Prometheus: http://localhost:9090');
        console.log('   📈 Grafana: http://localhost:3005');
    } else {
        console.log(`⚠️  ${report.summary.errors} erreur(s) détectée(s)`);
    }
}

if (require.main === module) {
    main().catch(console.error);
}
