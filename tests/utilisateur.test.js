const { Sequelize, DataTypes } = require('sequelize');

describe('Utilisateur', function() {
  let sequelize;
  let Utilisateur;

  before(async function() {
    sequelize = new Sequelize('sqlite::memory:', { logging: false });
    Utilisateur = sequelize.define('Utilisateur', {
      nom: DataTypes.STRING,
      role: DataTypes.STRING
    });
    await sequelize.sync({ force: true });
  });

  after(async function() {
    await sequelize.close();
  });

  it('Créer un utilisateur', async function() {
    const u = await Utilisateur.create({ nom: 'Taha', role: 'Admin' });
    if (u.nom !== 'Taha') throw new Error('Nom incorrect');
    if (u.role !== 'Admin') throw new Error('Role incorrect');
  });
});
