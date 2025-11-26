import React, { useState, useEffect } from 'react';
import './ChallengesProgress.css';

const ChallengesProgress = ({ token, user }) => {
  const [tab, setTab] = useState('daily');
  const [allChallenges, setAllChallenges] = useState([]);
 
  const [loading, setLoading] = useState(true);

  useEffect(() => {
  fetchChallenges();
  // ❌ DISABLED - Polling every 10s causes too many API calls
  // Users can manually refresh if needed
  // const interval = setInterval(fetchChallenges, 10000);
  // return () => clearInterval(interval);
}, [token]);

  

  const fetchChallenges = async () => {
  try {
    const response = await fetch('http://localhost:3000/api/challenges/active', {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const data = await response.json();
    if (data.success) {
      setAllChallenges(data.data.all || []);
    }
  } catch (error) {
    console.error('Error fetching challenges:', error);
  } finally {
    setLoading(false); // ✅ AJOUTE CECI!
  }
};

  

  

  // Calculate stats
  const stats = {
  totalChallenges: allChallenges.length,
  completedChallenges: allChallenges.filter(c => c.isCompleted).length,
  activeChallenges: allChallenges.filter(c => !c.isCompleted && c.currentProgress > 0).length
};
  if (loading) {
    return (
      <div className="challenges-progress">
        <div className="loading">Chargement des challenges blockchain...</div>
      </div>
    );
  }
// Backend already returns enriched challenges with progress!
const challengesByType = {
  daily: allChallenges.filter(c => c.type === 'daily_steps'),
  duration: allChallenges.filter(c => c.type === 'duration_steps'),
  social: allChallenges.filter(c => c.type === 'social')
};

// No need to enrich again - backend already did it!
const enrichedChallenges = challengesByType[tab];
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