#!/bin/bash

echo "🚀 Démarrage Architecture Microservices Conforme"
echo "================================================="

# Arrêter ancienne configuration si elle existe
echo "🛑 Arrêt de l'ancienne configuration..."
docker-compose down --volumes --remove-orphans

# Démarrer nouvelle configuration conforme
echo "✅ Démarrage configuration conforme..."
docker-compose -f docker-compose.microservices-compliant.yml up -d

# Attendre que les services soient prêts
echo "⏳ Attente de la disponibilité des services..."
sleep 30

# Vérifier la santé des services
echo "🔍 Vérification de la santé des services..."
services=("3001" "3004" "3005" "3006" "3007" "3008" "3000")
for port in "${services[@]}"; do
    echo "Vérification service port $port..."
    curl -f http://localhost:$port/health || echo "⚠️ Service port $port non disponible"
done

echo "✅ Architecture Microservices Conforme démarrée!"
echo "📊 Monitoring: http://localhost:3333 (admin/admin)"
echo "📈 Prometheus: http://localhost:9090"
echo "🦍 Kong Gateway: http://localhost:8001"
