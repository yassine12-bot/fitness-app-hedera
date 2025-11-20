import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import './LoginPage.css';

function LoginPage() {
  const navigate = useNavigate();
  
  // États pour les inputs
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isRegister, setIsRegister] = useState(false);
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  
  // Fonction de connexion
  const handleLogin = async (e) => {
    e.preventDefault(); // Empêche le rechargement de la page
    setError('');
    setLoading(true);
    
    try {
      const response = await api.login({ email, password });
      
      // Sauvegarder le token
      localStorage.setItem('token', response.data.token);
      localStorage.setItem('user', JSON.stringify(response.data.user));
      
      // Rediriger vers la page community
      navigate('/community');
      
    } catch (err) {
      setError(err.response?.data?.message || 'Erreur de connexion');
    } finally {
      setLoading(false);
    }
  };
  
  // Fonction d'inscription
  const handleRegister = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    
    try {
      await api.register({ name, email, password });
      
      // Après inscription, se connecter automatiquement
      const loginResponse = await api.login({ email, password });
      localStorage.setItem('token', loginResponse.data.token);
      localStorage.setItem('user', JSON.stringify(loginResponse.data.user));
      
      navigate('/community');
      
    } catch (err) {
      setError(err.response?.data?.message || 'Erreur d\'inscription');
    } finally {
      setLoading(false);
    }
  };
  
  return (
    <div className="login-page">
      <div className="login-container">
        <h1>🏋️ Hedera Fit Gym Pro</h1>
        <p className="subtitle">Ton application fitness blockchain</p>
        
        {error && <div className="error-message">{error}</div>}
        
        <form onSubmit={isRegister ? handleRegister : handleLogin}>
          {isRegister && (
            <input
              type="text"
              placeholder="Nom"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          )}
          
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
          
          <input
            type="password"
            placeholder="Mot de passe"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
          
          <button type="submit" disabled={loading}>
            {loading ? 'Chargement...' : (isRegister ? 'S\'inscrire' : 'Se connecter')}
          </button>
        </form>
        
        <p className="toggle-mode">
          {isRegister ? 'Déjà un compte ?' : 'Pas encore de compte ?'}
          <button 
            onClick={() => setIsRegister(!isRegister)}
            className="link-btn"
          >
            {isRegister ? 'Se connecter' : 'S\'inscrire'}
          </button>
        </p>
      </div>
    </div>
  );
}

export default LoginPage;