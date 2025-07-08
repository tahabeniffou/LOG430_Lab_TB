#!/bin/bash

echo "🚀 === DÉMARRAGE MICROSERVICES (SANS PRODUIT) ==="
echo "Pour usage avec Load Balancing - Les instances produit sont gérées séparément"
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

# Créer le dossier logs
mkdir -p microservices/logs

print_step "Installation des dépendances si nécessaire..."

# Services à démarrer (sans produit-service)
services=("magasin-service" "utilisateur-service" "vente-service")

for service in "${services[@]}"; do
    if [ -d "microservices/$service" ]; then
        print_step "Préparation de $service..."
        cd "microservices/$service"
        
        # Vérifier si les dépendances sont installées
        if [ ! -d "node_modules" ]; then
            echo "  Installation des dépendances pour $service..."
            npm install --silent
        fi
        
        cd - > /dev/null
    fi
done

print_step "Démarrage des microservices..."

for service in "${services[@]}"; do
    if [ -d "microservices/$service" ]; then
        echo "  Démarrage de $service..."
        cd "microservices/$service"
        
        # Arrêter l'ancienne instance si elle existe
        if [ -f "../logs/$service.pid" ]; then
            old_pid=$(cat "../logs/$service.pid")
            if kill -0 $old_pid 2>/dev/null; then
                echo "    Arrêt de l'ancienne instance (PID: $old_pid)"
                kill $old_pid 2>/dev/null
                sleep 2
            fi
        fi
        
        # Démarrer le nouveau processus
        nohup npm start > "../logs/$service.log" 2>&1 &
        new_pid=$!
        echo $new_pid > "../logs/$service.pid"
        
        print_success "$service started (PID: $new_pid)"
        cd - > /dev/null
        sleep 1
    fi
done

echo ""
print_success "Microservices non-produit démarrés !"
echo ""
print_info "Services disponibles :"
echo "  • Magasin Service:     http://localhost:3002/health"  
echo "  • Utilisateur Service: http://localhost:3003/health"
echo "  • Vente Service:       http://localhost:3004/health"
echo ""
print_info "Services Load Balancing (gérés séparément) :"
echo "  • Produit Instance 1:  http://localhost:3001/health"
echo "  • Produit Instance 2:  http://localhost:3005/health"
echo "  • Produit Instance 3:  http://localhost:3006/health"
echo "  • Load Balanced API:   http://localhost:8000/api/produits-lb"
echo ""
print_info "Voir les logs :"
for service in "${services[@]}"; do
    echo "  • tail -f microservices/logs/$service.log"
done
echo ""
print_info "Pour arrêter : ./scripts/stop-other-microservices.sh"
