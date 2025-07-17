#!/bin/sh

echo "🚀 Starting LOG430 POS Service: $SERVICE_NAME on port $PORT"

# Attendre que les bases de données soient prêtes
if [ "$SERVICE_NAME" != "legacy" ]; then
  echo "⏳ Waiting for database connection..."
  while ! nc -z postgres-$SERVICE_NAME 5432; do
    sleep 1
  done
  echo "✅ Database ready!"
fi

# Démarrer le service approprié
case $SERVICE_NAME in
  "produit")
    PORT=3001 node src/api/servers.js
    ;;
  "stock")
    PORT=3002 node src/api/servers.js
    ;;
  "vente")
    PORT=3003 node src/api/servers.js
    ;;
  "reporting")
    PORT=3004 node src/api/servers.js
    ;;
  "legacy")
    echo "🏛️ Starting legacy console service"
    PORT=3000 node src/appConsole.js
    ;;
  *)
    echo "❌ Unknown service: $SERVICE_NAME"
    exit 1
    ;;
esac
