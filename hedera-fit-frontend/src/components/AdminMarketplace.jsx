import React, { useState, useEffect } from 'react';
import './AdminMarketplace.css';

/**
 * ADMIN MARKETPLACE - Gestion CRUD des produits
 * 
 * FONCTIONNALITÉS:
 * - Liste tous les produits
 * - Créer nouveau produit
 * - Modifier produit existant
 * - Supprimer produit
 * - Restriction admin uniquement
 */

const AdminMarketplace = ({ token, isAdmin }) => {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [message, setMessage] = useState('');
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    category: '',
    priceTokens: '',
    stock: '',
    imageUrl: ''
  });

  useEffect(() => {
    if (isAdmin) {
      fetchProducts();
    }
  }, [isAdmin]);

  const fetchProducts = async () => {
    setLoading(true);
    try {
      const response = await fetch('http://localhost:3000/api/marketplace/products', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await response.json();
      
      if (data.success) {
        setProducts(data.data);
      }
    } catch (error) {
      console.error('Erreur fetch produits:', error);
      showMessage('❌ Erreur chargement produits', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const productData = {
      name: formData.name,
      description: formData.description,
      category: formData.category,
      priceTokens: parseInt(formData.priceTokens),
      stock: parseInt(formData.stock),
      imageUrl: formData.imageUrl || null
    };

    try {
      if (editingProduct) {
        // UPDATE
        const response = await fetch(`http://localhost:3000/api/admin/products/${editingProduct.id}`, {
          method: 'PUT',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(productData)
        });

        const data = await response.json();
        
        if (data.success) {
          showMessage('✅ Produit modifié avec succès', 'success');
          resetForm();
          fetchProducts();
        } else {
          showMessage(`❌ ${data.message}`, 'error');
        }
      } else {
        // CREATE
        const response = await fetch('http://localhost:3000/api/admin/products', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(productData)
        });

        const data = await response.json();
        
        if (data.success) {
          showMessage('✅ Produit créé avec succès', 'success');
          resetForm();
          fetchProducts();
        } else {
          showMessage(`❌ ${data.message}`, 'error');
        }
      }
    } catch (error) {
      console.error('Erreur:', error);
      showMessage('❌ Erreur lors de l\'opération', 'error');
    }
  };

  const handleEdit = (product) => {
    setEditingProduct(product);
    setFormData({
      name: product.name,
      description: product.description || '',
      category: product.category,
      priceTokens: product.priceTokens.toString(),
      stock: product.stock.toString(),
      imageUrl: product.imageUrl || ''
    });
    setShowForm(true);
  };

  const handleDelete = async (product) => {
    if (!window.confirm(`Supprimer "${product.name}" ?`)) {
      return;
    }

    try {
      const response = await fetch(`http://localhost:3000/api/admin/products/${product.id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });

      const data = await response.json();
      
      if (data.success) {
        showMessage('✅ Produit supprimé', 'success');
        fetchProducts();
      } else {
        showMessage(`❌ ${data.message}`, 'error');
      }
    } catch (error) {
      console.error('Erreur suppression:', error);
      showMessage('❌ Erreur lors de la suppression', 'error');
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      category: '',
      priceTokens: '',
      stock: '',
      imageUrl: ''
    });
    setEditingProduct(null);
    setShowForm(false);
  };

  const showMessage = (msg, type) => {
    setMessage({ text: msg, type });
    setTimeout(() => setMessage(''), 3000);
  };

  if (!isAdmin) {
    return (
      <div className="admin-marketplace">
        <div className="access-denied">
          <h2>🔒 Accès Refusé</h2>
          <p>Cette section est réservée aux administrateurs.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="admin-marketplace">
      <div className="admin-header">
        <h1>⚙️ Administration Marketplace</h1>
        <button 
          className="btn-add"
          onClick={() => setShowForm(!showForm)}
        >
          {showForm ? '✕ Annuler' : '+ Ajouter Produit'}
        </button>
      </div>

      {/* Message */}
      {message && (
        <div className={`admin-message ${message.type}`}>
          {message.text}
        </div>
      )}

      {/* Formulaire */}
      {showForm && (
        <div className="product-form-section">
          <h2>{editingProduct ? '✏️ Modifier le Produit' : '➕ Nouveau Produit'}</h2>
          <form className="product-form" onSubmit={handleSubmit}>
            <div className="form-row">
              <div className="form-group">
                <label>Nom du produit *</label>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  required
                  placeholder="Ex: T-shirt FIT"
                />
              </div>

              <div className="form-group">
                <label>Catégorie *</label>
                <input
                  type="text"
                  name="category"
                  value={formData.category}
                  onChange={handleInputChange}
                  required
                  placeholder="Ex: Vêtements"
                />
              </div>
            </div>

            <div className="form-group">
              <label>Description</label>
              <textarea
                name="description"
                value={formData.description}
                onChange={handleInputChange}
                rows="3"
                placeholder="Description du produit..."
              />
            </div>

            <div className="form-row">
              <div className="form-group">
                <label>Prix (FIT tokens) *</label>
                <input
                  type="number"
                  name="priceTokens"
                  value={formData.priceTokens}
                  onChange={handleInputChange}
                  required
                  min="1"
                  placeholder="100"
                />
              </div>

              <div className="form-group">
                <label>Stock *</label>
                <input
                  type="number"
                  name="stock"
                  value={formData.stock}
                  onChange={handleInputChange}
                  required
                  min="0"
                  placeholder="50"
                />
              </div>
            </div>

            <div className="form-group">
              <label>URL Image</label>
              <input
                type="url"
                name="imageUrl"
                value={formData.imageUrl}
                onChange={handleInputChange}
                placeholder="https://..."
              />
            </div>

            <div className="form-actions">
              <button type="submit" className="btn-submit">
                {editingProduct ? '💾 Modifier' : '➕ Créer'}
              </button>
              <button type="button" className="btn-cancel" onClick={resetForm}>
                Annuler
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Liste produits */}
      {loading ? (
        <div className="loading">Chargement...</div>
      ) : (
        <div className="products-table-section">
          <h2>📦 Produits ({products.length})</h2>
          
          {products.length === 0 ? (
            <div className="no-products">Aucun produit</div>
          ) : (
            <div className="products-table-container">
              <table className="products-table">
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>Nom</th>
                    <th>Catégorie</th>
                    <th>Description</th>
                    <th>Prix</th>
                    <th>Stock</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {products.map(product => (
                    <tr key={product.id}>
                      <td>{product.id}</td>
                      <td>
                        <div className="product-name-cell">
                          {product.imageUrl && (
                            <img src={product.imageUrl} alt={product.name} className="product-thumb" />
                          )}
                          <strong>{product.name}</strong>
                        </div>
                      </td>
                      <td>
                        <span className="category-badge">{product.category}</span>
                      </td>
                      <td className="description-cell">
                        {product.description || '-'}
                      </td>
                      <td>
                        <span className="price-cell">🪙 {product.priceTokens}</span>
                      </td>
                      <td>
                        <span className={`stock-cell ${product.stock === 0 ? 'out' : product.stock < 10 ? 'low' : ''}`}>
                          {product.stock}
                        </span>
                      </td>
                      <td>
                        <div className="action-buttons">
                          <button
                            className="btn-edit"
                            onClick={() => handleEdit(product)}
                            title="Modifier"
                          >
                            ✏️
                          </button>
                          <button
                            className="btn-delete"
                            onClick={() => handleDelete(product)}
                            title="Supprimer"
                          >
                            🗑️
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default AdminMarketplace;