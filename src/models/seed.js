console.log('--- Démarrage du script de seed COMPLET ---');
const { sequelize, Magasin, Utilisateur, Produit, Vente, LigneVente } = require('./index');
require('./associations');

async function seed() {
  try {
    console.log('Connexion à la base de données réussie.');

    // Création des magasins
    const magasins = await Magasin.bulkCreate([
      { nom: 'Magasin Centre', adresse: '123 rue Principale' },
      { nom: 'Magasin Nord', adresse: '456 avenue du Nord' },
      { nom: 'Magasin Sud', adresse: '789 boulevard du Sud' }
    ], { returning: true });
    console.log('Magasins créés :', magasins.map(m => m.toJSON()));

    // Création des utilisateurs (rôles et mots de passe variés)
    const usersData = [
      { nom: 'Dupont', prenom: 'Jean', role: 'caissier', motDePasse: '1234' },
      { nom: 'Martin', prenom: 'Sophie', role: 'gerant', motDePasse: 'abcd' },
      { nom: 'Durand', prenom: 'Paul', role: 'caissier', motDePasse: 'pass1' },
      { nom: 'Lefevre', prenom: 'Claire', role: 'gerant', motDePasse: 'pass2' }
    ];
    let allUsers = [];
    for (let i = 0; i < magasins.length; i++) {
      const magasin = magasins[i];
      const users = await Utilisateur.bulkCreate(usersData.map((u, j) => ({ 
        ...u, 
        courriel: `${u.prenom.toLowerCase()}.${u.nom.toLowerCase()}.m${i+1}@example.com`,
        nomUtilisateur: `${u.prenom.toLowerCase()}_${u.nom.toLowerCase()}_m${i+1}`,
        magasinId: magasin.id 
      })), { returning: true });
      allUsers = allUsers.concat(users);
      console.log(`Utilisateurs créés pour le magasin ${magasin.nom} :`, users.map(u => u.toJSON()));
    }

    // Création de produits variés pour chaque magasin
    const produitsData = [
      { nom: 'Pain', prix: 2.5, quantiteStock: 100, description: 'Pain frais artisanal' },
      { nom: 'Lait', prix: 1.5, quantiteStock: 80, description: 'Lait entier 1L' },
      { nom: 'Fromage', prix: 4.0, quantiteStock: 50, description: 'Fromage de chèvre' },
      { nom: 'Jus', prix: 3.0, quantiteStock: 60, description: 'Jus d\'orange 100% pur' },
      { nom: 'Biscuit', prix: 2.0, quantiteStock: 120, description: 'Biscuits au chocolat' },
      { nom: 'Café', prix: 5.0, quantiteStock: 40, description: 'Café en grains premium' }
    ];
    let allProduits = [];
    for (let i = 0; i < magasins.length; i++) {
      const magasin = magasins[i];
      const produits = await Produit.bulkCreate(produitsData.map(p => ({ 
        ...p, 
        nom: `${p.nom} - ${magasin.nom}`,
        magasinId: magasin.id 
      })), { returning: true });
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
          const prixUnitaire = prod.prix;
          const sousTotal = prixUnitaire * quantite;
          total += sousTotal;
          return { 
            produitId: prod.id, 
            quantite, 
            prixUnitaire,
            sousTotal, 
            magasinId: magasin.id 
          };
        });
        const vente = await Vente.create({ 
          montantTotal: total, 
          dateVente: new Date(), 
          magasinId: magasin.id,
          utilisateurId: vendeur.id
        });
        for (const ligne of lignes) {
          await LigneVente.create({ ...ligne, venteId: vente.id });
        }
        console.log(`Vente créée (magasin ${magasin.nom}, vendeur ${vendeur.nom}) : total $${total.toFixed(2)}`);
      }
    }

    console.log('Seed COMPLET terminé : magasins, utilisateurs, produits, ventes et lignes de vente créés.');
  } catch (e) {
    console.error('Erreur dans le script de seed :', e);
    throw e;
  }
}

module.exports = seed;

// Démarrage seulement si ce fichier est exécuté directement
if (require.main === module) {
  seed().then(() => process.exit(0));
}
