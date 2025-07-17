const VenteRepository = require('../domain/VenteRepository');
const Vente = require('../domain/Vente');
const LigneVente = require('../domain/LigneVente');
const { VenteModel, LigneVenteModel } = require('./database');

class SequelizeVenteRepository extends VenteRepository {
  constructor() {
    super();
    this.venteModel = VenteModel;
    this.ligneModel = LigneVenteModel;
  }

  async sauvegarder(vente) {
    const transaction = await this.venteModel.sequelize.transaction();
    
    try {
      let venteData = {
        magasin_id: vente.magasinId,
        utilisateur_id: vente.utilisateurId,
        statut: vente.statut,
        montant_total: vente.montantTotal
      };

      let venteResult;
      if (vente.id) {
        // Mise à jour
        await this.venteModel.update(venteData, {
          where: { id: vente.id },
          transaction
        });
        venteResult = await this.venteModel.findByPk(vente.id, { transaction });
      } else {
        // Création
        venteResult = await this.venteModel.create(venteData, { transaction });
      }

      // Supprimer les anciennes lignes si c'est une mise à jour
      if (vente.id) {
        await this.ligneModel.destroy({
          where: { vente_id: vente.id },
          transaction
        });
      }

      // Créer les nouvelles lignes
      if (vente.lignes && vente.lignes.length > 0) {
        const lignesData = vente.lignes.map(ligne => ({
          vente_id: venteResult.id,
          produit_id: ligne.produitId,
          nom_produit: ligne.nomProduit,
          prix_unitaire: ligne.prixUnitaire,
          quantite: ligne.quantite,
          sous_total: ligne.sousTotal
        }));

        await this.ligneModel.bulkCreate(lignesData, { transaction });
      }

      await transaction.commit();
      
      // Recharger avec les lignes
      return await this.trouverParId(venteResult.id);
    } catch (error) {
      await transaction.rollback();
      throw new Error(`Erreur lors de la sauvegarde de la vente: ${error.message}`);
    }
  }

  async trouverParId(id) {
    try {
      const result = await this.venteModel.findByPk(id, {
        include: [{
          model: this.ligneModel,
          as: 'lignes'
        }]
      });
      
      return result ? this._mapToEntity(result) : null;
    } catch (error) {
      throw new Error(`Erreur lors de la recherche de la vente: ${error.message}`);
    }
  }

  async listerToutes() {
    try {
      const results = await this.venteModel.findAll({
        include: [{
          model: this.ligneModel,
          as: 'lignes'
        }],
        order: [['date_creation', 'DESC']]
      });
      
      return results.map(result => this._mapToEntity(result));
    } catch (error) {
      throw new Error(`Erreur lors de la récupération des ventes: ${error.message}`);
    }
  }

  async listerParMagasin(magasinId) {
    try {
      const results = await this.venteModel.findAll({
        where: { magasin_id: magasinId },
        include: [{
          model: this.ligneModel,
          as: 'lignes'
        }],
        order: [['date_creation', 'DESC']]
      });
      
      return results.map(result => this._mapToEntity(result));
    } catch (error) {
      throw new Error(`Erreur lors de la récupération des ventes par magasin: ${error.message}`);
    }
  }

  async listerParUtilisateur(utilisateurId) {
    try {
      const results = await this.venteModel.findAll({
        where: { utilisateur_id: utilisateurId },
        include: [{
          model: this.ligneModel,
          as: 'lignes'
        }],
        order: [['date_creation', 'DESC']]
      });
      
      return results.map(result => this._mapToEntity(result));
    } catch (error) {
      throw new Error(`Erreur lors de la récupération des ventes par utilisateur: ${error.message}`);
    }
  }

  async supprimer(id) {
    const transaction = await this.venteModel.sequelize.transaction();
    
    try {
      // Supprimer d'abord les lignes
      await this.ligneModel.destroy({
        where: { vente_id: id },
        transaction
      });
      
      // Puis la vente
      const deleted = await this.venteModel.destroy({
        where: { id: id },
        transaction
      });
      
      await transaction.commit();
      return deleted > 0;
    } catch (error) {
      await transaction.rollback();
      throw new Error(`Erreur lors de la suppression de la vente: ${error.message}`);
    }
  }

  _mapToEntity(model) {
    const vente = new Vente(model.magasin_id, model.utilisateur_id);
    vente.id = model.id;
    vente.statut = model.statut;
    vente.montantTotal = parseFloat(model.montant_total);
    vente.dateCreation = model.date_creation;
    vente.dateModification = model.date_modification;
    
    // Mapper les lignes
    if (model.lignes) {
      vente.lignes = model.lignes.map(ligneModel => {
        const ligne = new LigneVente(
          ligneModel.produit_id,
          ligneModel.nom_produit,
          parseFloat(ligneModel.prix_unitaire),
          ligneModel.quantite
        );
        ligne.id = ligneModel.id;
        return ligne;
      });
    }
    
    return vente;
  }
}

module.exports = SequelizeVenteRepository;
