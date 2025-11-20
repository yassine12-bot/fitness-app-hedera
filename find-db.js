// Trouver tous les fichiers .db dans le projet
const fs = require('fs');
const path = require('path');

function findFiles(dir, pattern, results = []) {
  try {
    const files = fs.readdirSync(dir);
    
    for (const file of files) {
      const filePath = path.join(dir, file);
      
      try {
        const stat = fs.statSync(filePath);
        
        // Ignorer node_modules
        if (stat.isDirectory() && file !== 'node_modules' && file !== '.git') {
          findFiles(filePath, pattern, results);
        } else if (stat.isFile() && file.match(pattern)) {
          results.push(filePath);
        }
      } catch (err) {
        // Ignorer les erreurs d'accès
      }
    }
  } catch (err) {
    // Ignorer les erreurs d'accès
  }
  
  return results;
}

console.log('🔍 Recherche de fichiers .db...\n');

const dbFiles = findFiles(__dirname, /\.db$/);

if (dbFiles.length === 0) {
  console.log('❌ Aucun fichier .db trouvé\n');
  process.exit(1);
}

console.log('✅ Fichiers .db trouvés:\n');
dbFiles.forEach((file, index) => {
  const size = fs.statSync(file).size;
  const sizeKB = (size / 1024).toFixed(2);
  console.log(`${index + 1}. ${file}`);
  console.log(`   Taille: ${sizeKB} KB\n`);
});

console.log('💡 Utilise ce chemin dans make-admin.js:\n');
console.log(`const dbPath = '${dbFiles[0]}';\n`);