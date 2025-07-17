// ✅ SCRIPT LEGACY - DONNÉES CENTRALES UNIQUEMENT
console.log('--- ✅ SCRIPT LEGACY - Démarrage du seed pour les données centrales ---');
const { sequelize, Magasin, Utilisateur } = require('./index');

async function seed() {
  try {
    console.log('🔄 Synchronisation de la base de données legacy...');
    await sequelize.sync({ force: true });
    console.log('✅ Base de données legacy synchronisée.');

    // Création des magasins
    console.log('🏪 Création des magasins...');
    const magasins = await Magasin.bulkCreate([
      { nom: 'Magasin Centre-Ville', adresse: '123 rue Sainte-Catherine, Montréal' },
      { nom: 'Magasin Plateau', adresse: '456 avenue du Mont-Royal, Montréal' },
      { nom: 'Magasin Westmount', adresse: '789 rue Sherbrooke, Westmount' }
    ], { returning: true });
    console.log('✅ Magasins créés:', magasins.length);

    // Création des utilisateurs
    console.log('👥 Création des utilisateurs...');
    const usersData = [
      { nom: 'Dupont', prenom: 'Jean', role: 'caissier', motDePasse: 'caissier123', courriel: 'jean.dupont@magasin1.com', nomUtilisateur: 'jean.dupont', magasinId: magasins[0].id },
      { nom: 'Martin', prenom: 'Sophie', role: 'manager', motDePasse: 'manager123', courriel: 'sophie.martin@magasin1.com', nomUtilisateur: 'sophie.martin', magasinId: magasins[0].id },
      { nom: 'Durand', prenom: 'Paul', role: 'caissier', motDePasse: 'caissier456', courriel: 'paul.durand@magasin2.com', nomUtilisateur: 'paul.durand', magasinId: magasins[1].id },
      { nom: 'Lefevre', prenom: 'Claire', role: 'manager', motDePasse: 'manager456', courriel: 'claire.lefevre@magasin2.com', nomUtilisateur: 'claire.lefevre', magasinId: magasins[1].id },
      { nom: 'Moreau', prenom: 'Pierre', role: 'caissier', motDePasse: 'caissier789', courriel: 'pierre.moreau@magasin3.com', nomUtilisateur: 'pierre.moreau', magasinId: magasins[2].id },
      { nom: 'Girard', prenom: 'Marie', role: 'manager', motDePasse: 'manager789', courriel: 'marie.girard@magasin3.com', nomUtilisateur: 'marie.girard', magasinId: magasins[2].id },
      { nom: 'Admin', prenom: 'System', role: 'admin', motDePasse: 'admin123', courriel: 'admin@systeme.com', nomUtilisateur: 'admin', magasinId: null }
    ];
    
    const utilisateurs = await Utilisateur.bulkCreate(usersData, { returning: true });
    console.log('✅ Utilisateurs créés:', utilisateurs.length);

    console.log('\n🎉 DONNÉES LEGACY CRÉÉES AVEC SUCCÈS !');
    console.log(`📋 Résumé: ${magasins.length} magasins, ${utilisateurs.length} utilisateurs`);

  } catch (error) {
    console.error('❌ Erreur lors de la création des données:', error);
  } finally {
    await sequelize.close();
  }
}

if (require.main === module) {
  seed();
}

module.exports = { seed };
