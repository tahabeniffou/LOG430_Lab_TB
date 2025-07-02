console.log('--- Démarrage du script de seed COMPLET ---');
const { sequelize, Magasin, Utilisateur, Produit, Vente, LigneVente } = require('./index');
require('./associations');

async function seed() {
  try {
    await sequelize.authenticate();
    console.log('Connexion à la base de données réussie.');
    await sequelize.sync({ force: true });
    console.log('Synchronisation des modèles terminée.');

    // Création des magasins
    const magasins = await Magasin.bulkCreate([
      { nom: 'Magasin Centre', adresse: '123 rue Principale' },
      { nom: 'Magasin Nord', adresse: '456 avenue du Nord' },
      { nom: 'Magasin Sud', adresse: '789 boulevard du Sud' }
    ], { returning: true });
    console.log('Magasins créés :', magasins.map(m => m.toJSON()));

    // Création des utilisateurs (rôles et mots de passe variés)
    const usersData = [
      { nom: 'Dupont', prenom: 'Jean', courriel: 'jean.dupont@example.com', role: 'caissier', motDePasse: '1234' },
      { nom: 'Martin', prenom: 'Sophie', courriel: 'sophie.martin@example.com', role: 'gerant', motDePasse: 'abcd' },
      { nom: 'Durand', prenom: 'Paul', courriel: 'paul.durand@example.com', role: 'caissier', motDePasse: 'pass1' },
      { nom: 'Lefevre', prenom: 'Claire', courriel: 'claire.lefevre@example.com', role: 'gerant', motDePasse: 'pass2' }
    ];
    let allUsers = [];
    for (const magasin of magasins) {
      const users = await Utilisateur.bulkCreate(usersData.map(u => ({ ...u, magasinId: magasin.id })), { returning: true });
      allUsers = allUsers.concat(users);
      console.log(`Utilisateurs créés pour le magasin ${magasin.nom} :`, users.map(u => u.toJSON()));
    }

    // Création de produits variés pour chaque magasin
    const produitsData = [
      { nom: 'Pain', prix: 2.5, stock: 100 },
      { nom: 'Lait', prix: 1.5, stock: 80 },
      { nom: 'Fromage', prix: 4.0, stock: 50 },
      { nom: 'Jus', prix: 3.0, stock: 60 },
      { nom: 'Biscuit', prix: 2.0, stock: 120 },
      { nom: 'Café', prix: 5.0, stock: 40 }
    ];
    let allProduits = [];
    for (const magasin of magasins) {
      const produits = await Produit.bulkCreate(produitsData.map(p => ({ ...p, magasinId: magasin.id })), { returning: true });
      allProduits = allProduits.concat(produits);
      console.log(`Produits créés pour le magasin ${magasin.nom} :`, produits.map(p => p.toJSON()));
    }

    // Création de ventes et lignes de vente
    for (const magasin of magasins) {
      // On prend 2 utilisateurs et 3 produits au hasard pour chaque vente
      const users = allUsers.filter(u => u.magasinId === magasin.id);
      const produits = allProduits.filter(p => p.magasinId === magasin.id);
      for (let i = 0; i < 5; i++) { // 5 ventes par magasin
        const vendeur = users[Math.floor(Math.random() * users.length)];
        const produitsVente = produits.sort(() => 0.5 - Math.random()).slice(0, 3);
        let total = 0;
        const lignes = produitsVente.map(prod => {
          const quantite = Math.floor(Math.random() * 5) + 1;
          total += prod.prix * quantite;
          return { produitId: prod.id, quantite, sousTotal: prod.prix * quantite, magasinId: magasin.id };
        });
        const vente = await Vente.create({ total, date: new Date(), magasinId: magasin.id });
        for (const ligne of lignes) {
          await LigneVente.create({ ...ligne, venteId: vente.id });
        }
        console.log(`Vente créée (magasin ${magasin.nom}, vendeur ${vendeur.nom}) : total $${total.toFixed(2)}`);
      }
    }

    console.log('Seed COMPLET terminé : magasins, utilisateurs, produits, ventes et lignes de vente créés.');
    process.exit(0);
  } catch (e) {
    console.error('Erreur dans le script de seed :', e);
    process.exit(1);
  }
}

seed();
