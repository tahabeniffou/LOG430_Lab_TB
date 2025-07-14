#!/bin/bash

# =========================================
# SCRIPT DE MONITORING SYSTÈME - LOG430
# =========================================

# Configuration
LOG_DIR="/var/log/log430"
LOG_FILE="$LOG_DIR/system-monitor.log"
HEALTH_CHECK_INTERVAL=30
SERVICES=(
    "kong:8000"
    "kong-admin:8001"
    "grafana:3030"
    "prometheus:9090"
    "legacy:3200"
    "produit:3001"
    "stock:3002"
    "vente:3003"
    "reporting:3004"
)

# Couleurs pour les logs
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Fonction de logging avec timestamp
log_with_timestamp() {
    local level=$1
    local message=$2
    local timestamp=$(date '+%Y-%m-%d %H:%M:%S')
    echo -e "${timestamp} [${level}] ${message}" | tee -a "$LOG_FILE"
}

log_info() {
    log_with_timestamp "INFO" "$1"
}

log_success() {
    log_with_timestamp "SUCCESS" "${GREEN}$1${NC}"
}

log_warning() {
    log_with_timestamp "WARNING" "${YELLOW}$1${NC}"
}

log_error() {
    log_with_timestamp "ERROR" "${RED}$1${NC}"
}

# Vérification de la santé des services
check_service_health() {
    local service_name=$1
    local port=$2
    local url="http://localhost:$port"
    
    # Tentative de connexion
    if curl -s --max-time 5 "$url" >/dev/null 2>&1; then
        log_success "$service_name (port $port) - OK"
        return 0
    else
        log_error "$service_name (port $port) - FAILED"
        return 1
    fi
}

# Vérification des conteneurs Docker
check_docker_containers() {
    log_info "Vérification des conteneurs Docker..."
    
    local failed_containers=()
    
    # Lister les conteneurs qui devraient être en cours d'exécution
    local expected_containers=(
        "kong"
        "kong-database"
        "postgres-db"
        "produit-service"
        "stock-service"
        "vente-service"
        "reporting-service"
        "legacy-system"
        "prometheus"
        "grafana"
    )
    
    for container in "${expected_containers[@]}"; do
        if ! docker ps --format "table {{.Names}}" | grep -q "$container"; then
            failed_containers+=("$container")
            log_error "Conteneur $container non trouvé ou arrêté"
        fi
    done
    
    if [ ${#failed_containers[@]} -eq 0 ]; then
        log_success "Tous les conteneurs Docker sont opérationnels"
        return 0
    else
        log_warning "${#failed_containers[@]} conteneur(s) en échec: ${failed_containers[*]}"
        return 1
    fi
}

# Vérification de l'utilisation des ressources
check_system_resources() {
    log_info "Vérification des ressources système..."
    
    # CPU
    local cpu_usage
    cpu_usage=$(top -bn1 | grep "Cpu(s)" | awk '{print $2}' | sed 's/%us,//')
    log_info "Utilisation CPU: ${cpu_usage}%"
    
    # Mémoire
    local memory_info
    memory_info=$(free -m | awk 'NR==2{printf "Used: %.1fGB (%.1f%%) | Free: %.1fGB", $3/1024, $3*100/$2, $4/1024}')
    log_info "Mémoire: $memory_info"
    
    # Disque
    local disk_usage
    disk_usage=$(df -h / | awk 'NR==2 {printf "Used: %s (%s) | Free: %s", $3, $5, $4}')
    log_info "Disque /: $disk_usage"
    
    return 0
}

# Boucle principale de monitoring
main_monitoring_loop() {
    log_info "Démarrage du monitoring système LOG430..."
    log_info "Intervalle de vérification: ${HEALTH_CHECK_INTERVAL}s"
    
    while true; do
        log_info "=== CYCLE DE VÉRIFICATION ==="
        
        # Vérifications des services
        for service_info in "${SERVICES[@]}"; do
            local service_name="${service_info%:*}"
            local port="${service_info#*:}"
            check_service_health "$service_name" "$port"
        done
        
        # Vérifications Docker
        check_docker_containers
        
        # Vérifications ressources
        check_system_resources
        
        log_info "Cycle terminé. Prochaine vérification dans ${HEALTH_CHECK_INTERVAL}s"
        sleep $HEALTH_CHECK_INTERVAL
    done
}

# Gestion des signaux
cleanup() {
    log_info "Arrêt du monitoring système..."
    exit 0
}

trap cleanup SIGTERM SIGINT

# Point d'entrée
if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
    # Créer le répertoire de logs s'il n'existe pas
    mkdir -p "$LOG_DIR"
    
    # Démarrer le monitoring
    main_monitoring_loop
fi
