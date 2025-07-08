#!/bin/bash

echo "🚀 === DÉMARRAGE LOAD BALANCING COMPLET ==="
echo ""

# Couleurs
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
PURPLE='\033[0;35m'
NC='\033[0m'

print_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

print_step() {
    echo -e "${YELLOW}🔄 $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

print_highlight() {
    echo -e "${PURPLE}🎯 $1${NC}"
}

# Fonction pour vérifier qu'un service répond
check_service() {
    local url=$1
    local name=$2
    local max_attempts=10
    
    for i in $(seq 1 $max_attempts); do
        if curl -s "$url" > /dev/null 2>&1; then
            return 0
        fi
        sleep 1
    done
    return 1
}

# Arrêter les anciennes instances
print_step "Nettoyage des anciennes instances..."
./scripts/stop-simple-loadbalancing.sh 2>/dev/null || true

# Installer les dépendances
print_step "Installation des dépendances..."
npm install --silent

# Démarrer les 3 instances du produit-service
print_step "Démarrage des instances du produit-service..."
./scripts/start-simple-loadbalancing.sh

# Vérifier que les instances sont opérationnelles
print_step "Vérification des instances..."
sleep 5

instances_ok=0
for port in 3001 3005 3006; do
    if check_service "http://localhost:$port/health" "Instance $port"; then
        print_success "Instance port $port: Opérationnelle"
        instances_ok=$((instances_ok + 1))
    else
        print_error "Instance port $port: Non accessible"
    fi
done

if [ $instances_ok -lt 3 ]; then
    print_error "Seulement $instances_ok/3 instances démarrées"
    echo ""
    print_info "Vérification des logs..."
    echo "  • tail -f microservices/logs/instance-1.log"
    echo "  • tail -f microservices/logs/instance-2.log"
    echo "  • tail -f microservices/logs/instance-3.log"
    exit 1
fi

# Démarrer le load balancer
print_step "Démarrage du Load Balancer..."
nohup node simple-load-balancer.js > load-balancer.log 2>&1 &
echo $! > load-balancer.pid
sleep 3

# Vérifier le load balancer
if check_service "http://localhost:8000/lb-status" "Load Balancer"; then
    print_success "Load Balancer opérationnel"
else
    print_error "Load Balancer non accessible"
    echo "Logs du load balancer:"
    tail -10 load-balancer.log
    exit 1
fi

# Test de distribution
print_step "Test de distribution round-robin..."
echo ""

for i in {1..6}; do
    response=$(curl -s http://localhost:8000/health-lb 2>/dev/null)
    if echo "$response" | grep -q "healthy"; then
        instance_id=$(echo "$response" | grep -o '"instanceId":"[^"]*"' | cut -d'"' -f4)
        target=$(curl -s -I http://localhost:8000/health-lb 2>/dev/null | grep -i "X-Target-Instance" | cut -d' ' -f2 | tr -d '\r')
        echo "  Requête $i: $instance_id via $target"
    else
        echo "  Requête $i: ERREUR"
    fi
    sleep 0.5
done

echo ""
print_highlight "🎉 LOAD BALANCING OPÉRATIONNEL !"
echo ""
print_info "Services disponibles :"
echo "  🔄 Load Balancer:      http://localhost:8000"
echo "  📊 Status LB:          http://localhost:8000/lb-status"
echo "  🔍 Health LB:          http://localhost:8000/health-lb"
echo "  📦 API LB:             http://localhost:8000/api/produits-lb"
echo ""
print_info "Instances directes :"
echo "  🟢 Instance 1:         http://localhost:3001/health"
echo "  🟡 Instance 2:         http://localhost:3005/health"
echo "  🔵 Instance 3:         http://localhost:3006/health"
echo ""
print_info "Logs :"
echo "  • Load Balancer:       tail -f load-balancer.log"
echo "  • Instance 1:          tail -f microservices/logs/instance-1.log"
echo "  • Instance 2:          tail -f microservices/logs/instance-2.log"
echo "  • Instance 3:          tail -f microservices/logs/instance-3.log"
echo ""
print_info "Tests disponibles :"
echo "  • Statut LB:           curl http://localhost:8000/lb-status"
echo "  • Test round-robin:    ./scripts/test-simple-loadbalancing.sh"
echo "  • Surveillance:        watch curl -s http://localhost:8000/health-lb"
echo ""
print_info "Arrêt :"
echo "  • ./scripts/stop-complete-loadbalancing.sh"
echo ""
print_success "✨ Démarrage terminé avec succès !"
