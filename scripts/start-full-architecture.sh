#!/bin/bash

echo "🚀 === DÉMARRAGE ARCHITECTURE COMPLÈTE AVEC API GATEWAY ==="
echo ""

# Couleurs
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
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

# Étape 1: Démarrer Kong
print_step "Démarrage de Kong API Gateway..."
docker-compose -f docker-compose.kong.yml up -d

if [ $? -eq 0 ]; then
    print_success "Kong démarré"
else
    echo "❌ Erreur lors du démarrage de Kong"
    exit 1
fi

# Étape 2: Attendre que Kong soit prêt
print_step "Attente de l'initialisation de Kong (60 secondes)..."
sleep 60

# Étape 3: Démarrer les microservices
print_step "Démarrage des microservices..."
./scripts/start-domain-microservices.sh &

# Attendre que les microservices soient prêts
print_step "Attente du démarrage des microservices (30 secondes)..."
sleep 30

# Étape 4: Configurer Kong
print_step "Configuration de Kong..."
chmod +x scripts/setup-kong.sh
./scripts/setup-kong.sh

print_success "Architecture complète démarrée !"

echo ""
echo "🌟 === ACCÈS AUX SERVICES ==="
echo ""
echo "🌐 API Gateway (Kong):"
echo "   - Proxy: http://localhost:8000"
echo "   - Admin: http://localhost:8001"  
echo "   - GUI: http://localhost:1337"
echo ""
echo "🔧 Microservices directs:"
echo "   - Produits: http://localhost:3001"
echo "   - Magasins: http://localhost:3002"
echo "   - Utilisateurs: http://localhost:3003"
echo "   - Ventes: http://localhost:3004"
echo ""
echo "📡 Via API Gateway:"
echo "   - GET http://localhost:8000/api/produits"
echo "   - GET http://localhost:8000/api/magasins"
echo "   - GET http://localhost:8000/api/utilisateurs"
echo "   - GET http://localhost:8000/api/ventes"
echo "   - GET http://localhost:8000/health"
echo ""
echo "🏁 Système prêt à utiliser !"
