/**
 * @fileoverview Entité Panier - Domain Layer (DDD)
 * @description Représente un panier d'achat avec ses règles métier
 */

class Panier {
    constructor({
        id = null,
        clientId,
        articles = [],
        dateCreation = new Date(),
        dateMiseAJour = new Date(),
        statut = 'ACTIF'
    }) {
        this.validateClientId(clientId);
        
        this.id = id;
        this.clientId = clientId;
        this.articles = articles.map(article => new ArticlePanier(article));
        this.dateCreation = dateCreation;
        this.dateMiseAJour = dateMiseAJour;
        this.statut = statut;
    }

    // Validation des règles métier
    validateClientId(clientId) {
        if (!clientId || (typeof clientId !== 'number' && typeof clientId !== 'string')) {
            throw new Error('ID client requis');
        }
    }

    // Méthodes métier - Gestion des articles
    ajouterArticle(produitId, quantite, prix) {
        if (!produitId || quantite <= 0 || prix < 0) {
            throw new Error('Données article invalides');
        }

        const articleExistant = this.articles.find(a => a.produitId === produitId);
        
        if (articleExistant) {
            articleExistant.modifierQuantite(articleExistant.quantite + quantite);
        } else {
            this.articles.push(new ArticlePanier({
                produitId,
                quantite,
                prix
            }));
        }
        
        this.dateMiseAJour = new Date();
    }

    modifierQuantiteArticle(produitId, nouvelleQuantite) {
        if (nouvelleQuantite < 0) {
            throw new Error('Quantité ne peut pas être négative');
        }

        const article = this.articles.find(a => a.produitId === produitId);
        if (!article) {
            throw new Error('Article non trouvé dans le panier');
        }

        if (nouvelleQuantite === 0) {
            this.retirerArticle(produitId);
        } else {
            article.modifierQuantite(nouvelleQuantite);
            this.dateMiseAJour = new Date();
        }
    }

    retirerArticle(produitId) {
        const index = this.articles.findIndex(a => a.produitId === produitId);
        if (index === -1) {
            throw new Error('Article non trouvé dans le panier');
        }

        this.articles.splice(index, 1);
        this.dateMiseAJour = new Date();
    }

    vider() {
        this.articles = [];
        this.dateMiseAJour = new Date();
    }

    // Calculs métier
    calculerTotal() {
        return this.articles.reduce((total, article) => {
            return total + article.calculerSousTotal();
        }, 0);
    }

    calculerNombreArticles() {
        return this.articles.reduce((total, article) => {
            return total + article.quantite;
        }, 0);
    }

    estVide() {
        return this.articles.length === 0;
    }

    // États du panier
    marquerCommeCommande() {
        this.statut = 'COMMANDE';
        this.dateMiseAJour = new Date();
    }

    marquerCommeAbandon() {
        this.statut = 'ABANDONNE';
        this.dateMiseAJour = new Date();
    }

    estActif() {
        return this.statut === 'ACTIF';
    }

    // Sérialisation
    toObject() {
        return {
            id: this.id,
            clientId: this.clientId,
            articles: this.articles.map(a => a.toObject()),
            total: this.calculerTotal(),
            nombreArticles: this.calculerNombreArticles(),
            dateCreation: this.dateCreation,
            dateMiseAJour: this.dateMiseAJour,
            statut: this.statut
        };
    }
}

/**
 * Value Object pour un article dans le panier
 */
class ArticlePanier {
    constructor({ produitId, quantite, prix, nom = null }) {
        this.validateDonnees(produitId, quantite, prix);
        
        this.produitId = produitId;
        this.quantite = quantite;
        this.prix = prix;
        this.nom = nom;
    }

    validateDonnees(produitId, quantite, prix) {
        if (!produitId) {
            throw new Error('ID produit requis');
        }
        if (!quantite || quantite <= 0) {
            throw new Error('Quantité doit être positive');
        }
        if (prix < 0) {
            throw new Error('Prix ne peut pas être négatif');
        }
    }

    modifierQuantite(nouvelleQuantite) {
        if (nouvelleQuantite <= 0) {
            throw new Error('Quantité doit être positive');
        }
        this.quantite = nouvelleQuantite;
    }

    calculerSousTotal() {
        return this.quantite * this.prix;
    }

    toObject() {
        return {
            produitId: this.produitId,
            quantite: this.quantite,
            prix: this.prix,
            nom: this.nom,
            sousTotal: this.calculerSousTotal()
        };
    }
}

module.exports = { Panier, ArticlePanier };
