
 -- =====================================================
  -- FlashPharma Database Simplification Migration
  -- From: Complex 6-state workflow system
  -- To: Simple active/inactive system
  -- =====================================================

  BEGIN TRANSACTION;

  -- =====================================================
  -- STEP 1: Add new simple columns
  -- =====================================================
  ALTER TABLE questions
  ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS admin_notes TEXT,
  ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP;

  -- Add indexes for performance
  CREATE INDEX IF NOT EXISTS idx_questions_is_active ON questions(is_active);
  CREATE INDEX IF NOT EXISTS idx_questions_deleted_at ON questions(deleted_at);

  -- =====================================================
  -- STEP 2: Migrate existing data
  -- =====================================================

  -- Published questions become active
  UPDATE questions
  SET is_active = TRUE
  WHERE status = 'published'
    AND is_active IS FALSE;

  -- Archived questions get soft deleted
  UPDATE questions
  SET deleted_at = CURRENT_TIMESTAMP,
      admin_notes = COALESCE(admin_notes, '') ||
                    CASE
                      WHEN admin_notes IS NOT NULL AND admin_notes != ''
                      THEN ' | '
                      ELSE ''
                    END ||
                    'Archived from legacy system'
  WHERE status = 'archived'
    AND deleted_at IS NULL;

  -- Disabled questions get a note
  UPDATE questions
  SET admin_notes = COALESCE(admin_notes, '') ||
                    CASE
                      WHEN admin_notes IS NOT NULL AND admin_notes != ''
                      THEN ' | '
                      ELSE ''
                    END ||
                    'Was disabled in legacy system'
  WHERE status = 'disabled';

  -- Draft/pending_review/validated questions stay inactive (default)
  -- but add a note for context
  UPDATE questions
  SET admin_notes = COALESCE(admin_notes, '') ||
                    CASE
                      WHEN admin_notes IS NOT NULL AND admin_notes != ''
                      THEN ' | '
                      ELSE ''
                    END ||
                    'Legacy status: ' || status
  WHERE status IN ('draft', 'pending_review', 'validated')
    AND (admin_notes IS NULL OR admin_notes NOT LIKE '%Legacy status:%');

  -- =====================================================
  -- STEP 3: Create backup table (safety net)
  -- =====================================================
  CREATE TABLE IF NOT EXISTS questions_backup_status AS
  SELECT
      id,
      status,
      created_by,
      validated_by,
      validated_at,
      review_history,
      CURRENT_TIMESTAMP as backed_up_at
  FROM questions;

  -- =====================================================
  -- STEP 4: Drop unnecessary columns
  -- =====================================================

  -- Drop foreign key constraints first
  ALTER TABLE questions
  DROP CONSTRAINT IF EXISTS questions_created_by_fkey,
  DROP CONSTRAINT IF EXISTS questions_validated_by_fkey;

  -- Drop the complex workflow columns
  ALTER TABLE questions
  DROP COLUMN IF EXISTS status,
  DROP COLUMN IF EXISTS created_by,
  DROP COLUMN IF EXISTS validated_by,
  DROP COLUMN IF EXISTS validated_at,
  DROP COLUMN IF EXISTS review_history;

  -- =====================================================
  -- STEP 5: Clean up related tables
  -- =====================================================

  -- Drop question_versions table if it exists (unnecessary complexity)
  DROP TABLE IF EXISTS question_versions CASCADE;

  -- Simplify users table if it exists
  ALTER TABLE users
  DROP COLUMN IF EXISTS role,
  DROP COLUMN IF EXISTS specialties;

  -- =====================================================
  -- STEP 6: Update or create views for common queries
  -- =====================================================

  -- View for active questions (what students see)
  CREATE OR REPLACE VIEW active_questions AS
  SELECT
      q.id,
      q.question_text,
      q.answer_text,
      q.question_html,
      q.answer_html,
      q.sources,
      q.metadata,
      array_agg(
          json_build_object(
              'id', t.id,
              'name', t.name,
              'category', t.category,
              'color', t.color
          )
      ) FILTER (WHERE t.id IS NOT NULL) as tags
  FROM questions q
  LEFT JOIN question_tags qt ON q.id = qt.question_id
  LEFT JOIN tags t ON qt.tag_id = t.id
  WHERE q.is_active = TRUE
    AND q.deleted_at IS NULL
  GROUP BY q.id;

  -- View for admin panel (all non-deleted questions)
  CREATE OR REPLACE VIEW admin_questions AS
  SELECT
      q.id,
      q.question_text,
      q.answer_text,
      q.question_html,
      q.answer_html,
      q.is_active,
      q.sources,
      q.metadata,
      q.admin_notes,
      q.created_at,
      q.updated_at,
      array_agg(
          json_build_object(
              'id', t.id,
              'name', t.name,
              'category', t.category,
              'color', t.color
          )
      ) FILTER (WHERE t.id IS NOT NULL) as tags
  FROM questions q
  LEFT JOIN question_tags qt ON q.id = qt.question_id
  LEFT JOIN tags t ON qt.tag_id = t.id
  WHERE q.deleted_at IS NULL
  GROUP BY q.id;

  -- =====================================================
  -- STEP 7: Add helper functions
  -- =====================================================

  -- Function to toggle question active status
  CREATE OR REPLACE FUNCTION toggle_question_active(question_id INTEGER)
  RETURNS BOOLEAN AS $$
  DECLARE
      new_status BOOLEAN;
  BEGIN
      UPDATE questions
      SET is_active = NOT is_active,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = question_id
      RETURNING is_active INTO new_status;

      RETURN new_status;
  END;
  $$ LANGUAGE plpgsql;

  -- Function to soft delete a question
  CREATE OR REPLACE FUNCTION soft_delete_question(
      question_id INTEGER,
      reason TEXT DEFAULT NULL
  )
  RETURNS VOID AS $$
  BEGIN
      UPDATE questions
      SET deleted_at = CURRENT_TIMESTAMP,
          is_active = FALSE,
          admin_notes = COALESCE(admin_notes, '') ||
                       CASE
                         WHEN admin_notes IS NOT NULL AND admin_notes != ''
                         THEN ' | '
                         ELSE ''
                       END ||
                       'Deleted: ' || COALESCE(reason, 'No reason provided'),
          updated_at = CURRENT_TIMESTAMP
      WHERE id = question_id;
  END;
  $$ LANGUAGE plpgsql;

  -- Function to restore a deleted question
  CREATE OR REPLACE FUNCTION restore_question(question_id INTEGER)
  RETURNS VOID AS $$
  BEGIN
      UPDATE questions
      SET deleted_at = NULL,
          admin_notes = COALESCE(admin_notes, '') ||
                       CASE
                         WHEN admin_notes IS NOT NULL AND admin_notes != ''
                         THEN ' | '
                         ELSE ''
                       END ||
                       'Restored on ' || CURRENT_DATE,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = question_id;
  END;
  $$ LANGUAGE plpgsql;

  -- =====================================================
  -- STEP 8: Update statistics
  -- =====================================================
  ANALYZE questions;

  -- =====================================================
  -- VERIFICATION QUERIES (Run these to check migration)
  -- =====================================================

  -- Check migration results
  DO $$
  DECLARE
      total_count INTEGER;
      active_count INTEGER;
      deleted_count INTEGER;
      inactive_count INTEGER;
  BEGIN
      SELECT COUNT(*) INTO total_count FROM questions;
      SELECT COUNT(*) INTO active_count FROM questions WHERE is_active = TRUE;
      SELECT COUNT(*) INTO deleted_count FROM questions WHERE deleted_at IS NOT NULL;
      SELECT COUNT(*) INTO inactive_count FROM questions WHERE is_active = FALSE AND deleted_at IS NULL;

      RAISE NOTICE '=== Migration Summary ===';
      RAISE NOTICE 'Total questions: %', total_count;
      RAISE NOTICE 'Active questions: %', active_count;
      RAISE NOTICE 'Inactive questions: %', inactive_count;
      RAISE NOTICE 'Soft-deleted questions: %', deleted_count;
      RAISE NOTICE '========================';
  END $$;

  COMMIT;



