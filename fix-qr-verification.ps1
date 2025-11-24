# Script to add blockchain integration to QR verification
# This adds the markNFTUsed call and transaction ID to the response

$file = "src/api/marketplace/products.js"
$content = Get-Content -Path $file -Raw

# Replace the cache-only verification with blockchain integration
$oldCode = @'
    // Mark as used in cache (skip contract for now - NFT IDs are mocked)
    await db.run(`
      UPDATE purchases
      SET isUsed = 1, usedAt = CURRENT_TIMESTAMP
      WHERE qrCode = ?
    `, [qrCode]);
    
    console.log(`✅ QR code ${qrCode} marked as used`);
    
    res.json({
      success: true,
      message: 'QR code valide et marqué comme utilisé ✅',
      data: {
        productName: purchase.productName,
        quantity: purchase.quantity,
        userName: purchase.userName,
        purchaseDate: purchase.createdAt
      }
    });
'@

$newCode = @'
    // ====================================================
    // Mark NFT as used on blockchain
    // ====================================================
    const nftId = parseInt(qrCode.replace('NFT-', ''));
    
    if (isNaN(nftId)) {
      return res.status(400).json({
        success: false,
        message: 'Format de QR code invalide'
      });
    }
    
    console.log(`🔗 Marking NFT ${nftId} as used on blockchain...`);
    
    // Call smart contract to mark NFT as used
    const contractResult = await marketplaceContract.markNFTUsed(nftId);
    
    console.log(`✅ NFT marked as used on-chain: ${contractResult.transactionId}`);
    
    // Update cache to match blockchain state
    await db.run(`
      UPDATE purchases
      SET isUsed = 1, usedAt = CURRENT_TIMESTAMP
      WHERE qrCode = ?
    `, [qrCode]);
    
    console.log(`✅ QR code ${qrCode} synced to cache`);
    
    res.json({
      success: true,
      message: 'QR code valide et marqué comme utilisé ✅',
      data: {
        productName: purchase.productName,
        quantity: purchase.quantity,
        userName: purchase.userName,
        purchaseDate: purchase.createdAt,
        isUsed: true,
        blockchain: {
          transactionId: contractResult.transactionId,
          explorerUrl: "https://hashscan.io/testnet/transaction/${contractResult.transactionId}"
        }
      }
    });
'@

$content = $content.Replace($oldCode, $newCode)
Set-Content -Path $file -Value $content

Write-Host "✅ QR verification updated with blockchain integration!" -ForegroundColor Green
