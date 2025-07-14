#!/bin/bash
# Configuration Kong pour le déploiement

echo "🔧 Configuration Kong en cours..."

# Attendre que Kong soit prêt
until curl -f -s http://kong:8001/status > /dev/null; do
    echo "⏳ Attente de Kong..."
    sleep 5
done

echo "✅ Kong est prêt, configuration des services..."

# Configuration Service Produit
curl -i -X POST http://kong:8001/services/ \
    --data "name=produit-service" \
    --data "url=http://produit-service-1:3001"

curl -i -X POST http://kong:8001/services/produit-service/routes \
    --data "paths[]=/api/v2/produits"

# Configuration Service Stock  
curl -i -X POST http://kong:8001/services/ \
    --data "name=stock-service" \
    --data "url=http://stock-service-1:3002"

curl -i -X POST http://kong:8001/services/stock-service/routes \
    --data "paths[]=/api/v2/stocks"

# Configuration Service Vente
curl -i -X POST http://kong:8001/services/ \
    --data "name=vente-service" \
    --data "url=http://vente-service-1:3004"

curl -i -X POST http://kong:8001/services/vente-service/routes \
    --data "paths[]=/api/v2/ventes"

# Configuration Service Reporting
curl -i -X POST http://kong:8001/services/ \
    --data "name=reporting-service" \
    --data "url=http://reporting-service-1:3005"

curl -i -X POST http://kong:8001/services/reporting-service/routes \
    --data "paths[]=/api/v2/reports"

# Configuration Load Balancing
echo "⚖️ Configuration du load balancing..."

# Upstream Produit
curl -i -X POST http://kong:8001/upstreams \
    --data "name=produit-upstream" \
    --data "algorithm=round-robin"

curl -i -X POST http://kong:8001/upstreams/produit-upstream/targets \
    --data "target=produit-service-1:3001" \
    --data "weight=100"

curl -i -X POST http://kong:8001/upstreams/produit-upstream/targets \
    --data "target=produit-service-2:3011" \
    --data "weight=100"

# Upstream Stock
curl -i -X POST http://kong:8001/upstreams \
    --data "name=stock-upstream" \
    --data "algorithm=round-robin"

curl -i -X POST http://kong:8001/upstreams/stock-upstream/targets \
    --data "target=stock-service-1:3002" \
    --data "weight=100"

curl -i -X POST http://kong:8001/upstreams/stock-upstream/targets \
    --data "target=stock-service-2:3012" \
    --data "weight=100"

# Upstream Vente
curl -i -X POST http://kong:8001/upstreams \
    --data "name=vente-upstream" \
    --data "algorithm=round-robin"

curl -i -X POST http://kong:8001/upstreams/vente-upstream/targets \
    --data "target=vente-service-1:3004" \
    --data "weight=100"

curl -i -X POST http://kong:8001/upstreams/vente-upstream/targets \
    --data "target=vente-service-2:3014" \
    --data "weight=100"

# Upstream Reporting
curl -i -X POST http://kong:8001/upstreams \
    --data "name=reporting-upstream" \
    --data "algorithm=round-robin"

curl -i -X POST http://kong:8001/upstreams/reporting-upstream/targets \
    --data "target=reporting-service-1:3005" \
    --data "weight=100"

curl -i -X POST http://kong:8001/upstreams/reporting-upstream/targets \
    --data "target=reporting-service-2:3015" \
    --data "weight=100"

# Plugins CORS
echo "🌐 Configuration CORS..."
curl -i -X POST http://kong:8001/plugins \
    --data "name=cors" \
    --data "config.origins=*" \
    --data "config.methods=GET,POST,PUT,DELETE,OPTIONS" \
    --data "config.headers=Accept,Accept-Version,Content-Length,Content-MD5,Content-Type,Date,X-Auth-Token,Authorization,X-Client,X-Session"

# Plugin Rate Limiting
echo "🚦 Configuration Rate Limiting..."
curl -i -X POST http://kong:8001/plugins \
    --data "name=rate-limiting" \
    --data "config.minute=1000" \
    --data "config.hour=10000"

# Plugin Prometheus
echo "📊 Configuration Prometheus..."
curl -i -X POST http://kong:8001/plugins \
    --data "name=prometheus"

echo "✅ Configuration Kong terminée !"
echo "🚀 Services disponibles sur http://localhost:8000"
