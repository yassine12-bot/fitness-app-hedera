# Quick Fix Script for Frontend Issues
# Fixes: Admin access, Topics table, Challenges

Write-Host "🔧 Fixing frontend issues..." -ForegroundColor Yellow
Write-Host ""

# 1. Make user admin
Write-Host "1️⃣ Making labrim99@gmail.com admin..." -ForegroundColor Cyan
node -e "const db = require('./src/lib/db'); db.initialize().then(() => db.run('UPDATE users SET isAdmin = 1 WHERE email = ?', ['labrim99@gmail.com'])).then(() => console.log('✅ User is now admin!'))"

# 2. Check if topics table exists
Write-Host ""
Write-Host "2️⃣ Checking database tables..." -ForegroundColor Cyan
node -e "const db = require('./src/lib/db'); db.initialize().then(() => db.all(`SELECT name FROM sqlite_master WHERE type='table' ORDER BY name`)).then(tables => { console.log('Tables:'); tables.forEach(t => console.log('  -', t.name)); })"

# 3. Verify admin status
Write-Host ""
Write-Host "3️⃣ Verifying admin status..." -ForegroundColor Cyan
node -e "const db = require('./src/lib/db'); db.initialize().then(() => db.get('SELECT id, name, email, isAdmin FROM users WHERE email = ?', ['labrim99@gmail.com'])).then(u => console.log(JSON.stringify(u, null, 2)))"

Write-Host ""
Write-Host "✅ Done! Please restart both servers:" -ForegroundColor Green
Write-Host "   Backend: npm start" -ForegroundColor Cyan
Write-Host "   Frontend: cd hedera-fit-frontend && npm start" -ForegroundColor Cyan
