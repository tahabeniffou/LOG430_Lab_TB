FROM node:20
WORKDIR /app
COPY package*.json ./
RUN npm install
RUN apt-get update && apt-get install -y netcat-openbsd
COPY . .
CMD ./wait-for-it.sh db:5432 -- node src/models/seed.js && node src/api/servers.js
