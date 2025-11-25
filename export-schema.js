require('dotenv').config();
const db = require('./src/lib/db');
const fs = require('fs');

async function exportSchema() {
  await db.initialize();
  
  const output = [];
  
  output.push('='.repeat(80));
  output.push('DATABASE ARCHITECTURE');
  output.push('='.repeat(80));
  output.push('');
  
  // Get all tables
  const tables = await db.all("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name");
  
  for (const table of tables) {
    output.push(`TABLE: ${table.name}`);
    output.push('-'.repeat(80));
    
    // Get columns
    const columns = await db.all(`PRAGMA table_info(${table.name})`);
    columns.forEach(col => {
      const pk = col.pk ? ' PRIMARY KEY' : '';
      const notNull = col.notnull ? ' NOT NULL' : '';
      const dflt = col.dflt_value ? ` DEFAULT ${col.dflt_value}` : '';
      output.push(`  ${col.name}: ${col.type}${pk}${notNull}${dflt}`);
    });
    
    // Sample data
    const sample = await db.all(`SELECT * FROM ${table.name} LIMIT 3`);
    if (sample.length > 0) {
      output.push('  Sample data:');
      sample.forEach((row, i) => {
        output.push(`    Row ${i + 1}: ${JSON.stringify(row)}`);
      });
    }
    
    output.push('');
  }
  
  const content = output.join('\n');
  fs.writeFileSync('DATABASE-SCHEMA.txt', content);
  console.log('✅ Schema exported to DATABASE-SCHEMA.txt');
}

exportSchema().catch(console.error);