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

// Health check / API status endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    system: 'FD Management CRM System',
    timestamp: new Date().toISOString(),
    version: '1.0.0'
  });
});

// Live Branches List endpoint
app.get('/api/branches', (req, res) => {
  try {
    const db = require('./db');
    const branches = db.prepare('SELECT id, branch_code, branch_name, city, state, pincode, address, contact_phone, contact_email, is_active FROM branches ORDER BY id ASC').all();
    res.json({ success: true, branches });
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
