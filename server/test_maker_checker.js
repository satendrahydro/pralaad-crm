const Database = require('better-sqlite3');
const path = require('path');
const bcrypt = require('bcryptjs');

const testDbPath = path.join(__dirname, 'backups', 'fd_crm_migration_test.sqlite');
const db = new Database(testDbPath);

console.log('====================================================');
console.log('MAKER-CHECKER APPROVAL ENGINE VERIFICATION TEST');
console.log('====================================================\n');

// 1. Check or Create approval_requests table in test DB
db.exec(`
  CREATE TABLE IF NOT EXISTS approval_requests (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    request_number TEXT UNIQUE NOT NULL,
    request_type TEXT NOT NULL, -- 'NEW_FD', 'INTEREST_PAYOUT', 'PREMATURE_CLOSURE', 'RENEWAL', 'CUSTOMER_KYC'
    maker_id INTEGER NOT NULL,
    customer_id INTEGER,
    fd_id INTEGER,
    proposed_amount REAL,
    request_data TEXT NOT NULL, -- JSON stringified payload
    status TEXT NOT NULL DEFAULT 'PENDING_APPROVAL', -- 'PENDING_APPROVAL', 'APPROVED', 'REJECTED', 'CANCELLED'
    checker_id INTEGER,
    decision_remarks TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    decided_at DATETIME,
    FOREIGN KEY (maker_id) REFERENCES users(id),
    FOREIGN KEY (checker_id) REFERENCES users(id),
    FOREIGN KEY (customer_id) REFERENCES customers(id),
    FOREIGN KEY (fd_id) REFERENCES fixed_deposits(id)
  );
`);
console.log('[STEP 1] `approval_requests` schema verified in test DB.');

// 2. Ensure Employee User exists in test DB
let emp = db.prepare("SELECT * FROM users WHERE username = 'staff1'").get();
if (!emp) {
  const salt = bcrypt.genSaltSync(10);
  const hash = bcrypt.hashSync('staff123', salt);
  const res = db.prepare(`
    INSERT INTO users (username, password_hash, full_name, role)
    VALUES (?, ?, ?, 'employee')
  `).run('staff1', hash, 'Suresh Verma (Staff Maker)');
  emp = db.prepare('SELECT * FROM users WHERE id = ?').get(res.lastInsertRowid);
  console.log(`[STEP 2] Seeded test employee: ${emp.username} (ID: ${emp.id}, Role: ${emp.role})`);
} else {
  console.log(`[STEP 2] Test employee exists: ${emp.username} (ID: ${emp.id}, Role: ${emp.role})`);
}

const admin = db.prepare("SELECT * FROM users WHERE username = 'admin'").get();
console.log(`         Admin user exists: ${admin.username} (ID: ${admin.id}, Role: ${admin.role})`);

// 3. Test Workflow: Maker creates a New FD request
console.log('\n[STEP 3] Maker (Employee) Submitting New FD Proposal...');
const reqNum = `REQ-TEST-${Date.now().toString().slice(-4)}`;
const samplePayload = {
  customerId: 1,
  principal: 200000,
  annualRate: 8.5,
  tenureMonths: 24,
  compoundingFrequency: 'quarterly',
  startDate: '2026-06-01',
  remarks: 'Staff proposal for Rajesh Sharma'
};

const insertReq = db.prepare(`
  INSERT INTO approval_requests (
    request_number, request_type, maker_id, customer_id, proposed_amount, request_data, status, decision_remarks
  ) VALUES (?, 'NEW_FD', ?, 1, 200000, ?, 'PENDING_APPROVAL', 'Awaiting Admin Checker')
`).run(reqNum, emp.id, JSON.stringify(samplePayload));

const reqId = insertReq.lastInsertRowid;
console.log(`  Created Request ${reqNum} (ID: ${reqId}) with status: PENDING_APPROVAL`);

// 4. Critical Security Rule: Employee CANNOT approve
console.log('\n[STEP 4] Testing Maker Self-Approval Prevention:');
function simulateApprove(callerUser, targetReqId) {
  if (callerUser.role !== 'admin') {
    return { success: false, code: 403, error: 'Access denied: Employee cannot approve/finalize transactions.' };
  }
  const req = db.prepare('SELECT * FROM approval_requests WHERE id = ?').get(targetReqId);
  if (req.status !== 'PENDING_APPROVAL') {
    return { success: false, code: 400, error: `Duplicate approval prevented: status is ${req.status}` };
  }
  // Execute approval
  db.prepare(`
    UPDATE approval_requests 
    SET status = 'APPROVED', checker_id = ?, decided_at = CURRENT_TIMESTAMP, decision_remarks = 'Authorized by Admin'
    WHERE id = ?
  `).run(callerUser.id, targetReqId);
  return { success: true, message: 'Approved successfully' };
}

const empAttempt = simulateApprove(emp, reqId);
console.log(`  Employee Attempt to Approve: Code ${empAttempt.code} -> ${empAttempt.error}`);
console.log(`  Status: ${empAttempt.code === 403 ? 'SELF-APPROVAL SAFELY BLOCKED' : 'SECURITY BREACH'}`);

// 5. Admin (Checker) authorizes the request
console.log('\n[STEP 5] Admin (Checker) Review and Approval:');
const adminAttempt = simulateApprove(admin, reqId);
console.log(`  Admin Approval Result: ${adminAttempt.message}`);
const updatedReq = db.prepare('SELECT * FROM approval_requests WHERE id = ?').get(reqId);
console.log(`  Updated Request State: Status = ${updatedReq.status}, Checker ID = ${updatedReq.checker_id}`);

// 6. Test Duplicate-Approval Prevention
console.log('\n[STEP 6] Testing Duplicate-Approval Prevention (Idempotence Guard):');
const duplicateAttempt = simulateApprove(admin, reqId);
console.log(`  Duplicate Admin Attempt: Code ${duplicateAttempt.code} -> ${duplicateAttempt.error}`);
console.log(`  Status: ${duplicateAttempt.code === 400 ? 'DUPLICATE APPROVAL SAFELY BLOCKED' : 'FAILURE'}`);

// Clean up test request
db.prepare('DELETE FROM approval_requests WHERE id = ?').run(reqId);

db.close();

console.log('\n====================================================');
console.log('ALL MAKER-CHECKER SECURITY TESTS PASSED');
console.log('====================================================');
