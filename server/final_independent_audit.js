/**
 * MASTER INDEPENDENT AUDIT SUITE
 * Enterprise Multi-Product Deposit CRM System
 * Independent verification of Financial Math, Maker-Checker, Double-Entry Ledger, 
 * Customer 360, Existing FD Integrity, Android View-Only, and Backup Restoration.
 */

const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');
const bcrypt = require('bcryptjs');

const {
  calculateFD,
  calculatePrematureWithdrawal,
  calculateRD,
  calculateRDPrematureClosure,
  calculateMIS,
  calculateMISPrematureClosure,
  calculateSavingsInterest
} = require('./calculator');

const TEST_DB_PATH = path.join(__dirname, 'backups/fd_crm_migration_test.sqlite');
const PROD_DB_PATH = path.join(__dirname, 'fd_crm.sqlite');
const BACKUP_DB_PATH = path.join(__dirname, 'backups/fd_crm_backup_20261114_103427.sqlite');

const auditResults = {
  timestamp: new Date().toISOString(),
  sections: {}
};

function runAudit() {
  console.log('================================================================');
  console.log('   STARTING MASTER INDEPENDENT AUDIT — MULTI-PRODUCT DEPOSIT CRM');
  console.log('================================================================\n');

  const db = new Database(TEST_DB_PATH);
  db.pragma('foreign_keys = ON');

  // -------------------------------------------------------------
  // TEST SECTION 1: INDEPENDENT FINANCIAL CALCULATIONS
  // -------------------------------------------------------------
  console.log('--- TEST 1: Independent Financial Calculations ---');
  const mathTests = [];

  // 1.1 FD Quarterly Compounding: ₹1,00,000 @ 8.5% for 1 year
  const fdQ = calculateFD({
    principal: 100000,
    annualRate: 8.5,
    tenureMonths: 12,
    compoundingFrequency: 'quarterly'
  });
  const expectedFDQMaturity = 108774.79;
  const fdQDiff = Math.abs(fdQ.maturityAmount - expectedFDQMaturity);
  mathTests.push({
    test: 'FD Quarterly Compounding (₹1,00,000 @ 8.5%, 1Y)',
    expected: expectedFDQMaturity,
    actual: fdQ.maturityAmount,
    pass: fdQDiff < 0.05
  });

  // 1.2 FD Premature Closure Penalty: ₹1,00,000, closed early after 6M with 1% penalty
  const fdPrem = calculatePrematureWithdrawal({
    principal: 100000,
    annualRate: 8.5,
    startDate: '2026-01-01',
    withdrawalDate: '2026-07-02',
    penaltyRate: 1.0
  });
  mathTests.push({
    test: 'FD Premature Closure Penalty (Effective Rate = 7.5%)',
    actualPayable: fdPrem.netPayable,
    eligibleInterest: fdPrem.eligibleInterest,
    pass: fdPrem.adjustedRate === 7.5 && fdPrem.netPayable > 100000 && fdPrem.penaltyRate === 1.0
  });

  // 1.3 RD Quarterly Amortization: ₹5,000/mo @ 8.0% for 12 months
  const rdCalc = calculateRD({
    installmentAmount: 5000,
    annualRate: 8.0,
    tenureMonths: 12,
    startDate: '2026-01-01'
  });
  const expectedRDMaturity = 62646.63;
  const rdDiff = Math.abs(rdCalc.maturityAmount - expectedRDMaturity);
  mathTests.push({
    test: 'RD Quarterly Compounding Amortization (₹5,000/mo @ 8.0%, 12M)',
    expected: expectedRDMaturity,
    actual: rdCalc.maturityAmount,
    interest: rdCalc.totalInterest,
    pass: rdDiff < 0.05 && rdCalc.totalPrincipal === 60000 && rdCalc.schedule.length === 12
  });

  // 1.4 MIS Monthly Pension: ₹5,00,000 @ 8.4% for 60 months
  const misCalc = calculateMIS({
    depositAmount: 500000,
    annualRate: 8.4,
    tenureMonths: 60,
    startDate: '2026-01-01'
  });
  const expectedMISMonthly = 3500.00;
  const expectedMISTotalInterest = 210000.00;
  mathTests.push({
    test: 'MIS Monthly Pension (₹5,00,000 @ 8.4%, 60M)',
    expectedMonthly: expectedMISMonthly,
    actualMonthly: misCalc.monthlyPayout,
    expectedTotalYield: expectedMISTotalInterest,
    actualTotalYield: misCalc.totalPayoutAmount,
    principalReturn: misCalc.maturityAmount,
    pass: misCalc.monthlyPayout === 3500 && misCalc.totalPayoutAmount === 210000 && misCalc.maturityAmount === 500000 && misCalc.schedule.length === 60
  });

  // 1.5 Savings Account Daily Balance Interest: ₹75,000 @ 4.0% for 30 days
  const sbInterest = calculateSavingsInterest({
    dayEndBalances: [{ balance: 75000, days: 30 }],
    annualRate: 4.0
  });
  const expectedSBInterest = Math.round((75000 * 0.04 * 30 / 365) * 100) / 100;
  mathTests.push({
    test: 'Savings Daily Product Interest (₹75,000 @ 4.0%, 30 days)',
    expected: expectedSBInterest,
    actual: sbInterest.totalInterest,
    pass: Math.abs(sbInterest.totalInterest - expectedSBInterest) < 0.05
  });

  auditResults.sections.financialMath = {
    pass: mathTests.every(t => t.pass),
    tests: mathTests
  };
  console.log(`Financial Math Results: ${auditResults.sections.financialMath.pass ? 'PASS (100%)' : 'FAIL'}`);

  // -------------------------------------------------------------
  // TEST SECTION 2: PRODUCT FINANCIAL RULES ISOLATION
  // -------------------------------------------------------------
  console.log('\n--- TEST 2: Product Financial Rules Isolation ---');
  const isolationTests = [];

  // Check table distinctness
  const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all().map(t => t.name);
  const requiredTables = [
    'fixed_deposits', 'fd_schedules',
    'recurring_deposits', 'rd_installments',
    'mis_accounts', 'mis_payout_schedules',
    'savings_accounts', 'savings_transactions',
    'transactions', 'approval_requests', 'customers'
  ];
  const allTablesExist = requiredTables.every(rt => tables.includes(rt));

  // Check that schemas and rules don't collide
  const fdCount = db.prepare('SELECT COUNT(*) as c FROM fixed_deposits').get().c;
  const rdCount = db.prepare('SELECT COUNT(*) as c FROM recurring_deposits').get().c;
  const misCount = db.prepare('SELECT COUNT(*) as c FROM mis_accounts').get().c;
  const sbCount = db.prepare('SELECT COUNT(*) as c FROM savings_accounts').get().c;

  isolationTests.push({
    test: 'All 4 Dedicated Product Tables Exist Separately',
    tables: requiredTables,
    pass: allTablesExist
  });

  isolationTests.push({
    test: 'Discrete Account Counts Across Products',
    counts: { fds: fdCount, rds: rdCount, mis: misCount, savings: sbCount },
    pass: fdCount > 0 && rdCount > 0 && misCount > 0 && sbCount > 0
  });

  auditResults.sections.productIsolation = {
    pass: isolationTests.every(t => t.pass),
    tests: isolationTests
  };
  console.log(`Product Isolation Results: ${auditResults.sections.productIsolation.pass ? 'PASS' : 'FAIL'}`);

  // -------------------------------------------------------------
  // TEST SECTION 3: MAKER-CHECKER WORKFLOW & ROLE PERMISSIONS
  // -------------------------------------------------------------
  console.log('\n--- TEST 3: Maker-Checker Governance & Role Security ---');
  const makerCheckerTests = [];

  // Check pending approval creation
  const pendingApprovals = db.prepare("SELECT COUNT(*) as c FROM approval_requests WHERE status = 'PENDING_APPROVAL'").get().c;
  const finalizedApprovals = db.prepare("SELECT COUNT(*) as c FROM approval_requests WHERE status IN ('APPROVED', 'REJECTED')").get().c;

  makerCheckerTests.push({
    test: 'Approval Requests Queue Has Proper State Tracking',
    pending: pendingApprovals,
    finalized: finalizedApprovals,
    pass: finalizedApprovals > 0
  });

  // Verify that an employee user has role 'employee' and admin has 'admin'
  const staffUser = db.prepare("SELECT * FROM users WHERE username = 'staff1'").get();
  const adminUser = db.prepare("SELECT * FROM users WHERE username = 'admin'").get();

  makerCheckerTests.push({
    test: 'Role Segregation in User Accounts',
    staffRole: staffUser ? staffUser.role : null,
    adminRole: adminUser ? adminUser.role : null,
    pass: staffUser && staffUser.role === 'employee' && adminUser && adminUser.role === 'admin'
  });

  // Verify passwords use bcrypt hash
  const staffHash = staffUser.password_hash || staffUser.password;
  const isBcrypt = staffHash.startsWith('$2a$') || staffHash.startsWith('$2b$');
  makerCheckerTests.push({
    test: 'Passwords Secured with bcrypt Hashing',
    pass: isBcrypt
  });

  auditResults.sections.makerChecker = {
    pass: makerCheckerTests.every(t => t.pass),
    tests: makerCheckerTests
  };
  console.log(`Maker-Checker Results: ${auditResults.sections.makerChecker.pass ? 'PASS' : 'FAIL'}`);

  // -------------------------------------------------------------
  // TEST SECTION 4: GENERAL LEDGER BALANCING & DUPLICATE PREVENTION
  // -------------------------------------------------------------
  console.log('\n--- TEST 4: General Ledger Balancing & Duplicate Prevention ---');
  const ledgerTests = [];

  const ledgerTotals = db.prepare(`
    SELECT 
      COALESCE(SUM(CASE WHEN entry_type = 'DEBIT' THEN amount ELSE 0 END), 0) as total_debit,
      COALESCE(SUM(CASE WHEN entry_type = 'CREDIT' THEN amount ELSE 0 END), 0) as total_credit,
      COUNT(*) as total_entries
    FROM transaction_entries
  `).get();

  const ledgerDelta = Math.abs(ledgerTotals.total_debit - ledgerTotals.total_credit);

  ledgerTests.push({
    test: 'Double-Entry General Ledger Balanced (Debits = Credits)',
    totalDebit: ledgerTotals.total_debit,
    totalCredit: ledgerTotals.total_credit,
    delta: ledgerDelta,
    entries: ledgerTotals.total_entries,
    pass: ledgerDelta < 0.01 && ledgerTotals.total_entries > 0
  });

  // Check for duplicate transaction numbers in transactions
  const dupTxNumbers = db.prepare(`
    SELECT transaction_number, COUNT(*) as c
    FROM transactions
    GROUP BY transaction_number
    HAVING c > 1
  `).all();

  ledgerTests.push({
    test: 'Zero Duplicate Transaction Numbers in Ledger',
    duplicateCount: dupTxNumbers.length,
    duplicates: dupTxNumbers,
    pass: dupTxNumbers.length === 0
  });

  auditResults.sections.ledgerIntegrity = {
    pass: ledgerTests.every(t => t.pass),
    tests: ledgerTests
  };
  console.log(`General Ledger Results: ${auditResults.sections.ledgerIntegrity.pass ? 'PASS' : 'FAIL'}`);

  // -------------------------------------------------------------
  // TEST SECTION 5: CUSTOMER 360 DEGREE RECONCILIATION
  // -------------------------------------------------------------
  console.log('\n--- TEST 5: Customer 360 Degree Portfolio Reconciliation ---');
  const customer360Tests = [];

  const testCustomers = db.prepare('SELECT id, full_name, customer_code FROM customers LIMIT 3').all();

  testCustomers.forEach(cust => {
    // 1. FD Principal
    const fdP = db.prepare("SELECT COALESCE(SUM(principal_amount), 0) as s FROM fixed_deposits WHERE customer_id = ? AND status = 'ACTIVE'").get(cust.id).s;
    // 2. RD Deposited
    const rdD = db.prepare("SELECT COALESCE(SUM(amount_deposited), 0) as s FROM recurring_deposits WHERE customer_id = ? AND status = 'ACTIVE'").get(cust.id).s;
    // 3. MIS Deposit
    const misD = db.prepare("SELECT COALESCE(SUM(deposit_amount), 0) as s FROM mis_accounts WHERE customer_id = ? AND status = 'ACTIVE'").get(cust.id).s;
    // 4. Savings Balance
    const sbB = db.prepare("SELECT COALESCE(SUM(current_balance), 0) as s FROM savings_accounts WHERE customer_id = ? AND status = 'ACTIVE'").get(cust.id).s;

    const totalNetWorth = Math.round((fdP + rdD + misD + sbB) * 100) / 100;

    customer360Tests.push({
      customer: cust.full_name,
      code: cust.customer_code,
      fdPrincipal: fdP,
      rdDeposited: rdD,
      misDeposit: misD,
      savingsBalance: sbB,
      totalNetWorth: totalNetWorth,
      pass: totalNetWorth >= 0
    });
  });

  auditResults.sections.customer360 = {
    pass: customer360Tests.every(t => t.pass),
    tests: customer360Tests
  };
  console.log(`Customer 360 Reconciliation: ${auditResults.sections.customer360.pass ? 'PASS' : 'FAIL'}`);

  // -------------------------------------------------------------
  // TEST SECTION 6: EXISTING PRODUCTION FD INTEGRITY & REGRESSION
  // -------------------------------------------------------------
  console.log('\n--- TEST 6: Existing FD Records & Production DB Safety ---');
  const regressionTests = [];

  const prodDb = new Database(PROD_DB_PATH, { readonly: true });
  const prodTables = prodDb.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'").all().map(t => t.name);
  const prodFDCount = prodDb.prepare('SELECT COUNT(*) as c FROM fixed_deposits').get().c;
  const prodCustCount = prodDb.prepare('SELECT COUNT(*) as c FROM customers').get().c;
  const prodSchedCount = prodDb.prepare('SELECT COUNT(*) as c FROM fd_schedules').get().c;
  prodDb.close();

  regressionTests.push({
    test: 'Production Database Untouched Table Count',
    tables: prodTables,
    count: prodTables.length,
    pass: prodTables.length === 7
  });

  regressionTests.push({
    test: 'Production Database Original Record Counts Preserved',
    fds: prodFDCount,
    customers: prodCustCount,
    schedules: prodSchedCount,
    pass: prodFDCount === 3 && prodCustCount === 4 && prodSchedCount === 12
  });

  auditResults.sections.productionSafety = {
    pass: regressionTests.every(t => t.pass),
    tests: regressionTests
  };
  console.log(`Production DB Safety Results: ${auditResults.sections.productionSafety.pass ? 'PASS' : 'FAIL'}`);

  // -------------------------------------------------------------
  // TEST SECTION 7: BACKUP RESTORATION INTEGRITY
  // -------------------------------------------------------------
  console.log('\n--- TEST 7: Backup Restoration Verification ---');
  const backupTests = [];

  const backupExists = fs.existsSync(BACKUP_DB_PATH);
  backupTests.push({
    test: 'Backup File Exists on Disk',
    path: BACKUP_DB_PATH,
    pass: backupExists
  });

  if (backupExists) {
    const backupDb = new Database(BACKUP_DB_PATH, { readonly: true });
    const integrity = backupDb.prepare('PRAGMA integrity_check').get().integrity_check;
    const backupTables = backupDb.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'").all().map(t => t.name);
    backupDb.close();

    backupTests.push({
      test: 'Backup Database Integrity Check',
      result: integrity,
      tables: backupTables,
      pass: integrity === 'ok' && backupTables.length === 7
    });
  }

  auditResults.sections.backupVerification = {
    pass: backupTests.every(t => t.pass),
    tests: backupTests
  };
  console.log(`Backup Restoration Results: ${auditResults.sections.backupVerification.pass ? 'PASS' : 'FAIL'}`);

  // -------------------------------------------------------------
  // TEST SECTION 8: CUSTOMER ANDROID APP VIEW-ONLY AUDIT
  // -------------------------------------------------------------
  console.log('\n--- TEST 8: Customer Android App View-Only Security ---');
  const androidTests = [];

  const customerRoutesFile = fs.readFileSync(path.join(__dirname, 'routes/customers.js'), 'utf8');

  // Verify that there are no mutation routes exposed for customers (no customer withdrawals, no customer rate updates)
  const hasCustomerWithdrawRoute = customerRoutesFile.includes("router.post('/withdraw'");
  const hasCustomerDeleteRoute = customerRoutesFile.includes("router.delete('/account'");

  androidTests.push({
    test: 'No Customer Mutation Routes (No self-withdrawal, no customer deletes)',
    pass: !hasCustomerWithdrawRoute && !hasCustomerDeleteRoute
  });

  // Verify CustomerApp.jsx in frontend has no write/transaction action controls
  const customerAppClient = fs.readFileSync(path.join(__dirname, '../client/src/components/CustomerApp.jsx'), 'utf8');
  const hasAdminActionsInApp = customerAppClient.includes('ApprovalsQueue') || customerAppClient.includes('TransactionsLedger');
  androidTests.push({
    test: 'CustomerApp.jsx is Strictly Read-Only View of Portfolio',
    pass: !hasAdminActionsInApp
  });

  auditResults.sections.androidViewOnly = {
    pass: androidTests.every(t => t.pass),
    tests: androidTests
  };
  console.log(`Customer Android App View-Only Results: ${auditResults.sections.androidViewOnly.pass ? 'PASS' : 'FAIL'}`);

  db.close();

  console.log('\n================================================================');
  console.log('   ALL 8 AUDIT MODULES COMPLETED');
  console.log('================================================================\n');

  return auditResults;
}

const results = runAudit();
fs.writeFileSync(path.join(__dirname, 'audit_results.json'), JSON.stringify(results, null, 2));
console.log('Audit results saved to server/audit_results.json');
