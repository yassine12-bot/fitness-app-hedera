# Quick Test - Marketplace QR Verification
# Simple step-by-step commands to test the fix

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Quick Marketplace QR Test" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# STEP 1: Login (replace with your credentials)
Write-Host "STEP 1: Login" -ForegroundColor Yellow
Write-Host "Copy and paste this command, replacing email and password:" -ForegroundColor Gray
Write-Host ""
Write-Host '$loginResponse = Invoke-RestMethod -Uri "http://localhost:3000/auth/login" -Method POST -ContentType "application/json" -Body ''{"email":"YOUR_EMAIL","password":"YOUR_PASSWORD"}''' -ForegroundColor White
Write-Host '$token = $loginResponse.token' -ForegroundColor White
Write-Host 'Write-Host "Token: $token"' -ForegroundColor White
Write-Host ""
Write-Host "Press Enter after you've logged in..." -ForegroundColor Yellow
Read-Host

# STEP 2: Get products
Write-Host "STEP 2: Get available products" -ForegroundColor Yellow
Write-Host "Copy and paste:" -ForegroundColor Gray
Write-Host ""
Write-Host '$products = Invoke-RestMethod -Uri "http://localhost:3000/api/marketplace/products" -Method GET -Headers @{"Authorization"="Bearer $token"}' -ForegroundColor White
Write-Host '$products.data | Format-Table id, name, priceTokens, stock' -ForegroundColor White
Write-Host ""
Write-Host "Press Enter after you see products..." -ForegroundColor Yellow
Read-Host

# STEP 3: Purchase
Write-Host "STEP 3: Purchase a product" -ForegroundColor Yellow
Write-Host "Copy and paste (replace productId with one from the list):" -ForegroundColor Gray
Write-Host ""
Write-Host '$purchaseResponse = Invoke-RestMethod -Uri "http://localhost:3000/api/marketplace/purchase" -Method POST -Headers @{"Authorization"="Bearer $token"} -ContentType "application/json" -Body ''{"productId":1,"quantity":1}''' -ForegroundColor White
Write-Host '$purchaseResponse.data | Format-List' -ForegroundColor White
Write-Host ""
Write-Host "IMPORTANT: Check the NFT ID - it should be a small number (1, 2, 3...) NOT a timestamp!" -ForegroundColor Cyan
Write-Host ""
Write-Host "Press Enter after purchase..." -ForegroundColor Yellow
Read-Host

# STEP 4: Save QR code
Write-Host "STEP 4: Save the QR code" -ForegroundColor Yellow
Write-Host "Copy and paste:" -ForegroundColor Gray
Write-Host ""
Write-Host '$qrCode = $purchaseResponse.data.qrCode' -ForegroundColor White
Write-Host 'Write-Host "QR Code: $qrCode"' -ForegroundColor White
Write-Host ""
Write-Host "Press Enter..." -ForegroundColor Yellow
Read-Host

# STEP 5: Verify QR
Write-Host "STEP 5: Verify the QR code" -ForegroundColor Yellow
Write-Host "Copy and paste:" -ForegroundColor Gray
Write-Host ""
Write-Host '$qrResponse = Invoke-RestMethod -Uri "http://localhost:3000/api/marketplace/verify-qr" -Method POST -Headers @{"Authorization"="Bearer $token"} -ContentType "application/json" -Body "{`"qrCode`":`"$qrCode`"}"' -ForegroundColor White
Write-Host '$qrResponse | Format-List' -ForegroundColor White
Write-Host ""
Write-Host "EXPECTED: Success with blockchain transaction ID" -ForegroundColor Cyan
Write-Host "If you see CONTRACT_REVERT_EXECUTED, the fix didn't work!" -ForegroundColor Red
Write-Host ""
Write-Host "Press Enter..." -ForegroundColor Yellow
Read-Host

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Test Complete!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Check the blockchain transaction:" -ForegroundColor Cyan
Write-Host '$qrResponse.data.blockchain.explorerUrl' -ForegroundColor White
