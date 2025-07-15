#!/bin/bash

# Script de démarrage pour tester le Saga Orchestrator
# Usage: ./start-saga-test.sh

echo "🚀 Démarrage du test du Saga Orchestrator"
echo "=========================================="

# Vérifier si Docker est disponible
if ! command -v docker &> /dev/null; then
    echo "❌ Docker n'est pas installé ou disponible"
    exit 1
fi

# Vérifier si Docker Compose est disponible
if ! command -v docker-compose &> /dev/null; then
    echo "❌ Docker Compose n'est pas installé ou disponible"
    exit 1
fi

echo "📦 Construction et démarrage des services..."

# Construire et démarrer les services essentiels pour le test
docker-compose up -d \
    postgres-stock \
    postgres-compte \
    postgres-vente \
    postgres-produit \
    kong-database \
    kong-migrations \
    kong \
    produit-service-1 \
    stock-service-1 \
    vente-service-1 \
    compte-service-1 \
    saga-orchestrator-service

# Attendre que les services soient prêts
echo "⏳ Attente du démarrage des services..."
sleep 30

# Vérifier la santé des services
echo "🔍 Vérification de la santé des services..."

services=("kong:8000" "produit-service-1:3001" "stock-service-1:3002" "vente-service-1:3003" "compte-service-1:3005" "saga-orchestrator-service:8010")

for service in "${services[@]}"; do
    service_name=$(echo $service | cut -d':' -f1)
    port=$(echo $service | cut -d':' -f2)
    
    if docker-compose ps | grep -q "$service_name.*Up"; then
        echo "✅ $service_name: En cours d'exécution"
    else
        echo "❌ $service_name: Problème détecté"
    fi
done

echo ""
echo "🧪 Services prêts pour les tests Saga:"
echo "  - Saga Orchestrator: http://localhost:8010"
echo "  - Kong Gateway: http://localhost:8000"
echo "  - Health checks disponibles sur /health"
echo ""
echo "📝 Pour tester le Saga:"
echo "  node test-saga.js"
echo ""
echo "📊 Pour voir les logs du Saga Orchestrator:"
echo "  docker-compose logs -f saga-orchestrator-service"
echo ""
echo "🛑 Pour arrêter les services:"
echo "  docker-compose down"

# Optionnel: Lancer automatiquement le test
if [ "$1" = "--test" ]; then
    echo "🧪 Lancement automatique des tests..."
    sleep 10
    node test-saga.js
fi
