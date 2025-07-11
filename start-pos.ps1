# LOG430 POS - Script PowerShell de déploiement et lancement
# Ce script lance l'ensemble du système POS via Docker sur Windows

param(
    [Parameter(Position=0)]
    [string]$Command = ""
)

# Couleurs pour PowerShell
$ErrorActionPreference = "Stop"

function Write-ColoredOutput {
    param(
        [string]$Message,
        [string]$Color = "White"
    )
    Write-Host $Message -ForegroundColor $Color
}

function Log-Info {
    param([string]$Message)
    Write-ColoredOutput "[INFO] $Message" "Cyan"
}

function Log-Success {
    param([string]$Message)
    Write-ColoredOutput "[SUCCESS] $Message" "Green"
}

function Log-Warning {
    param([string]$Message)
    Write-ColoredOutput "[WARNING] $Message" "Yellow"
}

function Log-Error {
    param([string]$Message)
    Write-ColoredOutput "[ERROR] $Message" "Red"
}

function Check-Docker {
    Log-Info "Vérification des prérequis..."
    
    try {
        $null = Get-Command docker -ErrorAction Stop
        $null = docker --version
    }
    catch {
        Log-Error "Docker n'est pas installé ou n'est pas dans le PATH"
        Log-Error "Veuillez installer Docker Desktop pour Windows"
        exit 1
    }
    
    try {
        $null = docker compose version
    }
    catch {
        try {
            $null = Get-Command docker-compose -ErrorAction Stop
        }
        catch {
            Log-Error "Docker Compose n'est pas installé"
            exit 1
        }
    }
    
    Log-Success "Docker et Docker Compose sont installés ✓"
}

function Start-Services {
    Log-Info "Construction et démarrage des services..."
    
    # Construire et démarrer les services
    docker compose up --build -d db api
    
    Log-Info "Attente du démarrage des services de base..."
    Start-Sleep -Seconds 10
    
    # Vérifier que l'API est accessible
    Log-Info "Vérification de l'état de l'API..."
    
    $timeout = 60
    $elapsed = 0
    
    do {
        try {
            $response = Invoke-WebRequest -Uri "http://localhost:3000/api-docs/swagger.json" -UseBasicParsing -ErrorAction Stop
            if ($response.StatusCode -eq 200) {
                break
            }
        }
        catch {
            Start-Sleep -Seconds 2
            $elapsed += 2
        }
    } while ($elapsed -lt $timeout)
    
    if ($elapsed -ge $timeout) {
        Log-Error "L'API n'a pas pu démarrer dans les temps"
        exit 1
    }
    
    Log-Success "API démarrée et accessible sur http://localhost:3000"
    Log-Success "Documentation Swagger disponible sur http://localhost:3000/api-docs"
    Log-Success "Documentation Redoc disponible sur http://localhost:3000/redoc"
}

function Stop-Services {
    Log-Info "Arrêt des services..."
    docker compose down
    Log-Success "Services arrêtés"
}

function Show-Logs {
    Log-Info "Affichage des logs en temps réel (Ctrl+C pour arrêter)..."
    docker compose logs -f
}

function Start-PosConsole {
    Log-Info "Lancement de la console POS (Magasin)..."
    docker compose run --rm pos-console
}

function Start-MaisonMereConsole {
    Log-Info "Lancement de la console Maison Mère..."
    docker compose run --rm maison-mere-console
}

function Run-Tests {
    Log-Info "Exécution des tests..."
    docker compose run --rm api npm test
}

function Show-Status {
    Log-Info "État des services:"
    docker compose ps
    Write-Host ""
    Log-Info "URLs importantes:"
    Write-Host "  - API REST: http://localhost:3000"
    Write-Host "  - Swagger UI: http://localhost:3000/api-docs"
    Write-Host "  - Redoc: http://localhost:3000/redoc"
    Write-Host "  - Base de données PostgreSQL: localhost:5432"
}

function Clean-All {
    Log-Warning "Cette action va supprimer tous les conteneurs et volumes."
    $response = Read-Host "Continuer? (y/N)"
    
    if ($response -match "^[yY]([eE][sS])?$") {
        docker compose down -v --remove-orphans
        docker system prune -f
        Log-Success "Nettoyage complet terminé"
    }
    else {
        Log-Info "Nettoyage annulé"
    }
}

function Show-Help {
    Write-Host "Usage: .\start-pos.ps1 [COMMAND]"
    Write-Host ""
    Write-Host "Commandes disponibles:"
    Write-Host "  start         Démarrer les services (DB + API)"
    Write-Host "  stop          Arrêter tous les services"
    Write-Host "  restart       Redémarrer tous les services"
    Write-Host "  logs          Afficher les logs en temps réel"
    Write-Host "  pos           Lancer la console POS (Magasin)"
    Write-Host "  maison-mere   Lancer la console Maison Mère"
    Write-Host "  test          Exécuter les tests"
    Write-Host "  status        Afficher l'état des services"
    Write-Host "  clean         Nettoyer complètement (containers + volumes)"
    Write-Host "  help          Afficher cette aide"
    Write-Host ""
    Write-Host "Exemples:"
    Write-Host "  .\start-pos.ps1 start           # Démarrer le système"
    Write-Host "  .\start-pos.ps1 pos             # Lancer la console magasin"
    Write-Host "  .\start-pos.ps1 logs            # Voir les logs"
    Write-Host ""
}

# Affichage du titre
Write-Host ""
Write-ColoredOutput "🚀 Démarrage du système POS LOG430..." "Magenta"
Write-ColoredOutput "====================================" "Magenta"
Write-Host ""

# Traitement des commandes
switch ($Command.ToLower()) {
    "start" {
        Check-Docker
        Start-Services
        Show-Status
    }
    "stop" {
        Stop-Services
    }
    "restart" {
        Check-Docker
        Stop-Services
        Start-Services
        Show-Status
    }
    "logs" {
        Show-Logs
    }
    "pos" {
        Check-Docker
        Start-PosConsole
    }
    "maison-mere" {
        Check-Docker
        Start-MaisonMereConsole
    }
    "test" {
        Check-Docker
        Run-Tests
    }
    "status" {
        Show-Status
    }
    "clean" {
        Clean-All
    }
    "help" {
        Show-Help
    }
    "" {
        Log-Info "Démarrage automatique du système..."
        Check-Docker
        Start-Services
        Show-Status
        Write-Host ""
        Log-Info "Utilisez '.\start-pos.ps1 help' pour voir toutes les commandes disponibles"
    }
    default {
        Log-Error "Commande inconnue: $Command"
        Show-Help
        exit 1
    }
}
