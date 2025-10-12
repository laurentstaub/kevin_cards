# Railway.app Deployment Guide

Ce guide vous explique comment déployer l'application FlashPharma sur Railway.app.

## Prérequis

1. Compte Railway.app (gratuit)
2. Compte GitHub (si vous utilisez le déploiement via GitHub)
3. Base de données PostgreSQL (Railway peut en fournir une automatiquement)

## Configuration préparatoire

### 1. Variables d'environnement requises

Copiez le fichier `.env.example` vers `.env` et configurez les variables suivantes sur Railway :

```bash
# Base de données (Railway fournira DATABASE_URL automatiquement)
DATABASE_URL=postgresql://user:password@host:port/database

# Configuration serveur
PORT=8084
NODE_ENV=production

# CORS Origins - remplacez par votre URL Railway
CORS_ORIGINS=https://votre-app.up.railway.app

# Limitation de taux
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
```

## Déploiement sur Railway

### Option 1: Déploiement via GitHub (Recommandé)

1. **Poussez votre code sur GitHub** (si ce n'est pas déjà fait)
   ```bash
   git add .
   git commit -m "Prepare for Railway deployment"
   git push origin main
   ```

2. **Connectez-vous à Railway**
   - Allez sur [railway.app](https://railway.app)
   - Connectez-vous avec votre compte GitHub

3. **Créez un nouveau projet**
   - Cliquez sur "New Project"
   - Sélectionnez "Deploy from GitHub repo"
   - Choisissez votre repository

4. **Ajoutez une base de données PostgreSQL**
   - Dans votre projet Railway, cliquez sur "New"
   - Sélectionnez "Database" → "PostgreSQL"
   - Railway créera automatiquement la base de données et définira `DATABASE_URL`

5. **Configurez les variables d'environnement**
   - Allez dans l'onglet "Variables" de votre service
   - Ajoutez toutes les variables de `.env.example`
   - **Important**: Mettez à jour `CORS_ORIGINS` avec votre URL Railway

### Option 2: Déploiement via CLI

1. **Installez Railway CLI**
   ```bash
   npm install -g @railway/cli
   ```

2. **Connectez-vous**
   ```bash
   railway login
   ```

3. **Initialisez le projet**
   ```bash
   railway init
   ```

4. **Déployez**
   ```bash
   railway up
   ```

## Configuration post-déploiement

### 1. Vérifiez le health check
- Visitez `htt
- ps://votre-app.up.railway.app/health`
- Vous devriez voir un statut "healthy"

### 2. Testez l'API
- Testez les endpoints : `https://votre-app.up.railway.app/api/questions`

### 3. Vérifiez le frontend
- Visitez `https://votre-app.up.railway.app`
- L'interface utilisateur devrait se charger correctement

### 4. Testez l'admin
- Visitez `https://votre-app.up.railway.app/admin`

## Structure du déploiement

L'application est configurée pour un déploiement à service unique où :
- Le serveur API (`api/server.js`) sert à la fois l'API et les fichiers statiques
- Les fichiers du frontend sont servis depuis `/public`
- L'interface admin est servie depuis `/admin`
- Le routing client-side est géré par un catch-all route

## Dépannage

### Base de données
Si vous avez des problèmes de connexion :
1. Vérifiez que `DATABASE_URL` est définie
2. Assurez-vous que la base de données PostgreSQL est en cours d'exécution
3. Vérifiez les logs Railway pour les erreurs de connexion

### CORS
Si vous avez des erreurs CORS :
1. Mettez à jour `CORS_ORIGINS` avec votre URL Railway exacte
2. Redéployez l'application

### Variables d'environnement
- Toutes les variables doivent être définies dans l'interface Railway
- Redémarrez le service après avoir modifié les variables

## Migration de données

Si vous avez des données existantes à migrer :

1. **Exportez vos données locales**
   ```bash
   pg_dump flashpharma > backup.sql
   ```

2. **Importez sur Railway**
   - Utilisez Railway CLI ou connectez-vous directement à la base
   ```bash
   railway connect postgres
   # Puis utilisez psql pour importer
   ```

## Maintenance

- **Logs** : Consultez les logs via l'interface Railway ou `railway logs`
- **Monitoring** : Utilisez le endpoint `/health` pour la surveillance
- **Mise à jour** : Poussez vers votre repository GitHub pour déclencher un redéploiement automatique

## URLs importantes

Après déploiement, votre application sera disponible à :
- **Application principale** : `https://votre-app.up.railway.app`
- **API** : `https://votre-app.up.railway.app/api`
- **Admin** : `https://votre-app.up.railway.app/admin`
- **Health check** : `https://votre-app.up.railway.app/health`

## Support

Si vous rencontrez des problèmes :
1. Vérifiez les logs Railway
2. Testez le endpoint `/health`
3. Vérifiez la configuration des variables d'environnement
4. Consultez la documentation Railway : [docs.railway.app](https://docs.railway.app)