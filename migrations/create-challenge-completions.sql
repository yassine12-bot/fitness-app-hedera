-- Track which challenges have been logged to registry topic
-- Prevents duplicate logging of the same challenge completion
CREATE TABLE IF NOT EXISTS challenge_completions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  userId INTEGER NOT NULL,
  challengeId INTEGER NOT NULL,
  completedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (userId) REFERENCES users(id),
  UNIQUE(userId, challengeId)
);

CREATE INDEX IF NOT EXISTS idx_challenge_completions_user 
ON challenge_completions(userId);

CREATE INDEX IF NOT EXISTS idx_challenge_completions_challenge 
ON challenge_completions(challengeId);
