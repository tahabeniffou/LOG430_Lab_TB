const { Sequelize, DataTypes } = require('sequelize');

describe('LigneVente', function() {
  let sequelize, Produit, Vente, LigneVente;

  before(async function() {
    sequelize = new Sequelize('sqlite::memory:', { logging: false });

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

    Produit.hasMany(LigneVente);
    Vente.hasMany(LigneVente);
    LigneVente.belongsTo(Produit);
    LigneVente.belongsTo(Vente);

    await sequelize.sync({ force: true });
  });

  after(async function() {
    await sequelize.close();
  });

  it('Créer une ligne de vente avec produit et vente', async function() {
    const produit = await Produit.create({ nom: 'Sprite', prix: 2.1, stock: 30 });
    const vente = await Vente.create({ total: 0, date: new Date() });

    const ligne = await LigneVente.create({
      quantite: 2,
      sousTotal: 4.2,
      ProduitId: produit.id,
      VenteId: vente.id
    });

    if (ligne.quantite !== 2) throw new Error('Quantité incorrecte');
    if (Math.abs(ligne.sousTotal - 4.2) > 0.01) throw new Error('Sous-total incorrect');
  });
});
