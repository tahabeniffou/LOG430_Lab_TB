/**
 * Jest Global Setup - Configuration avant tous les tests
 */

module.exports = async () => {
  console.log('🚀 Initialisation globale des tests...');
  
  // Attendre un peu pour que les services soient prêts si récemment démarrés
  await new Promise(resolve => setTimeout(resolve, 2000));
  
  console.log('✅ Setup global terminé');
};
