// Script pour ajouter des FIT tokens à un utilisateur
require('dotenv').config();
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, 'data.db');
const userId = process.argv[2];
const amount = parseInt(process.argv[3]) || 1000;

if (!userId) {
  console.log('❌ Usage: node add-tokens.js <userId> [amount]');
  console.log('Exemple: node add-tokens.js 41 1000');
  process.exit(1);
}

const db = new sqlite3.Database(dbPath);

// Récupérer balance actuelle
db.get('SELECT fitBalance, email FROM users WHERE id = ?', [userId], (err, row) => {
  if (err) {
    console.error('❌ Erreur:', err);
    db.close();
    process.exit(1);
  }
  
  if (!row) {
    console.log(`⚠️  Aucun utilisateur trouvé avec ID: ${userId}`);
    db.close();
    process.exit(1);
  }
  
  const oldBalance = row.fitBalance || 0;
  const newBalance = oldBalance + amount;
  
  console.log(`\n💰 Ajout de ${amount} FIT tokens`);
  console.log(`   User: ${row.email}`);
  console.log(`   Balance actuelle: ${oldBalance} FIT`);
  console.log(`   Nouvelle balance: ${newBalance} FIT\n`);
  
  // Mettre à jour
  db.run('UPDATE users SET fitBalance = ? WHERE id = ?', [newBalance, userId], function(err) {
    if (err) {
      console.error('❌ Erreur mise à jour:', err);
      db.close();
      process.exit(1);
    }
    
    console.log('✅ Tokens ajoutés avec succès!');
    db.close();
  });
});

