const { Sequelize, DataTypes } = require('sequelize');

describe('Paiement', function() {
  let sequelize, Vente, Paiement;

  before(async function() {
    sequelize = new Sequelize('sqlite::memory:', { logging: false });
    Vente = sequelize.define('Vente', {
      total: DataTypes.FLOAT,
      date: DataTypes.DATE
    });
    Paiement = sequelize.define('Paiement', {
      moyen: DataTypes.STRING,
      montant: DataTypes.FLOAT,
      date: DataTypes.DATE
    });
    Vente.hasOne(Paiement);
    Paiement.belongsTo(Vente);
    await sequelize.sync({ force: true });
  });

  after(async function() {
    await sequelize.close();
  });

  it('Créer un paiement lié à une vente', async function() {
    const vente = await Vente.create({ total: 5.0, date: new Date() });
    const pay = await Paiement.create({
      moyen: 'espèces',
      montant: 5.0,
      date: new Date(),
      VenteId: vente.id
    });
    if (pay.montant !== 5.0) throw new Error('Montant incorrect');
    if (pay.moyen !== 'espèces') throw new Error('Moyen incorrect');
  });
});
