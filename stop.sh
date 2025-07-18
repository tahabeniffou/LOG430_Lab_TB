#!/bin/bash
# Script d'arrêt du système POS
# Utilisation: ./stop.sh [clean]

set -e

echo "🛑 Arrêt du système POS Microservices..."

# Arrêt des services
docker-compose down

# Nettoyage complet si demandé
if [ "$1" = "clean" ]; then
    echo "🧹 Nettoyage des volumes et images..."
    docker-compose down -v
    docker system prune -f
    echo "✅ Nettoyage terminé"
else
    echo "✅ Services arrêtés"
    echo "💡 Utilisez './stop.sh clean' pour un nettoyage complet"
fi
