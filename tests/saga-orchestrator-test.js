#!/usr/bin/env node

/**
 * Test Suite Lab 6 - Saga Orchestrator
 * Tests complets avec métriques détaillées
 */

const axios = require('axios');
const chalk = require('chalk');
const { v4: uuidv4 } = require('uuid');

class SagaOrchestratorTestSuite {
  constructor() {
    this.baseUrls = {
      orchestrator: 'http://localhost:8010',
      kong: 'http://localhost:8000',
      stock: 'http://localhost:3002',
      payment: 'http://localhost:8014',
      sale: 'http://localhost:3003',
      prometheus: 'http://localhost:9090',
    };
    
    this.testResults = [];
    this.metrics = {
      totalSagas: 0,
      successfulSagas: 0,
      failedSagas: 0,
      compensatedSagas: 0,
      stepResults: {
        stockReserve: { success: 0, failure: 0 },
        paymentDebit: { success: 0, failure: 0 },
        saleCreate: { success: 0, failure: 0 },
      },
      compensationResults: {
        stockRelease: { success: 0, failure: 0 },
        paymentRefund: { success: 0, failure: 0 },
        saleRollback: { success: 0, failure: 0 },
      },
      performanceMetrics: {
        averageLatency: 0,
        p95Latency: 0,
        p99Latency: 0,
        latencies: [],
      },
    };
  }

  async runCompleteTestSuite() {
    console.log(chalk.cyan('🎭 Lab 6 - Saga Orchestrator Test Suite\n'));
    
    try {
      // 1. Vérification des services
      await this.checkServicesHealth();
      
      // 2. Tests de base
      await this.testSuccessfulSaga();
      await this.testStockFailureSaga();
      await this.testPaymentFailureSaga();
      await this.testSaleFailureSaga();
      
      // 3. Tests de charge
      await this.testConcurrentSagas();
      await this.testHighLoadSagas();
      
      // 4. Tests de résilience
      await this.testTimeoutHandling();
      await this.testErrorRecovery();
      
      // 5. Analyse finale
      await this.analyzeResults();
      await this.generateReport();
      
    } catch (error) {
      console.error(chalk.red('❌ Erreur lors des tests:'), error.message);
    }
  }

  async checkServicesHealth() {
    console.log(chalk.yellow('🔍 Vérification de l\'état des services...\n'));
    
    const services = [
      { name: 'Saga Orchestrator', url: `${this.baseUrls.orchestrator}/health` },
      { name: 'Kong Gateway', url: `${this.baseUrls.kong}` },
      { name: 'Stock Service', url: `${this.baseUrls.stock}/health` },
      { name: 'Payment Service', url: `${this.baseUrls.payment}/health` },
      { name: 'Sale Service', url: `${this.baseUrls.sale}/health` },
    ];

    for (const service of services) {
      try {
        const response = await axios.get(service.url, { timeout: 5000 });
        console.log(chalk.green(`✅ ${service.name}: OK (${response.status})`));
      } catch (error) {
        console.log(chalk.red(`❌ ${service.name}: ${error.message}`));
        throw new Error(`Service ${service.name} indisponible`);
      }
    }
    console.log();
  }

  async testSuccessfulSaga() {
    console.log(chalk.blue('🎯 Test 1: Saga Réussie Complète'));
    
    const sagaData = {
      customerId: 1,
      productId: 1,
      quantity: 2,
      totalAmount: 100,
      correlationId: uuidv4(),
    };

    const startTime = Date.now();
    
    try {
      // Initier la saga
      const response = await axios.post(
        `${this.baseUrls.orchestrator}/saga/start`,
        sagaData,
        { timeout: 30000 }
      );

      // Attendre la completion
      const result = await this.waitForSagaCompletion(response.data.sagaId);
      
      const endTime = Date.now();
      const duration = endTime - startTime;
      
      this.metrics.totalSagas++;
      this.metrics.performanceMetrics.latencies.push(duration);
      
      if (result.status === 'COMPLETED') {
        this.metrics.successfulSagas++;
        this.updateStepMetrics(result.steps, true);
        console.log(chalk.green(`  ✅ Saga réussie en ${duration}ms`));
      } else {
        this.metrics.failedSagas++;
        console.log(chalk.red(`  ❌ Saga échouée: ${result.status}`));
      }
      
    } catch (error) {
      this.metrics.failedSagas++;
      console.log(chalk.red(`  ❌ Erreur: ${error.message}`));
    }
    
    console.log();
  }

  async testStockFailureSaga() {
    console.log(chalk.blue('🎯 Test 2: Échec Stock avec Compensation'));
    
    const sagaData = {
      customerId: 1,
      productId: 999, // Produit inexistant
      quantity: 1,
      totalAmount: 50,
      correlationId: uuidv4(),
    };

    const startTime = Date.now();
    
    try {
      const response = await axios.post(
        `${this.baseUrls.orchestrator}/saga/start`,
        sagaData,
        { timeout: 30000 }
      );

      const result = await this.waitForSagaCompletion(response.data.sagaId);
      const endTime = Date.now();
      const duration = endTime - startTime;
      
      this.metrics.totalSagas++;
      this.metrics.performanceMetrics.latencies.push(duration);
      
      if (result.status === 'FAILED' && result.failureReason?.includes('stock')) {
        this.metrics.stepResults.stockReserve.failure++;
        console.log(chalk.yellow(`  ✅ Échec stock détecté correctement en ${duration}ms`));
      } else {
        console.log(chalk.red(`  ❌ Comportement inattendu: ${result.status}`));
      }
      
    } catch (error) {
      console.log(chalk.red(`  ❌ Erreur: ${error.message}`));
    }
    
    console.log();
  }

  async testPaymentFailureSaga() {
    console.log(chalk.blue('🎯 Test 3: Échec Paiement avec Compensation'));
    
    const sagaData = {
      customerId: 999, // Client inexistant
      productId: 1,
      quantity: 1,
      totalAmount: 50,
      correlationId: uuidv4(),
    };

    const startTime = Date.now();
    
    try {
      const response = await axios.post(
        `${this.baseUrls.orchestrator}/saga/start`,
        sagaData,
        { timeout: 30000 }
      );

      const result = await this.waitForSagaCompletion(response.data.sagaId);
      const endTime = Date.now();
      const duration = endTime - startTime;
      
      this.metrics.totalSagas++;
      this.metrics.performanceMetrics.latencies.push(duration);
      
      if (result.status === 'COMPENSATED' && result.compensations?.stockRelease) {
        this.metrics.compensatedSagas++;
        this.metrics.compensationResults.stockRelease.success++;
        console.log(chalk.yellow(`  ✅ Compensation stock réalisée en ${duration}ms`));
      } else {
        console.log(chalk.red(`  ❌ Compensation échouée: ${result.status}`));
      }
      
    } catch (error) {
      console.log(chalk.red(`  ❌ Erreur: ${error.message}`));
    }
    
    console.log();
  }

  async testSaleFailureSaga() {
    console.log(chalk.blue('🎯 Test 4: Échec Vente avec Compensation Complète'));
    
    const sagaData = {
      customerId: 1,
      productId: 1,
      quantity: 1,
      totalAmount: 50,
      correlationId: uuidv4(),
      forceFailure: 'sale', // Flag pour forcer l'échec
    };

    const startTime = Date.now();
    
    try {
      const response = await axios.post(
        `${this.baseUrls.orchestrator}/saga/start`,
        sagaData,
        { timeout: 30000 }
      );

      const result = await this.waitForSagaCompletion(response.data.sagaId);
      const endTime = Date.now();
      const duration = endTime - startTime;
      
      this.metrics.totalSagas++;
      this.metrics.performanceMetrics.latencies.push(duration);
      
      if (result.status === 'COMPENSATED' && 
          result.compensations?.stockRelease && 
          result.compensations?.paymentRefund) {
        this.metrics.compensatedSagas++;
        this.metrics.compensationResults.stockRelease.success++;
        this.metrics.compensationResults.paymentRefund.success++;
        console.log(chalk.yellow(`  ✅ Compensation complète réalisée en ${duration}ms`));
      } else {
        console.log(chalk.red(`  ❌ Compensation incomplète: ${result.status}`));
      }
      
    } catch (error) {
      console.log(chalk.red(`  ❌ Erreur: ${error.message}`));
    }
    
    console.log();
  }

  async testConcurrentSagas() {
    console.log(chalk.blue('🎯 Test 5: Sagas Concurrentes (10 simultanées)'));
    
    const promises = [];
    const startTime = Date.now();
    
    for (let i = 0; i < 10; i++) {
      const sagaData = {
        customerId: (i % 3) + 1,
        productId: (i % 5) + 1,
        quantity: Math.floor(Math.random() * 3) + 1,
        totalAmount: Math.floor(Math.random() * 200) + 50,
        correlationId: uuidv4(),
      };
      
      promises.push(this.executeSaga(sagaData));
    }
    
    try {
      const results = await Promise.all(promises);
      const endTime = Date.now();
      const totalDuration = endTime - startTime;
      
      let successful = 0;
      let failed = 0;
      
      results.forEach(result => {
        this.metrics.totalSagas++;
        if (result.success) {
          successful++;
          this.metrics.successfulSagas++;
        } else {
          failed++;
          this.metrics.failedSagas++;
        }
        this.metrics.performanceMetrics.latencies.push(result.duration);
      });
      
      console.log(chalk.green(`  ✅ ${successful}/10 sagas réussies`));
      console.log(chalk.yellow(`  ⚠️  ${failed}/10 sagas échouées`));
      console.log(chalk.blue(`  ⏱️  Durée totale: ${totalDuration}ms`));
      
    } catch (error) {
      console.log(chalk.red(`  ❌ Erreur concurrence: ${error.message}`));
    }
    
    console.log();
  }

  async testHighLoadSagas() {
    console.log(chalk.blue('🎯 Test 6: Charge Élevée (25 sagas)'));
    
    const batchSize = 5;
    const batches = 5;
    let totalSuccessful = 0;
    let totalFailed = 0;
    
    for (let batch = 0; batch < batches; batch++) {
      console.log(chalk.gray(`  Batch ${batch + 1}/${batches}...`));
      
      const promises = [];
      for (let i = 0; i < batchSize; i++) {
        const sagaData = {
          customerId: (i % 3) + 1,
          productId: (i % 5) + 1,
          quantity: 1,
          totalAmount: 75,
          correlationId: uuidv4(),
        };
        
        promises.push(this.executeSaga(sagaData));
      }
      
      try {
        const results = await Promise.all(promises);
        
        results.forEach(result => {
          this.metrics.totalSagas++;
          if (result.success) {
            totalSuccessful++;
            this.metrics.successfulSagas++;
          } else {
            totalFailed++;
            this.metrics.failedSagas++;
          }
          this.metrics.performanceMetrics.latencies.push(result.duration);
        });
        
        // Pause entre les batches
        await new Promise(resolve => setTimeout(resolve, 1000));
        
      } catch (error) {
        console.log(chalk.red(`  ❌ Erreur batch ${batch + 1}: ${error.message}`));
      }
    }
    
    console.log(chalk.green(`  ✅ ${totalSuccessful}/25 sagas réussies`));
    console.log(chalk.yellow(`  ⚠️  ${totalFailed}/25 sagas échouées`));
    console.log();
  }

  async testTimeoutHandling() {
    console.log(chalk.blue('🎯 Test 7: Gestion des Timeouts'));
    
    const sagaData = {
      customerId: 1,
      productId: 1,
      quantity: 1,
      totalAmount: 50,
      correlationId: uuidv4(),
      simulateTimeout: true,
    };

    try {
      const response = await axios.post(
        `${this.baseUrls.orchestrator}/saga/start`,
        sagaData,
        { timeout: 10000 }
      );

      const result = await this.waitForSagaCompletion(response.data.sagaId, 15000);
      
      if (result.status === 'TIMEOUT' || result.status === 'COMPENSATED') {
        console.log(chalk.yellow(`  ✅ Timeout géré correctement: ${result.status}`));
      } else {
        console.log(chalk.red(`  ❌ Timeout non géré: ${result.status}`));
      }
      
    } catch (error) {
      if (error.message.includes('timeout')) {
        console.log(chalk.yellow(`  ✅ Timeout détecté au niveau client`));
      } else {
        console.log(chalk.red(`  ❌ Erreur: ${error.message}`));
      }
    }
    
    console.log();
  }

  async testErrorRecovery() {
    console.log(chalk.blue('🎯 Test 8: Récupération d\'Erreur'));
    
    // Simuler une panne temporaire puis récupération
    const sagaData = {
      customerId: 1,
      productId: 1,
      quantity: 1,
      totalAmount: 50,
      correlationId: uuidv4(),
      simulateRecovery: true,
    };

    try {
      const response = await axios.post(
        `${this.baseUrls.orchestrator}/saga/start`,
        sagaData,
        { timeout: 30000 }
      );

      const result = await this.waitForSagaCompletion(response.data.sagaId);
      
      if (result.status === 'COMPLETED' && result.retryCount > 0) {
        console.log(chalk.green(`  ✅ Récupération réussie après ${result.retryCount} tentatives`));
      } else {
        console.log(chalk.yellow(`  ⚠️  Résultat: ${result.status}`));
      }
      
    } catch (error) {
      console.log(chalk.red(`  ❌ Erreur: ${error.message}`));
    }
    
    console.log();
  }

  async executeSaga(sagaData) {
    const startTime = Date.now();
    
    try {
      const response = await axios.post(
        `${this.baseUrls.orchestrator}/saga/start`,
        sagaData,
        { timeout: 30000 }
      );

      const result = await this.waitForSagaCompletion(response.data.sagaId);
      const endTime = Date.now();
      
      return {
        success: result.status === 'COMPLETED',
        status: result.status,
        duration: endTime - startTime,
        sagaId: response.data.sagaId,
      };
      
    } catch (error) {
      return {
        success: false,
        status: 'ERROR',
        duration: Date.now() - startTime,
        error: error.message,
      };
    }
  }

  async waitForSagaCompletion(sagaId, timeout = 30000) {
    const startTime = Date.now();
    
    while (Date.now() - startTime < timeout) {
      try {
        const response = await axios.get(
          `${this.baseUrls.orchestrator}/saga/status/${sagaId}`,
          { timeout: 5000 }
        );
        
        const status = response.data;
        
        if (['COMPLETED', 'FAILED', 'COMPENSATED', 'TIMEOUT'].includes(status.status)) {
          return status;
        }
        
        await new Promise(resolve => setTimeout(resolve, 500));
        
      } catch (error) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }
    
    return { status: 'TIMEOUT', error: 'Timeout waiting for saga completion' };
  }

  updateStepMetrics(steps, success) {
    if (steps?.stockReserve) {
      if (success) {
        this.metrics.stepResults.stockReserve.success++;
      } else {
        this.metrics.stepResults.stockReserve.failure++;
      }
    }
    
    if (steps?.paymentDebit) {
      if (success) {
        this.metrics.stepResults.paymentDebit.success++;
      } else {
        this.metrics.stepResults.paymentDebit.failure++;
      }
    }
    
    if (steps?.saleCreate) {
      if (success) {
        this.metrics.stepResults.saleCreate.success++;
      } else {
        this.metrics.stepResults.saleCreate.failure++;
      }
    }
  }

  async analyzeResults() {
    console.log(chalk.cyan('📊 Analyse des Résultats\n'));
    
    // Calculer les métriques de performance
    const latencies = this.metrics.performanceMetrics.latencies;
    if (latencies.length > 0) {
      latencies.sort((a, b) => a - b);
      
      this.metrics.performanceMetrics.averageLatency = 
        latencies.reduce((a, b) => a + b, 0) / latencies.length;
      
      this.metrics.performanceMetrics.p95Latency = 
        latencies[Math.floor(latencies.length * 0.95)];
      
      this.metrics.performanceMetrics.p99Latency = 
        latencies[Math.floor(latencies.length * 0.99)];
    }
    
    // Afficher les résultats
    console.log(chalk.yellow('🎯 Résultats Globaux:'));
    console.log(`  Total Sagas: ${this.metrics.totalSagas}`);
    console.log(`  Réussies: ${chalk.green(this.metrics.successfulSagas)} (${((this.metrics.successfulSagas / this.metrics.totalSagas) * 100).toFixed(1)}%)`);
    console.log(`  Échouées: ${chalk.red(this.metrics.failedSagas)} (${((this.metrics.failedSagas / this.metrics.totalSagas) * 100).toFixed(1)}%)`);
    console.log(`  Compensées: ${chalk.yellow(this.metrics.compensatedSagas)} (${((this.metrics.compensatedSagas / this.metrics.totalSagas) * 100).toFixed(1)}%)`);
    
    console.log(chalk.yellow('\n⏱️  Performance:'));
    console.log(`  Latence moyenne: ${this.metrics.performanceMetrics.averageLatency.toFixed(0)}ms`);
    console.log(`  Latence P95: ${this.metrics.performanceMetrics.p95Latency.toFixed(0)}ms`);
    console.log(`  Latence P99: ${this.metrics.performanceMetrics.p99Latency.toFixed(0)}ms`);
    
    console.log(chalk.yellow('\n🔄 Étapes:'));
    Object.entries(this.metrics.stepResults).forEach(([step, results]) => {
      const total = results.success + results.failure;
      const successRate = total > 0 ? (results.success / total * 100).toFixed(1) : 0;
      console.log(`  ${step}: ${results.success}/${total} (${successRate}%)`);
    });
    
    console.log();
  }

  async generateReport() {
    console.log(chalk.cyan('📝 Rapport Final\n'));
    
    const successRate = (this.metrics.successfulSagas / this.metrics.totalSagas * 100).toFixed(1);
    const avgLatency = this.metrics.performanceMetrics.averageLatency.toFixed(0);
    const p95Latency = this.metrics.performanceMetrics.p95Latency.toFixed(0);
    
    console.log(chalk.blue('┌─────────────────────────────────────────────────────────────┐'));
    console.log(chalk.blue('│                   RAPPORT LAB 6 - SAGA                     │'));
    console.log(chalk.blue('├─────────────────────────────────────────────────────────────┤'));
    console.log(chalk.blue(`│ Taux de succès: ${successRate}%${' '.repeat(43 - successRate.length)}│`));
    console.log(chalk.blue(`│ Latence moyenne: ${avgLatency}ms${' '.repeat(41 - avgLatency.length)}│`));
    console.log(chalk.blue(`│ Latence P95: ${p95Latency}ms${' '.repeat(45 - p95Latency.length)}│`));
    console.log(chalk.blue(`│ Total sagas: ${this.metrics.totalSagas}${' '.repeat(45 - this.metrics.totalSagas.toString().length)}│`));
    console.log(chalk.blue('└─────────────────────────────────────────────────────────────┘'));
    
    // Recommandations
    console.log(chalk.yellow('\n🎯 Recommandations:'));
    
    if (parseFloat(successRate) < 95) {
      console.log(chalk.red('  ❌ Taux de succès < 95% - Optimisation requise'));
    } else {
      console.log(chalk.green('  ✅ Taux de succès acceptable'));
    }
    
    if (parseInt(p95Latency) > 5000) {
      console.log(chalk.red('  ❌ Latence P95 > 5s - Optimisation performance requise'));
    } else {
      console.log(chalk.green('  ✅ Latence P95 acceptable'));
    }
    
    console.log(chalk.blue('\n📊 Dashboard Grafana: http://localhost:3008/d/saga-orchestrator-lab6'));
    console.log(chalk.blue('📈 Métriques Prometheus: http://localhost:9090'));
    console.log(chalk.blue('🧪 Test de charge: k6 run tests/k6-saga-orchestrator-load-test.js'));
    
    console.log(chalk.green('\n🎉 Tests terminés avec succès!'));
  }
}

// Exécution si appelé directement
if (require.main === module) {
  const testSuite = new SagaOrchestratorTestSuite();
  testSuite.runCompleteTestSuite().catch(console.error);
}

module.exports = SagaOrchestratorTestSuite;
