-- Add UNIQUE constraint to prevent duplicate challenge completions
-- This ensures one user can only have ONE entry per challenge

-- SQLite doesn't support ALTER TABLE ADD CONSTRAINT, so we need to recreate the table

BEGIN TRANSACTION;

-- Create new table with UNIQUE constraint
CREATE TABLE challenge_completions_new (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    userId INTEGER NOT NULL,
    challengeId INTEGER NOT NULL,
    challengeTitle TEXT,
    challengeLevel INTEGER DEFAULT 0,
    reward INTEGER NOT NULL,
    hederaTxId TEXT,
    completedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (userId) REFERENCES users(id),
    FOREIGN KEY (challengeId) REFERENCES challenges(id),
    UNIQUE(userId, challengeId)  -- ✅ THIS IS THE FIX!
);

-- Copy existing data (remove duplicates, keep first occurrence)
INSERT INTO challenge_completions_new 
SELECT MIN(id) as id, userId, challengeId, challengeTitle, challengeLevel, reward, hederaTxId, MIN(completedAt) as completedAt
FROM challenge_completions
GROUP BY userId, challengeId;

-- Drop old table
DROP TABLE challenge_completions;

-- Rename new table
ALTER TABLE challenge_completions_new RENAME TO challenge_completions;

-- Recreate indexes
CREATE INDEX idx_challenge_completions_user ON challenge_completions(userId);
CREATE INDEX idx_challenge_completions_challenge ON challenge_completions(challengeId);

COMMIT;