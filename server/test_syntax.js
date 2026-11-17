const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

let checked = 0;
let errors = 0;

function checkDir(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    if (entry.name === 'node_modules' || entry.name === 'backups') continue;
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      checkDir(fullPath);
    } else if (entry.name.endsWith('.js')) {
      try {
        execSync(`node -c "${fullPath}"`);
        checked++;
        console.log(`[SYNTAX OK] ${entry.name}`);
      } catch (err) {
        errors++;
        console.error(`[SYNTAX ERROR] ${fullPath}:`, err.message);
      }
    }
  }
}

console.log('--- Verifying Backend Syntax ---');
checkDir(path.join(__dirname));
console.log(`\nSyntax verification complete: ${checked} files checked, ${errors} errors.`);
process.exit(errors === 0 ? 0 : 1);
