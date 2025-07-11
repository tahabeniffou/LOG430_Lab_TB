#!/usr/bin/env node

const { spawn } = require('child_process');
const path = require('path');
const axios = require('axios');

// Configuration des services
const services = [
  {
    name: 'produit-service',
    path: './microservices/produit-service',
    port: 3001,
    url: 'http://localhost:3001'
  },
  {
    name: 'stock-service', 
    path: './microservices/stock-service',
    port: 3002,
    url: 'http://localhost:3002'
  },
  {
    name: 'vente-service',
    path: './microservices/vente-service', 
    port: 3003,
    url: 'http://localhost:3003'
  },
  {
    name: 'reporting-service',
    path: './microservices/reporting-service',
    port: 3004,
    url: 'http://localhost:3004'
  },
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
  
  for (const service of services) {
    try {
      const response = await axios.get(`${service.url}/health`, { timeout: 3000 });
      console.log(`✅ ${service.name}: ${response.status} - ${response.data?.status || 'OK'}`);
    } catch (error) {
      console.log(`❌ ${service.name}: INACCESSIBLE (${error.message})`);
    }
  }
}

// Fonction pour afficher les métriques
async function showMetrics() {
  console.log('\n📊 Métriques Prometheus...');
  
  for (const service of services) {
    try {
      const response = await axios.get(`${service.url}/metrics`, { timeout: 3000 });
      const lines = response.data.split('\n');
      const httpRequests = lines.find(line => line.startsWith('http_requests_total'));
      if (httpRequests) {
        console.log(`📈 ${service.name}: ${httpRequests}`);
      }
    } catch (error) {
      console.log(`📈 ${service.name}: Métriques non disponibles`);
    }
  }
}

// Gestionnaire d'arrêt propre
process.on('SIGINT', () => {
  console.log('\n🛑 Arrêt des services...');
  processes.forEach(({ name, process }) => {
    console.log(`Arrêt de ${name}...`);
    process.kill('SIGTERM');
  });
  
  setTimeout(() => {
    console.log('Arrêt forcé...');
    process.exit(0);
  }, 5000);
});

// Démarrage de tous les services
console.log('🌟 Démarrage de l\'infrastructure microservices...');
services.forEach(service => startService(service));

// Attendre 10 secondes puis vérifier la santé
setTimeout(checkHealth, 10000);

// Afficher les métriques toutes les 30 secondes
setInterval(showMetrics, 30000);

console.log('\n💡 Commandes disponibles:');
console.log('  - Ctrl+C: Arrêter tous les services');
console.log('  - Health checks automatiques toutes les 30s');
console.log('\n🌐 URLs des services:');
services.forEach(service => {
  console.log(`  - ${service.name}: ${service.url}`);
});
