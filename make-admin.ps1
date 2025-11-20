# Script PowerShell pour rendre un utilisateur admin
# Usage: .\make-admin.ps1 "votre@email.com"

param(
    [Parameter(Mandatory=$true)]
    [string]$Email
)

Write-Host "🔧 Mise à jour du compte admin..." -ForegroundColor Yellow

# Chemin vers la base de données
$dbPath = "data.db"

# Vérifier si sqlite3 est installé
$sqlite3 = Get-Command sqlite3 -ErrorAction SilentlyContinue

if (-not $sqlite3) {
    Write-Host "❌ sqlite3 n'est pas installé!" -ForegroundColor Red
    Write-Host "📥 Télécharge-le depuis: https://www.sqlite.org/download.html" -ForegroundColor Yellow
    Write-Host "Ou installe avec: winget install SQLite.SQLite" -ForegroundColor Yellow
    exit 1
}

# Vérifier si la base existe
if (-not (Test-Path $dbPath)) {
    Write-Host "❌ Fichier $dbPath non trouvé!" -ForegroundColor Red
    Write-Host "💡 Assure-toi d'être dans le dossier racine du backend" -ForegroundColor Yellow
    exit 1
}

# Ajouter la colonne isAdmin si elle n'existe pas
Write-Host "🔄 Vérification de la colonne isAdmin..." -ForegroundColor Cyan
sqlite3 $dbPath "ALTER TABLE users ADD COLUMN isAdmin INTEGER DEFAULT 0;" 2>$null

# Mettre à jour l'utilisateur
$query = "UPDATE users SET isAdmin = 1 WHERE email = '$Email';"
sqlite3 $dbPath $query

# Vérifier le résultat
$checkQuery = "SELECT id, name, email, isAdmin FROM users WHERE email = '$Email';"
$result = sqlite3 $dbPath $checkQuery

if ($result) {
    Write-Host "✅ Compte admin mis à jour avec succès!" -ForegroundColor Green
    Write-Host ""
    Write-Host "📋 Informations:" -ForegroundColor Cyan
    Write-Host $result
    Write-Host ""
    Write-Host "🚀 Reconnecte-toi pour voir les onglets admin!" -ForegroundColor Green
} else {
    Write-Host "❌ Utilisateur non trouvé: $Email" -ForegroundColor Red
    Write-Host ""
    Write-Host "📋 Utilisateurs disponibles:" -ForegroundColor Yellow
    sqlite3 $dbPath "SELECT id, name, email FROM users;"
}