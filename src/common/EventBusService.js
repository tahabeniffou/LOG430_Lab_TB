// Service Event Bus pour communication asynchrone entre microservices
// Conforme aux standards Event-Driven Architecture

const redis = require('redis');

class EventBusService {
  constructor(redisUrl = 'redis://redis-events:6379') {
    this.publisher = null;
    this.subscriber = null;
    this.redisUrl = redisUrl;
    this.eventHandlers = new Map();
  }

  async initialize() {
    try {
      // Client pour publier des événements
      this.publisher = redis.createClient({ url: this.redisUrl });
      await this.publisher.connect();

      // Client pour s'abonner aux événements
      this.subscriber = redis.createClient({ url: this.redisUrl });
      await this.subscriber.connect();

      console.log('✅ Event Bus Service initialisé avec succès');
    } catch (error) {
      console.error('❌ Erreur initialisation Event Bus:', error);
      throw error;
    }
  }

  // Publier un événement
  async publish(eventType, eventData) {
    try {
      const event = {
        id: this.generateEventId(),
        type: eventType,
        data: eventData,
        timestamp: new Date().toISOString(),
        service: process.env.SERVICE_NAME || 'unknown-service'
      };

      await this.publisher.publish(eventType, JSON.stringify(event));
      console.log(`📤 Événement publié: ${eventType}`, event.id);
      
      return event.id;
    } catch (error) {
      console.error(`❌ Erreur publication événement ${eventType}:`, error);
      throw error;
    }
  }

  // S'abonner à un type d'événement
  async subscribe(eventType, handler) {
    try {
      this.eventHandlers.set(eventType, handler);
      
      await this.subscriber.subscribe(eventType, async (message) => {
        try {
          const event = JSON.parse(message);
          console.log(`📥 Événement reçu: ${eventType}`, event.id);
          
          await handler(event);
        } catch (error) {
          console.error(`❌ Erreur traitement événement ${eventType}:`, error);
        }
      });

      console.log(`✅ Abonnement créé pour: ${eventType}`);
    } catch (error) {
      console.error(`❌ Erreur abonnement ${eventType}:`, error);
      throw error;
    }
  }

  // Événements métier prédéfinis
  async publishProduitCree(produit) {
    return await this.publish('ProduitCree', {
      produitId: produit.id,
      nom: produit.nom,
      prix: produit.prix,
      categorie: produit.categorie
    });
  }

  async publishProduitModifie(produit) {
    return await this.publish('ProduitModifie', {
      produitId: produit.id,
      nom: produit.nom,
      prix: produit.prix,
      categorie: produit.categorie
    });
  }

  async publishVenteCreee(vente) {
    return await this.publish('VenteCreee', {
      venteId: vente.id,
      magasinId: vente.magasinId,
      utilisateurId: vente.utilisateurId,
      lignes: vente.lignes,
      montantTotal: vente.montantTotal
    });
  }

  async publishVenteTerminee(vente) {
    return await this.publish('VenteTerminee', {
      venteId: vente.id,
      lignes: vente.lignes,
      montantTotal: vente.montantTotal
    });
  }

  async publishStockModifie(stock) {
    return await this.publish('StockModifie', {
      produitId: stock.produitId,
      quantiteDisponible: stock.quantiteDisponible,
      quantiteReservee: stock.quantiteReservee,
      seuilMinimum: stock.seuilMinimum
    });
  }

  async publishStockFaible(stock) {
    return await this.publish('StockFaible', {
      produitId: stock.produitId,
      quantiteDisponible: stock.quantiteDisponible,
      seuilMinimum: stock.seuilMinimum
    });
  }

  // Event Handlers pour chaque service
  setupProduitServiceHandlers() {
    // Le produit service écoute ses propres événements si nécessaire
  }

  setupVenteServiceHandlers() {
    // Écouter les événements de stock pour validation
    this.subscribe('StockModifie', async (event) => {
      console.log('📦 Vente Service: Stock modifié pour produit', event.data.produitId);
      // Mettre à jour cache local si nécessaire
    });
  }

  setupStockServiceHandlers() {
    // Écouter les ventes pour décrémenter le stock
    this.subscribe('VenteTerminee', async (event) => {
      console.log('🛒 Stock Service: Traitement vente terminée', event.data.venteId);
      
      // Décrémenter stock pour chaque ligne de vente
      for (const ligne of event.data.lignes) {
        // Logique de décrémentation
        console.log(`📉 Décrémentation stock produit ${ligne.produitId}: -${ligne.quantite}`);
      }
    });

    // Écouter création de produit pour initialiser stock
    this.subscribe('ProduitCree', async (event) => {
      console.log('📦 Stock Service: Initialisation stock pour nouveau produit', event.data.produitId);
      // Créer entrée stock avec quantité 0
    });
  }

  setupReportingServiceHandlers() {
    // Écouter tous les événements pour analytics
    this.subscribe('VenteTerminee', async (event) => {
      console.log('📊 Reporting Service: Nouvelle vente pour analytics', event.data.venteId);
      // Mettre à jour métriques et rapports
    });

    this.subscribe('StockFaible', async (event) => {
      console.log('⚠️ Reporting Service: Alerte stock faible', event.data.produitId);
      // Générer alerte pour dashboard
    });
  }

  // Utilitaires
  generateEventId() {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  async disconnect() {
    try {
      if (this.publisher) await this.publisher.disconnect();
      if (this.subscriber) await this.subscriber.disconnect();
      console.log('✅ Event Bus Service déconnecté');
    } catch (error) {
      console.error('❌ Erreur déconnexion Event Bus:', error);
    }
  }
}

// Pattern Singleton pour Event Bus
let eventBusInstance = null;

function getEventBus(redisUrl) {
  if (!eventBusInstance) {
    eventBusInstance = new EventBusService(redisUrl);
  }
  return eventBusInstance;
}

module.exports = {
  EventBusService,
  getEventBus
};
