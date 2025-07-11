# 🚀 Guide de Déploiement - Production Ready

## 📋 Pré-requis

### Infrastructure Minimale
```yaml
Serveur Production:
  CPU: 4 cores minimum, 8 cores recommandé
  RAM: 8GB minimum, 16GB recommandé  
  Storage: 100GB SSD minimum
  Network: 1Gbps minimum
  OS: Ubuntu 20.04+ ou CentOS 8+

Docker:
  Version: 20.10+
  Docker Compose: 2.0+
  
Optionnel:
  Kubernetes: 1.24+
  Helm: 3.8+
```

---

## 🐳 Déploiement Docker Standard

### 1. Clone et Préparation
```bash
# Clone du repository
git clone https://github.com/company/LOG430_Lab_TB.git
cd LOG430_Lab_TB

# Configuration environnement
cp .env.example .env.production
nano .env.production
```

### 2. Variables d'Environnement
```bash
# .env.production
NODE_ENV=production

# Database paths  
PRODUIT_DB_PATH=/app/data/produits.db
STOCK_DB_PATH=/app/data/stock.db
VENTE_DB_PATH=/app/data/ventes.db
REPORTING_DB_PATH=/app/data/reporting.db

# Services discovery
PRODUIT_SERVICE_URL=http://produit-service:3001
STOCK_SERVICE_URL=http://stock-service:3002
VENTE_SERVICE_URL=http://vente-service:3004
REPORTING_SERVICE_URL=http://reporting-service:3005

# Security
JWT_SECRET=your-super-secret-key-change-me
API_KEY=your-api-key-change-me

# Monitoring
PROMETHEUS_ENABLED=true
GRAFANA_ADMIN_PASSWORD=change-me-strong-password
```

### 3. Déploiement
```bash
# Build et démarrage
docker-compose -f docker-compose.yml up -d

# Vérification santé
docker-compose ps
docker-compose logs api-gateway
```

### 4. Validation
```bash
# Test connectivité
curl http://localhost:9000/health
curl http://localhost:9000/api/v2/produits

# Test individual services
curl http://localhost:3001/health  # Produit
curl http://localhost:3002/health  # Stock
curl http://localhost:3004/health  # Vente
curl http://localhost:3005/health  # Reporting
```

---

## ☸️ Déploiement Kubernetes (Production)

### 1. Namespace et Configuration
```yaml
# k8s/namespace.yaml
apiVersion: v1
kind: Namespace
metadata:
  name: pos-system
  labels:
    name: pos-system
---
# k8s/configmap.yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: app-config
  namespace: ecommerce
data:
  NODE_ENV: "production"
  PROMETHEUS_ENABLED: "true"
  REQUEST_TIMEOUT: "5000"
```

### 2. Secrets
```yaml
# k8s/secrets.yaml
apiVersion: v1
kind: Secret
metadata:
  name: app-secrets
  namespace: ecommerce
type: Opaque
stringData:
  JWT_SECRET: "your-jwt-secret-base64"
  API_KEY: "your-api-key"
  GRAFANA_ADMIN_PASSWORD: "strong-password"
```

### 3. Services Déployment
```yaml
# k8s/api-gateway.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: api-gateway
  namespace: ecommerce
spec:
  replicas: 3
  selector:
    matchLabels:
      app: api-gateway
  template:
    metadata:
      labels:
        app: api-gateway
    spec:
      containers:
      - name: api-gateway
        image: ecommerce/api-gateway:latest
        ports:
        - containerPort: 9000
        env:
        - name: NODE_ENV
          valueFrom:
            configMapKeyRef:
              name: app-config
              key: NODE_ENV
        - name: JWT_SECRET
          valueFrom:
            secretKeyRef:
              name: app-secrets
              key: JWT_SECRET
        livenessProbe:
          httpGet:
            path: /health
            port: 9000
          initialDelaySeconds: 30
          periodSeconds: 10
        readinessProbe:
          httpGet:
            path: /health
            port: 9000
          initialDelaySeconds: 5
          periodSeconds: 5
        resources:
          requests:
            memory: "256Mi"
            cpu: "250m"
          limits:
            memory: "512Mi"
            cpu: "500m"
---
apiVersion: v1
kind: Service
metadata:
  name: api-gateway-service
  namespace: ecommerce
spec:
  selector:
    app: api-gateway
  ports:
  - port: 9000
    targetPort: 9000
  type: LoadBalancer
```

### 4. Persistent Volumes pour SQLite
```yaml
# k8s/storage.yaml
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: produit-pvc
  namespace: ecommerce
spec:
  accessModes:
    - ReadWriteOnce
  resources:
    requests:
      storage: 10Gi
  storageClassName: ssd
---
# Répéter pour stock-pvc, vente-pvc, reporting-pvc
```

### 5. Monitoring Stack
```yaml
# k8s/prometheus.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: prometheus
  namespace: ecommerce
spec:
  replicas: 1
  selector:
    matchLabels:
      app: prometheus
  template:
    metadata:
      labels:
        app: prometheus
    spec:
      containers:
      - name: prometheus
        image: prom/prometheus:latest
        ports:
        - containerPort: 9090
        volumeMounts:
        - name: prometheus-config
          mountPath: /etc/prometheus
        - name: prometheus-data
          mountPath: /prometheus
      volumes:
      - name: prometheus-config
        configMap:
          name: prometheus-config
      - name: prometheus-data
        persistentVolumeClaim:
          claimName: prometheus-pvc
```

---

## 🔧 Configuration Avancée

### Reverse Proxy NGINX
```nginx
# /etc/nginx/sites-available/ecommerce
upstream api_gateway {
    server 127.0.0.1:9000;
    # Ajouter plus d'instances pour load balancing
    # server 127.0.0.1:9001;
    # server 127.0.0.1:9002;
}

server {
    listen 80;
    server_name your-domain.com;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name your-domain.com;
    
    ssl_certificate /path/to/ssl/cert.pem;
    ssl_certificate_key /path/to/ssl/key.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-RSA-AES256-GCM-SHA384:ECDHE-RSA-AES128-GCM-SHA256;
    
    location / {
        proxy_pass http://api_gateway;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        
        # Timeouts
        proxy_connect_timeout 30s;
        proxy_send_timeout 30s;
        proxy_read_timeout 30s;
        
        # WebSocket support (future)
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
    }
    
    location /metrics {
        # Restrict access to monitoring
        allow 10.0.0.0/8;
        allow 172.16.0.0/12;
        allow 192.168.0.0/16;
        deny all;
        
        proxy_pass http://api_gateway;
    }
}
```

### SSL/TLS avec Let's Encrypt
```bash
# Installation Certbot
sudo apt install certbot python3-certbot-nginx

# Génération certificat
sudo certbot --nginx -d your-domain.com

# Auto-renewal
echo "0 12 * * * /usr/bin/certbot renew --quiet" | sudo crontab -
```

---

## 📊 Monitoring et Observabilité

### Prometheus Configuration
```yaml
# config/prometheus.yml
global:
  scrape_interval: 15s
  evaluation_interval: 15s

alerting:
  alertmanagers:
    - static_configs:
        - targets:
          - alertmanager:9093

rule_files:
  - "alert_rules.yml"

scrape_configs:
  - job_name: 'api-gateway'
    static_configs:
      - targets: ['api-gateway:9000']
    metrics_path: '/metrics'
    scrape_interval: 5s
    
  - job_name: 'produit-service'
    static_configs:
      - targets: ['produit-service:3001']
    metrics_path: '/metrics'
    
  - job_name: 'stock-service'
    static_configs:
      - targets: ['stock-service:3002']
    metrics_path: '/metrics'
    
  - job_name: 'vente-service'
    static_configs:
      - targets: ['vente-service:3004']
    metrics_path: '/metrics'
    
  - job_name: 'reporting-service'
    static_configs:
      - targets: ['reporting-service:3005']
    metrics_path: '/metrics'

  - job_name: 'node-exporter'
    static_configs:
      - targets: ['node-exporter:9100']
```

### Alerting Rules
```yaml
# config/alert_rules.yml
groups:
- name: ecommerce_alerts
  rules:
  - alert: ServiceDown
    expr: up == 0
    for: 1m
    labels:
      severity: critical
    annotations:
      summary: "Service {{ $labels.job }} is down"
      description: "{{ $labels.job }} has been down for more than 1 minute."
      
  - alert: HighLatency
    expr: histogram_quantile(0.95, rate(http_request_duration_seconds_bucket[5m])) > 0.1
    for: 5m
    labels:
      severity: warning
    annotations:
      summary: "High latency on {{ $labels.job }}"
      
  - alert: HighErrorRate
    expr: rate(http_requests_total{status=~"5.."}[5m]) / rate(http_requests_total[5m]) > 0.1
    for: 2m
    labels:
      severity: critical
    annotations:
      summary: "High error rate on {{ $labels.job }}"
      
  - alert: DatabaseConnectionFail
    expr: database_connections_active == 0
    for: 30s
    labels:
      severity: critical
    annotations:
      summary: "Database connection failed for {{ $labels.job }}"
```

### Grafana Dashboard Import
```bash
# Import dashboard via API
curl -X POST \
  http://admin:password@grafana:3000/api/dashboards/db \
  -H 'Content-Type: application/json' \
  -d @config/grafana-dashboard.json
```

---

## 🔄 CI/CD Pipeline

### GitHub Actions
```yaml
# .github/workflows/deploy.yml
name: Deploy to Production

on:
  push:
    branches: [ main ]
    paths-ignore:
      - 'documentation/**'
      - '*.md'

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
    - uses: actions/checkout@v3
    
    - name: Setup Node.js
      uses: actions/setup-node@v3
      with:
        node-version: '18'
        
    - name: Install dependencies
      run: npm ci
      
    - name: Run tests
      run: npm test
      
    - name: Run integration tests
      run: npm run test:integration
      
  build:
    needs: test
    runs-on: ubuntu-latest
    steps:
    - uses: actions/checkout@v3
    
    - name: Build Docker images
      run: |
        docker build -t ecommerce/api-gateway:${{ github.sha }} -f Dockerfile.hybrid-router .
        docker build -t ecommerce/produit-service:${{ github.sha }} ./microservices/produit-service
        docker build -t ecommerce/stock-service:${{ github.sha }} ./microservices/stock-service
        docker build -t ecommerce/vente-service:${{ github.sha }} ./microservices/vente-service
        docker build -t ecommerce/reporting-service:${{ github.sha }} ./microservices/reporting-service
        
    - name: Push to registry
      run: |
        echo ${{ secrets.DOCKER_PASSWORD }} | docker login -u ${{ secrets.DOCKER_USERNAME }} --password-stdin
        docker push ecommerce/api-gateway:${{ github.sha }}
        docker push ecommerce/produit-service:${{ github.sha }}
        docker push ecommerce/stock-service:${{ github.sha }}
        docker push ecommerce/vente-service:${{ github.sha }}
        docker push ecommerce/reporting-service:${{ github.sha }}
        
  deploy:
    needs: build
    runs-on: ubuntu-latest
    if: github.ref == 'refs/heads/main'
    steps:
    - name: Deploy to production
      run: |
        # Update Kubernetes deployments
        kubectl set image deployment/api-gateway api-gateway=ecommerce/api-gateway:${{ github.sha }} -n ecommerce
        kubectl set image deployment/produit-service produit-service=ecommerce/produit-service:${{ github.sha }} -n ecommerce
        kubectl set image deployment/stock-service stock-service=ecommerce/stock-service:${{ github.sha }} -n ecommerce
        kubectl set image deployment/vente-service vente-service=ecommerce/vente-service:${{ github.sha }} -n ecommerce
        kubectl set image deployment/reporting-service reporting-service=ecommerce/reporting-service:${{ github.sha }} -n ecommerce
        
        # Wait for rollout
        kubectl rollout status deployment/api-gateway -n ecommerce
        kubectl rollout status deployment/produit-service -n ecommerce
        kubectl rollout status deployment/stock-service -n ecommerce
        kubectl rollout status deployment/vente-service -n ecommerce
        kubectl rollout status deployment/reporting-service -n ecommerce
```

---

## 🛡️ Sécurité Production

### Hardening Checklist
```bash
# 1. Firewall Configuration
sudo ufw enable
sudo ufw allow 22/tcp   # SSH
sudo ufw allow 80/tcp   # HTTP
sudo ufw allow 443/tcp  # HTTPS
sudo ufw deny 9000/tcp  # Block direct API Gateway access

# 2. Docker Security
# Run containers as non-root user
echo "USER node" >> Dockerfile

# 3. Database Security
chmod 600 /app/data/*.db
chown app:app /app/data/*.db

# 4. Secrets Management
# Use Kubernetes secrets or HashiCorp Vault
kubectl create secret generic app-secrets \
  --from-literal=jwt-secret="$(openssl rand -base64 32)" \
  --from-literal=api-key="$(openssl rand -hex 32)"

# 5. Network Policies (Kubernetes)
kubectl apply -f k8s/network-policies.yaml
```

### Network Policies
```yaml
# k8s/network-policies.yaml
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: default-deny-all
  namespace: ecommerce
spec:
  podSelector: {}
  policyTypes:
  - Ingress
  - Egress
---
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: allow-api-gateway
  namespace: ecommerce
spec:
  podSelector:
    matchLabels:
      app: api-gateway
  policyTypes:
  - Ingress
  - Egress
  ingress:
  - from: []
    ports:
    - protocol: TCP
      port: 9000
  egress:
  - to:
    - podSelector:
        matchLabels:
          tier: backend
    ports:
    - protocol: TCP
      port: 3001
    - protocol: TCP
      port: 3002
    - protocol: TCP
      port: 3004
    - protocol: TCP
      port: 3005
```

---

## 🔧 Maintenance et Support

### Scripts de Maintenance
```bash
#!/bin/bash
# scripts/maintenance.sh

# Backup databases
backup_databases() {
    echo "Starting database backup..."
    docker exec produit-service sqlite3 /app/data/produits.db ".backup /app/data/backup/produits_$(date +%Y%m%d_%H%M%S).db"
    docker exec stock-service sqlite3 /app/data/stock.db ".backup /app/data/backup/stock_$(date +%Y%m%d_%H%M%S).db"
    docker exec vente-service sqlite3 /app/data/ventes.db ".backup /app/data/backup/ventes_$(date +%Y%m%d_%H%M%S).db"
    docker exec reporting-service sqlite3 /app/data/reporting.db ".backup /app/data/backup/reporting_$(date +%Y%m%d_%H%M%S).db"
    echo "Backup completed"
}

# Health check all services
health_check() {
    echo "Checking service health..."
    services=("api-gateway:9000" "produit-service:3001" "stock-service:3002" "vente-service:3004" "reporting-service:3005")
    
    for service in "${services[@]}"; do
        if curl -f http://localhost:${service##*:}/health > /dev/null 2>&1; then
            echo "✅ ${service%:*} is healthy"
        else
            echo "❌ ${service%:*} is unhealthy"
        fi
    done
}

# Log rotation
rotate_logs() {
    echo "Rotating logs..."
    docker-compose logs --no-color > logs/application_$(date +%Y%m%d).log
    docker-compose logs --no-color | tail -1000 > logs/application_latest.log
    
    # Keep only last 30 days of logs
    find logs/ -name "application_*.log" -mtime +30 -delete
}

# Performance metrics collection
collect_metrics() {
    echo "Collecting performance metrics..."
    curl -s http://localhost:9090/api/v1/query?query=up > metrics/uptime_$(date +%Y%m%d_%H%M%S).json
    curl -s "http://localhost:9090/api/v1/query?query=rate(http_requests_total[5m])" > metrics/request_rate_$(date +%Y%m%d_%H%M%S).json
}

# Main execution
case "$1" in
    backup)
        backup_databases
        ;;
    health)
        health_check
        ;;
    logs)
        rotate_logs
        ;;
    metrics)
        collect_metrics
        ;;
    all)
        backup_databases
        health_check
        rotate_logs
        collect_metrics
        ;;
    *)
        echo "Usage: $0 {backup|health|logs|metrics|all}"
        exit 1
        ;;
esac
```

### Automatisation Cron
```bash
# /etc/cron.d/ecommerce-maintenance
# Daily backup at 2 AM
0 2 * * * root /opt/ecommerce/scripts/maintenance.sh backup

# Health check every 5 minutes
*/5 * * * * root /opt/ecommerce/scripts/maintenance.sh health | logger -t ecommerce-health

# Log rotation daily at 1 AM
0 1 * * * root /opt/ecommerce/scripts/maintenance.sh logs

# Metrics collection every hour
0 * * * * root /opt/ecommerce/scripts/maintenance.sh metrics
```

---

## 📞 Support et Troubleshooting

### Logs Centralisation
```bash
# View all service logs
docker-compose logs -f

# View specific service
docker-compose logs -f api-gateway

# Kubernetes logs
kubectl logs -f deployment/api-gateway -n ecommerce
kubectl logs -f deployment/produit-service -n ecommerce
```

### Common Issues

#### 1. Service Not Starting
```bash
# Check container status
docker-compose ps

# Check logs for errors
docker-compose logs service-name

# Check resource usage
docker stats

# Restart problematic service
docker-compose restart service-name
```

#### 2. High Memory Usage
```bash
# Monitor memory usage
docker stats --format "table {{.Container}}\t{{.CPUPerc}}\t{{.MemUsage}}\t{{.MemPerc}}"

# If needed, restart services
docker-compose restart

# Scale down if using Kubernetes
kubectl scale deployment api-gateway --replicas=2 -n ecommerce
```

#### 3. Database Connectivity Issues
```bash
# Check SQLite database files
ls -la /var/lib/docker/volumes/*/data/*.db

# Test database connection
docker exec produit-service sqlite3 /app/data/produits.db "SELECT COUNT(*) FROM produits;"

# Restore from backup if corrupted
docker exec produit-service cp /app/data/backup/produits_latest.db /app/data/produits.db
```

### Emergency Contacts
- **On-call Engineer**: +1-XXX-XXX-XXXX
- **Slack Channel**: #ecommerce-alerts
- **Email Escalation**: ops-team@company.com

---

*Guide de déploiement v1.0*  
*Dernière mise à jour: 2024-12-01*  
*Classification: CONFIDENTIEL*
