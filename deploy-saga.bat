@echo off
REM Script de déploiement pour LAB 7 - Saga Chorégraphiée (Windows)
REM Usage: deploy-saga.bat [start|stop|restart|test|logs|status]

setlocal enabledelayedexpansion

set DOCKER_COMPOSE_FILE=docker-compose-saga.yml

REM Couleurs pour les messages (simulation)
set "INFO=[INFO]"
set "SUCCESS=[SUCCESS]"
set "WARNING=[WARNING]"
set "ERROR=[ERROR]"

if "%1"=="" goto show_help
if "%1"=="help" goto show_help
if "%1"=="-h" goto show_help
if "%1"=="--help" goto show_help

if "%1"=="start" goto start_services
if "%1"=="stop" goto stop_services
if "%1"=="restart" goto restart_services
if "%1"=="status" goto show_status
if "%1"=="logs" goto show_logs
if "%1"=="test" goto run_tests
if "%1"=="health" goto check_health
if "%1"=="cleanup" goto cleanup
if "%1"=="demo" goto create_demo

echo %ERROR% Commande inconnue: %1
goto show_help

:show_help
echo.
echo ===============================================================
echo   LAB 7 - SAGA CHOREGRAPHIEE - AIDE
echo ===============================================================
echo.
echo Usage: %0 [COMMAND] [OPTIONS]
echo.
echo Commandes disponibles:
echo   start      Demarrer tous les services
echo   stop       Arreter tous les services  
echo   restart    Redemarrer tous les services
echo   status     Afficher le statut des services
echo   logs       Afficher les logs
echo   test       Executer les tests de saga
echo   health     Verifier la sante des services
echo   cleanup    Nettoyer l'environnement Docker
echo   demo       Creer une reclamation de test
echo   help       Afficher cette aide
echo.
echo Exemples:
echo   %0 start
echo   %0 test
echo   %0 status
echo.
goto end

:check_prerequisites
echo %INFO% Verification des prerequis...

where docker >nul 2>&1
if %errorlevel% neq 0 (
    echo %ERROR% Docker n'est pas installe
    exit /b 1
)

where docker-compose >nul 2>&1
if %errorlevel% neq 0 (
    echo %ERROR% Docker Compose n'est pas installe
    exit /b 1
)

where node >nul 2>&1
if %errorlevel% neq 0 (
    echo %ERROR% Node.js n'est pas installe
    exit /b 1
)

echo %SUCCESS% Tous les prerequis sont satisfaits
goto :eof

:install_dependencies
echo %INFO% Installation des dependances Node.js...

if not exist "node_modules" (
    echo %INFO% Installation des dependances principales...
    npm install
)

REM Installation pour chaque service
for %%s in (validation-service notification-service payment-service) do (
    if exist "microservices\%%s" (
        if not exist "microservices\%%s\node_modules" (
            echo %INFO% Installation des dependances pour %%s...
            pushd "microservices\%%s"
            npm install
            popd
        )
    )
)

echo %SUCCESS% Dependances installees
goto :eof

:start_services
echo.
echo ===============================================================
echo   LAB 7 - SAGA CHOREGRAPHIEE - DEMARRAGE
echo ===============================================================
echo.

call :check_prerequisites
if %errorlevel% neq 0 goto end

call :install_dependencies

echo %INFO% Demarrage des services Docker...
docker-compose -f %DOCKER_COMPOSE_FILE% up -d

echo %INFO% Attente du demarrage des services (60 secondes)...
timeout /t 60 /nobreak >nul

call :check_health
goto end

:stop_services
echo.
echo ===============================================================
echo   LAB 7 - SAGA CHOREGRAPHIEE - ARRET
echo ===============================================================
echo.

echo %INFO% Arret des services Docker...
docker-compose -f %DOCKER_COMPOSE_FILE% down

echo %SUCCESS% Services arretes
goto end

:restart_services
echo.
echo ===============================================================
echo   LAB 7 - SAGA CHOREGRAPHIEE - REDEMARRAGE
echo ===============================================================
echo.

call :stop_services
timeout /t 5 /nobreak >nul
call :start_services
goto end

:check_health
echo %INFO% Verification de la sante des services...

set all_healthy=true

curl -s -f "http://localhost:8011/health" >nul 2>&1
if %errorlevel% equ 0 (
    echo %SUCCESS% Reclamation Service: En ligne
) else (
    echo %ERROR% Reclamation Service: Hors ligne
    set all_healthy=false
)

curl -s -f "http://localhost:8012/health" >nul 2>&1
if %errorlevel% equ 0 (
    echo %SUCCESS% Validation Service: En ligne
) else (
    echo %ERROR% Validation Service: Hors ligne
    set all_healthy=false
)

curl -s -f "http://localhost:8013/health" >nul 2>&1
if %errorlevel% equ 0 (
    echo %SUCCESS% Notification Service: En ligne
) else (
    echo %ERROR% Notification Service: Hors ligne
    set all_healthy=false
)

curl -s -f "http://localhost:8014/health" >nul 2>&1
if %errorlevel% equ 0 (
    echo %SUCCESS% Payment Service: En ligne
) else (
    echo %ERROR% Payment Service: Hors ligne
    set all_healthy=false
)

curl -s -f "http://localhost:15672" >nul 2>&1
if %errorlevel% equ 0 (
    echo %SUCCESS% RabbitMQ Management: En ligne
) else (
    echo %ERROR% RabbitMQ Management: Hors ligne
    set all_healthy=false
)

if "!all_healthy!"=="true" (
    echo.
    echo %SUCCESS% Tous les services sont en ligne!
    echo %INFO% URLs disponibles:
    echo   - Reclamation Service: http://localhost:8011
    echo   - Validation Service: http://localhost:8012
    echo   - Notification Service: http://localhost:8013
    echo   - Payment Service: http://localhost:8014
    echo   - RabbitMQ Management: http://localhost:15672 ^(rabbitmq/rabbitmq^)
    echo   - Sagas API: http://localhost:8011/api/sagas
) else (
    echo %WARNING% Certains services ne sont pas disponibles
)
goto :eof

:show_status
echo.
echo ===============================================================
echo   LAB 7 - SAGA CHOREGRAPHIEE - STATUT
echo ===============================================================
echo.

echo %INFO% Statut Docker Compose:
docker-compose -f %DOCKER_COMPOSE_FILE% ps

echo.
call :check_health
goto end

:show_logs
echo.
echo ===============================================================
echo   LAB 7 - SAGA CHOREGRAPHIEE - LOGS
echo ===============================================================
echo.

if "%2"=="" (
    echo %INFO% Affichage des logs de tous les services...
    docker-compose -f %DOCKER_COMPOSE_FILE% logs -f
) else (
    echo %INFO% Affichage des logs pour %2...
    docker-compose -f %DOCKER_COMPOSE_FILE% logs -f %2
)
goto end

:run_tests
echo.
echo ===============================================================
echo   LAB 7 - SAGA CHOREGRAPHIEE - TESTS
echo ===============================================================
echo.

echo %INFO% Verification que les services sont en ligne...
call :check_health

echo %INFO% Lancement des tests de saga choregraphiee...
node tests\saga-choreography-test.js

echo.
echo %INFO% Collecte des metriques post-test...
echo.
echo 📊 METRIQUES DISPONIBLES:
echo   - Reclamation Service: http://localhost:8011/metrics
echo   - Validation Service: http://localhost:8012/metrics
echo   - Notification Service: http://localhost:8013/metrics
echo   - Payment Service: http://localhost:8014/metrics
goto end

:cleanup
echo.
echo ===============================================================
echo   LAB 7 - SAGA CHOREGRAPHIEE - NETTOYAGE
echo ===============================================================
echo.

echo %INFO% Arret et suppression des conteneurs...
docker-compose -f %DOCKER_COMPOSE_FILE% down -v

echo %INFO% Suppression des images inutilisees...
docker system prune -f

echo %SUCCESS% Nettoyage termine
goto end

:create_demo
echo.
echo ===============================================================
echo   LAB 7 - SAGA CHOREGRAPHIEE - DEMO
echo ===============================================================
echo.

echo %INFO% Creation d'une reclamation de test...

set test_data={"titre":"Test Saga Manuelle","description":"Reclamation test avec montant 75.00€ pour validation manuelle","priorite":"normale","clientId":"client-test-manual","type":"REMBOURSEMENT"}

curl -s -X POST http://localhost:8011/api/reclamations -H "Content-Type: application/json" -d "%test_data%" > response.json

if %errorlevel% equ 0 (
    echo %SUCCESS% Reclamation creee avec succes!
    echo %INFO% Consultez response.json pour les details
    echo %INFO% Suivi possible via: http://localhost:8011/api/sagas
    type response.json
    del response.json
) else (
    echo %ERROR% Echec de creation de la reclamation
)
goto end

:end
echo.
echo Script termine.
pause
