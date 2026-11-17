const Database = require('better-sqlite3');
const path = require('path');
const db = new Database(path.join(__dirname, 'backups', 'fd_crm_migration_test.sqlite'));
console.log('approval_requests columns:', db.prepare("PRAGMA table_info('approval_requests')").all().map(c => c.name));
