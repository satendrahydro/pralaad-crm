const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');
const bcrypt = require('bcryptjs');

const dbPath = process.env.DB_FILE || path.join(__dirname, 'fd_crm.sqlite');

function getDatabaseConnection() {
  const applyPragmas = (conn) => {
    conn.pragma('journal_mode = WAL');
    conn.pragma('synchronous = NORMAL');
    conn.pragma('temp_store = MEMORY');
    conn.pragma('cache_size = -64000');
    conn.pragma('busy_timeout = 5000');
    conn.pragma('foreign_keys = ON');
    return conn;
  };

  try {
    const d = applyPragmas(new Database(dbPath));
    d.prepare('SELECT name FROM sqlite_master LIMIT 1').get();
    return d;
  } catch (err) {
    console.error('SQLite initialization error:', err.message);
    if (/SQLITE_CORRUPT|SQLITE_NOTADB|file is not a database|malformed/i.test(String(err.message))) {
      try {
        const stamp = Date.now();
        if (fs.existsSync(dbPath)) fs.renameSync(dbPath, `${dbPath}.corrupt.${stamp}`);
        if (fs.existsSync(dbPath + '-wal')) fs.unlinkSync(dbPath + '-wal');
        if (fs.existsSync(dbPath + '-shm')) fs.unlinkSync(dbPath + '-shm');
      } catch (e) {
        console.error('Failed to quarantine corrupt DB files:', e.message);
      }
      return applyPragmas(new Database(dbPath));
    }
    throw err;
  }
}

const db = getDatabaseConnection();

function initDB() {
  // 1. Users table (Admin & Staff for CRM login)
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      full_name TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'admin',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // 2. Customers table
  db.exec(`
    CREATE TABLE IF NOT EXISTS customers (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      customer_code TEXT UNIQUE NOT NULL,
      status TEXT DEFAULT 'ACTIVE',
      full_name TEXT NOT NULL,
      father_name TEXT,
      phone TEXT NOT NULL,
      email TEXT,
      pan_card TEXT,
      aadhaar_no TEXT,
      address TEXT,
      bank_name TEXT,
      account_no TEXT,
      ifsc_code TEXT,
      nominee_name TEXT,
      nominee_relation TEXT,
      is_senior_citizen INTEGER DEFAULT 0,
      kyc_status TEXT DEFAULT 'Verified',
      branch TEXT DEFAULT 'MAIN BRANCH',
      group_name TEXT,
      branch_id INTEGER,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // Safe migrations for columns in case table was created previously without them
  try { db.exec("ALTER TABLE customers ADD COLUMN father_name TEXT;"); } catch(e){}
  try { db.exec("ALTER TABLE customers ADD COLUMN kyc_status TEXT DEFAULT 'Verified';"); } catch(e){}
  try { db.exec("ALTER TABLE customers ADD COLUMN branch TEXT DEFAULT 'MAIN BRANCH';"); } catch(e){}
  try { db.exec("ALTER TABLE customers ADD COLUMN group_name TEXT;"); } catch(e){}
  try { db.exec("ALTER TABLE customers ADD COLUMN branch_id INTEGER;"); } catch(e){}
  try { db.exec("ALTER TABLE customers ADD COLUMN status TEXT DEFAULT 'ACTIVE';"); } catch(e){}
  try { db.exec("ALTER TABLE users ADD COLUMN phone TEXT;"); } catch(e){}
  try { db.exec("ALTER TABLE users ADD COLUMN is_active INTEGER DEFAULT 1;"); } catch(e){}
  try { db.exec("ALTER TABLE users ADD COLUMN failed_attempts INTEGER DEFAULT 0;"); } catch(e){}
  try { db.exec("ALTER TABLE users ADD COLUMN last_login_at TEXT;"); } catch(e){}
  try { db.exec("ALTER TABLE users ADD COLUMN must_change_password INTEGER DEFAULT 0;"); } catch(e){}
  try { db.exec("ALTER TABLE users ADD COLUMN branch_id INTEGER;"); } catch(e){}
  try { db.exec("ALTER TABLE users ADD COLUMN permissions TEXT;"); } catch(e){}
  try { db.exec("ALTER TABLE fixed_deposits ADD COLUMN branch_id INTEGER;"); } catch(e){}
  try { db.exec("ALTER TABLE fixed_deposits ADD COLUMN scheme_id INTEGER;"); } catch(e){}
  try { db.exec("ALTER TABLE day_book_cash_entries ADD COLUMN branch_code TEXT DEFAULT 'BHR001';"); } catch(e){}

  // 3. Fixed Deposits table
  db.exec(`
    CREATE TABLE IF NOT EXISTS fixed_deposits (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      fd_number TEXT UNIQUE NOT NULL,
      customer_id INTEGER NOT NULL,
      principal_amount REAL NOT NULL,
      annual_rate REAL NOT NULL,
      tenure_months INTEGER NOT NULL,
      tenure_days INTEGER DEFAULT 0,
      compounding_frequency TEXT NOT NULL,
      is_cumulative INTEGER NOT NULL,
      payout_amount REAL DEFAULT 0,
      total_interest REAL NOT NULL,
      maturity_amount REAL NOT NULL,
      start_date DATE NOT NULL,
      maturity_date DATE NOT NULL,
      status TEXT NOT NULL DEFAULT 'ACTIVE', -- 'ACTIVE', 'MATURED', 'CLOSED_PREMATURE', 'RENEWED'
      premature_penalty_rate REAL DEFAULT 1.0,
      premature_interest_paid REAL DEFAULT 0,
      closed_date DATE,
      remarks TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE CASCADE
    );
  `);

  // 4. FD Schedules (payout or compounding tracking)
  db.exec(`
    CREATE TABLE IF NOT EXISTS fd_schedules (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      fd_id INTEGER NOT NULL,
      period_no INTEGER NOT NULL,
      payout_date DATE NOT NULL,
      payout_amount REAL NOT NULL,
      interest_accrued REAL NOT NULL,
      cumulative_interest REAL NOT NULL,
      balance REAL NOT NULL,
      status TEXT NOT NULL DEFAULT 'PENDING', -- 'PENDING', 'PAID'
      paid_date DATE,
      payment_reference TEXT,
      FOREIGN KEY (fd_id) REFERENCES fixed_deposits(id) ON DELETE CASCADE
    );
  `);

  // 5. CRM Monthly Subscription & Billing Status
  db.exec(`
    CREATE TABLE IF NOT EXISTS subscription (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      plan_name TEXT NOT NULL,
      monthly_price REAL NOT NULL,
      status TEXT NOT NULL, -- 'ACTIVE', 'EXPIRING_SOON', 'EXPIRED'
      valid_until DATE NOT NULL,
      billing_cycle TEXT NOT NULL DEFAULT 'MONTHLY',
      last_payment_date DATE,
      last_payment_ref TEXT,
      notes TEXT
    );
  `);

  // 6. CRM Company / Branch Settings
  db.exec(`
    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT
    );
  `);

  // 7. WhatsApp Reminders & Delivery Logs
  db.exec(`
    CREATE TABLE IF NOT EXISTS whatsapp_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      customer_id INTEGER,
      fd_id INTEGER,
      schedule_id INTEGER,
      recipient_phone TEXT NOT NULL,
      customer_name TEXT NOT NULL,
      reminder_type TEXT NOT NULL, -- 'PAYOUT_DUE', 'MATURITY_DUE', 'INSTALLMENT'
      due_date DATE NOT NULL,
      days_before INTEGER DEFAULT 3,
      message_text TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'SENT', -- 'SENT', 'FAILED', 'MANUAL_DISPATCHED'
      sent_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      error_msg TEXT,
      FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE SET NULL,
      FOREIGN KEY (fd_id) REFERENCES fixed_deposits(id) ON DELETE SET NULL
    );
  `);

  // 8. Branches Master
  db.exec(`
    CREATE TABLE IF NOT EXISTS branches (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      branch_code TEXT UNIQUE NOT NULL,
      branch_name TEXT NOT NULL,
      address TEXT,
      city TEXT DEFAULT 'Bijnor',
      state TEXT DEFAULT 'Uttar Pradesh',
      pincode TEXT DEFAULT '246701',
      contact_phone TEXT,
      contact_email TEXT,
      is_active INTEGER DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // 9. Deposit Schemes Master
  db.exec(`
    CREATE TABLE IF NOT EXISTS fd_schemes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      scheme_code TEXT UNIQUE NOT NULL,
      scheme_name TEXT NOT NULL,
      min_amount REAL NOT NULL,
      max_amount REAL NOT NULL,
      min_tenure_months INTEGER NOT NULL,
      max_tenure_months INTEGER NOT NULL,
      interest_rate REAL NOT NULL,
      senior_citizen_bonus REAL DEFAULT 0.50,
      compounding_frequency TEXT NOT NULL,
      is_active INTEGER DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // 10. Recurring Deposits (RD) Master & Installments
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

  // 11. Monthly Income Scheme (MIS) Master & Payout Schedules
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

  // 12. Savings Accounts Master & Passbook Transactions
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

  // 13. Maker-Checker Approvals Queue & Transactions Ledger
  db.exec(`
    CREATE TABLE IF NOT EXISTS approval_requests (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      request_number TEXT UNIQUE NOT NULL,
      request_type TEXT NOT NULL,
      maker_id INTEGER NOT NULL,
      customer_id INTEGER,
      fd_id INTEGER,
      proposed_amount REAL,
      request_data TEXT,
      status TEXT DEFAULT 'PENDING_APPROVAL',
      checker_id INTEGER,
      decision_remarks TEXT,
      decision_date DATETIME,
      decided_at DATETIME,
      decision_notes TEXT,
      actioned_at DATETIME,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS transactions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      transaction_number TEXT UNIQUE NOT NULL,
      transaction_type TEXT NOT NULL,
      fd_id INTEGER,
      customer_id INTEGER,
      amount REAL NOT NULL,
      transaction_date DATE NOT NULL,
      payment_mode TEXT,
      reference_number TEXT,
      remarks TEXT,
      created_by INTEGER,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS transaction_entries (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      transaction_id INTEGER NOT NULL,
      account_name TEXT NOT NULL,
      entry_type TEXT NOT NULL,
      amount REAL NOT NULL,
      notes TEXT
    );

    CREATE TABLE IF NOT EXISTS password_reset_otps (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      identifier TEXT NOT NULL,
      account_type TEXT NOT NULL DEFAULT 'STAFF',
      otp_code TEXT NOT NULL,
      attempts INTEGER DEFAULT 0,
      is_verified INTEGER DEFAULT 0,
      reset_token TEXT,
      expires_at DATETIME NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS staff_permission_audits (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      admin_id INTEGER NOT NULL,
      admin_username TEXT NOT NULL,
      staff_id INTEGER NOT NULL,
      staff_username TEXT NOT NULL,
      permission_key TEXT NOT NULL,
      permission_label TEXT NOT NULL,
      old_value INTEGER NOT NULL,
      new_value INTEGER NOT NULL,
      action_type TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    -- 13b. Daily Office & Petty Cash Expenses (Tea, Coffee, Stationery, Conveyance, etc.)
    CREATE TABLE IF NOT EXISTS daily_expenses (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      expense_voucher_no TEXT UNIQUE NOT NULL,
      expense_date DATE NOT NULL,
      category TEXT NOT NULL,
      category_name TEXT NOT NULL,
      amount REAL NOT NULL,
      payment_mode TEXT NOT NULL,
      paid_to TEXT NOT NULL,
      bill_number TEXT,
      narration TEXT NOT NULL,
      created_by_user_id INTEGER,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    -- 13c. Day Book Inflow & Outflow Entries (Input: Paisa Aana / Output: Paisa Jana)
    CREATE TABLE IF NOT EXISTS day_book_cash_entries (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      voucher_no TEXT UNIQUE NOT NULL,
      entry_type TEXT NOT NULL, -- 'INFLOW' (Input/Receipt) or 'OUTFLOW' (Output/Payment)
      entry_date DATE NOT NULL,
      category TEXT NOT NULL,
      category_name TEXT NOT NULL,
      amount REAL NOT NULL,
      payment_mode TEXT NOT NULL DEFAULT 'CASH', -- 'CASH' or 'BANK_ONLINE'
      party_name TEXT NOT NULL, -- Kisko diya / Kisse aaya (Customer, Vendor, Staff, Bank)
      reference_no TEXT, -- Bill no, Receipt no, Slip no, Cheque/UTR
      narration TEXT NOT NULL,
      branch_code TEXT DEFAULT 'BHR001',
      created_by_user_id INTEGER,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    -- 13d. Core Ledger Accounts Master (1:1 with Prahlad Accounting Ledgers & Show In Day Book)
    CREATE TABLE IF NOT EXISTS ledger_accounts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      code TEXT UNIQUE NOT NULL,
      name TEXT NOT NULL,
      system_name TEXT NOT NULL,
      group_name TEXT NOT NULL,
      type TEXT NOT NULL, -- 'Asset' | 'Liability' | 'Equity' | 'Expense' | 'Revenue'
      is_system INTEGER DEFAULT 1,
      show_in_db INTEGER DEFAULT 1, -- 1 = Yes, 0 = No
      is_bank_account INTEGER DEFAULT 0,
      risk_percent REAL DEFAULT 0,
      sort_order INTEGER DEFAULT 0
    );

    -- 14. Associate / Advisor Network & Hierarchy Ranks
    CREATE TABLE IF NOT EXISTS agent_ranks (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      display_position INTEGER NOT NULL,
      rank_position INTEGER NOT NULL,
      collection_charge_commission INTEGER DEFAULT 1,
      commission_percentage REAL DEFAULT 5.0,
      associates_count INTEGER DEFAULT 0,
      min_target REAL DEFAULT 0,
      description TEXT,
      status TEXT DEFAULT 'ACTIVE',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS agents (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      agent_code TEXT UNIQUE NOT NULL,
      full_name TEXT NOT NULL,
      phone TEXT,
      email TEXT,
      branch_id INTEGER,
      branch_name TEXT,
      rank_id INTEGER REFERENCES agent_ranks(id),
      rank_name TEXT,
      reporting_to_agent_id INTEGER,
      collection_charge_enabled INTEGER DEFAULT 1,
      commission_rate REAL DEFAULT 5.0,
      total_business_collected REAL DEFAULT 0,
      total_commission_paid REAL DEFAULT 0,
      status TEXT DEFAULT 'ACTIVE',
      joining_date DATE,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    -- 15. Field Collection Centers & Groups
    CREATE TABLE IF NOT EXISTS collection_centers (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      center_code TEXT UNIQUE NOT NULL,
      center_name TEXT NOT NULL,
      branch_id INTEGER,
      branch_name TEXT,
      advisor_id INTEGER,
      advisor_name TEXT,
      collection_day TEXT DEFAULT 'DAILY',
      meeting_time TEXT DEFAULT '10:00 AM',
      total_members INTEGER DEFAULT 0,
      total_collected REAL DEFAULT 0,
      status TEXT DEFAULT 'ACTIVE',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    -- 16. Loan Against Deposit (LAD / Secured FD Loans)
    CREATE TABLE IF NOT EXISTS loans_against_deposit (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      loan_number TEXT UNIQUE NOT NULL,
      customer_id INTEGER NOT NULL,
      customer_name TEXT NOT NULL,
      customer_phone TEXT,
      collateral_type TEXT DEFAULT 'FD',
      collateral_fd_number TEXT NOT NULL,
      fd_deposit_amount REAL NOT NULL,
      sanctioned_amount REAL NOT NULL,
      disbursed_amount REAL NOT NULL,
      interest_rate REAL NOT NULL,
      tenure_months INTEGER NOT NULL,
      emi_amount REAL NOT NULL,
      disbursal_date DATE NOT NULL,
      maturity_date DATE NOT NULL,
      outstanding_principal REAL NOT NULL,
      total_recovered REAL DEFAULT 0,
      status TEXT DEFAULT 'ACTIVE',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    -- 17. Gold Loans Master (गोल्ड लोन - आभूषण मूल्यांकन, वजन, शुद्धता व सुरक्षित लॉकर)
    CREATE TABLE IF NOT EXISTS gold_loans (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      loan_number TEXT UNIQUE NOT NULL,
      customer_id INTEGER NOT NULL,
      customer_name TEXT NOT NULL,
      customer_phone TEXT,
      gold_items_detail TEXT NOT NULL, -- e.g. "2 Gold Bangles, 1 Mangalsutra, 2 Rings"
      pouch_number TEXT DEFAULT 'POUCH-001', -- Locker packet / packet bar-code
      locker_location TEXT DEFAULT 'Vault Locker A-12',
      gross_weight_grams REAL NOT NULL,
      net_weight_grams REAL NOT NULL,
      purity_karat INTEGER DEFAULT 22,
      valuation_rate_per_gram REAL NOT NULL,
      total_gold_valuation REAL NOT NULL,
      ltv_percentage REAL DEFAULT 75.0,
      sanctioned_amount REAL NOT NULL,
      disbursed_amount REAL NOT NULL,
      interest_rate REAL NOT NULL DEFAULT 15.0, -- Monthly interest e.g. 1.25% (15% p.a.)
      tenure_months INTEGER NOT NULL DEFAULT 12,
      monthly_interest REAL NOT NULL,
      outstanding_principal REAL NOT NULL,
      total_recovered REAL DEFAULT 0,
      status TEXT DEFAULT 'ACTIVE', -- 'ACTIVE', 'REPAID_RELEASED', 'OVERDUE', 'AUCTION_NOTICE'
      disbursal_date DATE NOT NULL,
      maturity_date DATE NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    -- 18. Udhar & Borrowings Register (उधार खाता - हाथ उधारी, डायरेक्टर व अन्य से लिया गया कर्ज)
    CREATE TABLE IF NOT EXISTS borrowings_udhar (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      voucher_no TEXT UNIQUE NOT NULL,
      lender_name TEXT NOT NULL, -- Kisse udhar liya (Person, Director, Market Lender, Associate)
      phone TEXT,
      borrowing_date DATE NOT NULL,
      amount REAL NOT NULL,
      interest_rate REAL DEFAULT 0, -- 0% for interest-free hand loan, or % p.a.
      payment_mode TEXT DEFAULT 'CASH', -- 'CASH' (गल्ले में आया) or 'BANK_ONLINE' (खाते में आया)
      due_date DATE,
      amount_repaid REAL DEFAULT 0,
      outstanding_balance REAL NOT NULL,
      status TEXT DEFAULT 'ACTIVE', -- 'ACTIVE', 'PARTIALLY_REPAID', 'FULLY_REPAID'
      narration TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    -- 19. Tamper-Proof Audit Trail (कर्मचारी एवं एजेंट कार्य लॉग्स - एंटी-फ्रॉड)
    CREATE TABLE IF NOT EXISTS audit_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER,
      username TEXT,
      full_name TEXT,
      role TEXT,
      agent_code TEXT,
      action TEXT NOT NULL,
      entity_type TEXT,
      entity_id TEXT,
      details TEXT,
      ip_address TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // Seed default admin user if not exists
  const userCount = db.prepare('SELECT count(*) as count FROM users').get();
  if (userCount.count === 0) {
    const salt = bcrypt.genSaltSync(10);
    const hash = bcrypt.hashSync('admin123', salt);
    db.prepare(`
      INSERT INTO users (username, password_hash, full_name, role)
      VALUES (?, ?, ?, ?)
    `).run('admin', hash, 'System Administrator', 'admin');
    console.log('Default admin created: admin / admin123');
  }

  // Seed default subscription if not exists
  const subCount = db.prepare('SELECT count(*) as count FROM subscription').get();
  if (subCount.count === 0) {
    const validDate = new Date();
    validDate.setDate(validDate.getDate() + 30); // 30 days valid from today
    db.prepare(`
      INSERT INTO subscription (plan_name, monthly_price, status, valid_until, billing_cycle, last_payment_date, last_payment_ref, notes)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      'FD Professional Tier',
      1999.00,
      'ACTIVE',
      validDate.toISOString().split('T')[0],
      'MONTHLY',
      new Date().toISOString().split('T')[0],
      'PAY-INIT-001',
      'Standard Monthly CRM Subscription for FD Management'
    );
  }

  // Seed settings
  const settingsCount = db.prepare('SELECT count(*) as count FROM settings').get();
  if (settingsCount.count === 0) {
    const defaultSettings = [
      ['company_name', 'Fixed Deposit & Wealth Services'],
      ['company_tagline', 'Fixed Deposit & Wealth Management Portal'],
      ['phone', '+91 98765 43210'],
      ['email', 'support@fdwealthdesk.com'],
      ['address', 'Office 402, Financial District, Sector 18, Commercial Hub'],
      ['license_no', 'NBFC-FD/REG/2026/894'],
      ['senior_bonus_rate', '0.50'],
      ['default_penalty_rate', '1.00'],
      ['whatsapp_reminder_days', '3'],
      ['whatsapp_auto_send', '1'],
      ['whatsapp_provider', 'whatsapp_web'], // 'whatsapp_web' or 'meta_api' or 'ultramsg'
      ['whatsapp_api_token', ''],
      ['whatsapp_instance_id', ''],
      ['whatsapp_payout_template', 'नमस्ते {CUSTOMER_NAME} जी! 🙏\n\nआपके Fixed Deposit ({FD_NUMBER}) का अगला ब्याज पेआउट / किस्त ₹{AMOUNT} दिनांक {DUE_DATE} को आपके बैंक खाते ({BANK_NAME}) में जमा होने के लिए निर्धारित है।\n\nकिसी भी सहायता के लिए संपर्क करें: {COMPANY_PHONE}\nधन्यवाद,\n{COMPANY_NAME}'],
      ['whatsapp_maturity_template', 'नमस्ते {CUSTOMER_NAME} जी! 🙏\n\nसूचित किया जाता है कि आपका Fixed Deposit ({FD_NUMBER}) कुल मैच्योरिटी राशि ₹{AMOUNT} दिनांक {DUE_DATE} को परिपक्व (Mature) होने जा रहा है।\n\nइसे आगे रीन्यू कराने या रिडेम्पशन के लिए संपर्क करें: {COMPANY_PHONE}\nधन्यवाद,\n{COMPANY_NAME}'],
      ['terms_conditions', '1. Premature withdrawal subject to 1% penalty as per RBI / NBFC guidelines.\n2. TDS applicable as per Income Tax regulations.\n3. Deposit receipt must be surrendered at maturity or renewal.']
    ];
    const insertSetting = db.prepare('INSERT INTO settings (key, value) VALUES (?, ?)');
    defaultSettings.forEach(([k, v]) => insertSetting.run(k, v));
  }

  // Ensure default status for existing customer records without legacy app-access credentials
  try {
    db.exec("UPDATE customers SET status = 'ACTIVE' WHERE status IS NULL;");
  } catch(e){}
  try { db.exec("ALTER TABLE approval_requests ADD COLUMN decision_remarks TEXT;"); } catch(e){}
  try { db.exec("ALTER TABLE approval_requests ADD COLUMN decision_date DATETIME;"); } catch(e){}
  try { db.exec("ALTER TABLE approval_requests ADD COLUMN decided_at DATETIME;"); } catch(e){}

  // Ensure rich 5-client functional demo data & Agent Network if tables are empty (unless switched to blank client handover mode)
  try {
    let isBlankMode = false;
    try {
      const bm = db.prepare("SELECT value FROM settings WHERE key = 'blank_crm_mode'").get();
      isBlankMode = bm && bm.value === '1';
    } catch (e) {}

    const custCount = db.prepare('SELECT count(*) as count FROM customers').get();
    let misCount = { count: 0 };
    try { misCount = db.prepare('SELECT count(*) as count FROM mis_accounts').get(); } catch(e){}
    let rankCount = { count: 0 };
    try { rankCount = db.prepare('SELECT count(*) as count FROM agent_ranks').get(); } catch(e){}
    let centerCount = { count: 0 };
    try { centerCount = db.prepare('SELECT count(*) as count FROM collection_centers').get(); } catch(e){}
    if (!isBlankMode && (!custCount || custCount.count === 0 || !misCount || misCount.count === 0 || !rankCount || rankCount.count === 0 || !centerCount || centerCount.count === 0)) {
      const { seedComplete5ClientData } = require('./seedData');
      seedComplete5ClientData(db);
    }

    // Seed realistic sample daily expenses & cash in/out entries if empty
    try {
      const expCount = db.prepare('SELECT count(*) as count FROM daily_expenses').get();
      if (!isBlankMode && (!expCount || expCount.count === 0)) {
        const today = new Date().toISOString().split('T')[0];
        const insExp = db.prepare(`
          INSERT INTO daily_expenses (expense_voucher_no, expense_date, category, category_name, amount, payment_mode, paid_to, bill_number, narration, created_by_user_id)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 1)
        `);
        insExp.run('EXP-20261118-001', today, 'TEA_REFRESHMENT', 'Tea & Refreshment / Pantry', 180.00, 'CASH', 'Raju Tea & Snacks Stall', 'BILL-104', 'Morning & evening tea, coffee and biscuits for office staff & visitors');
        insExp.run('EXP-20261118-002', today, 'STATIONERY', 'Office Stationery & Printing', 350.00, 'CASH', 'Kailash Book Depot', 'INV-5521', '2 Paper rims A4, blue pens, stapler pins and register');
        insExp.run('EXP-20261118-003', today, 'CONVEYANCE', 'Field Conveyance & Fuel', 240.00, 'CASH', 'Sunil Kumar (Field Executive)', 'PETROL-01', 'Petrol reimbursement for client doorstep document collection');
        insExp.run('EXP-20261118-004', today, 'CLEANING', 'Cleaning & Office Maintenance', 150.00, 'CASH', 'Ramesh Sweeper', 'VCH-03', 'Office floor cleaner liquid, dusters and trash bags');
        insExp.run('EXP-20261118-005', today, 'UTILITY', 'Electricity, Internet & Mobile', 1199.00, 'BANK_ONLINE', 'Airtel Broadband Office Fibernet', 'AIRTEL-NOV-49', 'Monthly office high-speed internet lease line connection');
      }

      // Seed realistic Gold Loans if empty
      try {
        const glCount = db.prepare('SELECT count(*) as count FROM gold_loans').get();
        if (!isBlankMode && (!glCount || glCount.count === 0)) {
          const today = new Date().toISOString().split('T')[0];
          const insGL = db.prepare(`
            INSERT INTO gold_loans (
              loan_number, customer_id, customer_name, customer_phone, gold_items_detail,
              pouch_number, locker_location, gross_weight_grams, net_weight_grams, purity_karat,
              valuation_rate_per_gram, total_gold_valuation, ltv_percentage, sanctioned_amount,
              disbursed_amount, interest_rate, tenure_months, monthly_interest, outstanding_principal,
              total_recovered, status, disbursal_date, maturity_date
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          `);

          insGL.run(
            'GL-2026-001', 1, 'Prahlad Singh', '9876543210', '2 Gold Bangles + 1 Gold Chain',
            'POUCH-GL-101', 'Locker Vault A-1', 48.5, 45.0, 22,
            6800.00, 306000.00, 75.0, 225000.00,
            225000.00, 15.0, 12, 2812.50, 212500.00,
            12500.00, 'ACTIVE', today, '2027-11-18'
          );

          insGL.run(
            'GL-2026-002', 2, 'Sunita Rani', '9811223344', '1 Mangalsutra + 2 Gold Rings',
            'POUCH-GL-102', 'Locker Vault A-2', 24.0, 21.5, 22,
            6800.00, 146200.00, 75.0, 100000.00,
            100000.00, 15.0, 12, 1250.00, 100000.00,
            0.0, 'ACTIVE', today, '2027-11-18'
          );
        }
      } catch(e) {
        console.error('Error seeding gold loans:', e.message);
      }

      // Seed realistic Udhar & Borrowings if empty
      try {
        const udharCount = db.prepare('SELECT count(*) as count FROM borrowings_udhar').get();
        if (!isBlankMode && (!udharCount || udharCount.count === 0)) {
          const today = new Date().toISOString().split('T')[0];
          const insUdhar = db.prepare(`
            INSERT INTO borrowings_udhar (
              voucher_no, lender_name, phone, borrowing_date, amount, interest_rate,
              payment_mode, due_date, amount_repaid, outstanding_balance, status, narration
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          `);

          insUdhar.run(
            'UDHAR-2026-001', 'Ramesh Chandra (Director Hand Loan)', '9412000000', today,
            50000.00, 0.0, 'CASH', '2026-12-18', 0.0, 50000.00, 'ACTIVE',
            'Interest-free temporary hand loan taken from Director for branch cash vault buffer'
          );

          insUdhar.run(
            'UDHAR-2026-002', 'Aggarwal Finance Bijnor', '9837000000', today,
            100000.00, 12.0, 'BANK_ONLINE', '2027-02-18', 20000.00, 80000.00, 'ACTIVE',
            'Short-term unsecured borrowing taken via bank transfer for working capital'
          );
        }
      } catch(e) {
        console.error('Error seeding borrowings:', e.message);
      }

      // Seed day_book_cash_entries (Both Input / Inflow and Output / Outflow)
      const cashEntryCount = db.prepare('SELECT count(*) as count FROM day_book_cash_entries').get();
      if (!isBlankMode && (!cashEntryCount || cashEntryCount.count === 0)) {
        const today = new Date().toISOString().split('T')[0];
        const insCash = db.prepare(`
          INSERT INTO day_book_cash_entries (
            voucher_no, entry_type, entry_date, category, category_name, amount, payment_mode, party_name, reference_no, narration, created_by_user_id
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)
        `);

        // 1. INPUT (आवक / रुपया आया / Receipts - Collections, Deposits, Gold Loan Recovery, Udhar Liya)
        insCash.run('IN-20261118-001', 'INFLOW', today, 'DAILY_COLLECTION', 'Daily RD & Deposit Collection', 15000.00, 'CASH', 'Advisor Sunil Kumar (ADV0001)', 'COL-REC-892', 'Daily evening field collection received from market centers');
        insCash.run('IN-20261118-002', 'INFLOW', today, 'SAVINGS_DEPOSIT', 'Savings A/C Cash Deposit', 25000.00, 'CASH', 'Prahlad Singh (SB-00001)', 'DEP-SLIP-401', 'Counter cash deposit into member savings account');
        insCash.run('IN-20261118-003', 'INFLOW', today, 'DIRECT_NEFT_DEPOSIT', 'NEFT Online Term Deposit Inflow', 100000.00, 'BANK_ONLINE', 'Narpat Singh (MIS-00203)', 'UTR-PNB2026111801', 'Bank NEFT deposit credit for new Monthly Income Scheme (MIS)');
        insCash.run('IN-20261118-004', 'INFLOW', today, 'MEMBERSHIP_FEE', 'New Member Share & Admission Fee', 1100.00, 'CASH', 'Mukesh Sharma (M00008)', 'SHR-108', '10 Equity shares @ ₹100 + ₹100 membership admission fee');
        insCash.run('IN-20261118-005', 'INFLOW', today, 'GOLD_LOAN_RECOVERY', 'Gold Loan EMI / Principal Recovery', 12500.00, 'CASH', 'Prahlad Singh (GL-2026-001)', 'GL-REC-101', 'Monthly interest and principal part recovery for Gold Loan');
        insCash.run('IN-20261118-006', 'INFLOW', today, 'BORROWING_INFLOW', 'उधार लिया (Money Borrowed / Udhar Inflow)', 50000.00, 'CASH', 'Ramesh Chandra (Director Hand Loan)', 'UDHAR-IN-01', 'Interest-free cash borrowed for branch vault liquidity');

        // 2. OUTPUT (जावक / रुपया गया / Payments & Expenses - Office Expenses, Gold Loan Disbursed, Udhar Lautaya)
        insCash.run('OUT-20261118-001', 'OUTFLOW', today, 'TEA_REFRESHMENT', 'Tea, Coffee & Pantry', 180.00, 'CASH', 'Raju Tea & Snacks Stall', 'BILL-104', 'Morning & evening tea, coffee and biscuits for office staff & visitors');
        insCash.run('OUT-20261118-002', 'OUTFLOW', today, 'OFFICE_STATIONERY', 'Office Stationery & Printing', 350.00, 'CASH', 'Kailash Book Depot', 'INV-5521', '2 Paper rims A4, blue pens, stapler pins and register');
        insCash.run('OUT-20261118-003', 'OUTFLOW', today, 'CONVEYANCE', 'Field Conveyance & Fuel', 240.00, 'CASH', 'Sunil Kumar (Field Executive)', 'PETROL-01', 'Petrol reimbursement for client doorstep document collection');
        insCash.run('OUT-20261118-004', 'OUTFLOW', today, 'OFFICE_MAINTENANCE', 'Cleaning & Office Maintenance', 150.00, 'CASH', 'Ramesh Sweeper', 'VCH-03', 'Office floor cleaner liquid, dusters and trash bags');
        insCash.run('OUT-20261118-005', 'OUTFLOW', today, 'UTILITIES', 'Electricity, Internet & Mobile', 1199.00, 'BANK_ONLINE', 'Airtel Broadband Office Fibernet', 'AIRTEL-NOV-49', 'Monthly office high-speed internet lease line connection');
        insCash.run('OUT-20261118-006', 'OUTFLOW', today, 'SAVINGS_WITHDRAWAL', 'Savings A/C Cash Withdrawal', 12000.00, 'CASH', 'Rahul Sharma (SB-00004)', 'WDL-SLIP-088', 'Counter cash withdrawal by account holder');
        insCash.run('OUT-20261118-007', 'OUTFLOW', today, 'GOLD_LOAN_DISBURSEMENT', 'Gold Loan Cash Disbursement', 75000.00, 'CASH', 'Sunita Rani (GL-2026-002)', 'GL-DISB-102', 'Gold loan cash disbursed against 22K gold ornaments');
        insCash.run('OUT-20261118-008', 'OUTFLOW', today, 'BORROWING_REPAYMENT', 'उधार लौटाया (Borrowing Repaid / Outflow)', 20000.00, 'CASH', 'Aggarwal Finance Bijnor', 'UDHAR-OUT-02', 'Hand loan partial repayment returned to lender in cash');
      }
    } catch(e) {
      console.error('Error seeding day book cash entries:', e.message);
    }

    // Performance Indexes for Zero-Latency Lookups
    try {
      // Seed Core Ledger Accounts matching admin.taranganjali.com if empty
      const ledCount = db.prepare('SELECT count(*) as count FROM ledger_accounts').get();
      if (!ledCount || ledCount.count === 0) {
        const insLed = db.prepare(`
          INSERT INTO ledger_accounts (code, name, system_name, group_name, type, is_system, show_in_db, is_bank_account, risk_percent, sort_order)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `);
        insLed.run('LED-001', 'TARPL MAIN', 'tarpl_main', 'CASH & CASH EQUIVALENT', 'Asset', 1, 1, 0, 0, 1);
        insLed.run('LED-002', 'WALLET BALANCE', 'wallet_balance_asset', 'CASH & CASH EQUIVALENT', 'Asset', 1, 1, 0, 0, 2);
        insLed.run('102', 'CASH BOOK', 'cash_book', 'CASH & CASH EQUIVALENT', 'Asset', 1, 1, 0, 0, 3);
        insLed.run('103', 'BANK BOOK', 'bank_book', 'CASH & CASH EQUIVALENT', 'Asset', 1, 1, 1, 0, 4);
        insLed.run('LED-005', 'NEW FD RD MIS', 'new_fd_rd_mis', 'FIXED DEPOSITS / TERM LIABILITIES', 'Liability', 1, 1, 0, 0, 5);
        insLed.run('LED-006', 'WALLET BALANCE', 'wallet_balance_liability', 'ADVISOR WALLET LIABILITY', 'Liability', 1, 1, 0, 0, 6);
        insLed.run('LED-007', 'SAVING ACCOUNTS', 'saving_accounts', 'DEMAND LIABILITIES', 'Liability', 1, 1, 0, 0, 7);
        insLed.run('LED-008', 'RD ACCOUNTS', 'rd_accounts', 'RECURRING LIABILITIES', 'Liability', 1, 1, 0, 0, 8);
        insLed.run('LED-009', 'DD ACCOUNTS', 'dd_accounts', 'DAILY DEPOSIT LIABILITIES', 'Liability', 1, 1, 0, 0, 9);
        insLed.run('LED-010', 'GOLD LOAN BOOK', 'gold_loan_book', 'SECURED LOANS & ADVANCES', 'Asset', 1, 0, 0, 0, 10);
        insLed.run('LED-011', 'BORROWINGS & UDHAR', 'borrowings_udhar', 'UNSECURED BORROWINGS', 'Liability', 1, 0, 0, 0, 11);
      }

      db.exec(`
        CREATE INDEX IF NOT EXISTS idx_fds_customer_id ON fixed_deposits(customer_id);
        CREATE INDEX IF NOT EXISTS idx_rds_customer_id ON recurring_deposits(customer_id);
        CREATE INDEX IF NOT EXISTS idx_mis_customer_id ON mis_accounts(customer_id);
        CREATE INDEX IF NOT EXISTS idx_savings_customer_id ON savings_accounts(customer_id);
        CREATE INDEX IF NOT EXISTS idx_lad_customer_id ON loans_against_deposit(customer_id);
        CREATE INDEX IF NOT EXISTS idx_gold_loans_customer_id ON gold_loans(customer_id);
        CREATE INDEX IF NOT EXISTS idx_customers_code ON customers(customer_code);
        CREATE INDEX IF NOT EXISTS idx_customers_phone ON customers(phone);
        CREATE INDEX IF NOT EXISTS idx_customers_name ON customers(full_name);
        CREATE INDEX IF NOT EXISTS idx_rd_installments_rd_id ON rd_installments(rd_id, status);
        CREATE INDEX IF NOT EXISTS idx_mis_schedules_mis_id ON mis_payout_schedules(mis_id, status);
        CREATE INDEX IF NOT EXISTS idx_savings_txns_acc_id ON savings_transactions(account_id);
        CREATE INDEX IF NOT EXISTS idx_fds_status ON fixed_deposits(status);
        CREATE INDEX IF NOT EXISTS idx_rds_status ON recurring_deposits(status);
        CREATE INDEX IF NOT EXISTS idx_mis_status ON mis_accounts(status);
      `);
    } catch(e) {
      console.error('Error creating indexes:', e.message);
    }
  } catch (e) {
    console.error('Auto-seed check error:', e.message);
  }
}

initDB();

module.exports = db;
