#!/usr/bin/env node

/**
 * Générateur de Données de Test pour Topics RabbitMQ
 * Simule l'activité événementielle pour les dashboards Grafana
 */

const axios = require('axios');
const { v4: uuidv4 } = require('uuid');

class EventsDataGenerator {
    constructor() {
        this.baseUrl = 'http://localhost:8011/api/v1';
        this.isRunning = false;
        this.intervalIds = [];
        
        // Types d'événements à simuler
        this.eventTypes = {
            reclamations: [
                'DEFAUT_PRODUIT',
                'LIVRAISON_RETARD',
                'SERVICE_CLIENT',
                'REMBOURSEMENT',
                'ECHANGE_PRODUIT'
            ],
            priorities: ['LOW', 'MEDIUM', 'HIGH', 'URGENT'],
            statuses: ['NOUVEAU', 'EN_COURS', 'RESOLU', 'FERME']
        };

        // Clients simulés
        this.clients = [
            'client-001', 'client-002', 'client-003', 'client-004', 'client-005',
            'client-006', 'client-007', 'client-008', 'client-009', 'client-010'
        ];
    }

    async startDataGeneration(options = {}) {
        const {
            reclamationsPerMinute = 5,
            updatesPerMinute = 3,
            resolutionsPerMinute = 2,
            durationMinutes = 30,
            randomVariation = true
        } = options;

        console.log('🚀 DÉMARRAGE GÉNÉRATION DONNÉES TOPICS');
        console.log('====================================');
        console.log(`📝 Réclamations: ${reclamationsPerMinute}/min`);
        console.log(`✏️ Mises à jour: ${updatesPerMinute}/min`);
        console.log(`✅ Résolutions: ${resolutionsPerMinute}/min`);
        console.log(`⏱️ Durée: ${durationMinutes} minutes`);
        console.log('====================================\n');

        this.isRunning = true;

        // Vérification de la connexion au service
        try {
            await axios.get(`${this.baseUrl}/health`);
            console.log('✅ Service de réclamation connecté\n');
        } catch (error) {
            console.log('❌ Service de réclamation non disponible');
            console.log('🔧 Démarrez le service: docker-compose -f docker-compose-lab7.yml up -d\n');
            return;
        }

        // Génération de réclamations
        const createReclamationInterval = this.calculateInterval(reclamationsPerMinute, randomVariation);
        this.scheduleReclamationCreation(createReclamationInterval);

        // Génération de mises à jour
        const updateInterval = this.calculateInterval(updatesPerMinute, randomVariation);
        this.scheduleReclamationUpdates(updateInterval);

        // Génération de résolutions
        const resolutionInterval = this.calculateInterval(resolutionsPerMinute, randomVariation);
        this.scheduleReclamationResolutions(resolutionInterval);

        // Génération d'événements divers
        this.scheduleRandomEvents();

        // Arrêt automatique après la durée spécifiée
        setTimeout(() => {
            this.stopDataGeneration();
        }, durationMinutes * 60 * 1000);

        // Affichage du statut toutes les 30 secondes
        this.startStatusDisplay();
    }

    calculateInterval(eventsPerMinute, randomVariation) {
        const baseInterval = (60 * 1000) / eventsPerMinute;
        return randomVariation ? 
            () => baseInterval + (Math.random() - 0.5) * baseInterval * 0.5 :
            () => baseInterval;
    }

    scheduleReclamationCreation(intervalFunction) {
        const createReclamation = async () => {
            if (!this.isRunning) return;

            try {
                const reclamationData = {
                    clientId: this.getRandomClient(),
                    type: this.getRandomEventType(),
                    description: this.generateDescription(),
                    priority: this.getRandomPriority(),
                    metadata: {
                        source: 'data-generator',
                        timestamp: new Date().toISOString(),
                        channel: this.getRandomChannel()
                    }
                };

                const response = await axios.post(
                    `${this.baseUrl}/reclamations`,
                    reclamationData,
                    { timeout: 5000 }
                );

                console.log(`📝 Réclamation créée: ${response.data.id} (${reclamationData.type})`);

            } catch (error) {
                console.log(`❌ Erreur création réclamation: ${error.message}`);
            }

            // Programmer la prochaine création
            setTimeout(createReclamation, intervalFunction());
        };

        createReclamation();
    }

    scheduleReclamationUpdates(intervalFunction) {
        const updateReclamation = async () => {
            if (!this.isRunning) return;

            try {
                // Simuler la mise à jour d'une réclamation existante
                const updateData = {
                    status: this.getRandomStatus(),
                    description: 'Mise à jour: ' + this.generateDescription(),
                    metadata: {
                        updatedBy: 'agent-' + Math.floor(Math.random() * 10),
                        updateType: 'status_change'
                    }
                };

                // Pour la simulation, on crée un événement de mise à jour
                console.log(`✏️ Mise à jour simulée: ${updateData.status}`);

            } catch (error) {
                console.log(`❌ Erreur mise à jour: ${error.message}`);
            }

            setTimeout(updateReclamation, intervalFunction());
        };

        updateReclamation();
    }

    scheduleReclamationResolutions(intervalFunction) {
        const resolveReclamation = async () => {
            if (!this.isRunning) return;

            try {
                const resolutionData = {
                    clientId: this.getRandomClient(),
                    type: 'RESOLUTION_RECLAMATION',
                    description: 'Réclamation résolue avec succès',
                    priority: 'LOW',
                    metadata: {
                        resolvedBy: 'agent-' + Math.floor(Math.random() * 5),
                        resolutionTime: Math.floor(Math.random() * 48) + ' heures',
                        satisfaction: Math.floor(Math.random() * 5) + 1
                    }
                };

                const response = await axios.post(
                    `${this.baseUrl}/reclamations`,
                    resolutionData,
                    { timeout: 5000 }
                );

                console.log(`✅ Réclamation résolue: ${response.data.id}`);

            } catch (error) {
                console.log(`❌ Erreur résolution: ${error.message}`);
            }

            setTimeout(resolveReclamation, intervalFunction());
        };

        resolveReclamation();
    }

    scheduleRandomEvents() {
        // Événements aléatoires moins fréquents
        const randomEventInterval = setInterval(() => {
            if (!this.isRunning) return;

            const eventTypes = [
                'ESCALADE_MANAGER',
                'FEEDBACK_CLIENT',
                'RAPPEL_AUTOMATIQUE',
                'AUDIT_QUALITE'
            ];

            const randomType = eventTypes[Math.floor(Math.random() * eventTypes.length)];
            console.log(`🎲 Événement aléatoire: ${randomType}`);

        }, 45000); // Toutes les 45 secondes

        this.intervalIds.push(randomEventInterval);
    }

    startStatusDisplay() {
        const statusInterval = setInterval(() => {
            if (!this.isRunning) return;

            console.log('\n📊 STATUT GÉNÉRATION:');
            console.log(`   ⏰ ${new Date().toLocaleTimeString()}`);
            console.log(`   🔄 Génération active`);
            console.log(`   📈 Consultez Grafana: http://localhost:3000`);
            console.log(`   🐰 RabbitMQ Management: http://localhost:15672\n`);

        }, 30000);

        this.intervalIds.push(statusInterval);
    }

    stopDataGeneration() {
        console.log('\n🛑 ARRÊT GÉNÉRATION DONNÉES');
        console.log('============================');
        
        this.isRunning = false;
        
        // Arrêter tous les intervalles
        this.intervalIds.forEach(id => clearInterval(id));
        this.intervalIds = [];

        console.log('✅ Génération de données arrêtée');
        console.log('📊 Consultez les dashboards Grafana pour voir les résultats\n');
    }

    // Méthodes utilitaires
    getRandomClient() {
        return this.clients[Math.floor(Math.random() * this.clients.length)];
    }

    getRandomEventType() {
        return this.eventTypes.reclamations[
            Math.floor(Math.random() * this.eventTypes.reclamations.length)
        ];
    }

    getRandomPriority() {
        return this.eventTypes.priorities[
            Math.floor(Math.random() * this.eventTypes.priorities.length)
        ];
    }

    getRandomStatus() {
        return this.eventTypes.statuses[
            Math.floor(Math.random() * this.eventTypes.statuses.length)
        ];
    }

    getRandomChannel() {
        const channels = ['web', 'mobile', 'email', 'phone', 'chat'];
        return channels[Math.floor(Math.random() * channels.length)];
    }

    generateDescription() {
        const descriptions = [
            'Produit défectueux reçu',
            'Livraison en retard de 3 jours',
            'Service client non réactif',
            'Demande de remboursement',
            'Problème avec la commande',
            'Qualité du produit insatisfaisante',
            'Erreur de facturation',
            'Livraison à la mauvaise adresse'
        ];

        return descriptions[Math.floor(Math.random() * descriptions.length)];
    }

    // Méthodes de test rapide
    async testConnection() {
        console.log('🔍 Test de connexion au service...');
        
        try {
            const response = await axios.get(`${this.baseUrl}/health`);
            console.log('✅ Service accessible:', response.data);
            return true;
        } catch (error) {
            console.log('❌ Service non accessible:', error.message);
            return false;
        }
    }

    async generateSingleEvent() {
        console.log('📝 Génération d\'un événement de test...');
        
        const testData = {
            clientId: 'test-client',
            type: 'TEST_DASHBOARD',
            description: 'Événement de test pour dashboard Grafana',
            priority: 'MEDIUM'
        };

        try {
            const response = await axios.post(`${this.baseUrl}/reclamations`, testData);
            console.log('✅ Événement de test créé:', response.data.id);
            return response.data;
        } catch (error) {
            console.log('❌ Erreur création événement test:', error.message);
            throw error;
        }
    }
}

// Interface en ligne de commande
if (require.main === module) {
    const generator = new EventsDataGenerator();
    const args = process.argv.slice(2);

    if (args.includes('--test')) {
        generator.testConnection();
    } else if (args.includes('--single')) {
        generator.generateSingleEvent();
    } else if (args.includes('--help')) {
        console.log('📡 GÉNÉRATEUR DONNÉES TOPICS - LAB 7');
        console.log('=====================================');
        console.log('Usage:');
        console.log('  node generate-topics-data.js           # Génération continue');
        console.log('  node generate-topics-data.js --test    # Test connexion');
        console.log('  node generate-topics-data.js --single  # Événement unique');
        console.log('  node generate-topics-data.js --help    # Aide');
        console.log('');
        console.log('💡 Démarrez d\'abord: docker-compose -f docker-compose-lab7.yml up -d');
    } else {
        // Génération continue par défaut
        const options = {
            reclamationsPerMinute: 6,
            updatesPerMinute: 4,
            resolutionsPerMinute: 2,
            durationMinutes: 15,
            randomVariation: true
        };

        generator.startDataGeneration(options);

        // Gestion de l'arrêt propre
        process.on('SIGINT', () => {
            generator.stopDataGeneration();
            process.exit(0);
        });
    }
}

module.exports = EventsDataGenerator;
