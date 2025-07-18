#!/bin/bash
# Script de démarrage rapide du système POS
# Utilisation: ./start.sh [lab6|lab7|unified]

set -e

echo "🚀 Démarrage du système POS Microservices..."

# Configuration par défaut
COMPOSE_FILE="docker-compose.yml"

# Vérifier le paramètre
case "$1" in
  "lab6")
    COMPOSE_FILE="docker-compose.yml"
    echo "📦 Configuration Lab 6 - Saga Orchestrator"
    ;;
  "lab7")
    COMPOSE_FILE="docker-compose-lab7.yml"
    echo "🎭 Configuration Lab 7 - Event-Driven"
    ;;
  "unified")
    COMPOSE_FILE="docker-compose-unified.yml"
    echo "🔗 Configuration Unifiée"
    ;;
  *)
    echo "📦 Configuration par défaut (Lab 6)"
    ;;
esac

# Démarrer les services
echo "🏗️  Construction des images..."
docker-compose -f $COMPOSE_FILE build

echo "🚀 Démarrage des services..."
docker-compose -f $COMPOSE_FILE up -d

echo "⏳ Attente du démarrage des services..."
sleep 10

# Configuration Kong
echo "🦍 Configuration Kong Gateway..."
cd config
bash kong-config.sh
cd ..

echo "✅ Système démarré avec succès!"
echo ""
echo "🌐 Accès aux services:"
echo "  - Kong Gateway: http://localhost:8000"
echo "  - Kong Admin: http://localhost:8001"
echo "  - Grafana: http://localhost:3008 (admin/admin)"
echo "  - Prometheus: http://localhost:9090"
echo "  - RabbitMQ: http://localhost:15672 (admin/admin123)"
echo ""
echo "🧪 Tests disponibles:"
echo "  - npm run test:saga"
echo "  - npm run test:workflow"
echo "  - npm run health"
