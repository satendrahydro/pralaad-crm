const Database = require('better-sqlite3');
const path = require('path');
const bcrypt = require('bcryptjs');

const dbPath = path.join(__dirname, 'fd_crm.sqlite');
const db = new Database(dbPath);

// Enable foreign keys and WAL mode for high performance
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

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
      full_name TEXT NOT NULL,
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
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);

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

  // Seed default admin user if not exists
  const userCount = db.prepare('SELECT count(*) as count FROM users').get();
  if (userCount.count === 0) {
    const salt = bcrypt.genSaltSync(10);
    const hash = bcrypt.hashSync('admin123', salt);
    db.prepare(`
      INSERT INTO users (username, password_hash, full_name, role)
      VALUES (?, ?, ?, ?)
    `).run('admin', hash, 'Pralaad CRM Admin', 'admin');
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
      ['company_name', 'Pralaad Financial & Wealth Services'],
      ['company_tagline', 'Fixed Deposit & Wealth Management Portal'],
      ['phone', '+91 98765 43210'],
      ['email', 'contact@pralaadwealth.com'],
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

  // Seed some realistic initial demo customers and FDs if empty so client can test immediately
  const custCount = db.prepare('SELECT count(*) as count FROM customers').get();
  if (custCount.count === 0) {
    const insertCust = db.prepare(`
      INSERT INTO customers (customer_code, full_name, phone, email, pan_card, aadhaar_no, address, bank_name, account_no, ifsc_code, nominee_name, nominee_relation, is_senior_citizen)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    insertCust.run('CUST-1001', 'Rajesh Sharma', '9811122334', 'rajesh.sharma@example.com', 'ABCPS1234F', '876543219876', 'Flat 104, Royal Palms, Mumbai', 'HDFC Bank', '50100456789012', 'HDFC0001234', 'Sunita Sharma', 'Spouse', 0);
    insertCust.run('CUST-1002', 'Mahendra Patel (Sr.)', '9822233445', 'mpatel.senior@example.com', 'BNMPM9876K', '987612345678', 'Plot 45, Green Park, Ahmedabad', 'State Bank of India', '30987654321', 'SBIN0004567', 'Chirag Patel', 'Son', 1);
    insertCust.run('CUST-1003', 'Priya Verma', '9833344556', 'priya.verma@example.com', 'CPJPV5432P', '654378901234', 'B-12, Gomti Nagar, Lucknow', 'ICICI Bank', '102345678901', 'ICIC0000890', 'Ananya Verma', 'Daughter', 0);

    // Add initial FDs
    const { calculateFD } = require('./calculator');

    // 1. Cumulative Quarterly Compounding FD (Rajesh Sharma)
    const fd1Calc = calculateFD({ principal: 500000, annualRate: 8.5, tenureMonths: 24, compoundingFrequency: 'quarterly', startDate: '2026-01-15' });
    const fd1Res = db.prepare(`
      INSERT INTO fixed_deposits (fd_number, customer_id, principal_amount, annual_rate, tenure_months, compounding_frequency, is_cumulative, payout_amount, total_interest, maturity_amount, start_date, maturity_date, status, remarks)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run('FD-2026-001', 1, 500000, 8.5, 24, 'quarterly', 1, 0, fd1Calc.totalInterest, fd1Calc.maturityAmount, '2026-01-15', fd1Calc.maturityDate, 'ACTIVE', '2 Year Growth FD Cumulative');

    // 2. Non-Cumulative Monthly Payout FD (Mahendra Patel - Senior Citizen)
    const fd2Calc = calculateFD({ principal: 1000000, annualRate: 8.5, tenureMonths: 12, compoundingFrequency: 'payout_monthly', startDate: '2026-02-01', isSeniorCitizen: true, seniorBonus: 0.5 });
    const fd2Res = db.prepare(`
      INSERT INTO fixed_deposits (fd_number, customer_id, principal_amount, annual_rate, tenure_months, compounding_frequency, is_cumulative, payout_amount, total_interest, maturity_amount, start_date, maturity_date, status, remarks)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run('FD-2026-002', 2, 1000000, 9.0, 12, 'payout_monthly', 0, fd2Calc.periodicPayout, fd2Calc.totalInterest, fd2Calc.maturityAmount, '2026-02-01', fd2Calc.maturityDate, 'ACTIVE', 'Monthly Regular Pension Payout FD');

    // Insert schedule for fd2
    const insertSchedule = db.prepare(`
      INSERT INTO fd_schedules (fd_id, period_no, payout_date, payout_amount, interest_accrued, cumulative_interest, balance, status)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);
    fd2Calc.schedule.forEach(s => {
      insertSchedule.run(fd2Res.lastInsertRowid, s.periodNo, s.payoutDate, s.payoutAmount, s.interestAccrued, s.cumulativeInterest, s.balance, 'PENDING');
    });

    // 3. Short-term FD (Priya Verma)
    const fd3Calc = calculateFD({ principal: 250000, annualRate: 7.75, tenureMonths: 6, compoundingFrequency: 'quarterly', startDate: '2026-03-01' });
    db.prepare(`
      INSERT INTO fixed_deposits (fd_number, customer_id, principal_amount, annual_rate, tenure_months, compounding_frequency, is_cumulative, payout_amount, total_interest, maturity_amount, start_date, maturity_date, status, remarks)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run('FD-2026-003', 3, 250000, 7.75, 6, 'quarterly', 1, 0, fd3Calc.totalInterest, fd3Calc.maturityAmount, '2026-03-01', fd3Calc.maturityDate, 'ACTIVE', 'Short Term FD');
  }
  // Migrations for customer app access & status
  try { db.exec("ALTER TABLE customers ADD COLUMN app_access_enabled INTEGER DEFAULT 1;"); } catch(e){}
  try { db.exec("ALTER TABLE customers ADD COLUMN status TEXT DEFAULT 'ACTIVE';"); } catch(e){}
  try { db.exec("ALTER TABLE customers ADD COLUMN login_id TEXT;"); } catch(e){}
  try { db.exec("ALTER TABLE customers ADD COLUMN login_password TEXT DEFAULT 'client123';"); } catch(e){}
  
  // Ensure default login_id and login_password for existing records
  try {
    db.exec("UPDATE customers SET login_id = customer_code WHERE login_id IS NULL OR login_id = '';");
    db.exec("UPDATE customers SET login_password = 'client123' WHERE login_password IS NULL OR login_password = '';");
    db.exec("UPDATE customers SET app_access_enabled = 1 WHERE app_access_enabled IS NULL;");
    db.exec("UPDATE customers SET status = 'ACTIVE' WHERE status IS NULL;");
  } catch(e){}
}

initDB();

module.exports = db;
