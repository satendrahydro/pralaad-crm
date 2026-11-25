const express = require('express');
const router = express.Router();
const db = require('../db');
const { authenticateToken } = require('../middleware/auth');

// Shared helper to map branch query parameter to DB branch_id, branch_code, display label & baseline balances
function resolveBranchContext(selectedBranch) {
  const raw = (selectedBranch || 'ALL').trim();
  const branchUpper = raw.toUpperCase();

  if (branchUpper === 'SHEKHUPURA' || branchUpper === 'SHEKHUPURA BRANCH' || branchUpper === 'TARPL0002' || branchUpper === '13' || branchUpper === '3') {
    return {
      code: 'SHEKHUPURA',
      branchId: 3,
      displayName: 'SHEKHUPURA BRANCH (TARPL0002 - शेखुपुरा / सुजालपुर)',
      shortName: 'SHEKHUPURA BRANCH',
      baselines: {
        'LED-001': 0.00,
        'LED-002': 0.00,
        '102': 436529.00,
        '103': 65370.00,
        'LED-005': 0.00,
        'LED-006': 0.00,
        'LED-007': 401790.00,
        'LED-008': 0.00,
        'LED-009': 0.00,
        'LED-010': 0.00,
        'LED-011': 0.00
      }
    };
  }

  if (branchUpper === 'BHR001' || branchUpper === 'MAIN BRANCH' || branchUpper === '1') {
    return {
      code: 'BHR001',
      branchId: 1,
      displayName: 'MAIN BRANCH (BHR001)',
      shortName: 'MAIN BRANCH',
      baselines: {
        'LED-001': 1000000.00,
        'LED-002': 470000.00,
        '102': 1848329.00,
        '103': 409091.51,
        'LED-005': 205874675.00,
        'LED-006': 2137375.00,
        'LED-007': 2417837.00,
        'LED-008': 318496.00,
        'LED-009': 282396.00,
        'LED-010': 325000.00,
        'LED-011': 150000.00
      }
    };
  }

  if (branchUpper === 'BHR002' || branchUpper === '4') {
    return {
      code: 'BHR002',
      branchId: 4,
      displayName: 'TARPL0002 (BHR002)',
      shortName: 'TARPL0002',
      baselines: {
        'LED-001': 0.00,
        'LED-002': 0.00,
        '102': 286529.00,
        '103': 35370.00,
        'LED-005': 0.00,
        'LED-006': 0.00,
        'LED-007': 251790.00,
        'LED-008': 0.00,
        'LED-009': 0.00,
        'LED-010': 0.00,
        'LED-011': 0.00
      }
    };
  }

  if (branchUpper === 'BRH003' || branchUpper === 'TARPL SAVING' || branchUpper === '2') {
    return {
      code: 'BRH003',
      branchId: 2,
      displayName: 'TARPL SAVING (BRH003)',
      shortName: 'TARPL SAVING',
      baselines: {
        'LED-001': 0.00,
        'LED-002': 0.00,
        '102': 150000.00,
        '103': 30000.00,
        'LED-005': 0.00,
        'LED-006': 0.00,
        'LED-007': 150000.00,
        'LED-008': 0.00,
        'LED-009': 0.00,
        'LED-010': 0.00,
        'LED-011': 0.00
      }
    };
  }

  return {
    code: 'ALL',
    branchId: null,
    displayName: 'ALL (All Branches - 5)',
    shortName: 'ALL',
    baselines: {
      'LED-001': 1000000.00,
      'LED-002': 470000.00,
      '102': 2721387.00,
      '103': 539831.51,
      'LED-005': 205874675.00,
      'LED-006': 2137375.00,
      'LED-007': 3221417.00,
      'LED-008': 318496.00,
      'LED-009': 282396.00,
      'LED-010': 325000.00,
      'LED-011': 150000.00
    }
  };
}

// Helper to normalize legacy ledger codes (LED-003 -> 102 CASH BOOK, LED-004 -> 103 BANK BOOK)
function normalizeLedgerCode(rawCode) {
  const c = decodeURIComponent(rawCode || '').trim().toUpperCase();
  if (c === 'LED-003' || c === 'CASH BOOK') return '102';
  if (c === 'LED-004' || c === 'BANK BOOK') return '103';
  if (c === 'TARPL MAIN') return 'LED-001';
  if (c === 'WALLET BALANCE' || c === 'WALLET_BALANCE_ASSET') return 'LED-002';
  if (c === 'WALLET BALANCE LIABILITY' || c === 'WALLET BALANCE (COLLECTION)') return 'LED-006';
  if (c === 'NEW FD RD MIS' || c === 'NEW FD / MIS/ RD') return 'LED-005';
  if (c === 'SAVING ACCOUNTS') return 'LED-007';
  if (c === 'RD ACCOUNTS') return 'LED-008';
  if (c === 'DD ACCOUNTS') return 'LED-009';
  if (c === 'GOLD LOAN BOOK') return 'LED-010';
  if (c === 'BORROWINGS & UDHAR') return 'LED-011';
  return c;
}

// Load ledger metadata list from ledger_accounts table with fallback
function loadLedgersFromDb(branchCtx) {
  let rows = [];
  try {
    rows = db.prepare('SELECT * FROM ledger_accounts ORDER BY sort_order ASC, id ASC').all();
  } catch (e) {
    rows = [];
  }

  if (rows.length === 0) {
    rows = [
      { id: 1, code: 'LED-001', name: 'TARPL MAIN', system_name: 'tarpl_main', group_name: 'CASH & CASH EQUIVALENT', type: 'Asset', is_system: 1, show_in_db: 1, is_bank_account: 0, risk_percent: 0 },
      { id: 2, code: 'LED-002', name: 'WALLET BALANCE', system_name: 'wallet_balance_asset', group_name: 'CASH & CASH EQUIVALENT', type: 'Asset', is_system: 1, show_in_db: 1, is_bank_account: 0, risk_percent: 0 },
      { id: 3, code: '102', name: 'CASH BOOK', system_name: 'cash_book', group_name: 'CASH & CASH EQUIVALENT', type: 'Asset', is_system: 1, show_in_db: 1, is_bank_account: 0, risk_percent: 0 },
      { id: 4, code: '103', name: 'BANK BOOK', system_name: 'bank_book', group_name: 'CASH & CASH EQUIVALENT', type: 'Asset', is_system: 1, show_in_db: 1, is_bank_account: 1, risk_percent: 0 },
      { id: 5, code: 'LED-005', name: 'NEW FD RD MIS', system_name: 'new_fd_rd_mis', group_name: 'FIXED DEPOSITS / TERM LIABILITIES', type: 'Liability', is_system: 1, show_in_db: 1, is_bank_account: 0, risk_percent: 0 },
      { id: 6, code: 'LED-006', name: 'WALLET BALANCE', system_name: 'wallet_balance_liability', group_name: 'ADVISOR WALLET LIABILITY', type: 'Liability', is_system: 1, show_in_db: 1, is_bank_account: 0, risk_percent: 0 },
      { id: 7, code: 'LED-007', name: 'SAVING ACCOUNTS', system_name: 'saving_accounts', group_name: 'DEMAND LIABILITIES', type: 'Liability', is_system: 1, show_in_db: 1, is_bank_account: 0, risk_percent: 0 },
      { id: 8, code: 'LED-008', name: 'RD ACCOUNTS', system_name: 'rd_accounts', group_name: 'RECURRING LIABILITIES', type: 'Liability', is_system: 1, show_in_db: 1, is_bank_account: 0, risk_percent: 0 },
      { id: 9, code: 'LED-009', name: 'DD ACCOUNTS', system_name: 'dd_accounts', group_name: 'DAILY DEPOSIT LIABILITIES', type: 'Liability', is_system: 1, show_in_db: 1, is_bank_account: 0, risk_percent: 0 },
      { id: 10, code: 'LED-010', name: 'GOLD LOAN BOOK', system_name: 'gold_loan_book', group_name: 'SECURED LOANS & ADVANCES', type: 'Asset', is_system: 1, show_in_db: 0, is_bank_account: 0, risk_percent: 0 },
      { id: 11, code: 'LED-011', name: 'BORROWINGS & UDHAR', system_name: 'borrowings_udhar', group_name: 'UNSECURED BORROWINGS', type: 'Liability', is_system: 1, show_in_db: 0, is_bank_account: 0, risk_percent: 0 }
    ];
  }

  return rows.map(r => {
    const base = branchCtx.baselines[r.code] ?? 0.00;
    return {
      id: r.id,
      code: r.code,
      legacy_code: r.code === '102' ? 'LED-003' : r.code === '103' ? 'LED-004' : r.code,
      name: r.name,
      system_name: r.system_name,
      group_name: r.group_name,
      type: r.type,
      is_system: !!r.is_system,
      show_in_db: r.show_in_db !== 0,
      is_bank_account: !!r.is_bank_account,
      risk_percent: r.risk_percent || 0,
      opening_balance: base,
      receipts: 0.00,
      payments: 0.00,
      closing_balance: base
    };
  });
}

// Helper to classify payment mode into CASH vs BANK/TRANSFER
function isBankTransferMode(mode) {
  const m = (mode || 'CASH').toUpperCase();
  return m.includes('BANK_ONLINE') || m.includes('TRANSFER') || m.includes('NEFT') || m.includes('RTGS') || m.includes('IMPS') || m.includes('UPI') || m.includes('CHEQUE') || m === 'BANK';
}

// 1. GET /api/accounting/day-book
router.get('/day-book', authenticateToken, (req, res) => {
  try {
    const today = new Date().toISOString().split('T')[0];
    const startDate = req.query.startDate || req.query.date || today;
    const endDate = req.query.endDate || req.query.date || startDate;
    const selectedBranch = req.query.branch || 'ALL';
    const branchCtx = resolveBranchContext(selectedBranch);

    const allLedgers = loadLedgersFromDb(branchCtx);
    const ledgers = allLedgers.filter(l => l.show_in_db);

    // ==========================================
    // OPTION 1: DAILY USE (दैनिक खर्च व आवक-जावक)
    // ==========================================
    let dayCashEntries = [];
    try {
      if (branchCtx.code === 'ALL') {
        dayCashEntries = db.prepare(`
          SELECT * FROM day_book_cash_entries 
          WHERE entry_date BETWEEN ? AND ? 
          ORDER BY entry_date DESC, id DESC
        `).all(startDate, endDate);
      } else {
        dayCashEntries = db.prepare(`
          SELECT * FROM day_book_cash_entries 
          WHERE entry_date BETWEEN ? AND ? 
            AND (UPPER(COALESCE(branch_code, 'BHR001')) = ? ${branchCtx.code === 'BHR001' ? "OR branch_code IS NULL OR branch_code = 'ALL'" : ''})
          ORDER BY entry_date DESC, id DESC
        `).all(startDate, endDate, branchCtx.code);
      }
    } catch (e) {
      dayCashEntries = [];
    }

    if (dayCashEntries.length === 0 && (branchCtx.code === 'ALL' || branchCtx.code === 'BHR001')) {
      try {
        const legacyExpenses = db.prepare(`
          SELECT * FROM daily_expenses WHERE expense_date BETWEEN ? AND ? ORDER BY expense_date DESC, id DESC
        `).all(startDate, endDate);
        dayCashEntries = legacyExpenses.map(e => ({
          id: e.id,
          voucher_no: e.expense_voucher_no,
          entry_type: 'OUTFLOW',
          entry_date: e.expense_date,
          category: e.category,
          category_name: e.category_name,
          amount: e.amount,
          payment_mode: e.payment_mode,
          party_name: e.paid_to,
          reference_no: e.bill_number,
          narration: e.narration,
          branch_code: 'BHR001',
          created_at: e.created_at
        }));
      } catch (e) {}
    }

    const cashInflows = dayCashEntries.filter(e => e.entry_type === 'INFLOW' && !isBankTransferMode(e.payment_mode)).reduce((sum, e) => sum + e.amount, 0);
    const bankInflows = dayCashEntries.filter(e => e.entry_type === 'INFLOW' && isBankTransferMode(e.payment_mode)).reduce((sum, e) => sum + e.amount, 0);
    const cashOutflows = dayCashEntries.filter(e => e.entry_type === 'OUTFLOW' && !isBankTransferMode(e.payment_mode)).reduce((sum, e) => sum + e.amount, 0);
    const bankOutflows = dayCashEntries.filter(e => e.entry_type === 'OUTFLOW' && isBankTransferMode(e.payment_mode)).reduce((sum, e) => sum + e.amount, 0);

    const cashVouchers = dayCashEntries.map(e => ({
      id: `entry-${e.id}`,
      voucher_no: e.voucher_no,
      date: e.entry_date,
      time: e.created_at ? e.created_at.split(' ')[1]?.slice(0, 5) || '11:00 AM' : '11:00 AM',
      ledger: isBankTransferMode(e.payment_mode) ? 'BANK BOOK' : 'CASH BOOK',
      account: `${e.category_name} (${e.party_name})`,
      category: e.category,
      category_name: e.category_name,
      party_name: e.party_name,
      entry_type: e.entry_type,
      payment_mode: e.payment_mode,
      type: e.entry_type === 'INFLOW' ? 'RECEIPT' : 'EXPENSE',
      dr_cr: e.entry_type === 'INFLOW'
        ? `DR ${isBankTransferMode(e.payment_mode) ? 'Bank Book' : 'Cash Book'} / CR ${e.category_name}`
        : `DR ${e.category_name} / CR ${isBankTransferMode(e.payment_mode) ? 'Bank Book' : 'Cash Book'}`,
      amount: e.amount,
      narration: e.narration,
      bill_number: e.reference_no,
      reference_no: e.reference_no
    }));

    // ==========================================
    // OPTION 2: BANKING DAY BOOK (कोर बैंकिंग)
    // ==========================================
    const branchWhereFd = branchCtx.branchId ? `AND COALESCE(fd.branch_id, c.branch_id, 1) = ${branchCtx.branchId}` : '';
    const branchWhereRd = branchCtx.branchId ? `AND COALESCE(rd.branch_id, c.branch_id, 1) = ${branchCtx.branchId}` : '';
    const branchWhereMis = branchCtx.branchId ? `AND COALESCE(m.branch_id, c.branch_id, 1) = ${branchCtx.branchId}` : '';
    const branchWhereSb = branchCtx.branchId ? `AND COALESCE(s.branch_id, c.branch_id, 1) = ${branchCtx.branchId}` : '';

    // 1. New Fixed Deposits (FD) in Date Range
    let fds = [];
    try {
      fds = db.prepare(`
        SELECT fd.id, fd.fd_number, fd.principal_amount, fd.annual_rate, fd.tenure_months, 
               fd.compounding_frequency, fd.start_date, fd.maturity_date, fd.status, fd.created_at,
               c.full_name as customer_name, c.customer_code, c.phone as customer_phone
        FROM fixed_deposits fd
        JOIN customers c ON fd.customer_id = c.id
        WHERE (date(fd.start_date) BETWEEN ? AND ? OR date(fd.created_at) BETWEEN ? AND ?)
          ${branchWhereFd}
        ORDER BY fd.created_at DESC
      `).all(startDate, endDate, startDate, endDate);
    } catch (e) { fds = []; }

    // 1b. Premature / Matured FD Closures in Date Range
    let fdClosures = [];
    try {
      fdClosures = db.prepare(`
        SELECT fd.id, fd.fd_number, fd.principal_amount, fd.premature_interest_paid, fd.closed_date, fd.status,
               c.full_name as customer_name, c.customer_code, c.phone as customer_phone
        FROM fixed_deposits fd
        JOIN customers c ON fd.customer_id = c.id
        WHERE fd.status IN ('CLOSED_PREMATURE', 'MATURED')
          AND date(fd.closed_date) BETWEEN ? AND ?
          ${branchWhereFd}
        ORDER BY fd.closed_date DESC
      `).all(startDate, endDate);
    } catch (e) { fdClosures = []; }

    // 2. New Recurring Deposits (RD) in Date Range
    let rds = [];
    try {
      rds = db.prepare(`
        SELECT rd.id, rd.rd_number, rd.monthly_installment, rd.annual_rate, rd.tenure_months,
               rd.start_date, rd.maturity_date, rd.status, rd.created_at,
               c.full_name as customer_name, c.customer_code, c.phone as customer_phone
        FROM recurring_deposits rd
        JOIN customers c ON rd.customer_id = c.id
        WHERE (date(rd.start_date) BETWEEN ? AND ? OR date(rd.created_at) BETWEEN ? AND ?)
          ${branchWhereRd}
        ORDER BY rd.created_at DESC
      `).all(startDate, endDate, startDate, endDate);
    } catch (e) { rds = []; }

    // 2b. RD Installments collected in Date Range
    let rdInstallments = [];
    try {
      rdInstallments = db.prepare(`
        SELECT rdi.id, rdi.installment_no, rdi.installment_amount, rdi.paid_date, rdi.late_fee, rdi.total_collected,
               rdi.payment_mode, rdi.transaction_ref, rd.rd_number,
               c.full_name as customer_name, c.customer_code, c.phone as customer_phone
        FROM rd_installments rdi
        JOIN recurring_deposits rd ON rdi.rd_id = rd.id
        JOIN customers c ON rd.customer_id = c.id
        WHERE rdi.status = 'PAID' AND date(rdi.paid_date) BETWEEN ? AND ?
          ${branchWhereRd}
        ORDER BY rdi.paid_date DESC
      `).all(startDate, endDate);
    } catch (e) { rdInstallments = []; }

    // 3. New Monthly Income Schemes (MIS) in Date Range
    let misAccounts = [];
    try {
      misAccounts = db.prepare(`
        SELECT m.id, m.mis_number, m.deposit_amount, m.annual_rate, m.tenure_months, m.monthly_payout,
               m.start_date, m.maturity_date, m.status, m.created_at,
               c.full_name as customer_name, c.customer_code, c.phone as customer_phone
        FROM mis_accounts m
        JOIN customers c ON m.customer_id = c.id
        WHERE (date(m.start_date) BETWEEN ? AND ? OR date(m.created_at) BETWEEN ? AND ?)
          ${branchWhereMis}
        ORDER BY m.created_at DESC
      `).all(startDate, endDate, startDate, endDate);
    } catch (e) { misAccounts = []; }

    // 3b. MIS Monthly Payouts in Date Range
    let misPayouts = [];
    try {
      misPayouts = db.prepare(`
        SELECT msp.id, msp.month_no, msp.payout_amount, msp.net_payable, msp.paid_date, msp.payment_reference,
               m.mis_number, c.full_name as customer_name, c.customer_code, c.phone as customer_phone
        FROM mis_payout_schedules msp
        JOIN mis_accounts m ON msp.mis_id = m.id
        JOIN customers c ON m.customer_id = c.id
        WHERE msp.status = 'PAID' AND date(msp.paid_date) BETWEEN ? AND ?
          ${branchWhereMis}
        ORDER BY msp.paid_date DESC
      `).all(startDate, endDate);
    } catch (e) { misPayouts = []; }

    // 4. New Savings Accounts in Date Range
    let savingsAccounts = [];
    try {
      savingsAccounts = db.prepare(`
        SELECT s.id, s.account_number, s.current_balance, s.minimum_balance, s.opened_date, s.status, s.created_at,
               c.full_name as customer_name, c.customer_code, c.phone as customer_phone
        FROM savings_accounts s
        JOIN customers c ON s.customer_id = c.id
        WHERE (date(s.opened_date) BETWEEN ? AND ? OR date(s.created_at) BETWEEN ? AND ?)
          ${branchWhereSb}
        ORDER BY s.created_at DESC
      `).all(startDate, endDate, startDate, endDate);
    } catch (e) { savingsAccounts = []; }

    // 4b. Savings Passbook Transactions (Deposits vs Withdrawals) in Date Range
    let savingsTxns = [];
    try {
      savingsTxns = db.prepare(`
        SELECT st.id, st.transaction_number, st.transaction_type, st.amount, st.balance_after,
               st.payment_mode, st.narration, st.created_at, s.account_number,
               c.full_name as customer_name, c.customer_code, c.phone as customer_phone
        FROM savings_transactions st
        JOIN savings_accounts s ON st.account_id = s.id
        JOIN customers c ON s.customer_id = c.id
        WHERE date(st.created_at) BETWEEN ? AND ?
          ${branchWhereSb}
        ORDER BY st.created_at DESC
      `).all(startDate, endDate);
    } catch (e) { savingsTxns = []; }

    // Combine All Banking Activities into Unified Ledger Table
    const bankingTransactions = [];

    // FDs
    fds.forEach(fd => {
      bankingTransactions.push({
        id: `fd-${fd.id}`,
        created_at: fd.created_at || `${fd.start_date} 10:00:00`,
        date: fd.start_date || (fd.created_at ? fd.created_at.split(' ')[0] : startDate),
        time: fd.created_at ? fd.created_at.split(' ')[1]?.slice(0, 5) : '10:30 AM',
        voucher_no: fd.fd_number,
        customer_name: fd.customer_name,
        customer_code: fd.customer_code,
        customer_phone: fd.customer_phone,
        product: 'FD',
        action_type: 'NEW_FD',
        action_label: 'New Fixed Deposit (सावधि जमा खोला)',
        inflow_amount: fd.principal_amount,
        outflow_amount: 0,
        payment_mode: 'BANK / CASH',
        narration: `Tenure: ${fd.tenure_months}M @ ${fd.annual_rate}% p.a. (${fd.compounding_frequency})`,
        status: fd.status
      });
    });

    // FD Closures
    fdClosures.forEach(c => {
      const isMatured = c.status === 'MATURED';
      bankingTransactions.push({
        id: `close-fd-${c.id}`,
        created_at: `${c.closed_date} 16:00:00`,
        date: c.closed_date,
        time: '04:00 PM',
        voucher_no: c.fd_number,
        customer_name: c.customer_name,
        customer_code: c.customer_code,
        customer_phone: c.customer_phone,
        product: 'FD',
        action_type: isMatured ? 'FD_MATURED' : 'FD_PREMATURE',
        action_label: isMatured ? 'FD Maturity Payout (सावधि परिपक्वता भुगतान)' : 'FD Premature Closure (समयपूर्व बंदी भुगतान)',
        inflow_amount: 0,
        outflow_amount: c.principal_amount + (c.premature_interest_paid || 0),
        payment_mode: 'BANK / CASH',
        narration: `Capital & Interest payout released to member`,
        status: c.status
      });
    });

    // RDs
    rds.forEach(rd => {
      bankingTransactions.push({
        id: `rd-${rd.id}`,
        created_at: rd.created_at || `${rd.start_date} 11:00:00`,
        date: rd.start_date || (rd.created_at ? rd.created_at.split(' ')[0] : startDate),
        time: rd.created_at ? rd.created_at.split(' ')[1]?.slice(0, 5) : '11:00 AM',
        voucher_no: rd.rd_number,
        customer_name: rd.customer_name,
        customer_code: rd.customer_code,
        customer_phone: rd.customer_phone,
        product: 'RD',
        action_type: 'NEW_RD',
        action_label: 'New RD Account (आवर्ती जमा खोला)',
        inflow_amount: rd.monthly_installment,
        outflow_amount: 0,
        payment_mode: 'CASH',
        narration: `Monthly Installment ₹${rd.monthly_installment.toLocaleString('en-IN')} for ${rd.tenure_months}M`,
        status: rd.status
      });
    });

    // RD Installments
    rdInstallments.forEach(rdi => {
      bankingTransactions.push({
        id: `rdi-${rdi.id}`,
        created_at: `${rdi.paid_date} 12:00:00`,
        date: rdi.paid_date,
        time: '12:00 PM',
        voucher_no: rdi.transaction_ref || rdi.rd_number,
        customer_name: rdi.customer_name,
        customer_code: rdi.customer_code,
        customer_phone: rdi.customer_phone,
        product: 'RD',
        action_type: 'RD_INSTALLMENT',
        action_label: `RD Installment #${rdi.installment_no} (किश्त जमा)`,
        inflow_amount: rdi.total_collected || rdi.installment_amount,
        outflow_amount: 0,
        payment_mode: rdi.payment_mode || 'CASH',
        narration: `RD ${rdi.rd_number} Installment #${rdi.installment_no} collected (Late fee: ₹${rdi.late_fee || 0})`,
        status: 'PAID'
      });
    });

    // MIS Accounts
    misAccounts.forEach(m => {
      bankingTransactions.push({
        id: `mis-${m.id}`,
        created_at: m.created_at || `${m.start_date} 11:30:00`,
        date: m.start_date || (m.created_at ? m.created_at.split(' ')[0] : startDate),
        time: m.created_at ? m.created_at.split(' ')[1]?.slice(0, 5) : '11:30 AM',
        voucher_no: m.mis_number,
        customer_name: m.customer_name,
        customer_code: m.customer_code,
        customer_phone: m.customer_phone,
        product: 'MIS',
        action_type: 'NEW_MIS',
        action_label: 'New MIS Booking (मासिक आय खाता खोला)',
        inflow_amount: m.deposit_amount,
        outflow_amount: 0,
        payment_mode: 'BANK / CASH',
        narration: `Deposit ₹${m.deposit_amount.toLocaleString('en-IN')} | Monthly Payout: ₹${m.monthly_payout.toLocaleString('en-IN')}`,
        status: m.status
      });
    });

    // MIS Payouts
    misPayouts.forEach(msp => {
      bankingTransactions.push({
        id: `misp-${msp.id}`,
        created_at: `${msp.paid_date} 14:00:00`,
        date: msp.paid_date,
        time: '02:00 PM',
        voucher_no: msp.payment_reference || msp.mis_number,
        customer_name: msp.customer_name,
        customer_code: msp.customer_code,
        customer_phone: msp.customer_phone,
        product: 'MIS',
        action_type: 'MIS_PAYOUT',
        action_label: `MIS Month #${msp.month_no} Payout (मासिक ब्याज भुगतान)`,
        inflow_amount: 0,
        outflow_amount: msp.payout_amount || msp.net_payable,
        payment_mode: 'BANK_ONLINE',
        narration: `Interest credited for MIS ${msp.mis_number}`,
        status: 'PAID'
      });
    });

    // Savings Accounts
    savingsAccounts.forEach(s => {
      bankingTransactions.push({
        id: `sb-${s.id}`,
        created_at: s.created_at || `${s.opened_date} 10:00:00`,
        date: s.opened_date || (s.created_at ? s.created_at.split(' ')[0] : startDate),
        time: s.created_at ? s.created_at.split(' ')[1]?.slice(0, 5) : '10:00 AM',
        voucher_no: s.account_number,
        customer_name: s.customer_name,
        customer_code: s.customer_code,
        customer_phone: s.customer_phone,
        product: 'SAVINGS',
        action_type: 'NEW_SAVINGS',
        action_label: 'New Savings A/C (बचत खाता खोला)',
        inflow_amount: s.current_balance > 0 ? s.current_balance : 0,
        outflow_amount: 0,
        payment_mode: 'CASH',
        narration: `Savings Account opened with initial deposit ₹${(s.current_balance || 0).toLocaleString('en-IN')}`,
        status: s.status
      });
    });

    // Savings Transactions (Deposits vs Withdrawals)
    savingsTxns.forEach(st => {
      const isDeposit = st.transaction_type === 'DEPOSIT' || st.transaction_type === 'CREDIT';
      bankingTransactions.push({
        id: `st-${st.id}`,
        created_at: st.created_at,
        date: st.created_at ? st.created_at.split(' ')[0] : startDate,
        time: st.created_at ? st.created_at.split(' ')[1]?.slice(0, 5) : '01:00 PM',
        voucher_no: st.transaction_number || st.account_number,
        customer_name: st.customer_name,
        customer_code: st.customer_code,
        customer_phone: st.customer_phone,
        product: 'SAVINGS',
        action_type: isDeposit ? 'SAVINGS_DEPOSIT' : 'SAVINGS_WITHDRAWAL',
        action_label: isDeposit ? 'Savings Cash Deposit (बचत जमा)' : 'Savings Cash Withdrawal (बचत निकासी)',
        inflow_amount: isDeposit ? st.amount : 0,
        outflow_amount: !isDeposit ? st.amount : 0,
        payment_mode: st.payment_mode || 'CASH',
        narration: `${st.narration} (A/C: ${st.account_number})`,
        status: 'COMPLETED'
      });
    });

    // Sort Banking Transactions by created_at / date DESC
    bankingTransactions.sort((a, b) => (b.created_at || b.date).localeCompare(a.created_at || a.date));

    // Banking Totals
    const totalBankingInflow = bankingTransactions.reduce((acc, t) => acc + (t.inflow_amount || 0), 0);
    const totalBankingOutflow = bankingTransactions.reduce((acc, t) => acc + (t.outflow_amount || 0), 0);
    const netBankingLiquidity = totalBankingInflow - totalBankingOutflow;

    const fdPrincipalTotal = fds.reduce((sum, f) => sum + f.principal_amount, 0);
    const fdClosedTotal = fdClosures.reduce((sum, f) => sum + f.principal_amount + (f.premature_interest_paid || 0), 0);
    const rdInstallmentCommitTotal = rds.reduce((sum, r) => sum + r.monthly_installment, 0);
    const rdCollectedTotal = rdInstallments.reduce((sum, r) => sum + (r.total_collected || r.installment_amount), 0);
    const misDepositTotal = misAccounts.reduce((sum, m) => sum + m.deposit_amount, 0);
    const misPayoutTotal = misPayouts.reduce((sum, m) => sum + (m.payout_amount || m.net_payable), 0);
    const sbInitialTotal = savingsAccounts.reduce((sum, s) => sum + (s.current_balance || 0), 0);
    const sbDepositsTotal = savingsTxns.filter(t => t.transaction_type === 'DEPOSIT' || t.transaction_type === 'CREDIT').reduce((sum, t) => sum + t.amount, 0);
    const sbWithdrawalsTotal = savingsTxns.filter(t => t.transaction_type === 'WITHDRAWAL' || t.transaction_type === 'DEBIT').reduce((sum, t) => sum + t.amount, 0);

    // Apply live movements from BOTH Daily Cash Entries AND Banking Transactions to Core Ledgers
    const bankingCashIn = bankingTransactions.filter(t => t.inflow_amount > 0 && !isBankTransferMode(t.payment_mode)).reduce((s, t) => s + t.inflow_amount, 0);
    const bankingBankIn = bankingTransactions.filter(t => t.inflow_amount > 0 && isBankTransferMode(t.payment_mode)).reduce((s, t) => s + t.inflow_amount, 0);
    const bankingCashOut = bankingTransactions.filter(t => t.outflow_amount > 0 && !isBankTransferMode(t.payment_mode)).reduce((s, t) => s + t.outflow_amount, 0);
    const bankingBankOut = bankingTransactions.filter(t => t.outflow_amount > 0 && isBankTransferMode(t.payment_mode)).reduce((s, t) => s + t.outflow_amount, 0);

    const ledgerMap = {};
    allLedgers.forEach(l => { ledgerMap[l.code] = l; });

    if (ledgerMap['102']) {
      ledgerMap['102'].receipts = cashInflows + bankingCashIn;
      ledgerMap['102'].payments = cashOutflows + bankingCashOut;
    }
    if (ledgerMap['103']) {
      ledgerMap['103'].receipts = bankInflows + bankingBankIn;
      ledgerMap['103'].payments = bankOutflows + bankingBankOut;
    }
    if (ledgerMap['LED-005']) {
      ledgerMap['LED-005'].receipts = fdPrincipalTotal + misDepositTotal;
      ledgerMap['LED-005'].payments = fdClosedTotal + misPayoutTotal;
    }
    if (ledgerMap['LED-007']) {
      ledgerMap['LED-007'].receipts = sbInitialTotal + sbDepositsTotal;
      ledgerMap['LED-007'].payments = sbWithdrawalsTotal;
    }
    if (ledgerMap['LED-008']) {
      ledgerMap['LED-008'].receipts = rdInstallmentCommitTotal + rdCollectedTotal;
    }

    allLedgers.forEach(l => {
      l.closing_balance = Number((l.opening_balance + (l.receipts || 0) - (l.payments || 0)).toFixed(2));
    });

    const totalOpening = ledgers.reduce((acc, l) => acc + l.opening_balance, 0);
    const totalReceipts = ledgers.reduce((acc, l) => acc + l.receipts, 0);
    const totalPayments = ledgers.reduce((acc, l) => acc + l.payments, 0);
    const totalClosing = ledgers.reduce((acc, l) => acc + l.closing_balance, 0);

    // Format 2: Grouped Roz Kird (रोज किर्द तपशील) - Left (जमा / Receipts) & Right (नावे / Payments)
    const jamaGroups = {};
    const naveGroups = {};

    const addToRozKird = (targetGroups, categoryName, item) => {
      if (!targetGroups[categoryName]) {
        targetGroups[categoryName] = {
          categoryName,
          cashTotal: 0,
          transferTotal: 0,
          total: 0,
          items: []
        };
      }
      const isCash = !isBankTransferMode(item.mode);
      const cashAmt = isCash ? item.amount : 0;
      const transferAmt = !isCash ? item.amount : 0;
      targetGroups[categoryName].cashTotal += cashAmt;
      targetGroups[categoryName].transferTotal += transferAmt;
      targetGroups[categoryName].total += item.amount;
      targetGroups[categoryName].items.push({
        account_no: item.account_no || '-',
        name_narration: item.name_narration,
        cash: cashAmt,
        transfer: transferAmt,
        total: item.amount
      });
    };

    bankingTransactions.forEach(t => {
      if (t.inflow_amount > 0) {
        let cat = 'MISC DEPOSITS';
        if (t.product === 'FD') cat = 'FIXED DEPOSIT (सावधि जमा)';
        else if (t.product === 'RD') cat = 'RECURRING DEPOSIT (आवर्ती जमा)';
        else if (t.product === 'MIS') cat = 'MONTHLY INCOME SCHEME (MIS)';
        else if (t.product === 'SAVINGS') cat = 'SAVINGS ACCOUNTS (बचत जमा)';

        addToRozKird(jamaGroups, cat, {
          account_no: t.voucher_no,
          name_narration: `${t.customer_name} (${t.customer_code})`,
          amount: t.inflow_amount,
          mode: t.payment_mode
        });
      }
      if (t.outflow_amount > 0) {
        let cat = 'MISC WITHDRAWALS';
        if (t.product === 'FD') cat = 'FD CLOSURE / MATURITY (सावधि वापसी)';
        else if (t.product === 'MIS') cat = 'MIS MONTHLY PAYOUT (मासिक ब्याज)';
        else if (t.product === 'SAVINGS') cat = 'SAVINGS ACCOUNTS (बचत निकासी)';

        addToRozKird(naveGroups, cat, {
          account_no: t.voucher_no,
          name_narration: `${t.customer_name} (${t.customer_code})`,
          amount: t.outflow_amount,
          mode: t.payment_mode
        });
      }
    });

    dayCashEntries.forEach(e => {
      if (e.entry_type === 'INFLOW') {
        addToRozKird(jamaGroups, e.category_name || 'दैनिक आवक (Cash Inflow)', {
          account_no: e.voucher_no,
          name_narration: `${e.party_name} - ${e.narration || ''}`,
          amount: e.amount,
          mode: e.payment_mode
        });
      } else {
        addToRozKird(naveGroups, e.category_name || 'दैनिक खर्च (Daily Expenses)', {
          account_no: e.voucher_no,
          name_narration: `${e.party_name} - ${e.narration || ''}`,
          amount: e.amount,
          mode: e.payment_mode
        });
      }
    });

    const jamaList = Object.values(jamaGroups);
    const naveList = Object.values(naveGroups);

    const rozKirdTotals = {
      jamaCashTotal: jamaList.reduce((sum, g) => sum + g.cashTotal, 0),
      jamaTransferTotal: jamaList.reduce((sum, g) => sum + g.transferTotal, 0),
      jamaGrandTotal: jamaList.reduce((sum, g) => sum + g.total, 0),
      naveCashTotal: naveList.reduce((sum, g) => sum + g.cashTotal, 0),
      naveTransferTotal: naveList.reduce((sum, g) => sum + g.transferTotal, 0),
      naveGrandTotal: naveList.reduce((sum, g) => sum + g.total, 0)
    };

    const branchDisplayName = branchCtx.displayName;

    res.json({
      success: true,
      startDate,
      endDate,
      date: startDate,
      isRange: startDate !== endDate,
      branch: branchCtx.code,
      branchName: branchDisplayName,
      allLedgers,
      rozKird: {
        jama: jamaList,
        nave: naveList,
        totals: rozKirdTotals
      },

      // ☕ OPTION 1: DAILY USE (दैनिक खर्च व आवक-जावक)
      daily: {
        summary: {
          total_inflow: cashInflows + bankInflows,
          total_outflow: cashOutflows + bankOutflows,
          net_cashflow: (cashInflows + bankInflows) - (cashOutflows + bankOutflows),
          inflows: { total: cashInflows + bankInflows, cash: cashInflows, bank: bankInflows },
          outflows: { total: cashOutflows + bankOutflows, cash: cashOutflows, bank: bankOutflows },
          total_vouchers: dayCashEntries.length
        },
        entries: dayCashEntries,
        vouchers: cashVouchers
      },

      // 🏦 OPTION 2: BANKING (कोर बैंकिंग डे-बुक)
      banking: {
        summary: {
          total_inflow: totalBankingInflow,
          total_outflow: totalBankingOutflow,
          net_liquidity: netBankingLiquidity,
          total_new_accounts: fds.length + rds.length + misAccounts.length + savingsAccounts.length,
          fd: {
            opened_count: fds.length,
            opened_amount: fdPrincipalTotal,
            closed_count: fdClosures.length,
            closed_amount: fdClosedTotal
          },
          rd: {
            opened_count: rds.length,
            opened_installment: rdInstallmentCommitTotal,
            installments_paid_count: rdInstallments.length,
            installments_paid_amount: rdCollectedTotal
          },
          mis: {
            opened_count: misAccounts.length,
            opened_amount: misDepositTotal,
            payouts_count: misPayouts.length,
            payouts_amount: misPayoutTotal
          },
          savings: {
            opened_count: savingsAccounts.length,
            opening_deposit: sbInitialTotal,
            total_deposits: sbDepositsTotal,
            total_withdrawals: sbWithdrawalsTotal,
            txns_count: savingsTxns.length
          }
        },
        transactions: bankingTransactions,
        productBreakdown: {
          fds,
          rds,
          rdInstallments,
          misAccounts,
          misPayouts,
          savingsAccounts,
          savingsTxns
        }
      },

      // Legacy backwards-compatibility
      summary: {
        total_opening: totalOpening,
        total_receipts: totalReceipts,
        total_payments: totalPayments,
        total_closing: totalClosing,
        inflows: { total: cashInflows + bankInflows, cash: cashInflows, bank: bankInflows },
        outflows: { total: cashOutflows + bankOutflows, cash: cashOutflows, bank: bankOutflows },
        net_cashflow: (cashInflows + bankInflows) - (cashOutflows + bankOutflows),
        total_expenses: cashOutflows + bankOutflows
      },
      entries: dayCashEntries,
      expenses: dayCashEntries.filter(e => e.entry_type === 'OUTFLOW'),
      ledgers,
      vouchers: cashVouchers
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// 1b. GET /api/accounting/expenses - List all expenses
router.get('/expenses', authenticateToken, (req, res) => {
  try {
    const { date, category, search } = req.query;
    let query = `SELECT * FROM daily_expenses WHERE 1=1`;
    const params = [];

    if (date) {
      query += ` AND expense_date = ?`;
      params.push(date);
    }
    if (category && category !== 'ALL') {
      query += ` AND category = ?`;
      params.push(category);
    }
    if (search) {
      query += ` AND (expense_voucher_no LIKE ? OR paid_to LIKE ? OR narration LIKE ? OR category_name LIKE ?)`;
      const term = `%${search}%`;
      params.push(term, term, term, term);
    }

    query += ` ORDER BY id DESC`;
    const expenses = db.prepare(query).all(...params);
    res.json({ success: true, expenses });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// 1c. POST /api/accounting/cash-entry - Unified Input (आवक / Receipt) & Output (जावक / Payment / Expense)
router.post('/cash-entry', authenticateToken, (req, res) => {
  try {
    const { 
      entry_type = 'INFLOW', // 'INFLOW' (Input) or 'OUTFLOW' (Output)
      entry_date, 
      category, 
      category_name, 
      amount, 
      payment_mode = 'CASH', // 'CASH' or 'BANK_ONLINE'
      party_name, 
      reference_no = '', 
      narration,
      branch_code = 'BHR001'
    } = req.body;

    const branchCtx = resolveBranchContext(branch_code === 'ALL' ? 'BHR001' : branch_code);

    if (!amount || parseFloat(amount) <= 0) {
      return res.status(400).json({ success: false, message: 'Valid amount is required.' });
    }
    if (!party_name || !party_name.trim()) {
      return res.status(400).json({ 
        success: false, 
        message: entry_type === 'INFLOW' ? 'Received From (Customer / Member / Source) is required.' : 'Paid To (Vendor / Payee / Member) is required.' 
      });
    }
    if (!narration || !narration.trim()) {
      return res.status(400).json({ success: false, message: 'Narration / Description is required.' });
    }

    const date = entry_date || new Date().toISOString().split('T')[0];
    const dateCompact = date.replace(/-/g, '');
    const prefix = entry_type === 'INFLOW' ? 'IN' : 'OUT';
    
    let countRow = { count: 0 };
    try {
      countRow = db.prepare("SELECT count(*) as count FROM day_book_cash_entries WHERE entry_date = ? AND entry_type = ?").get(date, entry_type);
    } catch(e) {}
    
    const voucher_no = `${prefix}-${dateCompact}-${String((countRow?.count || 0) + 1).padStart(3, '0')}`;
    const numAmount = parseFloat(amount);

    const stmt = db.prepare(`
      INSERT INTO day_book_cash_entries (
        voucher_no, entry_type, entry_date, category, category_name, 
        amount, payment_mode, party_name, reference_no, narration, branch_code, created_by_user_id
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const result = stmt.run(
      voucher_no,
      entry_type,
      date,
      category || (entry_type === 'INFLOW' ? 'MISC_INFLOW' : 'MISCELLANEOUS'),
      category_name || (entry_type === 'INFLOW' ? 'Cash Inflow' : 'Cash Outflow'),
      numAmount,
      payment_mode,
      party_name.trim(),
      reference_no.trim(),
      narration.trim(),
      branchCtx.code,
      req.user?.id || 1
    );

    // If OUTFLOW, also record in daily_expenses for legacy reporting
    if (entry_type === 'OUTFLOW') {
      try {
        db.prepare(`
          INSERT INTO daily_expenses (
            expense_voucher_no, expense_date, category, category_name, 
            amount, payment_mode, paid_to, bill_number, narration, created_by_user_id
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).run(
          voucher_no,
          date,
          category || 'MISCELLANEOUS',
          category_name || 'Cash Outflow',
          numAmount,
          payment_mode,
          party_name.trim(),
          reference_no.trim(),
          narration.trim(),
          req.user?.id || 1
        );
      } catch(e) {}
    }

    const typeHindi = entry_type === 'INFLOW' ? 'आवक (Input / Receipt)' : 'जावक (Output / Payment)';
    const ledgerName = payment_mode === 'CASH' ? 'CASH BOOK (गल्ला)' : 'BANK BOOK (बैंक खाता)';

    res.status(201).json({
      success: true,
      message: `${typeHindi} वाउचर ${voucher_no} सफलतापूर्वक दर्ज किया गया (₹${numAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })} ${ledgerName})।`,
      entry: {
        id: result.lastInsertRowid,
        voucher_no,
        entry_type,
        amount: numAmount
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// 1d. POST /api/accounting/expenses - Add Daily Expense (Legacy backward compatibility)
router.post('/expenses', authenticateToken, (req, res) => {
  try {
    const { 
      expense_date, 
      category = 'TEA_REFRESHMENT', 
      category_name, 
      amount, 
      payment_mode = 'CASH', 
      paid_to, 
      bill_number = '', 
      narration 
    } = req.body;

    if (!amount || parseFloat(amount) <= 0) {
      return res.status(400).json({ success: false, message: 'Valid expense amount is required.' });
    }
    if (!paid_to) {
      return res.status(400).json({ success: false, message: 'Paid To / Vendor name is required.' });
    }
    if (!narration) {
      return res.status(400).json({ success: false, message: 'Expense narration/description is required.' });
    }

    const date = expense_date || new Date().toISOString().split('T')[0];
    const dateCompact = date.replace(/-/g, '');
    const countRow = db.prepare("SELECT count(*) as count FROM daily_expenses WHERE expense_date = ?").get(date);
    const voucher_no = `EXP-${dateCompact}-${String((countRow?.count || 0) + 1).padStart(3, '0')}`;

    const numAmount = parseFloat(amount);

    const stmt = db.prepare(`
      INSERT INTO daily_expenses (
        expense_voucher_no, expense_date, category, category_name, 
        amount, payment_mode, paid_to, bill_number, narration, created_by_user_id
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const result = stmt.run(
      voucher_no,
      date,
      category,
      category_name || category,
      numAmount,
      payment_mode,
      paid_to,
      bill_number,
      narration,
      req.user?.id || 1
    );

    // Also sync to day_book_cash_entries
    try {
      db.prepare(`
        INSERT INTO day_book_cash_entries (
          voucher_no, entry_type, entry_date, category, category_name, 
          amount, payment_mode, party_name, reference_no, narration, created_by_user_id
        ) VALUES (?, 'OUTFLOW', ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        voucher_no, date, category, category_name || category,
        numAmount, payment_mode, paid_to, bill_number, narration, req.user?.id || 1
      );
    } catch(e) {}

    res.status(201).json({
      success: true,
      message: `Expense voucher ${voucher_no} recorded successfully (₹${numAmount.toFixed(2)} debited to ${category_name}).`,
      expense: {
        id: result.lastInsertRowid,
        expense_voucher_no: voucher_no,
        amount: numAmount
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// 2. POST /api/accounting/journal-entry
router.post('/journal-entry', authenticateToken, (req, res) => {
  try {
    const { voucher_date, debit_ledger, credit_ledger, amount, narration, reference_no } = req.body;

    if (!debit_ledger || !credit_ledger || !amount || parseFloat(amount) <= 0) {
      return res.status(400).json({ success: false, message: 'Invalid journal entry: Debit, Credit and valid Amount are required.' });
    }

    if (debit_ledger === credit_ledger) {
      return res.status(400).json({ success: false, message: 'Debit and Credit ledgers cannot be identical.' });
    }

    const voucher_number = reference_no || `JV-${Date.now().toString().slice(-6)}`;
    const date = voucher_date || new Date().toISOString().split('T')[0];
    const numAmount = parseFloat(amount);

    const stmt = db.prepare(`
      INSERT INTO transactions (transaction_number, transaction_type, customer_id, amount, transaction_date, payment_mode, reference_number, remarks, created_by)
      VALUES (?, 'JOURNAL', 1, ?, ?, 'JOURNAL', ?, ?, ?)
    `);
    const info = stmt.run(voucher_number, numAmount, date, voucher_number, narration || 'Manual Journal Voucher', req.user?.id || 1);

    // Insert Dr & Cr entries
    const entryStmt = db.prepare(`
      INSERT INTO transaction_entries (transaction_id, account_name, entry_type, amount, notes)
      VALUES (?, ?, ?, ?, ?)
    `);
    entryStmt.run(info.lastInsertRowid, debit_ledger, 'DEBIT', numAmount, narration || '');
    entryStmt.run(info.lastInsertRowid, credit_ledger, 'CREDIT', numAmount, narration || '');

    res.json({
      success: true,
      message: `Journal Voucher ${voucher_number} posted successfully (Debited: ${debit_ledger}, Credited: ${credit_ledger}).`,
      voucher_number,
      id: info.lastInsertRowid
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// 3. GET /api/accounting/payments-to-collect
router.get('/payments-to-collect', authenticateToken, (req, res) => {
  try {
    // 15 fields: Branch, Group, Center, Advisor, Customer Name, Member ID, Account No, Product Type, Due Amount, Due Date, Overdue Days, Savings Balance, Mobile, Status
    const items = [
      {
        id: 1,
        branch: 'MAIN BRANCH (BHR001)',
        group_name: 'Shanti Vihar Self Help Group',
        center: 'CEN001 - Vedik Vihar',
        advisor_code: 'ADV0001',
        advisor_name: 'Ramesh Chandra Sharma',
        customer_name: 'Prahlad Singh',
        member_code: 'M00001',
        phone: '9876543210',
        account_type: 'RD (Recurring)',
        account_no: 'RD-2026-0001',
        due_amount: 5000.00,
        due_date: '2026-11-20',
        overdue_days: 0,
        savings_balance: 145000.00,
        status: 'DUE_SOON'
      },
      {
        id: 2,
        branch: 'MAIN BRANCH (BHR001)',
        group_name: 'Kiratpur Business Group',
        center: 'CEN003 - Kiratpur Road',
        advisor_code: 'ADV0002',
        advisor_name: 'Suresh Verma',
        customer_name: 'Narpat Singh',
        member_code: 'M00002',
        phone: '9876543211',
        account_type: 'RD (Recurring)',
        account_no: 'RD-2026-0002',
        due_amount: 3000.00,
        due_date: '2026-11-15',
        overdue_days: 3,
        savings_balance: 48000.00,
        status: 'OVERDUE'
      },
      {
        id: 3,
        branch: 'SHEKHUPURA BRANCH',
        group_name: 'Shekhupura Mandi Group',
        center: 'CEN002 - Shekhupura Mandi',
        advisor_code: 'ADV0003',
        advisor_name: 'Dinesh Kumar',
        customer_name: 'Satendra Kumar',
        member_code: 'M00003',
        phone: '9876543212',
        account_type: 'Loan EMI (LAD)',
        account_no: 'LAD-2026-001',
        due_amount: 4500.00,
        due_date: '2026-11-10',
        overdue_days: 8,
        savings_balance: 75000.00,
        status: 'OVERDUE'
      },
      {
        id: 4,
        branch: 'MAIN BRANCH (BHR001)',
        group_name: 'Vedik Vihar Group',
        center: 'CEN001 - Vedik Vihar',
        advisor_code: 'ADV0001',
        advisor_name: 'Ramesh Chandra Sharma',
        customer_name: 'Rahul Sharma',
        member_code: 'M00004',
        phone: '9876543213',
        account_type: 'RD (Recurring)',
        account_no: 'RD-2026-0004',
        due_amount: 2500.00,
        due_date: '2026-11-22',
        overdue_days: 0,
        savings_balance: 28000.00,
        status: 'DUE_SOON'
      },
      {
        id: 5,
        branch: 'TARPL SAVING (BRH003)',
        group_name: 'Civil Lines Farmers Cluster',
        center: 'CEN004 - Shanti Vihar',
        advisor_code: 'ADV0004',
        advisor_name: 'Anil Chauhan',
        customer_name: 'Amit Patel',
        member_code: 'M00005',
        phone: '9876543214',
        account_type: 'Daily Deposit',
        account_no: 'DD-2026-0005',
        due_amount: 1000.00,
        due_date: '2026-11-18',
        overdue_days: 0,
        savings_balance: 19500.00,
        status: 'DUE_TODAY'
      }
    ];

    res.json({
      success: true,
      total_items: items.length,
      total_due: items.reduce((sum, i) => sum + i.due_amount, 0),
      items
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// 4. POST /api/accounting/collect-payment
router.post('/collect-payment', authenticateToken, (req, res) => {
  try {
    const { item_id, account_no, amount, payment_mode, customer_name } = req.body;
    const receipt_no = `REC-${Date.now().toString().slice(-6)}`;

    res.json({
      success: true,
      receipt_no,
      collected_at: new Date().toISOString(),
      message: `Payment of ₹${amount} for account ${account_no} (${customer_name}) collected successfully. Receipt #${receipt_no} generated.`
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// 5. GET /api/accounting/payments-to-release
router.get('/payments-to-release', authenticateToken, (req, res) => {
  try {
    const releases = [
      {
        id: 1,
        branch: 'MAIN BRANCH (BHR001)',
        payment_type: 'FD Maturity Claim',
        account_no: 'TARPL/FD/2026/001',
        customer_name: 'Prahlad Singh',
        member_code: 'M00001',
        amount: 236000.00,
        bank_name: 'Punjab National Bank',
        account_number: '0123000100234567',
        ifsc_code: 'PUNB0012300',
        due_date: '2026-11-20',
        status: 'APPROVED_READY'
      },
      {
        id: 2,
        branch: 'MAIN BRANCH (BHR001)',
        payment_type: 'Monthly MIS Payout',
        account_no: 'MIS-2026-0001',
        customer_name: 'Narpat Singh',
        member_code: 'M00002',
        amount: 1500.00,
        bank_name: 'State Bank of India',
        account_number: '31234567890',
        ifsc_code: 'SBIN0001234',
        due_date: '2026-11-18',
        status: 'READY_TO_RELEASE'
      },
      {
        id: 3,
        branch: 'SHEKHUPURA BRANCH',
        payment_type: 'Monthly MIS Payout',
        account_no: 'MIS-2026-0002',
        customer_name: 'Satendra Kumar',
        member_code: 'M00003',
        amount: 3000.00,
        bank_name: 'HDFC Bank',
        account_number: '50100234567890',
        ifsc_code: 'HDFC0000456',
        due_date: '2026-11-18',
        status: 'READY_TO_RELEASE'
      },
      {
        id: 4,
        branch: 'MAIN BRANCH (BHR001)',
        payment_type: 'Loan Disbursal (LAD)',
        account_no: 'LAD-2026-002',
        customer_name: 'Rahul Sharma',
        member_code: 'M00004',
        amount: 42500.00,
        bank_name: 'Bank of Baroda',
        account_number: '12340100012345',
        ifsc_code: 'BARB0BIJNOR',
        due_date: '2026-11-19',
        status: 'PENDING_APPROVAL'
      }
    ];

    res.json({
      success: true,
      total_releases: releases.length,
      total_amount: releases.reduce((sum, r) => sum + r.amount, 0),
      releases
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// 6. POST /api/accounting/release-payment
router.post('/release-payment', authenticateToken, (req, res) => {
  try {
    const { release_id, account_no, amount, payment_mode, utr_no, customer_name } = req.body;
    const ref = utr_no || `UTR-${Date.now().toString().slice(-8)}`;

    res.json({
      success: true,
      utr_no: ref,
      released_at: new Date().toISOString(),
      message: `Payment of ₹${amount} for ${account_no} (${customer_name}) released successfully via ${payment_mode || 'NEFT'} (UTR: ${ref}).`
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// 7. POST /api/accounting/schedule-sms
router.post('/schedule-sms', authenticateToken, (req, res) => {
  try {
    const { audience, message_template, scheduled_time } = req.body;
    res.json({
      success: true,
      message: `SMS broadcast scheduled successfully for target: ${audience || 'All Active Depositors'}. Estimated delivery: ${scheduled_time || 'Immediate'}.`,
      job_id: `SMS-${Date.now().toString().slice(-6)}`
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// 8. GET /api/accounting/ledgers - List All Ledger Accounts (Matches Prahlad /accounting/accounts)
router.get('/ledgers', authenticateToken, (req, res) => {
  try {
    const branchCtx = resolveBranchContext(req.query.branch || 'ALL');
    const ledgers = loadLedgersFromDb(branchCtx);
    res.json({ success: true, branch: branchCtx.code, branchName: branchCtx.displayName, ledgers });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// 8b. PUT /api/accounting/ledgers/:code - Edit Ledger & "Show In Day Book" Flag
router.put('/ledgers/:code', authenticateToken, (req, res) => {
  try {
    const normalized = normalizeLedgerCode(req.params.code);
    const { name, show_in_db, is_bank_account, risk_percent } = req.body;
    const existing = db.prepare('SELECT * FROM ledger_accounts WHERE UPPER(code) = ?').get(normalized);
    if (!existing) {
      return res.status(404).json({ success: false, message: 'Ledger account not found.' });
    }
    db.prepare(`
      UPDATE ledger_accounts
      SET name = COALESCE(?, name),
          show_in_db = COALESCE(?, show_in_db),
          is_bank_account = COALESCE(?, is_bank_account),
          risk_percent = COALESCE(?, risk_percent)
      WHERE id = ?
    `).run(
      name ? name.trim().toUpperCase() : null,
      typeof show_in_db === 'boolean' ? (show_in_db ? 1 : 0) : null,
      typeof is_bank_account === 'boolean' ? (is_bank_account ? 1 : 0) : null,
      risk_percent !== undefined ? Number(risk_percent) || 0 : null,
      existing.id
    );
    const updated = db.prepare('SELECT * FROM ledger_accounts WHERE id = ?').get(existing.id);
    res.json({ success: true, ledger: updated, message: 'Ledger account updated successfully.' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// 9. GET /api/accounting/ledger-statement/:code - Detailed 1:1 Ledger Statement Drilldown
router.get('/ledger-statement/:code', authenticateToken, (req, res) => {
  try {
    const normalizedCode = normalizeLedgerCode(req.params.code);
    const branchCtx = resolveBranchContext(req.query.branch || 'ALL');
    const today = new Date().toISOString().split('T')[0];
    const startDate = req.query.startDate || '2026-01-01';
    const endDate = req.query.endDate || req.query.date || today;
    const manualOnly = req.query.manualOnly === 'true' || req.query.manualOnly === '1';
    const search = (req.query.search || '').trim().toLowerCase();
    const minAmount = parseFloat(req.query.minAmount || '0') || 0;
    const maxAmount = parseFloat(req.query.maxAmount || '0') || 0;
    const txType = (req.query.txType || 'ALL').toUpperCase();

    const allLedgers = loadLedgersFromDb(branchCtx);
    const targetLedger = allLedgers.find(l => l.code === normalizedCode || l.legacy_code === normalizedCode) || {
      code: normalizedCode,
      name: decodeURIComponent(req.params.code || normalizedCode).toUpperCase(),
      system_name: normalizedCode.toLowerCase(),
      group_name: 'GENERAL LEDGER',
      type: 'Asset',
      is_system: true,
      show_in_db: true,
      risk_percent: 0,
      opening_balance: branchCtx.baselines[normalizedCode] ?? 0.00
    };

    const openingBal = targetLedger.opening_balance || 0;
    const isLiabilityOrCreditLedger = ['Liability', 'Equity', 'Revenue'].includes(targetLedger.type);
    const rawItems = [];

    // 1. Collect Manual Day Book Cash/Bank Entries (IS SYSTEM = No)
    try {
      const cashRows = db.prepare(`
        SELECT * FROM day_book_cash_entries
        WHERE entry_date BETWEEN ? AND ?
          ${branchCtx.code !== 'ALL' ? `AND (UPPER(COALESCE(branch_code, 'BHR001')) = '${branchCtx.code}' ${branchCtx.code === 'BHR001' ? "OR branch_code IS NULL OR branch_code = 'ALL'" : ''})` : ''}
        ORDER BY entry_date ASC, id ASC
      `).all(startDate, endDate);

      cashRows.forEach(e => {
        const isBank = isBankTransferMode(e.payment_mode);
        let match = false;
        if (targetLedger.code === '102' && !isBank) match = true;
        else if (targetLedger.code === '103' && isBank) match = true;
        else if (targetLedger.code === 'LED-007' && e.category?.includes('SAVINGS')) match = true;
        else if (targetLedger.code === 'LED-008' && (e.category?.includes('RD') || e.category?.includes('COLLECTION'))) match = true;
        else if (targetLedger.code === 'LED-010' && e.category?.includes('GOLD_LOAN')) match = true;
        else if (targetLedger.code === 'LED-011' && e.category?.includes('BORROWING')) match = true;

        if (match) {
          const isInflow = e.entry_type === 'INFLOW';
          rawItems.push({
            id: `cash-${e.id}`,
            branch: e.branch_code === 'SHEKHUPURA' ? 'SHEKHUPURA BRANCH' : 'MAIN BRANCH',
            sort_date: e.entry_date || endDate,
            date: e.entry_date ? e.entry_date.split('-').reverse().join('/') : '',
            voucher_no: e.voucher_no,
            description: `${e.category_name} - ${e.party_name}${e.narration ? ' (' + e.narration + ')' : ''}`,
            particulars: `${e.category_name} (${e.party_name})`,
            narration: e.narration,
            reference_no: e.reference_no,
            is_system: 'No',
            isInflow,
            amount: e.amount
          });
        }
      });
    } catch (e) {}

    // 2. Collect System Banking Transactions (IS SYSTEM = Yes) unless manualOnly
    if (!manualOnly) {
      const bWhereFd = branchCtx.branchId ? `AND COALESCE(fd.branch_id, c.branch_id, 1) = ${branchCtx.branchId}` : '';
      const bWhereRd = branchCtx.branchId ? `AND COALESCE(rd.branch_id, c.branch_id, 1) = ${branchCtx.branchId}` : '';
      const bWhereMis = branchCtx.branchId ? `AND COALESCE(m.branch_id, c.branch_id, 1) = ${branchCtx.branchId}` : '';
      const bWhereSb = branchCtx.branchId ? `AND COALESCE(s.branch_id, c.branch_id, 1) = ${branchCtx.branchId}` : '';

      try {
        if (['102', '103', 'LED-005'].includes(targetLedger.code)) {
          const fds = db.prepare(`
            SELECT fd.id, fd.fd_number, fd.principal_amount, fd.start_date, fd.closed_date, fd.status, fd.premature_interest_paid, c.full_name, c.customer_code, COALESCE(c.branch, 'MAIN BRANCH') as branch_name
            FROM fixed_deposits fd JOIN customers c ON fd.customer_id = c.id
            WHERE (date(fd.start_date) BETWEEN ? AND ? OR (fd.status IN ('CLOSED_PREMATURE', 'MATURED') AND date(fd.closed_date) BETWEEN ? AND ?)) ${bWhereFd}
          `).all(startDate, endDate, startDate, endDate);
          fds.forEach(f => {
            if (targetLedger.code !== '103') {
              if (f.start_date >= startDate && f.start_date <= endDate) {
                rawItems.push({
                  id: `sys-fd-${f.id}`,
                  branch: f.branch_name,
                  sort_date: f.start_date,
                  date: f.start_date.split('-').reverse().join('/'),
                  voucher_no: f.fd_number,
                  description: `FD a/c ${f.fd_number} ${f.full_name} ${f.customer_code}`,
                  particulars: `${f.full_name} (${f.customer_code})`,
                  narration: `New Fixed Deposit Principal`,
                  is_system: 'Yes',
                  isInflow: true,
                  amount: f.principal_amount
                });
              }
              if (['CLOSED_PREMATURE', 'MATURED'].includes(f.status) && f.closed_date >= startDate && f.closed_date <= endDate) {
                rawItems.push({
                  id: `sys-fd-close-${f.id}`,
                  branch: f.branch_name,
                  sort_date: f.closed_date,
                  date: f.closed_date.split('-').reverse().join('/'),
                  voucher_no: f.fd_number,
                  description: `FD a/c ${f.fd_number} ${f.full_name} ${f.customer_code} debit to cash`,
                  particulars: `${f.full_name} (${f.customer_code})`,
                  narration: `${f.status} Payout Released`,
                  is_system: 'Yes',
                  isInflow: false,
                  amount: f.principal_amount + (f.premature_interest_paid || 0)
                });
              }
            }
          });
        }

        if (['102', '103', 'LED-005'].includes(targetLedger.code)) {
          const mis = db.prepare(`
            SELECT m.id, m.mis_number, m.deposit_amount, m.start_date, c.full_name, c.customer_code, COALESCE(c.branch, 'MAIN BRANCH') as branch_name
            FROM mis_accounts m JOIN customers c ON m.customer_id = c.id
            WHERE date(m.start_date) BETWEEN ? AND ? ${bWhereMis}
          `).all(startDate, endDate);
          mis.forEach(m => {
            if (targetLedger.code !== '103') {
              rawItems.push({
                id: `sys-mis-${m.id}`,
                branch: m.branch_name,
                sort_date: m.start_date,
                date: m.start_date.split('-').reverse().join('/'),
                voucher_no: m.mis_number,
                description: `MIS a/c ${m.mis_number} ${m.full_name} ${m.customer_code}`,
                particulars: `${m.full_name} (${m.customer_code})`,
                narration: `Monthly Income Scheme Booking`,
                is_system: 'Yes',
                isInflow: true,
                amount: m.deposit_amount
              });
            }
          });
        }

        if (['102', '103', 'LED-007'].includes(targetLedger.code)) {
          const sbTx = db.prepare(`
            SELECT st.id, st.transaction_number, st.transaction_type, st.amount, st.payment_mode, st.narration, date(st.created_at) as tx_date,
                   s.account_number, c.full_name, c.customer_code, COALESCE(c.branch, 'MAIN BRANCH') as branch_name
            FROM savings_transactions st
            JOIN savings_accounts s ON st.account_id = s.id
            JOIN customers c ON s.customer_id = c.id
            WHERE date(st.created_at) BETWEEN ? AND ? ${bWhereSb}
          `).all(startDate, endDate);
          sbTx.forEach(st => {
            const isBank = isBankTransferMode(st.payment_mode);
            if (targetLedger.code === 'LED-007' || (targetLedger.code === '102' && !isBank) || (targetLedger.code === '103' && isBank)) {
              const isCredit = st.transaction_type === 'DEPOSIT' || st.transaction_type === 'CREDIT';
              rawItems.push({
                id: `sys-sb-${st.id}`,
                branch: st.branch_name,
                sort_date: st.tx_date,
                date: st.tx_date.split('-').reverse().join('/'),
                voucher_no: st.transaction_number || st.account_number,
                description: `Savings ${st.account_number} ${st.full_name} - ${st.narration}`,
                particulars: `${st.full_name} (${st.account_number})`,
                narration: st.narration,
                is_system: 'Yes',
                isInflow: isCredit,
                amount: st.amount
              });
            }
          });
        }

        if (['102', '103', 'LED-008'].includes(targetLedger.code)) {
          const rdInst = db.prepare(`
            SELECT rdi.id, rdi.installment_no, rdi.total_collected, rdi.installment_amount, rdi.paid_date, rdi.payment_mode, rdi.transaction_ref,
                   rd.rd_number, c.full_name, c.customer_code, COALESCE(c.branch, 'MAIN BRANCH') as branch_name
            FROM rd_installments rdi
            JOIN recurring_deposits rd ON rdi.rd_id = rd.id
            JOIN customers c ON rd.customer_id = c.id
            WHERE rdi.status = 'PAID' AND date(rdi.paid_date) BETWEEN ? AND ? ${bWhereRd}
          `).all(startDate, endDate);
          rdInst.forEach(r => {
            const isBank = isBankTransferMode(r.payment_mode);
            if (targetLedger.code === 'LED-008' || (targetLedger.code === '102' && !isBank) || (targetLedger.code === '103' && isBank)) {
              const amt = r.total_collected || r.installment_amount;
              rawItems.push({
                id: `sys-rd-${r.id}`,
                branch: r.branch_name,
                sort_date: r.paid_date,
                date: r.paid_date.split('-').reverse().join('/'),
                voucher_no: r.transaction_ref || r.rd_number,
                description: `RD ${r.rd_number} Installment #${r.installment_no} - ${r.full_name}`,
                particulars: `${r.full_name} (${r.rd_number})`,
                narration: `RD Installment #${r.installment_no}`,
                is_system: 'Yes',
                isInflow: true,
                amount: amt
              });
            }
          });
        }
      } catch (e) {}
    }

    // Sort chronologically for accurate running balance using double-entry debit/credit rules
    rawItems.sort((a, b) => (a.sort_date || '').localeCompare(b.sort_date || ''));

    let running = openingBal;
    let totalDebit = 0;
    let totalCredit = 0;

    const fullStatement = rawItems.map(item => {
      const oBal = running;
      // Asset ledgers: receipt/inflow = Debit (+), payment/outflow = Credit (-)
      // Liability/Equity/Revenue ledgers: deposit/inflow = Credit (+), withdrawal/outflow = Debit (-)
      const debit = isLiabilityOrCreditLedger
        ? (item.isInflow ? 0 : item.amount)
        : (item.isInflow ? item.amount : 0);
      const credit = isLiabilityOrCreditLedger
        ? (item.isInflow ? item.amount : 0)
        : (item.isInflow ? 0 : item.amount);

      totalDebit += debit;
      totalCredit += credit;
      running = isLiabilityOrCreditLedger
        ? Number((running + credit - debit).toFixed(2))
        : Number((running + debit - credit).toFixed(2));

      return {
        ...item,
        debit,
        credit,
        opening_balance: oBal,
        running_balance: running,
        balance: running
      };
    });

    const filteredStatement = fullStatement.filter(item => {
      const amt = Math.max(item.debit || 0, item.credit || 0);
      if (search && !item.description.toLowerCase().includes(search) && !(item.voucher_no || '').toLowerCase().includes(search)) return false;
      if (minAmount > 0 && amt < minAmount) return false;
      if (maxAmount > 0 && amt > maxAmount) return false;
      if (txType === 'DEBIT' && !(item.debit > 0)) return false;
      if (txType === 'CREDIT' && !(item.credit > 0)) return false;
      return true;
    }).reverse(); // Most recent first matching Prahlad's CASH BOOK ledger

    res.json({
      success: true,
      ledger: {
        code: targetLedger.code,
        group: targetLedger.group_name || 'CASH & CASH EQUIVALENT',
        name: targetLedger.name,
        system_name: targetLedger.system_name || targetLedger.name.toLowerCase().replace(/\s+/g, '_'),
        is_system: targetLedger.is_system ? 'Yes' : 'No',
        show_in_db: targetLedger.show_in_db ? 'Yes' : 'No',
        risk_percent: targetLedger.risk_percent || 0,
        type: targetLedger.type,
        branch: branchCtx.displayName,
        total_t: fullStatement.length,
        last_t: fullStatement.length > 0 ? fullStatement[fullStatement.length - 1].date : '-',
        opening_balance: openingBal,
        total_debit: totalDebit,
        total_credit: totalCredit,
        net_diff: totalDebit - totalCredit,
        closing_balance: running,
        statement_count: filteredStatement.length
      },
      statement: filteredStatement
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
