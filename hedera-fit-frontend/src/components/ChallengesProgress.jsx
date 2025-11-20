import React, { useState, useEffect } from 'react';
import './ChallengesProgress.css';

/**
 * CHALLENGES PROGRESS - Affichage des challenges avec progression
 * 
 * FONCTIONNALITÉS:
 * - Liste challenges actifs
 * - Barres de progression animées
 * - Stats utilisateur (complétés/actifs)
 * - Refresh automatique
 */

const ChallengesProgress = ({ token }) => {
  const [challenges, setChallenges] = useState([]);
  const [progress, setProgress] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
    // Refresh toutes les 10 secondes
    const interval = setInterval(fetchData, 10000);
    return () => clearInterval(interval);
  }, [token]);

  const fetchData = async () => {
    try {
      await Promise.all([
        fetchChallenges(),
        fetchProgress(),
        fetchStats()
      ]);
      setLoading(false);
    } catch (error) {
      console.error('Erreur fetch data:', error);
      setLoading(false);
    }
  };

 const fetchChallenges = async () => {
  const response = await fetch('http://localhost:3000/api/challenges/active', {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  const data = await response.json();
  if (data.success) {
    // Nouvelle API retourne { challenges: [...], userLevel: 1, totalCompleted: 0 }
    const challengesArray = data.data.challenges || data.data || [];
    setChallenges(challengesArray);
  }
};

  const fetchProgress = async () => {
    const response = await fetch('http://localhost:3000/api/challenges/my-progress', {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const data = await response.json();
    if (data.success) {
      setProgress(data.data);
    }
  };

  const fetchStats = async () => {
    const response = await fetch('http://localhost:3000/api/challenges/my-stats', {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const data = await response.json();
    if (data.success) {
      setStats(data.data);
    }
  };

  // Combiner challenges et progression
  const getChallengeProgress = (challengeId) => {
    return progress.find(p => p.challengeId === challengeId) || {
      currentProgress: 0,
      progressPercent: 0,
      isCompleted: false
    };
  };

  if (loading) {
    return (
      <div className="challenges-progress">
        <div className="loading">Chargement...</div>
      </div>
    );
  }

  return (
    <div className="challenges-progress">
      {/* Stats en haut */}
      {stats && (
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
      )}

      {/* Liste des challenges */}
      <div className="challenges-list">
        <h2>🎯 Challenges Actifs</h2>
        
        {challenges.length === 0 ? (
          <div className="no-challenges">
            <p>Aucun challenge actif pour le moment</p>
          </div>
        ) : (
          challenges.map(challenge => {
            const prog = getChallengeProgress(challenge.id);
            return (
              <ChallengeCard
                key={challenge.id}
                challenge={challenge}
                progress={prog}
              />
            );
          })
        )}
      </div>
    </div>
  );
};

// Carte individuelle de challenge
const ChallengeCard = ({ challenge, progress }) => {
  const percent = progress.progressPercent || 0;
  const isCompleted = progress.isCompleted;

  return (
    <div className={`challenge-card ${isCompleted ? 'completed' : ''}`}>
      <div className="challenge-header">
        <div className="challenge-title">
          {isCompleted && <span className="completed-badge">✓</span>}
          {challenge.title}
        </div>
        <div className="challenge-reward">
          🪙 {challenge.reward} FIT
        </div>
      </div>

      <div className="challenge-description">
        {challenge.description}
      </div>

      <div className="challenge-progress-section">
        <div className="progress-info">
          <span className="progress-current">
            {(progress.currentProgress || 0).toLocaleString()}
          </span>
          <span className="progress-separator">/</span>
          <span className="progress-target">
            {challenge.target.toLocaleString()} {challenge.type === 'steps' ? 'pas' : ''}
          </span>
        </div>
        <div className="progress-percent">{percent}%</div>
      </div>

      <div className="progress-bar-container">
        <div
          className="progress-bar-fill"
          style={{ width: `${Math.min(percent, 100)}%` }}
        >
          {percent >= 10 && (
            <span className="progress-bar-text">{percent}%</span>
          )}
        </div>
      </div>

      {isCompleted && (
        <div className="completion-message">
          🎉 Challenge complété! Récompense réclamée.
        </div>
      )}
    </div>
  );
};

export default ChallengesProgress;
