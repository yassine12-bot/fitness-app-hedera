import React, { useState, useEffect } from 'react';
import { QRCodeCanvas } from 'qrcode.react';
import './Marketplace.css';

/**
 * MARKETPLACE - Boutique avec achats et QR codes
 * 
 * FONCTIONNALITÉS:
 * - Liste produits disponibles
 * - Achat avec FIT tokens
 * - Génération QR code unique
 * - Historique achats avec QR
 * - Refresh balance après achat (CORRIGÉ)
 */

const Marketplace = ({ token, user, onBalanceChange }) => {
  const [products, setProducts] = useState([]);
  const [purchases, setPurchases] = useState([]);
  const [balance, setBalance] = useState(user?.fitBalance || 0);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [showQR, setShowQR] = useState(false);
  const [currentQR, setCurrentQR] = useState(null);
  const [tab, setTab] = useState('products');
  const [message, setMessage] = useState('');

  // 🔧 FIX: Met à jour la balance quand user change
  useEffect(() => {
    if (user?.fitBalance !== undefined) {
      setBalance(user.fitBalance);
    }
  }, [user?.fitBalance]);

  useEffect(() => {
    fetchProducts();
    fetchPurchases();
  }, [token]);

  const fetchProducts = async () => {
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
    }
  };

  const fetchPurchases = async () => {
    try {
      const response = await fetch('http://localhost:3000/api/marketplace/purchases', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await response.json();
      if (data.success) {
        setPurchases(data.data);
      }
    } catch (error) {
      console.error('Erreur fetch achats:', error);
    }
  };

  const handlePurchase = async (product) => {
    if (balance < product.priceTokens) {
      setMessage('❌ Solde insuffisant');
      setTimeout(() => setMessage(''), 3000);
      return;
    }

    try {
      const response = await fetch('http://localhost:3000/api/marketplace/purchase', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          productId: product.id,
          quantity: 1
        })
      });

      const data = await response.json();
      if (data.success) {
        setMessage(`✅ ${data.message}`);
        setCurrentQR({
          code: data.data.qrCode,
          product: data.data.product,
          purchaseId: data.data.purchaseId
        });
        setShowQR(true);
        
        // 🔧 FIX: Update balance locale immédiatement
        setBalance(data.data.remainingBalance);
        
        // 🔧 FIX: Refresh balance dans App.js (header)
        if (onBalanceChange) {
          await onBalanceChange();
        }
        
        // Refresh achats et produits
        await fetchPurchases();
        await fetchProducts();
      } else {
        setMessage(`❌ ${data.message}`);
      }
      setTimeout(() => setMessage(''), 3000);
    } catch (error) {
      console.error('Erreur achat:', error);
      setMessage('❌ Erreur lors de l\'achat');
      setTimeout(() => setMessage(''), 3000);
    }
  };

  const showPurchaseQR = (purchase) => {
    setCurrentQR({
      code: purchase.qrCode || purchase.qrCodeData,
      product: purchase.productName,
      purchaseId: purchase.id,
      isUsed: purchase.isUsed
    });
    setShowQR(true);
  };

  return (
    <div className="marketplace">
      {/* Header avec balance */}
      <div className="marketplace-header">
        <h1>🛒 Marketplace</h1>
        <div className="balance-display">
          <span className="balance-label">Balance:</span>
          <span className="balance-amount">{balance.toLocaleString()} FIT</span>
        </div>
      </div>

      {/* Tabs */}
      <div className="marketplace-tabs">
        <button
          className={`tab ${tab === 'products' ? 'active' : ''}`}
          onClick={() => setTab('products')}
        >
          Produits
        </button>
        <button
          className={`tab ${tab === 'purchases' ? 'active' : ''}`}
          onClick={() => setTab('purchases')}
        >
          Mes Achats ({purchases.length})
        </button>
      </div>

      {/* Message */}
      {message && (
        <div className={`marketplace-message ${message.includes('✅') ? 'success' : 'error'}`}>
          {message}
        </div>
      )}

      {/* Contenu */}
      {tab === 'products' ? (
        <ProductsGrid
          products={products}
          onPurchase={handlePurchase}
          balance={balance}
        />
      ) : (
        <PurchasesHistory
          purchases={purchases}
          onShowQR={showPurchaseQR}
        />
      )}

      {/* Modal QR Code */}
      {showQR && currentQR && (
        <QRModal
          qrData={currentQR}
          onClose={() => setShowQR(false)}
        />
      )}
    </div>
  );
};

// Grille de produits
const ProductsGrid = ({ products, onPurchase, balance }) => {
  if (products.length === 0) {
    return <div className="no-products">Aucun produit disponible</div>;
  }

  return (
    <div className="products-grid">
      {products.map(product => (
        <ProductCard
          key={product.id}
          product={product}
          onPurchase={onPurchase}
          canAfford={balance >= product.priceTokens}
        />
      ))}
    </div>
  );
};

// Carte produit
const ProductCard = ({ product, onPurchase, canAfford }) => {
  return (
    <div className="product-card">
      {product.imageUrl && (
        <div className="product-image">
          <img src={product.imageUrl} alt={product.name} />
        </div>
      )}
      <div className="product-info">
        <h3 className="product-name">{product.name}</h3>
        <p className="product-description">{product.description}</p>
        <div className="product-footer">
          <div className="product-price">
            🪙 {product.priceTokens} FIT
          </div>
          <button
            className={`buy-button ${!canAfford ? 'disabled' : ''}`}
            onClick={() => onPurchase(product)}
            disabled={!canAfford || product.stock === 0}
          >
            {product.stock === 0 ? 'Rupture' : 'Acheter'}
          </button>
        </div>
        {product.stock < 10 && product.stock > 0 && (
          <div className="low-stock">Plus que {product.stock} en stock!</div>
        )}
      </div>
    </div>
  );
};

// Historique achats
const PurchasesHistory = ({ purchases, onShowQR }) => {
  if (purchases.length === 0) {
    return <div className="no-purchases">Aucun achat pour le moment</div>;
  }

  return (
    <div className="purchases-list">
      {purchases.map(purchase => (
        <div key={purchase.id} className="purchase-item">
          <div className="purchase-main">
            {purchase.imageUrl && (
              <img src={purchase.imageUrl} alt={purchase.productName} className="purchase-thumb" />
            )}
            <div className="purchase-details">
              <div className="purchase-name">{purchase.productName}</div>
              <div className="purchase-meta">
                <span>Quantité: {purchase.quantity}</span>
                <span>•</span>
                <span>{purchase.totalCost} FIT</span>
                <span>•</span>
                <span>{new Date(purchase.createdAt).toLocaleDateString()}</span>
              </div>
            </div>
          </div>
          <button
            className="show-qr-button"
            onClick={() => onShowQR(purchase)}
          >
            Voir QR
          </button>
        </div>
      ))}
    </div>
  );
};

// Modal QR Code
const QRModal = ({ qrData, onClose }) => {
  return (
    <div className="qr-modal-overlay" onClick={onClose}>
      <div className="qr-modal" onClick={e => e.stopPropagation()}>
        <button className="qr-close" onClick={onClose}>×</button>
        
        <h2>Votre Reçu</h2>
        <p className="qr-product">{qrData.product}</p>
        
        <div className="qr-code-container">
          <QRCodeCanvas
            value={qrData.code}
            size={256}
            level="H"
            includeMargin={true}
          />
        </div>
        
        <div className="qr-code-text">{qrData.code}</div>
        
        {qrData.isUsed && (
          <div className="qr-used-badge">✓ Déjà utilisé</div>
        )}
        
        <p className="qr-instructions">
          Présentez ce QR code au vendeur pour récupérer votre produit
        </p>
      </div>
    </div>
  );
};

export default Marketplace;