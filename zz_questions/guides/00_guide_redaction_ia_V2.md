# Guide de rédaction IA pour guides médicaux spécialisés

## Objectif

Ce guide méthodologique permet à une IA de rédiger des guides médicaux spécialisés de haute qualité, structurés, sourcés et utilisables par des professionnels de santé, en s'inspirant du modèle du "Guide complet des anticoagulants".

## Structure standardisée obligatoire

### 1. En-tête et titre

- **Format** : "Guide des [domaine médical spécifique]"
- **Exemple** : "Guide des anticoagulants"

### 2. Section acronymes (obligatoire)

```markdown
## Acronymes et abréviations

**SIGLE** : Définition complète
```

- Lister TOUS les acronymes utilisés dans le document
- Ordre alphabétique strict
- Inclure organismes (ANSM, HAS, ESC), mécanismes biologiques (CYP3A4, P-gp), paramètres cliniques (INR, TCA, DFG), pathologies (TVP, TIH)
- **Minimum 10-15 acronymes** pour un guide complet

### 3. Introduction tripartite (obligatoire)

#### A. Prévalence et enjeux épidémiologiques (5 lignes environ)

- Données chiffrées précises avec projections temporelles
- Impact de santé publique quantifié (hospitalisations, décès, coûts)
- **OBLIGATOIRE** : 1-2 liens hypertextes vers sources épidémiologiques fiables
- **Exemple** : "[En France, 1,1 million de patients sont traités par AVK avec plus de 17 000 hospitalisations annuelles](https://claude.ai/chat/URL)"

#### B. Rappels physiologiques essentiels (15-20 lignes environ)

- Mécanismes fondamentaux avec vocabulaire technique précis
- Voies métaboliques principales et cascades enzymatiques
- Régulations hormonales et feedback physiologiques
- Physiopathologie de base avec cibles thérapeutiques
- **Format** : Paragraphes denses, transitions logiques entre concepts
- **Éléments en gras** : Points physiologiques clés

#### C. Stratégies thérapeutiques par classes (15-20 lignes environ)

- Résumé exhaustif des approches thérapeutiques
- Mécanismes d'action différenciés avec spécificités
- **Format** : Puces structurées avec **médicament/classe en gras**
- Bénéfices cliniques chiffrés avec données d'efficacité
- **Exemple** : "• **NACO** : Inhibition directe, **fenêtre thérapeutique large**, pas de surveillance systématique"

### 4. Corps du document

#### Structure par classes médicamenteuses

```markdown
## Les [classe thérapeutique] [verbe d'action] [bénéfice principal]
```

**Exemples de titres dynamiques** :

- "Les héparines sécurisent l'anticoagulation hospitalière immédiate"
- "Les nouveaux anticoagulants oraux révolutionnent la prise en charge"
- "Les inhibiteurs de pompe à protons transforment le traitement des ulcères"

#### Contenu de chaque section

1. **Paragraphe d'introduction** : Vue d'ensemble avec positionnement clinique
2. **Détails par molécule/sous-classe** organisés logiquement :
   - Noms commerciaux systématiquement entre parenthèses
   - **Posologies précises** avec unités et fréquences exactes
   - Mécanismes d'action avec cibles moléculaires
   - Effets secondaires principaux avec fréquences
   - Contre-indications absolues et relatives
   - Populations spéciales (âge, insuffisance rénale/hépatique)
3. **Données chiffrées systématiques** : Pourcentages d'efficacité, durées d'action, demi-vies, clairances
4. **Comparaisons inter-molécules** avec avantages/inconvénients
5. **Éléments en gras** : Points clés, bénéfices majeurs, risques critiques

## Intégration des schémas Mermaid

### Moment optimal d'intégration

**Recommandation : Intégration dès la phase de conception** pour une meilleure cohérence narrative et pédagogique.

### Critères d'inclusion des diagrammes Mermaid

- **Algorithmes thérapeutiques complexes** : Arbres de décision multi-critères
- **Cascades physiopathologiques** : Mécanismes d'action en chaîne
- **Parcours de soins** : Timelines de traitement et surveillance
- **Interactions médicamenteuses** : Réseaux complexes de contre-indications
- **Classifications hiérarchiques** : Scores de risque, stades évolutifs

### Types de diagrammes par section

#### Introduction : Mindmaps et Overview

~~~markdown
## Physiopathologie de [pathologie]

```mermaid
mindmap
  root((Pathologie))
    Facteurs de risque
      Génétiques
      Environnementaux
    Mécanismes
      Voie A
      Voie B
    Conséquences
      Complications
      Pronostic
#### Corps du document : Flowcharts décisionnels
```markdown
## Algorithme de prescription

```mermaid
flowchart TD
    A[Patient éligible] --> B{Contre-indications ?}
    B -->|Oui| C[Alternative thérapeutique]
    B -->|Non| D[Posologie standard]
    D --> E{Ajustement nécessaire ?}
    E -->|Oui| F[Dose adaptée]
    E -->|Non| G[Surveillance standard]
    
    style A fill:#e8f4f8
    style C fill:#ffebee
    style G fill:#e8f5e8
#### Suivi thérapeutique : Timelines et Gantt
```markdown
## Calendrier de surveillance

```mermaid
gantt
    title Suivi thérapeutique sur 12 mois
    dateFormat YYYY-MM-DD
    section Bilans biologiques
    Bilan initial    :active, bio1, 2024-01-01, 1d
    Contrôle M1      :bio2, 2024-02-01, 1d
    Contrôle M3      :bio3, 2024-04-01, 1d
    Bilan annuel     :bio4, 2024-12-01, 1d
    section Consultations
    Initiation       :active, consult1, 2024-01-01, 1d
    Suivi M6         :consult2, 2024-07-01, 1d
### Règles d'intégration technique

#### Placement stratégique
- **Après l'introduction conceptuelle** : Le diagramme illustre le propos
- **Avant les détails techniques** : Vue d'ensemble puis approfondissement
- **En complément des tableaux** : Visualisation des données complexes

#### Formatting Mermaid standardisé
```markdown
### Titre explicite du processus

```mermaid
[type] [orientation]
    [contenu structuré]
    
    style [élément] fill:[couleur],stroke:[bordure]
~~~

**Légende obligatoire :** Explication des codes couleurs et symboles

```
#### Codes couleurs médicaux recommandés
- **Vert (#e8f5e8)** : Actions recommandées, objectifs atteints
- **Rouge (#ffebee)** : Contre-indications, alertes, urgences
- **Bleu (#e8f4f8)** : Points d'entrée, situations initiales
- **Orange (#fff3e0)** : Surveillance renforcée, précautions
- **Gris (#f5f5f5)** : Éléments neutres, informations générales

### Avantages de l'intégration précoce

#### Cohérence narrative
- Les diagrammes guident la structure rédactionnelle
- Évite les redondances entre texte et schémas
- Hiérarchise naturellement l'information

#### Optimisation pédagogique
- Apprentissage visuel et textuel complémentaires
- Mémorisation renforcée par double encodage
- Navigation intuitive dans les protocoles complexes

#### Maintenance facilitée
- Synchronisation automatique contenu-schémas
- Versioning unifié des modifications
- Évolutivité technique préservée

### Stratégie d'implémentation

#### Phase 1 : Identification des besoins visuels
1. **Cartographier les processus complexes** du domaine médical
2. **Identifier les points de décision critiques** nécessitant clarification
3. **Recenser les données relationnelles** (interactions, classifications)

#### Phase 2 : Conception des diagrammes
1. **Créer les wireframes** des principaux algorithmes
2. **Définir la charte graphique** avec codes couleurs médicaux
3. **Valider la cohérence** entre diagrammes et contenu textuel

#### Phase 3 : Intégration rédactionnelle
1. **Rédiger en mode "diagramme-first"** : partir du schéma pour détailler
2. **Synchroniser légendes et texte** pour éviter les contradictions
3. **Optimiser le flow lecture** : diagramme → explication → détails

### Exemples d'application par spécialité

#### Cardiologie : Stratification du risque
```markdown
```mermaid
quadrantChart
    title Évaluation risque cardiovasculaire
    x-axis Faible risque --> Risque élevé
    y-axis Jeune --> Âgé
    
    quadrant-1 Prévention secondaire intensive
    quadrant-2 Surveillance rapprochée
    quadrant-3 Prévention primaire standard
    quadrant-4 Évaluation spécialisée
#### Infectiologie : Antibiothérapie
```markdown
```mermaid
flowchart LR
    A[Suspicion infection] --> B{Gravité clinique}
    B -->|Sepsis| C[ATB large spectre immédiat]
    B -->|Modérée| D[Prélèvements puis ATB ciblée]
    B -->|Légère| E[ATB probabiliste]
    
    C --> F[Réévaluation H48]
    D --> F
    E --> G[Contrôle H72]
### Recommandations techniques

#### Compatibilité multi-plateforme
- **Format Mermaid natif** : Compatible Hugo, GitBook, Notion
- **Fallback HTML** : Export statique pour systèmes non compatibles
- **Responsive design** : Adaptation mobile avec zooming

#### Performance et accessibilité
- **Alt text descriptif** : Description textuelle des diagrammes
- **Contrast ratios** : Respect WCAG pour daltoniens
- **Lazy loading** : Chargement optimisé des diagrammes complexes

## Règles de rédaction strictes

### Tonalité et style

- **Registre** : Médical professionnel, scientifique, précis, factuel, accessible aux experts
- **Temps** : Présent de l'indicatif principalement
- **Voix** : Active privilégiée pour la clarté
- **Longueur phrases** : Moyennes à longues, structure complexe acceptable pour la précision
- **Vocabulaire** : Technique spécialisé avec définitions implicites par le contexte

### Données quantitatives (obligatoires et précises)

- **Posologies** : Toujours exactes (mg, UI, µg, fois par jour, avec/sans repas)
- **Pourcentages d'efficacité** : Avec intervalles de confiance si disponibles
- **Délais d'action** : En minutes/heures précises (début d'action, pic, durée)
- **Demi-vies** : Pharmacocinétiques avec variabilités inter-individuelles
- **Prévalences** : Chiffrées avec sources et années de référence
- **Dosages de surveillance** : Valeurs cibles, fréquences, seuils d'alerte

### Mise en forme typographique avancée

#### Éléments à mettre en gras (systématique)

- **Noms de molécules innovantes et princeps**
- **Bénéfices thérapeutiques majeurs quantifiés**
- **Risques graves/contre-indications absolues**
- **Données d'efficacité remarquables avec chiffres**
- **Points critiques de surveillance**
- **Spécificités pharmacologiques uniques**

#### Citations et parenthèses (usage précis)

- Noms commerciaux : *toujours* entre parenthèses (Xarelto®), (Pradaxa®)
- Études références : avec nom d'étude précis - étude RE-LY, essai ARISTOTLE
- Mécanismes : avec détails - via inhibition du CYP2D6, par liaison à l'antithrombine III
- Populations : avec précision - chez 15-25% des patients > 65 ans

### Interactions médicamenteuses (section obligatoire détaillée)

#### Structure des interactions par classe

```markdown
### [Classe] : interactions [caractéristique principale]

**Contre-indications absolues** : Liste exhaustive avec mécanismes
**Interactions majeures** : Avec ajustements posologiques précis
**Associations nécessitant surveillance** : Modalités de suivi
**Inducteurs/inhibiteurs enzymatiques** : Voies métaboliques concernées
```

#### Détails obligatoires pour chaque interaction

- **Mécanisme précis** : CYP450, P-glycoprotéine, compétition, synergie
- **Impact clinique** : Majoration/diminution d'effet avec pourcentages
- **Conduite pratique** : Ajustements posologiques, surveillance, alternatives
- **Populations à risque** : Âge, comorbidités, polymorphismes génétiques

### Liens hypertextes (obligations renforcées)

#### Placement stratégique des liens

1. **Dans l'introduction** : Données épidémiologiques (minimum 2 liens)
2. **Corps du texte** : Études pivots, recommandations, méta-analyses (minimum 5-8 liens)
3. **Sections spécialisées** : Guidelines spécifiques, atlas, bases de données

#### Sources privilégiées hiérarchisées

1. **DOI d'articles scientifiques** : `https://doi.org/10.xxxx` (priorité absolue)
2. **Recommandations officielles** : HAS, ANSM, ESC, AHA, etc.
3. **Atlas épidémiologiques** : Diabetes Atlas, Cancer Atlas, WHO Global Health Observatory
4. **Guidelines de sociétés savantes** : Avec années de publication récentes
5. **Bases de données spécialisées** : ClinicalTrials.gov, Cochrane Library

#### Exemples de liens intégrés optimaux

```markdown
[L'étude RE-LY a démontré une **réduction de 35% des AVC hémorragiques** avec dabigatran 110 mg versus warfarine](https://doi.org/10.1056/NEJMoa0905561)

[En France, 1,1 million de patients traités par AVK génèrent **plus de 17 000 hospitalisations annuelles** pour hémorragies](https://ansm.sante.fr/dossiers-thematiques/anticoagulants)
```

## Formatage des tableaux (compatible Typora)

### Quand utiliser des tableaux

- **Protocoles thérapeutiques** : Algorithmes de dosage, ajustements
- **Comparaisons multi-critères** : Efficacité, tolérance, coût, surveillance
- **Classifications complexes** : Stades, grades, scores de risque
- **Conduites à tenir** : Selon paramètres biologiques, cliniques

### Structure HTML avec styles inline (format Typora)

Pour une compatibilité optimale avec Typora et autres éditeurs Markdown, utilisez exclusivement des styles CSS inline directement dans les attributs `style` de chaque élément HTML :

```html
<table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
<thead>
<tr style="background-color: #f5f5f5;">
<th style="width: 25%; padding: 12px; border: 1px solid #ddd; text-align: left; font-weight: bold;">Paramètre</th>
<th style="width: 35%; padding: 12px; border: 1px solid #ddd; text-align: left; font-weight: bold;">Conduite A</th>
<th style="width: 40%; padding: 12px; border: 1px solid #ddd; text-align: left; font-weight: bold;">Conduite B</th>
</tr>
</thead>
<tbody>
<tr>
<td style="padding: 12px; border: 1px solid #ddd; vertical-align: top;">Contenu cellule 1</td>
<td style="padding: 12px; border: 1px solid #ddd; vertical-align: top;">Contenu cellule 2</td>
<td style="padding: 12px; border: 1px solid #ddd; vertical-align: top;">Contenu cellule 3</td>
</tr>
<tr style="background-color: #f9f9f9;">
<td style="padding: 12px; border: 1px solid #ddd; vertical-align: top;">Contenu cellule 4</td>
<td style="padding: 12px; border: 1px solid #ddd; vertical-align: top;">Contenu cellule 5</td>
<td style="padding: 12px; border: 1px solid #ddd; vertical-align: top;">Contenu cellule 6</td>
</tr>
</tbody>
</table>
```

### Points clés pour la compatibilité Typora

- **NE PAS utiliser** : balises `<style>` séparées ou classes CSS
- **TOUJOURS utiliser** : attributs `style` directement dans chaque balise HTML
- **Alternance de couleurs** : ajouter `style="background-color: #f9f9f9;"` aux lignes paires (`<tr>`)
- **Styles essentiels** :
  - Table : `width: 100%; border-collapse: collapse; margin: 20px 0;`
  - En-têtes (`th`) : `padding: 12px; border: 1px solid #ddd; text-align: left; font-weight: bold; background-color: #f5f5f5;`
  - Cellules (`td`) : `padding: 12px; border: 1px solid #ddd; vertical-align: top;`
  - Largeurs : définir les `width` en pourcentages dans les `th`

### Règles de contenu des tableaux

- **Titres explicites** : Décrivant précisément le contenu
- **Formatage riche** : `<strong>`, `<br>`, entités HTML (`<`, `≥`)
- **Données quantifiées** : Dosages précis, pourcentages, délais
- **Hiérarchisation visuelle** : Alternance de couleurs, groupements logiques
- **Accessibilité** : Largeurs de colonnes adaptées au contenu

## Section références bibliographiques (enrichie)

### Avertissement obligatoire renforcé

```markdown
**AVERTISSEMENT : Ce document ne contient aucune référence bibliographique originale. Les références suivantes sont des suggestions basées sur les sources habituellement consultées pour ce type de contenu médical. Il est indispensable de vérifier et compléter ces références avec les sources réelles utilisées par l'auteur original.**
```

### Organisation des références (structure imposée)

1. **Recommandations et guidelines** (minimum 3 références)
2. **Études cliniques majeures** (minimum 5 références avec essais pivots)
3. **Méta-analyses et revues systématiques** (minimum 2 références)
4. **Références spécialisées** (pharmacologie, épidémiologie, économie de santé)

### Format standardisé des références

```markdown
1. Auteur(s). [Titre complet avec lien hypertexte](URL). *Journal en italiques*. Année;Volume(Numéro):Pages.
```

### Critères de sélection des références

- **Récence** : < 5 ans pour les recommandations, < 10 ans pour les études pivots
- **Impact Factor** : Privilégier les journaux de référence (NEJM, Lancet, JAMA)
- **Niveau de preuve** : Essais contrôlés randomisés, méta-analyses, guidelines niveau A
- **Représentativité géographique** : Sources européennes et internationales

## Critères de qualité renforcés

### Exactitude scientifique (vérifications obligatoires)

- ✅ Données pharmacocinétiques concordantes avec RCP officiels
- ✅ Posologies conformes aux dernières recommandations (ANSM, EMA)
- ✅ Effets secondaires avec fréquences exactes (très fréquent >10%, fréquent 1-10%)
- ✅ Contre-indications absolues versus relatives clairement distinguées
- ✅ Interactions médicamenteuses avec mécanismes et ajustements
- ✅ Populations spéciales (pédiatrie, gériatrie, insuffisances d'organes)

### Utilité clinique (aide à la décision)

- ✅ Algorithmes décisionnels avec critères objectifs
- ✅ Informations pratiques (timing, surveillance, modalités)
- ✅ Comparaisons directes entre alternatives thérapeutiques
- ✅ Intégration des contraintes économiques et organisationnelles
- ✅ Situations particulières et cas complexes
- ✅ Outils d'évaluation (scores, échelles, calculateurs)

### Sources et traçabilité (exigences élevées)

- ✅ Minimum 15-20 références pour un guide complet
- ✅ 8-12 liens hypertextes dans le texte principal
- ✅ Sources récentes avec répartition temporelle équilibrée
- ✅ Diversité des sources (essais, méta-analyses, guidelines, pharmacovigilance)
- ✅ Traçabilité des données chiffrées vers sources primaires
- ✅ Validation par recoupement de sources indépendantes

## Instructions spécifiques pour l'IA (processus détaillé)

### Phase de préparation (recherche approfondie)

1. **Identifier le domaine** : Pathologie, classe thérapeutique, indications
2. **Cartographier les acronymes** : Dresser liste exhaustive avec définitions
3. **Collecter données épidémiologiques** : Prévalence, incidence, projections, coûts
4. **Répertorier molécules** : Princeps, biosimilaires, génériques, nouveautés
5. **Analyser interactions** : Matrices d'interactions, voies métaboliques
6. **Préparer tableaux et diagrammes** : Identifier données complexes nécessitant structuration visuelle

### Phase de rédaction (méthodologie stricte)

1. **Suivre structure obligatoire** : Plan standardisé sans déviations
2. **Intégrer liens et diagrammes en temps réel** : Pas d'ajout a posteriori
3. **Vérifier cohérence quantitative** : Unités, ordres de grandeur, concordances
4. **Équilibrer sections** : Longueur proportionnelle à importance clinique
5. **Formater tableaux et Mermaid** : HTML/CSS et diagrammes pour contrôle visuel optimal
6. **Diversifier formulations** : Éviter répétitions, enrichir vocabulaire technique

### Phase de relecture (contrôle qualité)

1. **Vérifier fonctionnalité liens** : Tous URL accessibles et pertinents
2. **Contrôler acronymes** : Définitions complètes en section dédiée
3. **Valider cohérence scientifique** : Pas de contradictions internes
4. **Assurer complétude** : Toutes molécules/situations importantes couvertes
5. **Tester tableaux et diagrammes** : Rendu visuel et accessibilité du contenu
6. **Harmoniser style** : Tonalité et niveau technique homogènes

## Domaines d'application étendus

### Spécialités médicales couvertes

- **Cardiologie** : Antihypertenseurs, antiarythmiques, hypolipémiants, vasodilatateurs
- **Neurologie** : Antiépileptiques, antiparkinsoniens, psychotropes, anti-migraineux
- **Pneumologie** : Bronchodilatateurs, corticoïdes inhalés, mucolytiques
- **Gastroentérologie** : IPP, anti-inflammatoires, immunosuppresseurs, hépatoprotecteurs
- **Rhumatologie** : AINS, biothérapies, DMARDs, corticoïdes
- **Oncologie** : Chimiothérapies, thérapies ciblées, immunothérapies, soins de support
- **Endocrinologie** : Antidiabétiques, hormones thyroïdiennes, corticothérapie
- **Infectiologie** : Antibiotiques, antiviraux, antifongiques, vaccins
- **Psychiatrie** : Antidépresseurs, antipsychotiques, anxiolytiques, thymorégulateurs

### Types de guides possibles

- **Guides par pathologie** : Diabète, hypertension, asthme, BPCO
- **Guides par situation** : Urgences, réanimation, gériatrie, pédiatrie
- **Guides par procédure** : Anticoagulation périopératoire, sevrage, interactions
- **Guides économiques** : Coût-efficacité, génériques, biosimilaires

## Limitations et précautions (responsabilité)

### Disclaimer médical obligatoire

```markdown
**DISCLAIMER MÉDICAL** : Ce guide est destiné exclusivement à des fins éducatives et d'information pour les professionnels de santé. Il ne remplace en aucun cas le jugement clinique individualisé, l'évaluation personnalisée du patient, ou les recommandations officielles en vigueur. Toute décision thérapeutique doit intégrer le contexte clinique spécifique et les dernières données scientifiques disponibles.
```

### Mise à jour requise (cycle de vie)

- **Fréquence recommandée** : Révision tous les 12-18 mois minimum
- **Déclencheurs de mise à jour** : Nouvelles AMM, modifications RCP, nouvelles recommandations
- **Suivi de pharmacovigilance** : Intégration alertes ANSM, EMA, FDA
- **Évolution des guidelines** : Surveillance sociétés savantes et agences

### Validation experte recommandée (qualité)

- **Relecture scientifique** : Expert du domaine pour validation contenu
- **Relecture pharmaceutique** : Pharmacien clinicien pour interactions/posologies
- **Validation réglementaire** : Conformité aux référentiels officiels
- **Test utilisabilité** : Praticiens cibles pour ergonomie et pertinence clinique

## Nouvelles fonctionnalités

### Intégration d'outils de calcul

- **Calculateurs de dose** : Formules intégrées avec exemples
- **Scores de risque** : Algorithmes avec interprétation
- **Ajustements** : Insuffisance rénale, hépatique, interactions

### Éléments visuels enrichis avec Mermaid

- **Schémas mécanistiques** : Voies d'action, métabolisme
- **Algorithmes décisionnels** : Arbres de décision thérapeutique
- **Timelines** : Chronologie des effets, surveillance
- **Diagrammes Mermaid** : Flowcharts, mindmaps, gantt, graphiques intégrés

### Personnalisation par utilisateur

- **Modules par spécialité** : Contenu adapté à la pratique
- **Niveaux d'expertise** : Résident, praticien, expert
- **Contextes de soins** : Hospitalier, ambulatoire, urgences

Cette version enrichie du guide de rédaction intègre les spécificités observées dans le guide des anticoagulants, notamment la gestion avancée des interactions médicamenteuses, le formatage professionnel des tableaux, l'intégration native des diagrammes Mermaid, et une approche plus détaillée de la structuration du contenu médical spécialisé.