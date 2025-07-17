/**
 * @fileoverview Repository Sequelize Panier - Infrastructure Layer (DDD)
 */

const { Panier, ArticlePanier } = require('../domain/Panier');
const { PanierModel, ArticlePanierModel } = require('./database');

class SequelizePanierRepository {
    
    async sauvegarder(panier) {
        try {
            let panierModel;
            
            if (panier.id) {
                // Mise à jour
                panierModel = await PanierModel.findByPk(panier.id, {
                    include: [{ model: ArticlePanierModel, as: 'articles' }]
                });
                
                if (!panierModel) {
                    throw new Error('Panier non trouvé pour mise à jour');
                }
                
                // Mettre à jour le panier
                await panierModel.update({
                    statut: panier.statut,
                    dateMiseAJour: panier.dateMiseAJour
                });
                
                // Supprimer les anciens articles
                await ArticlePanierModel.destroy({
                    where: { panierId: panier.id }
                });
                
            } else {
                // Création
                panierModel = await PanierModel.create({
                    clientId: panier.clientId,
                    statut: panier.statut,
                    dateCreation: panier.dateCreation,
                    dateMiseAJour: panier.dateMiseAJour
                });
                panier.id = panierModel.id;
            }

            // Créer les nouveaux articles
            for (const article of panier.articles) {
                await ArticlePanierModel.create({
                    panierId: panier.id,
                    produitId: article.produitId,
                    quantite: article.quantite,
                    prix: article.prix,
                    nom: article.nom
                });
            }

            // Recharger avec les articles
            const panierComplet = await PanierModel.findByPk(panier.id, {
                include: [{ model: ArticlePanierModel, as: 'articles' }]
            });

            return this.toDomainEntity(panierComplet);
            
        } catch (error) {
            throw new Error(`Erreur sauvegarde panier: ${error.message}`);
        }
    }

    async rechercherParId(id) {
        try {
            const panierModel = await PanierModel.findByPk(id, {
                include: [{ model: ArticlePanierModel, as: 'articles' }]
            });
            return panierModel ? this.toDomainEntity(panierModel) : null;
        } catch (error) {
            throw new Error(`Erreur recherche panier par ID: ${error.message}`);
        }
    }

    async rechercherParClientId(clientId) {
        try {
            const panierModel = await PanierModel.findOne({
                where: { 
                    clientId: clientId,
                    statut: 'ACTIF'  // Seulement le panier actif
                },
                include: [{ model: ArticlePanierModel, as: 'articles' }]
            });
            return panierModel ? this.toDomainEntity(panierModel) : null;
        } catch (error) {
            throw new Error(`Erreur recherche panier par client: ${error.message}`);
        }
    }

    async listerTous() {
        try {
            const paniersModel = await PanierModel.findAll({
                include: [{ model: ArticlePanierModel, as: 'articles' }],
                order: [['dateMiseAJour', 'DESC']]
            });
            return paniersModel.map(model => this.toDomainEntity(model));
        } catch (error) {
            throw new Error(`Erreur liste paniers: ${error.message}`);
        }
    }

    async supprimer(id) {
        try {
            const result = await PanierModel.destroy({
                where: { id }
            });
            return result > 0;
        } catch (error) {
            throw new Error(`Erreur suppression panier: ${error.message}`);
        }
    }

    async compterTous() {
        try {
            return await PanierModel.count();
        } catch (error) {
            throw new Error(`Erreur comptage paniers: ${error.message}`);
        }
    }

    // Conversion Sequelize Model vers Domain Entity
    toDomainEntity(panierModel) {
        const articles = panierModel.articles?.map(articleModel => 
            new ArticlePanier({
                produitId: articleModel.produitId,
                quantite: articleModel.quantite,
                prix: parseFloat(articleModel.prix),
                nom: articleModel.nom
            })
        ) || [];

        return new Panier({
            id: panierModel.id,
            clientId: panierModel.clientId,
            articles: articles,
            dateCreation: panierModel.dateCreation,
            dateMiseAJour: panierModel.dateMiseAJour,
            statut: panierModel.statut
        });
    }
}

module.exports = SequelizePanierRepository;
