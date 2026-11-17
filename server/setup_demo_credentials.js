const path = require('path');
const Database = require('../node_modules/better-sqlite3');
const bcrypt = require('../node_modules/bcryptjs');

const DB_PATH = path.join(__dirname, 'backups/fd_crm_migration_test.sqlite');
const db = new Database(DB_PATH);

console.log('================================================================');
console.log('🔐 CONFIGURING DEDICATED DEMO CREDENTIALS IN ISOLATED TEST DB');
console.log(`📂 DB: ${DB_PATH}`);
console.log('================================================================\n');

// 1. Super Admin: admin -> Admin@Demo#2026!
const adminHash = bcrypt.hashSync('Admin@Demo#2026!', 10);
db.prepare(`
  UPDATE users 
  SET password_hash = ?, failed_attempts = 0, is_active = 1, full_name = 'Rajeev Mehra (Super Admin & MD)'
  WHERE username = 'admin'
`).run(adminHash);
console.log('✅ Super Admin account updated: username = admin');

// 2. Staff Maker: staff1 -> Staff@Demo#2026!
const staffHash = bcrypt.hashSync('Staff@Demo#2026!', 10);
db.prepare(`
  UPDATE users 
  SET password_hash = ?, failed_attempts = 0, is_active = 1, full_name = 'Suresh Verma (Branch Staff / Maker)'
  WHERE username = 'staff1'
`).run(staffHash);
console.log('✅ Staff Maker account updated: username = staff1');

// 3. Customer 1 (Permanent): CUST-1001 (Rajesh Sharma) -> Client@Demo#2026!
const clientHash = bcrypt.hashSync('Client@Demo#2026!', 10);
db.prepare(`
  UPDATE customers 
  SET password_hash = ?, login_password = 'Client@Demo#2026!',
      app_access_status = 'ACTIVE', app_access_enabled = 1, access_type = 'PERMANENT',
      expires_at = null, must_change_password = 0
  WHERE customer_code = 'CUST-1001'
`).run(clientHash);
console.log('✅ Customer Permanent account updated: identifier = CUST-1001 (Rajesh Sharma)');

// 4. Customer 2 (Temporary 48-Hour): CUST-1042 (Siddharth Sengupta) -> Temp@Demo#2026!
const tempHash = bcrypt.hashSync('Temp@Demo#2026!', 10);
const future48h = new Date(Date.now() + 48 * 3600 * 1000).toISOString();
db.prepare(`
  UPDATE customers 
  SET password_hash = ?, login_password = 'Temp@Demo#2026!', login_id = 'CUST-1042',
      app_access_status = 'ACTIVE', app_access_enabled = 1, access_type = 'TEMPORARY',
      first_login_at = datetime('now'), expires_at = ?, must_change_password = 0
  WHERE customer_code = 'CUST-1042'
`).run(tempHash, future48h);
console.log('✅ Customer Temporary 48H account updated: identifier = CUST-1042 (Siddharth Sengupta)');

// 5. Customer 3 (Senior Citizen Multi-Product): CUST-1043 (Meenakshi Sundaram) -> Senior@Demo#2026!
const seniorHash = bcrypt.hashSync('Senior@Demo#2026!', 10);
db.prepare(`
  UPDATE customers 
  SET password_hash = ?, login_password = 'Senior@Demo#2026!', login_id = 'CUST-1043',
      app_access_status = 'ACTIVE', app_access_enabled = 1, access_type = 'PERMANENT',
      expires_at = null, must_change_password = 0
  WHERE customer_code = 'CUST-1043'
`).run(seniorHash);
console.log('✅ Customer Multi-Product Senior Citizen account updated: identifier = CUST-1043 (Meenakshi Sundaram Sr.)');

console.log('\n🎉 ALL DEMO ACCOUNTS CONFIGURED SUCCESSFULLY IN TEST DB.');
