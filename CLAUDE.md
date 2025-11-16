# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

FlashPharma is a French-language flashcard application designed for pharmacy students and professionals. The project has evolved from a simple MVP to a full-stack application with PostgreSQL database backend and admin interface.

**Current State:** Full-stack application with Express.js API, PostgreSQL database, and admin panel
**Architecture:** Client-server architecture with separate API backend and static frontend

## Development Commands

### Starting the Application
- `npm start` or `npm run dev` - Start the main Express.js server on port 8080
- `npm run api` - Start the API server with nodemon on port 3001 (auto-reload for development)
- `node server.js` - Alternative way to start the main server

### Database Management
- `npm run db:setup` - Initialize database schema (requires existing flashpharma database)
- `npm run db:reset` - Drop, recreate, and setup the database from scratch
- `npm run migrate:preview` - Preview JSON to PostgreSQL migration without executing
- `npm run migrate:execute` - Execute the migration from JSON files to PostgreSQL
- `npm run load:questions` - Load questions from JSON into the database

### Testing
- No test framework configured yet - tests are planned for future phases

### Dependencies
- `npm install` - Install all dependencies including Express, PostgreSQL client, security middleware

## Architecture

### Current Structure
```
/
├── server.js              # Main Express server serving static files
├── api/                   # Backend API server
│   ├── server.js          # API server with security middleware (port 3001)
│   ├── config/
│   │   └── database.js    # PostgreSQL connection configuration
│   ├── models/
│   │   ├── Question.js    # Question model with CRUD operations
│   │   └── Tag.js         # Tag model and management
│   ├── routes/
│   │   ├── questions.js   # Question endpoints (/api/questions)
│   │   └── tags.js        # Tag endpoints (/api/tags)
│   └── utils/
│       └── markdown.js    # Markdown/HTML conversion utilities
├── admin/                 # Admin panel for content management
│   ├── index.html         # Admin interface
│   ├── css/admin.css      # Admin panel styles
│   └── js/admin.js        # Admin functionality
├── database/              # Database utilities and migrations
│   ├── schema.sql         # PostgreSQL database schema
│   ├── migrate-questions.js  # JSON to PostgreSQL migration script
│   └── migrations/        # SQL migration files
├── src/                   # Frontend application
│   ├── index.html         # Main application HTML
│   ├── css/styles.css     # Modern dark/light theme CSS
│   └── js/
│       ├── scripts.js     # Main flashcard logic
│       └── progress.js    # Progress tracking functionality
├── zz_questions/          # Source data and documentation
│   ├── questions/         # JSON question banks
│   │   ├── 00_questions.json  # Main question set
│   │   └── questions_diabetologie.json  # Specialty question sets
│   └── guides/            # Content creation guides
└── tools/
    └── json_card_viewer.html  # Development tool for viewing JSON structure
```

### Key Components

1. **Main Server (server.js)**: Express.js static file server
   - Serves frontend files from `/src` and `/admin` directories
   - Proxies API requests to backend server
   - Handles SPA routing with catch-all route
   - Runs on port 8080

2. **API Server (api/server.js)**: Backend REST API
   - Express.js with security middleware (Helmet, CORS, rate limiting)
   - PostgreSQL database connection via pg client
   - RESTful endpoints for questions and tags
   - Runs on port 3001

3. **Database Layer**:
   - PostgreSQL database named 'flashpharma'
   - Questions table with markdown and HTML content fields
   - Tags table with hierarchical category structure
   - Many-to-many relationship via question_tags junction table

4. **Admin Panel (admin/)**: Content management interface
   - Full CRUD operations for questions
   - Tag management and categorization
   - Markdown editor with preview
   - Search and filtering capabilities

5. **Frontend Application (src/)**: User-facing flashcard app
   - Vanilla JS/CSS/HTML (no framework dependencies)
   - Modern dark/light theme with CSS custom properties
   - Flip card animations with CSS transforms
   - Progress tracking with local storage
   - Fetches data from API server

6. **Data Migration Tools**:
   - JSON to PostgreSQL migration scripts
   - Markdown to HTML conversion utilities
   - Question validation and formatting tools

### Data Formats

#### Database Schema (PostgreSQL)
```sql
-- Questions table
CREATE TABLE questions (
  id SERIAL PRIMARY KEY,
  question_markdown TEXT NOT NULL,
  answer_markdown TEXT NOT NULL,
  question_html TEXT,
  answer_html TEXT,
  difficulty VARCHAR(20),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tags table with categories
CREATE TABLE tags (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) UNIQUE NOT NULL,
  category VARCHAR(100),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Junction table for many-to-many relationship
CREATE TABLE question_tags (
  question_id INTEGER REFERENCES questions(id) ON DELETE CASCADE,
  tag_id INTEGER REFERENCES tags(id) ON DELETE CASCADE,
  PRIMARY KEY (question_id, tag_id)
);
```

#### Legacy JSON Format (for migration)
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

#### Via Admin Panel (Recommended)
1. Navigate to `/admin` in your browser
2. Click "New Question" button
3. Write question and answer in Markdown format
4. Select appropriate tags from the dropdown
5. Set difficulty level (easy/medium/hard)
6. Preview the rendered HTML
7. Save to database

#### Via Database Migration
1. Add questions to JSON files in `zz_questions/questions/` directory
2. Run `npm run migrate:preview` to check the migration
3. Run `npm run migrate:execute` to import into PostgreSQL
4. Verify in admin panel that questions imported correctly

#### Direct Database Insert
1. Use SQL INSERT statements in `database/migrations/`
2. Run `npm run db:setup` to apply migrations
3. Questions will be available immediately in the API

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

### Current Status and Next Steps

The project has already progressed beyond the initial Phase 1 MVP:
- ✅ **Completed:** PostgreSQL database integration
- ✅ **Completed:** RESTful API with Express.js
- ✅ **Completed:** Admin panel for content management
- ✅ **Completed:** Security middleware (Helmet, CORS, rate limiting)

**Next Development Priorities:**
- User authentication and personal progress tracking
- Spaced repetition algorithm implementation
- React frontend migration for better state management
- PWA features (offline mode, installability)
- Mobile app deployment via Capacitor

Current code follows clean architecture principles with clear separation between API, database, and frontend layers to facilitate future migrations.

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

## Important Files and Locations

### Configuration
- `.env` - Environment variables (database connection, API settings)
- `00_requirements.md` - Complete technical specifications and design system

### Database
- `database/schema.sql` - PostgreSQL database structure
- `database/migrate-questions.js` - JSON to PostgreSQL migration tool
- `api/config/database.js` - Database connection configuration

### API Server
- `api/server.js` - Main API server with security middleware
- `api/models/Question.js` - Question model with CRUD operations
- `api/routes/questions.js` - RESTful endpoints for questions

### Frontend
- `src/js/scripts.js` - Main flashcard application logic
- `src/css/styles.css:1-50` - CSS custom properties and theming
- `admin/js/admin.js` - Admin panel functionality

### Data Sources
- `zz_questions/questions/00_questions.json` - Legacy JSON question bank
- `zz_questions/guides/` - Content creation and AI prompt guides

## Coding Standards

### General Rules

**No Emoticons:** Never use emoticons or emoji characters in code, documentation, console output, or comments. Use clear, professional text instead.
- Good: `console.log('Migration completed successfully');`
- Bad: `console.log('✅ Migration completed successfully');`

**Professional Output:** All console messages, error handling, and user-facing text should be professional and clear without decorative characters.

### API Development Standards

**Security First:**
- Always validate input data using Joi schemas
- Sanitize user inputs before database operations
- Use parameterized queries to prevent SQL injection
- Never expose sensitive information in error messages

**RESTful Conventions:**
- GET for reading data
- POST for creating new resources
- PUT/PATCH for updating existing resources
- DELETE for removing resources
- Return appropriate HTTP status codes

**Error Handling:**
- Consistent error response format
- Log errors server-side but return safe messages to clients
- Use try-catch blocks for all database operations
- Implement proper error middleware

### Database Standards

**Query Optimization:**
- Use indexes on frequently queried columns
- Limit result sets with pagination
- Avoid N+1 query problems
- Use database transactions for related operations

**Data Integrity:**
- Foreign key constraints for relationships
- NOT NULL constraints where appropriate
- Unique constraints for fields like email, username
- Default values for optional fields