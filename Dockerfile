# =============================================================================
# DOCKERFILE UNIVERSEL - SYSTÈME POS COMPLET
# Supporte tous les composants : microservices, consoles, legacy
# =============================================================================

FROM node:20-alpine

# Arguments pour la configuration
ARG SERVICE_TYPE=microservice
ARG SERVICE_NAME=generic
ARG PORT=3000

# Variables d'environnement
ENV NODE_ENV=production
ENV SERVICE_TYPE=${SERVICE_TYPE}
ENV SERVICE_NAME=${SERVICE_NAME}
ENV PORT=${PORT}

WORKDIR /app

# Installer les utilitaires système
RUN apk add --no-cache \
    netcat-openbsd \
    curl \
    bash \
    git

# Copier les fichiers de dépendances
COPY package*.json ./

# Installer les dépendances
RUN npm ci --only=production && npm cache clean --force

# Copier le code source complet
COPY . .

# Créer les répertoires nécessaires
RUN mkdir -p logs data

# Script de démarrage universel
RUN echo '#!/bin/bash' > /app/start.sh && \
    echo 'case $SERVICE_TYPE in' >> /app/start.sh && \
    echo '  "microservice")' >> /app/start.sh && \
    echo '    if [ -f "microservices/$SERVICE_NAME/server.js" ]; then' >> /app/start.sh && \
    echo '      echo "🚀 Démarrage microservice: $SERVICE_NAME"' >> /app/start.sh && \
    echo '      cd microservices/$SERVICE_NAME && node server.js' >> /app/start.sh && \
    echo '    else' >> /app/start.sh && \
    echo '      echo "❌ Microservice $SERVICE_NAME non trouvé"' >> /app/start.sh && \
    echo '      exit 1' >> /app/start.sh && \
    echo '    fi' >> /app/start.sh && \
    echo '    ;;' >> /app/start.sh && \
    echo '  "console-pos")' >> /app/start.sh && \
    echo '    echo "🏪 Démarrage Console POS"' >> /app/start.sh && \
    echo '    node src/appConsole.js' >> /app/start.sh && \
    echo '    ;;' >> /app/start.sh && \
    echo '  "console-maisonmere")' >> /app/start.sh && \
    echo '    echo "🏢 Démarrage Console Maison Mère"' >> /app/start.sh && \
    echo '    node src/maisonMereConsole.js' >> /app/start.sh && \
    echo '    ;;' >> /app/start.sh && \
    echo '  "legacy")' >> /app/start.sh && \
    echo '    echo "🏛️ Démarrage Legacy System"' >> /app/start.sh && \
    echo '    cd app && node app.js' >> /app/start.sh && \
    echo '    ;;' >> /app/start.sh && \
    echo '  *)' >> /app/start.sh && \
    echo '    echo "❌ SERVICE_TYPE non reconnu: $SERVICE_TYPE"' >> /app/start.sh && \
    echo '    echo "Types supportés: microservice, console-pos, console-maisonmere, legacy"' >> /app/start.sh && \
    echo '    exit 1' >> /app/start.sh && \
    echo '    ;;' >> /app/start.sh && \
    echo 'esac' >> /app/start.sh && \
    chmod +x /app/start.sh

# Exposer le port (dynamique)
EXPOSE ${PORT}

# Health check universel
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:${PORT}/health || \
      curl -f http://localhost:${PORT}/ || \
      nc -z localhost ${PORT} || exit 1

# Commande de démarrage
CMD ["/app/start.sh"]
