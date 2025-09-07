# Guide de Rédaction des Questions JSON pour FlashPharma

## Structure JSON Générale

### Format du Fichier
```json
{
  "metadata": {
    "title": "Titre de la collection",
    "total_cards": 65,
    "available_tags": ["Tag1", "Tag2", "Tag3"],
    "tag_categories": {
      "therapeutic_area": ["Antibiotiques", "Cardiovasculaire"],
      "drug_class": ["Beta-lactamines", "Macrolides"],
      "topic": ["Mécanisme-action", "Pharmacocinétique"]
    }
  },
  "flashcards": [
    {
      "id": 1,
      "tags": ["Antibiotiques", "Beta-lactamines"],
      "question": "<div class=\"card-content\">...</div>",
      "answer": "<div class=\"card-content\">...</div>",
      "difficulty": "medium",
      "source": "Manuel de pharmacologie 2024"
    }
  ]
}
```

## Standards de Rédaction

### 1. Structure des Questions

#### Règle Fondamentale
**Une question = Un concept unique**
- Ne JAMAIS combiner plusieurs concepts avec "et" (and)
- Chaque carte doit tester une connaissance spécifique
- Si une question nécessite plusieurs parties, créer plusieurs cartes

#### Exemples
❌ **Mauvais:** "Quels sont les effets indésirables ET les contre-indications de l'amoxicilline?"

✅ **Bon:** 
- Carte 1: "Quels sont les principaux effets indésirables de l'amoxicilline?"
- Carte 2: "Quelles sont les contre-indications de l'amoxicilline?"

### 2. Format HTML pour Questions et Réponses

#### Structure de Base
```html
<div class="card-content">
  <p>Contenu de la question ou réponse</p>
</div>
```

#### Classes CSS Disponibles

##### Pour les Médicaments
```html
<!-- Nom de médicament -->
<strong class="drug-name">amoxicilline</strong>

<!-- Classe thérapeutique -->
<span class="drug-class">bêta-lactamine</span>

<!-- Dosage -->
<span class="dosage-info">500 mg, 3 fois par jour</span>
```

##### Pour les Alertes et Avertissements
```html
<!-- Alerte importante -->
<div class="alert alert-danger">
  <strong>Contre-indication absolue:</strong> Allergie aux pénicillines
</div>

<!-- Avertissement -->
<div class="alert alert-warning">
  <strong>Précaution:</strong> Surveiller la fonction rénale
</div>

<!-- Information -->
<div class="alert alert-info">
  <strong>Note:</strong> Conservation au réfrigérateur
</div>
```

##### Pour la Mise en Forme
```html
<!-- Texte important -->
<strong>Effet principal:</strong>

<!-- Emphase -->
<em>Staphylococcus aureus</em>

<!-- Liste à puces -->
<ul>
  <li>Premier point</li>
  <li>Deuxième point</li>
</ul>

<!-- Liste numérotée -->
<ol>
  <li>Étape 1</li>
  <li>Étape 2</li>
</ol>
```

### 3. Standards de Rédaction des Réponses

#### Structure Grammaticale
- **Utiliser des phrases complètes** avec sujet-verbe-complément
- **Introduire les listes** par une phrase complète
- **Éviter les fragments** sans verbe

#### Exemples de Bonnes Pratiques

❌ **Mauvais:**
```html
<div class="card-content">
  <p>Allergie pénicillines</p>
  <p>Insuffisance rénale sévère</p>
</div>
```

✅ **Bon:**
```html
<div class="card-content">
  <p>Les contre-indications de l'amoxicilline sont les suivantes:</p>
  <ul>
    <li>Une allergie connue aux pénicillines constitue une contre-indication absolue</li>
    <li>L'insuffisance rénale sévère nécessite un ajustement posologique</li>
  </ul>
</div>
```

#### Structure d'une Réponse Complète
1. **Phrase d'introduction** contextualisant la réponse
2. **Corps principal** avec l'information détaillée
3. **Synthèse ou pertinence clinique** (si approprié)

### 4. Utilisation des Tags

#### Catégories de Tags

##### therapeutic_area (Domaine thérapeutique)
- Antibiotiques
- Cardiovasculaire
- Neurologie
- Endocrinologie
- Antalgiques

##### drug_class (Classe médicamenteuse)
- Beta-lactamines
- Macrolides
- IEC
- Statines
- AINS

##### topic (Sujet/Concept)
- Mécanisme-action
- Pharmacocinétique
- Interactions-majeures
- Contre-indications-absolues
- Effets-indésirables-graves

##### situation (Contexte clinique)
- Urgences
- Grossesse
- Pédiatrie
- Gériatrie

### 5. Niveaux de Difficulté

#### easy (Facile)
- Définitions simples
- Mécanismes d'action basiques
- Classifications principales

#### medium (Moyen)
- Interactions médicamenteuses courantes
- Effets indésirables fréquents
- Posologies standards

#### hard (Difficile)
- Cas cliniques complexes
- Interactions rares mais graves
- Mécanismes moléculaires détaillés

## Exemples Complets

### Exemple 1: Question Simple
```json
{
  "id": 1,
  "tags": ["Antibiotiques", "Beta-lactamines", "Mécanisme-action"],
  "question": "<div class=\"card-content\"><p>Quel est le mécanisme d'action des <strong>bêta-lactamines</strong>?</p></div>",
  "answer": "<div class=\"card-content\"><p>Les bêta-lactamines inhibent la synthèse de la paroi bactérienne en se liant aux <strong>PLP (protéines liant les pénicillines)</strong>.</p><p>Cette liaison empêche la réticulation du peptidoglycane, fragilisant ainsi la paroi bactérienne et provoquant la lyse osmotique.</p></div>",
  "difficulty": "easy",
  "source": "Manuel de pharmacologie 2024"
}
```

### Exemple 2: Question avec Alerte
```json
{
  "id": 2,
  "tags": ["Antibiotiques", "Fluoroquinolones", "Interactions-majeures"],
  "question": "<div class=\"card-content\"><p>Pourquoi faut-il espacer la prise de <strong class=\"drug-name\">ciprofloxacine</strong> des antiacides?</p></div>",
  "answer": "<div class=\"card-content\"><p>Les fluoroquinolones forment des <strong>complexes insolubles (chélation)</strong> avec les cations divalents.</p><div class=\"alert alert-warning\"><strong>Important:</strong> Réduction de l'absorption de 50-90%</div><p>L'espacement de <strong>2h avant ou 6h après</strong> permet d'éviter cette interaction.</p></div>",
  "difficulty": "medium",
  "source": "Guide des interactions médicamenteuses"
}
```

### Exemple 3: Question avec Liste
```json
{
  "id": 3,
  "tags": ["Cardiovasculaire", "Statines", "Effets-indésirables-graves"],
  "question": "<div class=\"card-content\"><p>Quels sont les signes de <strong>rhabdomyolyse</strong> sous statines?</p></div>",
  "answer": "<div class=\"card-content\"><p>La rhabdomyolyse sous statines se manifeste par une triade caractéristique:</p><ol><li><strong>Douleurs musculaires</strong> intenses et diffuses</li><li><strong>Faiblesse musculaire</strong> importante</li><li><strong>Urines foncées</strong> (myoglobinurie)</li></ol><div class=\"alert alert-danger\"><strong>Urgence:</strong> Arrêt immédiat des statines et hospitalisation</div></div>",
  "difficulty": "hard",
  "source": "Recommandations HAS 2024"
}
```

## Checklist de Validation

Avant d'ajouter une question, vérifier:

### Structure
- [ ] La question teste UN SEUL concept
- [ ] Le HTML est correctement formaté avec `<div class="card-content">`
- [ ] Les balises HTML sont correctement fermées

### Contenu
- [ ] Les phrases sont complètes (sujet-verbe-complément)
- [ ] Les listes sont introduites par une phrase
- [ ] Les noms de médicaments utilisent la classe `drug-name`
- [ ] Les alertes utilisent les classes appropriées

### Métadonnées
- [ ] Au moins 2 tags sont attribués
- [ ] Le niveau de difficulté est approprié
- [ ] La source est mentionnée

### Qualité
- [ ] L'information est exacte et à jour
- [ ] La réponse est suffisamment détaillée
- [ ] Le langage est professionnel et clair
- [ ] Pas d'emojis ou caractères décoratifs

## Commandes Utiles pour la Migration

### Conversion depuis Markdown
Si vous écrivez en Markdown, utilisez l'API de conversion:
```bash
POST /api/questions/preview
{
  "questionText": "**Question** en markdown",
  "answerText": "**Réponse** en markdown"
}
```

### Import en Base de Données
1. Placer le fichier JSON dans `zz_questions/questions/`
2. Exécuter: `npm run migrate:preview` pour vérifier
3. Exécuter: `npm run migrate:execute` pour importer

## Ressources Supplémentaires

- `/zz_questions/guides/00_guide_redaction_ia.md` - Guide pour l'utilisation de l'IA
- `/tools/json_card_viewer.html` - Visualiseur de cartes JSON
- `/admin` - Interface d'administration pour créer/éditer les questions