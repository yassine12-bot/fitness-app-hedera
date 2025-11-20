// Script pour rendre un utilisateur admin
require('dotenv').config();
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, 'data.db');
const userId = process.argv[2];

if (!userId) {
  console.log('❌ Usage: node make-admin.js <userId>');
  console.log('Exemple: node make-admin.js 41');
  process.exit(1);
}

const db = new sqlite3.Database(dbPath);

db.run('UPDATE users SET isAdmin = 1 WHERE id = ?', [userId], function(err) {
  if (err) {
    console.error('❌ Erreur:', err);
    process.exit(1);
  }
  
  if (this.changes === 0) {
    console.log(`⚠️  Aucun utilisateur trouvé avec ID: ${userId}`);
  } else {
    console.log(`✅ User ${userId} est maintenant admin!`);
  }
  
  // Vérifier
  db.get('SELECT id, email, name, isAdmin FROM users WHERE id = ?', [userId], (err, row) => {
    if (row) {
      console.log('\nDétails:');
      console.log(`   ID: ${row.id}`);
      console.log(`   Email: ${row.email}`);
      console.log(`   Name: ${row.name}`);
      console.log(`   Admin: ${row.isAdmin === 1 ? 'Oui' : 'Non'}`);
    }
    db.close();
  });
});