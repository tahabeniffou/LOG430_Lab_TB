const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

console.log('🚀 DÉMARRAGE DASHBOARD + STRESS TEST');
console.log('====================================');

const dashboardPath = path.join(__dirname, '..', 'dashboard-metrics.html');

console.log('📊 Vérification des fichiers...');

// Vérifier que le dashboard existe
if (!fs.existsSync(dashboardPath)) {
    console.error('❌ Dashboard non trouvé:', dashboardPath);
    process.exit(1);
}

console.log('✅ Dashboard trouvé:', dashboardPath);

// Ouvrir le dashboard
console.log('');
console.log('🌐 Ouverture du dashboard de métriques...');
const dashboardUrl = `file:///${dashboardPath.replace(/\\/g, '/')}`;

try {
    spawn('start', [dashboardUrl], { shell: true });
    console.log('✅ Dashboard ouvert:', dashboardUrl);
} catch (error) {
    console.error('❌ Erreur lors de l\'ouverture du dashboard:', error.message);
}

console.log('');
console.log('🎯 INSTRUCTIONS D\'UTILISATION:');
console.log('==============================');
console.log('');
console.log('1. 📊 DASHBOARD OUVERT - Surveillez les métriques en temps réel');
console.log('   - RPS Total');
console.log('   - Utilisation CPU (%)');
console.log('   - Taux d\'erreurs');
console.log('   - Latence moyenne');
console.log('');
console.log('2. 🔥 UTILISER LE STRESS TEST:');
console.log('   - Cliquez sur "Démarrer Stress Test" dans le dashboard');
console.log('   - OU utilisez les commandes CLI:');
console.log('');
console.log('   📦 NPM Scripts:');
console.log('   npm run stress:light    # 5 RPS pendant 30s');
console.log('   npm run stress:medium   # 25 RPS pendant 60s');
console.log('   npm run stress:heavy    # 100 RPS pendant 120s');
console.log('   npm run stress:extreme  # 500 RPS pendant 60s');
console.log('');
console.log('   🛠️  Scripts directs:');
console.log('   node tools/stress-test.js light');
console.log('   node tools/stress-test.js medium');
console.log('   node tools/stress-test.js heavy');
console.log('   node tools/stress-test.js extreme');
console.log('');
console.log('3. 📈 OBSERVER LES RÉSULTATS:');
console.log('   - Les graphiques se mettent à jour en temps réel');
console.log('   - Consultez les logs système');
console.log('   - Analysez les métriques de performance');
console.log('');
console.log('4. 📸 CAPTURER LES RÉSULTATS:');
console.log('   - Utilisez Win + Shift + S pour faire des captures');
console.log('   - Sauvegardez les métriques importantes');
console.log('   - Documentez les performances observées');
console.log('');
console.log('⚡ STRESS TEST EXAMPLES:');
console.log('=======================');

const examples = [
    {
        level: 'LIGHT',
        command: 'npm run stress:light',
        description: 'Test léger - Vérification basique du système',
        metrics: '5 RPS, 30s, Load normal'
    },
    {
        level: 'MEDIUM',
        command: 'npm run stress:medium',
        description: 'Test modéré - Simulation charge réelle',
        metrics: '25 RPS, 60s, Load moyen'
    },
    {
        level: 'HEAVY',
        command: 'npm run stress:heavy',
        description: 'Test intensif - Charge élevée sostenúe',
        metrics: '100 RPS, 120s, Load élevé'
    },
    {
        level: 'EXTREME',
        command: 'npm run stress:extreme',
        description: 'Test extrême - Limite du système',
        metrics: '500 RPS, 60s, Load maximal'
    }
];

examples.forEach(example => {
    console.log(`🔥 ${example.level}:`);
    console.log(`   Commande: ${example.command}`);
    console.log(`   Description: ${example.description}`);
    console.log(`   Métriques: ${example.metrics}`);
    console.log('');
});

console.log('📋 SYSTÈME PRÊT - VOUS POUVEZ MAINTENANT:');
console.log('=========================================');
console.log('✅ Voir les métriques en temps réel dans le dashboard');
console.log('✅ Lancer des tests de stress avec les commandes ci-dessus');
console.log('✅ Observer l\'impact sur les performances');
console.log('✅ Capturer des screenshots pour documentation');
console.log('');
console.log('🎯 Pour démarrer un test, utilisez une des commandes stress dans un nouveau terminal!');

// Garder le script actif
process.stdin.setRawMode(true);
process.stdin.resume();
process.stdin.on('data', (key) => {
    if (key.toString() === '\u0003') { // Ctrl+C
        console.log('\n👋 Arrêt du monitoring...');
        process.exit(0);
    }
});
