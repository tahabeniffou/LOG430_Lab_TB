// Implémentation Sequelize du repository Utilisateur
const UtilisateurRepository = require('../../domain/utilisateur/UtilisateurRepository');
const Utilisateur = require('../../domain/utilisateur/Utilisateur');
const bcrypt = require('bcryptjs');

class SequelizeUtilisateurRepository extends UtilisateurRepository {
  constructor(db) {
    super();
    this.UtilisateurModel = db.Utilisateur;
  }

  mapToEntity(utilisateurModel) {
    if (!utilisateurModel) return null;
    // Correction du mapping pour l'entité Utilisateur
    return {
      id: utilisateurModel.id,
      nom: utilisateurModel.nom,
      prenom: utilisateurModel.prenom,
      nomUtilisateur: utilisateurModel.nomUtilisateur,
      role: utilisateurModel.role,
      magasinId: utilisateurModel.magasinId,
      motDePasse: utilisateurModel.motDePasse,
      createdAt: utilisateurModel.createdAt,
      updatedAt: utilisateurModel.updatedAt
    };
  }

  async sauvegarder(utilisateur) {
    const utilisateurData = {
      nom: utilisateur.nom,
      role: utilisateur.role,
      nomUtilisateur: utilisateur.nomUtilisateur,
      motDePasse: utilisateur.motDePasse,
      magasinId: utilisateur.magasinId
    };

    let utilisateurModel;
    if (utilisateur.id) {
      await this.UtilisateurModel.update(utilisateurData, { where: { id: utilisateur.id } });
      utilisateurModel = await this.UtilisateurModel.findByPk(utilisateur.id);
    } else {
      utilisateurModel = await this.UtilisateurModel.create(utilisateurData);
    }
    return this.mapToEntity(utilisateurModel);
  }

  async trouverParId(id) {
    const utilisateurModel = await this.UtilisateurModel.findByPk(id);
    return utilisateurModel ? this.mapToEntity(utilisateurModel) : null;
  }

  async trouverParNomUtilisateur(nomUtilisateur) {
    const utilisateurModel = await this.UtilisateurModel.findOne({ where: { nomUtilisateur } });
    return utilisateurModel ? this.mapToEntity(utilisateurModel) : null;
  }

  async validerMotDePasse(nomUtilisateur, motDePasse) {
    const utilisateurModel = await this.UtilisateurModel.findOne({ where: { nomUtilisateur } });
    if (!utilisateurModel) {
      return false;
    }
    // Utilise la méthode de l'instance du modèle Sequelize qui a accès à bcrypt
    return utilisateurModel.validerMotDePasse(motDePasse);
  }

  async listerTous() {
    const utilisateurs = await this.UtilisateurModel.findAll();
    return utilisateurs.map(u => this.mapToEntity(u));
  }
}

module.exports = SequelizeUtilisateurRepository;
