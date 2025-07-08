#!/bin/bash

echo "📊 === INSTALLATION DE K6 POUR TESTS DE CHARGE ==="
echo ""

# Couleurs
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

print_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

print_step() {
    echo -e "${YELLOW}🔄 $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

# Détecter l'OS
if [[ "$OSTYPE" == "linux-gnu"* ]]; then
    print_step "Installation de k6 sur Linux..."
    
    # Vérifier si k6 est déjà installé
    if command -v k6 >/dev/null 2>&1; then
        print_success "k6 est déjà installé"
        k6 version
        exit 0
    fi
    
    # Méthode 1: Installation via script officiel
    print_step "Téléchargement et installation de k6..."
    
    # Télécharger et installer k6
    sudo gpg -k 2>/dev/null || sudo apt-key --keyring /etc/apt/trusted.gpg.d/k6.gpg adv --keyserver hkp://keyserver.ubuntu.com:80 --recv-keys C5AD17C747E3415A3642D57D77C6C491D6AC1D69
    echo "deb https://dl.k6.io/deb stable main" | sudo tee /etc/apt/sources.list.d/k6.list
    sudo apt-get update
    sudo apt-get install k6
    
    if command -v k6 >/dev/null 2>&1; then
        print_success "k6 installé avec succès"
        k6 version
    else
        print_error "Échec de l'installation de k6"
        print_info "Essayez l'installation manuelle ou utilisez Docker"
        print_info "Docker: docker run --rm -i grafana/k6:latest run - <script.js"
    fi

elif [[ "$OSTYPE" == "darwin"* ]]; then
    print_step "Installation de k6 sur macOS..."
    
    if command -v k6 >/dev/null 2>&1; then
        print_success "k6 est déjà installé"
        k6 version
        exit 0
    fi
    
    if command -v brew >/dev/null 2>&1; then
        brew install k6
        print_success "k6 installé avec Homebrew"
    else
        print_error "Homebrew non trouvé. Installez manuellement depuis https://k6.io/docs/getting-started/installation/"
    fi

else
    print_info "OS non reconnu. Instructions d'installation :"
    echo ""
    echo "• Linux: sudo apt-get install k6"
    echo "• macOS: brew install k6"
    echo "• Windows: choco install k6"
    echo "• Docker: docker run --rm -i grafana/k6:latest run - <script.js"
    echo "• Manuel: https://k6.io/docs/getting-started/installation/"
fi

echo ""
print_info "Alternative avec Docker si l'installation échoue :"
echo "docker run --rm -i grafana/k6:latest run - <script.js"
