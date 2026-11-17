const Database = require('better-sqlite3');
const path = require('path');
const { calculateRD, calculateMIS } = require('./calculator');

const targetDbPath = process.env.DB_FILE || path.join(__dirname, 'backups', 'fd_crm_migration_test.sqlite');
console.log('Migrating Multi-Product Tables on:', targetDbPath);

const db = new Database(targetDbPath);
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

db.transaction(() => {
  // 1. RECURRING DEPOSITS (RD) MASTER
  db.exec(`
    CREATE TABLE IF NOT EXISTS recurring_deposits (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      rd_number TEXT UNIQUE NOT NULL,
      customer_id INTEGER NOT NULL,
      branch_id INTEGER,
      monthly_installment REAL NOT NULL,
      annual_rate REAL NOT NULL,
      tenure_months INTEGER NOT NULL,
      start_date DATE NOT NULL,
      maturity_date DATE NOT NULL,
      total_principal REAL NOT NULL,
      total_interest REAL NOT NULL,
      maturity_amount REAL NOT NULL,
      installments_paid INTEGER DEFAULT 0,
      amount_deposited REAL DEFAULT 0,
      late_fee_per_hundred REAL DEFAULT 1.50,
      total_late_fees REAL DEFAULT 0,
      status TEXT DEFAULT 'ACTIVE', -- 'ACTIVE', 'MATURED', 'CLOSED_PREMATURE', 'DEFAULTED'
      premature_penalty_rate REAL DEFAULT 1.00,
      premature_closed_date DATE,
      remarks TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (customer_id) REFERENCES customers(id),
      FOREIGN KEY (branch_id) REFERENCES branches(id)
    );
  `);

  // 2. RD INSTALLMENTS SCHEDULE
  db.exec(`
    CREATE TABLE IF NOT EXISTS rd_installments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      rd_id INTEGER NOT NULL,
      installment_no INTEGER NOT NULL,
      due_date DATE NOT NULL,
      installment_amount REAL NOT NULL,
      status TEXT DEFAULT 'PENDING', -- 'PENDING', 'COLLECTED', 'OVERDUE'
      paid_date DATE,
      late_fee REAL DEFAULT 0,
      total_collected REAL DEFAULT 0,
      payment_mode TEXT,             -- 'CASH', 'SAVINGS_TRANSFER', 'BANK_NEFT'
      transaction_ref TEXT,
      collector_user_id INTEGER,
      FOREIGN KEY (rd_id) REFERENCES recurring_deposits(id) ON DELETE CASCADE
    );
  `);

  // 3. MONTHLY INCOME SCHEME (MIS) MASTER
  db.exec(`
    CREATE TABLE IF NOT EXISTS mis_accounts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      mis_number TEXT UNIQUE NOT NULL,
      customer_id INTEGER NOT NULL,
      branch_id INTEGER,
      deposit_amount REAL NOT NULL,
      annual_rate REAL NOT NULL,
      tenure_months INTEGER NOT NULL,
      monthly_payout REAL NOT NULL,
      total_payout_amount REAL NOT NULL,
      start_date DATE NOT NULL,
      maturity_date DATE NOT NULL,
      payout_account_no TEXT,
      payout_bank_ifsc TEXT,
      status TEXT DEFAULT 'ACTIVE', -- 'ACTIVE', 'MATURED', 'CLOSED_PREMATURE'
      premature_penalty_rate REAL DEFAULT 2.00,
      closed_date DATE,
      remarks TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (customer_id) REFERENCES customers(id),
      FOREIGN KEY (branch_id) REFERENCES branches(id)
    );
  `);

  // 4. MIS PAYOUT SCHEDULE
  db.exec(`
    CREATE TABLE IF NOT EXISTS mis_payout_schedules (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      mis_id INTEGER NOT NULL,
      month_no INTEGER NOT NULL,
      payout_date DATE NOT NULL,
      payout_amount REAL NOT NULL,
      tds_deducted REAL DEFAULT 0,
      net_payable REAL NOT NULL,
      status TEXT DEFAULT 'PENDING', -- 'PENDING', 'PAID'
      paid_date DATE,
      payment_reference TEXT,
      FOREIGN KEY (mis_id) REFERENCES mis_accounts(id) ON DELETE CASCADE
    );
  `);

  // 5. SAVINGS ACCOUNTS MASTER
  db.exec(`
    CREATE TABLE IF NOT EXISTS savings_accounts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      account_number TEXT UNIQUE NOT NULL,
      customer_id INTEGER NOT NULL,
      branch_id INTEGER,
      current_balance REAL DEFAULT 0.00,
      minimum_balance REAL DEFAULT 1000.00,
      annual_interest_rate REAL DEFAULT 4.00,
      status TEXT DEFAULT 'ACTIVE', -- 'ACTIVE', 'DORMANT', 'FROZEN', 'CLOSED'
      opened_date DATE NOT NULL,
      last_interest_credit_date DATE,
      nominee_name TEXT,
      nominee_relation TEXT,
      closed_date DATE,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (customer_id) REFERENCES customers(id),
      FOREIGN KEY (branch_id) REFERENCES branches(id)
    );
  `);

  // 6. SAVINGS TRANSACTIONS (PASSBOOK STATEMENT)
  db.exec(`
    CREATE TABLE IF NOT EXISTS savings_transactions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      account_id INTEGER NOT NULL,
      transaction_number TEXT UNIQUE NOT NULL,
      transaction_type TEXT NOT NULL, -- 'DEPOSIT', 'WITHDRAWAL', 'INTEREST_CREDIT', 'TRANSFER'
      amount REAL NOT NULL,
      balance_after REAL NOT NULL,
      payment_mode TEXT NOT NULL,     -- 'CASH', 'TRANSFER', 'NEFT'
      reference_number TEXT,
      narration TEXT NOT NULL,
      performed_by_user_id INTEGER,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (account_id) REFERENCES savings_accounts(id)
    );
  `);

  // 7. Seed Demo Records for Testing (Rajesh Sharma - ID 1, Mahendra Patel - ID 2)
  const rdCount = db.prepare('SELECT count(*) as count FROM recurring_deposits').get();
  if (rdCount.count === 0) {
    const rdCalc = calculateRD({
      installmentAmount: 5000,
      annualRate: 8.0,
      tenureMonths: 12,
      startDate: '2026-02-01'
    });

    const rdInsert = db.prepare(`
      INSERT INTO recurring_deposits (
        rd_number, customer_id, branch_id, monthly_installment, annual_rate,
        tenure_months, start_date, maturity_date, total_principal, total_interest,
        maturity_amount, installments_paid, amount_deposited, status, remarks
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      'RD-2026-001', 1, null, 5000, 8.0,
      12, '2026-02-01', rdCalc.maturityDate, rdCalc.totalPrincipal, rdCalc.totalInterest,
      rdCalc.maturityAmount, 2, 10000, 'ACTIVE', 'Regular Monthly Savings RD'
    );

    const rdId = rdInsert.lastInsertRowid;
    const instInsert = db.prepare(`
      INSERT INTO rd_installments (
        rd_id, installment_no, due_date, installment_amount, status,
        paid_date, late_fee, total_collected, payment_mode, transaction_ref
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    rdCalc.schedule.forEach((s, idx) => {
      if (idx < 2) {
        instInsert.run(rdId, s.installmentNo, s.dueDate, s.installmentAmount, 'COLLECTED', s.dueDate, 0, s.installmentAmount, 'CASH', 'COLL-RD-00' + (idx+1));
      } else {
        instInsert.run(rdId, s.installmentNo, s.dueDate, s.installmentAmount, 'PENDING', null, 0, 0, null, null);
      }
    });
    console.log('Seeded demo RD-2026-001 with 12 installments');
  }

  const misCount = db.prepare('SELECT count(*) as count FROM mis_accounts').get();
  if (misCount.count === 0) {
    const misCalc = calculateMIS({
      depositAmount: 500000,
      annualRate: 8.4,
      tenureMonths: 60,
      startDate: '2026-01-01'
    });

    const misInsert = db.prepare(`
      INSERT INTO mis_accounts (
        mis_number, customer_id, branch_id, deposit_amount, annual_rate,
        tenure_months, monthly_payout, total_payout_amount, start_date,
        maturity_date, payout_account_no, payout_bank_ifsc, status, remarks
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      'MIS-2026-001', 2, null, 500000, 8.4,
      60, misCalc.monthlyPayout, misCalc.totalPayoutAmount, '2026-01-01',
      misCalc.maturityDate, '50100456789012', 'HDFC0001234', 'ACTIVE', 'Senior Citizen Monthly Pension Scheme'
    );

    const misId = misInsert.lastInsertRowid;
    const misSchedInsert = db.prepare(`
      INSERT INTO mis_payout_schedules (
        mis_id, month_no, payout_date, payout_amount, tds_deducted,
        net_payable, status, paid_date, payment_reference
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    misCalc.schedule.slice(0, 12).forEach((s, idx) => {
      if (idx < 2) {
        misSchedInsert.run(misId, s.monthNo, s.payoutDate, s.payoutAmount, 0, s.netPayable, 'PAID', s.payoutDate, 'NEFT-MIS-2026-00' + (idx+1));
      } else {
        misSchedInsert.run(misId, s.monthNo, s.payoutDate, s.payoutAmount, 0, s.netPayable, 'PENDING', null, null);
      }
    });
    console.log('Seeded demo MIS-2026-001 with monthly payouts');
  }

  const sbCount = db.prepare('SELECT count(*) as count FROM savings_accounts').get();
  if (sbCount.count === 0) {
    const sbInsert = db.prepare(`
      INSERT INTO savings_accounts (
        account_number, customer_id, branch_id, current_balance,
        minimum_balance, annual_interest_rate, status, opened_date, nominee_name, nominee_relation
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const sb1 = sbInsert.run('SB-2026-1001', 1, null, 75000.00, 1000.00, 4.0, 'ACTIVE', '2026-01-01', 'Sunita Sharma', 'Spouse');
    const sb2 = sbInsert.run('SB-2026-1002', 2, null, 120000.00, 1000.00, 4.0, 'ACTIVE', '2026-01-10', 'Chirag Patel', 'Son');

    const txnInsert = db.prepare(`
      INSERT INTO savings_transactions (
        account_id, transaction_number, transaction_type, amount,
        balance_after, payment_mode, reference_number, narration, performed_by_user_id
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    txnInsert.run(sb1.lastInsertRowid, 'TXN-SB-20260101-01', 'DEPOSIT', 50000, 50000, 'CASH', 'DEP-001', 'Opening Cash Deposit', 1);
    txnInsert.run(sb1.lastInsertRowid, 'TXN-SB-20260215-02', 'DEPOSIT', 25000, 75000, 'TRANSFER', 'NEFT-9842', 'Direct Bank Transfer', 1);

    txnInsert.run(sb2.lastInsertRowid, 'TXN-SB-20260110-01', 'DEPOSIT', 100000, 100000, 'CASH', 'DEP-002', 'Opening Cash Deposit', 1);
    txnInsert.run(sb2.lastInsertRowid, 'TXN-SB-20260201-02', 'DEPOSIT', 20000, 120000, 'TRANSFER', 'NEFT-1102', 'Monthly Pension Inflow', 1);

    console.log('Seeded demo Savings Accounts SB-2026-1001 & SB-2026-1002');
  }

})();

console.log('--- Multi-Product Migration Completed Successfully ---');
