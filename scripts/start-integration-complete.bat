@echo off
echo.
echo ==========================================
echo  DEMARRAGE COORDONNE LAB 5-6-7
echo  Integration Complete Architecture
echo ==========================================
echo.

:: Vérification des prérequis
echo [1/8] Verification des prerequis...
where docker >nul 2>nul
if errorlevel 1 (
    echo ❌ Docker n'est pas installe ou accessible
    pause
    exit /b 1
)

where node >nul 2>nul
if errorlevel 1 (
    echo ❌ Node.js n'est pas installe ou accessible
    pause
    exit /b 1
)

echo ✅ Prerequis OK
echo.

:: Nettoyage des processus existants
echo [2/8] Nettoyage des processus existants...
taskkill /f /im node.exe >nul 2>nul
taskkill /f /im docker-compose.exe >nul 2>nul
echo ✅ Nettoyage termine
echo.

:: Démarrage de l'infrastructure de base (LAB 5)
echo [3/8] Demarrage infrastructure LAB 5 (Microservices de base)...
echo Demarrage Docker Compose principal...
start /b docker-compose up -d
timeout /t 10 /nobreak >nul
echo ✅ Infrastructure LAB 5 en cours de demarrage
echo.

:: Démarrage architecture événementielle (LAB 7)
echo [4/8] Demarrage architecture evenementielle LAB 7...
echo Demarrage RabbitMQ et Event Store...
start /b docker-compose -f docker-compose-eventdriven.yml up -d
timeout /t 15 /nobreak >nul
echo ✅ Architecture evenementielle LAB 7 en cours de demarrage
echo.

:: Attente stabilisation des services
echo [5/8] Attente stabilisation des services (30s)...
timeout /t 30 /nobreak >nul
echo ✅ Services stabilises
echo.

:: Démarrage Saga Orchestrator (LAB 6)
echo [6/8] Demarrage Saga Orchestrator LAB 6...
if exist "saga-orchestrator-prometheus.js" (
    echo Demarrage du Saga Orchestrator...
    start /b node saga-orchestrator-prometheus.js
    timeout /t 5 /nobreak >nul
    echo ✅ Saga Orchestrator demarre
) else (
    echo ⚠️  Saga Orchestrator non trouve (optionnel)
)
echo.

:: Vérification de l'état des services
echo [7/8] Verification de l'etat des services...
echo Verification en cours...
timeout /t 10 /nobreak >nul

:: Affichage de l'état des conteneurs
echo.
echo 📊 ETAT DES CONTENEURS:
docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}" | findstr -v "CONTAINER"
echo.

:: Affichage des services disponibles
echo 📡 SERVICES DISPONIBLES:
echo.
echo LAB 5 - Microservices:
echo   📦 Produit Service     : http://localhost:3001
echo   📦 Stock Service       : http://localhost:3002
echo   📦 Vente Service       : http://localhost:3003
echo   📦 Reporting Service   : http://localhost:3004
echo   📦 Compte Service      : http://localhost:3005
echo   📦 Panier Service      : http://localhost:3006
echo   📦 Checkout Service    : http://localhost:3007
echo.
echo LAB 6 - Saga Pattern:
echo   🔄 Saga Orchestrator   : http://localhost:8010
echo.
echo LAB 7 - Event-Driven:
echo   📡 Reclamation Service : http://localhost:8011
echo   📡 Notification Service: http://localhost:8012
echo   📡 Audit Service       : http://localhost:8013
echo   📡 Analytics Service   : http://localhost:8014
echo.
echo Infrastructure:
echo   🌐 Kong API Gateway    : http://localhost:8000
echo   📊 Prometheus          : http://localhost:9090
echo   📈 Grafana             : http://localhost:3000
echo   🐰 RabbitMQ Management : http://localhost:15672
echo   🗄️  Event Store DB      : localhost:5433
echo.

:: Lancement des tests d'intégration
echo [8/8] Lancement des tests d'integration...
if exist "scripts\tests\test-integration-complete.js" (
    echo.
    echo 🧪 Lancement des tests d'integration dans 10 secondes...
    echo (Appuyez sur Ctrl+C pour annuler)
    timeout /t 10 /nobreak >nul
    
    echo Execution des tests d'integration...
    node scripts\tests\test-integration-complete.js
) else (
    echo ⚠️  Script de test d'integration non trouve
)

echo.
echo ==========================================
echo  DEMARRAGE TERMINE !
echo ==========================================
echo.
echo 🎯 COMMANDES UTILES:
echo.
echo Voir les logs:
echo   docker-compose logs -f [service]
echo   docker-compose -f docker-compose-eventdriven.yml logs -f
echo.
echo Arreter les services:
echo   scripts\stop-all.bat
echo.
echo Tests manuels:
echo   node scripts\tests\test-integration-complete.js
echo   node test-microservices-workflow.js
echo.
echo Monitoring:
echo   Grafana: http://localhost:3000 (admin/admin)
echo   Prometheus: http://localhost:9090
echo   RabbitMQ: http://localhost:15672 (guest/guest)
echo.

pause
