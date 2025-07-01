const { Sequelize, DataTypes } = require('sequelize');

describe('Vente', function() {
  let sequelize, Vente, Utilisateur;

  before(async function() {
    sequelize = new Sequelize('sqlite::memory:', { logging: false });
    Utilisateur = sequelize.define('Utilisateur', {
      nom: DataTypes.STRING,
      role: DataTypes.STRING
    });
    Vente = sequelize.define('Vente', {
      total: DataTypes.FLOAT,
      date: DataTypes.DATE
    });
    Utilisateur.hasMany(Vente);
    Vente.belongsTo(Utilisateur);
    await sequelize.sync({ force: true });
  });

  after(async function() {
    await sequelize.close();
  });

  it('Créer une vente liée à un utilisateur', async function() {
    const user = await Utilisateur.create({ nom: 'Léo', role: 'Caissier' });
    const vente = await Vente.create({ total: 10.5, date: new Date(), UtilisateurId: user.id });
    if (Math.abs(vente.total - 10.5) > 0.01) throw new Error('Total incorrect');
  });
});
