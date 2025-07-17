# Dockerfile pour le produit-service
FROM node:18-alpine

# Installer curl pour le health check
RUN apk add --no-cache curl

# Répertoire de travail
WORKDIR /app

# Copier les fichiers de dépendances
COPY package*.json ./

# Installer les dépendances
RUN npm install --production

# Copier le code source
COPY . .

# Variables d'environnement par défaut
ENV NODE_ENV=production
ENV PORT=3001
ENV INSTANCE_ID=produit-instance-default
ENV INSTANCE_NAME="Produit Service Default"

# Exposer le port (sera défini par la variable d'environnement PORT)
EXPOSE 3001

# Healthcheck
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:${PORT}/health || exit 1

# Commande de démarrage
CMD ["node", "server.js"]
