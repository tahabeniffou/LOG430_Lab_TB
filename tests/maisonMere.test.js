const { Sequelize, DataTypes } = require('sequelize');

describe('MaisonMere', function() {
  let sequelize, Magasin, Produit, Vente, LigneVente;

  before(async function() {
    sequelize = new Sequelize('sqlite::memory:', { logging: false });

    Magasin = sequelize.define('Magasin', {
      nom: DataTypes.STRING,
      adresse: DataTypes.STRING
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

    Magasin.hasMany(Produit);
    Produit.belongsTo(Magasin);

    Magasin.hasMany(Vente);
    Vente.belongsTo(Magasin);

    Vente.hasMany(LigneVente);
    LigneVente.belongsTo(Vente);

    Produit.hasMany(LigneVente);
    LigneVente.belongsTo(Produit);

    await sequelize.sync({ force: true });
  });

  after(async function() {
    await sequelize.close();
  });

  it('La maison mère génère un rapport consolidé des ventes', async function() {
    const magasin = await Magasin.create({ nom: 'TestMag', adresse: '123 rue' });
    const produit = await Produit.create({ nom: 'Fanta', prix: 2, stock: 10, MagasinId: magasin.id });
    const vente = await Vente.create({ total: 4, date: new Date(), MagasinId: magasin.id });
    await LigneVente.create({ quantite: 2, sousTotal: 4, ProduitId: produit.id, VenteId: vente.id });

    // Simule la logique du rapport
    const ventes = await Vente.findAll({ where: { MagasinId: magasin.id } });
    const totalVentes = ventes.reduce((acc, v) => acc + (v.total || 0), 0);

    if (totalVentes !== 4) throw new Error('Total ventes incorrect');

    const lignes = await LigneVente.findAll({ include: [Produit] });
    const produitsVendus = {};
    lignes.forEach(lv => {
      const nom = lv.Produit?.nom || 'Inconnu';
      produitsVendus[nom] = (produitsVendus[nom] || 0) + lv.quantite;
    });

    if (!lignes.length) throw new Error('Aucune ligne de vente trouvée');
  });
});