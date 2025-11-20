# Script pour ajouter des tokens FIT à un utilisateur
# Usage: .\add-fit-tokens.ps1 -email "votre@email.com" -amount 1000

param(
    [Parameter(Mandatory=$true)]
    [string]$email,
    
    [Parameter(Mandatory=$false)]
    [int]$amount = 1000
)

Write-Host "💰 Ajout de tokens FIT..." -ForegroundColor Cyan

$dbPath = ".\data.db"

if (-not (Test-Path $dbPath)) {
    Write-Host "❌ Base de données non trouvée: $dbPath" -ForegroundColor Red
    Write-Host "ℹ️  Êtes-vous dans le dossier racine du backend?" -ForegroundColor Yellow
    exit 1
}

Write-Host ""
Write-Host "🎯 UTILISATION AVEC DB BROWSER FOR SQLITE:" -ForegroundColor Cyan
Write-Host ""
Write-Host "1. Téléchargez DB Browser: https://sqlitebrowser.org/" -ForegroundColor White
Write-Host "2. Ouvrez le fichier: $dbPath" -ForegroundColor White
Write-Host "3. Onglet 'Execute SQL'" -ForegroundColor White
Write-Host "4. Exécutez cette requête:" -ForegroundColor White
Write-Host ""
Write-Host "   -- Vérifier votre solde actuel" -ForegroundColor Gray
Write-Host "   SELECT email, fitBalance, isAdmin FROM users WHERE email = '$email';" -ForegroundColor Yellow
Write-Host ""
Write-Host "   -- Ajouter $amount tokens FIT" -ForegroundColor Gray
Write-Host "   UPDATE users SET fitBalance = fitBalance + $amount WHERE email = '$email';" -ForegroundColor Yellow
Write-Host ""
Write-Host "   -- Rendre admin en même temps (si besoin)" -ForegroundColor Gray
Write-Host "   UPDATE users SET isAdmin = 1 WHERE email = '$email';" -ForegroundColor Yellow
Write-Host ""
Write-Host "5. Cliquez sur le bouton ▶️ Execute" -ForegroundColor White
Write-Host "6. Sauvegardez: File → Write Changes (Ctrl+S)" -ForegroundColor White
Write-Host ""
Write-Host "✨ Après ça, reconnectez-vous dans l'app!" -ForegroundColor Green