const sequelize = require('./db');
const Magasin = require('./Magasin');
const CentreLogistique = require('./CentreLogistique');
const Categorie = require('./Categorie');
const Produit = require('./Produit');
const Utilisateur = require('./Utilisateur');
const Vente = require('./Vente');
const LigneVente = require('./LigneVente');
const Paiement = require('./Paiement');

async function seed() {
  try {
    // 1. Synchroniser les tables (supprime et recrée tout)
    await sequelize.sync({ force: true });
    console.log('Tables créées.');

    // 2. Magasins
    const magasin1 = await Magasin.create({ nom: 'Magasin Laval', adresse: '123 rue Sherbrook' });
    const magasin2 = await Magasin.create({ nom: 'Magasin Montreal', adresse: '789 Des riverain' });

    // 3. Catégories (par magasin)
    const boissons1 = await Categorie.create({ nom: 'Boissons', magasinId: magasin1.id });
    const snacks1 = await Categorie.create({ nom: 'Snacks', magasinId: magasin1.id });
    const fruits2 = await Categorie.create({ nom: 'Fruits', magasinId: magasin2.id });
    const boulangerie2 = await Categorie.create({ nom: 'Boulangerie', magasinId: magasin2.id });

    // 4. Produits (par magasin)
    const coca1 = await Produit.create({ nom: 'Coca-Cola', prix: 2.5, stock: 100, CategorieId: boissons1.id, magasinId: magasin1.id });
    const pepsi1 = await Produit.create({ nom: 'Pepsi', prix: 2.3, stock: 80, CategorieId: boissons1.id, magasinId: magasin1.id });
    const chips1 = await Produit.create({ nom: 'Chips BBQ', prix: 1.99, stock: 50, CategorieId: snacks1.id, magasinId: magasin1.id });
    const barre1 = await Produit.create({ nom: 'Barre granola', prix: 1.2, stock: 30, CategorieId: snacks1.id, magasinId: magasin1.id });

    const pomme2 = await Produit.create({ nom: 'Pomme', prix: 0.99, stock: 200, CategorieId: fruits2.id, magasinId: magasin2.id });
    const banane2 = await Produit.create({ nom: 'Banane', prix: 1.09, stock: 180, CategorieId: fruits2.id, magasinId: magasin2.id });
    const pain2 = await Produit.create({ nom: 'Pain', prix: 2.0, stock: 60, CategorieId: boulangerie2.id, magasinId: magasin2.id });
    const croissant2 = await Produit.create({ nom: 'Croissant', prix: 1.5, stock: 40, CategorieId: boulangerie2.id, magasinId: magasin2.id });

    // 5. Utilisateurs (par magasin)
    const alice = await Utilisateur.create({ nom: 'Alice', role: 'Caissière', magasinId: magasin1.id });
    const bob = await Utilisateur.create({ nom: 'Bob', role: 'Caissier', magasinId: magasin1.id });
    const clara = await Utilisateur.create({ nom: 'Clara', role: 'Caissière', magasinId: magasin2.id });
    const david = await Utilisateur.create({ nom: 'David', role: 'Caissier', magasinId: magasin2.id });

    // 6. Vente magasin 1
    const vente1 = await Vente.create({
      date: new Date(),
      total: 2.5 + 2 * 1.99,
      UtilisateurId: alice.id,
      magasinId: magasin1.id
    });
    await LigneVente.create({
      VenteId: vente1.id,
      ProduitId: coca1.id,
      quantite: 1,
      sousTotal: 2.5,
      magasinId: magasin1.id
    });
    await LigneVente.create({
      VenteId: vente1.id,
      ProduitId: chips1.id,
      quantite: 2,
      sousTotal: 2 * 1.99,
      magasinId: magasin1.id
    });
    await Paiement.create({
      VenteId: vente1.id,
      moyen: 'carte',
      montant: vente1.total,
      date: new Date(),
      magasinId: magasin1.id
    });

    // 7. Vente magasin 2
    const vente2 = await Vente.create({
      date: new Date(),
      total: 0.99 + 2 * 2.0,
      UtilisateurId: clara.id,
      magasinId: magasin2.id
    });
    await LigneVente.create({
      VenteId: vente2.id,
      ProduitId: pomme2.id,
      quantite: 1,
      sousTotal: 0.99,
      magasinId: magasin2.id
    });
    await CentreLogistique.create({ nom: 'Coca-Cola',
       stock: 500, 
       ProduitId: coca1.id 
      });
    await CentreLogistique.create({ nom: 'Pepsi', 
      stock: 400, 
      ProduitId: pepsi1.id 
    });
    await CentreLogistique.create({ nom: 'Chips BBQ', 
      stock: 300, 
      ProduitId: chips1.id 
    });
    await CentreLogistique.create({ nom: 'Barre granola', 
      stock: 200, 
      ProduitId: barre1.id 
    });
    await LigneVente.create({
      VenteId: vente2.id,
      ProduitId: pain2.id,
      quantite: 2,
      sousTotal: 2 * 2.0,
      magasinId: magasin2.id
    });
    await Paiement.create({
      VenteId: vente2.id,
      moyen: 'espèces',
      montant: vente2.total,
      date: new Date(),
      magasinId: magasin2.id
    });

    // 8. Vente magasin 2 avec un autre utilisateur
    const vente3 = await Vente.create({
      date: new Date(),
      total: 1.5 + 1.09,
      UtilisateurId: david.id,
      magasinId: magasin2.id
    });
    await LigneVente.create({
      VenteId: vente3.id,
      ProduitId: croissant2.id,
      quantite: 1,
      sousTotal: 1.5,
      magasinId: magasin2.id
    });
    await LigneVente.create({
      VenteId: vente3.id,
      ProduitId: banane2.id,
      quantite: 1,
      sousTotal: 1.09,
      magasinId: magasin2.id
    });
    await Paiement.create({
      VenteId: vente3.id,
      moyen: 'carte',
      montant: vente3.total,
      date: new Date(),
      magasinId: magasin2.id
    });

    console.log('Données initiales insérées avec succès !');
    await sequelize.close();
    process.exit(0);
  } catch (err) {
    console.error('Erreur lors du seed:', err);
    process.exit(1);
  }
}

seed();