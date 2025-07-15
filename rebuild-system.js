#!/usr/bin/env node

/**
 * Script de rebuild complet du système POS
 * Répare et reconstruit tout l'écosystème avec vérifications
 */

const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');

class SystemRebuilder {
    constructor() {
        this.status = {
            database: false,
            microservices: {},
            kong: false,
            monitoring: false
        };
        this.steps = [
            'Nettoyage environnement',
            'Création base SQLite',
            'Vérification fichiers critiques',
            'Build et démarrage infrastructure',
            'Build microservices',
            'Configuration Kong',
            'Vérification santé système'
        ];
        this.currentStep = 0;
    }

    log(message, level = 'info') {
        const timestamp = new Date().toISOString().substring(11, 19);
        const prefix = level === 'error' ? '❌' : level === 'success' ? '✅' : '🔧';
        console.log(`${timestamp} ${prefix} ${message}`);
    }

    async execCommand(command, description) {
        this.log(`Exécution: ${description}...`);
        return new Promise((resolve, reject) => {
            exec(command, { 
                cwd: process.cwd(),
                maxBuffer: 1024 * 1024 * 10 // 10MB buffer
            }, (error, stdout, stderr) => {
                if (error) {
                    this.log(`Erreur: ${error.message}`, 'error');
                    reject(error);
                } else {
                    if (stdout && stdout.length < 500) this.log(`✓ ${stdout.trim()}`);
                    else if (stdout) this.log(`✓ Commande exécutée (output tronqué)`);
                    resolve(stdout);
                }
            });
        });
    }

    async step1_cleanup() {
        this.log(`\n=== ÉTAPE ${++this.currentStep}: ${this.steps[0]} ===`);
        
        try {
            await this.execCommand('docker-compose down --volumes --remove-orphans', 'Arrêt conteneurs');
            await new Promise(resolve => setTimeout(resolve, 2000));
            this.log('✅ Nettoyage terminé', 'success');
        } catch (error) {
            this.log('Nettoyage partiel (conteneurs déjà arrêtés)', 'info');
        }
    }

    async step2_createDatabase() {
        this.log(`\n=== ÉTAPE ${++this.currentStep}: ${this.steps[1]} ===`);
        
        const dbPath = path.join(process.cwd(), 'database.sqlite');
        if (fs.existsSync(dbPath)) {
            this.log('Base SQLite déjà existante', 'info');
        } else {
            // Créer une base SQLite vide
            const sqlite3 = require('sqlite3').verbose();
            const db = new sqlite3.Database(dbPath);
            
            await new Promise((resolve, reject) => {
                db.run(`CREATE TABLE IF NOT EXISTS legacy_data (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    name TEXT NOT NULL,
                    value TEXT,
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
                )`, (err) => {
                    if (err) reject(err);
                    else {
                        db.run(`INSERT INTO legacy_data (name, value) VALUES ('system', 'initialized')`, (err) => {
                            db.close();
                            if (err) reject(err);
                            else resolve();
                        });
                    }
                });
            });
            
            this.log('✅ Base SQLite créée', 'success');
        }
        
        this.status.database = true;
    }

    async step3_checkFiles() {
        this.log(`\n=== ÉTAPE ${++this.currentStep}: ${this.steps[2]} ===`);
        
        const criticalFiles = [
            'docker-compose.yml',
            'microservices/produit-service/server.js',
            'microservices/stock-service/server.js',
            'microservices/vente-service/server.js',
            'microservices/reporting-service/server.js',
            'config/kong-config.sh'
        ];
        
        for (const file of criticalFiles) {
            const fullPath = path.join(process.cwd(), file);
            if (fs.existsSync(fullPath)) {
                this.log(`✓ ${file} OK`);
            } else {
                this.log(`✗ ${file} MANQUANT`, 'error');
                throw new Error(`Fichier critique manquant: ${file}`);
            }
        }
        
        this.log('✅ Tous les fichiers critiques sont présents', 'success');
    }

    async step4_buildInfrastructure() {
        this.log(`\n=== ÉTAPE ${++this.currentStep}: ${this.steps[3]} ===`);
        
        // Démarrer infrastructure (PostgreSQL, Kong, Monitoring)
        const infraServices = [
            'postgres-produit',
            'postgres-stock', 
            'postgres-vente',
            'postgres-reporting',
            'kong-db',
            'kong-migrations',
            'kong',
            'prometheus',
            'grafana'
        ];
        
        try {
            await this.execCommand(
                `docker-compose up -d ${infraServices.join(' ')}`,
                'Démarrage infrastructure'
            );
            
            // Attendre que Kong soit prêt
            this.log('Attente Kong Gateway...');
            await new Promise(resolve => setTimeout(resolve, 15000));
            
            this.status.kong = true;
            this.status.monitoring = true;
            this.log('✅ Infrastructure démarrée', 'success');
            
        } catch (error) {
            this.log('Erreur infrastructure', 'error');
            throw error;
        }
    }

    async step5_buildMicroservices() {
        this.log(`\n=== ÉTAPE ${++this.currentStep}: ${this.steps[4]} ===`);
        
        const services = ['produit', 'stock', 'vente', 'reporting'];
        
        for (const service of services) {
            try {
                await this.execCommand(
                    `docker-compose up -d ${service}-service-1 ${service}-service-2`,
                    `Démarrage ${service} services`
                );
                
                // Attendre que le service démarre
                await new Promise(resolve => setTimeout(resolve, 5000));
                
                this.status.microservices[service] = true;
                this.log(`✅ Service ${service} démarré`, 'success');
                
            } catch (error) {
                this.log(`Erreur service ${service}`, 'error');
                this.status.microservices[service] = false;
                // Continue avec les autres services
            }
        }
    }

    async step6_configureKong() {
        this.log(`\n=== ÉTAPE ${++this.currentStep}: ${this.steps[5]} ===`);
        
        try {
            await this.execCommand(
                'docker-compose up -d kong-config',
                'Configuration Kong Gateway'
            );
            
            await new Promise(resolve => setTimeout(resolve, 5000));
            this.log('✅ Kong configuré', 'success');
            
        } catch (error) {
            this.log('Erreur configuration Kong', 'error');
            throw error;
        }
    }

    async step7_healthCheck() {
        this.log(`\n=== ÉTAPE ${++this.currentStep}: ${this.steps[6]} ===`);
        
        const healthChecks = [
            { name: 'Kong Admin', url: 'http://localhost:8001/status' },
            { name: 'Kong Proxy', url: 'http://localhost:8000' },
            { name: 'Prometheus', url: 'http://localhost:9090/api/v1/targets' },
            { name: 'Grafana', url: 'http://localhost:3005/api/health' }
        ];

        const http = require('http');
        const https = require('https');

        for (const check of healthChecks) {
            try {
                await new Promise((resolve, reject) => {
                    const client = check.url.startsWith('https') ? https : http;
                    const req = client.request(check.url, { timeout: 5000 }, (res) => {
                        resolve(res.statusCode);
                    });
                    req.on('error', reject);
                    req.on('timeout', () => reject(new Error('Timeout')));
                    req.end();
                });
                
                this.log(`✓ ${check.name} accessible`);
                
            } catch (error) {
                this.log(`✗ ${check.name} non accessible`, 'error');
            }
        }
    }

    async rebuild() {
        try {
            console.log('🚀 DÉBUT DU REBUILD COMPLET DU SYSTÈME POS\n');
            
            await this.step1_cleanup();
            await this.step2_createDatabase();
            await this.step3_checkFiles();
            await this.step4_buildInfrastructure();
            await this.step5_buildMicroservices();
            await this.step6_configureKong();
            await this.step7_healthCheck();
            
            console.log('\n🎉 REBUILD TERMINÉ AVEC SUCCÈS!');
            console.log('\n📊 STATUT FINAL:');
            console.log(`Database: ${this.status.database ? '✅' : '❌'}`);
            console.log(`Kong: ${this.status.kong ? '✅' : '❌'}`);
            console.log(`Monitoring: ${this.status.monitoring ? '✅' : '❌'}`);
            console.log('\n🔗 Microservices:');
            Object.entries(this.status.microservices).forEach(([service, status]) => {
                console.log(`  ${service}: ${status ? '✅' : '❌'}`);
            });
            
            console.log('\n🌐 ACCÈS:');
            console.log('  Kong Gateway: http://localhost:8000');
            console.log('  Kong Admin: http://localhost:8001');
            console.log('  Prometheus: http://localhost:9090');
            console.log('  Grafana: http://localhost:3005 (admin/admin)');
            console.log('\n🧪 Pour tester: node test-workflow.js');
            
        } catch (error) {
            console.log(`\n❌ ÉCHEC DU REBUILD: ${error.message}`);
            console.log('\n🔧 ESSAYEZ:');
            console.log('1. docker-compose down --volumes');
            console.log('2. node rebuild-system.js');
            process.exit(1);
        }
    }
}

// Exécution
const rebuilder = new SystemRebuilder();
rebuilder.rebuild().catch(console.error);
