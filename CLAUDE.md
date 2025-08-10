# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

FlashPharma is a French-language flashcard application designed for pharmacy students and professionals. The current implementation is Phase 1 (MVP) of a planned multi-phase project that will eventually evolve into a full React PWA with backend API.

**Current State:** Simple client-side flashcard application with Express.js static file server
**Target State:** Full-stack PWA with React frontend, Node.js/Express API, PostgreSQL database, and spaced repetition algorithm

## Development Commands

### Starting the Application
- `npm start` or `npm run dev` - Start the Express.js server on port 8080
- `node server.js` - Alternative way to start the server

### Testing
- No test framework configured yet - tests are planned for Phase 3

### Dependencies
- `npm install` - Install dependencies (Express.js for server, live-server for dev)

## Architecture

### Current Structure (Phase 1)
```
/
├── server.js              # Express server serving static files
├── src/
│   ├── index.html         # Main application HTML
│   ├── css/styles.css     # Modern dark/light theme CSS
│   └── js/scripts.js      # Vanilla JS flashcard logic
├── zz_questions/          # JSON question banks
│   ├── 00_questions.json  # Main question set (65 pharmacy cards)
│   └── *.json            # Additional question sets
└── tools/
    └── json_card_viewer.html  # Development tool for viewing JSON structure
```

### Key Components

1. **Server (server.js)**: Simple Express.js static file server
   - Serves files from `/src` directory 
   - Exposes `/zz_questions` route for JSON data
   - Handles SPA routing with catch-all route

2. **Frontend (src/)**: Vanilla JS/CSS/HTML application
   - Modern dark/light theme with CSS custom properties
   - Flip card animations with CSS transforms
   - Random card selection (10 from available set)
   - Progress tracking and recall statistics

3. **Data Structure**: JSON-based question banks
   - Rich tagging system with categories and hierarchies
   - HTML-formatted questions/answers with CSS classes
   - Metadata including difficulty levels and taxonomy

### Question Data Format
```json
{
  "metadata": {
    "title": "...",
    "total_cards": 65,
    "available_tags": [...],
    "tag_categories": {...}
  },
  "flashcards": [
    {
      "id": 1,
      "tags": ["Antibiotiques", "Beta-lactamines"],
      "question": "<div class=\"card-content\">...</div>",
      "answer": "<div class=\"card-content\">...</div>",
      "difficulty": "hard|medium|easy"
    }
  ]
}
```

## Development Workflow

### Adding New Questions
1. Edit JSON files in `zz_questions/` directory. Edit the `00_questions.json` file only but do not modify the original file, create a new file with a new name.
2. Follow existing HTML structure with semantic classes
3. Use appropriate tags from the taxonomy in metadata
4. Server automatically serves updated JSON via `/zz_questions` route

### Question Writing Guidelines
**Questions should focus on a single concept:**
- ❌ Avoid compound questions with "et" (and) - split into separate cards
- ✅ Each question should test one specific knowledge point
- ✅ Example: Instead of "Quels sont les effets indésirables ET les contre-indications de l'amoxicilline?", create two cards

**Answer formatting standards:**
- Use complete sentences with proper subject-verb structure outside of lists
- Bullet points are acceptable for enumerations but should be introduced by a complete sentence
- ✅ Example: "Les contre-indications absolues de l'amoxicilline sont les suivantes:"
  - Followed by bullet points
- ❌ Avoid standalone fragments like "Allergie pénicillines" 
- ✅ Use complete sentences like "Une allergie aux pénicillines constitue une contre-indication absolue."

**Example with a more complete answer:**
- "Venlafaxine : IRSNA avec profil dose-dépendant.

Faibles doses : effet sérotoninergique prédominant
Fortes doses (>150 mg) : inhibition significative recapture noradrénaline → effet noradrénergique → stimulation α1 et β1 → hypertension artérielle
Surveillance TA recommandée dès 225 mg/j. Mécanisme direct, non lié à une interaction."

The first sentence is too cryptic, it should have a verb and use articles : "La venlafaxine est un IRSNA avec un profil dose-dépendant."

Then : "À faible doses, l'effet sérotoninergique est prédominant. À fortes doses (>150 mg), il se produit une inhibition significative de la recapture de la noradrénaline → effet noradrénergique → stimulation des récepteurs α1 et β1 → hypertension artérielle.
La surveillance de la tension artérielle est recommandée dès une dose de 225 mg/j. Ce mécanisme est direct, non lié à une interaction."

**Content structure:**
- Start answers with context-setting sentences
- Use bullet points for lists, but introduce them properly  
- End with synthesis or clinical relevance when appropriate

### Styling Changes
- CSS uses modern custom properties for theming
- Dark theme is default, light theme available via toggle
- Responsive design with mobile-first approach
- Animation system based on CSS transforms and transitions

### Future Migration Path (Phases 2-4)
The requirements document (`00_requirements.md`) outlines the planned evolution:
- **Phase 2:** React frontend with Redux or Zustand state management
- **Phase 3:** Node.js/Express API with PostgreSQL and Prisma ORM  
- **Phase 4:** PWA with Capacitor for mobile deployment

Current code should be maintained with this migration path in mind - avoid tight coupling and keep business logic separate from presentation.

## Feature Ideas for Future Development

### Progress Tracking Features

**Study Session Analytics:**
- Track correct/incorrect answers per session
- Calculate accuracy percentage and improvement trends
- Monitor study streaks and consistency
- Session duration and cards reviewed per session

**Spaced Repetition System:**
- Implement confidence levels (1-5) after each answer
- Schedule card reviews based on performance (easy cards less frequently)
- Track review intervals and optimize timing
- Show "due for review" cards based on algorithm

**Long-term Progress:**
- Mastery levels per card (new → learning → review → mastered)
- Visual progress bars by tag category
- Statistics dashboard showing weak areas
- Historical performance graphs

### Tag-Based Selection Features

**Smart Filtering:**
- Multi-tag selection with AND/OR logic
- "Focus mode" for specific topics (e.g., only Beta-lactamines)
- Exclude mastered cards option
- Difficulty-based filtering

**Tag-Based Study Modes:**
- "Weak areas" mode (cards with low success rates)
- "Mixed review" (proportional sampling from all categories)
- "Topic deep dive" (all cards from selected tag hierarchy)
- "Quick review" (only previously mastered cards)

**Tag Analytics:**
- Performance heatmap by tag category
- Identify knowledge gaps in tag hierarchies
- Recommend study priorities based on tag performance
- Track improvement in specific pharmaceutical areas

**Implementation Notes:**
- Local storage for progress data (Phase 1)
- Tag selection checkboxes in sidebar
- Progress visualization with charts
- Study recommendations based on performance patterns

## Important Files

- `00_requirements.md` - Complete technical specifications and design system
- `zz_questions/00_questions.json` - Main question database with 65 pharmacy flashcards
- `src/js/scripts.js:92-115` - Question loading and randomization logic
- `src/css/styles.css:1-50` - CSS custom properties and theming system