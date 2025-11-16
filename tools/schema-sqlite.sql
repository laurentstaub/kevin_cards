-- FlashPharma Questions Management Database Schema
-- SQLite 3.8+

-- Enable foreign key support
PRAGMA foreign_keys = ON;

-- Users table
CREATE TABLE users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    role TEXT DEFAULT 'author' CHECK (role IN ('author', 'reviewer', 'editor', 'admin')),
    specialties TEXT DEFAULT '[]',  -- JSON array of pharmacy specialties
    is_active INTEGER DEFAULT 1 CHECK (is_active IN (0, 1)),
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
);

-- Tags table (normalized)
CREATE TABLE tags (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT UNIQUE NOT NULL,
    category TEXT,  -- e.g., 'drug_class', 'therapeutic_area', 'topic'
    color TEXT DEFAULT '#6c757d',  -- Hex color for UI
    description TEXT,
    is_active INTEGER DEFAULT 1 CHECK (is_active IN (0, 1)),
    created_at TEXT DEFAULT (datetime('now')),
    created_by INTEGER REFERENCES users(id)
);

-- Questions table (core content)
CREATE TABLE questions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    question_text TEXT NOT NULL,  -- Markdown format
    answer_text TEXT NOT NULL,    -- Markdown format
    question_html TEXT,           -- Generated HTML from markdown
    answer_html TEXT,             -- Generated HTML from markdown
    status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'pending_review', 'validated', 'published', 'disabled', 'archived')),
    is_active INTEGER DEFAULT 0 CHECK (is_active IN (0, 1)),
    admin_notes TEXT,
    deleted_at TEXT,

    -- Audit fields
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now')),
    created_by INTEGER REFERENCES users(id) NOT NULL,
    validated_by INTEGER REFERENCES users(id),
    validated_at TEXT,

    -- Flexible JSON data
    sources TEXT DEFAULT '[]',          -- JSON array of source citations
    metadata TEXT DEFAULT '{}',         -- JSON object for extracted entities, stats
    review_history TEXT DEFAULT '[]',   -- JSON array for validation history

    -- Check constraint for validation
    CHECK (
        (status IN ('validated', 'published') AND validated_by IS NOT NULL) OR
        (status NOT IN ('validated', 'published'))
    )
);

-- Many-to-many: Questions <-> Tags
CREATE TABLE question_tags (
    question_id INTEGER REFERENCES questions(id) ON DELETE CASCADE,
    tag_id INTEGER REFERENCES tags(id) ON DELETE CASCADE,
    assigned_at TEXT DEFAULT (datetime('now')),
    assigned_by INTEGER REFERENCES users(id),
    PRIMARY KEY (question_id, tag_id)
);

-- Question versions (for audit trail)
CREATE TABLE question_versions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    question_id INTEGER REFERENCES questions(id) ON DELETE CASCADE,
    version_number INTEGER NOT NULL,
    question_text TEXT NOT NULL,
    answer_text TEXT NOT NULL,
    sources TEXT NOT NULL,
    change_summary TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    created_by INTEGER REFERENCES users(id) NOT NULL,
    UNIQUE(question_id, version_number)
);

-- Study sessions (for analytics)
CREATE TABLE study_sessions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    session_id TEXT DEFAULT (lower(hex(randomblob(16)))),  -- UUID alternative
    question_id INTEGER REFERENCES questions(id) ON DELETE CASCADE,
    user_id INTEGER REFERENCES users(id),
    was_correct INTEGER CHECK (was_correct IN (0, 1)),
    response_time_ms INTEGER,
    created_at TEXT DEFAULT (datetime('now'))
);

-- === INDEXES ===

-- Primary search indexes
CREATE INDEX idx_questions_status ON questions(status);
CREATE INDEX idx_questions_created_by ON questions(created_by);
CREATE INDEX idx_questions_created_at ON questions(created_at DESC);
CREATE INDEX idx_questions_updated_at ON questions(updated_at DESC);

-- Tags indexes
CREATE INDEX idx_tags_category ON tags(category);
CREATE INDEX idx_tags_name ON tags(name);

-- Junction table indexes
CREATE INDEX idx_question_tags_tag_id ON question_tags(tag_id);
CREATE INDEX idx_question_tags_assigned_at ON question_tags(assigned_at DESC);

-- Analytics indexes
CREATE INDEX idx_study_sessions_question_id ON study_sessions(question_id);
CREATE INDEX idx_study_sessions_created_at ON study_sessions(created_at DESC);

-- === TRIGGERS ===

-- Trigger to update the updated_at timestamp for questions
CREATE TRIGGER update_questions_updated_at
    AFTER UPDATE ON questions
    FOR EACH ROW
    WHEN NEW.updated_at = OLD.updated_at
BEGIN
    UPDATE questions SET updated_at = datetime('now') WHERE id = NEW.id;
END;

-- Trigger to update the updated_at timestamp for users
CREATE TRIGGER update_users_updated_at
    AFTER UPDATE ON users
    FOR EACH ROW
    WHEN NEW.updated_at = OLD.updated_at
BEGIN
    UPDATE users SET updated_at = datetime('now') WHERE id = NEW.id;
END;

-- Trigger to create question version on update
CREATE TRIGGER create_question_version_trigger
    AFTER UPDATE ON questions
    FOR EACH ROW
    WHEN (OLD.question_text != NEW.question_text OR
          OLD.answer_text != NEW.answer_text OR
          OLD.sources != NEW.sources)
BEGIN
    INSERT INTO question_versions (
        question_id, version_number, question_text, answer_text,
        sources, change_summary, created_by
    ) VALUES (
        NEW.id,
        (SELECT COALESCE(MAX(version_number), 0) + 1 FROM question_versions WHERE question_id = NEW.id),
        OLD.question_text, OLD.answer_text,
        OLD.sources, 'Updated via API', NEW.created_by
    );
END;

-- === VIEWS FOR COMMON QUERIES ===

-- Published questions with tag info (simplified for SQLite)
CREATE VIEW published_questions_with_tags AS
SELECT
    q.id,
    q.question_text,
    q.answer_text,
    q.sources,
    q.metadata,
    q.created_at,
    u.name as author_name,
    GROUP_CONCAT(
        json_object(
            'id', t.id,
            'name', t.name,
            'category', t.category,
            'color', t.color
        )
    ) as tags
FROM questions q
LEFT JOIN users u ON q.created_by = u.id
LEFT JOIN question_tags qt ON q.id = qt.question_id
LEFT JOIN tags t ON qt.tag_id = t.id
WHERE q.status = 'published'
GROUP BY q.id, q.question_text, q.answer_text, q.sources, q.metadata, q.created_at, u.name;

-- Questions pending review
CREATE VIEW questions_pending_review AS
SELECT
    q.id,
    q.question_text,
    q.answer_text,
    q.created_at,
    q.updated_at,
    u.name as author_name,
    GROUP_CONCAT(DISTINCT t.category) as categories
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