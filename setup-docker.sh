#!/bin/bash

# Script d'installation et setup initial pour LOG430 POS
# Ce script prépare l'environnement Docker pour le projet

set -e

echo "🛠️  Setup initial LOG430 POS avec Docker"
echo "======================================="

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

# Vérification des prérequis
check_prerequisites() {
    log_info "Vérification des prérequis..."
    
    # Docker
    if ! command -v docker &> /dev/null; then
        log_error "Docker n'est pas installé"
        log_info "Téléchargez Docker depuis: https://www.docker.com/get-started"
        exit 1
    fi
    
    # Docker Compose
    if ! command -v docker-compose &> /dev/null && ! docker compose version &> /dev/null; then
        log_error "Docker Compose n'est pas installé"
        exit 1
    fi
    
    log_success "Docker et Docker Compose installés ✓"
}

# Création du fichier .env
setup_environment() {
    log_info "Configuration de l'environnement..."
    
    if [ ! -f .env ]; then
        cp .env.example .env
        log_success "Fichier .env créé depuis .env.example"
        log_warning "Modifiez .env selon vos besoins"
    else
        log_info "Fichier .env existant - conservé"
    fi
}

# Permissions pour les scripts
setup_permissions() {
    log_info "Configuration des permissions..."
    
    chmod +x start-pos.sh
    chmod +x test-docker.sh
    log_success "Scripts rendus exécutables"
}

# Test de base
basic_test() {
    log_info "Test de base de Docker..."
    
    # Test simple Docker
    if docker run --rm hello-world > /dev/null 2>&1; then
        log_success "Docker fonctionne correctement"
    else
        log_error "Problème avec Docker"
        return 1
    fi
}

# Construction des images
build_images() {
    log_info "Construction des images Docker..."
    
    docker-compose build
    log_success "Images construites avec succès"
}

# Affichage des instructions finales
show_instructions() {
    log_success "🎉 Setup terminé avec succès!"
    echo ""
    echo "======================================="
    echo "PROCHAINES ÉTAPES:"
    echo "======================================="
    echo ""
    echo "1. Démarrer le système:"
    echo "   ./start-pos.sh start"
    echo ""
    echo "2. Accéder aux services:"
    echo "   - API: http://localhost:3000"
    echo "   - Swagger: http://localhost:3000/api-docs"
    echo ""
    echo "3. Lancer les consoles:"
    echo "   - POS: ./start-pos.sh pos"
    echo "   - Maison Mère: ./start-pos.sh maison-mere"
    echo ""
    echo "4. Valider l'installation:"
    echo "   ./test-docker.sh"
    echo ""
    echo "5. Voir toutes les commandes:"
    echo "   ./start-pos.sh help"
    echo ""
    echo "======================================="
    echo ""
    log_info "Documentation: voir DOCKER.md et MIGRATION-DOCKER.md"
}

# Fonction principale
main() {
    check_prerequisites
    setup_environment
    setup_permissions
    basic_test
    build_images
    show_instructions
}

# Exécution avec gestion d'erreurs
if main; then
    log_success "Setup terminé sans erreur"
else
    log_error "Erreur durant le setup"
    exit 1
fi
