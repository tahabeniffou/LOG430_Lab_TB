# Dockerfile pour le vente-service
FROM node:18-alpine

# Installer wget pour les health checks
RUN apk add --no-cache wget

WORKDIR /app

# Créer le dossier data pour persistance
RUN mkdir -p /app/data

COPY package*.json ./
RUN npm install --production

COPY . .

# Variables d'environnement par défaut
ENV NODE_ENV=production
ENV PORT=3004
ENV INSTANCE_ID=vente-instance-default
ENV INSTANCE_NAME="Vente Service Default"

EXPOSE 3004

# Healthcheck
HEALTHCHECK --interval=30s --timeout=10s --start-period=10s --retries=3 \
  CMD wget --quiet --tries=1 --spider http://localhost:${PORT}/health || exit 1

CMD ["node", "server.js"]
