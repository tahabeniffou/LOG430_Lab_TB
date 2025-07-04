#!/bin/bash

# Chemin du fichier de config
CONFIG_FILE="config/config.json"

# Helper pour reset Prometheus (attention : supprime l'historique !)
reset_prometheus() {
  echo "Reset des métriques Prometheus..."
  docker-compose stop prometheus
  docker-compose rm -f prometheus
  docker volume rm log430_lab_tb_prometheus_data
  docker-compose up -d prometheus
  sleep 10
}

# Helper pour activer/désactiver le cache dans config.json
set_cache() {
  local enabled=$1
  local type=$2
  jq ".cache.enabled = $enabled | .cache.type = \"$type\"" "$CONFIG_FILE" > "$CONFIG_FILE.tmp" && mv "$CONFIG_FILE.tmp" "$CONFIG_FILE"
  echo "Config cache: enabled=$enabled, type=$type"
}

# Test 1 : API seule, sans cache, sans load balancer
echo "=== TEST 1 : API seule, sans cache, sans load balancer ==="
docker-compose down
set_cache false none
# Démarre uniquement api1, db, redis (redis inutile ici mais requis par docker-compose)
docker-compose up -d api1 db redis
reset_prometheus
sleep 10
k6 run tests/load/loadtest-single-api.js
sleep 30

# Test 2 : Plusieurs API, load balancer, sans cache
echo "=== TEST 2 : Plusieurs API, load balancer, sans cache ==="
docker-compose down
set_cache false none
docker-compose up -d api1 api2 api3 api4 loadbalancer db redis
reset_prometheus
sleep 10
k6 run tests/load/loadtest-multi-api-lb.js
sleep 30

# Test 3 : Plusieurs API, load balancer, cache Redis
echo "=== TEST 3 : Plusieurs API, load balancer, cache Redis ==="
docker-compose down
set_cache true redis
docker-compose up -d api1 api2 api3 api4 loadbalancer db redis
reset_prometheus
sleep 10
k6 run tests/load/loadtest-multi-api-lb-redis.js
sleep 30

echo "Tous les tests sont terminés. Vérifiez vos dashboards Grafana."
