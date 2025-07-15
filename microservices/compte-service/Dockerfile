FROM node:18-alpine

WORKDIR /app

# Copier package.json et package-lock.json
COPY package*.json ./

# Installer les dépendances
RUN npm install --production

# Copier le code source
COPY . .

# Exposer le port
EXPOSE 3005

# Variables d'environnement par défaut
ENV NODE_ENV=production
ENV PORT=3005

# Commande de démarrage
CMD ["node", "server.js"]
