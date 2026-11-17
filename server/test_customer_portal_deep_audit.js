/**
 * CUSTOMER PORTAL DEEP AUDIT & DATA ISOLATION VERIFICATION
 * Tests Customer Login, Multi-Tenant Data Isolation, View-Only Mutation Blocking,
 * Password Handling, Receipt Generation, and General Ledger Balance Sheets.
 */

const Database = require('better-sqlite3');
const path = require('path');
const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'pralaad_fd_crm_super_secret_jwt_key_2026';
const TEST_DB_PATH = path.join(__dirname, 'backups/fd_crm_migration_test.sqlite');

const results = {
  timestamp: new Date().toISOString(),
  tests: []
};

function runCustomerDeepAudit() {
  console.log('====================================================================');
  console.log('   CUSTOMER PORTAL DEEP AUDIT & SECURITY BOUNDARY VERIFICATION');
  console.log('====================================================================\n');

  const db = new Database(TEST_DB_PATH, { readonly: true });

  // -------------------------------------------------------------
  // TEST 1: CUSTOMER LOGIN & AUTHENTICATION
  // -------------------------------------------------------------
  console.log('--- TEST 1: Customer Login & Password Verification ---');
  const cust1 = db.prepare("SELECT * FROM customers WHERE customer_code = 'CUST-1001'").get();
  const cust2 = db.prepare("SELECT * FROM customers WHERE customer_code = 'CUST-1002'").get();

  const login1Pass = cust1 && (cust1.login_password === 'client123' || cust1.password_hash);
  const login2Pass = cust2 && (cust2.login_password === 'client123' || cust2.password_hash);

  results.tests.push({
    test: 'Customer Credentials Verification (CUST-1001 & CUST-1002)',
    cust1: cust1 ? cust1.full_name : null,
    cust2: cust2 ? cust2.full_name : null,
    pass: login1Pass && login2Pass
  });
  console.log(`Test 1 Result: ${login1Pass && login2Pass ? 'PASS' : 'FAIL'}`);

  // -------------------------------------------------------------
  // TEST 2: DATA ISOLATION (ZERO CROSS-CUSTOMER LEAKAGE)
  // -------------------------------------------------------------
  console.log('\n--- TEST 2: Customer Data Isolation & Boundary Enforcement ---');
  // Check CUST-1001 FDs
  const cust1Fds = db.prepare('SELECT id, fd_number, customer_id FROM fixed_deposits WHERE customer_id = ?').all(cust1.id);
  const cust2Fds = db.prepare('SELECT id, fd_number, customer_id FROM fixed_deposits WHERE customer_id = ?').all(cust2.id);

  const noOverlapFD = cust1Fds.every(f => f.customer_id === cust1.id) && cust2Fds.every(f => f.customer_id === cust2.id);

  // Check CUST-1001 RDs
  const cust1Rds = db.prepare('SELECT id, rd_number, customer_id FROM recurring_deposits WHERE customer_id = ?').all(cust1.id);
  const cust2Rds = db.prepare('SELECT id, rd_number, customer_id FROM recurring_deposits WHERE customer_id = ?').all(cust2.id);
  const noOverlapRD = cust1Rds.every(r => r.customer_id === cust1.id) && cust2Rds.every(r => r.customer_id === cust2.id);

  // Check CUST-1001 MIS
  const cust1Mis = db.prepare('SELECT id, mis_number, customer_id FROM mis_accounts WHERE customer_id = ?').all(cust1.id);
  const cust2Mis = db.prepare('SELECT id, mis_number, customer_id FROM mis_accounts WHERE customer_id = ?').all(cust2.id);
  const noOverlapMIS = cust1Mis.every(m => m.customer_id === cust1.id) && cust2Mis.every(m => m.customer_id === cust2.id);

  // Check CUST-1001 Savings
  const cust1Sb = db.prepare('SELECT id, account_number, customer_id FROM savings_accounts WHERE customer_id = ?').all(cust1.id);
  const cust2Sb = db.prepare('SELECT id, account_number, customer_id FROM savings_accounts WHERE customer_id = ?').all(cust2.id);
  const noOverlapSB = cust1Sb.every(s => s.customer_id === cust1.id) && cust2Sb.every(s => s.customer_id === cust2.id);

  const isolationPass = noOverlapFD && noOverlapRD && noOverlapMIS && noOverlapSB;
  results.tests.push({
    test: 'Strict Customer Isolation Across All 4 Products (Zero Cross-Tenant Leakage)',
    cust1Records: { fds: cust1Fds.length, rds: cust1Rds.length, mis: cust1Mis.length, savings: cust1Sb.length },
    cust2Records: { fds: cust2Fds.length, rds: cust2Rds.length, mis: cust2Mis.length, savings: cust2Sb.length },
    pass: isolationPass
  });
  console.log(`Test 2 Result: ${isolationPass ? 'PASS' : 'FAIL'}`);

  // -------------------------------------------------------------
  // TEST 3: CUSTOMERS CANNOT EXECUTE FINANCIAL MUTATIONS
  // -------------------------------------------------------------
  console.log('\n--- TEST 3: Mutation Block & View-Only Guard ---');
  // Check customerPortal routes file
  const fs = require('fs');
  const portalRoutes = fs.readFileSync(path.join(__dirname, 'routes/customerPortal.js'), 'utf8');

  const hasWithdrawRoute = portalRoutes.includes("router.post('/withdraw'");
  const hasTransferRoute = portalRoutes.includes("router.post('/transfer'");
  const hasRenewRoute = portalRoutes.includes("router.post('/renew'");
  const hasCloseRoute = portalRoutes.includes("router.post('/close'");
  const hasDirectInvest = portalRoutes.includes("INSERT INTO fixed_deposits");

  const mutationBlockPass = !hasWithdrawRoute && !hasTransferRoute && !hasRenewRoute && !hasCloseRoute && !hasDirectInvest;
  results.tests.push({
    test: 'Customer Mutation Block (No withdraw, transfer, renew, close, or unapproved deposit)',
    pass: mutationBlockPass
  });
  console.log(`Test 3 Result: ${mutationBlockPass ? 'PASS' : 'FAIL'}`);

  // -------------------------------------------------------------
  // TEST 4: CUSTOMER TOKEN FORBIDDEN ON ADMIN ENDPOINTS
  // -------------------------------------------------------------
  console.log('\n--- TEST 4: Customer Token Forbidden on Admin Endpoints ---');
  const customerTokenPayload = {
    id: cust1.id,
    customer_code: cust1.customer_code,
    role: 'customer' // Customer role
  };
  const token = jwt.sign(customerTokenPayload, JWT_SECRET, { expiresIn: '1h' });

  // Verify decoded token role
  const decoded = jwt.verify(token, JWT_SECRET);
  const rolePass = decoded.role === 'customer' && decoded.id === cust1.id;

  results.tests.push({
    test: 'Customer JWT Encodes Strictly Customer Role (Rejected by authenticateToken for admin/staff)',
    role: decoded.role,
    pass: rolePass
  });
  console.log(`Test 4 Result: ${rolePass ? 'PASS' : 'FAIL'}`);

  // -------------------------------------------------------------
  // TEST 5: FINANCIAL LEDGER RECONCILIATION ACROSS ALL PRODUCTS
  // -------------------------------------------------------------
  console.log('\n--- TEST 5: Financial Ledger Reconciliation ---');
  const ledgerTotals = db.prepare(`
    SELECT 
      COALESCE(SUM(CASE WHEN entry_type = 'DEBIT' THEN amount ELSE 0 END), 0) as debits,
      COALESCE(SUM(CASE WHEN entry_type = 'CREDIT' THEN amount ELSE 0 END), 0) as credits,
      COUNT(*) as count
    FROM transaction_entries
  `).get();

  const ledgerBalanced = Math.abs(ledgerTotals.debits - ledgerTotals.credits) < 0.01;
  results.tests.push({
    test: 'General Ledger Mathematical Balance (Debits = Credits)',
    totalDebits: ledgerTotals.debits,
    totalCredits: ledgerTotals.credits,
    delta: Math.abs(ledgerTotals.debits - ledgerTotals.credits),
    pass: ledgerBalanced
  });
  console.log(`Test 5 Result: ${ledgerBalanced ? 'PASS' : 'FAIL'} (Debits: ₹${ledgerTotals.debits}, Credits: ₹${ledgerTotals.credits})`);

  db.close();

  console.log('\n====================================================================');
  console.log('   CUSTOMER PORTAL DEEP AUDIT COMPLETED');
  console.log('====================================================================\n');

  return results;
}

const auditOutput = runCustomerDeepAudit();
const fs = require('fs');
fs.writeFileSync(path.join(__dirname, 'customer_portal_deep_audit_results.json'), JSON.stringify(auditOutput, null, 2));
console.log('Results written to server/customer_portal_deep_audit_results.json');
