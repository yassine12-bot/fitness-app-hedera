import React, { useState, useRef, useEffect } from 'react';
import './StepSimulator.css';

/**
 * STEP SIMULATOR - Simulateur de pas EXPONENTIEL
 * 
 * FONCTION: v(t) = 100 × e^(0.144t)
 * - v₀ = 100 pas/sec
 * - k = 0.144
 * - Atteint ~10,000 pas en 20 secondes
 * 
 * AMÉLIORATION:
 * - Calcul en temps réel basé sur la formule exponentielle
 * - Affichage de la vitesse instantanée
 * - Animation visuelle de l'accélération
 */

const StepSimulator = ({ token, onStepsAdded }) => {
  const [isHolding, setIsHolding] = useState(false);
  const [totalSteps, setTotalSteps] = useState(0);
  const [sessionSteps, setSessionSteps] = useState(0);
  const [currentSpeed, setCurrentSpeed] = useState(0);
  const [holdDuration, setHoldDuration] = useState(0);
  const [challenges, setChallenges] = useState([]);
  const [message, setMessage] = useState('');
  
  const intervalRef = useRef(null);
  const startTimeRef = useRef(null);
  const lastStepsRef = useRef(0);

  useEffect(() => {
    fetchActiveChallenges();
  }, []);

  const fetchActiveChallenges = async () => {
    try {
      const response = await fetch('http://localhost:3000/api/challenges/active', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await response.json();
      if (data.success) {
        // ✅ FIX: Nouvelle API retourne { challenges: [...], userLevel: 1 }
        const challengesArray = data.data.challenges || data.data || [];
        const stepChallenges = challengesArray.filter(c => 
          c.type === 'daily_steps' || c.type === 'duration_steps'
        );
        setChallenges(stepChallenges);
      }
    } catch (error) {
      console.error('Erreur fetch challenges:', error);
    }
  };

  /**
   * Formule exponentielle: v(t) = 100 × e^(0.144t)
   * Intégrale cumulée: S(t) = (100/0.144) × (e^(0.144t) - 1)
   */
  const calculateSteps = (elapsedSeconds) => {
    const v0 = 100;  // vitesse initiale (pas/sec)
    const k = 0.144; // coefficient exponentiel
    
    // Calcul des pas cumulés: S(t) = (v₀/k) × (e^(kt) - 1)
    const steps = (v0 / k) * (Math.exp(k * elapsedSeconds) - 1);
    
    // Vitesse instantanée: v(t) = v₀ × e^(kt)
    const speed = v0 * Math.exp(k * elapsedSeconds);
    
    return {
      steps: Math.floor(steps),
      speed: Math.floor(speed)
    };
  };

  const handleMouseDown = () => {
    setIsHolding(true);
    setSessionSteps(0);
    setMessage('');
    startTimeRef.current = Date.now();
    lastStepsRef.current = 0;

    // Mise à jour toutes les 50ms pour une animation fluide
    intervalRef.current = setInterval(() => {
      const elapsedMs = Date.now() - startTimeRef.current;
      const elapsedSeconds = elapsedMs / 1000;
      
      const { steps, speed } = calculateSteps(elapsedSeconds);
      
      setSessionSteps(steps);
      setTotalSteps(prev => prev + (steps - lastStepsRef.current));
      setCurrentSpeed(speed);
      setHoldDuration(elapsedSeconds);
      
      lastStepsRef.current = steps;
    }, 50);
  };

  const handleMouseUp = async () => {
    setIsHolding(false);
    setCurrentSpeed(0);
    setHoldDuration(0);
    clearInterval(intervalRef.current);

    if (sessionSteps > 0) {
      await updateChallenges(sessionSteps);
      
      if (onStepsAdded) {
        onStepsAdded(sessionSteps);
      }
    }
  };

  // ✅ FIX: API correcte pour update-progress
  const updateChallenges = async (steps) => {
    try {
      // Appeler l'API une seule fois pour tous les challenges
      const response = await fetch('http://localhost:3000/api/challenges/update-progress', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ steps })  // ✅ Format correct
      });

      const data = await response.json();
      
      if (data.success) {
        setMessage(`✅ +${steps.toLocaleString()} pas ajoutés aux challenges!`);
        await fetchActiveChallenges();  // Rafraîchir les challenges
      }
    } catch (error) {
      console.error('Erreur update challenges:', error);
      setMessage('❌ Erreur lors de la mise à jour');
    }
  };

  const getSpeedColor = () => {
    if (currentSpeed < 200) return '#3498db';
    if (currentSpeed < 500) return '#2ecc71';
    if (currentSpeed < 1000) return '#f39c12';
    return '#e74c3c';
  };

  return (
    <div className="step-simulator">
      <div className="simulator-header">
        <h2>🚶‍♂️ Simulateur de Pas Exponentiel</h2>
        <p className="simulator-desc">
          Maintiens le bouton - L'accélération augmente avec le temps!
        </p>
      </div>

      <div className="simulator-stats">
        <div className="stat-card">
          <div className="stat-value">{totalSteps.toLocaleString()}</div>
          <div className="stat-label">Total pas</div>
        </div>
        <div className="stat-card session">
          <div className="stat-value">{sessionSteps.toLocaleString()}</div>
          <div className="stat-label">Session actuelle</div>
        </div>
        {isHolding && (
          <div className="stat-card speed" style={{ borderColor: getSpeedColor() }}>
            <div className="stat-value" style={{ color: getSpeedColor() }}>
              {currentSpeed.toLocaleString()}
            </div>
            <div className="stat-label">Pas/sec</div>
          </div>
        )}
      </div>

      {/* Barre de progression temporelle */}
      {isHolding && (
        <div className="time-progress">
          <div className="time-bar">
            <div 
              className="time-fill" 
              style={{ 
                width: `${Math.min(100, (holdDuration / 20) * 100)}%`,
                background: getSpeedColor()
              }}
            />
          </div>
          <div className="time-label">
            {holdDuration.toFixed(1)}s / 20s
            {holdDuration >= 20 && ' 🔥 MAX!'}
          </div>
        </div>
      )}

      <div className="simulator-control">
        <button
          className={`hold-button ${isHolding ? 'holding' : ''}`}
          onMouseDown={handleMouseDown}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          onTouchStart={handleMouseDown}
          onTouchEnd={handleMouseUp}
          style={{
            transform: isHolding ? `scale(${1 + holdDuration * 0.02})` : 'scale(1)'
          }}
        >
          {isHolding ? (
            <>
              <span className="pulse-ring"></span>
              <span className="button-text">
                🚀 {currentSpeed.toLocaleString()} pas/sec
              </span>
            </>
          ) : (
            <span className="button-text">Maintenir pour marcher</span>
          )}
        </button>
      </div>

      {/* Formule mathématique */}
      <div className="formula-info">
        <small>
          📐 Formule: v(t) = 100 × e<sup>0.144t</sup>
        </small>
      </div>

      {message && (
        <div className={`simulator-message ${message.includes('🎉') ? 'success' : ''}`}>
          {message}
        </div>
      )}

      {challenges.length > 0 && (
        <div className="active-challenges-info">
          <h3>Challenges actifs ({challenges.length})</h3>
          <ul>
            {challenges.map(c => (
              <li key={c.id}>
                {c.title} - {c.target.toLocaleString()} pas
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};

export default StepSimulator;