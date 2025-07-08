#!/bin/bash

# Script de test pour vérifier les microservices autonomes
# Usage: ./scripts/test-microservices.sh

echo "🧪 Test des microservices autonomes..."

# Couleurs
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Fonction pour tester un endpoint
test_endpoint() {
    local service_name=$1
    local url=$2
    local expected_status=${3:-200}
    
    echo -e "${BLUE}Testing $service_name: $url${NC}"
    
    response=$(curl -s -w "%{http_code}" -o /tmp/response.json "$url")
    http_code="${response: -3}"
    
    if [ "$http_code" -eq "$expected_status" ]; then
        echo -e "${GREEN}✅ $service_name: HTTP $http_code${NC}"
        if [ -f /tmp/response.json ]; then
            echo "Response: $(cat /tmp/response.json | jq -r '.message // .status // "OK"' 2>/dev/null || cat /tmp/response.json)"
        fi
    else
        echo -e "${RED}❌ $service_name: HTTP $http_code (expected $expected_status)${NC}"
        if [ -f /tmp/response.json ]; then
            echo "Response: $(cat /tmp/response.json)"
        fi
        return 1
    fi
    echo ""
}

# Attendre que les services démarrent
echo -e "${YELLOW}⏳ Attente du démarrage des services (5 secondes)...${NC}"
sleep 5

echo -e "${BLUE}🧪 Test des endpoints de santé...${NC}"
echo ""

# Test du service produit
if test_endpoint "Produit Service" "http://localhost:3001/health"; then
    test_endpoint "Produit Service - API" "http://localhost:3001/api/produits"
fi

# Test du service magasin
if test_endpoint "Magasin Service" "http://localhost:3002/health"; then
    test_endpoint "Magasin Service - API" "http://localhost:3002/api/magasins"
fi

# Test du service utilisateur
if test_endpoint "Utilisateur Service" "http://localhost:3003/health"; then
    test_endpoint "Utilisateur Service - API" "http://localhost:3003/api/utilisateurs"
fi

# Test du service vente
if test_endpoint "Vente Service" "http://localhost:3004/health"; then
    test_endpoint "Vente Service - API" "http://localhost:3004/api/ventes"
fi

echo -e "${GREEN}🎉 Tests terminés !${NC}"
echo ""
echo -e "${BLUE}📋 Pour tester manuellement :${NC}"
echo -e "  curl http://localhost:3001/health"
echo -e "  curl http://localhost:3002/health"
echo -e "  curl http://localhost:3003/health"
echo -e "  curl http://localhost:3004/health"
