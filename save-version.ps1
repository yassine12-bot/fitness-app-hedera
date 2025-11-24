# Save Current Version Script
# Run this to save your current work state

Write-Host "`n💾 SAVING CURRENT VERSION..." -ForegroundColor Cyan
Write-Host "=" * 70

# Step 1: Check git status
Write-Host "`n1️⃣ Checking what changed..." -ForegroundColor Yellow
git status --short

# Step 2: Add all changes
Write-Host "`n2️⃣ Adding all changes..." -ForegroundColor Yellow
git add .

# Step 3: Commit with timestamp
$timestamp = Get-Date -Format "yyyy-MM-dd-HHmm"
$message = "Backend working state - $timestamp - challenges API grouped, products from contract"

Write-Host "`n3️⃣ Committing changes..." -ForegroundColor Yellow
git commit -m "$message"

# Step 4: Create named branch
$branchName = "backend-working-$timestamp"
Write-Host "`n4️⃣ Creating branch: $branchName" -ForegroundColor Yellow
git branch $branchName

# Step 5: Create tag
$tagName = "v1.0-backend-$timestamp"
Write-Host "`n5️⃣ Creating tag: $tagName" -ForegroundColor Yellow
git tag -a $tagName -m "Backend working state before fixes"

Write-Host "`n" + "=" * 70
Write-Host "✅ SAVED SUCCESSFULLY!" -ForegroundColor Green
Write-Host "`nYour work is saved as:" -ForegroundColor Cyan
Write-Host "  Branch: $branchName" -ForegroundColor White
Write-Host "  Tag: $tagName" -ForegroundColor White

Write-Host "`n📋 To return to this version later:" -ForegroundColor Yellow
Write-Host "  git checkout $branchName" -ForegroundColor White
Write-Host "  # or" -ForegroundColor Gray
Write-Host "  git checkout $tagName" -ForegroundColor White

Write-Host "`n📤 To push to remote (if you have GitHub):" -ForegroundColor Yellow
Write-Host "  git push origin $branchName" -ForegroundColor White
Write-Host "  git push origin $tagName" -ForegroundColor White

Write-Host "`n🎯 Now you can safely experiment!" -ForegroundColor Green
