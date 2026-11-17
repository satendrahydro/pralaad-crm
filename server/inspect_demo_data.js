const path = require('path');
const Database = require(path.join(__dirname, '../node_modules/better-sqlite3'));
const db = new Database(path.join(__dirname, 'backups/fd_crm_migration_test.sqlite'));

console.log('CUSTOMERS SCHEMA:', db.prepare('PRAGMA table_info(customers)').all());
const sample = db.prepare('SELECT * FROM customers LIMIT 2').all();
console.log('CUSTOMERS SAMPLE:', sample);
