#!/bin/bash

# ============================================
# SCRIPT DE TEST JEST COMPLET
# Tests automatisés pour l'architecture hybride
# ============================================

set -e

echo "🧪 DÉBUT DES TESTS JEST POUR L'ARCHITECTURE HYBRIDE"
echo "=================================================="

# Couleurs pour output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Fonction pour afficher les messages
log_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

log_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

log_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

log_error() {
    echo -e "${RED}❌ $1${NC}"
}

# Vérifier que Node.js et npm sont installés
if ! command -v node &> /dev/null; then
    log_error "Node.js n'est pas installé"
    exit 1
fi

if ! command -v npm &> /dev/null; then
    log_error "npm n'est pas installé"
    exit 1
fi

# Installer les dépendances de test si nécessaire
if [ ! -d "node_modules" ]; then
    log_info "Installation des dépendances de test..."
    npm install
fi

# Vérifier que les services sont en cours d'exécution
log_info "Vérification de l'état des services..."

services_to_check=(
    "http://localhost:3000"  # Legacy System
    "http://localhost:3001"  # Produit Service 1
    "http://localhost:3004"  # Vente Service
    "http://localhost:3007"  # Stock Service
    "http://localhost:3008"  # Reporting Service
    "http://localhost:9000"  # Hybrid Router
    "http://localhost:8001"  # Kong Gateway
)

services_up=0
total_services=${#services_to_check[@]}

for service in "${services_to_check[@]}"; do
    if curl -s --max-time 5 "$service" > /dev/null 2>&1 || curl -s --max-time 5 "$service/health" > /dev/null 2>&1; then
        log_success "Service $service est accessible"
        ((services_up++))
    else
        log_warning "Service $service n'est pas accessible"
    fi
done

echo ""
log_info "Services accessibles: $services_up/$total_services"

if [ $services_up -lt $((total_services / 2)) ]; then
    log_warning "Moins de 50% des services sont accessibles. Les tests peuvent échouer."
    echo "Assurez-vous que le système est démarré avec: ./start.sh"
    echo ""
fi

# Créer le répertoire de rapports s'il n'existe pas
mkdir -p reports

# Configuration Jest
export NODE_ENV=test
export JEST_TIMEOUT=30000

echo ""
log_info "Démarrage des tests Jest..."
echo "=============================="

# Exécuter les tests dans l'ordre logique
test_suites=(
    "tests/setup.test.js"
    "tests/health.test.js"
    "tests/security.test.js"
    "tests/routing.test.js"
    "tests/performance.test.js"
    "tests/monitoring.test.js"
    "tests/integration.test.js"
)

test_results=()
total_tests=0
passed_tests=0
failed_tests=0

for test_suite in "${test_suites[@]}"; do
    echo ""
    test_name=$(basename "$test_suite" .test.js)
    log_info "🔍 Exécution: $test_name"
    echo "-----------------------------------"
    
    # Exécuter le test et capturer le résultat
    if npm test -- "$test_suite" --verbose --no-coverage; then
        log_success "✅ $test_name - SUCCÈS"
        test_results+=("✅ $test_name: SUCCÈS")
        ((passed_tests++))
    else
        log_error "❌ $test_name - ÉCHEC"
        test_results+=("❌ $test_name: ÉCHEC")
        ((failed_tests++))
    fi
    
    ((total_tests++))
    
    # Pause entre les tests
    sleep 2
done

# Tests avec couverture de code
echo ""
echo "======================================"
log_info "🔍 Exécution des tests avec couverture"
echo "======================================"

if npm test -- --coverage --coverageDirectory=reports/coverage; then
    log_success "Tests avec couverture terminés"
else
    log_warning "Tests avec couverture ont échoué"
fi

# Rapport final
echo ""
echo "=============================================="
log_info "📊 RAPPORT FINAL DES TESTS"
echo "=============================================="

echo ""
echo "📋 Résumé par suite de tests:"
for result in "${test_results[@]}"; do
    echo "   $result"
done

echo ""
echo "📊 Statistiques globales:"
echo "   • Total des suites: $total_tests"
echo "   • Succès: $passed_tests"
echo "   • Échecs: $failed_tests"
echo "   • Taux de réussite: $(( passed_tests * 100 / total_tests ))%"

echo ""
echo "🗂️  Rapports générés:"
echo "   • Couverture de code: reports/coverage/index.html"
echo "   • Logs des tests: Affichés ci-dessus"

echo ""
if [ $failed_tests -eq 0 ]; then
    log_success "🎉 TOUS LES TESTS SONT PASSÉS!"
    echo ""
    echo "✨ L'architecture hybride fonctionne correctement:"
    echo "   ✅ Configuration système"
    echo "   ✅ Santé des services"
    echo "   ✅ Sécurité et CORS"
    echo "   ✅ Routage intelligent"
    echo "   ✅ Performance et load balancing"
    echo "   ✅ Monitoring et observabilité"
    echo "   ✅ Intégration bout-en-bout"
elif [ $failed_tests -le 2 ]; then
    log_warning "⚠️  TESTS MAJORITAIREMENT RÉUSSIS"
    echo ""
    echo "La plupart des composants fonctionnent correctement."
    echo "Vérifiez les échecs pour des optimisations mineures."
else
    log_error "❌ PLUSIEURS TESTS ONT ÉCHOUÉ"
    echo ""
    echo "Problèmes détectés dans l'architecture. Actions recommandées:"
    echo "1. Vérifiez que tous les services sont démarrés"
    echo "2. Consultez les logs des services"
    echo "3. Vérifiez la configuration Kong et des bases de données"
    echo "4. Relancez les services si nécessaire"
fi

echo ""
echo "🔧 Pour résoudre les problèmes:"
echo "   • Logs système: docker-compose logs"
echo "   • Redémarrage: ./start.sh"
echo "   • Tests individuels: npm test tests/[nom].test.js"

echo ""
echo "📚 Documentation:"
echo "   • Architecture: docs/Architecture_Hybride_Complete.puml"
echo "   • API: docs/swagger-api.yml"
echo "   • Postman: docs/Architecture_Hybride_Postman.json"

echo ""
log_info "🏁 Tests terminés - $(date)"
echo "=================================================="

# Code de sortie basé sur les résultats
if [ $failed_tests -eq 0 ]; then
    exit 0
elif [ $failed_tests -le 2 ]; then
    exit 1
else
    exit 2
fi
