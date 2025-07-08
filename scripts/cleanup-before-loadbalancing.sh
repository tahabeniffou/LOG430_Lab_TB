#!/bin/bash

echo "🧹 === NETTOYAGE COMPLET AVANT LOAD BALANCING ==="
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

# Étape 1: Arrêter tous les conteneurs Docker actifs
print_step "Arrêt de tous les conteneurs Docker..."
docker stop $(docker ps -q) 2>/dev/null || print_info "Aucun conteneur à arrêter"

# Étape 2: Arrêter les microservices Node.js en cours
print_step "Arrêt des microservices Node.js..."
./scripts/stop-domain-microservices.sh 2>/dev/null || print_info "Script d'arrêt non trouvé"
./scripts/stop-other-microservices.sh 2>/dev/null || print_info "Nouveaux microservices non en cours"

# Étape 3: Vérifier les ports critiques
print_step "Vérification des ports critiques..."
ports=(3001 3002 3003 3004 3005 3006 8000 8001 1337)
for port in "${ports[@]}"; do
    if netstat -tlnp 2>/dev/null | grep -q ":$port "; then
        print_error "Port $port occupé"
        netstat -tlnp 2>/dev/null | grep ":$port "
    else
        print_success "Port $port libre"
    fi
done

# Étape 4: Supprimer les réseaux Docker orphelins
print_step "Nettoyage des réseaux Docker..."
docker network prune -f 2>/dev/null || print_info "Pas de réseaux à nettoyer"

# Étape 5: Supprimer les conteneurs arrêtés
print_step "Suppression des conteneurs arrêtés..."
docker container prune -f 2>/dev/null || print_info "Pas de conteneurs à supprimer"

# Étape 6: Vérifier l'espace disque
print_step "Vérification de l'espace disque..."
df_output=$(df -h / | tail -1 | awk '{print $5}' | sed 's/%//')
if [ "$df_output" -gt 90 ]; then
    print_error "Espace disque faible: ${df_output}%"
else
    print_success "Espace disque OK: ${df_output}%"
fi

# Étape 7: Vérifier que Docker fonctionne
print_step "Test de Docker..."
if docker version > /dev/null 2>&1; then
    print_success "Docker opérationnel"
else
    print_error "Docker non disponible"
    exit 1
fi

# Étape 8: Vérifier Docker Compose
print_step "Test de Docker Compose..."
if docker-compose version > /dev/null 2>&1; then
    print_success "Docker Compose opérationnel"
else
    print_error "Docker Compose non disponible"
    exit 1
fi

# Résumé
echo ""
print_success "🎯 NETTOYAGE TERMINÉ - SYSTÈME PRÊT"
echo ""
print_info "Prochaines étapes :"
echo "  1. ./scripts/start-loadbalancing-architecture.sh"
echo "  2. ./scripts/test-loadbalancing.sh"
echo "  3. ./scripts/run-load-tests.sh"
echo ""
print_info "Surveillance recommandée :"
echo "  • docker ps (voir les conteneurs)"
echo "  • docker logs kong-gateway (logs Kong)"
echo "  • tail -f microservices/logs/*.log (logs microservices)"
