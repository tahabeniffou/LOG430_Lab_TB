/**
 * @fileoverview Service Application Checkout - Application Layer (DDD)
 * @description Orchestration des cas d'usage métier pour le checkout des commandes
 */

const { Commande } = require('../domain/Commande');
const axios = require('axios');

class CheckoutApplicationService {
    constructor(commandeRepository) {
        this.commandeRepository = commandeRepository;
        this.panierServiceUrl = process.env.PANIER_SERVICE_URL || 'http://localhost:8000/api/paniers';
        this.stockServiceUrl = process.env.STOCK_SERVICE_URL || 'http://localhost:8000/api/stocks';
        this.venteServiceUrl = process.env.VENTE_SERVICE_URL || 'http://localhost:8000/api/ventes';
    }

    // Cas d'usage : Valider une commande depuis un panier
    async validerCommande(clientId, donneesPaiement) {
        try {
            // 1. Récupérer le panier du client
            const panier = await this.obtenirPanier(clientId);
            if (!panier || !panier.articles || panier.articles.length === 0) {
                throw new Error('Panier vide ou non trouvé');
            }

            // 2. Vérifier la disponibilité du stock
            await this.verifierDisponibiliteStock(panier.articles);

            // 3. Créer la commande
            const commande = new Commande({
                clientId: clientId,
                articles: panier.articles,
                adresseLivraison: donneesPaiement.adresseLivraison,
                methodePaiement: donneesPaiement.methodePaiement
            });

            // 4. Valider la commande
            commande.valider();

            // 5. Simuler le paiement
            const paiementReussi = await this.traiterPaiement(commande, donneesPaiement);
            if (!paiementReussi) {
                throw new Error('Échec du paiement');
            }

            commande.confirmerPaiement();

            // 6. Sauvegarder la commande
            const commandeSauvegardee = await this.commandeRepository.sauvegarder(commande);

            // 7. Réserver le stock
            await this.reserverStock(commande.articles);

            // 8. Créer la vente dans le système POS
            await this.creerVente(commande);

            // 9. Vider le panier
            await this.viderPanier(clientId);

            // 10. Marquer en préparation
            commandeSauvegardee.marquerEnPreparation();
            await this.commandeRepository.sauvegarder(commandeSauvegardee);

            return {
                success: true,
                data: commandeSauvegardee.toObject(),
                message: 'Commande validée et confirmée avec succès'
            };

        } catch (error) {
            return {
                success: false,
                error: error.message,
                message: 'Erreur lors de la validation de la commande'
            };
        }
    }

    // Cas d'usage : Obtenir une commande
    async obtenirCommande(numeroCommande) {
        try {
            const commande = await this.commandeRepository.rechercherParNumero(numeroCommande);
            if (!commande) {
                throw new Error('Commande non trouvée');
            }

            return {
                success: true,
                data: commande.toObject(),
                message: 'Commande récupérée avec succès'
            };

        } catch (error) {
            return {
                success: false,
                error: error.message,
                message: 'Erreur lors de la récupération de la commande'
            };
        }
    }

    // Cas d'usage : Lister les commandes d'un client
    async listerCommandesClient(clientId) {
        try {
            const commandes = await this.commandeRepository.listerParClient(clientId);
            
            return {
                success: true,
                data: commandes.map(cmd => cmd.toObject()),
                count: commandes.length,
                message: 'Commandes récupérées avec succès'
            };

        } catch (error) {
            return {
                success: false,
                error: error.message,
                message: 'Erreur lors de la récupération des commandes'
            };
        }
    }

    // Cas d'usage : Lister toutes les commandes (admin)
    async listerToutesCommandes() {
        try {
            const commandes = await this.commandeRepository.listerTous();
            
            return {
                success: true,
                data: commandes.map(cmd => cmd.toObject()),
                count: commandes.length,
                message: 'Commandes récupérées avec succès'
            };

        } catch (error) {
            return {
                success: false,
                error: error.message,
                message: 'Erreur lors de la récupération des commandes'
            };
        }
    }

    // Cas d'usage : Mettre à jour le statut d'une commande
    async mettreAJourStatut(numeroCommande, nouveauStatut) {
        try {
            const commande = await this.commandeRepository.rechercherParNumero(numeroCommande);
            if (!commande) {
                throw new Error('Commande non trouvée');
            }

            // Appliquer la transition d'état selon le nouveau statut
            switch (nouveauStatut) {
                case 'EXPEDIEE':
                    commande.marquerExpediee();
                    break;
                case 'LIVREE':
                    commande.marquerLivree();
                    break;
                case 'ANNULEE':
                    commande.annuler();
                    // Libérer le stock en cas d'annulation
                    await this.libererStock(commande.articles);
                    break;
                default:
                    throw new Error(`Statut "${nouveauStatut}" non supporté`);
            }

            const commandeMiseAJour = await this.commandeRepository.sauvegarder(commande);

            return {
                success: true,
                data: commandeMiseAJour.toObject(),
                message: `Commande mise à jour vers ${nouveauStatut}`
            };

        } catch (error) {
            return {
                success: false,
                error: error.message,
                message: 'Erreur lors de la mise à jour du statut'
            };
        }
    }

    // === Méthodes utilitaires ===

    async obtenirPanier(clientId) {
        try {
            const response = await axios.get(`${this.panierServiceUrl}/client/${clientId}`, {
                timeout: 5000
            });
            return response.data.success ? response.data.data : null;
        } catch (error) {
            console.warn(`Impossible d'obtenir le panier du client ${clientId}:`, error.message);
            return null;
        }
    }

    async verifierDisponibiliteStock(articles) {
        for (const article of articles) {
            try {
                const response = await axios.get(`${this.stockServiceUrl}/${article.produitId}`, {
                    timeout: 5000
                });
                
                if (response.data.success && response.data.data) {
                    const stock = response.data.data;
                    if (stock.quantite < article.quantite) {
                        throw new Error(`Stock insuffisant pour ${article.nom || `produit ${article.produitId}`} (disponible: ${stock.quantite}, demandé: ${article.quantite})`);
                    }
                }
            } catch (error) {
                if (error.message.includes('Stock insuffisant')) {
                    throw error;
                }
                console.warn(`Impossible de vérifier le stock pour le produit ${article.produitId}:`, error.message);
            }
        }
    }

    async traiterPaiement(commande, donneesPaiement) {
        // Simulation d'un traitement de paiement
        // Dans un vrai système, on appellerait une passerelle de paiement
        
        console.log(`💳 Traitement paiement commande ${commande.numeroCommande}:`);
        console.log(`   Montant: ${commande.total}$`);
        console.log(`   Méthode: ${commande.methodePaiement}`);
        
        // Simuler une latence
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // Simuler un succès (95% de réussite)
        const succes = Math.random() > 0.05;
        
        if (succes) {
            console.log(`✅ Paiement réussi pour ${commande.numeroCommande}`);
        } else {
            console.log(`❌ Paiement échoué pour ${commande.numeroCommande}`);
        }
        
        return succes;
    }

    async reserverStock(articles) {
        for (const article of articles) {
            try {
                await axios.put(`${this.stockServiceUrl}/${article.produitId}`, {
                    operation: 'RESERVER',
                    quantite: article.quantite
                }, { timeout: 5000 });
            } catch (error) {
                console.warn(`Impossible de réserver le stock pour le produit ${article.produitId}:`, error.message);
            }
        }
    }

    async libererStock(articles) {
        for (const article of articles) {
            try {
                await axios.put(`${this.stockServiceUrl}/${article.produitId}`, {
                    operation: 'LIBERER',
                    quantite: article.quantite
                }, { timeout: 5000 });
            } catch (error) {
                console.warn(`Impossible de libérer le stock pour le produit ${article.produitId}:`, error.message);
            }
        }
    }

    async creerVente(commande) {
        try {
            const venteData = {
                clientId: commande.clientId,
                articles: commande.articles.map(article => ({
                    produitId: article.produitId,
                    quantite: article.quantite,
                    prix: article.prix
                })),
                total: commande.total,
                numeroCommande: commande.numeroCommande
            };

            await axios.post(this.venteServiceUrl, venteData, {
                timeout: 5000
            });
        } catch (error) {
            console.warn(`Impossible de créer la vente pour la commande ${commande.numeroCommande}:`, error.message);
        }
    }

    async viderPanier(clientId) {
        try {
            await axios.delete(`${this.panierServiceUrl}/client/${clientId}`, {
                timeout: 5000
            });
        } catch (error) {
            console.warn(`Impossible de vider le panier du client ${clientId}:`, error.message);
        }
    }
}

module.exports = CheckoutApplicationService;
