-- FlashPharma Questions Management Database Schema
-- PostgreSQL 14+

-- Enable extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";  -- For fuzzy text search

-- Custom types
CREATE TYPE user_role AS ENUM ('author', 'reviewer', 'editor', 'admin');
CREATE TYPE question_status AS ENUM ('draft', 'pending_review', 'validated', 'published', 'disabled', 'archived');
CREATE TYPE source_type AS ENUM ('textbook', 'guideline', 'journal', 'website', 'internal');
CREATE TYPE review_action AS ENUM ('submitted', 'approved', 'rejected', 'request_changes');

-- Users table
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    name VARCHAR(100) NOT NULL,
    role user_role DEFAULT 'author',
    specialties JSONB DEFAULT '[]'::jsonb,  -- Array of pharmacy specialties
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tags table (normalized)
CREATE TABLE tags (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) UNIQUE NOT NULL,
    category VARCHAR(50),  -- e.g., 'drug_class', 'therapeutic_area', 'topic'
    color VARCHAR(7) DEFAULT '#6c757d',  -- Hex color for UI
    description TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by INTEGER REFERENCES users(id)
);

-- Questions table (core content)
CREATE TABLE questions (
    id SERIAL PRIMARY KEY,
    question_text TEXT NOT NULL,  -- Markdown format
    answer_text TEXT NOT NULL,    -- Markdown format
    status question_status DEFAULT 'draft',
    
    -- Audit fields
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by INTEGER REFERENCES users(id) NOT NULL,
    validated_by INTEGER REFERENCES users(id),
    validated_at TIMESTAMP,
    
    -- Flexible JSON data
    sources JSONB DEFAULT '[]'::jsonb,          -- Source citations
    metadata JSONB DEFAULT '{}'::jsonb,         -- Extracted entities, stats
    review_history JSONB DEFAULT '[]'::jsonb,   -- Validation history
    
    -- Full-text search
    search_vector tsvector,
    
    CONSTRAINT questions_check_validated CHECK (
        (status IN ('validated', 'published') AND validated_by IS NOT NULL) OR
        (status NOT IN ('validated', 'published'))
    )
);

-- Many-to-many: Questions <-> Tags
CREATE TABLE question_tags (
    question_id INTEGER REFERENCES questions(id) ON DELETE CASCADE,
    tag_id INTEGER REFERENCES tags(id) ON DELETE CASCADE,
    assigned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    assigned_by INTEGER REFERENCES users(id),
    PRIMARY KEY (question_id, tag_id)
);

-- Question versions (for audit trail)
CREATE TABLE question_versions (
    id SERIAL PRIMARY KEY,
    question_id INTEGER REFERENCES questions(id) ON DELETE CASCADE,
    version_number INTEGER NOT NULL,
    question_text TEXT NOT NULL,
    answer_text TEXT NOT NULL,
    sources JSONB NOT NULL,
    change_summary TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by INTEGER REFERENCES users(id) NOT NULL,
    UNIQUE(question_id, version_number)
);

-- Study sessions (for analytics)
CREATE TABLE study_sessions (
    id SERIAL PRIMARY KEY,
    session_id UUID DEFAULT uuid_generate_v4(),
    question_id INTEGER REFERENCES questions(id) ON DELETE CASCADE,
    user_id INTEGER REFERENCES users(id),
    was_correct BOOLEAN,
    response_time_ms INTEGER,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- === INDEXES ===

-- Primary search indexes
CREATE INDEX idx_questions_status ON questions(status);
CREATE INDEX idx_questions_created_by ON questions(created_by);
CREATE INDEX idx_questions_created_at ON questions(created_at DESC);
CREATE INDEX idx_questions_updated_at ON questions(updated_at DESC);

-- Full-text search
CREATE INDEX idx_questions_search ON questions USING GIN(search_vector);
CREATE INDEX idx_questions_text_trigram ON questions USING GIN(question_text gin_trgm_ops, answer_text gin_trgm_ops);

-- JSONB indexes for fast queries
CREATE INDEX idx_questions_sources ON questions USING GIN(sources);
CREATE INDEX idx_questions_metadata ON questions USING GIN(metadata);
CREATE INDEX idx_questions_review_history ON questions USING GIN(review_history);

-- Tags indexes
CREATE INDEX idx_tags_category ON tags(category);
CREATE INDEX idx_tags_name_trigram ON tags USING GIN(name gin_trgm_ops);

-- Junction table indexes
CREATE INDEX idx_question_tags_tag_id ON question_tags(tag_id);
CREATE INDEX idx_question_tags_assigned_at ON question_tags(assigned_at DESC);

-- Analytics indexes
CREATE INDEX idx_study_sessions_question_id ON study_sessions(question_id);
CREATE INDEX idx_study_sessions_created_at ON study_sessions(created_at DESC);

-- === FUNCTIONS AND TRIGGERS ===

-- Function to update the updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply updated_at trigger to relevant tables
CREATE TRIGGER update_questions_updated_at BEFORE UPDATE ON questions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to update search vector
CREATE OR REPLACE FUNCTION update_question_search_vector()
RETURNS TRIGGER AS $$
BEGIN
    NEW.search_vector = 
        setweight(to_tsvector('french', COALESCE(NEW.question_text, '')), 'A') ||
        setweight(to_tsvector('french', COALESCE(NEW.answer_text, '')), 'B');
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply search vector trigger
CREATE TRIGGER update_questions_search_vector 
    BEFORE INSERT OR UPDATE OF question_text, answer_text ON questions
    FOR EACH ROW EXECUTE FUNCTION update_question_search_vector();

-- Function to create question version on update
CREATE OR REPLACE FUNCTION create_question_version()
RETURNS TRIGGER AS $$
DECLARE
    next_version INTEGER;
BEGIN
    -- Only create version if content actually changed
    IF OLD.question_text != NEW.question_text OR 
       OLD.answer_text != NEW.answer_text OR 
       OLD.sources != NEW.sources THEN
        
        -- Get next version number
        SELECT COALESCE(MAX(version_number), 0) + 1 
        INTO next_version 
        FROM question_versions 
        WHERE question_id = NEW.id;
        
        -- Insert new version record
        INSERT INTO question_versions (
            question_id, version_number, question_text, answer_text, 
            sources, change_summary, created_by
        ) VALUES (
            NEW.id, next_version, OLD.question_text, OLD.answer_text,
            OLD.sources, 'Updated via API', NEW.created_by
        );
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply versioning trigger
CREATE TRIGGER create_question_version_trigger
    AFTER UPDATE ON questions
    FOR EACH ROW EXECUTE FUNCTION create_question_version();

-- === VIEWS FOR COMMON QUERIES ===

-- Published questions with tag info
CREATE VIEW published_questions_with_tags AS
SELECT 
    q.id,
    q.question_text,
    q.answer_text,
    q.sources,
    q.metadata,
    q.created_at,
    u.name as author_name,
    COALESCE(
        JSON_AGG(
            JSON_BUILD_OBJECT(
                'id', t.id,
                'name', t.name,
                'category', t.category,
                'color', t.color
            )
        ) FILTER (WHERE t.id IS NOT NULL), 
        '[]'::json
    ) as tags
FROM questions q
LEFT JOIN users u ON q.created_by = u.id
LEFT JOIN question_tags qt ON q.id = qt.question_id
LEFT JOIN tags t ON qt.tag_id = t.id
WHERE q.status = 'published'
GROUP BY q.id, q.question_text, q.answer_text, q.sources, q.metadata, q.created_at, u.name;

-- Questions pending review by specialty
CREATE VIEW questions_pending_review AS
SELECT 
    q.id,
    q.question_text,
    q.answer_text,
    q.created_at,
    q.updated_at,
    u.name as author_name,
    ARRAY_AGG(DISTINCT t.category) FILTER (WHERE t.category IS NOT NULL) as categories
FROM questions q
LEFT JOIN users u ON q.created_by = u.id
LEFT JOIN question_tags qt ON q.id = qt.question_id
LEFT JOIN tags t ON qt.tag_id = t.id
WHERE q.status = 'pending_review'
GROUP BY q.id, q.question_text, q.answer_text, q.created_at, q.updated_at, u.name
ORDER BY q.created_at ASC;

-- === INITIAL DATA ===

-- Create default admin user
INSERT INTO users (email, name, role, specialties) VALUES 
('admin@flashpharma.fr', 'Admin User', 'admin', '["general"]');

-- Create common tag categories
INSERT INTO tags (name, category, color, description, created_by) VALUES 
('Antibiotiques', 'therapeutic_area', '#e74c3c', 'Questions sur les antibiotiques', 1),
('Beta-lactamines', 'drug_class', '#3498db', 'Pénicillines et céphalosporines', 1),
('Pénicillines', 'drug_class', '#9b59b6', 'Famille des pénicillines', 1),
('Interactions', 'topic', '#f39c12', 'Interactions médicamenteuses', 1),
('Contre-indications', 'topic', '#e67e22', 'Contre-indications absolues et relatives', 1),
('Posologie', 'topic', '#27ae60', 'Dosage et administration', 1),
('Effets-indésirables', 'topic', '#c0392b', 'Effets secondaires et surveillance', 1);

-- === UTILITY FUNCTIONS ===

-- Function to search questions with ranking
CREATE OR REPLACE FUNCTION search_questions(
    search_query TEXT,
    limit_count INTEGER DEFAULT 50,
    offset_count INTEGER DEFAULT 0
)
RETURNS TABLE(
    id INTEGER,
    question_text TEXT,
    answer_text TEXT,
    rank REAL,
    snippet TEXT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        q.id,
        q.question_text,
        q.answer_text,
        ts_rank(q.search_vector, plainto_tsquery('french', search_query)) as rank,
        ts_headline('french', q.question_text || ' ' || q.answer_text, 
                   plainto_tsquery('french', search_query)) as snippet
    FROM questions q
    WHERE q.search_vector @@ plainto_tsquery('french', search_query)
        AND q.status = 'published'
    ORDER BY rank DESC, q.created_at DESC
    LIMIT limit_count
    OFFSET offset_count;
END;
$$ LANGUAGE plpgsql;

-- Function to get question statistics
CREATE OR REPLACE FUNCTION get_question_stats()
RETURNS TABLE(
    total_questions BIGINT,
    published_questions BIGINT,
    pending_review BIGINT,
    total_tags BIGINT,
    active_authors BIGINT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        COUNT(*) FILTER (WHERE TRUE),
        COUNT(*) FILTER (WHERE status = 'published'),
        COUNT(*) FILTER (WHERE status = 'pending_review'),
        (SELECT COUNT(*) FROM tags WHERE is_active = true),
        (SELECT COUNT(DISTINCT created_by) FROM questions WHERE created_at >= CURRENT_DATE - INTERVAL '30 days')
    FROM questions;
END;
$$ LANGUAGE plpgsql;

-- Comments for documentation
COMMENT ON TABLE questions IS 'Core flashcard questions with markdown content and validation workflow';
COMMENT ON TABLE users IS 'System users with roles and pharmacy specialties';
COMMENT ON TABLE tags IS 'Normalized tags with categories for content organization';
COMMENT ON TABLE question_tags IS 'Many-to-many relationship between questions and tags';
COMMENT ON TABLE question_versions IS 'Audit trail of question content changes';
COMMENT ON TABLE study_sessions IS 'Analytics data for spaced repetition and performance tracking';

COMMENT ON COLUMN questions.search_vector IS 'Full-text search vector with French language support';
COMMENT ON COLUMN questions.sources IS 'JSONB array of source citations with structured metadata';
COMMENT ON COLUMN questions.metadata IS 'JSONB object containing extracted entities and processing metadata';
COMMENT ON COLUMN questions.review_history IS 'JSONB array of validation workflow events and comments';