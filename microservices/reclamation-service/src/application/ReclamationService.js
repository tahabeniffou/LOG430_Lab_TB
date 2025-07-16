/**
 * Service de gestion des réclamations avec Event Sourcing
 */
class ReclamationService {
    constructor(eventStore, messageBroker) {
        this.eventStore = eventStore;
        this.messageBroker = messageBroker;
    }

    async creerReclamation(reclamationData) {
        const reclamationId = require('uuid').v4();
        
        const eventData = {
            ...reclamationData,
            dateCreation: new Date(),
            statut: 'ouverte'
        };

        // Sauvegarder l'événement avec la méthode existante
        const event = await this.eventStore.appendEvent(
            reclamationId,
            'Reclamation', 
            'ReclamationCreated',
            eventData
        );
        
        // Publier l'événement
        await this.messageBroker.publish('reclamation.created', event);
        
        return { reclamationId, event };
    }

    async mettreAJourStatut(reclamationId, nouveauStatut) {
        const eventData = {
            reclamationId,
            nouveauStatut,
            dateModification: new Date()
        };

        const event = await this.eventStore.appendEvent(
            reclamationId,
            'Reclamation',
            'ReclamationStatusUpdated',
            eventData
        );

        await this.messageBroker.publish('reclamation.status.updated', event);
        
        return { event };
    }

    async obtenirReclamation(reclamationId) {
        try {
            const events = await this.eventStore.getAggregateEvents(reclamationId);
            
            // Reconstituer l'état à partir des événements
            let reclamation = null;
            
            for (const event of events) {
                switch (event.eventType) {
                    case 'ReclamationCreated':
                        reclamation = {
                            id: reclamationId,
                            ...event.eventData
                        };
                        break;
                    case 'ReclamationStatusUpdated':
                        if (reclamation) {
                            reclamation.statut = event.eventData.nouveauStatut;
                            reclamation.dateModification = event.eventData.dateModification;
                        }
                        break;
                }
            }
            
            return reclamation;
        } catch (error) {
            console.error('Erreur récupération réclamation:', error);
            return null;
        }
    }

    async listerReclamations() {
        // Pour simplifier, retourne quelques exemples
        return [
            {
                id: '1',
                titre: 'Réclamation exemple 1',
                description: 'Description de la réclamation',
                statut: 'ouverte',
                dateCreation: new Date()
            },
            {
                id: '2',
                titre: 'Réclamation exemple 2',
                description: 'Autre réclamation',
                statut: 'fermee',
                dateCreation: new Date()
            }
        ];
    }
}

module.exports = ReclamationService;
