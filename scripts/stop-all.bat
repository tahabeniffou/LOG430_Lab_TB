@echo off
echo.
echo ==========================================
echo  ARRET COORDONNE LAB 5-6-7
echo  Arret Integration Complete
echo ==========================================
echo.

:: Arrêt des processus Node.js (LAB 6 et autres)
echo [1/4] Arret des processus Node.js...
echo Arret Saga Orchestrator et autres services Node.js...
taskkill /f /im node.exe >nul 2>nul
if errorlevel 1 (
    echo ⚠️  Aucun processus Node.js en cours
) else (
    echo ✅ Processus Node.js arretes
)
echo.

:: Arrêt de l'architecture événementielle (LAB 7)
echo [2/4] Arret architecture evenementielle LAB 7...
if exist "docker-compose-eventdriven.yml" (
    echo Arret RabbitMQ, Event Store et services evenementiels...
    docker-compose -f docker-compose-eventdriven.yml down
    echo ✅ Architecture evenementielle arretee
) else (
    echo ⚠️  docker-compose-eventdriven.yml non trouve
)
echo.

:: Arrêt de l'infrastructure principale (LAB 5)
echo [3/4] Arret infrastructure principale LAB 5...
if exist "docker-compose.yml" (
    echo Arret microservices, Kong, Prometheus, Grafana...
    docker-compose down
    echo ✅ Infrastructure principale arretee
) else (
    echo ⚠️  docker-compose.yml non trouve
)
echo.

:: Nettoyage des volumes et réseaux (optionnel)
echo [4/4] Nettoyage avance (optionnel)...
set /p cleanup="Voulez-vous nettoyer les volumes et reseaux ? (y/N): "
if /i "%cleanup%"=="y" (
    echo Nettoyage des volumes...
    docker volume prune -f
    echo Nettoyage des reseaux...
    docker network prune -f
    echo ✅ Nettoyage avance termine
) else (
    echo ⚠️  Nettoyage avance ignore
)
echo.

:: Vérification de l'arrêt complet
echo 📊 VERIFICATION ARRET COMPLET:
echo.
echo Conteneurs encore actifs:
docker ps --format "table {{.Names}}\t{{.Status}}" | findstr -v "CONTAINER"
if errorlevel 1 (
    echo ✅ Aucun conteneur actif
) else (
    echo ⚠️  Certains conteneurs sont encore actifs
)
echo.

echo Processus Node.js encore actifs:
tasklist /fi "imagename eq node.exe" /fo table 2>nul | findstr node.exe
if errorlevel 1 (
    echo ✅ Aucun processus Node.js actif
) else (
    echo ⚠️  Certains processus Node.js sont encore actifs
)

echo.
echo ==========================================
echo  ARRET TERMINE !
echo ==========================================
echo.
echo 🧹 COMMANDES DE NETTOYAGE SUPPLEMENTAIRES:
echo.
echo Nettoyage complet Docker:
echo   docker system prune -a --volumes
echo.
echo Forcer l'arret des processus:
echo   taskkill /f /im node.exe
echo   taskkill /f /im docker.exe
echo.
echo Redemarrage complet:
echo   scripts\start-integration-complete.bat
echo.

pause
