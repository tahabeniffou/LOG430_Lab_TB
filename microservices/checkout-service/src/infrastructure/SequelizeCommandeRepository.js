/**
 * @fileoverview Repository Sequelize Commande - Infrastructure Layer (DDD)
 */

const { Commande, ArticleCommande } = require('../domain/Commande');
const { CommandeModel, ArticleCommandeModel } = require('./database');

class SequelizeCommandeRepository {
    
    async sauvegarder(commande) {
        try {
            let commandeModel;
            
            if (commande.id) {
                // Mise à jour
                commandeModel = await CommandeModel.findByPk(commande.id, {
                    include: [{ model: ArticleCommandeModel, as: 'articles' }]
                });
                
                if (!commandeModel) {
                    throw new Error('Commande non trouvée pour mise à jour');
                }
                
                // Mettre à jour la commande
                await commandeModel.update({
                    statut: commande.statut,
                    sousTotal: commande.sousTotal,
                    taxes: commande.taxes,
                    fraisLivraison: commande.fraisLivraison,
                    total: commande.total,
                    dateMiseAJour: commande.dateMiseAJour
                });
                
            } else {
                // Création
                commandeModel = await CommandeModel.create({
                    numeroCommande: commande.numeroCommande,
                    clientId: commande.clientId,
                    adresseLivraison: commande.adresseLivraison,
                    methodePaiement: commande.methodePaiement,
                    sousTotal: commande.sousTotal,
                    taxes: commande.taxes,
                    fraisLivraison: commande.fraisLivraison,
                    total: commande.total,
                    statut: commande.statut,
                    dateCreation: commande.dateCreation,
                    dateMiseAJour: commande.dateMiseAJour
                });
                
                commande.id = commandeModel.id;
                
                // Créer les articles
                for (const article of commande.articles) {
                    await ArticleCommandeModel.create({
                        commandeId: commande.id,
                        produitId: article.produitId,
                        nom: article.nom,
                        quantite: article.quantite,
                        prix: article.prix
                    });
                }
            }

            // Recharger avec les articles
            const commandeComplete = await CommandeModel.findByPk(commande.id, {
                include: [{ model: ArticleCommandeModel, as: 'articles' }]
            });

            return this.toDomainEntity(commandeComplete);
            
        } catch (error) {
            throw new Error(`Erreur sauvegarde commande: ${error.message}`);
        }
    }

    async rechercherParId(id) {
        try {
            const commandeModel = await CommandeModel.findByPk(id, {
                include: [{ model: ArticleCommandeModel, as: 'articles' }]
            });
            return commandeModel ? this.toDomainEntity(commandeModel) : null;
        } catch (error) {
            throw new Error(`Erreur recherche commande par ID: ${error.message}`);
        }
    }

    async rechercherParNumero(numeroCommande) {
        try {
            const commandeModel = await CommandeModel.findOne({
                where: { numeroCommande },
                include: [{ model: ArticleCommandeModel, as: 'articles' }]
            });
            return commandeModel ? this.toDomainEntity(commandeModel) : null;
        } catch (error) {
            throw new Error(`Erreur recherche commande par numéro: ${error.message}`);
        }
    }

    async listerParClient(clientId) {
        try {
            const commandesModel = await CommandeModel.findAll({
                where: { clientId },
                include: [{ model: ArticleCommandeModel, as: 'articles' }],
                order: [['dateCreation', 'DESC']]
            });
            return commandesModel.map(model => this.toDomainEntity(model));
        } catch (error) {
            throw new Error(`Erreur liste commandes par client: ${error.message}`);
        }
    }

    async listerTous() {
        try {
            const commandesModel = await CommandeModel.findAll({
                include: [{ model: ArticleCommandeModel, as: 'articles' }],
                order: [['dateCreation', 'DESC']]
            });
            return commandesModel.map(model => this.toDomainEntity(model));
        } catch (error) {
            throw new Error(`Erreur liste commandes: ${error.message}`);
        }
    }

    async listerParStatut(statut) {
        try {
            const commandesModel = await CommandeModel.findAll({
                where: { statut },
                include: [{ model: ArticleCommandeModel, as: 'articles' }],
                order: [['dateCreation', 'DESC']]
            });
            return commandesModel.map(model => this.toDomainEntity(model));
        } catch (error) {
            throw new Error(`Erreur liste commandes par statut: ${error.message}`);
        }
    }

    async supprimer(id) {
        try {
            const result = await CommandeModel.destroy({
                where: { id }
            });
            return result > 0;
        } catch (error) {
            throw new Error(`Erreur suppression commande: ${error.message}`);
        }
    }

    async compterTous() {
        try {
            return await CommandeModel.count();
        } catch (error) {
            throw new Error(`Erreur comptage commandes: ${error.message}`);
        }
    }

    // Conversion Sequelize Model vers Domain Entity
    toDomainEntity(commandeModel) {
        const articles = commandeModel.articles?.map(articleModel => 
            new ArticleCommande({
                produitId: articleModel.produitId,
                nom: articleModel.nom,
                quantite: articleModel.quantite,
                prix: parseFloat(articleModel.prix)
            })
        ) || [];

        return new Commande({
            id: commandeModel.id,
            numeroCommande: commandeModel.numeroCommande,
            clientId: commandeModel.clientId,
            articles: articles,
            adresseLivraison: commandeModel.adresseLivraison,
            methodePaiement: commandeModel.methodePaiement,
            sousTotal: parseFloat(commandeModel.sousTotal),
            taxes: parseFloat(commandeModel.taxes),
            fraisLivraison: parseFloat(commandeModel.fraisLivraison),
            total: parseFloat(commandeModel.total),
            statut: commandeModel.statut,
            dateCreation: commandeModel.dateCreation,
            dateMiseAJour: commandeModel.dateMiseAJour
        });
    }
}

module.exports = SequelizeCommandeRepository;
