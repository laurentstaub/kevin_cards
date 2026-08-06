# FlashPharma

Application de cartes mémoire (flashcards) en français pour les pharmaciens d'officine et les étudiants en pharmacie. Interface d'étude publique + panneau d'administration pour la gestion du contenu.

## 1. Architecture

Trois composants dans un seul dépôt :

| Dossier | Rôle |
| :--- | :--- |
| `public/` | Application d'étude (SPA, JavaScript vanilla en modules ES6) |
| `admin/` | Panneau d'administration du contenu (SPA, modules IIFE) |
| `api/` | API REST Node.js / Express, base SQLite |

Deux processus en développement :

1. **Serveur frontend** (`server.js`, port 8080) : sert les fichiers statiques de `public/` et `admin/`, et proxifie `/api/*` vers le serveur API.
2. **Serveur API** (`api/server.js`, port 3001) : logique métier, accès base, rendu Markdown → HTML.

En production, un seul processus suffit : `api/server.js` sert aussi les fichiers statiques quand `NODE_ENV=production` (ou `SERVE_STATIC=true`). Voir la section Déploiement.

## 2. Pile technique

| Composant | Technologie |
| :--- | :--- |
| Frontend | JavaScript vanilla (ES6+), HTML5, CSS3 |
| Backend | Node.js 18+, Express 4 |
| Base de données | SQLite (`sqlite3` + `sqlite`) |
| Sécurité | Helmet, CORS, `express-rate-limit` |
| Journalisation | Winston |
| Markdown | `marked` (rendu serveur), `turndown` (HTML → Markdown) |

## 3. Démarrage

### Prérequis

- Node.js 18 ou supérieur
- npm

Aucun serveur de base de données à installer : SQLite écrit dans un fichier local.

### Installation

```bash
git clone https://github.com/laurentstaub4/kevin_cards.git
cd kevin_cards
npm install
cp .env.example .env
```

### Lancement

Une seule commande, un seul processus :

```bash
npm run dev
```

Le serveur API sert aussi le frontend et l'administration : tout est sur le port 8080, sans proxy. `nodemon` ne surveille que `api/` et `database/` (voir `nodemon.json`), donc éditer le frontend ne redémarre pas le serveur.

### Accès

- Application d'étude : `http://localhost:8080`
- Panneau d'administration : `http://localhost:8080/admin`
- Health check : `http://localhost:8080/api/health`

### Mode deux processus (optionnel)

Utile uniquement pour travailler sur `server.js` ou diagnostiquer le proxy :

```bash
npm run dev:api   # API seule, port 3001
npm run dev:web   # Frontend + proxy, port 8080
```

Dans ce mode l'ordre compte : sans l'API, le frontend renvoie `502 API server unreachable`.

La base `database/flashpharma.db` est créée automatiquement au premier démarrage à partir de `database/schema-sqlite.sql`, puis les fichiers de `database/migrations/` sont appliqués.

## 4. Scripts npm

| Commande | Effet |
| :--- | :--- |
| `npm run dev` | Tout-en-un avec rechargement automatique, port 8080 |
| `npm start` | Tout-en-un sans rechargement, port 8080 |
| `npm run dev:api` | API seule avec nodemon, port 3001 |
| `npm run dev:web` | Frontend + proxy seul, port 8080 |
| `npm run db:reset` | Supprime `database/flashpharma.db` ; la base est recréée au démarrage suivant |

Les scripts de maintenance ponctuels vivent dans `tools/` et se lancent directement avec `node` :

```bash
node tools/export_db_to_json.js
node tools/load_questions_to_db.js
node tools/regenerate_html.js
```

Aucun framework de test n'est configuré : `npm test` échoue volontairement.

## 5. Configuration

Tout passe par `.env` (voir `.env.example`).

| Variable | Défaut | Rôle |
| :--- | :--- | :--- |
| `NODE_ENV` | `development` | Bascule les défauts de sécurité et le service des fichiers statiques |
| `FRONTEND_PORT` | `8080` | Port du serveur frontend |
| `API_PORT` | `3001` | Port du serveur API |
| `PORT` | — | Injecté par la plateforme d'hébergement ; prioritaire sur les deux précédents |
| `FRONTEND_URL` | `http://localhost:8080` | Origine autorisée par CORS |
| `API_URL` | `http://localhost:$API_PORT` | Cible du proxy `/api` |
| `SERVE_STATIC` | `true` si production | Le processus API sert aussi `public/` et `admin/` |
| `SQLITE_DB_PATH` | `./database/flashpharma.db` | Fichier de base |
| `RATE_LIMIT_MAX_REQUESTS` | 1000 en dev, 100 en prod | Requêtes par fenêtre |
| `RATE_LIMIT_WINDOW_MS` | `900000` | Fenêtre de limitation (15 min) |

## 6. Base de données

Tables : `questions`, `tags`, `question_tags`, `question_versions`, `study_sessions`, `users`.

Colonnes principales de `questions` :

- `question_text`, `answer_text` : source Markdown, seule référence éditoriale
- `question_html`, `answer_html` : rendu HTML mis en cache, régénérable via l'API
- `is_active` : la carte est-elle servie à l'application d'étude
- `deleted_at` : suppression logique, réversible
- `sources`, `metadata`, `review_history` : JSON sérialisé

Le fichier `database/flashpharma.db` **n'est pas versionné** (voir `.gitignore`). Pour sauvegarder ou partager le contenu, exporter en JSON :

```bash
node tools/export_db_to_json.js
```

## 7. API

Base : `/api`. Toutes les réponses sont en JSON.

### Questions

| Méthode | Route | Description |
| :--- | :--- | :--- |
| GET | `/api/questions/active` | Cartes actives, servies à l'application d'étude |
| GET | `/api/questions/published` | Alias historique, redirige (307) vers `/active` |
| GET | `/api/questions` | Liste paginée et filtrable (`page`, `limit`, `active`, `tagIds`, `search`, `orderBy`, `orderDirection`) |
| GET | `/api/questions/:id` | Détail d'une question |
| GET | `/api/questions/:id/rendered` | Question avec HTML rendu |
| POST | `/api/questions` | Création |
| PUT | `/api/questions/:id` | Mise à jour |
| PUT | `/api/questions/:id/tags` | Remplacement des tags associés |
| PATCH | `/api/questions/:id/toggle-active` | Active ou désactive la carte |
| PATCH | `/api/questions/:id/restore` | Annule une suppression logique |
| DELETE | `/api/questions/:id` | Suppression logique |
| POST | `/api/questions/:id/regenerate-html` | Régénère le HTML depuis le Markdown |

### Tags

| Méthode | Route | Description |
| :--- | :--- | :--- |
| GET | `/api/tags` | Liste (`priorityOrder=true` pour l'ordre d'affichage) |
| GET | `/api/tags/categories` | Catégories de tags |
| GET | `/api/tags/stats` | Statistiques d'usage |
| GET | `/api/tags/most-used` | Tags les plus utilisés |
| GET | `/api/tags/priority` | Tags prioritaires |
| GET | `/api/tags/:id` | Détail |
| GET | `/api/tags/:id/questions` | Questions portant ce tag |
| POST | `/api/tags` | Création |
| PUT | `/api/tags/:id` | Mise à jour |
| POST | `/api/tags/:id/merge` | Fusion de deux tags |
| DELETE | `/api/tags/:id` | Suppression |

### Santé

`GET /api/health` renvoie l'état du service. Cette route est exclue de la limitation de débit.

## 8. Fonctionnalités

### Application d'étude

- Cartes recto-verso avec animation de retournement
- Sessions configurables : nombre de questions, mode, difficulté
- Filtrage par tags et catégories
- Suivi de progression et statistiques (stockage local du navigateur)
- Mode révision sur les cartes en difficulté
- Thème clair / sombre

### Panneau d'administration

- CRUD complet sur les questions et les tags
- Éditeur Markdown avec prévisualisation HTML
- Activation / désactivation des cartes, suppression réversible
- Gestion des sources et citations
- Recherche, filtres et tri
- Fusion de tags

## 9. Déploiement

La configuration `railway.json` lance un seul processus :

```json
"startCommand": "node api/server.js",
"healthcheckPath": "/api/health"
```

Avec `NODE_ENV=production`, `api/server.js` sert `public/` et `admin/` en plus de l'API : le serveur frontend et son proxy ne sont pas nécessaires. Variables à définir sur la plateforme : `NODE_ENV=production`, `FRONTEND_URL` (URL publique de l'application) et, si le disque est éphémère, `SQLITE_DB_PATH` pointant vers un volume persistant.

Voir `docs/RAILWAY_DEPLOYMENT.md` pour le détail.

## 10. Limites connues

- **Pas d'authentification.** `/admin` expose l'intégralité du CRUD sans contrôle d'accès. Acceptable en local, bloquant dès que l'application est exposée publiquement. La table `users` et les dépendances `bcryptjs` / `jsonwebtoken` sont présentes mais inutilisées.
- **Pas de tests automatisés.**
- **SQLite sur disque éphémère.** Sur un hébergement sans volume persistant, la base est réinitialisée à chaque redéploiement.
