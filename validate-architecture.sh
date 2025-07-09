#!/bin/bash

# Script de validation complète de l'architecture hybride
# LOG430 Lab TB - Architecture Hybride

echo "🔍 VALIDATION COMPLÈTE - ARCHITECTURE HYBRIDE"
echo "=============================================="
echo ""

# Couleurs pour l'affichage
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Fonction pour afficher les résultats
check_status() {
    if [ $1 -eq 0 ]; then
        echo -e "${GREEN}✅ $2${NC}"
        return 0
    else
        echo -e "${RED}❌ $2${NC}"
        return 1
    fi
}

warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

# Compteurs
TOTAL_CHECKS=0
PASSED_CHECKS=0

# Fonction pour incrémenter les compteurs
count_check() {
    TOTAL_CHECKS=$((TOTAL_CHECKS + 1))
    if [ $1 -eq 0 ]; then
        PASSED_CHECKS=$((PASSED_CHECKS + 1))
    fi
}

echo "1️⃣ VÉRIFICATION DE LA STRUCTURE DES FICHIERS"
echo "============================================"

# Vérifier les fichiers principaux
files_to_check=(
    "hybrid-router.js"
    "docker-compose.hybrid.yml"
    "Dockerfile.legacy"
    "Dockerfile.hybrid-router"
    "start-architecture-hybride.sh"
    "test-architecture-hybride.sh"
    "generate-diagrams.sh"
    "README_ARCHITECTURE_HYBRIDE.md"
    "SYNTHESE_FINALE_ARCHITECTURE_HYBRIDE.md"
    "config/kong-hybrid.yml"
    "config/prometheus-hybrid.yml"
    "scripts/init-hybrid-db.sql"
)

for file in "${files_to_check[@]}"; do
    if [ -f "$file" ]; then
        check_status 0 "Fichier $file présent"
        count_check 0
    else
        check_status 1 "Fichier $file manquant"
        count_check 1
    fi
done

echo ""
echo "2️⃣ VÉRIFICATION DES MICROSERVICES"
echo "================================="

# Vérifier la structure des microservices
microservices=("produit-service" "vente-service" "stock-service" "reporting-service")

for ms in "${microservices[@]}"; do
    if [ -d "microservices/$ms" ]; then
        check_status 0 "Dossier microservices/$ms existe"
        count_check 0
        
        # Vérifier les fichiers essentiels du microservice
        if [ -f "microservices/$ms/package.json" ]; then
            check_status 0 "  → package.json présent"
            count_check 0
        else
            check_status 1 "  → package.json manquant"
            count_check 1
        fi
        
        if [ -f "microservices/$ms/server.js" ]; then
            check_status 0 "  → server.js présent"
            count_check 0
        else
            check_status 1 "  → server.js manquant"
            count_check 1
        fi
        
        if [ -f "microservices/$ms/Dockerfile" ]; then
            check_status 0 "  → Dockerfile présent"
            count_check 0
        else
            check_status 1 "  → Dockerfile manquant"
            count_check 1
        fi
    else
        check_status 1 "Dossier microservices/$ms manquant"
        count_check 1
    fi
done

echo ""
echo "3️⃣ VÉRIFICATION DES DIAGRAMMES"
echo "=============================="

# Vérifier les diagrammes PlantUML
diagrams=(
    "docs/Architecture_Hybride_Complete.puml"
    "docs/Architecture_Complete_Flow_Console.puml"
    "docs/Architecture_Globale_Ports_Complet.puml"
    "docs/Responsabilites_Microservices_Par_Console.puml"
    "docs/Sequence_Flow_Consoles_Detaille.puml"
    "docs/Flux_Routage_Par_Console_Detaille.puml"
    "docs/Matrice_Responsabilites_Microservices.puml"
    "docs/Vue_Ensemble_Ports_Flux.puml"
    "docs/Exemples_Utilisation_Consoles.puml"
)

for diagram in "${diagrams[@]}"; do
    if [ -f "$diagram" ]; then
        check_status 0 "Diagramme $(basename "$diagram") présent"
        count_check 0
    else
        check_status 1 "Diagramme $(basename "$diagram") manquant"
        count_check 1
    fi
done

echo ""
echo "4️⃣ VÉRIFICATION DE LA CONFIGURATION"
echo "==================================="

# Vérifier que le hybrid-router.js contient les bonnes configurations
if [ -f "hybrid-router.js" ]; then
    if grep -q "ROUTING_CONFIG" hybrid-router.js; then
        check_status 0 "Configuration de routage présente dans hybrid-router.js"
        count_check 0
    else
        check_status 1 "Configuration de routage manquante dans hybrid-router.js"
        count_check 1
    fi
    
    if grep -q "X-Client-Type" hybrid-router.js; then
        check_status 0 "Détection X-Client-Type configurée"
        count_check 0
    else
        check_status 1 "Détection X-Client-Type manquante"
        count_check 1
    fi
fi

# Vérifier docker-compose.hybrid.yml
if [ -f "docker-compose.hybrid.yml" ]; then
    services_expected=("legacy-app" "hybrid-router" "produit-service" "vente-service" "stock-service" "reporting-service" "kong" "postgres-legacy" "redis" "prometheus" "grafana")
    
    for service in "${services_expected[@]}"; do
        if grep -q "$service:" docker-compose.hybrid.yml; then
            check_status 0 "Service $service défini dans docker-compose.hybrid.yml"
            count_check 0
        else
            check_status 1 "Service $service manquant dans docker-compose.hybrid.yml"
            count_check 1
        fi
    done
fi

echo ""
echo "5️⃣ VÉRIFICATION DES SCRIPTS"
echo "==========================="

# Vérifier que les scripts sont exécutables
scripts_to_check=("start-architecture-hybride.sh" "test-architecture-hybride.sh" "generate-diagrams.sh")

for script in "${scripts_to_check[@]}"; do
    if [ -f "$script" ]; then
        if [ -x "$script" ]; then
            check_status 0 "Script $script est exécutable"
            count_check 0
        else
            check_status 1 "Script $script n'est pas exécutable"
            count_check 1
            warning "Exécutez: chmod +x $script"
        fi
    fi
done

echo ""
echo "6️⃣ VÉRIFICATION DES DÉPENDANCES"
echo "==============================="

# Vérifier Node.js
if command -v node &> /dev/null; then
    NODE_VERSION=$(node --version)
    check_status 0 "Node.js installé ($NODE_VERSION)"
    count_check 0
else
    check_status 1 "Node.js non installé"
    count_check 1
fi

# Vérifier npm
if command -v npm &> /dev/null; then
    NPM_VERSION=$(npm --version)
    check_status 0 "npm installé ($NPM_VERSION)"
    count_check 0
else
    check_status 1 "npm non installé"
    count_check 1
fi

# Vérifier Docker
if command -v docker &> /dev/null; then
    DOCKER_VERSION=$(docker --version | cut -d' ' -f3 | cut -d',' -f1)
    check_status 0 "Docker installé ($DOCKER_VERSION)"
    count_check 0
else
    check_status 1 "Docker non installé"
    count_check 1
fi

# Vérifier Docker Compose
if command -v docker-compose &> /dev/null; then
    COMPOSE_VERSION=$(docker-compose --version | cut -d' ' -f3 | cut -d',' -f1)
    check_status 0 "Docker Compose installé ($COMPOSE_VERSION)"
    count_check 0
else
    check_status 1 "Docker Compose non installé"
    count_check 1
fi

echo ""
echo "7️⃣ VALIDATION DE LA SYNTAXE"
echo "============================"

# Vérifier la syntaxe des fichiers JSON
json_files=("package.json" "microservices/*/package.json")

for pattern in "${json_files[@]}"; do
    for file in $pattern; do
        if [ -f "$file" ]; then
            if node -e "JSON.parse(require('fs').readFileSync('$file', 'utf8'))" 2>/dev/null; then
                check_status 0 "Syntaxe JSON valide: $file"
                count_check 0
            else
                check_status 1 "Syntaxe JSON invalide: $file"
                count_check 1
            fi
        fi
    done
done

# Vérifier la syntaxe des fichiers YAML
if command -v python3 &> /dev/null; then
    yaml_files=("docker-compose.hybrid.yml" "config/kong-hybrid.yml" "config/prometheus-hybrid.yml")
    
    for file in "${yaml_files[@]}"; do
        if [ -f "$file" ]; then
            if python3 -c "import yaml; yaml.safe_load(open('$file'))" 2>/dev/null; then
                check_status 0 "Syntaxe YAML valide: $file"
                count_check 0
            else
                check_status 1 "Syntaxe YAML invalide: $file"
                count_check 1
            fi
        fi
    done
fi

echo ""
echo "8️⃣ RECOMMANDATIONS"
echo "=================="

# Recommandations basées sur les vérifications
if [ ! -d "logs" ]; then
    warning "Créer le dossier 'logs' pour les journaux d'application"
    info "mkdir logs"
fi

if [ ! -d "docs/images" ]; then
    warning "Créer le dossier 'docs/images' pour les diagrammes générés"
    info "mkdir -p docs/images"
fi

if [ ! -f ".env" ]; then
    warning "Créer un fichier .env pour les variables d'environnement"
    info "Copiez .env.example vers .env et adaptez les valeurs"
fi

if [ ! -f ".gitignore" ]; then
    warning "Créer un fichier .gitignore pour exclure certains fichiers"
    info "Ajoutez node_modules/, logs/, .env, etc."
fi

echo ""
echo "📊 RÉSUMÉ DE LA VALIDATION"
echo "=========================="

# Calculer le pourcentage de réussite
if [ $TOTAL_CHECKS -gt 0 ]; then
    SUCCESS_RATE=$((PASSED_CHECKS * 100 / TOTAL_CHECKS))
else
    SUCCESS_RATE=0
fi

echo ""
info "Total des vérifications: $TOTAL_CHECKS"
info "Vérifications réussies: $PASSED_CHECKS"

if [ $SUCCESS_RATE -ge 90 ]; then
    echo -e "${GREEN}🎉 Validation réussie à ${SUCCESS_RATE}% !${NC}"
    echo -e "${GREEN}✅ L'architecture hybride est correctement configurée${NC}"
elif [ $SUCCESS_RATE -ge 70 ]; then
    echo -e "${YELLOW}⚠️  Validation partielle à ${SUCCESS_RATE}%${NC}"
    echo -e "${YELLOW}🔧 Quelques ajustements nécessaires${NC}"
else
    echo -e "${RED}❌ Validation échouée à ${SUCCESS_RATE}%${NC}"
    echo -e "${RED}🚨 Configuration incomplète, vérifiez les erreurs ci-dessus${NC}"
fi

echo ""
echo "🚀 PROCHAINES ÉTAPES"
echo "==================="

if [ $SUCCESS_RATE -ge 90 ]; then
    echo "1. Générer les diagrammes: ./generate-diagrams.sh"
    echo "2. Démarrer l'architecture: ./start-architecture-hybride.sh"
    echo "3. Exécuter les tests: ./test-architecture-hybride.sh"
    echo "4. Consulter la documentation: README_ARCHITECTURE_HYBRIDE.md"
elif [ $SUCCESS_RATE -ge 70 ]; then
    echo "1. Corriger les erreurs identifiées ci-dessus"
    echo "2. Relancer cette validation: ./validate-architecture.sh"
    echo "3. Consulter la documentation pour les détails"
else
    echo "1. Vérifier l'installation des dépendances (Node.js, Docker)"
    echo "2. Compléter les fichiers manquants"
    echo "3. Relancer cette validation"
fi

echo ""
echo "📚 DOCUMENTATION DISPONIBLE"
echo "============================"
echo "• README_ARCHITECTURE_HYBRIDE.md - Guide complet"
echo "• SYNTHESE_FINALE_ARCHITECTURE_HYBRIDE.md - Vue d'ensemble"
echo "• docs/ - Diagrammes et documentation technique"
echo "• scripts/ - Scripts utilitaires"

echo ""
echo "✨ Validation terminée !"
exit $((100 - SUCCESS_RATE > 30 ? 1 : 0))
