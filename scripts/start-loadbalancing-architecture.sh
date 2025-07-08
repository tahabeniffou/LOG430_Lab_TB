#!/bin/bash

echo "🚀 === DÉMARRAGE ARCHITECTURE AVEC LOAD BALANCING ==="
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

# Étape 1: Créer le réseau si nécessaire
print_step "Création du réseau Docker..."
docker network create microservices-network 2>/dev/null || print_info "Réseau déjà existant"

# Étape 2: Démarrer Kong si pas déjà en cours
print_step "Vérification/Démarrage de Kong..."
if ! docker ps | grep -q kong-gateway; then
    docker-compose -f docker-compose.kong.yml up -d
    print_step "Attente de l'initialisation de Kong (60 secondes)..."
    sleep 60
else
    print_info "Kong déjà en cours d'exécution"
fi

# Étape 3: Démarrer les instances multiples du service produit
print_step "Démarrage des instances multiples du service produit..."
docker-compose -f docker-compose.loadbalancing.yml up -d

if [ $? -eq 0 ]; then
    print_success "Instances du service produit démarrées"
else
    print_error "Erreur lors du démarrage des instances"
    exit 1
fi

# Étape 4: Attendre que les services soient prêts
print_step "Attente du démarrage des services (45 secondes)..."
sleep 45

# Étape 5: Vérifier que les instances sont accessibles
print_step "Vérification des instances..."

for port in 3001 3005 3006; do
    if curl -s "http://localhost:$port/health" > /dev/null; then
        print_success "Instance sur port $port : OK"
    else
        print_error "Instance sur port $port : NOK"
    fi
done

# Étape 6: Configurer Kong pour le load balancing
print_step "Configuration du load balancing dans Kong..."
chmod +x scripts/setup-kong-loadbalancing.sh
./scripts/setup-kong-loadbalancing.sh

if [ $? -eq 0 ]; then
    print_success "Load balancing configuré"
else
    print_error "Erreur lors de la configuration du load balancing"
    exit 1
fi

# Étape 7: Démarrer les autres microservices (sans produit-service)
print_step "Démarrage des autres microservices..."
chmod +x scripts/start-other-microservices.sh
./scripts/start-other-microservices.sh

# Attendre un peu
sleep 15

# Étape 8: Configuration Kong standard (optionnel)
print_step "Configuration Kong standard..."
./scripts/setup-kong.sh > /dev/null 2>&1

# Résumé final
echo ""
echo "🎉 === ARCHITECTURE AVEC LOAD BALANCING PRÊTE ==="
echo ""
print_info "Services disponibles :"
echo "• Kong API Gateway: http://localhost:8000"
echo "• Kong Admin API: http://localhost:8001"
echo "• Konga Interface: http://localhost:1337"
echo ""
print_info "Instances avec Load Balancing :"
echo "• Instance 1: http://localhost:3001 (direct)"
echo "• Instance 2: http://localhost:3005 (direct)"
echo "• Instance 3: http://localhost:3006 (direct)"
echo "• Load Balanced: http://localhost:8000/api/produits-lb"
echo "• Health LB: http://localhost:8000/health-lb"
echo ""
print_info "Services standards :"
echo "• Magasins: http://localhost:8000/api/magasins"
echo "• Utilisateurs: http://localhost:8000/api/utilisateurs"
echo "• Ventes: http://localhost:8000/api/ventes"
echo ""
print_success "Utilisez './scripts/test-loadbalancing.sh' pour tester le load balancing"
