#!/bin/bash

# =========================================
# SCRIPT DE DÉPLOIEMENT VM - LOG430 LAB TB
# =========================================

set -e  # Arrêter en cas d'erreur

echo "🚀 DÉPLOIEMENT LOG430 LAB TB SUR VM"
echo "==================================="

# Configuration
PROJECT_DIR="/opt/log430-lab-tb"
SERVICE_USER="log430"
DOCKER_COMPOSE_VERSION="2.21.0"

# Couleurs pour les logs
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# 1. Vérification système
check_system() {
    log_info "Vérification du système..."
    
    # Vérifier OS
    if ! grep -q "Ubuntu\|Debian\|CentOS\|Red Hat\|Rocky" /etc/os-release; then
        log_warning "OS non testé. Continuer quand même? (y/N)"
        read -r response
        if [[ ! "$response" =~ ^[Yy]$ ]]; then
            exit 1
        fi
    fi
    
    # Vérifier ressources
    TOTAL_RAM=$(free -m | awk 'NR==2{printf "%.0f", $2/1024}')
    if [ "$TOTAL_RAM" -lt 4 ]; then
        log_warning "RAM insuffisante ($TOTAL_RAM GB). Minimum recommandé: 4GB"
    fi
    
    log_success "Système vérifié"
}

# 2. Installation des dépendances
install_dependencies() {
    log_info "Installation des dépendances..."
    
    # Mise à jour système
    if command -v apt-get >/dev/null 2>&1; then
        sudo apt-get update
        sudo apt-get install -y curl wget git unzip software-properties-common
    elif command -v yum >/dev/null 2>&1; then
        sudo yum update -y
        sudo yum install -y curl wget git unzip epel-release
    fi
    
    # Installation Node.js 18+
    if ! command -v node >/dev/null 2>&1; then
        log_info "Installation de Node.js..."
        curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
        sudo apt-get install -y nodejs
    fi
    
    # Installation Docker
    if ! command -v docker >/dev/null 2>&1; then
        log_info "Installation de Docker..."
        curl -fsSL https://get.docker.com -o get-docker.sh
        sudo sh get-docker.sh
        sudo usermod -aG docker $USER
        sudo systemctl enable docker
        sudo systemctl start docker
    fi
    
    # Installation Docker Compose
    if ! command -v docker-compose >/dev/null 2>&1; then
        log_info "Installation de Docker Compose..."
        sudo curl -L "https://github.com/docker/compose/releases/download/v${DOCKER_COMPOSE_VERSION}/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
        sudo chmod +x /usr/local/bin/docker-compose
    fi
    
    log_success "Dépendances installées"
}

# 3. Création utilisateur de service
create_service_user() {
    log_info "Création de l'utilisateur de service..."
    
    if ! id "$SERVICE_USER" >/dev/null 2>&1; then
        sudo useradd -r -s /bin/bash -d "$PROJECT_DIR" "$SERVICE_USER"
        sudo usermod -aG docker "$SERVICE_USER"
        log_success "Utilisateur $SERVICE_USER créé"
    else
        log_info "Utilisateur $SERVICE_USER existe déjà"
    fi
}

# 4. Préparation des répertoires
setup_directories() {
    log_info "Préparation des répertoires..."
    
    sudo mkdir -p "$PROJECT_DIR"
    sudo mkdir -p "$PROJECT_DIR/logs"
    sudo mkdir -p "$PROJECT_DIR/config"
    sudo mkdir -p "$PROJECT_DIR/data"
    sudo mkdir -p "/var/log/log430"
    
    sudo chown -R "$SERVICE_USER:$SERVICE_USER" "$PROJECT_DIR"
    sudo chown -R "$SERVICE_USER:$SERVICE_USER" "/var/log/log430"
    
    log_success "Répertoires préparés"
}

# 5. Configuration du firewall
setup_firewall() {
    log_info "Configuration du firewall..."
    
    if command -v ufw >/dev/null 2>&1; then
        sudo ufw allow 22          # SSH
        sudo ufw allow 8000        # Kong Gateway
        sudo ufw allow 8001        # Kong Admin
        sudo ufw allow 8002        # Kong Manager
        sudo ufw allow 3030        # Grafana
        sudo ufw allow 9090        # Prometheus
        sudo ufw allow 3200        # Legacy System
        sudo ufw allow 3001:3004   # Microservices
        sudo ufw --force enable
        log_success "Firewall configuré (UFW)"
    elif command -v firewall-cmd >/dev/null 2>&1; then
        sudo firewall-cmd --permanent --add-port=8000/tcp
        sudo firewall-cmd --permanent --add-port=8001/tcp
        sudo firewall-cmd --permanent --add-port=8002/tcp
        sudo firewall-cmd --permanent --add-port=3030/tcp
        sudo firewall-cmd --permanent --add-port=9090/tcp
        sudo firewall-cmd --permanent --add-port=3200/tcp
        sudo firewall-cmd --permanent --add-port=3001-3004/tcp
        sudo firewall-cmd --reload
        log_success "Firewall configuré (firewalld)"
    else
        log_warning "Firewall non détecté. Configuration manuelle requise."
    fi
}

# 6. Installation du code
install_application() {
    log_info "Installation de l'application..."
    
    cd "$PROJECT_DIR"
    
    # Si déjà présent, sauvegarder
    if [ -d ".git" ]; then
        sudo -u "$SERVICE_USER" git pull
    else
        # Ici vous devrez soit cloner le repo ou copier les fichiers
        log_warning "Code source requis dans $PROJECT_DIR"
        log_info "Copiez vos fichiers ou clonez le repository dans ce répertoire"
    fi
    
    # Installation des dépendances Node.js
    if [ -f "package.json" ]; then
        sudo -u "$SERVICE_USER" npm install --production
        log_success "Dépendances Node.js installées"
    fi
}

# 7. Configuration des services systemd
setup_systemd_services() {
    log_info "Configuration des services systemd..."
    
    # Service principal Docker
    cat <<EOF | sudo tee /etc/systemd/system/log430-docker.service
[Unit]
Description=LOG430 LAB TB - Docker Services
After=docker.service
Requires=docker.service

[Service]
Type=oneshot
RemainAfterExit=yes
WorkingDirectory=$PROJECT_DIR
User=$SERVICE_USER
Group=$SERVICE_USER
ExecStart=/usr/local/bin/docker-compose up -d
ExecStop=/usr/local/bin/docker-compose down
TimeoutStartSec=300

[Install]
WantedBy=multi-user.target
EOF

    # Service de monitoring
    cat <<EOF | sudo tee /etc/systemd/system/log430-monitor.service
[Unit]
Description=LOG430 LAB TB - Monitoring Service
After=log430-docker.service

[Service]
Type=simple
User=$SERVICE_USER
Group=$SERVICE_USER
WorkingDirectory=$PROJECT_DIR
ExecStart=/usr/bin/node monitor-system.js
Restart=always
RestartSec=10
StandardOutput=journal
StandardError=journal

[Install]
WantedBy=multi-user.target
EOF

    sudo systemctl daemon-reload
    sudo systemctl enable log430-docker
    sudo systemctl enable log430-monitor
    
    log_success "Services systemd configurés"
}

# 8. Configuration de logrotate
setup_logrotate() {
    log_info "Configuration de la rotation des logs..."
    
    cat <<EOF | sudo tee /etc/logrotate.d/log430
/var/log/log430/*.log {
    daily
    missingok
    rotate 30
    compress
    delaycompress
    notifempty
    copytruncate
    su $SERVICE_USER $SERVICE_USER
}
EOF

    log_success "Logrotate configuré"
}

# 9. Test de santé initial
health_check() {
    log_info "Test de santé du déploiement..."
    
    # Vérifier Docker
    if ! sudo systemctl is-active --quiet docker; then
        log_error "Docker n'est pas actif"
        return 1
    fi
    
    # Vérifier les ports
    local ports=(8000 8001 3030 9090)
    for port in "${ports[@]}"; do
        if sudo netstat -tlnp | grep ":$port " >/dev/null; then
            log_warning "Port $port déjà utilisé"
        fi
    done
    
    log_success "Système prêt pour le déploiement"
}

# 10. Fonction principale
main() {
    echo "Début du déploiement..."
    
    check_system
    install_dependencies
    create_service_user
    setup_directories
    setup_firewall
    install_application
    setup_systemd_services
    setup_logrotate
    health_check
    
    log_success "DÉPLOIEMENT TERMINÉ!"
    echo ""
    echo "📋 PROCHAINES ÉTAPES:"
    echo "1. Copiez le code source dans $PROJECT_DIR"
    echo "2. Lancez: sudo systemctl start log430-docker"
    echo "3. Vérifiez: sudo systemctl status log430-docker"
    echo "4. Accédez aux services:"
    echo "   • Kong Gateway: http://$(hostname -I | awk '{print $1}'):8000"
    echo "   • Kong Admin: http://$(hostname -I | awk '{print $1}'):8001"
    echo "   • Grafana: http://$(hostname -I | awk '{print $1}'):3030"
    echo "   • Prometheus: http://$(hostname -I | awk '{print $1}'):9090"
    echo ""
    echo "📊 LOGS:"
    echo "   • sudo journalctl -u log430-docker -f"
    echo "   • sudo journalctl -u log430-monitor -f"
}

# Exécution
if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
    main "$@"
fi
