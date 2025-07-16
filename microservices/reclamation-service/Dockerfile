FROM node:18-alpine

# Métadonnées
LABEL maintainer="LOG430 Team"
LABEL description="Reclamation Service - Event-Driven Architecture LAB 7"
LABEL version="1.0.0"

# Répertoire de travail
WORKDIR /app

# Installation des dépendances système
RUN apk add --no-cache dumb-init

# Copie des fichiers de dépendances
COPY package*.json ./

# Installation des dépendances Node.js
RUN npm ci --only=production && npm cache clean --force

# Copie du code source
COPY . .

# Création du répertoire logs
RUN mkdir -p logs && chown -R node:node /app

# Utilisateur non-root pour la sécurité
USER node

# Variables d'environnement par défaut
ENV NODE_ENV=production
ENV PORT=8011

# Santé du container
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:8011/health', (res) => { process.exit(res.statusCode === 200 ? 0 : 1) })"

# Exposition du port
EXPOSE 8011

# Démarrage avec dumb-init pour gestion des signaux
ENTRYPOINT ["dumb-init", "--"]
CMD ["npm", "start"]
