FROM node:20-bookworm-slim

WORKDIR /app

# Dépendances de build pour better-sqlite3 (native addon)
RUN apt-get update && apt-get install -y --no-install-recommends \
    python3 make g++ \
    && rm -rf /var/lib/apt/lists/*

# Installer les dépendances (compilation native depuis les sources)
COPY package*.json ./
RUN npm install --omit=dev --build-from-source

# Copier le code source
COPY . .

# Créer le dossier data
RUN mkdir -p /data

# Exposer le port
EXPOSE 3000

# Variables d'environnement par défaut
ENV PORT=3000
ENV DATA_DIR=/data
ENV NODE_ENV=production

CMD ["node", "server.js"]
