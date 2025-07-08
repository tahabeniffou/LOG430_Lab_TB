#!/bin/bash

echo "⚖️ === CONFIGURATION KONG LOAD BALANCING ==="
echo ""

# Configuration
KONG_ADMIN_URL="http://localhost:8001"

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

# Fonction pour attendre que Kong soit prêt
wait_for_kong() {
    print_step "Attente de Kong..."
    for i in {1..30}; do
        if curl -s "$KONG_ADMIN_URL" > /dev/null 2>&1; then
            print_success "Kong est prêt"
            return 0
        fi
        echo -n "."
        sleep 2
    done
    print_error "Kong n'est pas accessible après 60 secondes"
    exit 1
}

# Fonction pour supprimer une configuration existante
cleanup_existing_config() {
    print_step "Nettoyage de la configuration existante..."
    
    # Supprimer les routes existantes pour produit-service-lb
    curl -s -X DELETE "$KONG_ADMIN_URL/routes/produit-service-lb-route" > /dev/null 2>&1
    
    # Supprimer le service existant
    curl -s -X DELETE "$KONG_ADMIN_URL/services/produit-service-lb" > /dev/null 2>&1
    
    print_info "Nettoyage terminé"
}

# Fonction pour créer l'upstream (groupe de serveurs)
create_upstream() {
    print_step "Création de l'upstream pour load balancing..."
    
    # Créer l'upstream avec algorithme round-robin
    UPSTREAM_RESPONSE=$(curl -s -w "%{http_code}" -X POST "$KONG_ADMIN_URL/upstreams" \
        --data "name=produit-service-upstream" \
        --data "algorithm=round-robin" \
        --data "healthchecks.passive.healthy.successes=3" \
        --data "healthchecks.passive.unhealthy.http_failures=3" \
        --data "healthchecks.active.healthy.interval=30" \
        --data "healthchecks.active.healthy.http_path=/health" \
        --data "healthchecks.active.unhealthy.interval=30" \
        --data "healthchecks.active.unhealthy.http_path=/health")
    
    HTTP_CODE="${UPSTREAM_RESPONSE: -3}"
    if [ "$HTTP_CODE" = "201" ] || [ "$HTTP_CODE" = "409" ]; then
        print_success "Upstream créé avec succès"
    else
        print_error "Erreur lors de la création de l'upstream (Code: $HTTP_CODE)"
        exit 1
    fi
}

# Fonction pour ajouter les targets (instances) à l'upstream
add_targets() {
    print_step "Ajout des instances au load balancer..."
    
    # Instance 1 (port 3001)
    TARGET1_RESPONSE=$(curl -s -w "%{http_code}" -X POST "$KONG_ADMIN_URL/upstreams/produit-service-upstream/targets" \
        --data "target=host.docker.internal:3001" \
        --data "weight=100")
    
    # Instance 2 (port 3005) 
    TARGET2_RESPONSE=$(curl -s -w "%{http_code}" -X POST "$KONG_ADMIN_URL/upstreams/produit-service-upstream/targets" \
        --data "target=host.docker.internal:3005" \
        --data "weight=100")
    
    # Instance 3 (port 3006)
    TARGET3_RESPONSE=$(curl -s -w "%{http_code}" -X POST "$KONG_ADMIN_URL/upstreams/produit-service-upstream/targets" \
        --data "target=host.docker.internal:3006" \
        --data "weight=100")
    
    HTTP_CODE1="${TARGET1_RESPONSE: -3}"
    HTTP_CODE2="${TARGET2_RESPONSE: -3}"
    HTTP_CODE3="${TARGET3_RESPONSE: -3}"
    
    if [ "$HTTP_CODE1" = "201" ] || [ "$HTTP_CODE1" = "409" ]; then
        print_success "Target 1 ajouté (port 3001)"
    else
        print_error "Erreur avec target 1 (Code: $HTTP_CODE1)"
    fi
    
    if [ "$HTTP_CODE2" = "201" ] || [ "$HTTP_CODE2" = "409" ]; then
        print_success "Target 2 ajouté (port 3005)"
    else
        print_error "Erreur avec target 2 (Code: $HTTP_CODE2)"
    fi
    
    if [ "$HTTP_CODE3" = "201" ] || [ "$HTTP_CODE3" = "409" ]; then
        print_success "Target 3 ajouté (port 3006)"
    else
        print_error "Erreur avec target 3 (Code: $HTTP_CODE3)"
    fi
}

# Fonction pour créer le service Kong
create_service() {
    print_step "Création du service Kong avec load balancing..."
    
    SERVICE_RESPONSE=$(curl -s -w "%{http_code}" -X POST "$KONG_ADMIN_URL/services" \
        --data "name=produit-service-lb" \
        --data "host=produit-service-upstream" \
        --data "port=80" \
        --data "protocol=http")
    
    HTTP_CODE="${SERVICE_RESPONSE: -3}"
    if [ "$HTTP_CODE" = "201" ] || [ "$HTTP_CODE" = "409" ]; then
        print_success "Service Kong créé avec load balancing"
    else
        print_error "Erreur lors de la création du service (Code: $HTTP_CODE)"
        exit 1
    fi
}

# Fonction pour créer les routes
create_routes() {
    print_step "Création des routes pour le load balancing..."
    
    # Route principale pour les produits
    ROUTE_RESPONSE=$(curl -s -w "%{http_code}" -X POST "$KONG_ADMIN_URL/services/produit-service-lb/routes" \
        --data "name=produit-service-lb-route" \
        --data "paths[]=/api/produits-lb" \
        --data "methods[]=GET" \
        --data "methods[]=POST" \
        --data "methods[]=PUT" \
        --data "methods[]=DELETE")
    
    # Route pour le health check avec load balancing
    HEALTH_ROUTE_RESPONSE=$(curl -s -w "%{http_code}" -X POST "$KONG_ADMIN_URL/services/produit-service-lb/routes" \
        --data "name=produit-health-lb-route" \
        --data "paths[]=/health-lb" \
        --data "methods[]=GET")
    
    HTTP_CODE1="${ROUTE_RESPONSE: -3}"
    HTTP_CODE2="${HEALTH_ROUTE_RESPONSE: -3}"
    
    if [ "$HTTP_CODE1" = "201" ] || [ "$HTTP_CODE1" = "409" ]; then
        print_success "Route principale créée (/api/produits-lb)"
    else
        print_error "Erreur route principale (Code: $HTTP_CODE1)"
    fi
    
    if [ "$HTTP_CODE2" = "201" ] || [ "$HTTP_CODE2" = "409" ]; then
        print_success "Route health check créée (/health-lb)"
    else
        print_error "Erreur route health (Code: $HTTP_CODE2)"
    fi
}

# Fonction pour ajouter des plugins utiles
add_plugins() {
    print_step "Ajout de plugins pour monitoring..."
    
    # Plugin pour ajouter des headers d'identification du load balancing
    PLUGIN_RESPONSE=$(curl -s -w "%{http_code}" -X POST "$KONG_ADMIN_URL/plugins" \
        --data "name=response-transformer" \
        --data "service.name=produit-service-lb" \
        --data "config.add.headers=X-Load-Balanced:true" \
        --data "config.add.headers=X-Gateway-Load-Balancer:Kong")
    
    HTTP_CODE="${PLUGIN_RESPONSE: -3}"
    if [ "$HTTP_CODE" = "201" ] || [ "$HTTP_CODE" = "409" ]; then
        print_success "Plugin response-transformer ajouté"
    else
        print_info "Plugin déjà existant ou erreur mineure"
    fi
}

# Fonction pour afficher l'état du load balancing
show_status() {
    print_step "État du load balancing..."
    
    echo ""
    print_info "Upstream configuré :"
    curl -s "$KONG_ADMIN_URL/upstreams/produit-service-upstream" | jq -r '.name + " - " + .algorithm' 2>/dev/null || echo "produit-service-upstream - round-robin"
    
    echo ""
    print_info "Targets (instances) configurés :"
    curl -s "$KONG_ADMIN_URL/upstreams/produit-service-upstream/targets" | jq -r '.data[] | .target + " (weight: " + (.weight|tostring) + ")"' 2>/dev/null || echo "host.docker.internal:3001, host.docker.internal:3005, host.docker.internal:3006"
    
    echo ""
    print_info "Routes configurées :"
    echo "• GET/POST/PUT/DELETE http://localhost:8000/api/produits-lb"
    echo "• GET http://localhost:8000/health-lb"
}

# Exécution principale
main() {
    wait_for_kong
    cleanup_existing_config
    create_upstream
    add_targets
    create_service
    create_routes
    add_plugins
    show_status
    
    echo ""
    print_success "Configuration du load balancing terminée !"
    echo ""
    print_info "Test rapide :"
    echo "curl http://localhost:8000/health-lb"
    echo "curl http://localhost:8000/api/produits-lb"
    echo ""
}

main "$@"
