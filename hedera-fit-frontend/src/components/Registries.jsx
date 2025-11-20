import React, { useState, useEffect } from 'react';
import './Registries.css';

/**
 * REGISTRIES - 5ème onglet (Admin uniquement)
 * 
 * Affiche les logs du Topic Hedera avec filtres:
 * - Par date (startDate, endDate)
 * - Par utilisateur (userId)
 * - Par type d'action (wallet_created, sync, purchase, etc.)
 * - Pagination
 */

const Registries = ({ token, isAdmin }) => {
  const [registries, setRegistries] = useState([]);
  const [types, setTypes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    startDate: '',
    endDate: '',
    userId: '',
    actionType: '',
    limit: 50,
    offset: 0
  });
  const [pagination, setPagination] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    if (isAdmin) {
      fetchTypes();
      fetchRegistries();
    }
  }, [isAdmin]);

  const fetchTypes = async () => {
    try {
      const response = await fetch('http://localhost:3000/api/registries/types', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await response.json();
      if (data.success) {
        setTypes(data.data);
      }
    } catch (error) {
      console.error('Erreur fetch types:', error);
    }
  };

  const fetchRegistries = async (customFilters = filters) => {
    setLoading(true);
    setError('');
    
    try {
      // Construire query params
      const params = new URLSearchParams();
      Object.entries(customFilters).forEach(([key, value]) => {
        if (value) params.append(key, value);
      });

      const response = await fetch(`http://localhost:3000/api/registries?${params}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      const data = await response.json();
      
      if (data.success) {
        setRegistries(data.data);
        setPagination(data.pagination);
      } else {
        setError(data.message);
      }
    } catch (error) {
      console.error('Erreur fetch registries:', error);
      setError('Erreur lors du chargement des registres');
    } finally {
      setLoading(false);
    }
  };

  const handleFilterChange = (key, value) => {
    setFilters(prev => ({ ...prev, [key]: value, offset: 0 }));
  };

  const handleApplyFilters = () => {
    fetchRegistries();
  };

  const handleResetFilters = () => {
    const resetFilters = {
      startDate: '',
      endDate: '',
      userId: '',
      actionType: '',
      limit: 50,
      offset: 0
    };
    setFilters(resetFilters);
    fetchRegistries(resetFilters);
  };

  const handleRefresh = async () => {
    // Forcer refresh du cache backend
    try {
      await fetch('http://localhost:3000/api/registries/refresh', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      await fetchRegistries();
    } catch (error) {
      console.error('Erreur refresh:', error);
    }
  };

  const handlePageChange = (newOffset) => {
    const newFilters = { ...filters, offset: newOffset };
    setFilters(newFilters);
    fetchRegistries(newFilters);
  };

  if (!isAdmin) {
    return (
      <div className="registries">
        <div className="access-denied">
          <h2>🔒 Accès Refusé</h2>
          <p>Cette section est réservée aux administrateurs.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="registries">
      <div className="registries-header">
        <h1>📋 Registres d'Activité</h1>
        <button className="refresh-button" onClick={handleRefresh}>
          🔄 Actualiser
        </button>
      </div>

      {/* Filtres */}
      <div className="filters-section">
        <div className="filters-grid">
          <div className="filter-group">
            <label>Date début</label>
            <input
              type="date"
              value={filters.startDate}
              onChange={e => handleFilterChange('startDate', e.target.value)}
            />
          </div>

          <div className="filter-group">
            <label>Date fin</label>
            <input
              type="date"
              value={filters.endDate}
              onChange={e => handleFilterChange('endDate', e.target.value)}
            />
          </div>

          <div className="filter-group">
            <label>ID Utilisateur</label>
            <input
              type="text"
              placeholder="0.0.7270858"
              value={filters.userId}
              onChange={e => handleFilterChange('userId', e.target.value)}
            />
          </div>

          <div className="filter-group">
            <label>Type d'action</label>
            <select
              value={filters.actionType}
              onChange={e => handleFilterChange('actionType', e.target.value)}
            >
              <option value="">Tous</option>
              {types.map(type => (
                <option key={type.type} value={type.type}>
                  {type.type} ({type.count})
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="filters-actions">
          <button className="apply-filters-button" onClick={handleApplyFilters}>
            Appliquer les filtres
          </button>
          <button className="reset-filters-button" onClick={handleResetFilters}>
            Réinitialiser
          </button>
        </div>
      </div>

      {/* Résultats */}
      {error && <div className="error-message">{error}</div>}

      {loading ? (
        <div className="loading">Chargement...</div>
      ) : (
        <>
          <div className="registries-info">
            <span>Total: {pagination?.total || 0} événements</span>
            {pagination && (
              <span>
                Affichage {pagination.offset + 1} - {Math.min(pagination.offset + registries.length, pagination.total)}
              </span>
            )}
          </div>

          <div className="registries-table-container">
            <table className="registries-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Timestamp</th>
                  <th>Utilisateur</th>
                  <th>Action</th>
                  <th>Détails</th>
                </tr>
              </thead>
              <tbody>
                {registries.length === 0 ? (
                  <tr>
                    <td colSpan="5" className="no-data">
                      Aucun événement trouvé
                    </td>
                  </tr>
                ) : (
                  registries.map(registry => (
                    <RegistryRow key={registry.sequence} registry={registry} />
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {pagination && pagination.total > filters.limit && (
            <div className="pagination">
              <button
                disabled={filters.offset === 0}
                onClick={() => handlePageChange(Math.max(0, filters.offset - filters.limit))}
              >
                ← Précédent
              </button>
              <span>
                Page {Math.floor(filters.offset / filters.limit) + 1} sur{' '}
                {Math.ceil(pagination.total / filters.limit)}
              </span>
              <button
                disabled={!pagination.hasMore}
                onClick={() => handlePageChange(filters.offset + filters.limit)}
              >
                Suivant →
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
};

// Ligne de registre
const RegistryRow = ({ registry }) => {
  const [expanded, setExpanded] = useState(false);

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleString('fr-FR');
  };

  const getActionBadge = (action) => {
    const badges = {
      wallet_created: { color: '#3498db', icon: '👛' },
      sync: { color: '#2ecc71', icon: '🔄' },
      purchase: { color: '#f39c12', icon: '🛒' },
      reward: { color: '#9b59b6', icon: '🎁' },
      badge: { color: '#e74c3c', icon: '🏅' }
    };

    const badge = badges[action] || { color: '#95a5a6', icon: '📝' };
    
    return (
      <span className="action-badge" style={{ background: badge.color }}>
        {badge.icon} {action}
      </span>
    );
  };

  return (
    <>
      <tr onClick={() => setExpanded(!expanded)} className="registry-row">
        <td>{registry.sequence}</td>
        <td>{formatDate(registry.timestamp)}</td>
        <td className="user-id">{registry.userId}</td>
        <td>{getActionBadge(registry.action)}</td>
        <td>
          <button className="expand-button">
            {expanded ? '▼' : '▶'}
          </button>
        </td>
      </tr>
      {expanded && (
        <tr className="registry-details-row">
          <td colSpan="5">
            <div className="registry-details">
              <pre>{JSON.stringify(registry.data, null, 2)}</pre>
            </div>
          </td>
        </tr>
      )}
    </>
  );
};

export default Registries;
