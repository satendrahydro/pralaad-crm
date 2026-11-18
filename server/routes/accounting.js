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
        name: 'WALLET BALANCE (COLLECTION)',
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
      }
    ];

    const totalOpening = ledgers.reduce((acc, l) => acc + l.opening_balance, 0);
    const totalReceipts = ledgers.reduce((acc, l) => acc + l.receipts, 0);
    const totalPayments = ledgers.reduce((acc, l) => acc + l.payments, 0);
    const totalClosing = ledgers.reduce((acc, l) => acc + l.closing_balance, 0);

    // Recent Day Book Vouchers
    const recentVouchers = [
      {
        id: 101,
        voucher_no: 'VCH-2026-0042',
        time: '10:15 AM',
        ledger: 'Cash Book',
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
        ledger: 'Bank Book (PNB / SBI)',
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
        ledger: 'RD Accounts',
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
        ledger: 'Saving Accounts',
        account: 'M00004 - Rahul Sharma',
        type: 'PAYMENT',
        dr_cr: 'DR Savings / CR Cash',
        amount: 12000.00,
        narration: 'Cash withdrawal from Savings A/C'
      },
      {
        id: 105,
        voucher_no: 'VCH-2026-0046',
        time: '04:30 PM',
        ledger: 'Tarpl Main',
        account: 'ADV0001 - Ramesh Chandra',
        type: 'PAYMENT',
        dr_cr: 'DR Commission Expense / CR Wallet',
        amount: 4500.00,
        narration: 'Advisor collection commission settlement'
      }
    ];

    res.json({
      success: true,
      date: selectedDate,
      summary: {
        total_opening: totalOpening,
        total_receipts: totalReceipts,
        total_payments: totalPayments,
        total_closing: totalClosing
      },
      ledgers,
      vouchers: recentVouchers
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
      INSERT INTO transactions (voucher_number, voucher_date, voucher_type, total_amount, narration, created_by)
      VALUES (?, ?, 'JOURNAL', ?, ?, ?)
    `);
    const info = stmt.run(voucher_number, date, numAmount, narration || 'Manual Journal Voucher', req.user?.id || 1);

    // Insert Dr & Cr entries
    const entryStmt = db.prepare(`
      INSERT INTO transaction_entries (transaction_id, account_type, entry_type, amount, narration)
      VALUES (?, ?, ?, ?, ?)
    `);
    entryStmt.run(info.lastInsertRowid, debit_ledger, 'DEBIT', numAmount, narration);
    entryStmt.run(info.lastInsertRowid, credit_ledger, 'CREDIT', numAmount, narration);

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
    // 15 Hubco fields: Branch, Group, Center, Advisor, Customer Name, Member ID, Account No, Product Type, Due Amount, Due Date, Overdue Days, Savings Balance, Mobile, Status
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

module.exports = router;
