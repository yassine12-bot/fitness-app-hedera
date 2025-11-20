-- ====================================================
-- RESET COMPLET DES CHALLENGES
-- ====================================================
-- Ce script supprime tous les anciens challenges et données associées
-- À utiliser AVANT d'installer le nouveau système

-- 1. Supprimer toutes les progressions utilisateurs
DROP TABLE IF EXISTS challenge_progress;

-- 2. Supprimer tous les challenges
DROP TABLE IF EXISTS challenges;

-- 3. Supprimer l'historique des challenges complétés
DROP TABLE IF EXISTS challenge_completions;

-- 4. Supprimer les niveaux utilisateurs
DROP TABLE IF EXISTS user_challenge_levels;

-- ====================================================
-- CRÉER LES NOUVELLES TABLES
-- ====================================================

-- Table des challenges
CREATE TABLE IF NOT EXISTS challenges (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    type TEXT NOT NULL, -- 'daily_steps', 'duration_steps', 'social'
    level INTEGER NOT NULL, -- 1=Débutant, 2=Intermédiaire, 3=Avancé, 4=Expert, 5=Maître
    target INTEGER NOT NULL, -- Objectif (nombre de pas, posts, etc.)
    duration INTEGER, -- Durée en jours (NULL pour challenges quotidiens)
    reward INTEGER NOT NULL, -- Récompense en FIT tokens
    isActive INTEGER DEFAULT 1,
    createdAt DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Table de progression des utilisateurs
CREATE TABLE IF NOT EXISTS challenge_progress (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    userId INTEGER NOT NULL,
    challengeId INTEGER NOT NULL,
    progress INTEGER DEFAULT 0, -- Progression actuelle
    startedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
    lastUpdated DATETIME DEFAULT CURRENT_TIMESTAMP,
    isCompleted INTEGER DEFAULT 0,
    FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (challengeId) REFERENCES challenges(id) ON DELETE CASCADE,
    UNIQUE(userId, challengeId)
);

-- Table historique des challenges complétés
CREATE TABLE IF NOT EXISTS challenge_completions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    userId INTEGER NOT NULL,
    challengeId INTEGER NOT NULL,
    challengeTitle TEXT NOT NULL,
    challengeLevel INTEGER NOT NULL,
    reward INTEGER NOT NULL,
    completedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
    hederaTxId TEXT, -- Transaction ID Hedera pour le transfert de tokens
    FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE
);

-- Table des niveaux utilisateurs
CREATE TABLE IF NOT EXISTS user_challenge_levels (
    userId INTEGER PRIMARY KEY,
    currentLevel INTEGER DEFAULT 1, -- Niveau actuel (1-5)
    totalChallengesCompleted INTEGER DEFAULT 0,
    totalRewardsEarned INTEGER DEFAULT 0,
    lastLevelUpAt DATETIME,
    FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE
);

-- ====================================================
-- INDEXES POUR PERFORMANCE
-- ====================================================

CREATE INDEX IF NOT EXISTS idx_challenges_level ON challenges(level);
CREATE INDEX IF NOT EXISTS idx_challenges_type ON challenges(type);
CREATE INDEX IF NOT EXISTS idx_challenge_progress_user ON challenge_progress(userId);
CREATE INDEX IF NOT EXISTS idx_challenge_completions_user ON challenge_completions(userId);

-- ====================================================
-- RÉSULTAT
-- ====================================================

SELECT 'Reset complet terminé !' as message;
SELECT 'Tables créées: challenges, challenge_progress, challenge_completions, user_challenge_levels' as status;