import React, { useState, useEffect } from 'react';
import './Topics.css';

/**
 * TOPICS - Gestion des topics de discussion
 * 
 * FONCTIONNALITÉS:
 * - Lister tous les topics
 * - Créer un nouveau topic
 * - Rejoindre/Quitter un topic
 * - Voir les membres d'un topic
 */

const Topics = ({ token, user }) => {
  const [topics, setTopics] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedTopic, setSelectedTopic] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    isPrivate: false
  });
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    fetchTopics();
  }, []);

  const fetchTopics = async () => {
    setLoading(true);
    setError('');
    
    try {
      const response = await fetch('http://localhost:3000/api/topics', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      const data = await response.json();
      
      if (data.success) {
        setTopics(data.data);
      } else {
        setError(data.message);
      }
    } catch (error) {
      console.error('Erreur fetch topics:', error);
      setError('Erreur lors du chargement des topics');
    } finally {
      setLoading(false);
    }
  };
  const fetchMessages = async (topicId) => {
    setLoadingMessages(true);
    try {
      const response = await fetch(`http://localhost:3000/api/topics/${topicId}/messages`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await response.json();
      if (data.success) {
        setMessages(data.data || []);
        setSelectedTopic(data.topic);
      }
    } catch (error) {
      console.error('Error fetching messages:', error);
    } finally {
      setLoadingMessages(false);
    }
  };

  const postMessage = async (e) => {
    e.preventDefault();
    if (!newMessage.trim()) return;

    try {
      const response = await fetch(`http://localhost:3000/api/topics/${selectedTopic.id}/messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ message: newMessage })
      });

      const data = await response.json();
      if (data.success) {
        setNewMessage('');
        await fetchMessages(selectedTopic.id);
        setMessage('✅ Message posté!');
        setTimeout(() => setMessage(''), 3000);
      }
    } catch (error) {
      setError('Erreur envoi message');
    }
  };


  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleCreateTopic = async (e) => {
    e.preventDefault();
    setMessage('');
    setError('');

    if (!formData.name.trim()) {
      setError('Le nom du topic est requis');
      return;
    }

    try {
      const response = await fetch('http://localhost:3000/api/topics', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(formData)
      });

      const data = await response.json();

      if (data.success) {
        setMessage('✅ Topic créé avec succès!');
        setFormData({ name: '', description: '', isPrivate: false });
        setShowCreateForm(false);
        await fetchTopics();
        
        setTimeout(() => setMessage(''), 3000);
      } else {
        setError(data.message);
      }
    } catch (error) {
      console.error('Erreur création topic:', error);
      setError('Erreur lors de la création du topic');
    }
  };

  const handleJoinTopic = async (topicId) => {
    try {
      const response = await fetch(`http://localhost:3000/api/topics/${topicId}/join`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });

      const data = await response.json();

      if (data.success) {
        setMessage('✅ Tu as rejoint le topic!');
        await fetchTopics();
        setTimeout(() => setMessage(''), 3000);
      } else {
        setError(data.message);
      }
    } catch (error) {
      console.error('Erreur join topic:', error);
      setError('Erreur lors de l\'adhésion au topic');
    }
  };

  const handleLeaveTopic = async (topicId) => {
    if (!window.confirm('Veux-tu vraiment quitter ce topic?')) {
      return;
    }

    try {
      const response = await fetch(`http://localhost:3000/api/topics/${topicId}/leave`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });

      const data = await response.json();

      if (data.success) {
        setMessage('✅ Tu as quitté le topic');
        await fetchTopics();
        setTimeout(() => setMessage(''), 3000);
      } else {
        setError(data.message);
      }
    } catch (error) {
      console.error('Erreur leave topic:', error);
      setError('Erreur lors de la sortie du topic');
    }
  };

  if (loading) {
    return (
      <div className="topics">
        <div className="loading">Chargement des topics...</div>
      </div>
    );
  }

  return (
    <div className="topics">
      <div className="topics-header">
        <div>
          <h1>💬 Topics de Discussion</h1>
          <p>Rejoins des groupes pour discuter avec d'autres sportifs</p>
        </div>
        <button
          className="btn-create-topic"
          onClick={() => setShowCreateForm(!showCreateForm)}
        >
          {showCreateForm ? '✕ Annuler' : '➕ Créer un Topic'}
        </button>
      </div>

      {/* Messages */}
      {message && (
        <div className="success-message">{message}</div>
      )}
      {error && (
        <div className="error-message">{error}</div>
      )}

      {/* CONDITION: Afficher soit la liste, soit les messages */}
{selectedTopic ? (
  // VUE MESSAGES PLEIN ÉCRAN
  <div className="topic-messages-fullscreen">
    <div className="messages-header-bar">
      <button className="btn-back" onClick={() => setSelectedTopic(null)}>
        ← Retour
      </button>
      <div className="topic-header-info">
        <h2>{selectedTopic.name}</h2>
        <span className="blockchain-badge">
          🔗 Hedera Topic: {selectedTopic.hederaTopicId?.substring(0, 12)}...
        </span>
      </div>
    </div>

    <div className="messages-container">
      {loadingMessages ? (
        <div className="loading-messages">
          <div className="spinner"></div>
          <p>Chargement des messages blockchain...</p>
        </div>
      ) : messages.length === 0 ? (
        <div className="no-messages">
          <p>📭 Aucun message pour le moment</p>
          <p>Sois le premier à poster!</p>
        </div>
      ) : (
        messages.map((msg, idx) => (
          <div 
            key={idx} 
            className={`message-bubble ${msg.userId === user?.id ? 'own-message' : 'other-message'}`}
          >
            <div className="message-author">{msg.userName}</div>
            <div className="message-text">{msg.message}</div>
            <div className="message-time">
              {new Date(msg.messageTimestamp).toLocaleString('fr-FR', {
                hour: '2-digit',
                minute: '2-digit',
                day: '2-digit',
                month: '2-digit'
              })}
            </div>
          </div>
        ))
      )}
    </div>

    <form onSubmit={postMessage} className="message-input-form">
      <input
        type="text"
        value={newMessage}
        onChange={(e) => setNewMessage(e.target.value)}
        placeholder="Écris un message sur la blockchain..."
        maxLength={1000}
        className="message-input"
      />
      <button type="submit" className="btn-send" disabled={!newMessage.trim()}>
        📤 Envoyer
      </button>
    </form>
  </div>
) : (
  // LISTE DES TOPICS
  <>
    {showCreateForm && (
      <div className="create-topic-form">
        <h2>Nouveau Topic</h2>
        <form onSubmit={handleCreateTopic}>
          <div className="form-group">
            <label>Nom du topic *</label>
            <input
              type="text"
              name="name"
              value={formData.name}
              onChange={handleInputChange}
              placeholder="Ex: Coureurs du dimanche"
              required
            />
          </div>

          <div className="form-group">
            <label>Description</label>
            <textarea
              name="description"
              value={formData.description}
              onChange={handleInputChange}
              placeholder="Décris ton topic..."
              rows="3"
            />
          </div>

          <div className="form-group checkbox">
            <label>
              <input
                type="checkbox"
                name="isPrivate"
                checked={formData.isPrivate}
                onChange={handleInputChange}
              />
              <span>Topic privé (sur invitation uniquement)</span>
            </label>
          </div>

          <div className="form-actions">
            <button type="submit" className="btn-submit">
              Créer le Topic
            </button>
            <button
              type="button"
              className="btn-cancel"
              onClick={() => {
                setShowCreateForm(false);
                setFormData({ name: '', description: '', isPrivate: false });
              }}
            >
              Annuler
            </button>
          </div>
        </form>
      </div>
    )}

    <div className="topics-list">
      {topics.length === 0 ? (
        <div className="no-topics">
          <p>📭 Aucun topic pour le moment</p>
          <p>Crée le premier!</p>
        </div>
      ) : (
        topics.map(topic => (
          <div key={topic.id} className="topic-card">
            <div className="topic-header">
              <div className="topic-info">
                <div className="topic-name">
                  {topic.isPrivate === 1 && <span className="private-badge">🔒</span>}
                  {topic.name}
                </div>
                <div className="topic-meta">
                  Par <strong>{topic.creatorName}</strong> • {topic.memberCount} membre{topic.memberCount > 1 ? 's' : ''}
                </div>
              </div>
              
              {topic.isMember ? (
                <button
                  className="btn-leave"
                  onClick={() => handleLeaveTopic(topic.id)}
                >
                  Quitter
                </button>
              ) : (
                <button
                  className="btn-join"
                  onClick={() => handleJoinTopic(topic.id)}
                >
                  Rejoindre
                </button>
              )}
            </div>

            {topic.description && (
              <div className="topic-description">
                {topic.description}
              </div>
            )}

            {topic.isMember && (
              <div className="topic-actions">
                <button 
                  className="btn-view-messages"
                  onClick={() => fetchMessages(topic.id)}
                >
                  💬 Voir les messages ({topic.messageCount || 0})
                </button>
              </div>
            )}

            <div className="topic-footer">
              <span className="topic-date">
                Créé le {new Date(topic.createdAt).toLocaleDateString('fr-FR', {
                  day: 'numeric',
                  month: 'long',
                  year: 'numeric'
                })}
              </span>
            </div>
          </div>
        ))
      )}
    </div>
  </>
)}
    </div>
    
  );
};

export default Topics;