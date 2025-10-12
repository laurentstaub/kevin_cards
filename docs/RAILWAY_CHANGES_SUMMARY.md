# Résumé des modifications pour Railway.app

## Fichiers modifiés/créés

### 1. `package.json`
- **Modifié** : Script `start` changé de `node server.js` vers `node api/server.js`
- **Ajouté** : Script `start:proxy` pour maintenir l'ancienne fonctionnalité si nécessaire

### 2. `api/config/database.js`
- **Modifié** : Support ajouté pour `DATABASE_URL` (format Railway)
- **Ajouté** : Configuration SSL automatique pour la production
- **Maintenu** : Compatibilité avec les variables individuelles (DB_HOST, DB_PORT, etc.)

### 3. `api/server.js`
- **Ajouté** : Imports pour `path` et `fileURLToPath`
- **Ajouté** : Serveur de fichiers statiques pour `/public` et `/admin`
- **Ajouté** : Route catch-all pour le routing client-side
- **Maintenu** : Toutes les fonctionnalités API existantes

### 4. `.env.example` (nouveau)
- **Créé** : Template des variables d'environnement pour Railway
- **Inclut** : Configuration base de données, CORS, rate limiting

### 5. `railway.json` (nouveau)
- **Créé** : Configuration Railway avec Nixpacks
- **Inclut** : Health check, politiques de redémarrage

### 6. `RAILWAY_DEPLOYMENT.md` (nouveau)
- **Créé** : Guide complet de déploiement en français
- **Inclut** : Instructions étape par étape, dépannage, maintenance

## Architecture de déploiement

**Avant** (développement local) :
- `server.js` (port 8080) → Proxy vers `api/server.js` (port 8084)
- Deux serveurs séparés

**Après** (Railway) :
- `api/server.js` seul (port 8084)
- Sert l'API ET les fichiers statiques
- Déploiement à service unique

## Variables d'environnement requises sur Railway

```
DATABASE_URL=postgresql://...     # Fourni automatiquement par Railway
PORT=8084                        # Détecté automatiquement
NODE_ENV=production
CORS_ORIGINS=https://votre-app.up.railway.app
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
```

## Étapes de déploiement rapide

1. **Pousser le code sur GitHub**
2. **Créer un projet Railway** depuis GitHub
3. **Ajouter PostgreSQL** au projet
4. **Configurer les variables d'environnement**
5. **Déployer automatiquement**

## Points importants

- ✅ **Compatibilité maintenue** : L'application fonctionne toujours localement
- ✅ **Single service** : Optimisé pour Railway (un seul service)
- ✅ **Base de données** : Support Railway DATABASE_URL + variables individuelles
- ✅ **Frontend** : Fichiers statiques servis directement par l'API
- ✅ **Health check** : Endpoint `/health` pour monitoring Railway
- ✅ **Routing** : Support complet du routing client-side

## Test en local

Pour tester la configuration Railway localement :

```bash
# Utiliser le nouveau point d'entrée
npm start

# Vérifier que tout fonctionne
curl http://localhost:8084/health
curl http://localhost:8084/api/questions
```

L'application devrait servir :
- API sur `/api/*`
- Frontend sur `/`
- Admin sur `/admin`
- Health check sur `/health`