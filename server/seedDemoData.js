const { execSync } = require('child_process');
const path = require('path');

function seedDemoIfEmpty(db) {
  try {
    const custCount = db.prepare('SELECT count(*) as count FROM customers').get();
    const misCount = db.prepare('SELECT count(*) as count FROM mis_accounts').get();
    
    if (custCount.count === 0 || misCount.count === 0) {
      console.log('Seeding rich 5-client multi-product dataset into database...');
      const scriptPath = path.join(__dirname, '../../scripts/populate_complete_5client_demo.py');
      execSync(`python "${scriptPath}"`, { stdio: 'inherit' });
      console.log('5-client dataset successfully seeded.');
    }
  } catch (err) {
    console.error('seedDemoIfEmpty error:', err.message);
  }
}

module.exports = { seedDemoIfEmpty };
