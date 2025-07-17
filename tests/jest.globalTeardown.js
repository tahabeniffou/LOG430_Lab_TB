/**
 * Jest Global Teardown - Nettoyage après tous les tests
 */

module.exports = async () => {
  console.log('🧹 Nettoyage global après les tests...');
  
  // Ici on pourrait nettoyer des ressources si nécessaire
  // Par exemple, fermer des connexions DB de test, etc.
  
  console.log('✅ Nettoyage global terminé');
};
