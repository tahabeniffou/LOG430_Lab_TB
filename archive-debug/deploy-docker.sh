#!/bin/bash

echo "🚀 Déploiement complet du système POS LOG430 avec Docker"
echo "=================================================="

# Vérifier que Docker est installé et en cours d'exécution
if ! command -v docker &> /dev/null; then
    echo "❌ Docker n'est pas installé"
    exit 1
fi

if ! docker info &> /dev/null; then
    echo "❌ Docker n'est pas en cours d'exécution"
    exit 1
fi

# Nettoyer les conteneurs existants
echo "🧹 Nettoyage des conteneurs existants..."
docker-compose down -v --remove-orphans

# Construire les images
echo "🔨 Construction des images Docker..."
docker-compose build --no-cache

# Démarrer les bases de données en premier
echo "🗄️ Démarrage des bases de données PostgreSQL..."
docker-compose up -d postgres-produit postgres-stock postgres-vente postgres-reporting kong-db

# Attendre que les bases de données soient prêtes
echo "⏳ Attente de la disponibilité des bases de données..."
sleep 30

# Démarrer Kong
echo "🌉 Démarrage de Kong API Gateway..."
docker-compose up -d kong-migrations
sleep 10
docker-compose up -d kong-migrations-up
sleep 10
docker-compose up -d kong

# Attendre que Kong soit prêt
echo "⏳ Attente de Kong..."
sleep 20

# Démarrer les microservices
echo "🔧 Démarrage des microservices..."
docker-compose up -d produit-service-1 produit-service-2
docker-compose up -d stock-service-1 stock-service-2
docker-compose up -d vente-service-1 vente-service-2
docker-compose up -d reporting-service-1 reporting-service-2

# Attendre que les microservices soient prêts
echo "⏳ Attente des microservices..."
sleep 30

# Configurer Kong
echo "⚙️ Configuration de Kong..."
docker-compose up --no-deps kong-config

# Démarrer le monitoring
echo "📊 Démarrage du monitoring..."
docker-compose up -d prometheus grafana

# Démarrer le service legacy
echo "🏛️ Démarrage du service legacy..."
docker-compose up -d legacy-service

echo ""
echo "✅ Déploiement terminé avec succès!"
echo ""
echo "🌐 Services disponibles:"
echo "  • Kong API Gateway: http://localhost:8000"
echo "  • Kong Admin: http://localhost:8001"
echo "  • Kong Manager: http://localhost:8002"
echo "  • Prometheus: http://localhost:9090"
echo "  • Grafana: http://localhost:3001 (admin/admin)"
echo "  • Service Legacy: http://localhost:3000"
echo ""
echo "🔍 Pour vérifier l'état des services:"
echo "  docker-compose ps"
echo ""
echo "📋 Pour voir les logs:"
echo "  docker-compose logs -f [service_name]"
echo ""
echo "🛑 Pour arrêter le système:"
echo "  docker-compose down"
