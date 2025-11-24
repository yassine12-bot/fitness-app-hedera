// Quick patch for StepSimulator.jsx line 43
// Run this in hedera-fit-frontend directory:
// node ../fix-step-simulator.js

const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'hedera-fit-frontend', 'src', 'components', 'StepSimulator.jsx');

console.log('🔧 Fixing StepSimulator.jsx...');

let content = fs.readFileSync(filePath, 'utf8');

// Find and replace the problematic line
const oldCode = `        const challengesArray = data.data.challenges || data.data || [];`;

const newCode = `        // ✅ FIX: Ensure challengesArray is always an array
        let challengesArray = [];
        if (data.data) {
          if (Array.isArray(data.data)) {
            challengesArray = data.data;
          } else if (data.data.challenges && Array.isArray(data.data.challenges)) {
            challengesArray = data.data.challenges;
          }
        }`;

if (content.includes(oldCode)) {
    content = content.replace(oldCode, newCode);
    fs.writeFileSync(filePath, content, 'utf8');
    console.log('✅ Fixed! Challenges filter error should be resolved.');
} else {
    console.log('⚠️  Could not find the exact line to replace.');
    console.log('   Please manually update line 43 in StepSimulator.jsx');
}
