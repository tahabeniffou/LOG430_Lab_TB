/**
 * @fileoverview Service Application Panier - Application Layer (DDD)
 * @description Orchestration des cas d'usage métier pour les paniers
 */

const { Panier } = require('../domain/Panier');
const axios = require('axios');

class PanierApplicationService {
    constructor(panierRepository) {
        this.panierRepository = panierRepository;
        this.produitServiceUrl = process.env.PRODUIT_SERVICE_URL || 'http://localhost:8000/api/produits';
    }

    // Cas d'usage : Obtenir le panier d'un client
    async obtenirPanier(clientId) {
        try {
            let panier = await this.panierRepository.rechercherParClientId(clientId);
            
            if (!panier) {
                // Créer un nouveau panier vide
                panier = new Panier({ clientId });
                panier = await this.panierRepository.sauvegarder(panier);
            }

            // Enrichir avec les informations produits
            const panierEnrichi = await this.enrichirAvecInfosProduits(panier);

            return {
                success: true,
                data: panierEnrichi.toObject(),
                message: 'Panier récupéré avec succès'
            };

        } catch (error) {
            return {
                success: false,
                error: error.message,
                message: 'Erreur lors de la récupération du panier'
            };
        }
    }

    // Cas d'usage : Ajouter un article au panier
    async ajouterArticle(clientId, produitId, quantite) {
        try {
            // Valider le produit existe et récupérer son prix
            const infoProduit = await this.obtenirInfoProduit(produitId);
            if (!infoProduit) {
                throw new Error('Produit non trouvé');
            }

            // Obtenir ou créer le panier
            let panier = await this.panierRepository.rechercherParClientId(clientId);
            if (!panier) {
                panier = new Panier({ clientId });
            }

            // Appliquer la règle métier
            panier.ajouterArticle(produitId, quantite, infoProduit.prix);

            // Persister
            const panierSauvegarde = await this.panierRepository.sauvegarder(panier);
            const panierEnrichi = await this.enrichirAvecInfosProduits(panierSauvegarde);

            return {
                success: true,
                data: panierEnrichi.toObject(),
                message: 'Article ajouté au panier avec succès'
            };

        } catch (error) {
            return {
                success: false,
                error: error.message,
                message: 'Erreur lors de l\'ajout de l\'article'
            };
        }
    }

    // Cas d'usage : Modifier la quantité d'un article
    async modifierQuantiteArticle(clientId, produitId, nouvelleQuantite) {
        try {
            const panier = await this.panierRepository.rechercherParClientId(clientId);
            if (!panier) {
                throw new Error('Panier non trouvé');
            }

            panier.modifierQuantiteArticle(produitId, nouvelleQuantite);
            
            const panierSauvegarde = await this.panierRepository.sauvegarder(panier);
            const panierEnrichi = await this.enrichirAvecInfosProduits(panierSauvegarde);

            return {
                success: true,
                data: panierEnrichi.toObject(),
                message: 'Quantité modifiée avec succès'
            };

        } catch (error) {
            return {
                success: false,
                error: error.message,
                message: 'Erreur lors de la modification de la quantité'
            };
        }
    }

    // Cas d'usage : Retirer un article du panier
    async retirerArticle(clientId, produitId) {
        try {
            const panier = await this.panierRepository.rechercherParClientId(clientId);
            if (!panier) {
                throw new Error('Panier non trouvé');
            }

            panier.retirerArticle(produitId);
            
            const panierSauvegarde = await this.panierRepository.sauvegarder(panier);
            const panierEnrichi = await this.enrichirAvecInfosProduits(panierSauvegarde);

            return {
                success: true,
                data: panierEnrichi.toObject(),
                message: 'Article retiré du panier avec succès'
            };

        } catch (error) {
            return {
                success: false,
                error: error.message,
                message: 'Erreur lors de la suppression de l\'article'
            };
        }
    }

    // Cas d'usage : Vider le panier
    async viderPanier(clientId) {
        try {
            const panier = await this.panierRepository.rechercherParClientId(clientId);
            if (!panier) {
                throw new Error('Panier non trouvé');
            }

            panier.vider();
            
            const panierSauvegarde = await this.panierRepository.sauvegarder(panier);

            return {
                success: true,
                data: panierSauvegarde.toObject(),
                message: 'Panier vidé avec succès'
            };

        } catch (error) {
            return {
                success: false,
                error: error.message,
                message: 'Erreur lors du vidage du panier'
            };
        }
    }

    // Cas d'usage : Lister tous les paniers (admin)
    async listerPaniers() {
        try {
            const paniers = await this.panierRepository.listerTous();
            
            return {
                success: true,
                data: paniers.map(panier => panier.toObject()),
                count: paniers.length,
                message: 'Paniers récupérés avec succès'
            };

        } catch (error) {
            return {
                success: false,
                error: error.message,
                message: 'Erreur lors de la récupération des paniers'
            };
        }
    }

    // Méthode utilitaire : Enrichir avec infos produits
    async enrichirAvecInfosProduits(panier) {
        try {
            for (const article of panier.articles) {
                if (!article.nom) {
                    const infoProduit = await this.obtenirInfoProduit(article.produitId);
                    if (infoProduit) {
                        article.nom = infoProduit.nom;
                    }
                }
            }
            return panier;
        } catch (error) {
            console.warn('Impossible d\'enrichir avec les infos produits:', error.message);
            return panier;
        }
    }

    // Méthode utilitaire : Obtenir info produit depuis le microservice
    async obtenirInfoProduit(produitId) {
        try {
            const response = await axios.get(`${this.produitServiceUrl}/${produitId}`, {
                timeout: 5000
            });
            
            if (response.data.success && response.data.data) {
                return response.data.data;
            }
            return null;
        } catch (error) {
            console.warn(`Impossible d'obtenir les infos du produit ${produitId}:`, error.message);
            return { prix: 0, nom: `Produit ${produitId}` }; // Valeur par défaut
        }
    }
}

module.exports = PanierApplicationService;
