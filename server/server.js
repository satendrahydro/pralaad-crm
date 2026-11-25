const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

// Ensure DB is initialized
require('./db');

const authRoutes = require('./routes/auth');
const customerRoutes = require('./routes/customers');
const fdRoutes = require('./routes/fds');
const analyticsRoutes = require('./routes/analytics');
const subscriptionRoutes = require('./routes/subscription');
const settingsRoutes = require('./routes/settings');
const whatsappRoutes = require('./routes/whatsapp');
const customerPortalRoutes = require('./routes/customerPortal');
const approvalsRoutes = require('./routes/approvals');
const rdRoutes = require('./routes/rd');
const misRoutes = require('./routes/mis');
const savingsRoutes = require('./routes/savings');
const userRoutes = require('./routes/users');
const permissionsRoutes = require('./routes/permissions');
const agentRanksRoutes = require('./routes/agentRanks');
const collectionCentersRoutes = require('./routes/collectionCenters');
const loansRoutes = require('./routes/loans');
const accountingRoutes = require('./routes/accounting');
const { router: licenseRoutes, getLockState } = require('./routes/license');

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

// License & Commercial Payment Kill-Switch
app.use('/api/license', licenseRoutes);

// Commercial Payment Lock Guard Middleware
app.use((req, res, next) => {
  if (req.path.startsWith('/api') && !req.path.startsWith('/api/license') && req.path !== '/api/health') {
    if (getLockState() === 'LOCKED') {
      return res.status(423).json({
        success: false,
        locked: true,
        message: 'System access suspended due to pending commercial settlement. Please contact software vendor.'
      });
    }
  }
  next();
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/customers', customerRoutes);
app.use('/api/fds', fdRoutes);
app.use('/api/rd', rdRoutes);
app.use('/api/mis', misRoutes);
app.use('/api/savings', savingsRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/subscription', subscriptionRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api/whatsapp', whatsappRoutes);
app.use('/api/customer-portal', customerPortalRoutes);
app.use('/api/approvals', approvalsRoutes);
app.use('/api/users', userRoutes);
app.use('/api/permissions', permissionsRoutes);
app.use('/api/agent-ranks', agentRanksRoutes);
app.use('/api/agents', agentRanksRoutes);
app.use('/api/collection-centers', collectionCentersRoutes);
app.use('/api/loans', loansRoutes);
app.use('/api/accounting', accountingRoutes);

// Health check / API status endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    system: 'FD Management CRM System',
    timestamp: new Date().toISOString(),
    version: '1.0.0'
  });
});

// Global Live Search Endpoint across all Members & Multi-Product Accounts
app.get('/api/global-search', (req, res) => {
  try {
    const db = require('./db');
    const { q = '' } = req.query;
    const term = q.trim();
    if (!term) return res.json({ success: true, customers: [], accounts: [] });
    
    const s = `%${term}%`;
    
    // 1. Search customers (Members)
    const customers = db.prepare(`
      SELECT c.id, c.customer_code, c.full_name, c.phone, c.pan_card, c.status,
        (SELECT COUNT(*) FROM fixed_deposits WHERE customer_id = c.id) as fds_count,
        (SELECT COUNT(*) FROM recurring_deposits WHERE customer_id = c.id) as rds_count,
        (SELECT COUNT(*) FROM mis_accounts WHERE customer_id = c.id) as mis_count,
        (SELECT COUNT(*) FROM savings_accounts WHERE customer_id = c.id) as savings_count
      FROM customers c
      WHERE c.full_name LIKE ? OR c.customer_code LIKE ? OR c.phone LIKE ? OR c.pan_card LIKE ?
      ORDER BY 
        CASE WHEN c.full_name LIKE ? THEN 1 WHEN c.customer_code LIKE ? THEN 2 ELSE 3 END,
        c.id DESC
      LIMIT 10
    `).all(s, s, s, s, `${term}%`, `${term}%`);

    // 2. Search Accounts (FD, RD, MIS, Savings)
    const accounts = [];
    
    try {
      const fds = db.prepare(`
        SELECT fd.id, fd.fd_number as account_number, 'FD' as product_type, fd.principal_amount as amount, fd.status, c.full_name as customer_name, c.id as customer_id
        FROM fixed_deposits fd
        JOIN customers c ON fd.customer_id = c.id
        WHERE fd.fd_number LIKE ? OR c.full_name LIKE ?
        LIMIT 5
      `).all(s, s);
      accounts.push(...fds);
    } catch(e) {}

    try {
      const rds = db.prepare(`
        SELECT rd.id, rd.rd_number as account_number, 'RD' as product_type, rd.monthly_installment as amount, rd.status, c.full_name as customer_name, c.id as customer_id
        FROM recurring_deposits rd
        JOIN customers c ON rd.customer_id = c.id
        WHERE rd.rd_number LIKE ? OR c.full_name LIKE ?
        LIMIT 5
      `).all(s, s);
      accounts.push(...rds);
    } catch(e) {}

    try {
      const mis = db.prepare(`
        SELECT m.id, m.mis_number as account_number, 'MIS' as product_type, m.deposit_amount as amount, m.status, c.full_name as customer_name, c.id as customer_id
        FROM mis_accounts m
        JOIN customers c ON m.customer_id = c.id
        WHERE m.mis_number LIKE ? OR c.full_name LIKE ?
        LIMIT 5
      `).all(s, s);
      accounts.push(...mis);
    } catch(e) {}

    try {
      const sav = db.prepare(`
        SELECT s.id, s.account_number, 'SAVINGS' as product_type, s.current_balance as amount, s.status, c.full_name as customer_name, c.id as customer_id
        FROM savings_accounts s
        JOIN customers c ON s.customer_id = c.id
        WHERE s.account_number LIKE ? OR c.full_name LIKE ?
        LIMIT 5
      `).all(s, s);
      accounts.push(...sav);
    } catch(e) {}

    res.json({ success: true, customers, accounts });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// Live Branches List endpoint
app.get('/api/branches', (req, res) => {
  try {
    const db = require('./db');
    const branches = db.prepare('SELECT id, branch_code, branch_name, city, state, pincode, address, contact_phone, contact_email, is_active FROM branches WHERE is_active = 1 ORDER BY id ASC').all();
    res.json({ success: true, branches });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// Live Audit Trail endpoint (Anti-Fraud & Staff / Agent Action Tracking)
app.get('/api/audit-logs', (req, res) => {
  try {
    const db = require('./db');
    const { search, limit = 100 } = req.query;
    let query = 'SELECT * FROM audit_logs';
    const params = [];
    if (search && search.trim()) {
      query += ' WHERE username LIKE ? OR full_name LIKE ? OR action LIKE ? OR entity_id LIKE ? OR details LIKE ?';
      const term = `%${search.trim()}%`;
      params.push(term, term, term, term, term);
    }
    query += ' ORDER BY id DESC LIMIT ?';
    params.push(parseInt(limit) || 100);
    const logs = db.prepare(query).all(...params);
    res.json({ success: true, count: logs.length, logs });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// Serve frontend in production build if client/dist exists
const clientDistPath = path.join(__dirname, '../client/dist');

// Disable caching for HTML entry point so updates are seen instantly
app.use((req, res, next) => {
  if (req.path === '/' || req.path.endsWith('.html')) {
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    res.setHeader('Surrogate-Control', 'no-store');
  }
  next();
});

app.use(express.static(clientDistPath, {
  setHeaders: (res, filePath) => {
    if (filePath.endsWith('.html')) {
      res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
      res.setHeader('Pragma', 'no-cache');
      res.setHeader('Expires', '0');
    }
  }
}));

app.use((req, res, next) => {
  if (req.path.startsWith('/api')) {
    return res.status(404).json({ success: false, message: 'API route not found' });
  }
  const indexPath = path.join(clientDistPath, 'index.html');
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
  res.sendFile(indexPath, err => {
    if (err) {
      res.status(200).send('API Server is running. Frontend dev server is at http://localhost:3000');
    }
  });
});

// Global API error handler (ensures JSON responses always)
app.use((err, req, res, next) => {
  console.error('Express Server Error:', err);
  if (res.headersSent) return next(err);
  res.status(err.status || 500).json({
    success: false,
    message: err.message || 'Internal Server Error'
  });
});

const { startReminderScheduler } = require('./services/whatsappCron');

app.listen(PORT, '0.0.0.0', () => {
  console.log(`=========================================`);
  console.log(`🚀 FD CRM Backend Server running on port ${PORT}`);
  console.log(`🔗 API Base: http://localhost:${PORT}/api`);
  console.log(`=========================================`);

  // Start background auto WhatsApp reminder worker
  startReminderScheduler();
});
