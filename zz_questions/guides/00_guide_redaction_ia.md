# Guide de rédaction IA pour guides médicaux spécialisés

## Objectif

Ce guide méthodologique permet à une IA de rédiger des guides médicaux spécialisés de haute qualité, structurés, sourcés et utilisables par des professionnels de santé, en s'inspirant du modèle du "Guide des médicaments antidiabétiques".

## Structure standardisée obligatoire

### 1. En-tête et titre
- **Format** : "Guide complet des [domaine médical spécifique]"
- **Exemple** : "Guide complet des médicaments antidiabétiques"

### 2. Section acronymes (obligatoire)
```markdown
## Acronymes et abréviations

**SIGLE** : Définition complète
```
- Lister TOUS les acronymes utilisés dans le document
- Ordre alphabétique
- Inclure organismes, mécanismes biologiques, paramètres cliniques, pathologies

### 3. Introduction tripartite (obligatoire)

#### A. Prévalence et enjeux épidémiologiques (2-3 lignes)
- Données chiffrées précises avec projections
- Impact de santé publique
- **OBLIGATOIRE** : Lien hypertexte vers source épidémiologique fiable

#### B. Rappels physiologiques essentiels (8-12 lignes)
- Mécanismes fondamentaux
- Voies métaboliques principales
- Régulations hormonales
- Physiopathologie de base
- **Format** : Paragraphes denses, vocabulaire technique précis

#### C. Stratégies thérapeutiques par classes (5-10 lignes)
- Résumé des approches thérapeutiques principales
- Mécanismes d'action différenciés
- **Format** : Puces avec médicament en **gras**
- Bénéfices cliniques chiffrés quand pertinents

### 4. Corps du document

#### Structure par classes médicamenteuses
```markdown
## Les [classe thérapeutique] [verbe d'action] [bénéfice principal]
```
**Exemples de titres** :
- "Les insulines modernes transforment la gestion du diabète"
- "Les anticoagulants oraux directs simplifient la gestion tout en réduisant les hémorragies"

#### Contenu de chaque section
1. **Paragraphe d'introduction** : Vue d'ensemble de la classe
2. **Détails par molécule/sous-classe** :
   - Noms commerciaux entre parenthèses
   - Posologies précises
   - Mécanismes d'action
   - Effets secondaires principaux
   - Contre-indications
3. **Données chiffrées** : Toujours avec pourcentages, durées, dosages exacts
4. **Éléments en gras** : Points clés, bénéfices majeurs, risques importants

## Règles de rédaction strictes

### Tonalité et style
- **Registre** : Médical professionnel, précis, factuel
- **Temps** : Présent de l'indicatif principalement
- **Voix** : Active de préférence
- **Longueur phrases** : Moyennes à longues, structure complexe acceptable
- **Vocabulaire** : Technique spécialisé, termes médicaux exacts

### Données quantitatives (obligatoires)
- **Posologies** : Toujours précises (mg, UI, fois par jour)
- **Pourcentages d'efficacité** : Avec intervalles de confiance si disponibles
- **Délais d'action** : En minutes/heures
- **Demi-vies** : Pharmacocinétiques précises
- **Prévalences** : Chiffrées avec sources

### Mise en forme typographique

#### Éléments à mettre en gras
- **Noms de molécules innovantes**
- **Bénéfices thérapeutiques majeurs**
- **Risques graves/contre-indications**
- **Données d'efficacité remarquables**

#### Citations et parenthèses
- Noms commerciaux : (Jardiance), (Ozempic)
- Études références : étude EMPA-REG, essai ONSET
- Mécanismes : via l'activation de l'AMPK
- Populations : chez 20-40% des patients

### Liens hypertextes (obligatoires)

#### Placement des liens
1. **Dans le texte principal** : Sur les affirmations factuelles importantes
2. **Format** : `[affirmation précise avec données chiffrées](URL)`
3. **Sources privilégiées** :
   - DOI d'articles scientifiques : `https://doi.org/10.xxxx`
   - Recommandations officielles
   - Atlas épidémiologiques
   - Guidelines de sociétés savantes

#### Exemples de bon usage
```markdown
[L'étude EMPA-REG a montré une **réduction de 38% de la mortalité cardiovasculaire** avec l'empagliflozine](https://doi.org/10.1056/NEJMoa1504720)

[537 millions d'adultes dans le monde (10,5% de la population), avec une projection à 783 millions d'ici 2045](https://diabetesatlas.org/atlas/tenth-edition/)
```

## Section références bibliographiques

### Avertissement obligatoire
```markdown
**AVERTISSEMENT : Ce document ne contient aucune référence bibliographique originale. Les références suivantes sont des suggestions basées sur les sources habituellement consultées pour ce type de contenu médical. Il est indispensable de vérifier et compléter ces références avec les sources réelles utilisées par l'auteur original.**
```

### Organisation des références
1. **Recommandations et guidelines**
2. **Études cliniques majeures**  
3. **Méta-analyses et revues systématiques**
4. **Références spécialisées**

### Format des références
```markdown
1. Auteur(s). [Titre complet avec lien](URL). *Journal*. Année;Volume(Numéro):Pages.
```

### Types de liens à privilégier
- **PubMed/PMC** : Articles scientifiques
- **DOI** : Publications avec identifiant numérique
- **Sites officiels** : Sociétés savantes, agences sanitaires
- **Atlas/bases de données** : Sources épidémiologiques

## Critères de qualité

### Exactitude scientifique
- ✅ Données pharmacocinétiques précises
- ✅ Posologies conformes aux RCP
- ✅ Effets secondaires documentés
- ✅ Contre-indications exactes
- ✅ Interactions médicamenteuses principales

### Utilité clinique
- ✅ Aide à la décision thérapeutique
- ✅ Informations pratiques (timing, surveillance)
- ✅ Comparaisons entre molécules
- ✅ Populations spéciales (âge, insuffisance rénale)

### Sources et traçabilité
- ✅ Minimum 10-15 références
- ✅ 5-8 liens hypertextes dans le texte
- ✅ Sources récentes (< 5 ans idéalement)
- ✅ Diversité des sources (guidelines, essais, méta-analyses)

## Instructions spécifiques pour l'IA

### Phase de préparation
1. **Identifier le domaine** : Pathologie et classe thérapeutique précise
2. **Rechercher les acronymes** : Lister tous les termes techniques
3. **Collecter les données épidémiologiques** : Prévalence, incidence, projections
4. **Identifier les molécules clés** : Princeps et biosimilaires

### Phase de rédaction
1. **Suivre la structure obligatoire** : Ne pas dévier du plan type
2. **Intégrer les liens en rédigeant** : Pas d'ajout a posteriori
3. **Vérifier les données chiffrées** : Cohérence des unités et valeurs
4. **Équilibrer les sections** : Longueur proportionnelle à l'importance clinique

### Phase de relecture
1. **Vérifier tous les liens** : Fonctionnels et pertinents
2. **Contrôler les acronymes** : Tous définis en début de document
3. **Valider la cohérence** : Pas de contradictions internes
4. **S'assurer de la complétude** : Toutes les molécules importantes couvertes

## Domaines d'application

Ce guide peut être utilisé pour rédiger des guides spécialisés dans :
- **Cardiologie** : Antihypertenseurs, antiarythmiques, hypolipémiants
- **Neurologie** : Antiépileptiques, antiparkinsoniens, psychotropes
- **Pneumologie** : Bronchodilatateurs, corticoïdes inhalés
- **Gastroentérologie** : IPP, anti-inflammatoires, immunosuppresseurs
- **Rhumatologie** : AINS, biothérapies, DMARDs
- **Oncologie** : Chimiothérapies, thérapies ciblées, immunothérapies

## Limitations et précautions

### Disclaimer médical obligatoire
Chaque guide doit inclure une mention de responsabilité indiquant que le contenu est à des fins éducatives et ne remplace pas le jugement clinique individualisé.

### Mise à jour requise
Les guides doivent être régulièrement actualisés (recommandation : tous les 12-18 mois) pour intégrer les nouvelles données scientifiques et recommandations.

### Validation experte recommandée
Bien que structurés et sourcés, ces guides bénéficient d'une relecture par un expert du domaine avant utilisation en pratique clinique.