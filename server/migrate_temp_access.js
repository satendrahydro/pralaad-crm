const path = require('path');
const Database = require(path.join(__dirname, '../node_modules/better-sqlite3'));

const dbFile = path.join(__dirname, 'backups/fd_crm_migration_test.sqlite');
const db = new Database(dbFile);

console.log('Migrating isolated test database:', dbFile);

try { db.exec("ALTER TABLE customers ADD COLUMN access_type TEXT DEFAULT 'PERMANENT';"); } catch(e){}
try { db.exec("ALTER TABLE customers ADD COLUMN first_login_at TEXT;"); } catch(e){}
try { db.exec("ALTER TABLE customers ADD COLUMN expires_at TEXT;"); } catch(e){}
try { db.exec("ALTER TABLE customers ADD COLUMN temp_access_hours INTEGER DEFAULT 48;"); } catch(e){}

const cols = db.prepare('PRAGMA table_info(customers)').all().map(c => c.name);
console.log('Customers table columns:', cols);
console.log('Has access_type:', cols.includes('access_type'));
console.log('Has first_login_at:', cols.includes('first_login_at'));
console.log('Has expires_at:', cols.includes('expires_at'));
console.log('Has temp_access_hours:', cols.includes('temp_access_hours'));
