#!/bin/bash

echo "🛑 === ARRÊT MICROSERVICES (SANS PRODUIT) ==="
echo "Arrêt des microservices non-produit uniquement"
echo ""

# Couleurs
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
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

# Se placer à la racine du projet
cd "$(dirname "$0")/.."

# Services à arrêter (sans produit-service)
services=("magasin-service" "utilisateur-service" "vente-service")

print_step "Arrêt des microservices..."

for service in "${services[@]}"; do
    if [ -f "microservices/logs/$service.pid" ]; then
        pid=$(cat "microservices/logs/$service.pid")
        if kill -0 $pid 2>/dev/null; then
            echo "  Arrêt de $service (PID: $pid)..."
            kill $pid 2>/dev/null
            
            # Attendre que le processus se termine
            for i in {1..10}; do
                if ! kill -0 $pid 2>/dev/null; then
                    break
                fi
                sleep 1
            done
            
            # Forcer l'arrêt si nécessaire
            if kill -0 $pid 2>/dev/null; then
                echo "    Force kill $service..."
                kill -9 $pid 2>/dev/null
            fi
            
            print_success "$service arrêté"
        else
            print_info "$service n'était pas en cours d'exécution"
        fi
        
        # Supprimer le fichier PID
        rm -f "microservices/logs/$service.pid"
    else
        print_info "Pas de PID trouvé pour $service"
    fi
done

echo ""
print_success "Microservices non-produit arrêtés !"
echo ""
print_info "Les instances de load balancing produit restent actives :"
echo "  • Produit Instance 1:  http://localhost:3001/health"
echo "  • Produit Instance 2:  http://localhost:3005/health"
echo "  • Produit Instance 3:  http://localhost:3006/health"
echo "  • Load Balanced API:   http://localhost:8000/api/produits-lb"
echo ""
print_info "Pour arrêter le load balancing :"
echo "  ./scripts/stop-loadbalancing-architecture.sh"
