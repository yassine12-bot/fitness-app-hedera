-- Add Hedera Topic ID column to topics table
ALTER TABLE topics ADD COLUMN hederaTopicId TEXT;

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_topics_hedera_id ON topics(hederaTopicId);
