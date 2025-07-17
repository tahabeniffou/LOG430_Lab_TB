/**
 * @fileoverview Repository Sequelize Compte - Infrastructure Layer (DDD)
 * @description Implémentation concrete du repository avec Sequelize
 */

const Compte = require('../domain/Compte');
const { CompteModel } = require('./database');

class SequelizeCompteRepository {
    
    async sauvegarder(compte) {
        try {
            let compteModel;
            
            if (compte.id) {
                // Mise à jour
                compteModel = await CompteModel.findByPk(compte.id);
                if (!compteModel) {
                    throw new Error('Compte non trouvé pour mise à jour');
                }
                
                await compteModel.update({
                    email: compte.email,
                    motDePasse: compte.motDePasse,
                    nom: compte.nom,
                    prenom: compte.prenom,
                    telephone: compte.telephone,
                    adresse: compte.adresse,
                    statut: compte.statut,
                    typeCompte: compte.typeCompte
                });
            } else {
                // Création
                compteModel = await CompteModel.create({
                    email: compte.email,
                    motDePasse: compte.motDePasse,
                    nom: compte.nom,
                    prenom: compte.prenom,
                    telephone: compte.telephone,
                    adresse: compte.adresse,
                    statut: compte.statut,
                    typeCompte: compte.typeCompte
                });
            }

            return this.toDomainEntity(compteModel);
        } catch (error) {
            throw new Error(`Erreur sauvegarde compte: ${error.message}`);
        }
    }

    async rechercherParId(id) {
        try {
            const compteModel = await CompteModel.findByPk(id);
            return compteModel ? this.toDomainEntity(compteModel) : null;
        } catch (error) {
            throw new Error(`Erreur recherche compte par ID: ${error.message}`);
        }
    }

    async rechercherParEmail(email) {
        try {
            const compteModel = await CompteModel.findOne({
                where: { email: email.toLowerCase() }
            });
            return compteModel ? this.toDomainEntity(compteModel) : null;
        } catch (error) {
            throw new Error(`Erreur recherche compte par email: ${error.message}`);
        }
    }

    async listerTous() {
        try {
            const comptesModel = await CompteModel.findAll({
                order: [['dateCreation', 'DESC']]
            });
            return comptesModel.map(model => this.toDomainEntity(model));
        } catch (error) {
            throw new Error(`Erreur liste comptes: ${error.message}`);
        }
    }

    async supprimer(id) {
        try {
            const result = await CompteModel.destroy({
                where: { id }
            });
            return result > 0;
        } catch (error) {
            throw new Error(`Erreur suppression compte: ${error.message}`);
        }
    }

    async compterTous() {
        try {
            return await CompteModel.count();
        } catch (error) {
            throw new Error(`Erreur comptage comptes: ${error.message}`);
        }
    }

    // Conversion Sequelize Model vers Domain Entity
    toDomainEntity(compteModel) {
        return new Compte({
            id: compteModel.id,
            email: compteModel.email,
            motDePasse: compteModel.motDePasse,
            nom: compteModel.nom,
            prenom: compteModel.prenom,
            telephone: compteModel.telephone,
            adresse: compteModel.adresse,
            dateCreation: compteModel.dateCreation,
            statut: compteModel.statut,
            typeCompte: compteModel.typeCompte
        });
    }
}

module.exports = SequelizeCompteRepository;
