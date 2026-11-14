const express = require('express');
const router = express.Router();
const db = require('../db');
const { authenticateToken } = require('../middleware/auth');

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

  // 7. Current Subscription status
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
        totalCustomers: customerCount
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

module.exports = router;
