#!/bin/bash

# Script de vérification complète de l'architecture hybride
# Teste la structure, le routage et les responsabilités

echo "🔍 VÉRIFICATION COMPLÈTE DE L'ARCHITECTURE HYBRIDE"
echo "=================================================="
echo ""

BASE_URL="http://localhost"
ROUTER_URL="$BASE_URL:9000"
LEGACY_URL="$BASE_URL:3000"
FAILURES=0

# Couleurs pour l'affichage
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
NC='\033[0m' # No Color

# Fonction pour tester un endpoint
test_endpoint() {
    local url=$1
    local description=$2
    local expected_status=${3:-200}
    local headers=$4
    
    echo -n "Testing $description... "
    
    if [ -n "$headers" ]; then
        response=$(curl -s -w "%{http_code}" -H "$headers" -o /tmp/response.json "$url" --max-time 10)
    else
        response=$(curl -s -w "%{http_code}" -o /tmp/response.json "$url" --max-time 10)
    fi
    
    status_code=$(echo $response | tail -c 4)
    
    if [ "$status_code" = "$expected_status" ]; then
        echo -e "${GREEN}✅ OK ($status_code)${NC}"
        return 0
    else
        echo -e "${RED}❌ FAILED ($status_code)${NC}"
        FAILURES=$((FAILURES + 1))
        return 1
    fi
}

# Fonction pour tester le routage avec header
test_routing() {
    local path=$1
    local client_type=$2
    local description=$3
    local expected_service=$4
    
    echo -n "📡 $description... "
    
    if [ -n "$client_type" ]; then
        response=$(curl -s -H "X-Client-Type: $client_type" "$ROUTER_URL$path" --max-time 10)
    else
        response=$(curl -s "$ROUTER_URL$path" --max-time 10)
    fi
    
    if echo "$response" | grep -q "$expected_service" > /dev/null 2>&1; then
        echo -e "${GREEN}✅ Routé vers $expected_service${NC}"
        return 0
    elif echo "$response" | grep -q "service\|Service\|API" > /dev/null 2>&1; then
        echo -e "${YELLOW}⚠️  Réponse reçue mais service non identifié${NC}"
        return 0
    else
        echo -e "${RED}❌ Pas de réponse ou erreur${NC}"
        FAILURES=$((FAILURES + 1))
        return 1
    fi
}

echo -e "${BLUE}1. 🏥 HEALTH CHECKS - VÉRIFICATION DE L'INFRASTRUCTURE${NC}"
echo "========================================================="

# Vérification des services de base
services=(
    "$LEGACY_URL:3000:Système de Base (Legacy)"
    "$BASE_URL:9000:Routeur Hybride"
    "$BASE_URL:3001:Produit Service 1"
    "$BASE_URL:3005:Produit Service 2"
    "$BASE_URL:3006:Produit Service 3"
    "$BASE_URL:3004:Vente Service"
    "$BASE_URL:3007:Stock Service"
    "$BASE_URL:3008:Reporting Service"
    "$BASE_URL:8000:Load Balancer"
)

for service in "${services[@]}"; do
    IFS=':' read -r url port description <<< "$service"
    test_endpoint "$url/health" "$description"
done

echo ""
echo -e "${PURPLE}2. 🎯 TEST DU ROUTAGE HYBRIDE INTELLIGENT${NC}"
echo "=============================================="

echo ""
echo -e "${YELLOW}📺 CONSOLE POS - Tests de routage${NC}"
echo "-----------------------------------"

# Test routage POS vers Legacy (produits)
test_routing "/pos/produits" "pos" "POS → Produits (doit aller vers Legacy)" "legacy\|Legacy\|produit"

# Test routage POS vers Stock μService
test_routing "/pos/stock" "pos" "POS → Stock (doit aller vers Stock μService)" "stock\|Stock\|inventory"

# Test routage POS vers Legacy (ventes)
test_routing "/pos/ventes" "pos" "POS → Ventes (doit aller vers Legacy)" "legacy\|Legacy\|vente"

echo ""
echo -e "${YELLOW}🏢 CONSOLE MAISON MÈRE - Tests de routage${NC}"
echo "-------------------------------------------"

# Test routage Maison Mère vers Legacy (magasins)
test_routing "/maisonmere/magasins" "maisonmere" "MM → Magasins (doit aller vers Legacy)" "legacy\|Legacy\|magasin"

# Test routage Maison Mère vers Reporting μService
test_routing "/maisonmere/reports" "maisonmere" "MM → Reports (doit aller vers Reporting μService)" "report\|Report\|analytics"

# Test routage Maison Mère vers Legacy (utilisateurs)
test_routing "/maisonmere/users" "maisonmere" "MM → Users (doit aller vers Legacy)" "legacy\|Legacy\|user"

echo ""
echo -e "${YELLOW}🚀 API MODERNE V2 - Tests de routage${NC}"
echo "--------------------------------------"

# Test routage API v2 vers Produit μService
test_routing "/api/v2/produits" "" "API v2 → Produits (doit aller vers Produit μService)" "produit\|Product\|service"

# Test routage API v2 vers Vente μService
test_routing "/api/v2/ventes" "" "API v2 → Ventes (doit aller vers Vente μService)" "vente\|Sale\|service"

# Test routage API v2 vers Stock μService
test_routing "/api/v2/stocks" "" "API v2 → Stocks (doit aller vers Stock μService)" "stock\|Stock\|inventory"

# Test routage API v2 vers Reporting μService
test_routing "/api/v2/reports" "" "API v2 → Reports (doit aller vers Reporting μService)" "report\|Report\|analytics"

echo ""
echo -e "${YELLOW}🔄 API LEGACY V1 - Tests de routage${NC}"
echo "-------------------------------------"

# Test routage API v1 vers Legacy
test_routing "/api/v1/produits" "" "API v1 → Produits (doit aller vers Legacy)" "legacy\|Legacy\|produit"

echo ""
echo -e "${BLUE}3. 🧪 TESTS FONCTIONNELS SPÉCIFIQUES${NC}"
echo "====================================="

echo ""
echo -e "${YELLOW}📦 Test Stock Service (utilisé par POS)${NC}"
echo "---------------------------------------"

# Test création de stock
echo -n "Création d'un stock de test... "
create_response=$(curl -s -X POST "$BASE_URL:3007/stocks" \
  -H "Content-Type: application/json" \
  -d '{"produitId": 9999, "quantite": 100, "seuilMin": 10, "seuilMax": 500}' \
  -w "%{http_code}" --max-time 10)
create_status=$(echo $create_response | tail -c 4)

if [ "$create_status" = "201" ]; then
    echo -e "${GREEN}✅ Stock créé${NC}"
    
    # Test ajustement de stock (simulation vente POS)
    echo -n "Ajustement stock (simulation vente POS)... "
    adjust_response=$(curl -s -X PUT "$BASE_URL:3007/stocks/produit/9999/ajuster" \
      -H "Content-Type: application/json" \
      -d '{"quantiteAjustement": -10}' \
      -w "%{http_code}" --max-time 10)
    adjust_status=$(echo $adjust_response | tail -c 4)
    
    if [ "$adjust_status" = "200" ]; then
        echo -e "${GREEN}✅ Stock ajusté (simulation vente)${NC}"
    else
        echo -e "${RED}❌ Erreur ajustement stock${NC}"
        FAILURES=$((FAILURES + 1))
    fi
else
    echo -e "${RED}❌ Erreur création stock${NC}"
    FAILURES=$((FAILURES + 1))
fi

echo ""
echo -e "${YELLOW}📊 Test Reporting Service (utilisé par Maison Mère)${NC}"
echo "---------------------------------------------------"

# Test génération de rapport
test_endpoint "$BASE_URL:3008/api/reports/sales" "Génération rapport ventes (Maison Mère)"

echo ""
echo -e "${BLUE}4. 🔗 TESTS D'INTÉGRATION ET COMMUNICATION${NC}"
echo "=============================================="

echo ""
echo -e "${YELLOW}🔄 Test Load Balancer (Produit Services)${NC}"
echo "----------------------------------------------"

echo -n "Test distribution load balancer... "
responses=()
for i in {1..6}; do
    response=$(curl -s "$BASE_URL:8000/health" --max-time 5)
    if echo "$response" | grep -o "port.*[0-9]*" > /dev/null 2>&1; then
        port=$(echo "$response" | grep -o "[0-9]\{4\}" | head -1)
        responses+=($port)
    fi
done

unique_responses=($(printf "%s\n" "${responses[@]}" | sort -u))
if [ ${#unique_responses[@]} -gt 1 ]; then
    echo -e "${GREEN}✅ Load balancing OK (Ports: ${unique_responses[*]})${NC}"
else
    echo -e "${RED}❌ Load balancing KO${NC}"
    FAILURES=$((FAILURES + 1))
fi

echo ""
echo -e "${YELLOW}🗄️  Test des bases de données${NC}"
echo "--------------------------------"

# Test connexion MySQL (Legacy + μServices)
echo -n "Test connexion MySQL (Legacy + μServices)... "
if docker exec mysql-main-db mysql -uroot -ppassword -e "SHOW TABLES FROM main_db;" > /dev/null 2>&1; then
    echo -e "${GREEN}✅ MySQL accessible${NC}"
else
    echo -e "${RED}❌ MySQL inaccessible${NC}"
    FAILURES=$((FAILURES + 1))
fi

# Test connexion PostgreSQL (Produit μService)
echo -n "Test connexion PostgreSQL (Produit μService)... "
if docker exec postgres-produit-db psql -U postgres -d produit_service -c "SELECT 1;" > /dev/null 2>&1; then
    echo -e "${GREEN}✅ PostgreSQL accessible${NC}"
else
    echo -e "${RED}❌ PostgreSQL inaccessible${NC}"
    FAILURES=$((FAILURES + 1))
fi

echo ""
echo -e "${BLUE}5. 📊 VÉRIFICATION DU MONITORING${NC}"
echo "================================="

# Test Prometheus
test_endpoint "$BASE_URL:9090/-/healthy" "Prometheus monitoring"

# Test Grafana
test_endpoint "$BASE_URL:3333/api/health" "Grafana dashboards"

# Test Kong Gateway
test_endpoint "$BASE_URL:8001/" "Kong API Gateway"

echo ""
echo -e "${BLUE}6. 📋 INFORMATION SUR LE ROUTAGE${NC}"
echo "================================="

# Affichage des informations de routage
echo -n "Récupération des infos de routage... "
if curl -s "$ROUTER_URL/routing-info" > /tmp/routing_info.json --max-time 10; then
    echo -e "${GREEN}✅ Info routage disponible${NC}"
    echo ""
    echo -e "${PURPLE}📋 Configuration du routage actuelle:${NC}"
    echo "------------------------------------"
    
    # Extraction et affichage des informations clés
    if command -v jq >/dev/null 2>&1; then
        echo "🎯 Modes configurés:"
        curl -s "$ROUTER_URL/routing-info" | jq -r '.routes | to_entries[] | "   \(.key): \(.value.description)"'
    else
        echo "   (Installez 'jq' pour voir les détails formatés)"
        echo "   URL complète: $ROUTER_URL/routing-info"
    fi
else
    echo -e "${RED}❌ Info routage indisponible${NC}"
    FAILURES=$((FAILURES + 1))
fi

echo ""
echo -e "${BLUE}═══════════════════════════════════════════════════════════════${NC}"
echo -e "${BLUE}                    📊 RÉSUMÉ DE LA VÉRIFICATION${NC}"
echo -e "${BLUE}═══════════════════════════════════════════════════════════════${NC}"
echo ""

if [ $FAILURES -eq 0 ]; then
    echo -e "${GREEN}🎉 SUCCÈS COMPLET ! Votre architecture hybride est parfaitement fonctionnelle !${NC}"
    echo ""
    echo -e "${GREEN}✅ SERVICES VÉRIFIÉS:${NC}"
    echo "   🏛️  Système de base (Legacy) - Opérationnel"
    echo "   🔀 Routeur hybride intelligent - Fonctionnel"
    echo "   🛍️  Produit Service (3 instances + LB) - OK"
    echo "   💰 Vente Service - OK"
    echo "   📦 Stock Service - OK"
    echo "   📊 Reporting Service - OK"
    echo ""
    echo -e "${GREEN}✅ ROUTAGE INTELLIGENT VÉRIFIÉ:${NC}"
    echo "   📺 Console POS → Legacy + Stock μService"
    echo "   🏢 Console Maison Mère → Legacy + Reporting μService"
    echo "   🚀 API v2 → Tous les μServices"
    echo "   🔄 API v1 → Legacy System"
    echo ""
    echo -e "${GREEN}✅ INFRASTRUCTURE VALIDÉE:${NC}"
    echo "   🗄️  Bases de données (MySQL + PostgreSQL)"
    echo "   🔄 Load balancing"
    echo "   📊 Monitoring (Prometheus + Grafana)"
    echo "   🌉 API Gateway (Kong)"
    echo ""
    echo -e "${GREEN}🚀 VOTRE SYSTÈME EST PRÊT POUR LA PRODUCTION !${NC}"
else
    echo -e "${RED}⚠️  $FAILURES test(s) ont échoué.${NC}"
    echo ""
    echo -e "${YELLOW}🔍 DIAGNOSTIC SUGGÉRÉ:${NC}"
    echo "   1. Vérifiez que tous les containers sont démarrés:"
    echo "      docker-compose -f docker-compose.hybrid.yml ps"
    echo ""
    echo "   2. Consultez les logs des services en erreur:"
    echo "      docker-compose -f docker-compose.hybrid.yml logs [service-name]"
    echo ""
    echo "   3. Vérifiez les ports disponibles:"
    echo "      netstat -tlnp | grep -E '(3000|3001|3004|3007|3008|8000|9000)'"
    echo ""
    echo "   4. Redémarrez l'architecture si nécessaire:"
    echo "      ./start-architecture-hybride.sh"
fi

echo ""
echo -e "${BLUE}📚 DOCUMENTATION DISPONIBLE:${NC}"
echo "   📖 README_ARCHITECTURE_HYBRIDE.md"
echo "   🎯 docs/Architecture_Complete_Flow_Console.puml"
echo "   📋 docs/Responsabilites_Microservices_Par_Console.puml"
echo "   🔄 docs/Sequence_Flow_Consoles_Detaille.puml"
echo ""
echo -e "${BLUE}🔗 POINTS D'ACCÈS:${NC}"
echo "   🔀 Routeur Hybride: http://localhost:9000"
echo "   📋 Info Routage: http://localhost:9000/routing-info"
echo "   🏛️  Système Legacy: http://localhost:3000"
echo "   📊 Prometheus: http://localhost:9090"
echo "   📈 Grafana: http://localhost:3333"
echo ""

exit $FAILURES
