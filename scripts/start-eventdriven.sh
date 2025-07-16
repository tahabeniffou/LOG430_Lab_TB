#!/bin/bash

# Script de démarrage Architecture Événementielle - LAB 7
# LOG430 - Architecture Logicielle

echo "🚀 Démarrage Architecture Événementielle LAB 7"
echo "=============================================="

# Vérification Docker
if ! command -v docker &> /dev/null; then
    echo "❌ Docker n'est pas installé"
    exit 1
fi

if ! command -v docker-compose &> /dev/null; then
    echo "❌ Docker Compose n'est pas installé"
    exit 1
fi

# Création du réseau Docker si nécessaire
echo "🔗 Création du réseau Docker..."
docker network create pos-network 2>/dev/null || echo "   ℹ️  Réseau pos-network existe déjà"

# Démarrage de l'infrastructure
echo ""
echo "🏗️ Démarrage de l'infrastructure événementielle..."
echo "   📡 RabbitMQ Message Broker"
echo "   🗄️ Event Store PostgreSQL"
echo "   📊 Bases de données des services"

docker-compose -f docker-compose-eventdriven.yml up -d \
    rabbitmq \
    postgres-eventstore \
    postgres-reclamation \
    postgres-audit \
    postgres-analytics

echo ""
echo "⏳ Attente de l'initialisation des services (30 secondes)..."
sleep 30

# Vérification RabbitMQ
echo ""
echo "🔍 Vérification RabbitMQ..."
if curl -s http://localhost:15672 > /dev/null; then
    echo "   ✅ RabbitMQ Management accessible"
    echo "   🌐 URL: http://localhost:15672"
    echo "   🔑 Credentials: admin / admin123"
else
    echo "   ⚠️  RabbitMQ pas encore prêt"
fi

# Vérification Event Store
echo ""
echo "🔍 Vérification Event Store..."
if docker exec postgres-eventstore pg_isready -U eventstore_user > /dev/null 2>&1; then
    echo "   ✅ Event Store PostgreSQL opérationnel"
else
    echo "   ⚠️  Event Store pas encore prêt"
fi

echo ""
echo "📋 Instructions de démarrage des services:"
echo ""
echo "1️⃣ Service Réclamations (Producteur d'événements):"
echo "   cd microservices/reclamation-service"
echo "   npm install && npm start"
echo "   🌐 http://localhost:8011"
echo ""

echo "2️⃣ Service Notifications (Consommateur):"
echo "   cd microservices/notification-service"
echo "   npm install && npm start"
echo "   🌐 http://localhost:8012"
echo ""

echo "3️⃣ Service Audit (Consommateur):"
echo "   cd microservices/audit-service"
echo "   npm install && npm start"
echo "   🌐 http://localhost:8013"
echo ""

echo "4️⃣ Service Analytics (CQRS Read Models):"
echo "   cd microservices/analytics-service"
echo "   npm install && npm start"
echo "   🌐 http://localhost:8014"
echo ""

echo "🧪 Tests rapides:"
echo "   node scripts/tests/test-eventdriven-architecture.js"
echo "   node scripts/eventdriven-full-demo.js"
echo ""

echo "📊 Monitoring:"
echo "   🐰 RabbitMQ: http://localhost:15672"
echo "   📈 Métriques: http://localhost:8011/metrics"
echo ""

echo "✅ Infrastructure événementielle démarrée !"
echo "Suivez les instructions ci-dessus pour démarrer les services."
