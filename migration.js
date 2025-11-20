const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('./data.db');

console.log('🔧 Migration SQLite-safe pour QR codes...\n');

db.serialize(() => {
  
  // Vérifier si la colonne receiptCode existe
  db.all("PRAGMA table_info(purchases)", (err, columns) => {
    if (err) {
      console.error('❌ Erreur:', err.message);
      db.close();
      return;
    }
    
    const hasReceiptCode = columns.some(col => col.name === 'receiptCode');
    const hasQRCodeData = columns.some(col => col.name === 'qrCodeData');
    
    console.log(`📊 État actuel de la table purchases:`);
    console.log(`   receiptCode: ${hasReceiptCode ? '✅ Existe' : '❌ Manquante'}`);
    console.log(`   qrCodeData: ${hasQRCodeData ? '✅ Existe' : '❌ Manquante'}`);
    console.log('');
    
    // Ajouter receiptCode si manquante
    if (!hasReceiptCode) {
      console.log('➕ Ajout colonne receiptCode...');
      db.run('ALTER TABLE purchases ADD COLUMN receiptCode TEXT', (err) => {
        if (err) {
          console.error('❌ Erreur receiptCode:', err.message);
        } else {
          console.log('✅ Colonne receiptCode ajoutée');
        }
      });
    } else {
      console.log('⏭️  receiptCode existe déjà');
    }
    
    // Ajouter qrCodeData si manquante
    if (!hasQRCodeData) {
      console.log('➕ Ajout colonne qrCodeData...');
      db.run('ALTER TABLE purchases ADD COLUMN qrCodeData TEXT', (err) => {
        if (err) {
          console.error('❌ Erreur qrCodeData:', err.message);
        } else {
          console.log('✅ Colonne qrCodeData ajoutée');
        }
      });
    } else {
      console.log('⏭️  qrCodeData existe déjà');
    }
    
    // Créer l'index UNIQUE sur receiptCode
    setTimeout(() => {
      console.log('\n📌 Création index UNIQUE...');
      db.run('CREATE UNIQUE INDEX IF NOT EXISTS idx_purchases_receiptCode ON purchases(receiptCode)', (err) => {
        if (err) {
          console.error('❌ Erreur index:', err.message);
        } else {
          console.log('✅ Index créé sur receiptCode');
        }
        
        console.log('\n' + '═'.repeat(50));
        console.log('🎉 MIGRATION QR CODES TERMINÉE!');
        console.log('═'.repeat(50));
        console.log('\n✅ Colonnes purchases:');
        console.log('   - receiptCode TEXT');
        console.log('   - qrCodeData TEXT');
        console.log('   - index UNIQUE sur receiptCode\n');
        
        db.close();
      });
    }, 500);
  });
});