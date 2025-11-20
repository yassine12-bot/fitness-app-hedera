// Script pour lister toutes les tables de la base de données
require('dotenv').config();
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

// Chercher tous les fichiers .db
const possiblePaths = [
  path.join(__dirname, 'data.db'),
  path.join(__dirname, 'database.db'),
  path.join(__dirname, 'hedera-fit.db'),
  path.join(__dirname, 'src', 'database.db'),
  path.join(__dirname, 'data', 'database.db')
];

console.log('🔍 Recherche de la base de données...\n');

// Trouver quel fichier existe
let dbPath = null;
for (const p of possiblePaths) {
  if (fs.existsSync(p)) {
    dbPath = p;
    console.log(`✅ Base de données trouvée: ${p}\n`);
    break;
  }
}

if (!dbPath) {
  console.log('❌ Aucune base de données trouvée dans:');
  possiblePaths.forEach(p => console.log(`   - ${p}`));
  console.log('\n💡 Cherche manuellement les fichiers .db:');
  console.log('   Get-ChildItem -Recurse -Filter *.db | Select-Object FullName');
  process.exit(1);
}

const db = new sqlite3.Database(dbPath);

// Lister toutes les tables
db.all("SELECT name FROM sqlite_master WHERE type='table'", [], (err, tables) => {
  if (err) {
    console.error('❌ Erreur:', err);
    db.close();
    process.exit(1);
  }
  
  console.log('📋 Tables disponibles:\n');
  tables.forEach(table => {
    console.log(`   - ${table.name}`);
  });
  
  console.log('\n');
  
  // Pour chaque table, montrer quelques infos
  let completed = 0;
  tables.forEach(table => {
    db.all(`PRAGMA table_info(${table.name})`, [], (err, columns) => {
      console.log(`\n📊 Structure de la table "${table.name}":`);
      if (err) {
        console.log(`   Erreur: ${err.message}`);
      } else {
        columns.forEach(col => {
          console.log(`   - ${col.name} (${col.type})${col.pk ? ' [PRIMARY KEY]' : ''}`);
        });
        
        // Compter les lignes
        db.get(`SELECT COUNT(*) as count FROM ${table.name}`, [], (err, row) => {
          if (!err) {
            console.log(`   → ${row.count} ligne(s)`);
          }
        });
      }
      
      completed++;
      if (completed === tables.length) {
        console.log('\n');
        db.close();
      }
    });
  });
});