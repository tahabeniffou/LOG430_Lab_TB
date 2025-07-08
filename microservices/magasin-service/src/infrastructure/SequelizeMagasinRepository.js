const MagasinRepository = require('../domain/MagasinRepository');
const Magasin = require('../domain/Magasin');
const { MagasinModel } = require('./database');

// Implémentation du repository avec Sequelize pour le microservice magasin
class SequelizeMagasinRepository extends MagasinRepository {
  async sauvegarder(magasin) {
    try {
      magasin.valider();
      
      const magasinData = {
        nom: magasin.nom,
        adresse: magasin.adresse,
        utilisateurs: magasin.utilisateurs || [],
      };

      let savedMagasin;
      if (magasin.id) {
        // Mise à jour
        await MagasinModel.update(magasinData, {
          where: { id: magasin.id }
        });
        savedMagasin = await MagasinModel.findByPk(magasin.id);
      } else {
        // Création
        savedMagasin = await MagasinModel.create(magasinData);
      }

      return this._toDomainEntity(savedMagasin);
    } catch (error) {
      throw new Error(`Erreur lors de la sauvegarde du magasin: ${error.message}`);
    }
  }

  async trouverParId(id) {
    try {
      const magasin = await MagasinModel.findByPk(id);
      return magasin ? this._toDomainEntity(magasin) : null;
    } catch (error) {
      throw new Error(`Erreur lors de la recherche du magasin par ID: ${error.message}`);
    }
  }

  async listerTous() {
    try {
      const magasins = await MagasinModel.findAll({
        order: [['nom', 'ASC']],
      });
      return magasins.map(m => this._toDomainEntity(m));
    } catch (error) {
      throw new Error(`Erreur lors de la récupération des magasins: ${error.message}`);
    }
  }

  async supprimer(id) {
    try {
      const result = await MagasinModel.destroy({
        where: { id }
      });
      return result > 0;
    } catch (error) {
      throw new Error(`Erreur lors de la suppression du magasin: ${error.message}`);
    }
  }

  async rechercherParNom(nom) {
    try {
      const magasins = await MagasinModel.findAll({
        where: {
          nom: {
            [require('sequelize').Op.like]: `%${nom}%`
          }
        },
        order: [['nom', 'ASC']],
      });
      return magasins.map(m => this._toDomainEntity(m));
    } catch (error) {
      throw new Error(`Erreur lors de la recherche par nom: ${error.message}`);
    }
  }

  async rechercherParAdresse(adresse) {
    try {
      const magasins = await MagasinModel.findAll({
        where: {
          adresse: {
            [require('sequelize').Op.like]: `%${adresse}%`
          }
        },
        order: [['nom', 'ASC']],
      });
      return magasins.map(m => this._toDomainEntity(m));
    } catch (error) {
      throw new Error(`Erreur lors de la recherche par adresse: ${error.message}`);
    }
  }

  // Méthode privée pour convertir le modèle Sequelize vers l'entité métier
  _toDomainEntity(sequelizeModel) {
    if (!sequelizeModel) return null;
    
    const magasin = new Magasin(
      sequelizeModel.id,
      sequelizeModel.nom,
      sequelizeModel.adresse,
      sequelizeModel.createdAt,
      sequelizeModel.updatedAt
    );
    
    // Restaurer les utilisateurs depuis JSON
    if (sequelizeModel.utilisateurs && Array.isArray(sequelizeModel.utilisateurs)) {
      magasin.utilisateurs = sequelizeModel.utilisateurs;
    }
    
    return magasin;
  }
}

module.exports = SequelizeMagasinRepository;
