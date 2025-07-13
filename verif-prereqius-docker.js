#!/usr/bin/env node

// 🚀 SCRIPT DE VÉRIFICATION PRÉ-DÉPLOIEMENT DOCKER
// Vérifie que tout est prêt pour le déploiement Kong

const { exec } = require('child_process');
const fs = require('fs');
const chalk = require('chalk');

console.log(chalk.cyan('🔍 VÉRIFICATION PRÉ-DÉPLOIEMENT DOCKER KONG'));
console.log('');

async function checkPrerequisites() {
  const checks = [];
  
  console.log(chalk.yellow('📋 VÉRIFICATION DES PRÉREQUIS...'));
  console.log('');
  
  // 1. Vérifier Docker
  try {
    await execCommand('docker --version');
    checks.push({ name: 'Docker installé', status: '✅', detail: 'Docker disponible' });
  } catch (error) {
    checks.push({ name: 'Docker installé', status: '❌', detail: 'Docker non trouvé - Installation requise' });
  }
  
  // 2. Vérifier Docker Compose
  try {
    await execCommand('docker-compose --version');
    checks.push({ name: 'Docker Compose', status: '✅', detail: 'Docker Compose disponible' });
  } catch (error) {
    checks.push({ name: 'Docker Compose', status: '❌', detail: 'Docker Compose non trouvé' });
  }
  
  // 3. Vérifier Docker running
  try {
    await execCommand('docker ps');
    checks.push({ name: 'Docker Daemon', status: '✅', detail: 'Docker daemon actif' });
  } catch (error) {
    checks.push({ name: 'Docker Daemon', status: '❌', detail: 'Docker daemon non démarré' });
  }
  
  // 4. Vérifier fichier docker-compose.kong.yml
  if (fs.existsSync('./docker-compose.kong.yml')) {
    checks.push({ name: 'Configuration Kong', status: '✅', detail: 'docker-compose.kong.yml présent' });
  } else {
    checks.push({ name: 'Configuration Kong', status: '❌', detail: 'docker-compose.kong.yml manquant' });
  }
  
  // 5. Vérifier ports libres
  try {
    await checkPortAvailable(8000, 'Kong Gateway');
    await checkPortAvailable(8001, 'Kong Admin');
    await checkPortAvailable(8002, 'Kong Manager');
    await checkPortAvailable(5432, 'PostgreSQL');
    checks.push({ name: 'Ports disponibles', status: '✅', detail: 'Ports Kong libres' });
  } catch (error) {
    checks.push({ name: 'Ports disponibles', status: '⚠️', detail: 'Certains ports occupés' });
  }
  
  // 6. Vérifier espace disque
  try {
    const stats = await execCommand('docker system df');
    checks.push({ name: 'Espace disque', status: '✅', detail: 'Espace suffisant' });
  } catch (error) {
    checks.push({ name: 'Espace disque', status: '⚠️', detail: 'Vérification impossible' });
  }
  
  return checks;
}

function execCommand(command) {
  return new Promise((resolve, reject) => {
    exec(command, (error, stdout, stderr) => {
      if (error) {
        reject(error);
      } else {
        resolve(stdout);
      }
    });
  });
}

function checkPortAvailable(port, service) {
  return new Promise((resolve, reject) => {
    const { createConnection } = require('net');
    const socket = createConnection(port, 'localhost');
    
    socket.on('connect', () => {
      socket.destroy();
      reject(new Error(`Port ${port} (${service}) occupé`));
    });
    
    socket.on('error', () => {
      resolve(true); // Port libre
    });
  });
}

async function generateDeploymentCommand() {
  console.log(chalk.yellow('🚀 COMMANDES DE DÉPLOIEMENT GÉNÉRÉES'));
  console.log('');
  
  const commands = [
    '# 1. Arrêter tous conteneurs existants',
    'docker-compose down --remove-orphans',
    '',
    '# 2. Nettoyer les volumes (optionnel)',
    'docker volume prune -f',
    '',
    '# 3. Démarrer l\'infrastructure Kong complète',
    'docker-compose -f docker-compose.kong.yml up -d',
    '',
    '# 4. Vérifier le déploiement',
    'docker-compose -f docker-compose.kong.yml ps',
    '',
    '# 5. Tester Kong Gateway',
    'curl http://localhost:8000/health',
    '',
    '# 6. Vérifier Kong Admin',
    'curl http://localhost:8001/status'
  ];
  
  const commandFile = './commandes-deploiement-kong.sh';
  fs.writeFileSync(commandFile, commands.join('\n'));
  
  console.log(chalk.green(`✅ Commandes sauvées dans: ${commandFile}`));
  console.log('');
  
  return commands;
}

async function main() {
  console.log(chalk.cyan('🔍 DÉMARRAGE VÉRIFICATION PRÉ-DÉPLOIEMENT'));
  console.log('');
  
  // Vérifications
  const checks = await checkPrerequisites();
  
  // Affichage résultats
  console.log(chalk.magenta('📊 RÉSULTATS VÉRIFICATION:'));
  console.log('');
  
  checks.forEach(check => {
    console.log(`${check.status} ${check.name}: ${check.detail}`);
  });
  
  console.log('');
  
  // Analyse globale
  const allGreen = checks.every(check => check.status === '✅');
  const hasRed = checks.some(check => check.status === '❌');
  
  if (allGreen) {
    console.log(chalk.green('🎯 SYSTÈME PRÊT POUR DÉPLOIEMENT DOCKER !'));
    console.log('');
    
    // Générer commandes
    const commands = await generateDeploymentCommand();
    
    console.log(chalk.cyan('🚀 DÉPLOIEMENT AUTOMATIQUE:'));
    console.log(chalk.blue('   Exécutez: docker-compose -f docker-compose.kong.yml up -d'));
    console.log('');
    
  } else if (hasRed) {
    console.log(chalk.red('❌ PRÉREQUIS MANQUANTS'));
    console.log('');
    console.log(chalk.yellow('📋 ACTIONS REQUISES:'));
    
    checks.filter(check => check.status === '❌').forEach(check => {
      console.log(chalk.red(`   • ${check.name}: ${check.detail}`));
    });
    
    console.log('');
    console.log(chalk.cyan('📖 Consultez: INSTALLATION-DOCKER.md'));
    
  } else {
    console.log(chalk.yellow('⚠️ DÉPLOIEMENT POSSIBLE AVEC PRÉCAUTIONS'));
    console.log('');
    console.log(chalk.blue('Les avertissements ne bloquent pas le déploiement'));
  }
  
  console.log('');
  console.log(chalk.magenta('🏁 VÉRIFICATION TERMINÉE'));
}

main().catch(console.error);
