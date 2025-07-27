# Cahier des charges - PharmCards
## Application de révision pharmaceutique par flashcards

---

## 1. Vue d'ensemble

### 1.1 Objectif
Développer une application web progressive (PWA) de flashcards pour la révision des connaissances pharmaceutiques, avec système de répétition espacée et profils utilisateurs.

### 1.2 Cible utilisateurs
- Étudiants en pharmacie
- Pharmaciens en reprise d'activité
- Professionnels souhaitant maintenir leurs connaissances

### 1.3 Principes directeurs
- **Minimalisme** : Interface épurée, focus sur le contenu
- **Modern Dark UI** : Dark mode par défaut avec option light
- **Mobile-ready** : Responsive design, préparé pour Capacitor
- **Performance** : Chargement rapide, animations fluides
- **Offline-first** : Fonctionnement sans connexion

---

## 2. Spécifications fonctionnelles

### 2.1 Authentification
- [ ] Inscription par email/mot de passe
- [ ] Connexion avec "Se souvenir de moi"
- [ ] Récupération de mot de passe
- [ ] Profil utilisateur simple (nom, avatar, stats)

### 2.2 Gestion des flashcards
- [ ] Organisation en decks thématiques
- [ ] Catégories principales :
  - Antibiotiques
  - Cardiovasculaire
  - Psychotropes
  - Gastro-entérologie
  - Interactions médicamenteuses
  - Contre-indications
- [ ] Import/export de decks (format JSON)
- [ ] Recherche dans les cartes

### 2.3 Système de révision
- [ ] Algorithme de répétition espacée (SM-2 simplifié)
- [ ] 4 niveaux de difficulté : Facile, Correct, Difficile, À revoir
- [ ] Sessions de révision quotidiennes
- [ ] Mode révision rapide (10-20 cartes)
- [ ] Mode étude complète (deck entier)

### 2.4 Progression et statistiques
- [ ] Dashboard personnel avec :
  - Streak de jours consécutifs
  - Cartes révisées aujourd'hui
  - Taux de réussite global
  - Heatmap de révision (style GitHub)
- [ ] Statistiques par deck
- [ ] Points faibles identifiés
- [ ] Objectifs quotidiens personnalisables

### 2.5 Types de contenu
- [ ] Texte simple (question/réponse)
- [ ] Listes (effets secondaires, contre-indications)
- [ ] Tableaux (interactions médicamenteuses)
- [ ] Formules chimiques (notation simplifiée)
- [ ] Tags pour filtrage (#interaction #contre-indication)

---

## 3. Spécifications techniques

### 3.1 Stack technique
- **Frontend** : Vue 3 + Composition API
- **State Management** : Pinia
- **Routing** : Vue Router
- **Build Tool** : Vite
- **CSS** : Tailwind CSS (pour le design system)
- **Icons** : Lucide Icons
- **Backend** : Node.js + Express
- **Database** : PostgreSQL
- **ORM** : Prisma
- **Auth** : JWT + bcrypt

### 3.2 Architecture
```
pharma-flashcards/
├── client/                 # App Vue.js
│   ├── src/
│   │   ├── components/    # Composants réutilisables
│   │   ├── views/        # Pages
│   │   ├── stores/       # Pinia stores
│   │   ├── composables/  # Logique réutilisable
│   │   ├── services/     # API calls
│   │   └── styles/       # Thème et variables
│   └── public/
├── server/                # API Express
│   ├── routes/
│   ├── controllers/
│   ├── models/
│   ├── middleware/
│   └── utils/
└── shared/               # Types et constantes partagés
```

---

## 4. Design System

### 4.1 Palette de couleurs (Dark mode)
```css
--background: #0a0a0a;
--surface: #141414;
--surface-elevated: #1f1f1f;
--primary: #3b82f6;      /* Bleu moderne */
--primary-hover: #2563eb;
--success: #10b981;      /* Vert émeraude */
--warning: #f59e0b;      /* Ambre */
--danger: #ef4444;       /* Rouge */
--text-primary: #f3f4f6;
--text-secondary: #9ca3af;
--text-muted: #6b7280;
--border: #27272a;
```

### 4.2 Typographie
```css
--font-sans: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
--font-mono: 'JetBrains Mono', monospace;

/* Échelle */
--text-xs: 0.75rem;
--text-sm: 0.875rem;
--text-base: 1rem;
--text-lg: 1.125rem;
--text-xl: 1.25rem;
--text-2xl: 1.5rem;
```

### 4.3 Espacements
```css
/* Système 4-8-12-16-24-32-48-64 */
--space-1: 0.25rem;
--space-2: 0.5rem;
--space-3: 0.75rem;
--space-4: 1rem;
--space-6: 1.5rem;
--space-8: 2rem;
--space-12: 3rem;
--space-16: 4rem;
```

### 4.4 Composants UI

#### Carte de révision
```css
.flashcard {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 12px;
  padding: var(--space-6);
  min-height: 300px;
  transition: transform 0.3s, box-shadow 0.3s;
}

.flashcard:hover {
  transform: translateY(-2px);
  box-shadow: 0 10px 30px -10px rgba(0,0,0,0.5);
}
```

#### Boutons
```css
.btn {
  padding: var(--space-2) var(--space-4);
  border-radius: 8px;
  font-weight: 500;
  transition: all 0.2s;
}

.btn-primary {
  background: var(--primary);
  color: white;
}

.btn-ghost {
  background: transparent;
  border: 1px solid var(--border);
}
```

---

## 5. Écrans principaux

### 5.1 Dashboard
- Header avec streak et stats du jour
- Cartes à réviser aujourd'hui
- Decks favoris en accès rapide
- Progression hebdomadaire

### 5.2 Session de révision
- Carte centrale avec animation de flip
- Boutons de difficulté en bas
- Barre de progression en haut
- Timer discret (optionnel)

### 5.3 Gestion des decks
- Grille de decks avec preview
- Barre de recherche
- Filtres par catégorie
- Actions : étudier, éditer, exporter

### 5.4 Statistiques
- Graphiques de progression
- Taux de réussite par catégorie
- Temps moyen par carte
- Cartes les plus difficiles

---

## 6. Animations et micro-interactions

### 6.1 Transitions
- Page changes : fade avec slight scale
- Card flip : rotation 3D réaliste
- Success/fail : subtle shake ou bounce
- Loading states : skeleton screens

### 6.2 Feedback utilisateur
- Hover states sur tous les éléments interactifs
- Ripple effect sur les boutons (mobile)
- Toast notifications pour les actions
- Confetti pour les milestones

---

## 7. Performance

### 7.1 Objectifs
- First Contentful Paint < 1.5s
- Time to Interactive < 3s
- Lighthouse score > 90

### 7.2 Optimisations
- Lazy loading des routes
- Images optimisées (WebP)
- Service Worker pour cache
- Pagination des decks

---

## 8. Sécurité

- [ ] HTTPS obligatoire
- [ ] Rate limiting sur l'API
- [ ] Validation des inputs
- [ ] Sanitization du contenu
- [ ] CORS configuré
- [ ] Variables d'environnement

---

## 9. Phases de développement

### Phase 1 : MVP (4 semaines)
- [ ] Auth basique
- [ ] CRUD flashcards
- [ ] Système de révision simple
- [ ] Dark mode
- [ ] 1 deck de démo (Antibiotiques)

### Phase 2 : Features (3 semaines)
- [ ] Algorithme SM-2
- [ ] Statistiques
- [ ] Import/export
- [ ] Multiple decks

### Phase 3 : Polish (2 semaines)
- [ ] Animations
- [ ] PWA
- [ ] Performance
- [ ] Tests

### Phase 4 : Mobile (2 semaines)
- [ ] Capacitor setup
- [ ] Native features
- [ ] App stores submission

---

## 10. Critères de succès

- Utilisateur peut réviser 20 cartes en < 5 minutes
- Taux de rétention J+30 > 70%
- Performance Lighthouse > 90
- Fonctionne offline après première visite
- Interface intuitive sans tutoriel

---

## 11. Contraintes

- Budget : Hébergement < 20€/mois
- Compatibilité : Chrome, Safari, Firefox (2 dernières versions)
- Responsive : 320px à 1920px
- Accessibilité : WCAG 2.1 niveau AA minimum
