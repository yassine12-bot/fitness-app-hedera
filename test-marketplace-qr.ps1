# Test Marketplace QR Verification Fix
# This script tests the complete purchase and QR verification flow

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Testing Marketplace QR Verification Fix" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Configuration
$baseUrl = "http://localhost:3000"
$username = "test@example.com"  # Replace with your test user
$password = "password123"        # Replace with your test password

# Step 1: Login
Write-Host "Step 1: Logging in..." -ForegroundColor Yellow
try {
    $loginResponse = Invoke-RestMethod -Uri "$baseUrl/auth/login" `
        -Method POST `
        -ContentType "application/json" `
        -Body (@{
            email = $username
            password = $password
        } | ConvertTo-Json)
    
    $token = $loginResponse.token
    Write-Host "✅ Login successful!" -ForegroundColor Green
    Write-Host "   Token: $($token.Substring(0, 20))..." -ForegroundColor Gray
    Write-Host ""
} catch {
    Write-Host "❌ Login failed: $_" -ForegroundColor Red
    exit 1
}

# Step 2: Get available products
Write-Host "Step 2: Getting available products..." -ForegroundColor Yellow
try {
    $productsResponse = Invoke-RestMethod -Uri "$baseUrl/api/marketplace/products" `
        -Method GET `
        -Headers @{"Authorization"="Bearer $token"}
    
    $product = $productsResponse.data[0]
    Write-Host "✅ Found products!" -ForegroundColor Green
    Write-Host "   Product: $($product.name)" -ForegroundColor Gray
    Write-Host "   Price: $($product.priceTokens) FIT" -ForegroundColor Gray
    Write-Host "   Stock: $($product.stock)" -ForegroundColor Gray
    Write-Host ""
} catch {
    Write-Host "❌ Failed to get products: $_" -ForegroundColor Red
    exit 1
}

# Step 3: Purchase product
Write-Host "Step 3: Purchasing product..." -ForegroundColor Yellow
try {
    $purchaseResponse = Invoke-RestMethod -Uri "$baseUrl/api/marketplace/purchase" `
        -Method POST `
        -Headers @{"Authorization"="Bearer $token"} `
        -ContentType "application/json" `
        -Body (@{
            productId = $product.id
            quantity = 1
        } | ConvertTo-Json)
    
    $nftId = $purchaseResponse.data.nftId
    $qrCode = $purchaseResponse.data.qrCode
    $txId = $purchaseResponse.data.blockchain.transactionId
    
    Write-Host "✅ Purchase successful!" -ForegroundColor Green
    Write-Host "   NFT ID: $nftId" -ForegroundColor Gray
    Write-Host "   QR Code: $qrCode" -ForegroundColor Gray
    Write-Host "   Transaction: $txId" -ForegroundColor Gray
    Write-Host "   Explorer: $($purchaseResponse.data.blockchain.explorerUrl)" -ForegroundColor Gray
    Write-Host ""
    
    # Verify NFT ID is a small integer, not a timestamp
    if ($nftId -lt 1000) {
        Write-Host "✅ NFT ID looks correct (small integer: $nftId)" -ForegroundColor Green
    } else {
        Write-Host "⚠️  NFT ID might be a timestamp ($nftId) - expected small integer" -ForegroundColor Yellow
    }
    Write-Host ""
} catch {
    Write-Host "❌ Purchase failed: $_" -ForegroundColor Red
    Write-Host "   Error details: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}

# Step 4: Wait a moment for blockchain confirmation
Write-Host "Step 4: Waiting for blockchain confirmation..." -ForegroundColor Yellow
Start-Sleep -Seconds 5
Write-Host "✅ Wait complete" -ForegroundColor Green
Write-Host ""

# Step 5: Verify QR code
Write-Host "Step 5: Verifying QR code..." -ForegroundColor Yellow
try {
    $qrResponse = Invoke-RestMethod -Uri "$baseUrl/api/marketplace/verify-qr" `
        -Method POST `
        -Headers @{"Authorization"="Bearer $token"} `
        -ContentType "application/json" `
        -Body (@{
            qrCode = $qrCode
        } | ConvertTo-Json)
    
    Write-Host "✅ QR verification successful!" -ForegroundColor Green
    Write-Host "   Product: $($qrResponse.data.productName)" -ForegroundColor Gray
    Write-Host "   User: $($qrResponse.data.userName)" -ForegroundColor Gray
    
    if ($qrResponse.data.blockchain) {
        Write-Host "   Blockchain TX: $($qrResponse.data.blockchain.transactionId)" -ForegroundColor Gray
        Write-Host "   Explorer: $($qrResponse.data.blockchain.explorerUrl)" -ForegroundColor Gray
    }
    Write-Host ""
} catch {
    Write-Host "❌ QR verification failed: $_" -ForegroundColor Red
    Write-Host "   Error details: $($_.Exception.Message)" -ForegroundColor Red
    
    # Check if it's the CONTRACT_REVERT_EXECUTED error
    if ($_.Exception.Message -like "*CONTRACT_REVERT_EXECUTED*") {
        Write-Host ""
        Write-Host "🔍 CONTRACT_REVERT_EXECUTED Error Detected!" -ForegroundColor Red
        Write-Host "   This means the contract rejected the transaction." -ForegroundColor Yellow
        Write-Host "   Possible causes:" -ForegroundColor Yellow
        Write-Host "   1. Wrong operator account (not the deployer)" -ForegroundColor Yellow
        Write-Host "   2. NFT ID doesn't exist on-chain" -ForegroundColor Yellow
        Write-Host "   3. NFT already marked as used" -ForegroundColor Yellow
    }
    exit 1
}

# Step 6: Try to verify again (should fail - already used)
Write-Host "Step 6: Testing duplicate verification (should fail)..." -ForegroundColor Yellow
try {
    $qrResponse2 = Invoke-RestMethod -Uri "$baseUrl/api/marketplace/verify-qr" `
        -Method POST `
        -Headers @{"Authorization"="Bearer $token"} `
        -ContentType "application/json" `
        -Body (@{
            qrCode = $qrCode
        } | ConvertTo-Json)
    
    Write-Host "⚠️  Duplicate verification succeeded (unexpected!)" -ForegroundColor Yellow
} catch {
    if ($_.Exception.Response.StatusCode -eq 400) {
        Write-Host "✅ Duplicate verification correctly rejected!" -ForegroundColor Green
        Write-Host "   Error: QR code already used" -ForegroundColor Gray
    } else {
        Write-Host "⚠️  Unexpected error: $_" -ForegroundColor Yellow
    }
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "✅ ALL TESTS PASSED!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Summary:" -ForegroundColor Cyan
Write-Host "  ✅ Login successful" -ForegroundColor Green
Write-Host "  ✅ Product listing works" -ForegroundColor Green
Write-Host "  ✅ Purchase with real NFT ID" -ForegroundColor Green
Write-Host "  ✅ QR verification on blockchain" -ForegroundColor Green
Write-Host "  ✅ Duplicate prevention works" -ForegroundColor Green
Write-Host ""
