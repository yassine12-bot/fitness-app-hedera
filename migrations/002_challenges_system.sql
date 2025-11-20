-- Migration: Système de challenges utilisateurs
-- Date: 2024-11-15

-- Table pour tracker les challenges des utilisateurs
CREATE TABLE IF NOT EXISTS user_challenges (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  userId INTEGER NOT NULL,
  challengeId INTEGER NOT NULL,
  progress INTEGER DEFAULT 0,
  status TEXT DEFAULT 'active' CHECK(status IN ('active', 'completed', 'failed')),
  startedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
  completedAt DATETIME,
  rewardClaimed INTEGER DEFAULT 0,
  FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (challengeId) REFERENCES challenges(id) ON DELETE CASCADE,
  UNIQUE(userId, challengeId)
);

CREATE INDEX IF NOT EXISTS idx_user_challenges_userId ON user_challenges(userId);
CREATE INDEX IF NOT EXISTS idx_user_challenges_status ON user_challenges(status);

-- Vue pour progression des challenges
CREATE VIEW IF NOT EXISTS user_challenge_progress AS
SELECT 
  uc.id,
  uc.userId,
  u.name as userName,
  c.id as challengeId,
  c.title,
  c.description,
  c.type,
  c.target,
  c.reward,
  uc.progress,
  uc.status,
  ROUND((CAST(uc.progress AS REAL) / c.target) * 100, 2) as percentage,
  uc.startedAt,
  uc.completedAt,
  uc.rewardClaimed
FROM user_challenges uc
JOIN users u ON uc.userId = u.id
JOIN challenges c ON uc.challengeId = c.id;