@echo off
echo 🚀 Déploiement complet du système POS LOG430 avec Docker
echo ==================================================

REM Vérifier que Docker est installé
docker --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ Docker n'est pas installé
    exit /b 1
)

REM Vérifier que Docker est en cours d'exécution
docker info >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ Docker n'est pas en cours d'exécution
    exit /b 1
)

REM Nettoyer les conteneurs existants
echo 🧹 Nettoyage des conteneurs existants...
docker-compose down -v --remove-orphans

REM Construire les images
echo 🔨 Construction des images Docker...
docker-compose build --no-cache

REM Démarrer les bases de données en premier
echo 🗄️ Démarrage des bases de données PostgreSQL...
docker-compose up -d postgres-produit postgres-stock postgres-vente postgres-reporting kong-db

REM Attendre que les bases de données soient prêtes
echo ⏳ Attente de la disponibilité des bases de données...
timeout /t 30 /nobreak >nul

REM Démarrer Kong
echo 🌉 Démarrage de Kong API Gateway...
docker-compose up -d kong-migrations
timeout /t 10 /nobreak >nul
docker-compose up -d kong-migrations-up
timeout /t 10 /nobreak >nul
docker-compose up -d kong

REM Attendre que Kong soit prêt
echo ⏳ Attente de Kong...
timeout /t 20 /nobreak >nul

REM Démarrer les microservices
echo 🔧 Démarrage des microservices...
docker-compose up -d produit-service-1 produit-service-2
docker-compose up -d stock-service-1 stock-service-2
docker-compose up -d vente-service-1 vente-service-2
docker-compose up -d reporting-service-1 reporting-service-2

REM Attendre que les microservices soient prêts
echo ⏳ Attente des microservices...
timeout /t 30 /nobreak >nul

REM Configurer Kong
echo ⚙️ Configuration de Kong...
docker-compose up --no-deps kong-config

REM Démarrer le monitoring
echo 📊 Démarrage du monitoring...
docker-compose up -d prometheus grafana

REM Démarrer le service legacy
echo 🏛️ Démarrage du service legacy...
docker-compose up -d legacy-service

echo.
echo ✅ Déploiement terminé avec succès!
echo.
echo 🌐 Services disponibles:
echo   • Kong API Gateway: http://localhost:8000
echo   • Kong Admin: http://localhost:8001
echo   • Kong Manager: http://localhost:8002
echo   • Prometheus: http://localhost:9090
echo   • Grafana: http://localhost:3001 (admin/admin)
echo   • Service Legacy: http://localhost:3000
echo.
echo 🔍 Pour vérifier l'état des services:
echo   docker-compose ps
echo.
echo 📋 Pour voir les logs:
echo   docker-compose logs -f [service_name]
echo.
echo 🛑 Pour arrêter le système:
echo   docker-compose down
