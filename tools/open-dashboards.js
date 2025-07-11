const { spawn } = require('child_process');
const path = require('path');

console.log('🚀 OUVERTURE DASHBOARDS POUR CAPTURES');
console.log('====================================');

const dashboardStandalone = path.join(__dirname, '..', 'dashboard-standalone.html');
const dashboardTechnique = path.join(__dirname, '..', 'dashboard-capture.html');
const dashboardBusiness = path.join(__dirname, '..', 'dashboard-business.html');

console.log('📊 Ouverture des dashboards...');

// Ouvrir le dashboard autonome (recommandé)
console.log('⭐ Dashboard Autonome (RECOMMANDÉ):', `file:///${dashboardStandalone.replace(/\\/g, '/')}`);

// Ouvrir le dashboard technique
console.log('🔧 Dashboard Technique:', `file:///${dashboardTechnique.replace(/\\/g, '/')}`);

// Ouvrir le dashboard business  
console.log('💼 Dashboard Business:', `file:///${dashboardBusiness.replace(/\\/g, '/')}`);

// Ouvrir dans le navigateur par défaut
try {
    // Windows - Ouvrir d'abord le dashboard autonome
    spawn('start', [`file:///${dashboardStandalone.replace(/\\/g, '/')}`], { shell: true });
    setTimeout(() => {
        spawn('start', [`file:///${dashboardTechnique.replace(/\\/g, '/')}`], { shell: true });
    }, 2000);
    setTimeout(() => {
        spawn('start', [`file:///${dashboardBusiness.replace(/\\/g, '/')}`], { shell: true });
    }, 4000);
    
    console.log('');
    console.log('✅ Dashboards ouverts dans le navigateur');
    console.log('');
    console.log('📸 INSTRUCTIONS POUR CAPTURES:');
    console.log('1. Attendre 5-10 secondes pour stabilisation');
    console.log('2. Maximiser la fenêtre du navigateur');
    console.log('3. Utiliser Win + Shift + S pour captures');
    console.log('4. Capturer en haute résolution (PNG)');
    console.log('');
    console.log('📋 DASHBOARDS DISPONIBLES:');
    console.log('   🔧 Technique: Métriques performance + santé');
    console.log('   💼 Business: KPIs commerciaux + analytics');
    console.log('');
    console.log('📖 Voir GUIDE_CAPTURES_DASHBOARDS.md pour détails');
    
} catch (error) {
    console.log('❌ Erreur ouverture navigateur:', error.message);
    console.log('');
    console.log('🔗 URLs manuelles:');
    console.log(`   Technique: file:///${dashboardTechnique.replace(/\\/g, '/')}`);
    console.log(`   Business:  file:///${dashboardBusiness.replace(/\\/g, '/')}`);
}

module.exports = { dashboardTechnique, dashboardBusiness };
