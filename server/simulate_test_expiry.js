const path = require('path');
const Database = require(path.join(__dirname, '../node_modules/better-sqlite3'));
const db = new Database(path.join(__dirname, 'backups/fd_crm_migration_test.sqlite'));

const code = process.argv[2] || 'CUST-1033';
const pastTime = new Date(Date.now() - 60 * 60 * 1000).toISOString();

db.prepare("UPDATE customers SET expires_at = ?, app_access_status = 'EXPIRED', app_access_enabled = 0 WHERE customer_code = ?").run(pastTime, code);
console.log(`✅ Simulated 48-hour expiry for ${code}. Set expires_at to: ${pastTime}`);
