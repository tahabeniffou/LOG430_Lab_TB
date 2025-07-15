/**
 * @fileoverview Entité Commande - Domain Layer (DDD)
 * @description Représente une commande validée avec ses règles métier
 */

const { v4: uuidv4 } = require('uuid');

class Commande {
    constructor({
        id = null,
        numeroCommande = null,
        clientId,
        articles = [],
        adresseLivraison,
        methodePaiement,
        sousTotal = 0,
        taxes = 0,
        fraisLivraison = 0,
        total = 0,
        statut = 'EN_ATTENTE',
        dateCreation = new Date(),
        dateMiseAJour = new Date()
    }) {
        this.validateDonnees(clientId, articles, adresseLivraison, methodePaiement);
        
        this.id = id;
        this.numeroCommande = numeroCommande || this.genererNumeroCommande();
        this.clientId = clientId;
        this.articles = articles.map(article => new ArticleCommande(article));
        this.adresseLivraison = adresseLivraison;
        this.methodePaiement = methodePaiement;
        this.sousTotal = sousTotal;
        this.taxes = taxes;
        this.fraisLivraison = fraisLivraison;
        this.total = total;
        this.statut = statut;
        this.dateCreation = dateCreation;
        this.dateMiseAJour = dateMiseAJour;
        
        // Recalculer les totaux si nécessaire
        if (this.total === 0) {
            this.calculerTotaux();
        }
    }

    // Validation des règles métier
    validateDonnees(clientId, articles, adresseLivraison, methodePaiement) {
        if (!clientId) {
            throw new Error('ID client requis');
        }
        if (!articles || articles.length === 0) {
            throw new Error('La commande doit contenir au moins un article');
        }
        if (!adresseLivraison || !adresseLivraison.trim()) {
            throw new Error('Adresse de livraison requise');
        }
        if (!methodePaiement || !methodePaiement.trim()) {
            throw new Error('Méthode de paiement requise');
        }
    }

    // Génération du numéro de commande unique
    genererNumeroCommande() {
        const timestamp = Date.now().toString(36).toUpperCase();
        const random = Math.random().toString(36).substr(2, 4).toUpperCase();
        return `CMD-${timestamp}-${random}`;
    }

    // Calculs métier
    calculerTotaux() {
        this.sousTotal = this.articles.reduce((total, article) => {
            return total + article.calculerSousTotal();
        }, 0);
        
        // Taxes (ex: 15% TPS+TVQ)
        this.taxes = this.sousTotal * 0.15;
        
        // Frais de livraison (gratuit si > 50$, sinon 10$)
        this.fraisLivraison = this.sousTotal >= 50 ? 0 : 10;
        
        this.total = this.sousTotal + this.taxes + this.fraisLivraison;
        
        // Arrondir à 2 décimales
        this.sousTotal = Math.round(this.sousTotal * 100) / 100;
        this.taxes = Math.round(this.taxes * 100) / 100;
        this.total = Math.round(this.total * 100) / 100;
    }

    // Gestion des états de commande
    valider() {
        if (this.statut !== 'EN_ATTENTE') {
            throw new Error('Seules les commandes en attente peuvent être validées');
        }
        this.statut = 'VALIDEE';
        this.dateMiseAJour = new Date();
    }

    confirmerPaiement() {
        if (this.statut !== 'VALIDEE') {
            throw new Error('La commande doit être validée avant confirmation du paiement');
        }
        this.statut = 'PAYEE';
        this.dateMiseAJour = new Date();
    }

    marquerEnPreparation() {
        if (this.statut !== 'PAYEE') {
            throw new Error('La commande doit être payée avant la préparation');
        }
        this.statut = 'EN_PREPARATION';
        this.dateMiseAJour = new Date();
    }

    marquerExpediee() {
        if (this.statut !== 'EN_PREPARATION') {
            throw new Error('La commande doit être en préparation avant expédition');
        }
        this.statut = 'EXPEDIEE';
        this.dateMiseAJour = new Date();
    }

    marquerLivree() {
        if (this.statut !== 'EXPEDIEE') {
            throw new Error('La commande doit être expédiée avant livraison');
        }
        this.statut = 'LIVREE';
        this.dateMiseAJour = new Date();
    }

    annuler() {
        const statutsAnnulables = ['EN_ATTENTE', 'VALIDEE', 'PAYEE'];
        if (!statutsAnnulables.includes(this.statut)) {
            throw new Error('Cette commande ne peut plus être annulée');
        }
        this.statut = 'ANNULEE';
        this.dateMiseAJour = new Date();
    }

    // Méthodes d'état
    estValidee() {
        return ['VALIDEE', 'PAYEE', 'EN_PREPARATION', 'EXPEDIEE', 'LIVREE'].includes(this.statut);
    }

    estTerminee() {
        return ['LIVREE', 'ANNULEE'].includes(this.statut);
    }

    // Sérialisation
    toObject() {
        return {
            id: this.id,
            numeroCommande: this.numeroCommande,
            clientId: this.clientId,
            articles: this.articles.map(a => a.toObject()),
            adresseLivraison: this.adresseLivraison,
            methodePaiement: this.methodePaiement,
            sousTotal: this.sousTotal,
            taxes: this.taxes,
            fraisLivraison: this.fraisLivraison,
            total: this.total,
            statut: this.statut,
            dateCreation: this.dateCreation,
            dateMiseAJour: this.dateMiseAJour
        };
    }
}

/**
 * Value Object pour un article dans la commande
 */
class ArticleCommande {
    constructor({ produitId, nom, quantite, prix }) {
        this.validateDonnees(produitId, nom, quantite, prix);
        
        this.produitId = produitId;
        this.nom = nom;
        this.quantite = quantite;
        this.prix = prix;
    }

    validateDonnees(produitId, nom, quantite, prix) {
        if (!produitId) {
            throw new Error('ID produit requis');
        }
        if (!nom || !nom.trim()) {
            throw new Error('Nom produit requis');
        }
        if (!quantite || quantite <= 0) {
            throw new Error('Quantité doit être positive');
        }
        if (prix < 0) {
            throw new Error('Prix ne peut pas être négatif');
        }
    }

    calculerSousTotal() {
        return this.quantite * this.prix;
    }

    toObject() {
        return {
            produitId: this.produitId,
            nom: this.nom,
            quantite: this.quantite,
            prix: this.prix,
            sousTotal: this.calculerSousTotal()
        };
    }
}

module.exports = { Commande, ArticleCommande };
