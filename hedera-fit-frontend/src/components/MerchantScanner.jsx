import React, { useState } from 'react';
import './MerchantScanner.css';

/**
 * MERCHANT SCANNER - Scan and verify QR codes
 * 
 * FEATURES:
 * - Manual QR code input
 * - Verify QR code with backend
 * - Display product details
 * - Show verification status
 * - Prevent duplicate scans
 */

const MerchantScanner = ({ token }) => {
    const [qrCode, setQrCode] = useState('');
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState(null);
    const [error, setError] = useState('');

    const handleScan = async (e) => {
        e.preventDefault();

        if (!qrCode.trim()) {
            setError('Veuillez entrer un code QR');
            return;
        }

        setLoading(true);
        setError('');
        setResult(null);

        try {
            const response = await fetch('http://localhost:3000/api/marketplace/verify-qr', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ qrCode: qrCode.trim() })
            });

            const data = await response.json();

            if (data.success) {
                setResult({
                    success: true,
                    product: data.data.productName,
                    quantity: data.data.quantity,
                    userName: data.data.userName,
                    purchaseDate: data.data.purchaseDate,
                    blockchain: data.data.blockchain
                });
                setQrCode(''); // Clear input for next scan
            } else {
                setError(data.message);
            }
        } catch (err) {
            console.error('Erreur vérification:', err);
            setError('Erreur lors de la vérification du QR code');
        } finally {
            setLoading(false);
        }
    };

    const handleReset = () => {
        setQrCode('');
        setResult(null);
        setError('');
    };

    return (
        <div className="merchant-scanner">
            <div className="scanner-header">
                <h1>📱 Scanner Marchand</h1>
                <p>Scannez ou entrez le code QR du client</p>
            </div>

            {/* Input Form */}
            <form className="scanner-form" onSubmit={handleScan}>
                <div className="input-group">
                    <input
                        type="text"
                        value={qrCode}
                        onChange={(e) => setQrCode(e.target.value)}
                        placeholder="NFT-1763943693073"
                        className="qr-input"
                        disabled={loading}
                        autoFocus
                    />
                    <button
                        type="submit"
                        className="scan-button"
                        disabled={loading || !qrCode.trim()}
                    >
                        {loading ? '⏳ Vérification...' : '✓ Vérifier'}
                    </button>
                </div>
            </form>

            {/* Error Message */}
            {error && (
                <div className="verification-result error">
                    <div className="result-icon">❌</div>
                    <h2>Échec de la vérification</h2>
                    <p className="error-message">{error}</p>
                    <button className="reset-button" onClick={handleReset}>
                        Réessayer
                    </button>
                </div>
            )}

            {/* Success Result */}
            {result && result.success && (
                <div className="verification-result success">
                    <div className="result-icon">✅</div>
                    <h2>QR Code Valide!</h2>

                    <div className="result-details">
                        <div className="detail-row">
                            <span className="detail-label">Produit:</span>
                            <span className="detail-value">{result.product}</span>
                        </div>
                        <div className="detail-row">
                            <span className="detail-label">Quantité:</span>
                            <span className="detail-value">{result.quantity}</span>
                        </div>
                        <div className="detail-row">
                            <span className="detail-label">Client:</span>
                            <span className="detail-value">{result.userName}</span>
                        </div>
                        <div className="detail-row">
                            <span className="detail-label">Date d'achat:</span>
                            <span className="detail-value">
                                {new Date(result.purchaseDate).toLocaleString('fr-FR')}
                            </span>
                        </div>

                        {result.blockchain && (
                            <div className="blockchain-info">
                                <div className="detail-row">
                                    <span className="detail-label">Transaction:</span>
                                    <span className="detail-value small">{result.blockchain.transactionId}</span>
                                </div>
                                {result.blockchain.explorerUrl && (
                                    <a
                                        href={result.blockchain.explorerUrl}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="explorer-link"
                                    >
                                        🔗 Voir sur HashScan
                                    </a>
                                )}
                            </div>
                        )}
                    </div>

                    <div className="action-buttons">
                        <button className="deliver-button">
                            📦 Remettre le Produit
                        </button>
                        <button className="reset-button" onClick={handleReset}>
                            Scanner Suivant
                        </button>
                    </div>
                </div>
            )}

            {/* Instructions */}
            {!result && !error && !loading && (
                <div className="scanner-instructions">
                    <h3>📋 Instructions</h3>
                    <ol>
                        <li>Demandez au client de montrer son QR code</li>
                        <li>Entrez le code dans le champ ci-dessus</li>
                        <li>Cliquez sur "Vérifier"</li>
                        <li>Si valide, remettez le produit au client</li>
                    </ol>
                    <p className="note">
                        💡 <strong>Note:</strong> Chaque QR code ne peut être utilisé qu'une seule fois
                    </p>
                </div>
            )}
        </div>
    );
};

export default MerchantScanner;
