#!/bin/bash

# Script de déploiement pour LAB 7 - Saga Chorégraphiée
# Usage: ./deploy-saga.sh [start|stop|restart|test|logs|status]

set -e

DOCKER_COMPOSE_FILE="docker-compose-saga.yml"
SERVICES=("reclamation-service-saga" "validation-service" "notification-service" "payment-service" "rabbitmq" "postgres-reclamation" "postgres-validation" "postgres-notification" "postgres-payment")

# Couleurs pour les messages
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
NC='\033[0m' # No Color

# Fonction d'affichage des messages
print_header() {
    echo -e "${PURPLE}═══════════════════════════════════════════════════${NC}"
    echo -e "${PURPLE}  LAB 7 - SAGA CHORÉGRAPHIÉE - $1${NC}"
    echo -e "${PURPLE}═══════════════════════════════════════════════════${NC}"
}

print_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

print_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

# Fonction pour vérifier les prérequis
check_prerequisites() {
    print_info "Vérification des prérequis..."
    
    if ! command -v docker &> /dev/null; then
        print_error "Docker n'est pas installé"
        exit 1
    fi
    
    if ! command -v docker-compose &> /dev/null; then
        print_error "Docker Compose n'est pas installé"
        exit 1
    fi
    
    if ! command -v node &> /dev/null; then
        print_error "Node.js n'est pas installé"
        exit 1
    fi
    
    if ! command -v npm &> /dev/null; then
        print_error "npm n'est pas installé"
        exit 1
    fi
    
    print_success "Tous les prérequis sont satisfaits"
}

# Fonction pour installer les dépendances
install_dependencies() {
    print_info "Installation des dépendances Node.js..."
    
    # Dépendances pour les tests
    if [ ! -d "node_modules" ]; then
        npm install
    fi
    
    # Dépendances pour chaque service de saga
    for service in validation-service notification-service payment-service; do
        if [ -d "microservices/$service" ] && [ ! -d "microservices/$service/node_modules" ]; then
            print_info "Installation des dépendances pour $service..."
            (cd "microservices/$service" && npm install)
        fi
    done
    
    print_success "Dépendances installées"
}

# Fonction pour démarrer les services
start_services() {
    print_header "DÉMARRAGE DES SERVICES"
    
    check_prerequisites
    install_dependencies
    
    print_info "Démarrage des services Docker..."
    docker-compose -f $DOCKER_COMPOSE_FILE up -d
    
    print_info "Attente du démarrage des services (60 secondes)..."
    sleep 60
    
    check_services_health
}

# Fonction pour arrêter les services
stop_services() {
    print_header "ARRÊT DES SERVICES"
    
    print_info "Arrêt des services Docker..."
    docker-compose -f $DOCKER_COMPOSE_FILE down
    
    print_success "Services arrêtés"
}

# Fonction pour redémarrer les services
restart_services() {
    print_header "REDÉMARRAGE DES SERVICES"
    
    stop_services
    sleep 5
    start_services
}

# Fonction pour vérifier la santé des services
check_services_health() {
    print_info "Vérification de la santé des services..."
    
    services_urls=(
        "http://localhost:8011/health|Reclamation Service"
        "http://localhost:8012/health|Validation Service"
        "http://localhost:8013/health|Notification Service"
        "http://localhost:8014/health|Payment Service"
    )
    
    all_healthy=true
    
    for service_info in "${services_urls[@]}"; do
        IFS='|' read -r url name <<< "$service_info"
        
        if curl -s -f "$url" > /dev/null 2>&1; then
            print_success "$name: En ligne"
        else
            print_error "$name: Hors ligne ($url)"
            all_healthy=false
        fi
    done
    
    # Vérification de RabbitMQ
    if curl -s -f "http://localhost:15672" > /dev/null 2>&1; then
        print_success "RabbitMQ Management: En ligne"
    else
        print_error "RabbitMQ Management: Hors ligne"
        all_healthy=false
    fi
    
    if $all_healthy; then
        print_success "Tous les services sont en ligne!"
        print_info "URLs disponibles:"
        echo "  - Reclamation Service: http://localhost:8011"
        echo "  - Validation Service: http://localhost:8012"
        echo "  - Notification Service: http://localhost:8013"
        echo "  - Payment Service: http://localhost:8014"
        echo "  - RabbitMQ Management: http://localhost:15672 (rabbitmq/rabbitmq)"
        echo "  - Sagas API: http://localhost:8011/api/sagas"
    else
        print_warning "Certains services ne sont pas disponibles"
        return 1
    fi
}

# Fonction pour afficher le statut des services
show_status() {
    print_header "STATUT DES SERVICES"
    
    print_info "Statut Docker Compose:"
    docker-compose -f $DOCKER_COMPOSE_FILE ps
    
    echo
    check_services_health
}

# Fonction pour afficher les logs
show_logs() {
    print_header "LOGS DES SERVICES"
    
    if [ $# -eq 2 ]; then
        service_name=$2
        print_info "Affichage des logs pour $service_name..."
        docker-compose -f $DOCKER_COMPOSE_FILE logs -f "$service_name"
    else
        print_info "Affichage des logs de tous les services..."
        docker-compose -f $DOCKER_COMPOSE_FILE logs -f
    fi
}

# Fonction pour exécuter les tests
run_tests() {
    print_header "EXÉCUTION DES TESTS SAGA"
    
    print_info "Vérification que les services sont en ligne..."
    if ! check_services_health; then
        print_error "Les services ne sont pas tous disponibles"
        print_info "Démarrage des services..."
        start_services
    fi
    
    print_info "Lancement des tests de saga chorégraphiée..."
    node tests/saga-choreography-test.js
    
    print_info "Collecte des métriques post-test..."
    echo
    echo "📊 MÉTRIQUES DISPONIBLES:"
    echo "  - Reclamation Service: http://localhost:8011/metrics"
    echo "  - Validation Service: http://localhost:8012/metrics" 
    echo "  - Notification Service: http://localhost:8013/metrics"
    echo "  - Payment Service: http://localhost:8014/metrics"
}

# Fonction pour nettoyer l'environnement
cleanup() {
    print_header "NETTOYAGE"
    
    print_info "Arrêt et suppression des conteneurs..."
    docker-compose -f $DOCKER_COMPOSE_FILE down -v
    
    print_info "Suppression des images inutilisées..."
    docker system prune -f
    
    print_success "Nettoyage terminé"
}

# Fonction pour créer un test de réclamation
create_test_reclamation() {
    print_info "Création d'une réclamation de test..."
    
    test_data='{
        "titre": "Test Saga Manuelle",
        "description": "Réclamation test avec montant 75.00€ pour validation manuelle",
        "priorite": "normale",
        "clientId": "client-test-manual",
        "type": "REMBOURSEMENT"
    }'
    
    response=$(curl -s -X POST http://localhost:8011/api/reclamations \
        -H "Content-Type: application/json" \
        -d "$test_data")
    
    if [ $? -eq 0 ]; then
        saga_id=$(echo "$response" | jq -r '.saga.id')
        reclamation_id=$(echo "$response" | jq -r '.reclamation.id')
        
        print_success "Réclamation créée avec succès!"
        echo "  - ID Réclamation: $reclamation_id"
        echo "  - ID Saga: $saga_id"
        echo "  - Suivi: http://localhost:8011/api/sagas/$saga_id"
        
        print_info "Vous pouvez suivre l'évolution de la saga avec:"
        echo "  curl http://localhost:8011/api/sagas/$saga_id"
    else
        print_error "Échec de création de la réclamation"
    fi
}

# Fonction d'aide
show_help() {
    echo "Usage: $0 [COMMAND] [OPTIONS]"
    echo
    echo "Commandes disponibles:"
    echo "  start      Démarrer tous les services"
    echo "  stop       Arrêter tous les services"
    echo "  restart    Redémarrer tous les services"
    echo "  status     Afficher le statut des services"
    echo "  logs       Afficher les logs (optionnel: nom du service)"
    echo "  test       Exécuter les tests de saga"
    echo "  health     Vérifier la santé des services"
    echo "  cleanup    Nettoyer l'environnement Docker"
    echo "  demo       Créer une réclamation de test"
    echo "  help       Afficher cette aide"
    echo
    echo "Exemples:"
    echo "  $0 start"
    echo "  $0 logs validation-service"
    echo "  $0 test"
}

# Programme principal
main() {
    case "${1:-help}" in
        "start")
            start_services
            ;;
        "stop")
            stop_services
            ;;
        "restart")
            restart_services
            ;;
        "status")
            show_status
            ;;
        "logs")
            show_logs "$@"
            ;;
        "test")
            run_tests
            ;;
        "health")
            check_services_health
            ;;
        "cleanup")
            cleanup
            ;;
        "demo")
            create_test_reclamation
            ;;
        "help"|"-h"|"--help")
            show_help
            ;;
        *)
            print_error "Commande inconnue: $1"
            show_help
            exit 1
            ;;
    esac
}

# Vérification que le script est dans le bon répertoire
if [ ! -f "$DOCKER_COMPOSE_FILE" ]; then
    print_error "Fichier $DOCKER_COMPOSE_FILE non trouvé"
    print_info "Assurez-vous d'être dans le répertoire racine du projet"
    exit 1
fi

# Exécution du programme principal
main "$@"
