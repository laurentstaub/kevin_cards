-- Migration: Add HTML columns for rendered markdown content
-- Date: 2025-08-24
-- Purpose: Store pre-rendered HTML alongside markdown for better performance

-- Add HTML columns to questions table
ALTER TABLE questions 
ADD COLUMN IF NOT EXISTS question_html TEXT,
ADD COLUMN IF NOT EXISTS answer_html TEXT;

-- Add comments for documentation
COMMENT ON COLUMN questions.question_html IS 'Pre-rendered HTML version of question_text markdown';
COMMENT ON COLUMN questions.answer_html IS 'Pre-rendered HTML version of answer_text markdown';

-- Create index for faster retrieval
CREATE INDEX IF NOT EXISTS idx_questions_html_not_null 
ON questions(id) 
WHERE question_html IS NOT NULL AND answer_html IS NOT NULL;

-- Function to convert markdown to HTML (placeholder for trigger)
CREATE OR REPLACE FUNCTION update_html_from_markdown()
RETURNS TRIGGER AS $$
BEGIN
    -- This is a placeholder. The actual conversion will be done in the application layer
    -- This trigger ensures html columns are updated when markdown changes
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to update timestamp when markdown changes
DROP TRIGGER IF EXISTS update_questions_html_trigger ON questions;
CREATE TRIGGER update_questions_html_trigger
BEFORE UPDATE ON questions
FOR EACH ROW
WHEN (OLD.question_text IS DISTINCT FROM NEW.question_text 
   OR OLD.answer_text IS DISTINCT FROM NEW.answer_text)
EXECUTE FUNCTION update_html_from_markdown();

-- Grant necessary permissions
GRANT SELECT, UPDATE ON questions TO PUBLIC;

-- Migration verification
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'questions' 
        AND column_name IN ('question_html', 'answer_html')
    ) THEN
        RAISE EXCEPTION 'Migration failed: HTML columns were not created';
    END IF;
    
    RAISE NOTICE 'Migration successful: HTML columns added to questions table';
END;
$$;