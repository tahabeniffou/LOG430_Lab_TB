const Produit = require('../../../models/Produit.js');

 module.exports =  {
  listerTous() {
    return Produit.findAll();
  },

  trouverParId(id) {
    return Produit.findByPk(id);
  },

  creer(data) {
    return Produit.create(data);
  },

  async mettreAJour(id, data) {
    await Produit.update(data, { where: { id } });
    return Produit.findByPk(id);
  },

  supprimer(id) {
    return Produit.destroy({ where: { id } });
  }
};
