#!/bin/bash

echo "🧪 Test minimal Docker et Kong"

# Test Docker
echo "1. Test Docker..."
docker --version

# Test réseau
echo "2. Création réseau..."
docker network create test-network 2>/dev/null && echo "OK" || echo "Déjà existant"

# Test Kong simple
echo "3. Test Kong minimal..."
docker run -d --name kong-test \
  --network test-network \
  -p 8000:8000 \
  -p 8001:8001 \
  -e KONG_DATABASE=off \
  -e KONG_DECLARATIVE_CONFIG=/kong/declarative/kong.yml \
  -e KONG_PROXY_ACCESS_LOG=/dev/stdout \
  -e KONG_ADMIN_ACCESS_LOG=/dev/stdout \
  -e KONG_PROXY_ERROR_LOG=/dev/stderr \
  -e KONG_ADMIN_ERROR_LOG=/dev/stderr \
  -e KONG_ADMIN_LISTEN=0.0.0.0:8001 \
  kong:3.4

echo "4. Vérification..."
sleep 10
docker ps | grep kong-test

echo "5. Test Kong Admin..."
curl -s http://localhost:8001/ | grep -o '"version":"[^"]*"' || echo "Kong non accessible"

echo "6. Nettoyage..."
docker stop kong-test 2>/dev/null
docker rm kong-test 2>/dev/null
docker network rm test-network 2>/dev/null

echo "Test terminé."
