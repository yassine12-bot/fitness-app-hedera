import React, { useState, useEffect } from 'react';
import './ChallengesProgress.css';

const ChallengesProgress = ({ token, user }) => {
  const [tab, setTab] = useState('daily');
  const [allChallenges, setAllChallenges] = useState([]);
  const [userProgress, setUserProgress] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 10000);
    return () => clearInterval(interval);
  }, [token]);

  const fetchData = async () => {
    try {
      await Promise.all([
        fetchChallenges(),
        fetchUserProgress()
      ]);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching data:', error);
      setLoading(false);
    }
  };

  const fetchChallenges = async () => {
    const response = await fetch('http://localhost:3000/api/challenges', {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const data = await response.json();
    if (data.success) {
      setAllChallenges(data.data.challenges || []);
    }
  };

  const fetchUserProgress = async () => {
    const response = await fetch('http://localhost:3000/api/challenges/progress', {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const data = await response.json();
    if (data.success) {
      setUserProgress(data.data || []);
    }
  };

  // Group challenges by type
  const challengesByType = {
    daily: allChallenges.filter(c => c.type === 'daily_steps'),
    duration: allChallenges.filter(c => c.type === 'duration_steps'),
    social: allChallenges.filter(c => c.type === 'social')
  };

  // Add progress to challenges
  const enrichedChallenges = challengesByType[tab].map(challenge => {
    const progress = userProgress.find(p => p.challengeId === challenge.id);
    return {
      ...challenge,
      currentProgress: progress?.progress || 0,
      isCompleted: progress?.completed || false,
      isUnlocked: progress?.unlocked || (challenge.level === 1),
      progressPercent: challenge.target > 0 
        ? Math.min(100, Math.floor(((progress?.progress || 0) / challenge.target) * 100))
        : 0
    };
  });

  // Calculate stats
  const stats = {
    totalChallenges: allChallenges.length,
    completedChallenges: userProgress.filter(p => p.completed).length,
    activeChallenges: userProgress.filter(p => !p.completed && p.progress > 0).length
  };

  if (loading) {
    return (
      <div className="challenges-progress">
        <div className="loading">Chargement des challenges blockchain...</div>
      </div>
    );
  }

  return (
    <div className="challenges-progress">
      {/* Header with blockchain info */}
      <div className="challenges-header">
        <h2>🎯 Challenges - Hedera Blockchain</h2>
        {user?.hederaAccountId && (
          <p className="wallet-badge">
            🔐 {user.hederaAccountId}
          </p>
        )}
      </div>

      {/* Stats */}
      <div className="challenges-stats">
        <div className="stat-box">
          <div className="stat-number">{stats.totalChallenges}</div>
          <div className="stat-label">Total</div>
        </div>
        <div className="stat-box completed">
          <div className="stat-number">{stats.completedChallenges}</div>
          <div className="stat-label">Complétés</div>
        </div>
        <div className="stat-box active">
          <div className="stat-number">{stats.activeChallenges}</div>
          <div className="stat-label">En cours</div>
        </div>
      </div>

      {/* Tabs */}
      <div className="challenges-tabs">
        <button
          className={`tab ${tab === 'daily' ? 'active' : ''}`}
          onClick={() => setTab('daily')}
        >
          🏃 Daily Steps
        </button>
        <button
          className={`tab ${tab === 'duration' ? 'active' : ''}`}
          onClick={() => setTab('duration')}
        >
          ⏱️ Duration
        </button>
        <button
          className={`tab ${tab === 'social' ? 'active' : ''}`}
          onClick={() => setTab('social')}
        >
          👥 Social
        </button>
      </div>

      {/* Challenges list */}
      <div className="challenges-list">
        {enrichedChallenges.length === 0 ? (
          <div className="no-challenges">
            <p>Aucun challenge dans cette catégorie</p>
          </div>
        ) : (
          enrichedChallenges.map(challenge => (
            <ChallengeCard
              key={challenge.id}
              challenge={challenge}
            />
          ))
        )}
      </div>
    </div>
  );
};

const ChallengeCard = ({ challenge }) => {
  const { isCompleted, isUnlocked, progressPercent, currentProgress, target, reward } = challenge;

  return (
    <div className={`challenge-card ${isCompleted ? 'completed' : ''} ${!isUnlocked ? 'locked' : ''}`}>
      <div className="challenge-header">
        <div className="challenge-title">
          {isCompleted && <span className="completed-badge">✓</span>}
          {!isUnlocked && <span className="locked-badge">🔒</span>}
          {challenge.title}
        </div>
        <div className="challenge-reward">
          🪙 {reward} FIT
        </div>
      </div>

      <div className="challenge-level">
        Niveau {challenge.level}
      </div>

      {!isUnlocked ? (
        <div className="locked-message">
          🔒 Complète le challenge précédent pour déverrouiller
        </div>
      ) : (
        <>
          <div className="challenge-progress-section">
            <div className="progress-info">
              <span className="progress-current">
                {currentProgress.toLocaleString()}
              </span>
              <span className="progress-separator">/</span>
              <span className="progress-target">
                {target.toLocaleString()} {challenge.type === 'social' ? 'posts' : 'pas'}
              </span>
            </div>
            <div className="progress-percent">{progressPercent}%</div>
          </div>

          <div className="progress-bar-container">
            <div
              className="progress-bar-fill"
              style={{ width: `${Math.min(progressPercent, 100)}%` }}
            >
              {progressPercent >= 10 && (
                <span className="progress-bar-text">{progressPercent}%</span>
              )}
            </div>
          </div>

          {isCompleted && (
            <div className="completion-message">
              🎉 Challenge complété! +{reward} FIT réclamés
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default ChallengesProgress;