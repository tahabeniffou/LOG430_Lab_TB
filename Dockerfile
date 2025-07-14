FROM node:18-alpine

# Install curl for health checks and netcat for database waiting
RUN apk add --no-cache curl netcat-openbsd

WORKDIR /app

COPY package*.json ./

RUN npm ci --only=production

COPY . .

# Make startup script executable
RUN chmod +x docker-entrypoint.sh

EXPOSE 3000-3004

ENTRYPOINT ["./docker-entrypoint.sh"]



