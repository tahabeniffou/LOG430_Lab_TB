@echo off
echo.
echo ==========================================
echo  DEMARRAGE DASHBOARDS GRAFANA LAB 7
echo  Topics RabbitMQ et Event-Driven
echo ==========================================
echo.

:: Vérification des prérequis
echo [1/6] Verification des services...
echo Verification de Grafana...
curl -s http://localhost:3000/api/health >nul 2>nul
if errorlevel 1 (
    echo ❌ Grafana non accessible sur le port 3000
    echo 🔧 Demarrez d'abord: docker-compose up -d
    pause
    exit /b 1
)

echo Verification de Prometheus...
curl -s http://localhost:9090/-/healthy >nul 2>nul
if errorlevel 1 (
    echo ❌ Prometheus non accessible sur le port 9090
    echo 🔧 Demarrez d'abord: docker-compose up -d
    pause
    exit /b 1
)

echo ✅ Infrastructure monitoring OK
echo.

:: Démarrage des services LAB 7 si nécessaire
echo [2/6] Verification services LAB 7...
curl -s http://localhost:8011/health >nul 2>nul
if errorlevel 1 (
    echo ⚠️  Service réclamation non démarré
    echo 🚀 Démarrage des services LAB 7...
    docker-compose -f docker-compose-lab7.yml up -d
    
    echo Attente du démarrage des services (30s)...
    timeout /t 30 /nobreak >nul
) else (
    echo ✅ Services LAB 7 déjà démarrés
)
echo.

:: Vérification RabbitMQ
echo [3/6] Verification RabbitMQ...
curl -s http://localhost:15672/ >nul 2>nul
if errorlevel 1 (
    echo ⚠️  RabbitMQ Management UI non accessible
    echo Attente du démarrage de RabbitMQ (15s)...
    timeout /t 15 /nobreak >nul
)

curl -s http://localhost:15672/ >nul 2>nul
if errorlevel 1 (
    echo ❌ RabbitMQ toujours non accessible
    echo 🔧 Vérifiez les logs: docker-compose -f docker-compose-lab7.yml logs rabbitmq
) else (
    echo ✅ RabbitMQ Management UI accessible
)
echo.

:: Import des dashboards
echo [4/6] Configuration des dashboards...
echo 📊 Import des dashboards LAB 7 dans Grafana...

:: Copie des fichiers de dashboard vers Grafana
if exist "config\grafana\dashboards\" (
    echo Copie des dashboards vers le conteneur Grafana...
    docker cp config\grafana\dashboards\event-driven-dashboard.json grafana-saga:/var/lib/grafana/dashboards/ 2>nul
    docker cp config\grafana\dashboards\rabbitmq-topics-dashboard.json grafana-saga:/var/lib/grafana/dashboards/ 2>nul
    
    if errorlevel 1 (
        echo ⚠️  Copie directe échouée, les dashboards seront importés manuellement
    ) else (
        echo ✅ Dashboards copiés vers Grafana
    )
) else (
    echo ⚠️  Répertoire dashboards non trouvé
)
echo.

:: Génération de données de test
echo [5/6] Generation de donnees de test...
echo 🎲 Démarrage génération données pour les topics...

if exist "scripts\generate-topics-data.js" (
    echo Test de connexion au service...
    node scripts\generate-topics-data.js --test
    
    if errorlevel 1 (
        echo ⚠️  Service de réclamation non accessible
        echo Les dashboards seront visibles mais sans données temps réel
    ) else (
        echo ✅ Service accessible
        echo.
        echo 🚀 Démarrage génération données (durée: 10 minutes)...
        echo    (Laissez cette fenêtre ouverte pour voir l'activité)
        echo.
        
        start /b node scripts\generate-topics-data.js
        timeout /t 5 /nobreak >nul
    )
) else (
    echo ⚠️  Script génération données non trouvé
)
echo.

:: Ouverture des dashboards
echo [6/6] Ouverture des dashboards...
echo.
echo 🎯 DASHBOARDS DISPONIBLES:
echo.
echo 📡 Event-Driven Architecture Dashboard:
echo    http://localhost:3000/d/lab7-event-driven/
echo.
echo 🐰 RabbitMQ Topics Activity Dashboard:
echo    http://localhost:3000/d/rabbitmq-topics-activity/
echo.
echo 🏠 Grafana Home (pour import manuel):
echo    http://localhost:3000/
echo    Login: admin / admin
echo.
echo 🔧 OUTILS DE MONITORING:
echo.
echo 📊 Prometheus Targets:
echo    http://localhost:9090/targets
echo.
echo 🐰 RabbitMQ Management:
echo    http://localhost:15672/
echo    Login: admin / admin123
echo.
echo 📝 Service Réclamation API:
echo    http://localhost:8011/health
echo.

:: Ouverture automatique dans le navigateur
set /p openBrowser="Ouvrir les dashboards dans le navigateur ? (y/N): "
if /i "%openBrowser%"=="y" (
    echo.
    echo 🌐 Ouverture des dashboards...
    start http://localhost:3000/d/lab7-event-driven/
    timeout /t 2 /nobreak >nul
    start http://localhost:3000/d/rabbitmq-topics-activity/
    timeout /t 2 /nobreak >nul
    start http://localhost:15672/
)

echo.
echo ==========================================
echo  DASHBOARDS PRÊTS !
echo ==========================================
echo.
echo 💡 IMPORT MANUEL DES DASHBOARDS (si nécessaire):
echo.
echo 1. Aller sur http://localhost:3000/
echo 2. Se connecter (admin/admin)
echo 3. Cliquer sur "+" puis "Import"
echo 4. Copier le contenu des fichiers JSON depuis:
echo    - config\grafana\dashboards\event-driven-dashboard.json
echo    - config\grafana\dashboards\rabbitmq-topics-dashboard.json
echo.
echo 🎲 GÉNÉRATION DONNÉES:
echo    Données générées automatiquement pendant 10 minutes
echo    Pour redémarrer: node scripts\generate-topics-data.js
echo.
echo 🛑 ARRÊT:
echo    Ctrl+C pour arrêter la génération de données
echo    scripts\stop-all.bat pour arrêter tous les services
echo.

echo Appuyez sur une touche pour continuer...
pause >nul
