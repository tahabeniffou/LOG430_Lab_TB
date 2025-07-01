const { Sequelize, DataTypes } = require('sequelize');

describe('DemandeReappro', function() {
  let sequelize, Produit, DemandeReappro;

  before(async function() {
    sequelize = new Sequelize('sqlite::memory:', { logging: false });
    Produit = sequelize.define('Produit', {
      nom: DataTypes.STRING,
      prix: DataTypes.FLOAT,
      stock: DataTypes.INTEGER
    });
    DemandeReappro = sequelize.define('DemandeReappro', {
      produitId: DataTypes.INTEGER,
      quantite: DataTypes.INTEGER,
      date: DataTypes.DATE
    });
    Produit.hasMany(DemandeReappro, { foreignKey: 'produitId' });
    DemandeReappro.belongsTo(Produit, { foreignKey: 'produitId' });
    await sequelize.sync({ force: true });
  });

  after(async function() {
    await sequelize.close();
  });

  it('Créer une demande de réapprovisionnement', async function() {
    const produit = await Produit.create({ nom: 'Pepsi', prix: 2.3, stock: 80 });
    const demande = await DemandeReappro.create({ produitId: produit.id, quantite: 5, date: new Date() });
    if (demande.produitId !== produit.id) throw new Error('ProduitId incorrect');
    if (demande.quantite !== 5) throw new Error('Quantité incorrecte');
    const demandes = await DemandeReappro.findAll({ where: { produitId: produit.id } });
    if (demandes.length !== 1) throw new Error('Demande non retrouvée');
  });
});