#!/bin/bash

echo "🌐 === CONFIGURATION KONG API GATEWAY ==="
echo ""

# Configuration
KONG_ADMIN_URL="http://localhost:8001"
GATEWAY_URL="http://localhost:8000"

# Couleurs pour l'affichage
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

# Function pour afficher les résultats
print_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

# Fonction pour attendre que Kong soit prêt
wait_for_kong() {
    print_info "Attente de la disponibilité de Kong..."
    local retries=30
    local count=0
    
    while [ $count -lt $retries ]; do
        if curl -s $KONG_ADMIN_URL > /dev/null 2>&1; then
            print_success "Kong est prêt !"
            return 0
        fi
        count=$((count + 1))
        echo -n "."
        sleep 2
    done
    
    print_error "Kong n'est pas disponible après $retries tentatives"
    return 1
}

# Fonction pour configurer un service
configure_service() {
    local service_name=$1
    local service_url=$2
    local service_port=$3
    local route_path=$4
    
    print_info "Configuration du service: $service_name"
    
    # Créer le service
    curl -i -X POST $KONG_ADMIN_URL/services/ \
        --data "name=$service_name" \
        --data "url=$service_url:$service_port" > /dev/null 2>&1
    
    if [ $? -eq 0 ]; then
        print_success "Service $service_name créé"
    else
        print_warning "Service $service_name existe déjà ou erreur"
    fi
    
    # Créer la route
    curl -i -X POST $KONG_ADMIN_URL/services/$service_name/routes \
        --data "paths[]=$route_path" \
        --data "methods[]=GET" \
        --data "methods[]=POST" \
        --data "methods[]=PUT" \
        --data "methods[]=DELETE" > /dev/null 2>&1
    
    if [ $? -eq 0 ]; then
        print_success "Route $route_path configurée pour $service_name"
    else
        print_warning "Route existe déjà ou erreur"
    fi
}

# Fonction pour activer un plugin
enable_plugin() {
    local plugin_name=$1
    local service_name=$2
    local config=$3
    
    print_info "Activation du plugin $plugin_name sur $service_name"
    
    local plugin_data="name=$plugin_name"
    if [ -n "$service_name" ]; then
        plugin_data="$plugin_data&service.name=$service_name"
    fi
    if [ -n "$config" ]; then
        plugin_data="$plugin_data&$config"
    fi
    
    curl -i -X POST $KONG_ADMIN_URL/plugins/ \
        --data "$plugin_data" > /dev/null 2>&1
    
    if [ $? -eq 0 ]; then
        print_success "Plugin $plugin_name activé"
    else
        print_warning "Plugin existe déjà ou erreur"
    fi
}

# Vérifier si Kong est démarré
if ! wait_for_kong; then
    print_error "Impossible de se connecter à Kong. Assurez-vous qu'il est démarré :"
    echo "  docker-compose -f docker-compose.kong.yml up -d"
    exit 1
fi

echo ""
print_info "=== CONFIGURATION DES SERVICES ==="

# Configuration des microservices
configure_service "produit-service" "host.docker.internal" "3001" "/api/produits"
configure_service "magasin-service" "host.docker.internal" "3002" "/api/magasins"
configure_service "utilisateur-service" "host.docker.internal" "3003" "/api/utilisateurs"
configure_service "vente-service" "host.docker.internal" "3004" "/api/ventes"

# Service pour les health checks
configure_service "health-check" "host.docker.internal" "3001" "/health"

echo ""
print_info "=== ACTIVATION DES PLUGINS ==="

# 1. Plugin de logging centralisé
enable_plugin "file-log" "" "config.path=/tmp/access.log"
print_success "Logging centralisé activé"

# 2. Plugin d'ajout d'en-têtes
enable_plugin "request-transformer" "" "config.add.headers=X-Gateway-Version:1.0,X-Request-ID:\$request_id"
print_success "Ajout d'en-têtes activé"

# 3. Plugin de clés API (exemple sur produit-service)
enable_plugin "key-auth" "produit-service" ""
print_success "Authentification par clé API activée sur produit-service"

# 4. Plugin de rate limiting
enable_plugin "rate-limiting" "" "config.minute=100&config.hour=1000"
print_success "Rate limiting activé (100 req/min, 1000 req/h)"

# 5. Plugin CORS
enable_plugin "cors" "" "config.origins=*&config.methods=GET,POST,PUT,DELETE&config.headers=Accept,Accept-Version,Content-Length,Content-MD5,Content-Type,Date,X-Auth-Token,Authorization"
print_success "CORS activé"

echo ""
print_info "=== CRÉATION D'UNE CLÉ API EXEMPLE ==="

# Créer un consumer
curl -i -X POST $KONG_ADMIN_URL/consumers/ \
    --data "username=demo-user" > /dev/null 2>&1

# Créer une clé API pour ce consumer
API_KEY_RESPONSE=$(curl -s -X POST $KONG_ADMIN_URL/consumers/demo-user/key-auth)
API_KEY=$(echo $API_KEY_RESPONSE | grep -o '"key":"[^"]*"' | cut -d'"' -f4)

if [ -n "$API_KEY" ]; then
    print_success "Clé API créée: $API_KEY"
    echo "   Utilisez cette clé avec: curl -H 'apikey: $API_KEY' ..."
else
    print_warning "Erreur lors de la création de la clé API"
fi

echo ""
print_info "=== RÉSUMÉ DE LA CONFIGURATION ==="
echo ""
echo "🌐 Kong API Gateway: $GATEWAY_URL"
echo "⚙️  Kong Admin: $KONG_ADMIN_URL"
echo "🎨 Konga GUI: http://localhost:1337"
echo ""
echo "📋 Routes configurées:"
echo "  GET $GATEWAY_URL/api/produits"
echo "  GET $GATEWAY_URL/api/magasins" 
echo "  GET $GATEWAY_URL/api/utilisateurs"
echo "  GET $GATEWAY_URL/api/ventes"
echo "  GET $GATEWAY_URL/health"
echo ""
echo "🔑 Test avec clé API (produit-service):"
echo "  curl -H 'apikey: $API_KEY' $GATEWAY_URL/api/produits"
echo ""
echo "🔍 Fonctionnalités activées:"
echo "  ✅ Routage dynamique"
echo "  ✅ Ajout d'en-têtes personnalisés" 
echo "  ✅ Logging centralisé"
echo "  ✅ Authentification par clé API"
echo "  ✅ Rate limiting"
echo "  ✅ CORS"
echo ""
print_success "Configuration Kong terminée !"
