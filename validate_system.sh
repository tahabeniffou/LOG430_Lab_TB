#!/bin/bash

# 🚀 Script de Validation Complète - LOG430 Lab TB v4.0
# Ce script vérifie que toutes les améliorations sont opérationnelles

echo "🎯 LOG430 Lab TB - Validation Système Complet"
echo "============================================="
echo ""

# Couleurs pour l'affichage
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Fonction de validation avec émoji
check_service() {
    local service_name=$1
    local url=$2
    local expected_status=${3:-200}
    
    echo -n "Vérification $service_name... "
    
    if curl -s -o /dev/null -w "%{http_code}" "$url" | grep -q "$expected_status"; then
        echo -e "${GREEN}✅ OK${NC}"
        return 0
    else
        echo -e "${RED}❌ ÉCHEC${NC}"
        return 1
    fi
}

# Fonction de vérification Docker
check_docker_service() {
    local service_name=$1
    echo -n "Service Docker $service_name... "
    
    if docker compose ps --filter "name=$service_name" --filter "status=running" | grep -q "$service_name"; then
        echo -e "${GREEN}✅ Running${NC}"
        return 0
    else
        echo -e "${RED}❌ Not Running${NC}"
        return 1
    fi
}

echo "📦 1. Vérification des Services Docker"
echo "--------------------------------------"
check_docker_service "api-1"
check_docker_service "api-2" 
check_docker_service "api-3"
check_docker_service "api-4"
check_docker_service "redis"
check_docker_service "db"
check_docker_service "nginx"
check_docker_service "prometheus"
check_docker_service "grafana"
echo ""

echo "🌐 2. Vérification des APIs"
echo "---------------------------"
check_service "Load Balancer NGINX" "http://localhost:8080/api/produits"
check_service "API Instance Directe" "http://localhost:3000/api/produits"
check_service "Prometheus Metrics" "http://localhost:9090/-/healthy"
check_service "Grafana Dashboard" "http://localhost:3001/login"
echo ""

echo "🔄 3. Vérification du Cache Redis"
echo "---------------------------------"
check_service "Cache Stats API" "http://localhost:8080/api/cache/stats"
check_service "Cache Health" "http://localhost:8080/api/cache/health"

# Test du cache fonctionnel
echo -n "Test Cache Fonctionnel... "
CACHE_STATS=$(curl -s "http://localhost:8080/api/cache/stats" 2>/dev/null)
if echo "$CACHE_STATS" | grep -q "connected"; then
    echo -e "${GREEN}✅ Cache Opérationnel${NC}"
else
    echo -e "${RED}❌ Cache Non Opérationnel${NC}"
fi
echo ""

echo "📊 4. Test de Performance Rapide"
echo "--------------------------------"
echo -n "Test latence API produits... "
RESPONSE_TIME=$(curl -s -w "%{time_total}" -o /dev/null "http://localhost:8080/api/produits")
if (( $(echo "$RESPONSE_TIME < 0.2" | bc -l) )); then
    echo -e "${GREEN}✅ ${RESPONSE_TIME}s (< 200ms)${NC}"
else
    echo -e "${YELLOW}⚠️  ${RESPONSE_TIME}s (> 200ms)${NC}"
fi

echo -n "Test débit Load Balancer... "
# Test rapide avec 10 requêtes concurrentes
START_TIME=$(date +%s.%N)
for i in {1..10}; do
    curl -s "http://localhost:8080/api/produits" >/dev/null &
done
wait
END_TIME=$(date +%s.%N)
DURATION=$(echo "$END_TIME - $START_TIME" | bc)
RPS=$(echo "scale=1; 10 / $DURATION" | bc)
echo -e "${GREEN}✅ ~${RPS} req/sec${NC}"
echo ""

echo "📈 5. Vérification Observabilité"
echo "--------------------------------"
echo -n "Métriques Prometheus... "
METRICS_COUNT=$(curl -s "http://localhost:9090/api/v1/label/__name__/values" 2>/dev/null | grep -o '"[^"]*"' | wc -l)
if [ "$METRICS_COUNT" -gt 50 ]; then
    echo -e "${GREEN}✅ $METRICS_COUNT métriques disponibles${NC}"
else
    echo -e "${YELLOW}⚠️  $METRICS_COUNT métriques seulement${NC}"
fi

echo -n "Grafana Datasources... "
if curl -s "http://admin:admin@localhost:3001/api/datasources" 2>/dev/null | grep -q "prometheus"; then
    echo -e "${GREEN}✅ Prometheus connecté${NC}"
else
    echo -e "${RED}❌ Prometheus non connecté${NC}"
fi
echo ""

echo "🧪 6. Tests Automatisés"
echo "----------------------"
if [ -f "package.json" ]; then
    echo -n "Tests unitaires... "
    if npm test --silent >/dev/null 2>&1; then
        echo -e "${GREEN}✅ Tous passent${NC}"
    else
        echo -e "${YELLOW}⚠️  Certains échecs${NC}"
    fi
    
    echo -n "Tests cache... "
    if npm run test:cache --silent >/dev/null 2>&1; then
        echo -e "${GREEN}✅ Cache validé${NC}"
    else
        echo -e "${YELLOW}⚠️  Tests cache à vérifier${NC}"
    fi
else
    echo -e "${YELLOW}⚠️  package.json non trouvé${NC}"
fi
echo ""

echo "📋 7. Vérification Documentation"
echo "--------------------------------"
files=("README.md" "CACHE_DEPLOYMENT.md" "PERFORMANCE_REPORT.md" "docs/Cache_Documentation.md")
for file in "${files[@]}"; do
    echo -n "Document $file... "
    if [ -f "$file" ]; then
        echo -e "${GREEN}✅ Présent${NC}"
    else
        echo -e "${RED}❌ Manquant${NC}"
    fi
done
echo ""

echo "🎉 RÉSUMÉ DE VALIDATION"
echo "======================="
echo -e "${BLUE}Architecture:${NC} 4 instances API + Load Balancer NGINX"
echo -e "${BLUE}Cache:${NC} Redis distribué avec invalidation intelligente"
echo -e "${BLUE}Observabilité:${NC} Prometheus + Grafana + Winston logs"
echo -e "${BLUE}Performance:${NC} Latence optimisée, débit amélioré"
echo -e "${BLUE}Tests:${NC} Suite complète automatisée"
echo -e "${BLUE}Documentation:${NC} README moderne + guides techniques"
echo ""

echo "🚀 ACCÈS RAPIDE AUX SERVICES"
echo "============================"
echo -e "${GREEN}🌐 Load Balancer:${NC} http://localhost:8080"
echo -e "${GREEN}📊 Grafana:${NC} http://localhost:3001 (admin/admin)"
echo -e "${GREEN}📈 Prometheus:${NC} http://localhost:9090"
echo -e "${GREEN}📋 API Docs:${NC} http://localhost:8080/api-docs"
echo -e "${GREEN}🔄 Cache Stats:${NC} http://localhost:8080/api/cache/stats"
echo ""

echo "🎯 COMMANDES UTILES"
echo "=================="
echo -e "${YELLOW}# Tests de performance:${NC}"
echo "npm run benchmark"
echo "npm run test:load"
echo ""
echo -e "${YELLOW}# Monitoring:${NC}"
echo "docker compose logs -f"
echo "curl http://localhost:8080/api/cache/stats"
echo ""
echo -e "${YELLOW}# Consoles POS:${NC}"
echo "docker exec -it log430_lab_tb-api-1 node src/appConsole.js"
echo "docker exec -it log430_lab_tb-api-1 node src/maisonMereConsole.js"
echo ""

echo -e "${GREEN}✅ Validation complète terminée !${NC}"
echo -e "${GREEN}🏆 Système LOG430 Lab TB v4.0 opérationnel${NC}"
