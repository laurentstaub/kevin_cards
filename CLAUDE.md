# CLAUDE.md

Guide de travail pour Claude Code (claude.ai/code) sur ce dépôt.

## Vue d'ensemble

FlashPharma est une application de flashcards en français pour les pharmaciens d'officine et les étudiants en pharmacie. Application complète : API Express, base SQLite, application d'étude publique et panneau d'administration.

**Architecture :** client-serveur, frontend statique en JavaScript vanilla, backend REST séparé.

## Commandes

### Démarrage

```bash
npm run dev     # Tout-en-un avec nodemon, port 8080
```

Un seul processus : `SERVE_STATIC=true PORT=8080 nodemon api/server.js`. Le serveur API sert aussi `public/` et `admin/`, il n'y a pas de proxy. `nodemon.json` restreint la surveillance à `api/` et `database/` et ignore les fichiers `.db`, sinon chaque écriture depuis l'administration redémarrerait le serveur.

- Application d'étude : `http://localhost:8080`
- Administration : `http://localhost:8080/admin`
- Health check : `http://localhost:8080/api/health`

Mode deux processus, utile seulement pour travailler sur `server.js` ou diagnostiquer le proxy :

```bash
npm run dev:api   # API seule, port 3001
npm run dev:web   # Frontend + proxy, port 8080
```

### Base de données

```bash
npm run db:reset    # Supprime le fichier SQLite ; recréé au démarrage suivant
```

Il n'existe pas de script `db:setup` : le schéma (`database/schema-sqlite.sql`) et les migrations (`database/migrations/*.sql`) sont appliqués automatiquement par `api/config/database.js` au démarrage de l'API, si les tables sont absentes.

Scripts ponctuels, à lancer directement :

```bash
node tools/export_db_to_json.js       # Export du contenu vers JSON
node tools/load_questions_to_db.js    # Import depuis JSON
node tools/regenerate_html.js         # Régénération du HTML depuis le Markdown
node database/migrate-questions.js    # Migration historique
```

### Tests

Aucun framework configuré. `npm test` échoue volontairement.

## Structure

```
/
├── server.js               # Serveur frontend : statiques + proxy /api (port 8080)
├── api/
│   ├── server.js           # Serveur API (port 3001)
│   ├── config/database.js  # Connexion SQLite, schéma, migrations
│   ├── models/
│   │   ├── Question.js
│   │   └── Tag.js
│   ├── routes/
│   │   ├── questions.js    # /api/questions
│   │   └── tags.js         # /api/tags
│   └── utils/
│       ├── errors.js       # Classes d'erreur + middleware centralisé
│       ├── logger.js       # Winston
│       └── markdown.js     # Markdown <-> HTML
├── public/                 # Application d'étude
│   ├── index.html
│   ├── css/styles.css
│   └── js/
│       ├── scripts.js          # Point d'entrée (module ES6)
│       ├── progress.js
│       ├── session-setup.js
│       └── modules/            # api-client, filter, flashcard, revision, stats, ui-helpers
├── admin/                  # Panneau d'administration
│   ├── index.html
│   ├── css/admin.css
│   └── js/
│       ├── admin.js
│       └── modules/            # api-client, event-manager, form, modal-manager,
│                               # question, tag, tag-management, ui-helpers, view-manager
├── database/
│   ├── flashpharma.db      # Base SQLite (NON versionnée)
│   ├── schema-sqlite.sql   # Schéma de référence
│   ├── schema.sql          # Ancien schéma PostgreSQL, conservé pour mémoire
│   └── migrations/
├── docs/
├── tools/
└── zz_questions/           # Sources de contenu, fiches, guides de rédaction
```

Note : le frontend vit dans `public/`, pas dans `src/`. Le dossier `src/` n'existe plus.

## Points d'attention techniques

**Base de données : SQLite, pas PostgreSQL.** La migration a eu lieu ; il n'y a plus de dépendance `pg`. `database/schema.sql` est un vestige PostgreSQL, le schéma actif est `schema-sqlite.sql`. `api/config/database.js` expose une fonction `query()` qui imite l'interface de `pg` (`{ rows, rowCount }`) pour limiter la réécriture des modèles.

**Ports.** `PORT` (injecté par la plateforme d'hébergement) est prioritaire, puis `API_PORT` / `FRONTEND_PORT` de `.env`, puis les défauts 3001 / 8080.

**Helmet est monté sur `/api` uniquement.** Les pages statiques chargent des polices Google et Font Awesome depuis des CDN, que la politique de sécurité du contenu de l'API interdit.

**Déploiement mono-processus.** Avec `NODE_ENV=production` (ou `SERVE_STATIC=true`), `api/server.js` sert aussi `public/` et `admin/`. C'est aussi le mode de développement par défaut : `server.js` et son proxy ne servent plus qu'au diagnostic.

**Migration cassée.** `database/migrations/001_add_html_columns.sql` utilise `ALTER TABLE ... ADD COLUMN IF NOT EXISTS`, une syntaxe que SQLite ne connaît pas : la migration échoue à chaque démarrage sur une base neuve (`near "EXISTS": syntax error`). Sans conséquence — les colonnes sont déjà créées par `schema-sqlite.sql` et `runMigrations()` avale l'erreur — mais le message pollue les journaux.

**`http-proxy-middleware` v3.** Les gestionnaires d'événements se déclarent sous la clé `on: { error, proxyReq, proxyRes }`, pas via `onError` / `onProxyReq` (syntaxe v2, silencieusement ignorée).

**Cycle de vie d'une question.** Le système de statuts éditoriaux a été retiré (`database/remove_status_system.sql`). Il reste `is_active` (la carte est-elle servie à l'application d'étude) et `deleted_at` (suppression logique, réversible via `PATCH /api/questions/:id/restore`). La route `/api/questions/published` est un alias historique qui redirige vers `/active`.

**Markdown source de vérité.** `question_text` et `answer_text` contiennent le Markdown. `question_html` et `answer_html` sont un cache de rendu, régénérable par `POST /api/questions/:id/regenerate-html`. Ne jamais éditer le HTML directement.

## Rédaction du contenu

### Une question, un concept

- À éviter : les questions composées reliées par « et » — les scinder en deux cartes.
- Chaque question teste un point de connaissance précis.
- Exemple : plutôt que « Quels sont les effets indésirables ET les contre-indications de l'amoxicilline ? », créer deux cartes.

### Mise en forme des réponses

- Phrases complètes avec sujet et verbe hors des listes.
- Les puces sont acceptables pour les énumérations, mais doivent être introduites par une phrase complète.
- Correct : « Les contre-indications absolues de l'amoxicilline sont les suivantes : » suivi des puces.
- À éviter : les fragments isolés comme « Allergie pénicillines ».
- Correct : « Une allergie aux pénicillines constitue une contre-indication absolue. »

### Exemple de réécriture

Version trop télégraphique :

> Venlafaxine : IRSNA avec profil dose-dépendant.
> Faibles doses : effet sérotoninergique prédominant
> Fortes doses (>150 mg) : inhibition significative recapture noradrénaline → effet noradrénergique → stimulation α1 et β1 → hypertension artérielle
> Surveillance TA recommandée dès 225 mg/j. Mécanisme direct, non lié à une interaction.

Version attendue :

> La venlafaxine est un IRSNA avec un profil dose-dépendant.
> À faibles doses, l'effet sérotoninergique est prédominant. À fortes doses (>150 mg), il se produit une inhibition significative de la recapture de la noradrénaline → effet noradrénergique → stimulation des récepteurs α1 et β1 → hypertension artérielle.
> La surveillance de la tension artérielle est recommandée dès une dose de 225 mg/j. Ce mécanisme est direct, non lié à une interaction.

### Structure

- Commencer par une phrase qui pose le contexte.
- Utiliser les puces pour les listes, correctement introduites.
- Terminer par une synthèse ou la portée clinique quand c'est pertinent.

### Ajouter des questions

**Via le panneau d'administration (recommandé) :** `/admin` → « Nouvelle question » → Markdown, tags, difficulté → prévisualisation → enregistrement.

**Via import JSON :** placer les questions dans `zz_questions/`, puis `node tools/load_questions_to_db.js`, et vérifier dans l'administration.

## Conventions de code

### Général

**Pas d'emoji ni d'emoticône** dans le code, la documentation, les commentaires ou les sorties console.

- Correct : `console.log('Migration completed successfully');`
- À éviter : `console.log('✅ Migration completed successfully');`

Toutes les sorties console, les messages d'erreur et les textes visibles par l'utilisateur restent sobres et sans caractères décoratifs.

### API

- Valider les entrées avec Joi.
- Requêtes paramétrées systématiquement, jamais de concaténation SQL.
- Ne pas exposer d'information sensible dans les messages d'erreur renvoyés au client.
- Conventions REST : GET pour lire, POST pour créer, PUT / PATCH pour modifier, DELETE pour supprimer. Codes HTTP appropriés.
- Erreurs : format de réponse homogène, journalisation côté serveur via `utils/logger.js`, classes d'erreur de `utils/errors.js`, `try / catch` sur toute opération base.

### Base de données

- Index sur les colonnes fréquemment filtrées.
- Pagination systématique sur les listes.
- Éviter les requêtes N+1.
- Transactions pour les opérations liées.
- Contraintes de clé étrangère et `NOT NULL` là où c'est pertinent.

## État et priorités

**Fait :** base SQLite, API REST, panneau d'administration, sécurité de base (Helmet, CORS, limitation de débit), journalisation Winston, gestion d'erreurs centralisée, déploiement mono-processus.

**Manquant, par ordre de priorité :**

1. **Authentification.** `/admin` expose tout le CRUD sans contrôle d'accès. Bloquant pour toute exposition publique. La table `users` et les dépendances `bcryptjs` / `jsonwebtoken` sont déjà là.
2. **Tests.** Aucun framework configuré.
3. Répétition espacée et suivi de progression côté serveur (aujourd'hui en stockage local du navigateur).
4. Fonctionnalités PWA : hors-ligne, installation.

## Fichiers de référence

| Sujet | Fichier |
| :--- | :--- |
| Configuration | `.env` (modèle : `.env.example`) |
| Spécifications | `docs/00_requirements.md` |
| Déploiement | `docs/RAILWAY_DEPLOYMENT.md`, `railway.json` |
| Schéma actif | `database/schema-sqlite.sql` |
| Connexion base | `api/config/database.js` |
| Modèle Question | `api/models/Question.js` |
| Routes questions | `api/routes/questions.js` |
| Logique d'étude | `public/js/scripts.js` |
| Thème et variables CSS | `public/css/styles.css` |
| Logique d'administration | `admin/js/admin.js` |
