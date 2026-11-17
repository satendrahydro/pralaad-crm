const path = require('path');
const dbPath = path.join(__dirname, 'backups/fd_crm_migration_test.sqlite');
const Database = require(path.join(__dirname, '../node_modules/better-sqlite3'));
const db = new Database(dbPath);

console.log('Connecting to dev test DB:', dbPath);

try { db.exec('ALTER TABLE users ADD COLUMN phone TEXT'); console.log('Added phone to users'); } catch(e){}
try { db.exec('ALTER TABLE users ADD COLUMN is_active INTEGER DEFAULT 1'); console.log('Added is_active to users'); } catch(e){}
try { db.exec('ALTER TABLE users ADD COLUMN failed_attempts INTEGER DEFAULT 0'); console.log('Added failed_attempts to users'); } catch(e){}

db.exec(`
  CREATE TABLE IF NOT EXISTS password_reset_otps (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    identifier TEXT NOT NULL,
    account_type TEXT NOT NULL,
    otp_code TEXT NOT NULL,
    attempts INTEGER DEFAULT 0,
    is_verified INTEGER DEFAULT 0,
    reset_token TEXT,
    expires_at DATETIME NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );
`);
console.log('password_reset_otps table ready');

db.prepare('UPDATE users SET phone = ? WHERE username = ?').run('9876543210', 'staff1');
db.prepare('UPDATE users SET phone = ? WHERE username = ?').run('9811199999', 'admin');
console.log('Users initialized with test phone numbers');
