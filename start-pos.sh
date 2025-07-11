#!/bin/bash

# LOG430 POS - Script de déploiement et lancement
# Ce script lance l'ensemble du système POS via Docker

set -e

echo "🚀 Démarrage du système POS LOG430..."
echo "=================================="

# Couleurs pour les messages
RED='\033[0;31m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Fonction pour afficher des messages colorés
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Vérifier que Docker et Docker Compose sont installés
check_docker() {
    log_info "Vérification des prérequis..."
    
    if ! command -v docker &> /dev/null; then
        log_error "Docker n'est pas installé. Veuillez l'installer d'abord."
        exit 1
    fi
    
    if ! command -v docker-compose &> /dev/null && ! docker compose version &> /dev/null; then
        log_error "Docker Compose n'est pas installé. Veuillez l'installer d'abord."
        exit 1
    fi
    
    log_success "Docker et Docker Compose sont installés ✓"
}

# Fonction pour arrêter et nettoyer
cleanup() {
    log_info "Arrêt et nettoyage des conteneurs..."
    docker-compose down
    log_success "Nettoyage terminé"
}

# Fonction pour démarrer les services
start_services() {
    log_info "Construction et démarrage des services..."
    
    # Construire et démarrer les services
    docker-compose up --build -d db api
    
    log_info "Attente du démarrage des services de base..."
    sleep 10
    
    # Vérifier que l'API est accessible
    log_info "Vérification de l'état de l'API..."
    timeout 60 bash -c 'until curl -f http://localhost:3000/api-docs/swagger.json > /dev/null 2>&1; do sleep 2; done'
    
    log_success "API démarrée et accessible sur http://localhost:3000"
    log_success "Documentation Swagger disponible sur http://localhost:3000/api-docs"
    log_success "Documentation Redoc disponible sur http://localhost:3000/redoc"
}

# Fonction pour afficher les logs
show_logs() {
    log_info "Affichage des logs en temps réel (Ctrl+C pour arrêter)..."
    docker-compose logs -f
}

# Fonction pour lancer la console POS
start_pos_console() {
    log_info "Lancement de la console POS (Magasin)..."
    docker-compose run --rm pos-console
}

# Fonction pour lancer la console Maison Mère
start_maison_mere_console() {
    log_info "Lancement de la console Maison Mère..."
    docker-compose run --rm maison-mere-console
}

# Fonction pour lancer les tests
run_tests() {
    log_info "Exécution des tests..."
    docker-compose run --rm api npm test
}

# Fonction d'aide
show_help() {
    echo "Usage: $0 [COMMAND]"
    echo ""
    echo "Commandes disponibles:"
    echo "  start         Démarrer les services (DB + API)"
    echo "  stop          Arrêter tous les services"
    echo "  restart       Redémarrer tous les services"
    echo "  logs          Afficher les logs en temps réel"
    echo "  pos           Lancer la console POS (Magasin)"
    echo "  maison-mere   Lancer la console Maison Mère"
    echo "  test          Exécuter les tests"
    echo "  status        Afficher l'état des services"
    echo "  clean         Nettoyer complètement (containers + volumes)"
    echo "  help          Afficher cette aide"
    echo ""
    echo "Exemples:"
    echo "  $0 start                    # Démarrer le système"
    echo "  $0 pos                      # Lancer la console magasin"
    echo "  $0 logs                     # Voir les logs"
    echo ""
}

# Fonction pour afficher le statut
show_status() {
    log_info "État des services:"
    docker-compose ps
    echo ""
    log_info "URLs importantes:"
    echo "  - API REST: http://localhost:3000"
    echo "  - Swagger UI: http://localhost:3000/api-docs"
    echo "  - Redoc: http://localhost:3000/redoc"
    echo "  - Base de données PostgreSQL: localhost:5432"
}

# Fonction de nettoyage complet
clean_all() {
    log_warning "Cette action va supprimer tous les conteneurs et volumes. Continuer? (y/N)"
    read -r response
    if [[ "$response" =~ ^([yY][eE][sS]|[yY])$ ]]; then
        docker-compose down -v --remove-orphans
        docker system prune -f
        log_success "Nettoyage complet terminé"
    else
        log_info "Nettoyage annulé"
    fi
}

# Traitement des arguments
case "${1:-}" in
    "start")
        check_docker
        start_services
        show_status
        ;;
    "stop")
        cleanup
        ;;
    "restart")
        check_docker
        cleanup
        start_services
        show_status
        ;;
    "logs")
        show_logs
        ;;
    "pos")
        check_docker
        start_pos_console
        ;;
    "maison-mere")
        check_docker
        start_maison_mere_console
        ;;
    "test")
        check_docker
        run_tests
        ;;
    "status")
        show_status
        ;;
    "clean")
        clean_all
        ;;
    "help"|"--help"|"-h")
        show_help
        ;;
    "")
        log_info "Démarrage automatique du système..."
        check_docker
        start_services
        show_status
        echo ""
        log_info "Utilisez '$0 help' pour voir toutes les commandes disponibles"
        ;;
    *)
        log_error "Commande inconnue: $1"
        show_help
        exit 1
        ;;
esac
