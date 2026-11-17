/**
 * PRODUCTION-GRADE CLEAN DATABASE MIGRATION SCRIPT
 * PURE DDL ONLY — ZERO TEST/DEMO RECORDS
 * Safe, idempotent, transactional schema expansion for FD CRM
 */

const Database = require('better-sqlite3');
const path = require('path');

function runCleanMigration(dbPath) {
  const targetDb = dbPath || process.env.DB_FILE || path.join(__dirname, 'fd_crm.sqlite');
  console.log(`[Clean Migration] Target Database: ${targetDb}`);

  const db = new Database(targetDb);
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');

  const migration = db.transaction(() => {
    // -------------------------------------------------------------------------
    // 1. BRANCHES TABLE
    // -------------------------------------------------------------------------
    db.exec(`
      CREATE TABLE IF NOT EXISTS branches (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        branch_code TEXT UNIQUE NOT NULL,
        branch_name TEXT NOT NULL,
        address TEXT,
        city TEXT NOT NULL,
        state TEXT NOT NULL,
        pincode TEXT,
        contact_phone TEXT,
        contact_email TEXT,
        is_active INTEGER DEFAULT 1,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // -------------------------------------------------------------------------
    // 2. FD SCHEMES TABLE
    // -------------------------------------------------------------------------
    db.exec(`
      CREATE TABLE IF NOT EXISTS fd_schemes (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        scheme_code TEXT UNIQUE NOT NULL,
        scheme_name TEXT NOT NULL,
        min_amount REAL NOT NULL,
        max_amount REAL,
        min_tenure_months INTEGER NOT NULL,
        max_tenure_months INTEGER NOT NULL,
        interest_rate REAL NOT NULL,
        senior_citizen_bonus REAL DEFAULT 0.50,
        compounding_frequency TEXT NOT NULL,
        premature_penalty_rate REAL DEFAULT 1.00,
        is_active INTEGER DEFAULT 1,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // -------------------------------------------------------------------------
    // 3. APPROVAL REQUESTS (MAKER-CHECKER WORKFLOW)
    // -------------------------------------------------------------------------
    db.exec(`
      CREATE TABLE IF NOT EXISTS approval_requests (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        request_number TEXT UNIQUE NOT NULL,
        request_type TEXT NOT NULL, -- 'NEW_FD', 'INTEREST_PAYOUT', 'MATURITY_SETTLEMENT', 'FD_RENEWAL', 'PREMATURE_CLOSE', 'NEW_CUSTOMER', 'NEW_RD', 'RD_INSTALLMENT', 'NEW_MIS', 'MIS_PAYOUT', 'NEW_SAVINGS_ACCOUNT', 'SAVINGS_DEPOSIT', 'SAVINGS_WITHDRAWAL'
        maker_id INTEGER NOT NULL,
        customer_id INTEGER,
        fd_id INTEGER,
        proposed_amount REAL,
        request_data TEXT NOT NULL, -- Complete JSON payload
        status TEXT DEFAULT 'PENDING_APPROVAL', -- 'PENDING_APPROVAL', 'APPROVED', 'REJECTED'
        checker_id INTEGER,
        decision_remarks TEXT,
        decision_date DATETIME,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (maker_id) REFERENCES users(id),
        FOREIGN KEY (checker_id) REFERENCES users(id),
        FOREIGN KEY (customer_id) REFERENCES customers(id),
        FOREIGN KEY (fd_id) REFERENCES fixed_deposits(id)
      );
    `);

    // -------------------------------------------------------------------------
    // 4. FINANCIAL TRANSACTIONS LEDGER (DOUBLE-ENTRY MASTER)
    // -------------------------------------------------------------------------
    db.exec(`
      CREATE TABLE IF NOT EXISTS transactions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        transaction_number TEXT UNIQUE NOT NULL,
        transaction_type TEXT NOT NULL,
        fd_id INTEGER,
        customer_id INTEGER NOT NULL,
        amount REAL NOT NULL,
        transaction_date DATE NOT NULL,
        payment_mode TEXT NOT NULL, -- 'CASH', 'BANK_TRANSFER', 'CHEQUE', 'INTERNAL_TRANSFER'
        reference_number TEXT,
        remarks TEXT,
        created_by INTEGER NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (fd_id) REFERENCES fixed_deposits(id),
        FOREIGN KEY (customer_id) REFERENCES customers(id),
        FOREIGN KEY (created_by) REFERENCES users(id)
      );
    `);

    // -------------------------------------------------------------------------
    // 5. TRANSACTION ENTRIES (BALANCED DEBIT & CREDIT JOURNAL)
    // -------------------------------------------------------------------------
    db.exec(`
      CREATE TABLE IF NOT EXISTS transaction_entries (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        transaction_id INTEGER NOT NULL,
        account_name TEXT NOT NULL,
        entry_type TEXT NOT NULL, -- 'DEBIT' or 'CREDIT'
        amount REAL NOT NULL,
        notes TEXT,
        FOREIGN KEY (transaction_id) REFERENCES transactions(id) ON DELETE CASCADE
      );
    `);

    // -------------------------------------------------------------------------
    // 6. RECURRING DEPOSITS (RD) MASTER
    // -------------------------------------------------------------------------
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
        status TEXT DEFAULT 'ACTIVE',
        premature_penalty_rate REAL DEFAULT 1.00,
        premature_closed_date DATE,
        remarks TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (customer_id) REFERENCES customers(id),
        FOREIGN KEY (branch_id) REFERENCES branches(id)
      );
    `);

    // -------------------------------------------------------------------------
    // 7. RD INSTALLMENTS SCHEDULE
    // -------------------------------------------------------------------------
    db.exec(`
      CREATE TABLE IF NOT EXISTS rd_installments (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        rd_id INTEGER NOT NULL,
        installment_no INTEGER NOT NULL,
        due_date DATE NOT NULL,
        installment_amount REAL NOT NULL,
        status TEXT DEFAULT 'PENDING',
        paid_date DATE,
        late_fee REAL DEFAULT 0,
        total_collected REAL DEFAULT 0,
        payment_mode TEXT,
        transaction_ref TEXT,
        collector_user_id INTEGER,
        FOREIGN KEY (rd_id) REFERENCES recurring_deposits(id) ON DELETE CASCADE
      );
    `);

    // -------------------------------------------------------------------------
    // 8. MONTHLY INCOME SCHEME (MIS) MASTER
    // -------------------------------------------------------------------------
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
        status TEXT DEFAULT 'ACTIVE',
        premature_penalty_rate REAL DEFAULT 2.00,
        closed_date DATE,
        remarks TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (customer_id) REFERENCES customers(id),
        FOREIGN KEY (branch_id) REFERENCES branches(id)
      );
    `);

    // -------------------------------------------------------------------------
    // 9. MIS PAYOUT SCHEDULE
    // -------------------------------------------------------------------------
    db.exec(`
      CREATE TABLE IF NOT EXISTS mis_payout_schedules (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        mis_id INTEGER NOT NULL,
        month_no INTEGER NOT NULL,
        payout_date DATE NOT NULL,
        payout_amount REAL NOT NULL,
        tds_deducted REAL DEFAULT 0,
        net_payable REAL NOT NULL,
        status TEXT DEFAULT 'PENDING',
        paid_date DATE,
        payment_reference TEXT,
        FOREIGN KEY (mis_id) REFERENCES mis_accounts(id) ON DELETE CASCADE
      );
    `);

    // -------------------------------------------------------------------------
    // 10. SAVINGS ACCOUNTS MASTER
    // -------------------------------------------------------------------------
    db.exec(`
      CREATE TABLE IF NOT EXISTS savings_accounts (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        account_number TEXT UNIQUE NOT NULL,
        customer_id INTEGER NOT NULL,
        branch_id INTEGER,
        current_balance REAL DEFAULT 0.00,
        minimum_balance REAL DEFAULT 1000.00,
        annual_interest_rate REAL DEFAULT 4.00,
        status TEXT DEFAULT 'ACTIVE',
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

    // -------------------------------------------------------------------------
    // 11. SAVINGS TRANSACTIONS (PASSBOOK LEDGER)
    // -------------------------------------------------------------------------
    db.exec(`
      CREATE TABLE IF NOT EXISTS savings_transactions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        account_id INTEGER NOT NULL,
        transaction_number TEXT UNIQUE NOT NULL,
        transaction_type TEXT NOT NULL,
        amount REAL NOT NULL,
        balance_after REAL NOT NULL,
        payment_mode TEXT NOT NULL,
        reference_number TEXT,
        narration TEXT NOT NULL,
        performed_by_user_id INTEGER,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (account_id) REFERENCES savings_accounts(id)
      );
    `);

    // -------------------------------------------------------------------------
    // 12. NON-DESTRUCTIVE COLUMN EXPANSIONS ON EXISTING TABLES
    // -------------------------------------------------------------------------
    const addCol = (tableName, colDef) => {
      try {
        db.exec(`ALTER TABLE ${tableName} ADD COLUMN ${colDef}`);
      } catch(e) {
        // Column already exists - safe to continue
      }
    };

    addCol('users', 'password_hash TEXT');
    addCol('users', 'branch_id INTEGER REFERENCES branches(id)');
    addCol('customers', 'password_hash TEXT');
    addCol('customers', 'branch_id INTEGER REFERENCES branches(id)');
    addCol('fixed_deposits', 'branch_id INTEGER REFERENCES branches(id)');
    addCol('fixed_deposits', 'scheme_id INTEGER REFERENCES fd_schemes(id)');

    console.log('[Clean Migration] All DDL executed cleanly with 0 dummy records.');
  });

  migration();
  db.close();
}

if (require.main === module) {
  runCleanMigration();
}

module.exports = { runCleanMigration };
