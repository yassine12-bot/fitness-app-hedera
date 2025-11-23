import React, { useState, useEffect } from 'react';
import './ChallengesProgress.css';

const ChallengesProgress = ({ token }) => {
  const [tab, setTab] = useState('daily');
  const [challenges, setChallenges] = useState({ daily: [], duration: [], social: [] });
  const [progress, setProgress] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 10000); // Refresh every 10s
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
      console.error('Error fetching data:', error);
      setLoading(false);
    }
  };

  const fetchChallenges = async () => {
    const response = await fetch('http://localhost:3000/api/challenges/active', {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const data = await response.json();
    if (data.success) {
      setChallenges({
        daily: data.data.daily || [],
        duration: data.data.duration || [],
        social: data.data.social || []
      });
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

  const currentChallenges = challenges[tab] || [];

  if (loading) {
    return (
      <div className="challenges-progress">
        <div className="loading">Chargement...</div>
      </div>
    );
  }

  return (
    <div className="challenges-progress">
      {/* Stats */}
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
        {currentChallenges.length === 0 ? (
          <div className="no-challenges">
            <p>Aucun challenge dans cette catégorie</p>
          </div>
        ) : (
          currentChallenges.map(challenge => (
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
  const percent = challenge.progressPercent || 0;
  const isCompleted = challenge.isCompleted;

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
        {challenge.description || `Complete ${challenge.target.toLocaleString()} ${challenge.type === 'social' ? 'posts' : 'steps'}`}
      </div>

      <div className="challenge-progress-section">
        <div className="progress-info">
          <span className="progress-current">
            {(challenge.currentProgress || 0).toLocaleString()}
          </span>
          <span className="progress-separator">/</span>
          <span className="progress-target">
            {challenge.target.toLocaleString()} {challenge.type === 'social' ? 'posts' : 'pas'}
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