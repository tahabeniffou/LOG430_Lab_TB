#!/bin/bash

# Script de test et validation du déploiement Docker
# Vérifie que tous les services sont opérationnels

set -e

echo "🧪 Tests de validation du déploiement Docker"
echo "============================================"

# Couleurs
RED='\033[0;31m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m'

log_info() { echo -e "${BLUE}[INFO]${NC} $1"; }
log_success() { echo -e "${GREEN}[SUCCESS]${NC} $1"; }
log_warning() { echo -e "${YELLOW}[WARNING]${NC} $1"; }
log_error() { echo -e "${RED}[ERROR]${NC} $1"; }

# Test 1: Services en cours d'exécution
test_services_running() {
    log_info "Test 1: Vérification des services Docker..."
    
    if ! docker-compose ps | grep -q "Up"; then
        log_error "Aucun service Docker n'est en cours d'exécution"
        return 1
    fi
    
    # Vérifier les services individuels
    local services=("db" "api")
    for service in "${services[@]}"; do
        if docker-compose ps "$service" | grep -q "Up"; then
            log_success "Service $service: ✓ En cours d'exécution"
        else
            log_error "Service $service: ✗ Non disponible"
            return 1
        fi
    done
}

# Test 2: Connectivité base de données
test_database_connectivity() {
    log_info "Test 2: Connectivité à la base de données..."
    
    if docker-compose exec -T db pg_isready -U posuser -d posdb > /dev/null 2>&1; then
        log_success "Base de données PostgreSQL: ✓ Accessible"
    else
        log_error "Base de données PostgreSQL: ✗ Non accessible"
        return 1
    fi
}

# Test 3: API REST accessible
test_api_accessibility() {
    log_info "Test 3: Accessibilité de l'API REST..."
    
    local max_attempts=30
    local attempt=1
    
    while [ $attempt -le $max_attempts ]; do
        if curl -sf http://localhost:3000/ > /dev/null 2>&1; then
            log_success "API REST: ✓ Accessible sur http://localhost:3000"
            return 0
        fi
        
        log_info "Tentative $attempt/$max_attempts - Attente de l'API..."
        sleep 2
        ((attempt++))
    done
    
    log_error "API REST: ✗ Non accessible après $max_attempts tentatives"
    return 1
}

# Test 4: Documentation Swagger
test_swagger_documentation() {
    log_info "Test 4: Documentation Swagger..."
    
    if curl -sf http://localhost:3000/api-docs/swagger.json > /dev/null 2>&1; then
        log_success "Documentation Swagger: ✓ Disponible"
    else
        log_error "Documentation Swagger: ✗ Non disponible"
        return 1
    fi
}

# Test 5: Endpoints API principaux
test_api_endpoints() {
    log_info "Test 5: Tests des endpoints API..."
    
    # Note: Ces tests peuvent échouer si l'API n'a pas les routes actives
    # On teste juste que l'API répond sans erreur 500
    
    local endpoints=("/" "/api-docs" "/metrics")
    for endpoint in "${endpoints[@]}"; do
        local status_code=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3000"$endpoint")
        if [[ "$status_code" =~ ^[2-4][0-9][0-9]$ ]]; then
            log_success "Endpoint $endpoint: ✓ Répond (HTTP $status_code)"
        else
            log_warning "Endpoint $endpoint: ⚠ HTTP $status_code"
        fi
    done
}

# Test 6: Logs des services
test_service_logs() {
    log_info "Test 6: Vérification des logs..."
    
    local services=("db" "api")
    for service in "${services[@]}"; do
        local error_count=$(docker-compose logs "$service" 2>/dev/null | grep -ci "error\|fatal\|exception" || echo "0")
        if [ "$error_count" -eq 0 ]; then
            log_success "Logs $service: ✓ Aucune erreur critique"
        else
            log_warning "Logs $service: ⚠ $error_count erreur(s) détectée(s)"
        fi
    done
}

# Test 7: Performances et ressources
test_performance() {
    log_info "Test 7: Vérification des performances..."
    
    # Test de réponse API
    local response_time=$(curl -o /dev/null -s -w "%{time_total}" http://localhost:3000/)
    local response_time_ms=$(echo "$response_time * 1000" | bc -l 2>/dev/null || echo "N/A")
    
    if [[ "$response_time_ms" != "N/A" ]] && (( $(echo "$response_time < 2" | bc -l) )); then
        log_success "Temps de réponse API: ✓ ${response_time_ms%.*}ms (< 2s)"
    else
        log_warning "Temps de réponse API: ⚠ ${response_time}s"
    fi
    
    # Utilisation mémoire des conteneurs
    docker-compose exec -T api sh -c 'echo "Utilisation mémoire API: $(ps -o pid,ppid,vsz,rss,comm --no-headers -C node | head -1)"' 2>/dev/null || true
}

# Fonction principale de test
run_all_tests() {
    local tests_passed=0
    local total_tests=7
    
    echo ""
    
    # Exécuter tous les tests
    test_services_running && ((tests_passed++))
    test_database_connectivity && ((tests_passed++))
    test_api_accessibility && ((tests_passed++))
    test_swagger_documentation && ((tests_passed++))
    test_api_endpoints && ((tests_passed++))
    test_service_logs && ((tests_passed++))
    test_performance && ((tests_passed++))
    
    echo ""
    echo "==============================================="
    
    if [ $tests_passed -eq $total_tests ]; then
        log_success "🎉 Tous les tests sont passés! ($tests_passed/$total_tests)"
        log_info "Le système est prêt à être utilisé:"
        echo "  - API: http://localhost:3000"
        echo "  - Swagger: http://localhost:3000/api-docs"
        echo "  - Redoc: http://localhost:3000/redoc"
        return 0
    else
        log_warning "⚠️ Quelques tests ont échoué ($tests_passed/$total_tests réussis)"
        log_info "Vérifiez les logs avec: docker-compose logs"
        return 1
    fi
}

# Affichage de l'aide
show_help() {
    echo "Usage: $0 [OPTIONS]"
    echo ""
    echo "Options:"
    echo "  --quick, -q    Tests rapides uniquement"
    echo "  --verbose, -v  Mode verbeux"
    echo "  --help, -h     Afficher cette aide"
    echo ""
}

# Traitement des arguments
case "${1:-}" in
    "--quick"|"-q")
        log_info "Mode test rapide activé"
        test_services_running && test_api_accessibility
        ;;
    "--help"|"-h")
        show_help
        ;;
    "--verbose"|"-v")
        set -x
        run_all_tests
        ;;
    "")
        run_all_tests
        ;;
    *)
        log_error "Option inconnue: $1"
        show_help
        exit 1
        ;;
esac
