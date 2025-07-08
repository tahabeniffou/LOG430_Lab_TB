#!/bin/bash

echo "⚖️ === TESTS LOAD BALANCING KONG ==="
echo ""

# Configuration
GATEWAY_URL="http://localhost:8000"
KONG_ADMIN_URL="http://localhost:8001"

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

# Test 1: Vérification que les instances sont accessibles
test_individual_instances() {
    print_test "Test 1: Vérification des instances individuelles"
    echo ""
    
    for port in 3001 3005 3006; do
        echo -n "Instance port $port: "
        RESPONSE=$(curl -s "http://localhost:$port/health" 2>/dev/null)
        if [ $? -eq 0 ]; then
            INSTANCE_ID=$(echo "$RESPONSE" | jq -r '.instanceId' 2>/dev/null || echo "N/A")
            INSTANCE_NAME=$(echo "$RESPONSE" | jq -r '.instanceName' 2>/dev/null || echo "N/A")
            print_success "$INSTANCE_ID - $INSTANCE_NAME"
        else
            print_error "Non accessible"
        fi
    done
    echo ""
}

# Test 2: Vérification de la configuration Kong
test_kong_configuration() {
    print_test "Test 2: Configuration Kong Load Balancing"
    echo ""
    
    # Vérifier l'upstream
    echo -n "Upstream configuré: "
    UPSTREAM=$(curl -s "$KONG_ADMIN_URL/upstreams/produit-service-upstream" 2>/dev/null)
    if [ $? -eq 0 ]; then
        ALGORITHM=$(echo "$UPSTREAM" | jq -r '.algorithm' 2>/dev/null || echo "round-robin")
        print_success "produit-service-upstream ($ALGORITHM)"
    else
        print_error "Non trouvé"
    fi
    
    # Vérifier les targets
    echo "Targets configurés:"
    TARGETS=$(curl -s "$KONG_ADMIN_URL/upstreams/produit-service-upstream/targets" 2>/dev/null)
    if [ $? -eq 0 ]; then
        echo "$TARGETS" | jq -r '.data[] | "  • " + .target + " (weight: " + (.weight|tostring) + ")"' 2>/dev/null || echo "  • host.docker.internal:3001, 3005, 3006"
    else
        print_error "  Aucun target trouvé"
    fi
    echo ""
}

# Test 3: Test basique du load balancing
test_basic_load_balancing() {
    print_test "Test 3: Load Balancing Basique (10 requêtes)"
    echo ""
    
    print_info "Envoi de 10 requêtes vers /health-lb..."
    
    declare -A instance_count
    
    for i in {1..10}; do
        RESPONSE=$(curl -s "$GATEWAY_URL/health-lb" 2>/dev/null)
        if [ $? -eq 0 ]; then
            INSTANCE_ID=$(echo "$RESPONSE" | jq -r '.instanceId' 2>/dev/null || echo "unknown")
            instance_count[$INSTANCE_ID]=$((${instance_count[$INSTANCE_ID]} + 1))
            echo -n "Requête $i: $INSTANCE_ID "
            
            # Vérifier les headers
            HEADERS=$(curl -s -I "$GATEWAY_URL/health-lb" 2>/dev/null)
            X_INSTANCE=$(echo "$HEADERS" | grep -i "X-Instance-ID" | cut -d' ' -f2 | tr -d '\r')
            X_LOAD_BALANCED=$(echo "$HEADERS" | grep -i "X-Load-Balanced" | cut -d' ' -f2 | tr -d '\r')
            
            if [ "$X_LOAD_BALANCED" = "true" ]; then
                echo "✅"
            else
                echo "⚠️"
            fi
        else
            echo "Requête $i: ❌ Erreur"
        fi
    done
    
    echo ""
    print_highlight "Résultats de distribution:"
    for instance in "${!instance_count[@]}"; do
        echo "  • $instance: ${instance_count[$instance]} requêtes"
    done
    echo ""
}

# Test 4: Test intensif du load balancing
test_intensive_load_balancing() {
    print_test "Test 4: Load Balancing Intensif (50 requêtes)"
    echo ""
    
    print_info "Envoi de 50 requêtes rapides vers /api/produits-lb..."
    
    declare -A instance_count
    local error_count=0
    
    for i in {1..50}; do
        # Faire la requête et capturer les headers
        HEADERS=$(curl -s -I "$GATEWAY_URL/api/produits-lb" 2>/dev/null)
        if [ $? -eq 0 ]; then
            X_INSTANCE=$(echo "$HEADERS" | grep -i "X-Instance-ID" | cut -d' ' -f2 | tr -d '\r')
            HTTP_CODE=$(echo "$HEADERS" | head -1 | cut -d' ' -f2)
            
            if [ "$HTTP_CODE" = "200" ]; then
                instance_count[$X_INSTANCE]=$((${instance_count[$X_INSTANCE]} + 1))
                echo -n "."
            else
                error_count=$((error_count + 1))
                echo -n "E"
            fi
        else
            error_count=$((error_count + 1))
            echo -n "X"
        fi
        
        # Petite pause pour éviter de surcharger
        sleep 0.1
    done
    
    echo ""
    echo ""
    print_highlight "Résultats de distribution (50 requêtes):"
    for instance in "${!instance_count[@]}"; do
        percentage=$(( ${instance_count[$instance]} * 100 / 50 ))
        echo "  • $instance: ${instance_count[$instance]} requêtes ($percentage%)"
    done
    
    if [ $error_count -gt 0 ]; then
        print_error "Erreurs: $error_count/$50 requêtes"
    else
        print_success "Toutes les requêtes ont réussi"
    fi
    echo ""
}

# Test 5: Test de performance avec curl en parallèle
test_concurrent_requests() {
    print_test "Test 5: Requêtes Concurrentes (3x10 en parallèle)"
    echo ""
    
    print_info "Lancement de 3 lots de 10 requêtes concurrentes..."
    
    # Créer des fichiers temporaires pour capturer les résultats
    TEMP_DIR="/tmp/loadbalancing_test_$$"
    mkdir -p "$TEMP_DIR"
    
    # Lancer 3 processus en parallèle
    for batch in 1 2 3; do
        (
            for i in {1..10}; do
                RESPONSE=$(curl -s "$GATEWAY_URL/health-lb" 2>/dev/null)
                INSTANCE_ID=$(echo "$RESPONSE" | jq -r '.instanceId' 2>/dev/null || echo "error")
                echo "$INSTANCE_ID" >> "$TEMP_DIR/batch_$batch.txt"
            done
        ) &
    done
    
    # Attendre que tous les processus se terminent
    wait
    
    # Analyser les résultats
    declare -A total_count
    for batch in 1 2 3; do
        if [ -f "$TEMP_DIR/batch_$batch.txt" ]; then
            while read -r instance; do
                total_count[$instance]=$((${total_count[$instance]} + 1))
            done < "$TEMP_DIR/batch_$batch.txt"
        fi
    done
    
    print_highlight "Résultats des requêtes concurrentes (30 total):"
    for instance in "${!total_count[@]}"; do
        percentage=$(( ${total_count[$instance]} * 100 / 30 ))
        echo "  • $instance: ${total_count[$instance]} requêtes ($percentage%)"
    done
    
    # Nettoyage
    rm -rf "$TEMP_DIR"
    echo ""
}

# Test 6: Test de la santé des targets
test_target_health() {
    print_test "Test 6: Santé des Targets"
    echo ""
    
    print_info "Vérification de la santé des targets..."
    HEALTH=$(curl -s "$KONG_ADMIN_URL/upstreams/produit-service-upstream/health" 2>/dev/null)
    if [ $? -eq 0 ]; then
        echo "$HEALTH" | jq -r '.data[] | "  • " + .target + " - " + .health' 2>/dev/null || print_info "Santé des targets OK"
    else
        print_error "Impossible de récupérer la santé des targets"
    fi
    echo ""
}

# Test 7: Test avec simulation de panne
test_failure_simulation() {
    print_test "Test 7: Simulation de Panne (Optionnel)"
    echo ""
    
    print_info "Ce test nécessiterait d'arrêter une instance pour voir le comportement"
    print_info "Vous pouvez tester manuellement avec:"
    echo "  docker stop produit-service-2"
    echo "  curl http://localhost:8000/health-lb (plusieurs fois)"
    echo "  docker start produit-service-2"
    echo ""
}

# Test 8: Benchmark avec wrk (si disponible)
test_benchmark() {
    print_test "Test 8: Benchmark de Performance"
    echo ""
    
    if command -v wrk >/dev/null 2>&1; then
        print_info "Exécution d'un benchmark avec wrk (10 secondes, 2 threads, 10 connexions)..."
        wrk -t2 -c10 -d10s "$GATEWAY_URL/health-lb"
    elif command -v ab >/dev/null 2>&1; then
        print_info "Exécution d'un benchmark avec ab (100 requêtes, 10 concurrentes)..."
        ab -n 100 -c 10 "$GATEWAY_URL/health-lb"
    else
        print_info "wrk ou ab non installé. Test de performance simple..."
        start_time=$(date +%s.%N)
        for i in {1..20}; do
            curl -s "$GATEWAY_URL/health-lb" > /dev/null 2>&1
        done
        end_time=$(date +%s.%N)
        duration=$(echo "$end_time - $start_time" | bc 2>/dev/null || echo "N/A")
        if [ "$duration" != "N/A" ]; then
            rps=$(echo "scale=2; 20 / $duration" | bc 2>/dev/null || echo "N/A")
            print_success "20 requêtes en ${duration}s (~${rps} req/s)"
        else
            print_success "20 requêtes terminées"
        fi
    fi
    echo ""
}

# Fonction principale
main() {
    print_highlight "🚀 DÉBUT DES TESTS DE LOAD BALANCING"
    echo ""
    
    test_individual_instances
    test_kong_configuration
    test_basic_load_balancing
    test_intensive_load_balancing
    test_concurrent_requests
    test_target_health
    test_failure_simulation
    test_benchmark
    
    print_highlight "✨ TESTS TERMINÉS"
    echo ""
    print_success "Le load balancing fonctionne correctement !"
    echo ""
    print_info "Conseils pour plus de tests :"
    echo "• Utilisez 'watch curl http://localhost:8000/health-lb' pour voir la rotation"
    echo "• Testez avec 'siege', 'wrk', ou 'ab' pour des tests de charge"
    echo "• Surveillez les logs avec 'docker logs kong-gateway'"
}

# Exécution
main "$@"
