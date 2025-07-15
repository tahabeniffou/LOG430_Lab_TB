@echo off
REM Script de démarrage pour tester le Saga Orchestrator (Windows)
REM Usage: start-saga-test.bat

echo 🚀 Démarrage du test du Saga Orchestrator
echo ==========================================

REM Vérifier si Docker est disponible
docker --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ Docker n'est pas installé ou disponible
    exit /b 1
)

REM Vérifier si Docker Compose est disponible
docker-compose --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ Docker Compose n'est pas installé ou disponible
    exit /b 1
)

echo 📦 Construction et démarrage des services...

REM Construire et démarrer les services essentiels pour le test
docker-compose up -d postgres-stock postgres-compte postgres-vente postgres-produit kong-database kong-migrations kong produit-service-1 stock-service-1 vente-service-1 compte-service-1 saga-orchestrator-service

REM Attendre que les services soient prêts
echo ⏳ Attente du démarrage des services...
timeout /t 30 /nobreak >nul

REM Vérifier la santé des services
echo 🔍 Vérification de la santé des services...

docker-compose ps | findstr "kong.*Up" >nul && echo ✅ Kong: En cours d'exécution || echo ❌ Kong: Problème détecté
docker-compose ps | findstr "produit-service-1.*Up" >nul && echo ✅ Produit Service: En cours d'exécution || echo ❌ Produit Service: Problème détecté
docker-compose ps | findstr "stock-service-1.*Up" >nul && echo ✅ Stock Service: En cours d'exécution || echo ❌ Stock Service: Problème détecté
docker-compose ps | findstr "vente-service-1.*Up" >nul && echo ✅ Vente Service: En cours d'exécution || echo ❌ Vente Service: Problème détecté
docker-compose ps | findstr "compte-service-1.*Up" >nul && echo ✅ Compte Service: En cours d'exécution || echo ❌ Compte Service: Problème détecté
docker-compose ps | findstr "saga-orchestrator-service.*Up" >nul && echo ✅ Saga Orchestrator: En cours d'exécution || echo ❌ Saga Orchestrator: Problème détecté

echo.
echo 🧪 Services prêts pour les tests Saga:
echo   - Saga Orchestrator: http://localhost:8010
echo   - Kong Gateway: http://localhost:8000
echo   - Health checks disponibles sur /health
echo.
echo 📝 Pour tester le Saga:
echo   node test-saga.js
echo.
echo 📊 Pour voir les logs du Saga Orchestrator:
echo   docker-compose logs -f saga-orchestrator-service
echo.
echo 🛑 Pour arrêter les services:
echo   docker-compose down

REM Optionnel: Lancer automatiquement le test
if "%1"=="--test" (
    echo 🧪 Lancement automatique des tests...
    timeout /t 10 /nobreak >nul
    node test-saga.js
)
