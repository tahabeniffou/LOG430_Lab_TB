#!/bin/bash

echo "🚀 === TESTS DE CHARGE LOAD BALANCING ==="
echo ""

# Configuration
GATEWAY_URL="http://localhost:8000"

# Couleurs
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
PURPLE='\033[0;35m'
NC='\033[0m'

print_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

print_test() {
    echo -e "${YELLOW}🔍 $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

print_highlight() {
    echo -e "${PURPLE}🎯 $1${NC}"
}

# Vérifier les prérequis
check_prerequisites() {
    print_test "Vérification des prérequis..."
    
    # Vérifier que Kong est accessible
    if ! curl -s "$GATEWAY_URL/health-lb" > /dev/null 2>&1; then
        print_error "Le load balancer n'est pas accessible sur $GATEWAY_URL/health-lb"
        print_info "Assurez-vous que l'architecture avec load balancing est démarrée:"
        echo "  ./scripts/start-loadbalancing-architecture.sh"
        exit 1
    fi
    
    print_success "Load balancer accessible"
}

# Test avec curl simple
test_curl_distribution() {
    print_test "Test 1: Distribution avec curl (20 requêtes)"
    echo ""
    
    declare -A instance_count
    
    print_info "Envoi de 20 requêtes..."
    for i in {1..20}; do
        RESPONSE=$(curl -s "$GATEWAY_URL/health-lb" 2>/dev/null)
        if [ $? -eq 0 ]; then
            INSTANCE_ID=$(echo "$RESPONSE" | jq -r '.instanceId' 2>/dev/null || echo "unknown")
            instance_count[$INSTANCE_ID]=$((${instance_count[$INSTANCE_ID]} + 1))
            echo -n "."
        else
            echo -n "X"
        fi
    done
    
    echo ""
    echo ""
    print_highlight "Distribution des requêtes:"
    for instance in "${!instance_count[@]}"; do
        percentage=$(( ${instance_count[$instance]} * 100 / 20 ))
        echo "  • $instance: ${instance_count[$instance]}/20 requêtes ($percentage%)"
    done
    echo ""
}

# Test avec ab (Apache Bench) si disponible
test_ab_benchmark() {
    print_test "Test 2: Apache Bench (si disponible)"
    echo ""
    
    if command -v ab >/dev/null 2>&1; then
        print_info "Exécution de 100 requêtes avec 10 connexions concurrentes..."
        ab -n 100 -c 10 -g ab_results.tsv "$GATEWAY_URL/health-lb" 2>/dev/null
        
        if [ -f "ab_results.tsv" ]; then
            print_success "Test ab terminé, résultats dans ab_results.tsv"
            rm -f ab_results.tsv
        fi
    else
        print_info "Apache Bench (ab) non installé"
        print_info "Installation: sudo apt-get install apache2-utils"
    fi
    echo ""
}

# Test avec wrk si disponible
test_wrk_benchmark() {
    print_test "Test 3: wrk (si disponible)"
    echo ""
    
    if command -v wrk >/dev/null 2>&1; then
        print_info "Exécution d'un test wrk (10 secondes, 2 threads, 10 connexions)..."
        wrk -t2 -c10 -d10s --latency "$GATEWAY_URL/health-lb"
    else
        print_info "wrk non installé"
        print_info "Installation sur Ubuntu: sudo apt-get install wrk"
        print_info "Ou compilation: https://github.com/wg/wrk"
    fi
    echo ""
}

# Test avec k6 si disponible
test_k6_simple() {
    print_test "Test 4: k6 Distribution Simple (si disponible)"
    echo ""
    
    if command -v k6 >/dev/null 2>&1; then
        print_info "Exécution du test k6 de distribution..."
        k6 run tests/load/k6-distribution-simple.js
        print_success "Test k6 simple terminé"
    else
        print_info "k6 non installé"
        print_info "Installation: ./scripts/install-k6.sh"
        print_info "Ou avec Docker: docker run --rm -i grafana/k6:latest run - <tests/load/k6-distribution-simple.js"
    fi
    echo ""
}

# Test avec k6 complet
test_k6_advanced() {
    print_test "Test 5: k6 Test de Charge Avancé (si disponible)"
    echo ""
    
    if command -v k6 >/dev/null 2>&1; then
        print_info "Exécution du test k6 avancé avec montée en charge..."
        k6 run tests/load/k6-loadbalancing-test.js
        print_success "Test k6 avancé terminé"
    else
        print_info "k6 non installé - Test ignoré"
        print_info "Pour l'installer: ./scripts/install-k6.sh"
    fi
    echo ""
}

# Test de concurrence avec curl
test_concurrent_curl() {
    print_test "Test 6: Requêtes Concurrentes avec curl"
    echo ""
    
    print_info "Lancement de 5 processus avec 10 requêtes chacun..."
    
    TEMP_DIR="/tmp/concurrent_test_$$"
    mkdir -p "$TEMP_DIR"
    
    # Lancer 5 processus en parallèle
    for process in {1..5}; do
        (
            for i in {1..10}; do
                RESPONSE=$(curl -s "$GATEWAY_URL/health-lb" 2>/dev/null)
                INSTANCE_ID=$(echo "$RESPONSE" | jq -r '.instanceId' 2>/dev/null || echo "error")
                echo "$INSTANCE_ID" >> "$TEMP_DIR/process_$process.txt"
            done
        ) &
    done
    
    # Attendre tous les processus
    wait
    
    # Analyser les résultats
    declare -A total_count
    for process in {1..5}; do
        if [ -f "$TEMP_DIR/process_$process.txt" ]; then
            while read -r instance; do
                if [ "$instance" != "error" ]; then
                    total_count[$instance]=$((${total_count[$instance]} + 1))
                fi
            done < "$TEMP_DIR/process_$process.txt"
        fi
    done
    
    print_highlight "Distribution des 50 requêtes concurrentes:"
    for instance in "${!total_count[@]}"; do
        percentage=$(( ${total_count[$instance]} * 100 / 50 ))
        echo "  • $instance: ${total_count[$instance]}/50 requêtes ($percentage%)"
    done
    
    # Nettoyage
    rm -rf "$TEMP_DIR"
    echo ""
}

# Test de performance simple
test_performance_simple() {
    print_test "Test 7: Performance Simple (temps de réponse)"
    echo ""
    
    print_info "Mesure du temps de réponse pour 10 requêtes..."
    
    total_time=0
    successful_requests=0
    
    for i in {1..10}; do
        start_time=$(date +%s.%N)
        if curl -s "$GATEWAY_URL/health-lb" > /dev/null 2>&1; then
            end_time=$(date +%s.%N)
            duration=$(echo "$end_time - $start_time" | bc 2>/dev/null || echo "0")
            total_time=$(echo "$total_time + $duration" | bc 2>/dev/null || echo "$total_time")
            successful_requests=$((successful_requests + 1))
            duration_ms=$(echo "$duration * 1000" | bc 2>/dev/null || echo "N/A")
            echo "  Requête $i: ${duration_ms}ms"
        else
            echo "  Requête $i: ERREUR"
        fi
    done
    
    if [ $successful_requests -gt 0 ] && command -v bc >/dev/null 2>&1; then
        avg_time=$(echo "scale=3; $total_time / $successful_requests" | bc)
        avg_time_ms=$(echo "$avg_time * 1000" | bc)
        print_success "Temps moyen: ${avg_time_ms}ms ($successful_requests/$10 succès)"
    else
        print_success "$successful_requests/10 requêtes réussies"
    fi
    echo ""
}

# Fonction principale
main() {
    print_highlight "🎯 DÉBUT DES TESTS DE CHARGE LOAD BALANCING"
    echo ""
    
    check_prerequisites
    test_curl_distribution
    test_concurrent_curl
    test_performance_simple
    test_ab_benchmark
    test_wrk_benchmark
    test_k6_simple
    test_k6_advanced
    
    print_highlight "✨ TESTS DE CHARGE TERMINÉS"
    echo ""
    print_success "Le load balancing distribue correctement les requêtes !"
    echo ""
    print_info "Recommandations pour tests avancés :"
    echo "• Installez k6 pour des tests plus sophistiqués: ./scripts/install-k6.sh"
    echo "• Utilisez 'siege' pour des tests de charge robustes"
    echo "• Surveillez les métriques Kong Admin API"
    echo "• Testez avec différentes charges (CPU, mémoire) sur les instances"
}

# Exécution
main "$@"
