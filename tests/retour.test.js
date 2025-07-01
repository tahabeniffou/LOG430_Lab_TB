const { Sequelize, DataTypes } = require('sequelize');
const { expect } = require('chai');

describe('Retour', function() {
  let sequelize, Produit, Vente, LigneVente, Utilisateur;

  before(async function() {
    sequelize = new Sequelize('sqlite::memory:', { logging: false });
    Utilisateur = sequelize.define('Utilisateur', {
      nom: DataTypes.STRING,
      role: DataTypes.STRING
    });
    Produit = sequelize.define('Produit', {
      nom: DataTypes.STRING,
      prix: DataTypes.FLOAT,
      stock: DataTypes.INTEGER
    });
    Vente = sequelize.define('Vente', {
      total: DataTypes.FLOAT,
      date: DataTypes.DATE
    });
    LigneVente = sequelize.define('LigneVente', {
      quantite: DataTypes.INTEGER,
      sousTotal: DataTypes.FLOAT
    });
    Utilisateur.hasMany(Vente);
    Vente.belongsTo(Utilisateur);
    Vente.hasMany(LigneVente);
    LigneVente.belongsTo(Vente);
    Produit.hasMany(LigneVente);
    LigneVente.belongsTo(Produit);
    await sequelize.sync({ force: true });
  });

  after(async function() {
    await sequelize.close();
  });

  it('Annuler une vente : restituer le stock et supprimer la vente', async function() {
    const user = await Utilisateur.create({ nom: 'Youssef', role: 'Caissier' });
    const produit = await Produit.create({ nom: "Bouteille d'eau", prix: 1.5, stock: 20 });
    const vente = await Vente.create({ date: new Date(), total: 3.0, UtilisateurId: user.id });
    await LigneVente.create({ ProduitId: produit.id, VenteId: vente.id, quantite: 2, sousTotal: 3.0 });

    produit.stock -= 2;
    await produit.save();

    produit.stock += 2;
    await produit.save();

    await LigneVente.destroy({ where: { VenteId: vente.id } });
    await Vente.destroy({ where: { id: vente.id } });

    const produitMisAJour = await Produit.findByPk(produit.id);
    const venteAnnulee = await Vente.findByPk(vente.id);
    const lignes = await LigneVente.findAll({ where: { VenteId: vente.id } });

    expect(produitMisAJour.stock).to.equal(20);
    expect(venteAnnulee).to.be.null;
    expect(lignes.length).to.equal(0);
  });
});
