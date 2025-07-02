const Utilisateur = require('../../../models/Utilisateur.js');

module.exports =  {
  listerTous() {
    return Utilisateur.findAll();
  },

  trouverParId(id) {
    return Utilisateur.findByPk(id);
  },

  creer(data) {
    return Utilisateur.create(data);
  },

  async mettreAJour(id, data) {
    await Utilisateur.update(data, { where: { id } });
    return Utilisateur.findByPk(id);
  },

  supprimer(id) {
    return Utilisateur.destroy({ where: { id } });
  },

  async authentifier(nom, motDePasse) {
    if (!nom || !motDePasse) return null;
    return Utilisateur.findOne({ where: { nom, motDePasse } });
  }
};
