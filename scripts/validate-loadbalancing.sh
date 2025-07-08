#!/bin/bash

echo "✅ === VALIDATION LOAD BALANCING SETUP ==="
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

print_check() {
    echo -e "${YELLOW}🔍 $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

# Compteurs
checks_total=0
checks_passed=0

check_file() {
    local file=$1
    local description=$2
    
    checks_total=$((checks_total + 1))
    
    if [ -f "$file" ]; then
        print_success "$description"
        checks_passed=$((checks_passed + 1))
        return 0
    else
        print_error "$description - Fichier manquant: $file"
        return 1
    fi
}

check_script() {
    local script=$1
    local description=$2
    
    checks_total=$((checks_total + 1))
    
    if [ -f "$script" ] && [ -x "$script" ]; then
        print_success "$description"
        checks_passed=$((checks_passed + 1))
        return 0
    else
        print_error "$description - Script manquant ou non exécutable: $script"
        return 1
    fi
}

# Vérifications des fichiers
print_check "Vérification des fichiers de configuration..."

check_file "docker-compose.loadbalancing.yml" "Configuration Docker Load Balancing"
check_file "docs/LOAD_BALANCING_KONG.md" "Documentation Load Balancing"
check_file "tests/load/k6-loadbalancing-test.js" "Test k6 Load Balancing"
check_file "tests/load/k6-distribution-simple.js" "Test k6 Distribution Simple"

echo ""
print_check "Vérification des scripts..."

check_script "scripts/setup-kong-loadbalancing.sh" "Script Configuration Kong LB"
check_script "scripts/start-loadbalancing-architecture.sh" "Script Démarrage LB"
check_script "scripts/test-loadbalancing.sh" "Script Test LB"
check_script "scripts/run-load-tests.sh" "Script Tests de Charge"
check_script "scripts/stop-loadbalancing-architecture.sh" "Script Arrêt LB"
check_script "scripts/install-k6.sh" "Script Installation k6"

echo ""
print_check "Vérification du microservice produit..."

check_file "microservices/produit-service/server.js" "Server.js du produit-service"
check_file "microservices/produit-service/Dockerfile" "Dockerfile du produit-service"

# Vérifier que le server.js contient les modifications pour le load balancing
if [ -f "microservices/produit-service/server.js" ]; then
    if grep -q "INSTANCE_ID" "microservices/produit-service/server.js"; then
        print_success "Modifications INSTANCE_ID présentes"
        checks_passed=$((checks_passed + 1))
    else
        print_error "Modifications INSTANCE_ID manquantes dans server.js"
    fi
    checks_total=$((checks_total + 1))
    
    if grep -q "X-Instance-ID" "microservices/produit-service/server.js"; then
        print_success "Headers d'instance configurés"
        checks_passed=$((checks_passed + 1))
    else
        print_error "Headers d'instance manquants dans server.js"
    fi
    checks_total=$((checks_total + 1))
fi

echo ""
print_check "Vérification de la structure des tests..."

if [ -d "tests/load" ]; then
    print_success "Répertoire tests/load existe"
    checks_passed=$((checks_passed + 1))
else
    print_error "Répertoire tests/load manquant"
fi
checks_total=$((checks_total + 1))

echo ""
print_check "Vérification de la documentation..."

if [ -f "docs/LOAD_BALANCING_KONG.md" ]; then
    if grep -q "round-robin" "docs/LOAD_BALANCING_KONG.md"; then
        print_success "Documentation contient les détails round-robin"
        checks_passed=$((checks_passed + 1))
    else
        print_error "Documentation incomplète (round-robin manquant)"
    fi
    checks_total=$((checks_total + 1))
    
    if grep -q "3 instances" "docs/LOAD_BALANCING_KONG.md"; then
        print_success "Documentation mentionne les 3 instances"
        checks_passed=$((checks_passed + 1))
    else
        print_error "Documentation incomplète (3 instances manquant)"
    fi
    checks_total=$((checks_total + 1))
fi

echo ""
print_check "Vérification des outils optionnels..."

# k6
if command -v k6 >/dev/null 2>&1; then
    print_success "k6 installé et disponible"
else
    print_info "k6 non installé (optionnel) - Utilisez ./scripts/install-k6.sh"
fi

# ab (Apache Bench)
if command -v ab >/dev/null 2>&1; then
    print_success "Apache Bench (ab) disponible"
else
    print_info "Apache Bench non installé (optionnel) - sudo apt-get install apache2-utils"
fi

# wrk
if command -v wrk >/dev/null 2>&1; then
    print_success "wrk disponible"
else
    print_info "wrk non installé (optionnel) - sudo apt-get install wrk"
fi

# jq
if command -v jq >/dev/null 2>&1; then
    print_success "jq disponible pour parsing JSON"
else
    print_info "jq non installé (recommandé) - sudo apt-get install jq"
fi

# Docker
if command -v docker >/dev/null 2>&1; then
    print_success "Docker disponible"
else
    print_error "Docker requis mais non trouvé"
fi

# Docker Compose
if command -v docker-compose >/dev/null 2>&1; then
    print_success "Docker Compose disponible"
else
    print_error "Docker Compose requis mais non trouvé"
fi

# Résumé final
echo ""
echo "════════════════════════════════════════"
if [ $checks_passed -eq $checks_total ]; then
    print_success "VALIDATION RÉUSSIE : $checks_passed/$checks_total vérifications passées"
    echo ""
    print_info "🚀 Prêt pour le démarrage :"
    echo "  ./scripts/start-loadbalancing-architecture.sh"
    echo ""
    print_info "🧪 Tests disponibles :"
    echo "  ./scripts/test-loadbalancing.sh"
    echo "  ./scripts/run-load-tests.sh"
else
    print_error "VALIDATION PARTIELLE : $checks_passed/$checks_total vérifications passées"
    missing=$((checks_total - checks_passed))
    echo ""
    print_info "❗ $missing éléments manquants ou incorrects"
    print_info "Vérifiez les erreurs ci-dessus avant de continuer"
fi
echo "════════════════════════════════════════"
