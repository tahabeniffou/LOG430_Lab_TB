const UtilisateurRepository = require('../domain/UtilisateurRepository');
const Utilisateur = require('../domain/Utilisateur');
const { UtilisateurModel } = require('./database');

class SequelizeUtilisateurRepository extends UtilisateurRepository {
  constructor() {
    super();
    this.model = UtilisateurModel;
  }

  async sauvegarder(utilisateur) {
    try {
      const utilisateurData = {
        nom: utilisateur.nom,
        email: utilisateur.email,
        role: utilisateur.role,
        actif: utilisateur.actif
      };

      let result;
      if (utilisateur.id) {
        // Mise à jour
        await this.model.update(utilisateurData, {
          where: { id: utilisateur.id }
        });
        result = await this.model.findByPk(utilisateur.id);
      } else {
        // Création
        result = await this.model.create(utilisateurData);
      }

      return this._mapToEntity(result);
    } catch (error) {
      throw new Error(`Erreur lors de la sauvegarde de l'utilisateur: ${error.message}`);
    }
  }

  async trouverParId(id) {
    try {
      const result = await this.model.findByPk(id);
      return result ? this._mapToEntity(result) : null;
    } catch (error) {
      throw new Error(`Erreur lors de la recherche de l'utilisateur: ${error.message}`);
    }
  }

  async trouverParEmail(email) {
    try {
      const result = await this.model.findOne({
        where: { email: email }
      });
      return result ? this._mapToEntity(result) : null;
    } catch (error) {
      throw new Error(`Erreur lors de la recherche par email: ${error.message}`);
    }
  }

  async listerTous() {
    try {
      const results = await this.model.findAll({
        order: [['nom', 'ASC']]
      });
      return results.map(result => this._mapToEntity(result));
    } catch (error) {
      throw new Error(`Erreur lors de la récupération des utilisateurs: ${error.message}`);
    }
  }

  async listerParRole(role) {
    try {
      const results = await this.model.findAll({
        where: { role: role },
        order: [['nom', 'ASC']]
      });
      return results.map(result => this._mapToEntity(result));
    } catch (error) {
      throw new Error(`Erreur lors de la récupération par rôle: ${error.message}`);
    }
  }

  async supprimer(id) {
    try {
      const deleted = await this.model.destroy({
        where: { id: id }
      });
      return deleted > 0;
    } catch (error) {
      throw new Error(`Erreur lors de la suppression de l'utilisateur: ${error.message}`);
    }
  }

  _mapToEntity(model) {
    const utilisateur = new Utilisateur(
      model.nom,
      model.email,
      model.role
    );
    utilisateur.id = model.id;
    utilisateur.actif = model.actif;
    utilisateur.dateCreation = model.date_creation;
    utilisateur.dateModification = model.date_modification;
    return utilisateur;
  }
}

module.exports = SequelizeUtilisateurRepository;
