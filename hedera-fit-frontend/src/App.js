import React, { useState, useEffect } from 'react';
import './App.css';

// Import des composants
import StepSimulator from './components/StepSimulator';
import ChallengesProgress from './components/ChallengesProgress';
import Marketplace from './components/Marketplace';
import Community from './components/CommunityWithUpload';
import Topics from './components/Topics';
import Registries from './components/Registries';
import AdminMarketplace from './components/AdminMarketplace';

function App() {
  const [token, setToken] = useState(localStorage.getItem('token') || null);
  const [user, setUser] = useState(null);
  const [currentTab, setCurrentTab] = useState('simulator');
  const [isLogin, setIsLogin] = useState(true);
  const [loading, setLoading] = useState(true);

  // Vérifier le token au chargement
  useEffect(() => {
    if (token) {
      fetchUserProfile();
    } else {
      setLoading(false);
    }
  }, []);

  const fetchUserProfile = async () => {
    try {
      const response = await fetch('http://localhost:3000/auth/me', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      const data = await response.json();
      
      if (data.success) {
        setUser(data.data);
      } else {
        handleLogout();
      }
    } catch (error) {
      console.error('Erreur profil:', error);
      handleLogout();
    } finally {
      setLoading(false);
    }
  };

  const refreshBalance = async () => {
    if (!token) return;
    
    try {
      const response = await fetch('http://localhost:3000/auth/me', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      const data = await response.json();
      
      if (data.success) {
        setUser(prevUser => ({
          ...prevUser,
          fitBalance: data.data.fitBalance
        }));
      }
    } catch (error) {
      console.error('Erreur refresh balance:', error);
    }
  };

  const handleLogout = () => {
    setToken(null);
    setUser(null);
    localStorage.removeItem('token');
    setCurrentTab('simulator');
  };

  if (loading) {
    return (
      <div className="app-loading">
        <div className="loader"></div>
        <p>Chargement...</p>
      </div>
    );
  }

  if (!token || !user) {
    return <AuthPage isLogin={isLogin} setIsLogin={setIsLogin} setToken={setToken} setUser={setUser} />;
  }

  return (
    <div className="App">
      <header className="app-header">
        <div className="header-left">
          <h1>🏃 Hedera Fit</h1>
          <span className="user-name">Bonjour, {user.name}</span>
        </div>
        <div className="header-right">
          <div className="balance-badge">
            🪙 {user.fitBalance || 0} FIT
          </div>
          <button className="btn-logout" onClick={handleLogout}>
            Déconnexion
          </button>
        </div>
      </header>

      <nav className="app-nav">
        <button
          className={`nav-tab ${currentTab === 'simulator' ? 'active' : ''}`}
          onClick={() => setCurrentTab('simulator')}
        >
          🚶 Simulateur
        </button>
        <button
          className={`nav-tab ${currentTab === 'challenges' ? 'active' : ''}`}
          onClick={() => setCurrentTab('challenges')}
        >
          🎯 Challenges
        </button>
        <button
          className={`nav-tab ${currentTab === 'marketplace' ? 'active' : ''}`}
          onClick={() => setCurrentTab('marketplace')}
        >
          🛒 Marketplace
        </button>
        <button
          className={`nav-tab ${currentTab === 'community' ? 'active' : ''}`}
          onClick={() => setCurrentTab('community')}
        >
          🌟 Communauté
        </button>
        <button
          className={`nav-tab ${currentTab === 'topics' ? 'active' : ''}`}
          onClick={() => setCurrentTab('topics')}
        >
          💬 Topics
        </button>
        {user.isAdmin && (
          <>
            <button
              className={`nav-tab ${currentTab === 'registries' ? 'active' : ''}`}
              onClick={() => setCurrentTab('registries')}
            >
              📋 Registres
            </button>
            <button
              className={`nav-tab ${currentTab === 'admin' ? 'active' : ''}`}
              onClick={() => setCurrentTab('admin')}
            >
              ⚙️ Admin
            </button>
          </>
        )}
      </nav>

      <main className="app-main">
        {currentTab === 'simulator' && (
          <StepSimulator 
            token={token} 
            user={user}
            onStepsAdded={refreshBalance}
          />
        )}
        {currentTab === 'challenges' && (
          <ChallengesProgress token={token} user={user} />
        )}
        {currentTab === 'marketplace' && (
          <Marketplace 
            token={token} 
            user={user}
            onBalanceChange={refreshBalance}
          />
        )}
        {currentTab === 'community' && (
          <Community token={token} user={user} />
        )}
        {currentTab === 'topics' && (
          <Topics token={token} user={user} />
        )}
        {currentTab === 'registries' && user.isAdmin && (
          <Registries token={token} isAdmin={user.isAdmin} />
        )}
        {currentTab === 'admin' && user.isAdmin && (
          <AdminMarketplace token={token} isAdmin={user.isAdmin} />
        )}
      </main>
    </div>
  );
}

const AuthPage = ({ isLogin, setIsLogin, setToken, setUser }) => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: ''
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
    setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const endpoint = isLogin ? '/auth/login' : '/auth/register';
      const body = isLogin 
        ? { email: formData.email, password: formData.password }
        : formData;

      const response = await fetch(`http://localhost:3000${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });

      const data = await response.json();

      if (data.success) {
        localStorage.setItem('token', data.token);
        setToken(data.token);
        setUser(data.user);
      } else {
        setError(data.message);
      }
    } catch (error) {
      console.error('Auth error:', error);
      setError('Erreur de connexion au serveur');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-container">
        <div className="auth-header">
          <h1>🏃 Hedera Fit</h1>
          <p>Bougez, gagnez des tokens, dépensez!</p>
        </div>

        <div className="auth-tabs">
          <button
            className={isLogin ? 'active' : ''}
            onClick={() => {
              setIsLogin(true);
              setError('');
            }}
          >
            Connexion
          </button>
          <button
            className={!isLogin ? 'active' : ''}
            onClick={() => {
              setIsLogin(false);
              setError('');
            }}
          >
            Inscription
          </button>
        </div>

        <form className="auth-form" onSubmit={handleSubmit}>
          {!isLogin && (
            <div className="form-group">
              <label>Nom</label>
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleChange}
                required
                placeholder="Votre nom"
              />
            </div>
          )}

          <div className="form-group">
            <label>Email</label>
            <input
              type="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              required
              placeholder="votre@email.com"
            />
          </div>

          <div className="form-group">
            <label>Mot de passe</label>
            <input
              type="password"
              name="password"
              value={formData.password}
              onChange={handleChange}
              required
              placeholder="••••••••"
              minLength="6"
            />
          </div>

          {error && <div className="auth-error">{error}</div>}

          <button type="submit" className="btn-submit" disabled={loading}>
            {loading ? 'Chargement...' : (isLogin ? 'Se connecter' : "S'inscrire")}
          </button>
        </form>
      </div>
    </div>
  );
};

export default App;