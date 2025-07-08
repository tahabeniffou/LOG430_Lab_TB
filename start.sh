#!/bin/bash

# Script de démarrage simplifié - Architecture Hybride
# LOG430 Lab TB

echo "🚀 DÉMARRAGE ARCHITECTURE HYBRIDE"
echo "================================="

# Nettoyage des anciens conteneurs
echo "🧹 Nettoyage des anciens conteneurs..."
docker-compose down -v 2>/dev/null || true

# Construction et démarrage des services
echo "🔨 Construction et démarrage de l'architecture hybride..."
docker-compose up -d --build

# Attendre que tous les services soient prêts
echo "⏳ Attente du démarrage des services (30 secondes)..."
sleep 30

# Vérification des services
echo ""
echo "🔍 Vérification des services..."

# Services principaux à vérifier
services=(
    "hybrid-router:9000:Routeur Hybride"
    "legacy-system:3000:Système de Base"
    "produit-service-1:3001:Produit Service"
    "vente-service:3004:Vente Service" 
    "stock-service:3007:Stock Service"
    "reporting-service:3008:Reporting Service"
    "load-balancer:8000:Load Balancer"
)

all_healthy=true

for service in "${services[@]}"; do
    IFS=':' read -r name port description <<< "$service"
    
    if curl -s --max-time 5 http://localhost:$port/health >/dev/null 2>&1 || \
       curl -s --max-time 5 http://localhost:$port >/dev/null 2>&1; then
        echo "✅ $description (Port $port) - OK"
    else
        echo "❌ $description (Port $port) - ERREUR"
        all_healthy=false
    fi
done

echo ""
echo "🗄️  Vérification des bases de données..."

# Vérifier PostgreSQL
if docker-compose ps postgres-produit | grep -q "Up"; then
    echo "✅ PostgreSQL (Produits) - OK"
else
    echo "❌ PostgreSQL (Produits) - ERREUR" 
    all_healthy=false
fi

# Vérifier MySQL
if docker-compose ps mysql-main | grep -q "Up"; then
    echo "✅ MySQL (Principal) - OK"
else
    echo "❌ MySQL (Principal) - ERREUR"
    all_healthy=false
fi

# Vérifier Redis
if docker-compose ps redis | grep -q "Up"; then
    echo "✅ Redis (Cache) - OK"
else
    echo "❌ Redis (Cache) - ERREUR"
    all_healthy=false
fi

echo ""
echo "📊 Vérification du monitoring..."

# Vérifier Prometheus
if curl -s http://localhost:9090/-/ready >/dev/null 2>&1; then
    echo "✅ Prometheus - OK"
else
    echo "⚠️  Prometheus - En cours de démarrage"
fi

# Vérifier Grafana
if curl -s http://localhost:3333/api/health >/dev/null 2>&1; then
    echo "✅ Grafana - OK"
else
    echo "⚠️  Grafana - En cours de démarrage"
fi

echo ""
echo "🌐 POINTS D'ACCÈS"
echo "================="
echo "• Routeur Hybride    : http://localhost:9000"
echo "• Système de Base    : http://localhost:3000" 
echo "• Load Balancer      : http://localhost:8000"
echo "• Kong Gateway       : http://localhost:8001"
echo "• Prometheus         : http://localhost:9090"
echo "• Grafana           : http://localhost:3333 (admin/admin)"

echo ""
echo "📋 EXEMPLES D'UTILISATION"
echo "========================"
echo ""
echo "Console POS (utilise principalement Legacy + Stock microservice):"
echo "curl -H 'X-Client-Type: pos' http://localhost:9000/pos/produits"
echo "curl -H 'X-Client-Type: pos' http://localhost:9000/pos/stock"
echo ""
echo "Console Maison Mère (utilise principalement Legacy + Reporting):"
echo "curl -H 'X-Client-Type: maisonmere' http://localhost:9000/maisonmere/produits"
echo "curl -H 'X-Client-Type: maisonmere' http://localhost:9000/maisonmere/reports"
echo ""
echo "API Moderne (utilise tous les microservices):"
echo "curl http://localhost:9000/api/v2/produits"
echo "curl http://localhost:9000/api/v2/stocks"
echo "curl http://localhost:9000/api/v2/reports"

echo ""
if [ "$all_healthy" = true ]; then
    echo "🎉 ARCHITECTURE HYBRIDE DÉMARRÉE AVEC SUCCÈS !"
    echo "✅ Tous les services sont opérationnels"
else
    echo "⚠️  ARCHITECTURE PARTIELLEMENT DÉMARRÉE"
    echo "🔧 Certains services nécessitent une vérification"
    echo ""
    echo "Pour voir les logs d'un service:"
    echo "docker-compose logs [nom-du-service]"
fi

echo ""
echo "🛑 Pour arrêter l'architecture:"
echo "docker-compose down"
