#!/bin/bash

# Script de démarrage pour l'architecture microservices
# LOG430 Lab - Système de Gestion de Magasin

echo "🏪 === DÉMARRAGE ARCHITECTURE MICROSERVICES ==="
echo ""

# Vérification des prérequis
echo "🔍 Vérification des prérequis..."
if ! command -v docker &> /dev/null; then
    echo "❌ Docker n'est pas installé"
    exit 1
fi

if ! command -v docker-compose &> /dev/null; then
    echo "❌ Docker Compose n'est pas installé"
    exit 1
fi

echo "✅ Docker et Docker Compose détectés"
echo ""

# Nettoyage des conteneurs existants (optionnel)
echo "🧹 Nettoyage des conteneurs existants..."
docker-compose -f docker-compose.microservices.yml down 2>/dev/null || true
echo ""

# Construction et démarrage des services
echo "🚀 Construction et démarrage des microservices..."
echo "   Cela peut prendre quelques minutes la première fois..."
docker-compose -f docker-compose.microservices.yml up --build -d

# Attendre que les services soient prêts
echo ""
echo "⏳ Attente du démarrage des services..."
sleep 10

# Vérification de la santé des services
echo ""
echo "🏥 Vérification de la santé des services..."

services=(
    "product-management-service:3001"
    "sales-service:3002"
    "inventory-service:3003"
    "reporting-service:3004"
    "customer-account-service:3005"
    "shopping-cart-service:3006"
    "order-validation-service:3007"
)

for service in "${services[@]}"; do
    service_name=$(echo $service | cut -d: -f1)
    port=$(echo $service | cut -d: -f2)
    
    echo -n "   Vérification $service_name... "
    if curl -s http://localhost:$port/health > /dev/null 2>&1; then
        echo "✅ OK"
    else
        echo "❌ Erreur"
    fi
done

echo ""
echo "🌐 Vérification de l'API Gateway..."
if curl -s http://localhost:8080/health > /dev/null 2>&1; then
    echo "   ✅ API Gateway OK"
else
    echo "   ❌ API Gateway Erreur"
fi

echo ""
echo "📊 Vérification du monitoring..."
if curl -s http://localhost:9090 > /dev/null 2>&1; then
    echo "   ✅ Prometheus OK"
else
    echo "   ❌ Prometheus Erreur"
fi

if curl -s http://localhost:3030 > /dev/null 2>&1; then
    echo "   ✅ Grafana OK"
else
    echo "   ❌ Grafana Erreur"
fi

echo ""
echo "🎉 === ARCHITECTURE MICROSERVICES DÉMARRÉE ==="
echo ""
echo "📋 Services disponibles:"
echo ""
echo "� Product Management Service:   http://localhost:3001"
echo "�🛒 Sales Service:               http://localhost:3002"
echo "📦 Inventory Service:           http://localhost:3003"
echo "📊 Reporting Service:           http://localhost:3004"
echo "👥 Customer Account Service:    http://localhost:3005"
echo "🛍️ Shopping Cart Service:       http://localhost:3006"
echo "✅ Order Validation Service:    http://localhost:3007"
echo ""
echo "🌐 API Gateway:                 http://localhost:8080"
echo "📄 Documentation API:           http://localhost:8080/docs"
echo ""
echo "📊 Monitoring:"
echo "   Prometheus:                 http://localhost:9090"
echo "   Grafana:                   http://localhost:3030 (admin/admin)"
echo ""
echo "💡 Tests rapides:"
echo "   curl http://localhost:8080/health"
echo "   curl http://localhost:8080/api/products"
echo "   curl http://localhost:8080/api/sales/transactions"
echo "   curl http://localhost:8080/api/inventory/central/stock"
echo "   curl http://localhost:8080/api/reports/dashboard"
echo ""
echo "🛑 Pour arrêter: docker-compose -f docker-compose.microservices.yml down"
echo ""
