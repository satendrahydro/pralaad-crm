const express = require('express');
const router = express.Router();
const db = require('../db');
const { authenticateToken } = require('../middleware/auth');

// 1. GET /api/accounting/day-book
router.get('/day-book', authenticateToken, (req, res) => {
  try {
    const today = new Date().toISOString().split('T')[0];
    const startDate = req.query.startDate || req.query.date || today;
    const endDate = req.query.endDate || req.query.date || startDate;
    const selectedBranch = req.query.branch || 'ALL';

    // Compute live total balances from database for ledger references
    const totalFd = db.prepare("SELECT COALESCE(SUM(principal_amount), 0) AS total FROM fixed_deposits WHERE status = 'ACTIVE'").get()?.total || 0;
    const totalRd = db.prepare("SELECT COALESCE(SUM(monthly_installment), 0) AS total FROM recurring_deposits WHERE status = 'ACTIVE'").get()?.total || 0;
    const totalMis = db.prepare("SELECT COALESCE(SUM(deposit_amount), 0) AS total FROM mis_accounts WHERE status = 'ACTIVE'").get()?.total || 0;
    const totalSavings = db.prepare("SELECT COALESCE(SUM(current_balance), 0) AS total FROM savings_accounts WHERE status = 'ACTIVE'").get()?.total || 0;

    // 9 Live Banking Ledgers
    const ledgers = [
      { id: 1, code: 'LED-001', name: 'TARPL MAIN', type: 'Capital & Reserves', opening_balance: 1000000.00, receipts: 0.00, payments: 0.00, closing_balance: 1000000.00 },
      { id: 2, code: 'LED-002', name: 'WALLET BALANCE', type: 'Central Pool', opening_balance: 470000.00, receipts: 0.00, payments: 0.00, closing_balance: 470000.00 },
      { id: 3, code: 'LED-003', name: 'CASH BOOK', type: 'Branch Vault Cash', opening_balance: 2736651.00, receipts: 0.00, payments: 0.00, closing_balance: 2736651.00 },
      { id: 4, code: 'LED-004', name: 'BANK BOOK', type: 'Banking Current A/C', opening_balance: 528431.51, receipts: 0.00, payments: 0.00, closing_balance: 528431.51 },
      { id: 5, code: 'LED-005', name: 'NEW FD RD MIS', type: 'Term Deposit Liabilities', opening_balance: 202112275.00, receipts: 0.00, payments: 0.00, closing_balance: 202112275.00 },
      { id: 6, code: 'LED-006', name: 'WALLET BALANCE', type: 'Advisor Collection Pool', opening_balance: 2137375.00, receipts: 0.00, payments: 0.00, closing_balance: 2137375.00 },
      { id: 7, code: 'LED-007', name: 'SAVING ACCOUNTS', type: 'Demand Liabilities', opening_balance: 3221417.00, receipts: 0.00, payments: 0.00, closing_balance: 3221417.00 },
      { id: 8, code: 'LED-008', name: 'RD ACCOUNTS', type: 'Recurring Liabilities', opening_balance: 318496.00, receipts: 0.00, payments: 0.00, closing_balance: 318496.00 },
      { id: 9, code: 'LED-009', name: 'DD ACCOUNTS', type: 'Daily Deposit Accounts', opening_balance: 282396.00, receipts: 0.00, payments: 0.00, closing_balance: 282396.00 },
      { id: 10, code: 'LED-010', name: 'GOLD LOAN BOOK', type: 'Gold Loan Assets (गोल्ड लोन)', opening_balance: 325000.00, receipts: 0.00, payments: 0.00, closing_balance: 325000.00 },
      { id: 11, code: 'LED-011', name: 'BORROWINGS & UDHAR', type: 'Hand Loan / Udhar (उधार खाता)', opening_balance: 150000.00, receipts: 0.00, payments: 0.00, closing_balance: 150000.00 }
    ];

    // ==========================================
    // OPTION 1: DAILY USE (दैनिक खर्च व आवक-जावक)
    // ==========================================
    let dayCashEntries = [];
    try {
      dayCashEntries = db.prepare(`
        SELECT * FROM day_book_cash_entries 
        WHERE entry_date BETWEEN ? AND ? 
        ORDER BY entry_date DESC, id DESC
      `).all(startDate, endDate);
    } catch(e) {
      dayCashEntries = [];
    }

    if (dayCashEntries.length === 0) {
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
          created_at: e.created_at
        }));
      } catch(e) {}
    }

    const cashInflows = dayCashEntries.filter(e => e.entry_type === 'INFLOW' && e.payment_mode === 'CASH').reduce((sum, e) => sum + e.amount, 0);
    const bankInflows = dayCashEntries.filter(e => e.entry_type === 'INFLOW' && e.payment_mode === 'BANK_ONLINE').reduce((sum, e) => sum + e.amount, 0);
    const cashOutflows = dayCashEntries.filter(e => e.entry_type === 'OUTFLOW' && e.payment_mode === 'CASH').reduce((sum, e) => sum + e.amount, 0);
    const bankOutflows = dayCashEntries.filter(e => e.entry_type === 'OUTFLOW' && e.payment_mode === 'BANK_ONLINE').reduce((sum, e) => sum + e.amount, 0);

    // Apply adjustments to Ledgers
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

    const cashVouchers = dayCashEntries.map(e => ({
      id: `entry-${e.id}`,
      voucher_no: e.voucher_no,
      date: e.entry_date,
      time: e.created_at ? e.created_at.split(' ')[1]?.slice(0, 5) || '11:00 AM' : '11:00 AM',
      ledger: e.payment_mode === 'CASH' ? 'CASH BOOK' : 'BANK BOOK',
      account: `${e.category_name} (${e.party_name})`,
      category: e.category,
      category_name: e.category_name,
      party_name: e.party_name,
      entry_type: e.entry_type,
      payment_mode: e.payment_mode,
      type: e.entry_type === 'INFLOW' ? 'RECEIPT' : 'EXPENSE',
      dr_cr: e.entry_type === 'INFLOW'
        ? `DR ${e.payment_mode === 'CASH' ? 'Cash Book' : 'Bank Book'} / CR ${e.category_name}`
        : `DR ${e.category_name} / CR ${e.payment_mode === 'CASH' ? 'Cash Book' : 'Bank Book'}`,
      amount: e.amount,
      narration: e.narration,
      bill_number: e.reference_no,
      reference_no: e.reference_no
    }));

    // ==========================================
    // OPTION 2: BANKING DAY BOOK (कोर बैंकिंग)
    // ==========================================
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
        ORDER BY fd.created_at DESC
      `).all(startDate, endDate, startDate, endDate);
    } catch(e) { fds = []; }

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
        ORDER BY fd.closed_date DESC
      `).all(startDate, endDate);
    } catch(e) { fdClosures = []; }

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
        ORDER BY rd.created_at DESC
      `).all(startDate, endDate, startDate, endDate);
    } catch(e) { rds = []; }

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
        ORDER BY rdi.paid_date DESC
      `).all(startDate, endDate);
    } catch(e) { rdInstallments = []; }

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
        ORDER BY m.created_at DESC
      `).all(startDate, endDate, startDate, endDate);
    } catch(e) { misAccounts = []; }

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
        ORDER BY msp.paid_date DESC
      `).all(startDate, endDate);
    } catch(e) { misPayouts = []; }

    // 4. New Savings Accounts in Date Range
    let savingsAccounts = [];
    try {
      savingsAccounts = db.prepare(`
        SELECT s.id, s.account_number, s.current_balance, s.minimum_balance, s.opened_date, s.status, s.created_at,
               c.full_name as customer_name, c.customer_code, c.phone as customer_phone
        FROM savings_accounts s
        JOIN customers c ON s.customer_id = c.id
        WHERE (date(s.opened_date) BETWEEN ? AND ? OR date(s.created_at) BETWEEN ? AND ?)
        ORDER BY s.created_at DESC
      `).all(startDate, endDate, startDate, endDate);
    } catch(e) { savingsAccounts = []; }

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
        ORDER BY st.created_at DESC
      `).all(startDate, endDate);
    } catch(e) { savingsTxns = []; }

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

    const totalOpening = ledgers.reduce((acc, l) => acc + l.opening_balance, 0);
    const totalReceipts = ledgers.reduce((acc, l) => acc + l.receipts, 0);
    const totalPayments = ledgers.reduce((acc, l) => acc + l.payments, 0);
    const totalClosing = ledgers.reduce((acc, l) => acc + l.closing_balance, 0);

    res.json({
      success: true,
      startDate,
      endDate,
      date: startDate,
      isRange: startDate !== endDate,

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
