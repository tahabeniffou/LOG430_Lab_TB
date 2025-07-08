#!/bin/bash

echo "🚀 === DÉMARRAGE LOAD BALANCING SIMPLIFIÉ ==="
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

# Fonction pour attendre qu'un service soit prêt
wait_for_service() {
    local url=$1
    local name=$2
    local max_attempts=30
    
    print_step "Attente de $name..."
    for i in $(seq 1 $max_attempts); do
        if curl -s "$url" > /dev/null 2>&1; then
            print_success "$name est prêt"
            return 0
        fi
        echo -n "."
        sleep 2
    done
    print_error "$name n'est pas accessible après $((max_attempts * 2)) secondes"
    return 1
}

# Nettoyage initial
print_step "Nettoyage des conteneurs existants..."
docker stop $(docker ps -q) 2>/dev/null || true
docker rm $(docker ps -aq) 2>/dev/null || true

# Étape 1: Créer le réseau
print_step "Création du réseau microservices..."
docker network create microservices-network 2>/dev/null || print_info "Réseau déjà existant"

# Étape 2: Démarrer Kong
print_step "Démarrage de Kong API Gateway..."
docker-compose -f docker-compose.kong-simple.yml up -d

if [ $? -ne 0 ]; then
    print_error "Échec du démarrage de Kong"
    exit 1
fi

# Attendre que Kong soit prêt
wait_for_service "http://localhost:8001" "Kong Admin API"
if [ $? -ne 0 ]; then
    print_error "Kong ne démarre pas correctement"
    docker logs kong-gateway
    exit 1
fi

# Étape 3: Construire l'image du produit-service
print_step "Construction de l'image produit-service..."
cd microservices/produit-service
docker build -t produit-service:latest . --no-cache
if [ $? -ne 0 ]; then
    print_error "Échec de la construction de l'image"
    exit 1
fi
cd ../..

# Étape 4: Démarrer les instances du produit-service
print_step "Démarrage des 3 instances du produit-service..."
docker-compose -f docker-compose.loadbalancing-simple.yml up -d

if [ $? -ne 0 ]; then
    print_error "Échec du démarrage des instances produit"
    exit 1
fi

# Étape 5: Attendre que les instances soient prêtes
print_step "Attente des instances..."
sleep 30

for port in 3001 3005 3006; do
    wait_for_service "http://localhost:$port/health" "Instance port $port"
done

# Étape 6: Configurer Kong pour le load balancing
print_step "Configuration du load balancing Kong..."
chmod +x scripts/setup-kong-loadbalancing.sh
./scripts/setup-kong-loadbalancing.sh

if [ $? -ne 0 ]; then
    print_error "Échec de la configuration Kong"
    exit 1
fi

# Résumé final
echo ""
print_success "🎉 LOAD BALANCING OPÉRATIONNEL !"
echo ""
print_info "Services disponibles :"
echo "  • Kong Gateway: http://localhost:8000"
echo "  • Kong Admin: http://localhost:8001"
echo "  • Load Balanced API: http://localhost:8000/api/produits-lb"
echo "  • Health Check LB: http://localhost:8000/health-lb"
echo ""
print_info "Instances directes :"
echo "  • Instance 1: http://localhost:3001/health"
echo "  • Instance 2: http://localhost:3005/health"
echo "  • Instance 3: http://localhost:3006/health"
echo ""
print_info "Test rapide :"
echo "  curl http://localhost:8000/health-lb"
echo ""
print_success "Prêt pour les tests de load balancing !"
