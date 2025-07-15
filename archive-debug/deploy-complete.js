#!/usr/bin/env node

/**
 * Script de déploiement complet du système POS
 * Déploie tous les composants avec 2 instances par microservice
 */

const { execSync } = require('child_process');

class POSDeployer {
    constructor() {
        this.services = [
            'postgres-produit',
            'postgres-stock', 
            'postgres-vente',
            'postgres-reporting',
            'kong-db',
            'kong-migrations',
            'kong-migrations-up',
            'kong',
            'produit-service-1',
            'produit-service-2',
            'stock-service-1',
            'stock-service-2',
            'vente-service-1',
            'vente-service-2',
            'reporting-service-1',
            'reporting-service-2',
            'legacy-service',
            'prometheus',
            'grafana',
            'kong-config'
        ];
    }

    execCommand(command, description) {
        console.log(`🔧 ${description}...`);
        try {
            const output = execSync(command, { 
                encoding: 'utf8',
                stdio: 'pipe',
                cwd: process.cwd()
            });
            console.log(`✅ ${description} terminé`);
            return output;
        } catch (error) {
            console.error(`❌ Erreur lors de ${description}:`);
            console.error(error.message);
            if (error.stdout) console.log('STDOUT:', error.stdout);
            if (error.stderr) console.log('STDERR:', error.stderr);
            throw error;
        }
    }

    async waitForService(serviceName, timeout = 60000) {
        console.log(`⏳ Attente du service ${serviceName}...`);
        const startTime = Date.now();
        
        while (Date.now() - startTime < timeout) {
            try {
                const result = execSync(`docker-compose ps ${serviceName}`, { 
                    encoding: 'utf8', 
                    stdio: 'pipe' 
                });
                
                if (result.includes('(healthy)') || result.includes('Up')) {
                    console.log(`✅ Service ${serviceName} prêt`);
                    return true;
                }
            } catch (error) {
                // Service pas encore prêt
            }
            
            await new Promise(resolve => setTimeout(resolve, 2000));
        }
        
        console.log(`⚠️  Timeout pour le service ${serviceName}`);
        return false;
    }

    async deployInfrastructure() {
        console.log('\n🏗️  === DÉPLOIEMENT INFRASTRUCTURE ===\n');
        
        // Bases de données PostgreSQL
        console.log('📊 Déploiement des bases de données...');
        this.execCommand('docker-compose up -d postgres-produit postgres-stock postgres-vente postgres-reporting kong-db', 
                        'Démarrage des bases PostgreSQL');
        
        await this.waitForService('postgres-produit');
        await this.waitForService('postgres-stock');
        await this.waitForService('postgres-vente');
        await this.waitForService('postgres-reporting');
        await this.waitForService('kong-db');
        
        // Kong Gateway
        console.log('🌐 Déploiement Kong Gateway...');
        this.execCommand('docker-compose up -d kong-migrations', 'Migrations Kong');
        await this.waitForService('kong-migrations');
        
        this.execCommand('docker-compose up -d kong-migrations-up', 'Finalisation migrations Kong');
        await this.waitForService('kong-migrations-up');
        
        this.execCommand('docker-compose up -d kong', 'Démarrage Kong');
        await this.waitForService('kong');
        
        // Monitoring
        console.log('📈 Déploiement monitoring...');
        this.execCommand('docker-compose up -d prometheus grafana', 'Démarrage Prometheus et Grafana');
        await this.waitForService('prometheus');
        await this.waitForService('grafana');
    }

    async deployMicroservices() {
        console.log('\n🚀 === DÉPLOIEMENT MICROSERVICES ===\n');
        
        // Déployer par paires (2 instances par service)
        const microservices = [
            ['produit-service-1', 'produit-service-2'],
            ['stock-service-1', 'stock-service-2'],
            ['vente-service-1', 'vente-service-2'],
            ['reporting-service-1', 'reporting-service-2']
        ];
        
        for (const [service1, service2] of microservices) {
            const serviceName = service1.split('-')[0];
            console.log(`📦 Déploiement service ${serviceName.toUpperCase()}...`);
            
            this.execCommand(`docker-compose up -d ${service1} ${service2}`, 
                           `Démarrage instances ${serviceName}`);
            
            await this.waitForService(service1);
            await this.waitForService(service2);
        }
        
        // Service Legacy
        console.log('🏛️  Déploiement service Legacy...');
        this.execCommand('docker-compose up -d legacy-service', 'Démarrage Legacy');
        await this.waitForService('legacy-service');
    }

    async configureKong() {
        console.log('\n⚙️  === CONFIGURATION KONG ===\n');
        
        this.execCommand('docker-compose up -d kong-config', 'Configuration Kong Gateway');
        await this.waitForService('kong-config');
        
        // Attendre un peu pour que la configuration soit appliquée
        await new Promise(resolve => setTimeout(resolve, 5000));
    }

    async verifyDeployment() {
        console.log('\n🔍 === VÉRIFICATION DÉPLOIEMENT ===\n');
        
        try {
            const status = this.execCommand('docker-compose ps', 'Vérification statut conteneurs');
            console.log('\n📊 Statut des conteneurs:');
            console.log(status);
            
            console.log('\n🎯 Endpoints disponibles:');
            console.log('  🌐 Kong Proxy: http://localhost:8000');
            console.log('  ⚙️  Kong Admin: http://localhost:8001');
            console.log('  📊 Prometheus: http://localhost:9090');
            console.log('  📈 Grafana: http://localhost:3005 (admin/admin)');
            console.log('  🏛️  Legacy: http://localhost:3000');
            console.log('  📦 Produit: http://localhost:3001, http://localhost:3011');
            console.log('  📊 Stock: http://localhost:3002, http://localhost:3012');
            console.log('  💰 Vente: http://localhost:3003, http://localhost:3013');
            console.log('  📈 Reporting: http://localhost:3004, http://localhost:3014');
            
        } catch (error) {
            console.error('❌ Erreur lors de la vérification');
        }
    }

    async deploy() {
        console.log('🚀 DÉMARRAGE DU DÉPLOIEMENT SYSTÈME POS COMPLET\n');
        console.log('📋 Services à déployer:', this.services.length);
        console.log('🔄 2 instances par microservice\n');
        
        try {
            // Nettoyer d'abord
            console.log('🧹 Nettoyage environnement...');
            try {
                this.execCommand('docker-compose down --volumes', 'Arrêt et nettoyage');
            } catch (error) {
                console.log('ℹ️  Aucun conteneur à arrêter');
            }
            
            // Déploiement étape par étape
            await this.deployInfrastructure();
            await this.deployMicroservices();
            await this.configureKong();
            await this.verifyDeployment();
            
            console.log('\n✅ DÉPLOIEMENT TERMINÉ AVEC SUCCÈS!');
            console.log('\n🧪 Lancer les tests avec: node test-workflow.js');
            
        } catch (error) {
            console.error('\n❌ ÉCHEC DU DÉPLOIEMENT:', error.message);
            console.log('\n🔧 Pour diagnostiquer: docker-compose logs [service-name]');
            process.exit(1);
        }
    }
}

// Lancement du déploiement
const deployer = new POSDeployer();
deployer.deploy().catch(console.error);
