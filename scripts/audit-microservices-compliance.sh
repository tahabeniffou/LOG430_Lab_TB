#!/bin/bash

# Script de Validation Conformité Microservices
# LOG430 Lab - Audit Automatisé

echo "🔍 AUDIT DE CONFORMITÉ MICROSERVICES - LOG430 Lab"
echo "=================================================="
echo ""

# Couleurs pour output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Compteurs
PASSED=0
FAILED=0
WARNINGS=0

# Fonction pour tester une condition
test_condition() {
    local test_name="$1"
    local condition="$2"
    local criticality="$3" # critical, important, warning
    
    echo -n "Testing: $test_name... "
    
    if eval "$condition"; then
        echo -e "${GREEN}✅ PASS${NC}"
        ((PASSED++))
        return 0
    else
        if [ "$criticality" == "critical" ]; then
            echo -e "${RED}❌ FAIL (CRITIQUE)${NC}"
            ((FAILED++))
        elif [ "$criticality" == "important" ]; then
            echo -e "${YELLOW}⚠️ FAIL (IMPORTANT)${NC}"
            ((FAILED++))
        else
            echo -e "${YELLOW}⚠️ WARNING${NC}"
            ((WARNINGS++))
        fi
        return 1
    fi
}

# Fonction pour vérifier qu'un service répond
check_service_health() {
    local service_name="$1"
    local port="$2"
    
    curl -sf "http://localhost:$port/health" > /dev/null 2>&1
}

# Fonction pour vérifier la connectivité DB
check_database_connection() {
    local db_type="$1"
    local port="$2"
    local db_name="$3"
    
    if [ "$db_type" == "postgres" ]; then
        docker exec postgres-produit-db pg_isready -p 5432 > /dev/null 2>&1
    elif [ "$db_type" == "mysql" ]; then
        docker exec mysql-main-db mysqladmin ping -h localhost > /dev/null 2>&1
    fi
}

echo "🏗️ 1. ARCHITECTURE BOUNDARIES"
echo "=============================="

# Test 1: Database per Service
test_condition "Database per Service - Produit Service (PostgreSQL)" \
    "check_database_connection postgres 5433 produit_service" \
    "critical"

test_condition "Database per Service - Vente Service (MySQL séparé)" \
    "docker exec mysql-main-db mysql -u root -ppassword -e 'USE vente_service_db; SELECT 1;' > /dev/null 2>&1" \
    "critical"

test_condition "Database per Service - Stock Service (PostgreSQL séparé)" \
    "docker exec postgres-produit-db psql -U postgres -d stock_service -c 'SELECT 1;' > /dev/null 2>&1" \
    "critical"

# Test 2: Service Independence
test_condition "Produit Service - Indépendance conteneur" \
    "docker ps | grep -q 'produit-service-1.*Up'" \
    "critical"

test_condition "Vente Service - Indépendance conteneur" \
    "docker ps | grep -q 'vente-service.*Up'" \
    "critical"

test_condition "Stock Service - Indépendance conteneur" \
    "docker ps | grep -q 'stock-service.*Up'" \
    "critical"

echo ""
echo "🔄 2. COMMUNICATION PATTERNS"
echo "============================="

# Test 3: API First Design
test_condition "Produit Service - API REST disponible" \
    "check_service_health produit 3001" \
    "important"

test_condition "Vente Service - API REST disponible" \
    "check_service_health vente 3004" \
    "important"

test_condition "Stock Service - API REST disponible" \
    "check_service_health stock 3007" \
    "important"

test_condition "Reporting Service - API REST disponible" \
    "check_service_health reporting 3008" \
    "important"

# Test 4: Load Balancing
test_condition "Load Balancer - Multiple instances Produit Service" \
    "docker ps | grep -c 'produit-service.*Up' | grep -q '[2-9]'" \
    "important"

test_condition "Load Balancer - Service disponible" \
    "curl -sf http://localhost:8000/health > /dev/null 2>&1" \
    "important"

echo ""
echo "🗄️ 3. DATA MANAGEMENT"
echo "====================="

# Test 5: Schema Independence
test_condition "Produit Service - Schema PostgreSQL dédié" \
    "docker exec postgres-produit-db psql -U postgres -d produit_service -c '\dt' | grep -q 'produits'" \
    "critical"

test_condition "Pas de tables partagées entre services" \
    "! docker exec mysql-main-db mysql -u root -ppassword -e 'SHOW TABLES FROM main_db;' 2>/dev/null | grep -E '(produits|ventes|stock)'" \
    "critical"

# Test 6: Cache Strategy
test_condition "Redis Cache - Disponible" \
    "docker exec redis-cache redis-cli ping | grep -q PONG" \
    "important"

echo ""
echo "🔒 4. RESILIENCE & PATTERNS"
echo "============================"

# Test 7: Health Checks
test_condition "Health Checks - Tous services répondent" \
    "check_service_health produit 3001 && check_service_health vente 3004 && check_service_health stock 3007" \
    "critical"

# Test 8: Circuit Breaker Implementation
test_condition "Circuit Breaker - Code présent" \
    "[ -f '/home/log430/LOG430_Lab_TB/src/common/CircuitBreakerService.js' ]" \
    "important"

test_condition "Circuit Breaker - Dépendance opossum installée" \
    "grep -q 'opossum' /home/log430/LOG430_Lab_TB/package.json || grep -q 'opossum' /home/log430/LOG430_Lab_TB/microservices/*/package.json" \
    "important"

echo ""
echo "🛡️ 5. SECURITY & GATEWAY"
echo "========================"

# Test 9: API Gateway
test_condition "Kong Gateway - Disponible" \
    "curl -sf http://localhost:8001 > /dev/null 2>&1" \
    "important"

test_condition "API Gateway - CORS configuré" \
    "curl -sf -H 'Origin: http://localhost:3000' http://localhost:8001/api/produits > /dev/null 2>&1" \
    "important"

echo ""
echo "📊 6. OBSERVABILITY"
echo "==================="

# Test 10: Monitoring
test_condition "Prometheus - Collecte métriques" \
    "curl -sf http://localhost:9090/metrics > /dev/null 2>&1" \
    "important"

test_condition "Grafana - Dashboard disponible" \
    "curl -sf http://localhost:3333 > /dev/null 2>&1" \
    "warning"

# Test 11: Structured Logging
test_condition "Logs structurés - Format JSON" \
    "docker logs produit-service-1 2>&1 | grep -q '{.*\"level\".*\"message\".*}'" \
    "warning"

echo ""
echo "🔧 7. DEPLOYMENT & OPERATIONS"
echo "=============================="

# Test 12: Containerization
test_condition "Containers - Images dédiées par service" \
    "docker images | grep -c 'log430_lab_tb.*service' | grep -q '[3-9]'" \
    "critical"

test_condition "Containers - Isolation réseau" \
    "docker network ls | grep -q 'app-network'" \
    "important"

# Test 13: Environment Configuration
test_condition "Configuration - Variables d'environnement" \
    "docker exec produit-service-1 env | grep -q 'DB_HOST=postgres-produit'" \
    "important"

echo ""
echo "🎯 8. DOMAIN-DRIVEN DESIGN"
echo "=========================="

# Test 14: Bounded Context
test_condition "Domain Models - Séparation claire" \
    "[ -f '/home/log430/LOG430_Lab_TB/microservices/produit-service/src/domain/Produit.js' ] && [ -f '/home/log430/LOG430_Lab_TB/microservices/vente-service/src/domain/Vente.js' ]" \
    "critical"

test_condition "Repository Pattern - Implémenté" \
    "[ -f '/home/log430/LOG430_Lab_TB/microservices/produit-service/src/domain/ProduitRepository.js' ]" \
    "important"

echo ""
echo "📈 RÉSULTATS DE L'AUDIT"
echo "======================="

TOTAL=$((PASSED + FAILED + WARNINGS))
SCORE=$(( (PASSED * 100) / TOTAL ))

echo -e "✅ Tests réussis: ${GREEN}$PASSED${NC}"
echo -e "❌ Tests échoués: ${RED}$FAILED${NC}"
echo -e "⚠️ Avertissements: ${YELLOW}$WARNINGS${NC}"
echo -e "📊 Total: $TOTAL tests"
echo ""

if [ $SCORE -ge 90 ]; then
    echo -e "🎉 ${GREEN}EXCELLENT${NC} - Score: $SCORE% ⭐⭐⭐"
    echo -e "✅ Architecture conforme aux standards microservices de l'industrie"
elif [ $SCORE -ge 80 ]; then
    echo -e "👍 ${GREEN}BON${NC} - Score: $SCORE% ⭐⭐"
    echo -e "✅ Architecture largement conforme avec quelques améliorations mineures"
elif [ $SCORE -ge 70 ]; then
    echo -e "⚠️ ${YELLOW}ACCEPTABLE${NC} - Score: $SCORE% ⭐"
    echo -e "🔧 Architecture fonctionnelle mais nécessite des améliorations"
elif [ $SCORE -ge 60 ]; then
    echo -e "🚨 ${YELLOW}ATTENTION${NC} - Score: $SCORE%"
    echo -e "⚠️ Plusieurs violations importantes des principes microservices"
else
    echo -e "❌ ${RED}NON CONFORME${NC} - Score: $SCORE%"
    echo -e "🔴 Architecture nécessite une refactorisation majeure"
fi

echo ""
echo "📋 RECOMMANDATIONS PRIORITAIRES"
echo "==============================="

if [ $FAILED -gt 0 ]; then
    echo -e "${RED}ACTIONS CRITIQUES:${NC}"
    echo "1. 🗄️ Implémenter Database-per-Service (séparer les bases MySQL partagées)"
    echo "2. 🔄 Ajouter Event-Driven Communication (réduire appels HTTP synchrones)"
    echo "3. 🛡️ Implémenter Circuit Breakers dans tous les services"
    echo ""
fi

if [ $WARNINGS -gt 0 ]; then
    echo -e "${YELLOW}AMÉLIORATIONS RECOMMANDÉES:${NC}"
    echo "1. 📊 Améliorer monitoring et alerting"
    echo "2. 🔍 Ajouter distributed tracing"
    echo "3. 📝 Standardiser logs structurés"
    echo ""
fi

echo -e "${BLUE}DOCUMENTATION COMPLÈTE:${NC}"
echo "📖 Voir: docs/AUDIT_CONFORMITE_MICROSERVICES.md"
echo "🔧 Script migration: scripts/migrate-to-compliant-architecture.sh"

echo ""
echo "🏁 Audit terminé à $(date)"

# Exit code basé sur le score
if [ $SCORE -ge 80 ]; then
    exit 0
elif [ $SCORE -ge 60 ]; then
    exit 1
else
    exit 2
fi
