# Déploiement sur Railway

FlashPharma se déploie en **un seul processus** : `api/server.js` sert l'API et, en production, les fichiers statiques de `public/` et `admin/`. Le serveur frontend (`server.js`) et son proxy ne servent qu'en développement local.

## Prérequis

- Un compte Railway
- Le dépôt sur GitHub

Aucune base de données à provisionner : FlashPharma utilise SQLite, un simple fichier.

## Configuration

`railway.json` est déjà en place :

```json
{
  "build": { "builder": "NIXPACKS" },
  "deploy": {
    "startCommand": "node api/server.js",
    "healthcheckPath": "/api/health",
    "healthcheckTimeout": 100,
    "restartPolicyType": "ON_FAILURE",
    "restartPolicyMaxRetries": 10
  }
}
```

### Variables d'environnement

À définir dans l'onglet « Variables » du service :

| Variable | Valeur | Obligatoire |
| :--- | :--- | :--- |
| `NODE_ENV` | `production` | oui — active le service des fichiers statiques |
| `FRONTEND_URL` | `https://votre-app.up.railway.app` | oui — origine autorisée par CORS |
| `SQLITE_DB_PATH` | `/data/flashpharma.db` | oui si volume persistant (voir ci-dessous) |
| `RATE_LIMIT_MAX_REQUESTS` | `100` | non — défaut en production |
| `RATE_LIMIT_WINDOW_MS` | `900000` | non |
| `LOG_LEVEL` | `info` | non |

Ne pas définir `PORT` : Railway l'injecte, et le serveur l'utilise en priorité.

## Persistance de la base

Le système de fichiers d'un conteneur Railway est éphémère : **sans volume, la base est réinitialisée à chaque redéploiement.**

1. Dans le service, ajouter un volume monté sur `/data`.
2. Définir `SQLITE_DB_PATH=/data/flashpharma.db`.
3. Au premier démarrage, la base est créée vide à partir de `database/schema-sqlite.sql`.

Pour importer le contenu existant, exporter en local puis recharger :

```bash
# En local
node tools/export_db_to_json.js

# Committer le JSON produit, puis, une fois déployé, depuis le shell Railway
node tools/load_questions_to_db.js
```

## Déploiement

1. Pousser le code sur GitHub.
2. Sur Railway : « New Project » → « Deploy from GitHub repo » → sélectionner le dépôt.
3. Ajouter les variables d'environnement ci-dessus.
4. Ajouter le volume sur `/data`.
5. Générer un domaine public dans l'onglet « Settings ».
6. Renseigner ce domaine dans `FRONTEND_URL` et redéployer.

## Vérification

```bash
curl https://votre-app.up.railway.app/api/health
# {"status":"healthy","timestamp":"...","database":"SQLite"}
```

L'application d'étude répond sur `/`, l'administration sur `/admin`.

## Avertissement

`/admin` n'est protégé par aucune authentification. Tant que ce n'est pas corrigé, un déploiement public expose l'intégralité des opérations d'écriture sur le contenu. Restreindre l'accès en amont (mot de passe au niveau du proxy, réseau privé) ou différer la mise en ligne.

## Dépannage

| Symptôme | Cause probable |
| :--- | :--- |
| Health check en échec | `startCommand` ou `healthcheckPath` modifié ; vérifier les journaux de démarrage |
| Page blanche, 404 sur les assets | `NODE_ENV` n'est pas `production` : les fichiers statiques ne sont pas servis. Alternative : `SERVE_STATIC=true` |
| Erreurs CORS dans la console | `FRONTEND_URL` absent ou différent du domaine public |
| Base vide après redéploiement | Pas de volume monté, ou `SQLITE_DB_PATH` hors du volume |
| 429 Too Many Requests | Relever `RATE_LIMIT_MAX_REQUESTS` |
