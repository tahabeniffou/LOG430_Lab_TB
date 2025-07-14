#!/usr/bin/env node

/**
 * 🚀 DÉPLOIEMENT SIMPLIFIÉ DU SYSTÈME LOG430
 */

const { spawn } = require('child_process');
const http = require('http');

// Configuration des services  
const SERVICES = [
  { name: 'Legacy System', script: 'app/app.js', port: 3200, env: { PORT: '3200' } },
  { name: 'Produit Service 1', script: 'src/api/servers.js', port: 3001, env: { PORT: '3001', SERVICE_NAME: 'produit-service', INSTANCE_ID: 'produit-1' } },
  { name: 'Stock Service 1', script: 'src/api/servers.js', port: 3002, env: { PORT: '3002', SERVICE_NAME: 'stock-service', INSTANCE_ID: 'stock-1' } },
  { name: 'Vente Service 1', script: 'src/api/servers.js', port: 3003, env: { PORT: '3003', SERVICE_NAME: 'vente-service', INSTANCE_ID: 'vente-1' } },
  { name: 'Reporting Service 1', script: 'src/api/servers.js', port: 3004, env: { PORT: '3004', SERVICE_NAME: 'reporting-service', INSTANCE_ID: 'reporting-1' } }
];

const processes = [];

function log(message) {
  console.log(`[${new Date().toLocaleTimeString()}] ${message}`);
}

function testService(port, name) {
  return new Promise((resolve) => {
    const req = http.get(`http://localhost:${port}/health`, (res) => {
      if (res.statusCode === 200) {
        log(`✅ ${name} (port ${port}) - OK`);
        resolve(true);
      } else {
        log(`⚠️ ${name} (port ${port}) - Status ${res.statusCode}`);
        resolve(false);
      }
    });
    
    req.on('error', () => {
      log(`❌ ${name} (port ${port}) - Erreur de connexion`);
      resolve(false);
    });
    
    req.setTimeout(3000, () => {
      req.destroy();
      log(`❌ ${name} (port ${port}) - Timeout`);
      resolve(false);
    });
  });
}

async function startService(config) {
  return new Promise((resolve) => {
    log(`Démarrage ${config.name} sur le port ${config.port}...`);
    
    const child = spawn('node', [config.script], {
      env: { ...process.env, ...config.env },
      stdio: 'pipe'
    });
    
    child.stdout.on('data', (data) => {
      const output = data.toString().trim();
      if (output) {
        console.log(`[${config.name}] ${output}`);
      }
    });
    
    child.stderr.on('data', (data) => {
      console.error(`[${config.name} ERROR] ${data.toString().trim()}`);
    });
    
    processes.push(child);
    
    // Attendre un peu puis considérer démarré
    setTimeout(() => {
      log(`${config.name} considéré comme démarré`);
      resolve();
    }, 2000);
  });
}

async function main() {
  console.log(`
🚀 DÉPLOIEMENT LOG430 LAB TB - Système POS
================================================
Démarrage de ${SERVICES.length} services...
`);

  // Démarrer tous les services
  for (const service of SERVICES) {
    await startService(service);
  }
  
  // Attendre stabilisation
  log('Attente de stabilisation (10 secondes)...');
  await new Promise(resolve => setTimeout(resolve, 10000));
  
  // Tester les services
  console.log('\n🧪 Tests de connectivité:');
  for (const service of SERVICES) {
    await testService(service.port, service.name);
  }
  
  console.log(`
✅ DÉPLOIEMENT TERMINÉ
=====================================
Services disponibles:
• Legacy System: http://localhost:3200
• Produit Service: http://localhost:3001  
• Stock Service: http://localhost:3002
• Vente Service: http://localhost:3003
• Reporting Service: http://localhost:3004

Tests manuels:
curl http://localhost:3200/api/v1/magasins
curl http://localhost:3001/health
curl http://localhost:3002/health
curl http://localhost:3003/health
curl http://localhost:3004/health

Appuyez sur Ctrl+C pour arrêter
`);

  // Maintenir actif
  process.on('SIGINT', () => {
    log('Arrêt des services...');
    processes.forEach(p => p.kill());
    process.exit(0);
  });
}

main().catch(console.error);
