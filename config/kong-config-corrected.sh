#!/bin/bash
# Configuration Kong pour le système POS complet
# Création des services et routes pour tous les microservices avec load balancing

echo "🔧 Configuration Kong Gateway pour le système POS..."

# Attendre que Kong soit prêt
until curl -f -s http://kong:8001/status > /dev/null; do
    echo "⏳ Attente de Kong Admin API..."
    sleep 5
done

echo "✅ Kong Admin API accessible"

# =====================================
# SERVICE PRODUIT avec Load Balancing
# =====================================
echo "📦 Configuration service Produit..."

# Créer l'upstream pour load balancing
curl -i -X POST http://kong:8001/upstreams \
    --data "name=produit-upstream"

# Ajouter les targets (instances)
curl -i -X POST http://kong:8001/upstreams/produit-upstream/targets \
    --data "target=produit-service-1:3001" \
    --data "weight=100"

curl -i -X POST http://kong:8001/upstreams/produit-upstream/targets \
    --data "target=produit-service-2:3001" \
    --data "weight=100"

# Créer le service
curl -i -X POST http://kong:8001/services/ \
    --data "name=produit-service" \
    --data "host=produit-upstream"

# Créer la route
curl -i -X POST http://kong:8001/services/produit-service/routes \
    --data "paths[]=/api/produits" \
    --data "strip_path=false"

# =====================================
# SERVICE STOCK avec Load Balancing
# =====================================
echo "📊 Configuration service Stock..."

curl -i -X POST http://kong:8001/upstreams \
    --data "name=stock-upstream"

curl -i -X POST http://kong:8001/upstreams/stock-upstream/targets \
    --data "target=stock-service-1:3002" \
    --data "weight=100"

curl -i -X POST http://kong:8001/upstreams/stock-upstream/targets \
    --data "target=stock-service-2:3002" \
    --data "weight=100"

curl -i -X POST http://kong:8001/services/ \
    --data "name=stock-service" \
    --data "host=stock-upstream"

curl -i -X POST http://kong:8001/services/stock-service/routes \
    --data "paths[]=/api/stocks" \
    --data "strip_path=false"

# =====================================
# SERVICE VENTE avec Load Balancing
# =====================================
echo "💰 Configuration service Vente..."

curl -i -X POST http://kong:8001/upstreams \
    --data "name=vente-upstream"

curl -i -X POST http://kong:8001/upstreams/vente-upstream/targets \
    --data "target=vente-service-1:3003" \
    --data "weight=100"

curl -i -X POST http://kong:8001/upstreams/vente-upstream/targets \
    --data "target=vente-service-2:3003" \
    --data "weight=100"

curl -i -X POST http://kong:8001/services/ \
    --data "name=vente-service" \
    --data "host=vente-upstream"

curl -i -X POST http://kong:8001/services/vente-service/routes \
    --data "paths[]=/api/ventes" \
    --data "strip_path=false"

# =====================================
# SERVICE REPORTING avec Load Balancing
# =====================================
echo "📈 Configuration service Reporting..."

curl -i -X POST http://kong:8001/upstreams \
    --data "name=reporting-upstream"

curl -i -X POST http://kong:8001/upstreams/reporting-upstream/targets \
    --data "target=reporting-service-1:3004" \
    --data "weight=100"

curl -i -X POST http://kong:8001/upstreams/reporting-upstream/targets \
    --data "target=reporting-service-2:3004" \
    --data "weight=100"

curl -i -X POST http://kong:8001/services/ \
    --data "name=reporting-service" \
    --data "host=reporting-upstream"

curl -i -X POST http://kong:8001/services/reporting-service/routes \
    --data "paths[]=/api/reportings" \
    --data "strip_path=false"

# =====================================
# PLUGINS DE MONITORING
# =====================================
echo "📊 Configuration plugins de monitoring..."

# Plugin Prometheus pour chaque service
for service in produit-service stock-service vente-service reporting-service; do
  curl -i -X POST http://kong:8001/services/$service/plugins \
    --data "name=prometheus"
done

# Rate limiting global
curl -i -X POST http://kong:8001/plugins \
    --data "name=rate-limiting" \
    --data "config.minute=1000" \
    --data "config.hour=10000"

echo "✅ Configuration Kong terminée!"

# Afficher le statut
echo ""
echo "🎯 Services configurés:"
curl -s http://kong:8001/services | grep -o '"name":"[^"]*"' || echo "Erreur lors de la récupération des services"

echo ""
echo "🛣️  Routes configurées:"
curl -s http://kong:8001/routes | grep -o '"name":"[^"]*"' || echo "Erreur lors de la récupération des routes"

echo ""
echo "🔄 Upstreams configurés:"
curl -s http://kong:8001/upstreams | grep -o '"name":"[^"]*"' || echo "Erreur lors de la récupération des upstreams"

echo ""
echo "🚀 Kong Gateway prêt sur:"
echo "   🌐 Proxy: http://localhost:8000"
echo "   ⚙️  Admin: http://localhost:8001"
