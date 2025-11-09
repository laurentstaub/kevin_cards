-- Migration: Add missing critical indexes for performance
-- Date: 2025-11-09
-- Description: Adds indexes on frequently queried columns

-- Critical: is_active is used in almost every query
CREATE INDEX IF NOT EXISTS idx_questions_is_active ON questions(is_active);

-- Important: deleted_at is used to filter soft-deleted questions
CREATE INDEX IF NOT EXISTS idx_questions_deleted_at ON questions(deleted_at);

-- Critical: question_id in question_tags is used in JOINs frequently
-- (tag_id index already exists, but we need the reverse)
CREATE INDEX IF NOT EXISTS idx_question_tags_question_id ON question_tags(question_id);

-- Composite index for common query pattern: active + not deleted
CREATE INDEX IF NOT EXISTS idx_questions_active_not_deleted ON questions(is_active, deleted_at);

-- Index for tags is_active (used in tag queries)
CREATE INDEX IF NOT EXISTS idx_tags_is_active ON tags(is_active);

-- Composite index for ordering active questions by updated_at (common pattern)
CREATE INDEX IF NOT EXISTS idx_questions_active_updated ON questions(is_active, updated_at DESC);
