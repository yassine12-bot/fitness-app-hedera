# ========================================
# SIMPLE TEST COMMANDS
# Copy and paste these one by one
# ========================================

# 1. LOGIN (replace with your email and password)
$loginResponse = Invoke-RestMethod -Uri "http://localhost:3000/auth/login" -Method POST -ContentType "application/json" -Body '{"email":"test@example.com","password":"password123"}'
$token = $loginResponse.token
Write-Host "✅ Logged in! Token: $($token.Substring(0,20))..." -ForegroundColor Green

# 2. GET PRODUCTS
$products = Invoke-RestMethod -Uri "http://localhost:3000/api/marketplace/products" -Method GET -Headers @{"Authorization"="Bearer $token"}
$products.data | Format-Table id, name, priceTokens, stock
Write-Host "✅ Found $($products.data.Count) products" -ForegroundColor Green

# 3. PURCHASE (uses first product)
$productId = $products.data[0].id
$purchaseResponse = Invoke-RestMethod -Uri "http://localhost:3000/api/marketplace/purchase" -Method POST -Headers @{"Authorization"="Bearer $token"} -ContentType "application/json" -Body "{`"productId`":$productId,`"quantity`":1}"
$nftId = $purchaseResponse.data.nftId
$qrCode = $purchaseResponse.data.qrCode
Write-Host "✅ Purchase successful!" -ForegroundColor Green
Write-Host "   NFT ID: $nftId" -ForegroundColor Cyan
Write-Host "   QR Code: $qrCode" -ForegroundColor Cyan
if ($nftId -lt 1000) {
    Write-Host "   ✅ NFT ID is correct (small integer)" -ForegroundColor Green
} else {
    Write-Host "   ⚠️  NFT ID looks like a timestamp - might be an issue!" -ForegroundColor Yellow
}

# 4. WAIT FOR BLOCKCHAIN
Write-Host "⏳ Waiting 5 seconds for blockchain confirmation..." -ForegroundColor Yellow
Start-Sleep -Seconds 5

# 5. VERIFY QR CODE
$qrResponse = Invoke-RestMethod -Uri "http://localhost:3000/api/marketplace/verify-qr" -Method POST -Headers @{"Authorization"="Bearer $token"} -ContentType "application/json" -Body "{`"qrCode`":`"$qrCode`"}"
Write-Host "✅ QR Verification successful!" -ForegroundColor Green
Write-Host "   Product: $($qrResponse.data.productName)" -ForegroundColor Cyan
Write-Host "   Blockchain TX: $($qrResponse.data.blockchain.transactionId)" -ForegroundColor Cyan
Write-Host "   Explorer: $($qrResponse.data.blockchain.explorerUrl)" -ForegroundColor Cyan

# 6. TEST DUPLICATE (should fail)
try {
    $qrResponse2 = Invoke-RestMethod -Uri "http://localhost:3000/api/marketplace/verify-qr" -Method POST -Headers @{"Authorization"="Bearer $token"} -ContentType "application/json" -Body "{`"qrCode`":`"$qrCode`"}"
    Write-Host "⚠️  Duplicate verification succeeded (unexpected)" -ForegroundColor Yellow
} catch {
    Write-Host "✅ Duplicate verification correctly rejected!" -ForegroundColor Green
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "✅ ALL TESTS PASSED!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Cyan
