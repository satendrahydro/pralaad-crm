const express = require('express');
const router = express.Router();
const db = require('../db');
const { authenticateToken } = require('../middleware/auth');
const { requirePermission } = require('../middleware/permissions');

// GET /api/analytics/dashboard
router.get('/dashboard', authenticateToken, (req, res) => {
  // 1. High level metrics
  const activeFdsStats = db.prepare(`
    SELECT 
      COUNT(*) as total_active_count,
      COALESCE(SUM(principal_amount), 0) as total_principal,
      COALESCE(SUM(total_interest), 0) as total_interest,
      COALESCE(SUM(maturity_amount), 0) as total_maturity_value
    FROM fixed_deposits
    WHERE status = 'ACTIVE'
  `).get();

  const allFdsStats = db.prepare(`
    SELECT 
      COUNT(*) as total_fd_count,
      COALESCE(SUM(CASE WHEN status = 'MATURED' THEN 1 ELSE 0 END), 0) as matured_count,
      COALESCE(SUM(CASE WHEN status = 'CLOSED_PREMATURE' THEN 1 ELSE 0 END), 0) as premature_closed_count
    FROM fixed_deposits
  `).get();

  const customerCount = db.prepare('SELECT COUNT(*) as count FROM customers').get().count;

  // 2. Upcoming Maturities in next 30 days
  const upcomingMaturities = db.prepare(`
    SELECT fd.*, c.full_name as customer_name, c.phone as customer_phone
    FROM fixed_deposits fd
    JOIN customers c ON fd.customer_id = c.id
    WHERE fd.status = 'ACTIVE' 
      AND fd.maturity_date >= date('now')
      AND fd.maturity_date <= date('now', '+30 days')
    ORDER BY fd.maturity_date ASC
    LIMIT 10
  `).all();

  // 3. Upcoming interest payouts this month (for non-cumulative FDs)
  const pendingPayouts = db.prepare(`
    SELECT s.*, fd.fd_number, c.full_name as customer_name, c.bank_name, c.account_no, c.ifsc_code
    FROM fd_schedules s
    JOIN fixed_deposits fd ON s.fd_id = fd.id
    JOIN customers c ON fd.customer_id = c.id
    WHERE s.status = 'PENDING'
      AND s.payout_date <= date('now', '+30 days')
      AND fd.status = 'ACTIVE'
    ORDER BY s.payout_date ASC
    LIMIT 15
  `).all();

  // 4. Breakdown by Compounding Frequency
  const frequencyBreakdown = db.prepare(`
    SELECT compounding_frequency, COUNT(*) as count, SUM(principal_amount) as total_amount
    FROM fixed_deposits
    WHERE status = 'ACTIVE'
    GROUP BY compounding_frequency
  `).all();

  // 5. Monthly Timeline & Maturity Projection
  const monthlyProjection = db.prepare(`
    SELECT 
      strftime('%Y-%m', maturity_date) as month,
      COUNT(*) as count,
      SUM(maturity_amount) as projected_payout,
      SUM(principal_amount) as principal
    FROM fixed_deposits
    WHERE status = 'ACTIVE'
    GROUP BY strftime('%Y-%m', maturity_date)
    ORDER BY month ASC
    LIMIT 12
  `).all();

  // 6. Recent FDs
  const recentFds = db.prepare(`
    SELECT fd.*, c.full_name as customer_name
    FROM fixed_deposits fd
    JOIN customers c ON fd.customer_id = c.id
    ORDER BY fd.id DESC
    LIMIT 5
  `).all();

  // 7. Multi-Product Deposit Aggregates (RD, MIS, Savings)
  let rdStats = { count: 0, total_deposited: 0, total_maturity: 0 };
  let misStats = { count: 0, total_deposit: 0, total_monthly_payout: 0 };
  let sbStats = { count: 0, total_balance: 0 };
  let upcomingRdInstallments = [];
  let upcomingMisPayouts = [];

  try {
    rdStats = db.prepare(`
      SELECT COUNT(*) as count, COALESCE(SUM(amount_deposited), 0) as total_deposited, COALESCE(SUM(maturity_amount), 0) as total_maturity
      FROM recurring_deposits WHERE status = 'ACTIVE'
    `).get() || rdStats;

    upcomingRdInstallments = db.prepare(`
      SELECT ri.*, rd.rd_number, c.full_name as customer_name
      FROM rd_installments ri
      JOIN recurring_deposits rd ON ri.rd_id = rd.id
      JOIN customers c ON rd.customer_id = c.id
      WHERE ri.status = 'PENDING' AND ri.due_date <= date('now', '+30 days')
      ORDER BY ri.due_date ASC LIMIT 10
    `).all() || [];
  } catch(e){}

  try {
    misStats = db.prepare(`
      SELECT COUNT(*) as count, COALESCE(SUM(deposit_amount), 0) as total_deposit, COALESCE(SUM(monthly_payout), 0) as total_monthly_payout
      FROM mis_accounts WHERE status = 'ACTIVE'
    `).get() || misStats;

    upcomingMisPayouts = db.prepare(`
      SELECT mp.*, m.mis_number, c.full_name as customer_name
      FROM mis_payout_schedules mp
      JOIN mis_accounts m ON mp.mis_id = m.id
      JOIN customers c ON m.customer_id = c.id
      WHERE mp.status = 'PENDING' AND mp.payout_date <= date('now', '+30 days')
      ORDER BY mp.payout_date ASC LIMIT 10
    `).all() || [];
  } catch(e){}

  try {
    sbStats = db.prepare(`
      SELECT COUNT(*) as count, COALESCE(SUM(current_balance), 0) as total_balance
      FROM savings_accounts WHERE status = 'ACTIVE'
    `).get() || sbStats;
  } catch(e){}

  const totalInstitutionalDeposits = (activeFdsStats.total_principal || 0) + (rdStats.total_deposited || 0) + (misStats.total_deposit || 0) + (sbStats.total_balance || 0);
  const totalActiveAccounts = (activeFdsStats.total_active_count || 0) + (rdStats.count || 0) + (misStats.count || 0) + (sbStats.count || 0);

  // 8. Current Subscription status
  const subscription = db.prepare('SELECT * FROM subscription ORDER BY id DESC LIMIT 1').get();

  res.json({
    success: true,
    data: {
      metrics: {
        activeCount: activeFdsStats.total_active_count,
        totalPrincipal: activeFdsStats.total_principal,
        totalInterest: activeFdsStats.total_interest,
        totalMaturityValue: activeFdsStats.total_maturity_value,
        totalFds: allFdsStats.total_fd_count,
        maturedCount: allFdsStats.matured_count,
        prematureClosedCount: allFdsStats.premature_closed_count,
        totalCustomers: customerCount,
        // Multi-Product Institutional Totals
        totalInstitutionalDeposits: Math.round(totalInstitutionalDeposits * 100) / 100,
        totalActiveAccounts,
        rd: {
          activeCount: rdStats.count,
          totalDeposited: rdStats.total_deposited,
          totalMaturity: rdStats.total_maturity,
          upcomingInstallments: upcomingRdInstallments
        },
        mis: {
          activeCount: misStats.count,
          totalDeposit: misStats.total_deposit,
          totalMonthlyPayout: misStats.total_monthly_payout,
          upcomingPayouts: upcomingMisPayouts
        },
        savings: {
          activeCount: sbStats.count,
          totalBalance: sbStats.total_balance
        }
      },
      upcomingMaturities,
      pendingPayouts,
      frequencyBreakdown,
      monthlyProjection,
      recentFds,
      subscription
    }
  });
});

// GET /api/analytics/ledger - General Ledger, Journal Entries & Trial Balance
router.get('/ledger', authenticateToken, (req, res) => {
  try {
    const transactions = db.prepare(`
      SELECT t.*, c.full_name as customer_name, c.customer_code
      FROM transactions t
      JOIN customers c ON t.customer_id = c.id
      ORDER BY t.id DESC
      LIMIT 100
    `).all();

    const formatted = transactions.map(t => {
      const entries = db.prepare('SELECT account_name, entry_type, amount, notes FROM transaction_entries WHERE transaction_id = ?').all(t.id);
      const debitSum = entries.filter(e => e.entry_type === 'DEBIT').reduce((acc, e) => acc + e.amount, 0);
      const creditSum = entries.filter(e => e.entry_type === 'CREDIT').reduce((acc, e) => acc + e.amount, 0);
      return { ...t, entries, debit_sum: debitSum, credit_sum: creditSum, is_balanced: Math.abs(debitSum - creditSum) < 0.01 };
    });

    const summary = db.prepare(`
      SELECT 
        COALESCE(SUM(CASE WHEN entry_type = 'DEBIT' THEN amount ELSE 0 END), 0) as totalDebits,
        COALESCE(SUM(CASE WHEN entry_type = 'CREDIT' THEN amount ELSE 0 END), 0) as totalCredits,
        COUNT(*) as totalEntries
      FROM transaction_entries
    `).get();

    res.json({
      success: true,
      summary: {
        totalDebits: summary.totalDebits,
        totalCredits: summary.totalCredits,
        delta: Math.abs(summary.totalDebits - summary.totalCredits),
        isBalanced: Math.abs(summary.totalDebits - summary.totalCredits) < 0.01,
        totalEntries: summary.totalEntries
      },
      transactions: formatted
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// GET /api/analytics/reports - Financial Summary & Product Distribution (requires reports_view)
router.get('/reports', authenticateToken, requirePermission('reports_view'), (req, res) => {
  try {
    const fdSummary = db.prepare(`
      SELECT COUNT(*) as count, COALESCE(SUM(principal_amount), 0) as total_principal, COALESCE(SUM(maturity_amount), 0) as total_maturity
      FROM fixed_deposits WHERE status = 'ACTIVE'
    `).get();

    const rdSummary = db.prepare(`
      SELECT COUNT(*) as count, COALESCE(SUM(amount_deposited), 0) as total_deposited, COALESCE(SUM(maturity_amount), 0) as total_maturity
      FROM recurring_deposits WHERE status = 'ACTIVE'
    `).get();

    const misSummary = db.prepare(`
      SELECT COUNT(*) as count, COALESCE(SUM(deposit_amount), 0) as total_deposit, COALESCE(SUM(monthly_payout), 0) as total_monthly_payout
      FROM mis_accounts WHERE status = 'ACTIVE'
    `).get();

    const sbSummary = db.prepare(`
      SELECT COUNT(*) as count, COALESCE(SUM(current_balance), 0) as total_balance
      FROM savings_accounts WHERE status = 'ACTIVE'
    `).get();

    res.json({
      success: true,
      reportType: 'EXECUTIVE_FINANCIAL_SUMMARY',
      generatedAt: new Date().toISOString(),
      products: {
        fixed_deposits: fdSummary,
        recurring_deposits: rdSummary,
        monthly_income_scheme: misSummary,
        savings_accounts: sbSummary
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// GET /api/analytics/export/csv - General ledger & analytics CSV export (requires csv_export)
router.get('/export/csv', authenticateToken, requirePermission('csv_export'), (req, res) => {
  try {
    const transactions = db.prepare(`
      SELECT t.transaction_number, t.transaction_type, t.amount, t.transaction_date, 
             t.payment_mode, t.reference_number, c.customer_code, c.full_name
      FROM transactions t
      JOIN customers c ON t.customer_id = c.id
      ORDER BY t.id DESC LIMIT 1000
    `).all();

    let csv = 'Transaction Number,Type,Amount,Date,Payment Mode,Reference,Customer Code,Customer Name\n';
    for (const t of transactions) {
      csv += `"${t.transaction_number}","${t.transaction_type}",${t.amount},"${t.transaction_date}","${t.payment_mode}","${t.reference_number || ''}","${t.customer_code}","${t.full_name}"\n`;
    }

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="transactions_ledger.csv"');
    res.send(csv);
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
