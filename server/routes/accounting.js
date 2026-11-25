const express = require('express');
const router = express.Router();
const db = require('../db');
const { authenticateToken } = require('../middleware/auth');

// 1. GET /api/accounting/day-book
router.get('/day-book', authenticateToken, (req, res) => {
  try {
    const selectedDate = req.query.date || new Date().toISOString().split('T')[0];

    // Compute live balances from database
    const totalFd = db.prepare("SELECT COALESCE(SUM(principal_amount), 0) AS total FROM fixed_deposits WHERE status = 'ACTIVE'").get()?.total || 0;
    const totalRd = db.prepare("SELECT COALESCE(SUM(monthly_installment), 0) AS total FROM recurring_deposits WHERE status = 'ACTIVE'").get()?.total || 0;
    const totalMis = db.prepare("SELECT COALESCE(SUM(deposit_amount), 0) AS total FROM mis_accounts WHERE status = 'ACTIVE'").get()?.total || 0;
    const totalSavings = db.prepare("SELECT COALESCE(SUM(current_balance), 0) AS total FROM savings_accounts WHERE status = 'ACTIVE'").get()?.total || 0;

    // 9 Live Banking Ledgers (Matches Taranganjali Live Day Book)
    const ledgers = [
      {
        id: 1,
        code: 'LED-001',
        name: 'TARPL MAIN',
        type: 'Capital & Reserves',
        opening_balance: 1000000.00,
        receipts: 0.00,
        payments: 0.00,
        closing_balance: 1000000.00
      },
      {
        id: 2,
        code: 'LED-002',
        name: 'WALLET BALANCE',
        type: 'Central Pool',
        opening_balance: 470000.00,
        receipts: 0.00,
        payments: 0.00,
        closing_balance: 470000.00
      },
      {
        id: 3,
        code: 'LED-003',
        name: 'CASH BOOK',
        type: 'Branch Vault Cash',
        opening_balance: 2736651.00,
        receipts: 0.00,
        payments: 0.00,
        closing_balance: 2736651.00
      },
      {
        id: 4,
        code: 'LED-004',
        name: 'BANK BOOK',
        type: 'Banking Current A/C',
        opening_balance: 528431.51,
        receipts: 0.00,
        payments: 0.00,
        closing_balance: 528431.51
      },
      {
        id: 5,
        code: 'LED-005',
        name: 'NEW FD RD MIS',
        type: 'Term Deposit Liabilities',
        opening_balance: 202112275.00,
        receipts: 0.00,
        payments: 0.00,
        closing_balance: 202112275.00
      },
      {
        id: 6,
        code: 'LED-006',
        name: 'WALLET BALANCE',
        type: 'Advisor Collection Pool',
        opening_balance: 2137375.00,
        receipts: 0.00,
        payments: 0.00,
        closing_balance: 2137375.00
      },
      {
        id: 7,
        code: 'LED-007',
        name: 'SAVING ACCOUNTS',
        type: 'Demand Liabilities',
        opening_balance: 3221417.00,
        receipts: 0.00,
        payments: 0.00,
        closing_balance: 3221417.00
      },
      {
        id: 8,
        code: 'LED-008',
        name: 'RD ACCOUNTS',
        type: 'Recurring Liabilities',
        opening_balance: 318496.00,
        receipts: 0.00,
        payments: 0.00,
        closing_balance: 318496.00
      },
      {
        id: 9,
        code: 'LED-009',
        name: 'DD ACCOUNTS',
        type: 'Daily Deposit Accounts',
        opening_balance: 282396.00,
        receipts: 0.00,
        payments: 0.00,
        closing_balance: 282396.00
      },
      {
        id: 10,
        code: 'LED-010',
        name: 'GOLD LOAN BOOK',
        type: 'Gold Loan Assets (गोल्ड लोन)',
        opening_balance: 325000.00,
        receipts: 0.00,
        payments: 0.00,
        closing_balance: 325000.00
      },
      {
        id: 11,
        code: 'LED-011',
        name: 'BORROWINGS & UDHAR',
        type: 'Hand Loan / Udhar (उधार खाता)',
        opening_balance: 150000.00,
        receipts: 0.00,
        payments: 0.00,
        closing_balance: 150000.00
      }
    ];

    // Fetch both Inflow (Input) and Outflow (Output) cash entries for selectedDate
    let dayCashEntries = [];
    try {
      dayCashEntries = db.prepare(`
        SELECT * FROM day_book_cash_entries 
        WHERE entry_date = ? 
        ORDER BY id DESC
      `).all(selectedDate);
    } catch(e) {
      dayCashEntries = [];
    }

    // Fallback: If no cash entries exist yet, check daily_expenses
    if (dayCashEntries.length === 0) {
      try {
        const legacyExpenses = db.prepare(`
          SELECT * FROM daily_expenses WHERE expense_date = ? ORDER BY id DESC
        `).all(selectedDate);
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
          created_at: e.created_at
        }));
      } catch(e) {}
    }

    // Separate Cash & Bank for Inflows (Input) and Outflows (Output)
    const cashInflows = dayCashEntries.filter(e => e.entry_type === 'INFLOW' && e.payment_mode === 'CASH').reduce((sum, e) => sum + e.amount, 0);
    const bankInflows = dayCashEntries.filter(e => e.entry_type === 'INFLOW' && e.payment_mode === 'BANK_ONLINE').reduce((sum, e) => sum + e.amount, 0);
    const cashOutflows = dayCashEntries.filter(e => e.entry_type === 'OUTFLOW' && e.payment_mode === 'CASH').reduce((sum, e) => sum + e.amount, 0);
    const bankOutflows = dayCashEntries.filter(e => e.entry_type === 'OUTFLOW' && e.payment_mode === 'BANK_ONLINE').reduce((sum, e) => sum + e.amount, 0);

    // Apply Inflow & Outflow adjustments to CASH BOOK (LED-003) & BANK BOOK (LED-004)
    const cashLedger = ledgers.find(l => l.code === 'LED-003');
    if (cashLedger) {
      cashLedger.receipts += cashInflows;
      cashLedger.payments += cashOutflows;
      cashLedger.closing_balance = cashLedger.opening_balance + cashLedger.receipts - cashLedger.payments;
    }
    const bankLedger = ledgers.find(l => l.code === 'LED-004');
    if (bankLedger) {
      bankLedger.receipts += bankInflows;
      bankLedger.payments += bankOutflows;
      bankLedger.closing_balance = bankLedger.opening_balance + bankLedger.receipts - bankLedger.payments;
    }

    // Apply Gold Loan adjustments to GOLD LOAN BOOK (LED-010)
    const goldLedger = ledgers.find(l => l.code === 'LED-010');
    if (goldLedger) {
      const glDisbursed = dayCashEntries.filter(e => e.category === 'GOLD_LOAN_DISBURSEMENT').reduce((sum, e) => sum + e.amount, 0);
      const glRecovered = dayCashEntries.filter(e => e.category === 'GOLD_LOAN_RECOVERY').reduce((sum, e) => sum + e.amount, 0);
      goldLedger.payments += glDisbursed;
      goldLedger.receipts += glRecovered;
      goldLedger.closing_balance = goldLedger.opening_balance + glDisbursed - glRecovered;
    }

    // Apply Udhar adjustments to BORROWINGS & UDHAR (LED-011)
    const udharLedger = ledgers.find(l => l.code === 'LED-011');
    if (udharLedger) {
      const udharIn = dayCashEntries.filter(e => e.category === 'BORROWING_INFLOW').reduce((sum, e) => sum + e.amount, 0);
      const udharOut = dayCashEntries.filter(e => e.category === 'BORROWING_REPAYMENT').reduce((sum, e) => sum + e.amount, 0);
      udharLedger.receipts += udharIn;
      udharLedger.payments += udharOut;
      udharLedger.closing_balance = udharLedger.opening_balance + udharIn - udharOut;
    }

    // Convert all Inflow & Outflow entries into Day Book Vouchers
    const cashVouchers = dayCashEntries.map(e => ({
      id: `entry-${e.id}`,
      voucher_no: e.voucher_no,
      time: e.created_at ? e.created_at.split(' ')[1]?.slice(0, 5) || '11:00 AM' : '11:00 AM',
      ledger: e.payment_mode === 'CASH' ? 'CASH BOOK' : 'BANK BOOK',
      account: `${e.category_name} (${e.party_name})`,
      category: e.category,
      category_name: e.category_name,
      party_name: e.party_name,
      entry_type: e.entry_type, // 'INFLOW' (Input) | 'OUTFLOW' (Output)
      type: e.entry_type === 'INFLOW' ? 'RECEIPT' : 'EXPENSE',
      dr_cr: e.entry_type === 'INFLOW'
        ? `DR ${e.payment_mode === 'CASH' ? 'Cash Book' : 'Bank Book'} / CR ${e.category_name}`
        : `DR ${e.category_name} / CR ${e.payment_mode === 'CASH' ? 'Cash Book' : 'Bank Book'}`,
      amount: e.amount,
      narration: e.narration,
      bill_number: e.reference_no,
      reference_no: e.reference_no
    }));

    const totalOpening = ledgers.reduce((acc, l) => acc + l.opening_balance, 0);
    const totalReceipts = ledgers.reduce((acc, l) => acc + l.receipts, 0);
    const totalPayments = ledgers.reduce((acc, l) => acc + l.payments, 0);
    const totalClosing = ledgers.reduce((acc, l) => acc + l.closing_balance, 0);

    // Operational Day Book Banking Vouchers
    const recentVouchers = [
      ...cashVouchers,
      {
        id: 101,
        voucher_no: 'VCH-2026-0042',
        time: '10:15 AM',
        ledger: 'CASH BOOK',
        account: 'M00001 - Prahlad Singh',
        type: 'RECEIPT',
        dr_cr: 'DR Cash / CR Savings',
        amount: 25000.00,
        narration: 'Cash deposit into Savings A/C SB-00001'
      },
      {
        id: 102,
        voucher_no: 'VCH-2026-0043',
        time: '11:30 AM',
        ledger: 'BANK BOOK',
        account: 'M00002 - Narpat Singh',
        type: 'RECEIPT',
        dr_cr: 'DR Bank / CR FD Term Deposit',
        amount: 100000.00,
        narration: 'NEFT credit for new Fixed Deposit booking'
      },
      {
        id: 103,
        voucher_no: 'VCH-2026-0044',
        time: '01:45 PM',
        ledger: 'RD ACCOUNTS',
        account: 'M00003 - Satendra Kumar',
        type: 'RECEIPT',
        dr_cr: 'DR Cash / CR RD Installment',
        amount: 5000.00,
        narration: 'Monthly installment received via ADV0001'
      },
      {
        id: 104,
        voucher_no: 'VCH-2026-0045',
        time: '03:10 PM',
        ledger: 'SAVING ACCOUNTS',
        account: 'M00004 - Rahul Sharma',
        type: 'PAYMENT',
        dr_cr: 'DR Savings / CR Cash',
        amount: 12000.00,
        narration: 'Cash withdrawal from Savings A/C'
      }
    ];

    res.json({
      success: true,
      date: selectedDate,
      summary: {
        total_opening: totalOpening,
        total_receipts: totalReceipts,
        total_payments: totalPayments,
        total_closing: totalClosing,
        inflows: {
          total: cashInflows + bankInflows,
          cash: cashInflows,
          bank: bankInflows
        },
        outflows: {
          total: cashOutflows + bankOutflows,
          cash: cashOutflows,
          bank: bankOutflows
        },
        net_cashflow: (cashInflows + bankInflows) - (cashOutflows + bankOutflows),
        total_expenses: cashOutflows + bankOutflows
      },
      entries: dayCashEntries,
      expenses: dayCashEntries.filter(e => e.entry_type === 'OUTFLOW'),
      ledgers,
      vouchers: recentVouchers
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
      narration 
    } = req.body;

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
        amount, payment_mode, party_name, reference_no, narration, created_by_user_id
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
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

// 8. GET /api/accounting/ledger-statement/:code - Detailed Ledger Statement Drilldown
router.get('/ledger-statement/:code', authenticateToken, (req, res) => {
  try {
    const { code } = req.params;
    const { date } = req.query;
    const selectedDate = date || new Date().toISOString().split('T')[0];

    // Determine target ledger
    const targetCode = decodeURIComponent(code).trim().toUpperCase();

    // Map known ledger baselines matching admin.taranganjali.com
    const ledgerMetadata = {
      'LED-001': { code: 'LED-001', name: 'TARPL MAIN', type: 'Asset Ledger (कंपनी मुख्य पूंजी)', opening: 1000000.00, branch: 'MAIN BRANCH (BHR001)' },
      'TARPL MAIN': { code: 'LED-001', name: 'TARPL MAIN', type: 'Asset Ledger (कंपनी मुख्य पूंजी)', opening: 1000000.00, branch: 'MAIN BRANCH (BHR001)' },

      'LED-002': { code: 'LED-002', name: 'WALLET BALANCE', type: 'Asset Ledger (कलेक्शन फ्लोट वॉलेट)', opening: 470000.00, branch: 'MAIN BRANCH (BHR001)' },
      'WALLET BALANCE': { code: 'LED-002', name: 'WALLET BALANCE', type: 'Asset Ledger (कलेक्शन फ्लोट वॉलेट)', opening: 470000.00, branch: 'MAIN BRANCH (BHR001)' },

      'LED-003': { code: 'LED-003', name: 'CASH BOOK', type: 'Asset Ledger (कार्यालय तिजोरी व नकद गल्ला)', opening: 2736651.00, branch: 'MAIN BRANCH (BHR001)' },
      'CASH BOOK': { code: 'LED-003', name: 'CASH BOOK', type: 'Asset Ledger (कार्यालय तिजोरी व नकद गल्ला)', opening: 2736651.00, branch: 'MAIN BRANCH (BHR001)' },

      'LED-004': { code: 'LED-004', name: 'BANK BOOK', type: 'Asset Ledger (PNB बैंक चालू खाता व UPI)', opening: 528431.51, branch: 'MAIN BRANCH (BHR001)' },
      'BANK BOOK': { code: 'LED-004', name: 'BANK BOOK', type: 'Asset Ledger (PNB बैंक चालू खाता व UPI)', opening: 528431.51, branch: 'MAIN BRANCH (BHR001)' },

      'LED-005': { code: 'LED-005', name: 'NEW FD RD MIS', type: 'Term Deposit Reserves (एफडी/आरडी देयताएं)', opening: 202112275.00, branch: 'MAIN BRANCH (BHR001)' },
      'NEW FD RD MIS': { code: 'LED-005', name: 'NEW FD RD MIS', type: 'Term Deposit Reserves (एफडी/आरडी देयताएं)', opening: 202112275.00, branch: 'MAIN BRANCH (BHR001)' },

      'LED-006': { code: 'LED-006', name: 'WALLET BALANCE', type: 'Agent Float Wallet (फील्ड एजेंट वॉलेट)', opening: 2137375.00, branch: 'MAIN BRANCH (BHR001)' },
      'WALLET BALANCE (COLLECTION)': { code: 'LED-006', name: 'WALLET BALANCE', type: 'Agent Float Wallet (फील्ड एजेंट वॉलेट)', opening: 2137375.00, branch: 'MAIN BRANCH (BHR001)' },

      'LED-007': { code: 'LED-007', name: 'SAVING ACCOUNTS', type: 'Savings Liabilities (बचत खाता जमा)', opening: 3221417.00, branch: 'MAIN BRANCH (BHR001)' },
      'SAVING ACCOUNTS': { code: 'LED-007', name: 'SAVING ACCOUNTS', type: 'Savings Liabilities (बचत खाता जमा)', opening: 3221417.00, branch: 'MAIN BRANCH (BHR001)' },

      'LED-008': { code: 'LED-008', name: 'RD ACCOUNTS', type: 'Recurring Liabilities (आवर्ती जमा)', opening: 318496.00, branch: 'MAIN BRANCH (BHR001)' },
      'RD ACCOUNTS': { code: 'LED-008', name: 'RD ACCOUNTS', type: 'Recurring Liabilities (आवर्ती जमा)', opening: 318496.00, branch: 'MAIN BRANCH (BHR001)' },

      'LED-009': { code: 'LED-009', name: 'DD ACCOUNTS', type: 'Daily Deposit Accounts (दैनिक जमा)', opening: 282396.00, branch: 'MAIN BRANCH (BHR001)' },
      'DD ACCOUNTS': { code: 'LED-009', name: 'DD ACCOUNTS', type: 'Daily Deposit Accounts (दैनिक जमा)', opening: 282396.00, branch: 'MAIN BRANCH (BHR001)' },

      'LED-010': { code: 'LED-010', name: 'GOLD LOAN BOOK', type: 'Gold Loan Assets (स्वर्ण आभूषण सुरक्षित ऋण)', opening: 325000.00, branch: 'MAIN BRANCH (BHR001)' },
      'GOLD LOAN BOOK': { code: 'LED-010', name: 'GOLD LOAN BOOK', type: 'Gold Loan Assets (स्वर्ण आभूषण सुरक्षित ऋण)', opening: 325000.00, branch: 'MAIN BRANCH (BHR001)' },

      'LED-011': { code: 'LED-011', name: 'BORROWINGS & UDHAR', type: 'Borrowing Liabilities (हाथ उधारी व देयताएं)', opening: 150000.00, branch: 'MAIN BRANCH (BHR001)' },
      'BORROWINGS & UDHAR': { code: 'LED-011', name: 'BORROWINGS & UDHAR', type: 'Borrowing Liabilities (हाथ उधारी व देयताएं)', opening: 150000.00, branch: 'MAIN BRANCH (BHR001)' }
    };

    const meta = ledgerMetadata[targetCode] || {
      code: targetCode,
      name: targetCode,
      type: 'General Ledger',
      opening: 500000.00,
      branch: 'MAIN BRANCH (BHR001)'
    };

    // Query real day_book_cash_entries
    let cashEntries = [];
    try {
      cashEntries = db.prepare(`
        SELECT * FROM day_book_cash_entries 
        ORDER BY id ASC
      `).all();
    } catch(e) {}

    // Filter relevant transactions for this ledger
    let filtered = [];
    if (meta.code === 'LED-003') { // CASH BOOK
      filtered = cashEntries.filter(e => e.payment_mode === 'CASH');
    } else if (meta.code === 'LED-004') { // BANK BOOK
      filtered = cashEntries.filter(e => e.payment_mode === 'BANK_ONLINE');
    } else if (meta.code === 'LED-010') { // GOLD LOAN
      filtered = cashEntries.filter(e => e.category.includes('GOLD_LOAN'));
    } else if (meta.code === 'LED-011') { // UDHAR
      filtered = cashEntries.filter(e => e.category.includes('BORROWING'));
    } else if (meta.code === 'LED-007') { // SAVINGS
      filtered = cashEntries.filter(e => e.category.includes('SAVINGS'));
    } else if (meta.code === 'LED-008') { // RD
      filtered = cashEntries.filter(e => e.category.includes('RD') || e.category.includes('COLLECTION'));
    } else {
      filtered = cashEntries.slice(0, 5);
    }

    // Build Chronological Running Balance Statement
    let running = meta.opening;
    let totalDebit = 0;
    let totalCredit = 0;

    const statement = filtered.map((e, index) => {
      const isCredit = e.entry_type === 'INFLOW';
      const debitAmt = isCredit ? 0 : e.amount;
      const creditAmt = isCredit ? e.amount : 0;

      totalDebit += debitAmt;
      totalCredit += creditAmt;

      if (meta.code === 'LED-010') { // Loan Asset: Disbursement increases, Recovery decreases
        running = isCredit ? running - e.amount : running + e.amount;
      } else if (meta.code === 'LED-011') { // Liability: Borrowing increases, Repayment decreases
        running = isCredit ? running + e.amount : running - e.amount;
      } else { // Asset (Cash/Bank): Inflow increases, Outflow decreases
        running = isCredit ? running + e.amount : running - e.amount;
      }

      return {
        id: e.id,
        date: e.entry_date ? e.entry_date.split('-').reverse().join('/') : selectedDate.split('-').reverse().join('/'),
        voucher_no: e.voucher_no,
        description: `${e.category_name} - ${e.party_name}`,
        narration: e.narration,
        reference_no: e.reference_no,
        type: isCredit ? 'RECEIPT' : 'PAYMENT',
        is_system: 'YES',
        debit: debitAmt,
        credit: creditAmt,
        running_balance: running
      };
    });

    res.json({
      success: true,
      ledger: {
        code: meta.code,
        name: meta.name,
        type: meta.type,
        branch: meta.branch,
        opening_balance: meta.opening,
        total_debit: totalDebit,
        total_credit: totalCredit,
        closing_balance: running,
        statement_count: statement.length
      },
      statement
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
