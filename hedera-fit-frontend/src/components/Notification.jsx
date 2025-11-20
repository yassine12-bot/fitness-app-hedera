import React, { useEffect, useState } from 'react';
import './Notification.css';

/**
 * NOTIFICATION COMPONENT
 * Affiche les notifications de succès (challenges complétés, rewards, etc.)
 */

const Notification = ({ notification, onClose }) => {
  const [isVisible, setIsVisible] = useState(true);
  const [isExiting, setIsExiting] = useState(false);

  useEffect(() => {
    // Auto-dismiss après 5 secondes
    const timer = setTimeout(() => {
      handleClose();
    }, 5000);

    return () => clearTimeout(timer);
  }, []);

  const handleClose = () => {
    setIsExiting(true);
    setTimeout(() => {
      setIsVisible(false);
      if (onClose) onClose();
    }, 300);
  };

  if (!isVisible || !notification) return null;

  const { type, title, message, reward, animation } = notification;

  return (
    <div className={`notification-overlay ${animation || ''} ${isExiting ? 'exiting' : ''}`}>
      <div className="notification-card">
        {/* Confetti animation for celebration */}
        {animation === 'celebration' && (
          <div className="confetti-container">
            {[...Array(20)].map((_, i) => (
              <div key={i} className="confetti" style={{
                left: `${Math.random() * 100}%`,
                animationDelay: `${Math.random() * 0.5}s`,
                backgroundColor: ['#FF6B6B', '#4ECDC4', '#45B7D1', '#FFA07A', '#98D8C8'][Math.floor(Math.random() * 5)]
              }} />
            ))}
          </div>
        )}

        {/* Close button */}
        <button className="notification-close" onClick={handleClose}>
          ✕
        </button>

        {/* Content */}
        <div className="notification-content">
          <div className="notification-icon">
            {type === 'challenge_completed' && '🏆'}
            {type === 'reward' && '💰'}
            {type === 'badge' && '🎖️'}
            {type === 'success' && '✅'}
            {type === 'error' && '❌'}
          </div>

          <div className="notification-text">
            <h3 className="notification-title">{title}</h3>
            <p className="notification-message">{message}</p>
            
            {reward && (
              <div className="notification-reward">
                <span className="reward-badge">+{reward} FIT</span>
              </div>
            )}
          </div>
        </div>

        {/* Progress bar */}
        <div className="notification-progress">
          <div className="notification-progress-bar" />
        </div>
      </div>
    </div>
  );
};

export default Notification;