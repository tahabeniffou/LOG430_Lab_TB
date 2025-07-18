#!/usr/bin/env node

/**
 * Script de vérification de santé complète du système
 * Utilisation: node health-check.js
 */

const axios = require('axios');
const chalk = require('chalk');

class HealthChecker {
  constructor() {
    this.services = [
      { name: 'Kong Gateway', url: 'http://localhost:8000' },
      { name: 'Kong Admin', url: 'http://localhost:8001' },
      { name: 'Prometheus', url: 'http://localhost:9090' },
      { name: 'Grafana', url: 'http://localhost:3008' },
      { name: 'RabbitMQ', url: 'http://localhost:15672' }
    ];

    this.microservices = [
      { name: 'Legacy Service', url: 'http://localhost:3000/health' },
      { name: 'Produit Service', url: 'http://localhost:3001/health' },
      { name: 'Stock Service', url: 'http://localhost:3002/health' },
      { name: 'Vente Service', url: 'http://localhost:3003/health' },
      { name: 'Reporting Service', url: 'http://localhost:3004/health' },
      { name: 'Compte Service', url: 'http://localhost:3005/health' },
      { name: 'Panier Service', url: 'http://localhost:3006/health' },
      { name: 'Checkout Service', url: 'http://localhost:3007/health' },
      { name: 'Saga Orchestrator', url: 'http://localhost:8010/health' },
      { name: 'Reclamation Service', url: 'http://localhost:8011/health' },
      { name: 'Validation Service', url: 'http://localhost:8012/health' },
      { name: 'Notification Service', url: 'http://localhost:8013/health' },
      { name: 'Payment Service', url: 'http://localhost:8014/health' }
    ];
  }

  async checkService(service) {
    try {
      const response = await axios.get(service.url, { timeout: 5000 });
      return {
        name: service.name,
        status: 'healthy',
        statusCode: response.status,
        responseTime: response.headers['response-time'] || 'N/A'
      };
    } catch (error) {
      return {
        name: service.name,
        status: 'unhealthy',
        error: error.message,
        statusCode: error.response?.status || 'N/A'
      };
    }
  }

  async runHealthCheck() {
    console.log(chalk.cyan('🏥 Vérification de santé du système POS\n'));

    // Vérification des services d'infrastructure
    console.log(chalk.yellow('📡 Services d\'infrastructure:'));
    const infraResults = await Promise.all(
      this.services.map(service => this.checkService(service))
    );

    infraResults.forEach(result => {
      if (result.status === 'healthy') {
        console.log(chalk.green(`  ✅ ${result.name}: OK (${result.statusCode})`));
      } else {
        console.log(chalk.red(`  ❌ ${result.name}: ${result.error}`));
      }
    });

    // Vérification des microservices
    console.log(chalk.yellow('\n🔧 Microservices:'));
    const microResults = await Promise.all(
      this.microservices.map(service => this.checkService(service))
    );

    const healthyMicros = microResults.filter(r => r.status === 'healthy');
    const unhealthyMicros = microResults.filter(r => r.status === 'unhealthy');

    microResults.forEach(result => {
      if (result.status === 'healthy') {
        console.log(chalk.green(`  ✅ ${result.name}: OK (${result.statusCode})`));
      } else {
        console.log(chalk.red(`  ❌ ${result.name}: ${result.error}`));
      }
    });

    // Résumé
    console.log(chalk.cyan('\n📊 Résumé:'));
    console.log(`  Total microservices: ${this.microservices.length}`);
    console.log(chalk.green(`  Healthy: ${healthyMicros.length}`));
    console.log(chalk.red(`  Unhealthy: ${unhealthyMicros.length}`));
    console.log(`  Availability: ${Math.round((healthyMicros.length / this.microservices.length) * 100)}%`);

    if (unhealthyMicros.length === 0) {
      console.log(chalk.green('\n🎉 Système en parfait état!'));
    } else {
      console.log(chalk.yellow('\n⚠️  Certains services nécessitent attention'));
    }
  }
}

// Exécution si appelé directement
if (require.main === module) {
  const checker = new HealthChecker();
  checker.runHealthCheck().catch(console.error);
}

module.exports = HealthChecker;
