FROM node:20
WORKDIR /app
COPY package*.json ./
RUN npm install
RUN apt-get update && apt-get install -y netcat-openbsd
COPY . .
CMD ["node", "src/api/servers.js"]
