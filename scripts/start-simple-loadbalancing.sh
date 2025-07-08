#!/bin/bash

echo "🚀 LOAD BALANCING SIMPLE SANS DOCKER"
echo "======================================"
echo ""

# Vérifier que Node.js est installé
if ! command -v node >/dev/null 2>&1; then
    echo "❌ Node.js n'est pas installé"
    exit 1
fi

echo "✅ Node.js détecté: $(node --version)"
echo ""

# Aller dans le répertoire produit-service
cd microservices/produit-service

# Installer les dépendances si nécessaire
if [ ! -d "node_modules" ]; then
    echo "📦 Installation des dépendances..."
    npm install
fi

# Créer le dossier logs
mkdir -p ../logs

echo "🚀 Démarrage des 3 instances..."

# Instance 1 - Port 3001
export PORT=3001
export INSTANCE_ID="produit-instance-1"
export INSTANCE_NAME="Produit Service Instance 1"
export DB_HOST="localhost"
export DB_PORT="5432"
export DB_NAME="produit_service"
export DB_USER="admin"
export DB_PASSWORD="password123"

echo "  🟢 Démarrage Instance 1 (port 3001)..."
nohup node server.js > ../logs/instance-1.log 2>&1 &
echo $! > ../logs/instance-1.pid
echo "     PID: $(cat ../logs/instance-1.pid)"

sleep 2

# Instance 2 - Port 3005
export PORT=3005
export INSTANCE_ID="produit-instance-2"
export INSTANCE_NAME="Produit Service Instance 2"

echo "  🟡 Démarrage Instance 2 (port 3005)..."
nohup node server.js > ../logs/instance-2.log 2>&1 &
echo $! > ../logs/instance-2.pid
echo "     PID: $(cat ../logs/instance-2.pid)"

sleep 2

# Instance 3 - Port 3006
export PORT=3006
export INSTANCE_ID="produit-instance-3"
export INSTANCE_NAME="Produit Service Instance 3"

echo "  🔵 Démarrage Instance 3 (port 3006)..."
nohup node server.js > ../logs/instance-3.log 2>&1 &
echo $! > ../logs/instance-3.pid
echo "     PID: $(cat ../logs/instance-3.pid)"

sleep 3

echo ""
echo "🔍 Vérification des instances..."

# Tester chaque instance
for port in 3001 3005 3006; do
    response=$(curl -s http://localhost:$port/health 2>/dev/null || echo "ERREUR")
    if echo "$response" | grep -q "healthy"; then
        instance_id=$(echo "$response" | grep -o '"instanceId":"[^"]*"' | cut -d'"' -f4)
        echo "  ✅ Port $port: $instance_id"
    else
        echo "  ❌ Port $port: Non accessible"
    fi
done

echo ""
echo "📊 SIMULATION LOAD BALANCING SIMPLE"
echo "=================================="

# Simulation d'un load balancer simple avec round-robin
echo "Test de distribution round-robin (9 requêtes):"

ports=(3001 3005 3006)
for i in {1..9}; do
    port_index=$((($i - 1) % 3))
    port=${ports[$port_index]}
    
    response=$(curl -s http://localhost:$port/health 2>/dev/null || echo "ERREUR")
    if echo "$response" | grep -q "healthy"; then
        instance_id=$(echo "$response" | grep -o '"instanceId":"[^"]*"' | cut -d'"' -f4)
        echo "  Requête $i → Port $port: $instance_id"
    else
        echo "  Requête $i → Port $port: ERREUR"
    fi
done

echo ""
echo "🎯 SERVICES DISPONIBLES:"
echo "========================"
echo "  • Instance 1: http://localhost:3001/health"
echo "  • Instance 2: http://localhost:3005/health"
echo "  • Instance 3: http://localhost:3006/health"
echo ""
echo "📝 LOGS:"
echo "========"
echo "  • tail -f microservices/logs/instance-1.log"
echo "  • tail -f microservices/logs/instance-2.log"  
echo "  • tail -f microservices/logs/instance-3.log"
echo ""
echo "🛑 ARRÊT:"
echo "========"
echo "  • ./scripts/stop-simple-loadbalancing.sh"
echo ""
echo "✅ Load balancing simple démarré !"

cd ../..
