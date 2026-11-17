const path = require('path');
const Database = require(path.join(__dirname, '../node_modules/better-sqlite3'));
const bcrypt = require(path.join(__dirname, '../node_modules/bcryptjs'));
const db = new Database(path.join(__dirname, 'backups/fd_crm_migration_test.sqlite'));

const hash = bcrypt.hashSync('staff123', 10);
db.prepare("UPDATE users SET password_hash = ? WHERE username = 'employee'").run(hash);
console.log('Updated employee password to staff123');
