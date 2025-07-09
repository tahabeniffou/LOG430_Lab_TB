#!/bin/bash

# Script de démarrage pour l'architecture hybride
# Système # Vérification des bases de données
echo "🗄️  Vérification des bases de données..."
if docker-compose ps postgres-produit | grep -q "Up"; then
    echo "✅ PostgreSQL (Produits) - OK"
else
    echo "❌ PostgreSQL (Produits) - ERREUR"
    all_healthy=false
fi

if docker-compose ps mysql-main | grep -q "Up"; then
    echo "✅ MySQL (Main) - OK"
else
    echo "❌ MySQL (Main) - ERREUR"
    all_healthy=false
firoservices essentiels avec routeur intelligent

echo "🔀 Démarrage de l'architecture hybride"
echo "======================================"
echo ""
echo "📋 Architecture :"
echo "   🏛️  Système de base (Legacy) - Port 3000"
echo "   🔀 Routeur hybride - Port 9000"
echo "   🛍️  Produit Service (3 instances) - Ports 3001, 3005, 3006"
echo "   💰 Vente Service - Port 3004"
echo "   📦 Stock Service - Port 3007"
echo "   📊 Reporting Service - Port 3008"
echo ""
echo "🎯 Modes d'accès :"
echo "   📺 POS Console: /pos/* -> Système de base + Stock microservice"
echo "   🏢 Maison Mère: /maisonmere/* -> Système de base + Reporting microservice"
echo "   🚀 API v2: /api/v2/* -> Tous les microservices"
echo "   🔄 API v1: /api/v1/* -> Système de base"
echo ""

# Vérification que Docker est en cours d'exécution
if ! docker info > /dev/null 2>&1; then
    echo "❌ Docker n'est pas en cours d'exécution. Démarrez Docker et relancez ce script."
    exit 1
fi

# Nettoyage des anciens conteneurs
echo "🧹 Nettoyage des anciens conteneurs..."
docker-compose down -v 2>/dev/null

# Construction et démarrage des services
echo "🔨 Construction et démarrage de l'architecture hybride..."
docker-compose up -d --build

# Attendre que tous les services soient prêts
echo "⏳ Attente du démarrage des services (45 secondes)..."
sleep 45

# Vérification des services
echo ""
echo "🔍 Vérification des services..."

# Services principaux
services=(
    "legacy-system:3000:Système de Base"
    "hybrid-router:9000:Routeur Hybride"
    "produit-service-1:3001:Produit Service 1"
    "produit-service-2:3005:Produit Service 2" 
    "produit-service-3:3006:Produit Service 3"
    "vente-service:3004:Vente Service"
    "stock-service:3007:Stock Service"
    "reporting-service:3008:Reporting Service"
    "simple-load-balancer:8000:Load Balancer"
)

all_healthy=true

for service in "${services[@]}"; do
    IFS=':' read -r name port description <<< "$service"
    
    if curl -s --max-time 5 http://localhost:$port/health > /dev/null 2>&1; then
        echo "✅ $description ($port) - OK"
    else
        echo "❌ $description ($port) - ERREUR"
        all_healthy=false
    fi
done

echo ""

# Vérification des bases de données
echo "🗄️  Vérification des bases de données..."
if docker-compose -f docker-compose.hybrid.yml ps postgres-produit | grep -q "Up"; then
    echo "✅ PostgreSQL (Produits) - OK"
else
    echo "❌ PostgreSQL (Produits) - ERREUR"
    all_healthy=false
fi

if docker-compose -f docker-compose.hybrid.yml ps mysql-main | grep -q "Up"; then
    echo "✅ MySQL (Main + Legacy) - OK"
else
    echo "❌ MySQL (Main + Legacy) - ERREUR"
    all_healthy=false
fi

echo ""

# Test des routes hybrides
if $all_healthy; then
    echo "🧪 Test du routage hybride..."
    
    # Test POS (devrait aller vers legacy pour produits)
    echo -n "📺 POS Console (produits -> legacy): "
    if curl -s --max-time 5 -H "X-Client-Type: pos" http://localhost:9000/pos/produits > /dev/null 2>&1; then
        echo "✅ OK"
    else
        echo "⚠️  Timeout"
    fi
    
    # Test POS Stock (devrait aller vers microservice)
    echo -n "📺 POS Console (stock -> microservice): "
    if curl -s --max-time 5 -H "X-Client-Type: pos" http://localhost:9000/pos/stock > /dev/null 2>&1; then
        echo "✅ OK"
    else
        echo "⚠️  Timeout"
    fi
    
    # Test Maison Mère (devrait aller vers legacy)
    echo -n "🏢 Maison Mère (produits -> legacy): "
    if curl -s --max-time 5 -H "X-Client-Type: maisonmere" http://localhost:9000/maisonmere/produits > /dev/null 2>&1; then
        echo "✅ OK"
    else
        echo "⚠️  Timeout"
    fi
    
    # Test API v2 (devrait aller vers microservices)
    echo -n "🚀 API v2 (produits -> microservice): "
    if curl -s --max-time 5 http://localhost:9000/api/v2/produits > /dev/null 2>&1; then
        echo "✅ OK"
    else
        echo "⚠️  Timeout"
    fi
    
    # Test API v1 (devrait aller vers legacy)
    echo -n "🔄 API v1 (legacy): "
    if curl -s --max-time 5 http://localhost:9000/api/v1/produits > /dev/null 2>&1; then
        echo "✅ OK"
    else
        echo "⚠️  Timeout"
    fi
fi

echo ""

# Résumé final
if $all_healthy; then
    echo "🎉 Architecture hybride démarrée avec succès !"
    echo ""
    echo "🔗 Points d'accès principaux :"
    echo "   🔀 Routeur Hybride: http://localhost:9000"
    echo "   📋 Info Routage: http://localhost:9000/routing-info"
    echo "   🏛️  Système de Base Direct: http://localhost:3000"
    echo "   ⚖️  Load Balancer: http://localhost:8000"
    echo "   🌉 Kong Gateway: http://localhost:8001"
    echo ""
    echo "📊 Monitoring :"
    echo "   🔍 Prometheus: http://localhost:9090"
    echo "   📈 Grafana: http://localhost:3333 (admin/admin)"
    echo ""
    echo "🎯 Exemples d'utilisation :"
    echo ""
    echo "   📺 Console POS :"
    echo "   curl -H 'X-Client-Type: pos' http://localhost:9000/pos/produits"
    echo "   curl -H 'X-Client-Type: pos' http://localhost:9000/pos/stock"
    echo ""
    echo "   🏢 Console Maison Mère :"
    echo "   curl -H 'X-Client-Type: maisonmere' http://localhost:9000/maisonmere/produits"
    echo "   curl -H 'X-Client-Type: maisonmere' http://localhost:9000/maisonmere/reports"
    echo ""
    echo "   🚀 API Moderne (v2) :"
    echo "   curl http://localhost:9000/api/v2/produits"
    echo "   curl http://localhost:9000/api/v2/ventes"
    echo "   curl http://localhost:9000/api/v2/stocks"
    echo "   curl http://localhost:9000/api/v2/reports"
    echo ""
    echo "   🔄 API Legacy (v1) :"
    echo "   curl http://localhost:9000/api/v1/produits"
    echo ""
    echo "   🎛️  Accès Direct aux Services :"
    echo "   curl http://localhost:8001/direct/produits    # Via Kong"
    echo "   curl http://localhost:8001/direct/stocks      # Via Kong"
    echo "   curl http://localhost:3001/produits           # Direct"
    echo "   curl http://localhost:3007/stocks             # Direct"
    echo ""
else
    echo "⚠️  Certains services ne démarrent pas correctement."
    echo ""
    echo "🔍 Diagnostic :"
    echo "   docker-compose -f docker-compose.hybrid.yml ps"
    echo "   docker-compose -f docker-compose.hybrid.yml logs hybrid-router"
    echo "   docker-compose -f docker-compose.hybrid.yml logs legacy-system"
fi

echo ""
echo "📄 Commandes utiles :"
echo "   🔍 Statut: docker-compose -f docker-compose.hybrid.yml ps"
echo "   📋 Logs: docker-compose -f docker-compose.hybrid.yml logs [service]"
echo "   🛑 Arrêt: docker-compose -f docker-compose.hybrid.yml down"
echo "   🧹 Nettoyage: docker-compose -f docker-compose.hybrid.yml down -v"
echo ""
echo "📖 Consultez README_ARCHITECTURE_HYBRIDE.md pour plus d'informations."
