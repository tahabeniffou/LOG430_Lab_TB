const { Sequelize, DataTypes } = require('sequelize');

let sequelize;
let Categorie;

describe('Categorie', function() {
  before(async function() {
    sequelize = new Sequelize('sqlite::memory:', { logging: false });

    Categorie = sequelize.define('Categorie', {
      nom: {
        type: DataTypes.STRING,
        allowNull: false
      }
    });

    await sequelize.sync({ force: true });
  });

  after(async function() {
    await sequelize.close();
  });

  it('Créer une catégorie', async function() {
    const c = await Categorie.create({ nom: 'Confiseries' });
    if (c.nom !== 'Confiseries') throw new Error('Nom incorrect');
  });
});
