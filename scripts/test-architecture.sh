#!/bin/bash

echo "🧪 === TEST COMPLET DE L'ARCHITECTURE MICROSERVICES ==="
echo ""

# Couleurs pour l'affichage
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function pour afficher les résultats
print_result() {
    if [ $1 -eq 0 ]; then
        echo -e "${GREEN}✅ $2${NC}"
    else
        echo -e "${RED}❌ $2${NC}"
    fi
}

print_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

echo "=== PHASE 1: VÉRIFICATION DE LA STRUCTURE ==="
echo ""

# Test 1: Structure des microservices
print_info "Vérification de la structure des microservices..."
SERVICES=("produit-service" "magasin-service" "utilisateur-service" "vente-service")
STRUCTURE_OK=0

for service in "${SERVICES[@]}"; do
    echo "  📁 $service:"
    
    # Vérifier package.json
    if [ -f "microservices/$service/package.json" ]; then
        echo "    ✅ package.json"
    else
        echo "    ❌ package.json manquant"
        STRUCTURE_OK=1
    fi
    
    # Vérifier server.js
    if [ -f "microservices/$service/server.js" ]; then
        echo "    ✅ server.js"
    else
        echo "    ❌ server.js manquant"
        STRUCTURE_OK=1
    fi
    
    # Vérifier .env
    if [ -f "microservices/$service/.env" ]; then
        echo "    ✅ .env"
    else
        echo "    ❌ .env manquant"
        STRUCTURE_OK=1
    fi
    
    # Vérifier domain
    if [ -d "microservices/$service/src/domain" ] && [ $(ls microservices/$service/src/domain/*.js 2>/dev/null | wc -l) -gt 0 ]; then
        echo "    ✅ src/domain ($(ls microservices/$service/src/domain/*.js 2>/dev/null | wc -l) fichiers)"
    else
        echo "    ❌ src/domain manquant ou vide"
        STRUCTURE_OK=1
    fi
    
    # Vérifier infrastructure
    if [ -d "microservices/$service/src/infrastructure" ] && [ $(ls microservices/$service/src/infrastructure/*.js 2>/dev/null | wc -l) -gt 0 ]; then
        echo "    ✅ src/infrastructure ($(ls microservices/$service/src/infrastructure/*.js 2>/dev/null | wc -l) fichiers)"
    else
        echo "    ❌ src/infrastructure manquant ou vide"
        STRUCTURE_OK=1
    fi
    
    # Vérifier node_modules
    if [ -d "microservices/$service/node_modules" ]; then
        echo "    ✅ dépendances installées"
    else
        echo "    ❌ dépendances non installées"
        STRUCTURE_OK=1
    fi
    
    echo ""
done

print_result $STRUCTURE_OK "Structure des microservices"
echo ""

echo "=== PHASE 2: TEST DE SYNTAXE ==="
echo ""

# Test 2: Syntaxe des fichiers JavaScript
print_info "Vérification de la syntaxe JavaScript..."
SYNTAX_OK=0

for service in "${SERVICES[@]}"; do
    echo "  🔍 $service:"
    
    # Test server.js
    if [ -f "microservices/$service/server.js" ]; then
        if node -c "microservices/$service/server.js" 2>/dev/null; then
            echo "    ✅ server.js - syntaxe OK"
        else
            echo "    ❌ server.js - erreur de syntaxe"
            SYNTAX_OK=1
        fi
    fi
    
    # Test domain files
    if [ -d "microservices/$service/src/domain" ]; then
        for file in microservices/$service/src/domain/*.js; do
            if [ -f "$file" ]; then
                filename=$(basename "$file")
                if node -c "$file" 2>/dev/null; then
                    echo "    ✅ $filename - syntaxe OK"
                else
                    echo "    ❌ $filename - erreur de syntaxe"
                    SYNTAX_OK=1
                fi
            fi
        done
    fi
    
    # Test infrastructure files
    if [ -d "microservices/$service/src/infrastructure" ]; then
        for file in microservices/$service/src/infrastructure/*.js; do
            if [ -f "$file" ]; then
                filename=$(basename "$file")
                if node -c "$file" 2>/dev/null; then
                    echo "    ✅ $filename - syntaxe OK"
                else
                    echo "    ❌ $filename - erreur de syntaxe"
                    SYNTAX_OK=1
                fi
            fi
        done
    fi
    
    echo ""
done

print_result $SYNTAX_OK "Syntaxe JavaScript"
echo ""

echo "=== PHASE 3: VÉRIFICATION DES PORTS ==="
echo ""

# Test 3: Configuration des ports
print_info "Vérification des ports configurés..."
PORTS=("3001" "3002" "3003" "3004")
PORT_CONFIG_OK=0

for i in "${!SERVICES[@]}"; do
    service="${SERVICES[$i]}"
    expected_port="${PORTS[$i]}"
    
    echo "  🔌 $service (port attendu: $expected_port):"
    
    if [ -f "microservices/$service/.env" ]; then
        if grep -q "PORT=$expected_port" "microservices/$service/.env"; then
            echo "    ✅ Port $expected_port configuré dans .env"
        else
            echo "    ⚠️  Port $expected_port non trouvé dans .env"
            PORT_CONFIG_OK=1
        fi
    else
        echo "    ❌ Fichier .env manquant"
        PORT_CONFIG_OK=1
    fi
done

print_result $PORT_CONFIG_OK "Configuration des ports"
echo ""

echo "=== PHASE 4: TEST DES IMPORTS ==="
echo ""

# Test 4: Vérification des imports
print_info "Vérification des imports dans server.js..."
IMPORT_OK=0

for service in "${SERVICES[@]}"; do
    echo "  📥 $service:"
    
    if [ -f "microservices/$service/server.js" ]; then
        # Vérifier qu'il n'y a plus de références à l'ancien code centralisé
        if grep -q "require.*\.\./\.\./src/domain" "microservices/$service/server.js"; then
            echo "    ❌ Référence à l'ancien code centralisé trouvée"
            IMPORT_OK=1
        else
            echo "    ✅ Pas de référence à l'ancien code centralisé"
        fi
        
        # Vérifier les imports locaux
        if grep -q "require.*\./src/" "microservices/$service/server.js"; then
            echo "    ✅ Imports locaux trouvés"
        else
            echo "    ⚠️  Aucun import local trouvé"
        fi
    fi
done

print_result $IMPORT_OK "Vérification des imports"
echo ""

echo "=== PHASE 5: SCRIPTS DE GESTION ==="
echo ""

# Test 5: Scripts disponibles
print_info "Vérification des scripts de gestion..."
SCRIPTS_OK=0

REQUIRED_SCRIPTS=(
    "scripts/create-microservices-databases.sh"
    "scripts/start-domain-microservices.sh"
    "scripts/stop-domain-microservices.sh"
    "scripts/test-microservices.sh"
)

for script in "${REQUIRED_SCRIPTS[@]}"; do
    script_name=$(basename "$script")
    if [ -f "$script" ]; then
        if [ -x "$script" ]; then
            echo "  ✅ $script_name (exécutable)"
        else
            echo "  ⚠️  $script_name (non exécutable)"
        fi
    else
        echo "  ❌ $script_name manquant"
        SCRIPTS_OK=1
    fi
done

print_result $SCRIPTS_OK "Scripts de gestion"
echo ""

echo "=== RÉSUMÉ FINAL ==="
echo ""

TOTAL_ERRORS=$((STRUCTURE_OK + SYNTAX_OK + PORT_CONFIG_OK + IMPORT_OK + SCRIPTS_OK))

if [ $TOTAL_ERRORS -eq 0 ]; then
    echo -e "${GREEN}🎉 TOUS LES TESTS SONT PASSÉS !${NC}"
    echo -e "${GREEN}   Votre architecture microservices est prête !${NC}"
    echo ""
    echo "📋 Prochaines étapes:"
    echo "   1. Démarrer les bases de données: ./scripts/create-microservices-databases.sh"
    echo "   2. Démarrer les microservices: ./scripts/start-domain-microservices.sh"
    echo "   3. Tester les endpoints: ./scripts/test-microservices.sh"
else
    echo -e "${RED}❌ $TOTAL_ERRORS PROBLÈME(S) DÉTECTÉ(S)${NC}"
    echo -e "${YELLOW}   Corrigez les erreurs avant de continuer${NC}"
fi

echo ""
echo "🏁 Test terminé !"
