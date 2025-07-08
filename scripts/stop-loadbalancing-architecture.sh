#!/bin/bash

echo "🛑 === ARRÊT ARCHITECTURE LOAD BALANCING ==="
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

# Étape 1: Arrêter les instances de load balancing
print_step "Arrêt des instances de load balancing..."
docker-compose -f docker-compose.loadbalancing.yml down

if [ $? -eq 0 ]; then
    print_success "Instances de load balancing arrêtées"
else
    print_error "Erreur lors de l'arrêt des instances de load balancing"
fi

# Étape 2: Arrêter les autres microservices
print_step "Arrêt des autres microservices..."
./scripts/stop-domain-microservices.sh 2>/dev/null || print_info "Script d'arrêt non trouvé ou déjà arrêtés"

# Étape 3: Arrêter Kong (optionnel)
read -p "Voulez-vous aussi arrêter Kong API Gateway ? (y/N): " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    print_step "Arrêt de Kong API Gateway..."
    docker-compose -f docker-compose.kong.yml down
    if [ $? -eq 0 ]; then
        print_success "Kong arrêté"
    else
        print_error "Erreur lors de l'arrêt de Kong"
    fi
else
    print_info "Kong laissé en cours d'exécution"
fi

# Étape 4: Nettoyage optionnel
echo ""
read -p "Voulez-vous supprimer les volumes de données ? (y/N): " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    print_step "Suppression des volumes..."
    docker-compose -f docker-compose.loadbalancing.yml down -v
    docker-compose -f docker-compose.kong.yml down -v 2>/dev/null || true
    print_success "Volumes supprimés"
else
    print_info "Volumes conservés"
fi

# Résumé
echo ""
print_success "Arrêt de l'architecture load balancing terminé"
echo ""
print_info "Pour redémarrer :"
echo "  ./scripts/start-loadbalancing-architecture.sh"
echo ""
print_info "Pour voir les conteneurs encore actifs :"
echo "  docker ps"
