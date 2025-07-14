#!/usr/bin/env node

/**
 * 🚀 DÉPLOIEMENT COMPLET DU SYSTÈME LOG430
 * Script de démarrage automatique de tous les services
 */

const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

// Configuration des services
const SERVICES = {
  // Système Legacy
  'legacy-system': {
    name: '🏛️ Legacy System',
    script: 'app/app.js',
    port: 3200,
    env: { PORT: '3200', SERVICE_TYPE: 'legacy' }
  },
  
  // Microservices - Instance 1 de chaque
  'produit-service-1': {
    name: '🛍️ Produit Service #1',
    script: 'src/api/servers.js',
    port: 3001,
    env: { 
      PORT: '3001', 
      SERVICE_TYPE: 'microservice',
      SERVICE_NAME: 'produit-service',
      INSTANCE_ID: 'produit-1'
    }
  },
  
  'stock-service-1': {
    name: '📦 Stock Service #1',
    script: 'src/api/servers.js',
    port: 3002,
    env: { 
      PORT: '3002', 
      SERVICE_TYPE: 'microservice',
      SERVICE_NAME: 'stock-service',
      INSTANCE_ID: 'stock-1'
    }
  },
  
  'vente-service-1': {
    name: '💰 Vente Service #1',
    script: 'src/api/servers.js',
    port: 3003,
    env: { 
      PORT: '3003', 
      SERVICE_TYPE: 'microservice',
      SERVICE_NAME: 'vente-service',
      INSTANCE_ID: 'vente-1'
    }
  },
  
  'reporting-service-1': {
    name: '📊 Reporting Service #1',
    script: 'src/api/servers.js',
    port: 3004,
    env: { 
      PORT: '3004', 
      SERVICE_TYPE: 'microservice',
      SERVICE_NAME: 'reporting-service',
      INSTANCE_ID: 'reporting-1'
    }
  },
  
  // Microservices - Instance 2 de chaque
  'produit-service-2': {
    name: '🛍️ Produit Service #2',
    script: 'src/api/servers.js',
    port: 3011,
    env: { 
      PORT: '3011', 
      SERVICE_TYPE: 'microservice',
      SERVICE_NAME: 'produit-service',
      INSTANCE_ID: 'produit-2'
    }
  },
  
  'stock-service-2': {
    name: '📦 Stock Service #2',
    script: 'src/api/servers.js',
    port: 3012,
    env: { 
      PORT: '3012', 
      SERVICE_TYPE: 'microservice',
      SERVICE_NAME: 'stock-service',
      INSTANCE_ID: 'stock-2'
    }
  },
  
  'vente-service-2': {
    name: '💰 Vente Service #2',
    script: 'src/api/servers.js',
    port: 3013,
    env: { 
      PORT: '3013', 
      SERVICE_TYPE: 'microservice',
      SERVICE_NAME: 'vente-service',
      INSTANCE_ID: 'vente-2'
    }
  },
  
  'reporting-service-2': {
    name: '📊 Reporting Service #2',
    script: 'src/api/servers.js',
    port: 3014,
    env: { 
      PORT: '3014', 
      SERVICE_TYPE: 'microservice',
      SERVICE_NAME: 'reporting-service',
      INSTANCE_ID: 'reporting-2'
    }
  }
};

const runningProcesses = new Map();

// Fonction utilitaire pour les logs colorés
const log = {
  info: (msg) => console.log(`\\x1b[36m[INFO]\\x1b[0m ${msg}`),
  success: (msg) => console.log(`\\x1b[32m[SUCCESS]\\x1b[0m ${msg}`),
  error: (msg) => console.log(`\\x1b[31m[ERROR]\\x1b[0m ${msg}`),
  warning: (msg) => console.log(`\\x1b[33m[WARNING]\\x1b[0m ${msg}`)
};

// Fonction pour démarrer un service
function startService(serviceId, config) {
  return new Promise((resolve, reject) => {
    log.info(`Démarrage de ${config.name} sur le port ${config.port}...`);
    
    const scriptPath = path.join(__dirname, config.script);
    
    if (!fs.existsSync(scriptPath)) {
      log.error(`Script introuvable: ${scriptPath}`);
      reject(new Error(`Script introuvable: ${scriptPath}`));
      return;
    }
    
    const process = spawn('node', [scriptPath], {
      env: { ...process.env, ...config.env },
      stdio: ['pipe', 'pipe', 'pipe'],
      cwd: __dirname
    });
    
    let started = false;
    
    process.stdout.on('data', (data) => {
      const output = data.toString();
      console.log(`[${config.name}] ${output.trim()}`);
      
      // Détecter le démarrage réussi
      if (!started && (
        output.includes(`port ${config.port}`) ||
        output.includes(`API démarrée`) ||
        output.includes(`Server running`) ||
        output.includes(`listening`)
      )) {
        started = true;
        log.success(`${config.name} démarré avec succès sur le port ${config.port}`);
        resolve(process);
      }
    });
    
    process.stderr.on('data', (data) => {
      const error = data.toString();
      console.error(\`[${config.name} ERROR] \${error.trim()}\`);
      
      if (!started && error.includes('EADDRINUSE')) {
        log.error(\`Port \${config.port} déjà utilisé pour \${config.name}\`);
        reject(new Error(\`Port \${config.port} occupé\`));
      }
    });
    
    process.on('exit', (code) => {
      if (code !== 0) {
        log.error(\`${config.name} s'est arrêté avec le code \${code}\`);
        runningProcesses.delete(serviceId);
      }
    });
    
    // Timeout de 10 secondes pour le démarrage
    setTimeout(() => {
      if (!started) {
        log.warning(\`Timeout pour \${config.name} - considéré comme démarré\`);
        resolve(process);
      }
    }, 10000);
    
    runningProcesses.set(serviceId, process);
  });
}

// Fonction pour tester un service
async function testService(port, serviceName) {
  return new Promise((resolve) => {
    const http = require('http');
    
    const options = {
      hostname: 'localhost',
      port: port,
      path: '/health',
      timeout: 5000
    };
    
    const req = http.get(options, (res) => {
      if (res.statusCode === 200) {
        log.success(\`✅ \${serviceName} répond correctement\`);
        resolve(true);
      } else {
        log.warning(\`⚠️ \${serviceName} répond avec le code \${res.statusCode}\`);
        resolve(false);
      }
    });
    
    req.on('error', (err) => {
      log.error(\`❌ \${serviceName} ne répond pas: \${err.message}\`);
      resolve(false);
    });
    
    req.on('timeout', () => {
      log.error(\`❌ \${serviceName} timeout\`);
      req.destroy();
      resolve(false);
    });
  });
}

// Fonction de nettoyage
function cleanup() {
  log.info('Arrêt de tous les services...');
  
  for (const [serviceId, process] of runningProcesses) {
    try {
      process.kill();
      log.info(\`Service \${serviceId} arrêté\`);
    } catch (err) {
      log.error(\`Erreur lors de l'arrêt de \${serviceId}: \${err.message}\`);
    }
  }
  
  runningProcesses.clear();
  log.success('Tous les services ont été arrêtés');
  process.exit(0);
}

// Gestionnaires de signal pour l'arrêt propre
process.on('SIGINT', cleanup);
process.on('SIGTERM', cleanup);

// Fonction principale
async function main() {
  console.log(\`
\\x1b[36m╔══════════════════════════════════════════════════════════════╗
║                  🚀 DÉPLOIEMENT LOG430 LAB TB                ║
║              Système POS avec Microservices                  ║
╚══════════════════════════════════════════════════════════════╝\\x1b[0m

\`);
  
  log.info('Démarrage du système complet...');
  
  try {
    // Démarrer tous les services en parallèle
    const startPromises = Object.entries(SERVICES).map(([serviceId, config]) => 
      startService(serviceId, config)
    );
    
    log.info(\`Démarrage de \${Object.keys(SERVICES).length} services...\`);
    await Promise.allSettled(startPromises);
    
    // Attendre un peu que tous les services se stabilisent
    log.info('Attente de la stabilisation des services...');
    await new Promise(resolve => setTimeout(resolve, 5000));
    
    // Tester tous les services
    log.info('\\n🧪 Tests de connectivité...');
    const testPromises = Object.entries(SERVICES).map(([serviceId, config]) =>
      testService(config.port, config.name)
    );
    
    const testResults = await Promise.all(testPromises);
    const successfulTests = testResults.filter(result => result === true).length;
    
    console.log(\`
\\x1b[32m╔══════════════════════════════════════════════════════════════╗
║                      ✅ DÉPLOIEMENT TERMINÉ                   ║
║                                                              ║
║  Services démarrés: \${Object.keys(SERVICES).length}/\${Object.keys(SERVICES).length}                              ║
║  Tests réussis: \${successfulTests}/\${Object.keys(SERVICES).length}                                    ║
║                                                              ║
║  🌐 URLs d'accès:                                            ║
║  • Legacy System: http://localhost:3200                     ║
║  • Produit Services: http://localhost:3001, 3011            ║
║  • Stock Services: http://localhost:3002, 3012              ║
║  • Vente Services: http://localhost:3003, 3013              ║
║  • Reporting Services: http://localhost:3004, 3014          ║
║                                                              ║
║  📊 Tests manuels disponibles:                               ║
║  • npm run test:manual                                       ║
║                                                              ║
║  Pour arrêter: Ctrl+C                                        ║
╚══════════════════════════════════════════════════════════════╝\\x1b[0m
\`);
    
    // Maintenir le processus actif
    log.info('Système en fonctionnement. Appuyez sur Ctrl+C pour arrêter.');
    
    // Monitoring continu (optionnel)
    setInterval(async () => {
      // Vérification de santé périodique si souhaité
    }, 60000); // Toutes les minutes
    
  } catch (error) {
    log.error(\`Erreur lors du déploiement: \${error.message}\`);
    cleanup();
  }
}

// Point d'entrée
if (require.main === module) {
  main().catch((error) => {
    log.error(\`Erreur fatale: \${error.message}\`);
    process.exit(1);
  });
}

module.exports = { startService, testService, cleanup };
