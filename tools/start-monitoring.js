const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🚀 DÉMARRAGE MONITORING GRAFANA + PROMETHEUS');
console.log('==================================================');

// Vérifier que Docker est installé
function checkDockerInstalled() {
    return new Promise((resolve, reject) => {
        const docker = spawn('docker', ['--version'], { shell: true });
        docker.on('close', (code) => {
            if (code === 0) {
                console.log('✅ Docker détecté');
                resolve(true);
            } else {
                console.log('❌ Docker non trouvé. Veuillez installer Docker Desktop');
                reject(false);
            }
        });
        docker.on('error', () => {
            console.log('❌ Docker non trouvé. Veuillez installer Docker Desktop');
            reject(false);
        });
    });
}

// Vérifier que les fichiers de config existent
function checkConfigFiles() {
    const configPath = path.join(__dirname, '..', 'config');
    const requiredFiles = [
        'docker-compose.monitoring.yml',
        'prometheus.yml',
        'grafana/datasources/prometheus.yml',
        'grafana/dashboards/pos-overview.json'
    ];

    console.log('🔍 Vérification des fichiers de configuration...');
    
    for (const file of requiredFiles) {
        const filePath = path.join(configPath, file);
        if (!fs.existsSync(filePath)) {
            console.log(`❌ Fichier manquant: ${file}`);
            return false;
        }
    }
    
    console.log('✅ Tous les fichiers de configuration présents');
    return true;
}

// Démarrer les services de monitoring
async function startMonitoring() {
    try {
        await checkDockerInstalled();
        
        if (!checkConfigFiles()) {
            console.log('❌ Configuration incomplète. Vérifiez le dossier config/');
            return;
        }

        console.log('🐳 Démarrage de Prometheus + Grafana...');
        
        const configPath = path.join(__dirname, '..', 'config');
        const dockerCompose = spawn('docker-compose', [
            '-f', 'docker-compose.monitoring.yml',
            'up', '-d'
        ], { 
            cwd: configPath,
            shell: true,
            stdio: 'pipe'
        });

        dockerCompose.stdout.on('data', (data) => {
            console.log(data.toString());
        });

        dockerCompose.stderr.on('data', (data) => {
            console.log(data.toString());
        });

        dockerCompose.on('close', (code) => {
            if (code === 0) {
                console.log('✅ Services de monitoring démarrés avec succès!');
                console.log('');
                console.log('🌐 ACCÈS AUX SERVICES:');
                console.log('==================================================');
                console.log('📊 Grafana Dashboard : http://localhost:3000');
                console.log('   Login: admin / Password: admin123');
                console.log('');
                console.log('🔍 Prometheus        : http://localhost:9090');
                console.log('');
                console.log('📈 DASHBOARDS DISPONIBLES:');
                console.log('   - 📊 POS System - Vue d\'Ensemble');
                console.log('   - 📈 POS Analytics - Vue Business');
                console.log('');
                console.log('⚙️  MÉTRIQUES DES SERVICES:');
                console.log('   - API Gateway  : http://localhost:3000/metrics');
                console.log('   - Produit      : http://localhost:3001/metrics');
                console.log('   - Stock        : http://localhost:3002/metrics');
                console.log('   - Vente        : http://localhost:3003/metrics');
                console.log('   - Reporting    : http://localhost:3004/metrics');
                console.log('');
                console.log('🚀 Pour arrêter: npm run monitoring:stop');
            } else {
                console.log(`❌ Erreur lors du démarrage (code: ${code})`);
            }
        });

    } catch (error) {
        console.log('❌ Erreur:', error);
    }
}

// Fonction pour arrêter les services
function stopMonitoring() {
    console.log('🛑 Arrêt des services de monitoring...');
    
    const configPath = path.join(__dirname, '..', 'config');
    const dockerCompose = spawn('docker-compose', [
        '-f', 'docker-compose.monitoring.yml',
        'down'
    ], { 
        cwd: configPath,
        shell: true,
        stdio: 'inherit'
    });

    dockerCompose.on('close', (code) => {
        if (code === 0) {
            console.log('✅ Services de monitoring arrêtés');
        } else {
            console.log(`❌ Erreur lors de l'arrêt (code: ${code})`);
        }
    });
}

// Gestion des arguments de ligne de commande
const args = process.argv.slice(2);

if (args.includes('stop')) {
    stopMonitoring();
} else {
    startMonitoring();
}

module.exports = { startMonitoring, stopMonitoring };
