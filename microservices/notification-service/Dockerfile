FROM node:18-alpine

# Installation de curl pour health checks
RUN apk add --no-cache curl

WORKDIR /app

# Installation des dépendances
COPY package*.json ./
RUN npm install --production

# Copie du code source
COPY . .

# Création d'un utilisateur non-root
RUN addgroup -g 1001 -S nodejs
RUN adduser -S nextjs -u 1001

# Changement de propriétaire
RUN chown -R nextjs:nodejs /app
USER nextjs

# Port d'exposition
EXPOSE 8013

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:8013/health || exit 1

# Commande de démarrage
CMD ["node", "server.js"]
