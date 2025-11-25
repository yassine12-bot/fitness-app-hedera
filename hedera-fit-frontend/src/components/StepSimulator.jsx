import React, { useState, useRef, useEffect } from 'react';
import './StepSimulator.css';

const StepSimulator = ({ token, user, onStepsAdded }) => {
  const [isHolding, setIsHolding] = useState(false);
  const [totalSteps, setTotalSteps] = useState(user?.totalSteps || 0);
  const [sessionSteps, setSessionSteps] = useState(0);
  const [currentSpeed, setCurrentSpeed] = useState(0);
  const [holdDuration, setHoldDuration] = useState(0);
  const [message, setMessage] = useState('');
  const [lastTxId, setLastTxId] = useState('');
  const [loading, setLoading] = useState(false);
  
  const intervalRef = useRef(null);
  const startTimeRef = useRef(null);
  const lastStepsRef = useRef(0);

  useEffect(() => {
    if (user?.totalSteps) {
      setTotalSteps(user.totalSteps);
    }
  }, [user]);

  const calculateSteps = (elapsedSeconds) => {
    const v0 = 100;
    const k = 0.144;
    const steps = (v0 / k) * (Math.exp(k * elapsedSeconds) - 1);
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
    setLastTxId('');
    startTimeRef.current = Date.now();
    lastStepsRef.current = 0;

    intervalRef.current = setInterval(() => {
      const elapsedMs = Date.now() - startTimeRef.current;
      const elapsedSeconds = elapsedMs / 1000;
      
      const { steps, speed } = calculateSteps(elapsedSeconds);
      
      setSessionSteps(steps);
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
      await logStepsToBlockchain(sessionSteps);
    }
  };

  const logStepsToBlockchain = async (steps) => {
    setLoading(true);
    setMessage('⏳ Enregistrement sur la blockchain...');

    try {
      const response = await fetch('http://localhost:3000/api/workouts/steps', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          steps,
          distance: (steps * 0.0007).toFixed(2),
          calories: Math.floor(steps * 0.05)
        })
      });

      const data = await response.json();
      
      if (data.success) {
        const txId = data.data.blockchain.transactionId;
        setLastTxId(txId);
        setTotalSteps(prev => prev + steps);
        setMessage(`✅ +${steps.toLocaleString()} pas enregistrés!`);
        
        if (onStepsAdded) {
          onStepsAdded();
        }
      } else {
        setMessage(`❌ Erreur: ${data.message}`);
      }
    } catch (error) {
      console.error('Erreur blockchain:', error);
      setMessage('❌ Erreur de connexion');
    } finally {
      setLoading(false);
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
        <h2>🚶‍♂️ Simulateur de Pas - Blockchain</h2>
        <p className="simulator-desc">
          Maintiens le bouton - Les pas sont enregistrés sur Hedera!
        </p>
        {user?.hederaAccountId && (
          <p className="wallet-info">
            🔐 Wallet: {user.hederaAccountId}
          </p>
        )}
      </div>

      <div className="simulator-stats">
        <div className="stat-card">
          <div className="stat-value">{totalSteps.toLocaleString()}</div>
          <div className="stat-label">Total pas (blockchain)</div>
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
          className={`hold-button ${isHolding ? 'holding' : ''} ${loading ? 'loading' : ''}`}
          onMouseDown={handleMouseDown}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          onTouchStart={handleMouseDown}
          onTouchEnd={handleMouseUp}
          disabled={loading}
          style={{
            transform: isHolding ? `scale(${1 + holdDuration * 0.02})` : 'scale(1)'
          }}
        >
          {loading ? (
            <span className="button-text">⏳ Enregistrement...</span>
          ) : isHolding ? (
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

      <div className="formula-info">
        <small>
          📐 Formule: v(t) = 100 × e<sup>0.144t</sup> | ⛓️ Smart Contract
        </small>
      </div>

      {message && (
        <div className={`simulator-message ${message.includes('✅') ? 'success' : message.includes('❌') ? 'error' : 'info'}`}>
          {message}
          {lastTxId && (
            <div className="tx-link">
              <a 
                href={`https://hashscan.io/testnet/transaction/${lastTxId}`}
                target="_blank"
                rel="noopener noreferrer"
              >
                🔗 Voir sur Hashscan
              </a>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default StepSimulator;