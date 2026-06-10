CREATE INDEX IF NOT EXISTS idx_message_content_fts ON "Message" USING GIN (to_tsvector('russian', COALESCE("content", '')));
