-- ============================================================================
-- Migration : QA similarity (Phase 2)
-- Date      : 2026-05-17
-- Doctrine  : DJIBRIL CHINOIS — embeddings via DashScope text-embedding-v4 (qwen, 1024d)
-- ============================================================================

-- Convert qa_kb.embedding TEXT placeholder → JSONB array of floats
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'qa_kb' AND column_name = 'embedding' AND data_type = 'text'
  ) THEN
    ALTER TABLE qa_kb ALTER COLUMN embedding TYPE JSONB USING NULLIF(embedding, '')::jsonb;
  END IF;
END$$;

-- Ensure embedding column exists as JSONB
ALTER TABLE qa_kb ADD COLUMN IF NOT EXISTS embedding JSONB;
ALTER TABLE qa_questions ADD COLUMN IF NOT EXISTS embedding JSONB;

-- Add embedding model + dim tracking for future migrations
ALTER TABLE qa_kb ADD COLUMN IF NOT EXISTS embedding_model TEXT;
ALTER TABLE qa_questions ADD COLUMN IF NOT EXISTS embedding_model TEXT;

-- Index pour lookup rapide des records sans embedding (pour batch cron)
CREATE INDEX IF NOT EXISTS idx_qa_kb_no_embedding
  ON qa_kb(created_at) WHERE embedding IS NULL;
CREATE INDEX IF NOT EXISTS idx_qa_questions_no_embedding
  ON qa_questions(created_at) WHERE embedding IS NULL AND status IN ('qualified','awaiting_djibril','answered');

COMMENT ON COLUMN qa_kb.embedding IS 'qwen text-embedding-v4 (1024 dim) — array float';
COMMENT ON COLUMN qa_questions.embedding IS 'qwen text-embedding-v4 (1024 dim) — array float';
