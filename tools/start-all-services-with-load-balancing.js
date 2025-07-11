#!/usr/bin/env node

const { spawn } = require('child_process');
const path = require('path');
const axios = require('axios');

// Configuration des services avec load balancing (3 instances par microservice)
const services = [
  // Instances du service Produit
  {
    name: 'produit-service-1',
    path: './microservices/produit-service',
    port: 3001,
    url: 'http://localhost:3001'
  },
  {
    name: 'produit-service-2',
    path: './microservices/produit-service',
    port: 3011,
    url: 'http://localhost:3011'
  },
  {
    name: 'produit-service-3',
    path: './microservices/produit-service',
    port: 3021,
    url: 'http://localhost:3021'
  },
  
  // Instances du service Stock
  {
    name: 'stock-service-1',
    path: './microservices/stock-service',
    port: 3002,
    url: 'http://localhost:3002'
  },
  {
    name: 'stock-service-2',
    path: './microservices/stock-service',
    port: 3012,
    url: 'http://localhost:3012'
  },
  {
    name: 'stock-service-3',
    path: './microservices/stock-service',
    port: 3022,
    url: 'http://localhost:3022'
  },
  
  // Instances du service Vente
  {
    name: 'vente-service-1',
    path: './microservices/vente-service',
    port: 3003,
    url: 'http://localhost:3003'
  },
  {
    name: 'vente-service-2',
    path: './microservices/vente-service',
    port: 3013,
    url: 'http://localhost:3013'
  },
  {
    name: 'vente-service-3',
    path: './microservices/vente-service',
    port: 3023,
    url: 'http://localhost:3023'
  },
  
  // Instances du service Reporting
  {
    name: 'reporting-service-1',
    path: './microservices/reporting-service',
    port: 3004,
    url: 'http://localhost:3004'
  },
  {
    name: 'reporting-service-2',
    path: './microservices/reporting-service',
    port: 3014,
    url: 'http://localhost:3014'
  },
  {
    name: 'reporting-service-3',
    path: './microservices/reporting-service',
    port: 3024,
    url: 'http://localhost:3024'
  },
  
  // API Gateway avec Load Balancing
  {
    name: 'api-gateway',
    path: './infrastructure',
    port: 3000,
    url: 'http://localhost:3000',
    script: 'hybrid-router.js'
  }
];

const processes = [];

// Fonction pour démarrer un service
function startService(service) {
  console.log(`🚀 Démarrage de ${service.name} sur le port ${service.port}...`);
  
  const script = service.script || 'server.js';
  const childProcess = spawn('node', [script], {
    cwd: path.resolve(service.path),
    stdio: 'pipe',
    env: { ...process.env, PORT: service.port }
  });

  childProcess.stdout.on('data', (data) => {
    console.log(`[${service.name}] ${data.toString().trim()}`);
  });

  childProcess.stderr.on('data', (data) => {
    console.error(`[${service.name}] ERROR: ${data.toString().trim()}`);
  });

  childProcess.on('close', (code) => {
    console.log(`[${service.name}] Service fermé avec le code ${code}`);
  });

  processes.push({ name: service.name, process: childProcess, service });
  return childProcess;
}

// Fonction pour vérifier la santé des services
async function checkHealth() {
  console.log('\n🏥 Vérification de la santé des services...');
  
  const servicesByType = {
    'produit': [],
    'stock': [],
    'vente': [],
    'reporting': [],
    'gateway': []
  };
  
  // Regrouper par type de service
  for (const service of services) {
    const type = service.name.includes('produit') ? 'produit' :
                 service.name.includes('stock') ? 'stock' :
                 service.name.includes('vente') ? 'vente' :
                 service.name.includes('reporting') ? 'reporting' : 'gateway';
    servicesByType[type].push(service);
  }
  
  for (const [type, typeServices] of Object.entries(servicesByType)) {
    if (typeServices.length === 0) continue;
    
    console.log(`\n📊 ${type.toUpperCase()} Services:`);
    for (const service of typeServices) {
      try {
        const response = await axios.get(`${service.url}/health`, { timeout: 3000 });
        console.log(`  ✅ ${service.name}: ${response.status} - ${response.data?.status || 'OK'}`);
      } catch (error) {
        console.log(`  ❌ ${service.name}: INACCESSIBLE (${error.message})`);
      }
    }
  }
}

// Fonction pour tester le load balancing
async function testLoadBalancing() {
  console.log('\n⚖️  Test du Load Balancing...');
  
  try {
    // Test statut du load balancer
    const lbStatus = await axios.get('http://localhost:3000/load-balancer/status', { timeout: 3000 });
    console.log('📊 Statut Load Balancer: OK');
    
    // Test de distribution des requêtes
    console.log('\n🔄 Test de distribution des requêtes...');
    
    for (let i = 0; i < 6; i++) {
      try {
        const response = await axios.get('http://localhost:3000/api/v2/produits', { timeout: 3000 });
        console.log(`  Requête ${i + 1}: ✅ Réussie`);
      } catch (error) {
        console.log(`  Requête ${i + 1}: ❌ Échouée (${error.message})`);
      }
      
      // Pause entre les requêtes
      await new Promise(resolve => setTimeout(resolve, 500));
    }
  } catch (error) {
    console.log(`❌ Test load balancing échoué: ${error.message}`);
  }
}

// Fonction pour afficher les métriques
async function showMetrics() {
  console.log('\n📊 Métriques du Load Balancing...');
  
  try {
    const response = await axios.get('http://localhost:3000/metrics', { timeout: 3000 });
    const lines = response.data.split('\n');
    
    // Chercher les métriques de load balancing
    const lbMetrics = lines.filter(line => 
      line.includes('load_balancer_requests_total') && 
      !line.startsWith('#')
    );
    
    if (lbMetrics.length > 0) {
      console.log('⚖️  Répartition des requêtes:');
      lbMetrics.forEach(metric => {
        console.log(`   ${metric}`);
      });
    } else {
      console.log('📈 Métriques de load balancing en cours de génération...');
    }
  } catch (error) {
    console.log(`📈 Métriques non disponibles: ${error.message}`);
  }
}

// Démarrage de tous les services
console.log('🚀 Démarrage du système POS avec Load Balancing...');
console.log('⚖️  Configuration: 3 instances par microservice');
console.log('🔄 Algorithme: Round-Robin\n');

// Démarrer tous les services avec un délai
services.forEach((service, index) => {
  setTimeout(() => {
    startService(service);
  }, index * 1000); // 1 seconde entre chaque service
});

// Attendre que tous les services démarrent puis faire les vérifications
setTimeout(async () => {
  await checkHealth();
  await testLoadBalancing();
  await showMetrics();
  
  console.log('\n🎯 Système démarré avec load balancing!');
  console.log('📊 Load Balancer Status: http://localhost:3000/load-balancer/status');
  console.log('🏥 Health Check: http://localhost:3000/health');
  console.log('📈 Métriques: http://localhost:3000/metrics');
  console.log('\nAppuyez sur Ctrl+C pour arrêter tous les services.');
}, 15000); // 15 secondes

// Gestion de l'arrêt propre
process.on('SIGINT', () => {
  console.log('\n🛑 Arrêt des services...');
  processes.forEach(({ name, process }) => {
    console.log(`⏹️  Arrêt de ${name}`);
    process.kill();
  });
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('\n🛑 Arrêt des services...');
  processes.forEach(({ name, process }) => {
    console.log(`⏹️  Arrêt de ${name}`);
    process.kill();
  });
  process.exit(0);
});
