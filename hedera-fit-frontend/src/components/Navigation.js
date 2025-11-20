import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import './Navigation.css';

function Navigation() {
  const location = useLocation();
  
  // Fonction pour savoir si l'onglet est actif
  const isActive = (path) => location.pathname === path;
  
  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    window.location.href = '/login';
  };
  
  return (
    <nav className="navigation">
      <div className="nav-brand">
        <h2>🏋️ Hedera Fit</h2>
      </div>
      
      <div className="nav-links">
        <Link 
          to="/community" 
          className={isActive('/community') ? 'active' : ''}
        >
          👥 Community
        </Link>
        
        <Link 
          to="/store" 
          className={isActive('/store') ? 'active' : ''}
        >
          🛒 Store
        </Link>
        
        <Link 
          to="/challenges" 
          className={isActive('/challenges') ? 'active' : ''}
        >
          🎯 Challenges
        </Link>
        
        <Link 
          to="/leaderboard" 
          className={isActive('/leaderboard') ? 'active' : ''}
        >
          🏆 Leaderboard
        </Link>
        
        <Link 
          to="/admin" 
          className={isActive('/admin') ? 'active' : ''}
        >
          🔐 Admin
        </Link>
      </div>
      
      <button onClick={handleLogout} className="logout-btn">
        Déconnexion
      </button>
    </nav>
  );
}

export default Navigation;