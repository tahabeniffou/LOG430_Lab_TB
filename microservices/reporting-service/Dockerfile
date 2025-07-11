# Dockerfile pour le reporting-service
FROM node:18-alpine

# Installer wget pour les health checks (plus léger que curl)
RUN apk add --no-cache wget

# Répertoire de travail
WORKDIR /app

# Créer le dossier data pour SQLite
RUN mkdir -p /app/data

# Copier les fichiers de dépendances
COPY package*.json ./

# Installer les dépendances
RUN npm install --production

# Copier le code source
COPY . .

# Variables d'environnement par défaut
ENV NODE_ENV=production
ENV PORT=3005
ENV DB_STORAGE=/app/data/reporting_service.db
ENV INSTANCE_ID=reporting-instance-default
ENV INSTANCE_NAME="Reporting Service Default"

# Exposer le port
EXPOSE 3005

# Healthcheck
HEALTHCHECK --interval=30s --timeout=10s --start-period=10s --retries=3 \
  CMD wget --quiet --tries=1 --spider http://localhost:${PORT}/health || exit 1

# Commande de démarrage
CMD ["node", "server.js"]
