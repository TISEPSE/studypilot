#!/bin/bash
# ── StudyPilot — Initialisation SSL Let's Encrypt ──────────
# À exécuter UNE SEULE FOIS sur le serveur avant le premier démarrage.
# Prérequis : DNS de studypilot.tisepse.com pointant vers ce serveur.

DOMAIN="studypilot.tisepse.com"
EMAIL="ton@email.com"   # ← Remplace par ton email

set -e

echo "==> 1. Démarrage temporaire (HTTP uniquement) pour le challenge Certbot..."
# Config temporaire sans SSL
cp nginx/nginx.conf nginx/nginx.conf.bak
cp nginx/nginx.init.conf nginx/nginx.conf

docker-compose up -d studypilot nginx
sleep 3

echo "==> 2. Obtention du certificat Let's Encrypt..."
docker-compose run --rm certbot certbot certonly \
  --webroot \
  --webroot-path=/var/www/certbot \
  --email "$EMAIL" \
  --agree-tos \
  --no-eff-email \
  -d "$DOMAIN"

echo "==> 3. Restauration de la config nginx avec SSL..."
cp nginx/nginx.conf.bak nginx/nginx.conf
rm nginx/nginx.conf.bak

echo "==> 4. Redémarrage de nginx avec SSL activé..."
docker-compose restart nginx

echo ""
echo "✅  SSL activé ! StudyPilot est accessible sur https://$DOMAIN"
