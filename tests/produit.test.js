const { Sequelize, DataTypes } = require('sequelize');

describe('Produit', function() {
  let sequelize, Produit;

  before(async function() {
    sequelize = new Sequelize('sqlite::memory:', { logging: false });
    Produit = sequelize.define('Produit', {
      nom: DataTypes.STRING,
      prix: DataTypes.FLOAT,
      stock: DataTypes.INTEGER
    });
    await sequelize.sync({ force: true });
  });

  after(async function() {
    await sequelize.close();
  });

  it('Créer un produit valide', async function() {
    const p = await Produit.create({ nom: 'Fanta', prix: 2.0, stock: 20 });
    if (p.nom !== 'Fanta') throw new Error('Nom incorrect');
    if (!(p.prix > 0)) throw new Error('Prix incorrect');
    if (!(p.stock >= 0)) throw new Error('Stock incorrect');
  });
});
