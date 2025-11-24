# 🧪 Hedera Fit - Automated Integration Test Script (PowerShell)
# This script tests the complete user journey:
# 1. Challenge completion & rewards
# 2. New challenge availability  
# 3. Purchase & QR code generation

# Configuration
$BaseUrl = "http://localhost:3000"
$Timestamp = [DateTimeOffset]::Now.ToUnixTimeSeconds()
$Email = "testuser_$Timestamp@example.com"
$Password = "Test123!"
$Username = "testuser_$Timestamp"

# Color functions
function Write-Success {
    param($Message)
    Write-Host "✅ $Message" -ForegroundColor Green
}

function Write-Error-Custom {
    param($Message)
    Write-Host "❌ $Message" -ForegroundColor Red
}

function Write-Warning-Custom {
    param($Message)
    Write-Host "⚠️  $Message" -ForegroundColor Yellow
}

function Write-Section {
    param($Message)
    Write-Host ""
    Write-Host $Message -ForegroundColor Cyan
    Write-Host ("─" * 60) -ForegroundColor Cyan
}

function Write-Info {
    param($Message)
    Write-Host $Message -ForegroundColor White
}

# Helper function to make API calls with proper error handling
function Invoke-ApiRequest {
    param(
        [string]$Uri,
        [string]$Method = "GET",
        [hashtable]$Body = $null,
        [string]$Token = $null
    )
    
    try {
        $headers = @{
            "Content-Type" = "application/json"
        }
        
        if ($Token) {
            $headers["Authorization"] = "Bearer $Token"
        }
        
        $params = @{
            Uri = $Uri
            Method = $Method
            Headers = $headers
        }
        
        if ($Body) {
            $jsonBody = $Body | ConvertTo-Json -Depth 10
            $params["Body"] = $jsonBody
        }
        
        $response = Invoke-RestMethod @params
        return @{
            Success = $true
            Data = $response
        }
    }
    catch {
        $errorMessage = $_.Exception.Message
        if ($_.Exception.Response) {
            $reader = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
            $errorBody = $reader.ReadToEnd()
            try {
                $errorJson = $errorBody | ConvertFrom-Json
                $errorMessage = $errorJson.message
            }
            catch {
                $errorMessage = $errorBody
            }
        }
        return @{
            Success = $false
            Error = $errorMessage
        }
    }
}

Write-Host ""
Write-Host "🚀 Hedera Fit - Full Integration Test" -ForegroundColor Blue
Write-Host ("═" * 60) -ForegroundColor Blue
Write-Host ""

# 0. Check if backend is running
Write-Section "🔍 0. Checking Backend Status"
try {
    $healthCheck = Invoke-RestMethod -Uri "$BaseUrl/health" -Method GET -TimeoutSec 5
    Write-Success "Backend is running"
    Write-Info "Status: $($healthCheck.status)"
}
catch {
    Write-Error-Custom "Backend is not running at $BaseUrl"
    Write-Host "Please start the backend with: npm start" -ForegroundColor Yellow
    Write-Host "Or: node src/index.js" -ForegroundColor Yellow
    exit 1
}

# 1. Register User
Write-Section "📝 1. Registering Test User"
Write-Info "Email: $Email"

$registerBody = @{
    username = $Username
    email = $Email
    password = $Password
}

$registerResult = Invoke-ApiRequest -Uri "$BaseUrl/auth/register" -Method POST -Body $registerBody

if ($registerResult.Success) {
    Write-Success "User registered successfully"
}
else {
    Write-Error-Custom "Registration failed: $($registerResult.Error)"
    exit 1
}

# 2. Login
Write-Section "🔐 2. Logging In"
$loginBody = @{
    email = $Email
    password = $Password
}

$loginResult = Invoke-ApiRequest -Uri "$BaseUrl/auth/login" -Method POST -Body $loginBody

if ($loginResult.Success -and $loginResult.Data.token) {
    $Token = $loginResult.Data.token
    Write-Success "Logged in successfully"
    Write-Info "Token: $($Token.Substring(0, [Math]::Min(20, $Token.Length)))..."
}
else {
    Write-Error-Custom "Login failed: $($loginResult.Error)"
    exit 1
}

# 3. Get Initial Profile
Write-Section "👤 3. Getting User Profile"
$profileResult = Invoke-ApiRequest -Uri "$BaseUrl/api/users/profile" -Method GET -Token $Token

if ($profileResult.Success) {
    $profile = $profileResult.Data.data
    $InitialBalance = if ($profile.fitBalance) { $profile.fitBalance } else { 0 }
    $HederaAccount = if ($profile.hederaAccountId) { $profile.hederaAccountId } else { "none" }
    
    Write-Success "Profile retrieved"
    Write-Info "Initial FIT Balance: $InitialBalance FIT"
    Write-Info "Hedera Account: $HederaAccount"
}
else {
    Write-Error-Custom "Failed to get profile: $($profileResult.Error)"
    exit 1
}

# Check if user has wallet
if ($HederaAccount -eq "none" -or $HederaAccount -eq "null" -or -not $HederaAccount) {
    Write-Warning-Custom "User doesn't have Hedera wallet. Creating one..."
    
    $walletResult = Invoke-ApiRequest -Uri "$BaseUrl/api/users/wallet/create" -Method POST -Token $Token
    
    if ($walletResult.Success) {
        $HederaAccount = $walletResult.Data.data.hederaAccountId
        Write-Success "Wallet created: $HederaAccount"
    }
    else {
        Write-Error-Custom "Failed to create wallet: $($walletResult.Error)"
        exit 1
    }
}

# 4. Get Active Challenges
Write-Section "🎯 4. Checking Active Challenges"
$challengesResult = Invoke-ApiRequest -Uri "$BaseUrl/api/challenges/active" -Method GET -Token $Token

if ($challengesResult.Success) {
    $challenges = $challengesResult.Data.data.challenges
    $ChallengeCount = $challenges.Count
    Write-Success "Found $ChallengeCount active challenge(s)"
    
    if ($ChallengeCount -gt 0) {
        Write-Host ""
        Write-Info "Available Challenges:"
        foreach ($challenge in $challenges) {
            Write-Info "  • $($challenge.title) - Target: $($challenge.target) steps - Reward: $($challenge.reward) FIT"
        }
        
        # Get first challenge details
        $FirstChallenge = $challenges[0]
        $FirstChallengeId = $FirstChallenge.id
        $FirstChallengeTarget = $FirstChallenge.target
        $FirstChallengeReward = $FirstChallenge.reward
        $FirstChallengeTitle = $FirstChallenge.title
    }
    else {
        Write-Warning-Custom "No active challenges found"
        $FirstChallengeTarget = 5000
        $FirstChallengeReward = 10
    }
}
else {
    Write-Warning-Custom "Failed to get challenges: $($challengesResult.Error)"
    $FirstChallengeTarget = 5000
    $FirstChallengeReward = 10
}

# 5. Log Workout to Complete Challenge
Write-Section "💪 5. Logging Workout"
$StepsToLog = $FirstChallengeTarget + 100
Write-Info "Logging $StepsToLog steps (Target: $FirstChallengeTarget)"

$workoutBody = @{
    steps = $StepsToLog
    distance = 4.2
    calories = 250
}

$workoutResult = Invoke-ApiRequest -Uri "$BaseUrl/api/workouts/steps" -Method POST -Body $workoutBody -Token $Token

if ($workoutResult.Success) {
    $workout = $workoutResult.Data.data
    $TxId = if ($workout.blockchain.transactionId) { $workout.blockchain.transactionId } else { "N/A" }
    Write-Success "Workout logged! Transaction: $TxId"
    if ($workout.blockchain.explorerUrl) {
        Write-Info "Explorer: $($workout.blockchain.explorerUrl)"
    }
}
else {
    Write-Error-Custom "Workout logging failed: $($workoutResult.Error)"
    Write-Host ""
    Write-Host "Common issues:" -ForegroundColor Yellow
    Write-Host "  • Smart contracts not deployed (run: npm run deploy)" -ForegroundColor Yellow
    Write-Host "  • Missing FITNESS_CONTRACT_ADDRESS in .env" -ForegroundColor Yellow
    Write-Host "  • Hedera account out of HBAR (need gas for transactions)" -ForegroundColor Yellow
}

# 6. Wait for Blockchain Sync
Write-Section "⏳ 6. Waiting for Blockchain Sync"
Write-Info "Waiting 5 seconds for smart contract sync..."
for ($i = 5; $i -gt 0; $i--) {
    Write-Host "$i... " -NoNewline -ForegroundColor Yellow
    Start-Sleep -Seconds 1
}
Write-Host ""
Write-Success "Sync period completed"

# 7. Check Updated Balance
Write-Section "💰 7. Verifying Reward Distribution"
$newProfileResult = Invoke-ApiRequest -Uri "$BaseUrl/api/users/profile" -Method GET -Token $Token

if ($newProfileResult.Success) {
    $newProfile = $newProfileResult.Data.data
    $NewBalance = if ($newProfile.fitBalance) { $newProfile.fitBalance } else { 0 }
    $BalanceIncrease = $NewBalance - $InitialBalance
    
    Write-Info "Initial Balance: $InitialBalance FIT"
    Write-Info "New Balance: $NewBalance FIT"
    Write-Info "Increase: +$BalanceIncrease FIT"
    
    if ($BalanceIncrease -gt 0) {
        Write-Success "Reward distributed successfully! (+$BalanceIncrease FIT)"
    }
    else {
        Write-Warning-Custom "No balance increase detected"
        Write-Host "This might mean:" -ForegroundColor Yellow
        Write-Host "  • Challenge sync is still in progress" -ForegroundColor Yellow
        Write-Host "  • Challenge was already completed" -ForegroundColor Yellow
        Write-Host "  • Smart contract call failed" -ForegroundColor Yellow
    }
}

# 8. Check Challenge Completions
Write-Section "✅ 8. Checking Challenge Completions"
$completionsResult = Invoke-ApiRequest -Uri "$BaseUrl/api/challenges/user-completions" -Method GET -Token $Token

if ($completionsResult.Success) {
    $completions = $completionsResult.Data.data.completions
    $CompletionCount = if ($completions) { $completions.Count } else { 0 }
    Write-Success "Total completions: $CompletionCount"
    
    if ($CompletionCount -gt 0) {
        Write-Host ""
        Write-Info "Completed Challenges:"
        foreach ($completion in $completions) {
            Write-Info "  • $($completion.challengeTitle) - Reward: $($completion.reward) FIT - $($completion.completedAt)"
        }
    }
}

# 9. Check Progress on Active Challenges
Write-Section "📊 9. Checking Challenge Progress"
$progressResult = Invoke-ApiRequest -Uri "$BaseUrl/api/challenges/my-progress" -Method GET -Token $Token

if ($progressResult.Success -and $progressResult.Data.data.progress) {
    $progress = $progressResult.Data.data.progress
    foreach ($p in $progress) {
        $status = if ($p.completed) { "✅ COMPLETED" } else { "🔄 In Progress" }
        Write-Info "  • $($p.title): $($p.currentProgress)/$($p.target) ($($p.percentage)%) - $status"
    }
}
else {
    Write-Warning-Custom "Could not fetch challenge progress"
}

# 10. Get Marketplace Products
Write-Section "🛒 10. Checking Marketplace Products"
$productsResult = Invoke-ApiRequest -Uri "$BaseUrl/api/marketplace/products" -Method GET -Token $Token

if ($productsResult.Success) {
    $products = $productsResult.Data.data.products
    $ProductCount = if ($products) { $products.Count } else { 0 }
    Write-Success "Found $ProductCount product(s)"
    
    if ($ProductCount -gt 0) {
        Write-Host ""
        Write-Info "Available Products:"
        foreach ($product in $products) {
            Write-Info "  • $($product.name) - Price: $($product.price) FIT - Stock: $($product.stock)"
        }
        
        # Get first product details
        $FirstProduct = $products[0]
        $FirstProductId = $FirstProduct.id
        $FirstProductName = $FirstProduct.name
        $FirstProductPrice = $FirstProduct.price
    }
}

# 11. Purchase Product (if enough balance)
Write-Section "💳 11. Testing Purchase Flow"
if ($ProductCount -eq 0) {
    Write-Warning-Custom "No products available to purchase"
}
elseif ($NewBalance -lt $FirstProductPrice) {
    Write-Warning-Custom "Insufficient balance for purchase"
    Write-Info "Need: $FirstProductPrice FIT"
    Write-Info "Have: $NewBalance FIT"
    Write-Host "Complete more challenges to earn FIT tokens!" -ForegroundColor Yellow
}
else {
    Write-Info "Attempting to purchase: $FirstProductName ($FirstProductPrice FIT)"
    
    $purchaseBody = @{
        productId = $FirstProductId
        quantity = 1
    }
    
    $purchaseResult = Invoke-ApiRequest -Uri "$BaseUrl/api/marketplace/purchase" -Method POST -Body $purchaseBody -Token $Token
    
    if ($purchaseResult.Success) {
        $purchase = $purchaseResult.Data.data
        $QrCode = $purchase.qrCode
        $NftToken = if ($purchase.nft.tokenId) { $purchase.nft.tokenId } else { "N/A" }
        $NftSerial = if ($purchase.nft.serialNumber) { $purchase.nft.serialNumber } else { "N/A" }
        $PurchaseTx = if ($purchase.blockchain.transactionId) { $purchase.blockchain.transactionId } else { "N/A" }
        
        Write-Success "Purchase successful!"
        Write-Host ""
        Write-Host "📱 QR CODE: " -NoNewline -ForegroundColor Cyan
        Write-Host $QrCode -ForegroundColor Green
        Write-Host "🎫 NFT: $NftToken (Serial: $NftSerial)" -ForegroundColor Cyan
        Write-Host "🔗 Transaction: $PurchaseTx" -ForegroundColor Cyan
        if ($purchase.blockchain.explorerUrl) {
            Write-Host "🌐 Explorer: $($purchase.blockchain.explorerUrl)" -ForegroundColor Cyan
        }
        
        # 12. Verify Purchase in History
        Write-Section "📦 12. Verifying Purchase History"
        $myPurchasesResult = Invoke-ApiRequest -Uri "$BaseUrl/api/marketplace/my-purchases" -Method GET -Token $Token
        
        if ($myPurchasesResult.Success) {
            $myPurchases = $myPurchasesResult.Data.data.purchases
            $PurchaseCount = if ($myPurchases) { $myPurchases.Count } else { 0 }
            Write-Success "Total purchases: $PurchaseCount"
            
            if ($PurchaseCount -gt 0) {
                Write-Host ""
                Write-Info "Purchase History:"
                foreach ($p in $myPurchases) {
                    $used = if ($p.isUsed -eq 1) { "✅ Yes" } else { "❌ No" }
                    Write-Info "  • $($p.productName) - QR: $($p.qrCode) - Used: $used"
                }
            }
        }
        
        # 13. Check Final Balance
        Write-Section "💰 13. Final Balance Check"
        $finalProfileResult = Invoke-ApiRequest -Uri "$BaseUrl/api/users/profile" -Method GET -Token $Token
        
        if ($finalProfileResult.Success) {
            $finalProfile = $finalProfileResult.Data.data
            $FinalBalance = if ($finalProfile.fitBalance) { $finalProfile.fitBalance } else { 0 }
            $Spent = $NewBalance - $FinalBalance
            
            Write-Info "Balance Before Purchase: $NewBalance FIT"
            Write-Info "Purchase Cost: $FirstProductPrice FIT"
            Write-Info "Final Balance: $FinalBalance FIT"
            Write-Info "Actual Spent: $Spent FIT"
            
            if ($Spent -eq $FirstProductPrice) {
                Write-Success "Balance deduction is correct!"
            }
            else {
                Write-Warning-Custom "Balance deduction mismatch (expected: $FirstProductPrice, actual: $Spent)"
            }
        }
        
        # 14. Test QR Code Validation
        Write-Section "🔍 14. Testing QR Code Validation"
        Write-Info "Validating QR Code: $QrCode"
        
        $validateBody = @{
            qrCode = $QrCode
        }
        
        $validateResult = Invoke-ApiRequest -Uri "$BaseUrl/api/marketplace/validate-qr" -Method POST -Body $validateBody -Token $Token
        
        if ($validateResult.Success) {
            Write-Success "QR Code validated successfully!"
            $validateResult.Data.data | ConvertTo-Json -Depth 5 | Write-Host
            
            # Try to validate again (should fail)
            Write-Host ""
            Write-Info "Attempting to reuse QR code (should fail)..."
            Start-Sleep -Seconds 1
            
            $revalidateResult = Invoke-ApiRequest -Uri "$BaseUrl/api/marketplace/validate-qr" -Method POST -Body $validateBody -Token $Token
            
            if ($revalidateResult.Success) {
                Write-Error-Custom "QR Code was validated twice! This is a security issue!"
            }
            else {
                Write-Success "QR Code correctly rejected on second use"
                Write-Info "Error: $($revalidateResult.Error)"
            }
        }
        else {
            Write-Warning-Custom "QR Code validation failed: $($validateResult.Error)"
        }
    }
    else {
        Write-Error-Custom "Purchase failed: $($purchaseResult.Error)"
    }
}

# Final Summary
Write-Host ""
Write-Host ("═" * 60) -ForegroundColor Blue
Write-Host "📊 Test Summary" -ForegroundColor Blue
Write-Host ("═" * 60) -ForegroundColor Blue
Write-Host ""
Write-Info "User: $Email"
Write-Info "Hedera Account: $HederaAccount"
Write-Info "Initial Balance: $InitialBalance FIT"
if ($finalProfile) {
    Write-Info "Final Balance: $($finalProfile.fitBalance) FIT"
}
else {
    Write-Info "Final Balance: $NewBalance FIT"
}
Write-Info "Challenges Completed: $CompletionCount"
if ($PurchaseCount) {
    Write-Info "Purchases Made: $PurchaseCount"
}
Write-Host ""
Write-Success "All Tests Completed!"
Write-Host ""
Write-Host "To view blockchain transactions:" -ForegroundColor Cyan
Write-Host "🔗 https://hashscan.io/testnet/account/$HederaAccount" -ForegroundColor Cyan
Write-Host ""