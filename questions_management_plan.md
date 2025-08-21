# Questions Management Plan

## Overview

This document outlines the plan to migrate FlashPharma from a JSON-based flashcard system to a PostgreSQL-backed content management system with markdown support, validation workflows, and source attribution.

## Architecture

### Database Design

#### Core Schema

```sql
-- Questions table (core content)
CREATE TABLE questions (
    id SERIAL PRIMARY KEY,
    question_text TEXT NOT NULL,  -- Markdown format
    answer_text TEXT NOT NULL,    -- Markdown format
    status VARCHAR(20) DEFAULT 'draft',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by INTEGER REFERENCES users(id),
    validated_by INTEGER REFERENCES users(id),
    validated_at TIMESTAMP
);

-- Status enum: draft, pending_review, validated, published, disabled, archived

-- Tags (normalized structure)
CREATE TABLE tags (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) UNIQUE NOT NULL,
    category VARCHAR(50),  -- e.g., 'drug_class', 'therapeutic_area', 'topic'
    color VARCHAR(7),      -- Hex color for UI
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Many-to-many relationship
CREATE TABLE question_tags (
    question_id INTEGER REFERENCES questions(id) ON DELETE CASCADE,
    tag_id INTEGER REFERENCES tags(id) ON DELETE CASCADE,
    PRIMARY KEY (question_id, tag_id)
);

-- Users and roles
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    name VARCHAR(100) NOT NULL,
    role VARCHAR(20) DEFAULT 'author',  -- author, reviewer, editor, admin
    specialties JSONB,  -- Array of pharmacy specialties
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- JSONB columns for flexible data
ALTER TABLE questions ADD COLUMN 
sources JSONB DEFAULT '[]'::jsonb,       -- Source citations
metadata JSONB DEFAULT '{}'::jsonb,      -- Extracted entities, formatting
review_history JSONB DEFAULT '[]'::jsonb; -- Validation comments and history
```

#### JSONB Structure Examples

**Sources Format:**
```json
[
  {
    "type": "textbook",
    "title": "Dorosz - Guide pratique des médicaments",
    "edition": "42e édition", 
    "pages": "156-158",
    "isbn": "978-2-224-03562-4",
    "year": 2024
  },
  {
    "type": "guideline",
    "authority": "ANSM",
    "title": "Bon usage des antibiotiques",
    "url": "https://ansm.sante.fr/...",
    "date_accessed": "2025-01-15"
  },
  {
    "type": "journal",
    "title": "Efficacité des pénicillines en pratique clinique",
    "journal": "Revue Pharmaceutique",
    "authors": ["Dupont J.", "Martin P."],
    "year": 2023,
    "doi": "10.1234/rp.2023.001"
  }
]
```

**Metadata Format (auto-extracted):**
```json
{
  "drugs": ["amoxicilline", "pénicilline G"],
  "drug_classes": ["béta-lactamines", "pénicillines"],
  "conditions": ["infection", "allergie"],
  "word_count": 145,
  "estimated_read_time": "30s",
  "last_entity_extraction": "2025-01-15T10:30:00Z"
}
```

**Review History Format:**
```json
[
  {
    "reviewer_id": 5,
    "action": "request_changes",
    "comment": "Préciser la posologie pour les infections sévères",
    "timestamp": "2025-01-10T14:20:00Z"
  },
  {
    "reviewer_id": 5,
    "action": "approved",
    "comment": "Modifications apportées, contenu validé",
    "timestamp": "2025-01-12T09:15:00Z"
  }
]
```

### Backend API (Node.js/Express)

#### Core Endpoints

```javascript
// Questions CRUD
GET    /api/questions              // List with filters
GET    /api/questions/:id          // Single question
POST   /api/questions              // Create new
PUT    /api/questions/:id          // Update existing
DELETE /api/questions/:id          // Delete
PATCH  /api/questions/:id/status   // Change status

// Tags management
GET    /api/tags                   // All tags with usage count
POST   /api/tags                   // Create tag
PUT    /api/tags/:id               // Update tag
DELETE /api/tags/:id               // Delete unused tag

// Review workflow
GET    /api/questions/pending      // Questions awaiting review
POST   /api/questions/:id/submit   // Submit for review
POST   /api/questions/:id/review   // Approve/reject
GET    /api/questions/:id/history  // Review history

// Search and filtering
GET    /api/search?q=amoxicilline  // Full-text search
GET    /api/questions?tags=antibiotiques&status=published
GET    /api/questions?source_type=textbook

// Admin functions
POST   /api/questions/bulk-import  // Import from JSON
GET    /api/admin/stats            // Usage statistics
POST   /api/admin/reprocess        // Re-extract entities
```

#### Markdown Processing Pipeline

1. **Input Validation**: Sanitize markdown, check required fields
2. **Entity Extraction**: Extract drug names, classes using regex/NLP
3. **HTML Generation**: Convert markdown with custom renderer
4. **Storage**: Save markdown + extracted metadata
5. **Caching**: Cache rendered HTML for performance

**Custom Markdown Renderer:**
```javascript
const renderer = new marked.Renderer();

// Drug names: **drug** → <strong class="drug-name">drug</strong>
renderer.strong = (text) => `<strong class="drug-name">${text}</strong>`;

// Drug classes: *class* → <em class="drug-class">class</em>  
renderer.em = (text) => `<em class="drug-class">${text}</em>`;

// Custom syntax: [!INTERACTION] → <div class="alert-interaction">
renderer.paragraph = (text) => {
  if (text.startsWith('[!')) {
    const type = text.match(/\[!(.*?)\]/)?.[1].toLowerCase();
    return `<div class="alert alert-${type}">${text.replace(/\[!.*?\]/, '')}</div>`;
  }
  return `<p>${text}</p>`;
};
```

### Frontend Admin Interface

#### Question Editor
- **Markdown editor** with live preview
- **Tag selector** with autocomplete and color coding
- **Source manager** with predefined citation formats
- **Status indicator** and workflow controls
- **Duplicate detection** warnings

#### Review Dashboard
- **Pending queue** filtered by reviewer specialty
- **Diff view** for changed questions
- **Batch approval** for trusted authors
- **Comment threads** for collaborative review
- **Validation checklist** (sources required, entities extracted, etc.)

#### Content Management
- **Bulk operations** (tag assignment, status changes)
- **Analytics dashboard** (most difficult questions, tag usage)
- **Export utilities** (JSON, CSV, print-friendly)
- **Audit trail** for all content changes

## Migration Strategy

### Phase 1: Infrastructure Setup
1. Set up PostgreSQL database with schema
2. Create Express.js API with basic CRUD
3. Build simple admin interface for question creation
4. Implement markdown → HTML pipeline

### Phase 2: Content Migration
1. Import existing JSON flashcards as "published" status
2. Convert HTML content back to markdown where possible
3. Extract existing tags into normalized tag table
4. Add sources to imported questions (manual process)

### Phase 3: Workflow Implementation
1. Add user authentication and roles
2. Implement validation workflow (draft → review → published)
3. Build reviewer dashboard and approval process
4. Add entity extraction and metadata generation

### Phase 4: Advanced Features
1. Full-text search with PostgreSQL
2. Content analytics and reporting
3. Automated source validation (URL checking, ISBN lookup)
4. Integration with existing flashcard frontend

## Quality Control Features

### Validation Rules
- **Mandatory sources** for medical claims
- **Entity extraction** must find at least one drug/condition
- **Content guidelines** enforced (complete sentences, proper formatting)
- **Duplicate detection** using content similarity
- **Reviewer assignment** based on tag categories

### Content Standards
- **Questions** must be single-concept, avoid compound questions
- **Answers** must use complete sentences, proper medical terminology
- **Sources** must be current (< 5 years for guidelines, < 10 for textbooks)
- **Tags** follow controlled vocabulary for consistency

### Audit and Tracking
- **All changes logged** with user, timestamp, reason
- **Version history** for rollback capability  
- **Review metrics** (time to approval, revision rate)
- **Content freshness** alerts for outdated sources

## Benefits of This Approach

1. **Professional Content Management**: Proper workflows, validation, source tracking
2. **Scalable Architecture**: PostgreSQL handles thousands of questions efficiently  
3. **Editor Friendly**: Markdown is familiar, forms prevent errors
4. **Search Capabilities**: Find questions by drug, condition, source type
5. **Quality Assurance**: Validation workflow ensures accuracy
6. **Collaboration**: Multiple authors, reviewers, editors can work together
7. **Future-Proof**: Easy to extend with new content types, metadata fields

## Technical Considerations

### Performance
- **Database indexes** on frequently queried fields (status, tags, created_at)
- **JSONB GIN indexes** for fast metadata searches
- **Connection pooling** for high-concurrency access
- **Caching layer** (Redis) for rendered HTML content

### Security
- **Role-based access control** with JWT authentication  
- **Input sanitization** for markdown content
- **SQL injection prevention** with parameterized queries
- **Audit logging** for sensitive operations

### Backup and Recovery
- **Automated PostgreSQL backups** with point-in-time recovery
- **Content export** functionality for disaster recovery
- **Version control integration** for question content tracking

This plan transforms FlashPharma from a simple flashcard app into a comprehensive educational content management platform suitable for professional pharmacy education.