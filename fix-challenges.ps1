# Fix challenges.js to handle users without Hedera accounts

$filePath = "src\api\challenges.js"
$content = Get-Content -Path $filePath -Raw

# Find and replace the progress fetching logic
$oldCode = @"
            // Only include active challenges
            if (challenge.isActive) {
                // Get user progress for this challenge
                const progress = await fitnessContract.getChallengeProgress(
                    req.user.hederaAccountId,
                    i
                );

                const isCompleted = await fitnessContract.isChallengeCompleted(
                    req.user.hederaAccountId,
                    i
                );

                challenges.push({
"@

$newCode = @"
            // Only include active challenges
            if (challenge.isActive) {
                let progress = 0;
                let isCompleted = false;
                
                // Only get user progress if they have a Hedera account
                if (req.user.hederaAccountId) {
                    try {
                        progress = await fitnessContract.getChallengeProgress(
                            req.user.hederaAccountId,
                            i
                        );

                        isCompleted = await fitnessContract.isChallengeCompleted(
                            req.user.hederaAccountId,
                            i
                        );
                    } catch (error) {
                        console.error(`Error getting progress for challenge ${i}:`, error.message);
                    }
                }

                challenges.push({
"@

$content = $content.Replace($oldCode, $newCode)
Set-Content -Path $filePath -Value $content

Write-Host "✅ Challenges API fixed!" -ForegroundColor Green
